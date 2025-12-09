# database/__init__.py
"""
Database Module Exports
"""
from database.connection import (
    db_manager,
    get_database,
    get_pg_session,
    connect_to_database,
    close_database_connection,
)
from database.postgres import (
    init_postgres,
    close_postgres,
    get_session,
    test_connection,
    create_tables,
)

__all__ = [
    # MongoDB
    "db_manager",
    "get_database",
    # PostgreSQL/Supabase
    "get_pg_session",
    "init_postgres",
    "close_postgres",
    "get_session",
    "test_connection",
    "create_tables",
    # Lifecycle
    "connect_to_database",
    "close_database_connection",
]