# api/auth.py
"""
Authentication API Endpoints
Handles registration and login using JWT and MongoDB
"""
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from datetime import timedelta
from beanie import operators
from settings import settings
import logging

logger = logging.getLogger(__name__)
from core.security import (
    create_access_token,
    get_password_hash,
    verify_password,
    get_current_user,
    Token
)
from models.user_mongo import (
    UserDocument, 
    UserCreate, 
    UserResponse
)

router = APIRouter()

@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register(user_in: UserCreate):
    """
    Register a new user
    """
    # Check if user already exists
    existing_user = await UserDocument.find_one(
        UserDocument.email == user_in.email
    )
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email already exists"
        )
    
    existing_username = await UserDocument.find_one(
        UserDocument.username == user_in.username
    )
    if existing_username:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This username is already taken"
        )

    # Create new user document
    user = UserDocument(
        email=user_in.email,
        username=user_in.username,
        full_name=user_in.full_name,
        hashed_password=get_password_hash(user_in.password),
        is_active=True
    )
    await user.insert()
    
    # Manually map to UserResponse (id is stringified by Beanie for us)
    return UserResponse(
        id=str(user.id),
        email=user.email,
        username=user.username,
        full_name=user.full_name,
        avatar_url=user.avatar_url,
        is_active=user.is_active,
        is_verified=user.is_verified,
        created_at=user.created_at
    )

@router.post("/login", response_model=Token)
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    """
    Login with username and password, returns JWT token
    Note: OAuth2 uses 'username' field, which we map to email or username
    """
    try:
        # Find user by username or email
        user = await UserDocument.find_one(
            operators.Or(
                UserDocument.username == form_data.username,
                UserDocument.email == form_data.username
            )
        )
        
        if not user:
            logger.warning(f"Login attempt with non-existent user: {form_data.username}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect username or password",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        # Verify password with proper error handling
        try:
            password_correct = verify_password(form_data.password, user.hashed_password)
        except ValueError as e:
            logger.error(f"Password verification error for user {user.username}: {e}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect username or password",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        if not password_correct:
            logger.warning(f"Login attempt with incorrect password for user: {user.username}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect username or password",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        if not user.is_active:
            logger.warning(f"Login attempt for inactive user: {user.username}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, 
                detail="Inactive user"
            )

        # Create access token
        access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            subject=str(user.id), expires_delta=access_token_expires
        )
        
        logger.info(f"Successful login for user: {user.username}")
        return {"access_token": access_token, "token_type": "bearer"}
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error during login: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error during login"
        )

@router.get("/me", response_model=UserResponse)
async def get_me(current_user: UserDocument = Depends(get_current_user)):
    """
    Get current logged in user details
    """
    return UserResponse(
        id=str(current_user.id),
        email=current_user.email,
        username=current_user.username,
        full_name=current_user.full_name,
        avatar_url=current_user.avatar_url,
        is_active=current_user.is_active,
        is_verified=current_user.is_verified,
        created_at=current_user.created_at
    )
