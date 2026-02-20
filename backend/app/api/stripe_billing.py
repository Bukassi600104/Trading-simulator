"""
Stripe subscription billing API endpoints for Terminal Zero
"""

import os
import uuid
from datetime import datetime, timezone
from typing import Optional

import stripe
from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import UserTier
from app.core.database import get_session
from app.core.security import TokenData, require_auth
from app.models.user import User

router = APIRouter(prefix="/api/billing", tags=["billing"])

# Stripe configuration
stripe.api_key = os.getenv("STRIPE_SECRET_KEY", "")
STRIPE_WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET", "")
STRIPE_PUBLISHABLE_KEY = os.getenv("STRIPE_PUBLISHABLE_KEY", "")

# Plans config
STRIPE_PLANS = {
    "pro_monthly": {
        "price_id": os.getenv("STRIPE_PRO_PRICE_ID", ""),
        "name": "Pro",
        "amount": 999,
        "tier": UserTier.PRO,
    },
    "pro_annual": {
        "price_id": os.getenv("STRIPE_PRO_ANNUAL_PRICE_ID", ""),
        "name": "Pro Annual",
        "amount": 5999,
        "tier": UserTier.PRO,
    },
    "elite_monthly": {
        "price_id": os.getenv("STRIPE_ELITE_PRICE_ID", ""),
        "name": "Elite",
        "amount": 2499,
        "tier": UserTier.PRO,
    },
    "elite_annual": {
        "price_id": os.getenv("STRIPE_ELITE_ANNUAL_PRICE_ID", ""),
        "name": "Elite Annual",
        "amount": 14999,
        "tier": UserTier.PRO,
    },
}

# Map Stripe price IDs back to plan keys (populated at import time)
_PRICE_ID_TO_PLAN: dict[str, str] = {}
for _plan_key, _plan_info in STRIPE_PLANS.items():
    if _plan_info["price_id"]:
        _PRICE_ID_TO_PLAN[_plan_info["price_id"]] = _plan_key


# ---------------------------------------------------------------------------
# Request / Response models
# ---------------------------------------------------------------------------

class CheckoutRequest(BaseModel):
    plan: str  # "pro_monthly" | "pro_annual" | "elite_monthly" | "elite_annual"
    success_url: str
    cancel_url: str


class CheckoutResponse(BaseModel):
    checkout_url: str
    session_id: str


class PortalResponse(BaseModel):
    portal_url: str


class SubscriptionResponse(BaseModel):
    plan: Optional[str] = None
    status: Optional[str] = None
    period_end: Optional[str] = None
    trial_end: Optional[str] = None
    is_trial: bool = False


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

async def _get_user(token_data: TokenData, db: AsyncSession) -> User:
    stmt = select(User).where(User.id == uuid.UUID(token_data.user_id))
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    return user


def _ensure_stripe_configured() -> None:
    if not stripe.api_key:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Stripe is not configured",
        )


def _tier_for_price(price_id: str) -> UserTier:
    plan_key = _PRICE_ID_TO_PLAN.get(price_id)
    if plan_key:
        return STRIPE_PLANS[plan_key]["tier"]
    return UserTier.PRO


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.post("/create-checkout-session", response_model=CheckoutResponse)
async def create_checkout_session(
    payload: CheckoutRequest,
    token_data: TokenData = Depends(require_auth),
    db: AsyncSession = Depends(get_session),
):
    """Create a Stripe Checkout Session for subscription purchase."""
    _ensure_stripe_configured()

    if payload.plan not in STRIPE_PLANS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid plan. Supported: {list(STRIPE_PLANS.keys())}",
        )

    plan = STRIPE_PLANS[payload.plan]
    if not plan["price_id"]:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Price ID not configured for plan: {payload.plan}",
        )

    user = await _get_user(token_data, db)

    # Get or create Stripe customer
    stripe_customer_id = getattr(user, "stripe_customer_id", None)
    if not stripe_customer_id:
        customer = stripe.Customer.create(
            email=user.email,
            metadata={"user_id": str(user.id)},
        )
        stripe_customer_id = customer.id
        # Store on user if the column exists
        if hasattr(user, "stripe_customer_id"):
            user.stripe_customer_id = stripe_customer_id
            db.add(user)
            await db.commit()

    session = stripe.checkout.Session.create(
        customer=stripe_customer_id,
        mode="subscription",
        line_items=[{"price": plan["price_id"], "quantity": 1}],
        success_url=payload.success_url,
        cancel_url=payload.cancel_url,
        metadata={"user_id": str(user.id), "plan": payload.plan},
    )

    return CheckoutResponse(checkout_url=session.url, session_id=session.id)


@router.post("/webhook")
async def stripe_webhook(
    request: Request,
    db: AsyncSession = Depends(get_session),
):
    """Handle Stripe webhook events."""
    body = await request.body()
    sig_header = request.headers.get("stripe-signature")

    if not sig_header or not STRIPE_WEBHOOK_SECRET:
        raise HTTPException(status_code=400, detail="Missing signature or webhook secret")

    try:
        event = stripe.Webhook.construct_event(body, sig_header, STRIPE_WEBHOOK_SECRET)
    except stripe.error.SignatureVerificationError:
        raise HTTPException(status_code=400, detail="Invalid signature")

    event_type = event["type"]
    data_object = event["data"]["object"]

    if event_type == "invoice.payment_succeeded":
        await _handle_payment_succeeded(data_object, db)
    elif event_type == "invoice.payment_failed":
        await _handle_payment_failed(data_object, db)
    elif event_type == "customer.subscription.deleted":
        await _handle_subscription_deleted(data_object, db)
    elif event_type == "customer.subscription.updated":
        await _handle_subscription_updated(data_object, db)

    return {"status": "ok"}


