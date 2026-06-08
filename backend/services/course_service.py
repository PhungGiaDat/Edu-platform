import json
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional

from models.course_model import CourseSchema
from repositories.course_repository import get_course_repository
from settings import settings


SEED_DIR = Path(__file__).resolve().parent.parent / "seeds" / "courses"
DEFAULT_SEED_FILENAME = "momo_nature_phase1.json"


def _seed_path(seed_name: Optional[str] = None) -> Path:
    name = seed_name or DEFAULT_SEED_FILENAME
    path = (SEED_DIR / name).resolve()
    seed_root = SEED_DIR.resolve()
    if not path.is_file() or seed_root not in path.parents:
        raise FileNotFoundError(f"Course seed not found: {name}")
    return path


def _normalize_asset_buckets(value: Any) -> Any:
    if isinstance(value, dict):
        normalized = {key: _normalize_asset_buckets(item) for key, item in value.items()}
        if {"bucket", "path", "type", "status"}.issubset(normalized.keys()):
            normalized["bucket"] = normalized.get("bucket") or settings.LEARNAR_ASSETS_BUCKET
        return normalized
    if isinstance(value, list):
        return [_normalize_asset_buckets(item) for item in value]
    return value


def _validate_phase1_course(course: CourseSchema) -> None:
    if course.age_range != "5-7":
        raise ValueError("Phase 1 courses must target age range 5-7")
    if not course.thumbnail:
        raise ValueError("Phase 1 courses require a thumbnail asset reference")

    for lesson in course.lessons:
        if not 3 <= lesson.duration_minutes <= 7:
            raise ValueError(f"Lesson {lesson.lesson_id} must be 3-7 minutes")
        if not lesson.videoLesson:
            raise ValueError(f"Lesson {lesson.lesson_id} requires videoLesson")
        if not 60 <= lesson.videoLesson.duration_seconds <= 120:
            raise ValueError(f"Lesson {lesson.lesson_id} video must be 60-120 seconds")
        if not 3 <= len(lesson.vocabulary) <= 5:
            raise ValueError(f"Lesson {lesson.lesson_id} requires 3-5 vocabulary words")
        if not lesson.activity:
            raise ValueError(f"Lesson {lesson.lesson_id} requires an activity")
        if not 3 <= len(lesson.quiz) <= 5:
            raise ValueError(f"Lesson {lesson.lesson_id} requires 3-5 quiz questions")
        if not lesson.reward:
            raise ValueError(f"Lesson {lesson.lesson_id} requires a reward")
        for question in lesson.quiz:
            if len(question.options) > 4:
                raise ValueError(f"Quiz {question.question_id} has more than 4 options")
            if not question.questionAudioText:
                raise ValueError(f"Quiz {question.question_id} requires questionAudioText")


def validate_course_payload(payload: Dict[str, Any]) -> Dict[str, Any]:
    course = CourseSchema.model_validate(_normalize_asset_buckets(payload))
    _validate_phase1_course(course)
    course_data = course.model_dump()
    course_data["updated_at"] = datetime.utcnow()
    return course_data


def load_course_seed(seed_name: Optional[str] = None) -> Dict[str, Any]:
    with _seed_path(seed_name).open("r", encoding="utf-8") as file:
        payload = json.load(file)
    return validate_course_payload(payload)


