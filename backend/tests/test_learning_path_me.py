"""Learning Path 3D facade: joined-course-only view model."""

from unittest.mock import AsyncMock

import pytest
from fastapi import HTTPException

from api.learning_path import get_my_learning_path
from services.learning_path_view_service import build_learning_path_view, compute_node_state


def _course(course_id: str, lessons=None, **overrides):
    return {
        "course_id": course_id,
        "title": overrides.get("title", course_id),
        "title_vi": overrides.get("title_vi", ""),
        "category_key": overrides.get("category_key", "nature"),
        "category_label": overrides.get("category_label", "Nature"),
        "category_icon": overrides.get("category_icon", "Nature"),
        "lessons": lessons or [],
    }


def _lesson(lesson_id: str, order: int, xp: int = 80, **overrides):
    return {
        "lesson_id": lesson_id,
        "order": order,
        "title": overrides.get("title", lesson_id),
        "title_vi": overrides.get("title_vi", ""),
        "reward": {"xp": xp} if xp is not None else None,
    }


def _progress_row(course_id: str, current_lesson_id, completed_lessons, lesson_statuses):
    return {
        "user_id": "user-1",
        "course_id": course_id,
        "current_lesson_id": current_lesson_id,
        "completed_lessons": completed_lessons,
        "lesson_progress": [
            {"lesson_id": lesson_id, "status": status}
            for lesson_id, status in lesson_statuses.items()
        ],
    }


def _service(progress_rows, courses_by_id):
    async def get_course_by_id(course_id):
        return courses_by_id.get(course_id)

    return type(
        "Service",
        (),
        {
            "get_user_progress": AsyncMock(return_value=progress_rows),
            "get_course_by_id": AsyncMock(side_effect=get_course_by_id),
        },
    )()


# ========== compute_node_state ==========

def test_state_completed_wins_over_current():
    assert compute_node_state(is_first=False, is_completed=True, is_current_lesson=True, previous_completed=False) == "completed"


def test_state_current():
    assert compute_node_state(is_first=False, is_completed=False, is_current_lesson=True, previous_completed=True) == "current"


def test_state_available_first_lesson():
    assert compute_node_state(is_first=True, is_completed=False, is_current_lesson=False, previous_completed=False) == "available"


def test_state_available_after_previous_completed():
    assert compute_node_state(is_first=False, is_completed=False, is_current_lesson=False, previous_completed=True) == "available"


def test_state_locked_otherwise():
    assert compute_node_state(is_first=False, is_completed=False, is_current_lesson=False, previous_completed=False) == "locked"


# ========== build_learning_path_view ==========

@pytest.mark.asyncio
async def test_zero_joined_courses_returns_empty_state():
    service = _service([], {})

    result = await build_learning_path_view("user-1", None, service)

    assert result.joined_courses == []
    assert result.selected_course is None
    assert result.path is None


@pytest.mark.asyncio
async def test_one_joined_course_becomes_selected():
    lessons = [_lesson("l1", 1), _lesson("l2", 2)]
    course = _course("nature", lessons=lessons)
    progress = _progress_row("nature", "l2", ["l1"], {"l1": "completed", "l2": "not_started"})
    service = _service([progress], {"nature": course})

    result = await build_learning_path_view("user-1", None, service)

    assert len(result.joined_courses) == 1
    assert result.selected_course.course_id == "nature"
    assert result.path.total_count == 2
    assert result.path.nodes[0].state == "completed"
    assert result.path.nodes[1].state == "current"


@pytest.mark.asyncio
async def test_multiple_joined_courses_default_selection_is_most_recent():
    course_a = _course("nature", lessons=[_lesson("a1", 1)])
    course_b = _course("school-food", lessons=[_lesson("b1", 1)])
    # repository returns most-recently-updated first
    progress_a = _progress_row("nature", "a1", [], {})
    progress_b = _progress_row("school-food", "b1", [], {})
    service = _service([progress_b, progress_a], {"nature": course_a, "school-food": course_b})

    result = await build_learning_path_view("user-1", None, service)

    assert {c.course_id for c in result.joined_courses} == {"nature", "school-food"}
    assert result.selected_course.course_id == "school-food"


