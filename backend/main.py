# backend/main.py
"""
Eduplatform AR API - Main Application
Clean Architecture with FastAPI
"""
import sys
import logging
from pathlib import Path
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse

# Add backend directory to Python path
backend_dir = Path(__file__).parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

# Import settings and database
from settings import settings
from database.connection import connect_to_database, close_database_connection

# Import API routers
from api import (
    flashcard_router,
    quiz_router,
    game_router,
    course_router,
    chat_router,
    gamification_router,
    auth_router,
    user_router,
    learning_path_router,
    pet_router,
    combos_router,
    pronunciation_router,
    sessions_router,
)
from api.websocket import router as websocket_router
from api.reports import router as reports_router

# Configure logging
logging.basicConfig(
    level=logging.INFO if not settings.DEBUG else logging.DEBUG,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)

# Disable verbose pymongo logging
logging.getLogger("pymongo").setLevel(logging.WARNING)
logging.getLogger("pymongo.topology").setLevel(logging.WARNING)
logging.getLogger("pymongo.connection").setLevel(logging.WARNING)
logging.getLogger("pymongo.serverSelection").setLevel(logging.WARNING)

logger = logging.getLogger(__name__)


# ========== Lifespan Events ==========
@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application lifespan manager
    Handles startup and shutdown events
    """
    # Startup
    logger.info("🚀 Starting Eduplatform AR API...")
    logger.info(f"📝 Settings: DB={settings.MONGO_DB}, Debug={settings.DEBUG}")
    
    try:
        await connect_to_database()
        logger.info("✅ Database connected successfully")
    except Exception as e:
        logger.error(f"❌ Database connection failed: {e}")
        raise
    
    logger.info("✅ Application started successfully")
    
    yield  # Application runs here
    
    # Shutdown
    logger.info("🔄 Shutting down Eduplatform AR API...")
    await close_database_connection()
    logger.info("✅ Application shut down successfully")


# ========== Create FastAPI App ==========
# Using Argon2 for secure password hashing
app = FastAPI(
    title=settings.APP_NAME,
    description="Educational AR platform with flashcards, quizzes, and games",
    version="2.0.0",
    debug=settings.DEBUG,
    lifespan=lifespan,
    docs_url="/docs" if settings.DEBUG else None,  # Disable docs in production
    redoc_url="/redoc" if settings.DEBUG else None,
)


# ========== CORS Middleware ==========
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ========== Static Files ==========
# Mount static directories for AR assets, images, audio
try:
    app.mount("/assets", StaticFiles(directory=str(settings.STATIC_DIR / "assets")), name="assets")
    app.mount("/images", StaticFiles(directory=str(settings.STATIC_DIR / "images")), name="images")
    app.mount("/audio", StaticFiles(directory=str(settings.STATIC_DIR / "audio")), name="audio")
    logger.info(f"📁 Static files mounted from: {settings.STATIC_DIR}")
except RuntimeError as e:
    logger.warning(f"⚠️ Static directories not found: {e}")


# ========== API Routers ==========
# Register all API routes under /api prefix
app.include_router(
    flashcard_router,
    prefix=settings.API_V1_PREFIX,
    tags=["Flashcards"]
)

app.include_router(
    quiz_router,
    prefix=settings.API_V1_PREFIX,
    tags=["Quiz"]
)

app.include_router(
    game_router,
    prefix=settings.API_V1_PREFIX,
    tags=["Games"]
)

app.include_router(
    course_router,
    prefix=settings.API_V1_PREFIX,
    tags=["Courses"]
)

app.include_router(
    course_router,
    prefix="/api",
    tags=["Courses"]
)

app.include_router(
    chat_router,
    prefix=settings.API_V1_PREFIX,
    tags=["Chat"]
)

app.include_router(
    auth_router,
    prefix=f"{settings.API_V1_PREFIX}/auth",
    tags=["Authentication"]
)

app.include_router(
    gamification_router,
    prefix=settings.API_V1_PREFIX,
    tags=["Gamification"]
)

app.include_router(
    user_router,
    prefix=settings.API_V1_PREFIX,
    tags=["User"]
)

# WebSocket router (no prefix - keep legacy path)
app.include_router(
    websocket_router,
    tags=["WebSocket"]
)

app.include_router(
    reports_router,
    prefix=settings.API_V1_PREFIX,
    tags=["Reports"]
)

app.include_router(
    learning_path_router,
    prefix=settings.API_V1_PREFIX,
    tags=["Learning Path"]
)

app.include_router(
    pet_router,
    prefix=settings.API_V1_PREFIX,
    tags=["Pets"]
)

app.include_router(
    combos_router,
    prefix=settings.API_V1_PREFIX,
    tags=["Combos"]
)

app.include_router(
    pronunciation_router,
    prefix=settings.API_V1_PREFIX,
    tags=["Pronunciation"]
)

app.include_router(
    sessions_router,
    prefix=settings.API_V1_PREFIX,
    tags=["Sessions"]
)

logger.info("✅ All routers registered")


# ========== Health Check Endpoint ==========
@app.get("/health", tags=["System"])
async def health_check():
    """
    Health check endpoint for monitoring and deployment
    """
    from database.connection import db_manager
    
    db_status = "healthy" if await db_manager.ping() else "unhealthy"
    
    return {
        "status": "ok",
        "app": settings.APP_NAME,
        "database": db_status,
        "debug": settings.DEBUG
    }


@app.get("/debug/admin-hash", tags=["Debug"])
async def debug_admin_hash():
    """
    Debug endpoint to check admin user hash
    """
    from models.user_mongo import UserDocument
    
    try:
        admin = await UserDocument.find_one(UserDocument.username == "admin")
        if not admin:
            return {"error": "Admin user not found"}
        
        return {
            "username": admin.username,
            "hash": admin.hashed_password,
            "hash_length": len(admin.hashed_password),
            "hash_type": admin.hashed_password[:7] if admin.hashed_password else None,
            "is_bcrypt": admin.hashed_password.startswith("$2") if admin.hashed_password else False
        }
    except Exception as e:
        import traceback
        return {
            "error": str(e),
            "traceback": traceback.format_exc()
        }


@app.get("/", tags=["System"])
async def root():
    """Root endpoint"""
    return {
        "message": "Welcome to Eduplatform AR API",
        "docs": "/docs" if settings.DEBUG else "disabled",
        "health": "/health"
    }


# ========== Exception Handlers ==========
@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    """Global exception handler"""
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error occurred"}
    )


# ========== Run Application ==========
if __name__ == "__main__":
    import uvicorn
    
    uvicorn.run(
        "main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG,
        log_level="info"
    )
