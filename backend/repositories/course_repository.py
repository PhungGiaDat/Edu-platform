from typing import List, Optional, Dict, Any
from database.base_repo import BaseRepository
from models.course_model import CourseSchema
import logging

logger = logging.getLogger(__name__)

class CourseRepository(BaseRepository):
    def __init__(self):
        super().__init__("courses")

    async def get_all_published(self, skip: int = 0, limit: int = 20) -> List[Dict[str, Any]]:
        return await self.find_many(
            filter={"is_published": True},
            skip=skip,
            limit=limit,
            sort=[("created_at", -1)]
        )

    async def get_by_level(self, level: str) -> List[Dict[str, Any]]:
        return await self.find_many(filter={"level": level, "is_published": True})

def get_course_repository() -> CourseRepository:
    return CourseRepository()
