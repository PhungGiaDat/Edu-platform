from datetime import datetime
from typing import List, Optional, Dict, Any
from database.base_repo import BaseRepository
from database.db import mongo_connector
import logging

logger = logging.getLogger(__name__)

class CourseRepository(BaseRepository):
    def __init__(self):
        super().__init__("courses")
        self.progress_collection = mongo_connector.get_collection("user_course_progress")

    async def get_all_published(self, skip: int = 0, limit: int = 20) -> List[Dict[str, Any]]:
        return await self.find_many(
            filter={"is_published": True},
            skip=skip,
            limit=limit,
            sort=[("created_at", 1)]
        )

    async def get_by_level(self, level: str) -> List[Dict[str, Any]]:
        return await self.find_many(filter={"level": level, "is_published": True})

    async def get_by_course_id(self, course_id: str) -> Optional[Dict[str, Any]]:
        return await self.find_one({"course_id": course_id, "is_published": True})

    async def upsert_course(self, course: Dict[str, Any]) -> bool:
        course["updated_at"] = datetime.utcnow()
        return await self.update_one(
            {"course_id": course["course_id"]},
            {"$set": course, "$setOnInsert": {"created_at": course.get("created_at", datetime.utcnow())}},
            upsert=True,
        )

    async def get_lesson(self, course_id: str, lesson_id: str) -> Optional[Dict[str, Any]]:
        course = await self.get_by_course_id(course_id)
        if not course:
            return None
        for lesson in course.get("lessons", []):
            if lesson.get("lesson_id") == lesson_id:
                return lesson
        return None

    async def get_progress(self, user_id: str, course_id: Optional[str] = None) -> List[Dict[str, Any]]:
        query: Dict[str, Any] = {"user_id": user_id}
        if course_id:
            query["course_id"] = course_id
        cursor = self.progress_collection.find(query).sort("updated_at", -1)
        return await cursor.to_list(length=100)

    async def get_one_progress(self, user_id: str, course_id: str) -> Optional[Dict[str, Any]]:
        return await self.progress_collection.find_one({"user_id": user_id, "course_id": course_id})

    async def upsert_progress(self, user_id: str, course_id: str, progress: Dict[str, Any]) -> bool:
        progress["updated_at"] = datetime.utcnow()
        result = await self.progress_collection.update_one(
            {"user_id": user_id, "course_id": course_id},
            {"$set": progress, "$setOnInsert": {"started_at": progress.get("started_at", datetime.utcnow())}},
            upsert=True,
        )
        return result.modified_count > 0 or result.upserted_id is not None

def get_course_repository() -> CourseRepository:
    return CourseRepository()
