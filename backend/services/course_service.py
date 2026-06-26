import json
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional

from models.course_model import CourseSchema, LessonSession, LessonSessionStepState
from repositories.course_repository import get_course_repository
from services.gamification_service import get_gamification_service
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
    if course.age_range != "5-8":
        raise ValueError("Phase 1 courses must target age range 5-8")
    if not course.thumbnail:
        raise ValueError("Phase 1 courses require a thumbnail asset reference")
    if not 5 <= len(course.lessons) <= 8:
        raise ValueError("Phase 1 demo courses require 5-8 sections")

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
        if not lesson.game:
            raise ValueError(f"Lesson {lesson.lesson_id} requires a section game")
        if not lesson.readAloudStory:
            raise ValueError(f"Lesson {lesson.lesson_id} requires a read-aloud story")
        if not lesson.pronunciation:
            raise ValueError(f"Lesson {lesson.lesson_id} requires a pronunciation task")
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


def load_all_course_seeds() -> List[Dict[str, Any]]:
    return [load_course_seed(path.name) for path in sorted(SEED_DIR.glob("*.json"))]


def _lesson_step_blueprint(lesson: Dict[str, Any]) -> List[Dict[str, str]]:
    steps: List[Dict[str, str]] = []
    if lesson.get("videoLesson"):
        steps.append({"step_id": "watch", "title": "Watch"})
        if lesson["videoLesson"].get("scenes"):
            steps.append({"step_id": "story", "title": "Story"})
    if lesson.get("game"):
        steps.append({"step_id": "game", "title": "Game"})
    if lesson.get("vocabulary"):
        steps.append({"step_id": "words", "title": "Words"})
    if lesson.get("readAloudStory"):
        steps.append({"step_id": "read", "title": "Read"})
    if lesson.get("pronunciation"):
        steps.append({"step_id": "say", "title": "Say"})
    if lesson.get("quiz"):
        steps.append({"step_id": "quiz", "title": "Quiz"})
    steps.append({"step_id": "finish", "title": "Finish"})
    return steps


def _public_asset_url(asset: Dict[str, Any]) -> str:
    bucket = asset.get("bucket") or settings.LEARNAR_ASSETS_BUCKET
    path = asset.get("path", "")
    if path.startswith("http://") or path.startswith("https://") or path.startswith("/"):
        return path
    return f"/{bucket}/{path}"


def _collect_lesson_media_assets(course_id: str, lesson: Dict[str, Any]) -> List[Dict[str, Any]]:
    lesson_id = lesson["lesson_id"]
    assets: List[Dict[str, Any]] = []

    def add(section_id: str, asset_key: str, asset: Optional[Dict[str, Any]], metadata: Optional[Dict[str, Any]] = None) -> None:
        if not asset or not asset.get("path"):
            return
        assets.append({
            "course_id": course_id,
            "lesson_id": lesson_id,
            "section_id": section_id,
            "asset_key": asset_key,
            "bucket": asset.get("bucket") or settings.LEARNAR_ASSETS_BUCKET,
            "path": asset["path"],
            "type": asset["type"],
            "status": asset.get("status", "pending"),
            "public_url": _public_asset_url(asset),
            "provider": "supabase",
            "metadata": metadata or {},
        })

    add("lesson", "course_thumbnail", lesson.get("thumbnail"))
    video_lesson = lesson.get("videoLesson") or {}
    add("watch", "video", video_lesson.get("video"), {"duration_seconds": video_lesson.get("duration_seconds")})
    add("watch", "thumbnail", video_lesson.get("thumbnail"))

    for scene in video_lesson.get("scenes", []):
        add("story", f"scene:{scene['scene_id']}", scene.get("image"), {"order": scene.get("order")})

    for item in lesson.get("vocabulary", []):
        slug = item.get("word_en", "").lower()
        add("words", f"word:{slug}:image", item.get("image"))
        add("words", f"word:{slug}:audio", item.get("audio"))
        add("words", f"word:{slug}:sticker", item.get("sticker"))

    game = lesson.get("game") or {}
    for item in game.get("items", []):
        add("game", f"game:{item.get('id')}", item.get("image"))

    read_story = lesson.get("readAloudStory") or {}
    for page in read_story.get("pages", []):
        add("read", f"page:{page['page_id']}:image", page.get("image"), {"order": page.get("order")})
        add("read", f"page:{page['page_id']}:audio", page.get("audio"), {"order": page.get("order")})

    pronunciation = lesson.get("pronunciation") or {}
    add("say", "prompt_audio", pronunciation.get("audio"))

    for item in (lesson.get("activity") or {}).get("items", []):
        add("activity", f"activity:{item.get('id')}", item.get("image"))

    for question in lesson.get("quiz", []):
        for option in question.get("options", []):
            add("quiz", f"quiz:{question['question_id']}:{option['option_id']}", option.get("image"))

    add("finish", "reward_sticker", (lesson.get("reward") or {}).get("sticker"))
    return assets


