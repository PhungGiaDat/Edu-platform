# database/db.py
"""
LEGACY WRAPPER — redirects to unified database/connection.py.

Kept for backward compatibility with existing repositories during migration.
When POSTGRES_CORE_ENABLED=true, MongoDB collections are unavailable
and this wrapper raises RuntimeError.
"""
import logging

from database.connection import get_database, connect_to_database, close_database_connection
from database.postgres_connection import postgres_pool, postgres_core_enabled

logger = logging.getLogger(__name__)

# Proxy to the actual archive-mode MongoDB database.
# Raises RuntimeError when postgres_core_enabled=True.
_mongo_connector = None


class _LazyMongoConnector:
    """Lazily resolves the MongoDB collection, erroring gracefully when PG core is active."""

    def get_collection(self, collection_name: str):
        if postgres_core_enabled():
            raise RuntimeError(
                f"MongoDB collection '{collection_name}' is unavailable: "
                "postgres_core_enabled=True — data has been migrated to PostgreSQL"
            )
        return get_database()[collection_name]

    async def close_connection(self):
        pass  # archive-mode connection lifecycle is handled by close_database_connection()


mongo_connector = _LazyMongoConnector()


# Legacy lifecycle function aliases
async def init_databases():
    await connect_to_database()


async def close_databases():
    await close_database_connection()


async def get_pg_session():
    return postgres_pool()


__all__ = [
    "mongo_connector",
    "init_databases",
    "close_databases",
    "get_pg_session",
]
