from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordRequestForm
from controllers.auth_controller import login_user, register_user
from schemas.user_schema import UserCreate, Token

router = APIRouter()

@router.post("/login", response_model=Token)
def login(form_data: OAuth2PasswordRequestForm = Depends()):
    return login_user(form_data.username, form_data.password)

@router.post("/register", response_model=Token)
def register(user: UserCreate):
    return register_user(user)