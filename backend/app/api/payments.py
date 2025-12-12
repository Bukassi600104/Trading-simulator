"""
Payment API endpoints for Paystack integration
"""

import hmac
import hashlib
import json
import os
import uuid
from typing import Optional, Dict, Any
from decimal import Decimal

import httpx
from fastapi import APIRouter, Depends, HTTPException, Request, status, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel

from app.core.database import get_db
from app.core.security import get_current_user
from app.core.config import TIER_PRICES, UserTier
from app.models.user import User
from app.models.payment import Payment, PaymentStatus

router = APIRouter(prefix="/pay", tags=["payments"])

PAYSTACK_SECRET_KEY = os.getenv("PAYSTACK_SECRET_KEY", "")
PAYSTACK_INIT_URL = "https://api.paystack.co/transaction/initialize"


class PaymentInitializeRequest(BaseModel):
    plan_type: str  # "PRO" or "PROP_CHALLENGE"
    callback_url: Optional[str] = None


class PaymentInitializeResponse(BaseModel):
    authorization_url: str
    access_code: str
    reference: str


@router.post("/initialize", response_model=PaymentInitializeResponse)
async def initialize_payment(
    payload: PaymentInitializeRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Initialize a Paystack transaction"""
    if not PAYSTACK_SECRET_KEY:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Payment configuration missing"
        )

    # Validate plan type
    if payload.plan_type not in TIER_PRICES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid plan type. Supported: {list(TIER_PRICES.keys())}"
        )

    amount = TIER_PRICES[payload.plan_type]
    # Paystack expects amount in kobo (multiply by 100)
    amount_kobo = int(amount * 100)
    
    reference = str(uuid.uuid4())
    
    # Create Payment record
    payment = Payment(
        user_id=user.id,
        reference=reference,
        amount=amount,
        currency="NGN",
        status=PaymentStatus.PENDING,
        metadata_json=json.dumps({
            "plan_type": payload.plan_type,
            "email": user.email
        })
    )
    db.add(payment)
    await db.commit()
    await db.refresh(payment)

    # Call Paystack API
    headers = {
        "Authorization": f"Bearer {PAYSTACK_SECRET_KEY}",
        "Content-Type": "application/json"
    }
    
    data = {
        "email": user.email,
        "amount": amount_kobo,
        "reference": reference,
        "callback_url": payload.callback_url,
        "metadata": {
            "user_id": str(user.id),
            "plan_type": payload.plan_type,
            "custom_fields": [
                {
                    "display_name": "Plan Type",
                    "variable_name": "plan_type",
                    "value": payload.plan_type
                }
            ]
        }
    }

    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(
                PAYSTACK_INIT_URL,
                json=data,
                headers=headers,
                timeout=10.0
            )
            response.raise_for_status()
            res_data = response.json()
            
            if not res_data.get("status"):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=res_data.get("message", "Paystack initialization failed")
                )
                
            return PaymentInitializeResponse(
                authorization_url=res_data["data"]["authorization_url"],
                access_code=res_data["data"]["access_code"],
                reference=reference
            )
            
        except httpx.HTTPError as e:
            # Rollback payment creation if API call fails? 
            # Actually, keeping it as PENDING is fine, it will just be abandoned.
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=f"Payment gateway error: {str(e)}"
            )


@router.post("/webhook")
async def paystack_webhook(
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    """Handle Paystack webhooks"""
    # Verify signature
    signature = request.headers.get("x-paystack-signature")
    if not signature:
        raise HTTPException(status_code=400, detail="No signature")
        
    body = await request.body()
    
    # Verify HMAC
    hash_object = hmac.new(
        PAYSTACK_SECRET_KEY.encode('utf-8'),
        msg=body,
        digestmod=hashlib.sha512
    )
    expected_signature = hash_object.hexdigest()
    
    if signature != expected_signature:
        raise HTTPException(status_code=400, detail="Invalid signature")
        
    event_data = json.loads(body)
    event_type = event_data.get("event")
    
    if event_type == "charge.success":
        data = event_data.get("data", {})
        reference = data.get("reference")
        
        # Find payment
        stmt = select(Payment).where(Payment.reference == reference)
        result = await db.execute(stmt)
        payment = result.scalar_one_or_none()
        
        if not payment:
            # Payment not found (maybe initiated outside app?)
            return {"status": "ignored", "reason": "Payment not found"}
            
        if payment.status == PaymentStatus.SUCCESS:
            return {"status": "ignored", "reason": "Already processed"}
            
        # Update payment status
        payment.status = PaymentStatus.SUCCESS
        
        # Parse metadata to get plan type
        # Note: Paystack returns metadata in the data object
        metadata = data.get("metadata", {})
        plan_type = metadata.get("plan_type")
        
        # If not in metadata, try to parse from our stored JSON
        if not plan_type and payment.metadata_json:
            try:
                stored_meta = json.loads(payment.metadata_json)
                plan_type = stored_meta.get("plan_type")
            except:
                pass
                
        # Upgrade user
        if plan_type:
            stmt_user = select(User).where(User.id == payment.user_id)
            result_user = await db.execute(stmt_user)
            user = result_user.scalar_one_or_none()
            
            if user:
                if plan_type == "PRO":
                    user.tier = UserTier.PRO
                elif plan_type == "PROP_CHALLENGE":
                    user.tier = UserTier.PROP_CHALLENGE
                    # TODO: Initialize prop challenge specific state here if needed
                    # e.g. Reset balance to challenge amount, set start date, etc.
                
                db.add(user)
        
        db.add(payment)
        await db.commit()
        
        return {"status": "success"}
        
    return {"status": "ignored"}
