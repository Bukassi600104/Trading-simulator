"""
Security module for Terminal Zero

Handles:
- Password hashing with bcrypt
- JWT token generation and validation
- User authentication dependencies
"""

import os
import uuid
import hashlib
from datetime import datetime, timedelta
from typing import Optional

import bcrypt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from pydantic import BaseModel

# Configuration
SECRET_KEY = os.getenv("SECRET_KEY", "your-super-secret-key-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24 hours

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
    if not plain_password or not hashed_password:
        return False
    try:
        return bcrypt.checkpw(
            _bcrypt_input(plain_password),
            hashed_password.encode("utf-8"),
        )
    except ValueError:
        return False


def hash_password(password: str) -> str:
    """Generate password hash"""
    hashed = bcrypt.hashpw(_bcrypt_input(password), bcrypt.gensalt())
    return hashed.decode("utf-8")


def _bcrypt_input(password: str) -> bytes:
    """Prepare password bytes for bcrypt.

    Bcrypt only handles the first 72 bytes. To safely support longer passwords
    (RegisterRequest allows up to 128 chars), we pre-hash with SHA-256 when the
    UTF-8 byte length exceeds 72 bytes.
    """
    password_bytes = password.encode("utf-8")
    if len(password_bytes) <= 72:
        return password_bytes
    return hashlib.sha256(password_bytes).digest()


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


def sha256_hex(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def create_password_reset_token(
    user_id: uuid.UUID,
    email: str,
    password_hash: str,
    expires_delta: Optional[timedelta] = None,
) -> str:
    """Create a password reset token bound to the user's current password hash.

    The token includes a digest of the current password hash so that once a
    password is changed, previously issued reset tokens become invalid.
    """
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=30)

    to_encode = {
        "typ": "pwd_reset",
        "sub": str(user_id),
        "email": email,
        "ph": sha256_hex(password_hash),
        "exp": expire,
        "iat": datetime.utcnow(),
    }

    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


class PasswordResetTokenData(BaseModel):
    user_id: str
    email: Optional[str] = None
    password_hash_digest: str
    exp: Optional[datetime] = None


def decode_password_reset_token(token: str) -> Optional[PasswordResetTokenData]:
    """Decode and validate a password reset token."""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        if payload.get("typ") != "pwd_reset":
            return None

        user_id: str = payload.get("sub")
        email: str = payload.get("email")
        password_hash_digest: str = payload.get("ph")
        exp: datetime = datetime.fromtimestamp(payload.get("exp"))

        if not user_id or not password_hash_digest:
            return None

        return PasswordResetTokenData(
            user_id=user_id,
            email=email,
            password_hash_digest=password_hash_digest,
            exp=exp,
        )
    except JWTError:
        return None


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
