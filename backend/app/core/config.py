"""Configuration constants for Trading Simulator"""

from decimal import Decimal
from enum import Enum

# Trading Configuration
DEFAULT_STARTING_BALANCE = Decimal("10000.00")  # $10,000 USDT
SUPPORTED_LEVERAGE = [2, 5, 10, 15, 20, 25]
DEFAULT_LEVERAGE = 10
FEE_RATE = Decimal("0.0006")  # 0.06% like Bybit

# Supported trading pairs
SUPPORTED_SYMBOLS = ["BTC-USDT", "ETH-USDT"]

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
