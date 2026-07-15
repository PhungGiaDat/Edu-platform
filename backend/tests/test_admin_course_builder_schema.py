import pytest
from pydantic import ValidationError

from models.admin_models import AdminCourseCreate


def valid_lesson(**overrides):
    lesson = {
        "lesson_id": "lesson-1",
        "title": "Meet the family",
        "order": 1,
        "duration_minutes": 5,
        "content": "Learn the words Mom and Dad.",
    }
    lesson.update(overrides)
    return lesson


def test_admin_course_create_requires_a_session():
    with pytest.raises(ValidationError):
        AdminCourseCreate(title="English at Home")


def test_admin_course_create_accepts_visual_builder_lesson():
    course = AdminCourseCreate(
        title="English at Home",
        description="A short visual course.",
        lessons=[valid_lesson()],
    )

    assert course.lessons[0].title == "Meet the family"
    assert course.lessons[0].order == 1
    assert course.is_published is False


@pytest.mark.parametrize("duration", [2, 8])
def test_admin_course_session_duration_matches_learning_flow(duration):
    with pytest.raises(ValidationError):
        AdminCourseCreate(
            title="English at Home",
            lessons=[valid_lesson(duration_minutes=duration)],
        )
