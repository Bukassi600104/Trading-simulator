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

# Temporary user_id helper
def get_demo_user_id() -> uuid.UUID:
    return uuid.UUID("00000000-0000-0000-0000-000000000001")

@router.get("/entries", response_model=List[JournalEntryResponse])
async def get_journal_entries(
    user_id: Optional[str] = Query(None),
    limit: int = 100,
    db: AsyncSession = Depends(get_session)
):
    """Get journal entries for a user"""
    try:
        uid = uuid.UUID(user_id) if user_id else get_demo_user_id()
    except ValueError as err:
        raise HTTPException(status_code=400, detail="Invalid user_id") from err

    # Get portfolio
    result = await db.execute(select(Portfolio).where(Portfolio.user_id == uid))
    portfolio = result.scalars().first()
    
    if not portfolio:
        return []
        
    query = select(JournalEntry).where(
        JournalEntry.portfolio_id == portfolio.id
    ).order_by(desc(JournalEntry.exit_time)).limit(limit)
    
    result = await db.execute(query)
    entries = result.scalars().all()
    
    # Convert decimals to floats for Pydantic
    # (Pydantic v2 handles Decimal to float, but explicit conversion is safe)
    return entries
