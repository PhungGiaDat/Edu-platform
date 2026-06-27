# backend/settings.py
"""
Centralized Configuration Management
Supports both local (.env) and production (environment variables) deployments
"""
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional
import os
from pathlib import Path

# Get the base directory (backend folder)
BASE_DIR = Path(__file__).resolve().parent


class Settings(BaseSettings):
    """
    Application Settings - Auto loads from .env file or environment variables
    Priority: Environment Variables > .env file > Default values
    """
    
    # ========== MongoDB Configuration ==========
    MONGO_URL: str
    MONGO_DB: str = "eduplatform"
    
    # ========== Security ==========
    SECRET_KEY: str = "dev-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    # ========== Application ==========
    APP_NAME: str = "Eduplatform AR API"
    DEBUG: bool = False
    API_V1_PREFIX: str = "/api/v1"
    
    # ========== CORS ==========
    ALLOWED_ORIGINS: str = "*"  # Comma-separated list
    
    # ========== Static Files ==========
    STATIC_DIR: Path = BASE_DIR / "static"
    UPLOAD_DIR: Path = BASE_DIR / "uploads"
    LEARNAR_ASSETS_BUCKET: str = "learnar-assets"
    SUPABASE_URL: Optional[str] = None
    SUPABASE_SERVICE_ROLE_KEY: Optional[str] = None
    
    # ========== Server ==========
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    
    # ========== AI Services (Optional) ==========
    OPENAI_API_KEY: Optional[str] = None
    GOOGLE_API_KEY: Optional[str] = None
    AI_DYNAMIC_CONTENT_ENABLED: bool = True
    AI_CONTENT_TIMEOUT_SECONDS: float = 8.0
    AI_CONTENT_RETRIES: int = 2
    
    # ========== Redis Configuration ==========
    REDIS_HOST: str = "localhost"
    REDIS_PORT: int = 6379
    REDIS_DB: int = 0
    REDIS_PASSWORD: Optional[str] = ""
    REDIS_URL: Optional[str] = None  # Full URL takes precedence
    REDIS_MAX_CONNECTIONS: int = 50
    REDIS_SOCKET_TIMEOUT: int = 5
    REDIS_SOCKET_CONNECT_TIMEOUT: int = 5
    REDIS_SSL: bool = False
    
    # ========== App Lock / Time Limit Settings ==========
    APP_LOCK_DEFAULT_TTL_MINUTES: int = 30
    APP_LOCK_WARNING_TTL_MINUTES: int = 25
    APP_LOCK_MAX_EXTENSION_MINUTES: int = 60
    
    # ========== Rate Limiting Settings ==========
    RATE_LIMIT_AUTH_PER_MINUTE: int = 10
    RATE_LIMIT_API_PER_MINUTE: int = 60
    RATE_LIMIT_API_PER_HOUR: int = 1000
    RATE_LIMIT_BURST: int = 10
    
    # ========== Session Settings ==========
    SESSION_TTL_HOURS: int = 24
    SESSION_REFRESH_THRESHOLD_MINUTES: int = 30
    
    # ========== Cache Settings ==========
    REDIS_TTL: int = 300
    CACHE_PETS_TTL_SECONDS: int = 600
    CACHE_COURSE_TTL_SECONDS: int = 300
    CACHE_USER_STATS_TTL_SECONDS: int = 60
    CACHE_LEADERBOARD_TTL_SECONDS: int = 300
    
    # ========== Supabase Redis Backup ==========
    SUPABASE_REDIS_BACKUP_ENABLED: bool = False
    
    # ========== Pydantic Settings Config ==========
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=True
    )
    
    @property
    def redis_url(self) -> Optional[str]:
        """Get Redis URL (full URL takes precedence)."""
        if self.REDIS_URL:
            return self.REDIS_URL
        if self.REDIS_PASSWORD:
            return f"redis://:{self.REDIS_PASSWORD}@{self.REDIS_HOST}:{self.REDIS_PORT}/{self.REDIS_DB}"
        return f"redis://{self.REDIS_HOST}:{self.REDIS_PORT}/{self.REDIS_DB}"
    
    @property
    def is_redis_configured(self) -> bool:
        """Check if Redis is properly configured."""
        return bool(self.REDIS_URL or self.REDIS_HOST != "localhost")
    
    @property
    def cors_origins(self) -> list[str]:
        """Parse ALLOWED_ORIGINS from comma-separated string.
        
        The hardcoded defaults are ALWAYS included regardless of the
        ALLOWED_ORIGINS env var so that the Vercel frontend is never blocked
        even when Render sets ALLOWED_ORIGINS to a custom value.
        """
        # These are always allowed — never remove
        default_origins = [
            "http://localhost:3000",
            "http://localhost:5173",
            "http://127.0.0.1:3000",
            "http://127.0.0.1:5173",
            "https://edu-platform-dun.vercel.app",
        ]
        
        if self.ALLOWED_ORIGINS == "*":
            # Wildcard requested — honour it
            return ["*"]
        
        # Parse any extra origins from env and merge with always-allowed defaults
        custom_origins = [
            origin.strip()
            for origin in self.ALLOWED_ORIGINS.split(",")
            if origin.strip()
        ]
        return list(set(default_origins + custom_origins))
    
    def __repr__(self) -> str:
        return f"<Settings(db={self.MONGO_DB}, debug={self.DEBUG}, redis={self.is_redis_configured})>"


# ========== Singleton Instance ==========
# Create a single instance to be imported across the app
settings = Settings()

# Print configuration on startup (sanitized)
if __name__ != "__main__":
    print(f"[CONFIG] Loaded settings: DB={settings.MONGO_DB}, Debug={settings.DEBUG}")
    print(f"[CONFIG] Redis configured: {settings.is_redis_configured}")
    print(f"[CONFIG] Static dir: {settings.STATIC_DIR}")