def _normalize_existing_step(step: Dict[str, Any]) -> Dict[str, Any]:
    normalized = dict(step)
    normalized.setdefault("title", step.get("step_id", "").title())
    normalized.setdefault("status", "locked")
    normalized.setdefault("attempts", 0)
    normalized.setdefault("best_score", 0)
    normalized.setdefault("passed", False)
    normalized.setdefault("last_response", {})
    normalized.setdefault("updated_at", datetime.utcnow())
    normalized.setdefault("completed_at", None)
    return normalized


def _build_session(user_id: str, course_id: str, lesson: Dict[str, Any]) -> Dict[str, Any]:
    blueprint = _lesson_step_blueprint(lesson)
    steps: List[Dict[str, Any]] = []
    for index, item in enumerate(blueprint):
        step = LessonSessionStepState(
            step_id=item["step_id"],
            title=item["title"],
            status="in_progress" if index == 0 else "locked",
        ).model_dump()
        steps.append(step)

    session = LessonSession(
        user_id=user_id,
        course_id=course_id,
        lesson_id=lesson["lesson_id"],
        current_step_id=steps[0]["step_id"],
        current_step_index=0,
        progress_percent=0,
        steps=[LessonSessionStepState(**step) for step in steps],
    )
    return session.model_dump()


def _progress_percent(steps: List[Dict[str, Any]]) -> int:
    if not steps:
        return 0
    completed = sum(1 for step in steps if step.get("status") == "completed")
    return round((completed / len(steps)) * 100)


def _normalize_session(session: Dict[str, Any], lesson: Dict[str, Any]) -> Dict[str, Any]:
    existing_steps = {
        step["step_id"]: _normalize_existing_step(step)
        for step in session.get("steps", [])
    }
    normalized_steps: List[Dict[str, Any]] = []

    for index, item in enumerate(_lesson_step_blueprint(lesson)):
        current = existing_steps.get(item["step_id"])
        if current:
            current["title"] = item["title"]
            normalized_steps.append(current)
        else:
            normalized_steps.append(
                LessonSessionStepState(
                    step_id=item["step_id"],
                    title=item["title"],
                    status="locked" if index else "available",
                ).model_dump()
            )

    if normalized_steps and all(step["status"] == "locked" for step in normalized_steps):
        normalized_steps[0]["status"] = "available"

    current_step_id = session.get("current_step_id")
    if current_step_id not in {step["step_id"] for step in normalized_steps}:
        next_step = next((step for step in normalized_steps if step["status"] in {"available", "in_progress", "needs_retry"}), normalized_steps[0])
        current_step_id = next_step["step_id"]

    current_step_index = next(
        (index for index, step in enumerate(normalized_steps) if step["step_id"] == current_step_id),
        0,
    )

    session["steps"] = normalized_steps
    session["current_step_id"] = current_step_id
    session["current_step_index"] = current_step_index
    session["progress_percent"] = _progress_percent(normalized_steps)
    session["updated_at"] = datetime.utcnow()
    return session


