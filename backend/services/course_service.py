from typing import List, Dict, Any, Optional
from repositories.course_repository import get_course_repository
from models.course_model import CourseSchema, LessonSchema
import logging

logger = logging.getLogger(__name__)

class CourseService:
    def __init__(self):
        self.repo = get_course_repository()

    async def get_courses(self, skip: int = 0, limit: int = 20) -> List[Dict[str, Any]]:
        return await self.repo.get_all_published(skip, limit)

    async def get_course_by_id(self, course_id: str) -> Optional[Dict[str, Any]]:
        return await self.repo.get_by_id(course_id)

    async def complete_lesson(self, user_id: str, course_id: str, lesson_id: str) -> bool:
        # Logic to mark lesson as complete for user
        # This might involve updating a UserProgress collection (not yet created)
        # For now, we'll just log it
        logger.info(f"User {user_id} completed lesson {lesson_id} in course {course_id}")
        return True

def get_course_service() -> CourseService:
    return CourseService()
