"""Foundation guards: persistence mappings remain separate from Pydantic contracts."""

from database.orm_base import Base
import database.orm_models  # noqa: F401


def test_learner_metadata_maps_the_live_core_tables():
    assert {"courses", "lessons", "lesson_sessions", "lesson_session_steps", "lesson_step_attempts", "user_course_progress", "user_course_lesson_progress"}.issubset(Base.metadata.tables)


def test_lesson_learning_blocks_remains_postgresql_jsonb():
    assert Base.metadata.tables["lessons"].c.learning_blocks.type.__class__.__name__ == "JSONB"