def _advance_session(session: Dict[str, Any], step_id: str, passed: bool, score: int, response_data: Dict[str, Any]) -> Dict[str, Any]:
    now = datetime.utcnow()
    steps = [_normalize_existing_step(step) for step in session.get("steps", [])]
    index_map = {step["step_id"]: idx for idx, step in enumerate(steps)}
    step_index = index_map[step_id]
    step = steps[step_index]
    step_complete = bool(response_data.get("step_complete", passed))

    step["attempts"] = int(step.get("attempts", 0)) + 1
    step["best_score"] = max(int(step.get("best_score", 0)), score)
    step["last_response"] = response_data
    step["updated_at"] = now
    step["passed"] = passed

    if passed and step_complete:
        step["status"] = "completed"
        step["completed_at"] = step.get("completed_at") or now
        next_index = step_index + 1
        if next_index < len(steps):
            next_step = steps[next_index]
            if next_step["status"] == "locked":
                next_step["status"] = "available"
            if next_step["status"] in {"available", "needs_retry"}:
                next_step["status"] = "in_progress"
            session["current_step_id"] = next_step["step_id"]
            session["current_step_index"] = next_index
        else:
            session["current_step_id"] = step["step_id"]
            session["current_step_index"] = step_index
    elif passed:
        step["status"] = "in_progress"
        session["current_step_id"] = step["step_id"]
        session["current_step_index"] = step_index
    else:
        step["status"] = "needs_retry"
        session["current_step_id"] = step["step_id"]
        session["current_step_index"] = step_index

    if step_id == "finish" and passed:
        session["status"] = "completed"
        session["completed_at"] = now

    session["steps"] = steps
    session["progress_percent"] = _progress_percent(steps)
    session["updated_at"] = now
    return session


