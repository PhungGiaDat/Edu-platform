"""Selection and authoritative answer evaluation for a Lesson quiz activity."""

from __future__ import annotations

import random
from typing import Any

from database.orm_models.quiz import QuizQuestionORM
from models.lesson_activity import QuizActivity, normalize_learning_blocks
from repositories.orm_course_repository import CourseRepository
from repositories.orm_quiz_repository import QuizRepository


class QuizActivityService:
    def __init__(self, courses: CourseRepository, quizzes: QuizRepository, rng: random.Random | None = None):
        self.courses = courses
        self.quizzes = quizzes
        self.rng = rng or random.SystemRandom()

    async def _activity(self, course_id: str, lesson_id: str, activity_id: str) -> QuizActivity:
        lesson = await self.courses.get_lesson(course_id, lesson_id)
        if not lesson:
            raise ValueError("Lesson not found")
        blocks = normalize_learning_blocks(lesson.get("learning_blocks"))
        activity = next((item for item in blocks.activities if item.activity_id == activity_id), None)
        if not isinstance(activity, QuizActivity):
            raise ValueError("Quiz activity not found")
        return activity

    async def _selected_questions(self, activity: QuizActivity, saved_ids: list[int] | None = None) -> list[QuizQuestionORM]:
        ids = list(saved_ids or activity.config.question_ids)
        if saved_ids is None:
            count = activity.config.question_count or len(ids)
            if activity.config.order_policy == "random":
                ids = self.rng.sample(ids, count)
            else:
                ids = ids[:count]
        return await self.quizzes.get_questions(ids)

    @staticmethod
    def _dto(question: QuizQuestionORM) -> dict[str, Any]:
        if question.question_type not in {"multiple_choice", "true_false"}:
            raise ValueError(f"Unsupported canonical quiz question type: {question.question_type}")
        if not question.options:
            raise ValueError(f"Canonical quiz question {question.id} has no options")
        return {
            "question_id": question.id,
            "question_type": question.question_type,
            "prompt": question.question_text,
            "flashcard_qr_id": question.flashcard_qr_id,
            "options": [
                {"option_id": f"{question.id}:{option.option_order}", "label": option.value, "order": option.option_order}
                for option in sorted(question.options, key=lambda item: item.option_order)
            ],
        }

    async def hydrate(self, user_id: str, course_id: str, lesson_id: str, activity_id: str) -> dict[str, Any]:
        activity = await self._activity(course_id, lesson_id, activity_id)
        session = await self.courses.get_lesson_session(user_id, course_id, lesson_id)
        step = next((item for item in session["steps"] if item["step_id"] == activity_id), None)
        if not step:
            raise ValueError("Quiz activity is not mapped to this lesson session")
        state = dict(step.get("last_response") or {})
        questions = await self._selected_questions(activity, state.get("quiz_question_ids"))
        if "quiz_question_ids" not in state:
            state["quiz_question_ids"] = [question.id for question in questions]
            step["last_response"] = state
            await self.courses.upsert_lesson_session(session)
        return {"activity_id": activity_id, "questions": [self._dto(question) for question in questions]}

    async def submit_answer(self, user_id: str, course_id: str, lesson_id: str, activity_id: str, question_id: int, option_id: str) -> dict[str, Any]:
        hydrated = await self.hydrate(user_id, course_id, lesson_id, activity_id)
        questions = {question["question_id"]: question for question in hydrated["questions"]}
        question = questions.get(question_id)
        if not question:
            raise ValueError("Question does not belong to this quiz activity")
        option = next((item for item in question["options"] if item["option_id"] == option_id), None)
        if not option:
            raise ValueError("Option does not belong to this question")
        canonical = (await self.quizzes.get_questions([question_id]))[0]
        correct = option["label"] == canonical.correct_answer
        session = await self.courses.get_lesson_session(user_id, course_id, lesson_id)
        if activity_id != session.get("current_step_id"):
            raise ValueError("Quiz activity is not currently available")
        attempts = await self.courses.get_lesson_step_attempts(session["session_id"], activity_id)
        answered = {item.get("response_data", {}).get("question_id") for item in attempts}
        if question_id in answered:
            raise ValueError("Question has already been answered")
        answered.add(question_id)
        complete = answered == set(questions)
        score = round(100 * sum(bool(item.get("passed")) for item in attempts + [{"passed": correct}]) / len(questions))
        response = {"quiz_question_ids": list(questions), "question_id": question_id, "option_id": option_id, "correct": correct, "answered_question_ids": sorted(answered), "score": score}
        if complete:
            from services.course_service import _advance_session
            session = _advance_session(session, activity_id, True, score, response)
        else:
            step = next(item for item in session["steps"] if item["step_id"] == activity_id)
            step["attempts"] = int(step.get("attempts", 0)) + 1
            step["best_score"] = max(int(step.get("best_score", 0)), score)
            step["last_response"] = response
        await self.courses.upsert_lesson_session(session)
        await self.courses.create_lesson_step_attempt({"session_id": session["session_id"], "user_id": user_id, "course_id": course_id, "lesson_id": lesson_id, "step_id": activity_id, "attempt_type": "quiz", "passed": correct, "score": 100 if correct else 0, "response_data": response})
        return {"question_id": question_id, "correct": correct, "score": score, "completed": complete, "session": session}
