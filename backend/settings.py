# backend/settings.py
"""
Centralized Configuration Management
Supports both local (.env) and production (environment variables) deployments
"""
from pydantic import SecretStr, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional
import os
from pathlib import Path

# Get the base directory (backend folder)
BASE_DIR = Path(__file__).resolve().parent

# Forbidden SECRET_KEY placeholder values — fail-closed at import time.
# CVE-2026-47410 class risk: leaked public defaults must never reach production.
_FORBIDDEN_SECRET_VALUES = frozenset({
    "",
    "dev-secret-key-change-in-production",
    "dev-secret",
    "change-in-production",
    "changeme",
    "test-secret",
    "your-super-secret-key-change-this-in-production",
})


class Settings(BaseSettings):
    """
    Application Settings - Auto loads from .env file or environment variables
    Priority: Environment Variables > .env file > Default values
    """

    # ========== MongoDB Configuration ==========
    MONGO_URL: str
    MONGO_DB: str = "eduplatform"

    # ========== Security ==========
    # Required. No default. Validator rejects placeholders and short values.
    SECRET_KEY: SecretStr
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    # ========== Application ==========
    APP_NAME: str = "Eduplatform AR API"
    DEBUG: bool = False
    API_V1_PREFIX: str = "/api/v1"

    # ========== CORS ==========
    ALLOWED_ORIGINS: str = "*"  # Comma-separated list
    # Comma-separated dev-only origins; merged into cors_origins only when DEBUG=true.
    DEV_ORIGINS: str = "http://localhost:3000,http://localhost:5173,http://127.0.0.1:3000,http://127.0.0.1:5173"

    # ========== Static Files ==========
    STATIC_DIR: Path = BASE_DIR / "static"
    UPLOAD_DIR: Path = BASE_DIR / "uploads"
    LEARNAR_ASSETS_BUCKET: str = "learnar-assets"
    SUPABASE_URL: Optional[str] = None
    SUPABASE_SERVICE_ROLE_KEY: Optional[str] = None

    # ========== Supabase Storage (refactored: env-driven) ==========
    # Required. The full Supabase project URL (no trailing slash).
    # Example: https://rofprrtoeyirssfndxag.supabase.co
    SUPABASE_PROJECT_URL: str
    # The public storage bucket that holds AR assets.
    SUPABASE_STORAGE_BUCKET: str = "AR_models"

    # ========== External Services ==========
    # Dicebear (or compatible) avatar service base URL.
    AVATAR_SERVICE_URL: str = "https://api.dicebear.com/7.x/avataaars/svg"

    # ========== Frontend Origin (CORS — single prod origin) ==========
    # Required. The deployed Vercel frontend origin (no trailing slash).
    DEFAULT_FRONTEND_ORIGIN: str
    
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
    
    @field_validator("SECRET_KEY", mode="before")
    @classmethod
    def _validate_secret_key(cls, v):
        """Reject empty/placeholder SECRET_KEY values at import time.

        Catches known leaked defaults ("dev-secret-key-change-in-production",
        "your-super-secret-key-change-this-in-production") and any value shorter
        than 32 characters. Generate a safe value with:

            python -c "import secrets; print(secrets.token_urlsafe(32))"
        """
        raw = v.get_secret_value() if isinstance(v, SecretStr) else str(v)
        if raw in _FORBIDDEN_SECRET_VALUES:
            raise ValueError(
                "SECRET_KEY is set to a known default placeholder. "
                "Generate a fresh value with: "
                'python -c "import secrets; print(secrets.token_urlsafe(32))" '
                "and set it in .env / Render dashboard / docker-compose."
            )
        if len(raw) < 32:
            raise ValueError(
                f"SECRET_KEY must be at least 32 characters (got {len(raw)}). "
                "Generate a new one with secrets.token_urlsafe(32)."
            )
        return v

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
        """Build the effective CORS origin list.

        Rules:
        - ALLOWED_ORIGINS="*" is honored as the literal list ``["*"]`` ONLY when
          no credentials are required. With ``allow_credentials=True`` the
          browser blocks ``*`` (Starlette raises at startup too), so we always
          narrow to the explicit list in that case.
        - Always include DEFAULT_FRONTEND_ORIGIN + the canonical Vercel origin.
        - When DEBUG=true, append the parsed DEV_ORIGINS list.
        - Order preserved, deduped.
        """
        # When ALLOWED_ORIGINS is a literal "*" we honor the wildcard intent
        # ONLY when no credentials are required. main.py always sets
        # allow_credentials=True; treat that as the conservative default and
        # narrow to the explicit list.
        if self.ALLOWED_ORIGINS.strip() == "*":
            explicit = [
                self.DEFAULT_FRONTEND_ORIGIN.rstrip("/"),
                "https://edu-platform-dun.vercel.app",
            ]
            if self.DEBUG:
                explicit.extend(
                    o.strip() for o in self.DEV_ORIGINS.split(",") if o.strip()
                )
            return list(dict.fromkeys(explicit))

        always = [
            self.DEFAULT_FRONTEND_ORIGIN.rstrip("/"),
            "https://edu-platform-dun.vercel.app",
        ]
        custom = [
            o.strip() for o in self.ALLOWED_ORIGINS.split(",") if o.strip() and o.strip() != "*"
        ]
        result = list(dict.fromkeys(always + custom))
        if self.DEBUG:
            dev = [o.strip() for o in self.DEV_ORIGINS.split(",") if o.strip()]
            result = list(dict.fromkeys(result + dev))
        return result

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
