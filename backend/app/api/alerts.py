"""Price alert management API."""
import uuid
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import delete, select

from app.core.database import async_session_maker
from app.core.security import TokenData, get_user_id_from_token, require_auth

router = APIRouter(prefix="/api/alerts", tags=["alerts"])

try:
    from app.models.alerts import PriceAlert

    _MODELS_AVAILABLE = True
except ImportError:
    _MODELS_AVAILABLE = False


class CreateAlertRequest(BaseModel):
    asset: str  # e.g. "BTC-USDT"
    threshold_price: float
    direction: str  # "above" or "below"


@router.get("")
async def list_alerts(token_data: TokenData = Depends(require_auth)):
    if not _MODELS_AVAILABLE:
        return {"alerts": []}
    uid = get_user_id_from_token(token_data)
    async with async_session_maker() as session:
        result = await session.execute(
            select(PriceAlert).where(
                PriceAlert.user_id == uid, PriceAlert.is_active == True  # noqa: E712
            )
        )
        alerts = result.scalars().all()
    return {
        "alerts": [
            {
                "id": str(a.id),
                "asset": a.asset,
                "threshold_price": float(a.threshold_price),
                "direction": a.direction,
                "created_at": str(a.created_at),
            }
            for a in alerts
        ]
    }


@router.post("")
async def create_alert(
    request: CreateAlertRequest, token_data: TokenData = Depends(require_auth)
):
    if not _MODELS_AVAILABLE:
        raise HTTPException(status_code=503, detail="Alerts not available")
    if request.direction not in ("above", "below"):
        raise HTTPException(
            status_code=400, detail="direction must be 'above' or 'below'"
        )
    uid = get_user_id_from_token(token_data)
    async with async_session_maker() as session:
        alert = PriceAlert(
            id=uuid.uuid4(),
            user_id=uid,
            asset=request.asset,
            threshold_price=Decimal(str(request.threshold_price)),
            direction=request.direction,
            is_active=True,
        )
        session.add(alert)
        await session.commit()
    return {
        "id": str(alert.id),
        "asset": alert.asset,
        "threshold_price": float(alert.threshold_price),
        "direction": alert.direction,
    }


@router.delete("/{alert_id}")
async def delete_alert(
    alert_id: str, token_data: TokenData = Depends(require_auth)
):
    if not _MODELS_AVAILABLE:
        raise HTTPException(status_code=503, detail="Alerts not available")
    uid = get_user_id_from_token(token_data)
    try:
        aid = uuid.UUID(alert_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid alert ID")
    async with async_session_maker() as session:
        await session.execute(
            delete(PriceAlert).where(
                PriceAlert.id == aid, PriceAlert.user_id == uid
            )
        )
        await session.commit()
    return {"deleted": alert_id}