@router.get("/portal", response_model=PortalResponse)
async def billing_portal(
    token_data: TokenData = Depends(require_auth),
    db: AsyncSession = Depends(get_session),
):
    """Create a Stripe Customer Portal session."""
    _ensure_stripe_configured()
    user = await _get_user(token_data, db)

    stripe_customer_id = getattr(user, "stripe_customer_id", None)
    if not stripe_customer_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No billing account found. Please subscribe first.",
        )

    session = stripe.billing_portal.Session.create(
        customer=stripe_customer_id,
        return_url=os.getenv("FRONTEND_URL", "http://localhost:3000") + "/dashboard",
    )

    return PortalResponse(portal_url=session.url)


@router.get("/subscription", response_model=SubscriptionResponse)
async def get_subscription(
    token_data: TokenData = Depends(require_auth),
    db: AsyncSession = Depends(get_session),
):
    """Get current subscription status."""
    _ensure_stripe_configured()
    user = await _get_user(token_data, db)

    stripe_customer_id = getattr(user, "stripe_customer_id", None)
    if not stripe_customer_id:
        return SubscriptionResponse()

    subscriptions = stripe.Subscription.list(customer=stripe_customer_id, limit=1)
    if not subscriptions.data:
        return SubscriptionResponse()

    sub = subscriptions.data[0]
    price_id = sub["items"]["data"][0]["price"]["id"] if sub["items"]["data"] else None
    plan_key = _PRICE_ID_TO_PLAN.get(price_id, "unknown") if price_id else "unknown"

    period_end = datetime.fromtimestamp(sub["current_period_end"], tz=timezone.utc).isoformat()
    trial_end = None
    is_trial = False
    if sub.get("trial_end"):
        trial_end = datetime.fromtimestamp(sub["trial_end"], tz=timezone.utc).isoformat()
        is_trial = sub["status"] == "trialing"

    return SubscriptionResponse(
        plan=plan_key,
        status=sub["status"],
        period_end=period_end,
        trial_end=trial_end,
        is_trial=is_trial,
    )


@router.post("/cancel")
async def cancel_subscription(
    token_data: TokenData = Depends(require_auth),
    db: AsyncSession = Depends(get_session),
):
    """Cancel subscription at period end."""
    _ensure_stripe_configured()
    user = await _get_user(token_data, db)

    stripe_customer_id = getattr(user, "stripe_customer_id", None)
    if not stripe_customer_id:
        raise HTTPException(status_code=400, detail="No active subscription")

    subscriptions = stripe.Subscription.list(customer=stripe_customer_id, limit=1)
    if not subscriptions.data:
        raise HTTPException(status_code=400, detail="No active subscription")

    sub = subscriptions.data[0]
    stripe.Subscription.modify(sub["id"], cancel_at_period_end=True)

    return {"status": "cancellation_scheduled", "period_end": sub["current_period_end"]}


# ---------------------------------------------------------------------------
# Webhook handlers
# ---------------------------------------------------------------------------

async def _handle_payment_succeeded(invoice: dict, db: AsyncSession) -> None:
    """Handle invoice.payment_succeeded — activate or renew subscription."""
    customer_id = invoice.get("customer")
    if not customer_id:
        return

    subscription_id = invoice.get("subscription")
    if not subscription_id:
        return

    # Fetch the subscription to get plan info
    sub = stripe.Subscription.retrieve(subscription_id)
    price_id = sub["items"]["data"][0]["price"]["id"] if sub["items"]["data"] else None

    user = await _find_user_by_stripe_customer(customer_id, db)
    if not user:
        return

    # Upgrade user tier
    tier = _tier_for_price(price_id) if price_id else UserTier.PRO
    user.tier = tier
    db.add(user)
    await db.commit()


async def _handle_payment_failed(invoice: dict, db: AsyncSession) -> None:
    """Handle invoice.payment_failed — mark subscription as past_due."""
    # Stripe automatically manages subscription status; we just log it
    pass


async def _handle_subscription_deleted(sub: dict, db: AsyncSession) -> None:
    """Handle customer.subscription.deleted — downgrade user to FREE."""
    customer_id = sub.get("customer")
    if not customer_id:
        return

    user = await _find_user_by_stripe_customer(customer_id, db)
    if not user:
        return

    user.tier = UserTier.FREE
    db.add(user)
    await db.commit()


async def _handle_subscription_updated(sub: dict, db: AsyncSession) -> None:
    """Handle customer.subscription.updated — update plan if changed."""
    customer_id = sub.get("customer")
    if not customer_id:
        return

    price_id = sub["items"]["data"][0]["price"]["id"] if sub.get("items", {}).get("data") else None
    if not price_id:
        return

    user = await _find_user_by_stripe_customer(customer_id, db)
    if not user:
        return

    tier = _tier_for_price(price_id)
    if user.tier != tier:
        user.tier = tier
        db.add(user)
        await db.commit()


async def _find_user_by_stripe_customer(customer_id: str, db: AsyncSession) -> Optional[User]:
    """Find user by stripe_customer_id, falling back to Stripe customer email."""
    # Try stripe_customer_id column first
    if hasattr(User, "stripe_customer_id"):
        stmt = select(User).where(User.stripe_customer_id == customer_id)
        result = await db.execute(stmt)
        user = result.scalar_one_or_none()
        if user:
            return user

    # Fallback: look up customer email from Stripe, match to user
    try:
        customer = stripe.Customer.retrieve(customer_id)
        email = customer.get("email")
        if email:
            stmt = select(User).where(User.email == email)
            result = await db.execute(stmt)
            return result.scalar_one_or_none()
    except Exception:
        pass

    return None
