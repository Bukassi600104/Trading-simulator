"""Configuration constants for Trading Simulator"""

import os
from decimal import Decimal
from enum import Enum

# Infrastructure URLs
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379")

# Supabase Configuration
SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY", "")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
SUPABASE_JWT_SECRET = os.getenv("SUPABASE_JWT_SECRET", "")

# Trading Configuration
DEFAULT_STARTING_BALANCE = Decimal("10000.00")  # $10,000 USDT
SUPPORTED_LEVERAGE = [2, 5, 10, 15, 20, 25]
DEFAULT_LEVERAGE = 10
FEE_RATE = Decimal("0.0006")  # 0.06% like Bybit

# Supported trading pairs
SUPPORTED_SYMBOLS = [
    "BTC-USDT",
    "ETH-USDT",
    "SOL-USDT",
    "BNB-USDT",
    "XRP-USDT",
    "DOGE-USDT",
]

# Bybit WebSocket symbol names (without hyphen)
BYBIT_SYMBOLS = [s.replace("-", "") for s in SUPPORTED_SYMBOLS]

# Maintenance margin rate (Bybit-style)
MAINTENANCE_MARGIN_RATE = Decimal("0.005")

# Margin call warning threshold (80% of liquidation)
MARGIN_CALL_THRESHOLD = Decimal("0.80")

# Payment Configuration (NGN)
TIER_PRICES = {
    "PRO": Decimal("5000.00"),
    "PROP_CHALLENGE": Decimal("15000.00")
}


class UserTier(str, Enum):
    FREE = "FREE"
    PRO = "PRO"
    PROP_CHALLENGE = "PROP_CHALLENGE"


class OrderSide(str, Enum):
    BUY = "BUY"
    SELL = "SELL"


class OrderType(str, Enum):
    MARKET = "MARKET"
    LIMIT = "LIMIT"
    STOP = "STOP"


class OrderStatus(str, Enum):
    OPEN = "OPEN"
    FILLED = "FILLED"
    CANCELED = "CANCELED"
    PARTIALLY_FILLED = "PARTIALLY_FILLED"


class PositionSide(str, Enum):
    LONG = "LONG"
    SHORT = "SHORT"
    FLAT = "FLAT"
