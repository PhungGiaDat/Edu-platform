"""SQLAlchemy ORM repository for pet catalog admin operations."""
import json
from datetime import datetime
from typing import Any, Dict, Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from database.orm_models.misc import PetORM
from database.orm_session import session_factory


class ORMPetRepository:
    async def create(self, **fields: Any) -> Dict[str, Any]:
        async with session_factory() as session:
            pet = PetORM(**fields)
            session.add(pet)
            await session.flush()
            await session.refresh(pet)
            await session.commit()
            return self._pet_dict(pet)

    async def update(self, pet_id: str, **fields: Any) -> Optional[Dict[str, Any]]:
        async with session_factory() as session:
            stmt = select(PetORM).where(PetORM.pet_id == pet_id)
            result = await session.execute(stmt)
            pet = result.scalar_one_or_none()
            if not pet:
                return None
            for key, value in fields.items():
                if hasattr(pet, key):
                    setattr(pet, key, json.dumps(value) if isinstance(value, list | dict) else value)
            pet.updated_at = datetime.utcnow()
            await session.commit()
            await session.refresh(pet)
            return self._pet_dict(pet)

    @staticmethod
    def _pet_dict(pet: PetORM) -> Dict[str, Any]:
        value = {}
        for col in PetORM.__table__.columns:
            v = getattr(pet, col.name)
            if isinstance(v, datetime):
                v = v.isoformat() if v else None
            value[col.name] = v
        return value
