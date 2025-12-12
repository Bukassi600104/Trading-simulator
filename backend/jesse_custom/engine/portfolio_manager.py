"""
Portfolio Manager - Central manager for all user portfolios

This is the heart of the multi-user trading engine. It:
- Maintains in-memory cache of active portfolios
- Routes price updates to all relevant positions
- Handles database sync operations
"""

import asyncio
import uuid
from datetime import datetime
from decimal import Decimal
from typing import Dict, List, Optional

from loguru import logger

from app.core.config import (
    DEFAULT_LEVERAGE,
    DEFAULT_STARTING_BALANCE,
    SUPPORTED_SYMBOLS,
)

from .user_portfolio import UserPortfolio
from .user_position import UserPosition


class PortfolioManager:
    """
    Central manager for all user portfolios.
    
    This class is designed to be a singleton that handles:
    - Portfolio creation and retrieval
    - Price updates across all active portfolios
    - Liquidation detection and handling
    - Database synchronization
    """
    
    def __init__(self):
        # In-memory portfolio cache: user_id -> UserPortfolio
        self._portfolios: Dict[uuid.UUID, UserPortfolio] = {}
        
        # Current prices for each symbol
        self._current_prices: Dict[str, Decimal] = {
            symbol: Decimal("0") for symbol in SUPPORTED_SYMBOLS
        }
        
        # Subscribers for portfolio updates (for WebSocket notifications)
        self._update_subscribers: Dict[uuid.UUID, asyncio.Queue] = {}
        
        # Lock for thread-safe operations
        self._lock = asyncio.Lock()
        
        logger.info("📊 Portfolio Manager initialized")
    
    async def get_or_create_portfolio(
        self,
        user_id: uuid.UUID,
        starting_balance: Decimal = DEFAULT_STARTING_BALANCE,
        leverage: int = DEFAULT_LEVERAGE
    ) -> UserPortfolio:
        """
        Get existing portfolio or create new one for user.
        
        In production, this would also sync with the database.
        """
        async with self._lock:
            if user_id in self._portfolios:
                return self._portfolios[user_id]
            
            # Create new portfolio
            portfolio = UserPortfolio(
                user_id=user_id,
                balance=starting_balance,
                starting_balance=starting_balance,
                leverage=leverage,
                max_equity_watermark=starting_balance,
            )
            
            # Initialize with current prices
            for symbol, price in self._current_prices.items():
                if price > 0:
                    position = portfolio.get_position(symbol)
                    if position:
                        position.current_price = price
            
            self._portfolios[user_id] = portfolio
            logger.info(
                f"📈 Created portfolio for user {user_id} with ${starting_balance}"
            )
            
            return portfolio
    
    def get_portfolio(self, user_id: uuid.UUID) -> Optional[UserPortfolio]:
        """Get portfolio if it exists"""
        return self._portfolios.get(user_id)
    
    async def remove_portfolio(self, user_id: uuid.UUID) -> bool:
        """Remove portfolio from cache (e.g., on user logout)"""
        async with self._lock:
            if user_id in self._portfolios:
                del self._portfolios[user_id]
                if user_id in self._update_subscribers:
                    del self._update_subscribers[user_id]
                return True
            return False
    
    async def on_price_update(self, symbol: str, price: Decimal) -> List[uuid.UUID]:
        """
        Handle price update for a symbol.
        
        Updates all portfolios with positions in this symbol.
        Returns list of user_ids whose positions were liquidated.
        """
        if symbol not in SUPPORTED_SYMBOLS:
            return []
        
        self._current_prices[symbol] = price
        liquidated_users = []
        
        async with self._lock:
            for user_id, portfolio in self._portfolios.items():
                if not portfolio.is_active:
                    continue
                
                # Update the specific position
                position = portfolio.get_position(symbol)
                if position and position.is_open:
                    position.update_price(price)
                    
                    # Check for liquidation
                    if position.check_liquidation():
                        logger.warning(
                            f"⚠️ Liquidation triggered for user {user_id} on {symbol}"
                        )
                        liquidated_symbols = portfolio.update_prices({symbol: price})
                        if liquidated_symbols:
                            liquidated_users.append(user_id)
                    
                    # Notify subscribers
                    await self._notify_portfolio_update(user_id, portfolio)
        
        return liquidated_users
    
    async def on_multi_price_update(
        self, prices: Dict[str, Decimal]
    ) -> List[uuid.UUID]:
        """
        Handle multiple price updates at once.
        
        More efficient for batch updates from the market stream.
        """
        # Update current prices
        for symbol, price in prices.items():
            if symbol in SUPPORTED_SYMBOLS:
                self._current_prices[symbol] = price
        
        all_liquidated = []
        
        async with self._lock:
            for user_id, portfolio in self._portfolios.items():
                if not portfolio.is_active:
                    continue
                
                liquidated_symbols = portfolio.update_prices(prices)
                if liquidated_symbols:
                    all_liquidated.append(user_id)
                    logger.warning(
                        f"⚠️ User {user_id} liquidated on: {liquidated_symbols}"
                    )
                
                # Notify subscribers
                await self._notify_portfolio_update(user_id, portfolio)
        
        return all_liquidated
    
    def get_current_price(self, symbol: str) -> Decimal:
        """Get current price for a symbol"""
        return self._current_prices.get(symbol, Decimal("0"))
    
    async def subscribe_to_updates(
        self,
        user_id: uuid.UUID,
        queue: asyncio.Queue
    ) -> None:
        """Subscribe to portfolio updates for WebSocket streaming"""
        self._update_subscribers[user_id] = queue
    
    async def unsubscribe_from_updates(self, user_id: uuid.UUID) -> None:
        """Unsubscribe from portfolio updates"""
        if user_id in self._update_subscribers:
            del self._update_subscribers[user_id]
    
    async def _notify_portfolio_update(
        self,
        user_id: uuid.UUID,
        portfolio: UserPortfolio
    ) -> None:
        """Send portfolio update to subscribed WebSocket clients"""
        if user_id in self._update_subscribers:
            try:
                await self._update_subscribers[user_id].put({
                    "type": "portfolio_update",
                    "data": portfolio.to_dict(),
                    "timestamp": datetime.utcnow().isoformat()
                })
            except Exception as e:
                logger.error(f"Failed to notify portfolio update: {e}")
    
    async def sync_to_database(self, user_id: uuid.UUID) -> None:
        """
        Sync in-memory portfolio to database.
        
        Called periodically or after significant changes.
        """
        from app.core.database import async_session_maker
        from app.models import Portfolio as DBPortfolio
        
        portfolio = self._portfolios.get(user_id)
        if not portfolio:
            return
        
        try:
            async with async_session_maker() as session:
                # Check if portfolio exists in DB
                from sqlalchemy import select
                result = await session.execute(
                    select(DBPortfolio).where(DBPortfolio.user_id == user_id)
                )
                db_portfolio = result.scalar_one_or_none()
                
                if db_portfolio:
                    # Update existing
                    db_portfolio.balance = portfolio.balance
                    db_portfolio.leverage = portfolio.leverage
                    db_portfolio.max_drawdown_watermark = portfolio.max_equity_watermark
                    db_portfolio.is_liquidated = portfolio.is_liquidated
                    db_portfolio.is_active = portfolio.is_active
                else:
                    # Create new (needs user to exist first)
                    logger.debug(f"Portfolio for user {user_id} not in DB yet")
                
                await session.commit()
                logger.debug(f"Synced portfolio for user {user_id} to database")
        except Exception as e:
            logger.error(f"Failed to sync portfolio to database: {e}")
    
    async def load_from_database(self, user_id: uuid.UUID) -> Optional[UserPortfolio]:
        """
        Load portfolio from database into memory.
        
        Called on startup or when user connects.
        """
        from app.core.database import async_session_maker
        from app.models import Portfolio as DBPortfolio
        
        try:
            async with async_session_maker() as session:
                from sqlalchemy import select
                from sqlalchemy.orm import selectinload
                
                result = await session.execute(
                    select(DBPortfolio)
                    .options(selectinload(DBPortfolio.positions))
                    .where(DBPortfolio.user_id == user_id)
                )
                db_portfolio = result.scalar_one_or_none()
                
                if db_portfolio:
                    portfolio = UserPortfolio(
                        id=db_portfolio.id,
                        user_id=db_portfolio.user_id,
                        balance=db_portfolio.balance,
                        starting_balance=db_portfolio.starting_balance,
                        leverage=db_portfolio.leverage,
                        max_equity_watermark=db_portfolio.max_drawdown_watermark,
                        is_liquidated=db_portfolio.is_liquidated,
                        is_active=db_portfolio.is_active,
                    )
                    
                    # Load positions
                    for db_pos in db_portfolio.positions:
                        portfolio.positions[db_pos.symbol] = UserPosition(
                            id=db_pos.id,
                            portfolio_id=db_pos.portfolio_id,
                            symbol=db_pos.symbol,
                            side=db_pos.side,
                            qty=db_pos.qty,
                            entry_price=db_pos.entry_price,
                            current_price=db_pos.current_price,
                            unrealized_pnl=db_pos.unrealized_pnl,
                            realized_pnl=db_pos.realized_pnl,
                            leverage=db_pos.leverage,
                            liquidation_price=db_pos.liquidation_price,
                        )
                    
                    self._portfolios[user_id] = portfolio
                    logger.info(f"Loaded portfolio for user {user_id} from database")
                    return portfolio
                    
        except Exception as e:
            logger.error(f"Failed to load portfolio from database: {e}")
        
        return None
    
    def get_stats(self) -> dict:
        """Get manager statistics"""
        active_count = sum(1 for p in self._portfolios.values() if p.is_active)
        liquidated_count = sum(1 for p in self._portfolios.values() if p.is_liquidated)
        
        return {
            "total_portfolios": len(self._portfolios),
            "active_portfolios": active_count,
            "liquidated_portfolios": liquidated_count,
            "current_prices": {k: str(v) for k, v in self._current_prices.items()},
            "subscriber_count": len(self._update_subscribers),
        }


# Global singleton instance
portfolio_manager: Optional[PortfolioManager] = None


def get_portfolio_manager() -> PortfolioManager:
    """Get or create the global portfolio manager instance"""
    global portfolio_manager
    if portfolio_manager is None:
        portfolio_manager = PortfolioManager()
    return portfolio_manager
