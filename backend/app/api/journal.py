"""
Journal API Routes
"""

import uuid
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_session
from app.core.security import TokenData, get_user_id_from_token, require_auth
from app.models.journal import JournalEntry
from app.models.portfolio import Portfolio

router = APIRouter(prefix="/api/journal", tags=["journal"])


class JournalEntryResponse(BaseModel):
    id: uuid.UUID
    symbol: str
    side: str
    entry_price: float
    exit_price: float
    qty: float
    pnl: float
    pnl_percent: float
    entry_time: str
    exit_time: str
    notes: Optional[str]
    tags: Optional[str]

    class Config:
        from_attributes = True


@router.get("/entries", response_model=List[JournalEntryResponse])
async def get_journal_entries(
    token_data: TokenData = Depends(require_auth),
    limit: int = 100,
    db: AsyncSession = Depends(get_session),
):
    """Get journal entries for the authenticated user"""
    uid = get_user_id_from_token(token_data)

    result = await db.execute(select(Portfolio).where(Portfolio.user_id == uid))
    portfolio = result.scalars().first()

    if not portfolio:
        return []

    query = (
        select(JournalEntry)
        .where(JournalEntry.portfolio_id == portfolio.id)
        .order_by(desc(JournalEntry.exit_time))
        .limit(limit)
    )

    result = await db.execute(query)
    entries = result.scalars().all()

    return entries
