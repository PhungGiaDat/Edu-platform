# database/db.py
"""
LEGACY WRAPPER - Redirects to unified database/connection.py
Kept for backward compatibility with existing repositories.
"""
from database.connection import db_manager, connect_to_database, close_database_connection
from typing import Optional
import logging

logger = logging.getLogger(__name__)

# Redirect mongo_connector to the new db_manager
class MongoConnectorWrapper:
    def get_collection(self, collection_name: str):
        return db_manager.database[collection_name]
    
    async def close_connection(self):
        await db_manager.close()

mongo_connector = MongoConnectorWrapper()

# Legacy lifecycle function aliases
async def init_databases():
    await connect_to_database()

async def close_databases():
    await close_database_connection()

# Placeholder for removed PostgreSQL dependency
async def get_pg_session():
    raise RuntimeError("PostgreSQL has been removed. Use MongoDB documents directly.")

__all__ = [
    "mongo_connector",
    "init_databases",
    "close_databases",
    "get_pg_session",
]