class CourseService:
    def __init__(self):
        self.repo = get_course_repository()

    async def get_courses(self, skip: int = 0, limit: int = 20) -> List[Dict[str, Any]]:
        return await self.repo.get_all_published(skip, limit)

    async def get_course_by_id(self, course_id: str) -> Optional[Dict[str, Any]]:
        return await self.repo.get_by_course_id(course_id)

    async def get_lesson(self, course_id: str, lesson_id: str) -> Optional[Dict[str, Any]]:
        return await self.repo.get_lesson(course_id, lesson_id)

    async def generate_sample_course(
        self,
        seed_name: Optional[str] = None,
        payload: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        course = validate_course_payload(payload) if payload else load_course_seed(seed_name)
        await self.repo.upsert_course(course)
        return course

    async def start_course(self, user_id: str, course_id: str) -> Dict[str, Any]:
        course = await self.get_course_by_id(course_id)
        if not course:
            raise ValueError("Course not found")

        lessons = course.get("lessons", [])
        first_lesson_id = lessons[0]["lesson_id"] if lessons else None
        existing = await self.repo.get_one_progress(user_id, course_id)
        progress = existing or {
            "user_id": user_id,
            "course_id": course_id,
            "status": "started",
            "current_lesson_id": first_lesson_id,
            "completed_lessons": [],
            "lesson_progress": [
                {
                    "lesson_id": lesson["lesson_id"],
                    "status": "not_started",
                    "best_score": 0,
                    "attempts": 0,
                    "completed_at": None,
                }
                for lesson in lessons
            ],
            "total_xp": 0,
            "rewards": [],
            "started_at": datetime.utcnow(),
        }
        await self.repo.upsert_progress(user_id, course_id, progress)
        return progress

    async def complete_lesson(self, user_id: str, course_id: str, lesson_id: str) -> Dict[str, Any]:
        course = await self.get_course_by_id(course_id)
        if not course:
            raise ValueError("Course not found")

        lesson = next((item for item in course.get("lessons", []) if item.get("lesson_id") == lesson_id), None)
        if not lesson:
            raise ValueError("Lesson not found")

        progress = await self.repo.get_one_progress(user_id, course_id) or await self.start_course(user_id, course_id)
        completed = set(progress.get("completed_lessons", []))
        was_already_completed = lesson_id in completed
        completed.add(lesson_id)

        lesson_progress = progress.get("lesson_progress", [])
        for item in lesson_progress:
            if item.get("lesson_id") == lesson_id:
                item["status"] = "completed"
                item["completed_at"] = datetime.utcnow()

        lessons = course.get("lessons", [])
        next_lesson = next((item for item in lessons if item.get("order", 0) > lesson.get("order", 0)), None)
        reward = lesson.get("reward")
        rewards = progress.get("rewards", [])
        if not was_already_completed and reward:
            rewards = [*rewards, reward]
        progress.update({
            "completed_lessons": list(completed),
            "lesson_progress": lesson_progress,
            "current_lesson_id": next_lesson.get("lesson_id") if next_lesson else lesson_id,
            "status": "completed" if len(completed) >= len(lessons) else "started",
            "total_xp": int(progress.get("total_xp", 0)) + (0 if was_already_completed or not reward else int(reward.get("xp", 0))),
            "rewards": rewards,
        })
        await self.repo.upsert_progress(user_id, course_id, progress)
        return progress

    async def submit_quiz(self, user_id: str, course_id: str, lesson_id: str, answers: Dict[str, str]) -> Dict[str, Any]:
        lesson = await self.get_lesson(course_id, lesson_id)
        if not lesson:
            raise ValueError("Lesson not found")

        questions = lesson.get("quiz", [])
        correct = 0
        feedback = []
        for question in questions:
            question_id = question["question_id"]
            selected = answers.get(question_id)
            is_correct = selected == question["correctOptionId"]
            if is_correct:
                correct += 1
            feedback.append({
                "question_id": question_id,
                "correct": is_correct,
                "message": question["feedbackCorrect"] if is_correct else question["feedbackIncorrect"],
            })

        score = round((correct / max(len(questions), 1)) * 100)
        progress = await self.repo.get_one_progress(user_id, course_id) or await self.start_course(user_id, course_id)
        for item in progress.get("lesson_progress", []):
            if item.get("lesson_id") == lesson_id:
                item["attempts"] = int(item.get("attempts", 0)) + 1
                item["best_score"] = max(int(item.get("best_score", 0)), score)
                item["status"] = "completed" if score >= 70 else "started"
        await self.repo.upsert_progress(user_id, course_id, progress)

        return {
            "score": score,
            "correct": correct,
            "total": len(questions),
            "passed": score >= 70,
            "feedback": feedback,
            "reward": lesson.get("reward") if score >= 70 else None,
        }

    async def get_user_progress(self, user_id: str) -> List[Dict[str, Any]]:
        return await self.repo.get_progress(user_id)


def get_course_service() -> CourseService:
    return CourseService()