class CourseService:
    def __init__(self):
        self.repo = get_course_repository()

    async def _register_lesson_media(self, course_id: str, lesson: Dict[str, Any]) -> None:
        await self.repo.upsert_media_assets(_collect_lesson_media_assets(course_id, lesson))

    async def get_courses(self, skip: int = 0, limit: int = 20) -> List[Dict[str, Any]]:
        return await self.repo.get_all_published(skip, limit)

    async def get_course_by_id(self, course_id: str) -> Optional[Dict[str, Any]]:
        return await self.repo.get_by_course_id(course_id)

    async def get_lesson(self, course_id: str, lesson_id: str) -> Optional[Dict[str, Any]]:
        lesson = await self.repo.get_lesson(course_id, lesson_id)
        if lesson:
            await self._register_lesson_media(course_id, lesson)
        return lesson

    async def get_lesson_media(self, course_id: str, lesson_id: str) -> List[Dict[str, Any]]:
        lesson = await self.get_lesson(course_id, lesson_id)
        if not lesson:
            raise ValueError("Lesson not found")
        return await self.repo.get_media_assets(course_id, lesson_id)

    async def generate_sample_course(
        self,
        seed_name: Optional[str] = None,
        payload: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        course = validate_course_payload(payload) if payload else load_course_seed(seed_name)
        await self.repo.upsert_course(course)
        for lesson in course.get("lessons", []):
            await self._register_lesson_media(course["course_id"], lesson)
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

    async def start_lesson_session(self, user_id: str, course_id: str, lesson_id: str) -> Dict[str, Any]:
        await self.start_course(user_id, course_id)
        lesson = await self.get_lesson(course_id, lesson_id)
        if not lesson:
            raise ValueError("Lesson not found")

        existing = await self.repo.get_lesson_session(user_id, course_id, lesson_id)
        session = _normalize_session(existing, lesson) if existing else _build_session(user_id, course_id, lesson)
        await self.repo.upsert_lesson_session(session)
        return session

    async def get_lesson_session(self, user_id: str, course_id: str, lesson_id: str) -> Dict[str, Any]:
        session = await self.repo.get_lesson_session(user_id, course_id, lesson_id)
        if session:
            lesson = await self.get_lesson(course_id, lesson_id)
            if not lesson:
                raise ValueError("Lesson not found")
            session = _normalize_session(session, lesson)
            await self.repo.upsert_lesson_session(session)
            return session
        return await self.start_lesson_session(user_id, course_id, lesson_id)

    async def submit_lesson_step(
        self,
        user_id: str,
        course_id: str,
        lesson_id: str,
        step_id: str,
        attempt_type: str,
        passed: bool,
        score: int,
        response_data: Dict[str, Any],
        mastery_words: List[str],
    ) -> Dict[str, Any]:
        # SECURITY FIX: Validate score against passed status
        # If client claims passed=True, score should be >= 70
        if passed and score < 70:
            raise ValueError("Cannot mark step as passed with score below 70")

        session = await self.get_lesson_session(user_id, course_id, lesson_id)
        step_map = {step["step_id"]: step for step in session.get("steps", [])}
        if step_id not in step_map:
            raise ValueError(f"Unknown lesson step: {step_id}")
        if step_id != session.get("current_step_id"):
            raise ValueError(f"Step is not currently available: {step_id}")

        # SECURITY FIX: Validate mastery_words against lesson vocabulary
        lesson = await self.get_lesson(course_id, lesson_id)
        if lesson:
            valid_words = {vocab.get("word_en", "").lower() for vocab in lesson.get("vocabulary", [])}
            valid_words.discard("")  # Remove empty string if present
            invalid_words = [word for word in mastery_words if word.lower() not in valid_words]
            if invalid_words:
                raise ValueError(f"Invalid vocabulary words: {invalid_words}. These words are not in the lesson vocabulary.")

        session = _advance_session(session, step_id, passed, score, response_data)
        await self.repo.upsert_lesson_session(session)
        await self.repo.create_lesson_step_attempt({
            "session_id": session["session_id"],
            "user_id": user_id,
            "course_id": course_id,
            "lesson_id": lesson_id,
            "step_id": step_id,
            "attempt_type": attempt_type,
            "passed": passed,
            "score": score,
            "response_data": response_data,
        })

        for word in mastery_words:
            await self.repo.update_word_mastery(user_id, course_id, lesson_id, word, passed, score)

        return session

    async def complete_lesson(
        self,
        user_id: str,
        course_id: str,
        lesson_id: str,
        *,
        score: Optional[float] = None,
        time_spent: Optional[int] = None,
        words_learned: Optional[List[str]] = None,
        pronunciation_scores: Optional[Dict[str, float]] = None,
        games_played: Optional[int] = None,
        completed_steps: Optional[List[str]] = None,
    ) -> Dict[str, Any]:
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

        # === Gamification Hook: Track learning + check stickers ===
        gam_service = get_gamification_service()
        words_count = len(words_learned) if words_learned else 0
        # Frontend sends time in minutes (already ceil'd), use directly
        time_mins = time_spent if time_spent is not None else 0

        # Award XP for lesson completion (only first time)
        xp_earned = 0
        if not was_already_completed and reward:
            xp_earned = int(reward.get("xp", 0))
            if xp_earned > 0:
                await gam_service.add_xp(user_id, "lesson_complete", {"course_id": course_id, "lesson_id": lesson_id})

        await gam_service.track_learning(user_id, words_count, time_mins)

        existing_session = await self.repo.get_lesson_session(user_id, course_id, lesson_id)
        if existing_session:
            finish_step = next((step for step in existing_session.get("steps", []) if step.get("step_id") == "finish"), None)
            response = {"completed_via": "lesson_complete"}
            if finish_step and finish_step.get("status") != "completed":
                existing_session = _advance_session(existing_session, "finish", True, 100, response)
            else:
                existing_session["status"] = "completed"
                existing_session["completed_at"] = datetime.utcnow()
                existing_session["updated_at"] = datetime.utcnow()
                existing_session["progress_percent"] = 100
            await self.repo.upsert_lesson_session(existing_session)

        # Award stickers if threshold reached (auto-award)
        new_sticker = None
        if words_count > 0 or games_played:
            new_sticker = await gam_service._maybe_award_lesson_sticker(user_id, words_count, games_played)

        # Build enriched response with XP metadata
        result = {
            **progress,
            "gamification": {
                "xp_earned": 0 if was_already_completed or not reward else int(reward.get("xp", 0)),
                "words_learned": words_count,
                "time_mins": time_mins,
                "new_sticker": new_sticker,
            }
        }

        return result

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
