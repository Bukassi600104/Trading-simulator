"""
Authentication API routes for Terminal Zero

Supports two modes:
1. Supabase Auth (production) - when SUPABASE_URL is configured
2. Local auth (development) - direct bcrypt + self-signed JWT fallback

Endpoints:
- POST /api/auth/register - Create new user account
- POST /api/auth/login - Login and get token pair
- POST /api/auth/logout - Logout (blacklist tokens)
- POST /api/auth/refresh - Refresh token
- GET /api/auth/me - Get current user profile
- POST /api/auth/demo - Get demo account token
- POST /api/auth/sync - Sync Supabase user to local DB
- POST /api/auth/forgot-password - Request password reset
- POST /api/auth/reset-password - Reset password with token
"""

import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from loguru import logger
from pydantic import BaseModel, EmailStr
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import (
    SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY,
    SUPABASE_URL,
)
from app.core.database import get_session
from app.core.security import (
    ACCESS_TOKEN_EXPIRE_MINUTES,
    TokenData,
    TokenPair,
    blacklist_token,
    clear_failed_logins,
    create_token_pair,
    get_lockout_status,
    hash_password,
    record_failed_login,
    require_auth,
    verify_password,
)
from app.models.user import User, UserTier

router = APIRouter(prefix="/api/auth", tags=["authentication"])

# Whether Supabase is configured
_USE_SUPABASE = bool(SUPABASE_URL and SUPABASE_ANON_KEY)


# ============================================================================
# Supabase client (lazy singleton) - only used when configured
# ============================================================================

_supabase_client = None
_supabase_admin_client = None


async def get_supabase():
    """Get or create the Supabase async client (anon key)."""
    global _supabase_client
    if _supabase_client is None:
        from supabase import acreate_client
        _supabase_client = await acreate_client(SUPABASE_URL, SUPABASE_ANON_KEY)
    return _supabase_client


async def get_supabase_admin():
    """Get or create the Supabase async client (service role key)."""
    global _supabase_admin_client
    if _supabase_admin_client is None:
        from supabase import acreate_client
        _supabase_admin_client = await acreate_client(
            SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
        )
    return _supabase_admin_client


# ============================================================================
# Request/Response Models
# ============================================================================

class RegisterRequest(BaseModel):
    email: EmailStr
    password: str


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class RefreshRequest(BaseModel):
    refresh_token: str


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str


class UserResponse(BaseModel):
    id: str
    email: str
    tier: str
    is_active: bool
    created_at: str

    class Config:
        from_attributes = True


class AuthResponse(BaseModel):
    token: TokenPair
    user: UserResponse


# ============================================================================
# Helper
# ============================================================================

def _user_response(user: User) -> UserResponse:
    return UserResponse(
        id=str(user.id),
        email=user.email,
        tier=user.tier.value,
        is_active=user.is_active,
        created_at=user.created_at.isoformat(),
    )


def _build_token_pair(session_data) -> TokenPair:
    """Build a TokenPair from Supabase auth session data."""
    return TokenPair(
        access_token=session_data.access_token,
        refresh_token=session_data.refresh_token,
        token_type="bearer",
        expires_in=session_data.expires_in or ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )


# ============================================================================
# Authentication Endpoints
# ============================================================================

@router.post(
    "/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED
)
async def register(
    request: RegisterRequest,
    session: AsyncSession = Depends(get_session),
) -> AuthResponse:
    """Register a new user account."""
    # Check if email already exists locally
    existing = await session.execute(
        select(User).where(User.email == request.email)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered",
        )

    if _USE_SUPABASE:
        return await _register_supabase(request, session)
    return await _register_local(request, session)


async def _register_supabase(
    request: RegisterRequest, session: AsyncSession
) -> AuthResponse:
    try:
        supabase = await get_supabase()
        auth_response = await supabase.auth.sign_up(
            {"email": request.email, "password": request.password}
        )
    except Exception as e:
        logger.error(f"Supabase sign_up failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Registration failed. Please try again.",
        )

    if not auth_response.user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Registration failed. Please try again.",
        )

    if not auth_response.session:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Registration failed - email confirmation may be required.",
        )

    supabase_user_id = uuid.UUID(auth_response.user.id)
    user = User(
        id=supabase_user_id,
        email=request.email,
        hashed_password="managed-by-supabase",
        tier=UserTier.FREE,
        is_active=True,
    )
    session.add(user)
    await session.commit()
    await session.refresh(user)

    token_pair = _build_token_pair(auth_response.session)
    return AuthResponse(token=token_pair, user=_user_response(user))


