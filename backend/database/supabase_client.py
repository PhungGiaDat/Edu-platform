from supabase import create_client, Client
from settings import settings
import logging

logger = logging.getLogger(__name__)

class SupabaseManager:
    _instance = None
    client: Client = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(SupabaseManager, cls).__new__(cls)
            if settings.SUPABASE_URL and settings.SUPABASE_KEY:
                try:
                    cls._instance.client = create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)
                    logger.info("Supabase client initialized successfully.")
                except Exception as e:
                    logger.error(f"Failed to initialize Supabase client: {e}")
            else:
                logger.warning("Supabase credentials not found in settings. Supabase features will be disabled.")
        return cls._instance

    def get_client(self) -> Client:
        return self.client

# Global instance
supabase_manager = SupabaseManager()

def get_supabase() -> Client:
    """Dependency for FastAPI to get Supabase client"""
    return supabase_manager.get_client()
