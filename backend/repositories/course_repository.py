from datetime import datetime
from typing import List, Optional, Dict, Any
from database.base_repo import BaseRepository
from database.db import mongo_connector
from models.course_integrity import normalize_course_payload
import logging

logger = logging.getLogger(__name__)

class CourseRepository(BaseRepository):
    def __init__(self):
        super().__init__("courses")
        self.progress_collection = mongo_connector.get_collection("user_course_progress")
        self.lesson_sessions_collection = mongo_connector.get_collection("lesson_sessions")
        self.lesson_step_attempts_collection = mongo_connector.get_collection("lesson_step_attempts")
        self.word_mastery_collection = mongo_connector.get_collection("word_mastery")
        self.media_assets_collection = mongo_connector.get_collection("media_assets")

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
        course = normalize_course_payload(course, strict_generated=True, refresh_updated_at=False)
        course.pop("_id", None)
        created_at = course.pop("created_at", datetime.utcnow())
        course["updated_at"] = datetime.utcnow()
        return await self.update_one(
            {"course_id": course["course_id"]},
            {"$set": course, "$setOnInsert": {"created_at": created_at}},
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
        progress = dict(progress)
        progress.pop("_id", None)
        started_at = progress.pop("started_at", datetime.utcnow())
        progress["updated_at"] = datetime.utcnow()
        result = await self.progress_collection.update_one(
            {"user_id": user_id, "course_id": course_id},
            {"$set": progress, "$setOnInsert": {"started_at": started_at}},
            upsert=True,
        )
        return result.modified_count > 0 or result.upserted_id is not None

    async def get_lesson_session(self, user_id: str, course_id: str, lesson_id: str) -> Optional[Dict[str, Any]]:
        return await self.lesson_sessions_collection.find_one({
            "user_id": user_id,
            "course_id": course_id,
            "lesson_id": lesson_id,
        })

    async def upsert_lesson_session(self, session: Dict[str, Any]) -> bool:
        session = dict(session)
        session.pop("_id", None)
        started_at = session.pop("started_at", datetime.utcnow())
        session_id = session.pop("session_id", None)
        session["updated_at"] = datetime.utcnow()
        result = await self.lesson_sessions_collection.update_one(
            {
                "user_id": session["user_id"],
                "course_id": session["course_id"],
                "lesson_id": session["lesson_id"],
            },
            {
                "$set": session,
                "$setOnInsert": {
                    "started_at": started_at,
                    "session_id": session_id,
                },
            },
            upsert=True,
        )
        return result.modified_count > 0 or result.upserted_id is not None

    async def create_lesson_step_attempt(self, attempt: Dict[str, Any]) -> str:
        attempt.setdefault("attempted_at", datetime.utcnow())
        result = await self.lesson_step_attempts_collection.insert_one(attempt)
        return str(result.inserted_id)

    async def get_lesson_step_attempts(
        self,
        session_id: str,
        step_id: Optional[str] = None,
        limit: int = 50,
    ) -> List[Dict[str, Any]]:
        query: Dict[str, Any] = {"session_id": session_id}
        if step_id:
            query["step_id"] = step_id
        cursor = self.lesson_step_attempts_collection.find(query).sort("attempted_at", -1).limit(limit)
        return await cursor.to_list(length=limit)

    async def update_word_mastery(
        self,
        user_id: str,
        course_id: str,
        lesson_id: str,
        word: str,
        passed: bool,
        score: int,
    ) -> bool:
        result = await self.word_mastery_collection.update_one(
            {
                "user_id": user_id,
                "course_id": course_id,
                "lesson_id": lesson_id,
                "word": word.lower(),
            },
            {
                "$set": {
                    "user_id": user_id,
                    "course_id": course_id,
                    "lesson_id": lesson_id,
                    "word": word.lower(),
                    "display_word": word,
                    "updated_at": datetime.utcnow(),
                    "last_score": score,
                    "last_passed": passed,
                },
                "$max": {"best_score": score},
                "$inc": {
                    "attempts": 1,
                    "passes": 1 if passed else 0,
                },
                "$setOnInsert": {"created_at": datetime.utcnow()},
            },
            upsert=True,
        )
        return result.modified_count > 0 or result.upserted_id is not None

    async def upsert_media_assets(self, assets: List[Dict[str, Any]]) -> None:
        for asset in assets:
            asset = dict(asset)
            asset.pop("_id", None)
            created_at = asset.pop("created_at", datetime.utcnow())
            asset["updated_at"] = datetime.utcnow()
            await self.media_assets_collection.update_one(
                {
                    "course_id": asset["course_id"],
                    "lesson_id": asset["lesson_id"],
                    "section_id": asset["section_id"],
                    "asset_key": asset["asset_key"],
                    "path": asset["path"],
                },
                {"$set": asset, "$setOnInsert": {"created_at": created_at}},
                upsert=True,
            )

    async def get_media_assets(self, course_id: str, lesson_id: str) -> List[Dict[str, Any]]:
        cursor = self.media_assets_collection.find({
            "course_id": course_id,
            "lesson_id": lesson_id,
        }).sort([("section_id", 1), ("asset_key", 1)])
        return await cursor.to_list(length=500)

def get_course_repository() -> CourseRepository:
    return CourseRepository()