async def _register_local(
    request: RegisterRequest, session: AsyncSession
) -> AuthResponse:
    """Register with local bcrypt password hashing + self-signed JWT."""
    user_id = uuid.uuid4()
    user = User(
        id=user_id,
        email=request.email,
        hashed_password=hash_password(request.password),
        tier=UserTier.FREE,
        is_active=True,
    )
    session.add(user)
    await session.commit()
    await session.refresh(user)

    token_pair = create_token_pair(str(user_id), request.email)
    return AuthResponse(token=token_pair, user=_user_response(user))


@router.post("/login", response_model=AuthResponse)
async def login(
    request: LoginRequest,
    session: AsyncSession = Depends(get_session),
) -> AuthResponse:
    """Login with email and password."""
    # Check account lockout
    is_locked, remaining = await get_lockout_status(request.email)
    if is_locked:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Account temporarily locked. Try again in {remaining} seconds.",
            headers={"Retry-After": str(remaining)},
        )

    if _USE_SUPABASE:
        return await _login_supabase(request, session)
    return await _login_local(request, session)


async def _login_supabase(
    request: LoginRequest, session: AsyncSession
) -> AuthResponse:
    try:
        supabase = await get_supabase()
        auth_response = await supabase.auth.sign_in_with_password(
            {"email": request.email, "password": request.password}
        )
    except Exception as e:
        logger.warning(f"Supabase sign_in failed for {request.email}: {e}")
        attempts = await record_failed_login(request.email)
        remaining_attempts = max(0, 5 - attempts)
        detail = "Incorrect email or password"
        if remaining_attempts > 0:
            detail += f" ({remaining_attempts} attempts remaining)"
        else:
            detail = "Account temporarily locked. Try again in 15 minutes."
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=detail,
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not auth_response.user or not auth_response.session:
        attempts = await record_failed_login(request.email)
        remaining_attempts = max(0, 5 - attempts)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Incorrect email or password ({remaining_attempts} attempts remaining)",
            headers={"WWW-Authenticate": "Bearer"},
        )

    await clear_failed_logins(request.email)

    supabase_user_id = uuid.UUID(auth_response.user.id)
    result = await session.execute(
        select(User).where(User.id == supabase_user_id)
    )
    user = result.scalar_one_or_none()

    if not user:
        user = User(
            id=supabase_user_id,
            email=request.email,
            hashed_password="managed-by-supabase",
            tier=UserTier.FREE,
            is_active=True,
        )
        session.add(user)
        await session.commit()
        await session.refresh(user)

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is disabled",
        )

    token_pair = _build_token_pair(auth_response.session)
    return AuthResponse(token=token_pair, user=_user_response(user))


async def _login_local(
    request: LoginRequest, session: AsyncSession
) -> AuthResponse:
    """Login with local bcrypt verification + self-signed JWT."""
    result = await session.execute(
        select(User).where(User.email == request.email)
    )
    user = result.scalar_one_or_none()

    if not user or not verify_password(request.password, user.hashed_password):
        attempts = await record_failed_login(request.email)
        remaining_attempts = max(0, 5 - attempts)
        detail = "Incorrect email or password"
        if remaining_attempts > 0:
            detail += f" ({remaining_attempts} attempts remaining)"
        else:
            detail = "Account temporarily locked. Try again in 15 minutes."
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=detail,
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is disabled",
        )

    await clear_failed_logins(request.email)
    token_pair = create_token_pair(str(user.id), user.email)
    return AuthResponse(token=token_pair, user=_user_response(user))


@router.post("/logout")
async def logout(
    token_data: TokenData = Depends(require_auth),
    credentials: HTTPAuthorizationCredentials = Depends(HTTPBearer()),
):
    """Logout - blacklist the current access token."""
    access_token = credentials.credentials

    if token_data.exp:
        remaining = int(
            (token_data.exp - __import__("datetime").datetime.now(
                __import__("datetime").timezone.utc
            )).total_seconds()
        )
        remaining = max(remaining, 0)
    else:
        remaining = ACCESS_TOKEN_EXPIRE_MINUTES * 60

    await blacklist_token(access_token, remaining)
    return {"message": "Successfully logged out"}


