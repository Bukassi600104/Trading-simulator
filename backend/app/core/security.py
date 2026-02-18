"""
Security module for Terminal Zero

Handles:
- Supabase JWT verification (access tokens issued by Supabase Auth)
- Token blacklisting via Redis
- Account lockout after failed login attempts
- User authentication dependencies
"""

import os
import re
import uuid
from datetime import datetime, timezone
from typing import Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from pydantic import BaseModel, field_validator

from app.core.config import REDIS_URL, SUPABASE_JWT_SECRET

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------
SECRET_KEY = os.getenv("SECRET_KEY", os.getenv("JWT_SECRET", "your-super-secret-key-change-in-production"))
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60  # Supabase default is 3600s
REFRESH_TOKEN_EXPIRE_DAYS = 7

# Account lockout
MAX_FAILED_ATTEMPTS = 5
LOCKOUT_DURATION_SECONDS = 15 * 60  # 15 minutes

# Bearer token security
security = HTTPBearer(auto_error=False)


# ---------------------------------------------------------------------------
# Redis client (lazy-init singleton)
# ---------------------------------------------------------------------------
_redis_client = None


async def get_redis():
    """Get or create the Redis client singleton."""
    global _redis_client
    if _redis_client is None:
        import redis.asyncio as aioredis
        _redis_client = aioredis.from_url(
            REDIS_URL, decode_responses=True, socket_connect_timeout=5
        )
    return _redis_client


# ---------------------------------------------------------------------------
# Pydantic models
# ---------------------------------------------------------------------------

class TokenData(BaseModel):
    """Data contained in JWT token"""
    user_id: str
    email: Optional[str] = None
    exp: Optional[datetime] = None


class Token(BaseModel):
    """Token response model"""
    access_token: str
    token_type: str = "bearer"
    expires_in: int


class TokenPair(BaseModel):
    """Access + refresh token pair returned on login/refresh"""
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int


