# backend/services/learning_path_view_service.py
"""Builds the authenticated Learning Path 3D view model.

Source of truth stays in the existing courses/lessons/user_course_progress
tables (via CourseService). This module only shapes that data into the
presentation-ready LearningPathMeResponse — it owns no persistence.
"""
from typing import Any, Dict, List, Optional

from fastapi import HTTPException

from models.learning_path_view import (
    JoinedCourseSummary,
    LearningPathData,
    LearningPathMeResponse,
    LearningPathNode,
    NodeState,
)


def compute_node_state(
    *,
    is_first: bool,
    is_completed: bool,
    is_current_lesson: bool,
    previous_completed: bool,
) -> NodeState:
    """Sequential-unlock state machine.

    Mirrors the unlock behavior already implicit in CourseService.complete_lesson,
    which advances current_lesson_id to the next lesson by order once the
    previous one is completed.
    """
    if is_completed:
        return "completed"
    if is_current_lesson:
        return "current"
    if is_first or previous_completed:
        return "available"
    return "locked"


def _course_summary(course: Dict[str, Any], progress: Dict[str, Any], *, is_current: bool) -> JoinedCourseSummary:
    lessons = course.get("lessons", [])
    total = len(lessons)
    completed = len(progress.get("completed_lessons", []))
    return JoinedCourseSummary(
        course_id=course["course_id"],
        title=course.get("title", ""),
        title_vi=course.get("title_vi", ""),
        category_key=course.get("category_key", ""),
        category_label=course.get("category_label", ""),
        category_icon=course.get("category_icon", ""),
        progress=(completed / total) if total else 0.0,
        completed_lessons=completed,
        total_lessons=total,
        is_current=is_current,
    )


def _build_path(course: Dict[str, Any], progress: Dict[str, Any]) -> LearningPathData:
    lessons = sorted(course.get("lessons", []), key=lambda item: item.get("order", 0))
    lesson_status_by_id = {
        item["lesson_id"]: item.get("status", "not_started")
        for item in progress.get("lesson_progress", [])
    }
    current_lesson_id = progress.get("current_lesson_id")

    nodes: List[LearningPathNode] = []
    previous_completed = False
    total = len(lessons)
    for index, lesson in enumerate(lessons):
        lesson_id = lesson["lesson_id"]
        is_completed = lesson_status_by_id.get(lesson_id) == "completed"
        state = compute_node_state(
            is_first=index == 0,
            is_completed=is_completed,
            is_current_lesson=lesson_id == current_lesson_id,
            previous_completed=previous_completed,
        )
        reward = lesson.get("reward") or {}
        nodes.append(
            LearningPathNode(
                lesson_id=lesson_id,
                order=lesson.get("order", index + 1),
                title=lesson.get("title", ""),
                title_vi=lesson.get("title_vi", ""),
                state=state,
                xp_reward=int(reward.get("xp", 0)),
                position=(index / (total - 1)) if total > 1 else 0.0,
                launch_path=f"/courses/{course['course_id']}/lessons/{lesson_id}",
            )
        )
        previous_completed = is_completed

    completed_count = sum(1 for node in nodes if node.state == "completed")
    return LearningPathData(
        current_lesson_id=current_lesson_id,
        completed_count=completed_count,
        total_count=total,
        progress=(completed_count / total) if total else 0.0,
        nodes=nodes,
    )


async def build_learning_path_view(user_id: str, course_id: Optional[str], service: Any) -> LearningPathMeResponse:
    """service must expose get_user_progress(user_id) and get_course_by_id(course_id),
    the same CourseService methods backing /users/{id}/progress and /courses/{id}."""
    progress_rows = await service.get_user_progress(user_id)

    joined: List[Dict[str, Any]] = []  # [{course, progress}], published+joined only
    for row in progress_rows:
        course = await service.get_course_by_id(row["course_id"])
        if course is None:
            continue  # not published / not found -> excluded from Learning Path
        joined.append({"course": course, "progress": row})

    if not joined:
        return LearningPathMeResponse(joined_courses=[], selected_course=None, path=None)

    joined_ids = {entry["course"]["course_id"] for entry in joined}
    if course_id is not None:
        if course_id not in joined_ids:
            raise HTTPException(status_code=404, detail="Course not joined")
        selected_entry = next(entry for entry in joined if entry["course"]["course_id"] == course_id)
    else:
        # progress_rows is ordered most-recently-updated-first by the repository,
        # and `joined` preserves that order.
        selected_entry = joined[0]

    selected_id = selected_entry["course"]["course_id"]
    joined_courses = [
        _course_summary(entry["course"], entry["progress"], is_current=entry["course"]["course_id"] == selected_id)
        for entry in joined
    ]
    selected_summary = next(summary for summary in joined_courses if summary.course_id == selected_id)
    path = _build_path(selected_entry["course"], selected_entry["progress"])

    return LearningPathMeResponse(joined_courses=joined_courses, selected_course=selected_summary, path=path)
