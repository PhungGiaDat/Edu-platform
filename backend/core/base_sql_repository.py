# backend/core/base_sql_repository.py
"""
Base Repository for SQL (Supabase/PostgreSQL)
Uses SQLModel for type-safe operations
"""
from typing import Type, TypeVar, List, Optional, Generic
from sqlmodel import select, SQLModel
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlalchemy import func
import logging

logger = logging.getLogger(__name__)

T = TypeVar("T", bound=SQLModel)


class BaseSQLRepository(Generic[T]):
    """
    Generic Repository Pattern for PostgreSQL/Supabase operations
    Provides common CRUD operations that all SQL repositories can use
    
    Usage:
        class UserRepository(BaseSQLRepository[User]):
            def __init__(self, session: AsyncSession):
                super().__init__(session, User)
    """
    
    def __init__(self, session: AsyncSession, model: Type[T]):
        self.session = session
        self.model = model
        logger.debug(f"📦 [SQLRepository] Initialized: {model.__name__}")
    
    # ========== CREATE ==========
    
    async def create(self, obj: T) -> T:
        """Insert a new record"""
        self.session.add(obj)
        await self.session.commit()
        await self.session.refresh(obj)
        logger.info(f"✅ [CREATE] {self.model.__name__}: {getattr(obj, 'id', 'unknown')}")
        return obj
    
    async def create_many(self, objects: List[T]) -> List[T]:
        """Insert multiple records"""
        for obj in objects:
            self.session.add(obj)
        await self.session.commit()
        for obj in objects:
            await self.session.refresh(obj)
        logger.info(f"✅ [CREATE_MANY] {self.model.__name__}: {len(objects)} records")
        return objects
    
    # ========== READ ==========
    
    async def get_by_id(self, id: str) -> Optional[T]:
        """Find record by primary key"""
        result = await self.session.get(self.model, id)
        return result
    
    async def get_all(self, skip: int = 0, limit: int = 100) -> List[T]:
        """Get all records with pagination"""
        statement = select(self.model).offset(skip).limit(limit)
        result = await self.session.exec(statement)
        return result.all()
    
    async def find_one(self, **filters) -> Optional[T]:
        """Find single record by filters"""
        statement = select(self.model).filter_by(**filters)
        result = await self.session.exec(statement)
        return result.first()
    
    async def find_many(self, skip: int = 0, limit: int = 100, **filters) -> List[T]:
        """Find multiple records by filters"""
        statement = select(self.model).filter_by(**filters).offset(skip).limit(limit)
        result = await self.session.exec(statement)
        return result.all()
    
    async def count(self, **filters) -> int:
        """Count records matching filters"""
        statement = select(func.count()).select_from(self.model).filter_by(**filters)
        result = await self.session.exec(statement)
        return result.one()
    
    # ========== UPDATE ==========
    
    async def update(self, obj: T, update_data: dict) -> T:
        """Update a record"""
        for key, value in update_data.items():
            if hasattr(obj, key):
                setattr(obj, key, value)
        self.session.add(obj)
        await self.session.commit()
        await self.session.refresh(obj)
        logger.info(f"📝 [UPDATE] {self.model.__name__}: {getattr(obj, 'id', 'unknown')}")
        return obj
    
    async def update_by_id(self, id: str, update_data: dict) -> Optional[T]:
        """Update record by ID"""
        obj = await self.get_by_id(id)
        if obj:
            return await self.update(obj, update_data)
        return None
    
    # ========== DELETE ==========
    
    async def delete(self, obj: T) -> bool:
        """Delete a record"""
        await self.session.delete(obj)
        await self.session.commit()
        logger.info(f"🗑️ [DELETE] {self.model.__name__}: {getattr(obj, 'id', 'unknown')}")
        return True
    
    async def delete_by_id(self, id: str) -> bool:
        """Delete record by ID"""
        obj = await self.get_by_id(id)
        if obj:
            return await self.delete(obj)
        return False
    
    # ========== UTILITY ==========
    
    async def exists(self, **filters) -> bool:
        """Check if record exists"""
        count = await self.count(**filters)
        return count > 0
