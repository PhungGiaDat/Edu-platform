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
from api import flashcard_router, quiz_router, game_router
from api.websocket import router as websocket_router

# Configure logging
logging.basicConfig(
    level=logging.INFO if not settings.DEBUG else logging.DEBUG,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
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

# WebSocket router (no prefix - keep legacy path)
app.include_router(
    websocket_router,
    tags=["WebSocket"]
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
