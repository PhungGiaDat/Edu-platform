# core/security.py
"""
Security Module for Supabase JWT Authentication

Architecture: Hybrid Database Security Layer
- Verifies Supabase JWT tokens
- Extracts user information from tokens
- FastAPI dependencies for protected routes
"""
import jwt
from jwt import PyJWTError
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
import logging

logger = logging.getLogger(__name__)


# ========== Security Scheme ==========
security_scheme = HTTPBearer(
    scheme_name="Supabase JWT",
    description="Enter your Supabase access token",
    auto_error=False  # Don't auto-raise, let us handle it
)


# ========== Token Payload Models ==========
class TokenPayload(BaseModel):
    """Decoded JWT payload from Supabase"""
    sub: str  # User ID (UUID)
    email: Optional[str] = None
    phone: Optional[str] = None
    role: Optional[str] = "authenticated"
    aud: Optional[str] = None  # Audience
    exp: Optional[int] = None  # Expiration timestamp
    iat: Optional[int] = None  # Issued at timestamp
    
    # Supabase specific claims
    app_metadata: Optional[dict] = None
    user_metadata: Optional[dict] = None


class CurrentUser(BaseModel):
    """Simplified user model for route handlers"""
    id: str
    email: Optional[str] = None
    role: str = "authenticated"
    is_authenticated: bool = True
    metadata: Optional[dict] = None


# ========== JWT Verification ==========
def verify_supabase_token(
    token: str,
    jwt_secret: str,
    algorithms: list[str] = ["HS256"]
) -> TokenPayload:
    """
    Verify and decode a Supabase JWT token
    
    Args:
        token: The JWT token string
        jwt_secret: Supabase JWT secret
        algorithms: List of allowed algorithms
        
    Returns:
        TokenPayload: Decoded token payload
        
    Raises:
        HTTPException: If token is invalid or expired
    """
    try:
        payload = jwt.decode(
            token,
            jwt_secret,
            algorithms=algorithms,
            audience="authenticated"  # Supabase default audience
        )
        return TokenPayload(**payload)
    except jwt.ExpiredSignatureError:
        logger.warning("[Security] Token expired")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired",
            headers={"WWW-Authenticate": "Bearer"}
        )
    except jwt.InvalidAudienceError:
        logger.warning("[Security] Invalid token audience")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token audience",
            headers={"WWW-Authenticate": "Bearer"}
        )
    except PyJWTError as e:
        logger.warning(f"[Security] JWT decode error: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"}
        )


# ========== Dependency Factory ==========
def create_get_current_user(jwt_secret: str):
    """
    Factory function to create get_current_user dependency
    
    Usage:
        from backend.settings import settings
        
        get_current_user = create_get_current_user(settings.SECRET_KEY)
        
        @router.get("/profile")
        async def get_profile(user: CurrentUser = Depends(get_current_user)):
            return {"user_id": user.id, "email": user.email}
    """
    async def get_current_user(
        credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_scheme)
    ) -> CurrentUser:
        """
        FastAPI dependency to get current authenticated user
        
        Extracts and validates JWT from Authorization header
        """
        if credentials is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Authorization header missing",
                headers={"WWW-Authenticate": "Bearer"}
            )
        
        token = credentials.credentials
        payload = verify_supabase_token(token, jwt_secret)
        
        return CurrentUser(
            id=payload.sub,
            email=payload.email,
            role=payload.role or "authenticated",
            is_authenticated=True,
            metadata=payload.user_metadata
        )
    
    return get_current_user


def create_get_optional_user(jwt_secret: str):
    """
    Factory function for optional authentication
    
    Returns None if no token provided, or CurrentUser if valid token
    """
    async def get_optional_user(
        credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_scheme)
    ) -> Optional[CurrentUser]:
        if credentials is None:
            return None
        
        try:
            token = credentials.credentials
            payload = verify_supabase_token(token, jwt_secret)
            
            return CurrentUser(
                id=payload.sub,
                email=payload.email,
                role=payload.role or "authenticated",
                is_authenticated=True,
                metadata=payload.user_metadata
            )
        except HTTPException:
            return None
    
    return get_optional_user


# ========== Role-Based Access Control ==========
def require_role(required_roles: list[str]):
    """
    Dependency factory for role-based access control
    
    Usage:
        @router.delete("/admin/users/{user_id}")
        async def delete_user(
            user_id: str,
            user: CurrentUser = Depends(require_role(["admin"]))
        ):
            ...
    """
    def role_checker(user: CurrentUser) -> CurrentUser:
        if user.role not in required_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Role '{user.role}' not authorized. Required: {required_roles}"
            )
        return user
    
    return role_checker


# ========== Token Utilities ==========
def extract_token_from_header(authorization: str) -> str:
    """Extract token from 'Bearer <token>' header"""
    if not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authorization header format"
        )
    return authorization[7:]  # Remove 'Bearer ' prefix
