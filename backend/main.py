# backend/main.py
"""
Eduplatform AR API - Main Application
Clean Architecture with FastAPI
"""
import sys
import logging
from pathlib import Path
from contextlib import asynccontextmanager

# Add backend directory to Python path
backend_dir = Path(__file__).parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

# Initialize monitoring before importing routers so startup and request
# exceptions are captured consistently across the application.
from services.sentry_monitoring_service import sentry_monitoring_service

sentry_monitoring_service.initialize()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse

# Import settings and database
from settings import settings
from database.connection import connect_to_database, close_database_connection

# Import Redis services
from services.redis_service import redis_service

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
    admin_router,
    profile_router,
    notebook_router,
    dictionary_router,
    vocabulary_topics_router,
    telegram_router,
)
from api.pronunciation_enhanced import router as pronunciation_enhanced_router
from api.lessons import router as lessons_router
from api.course_lessons import router as course_lessons_router
from api.session_tracking import router as session_tracking_router
from api.session_lock import router as session_lock_router
from api.websocket import router as websocket_router
from api.reports import router as reports_router
from api.debug import router as debug_router
from api.flashcard_editor import router as flashcard_editor_router
from api.public import router as public_router
from api.ar_stability import router as ar_stability_router
from api.semantic_rules import router as semantic_rules_router

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
        sentry_monitoring_service.capture_exception(e)
        raise
    
    # Connect to Redis (optional, falls back gracefully if unavailable)
    try:
        redis_connected = await redis_service.connect()
        if redis_connected:
            logger.info("✅ Redis connected successfully")
        else:
            logger.info("⚠️ Redis unavailable - using in-memory fallback")
    except Exception as e:
        logger.warning(f"⚠️ Redis initialization failed: {e}, using fallback")
    
    logger.info("✅ Application started successfully")
    
    yield  # Application runs here
    
    # Shutdown
    logger.info("🔄 Shutting down Eduplatform AR API...")
    
    # Close Redis connection
    await redis_service.disconnect()
    logger.info("✅ Redis connection closed")
    
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

app.include_router(
    profile_router,
    prefix=settings.API_V1_PREFIX,
    tags=["Profile"]
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
    pronunciation_enhanced_router,
    prefix=settings.API_V1_PREFIX,
    tags=["Pronunciation Enhanced"]
)

app.include_router(
    sessions_router,
    prefix=settings.API_V1_PREFIX,
    tags=["Sessions"]
)

app.include_router(
    session_lock_router,
    prefix=settings.API_V1_PREFIX,
    tags=["Session Lock"]
)

app.include_router(
    course_lessons_router,
    prefix=settings.API_V1_PREFIX,
    tags=["Course Lessons"]
)

app.include_router(
    lessons_router,
    prefix="/api",
    tags=["Lesson Media"]
)

app.include_router(
    session_tracking_router,
    prefix="/api",
    tags=["Session Tracking"]
)

app.include_router(
    admin_router,
    prefix=f"{settings.API_V1_PREFIX}/admin",
    tags=["Admin"]
)

# Debug router — logs AR_DEBUG from mobile web app to Vercel runtime logs
app.include_router(
    debug_router,
    prefix=settings.API_V1_PREFIX,
    tags=["Debug"]
)

# Flashcard Editor router (admin-only)
app.include_router(
    flashcard_editor_router,
    prefix=f"{settings.API_V1_PREFIX}/flashcard-editor",
    tags=["Flashcard Editor"]
)

# Public router (no auth required) - for QR code scanning
app.include_router(
    public_router,
    tags=["Public"]
)

# AR Stability router
app.include_router(
    ar_stability_router,
    prefix=settings.API_V1_PREFIX,
    tags=["AR"]
)

# Semantic Rules router
app.include_router(
    semantic_rules_router,
    prefix=settings.API_V1_PREFIX,
    tags=["AR"]
)

# Notebook router (Sổ tay)
app.include_router(
    notebook_router,
    prefix=settings.API_V1_PREFIX,
    tags=["Notebook"]
)

# Dictionary router (Tra từ)
app.include_router(
    dictionary_router,
    prefix=settings.API_V1_PREFIX,
    tags=["Dictionary"]
)

# Vocabulary Topics router
app.include_router(
    vocabulary_topics_router,
    prefix=settings.API_V1_PREFIX,
    tags=["Vocabulary Topics"]
)

app.include_router(
    telegram_router,
    prefix=settings.API_V1_PREFIX,
    tags=["Telegram"]
)

logger.info("✅ All routers registered")


# ========== Health Check Endpoints ==========
@app.get("/health", tags=["System"])
async def health_check():
    """
    Lightweight health check endpoint for monitoring and deployment.
    Avoid a MongoDB ping here because Render may call this every few seconds.
    """
    return {
        "status": "ok",
        "app": settings.APP_NAME,
        "debug": settings.DEBUG
    }


@app.get("/health/detailed", tags=["System"])
async def detailed_health_check():
    """
    Detailed health check including database and Redis connectivity.
    Use this for comprehensive health monitoring.
    """
    from database.connection import db_manager
    from database.postgres_connection import postgres_core_enabled, postgres_pool
    
    health_status = {
        "status": "ok",
        "app": settings.APP_NAME,
        "version": "2.0.0",
        "debug": settings.DEBUG
    }
    
    # Check database connectivity
    try:
        if postgres_core_enabled():
            await postgres_pool().fetchval("SELECT 1")
            db_healthy = True
            database_engine = "postgresql"
        else:
            db_healthy = await db_manager.ping()
            database_engine = "mongodb"
        health_status["database"] = {
            "status": "connected" if db_healthy else "disconnected",
            "healthy": db_healthy,
            "engine": database_engine,
        }
    except Exception as e:
        health_status["database"] = {
            "status": "error",
            "healthy": False,
            "error": str(e)
        }
        health_status["status"] = "degraded"
    
    # Check Redis connectivity
    try:
        redis_health = await redis_service.health_check()
        health_status["redis"] = redis_health
        if not redis_health.get("healthy"):
            health_status["status"] = "degraded"
    except Exception as e:
        health_status["redis"] = {
            "status": "error",
            "healthy": False,
            "error": str(e)
        }
        health_status["status"] = "degraded"
    
    # Check AI services
    health_status["ai_services"] = {
        "google_api_configured": bool(settings.GOOGLE_API_KEY)
    }
    
    return health_status


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
    sentry_monitoring_service.capture_exception(exc)
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
