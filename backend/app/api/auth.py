"""
Authentication API routes for Terminal Zero

Endpoints:
- POST /api/auth/register - Create new user account
- POST /api/auth/login - Login and get JWT token
- POST /api/auth/logout - Logout (client-side token disposal)
- GET /api/auth/me - Get current user profile
- POST /api/auth/demo - Get demo account token
"""

import uuid
import os
from datetime import timedelta

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_session
from app.core.security import (
    ACCESS_TOKEN_EXPIRE_MINUTES,
    PasswordResetTokenData,
    Token,
    TokenData,
    create_password_reset_token,
    create_access_token,
    decode_password_reset_token,
    hash_password,
    require_auth,
    sha256_hex,
    verify_password,
)
from app.models.user import User, UserTier

router = APIRouter(prefix="/api/auth", tags=["authentication"])


# ============================================================================
# Request/Response Models
# ============================================================================

class RegisterRequest(BaseModel):
    """User registration request"""
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=128)


class LoginRequest(BaseModel):
    """User login request"""
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    """User profile response"""
    id: str
    email: str
    tier: str
    is_active: bool
    created_at: str

    class Config:
        from_attributes = True


class AuthResponse(BaseModel):
    """Authentication response with token and user info"""
    token: Token
    user: UserResponse


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ForgotPasswordResponse(BaseModel):
    message: str
    reset_token: str | None = None


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str = Field(..., min_length=8, max_length=128)


class ResetPasswordResponse(BaseModel):
    message: str


# ============================================================================
# Authentication Endpoints
# ============================================================================

@router.post(
    "/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED
)
async def register(
    request: RegisterRequest,
    session: AsyncSession = Depends(get_session)
) -> AuthResponse:
    """
    Register a new user account.
    
    Creates user with FREE tier, initializes starting balance.
    Returns JWT token for immediate login.
    """
    # Check if email already exists
    existing = await session.execute(
        select(User).where(User.email == request.email)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Create new user
    user = User(
        id=uuid.uuid4(),
        email=request.email,
        hashed_password=hash_password(request.password),
        tier=UserTier.FREE,
        is_active=True,
    )
    
    session.add(user)
    await session.commit()
    await session.refresh(user)
    
    # Generate access token
    access_token = create_access_token(user.id, user.email)
    
    return AuthResponse(
        token=Token(
            access_token=access_token,
            token_type="bearer",
            expires_in=ACCESS_TOKEN_EXPIRE_MINUTES * 60
        ),
        user=UserResponse(
            id=str(user.id),
            email=user.email,
            tier=user.tier.value,
            is_active=user.is_active,
            created_at=user.created_at.isoformat()
        )
    )


@router.post("/login", response_model=AuthResponse)
async def login(
    request: LoginRequest,
    session: AsyncSession = Depends(get_session)
) -> AuthResponse:
    """
    Login with email and password.
    
    Returns JWT token if credentials are valid.
    """
    # Find user by email
    result = await session.execute(
        select(User).where(User.email == request.email)
    )
    user = result.scalar_one_or_none()
    
    if not user or not verify_password(request.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is disabled"
        )
    
    # Generate access token
    access_token = create_access_token(user.id, user.email)
    
    return AuthResponse(
        token=Token(
            access_token=access_token,
            token_type="bearer",
            expires_in=ACCESS_TOKEN_EXPIRE_MINUTES * 60
        ),
        user=UserResponse(
            id=str(user.id),
            email=user.email,
            tier=user.tier.value,
            is_active=user.is_active,
            created_at=user.created_at.isoformat()
        )
    )


@router.post("/logout")
async def logout(token_data: TokenData = Depends(require_auth)):
    """
    Logout endpoint.
    
    Note: JWT tokens are stateless - actual logout happens client-side
    by discarding the token. This endpoint exists for API consistency.
    
    Future: Could implement token blacklisting in Redis.
    """
    return {"message": "Successfully logged out"}


@router.get("/me", response_model=UserResponse)
async def get_me(
    token_data: TokenData = Depends(require_auth),
    session: AsyncSession = Depends(get_session)
) -> UserResponse:
    """
    Get current authenticated user's profile.
    """
    result = await session.execute(
        select(User).where(User.id == uuid.UUID(token_data.user_id))
    )
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    return UserResponse(
        id=str(user.id),
        email=user.email,
        tier=user.tier.value,
        is_active=user.is_active,
        created_at=user.created_at.isoformat()
    )


@router.post("/demo", response_model=AuthResponse)
async def get_demo_token(
    session: AsyncSession = Depends(get_session)
) -> AuthResponse:
    """
    Get a demo account token for unauthenticated users.
    
    Creates or retrieves the demo user account.
    """
    demo_user_id = uuid.UUID("00000000-0000-0000-0000-000000000001")
    demo_email = "demo@terminalzero.com"
    
    # Check if demo user exists
    result = await session.execute(
        select(User).where(User.id == demo_user_id)
    )
    user = result.scalar_one_or_none()
    
    if not user:
        # Create demo user
        user = User(
            id=demo_user_id,
            email=demo_email,
            hashed_password=hash_password("demo-password-not-for-login"),
            tier=UserTier.FREE,
            is_active=True,
        )
        session.add(user)
        await session.commit()
        await session.refresh(user)
    
    # Generate access token
    access_token = create_access_token(user.id, user.email)
    
    return AuthResponse(
        token=Token(
            access_token=access_token,
            token_type="bearer",
            expires_in=ACCESS_TOKEN_EXPIRE_MINUTES * 60
        ),
        user=UserResponse(
            id=str(user.id),
            email=user.email,
            tier=user.tier.value,
            is_active=user.is_active,
            created_at=user.created_at.isoformat()
        )
    )


@router.post("/forgot-password", response_model=ForgotPasswordResponse)
async def forgot_password(
    request: ForgotPasswordRequest,
    session: AsyncSession = Depends(get_session),
) -> ForgotPasswordResponse:
    """Request a password reset token.

    For security, this always returns a success message regardless of whether
    the email exists.

    In production, you would email the token/link to the user. For development
    and demo deployments, you can set RETURN_RESET_TOKEN=true to return it.
    """
    # Always return a generic success message
    generic_message = "If an account exists for that email, a reset link has been sent."

    result = await session.execute(select(User).where(User.email == request.email))
    user = result.scalar_one_or_none()

    if not user or not user.is_active:
        return ForgotPasswordResponse(message=generic_message, reset_token=None)

    token = create_password_reset_token(
        user_id=user.id,
        email=user.email,
        password_hash=user.hashed_password,
        expires_delta=timedelta(minutes=30),
    )

    return_token = os.getenv("RETURN_RESET_TOKEN", "true").lower() == "true"
    return ForgotPasswordResponse(
        message=generic_message,
        reset_token=token if return_token else None,
    )


@router.post("/reset-password", response_model=ResetPasswordResponse)
async def reset_password(
    request: ResetPasswordRequest,
    session: AsyncSession = Depends(get_session),
) -> ResetPasswordResponse:
    """Reset a user's password using a valid password reset token."""
    token_data: PasswordResetTokenData | None = decode_password_reset_token(request.token)
    if token_data is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset token",
        )

    try:
        user_id = uuid.UUID(token_data.user_id)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid reset token",
        ) from e

    result = await session.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid reset token",
        )

    # Token is bound to the current password hash; if password already changed, reject.
    if token_data.password_hash_digest != sha256_hex(user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Reset token is no longer valid",
        )

    user.hashed_password = hash_password(request.new_password)
    session.add(user)
    await session.commit()

    return ResetPasswordResponse(message="Password updated successfully")
