# backend/repositories/admin_repository.py
"""
Admin Repository - Database operations for Teacher Admin Dashboard
Implements teacher-scoped data access patterns
"""
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
from database.base_repo import BaseRepository
from database.db import mongo_connector
import logging
import asyncio
import re
import uuid

logger = logging.getLogger(__name__)


class AdminRepository:
    """
    Repository for admin dashboard operations
    All queries are scoped to a specific teacher_id
    """
    
    def __init__(self, teacher_id: str):
        """
        Initialize repository with teacher_id for scoping
        
        Args:
            teacher_id: The teacher's user ID for data scoping
        """
        self.teacher_id = teacher_id
        self.courses_collection = mongo_connector.get_collection("courses")
        self.flashcards_collection = mongo_connector.get_collection("flashcards")
        self.flashcard_decks_collection = mongo_connector.get_collection("flashcard_decks")
        self.student_progress_collection = mongo_connector.get_collection("student_progress")
        self.usage_sessions_collection = mongo_connector.get_collection("usage_sessions")
        self.learning_goals_collection = mongo_connector.get_collection("learning_goals")
        self.users_collection = mongo_connector.get_collection("users")
        
        logger.debug(f"[AdminRepo] Initialized for teacher: {teacher_id}")
    
    # ========== Dashboard Stats ==========
    
    async def get_dashboard_stats(self) -> Dict[str, Any]:
        """Get dashboard statistics for the teacher - optimized with parallel queries"""
        now = datetime.utcnow()
        week_ago = now - timedelta(days=7)
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        
        # Parallelize the 4 count_documents calls using asyncio.gather
        async def count_students():
            return await self.student_progress_collection.count_documents({"teacher_id": self.teacher_id})
        
        async def count_courses():
            return await self.courses_collection.count_documents({"teacher_id": self.teacher_id})
        
        async def count_flashcards():
            return await self.flashcards_collection.count_documents({
                "teacher_id": self.teacher_id,
                "is_active": True
            })
        
        async def count_decks():
            return await self.flashcard_decks_collection.count_documents({
                "teacher_id": self.teacher_id,
                "is_active": True
            })
        
        # Execute all counts in parallel
        student_count, course_count, flashcard_count, deck_count = await asyncio.gather(
            count_students(),
            count_courses(),
            count_flashcards(),
            count_decks()
        )
        
        # Count active sessions today
        active_sessions = await self.usage_sessions_collection.count_documents({
            "user_id": {"$in": await self._get_teacher_student_ids()},
            "is_active": True,
            "started_at": {"$gte": today_start}
        })
        
        # Calculate average progress
        pipeline = [
            {"$match": {"teacher_id": self.teacher_id}},
            {"$unwind": {"path": "$enrollments", "preserveNullAndEmptyArrays": True}},
            {"$group": {
                "_id": None,
                "avg_progress": {"$avg": "$enrollments.progress_percent"}
            }}
        ]
        result = await self.student_progress_collection.aggregate(pipeline).to_list(length=1)
        avg_progress = result[0]["avg_progress"] if result and result[0].get("avg_progress") else 0.0
        
        # Count students this week
        students_this_week = await self.student_progress_collection.count_documents({
            "teacher_id": self.teacher_id,
            "last_active": {"$gte": week_ago}
        })
        
        # Get top students
        top_students_pipeline = [
            {"$match": {"teacher_id": self.teacher_id}},
            {"$sort": {"total_xp": -1}},
            {"$limit": 5},
            {"$project": {
                "_id": 0,
                "user_id": 1,
                "user_name": 1,
                "user_avatar": 1,
                "total_xp": 1,
                "streak_days": 1,
                "last_active": 1
            }}
        ]
        top_students = await self.student_progress_collection.aggregate(top_students_pipeline).to_list(length=5)
        
        return {
            "total_students": student_count,
            "total_courses": course_count,
            "total_flashcards": flashcard_count,
            "total_decks": deck_count,
            "active_sessions": active_sessions,
            "average_progress": round(avg_progress, 1),
            "total_enrollments": student_count,  # Simplified for now
            "students_this_week": students_this_week,
            "lessons_completed_today": 0,  # Would need session tracking
            "top_students": top_students
        }
    
    # ========== Courses ==========
    
    async def get_courses(
        self,
        skip: int = 0,
        limit: int = 20,
        include_unpublished: bool = True
    ) -> tuple[List[Dict[str, Any]], int]:
        """Get all courses for this teacher with pagination"""
        query: Dict[str, Any] = {"teacher_id": self.teacher_id}
        if not include_unpublished:
            query["is_published"] = True
        
        cursor = self.courses_collection.find(query).sort("created_at", -1).skip(skip).limit(limit)
        courses = await cursor.to_list(length=limit)
        
        # Convert ObjectId to string
        for course in courses:
            if "_id" in course:
                course["_id"] = str(course["_id"])
        
        total = await self.courses_collection.count_documents(query)
        
        # Add lesson count
        for course in courses:
            course["lesson_count"] = len(course.get("lessons", []))
        
        return courses, total
    
    async def get_course_by_id(self, course_id: str) -> Optional[Dict[str, Any]]:
        """Get a specific course by ID"""
        course = await self.courses_collection.find_one({
            "course_id": course_id,
            "teacher_id": self.teacher_id
        })
        if course and "_id" in course:
            course["_id"] = str(course["_id"])
        return course
    
    async def create_course(self, course_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new course"""
        course_data["teacher_id"] = self.teacher_id
        course_data["course_id"] = course_data.get("course_id", str(uuid.uuid4()))
        course_data["created_at"] = datetime.utcnow()
        course_data["updated_at"] = datetime.utcnow()
        course_data["enrolled_students"] = []
        course_data["enrollment_count"] = 0
        
        # Ensure lessons is a list
        if "lessons" not in course_data:
            course_data["lessons"] = []
        
        await self.courses_collection.insert_one(course_data)
        
        course_data["_id"] = str(course_data.get("_id", ""))
        course_data["lesson_count"] = len(course_data.get("lessons", []))
        
        return course_data
    
    async def update_course(self, course_id: str, update_data: Dict[str, Any]) -> bool:
        """Update a course"""
        update_data["updated_at"] = datetime.utcnow()
        result = await self.courses_collection.update_one(
            {"course_id": course_id, "teacher_id": self.teacher_id},
            {"$set": update_data}
        )
        return result.modified_count > 0
    
    async def delete_course(self, course_id: str) -> bool:
        """Soft delete a course - sets is_active=False and deleted_at instead of removing"""
        result = await self.courses_collection.update_one(
            {"course_id": course_id, "teacher_id": self.teacher_id},
            {"$set": {"is_active": False, "deleted_at": datetime.utcnow()}}
        )
        return result.modified_count > 0
    
    # ========== Flashcard Decks ==========
    
    async def get_decks(
        self,
        skip: int = 0,
        limit: int = 20
    ) -> tuple[List[Dict[str, Any]], int]:
        """Get all flashcard decks for this teacher"""
        query = {"teacher_id": self.teacher_id, "is_active": True}
        
        cursor = self.flashcard_decks_collection.find(query).sort("created_at", -1).skip(skip).limit(limit)
        decks = await cursor.to_list(length=limit)
        
        for deck in decks:
            if "_id" in deck:
                deck["_id"] = str(deck["_id"])
        
        total = await self.flashcard_decks_collection.count_documents(query)
        
        return decks, total
    
    async def get_deck_by_id(self, deck_id: str) -> Optional[Dict[str, Any]]:
        """Get a specific deck"""
        deck = await self.flashcard_decks_collection.find_one({
            "deck_id": deck_id,
            "teacher_id": self.teacher_id
        })
        if deck and "_id" in deck:
            deck["_id"] = str(deck["_id"])
        return deck
    
    async def create_deck(self, deck_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new flashcard deck"""
        deck_data["teacher_id"] = self.teacher_id
        deck_data["deck_id"] = deck_data.get("deck_id", str(uuid.uuid4()))
        deck_data["created_at"] = datetime.utcnow()
        deck_data["updated_at"] = datetime.utcnow()
        deck_data["is_active"] = True
        deck_data["card_count"] = 0
        
        await self.flashcard_decks_collection.insert_one(deck_data)
        
        deck_data["_id"] = str(deck_data.get("_id", ""))
        
        return deck_data
    
    async def update_deck(self, deck_id: str, update_data: Dict[str, Any]) -> bool:
        """Update a flashcard deck"""
        update_data["updated_at"] = datetime.utcnow()
        result = await self.flashcard_decks_collection.update_one(
            {"deck_id": deck_id, "teacher_id": self.teacher_id},
            {"$set": update_data}
        )
        return result.modified_count > 0
    
    async def delete_deck(self, deck_id: str) -> bool:
        """Soft delete a flashcard deck"""
        return await self.update_deck(deck_id, {"is_active": False})
    
    # ========== Flashcards ==========
    
    async def get_flashcards(
        self,
        deck_id: Optional[str] = None,
        skip: int = 0,
        limit: int = 50
    ) -> tuple[List[Dict[str, Any]], int]:
        """Get flashcards with optional deck filtering"""
        query: Dict[str, Any] = {"teacher_id": self.teacher_id, "is_active": True}
        if deck_id:
            query["deck_id"] = deck_id
        
        cursor = self.flashcards_collection.find(query).sort("created_at", -1).skip(skip).limit(limit)
        flashcards = await cursor.to_list(length=limit)
        
        for card in flashcards:
            if "_id" in card:
                card["_id"] = str(card["_id"])
        
        total = await self.flashcards_collection.count_documents(query)
        
        return flashcards, total
    
    async def get_flashcard_by_id(self, qr_id: str) -> Optional[Dict[str, Any]]:
        """Get a specific flashcard"""
        card = await self.flashcards_collection.find_one({
            "qr_id": qr_id,
            "teacher_id": self.teacher_id
        })
        if card and "_id" in card:
            card["_id"] = str(card["_id"])
        return card
    
    async def create_flashcard(self, card_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new flashcard"""
        card_data["teacher_id"] = self.teacher_id
        card_data["created_at"] = datetime.utcnow()
        card_data["updated_at"] = datetime.utcnow()
        card_data["is_active"] = True
        
        await self.flashcards_collection.insert_one(card_data)
        
        # Update deck card count
        if card_data.get("deck_id"):
            await self._update_deck_card_count(card_data["deck_id"])
        
        card_data["_id"] = str(card_data.get("_id", ""))
        
        return card_data
    
    async def update_flashcard(self, qr_id: str, update_data: Dict[str, Any]) -> bool:
        """Update a flashcard"""
        update_data["updated_at"] = datetime.utcnow()
        result = await self.flashcards_collection.update_one(
            {"qr_id": qr_id, "teacher_id": self.teacher_id},
            {"$set": update_data}
        )
        return result.modified_count > 0
    
    async def delete_flashcard(self, qr_id: str) -> bool:
        """Soft delete a flashcard"""
        card = await self.get_flashcard_by_id(qr_id)
        if card and card.get("deck_id"):
            await self._update_deck_card_count(card["deck_id"], decrement=True)
        
        return await self.update_flashcard(qr_id, {"is_active": False})
    
    async def _update_deck_card_count(self, deck_id: str, decrement: bool = False):
        """Update the card count for a deck"""
        update_op = -1 if decrement else 1
        await self.flashcard_decks_collection.update_one(
            {"deck_id": deck_id, "teacher_id": self.teacher_id},
            {"$inc": {"card_count": update_op}}
        )
    
    # ========== Students ==========
    
    async def get_students(
        self,
        skip: int = 0,
        limit: int = 20,
        search: Optional[str] = None
    ) -> tuple[List[Dict[str, Any]], int]:
        """Get students enrolled in teacher's courses"""
        query: Dict[str, Any] = {"teacher_id": self.teacher_id}
        
        if search:
            # Fix ReDoS vulnerability: escape special regex chars and limit length
            escaped_search = re.escape(search.strip())[:50]
            query["$or"] = [
                {"user_name": {"$regex": escaped_search, "$options": "i"}},
                {"user_id": {"$regex": escaped_search, "$options": "i"}}
            ]
        
        cursor = self.student_progress_collection.find(query).sort("last_active", -1).skip(skip).limit(limit)
        students = await cursor.to_list(length=limit)
        
        for student in students:
            if "_id" in student:
                student["_id"] = str(student["_id"])
        
        total = await self.student_progress_collection.count_documents(query)
        
        return students, total
    
    async def get_student_by_id(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Get a specific student's progress"""
        student = await self.student_progress_collection.find_one({
            "user_id": user_id,
            "teacher_id": self.teacher_id
        })
        if student and "_id" in student:
            student["_id"] = str(student["_id"])
        return student
    
    async def get_student_progress(self, user_id: str) -> Dict[str, Any]:
        """Get detailed progress for a student"""
        student = await self.get_student_by_id(user_id)
        if not student:
            return {}
        
        # Get course details - batch fetch all courses in ONE query (fixes N+1)
        course_ids = [e["course_id"] for e in student.get("enrollments", [])]
        courses = []
        if course_ids:
            # Batch fetch all courses using $in operator
            cursor = self.courses_collection.find({
                "course_id": {"$in": course_ids},
                "teacher_id": self.teacher_id
            })
            courses = await cursor.to_list(length=len(course_ids))
        
        # Enrich enrollments with course info using O(1) lookup
        course_map = {c["course_id"]: c for c in courses}
        for enrollment in student.get("enrollments", []):
            course = course_map.get(enrollment["course_id"], {})
            enrollment["course_title"] = course.get("title", "Unknown")
            enrollment["course_thumbnail"] = course.get("thumbnail_url", "")
        
        return student
    
    # ========== Analytics ==========
    
    async def get_progress_analytics(
        self,
        days: int = 30
    ) -> Dict[str, Any]:
        """Get progress analytics for the teacher"""
        start_date = datetime.utcnow() - timedelta(days=days)
        
        # Get all students' progress in date range
        pipeline = [
            {"$match": {
                "teacher_id": self.teacher_id,
                "updated_at": {"$gte": start_date}
            }},
            {"$unwind": {"path": "$enrollments", "preserveNullAndEmptyArrays": True}},
            {"$group": {
                "_id": {
                    "date": {"$dateToString": {"format": "%Y-%m-%d", "date": "$updated_at"}}
                },
                "avg_progress": {"$avg": "$enrollments.progress_percent"},
                "count": {"$sum": 1}
            }},
            {"$sort": {"_id.date": 1}},
            {"$limit": 30}
        ]
        
        progress_data = await self.student_progress_collection.aggregate(pipeline).to_list(length=30)
        
        # Get XP distribution
        xp_pipeline = [
            {"$match": {"teacher_id": self.teacher_id}},
            {"$bucket": {
                "groupBy": "$total_xp",
                "boundaries": [0, 100, 500, 1000, 5000, 10000, float("inf")],
                "default": "Other",
                "output": {"count": {"$sum": 1}}
            }}
        ]
        
        xp_distribution = await self.student_progress_collection.aggregate(xp_pipeline).to_list(length=10)
        
        return {
            "progress_trends": [
                {"date": p["_id"]["date"], "avg_progress": p["avg_progress"] or 0, "count": p["count"]}
                for p in progress_data
            ],
            "xp_distribution": [
                {"range": b["_id"], "count": b["count"]}
                for b in xp_distribution
            ]
        }
    
    async def get_engagement_analytics(self) -> Dict[str, Any]:
        """Get engagement metrics"""
        # Get activity by day of week
        pipeline = [
            {"$match": {"teacher_id": self.teacher_id}},
            {"$group": {
                "_id": {"$dayOfWeek": "$last_active"},
                "count": {"$sum": 1}
            }},
            {"$sort": {"_id": 1}}
        ]
        
        activity_by_day = await self.student_progress_collection.aggregate(pipeline).to_list(length=7)
        
        # Get session stats
        student_ids = await self._get_teacher_student_ids()
        session_pipeline = [
            {"$match": {
                "user_id": {"$in": student_ids},
                "is_active": False
            }},
            {"$group": {
                "_id": None,
                "avg_session_time": {"$avg": "$total_active_seconds"},
                "total_sessions": {"$sum": 1},
                "avg_xp": {"$avg": "$xp_earned"}
            }}
        ]
        
        session_stats = await self.usage_sessions_collection.aggregate(session_pipeline).to_list(length=1)
        
        return {
            "activity_by_day": [
                {"day": d["_id"], "count": d["count"]}
                for d in activity_by_day
            ],
            "session_stats": session_stats[0] if session_stats else {
                "avg_session_time": 0,
                "total_sessions": 0,
                "avg_xp": 0
            }
        }
    
    async def _get_teacher_student_ids(self) -> List[str]:
        """Get all student IDs enrolled in teacher's courses"""
        courses = await self.courses_collection.find(
            {"teacher_id": self.teacher_id},
            {"enrolled_students": 1}
        ).to_list(length=1000)
        
        student_ids = set()
        for course in courses:
            student_ids.update(course.get("enrolled_students", []))
        
        return list(student_ids)
    
    # ========== Learning Goals ==========
    
    async def get_learning_goal(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Get learning goal settings for a student"""
        goal = await self.learning_goals_collection.find_one({
            "user_id": user_id,
            "teacher_id": self.teacher_id
        })
        if goal and "_id" in goal:
            goal["_id"] = str(goal["_id"])
        return goal
    
    async def set_learning_goal(self, user_id: str, settings: Dict[str, Any]) -> Dict[str, Any]:
        """Set or update learning goal for a student"""
        now = datetime.utcnow()
        
        result = await self.learning_goals_collection.update_one(
            {"user_id": user_id, "teacher_id": self.teacher_id},
            {
                "$set": {
                    "settings": settings,
                    "updated_at": now
                },
                "$setOnInsert": {
                    "user_id": user_id,
                    "teacher_id": self.teacher_id,
                    "created_at": now,
                    "current_streak": 0,
                    "longest_streak": 0,
                    "total_xp_earned": 0,
                    "total_minutes_learned": 0
                }
            },
            upsert=True
        )
        
        return await self.get_learning_goal(user_id)
    
    async def get_all_learning_goals(
        self,
        skip: int = 0,
        limit: int = 50
    ) -> tuple[List[Dict[str, Any]], int]:
        """Get all learning goals for students"""
        query = {"teacher_id": self.teacher_id}
        
        cursor = self.learning_goals_collection.find(query).sort("updated_at", -1).skip(skip).limit(limit)
        goals = await cursor.to_list(length=limit)
        
        for goal in goals:
            if "_id" in goal:
                goal["_id"] = str(goal["_id"])
        
        total = await self.learning_goals_collection.count_documents(query)
        
        return goals, total


def get_admin_repository(teacher_id: str) -> AdminRepository:
    """Factory function to create AdminRepository instance"""
    return AdminRepository(teacher_id)
