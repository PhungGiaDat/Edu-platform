# core/security.py
"""
Unified Security Module for MongoDB JWT Authentication
Replacing Supabase-specific implementation
"""
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from pydantic import BaseModel
from typing import Optional, Union, Any
from datetime import datetime, timedelta
import logging
from settings import settings
from repositories.postgres_user_repository import PostgresUser, PostgresUserRepository

logger = logging.getLogger(__name__)

# Password hashing configuration
# Use argon2 as primary (more secure and reliable than bcrypt)
try:
    pwd_context = CryptContext(
        schemes=["argon2"],
        deprecated="auto",
        argon2__memory_cost=65540,
        argon2__parallelism=2,
        argon2__time_cost=2,
        argon2__hash_len=32,
        argon2__salt_len=16
    )
    logger.info("Using Argon2 for password hashing")
except Exception as e:
    logger.error(f"Failed to initialize Argon2 context: {e}")
    # Fallback to bcrypt if argon2 fails
    pwd_context = CryptContext(
        schemes=["bcrypt"],
        deprecated="auto"
    )
    logger.info("Fallback to Bcrypt for password hashing")

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
    Note: Using Argon2 which doesn't have password length restrictions like bcrypt
    """
    try:
        result = pwd_context.verify(plain_password, hashed_password)
        return result
    except Exception as e:
        logger.error(f"Password verification error: {type(e).__name__}: {e}")
        # Return False instead of raising exception to avoid HTTP 500
        return False

def get_password_hash(password: str) -> str:
    """
    Hash a plain text password using Argon2
    Note: Argon2 is more secure and reliable than bcrypt
    """
    try:
        return pwd_context.hash(password)
    except Exception as e:
        logger.error(f"Password hashing error: {type(e).__name__}: {e}")
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
    secret = settings.SECRET_KEY.get_secret_value()
    encoded_jwt = jwt.encode(to_encode, secret, algorithm=settings.ALGORITHM)
    return encoded_jwt

# ========== Current User Dependency ==========

async def get_current_user(
    token: str = Depends(oauth2_scheme)
) -> PostgresUser:
    """
    FastAPI dependency to get current authenticated user Document from MongoDB
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        secret = settings.SECRET_KEY.get_secret_value()
        payload = jwt.decode(
            token, secret, algorithms=[settings.ALGORITHM]
        )
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
        token_data = TokenPayload(sub=user_id)
    except JWTError:
        raise credentials_exception

    user = await PostgresUserRepository().get_by_id(token_data.sub)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    
    if not user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
        
    return user

async def get_current_active_superuser(
    current_user: PostgresUser = Depends(get_current_user),
) -> PostgresUser:
    if not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail="The user doesn't have enough privileges"
        )
    return current_user


# ========== Teacher Role Check ==========

async def get_current_teacher(
    current_user: PostgresUser = Depends(get_current_user),
) -> PostgresUser:
    """
    FastAPI dependency to ensure the current user has teacher role
    
    Checks:
    - is_superuser flag (admin/teacher elevated privileges)
    - role field equals 'teacher' or 'admin'
    
    Returns 403 Forbidden if user is not a teacher/admin.
    """
    # Check is_superuser first (backward compatible)
    if current_user.is_superuser:
        return current_user
    
    # Check role field if it exists
    role = getattr(current_user, 'role', None)
    if role in ('teacher', 'admin'):
        return current_user
    
    # Check roles array if it exists
    roles = getattr(current_user, 'roles', [])
    if isinstance(roles, list) and ('teacher' in roles or 'admin' in roles):
        return current_user
    
    # User is authenticated but not a teacher - deny access
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Teacher privileges required to access admin dashboard"
    )
