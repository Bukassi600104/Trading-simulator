"""
Paystack billing integration for African markets.

Handles payment initialization, webhook processing, and subscription management.
Plans are denominated in NGN (Nigerian Naira) via Kobo (1/100 of Naira).
"""
import hashlib
import hmac
import json
import os
import uuid
from typing import Optional

import httpx
from fastapi import APIRouter, Depends, Header, HTTPException, Request
from loguru import logger
from pydantic import BaseModel
from sqlalchemy import select

from app.core.database import async_session_maker
from app.core.security import TokenData, get_current_user, get_user_id_from_token

router = APIRouter(prefix="/api/paystack", tags=["paystack"])

PAYSTACK_SECRET = os.getenv("PAYSTACK_SECRET_KEY", "")
PAYSTACK_BASE = "https://api.paystack.co"

# Plans: key -> config
# Amounts in Kobo (1 NGN = 100 Kobo)
PLANS = {
    "pro_monthly_ngn": {
        "amount": 540_000,       # ₦5,400
        "tier": "PRO",
        "interval": "monthly",
        "label": "Pro Monthly",
        "currency": "NGN",
    },
    "pro_annual_ngn": {
        "amount": 5_940_000,     # ₦59,400
        "tier": "PRO",
        "interval": "annually",
        "label": "Pro Annual",
        "currency": "NGN",
    },
    "prop_monthly_ngn": {
        "amount": 1_350_000,     # ₦13,500
        "tier": "PROP_CHALLENGE",
        "interval": "monthly",
        "label": "Prop Challenge Monthly",
        "currency": "NGN",
    },
    "prop_annual_ngn": {
        "amount": 14_850_000,    # ₦148,500
        "tier": "PROP_CHALLENGE",
        "interval": "annually",
        "label": "Prop Challenge Annual",
        "currency": "NGN",
    },
}


class InitializePaymentRequest(BaseModel):
    plan_id: str
    callback_url: Optional[str] = None


@router.get("/plans")
async def list_plans():
    """Return available Paystack plans with NGN pricing."""
    return [{"id": k, **v} for k, v in PLANS.items()]


@router.post("/initialize")
async def initialize_payment(
    body: InitializePaymentRequest,
    token_data: TokenData = Depends(get_current_user),
):
    """Initialize a Paystack transaction and return authorization URL."""
    plan = PLANS.get(body.plan_id)
    if not plan:
        raise HTTPException(status_code=400, detail=f"Unknown plan: {body.plan_id}")

    if not PAYSTACK_SECRET:
        raise HTTPException(status_code=503, detail="Paystack not configured")

    from app.models.user import User

    user_id = get_user_id_from_token(token_data)
    async with async_session_maker() as session:
        result = await session.execute(select(User).where(User.id == user_id))
        user = result.scalar_one_or_none()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        email = user.email

    payload = {
        "email": email,
        "amount": plan["amount"],
        "currency": plan["currency"],
        "metadata": {
            "user_id": str(user_id),
            "plan_id": body.plan_id,
            "tier": plan["tier"],
        },
    }
    if body.callback_url:
        payload["callback_url"] = body.callback_url

    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.post(
            f"{PAYSTACK_BASE}/transaction/initialize",
            json=payload,
            headers={"Authorization": f"Bearer {PAYSTACK_SECRET}"},
        )
        data = resp.json()

    if not data.get("status"):
        raise HTTPException(
            status_code=400, detail=data.get("message", "Paystack error")
        )

    return {
        "authorization_url": data["data"]["authorization_url"],
        "access_code": data["data"]["access_code"],
        "reference": data["data"]["reference"],
        "plan": plan,
    }


@router.get("/verify/{reference}")
async def verify_payment(
    reference: str,
    token_data: TokenData = Depends(get_current_user),
):
    """Verify a Paystack transaction and upgrade user tier if successful."""
    if not PAYSTACK_SECRET:
        raise HTTPException(status_code=503, detail="Paystack not configured")

    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.get(
            f"{PAYSTACK_BASE}/transaction/verify/{reference}",
            headers={"Authorization": f"Bearer {PAYSTACK_SECRET}"},
        )
        data = resp.json()

    if not data.get("status") or data["data"]["status"] != "success":
        raise HTTPException(status_code=400, detail="Payment not successful")

    meta = data["data"].get("metadata", {})
    user_id_str = meta.get("user_id")
    tier = meta.get("tier", "PRO")

    if user_id_str:
        await _upgrade_user_tier(user_id_str, tier)

    return {"status": "success", "tier": tier}


@router.post("/webhook")
async def paystack_webhook(request: Request):
    """
    Handle Paystack webhooks.

    Events handled:
    - charge.success → upgrade tier
    - subscription.disable / subscription.not_renew → downgrade to FREE
    """
    body = await request.body()
    signature = request.headers.get("x-paystack-signature", "")

    if PAYSTACK_SECRET:
        expected = hmac.new(
            PAYSTACK_SECRET.encode("utf-8"),
            body,
            hashlib.sha512,
        ).hexdigest()
        if not hmac.compare_digest(expected, signature):
            raise HTTPException(status_code=400, detail="Invalid signature")

    event = json.loads(body)
    event_type = event.get("event", "")
    data = event.get("data", {})

    logger.info(f"Paystack webhook received: {event_type}")

    if event_type == "charge.success":
        meta = data.get("metadata", {})
        user_id_str = meta.get("user_id")
        tier = meta.get("tier", "PRO")
        if user_id_str:
            await _upgrade_user_tier(user_id_str, tier)

    elif event_type in ("subscription.disable", "subscription.not_renew"):
        customer = data.get("customer", {})
        email = customer.get("email")
        if email:
            await _downgrade_user_by_email(email)

    return {"status": "ok"}


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


async def _upgrade_user_tier(user_id_str: str, tier_name: str):
    """Upgrade a user's subscription tier."""
    from app.core.config import UserTier
    from app.models.user import User

    try:
        uid = uuid.UUID(user_id_str)
        # Map tier string to enum, fallback to PRO
        tier_enum = UserTier[tier_name] if tier_name in UserTier.__members__ else UserTier.PRO
    except Exception as e:
        logger.error(f"Paystack tier upgrade parse error: {e}")
        return

    async with async_session_maker() as session:
        result = await session.execute(select(User).where(User.id == uid))
        user = result.scalar_one_or_none()
        if user:
            user.tier = tier_enum
            await session.commit()
            logger.info(f"Paystack: upgraded user {uid} → {tier_name}")


async def _downgrade_user_by_email(email: str):
    """Downgrade a user to FREE tier on subscription cancellation."""
    from app.core.config import UserTier
    from app.models.user import User

    async with async_session_maker() as session:
        result = await session.execute(select(User).where(User.email == email))
        user = result.scalar_one_or_none()
        if user:
            user.tier = UserTier.FREE
            await session.commit()
            logger.info(f"Paystack: downgraded {email} → FREE")
