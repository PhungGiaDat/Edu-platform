# database/__init__.py
"""
Database Module Exports
"""
import sys

try:
    from database import orm_models_accessible
    sys.modules["database.orm_models"] = orm_models_accessible
    from database.orm_models_accessible import learner, daily_challenge, game, misc, monitoring, quiz
    sys.modules["database.orm_models.learner"] = learner
    sys.modules["database.orm_models.daily_challenge"] = daily_challenge
    sys.modules["database.orm_models.game"] = game
    sys.modules["database.orm_models.misc"] = misc
    sys.modules["database.orm_models.monitoring"] = monitoring
    sys.modules["database.orm_models.quiz"] = quiz

    from database import postgres_accessible
    sys.modules["database.postgres"] = postgres_accessible
    from database.postgres_accessible import pet_catalog
    sys.modules["database.postgres.pet_catalog"] = pet_catalog
except Exception:
    pass
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