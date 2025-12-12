"""API module exports"""

from .admin import router as admin_router
from .auth import router as auth_router
from .journal import router as journal_router
from .payments import router as payments_router
from .trading import router as trading_router

__all__ = [
    "trading_router",
    "auth_router",
    "journal_router",
    "payments_router",
    "admin_router"
]
