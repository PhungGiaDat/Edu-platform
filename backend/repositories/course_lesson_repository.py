# backend/repositories/course_lesson_repository.py
"""
CourseLesson Repository - CRUD operations for course lessons
"""
from typing import Optional, List, Dict, Any
from datetime import datetime

from models.course_lesson import CourseLesson, LessonStatus, LessonType, MediaAsset, VocabularyItem
from database.mongodb import get_collection
import logging

logger = logging.getLogger(__name__)


class CourseLessonRepository:
    """Repository for CourseLesson document operations."""
    
    def __init__(self):
        self.collection_name = "course_lessons"
    
    @property
    def collection(self):
        return get_collection(self.collection_name)
    
    async def create_lesson(
        self,
        lesson_id: str,
        course_id: str,
        title: str,
        title_vi: str = "",
        description: Optional[str] = None,
        order: int = 0,
        lesson_type: LessonType = LessonType.MIXED,
        created_by: str = "system",
        duration_minutes: int = 5,
        xp_reward: int = 50,
        status: LessonStatus = LessonStatus.DRAFT
    ) -> CourseLesson:
        """Create a new course lesson."""
        lesson = CourseLesson(
            lesson_id=lesson_id,
            course_id=course_id,
            title=title,
            title_vi=title_vi,
            description=description,
            order=order,
            lesson_type=lesson_type,
            created_by=created_by,
            duration_minutes=duration_minutes,
            xp_reward=xp_reward,
            status=status,
        )
        await lesson.insert()
        logger.info(f"✅ [Lesson] Created: {lesson_id}")
        return lesson
    
    async def get_lesson(self, lesson_id: str) -> Optional[CourseLesson]:
        """Get a lesson by lesson_id."""
        return await CourseLesson.find_one(CourseLesson.lesson_id == lesson_id)
    
    async def get_lesson_by_id(self, id: str) -> Optional[CourseLesson]:
        """Get a lesson by MongoDB _id."""
        return await CourseLesson.get(id)
    
    async def get_course_lessons(
        self,
        course_id: str,
        status: Optional[LessonStatus] = None,
        lesson_type: Optional[LessonType] = None,
        limit: int = 100,
        skip: int = 0
    ) -> List[CourseLesson]:
        """Get all lessons for a course, ordered by order field."""
        query = CourseLesson.find(CourseLesson.course_id == course_id)
        
        if status:
            query = query.match(CourseLesson.status == status)
        if lesson_type:
            query = query.match(CourseLesson.lesson_type == lesson_type)
        
        query = query.sort("+order").skip(skip).limit(limit)
        return await query.to_list()
    
    async def get_published_lessons(
        self,
        course_id: str,
        limit: int = 100
    ) -> List[CourseLesson]:
        """Get published lessons for a course."""
        return await self.get_course_lessons(
            course_id,
            status=LessonStatus.PUBLISHED,
            limit=limit
        )
    
    async def update_lesson(
        self,
        lesson_id: str,
        **updates
    ) -> Optional[CourseLesson]:
        """Update a lesson's fields."""
        lesson = await self.get_lesson(lesson_id)
        if not lesson:
            return None
        
        for key, value in updates.items():
            if hasattr(lesson, key):
                setattr(lesson, key, value)
        
        lesson.updated_at = datetime.utcnow()
        await lesson.save()
        logger.info(f"📝 [Lesson] Updated: {lesson_id}")
        return lesson
    
    async def publish_lesson(self, lesson_id: str) -> Optional[CourseLesson]:
        """Publish a lesson."""
        lesson = await self.get_lesson(lesson_id)
        if not lesson:
            return None
        
        lesson.status = LessonStatus.PUBLISHED
        lesson.published_at = datetime.utcnow()
        lesson.updated_at = datetime.utcnow()
        await lesson.save()
        logger.info(f"🚀 [Lesson] Published: {lesson_id}")
        return lesson
    
    async def archive_lesson(self, lesson_id: str) -> Optional[CourseLesson]:
        """Archive a lesson."""
        lesson = await self.get_lesson(lesson_id)
        if not lesson:
            return None
        
        lesson.status = LessonStatus.ARCHIVED
        lesson.updated_at = datetime.utcnow()
        await lesson.save()
        logger.info(f"📦 [Lesson] Archived: {lesson_id}")
        return lesson
    
    async def delete_lesson(self, lesson_id: str) -> bool:
        """Delete a lesson (soft delete by archiving)."""
        lesson = await self.archive_lesson(lesson_id)
        return lesson is not None
    
    async def add_vocabulary_item(
        self,
        lesson_id: str,
        vocabulary_item: VocabularyItem
    ) -> Optional[CourseLesson]:
        """Add a vocabulary item to a lesson."""
        lesson = await self.get_lesson(lesson_id)
        if not lesson:
            return None
        
        lesson.vocabulary_items.append(vocabulary_item)
        lesson.updated_at = datetime.utcnow()
        await lesson.save()
        return lesson
    
    async def update_lesson_stats(
        self,
        lesson_id: str,
        total_attempts: int = 0,
        completion_rate: float = 0.0,
        average_score: float = 0.0
    ) -> Optional[CourseLesson]:
        """Update lesson statistics (called after student attempts)."""
        lesson = await self.get_lesson(lesson_id)
        if not lesson:
            return None
        
        # Use atomic update for stats
        if total_attempts:
            lesson.total_attempts = total_attempts
        if completion_rate >= 0:
            lesson.completion_rate = completion_rate
        if average_score >= 0:
            lesson.average_score = average_score
        
        lesson.updated_at = datetime.utcnow()
        await lesson.save()
        return lesson
    
    async def get_creator_lessons(
        self,
        created_by: str,
        status: Optional[LessonStatus] = None,
        limit: int = 50
    ) -> List[CourseLesson]:
        """Get lessons created by a specific user."""
        query = CourseLesson.find(CourseLesson.created_by == created_by)
        if status:
            query = query.match(CourseLesson.status == status)
        return await query.sort("-created_at").limit(limit).to_list()
    
    async def search_lessons(
        self,
        query_text: str,
        status: Optional[LessonStatus] = None,
        lesson_type: Optional[LessonType] = None,
        limit: int = 20
    ) -> List[CourseLesson]:
        """Search lessons by title (text search)."""
        # For text search, we need to use regex or $text
        filter_query = {
            "$or": [
                {"title": {"$regex": query_text, "$options": "i"}},
                {"title_vi": {"$regex": query_text, "$options": "i"}},
                {"description": {"$regex": query_text, "$options": "i"}}
            ]
        }
        
        if status:
            filter_query["status"] = status.value
        if lesson_type:
            filter_query["lesson_type"] = lesson_type.value
        
        cursor = self.collection.find(filter_query).limit(limit)
        results = await cursor.to_list(limit)
        
        return [CourseLesson(**doc) for doc in results]
    
    async def get_course_lesson_count(self, course_id: str) -> int:
        """Count lessons in a course."""
        return await CourseLesson.find(
            CourseLesson.course_id == course_id
        ).count()
    
    async def reorder_lessons(
        self,
        course_id: str,
        lesson_orders: Dict[str, int]
    ) -> int:
        """Reorder lessons in a course (lesson_id -> new_order)."""
        updated = 0
        for lesson_id, new_order in lesson_orders.items():
            result = await self.collection.update_one(
                {"lesson_id": lesson_id, "course_id": course_id},
                {"$set": {"order": new_order, "updated_at": datetime.utcnow()}}
            )
            if result.modified_count > 0:
                updated += 1
        
        logger.info(f"📝 [Lessons] Reordered {updated} lessons in course {course_id}")
        return updated


# Singleton instance
course_lesson_repo = CourseLessonRepository()


def get_course_lesson_repository() -> CourseLessonRepository:
    return course_lesson_repo
