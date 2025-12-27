# api/auth.py
"""
Authentication API Endpoints
Handles registration and login using JWT and MongoDB
"""
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from datetime import timedelta
from settings import settings
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
    # Find user by username or email
    user = await UserDocument.find_one(
        ((UserDocument.username == form_data.username) | 
         (UserDocument.email == form_data.username))
    )
    
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="Inactive user"
        )

    # Create access token
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        subject=str(user.id), expires_delta=access_token_expires
    )
    
    return {"access_token": access_token, "token_type": "bearer"}

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
