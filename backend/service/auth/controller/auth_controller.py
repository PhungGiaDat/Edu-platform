from fastapi import HTTPException
from db.mongo import user_collection
from schemas.user_schema import UserCreate, Token
from models.user_model import UserDB
from utils.password import hash_password, verify_password
from services.jwt_service import create_access_token
from bson.objectid import ObjectId


def login_user(username: str, password: str) -> Token:
    user = user_collection.find_one({"username": username})
    if not user or not verify_password(password, user["hashed_password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = create_access_token({"sub": str(user["_id"]), "username": username})
    return Token(access_token=token, token_type="bearer")


def register_user(user: UserCreate) -> Token:
    if user_collection.find_one({"username": user.username}):
        raise HTTPException(status_code=400, detail="Username already exists")

    hashed_pw = hash_password(user.password)
    new_user = {
        "username": user.username,
        "email": user.email,
        "hashed_password": hashed_pw
    }
    inserted = user_collection.insert_one(new_user)
    token = create_access_token({"sub": str(inserted.inserted_id), "username": user.username})
    return Token(access_token=token, token_type="bearer")
