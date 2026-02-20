"""API module exports"""

from .admin import router as admin_router
from .auth import router as auth_router
from .challenges import router as challenges_router
from .competitions import router as competitions_router
from .gamification import router as gamification_router
from .journal import router as journal_router
from .leaderboard import router as leaderboard_router
from .payments import router as payments_router
from .portfolio import router as portfolio_router
from .trading import router as trading_router

__all__ = [
    "trading_router",
    "auth_router",
    "journal_router",
    "payments_router",
    "admin_router",
    "challenges_router",
    "competitions_router",
    "gamification_router",
    "leaderboard_router",
    "portfolio_router",
]