@router.post("/refresh", response_model=AuthResponse)
async def refresh_tokens(
    request: RefreshRequest,
    session: AsyncSession = Depends(get_session),
) -> AuthResponse:
    """Refresh the session."""
    if _USE_SUPABASE:
        try:
            supabase = await get_supabase()
            auth_response = await supabase.auth.refresh_session(request.refresh_token)
        except Exception as e:
            logger.warning(f"Supabase refresh_session failed: {e}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired refresh token",
                headers={"WWW-Authenticate": "Bearer"},
            )

        if not auth_response.user or not auth_response.session:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired refresh token",
                headers={"WWW-Authenticate": "Bearer"},
            )

        supabase_user_id = uuid.UUID(auth_response.user.id)
        result = await session.execute(
            select(User).where(User.id == supabase_user_id)
        )
        user = result.scalar_one_or_none()

        if not user or not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User account not found or disabled",
            )

        token_pair = _build_token_pair(auth_response.session)
        return AuthResponse(token=token_pair, user=_user_response(user))

    # Local fallback: decode refresh token and issue new pair
    from app.core.security import decode_access_token
    token_data = decode_access_token(request.refresh_token)
    if not token_data:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token",
        )

    result = await session.execute(
        select(User).where(User.id == uuid.UUID(token_data.user_id))
    )
    user = result.scalar_one_or_none()
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account not found or disabled",
        )

    token_pair = create_token_pair(str(user.id), user.email)
    return AuthResponse(token=token_pair, user=_user_response(user))


@router.post("/sync", response_model=UserResponse)
async def sync_user(
    token_data: TokenData = Depends(require_auth),
    session: AsyncSession = Depends(get_session),
) -> UserResponse:
    """Sync a Supabase user to the local database (idempotent)."""
    uid = uuid.UUID(token_data.user_id)
    email = token_data.email or ""

    result = await session.execute(select(User).where(User.id == uid))
    user = result.scalar_one_or_none()

    if not user:
        user = User(
            id=uid,
            email=email,
            hashed_password="managed-by-supabase",
            tier=UserTier.FREE,
            is_active=True,
        )
        session.add(user)
        await session.commit()
        await session.refresh(user)

    return _user_response(user)


@router.get("/me", response_model=UserResponse)
async def get_me(
    token_data: TokenData = Depends(require_auth),
    session: AsyncSession = Depends(get_session),
) -> UserResponse:
    """Get current authenticated user's profile."""
    result = await session.execute(
        select(User).where(User.id == uuid.UUID(token_data.user_id))
    )
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    return _user_response(user)


@router.post("/demo", response_model=AuthResponse)
async def get_demo_token(
    session: AsyncSession = Depends(get_session),
) -> AuthResponse:
    """Get a demo account token for unauthenticated users."""
    demo_user_id = uuid.UUID("00000000-0000-0000-0000-000000000001")
    demo_email = "demo@terminalzero.com"

    result = await session.execute(
        select(User).where(User.id == demo_user_id)
    )
    user = result.scalar_one_or_none()

    if not user:
        user = User(
            id=demo_user_id,
            email=demo_email,
            hashed_password="managed-by-supabase",
            tier=UserTier.FREE,
            is_active=True,
        )
        session.add(user)
        await session.commit()
        await session.refresh(user)

    # Try Supabase first if configured
    if _USE_SUPABASE:
        try:
            supabase = await get_supabase()
            auth_response = await supabase.auth.sign_in_with_password(
                {"email": demo_email, "password": "DemoPass1!"}
            )
            if auth_response.session:
                token_pair = _build_token_pair(auth_response.session)
                return AuthResponse(token=token_pair, user=_user_response(user))
        except Exception:
            logger.debug("Supabase demo login unavailable, using fallback JWT")

    # Fallback: self-signed token
    token_pair = create_token_pair(str(demo_user_id), demo_email)
    return AuthResponse(token=token_pair, user=_user_response(user))


@router.post("/forgot-password")
async def forgot_password(request: ForgotPasswordRequest):
    """Request a password reset."""
    if _USE_SUPABASE:
        try:
            supabase = await get_supabase()
            await supabase.auth.reset_password_for_email(request.email)
        except Exception as e:
            logger.warning(f"Password reset request failed: {e}")
        # Always return success to prevent email enumeration
        return {"message": "If an account exists, a reset link has been sent."}

    # Local fallback: generate a reset token
    from app.core.security import create_access_token
    reset_token = create_access_token(
        user_id="reset", email=request.email, expires_minutes=30
    )
    return {
        "message": "Password reset token generated (dev mode).",
        "reset_token": reset_token,
    }


@router.post("/reset-password")
async def reset_password(
    request: ResetPasswordRequest,
    session: AsyncSession = Depends(get_session),
):
    """Reset password with a token."""
    if _USE_SUPABASE:
        try:
            supabase = await get_supabase()
            await supabase.auth.update_user({"password": request.new_password})
            return {"message": "Password updated successfully"}
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Password reset failed: {str(e)}",
            )

    # Local fallback
    from app.core.security import decode_access_token
    token_data = decode_access_token(request.token)
    if not token_data or not token_data.email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset token",
        )

    result = await session.execute(
        select(User).where(User.email == token_data.email)
    )
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    user.hashed_password = hash_password(request.new_password)
    await session.commit()
    return {"message": "Password updated successfully"}
