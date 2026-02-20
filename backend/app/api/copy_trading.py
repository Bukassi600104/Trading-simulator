"""
Copy Trading API.

Allows users to follow top traders and automatically mirror their trades
proportionally. Gated behind PRO/PROP_CHALLENGE tier.
"""
import uuid
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from loguru import logger
from pydantic import BaseModel
from sqlalchemy import and_, select

from app.core.database import async_session_maker
from app.core.security import TokenData, get_current_user, get_user_id_from_token

router = APIRouter(prefix="/api/copy", tags=["copy-trading"])

MAX_FOLLOWING = 10  # cap per user


class FollowRequest(BaseModel):
    copy_ratio: float = 1.0  # 0.1 to 2.0


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------


@router.get("/following")
async def get_following(token_data: TokenData = Depends(get_current_user)):
    """Get list of traders the current user is copying."""
    from app.models.copy_trading import CopyTradingRelationship
    from app.models.user import User

    user_id = get_user_id_from_token(token_data)
    async with async_session_maker() as session:
        rows = await session.execute(
            select(CopyTradingRelationship, User)
            .join(User, User.id == CopyTradingRelationship.followed_id)
            .where(
                and_(
                    CopyTradingRelationship.follower_id == user_id,
                    CopyTradingRelationship.is_active == True,
                )
            )
        )
        results = rows.all()

    return {
        "following": [
            {
                "relationship_id": str(rel.id),
                "followed_id": str(rel.followed_id),
                "email": user.email.split("@")[0],  # username only
                "copy_ratio": rel.copy_ratio,
                "since": rel.created_at.isoformat(),
            }
            for rel, user in results
        ]
    }


@router.get("/followers")
async def get_followers(token_data: TokenData = Depends(get_current_user)):
    """Get list of users copying the current user's trades."""
    from app.models.copy_trading import CopyTradingRelationship
    from app.models.user import User

    user_id = get_user_id_from_token(token_data)
    async with async_session_maker() as session:
        rows = await session.execute(
            select(CopyTradingRelationship, User)
            .join(User, User.id == CopyTradingRelationship.follower_id)
            .where(
                and_(
                    CopyTradingRelationship.followed_id == user_id,
                    CopyTradingRelationship.is_active == True,
                )
            )
        )
        results = rows.all()

    return {
        "followers": [
            {
                "follower_id": str(rel.follower_id),
                "username": user.email.split("@")[0],
                "copy_ratio": rel.copy_ratio,
                "since": rel.created_at.isoformat(),
            }
            for rel, user in results
        ],
        "count": len(results),
    }


@router.post("/follow/{target_user_id}")
async def follow_trader(
    target_user_id: str,
    body: FollowRequest,
    token_data: TokenData = Depends(get_current_user),
):
    """
    Start copying a trader.

    The follower's trades will mirror the followed trader's positions
    proportionally (scaled by copy_ratio).
    """
    from app.models.copy_trading import CopyTradingRelationship
    from app.models.user import User

    user_id = get_user_id_from_token(token_data)

    try:
        target_uid = uuid.UUID(target_user_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid user ID")

    if target_uid == user_id:
        raise HTTPException(status_code=400, detail="Cannot follow yourself")

    copy_ratio = max(0.1, min(2.0, body.copy_ratio))

    async with async_session_maker() as session:
        # Check target exists
        target = await session.execute(select(User).where(User.id == target_uid))
        if not target.scalar_one_or_none():
            raise HTTPException(status_code=404, detail="Trader not found")

        # Check following limit
        count_q = await session.execute(
            select(CopyTradingRelationship).where(
                and_(
                    CopyTradingRelationship.follower_id == user_id,
                    CopyTradingRelationship.is_active == True,
                )
            )
        )
        if len(count_q.scalars().all()) >= MAX_FOLLOWING:
            raise HTTPException(
                status_code=400,
                detail=f"Maximum of {MAX_FOLLOWING} traders can be followed",
            )

        # Upsert relationship
        existing = await session.execute(
            select(CopyTradingRelationship).where(
                and_(
                    CopyTradingRelationship.follower_id == user_id,
                    CopyTradingRelationship.followed_id == target_uid,
                )
            )
        )
        rel = existing.scalar_one_or_none()
        if rel:
            rel.is_active = True
            rel.copy_ratio = copy_ratio
        else:
            rel = CopyTradingRelationship(
                follower_id=user_id,
                followed_id=target_uid,
                copy_ratio=copy_ratio,
                is_active=True,
            )
            session.add(rel)

        await session.commit()
        logger.info(f"User {user_id} now copying {target_uid} (ratio={copy_ratio})")

    return {"success": True, "followed_id": target_user_id, "copy_ratio": copy_ratio}


@router.delete("/unfollow/{target_user_id}")
async def unfollow_trader(
    target_user_id: str,
    token_data: TokenData = Depends(get_current_user),
):
    """Stop copying a trader."""
    from app.models.copy_trading import CopyTradingRelationship

    user_id = get_user_id_from_token(token_data)

    try:
        target_uid = uuid.UUID(target_user_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid user ID")

    async with async_session_maker() as session:
        result = await session.execute(
            select(CopyTradingRelationship).where(
                and_(
                    CopyTradingRelationship.follower_id == user_id,
                    CopyTradingRelationship.followed_id == target_uid,
                )
            )
        )
        rel = result.scalar_one_or_none()
        if rel:
            rel.is_active = False
            await session.commit()

    return {"success": True}


@router.get("/top-traders")
async def get_top_traders(limit: int = 20):
    """
    Get top traders by portfolio return for the copy-trading leaderboard.

    Public endpoint — returns usernames + performance only (no PII).
    """
    from app.models.user import User
    from app.api.leaderboard import get_leaderboard

    try:
        lb = await get_leaderboard(limit=limit)
        return {"traders": lb.get("leaderboard", [])[:limit]}
    except Exception:
        return {"traders": []}
