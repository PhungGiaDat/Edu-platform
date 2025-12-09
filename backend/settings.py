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
    
    # ========== PostgreSQL/Supabase Configuration ==========
    # Connection pooling URL (for normal operations)
    DATABASE_URL: Optional[str] = None
    # Direct connection URL (for migrations)
    DIRECT_URL: Optional[str] = None
    
    # ========== Security ==========
    SECRET_KEY: str = "dev-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    # ========== Application ==========
    APP_NAME: str = "Eduplatform AR API"
    DEBUG: bool = False
    API_V1_PREFIX: str = "/api"
    
    # ========== CORS ==========
    ALLOWED_ORIGINS: str = "*"  # Comma-separated list
    
    # ========== Static Files ==========
    STATIC_DIR: Path = BASE_DIR / "static"
    UPLOAD_DIR: Path = BASE_DIR / "uploads"
    
    # ========== Server ==========
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    
    # ========== AI Services (Optional) ==========
    OPENAI_API_KEY: Optional[str] = None
    GOOGLE_API_KEY: Optional[str] = None

    # ========== Supabase ==========
    SUPABASE_URL: Optional[str] = None
    SUPABASE_KEY: Optional[str] = None
    
    # ========== Pydantic Settings Config ==========
    model_config = SettingsConfigDict(
        # Try to load .env file (will not fail if missing - good for production)
        env_file=".env",
        env_file_encoding="utf-8",
        # Ignore extra fields from environment
        extra="ignore",
        # Case sensitive
        case_sensitive=True
    )
    
    @property
    def cors_origins(self) -> list[str]:
        """Parse ALLOWED_ORIGINS from comma-separated string"""
        if self.ALLOWED_ORIGINS == "*":
            return ["*"]
        return [origin.strip() for origin in self.ALLOWED_ORIGINS.split(",")]
    
    def __repr__(self) -> str:
        return f"<Settings(db={self.MONGO_DB}, debug={self.DEBUG})>"


# ========== Singleton Instance ==========
# Create a single instance to be imported across the app
settings = Settings()

# Print configuration on startup (sanitized)
if __name__ != "__main__":
    print(f"[CONFIG] Loaded settings: DB={settings.MONGO_DB}, Debug={settings.DEBUG}")
    print(f"[CONFIG] Static dir: {settings.STATIC_DIR}")
