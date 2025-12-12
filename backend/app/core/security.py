"""
Security module for Terminal Zero

Handles:
- Password hashing with bcrypt
- JWT token generation and validation
- User authentication dependencies
"""

import os
import uuid
from datetime import datetime, timedelta
from typing import Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from pydantic import BaseModel

# Configuration
SECRET_KEY = os.getenv("SECRET_KEY", "your-super-secret-key-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24 hours

# Password hashing context
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Bearer token security
security = HTTPBearer(auto_error=False)


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


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash"""
    return pwd_context.verify(plain_password, hashed_password)


def hash_password(password: str) -> str:
    """Generate password hash"""
    return pwd_context.hash(password)


def create_access_token(
    user_id: uuid.UUID,
    email: str,
    expires_delta: Optional[timedelta] = None
) -> str:
    """Create a new JWT access token"""
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode = {
        "sub": str(user_id),
        "email": email,
        "exp": expire,
        "iat": datetime.utcnow(),
    }
    
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def decode_access_token(token: str) -> Optional[TokenData]:
    """Decode and validate a JWT token"""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        email: str = payload.get("email")
        exp: datetime = datetime.fromtimestamp(payload.get("exp"))
        
        if user_id is None:
            return None
        
        return TokenData(user_id=user_id, email=email, exp=exp)
    except JWTError:
        return None


async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)
) -> Optional[TokenData]:
    """
    Dependency to get the current authenticated user.
    
    Returns None if no valid token is provided (for optional auth).
    Raises HTTPException for protected routes.
    """
    if credentials is None:
        return None
    
    token_data = decode_access_token(credentials.credentials)
    
    if token_data is None:
        return None
    
    return token_data


async def require_auth(
    credentials: HTTPAuthorizationCredentials = Depends(HTTPBearer())
) -> TokenData:
    """
    Dependency that requires authentication.
    
    Raises HTTPException if user is not authenticated.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    token_data = decode_access_token(credentials.credentials)
    
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
    
    # Return demo user ID if not authenticated
    return uuid.UUID("00000000-0000-0000-0000-000000000001")