@pytest.mark.asyncio
async def test_course_not_returned_by_get_course_by_id_is_excluded():
    """Unpublished or missing courses are filtered by CourseService.get_course_by_id
    itself (returns None); the facade must drop them, not show all published courses."""
    progress_animals = _progress_row("animals", None, [], {})
    progress_nature = _progress_row("nature", "n1", [], {})
    course_nature = _course("nature", lessons=[_lesson("n1", 1)])
    # "animals" resolves to None => not published / not found => excluded
    service = _service([progress_nature, progress_animals], {"nature": course_nature})

    result = await build_learning_path_view("user-1", None, service)

    assert {c.course_id for c in result.joined_courses} == {"nature"}


@pytest.mark.asyncio
async def test_lesson_ordering_follows_lesson_order_not_input_order():
    lessons = [_lesson("l3", 3), _lesson("l1", 1), _lesson("l2", 2)]
    course = _course("nature", lessons=lessons)
    progress = _progress_row("nature", "l1", [], {})
    service = _service([progress], {"nature": course})

    result = await build_learning_path_view("user-1", None, service)

    assert [n.lesson_id for n in result.path.nodes] == ["l1", "l2", "l3"]


@pytest.mark.asyncio
async def test_invalid_course_id_not_in_joined_set_raises_404():
    course = _course("nature", lessons=[_lesson("n1", 1)])
    progress = _progress_row("nature", "n1", [], {})
    service = _service([progress], {"nature": course})

    with pytest.raises(HTTPException) as exc_info:
        await build_learning_path_view("user-1", "animals", service)

    assert exc_info.value.status_code == 404


@pytest.mark.asyncio
async def test_course_id_user_has_not_joined_raises_404_even_if_it_exists():
    course_nature = _course("nature", lessons=[_lesson("n1", 1)])
    course_animals = _course("animals", lessons=[_lesson("a1", 1)])
    # user only joined "nature"; "animals" exists globally but user never started it
    progress = _progress_row("nature", "n1", [], {})
    service = _service([progress], {"nature": course_nature, "animals": course_animals})

    with pytest.raises(HTTPException) as exc_info:
        await build_learning_path_view("user-1", "animals", service)

    assert exc_info.value.status_code == 404


@pytest.mark.asyncio
async def test_valid_course_id_query_param_selects_that_course():
    course_a = _course("nature", lessons=[_lesson("a1", 1)])
    course_b = _course("school-food", lessons=[_lesson("b1", 1)])
    progress_a = _progress_row("nature", "a1", [], {})
    progress_b = _progress_row("school-food", "b1", [], {})
    service = _service([progress_a, progress_b], {"nature": course_a, "school-food": course_b})

    result = await build_learning_path_view("user-1", "school-food", service)

    assert result.selected_course.course_id == "school-food"
    assert result.path.nodes[0].lesson_id == "b1"


@pytest.mark.asyncio
async def test_xp_normalized_from_reward_xp():
    lessons = [_lesson("l1", 1, xp=80), _lesson("l2", 2, xp=None)]
    course = _course("nature", lessons=lessons)
    progress = _progress_row("nature", "l1", [], {})
    service = _service([progress], {"nature": course})

    result = await build_learning_path_view("user-1", None, service)

    assert result.path.nodes[0].xp_reward == 80
    assert result.path.nodes[1].xp_reward == 0


@pytest.mark.asyncio
async def test_positions_normalized_0_to_1_across_lessons():
    lessons = [_lesson("l1", 1), _lesson("l2", 2), _lesson("l3", 3)]
    course = _course("nature", lessons=lessons)
    progress = _progress_row("nature", "l1", [], {})
    service = _service([progress], {"nature": course})

    result = await build_learning_path_view("user-1", None, service)

    positions = [n.position for n in result.path.nodes]
    assert positions == [0.0, 0.5, 1.0]


@pytest.mark.asyncio
async def test_launch_path_points_to_canonical_lesson_runner():
    course = _course("nature", lessons=[_lesson("l1", 1)])
    progress = _progress_row("nature", "l1", [], {})
    service = _service([progress], {"nature": course})

    result = await build_learning_path_view("user-1", None, service)

    assert result.path.nodes[0].launch_path == "/courses/nature/lessons/l1"


@pytest.mark.asyncio
async def test_route_derives_user_from_current_user_not_query_param():
    course = _course("nature", lessons=[_lesson("l1", 1)])
    progress = _progress_row("nature", "l1", [], {})
    service = _service([progress], {"nature": course})

    result = await get_my_learning_path(
        None,
        type("User", (), {"id": "user-1"})(),
        service,
    )

    assert result.selected_course.course_id == "nature"
    service.get_user_progress.assert_awaited_once_with("user-1")
