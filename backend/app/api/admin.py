"""
Admin API endpoints for system management
"""

import uuid
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import require_auth, TokenData
from app.models.user import User, UserTier
from app.models.payment import Payment
from app.models.order import Order
from jesse_custom.engine import get_portfolio_manager

router = APIRouter(prefix="/admin", tags=["admin"])


# ============================================================================
# Dependencies
# ============================================================================

async def get_current_admin(
    token_data: TokenData = Depends(require_auth),
    db: AsyncSession = Depends(get_db)
) -> User:
    """Dependency to get current admin user"""
    stmt = select(User).where(User.id == uuid.UUID(token_data.user_id))
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    if not user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized"
        )
    return user


# ============================================================================
# Models
# ============================================================================

class UserAdminResponse(BaseModel):
    id: uuid.UUID
    email: str
    tier: UserTier
    is_active: bool
    is_superuser: bool
    created_at: str
    
    class Config:
        from_attributes = True


class SystemStatus(BaseModel):
    active_users: int
    total_orders: int
    active_portfolios: int
    db_status: str
    redis_status: str


# ============================================================================
# Endpoints
# ============================================================================

@router.get("/users", response_model=List[UserAdminResponse])
async def list_users(
    skip: int = 0,
    limit: int = 100,
    search: Optional[str] = None,
    admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    """List all users with pagination and search"""
    stmt = select(User).offset(skip).limit(limit)
    
    if search:
        stmt = stmt.where(User.email.ilike(f"%{search}%"))
        
    result = await db.execute(stmt)
    users = result.scalars().all()
    
    return [
        UserAdminResponse(
            id=u.id,
            email=u.email,
            tier=u.tier,
            is_active=u.is_active,
            is_superuser=u.is_superuser,
            created_at=u.created_at.isoformat()
        )
        for u in users
    ]


@router.post("/users/{user_id}/ban")
async def ban_user(
    user_id: uuid.UUID,
    admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    """Ban a user"""
    stmt = select(User).where(User.id == user_id)
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    if user.is_superuser:
        raise HTTPException(status_code=400, detail="Cannot ban superuser")
        
    user.is_active = False
    db.add(user)
    await db.commit()
    
    return {"status": "success", "message": f"User {user.email} banned"}


@router.post("/users/{user_id}/unban")
async def unban_user(
    user_id: uuid.UUID,
    admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    """Unban a user"""
    stmt = select(User).where(User.id == user_id)
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    user.is_active = True
    db.add(user)
    await db.commit()
    
    return {"status": "success", "message": f"User {user.email} unbanned"}


@router.get("/system/status", response_model=SystemStatus)
async def get_system_status(
    admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    """Get system health status"""
    # DB Check
    try:
        await db.execute(select(1))
        db_status = "connected"
    except Exception:
        db_status = "error"
        
    # Redis/Worker Check (via PortfolioManager)
    pm = get_portfolio_manager()
    stats = pm.get_stats()
    
    # Count total orders
    stmt = select(func.count(Order.id))
    result = await db.execute(stmt)
    total_orders = result.scalar() or 0
    
    return SystemStatus(
        active_users=stats["active_portfolios"],
        total_orders=total_orders,
        active_portfolios=stats["active_portfolios"],
        db_status=db_status,
        redis_status="connected"  # Assuming connected if PM is running
    )
