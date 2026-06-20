"""Configuration constants for Trading Simulator"""

import os
from decimal import Decimal
from enum import Enum

# Infrastructure URLs
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379")

# Supabase Configuration (relational app data; auth pivots to Firebase)
SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY", "")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
SUPABASE_JWT_SECRET = os.getenv("SUPABASE_JWT_SECRET", "")

# ---------------------------------------------------------------------------
# Firebase Auth (identity provider — verified in the API layer)
# ---------------------------------------------------------------------------
# Firebase ID tokens are RS256 JWTs signed by Google. They are verified against
# Google's PUBLIC certificates using only the project id — no service-account
# JSON is required for verification. Set FIREBASE_PROJECT_ID to enable.
FIREBASE_PROJECT_ID = os.getenv("FIREBASE_PROJECT_ID", "")
FIREBASE_ENABLED = bool(FIREBASE_PROJECT_ID)
# Deterministic namespace so a Firebase UID always maps to the same Supabase
# User row UUID without a DB round-trip in the auth hot path.
FIREBASE_UID_NAMESPACE = os.getenv(
    "FIREBASE_UID_NAMESPACE", "8f1d4c2e-0b3a-4c5d-9e6f-1a2b3c4d5e6f"
)

# ---------------------------------------------------------------------------
# Cloudflare R2 object storage (Parquet historicals + screenshots)
# S3-compatible. Replaces AWS S3. Optional — falls back to local disk in dev.
# ---------------------------------------------------------------------------
R2_ACCOUNT_ID = os.getenv("R2_ACCOUNT_ID", "")
R2_ACCESS_KEY_ID = os.getenv("R2_ACCESS_KEY_ID", "")
R2_SECRET_ACCESS_KEY = os.getenv("R2_SECRET_ACCESS_KEY", "")
R2_BUCKET = os.getenv("R2_BUCKET", "terminal-zero")
R2_ENDPOINT = os.getenv(
    "R2_ENDPOINT",
    f"https://{R2_ACCOUNT_ID}.r2.cloudflarestorage.com" if R2_ACCOUNT_ID else "",
)
# Public base URL for serving objects (R2 public bucket or custom domain).
R2_PUBLIC_BASE_URL = os.getenv("R2_PUBLIC_BASE_URL", "")
R2_ENABLED = bool(R2_ACCESS_KEY_ID and R2_SECRET_ACCESS_KEY and R2_ENDPOINT)

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


# ---------------------------------------------------------------------------
# School / academy domain enums (teacher-led training academy model)
# Stored as plain strings in the DB (column default = the value) to keep
# migrations simple and avoid Postgres ENUM-type churn.
# ---------------------------------------------------------------------------

class UserRole(str, Enum):
    SCHOOL_ADMIN = "school_admin"
    INSTRUCTOR = "instructor"
    STUDENT = "student"
    SOLO_LEARNER = "solo_learner"


class SchoolTier(str, Enum):
    STARTER = "starter"      # free/low — one cohort, no AI coach
    GROWTH = "growth"        # AI coach on, forecast overlay, real pool
    ACADEMY = "academy"      # large counts, co-instructors, full coach


class SubscriptionStatus(str, Enum):
    ACTIVE = "active"
    PAST_DUE = "past_due"
    CANCELED = "canceled"
    TRIALING = "trialing"


class ScenarioType(str, Enum):
    REPLAY = "replay"        # deterministic historical replay
    SYNTHETIC = "synthetic"  # Kronos-generated novel market


class ReplaySessionState(str, Enum):
    SCHEDULED = "scheduled"
    RUNNING = "running"
    COMPLETE = "complete"


class CoachStatus(str, Enum):
    PENDING = "pending"
    DONE = "done"
    SKIPPED = "skipped"


# Default leverage ceiling for cohorts — sane and well below the old 100x.
DEFAULT_COHORT_LEVERAGE_CAP = 20
