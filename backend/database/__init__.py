# database/__init__.py
"""
Database Module Exports
"""
from .connection import (
    get_database,
    connect_to_database,
    close_database_connection,
    db_manager,
)

# Import index management functions
from .indexes import (
    IndexManager,
    run_index_migration,
    verify_all_indexes,
    verify_collection_indexes,
    get_ttl_policies,
    get_ttl_policy,
    IndexDefinition,
    TTLPolicy,
    TTL_POLICIES,
    get_index_definitions,
)

__all__ = [
    # MongoDB
    "get_database",
    "db_manager",
    # Lifecycle
    "connect_to_database",
    "close_database_connection",
    # Index Management
    "IndexManager",
    "run_index_migration",
    "verify_all_indexes",
    "verify_collection_indexes",
    "get_ttl_policies",
    "get_ttl_policy",
    "IndexDefinition",
    "TTLPolicy",
    "TTL_POLICIES",
    "get_index_definitions",
]