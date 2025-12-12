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

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_session
from app.core.security import (
    ACCESS_TOKEN_EXPIRE_MINUTES,
    Token,
    TokenData,
    create_access_token,
    hash_password,
    require_auth,
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