class PasswordStrength(BaseModel):
    """Validated password field with strength requirements."""
    password: str

    @field_validator("password")
    @classmethod
    def validate_password_strength(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        if len(v) > 128:
            raise ValueError("Password must be at most 128 characters")
        if not re.search(r"[A-Z]", v):
            raise ValueError("Password must contain at least one uppercase letter")
        if not re.search(r"\d", v):
            raise ValueError("Password must contain at least one digit")
        if not re.search(r"[!@#$%^&*()_+\-=\[\]{};':\"\\|,.<>/?`~]", v):
            raise ValueError("Password must contain at least one special character")
        return v


# ---------------------------------------------------------------------------
# JWT verification (Supabase tokens)
# ---------------------------------------------------------------------------

# ---------------------------------------------------------------------------
# Password hashing (local fallback when Supabase is not configured)
# ---------------------------------------------------------------------------

def hash_password(password: str) -> str:
    """Hash a password using bcrypt."""
    import bcrypt
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against a bcrypt hash."""
    if hashed_password == "managed-by-supabase":
        return False
    import bcrypt
    return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))


def create_access_token(user_id: str, email: str, expires_minutes: int = ACCESS_TOKEN_EXPIRE_MINUTES) -> str:
    """Create a self-signed JWT access token (local fallback)."""
    from datetime import timedelta
    now = datetime.now(timezone.utc)
    payload = {
        "sub": user_id,
        "email": email,
        "exp": now + timedelta(minutes=expires_minutes),
        "iat": now,
    }
    return jwt.encode(payload, _get_jwt_secret(), algorithm=ALGORITHM)


def create_token_pair(user_id: str, email: str) -> "TokenPair":
    """Create an access + refresh token pair (local fallback)."""
    access = create_access_token(user_id, email)
    refresh = create_access_token(user_id, email, expires_minutes=REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60)
    return TokenPair(
        access_token=access,
        refresh_token=refresh,
        token_type="bearer",
        expires_in=ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )


# ---------------------------------------------------------------------------
# JWT verification (Supabase tokens or self-signed)
# ---------------------------------------------------------------------------

def _get_jwt_secret() -> str:
    """Return the secret used for JWT verification.

    Prefers SUPABASE_JWT_SECRET; falls back to SECRET_KEY for backwards
    compatibility (e.g. demo tokens, tests).
    """
    return SUPABASE_JWT_SECRET or SECRET_KEY


def decode_access_token(token: str) -> Optional[TokenData]:
    """Decode and validate a Supabase JWT access token.

    Supabase JWTs use the `sub` claim for the user id and `email` claim
    for the email address.  We accept tokens with any `typ` except
    explicit refresh tokens.
    """
    secret = _get_jwt_secret()
    try:
        payload = jwt.decode(
            token, secret, algorithms=[ALGORITHM],
            options={"verify_aud": False},
        )
        # Reject refresh tokens used as access tokens
        if payload.get("typ") == "refresh":
            return None
        user_id: str = payload.get("sub")
        email: str = payload.get("email")
        exp_ts = payload.get("exp")
        exp: datetime = (
            datetime.fromtimestamp(exp_ts, tz=timezone.utc) if exp_ts else None
        )
        if user_id is None:
            return None
        return TokenData(user_id=user_id, email=email, exp=exp)
    except JWTError:
        return None


# ---------------------------------------------------------------------------
# Token blacklisting (Redis)
# ---------------------------------------------------------------------------

async def blacklist_token(token: str, expires_in_seconds: int) -> None:
    """Add a token to the blacklist in Redis with TTL matching token expiry."""
    r = await get_redis()
    secret = _get_jwt_secret()
    try:
        payload = jwt.decode(
            token, secret, algorithms=[ALGORITHM],
            options={"verify_aud": False, "verify_exp": False},
        )
        jti = payload.get("jti", token[:64])
    except JWTError:
        jti = token[:64]
    await r.setex(f"blacklist:{jti}", expires_in_seconds, "1")


async def is_token_blacklisted(token: str) -> bool:
    """Check if a token has been blacklisted."""
    r = await get_redis()
    secret = _get_jwt_secret()
    try:
        payload = jwt.decode(
            token, secret, algorithms=[ALGORITHM],
            options={"verify_exp": False, "verify_aud": False},
        )
        jti = payload.get("jti", token[:64])
    except JWTError:
        jti = token[:64]
    result = await r.get(f"blacklist:{jti}")
    return result is not None


# ---------------------------------------------------------------------------
# Account lockout (Redis)
# ---------------------------------------------------------------------------

async def record_failed_login(email: str) -> int:
    """Record a failed login attempt. Returns the current attempt count."""
    r = await get_redis()
    key = f"login_attempts:{email}"
    count = await r.incr(key)
    if count == 1:
        await r.expire(key, LOCKOUT_DURATION_SECONDS)
    return count


async def clear_failed_logins(email: str) -> None:
    """Clear failed login attempts on successful login."""
    r = await get_redis()
    await r.delete(f"login_attempts:{email}")


async def get_lockout_status(email: str) -> tuple[bool, int]:
    """Check if an account is locked out.

    Returns (is_locked, remaining_seconds).
    """
    r = await get_redis()
    key = f"login_attempts:{email}"
    count = await r.get(key)
    if count is None:
        return False, 0
    if int(count) >= MAX_FAILED_ATTEMPTS:
        ttl = await r.ttl(key)
        return True, max(ttl, 0)
    return False, 0


# ---------------------------------------------------------------------------
# FastAPI dependencies
# ---------------------------------------------------------------------------

async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
) -> Optional[TokenData]:
    """Dependency to get the current authenticated user.

    Returns None if no valid token is provided (for optional auth).
    """
    if credentials is None:
        return None

    token = credentials.credentials

    # Check blacklist
    if await is_token_blacklisted(token):
        return None

    token_data = decode_access_token(token)
    if token_data is None:
        return None

    return token_data


async def require_auth(
    credentials: HTTPAuthorizationCredentials = Depends(HTTPBearer()),
) -> TokenData:
    """Dependency that requires authentication.

    Raises HTTPException if user is not authenticated or token is blacklisted.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    token = credentials.credentials

    # Check blacklist
    if await is_token_blacklisted(token):
        raise credentials_exception

    token_data = decode_access_token(token)
    if token_data is None:
        raise credentials_exception

    return token_data


def get_user_id_from_token(token_data: Optional[TokenData]) -> uuid.UUID:
    """Extract user UUID from token data, or return demo user ID"""
    if token_data and token_data.user_id:
        try:
            return uuid.UUID(token_data.user_id)
        except ValueError:
            pass
    return uuid.UUID("00000000-0000-0000-0000-000000000001")
