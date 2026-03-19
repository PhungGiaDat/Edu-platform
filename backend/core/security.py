# core/security.py
"""
Unified Security Module for MongoDB JWT Authentication
Replacing Supabase-specific implementation
"""
import os
os.environ.setdefault("PASSLIB_BCRYPT_DEFAULT_ROUNDS", "12")

from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from pydantic import BaseModel
from typing import Optional, Union, Any
from datetime import datetime, timedelta
import logging
from settings import settings
from models.user_mongo import UserDocument

logger = logging.getLogger(__name__)

# Password hashing configuration
# Use only bcrypt, no deprecated algorithms
pwd_context = CryptContext(
    schemes=["bcrypt"],
    deprecated="auto"
)

# OAuth2 scheme for token extraction
oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl=f"{settings.API_V1_PREFIX}/auth/login"
)

# ========== Token Models ==========

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenPayload(BaseModel):
    sub: Optional[str] = None # User ID
    exp: Optional[int] = None

# ========== Password Hashing ==========

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verify a plain text password against a hashed password
    Bcrypt has a 72-byte limit for password input
    """
    # Truncate password if it exceeds 72 bytes (bcrypt limit)
    truncated_password = plain_password[:72]
    try:
        return pwd_context.verify(truncated_password, hashed_password)
    except ValueError as e:
        logger.error(f"Password verification error: {e}")
        # Return False instead of raising exception to avoid HTTP 500
        return False

def get_password_hash(password: str) -> str:
    """
    Hash a plain text password using bcrypt
    Bcrypt has a 72-byte limit for password input
    """
    # Truncate password if it exceeds 72 bytes (bcrypt limit)
    truncated_password = password[:72]
    try:
        return pwd_context.hash(truncated_password)
    except ValueError as e:
        logger.error(f"Password hashing error: {e}")
        raise

# ========== JWT Token Management ==========

def create_access_token(
    subject: Union[str, Any], expires_delta: Optional[timedelta] = None
) -> str:
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(
            minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
        )
    to_encode = {"exp": expire, "sub": str(subject)}
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt

# ========== Current User Dependency ==========

async def get_current_user(
    token: str = Depends(oauth2_scheme)
) -> UserDocument:
    """
    FastAPI dependency to get current authenticated user Document from MongoDB
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(
            token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM]
        )
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
        token_data = TokenPayload(sub=user_id)
    except JWTError:
        raise credentials_exception

    user = await UserDocument.get(token_data.sub)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    
    if not user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
        
    return user

async def get_current_active_superuser(
    current_user: UserDocument = Depends(get_current_user),
) -> UserDocument:
    if not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail="The user doesn't have enough privileges"
        )
    return current_user
