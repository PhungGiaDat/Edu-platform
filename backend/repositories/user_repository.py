"""
User Repository - Data Access Layer
Handles user CRUD operations with MongoDB
"""
from typing import Optional, Dict, Any
from repositories.postgres_user_repository import PostgresUserRepository
import logging

logger = logging.getLogger(__name__)


class UserRepository(PostgresUserRepository):
    """Repository for users collection"""
    
    pass


def get_user_repository() -> UserRepository:
    return UserRepository()
