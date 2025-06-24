from fastapi import FastAPI
from routers import auth_router

app = FastAPI(title = "Authentication Service")

app.include_router(auth_router, prefix="/auth", tags=["auth"])
