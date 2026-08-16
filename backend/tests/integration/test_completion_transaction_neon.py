"""Real PostgreSQL proof for the CourseService completion transaction.

This test is intentionally opt-in.  It only runs when TEST_DATABASE_URL points
at an isolated disposable database and rejects a target that resolves to the
configured production database.  The test schema is limited to the mappings
used by ``complete_lesson``; gamification DDL is copied from the immutable
``20260812_01_mobile_core.sql`` history.
"""

from __future__ import annotations

import json
import os
from urllib.parse import urlparse

import pytest
from sqlalchemy import text
from sqlalchemy.engine import make_url
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from database.orm_base import Base
from repositories.orm_completion_reward_repository import CompletionRewardRepository
from repositories.orm_course_repository import CourseRepository
from services.course_service import CourseService
from settings import settings


pytestmark = pytest.mark.asyncio

USER_ID = "h2_neon_user"
ROLLBACK_COURSE_ID = "h2_neon_rollback_course"
SUCCESS_COURSE_ID = "h2_neon_success_course"


def _test_database_url() -> tuple[str, dict]:
    raw = os.getenv("TEST_DATABASE_URL")
    if not raw:
        pytest.skip("TEST_DATABASE_URL is required for the disposable PostgreSQL proof")

    production = settings.DATABASE_URL.get_secret_value() if settings.DATABASE_URL else ""
    test_target, production_target = urlparse(raw), urlparse(production)
    if production and (
        test_target.hostname == production_target.hostname
        and test_target.path.rstrip("/") == production_target.path.rstrip("/")
    ):
        raise RuntimeError("TEST_DATABASE_URL resolves to the production host/database")

    url = make_url(raw)
    if url.drivername in {"postgres", "postgresql"}:
        url = url.set(drivername="postgresql+asyncpg")
    query = dict(url.query)
    ssl_required = query.pop("sslmode", "").lower() in {"require", "verify-ca", "verify-full"}
    query.pop("channel_binding", None)
    return url.set(query=query).render_as_string(hide_password=False), ({"ssl": True} if ssl_required else {})


async def _create_required_schema(engine) -> None:
    # These are the exact SQLAlchemy mappings touched by CourseService's real
    # CourseRepository path.  They intentionally exclude unrelated domains.
    table_names = {
        "users", "courses", "lessons", "lesson_sessions", "lesson_session_steps", "lesson_step_attempts",
        "user_course_progress", "user_course_lesson_progress",
    }
    async with engine.begin() as connection:
        await connection.run_sync(
            lambda sync_connection: Base.metadata.create_all(
                sync_connection,
                tables=[Base.metadata.tables[name] for name in table_names],
            )
        )
        # Exact required table definitions from 20260812_01_mobile_core.sql.
        await connection.execute(text("""
            CREATE TABLE IF NOT EXISTS user_gamification (
                user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE RESTRICT,
                total_points INTEGER NOT NULL DEFAULT 0 CHECK (total_points >= 0),
                level INTEGER NOT NULL DEFAULT 1 CHECK (level >= 1),
                xp_to_next_level INTEGER NOT NULL DEFAULT 100 CHECK (xp_to_next_level > 0),
                streak_days INTEGER NOT NULL DEFAULT 0 CHECK (streak_days >= 0),
                longest_streak INTEGER NOT NULL DEFAULT 0 CHECK (longest_streak >= 0),
                last_activity_date TIMESTAMPTZ,
                badges JSONB NOT NULL DEFAULT '[]'::jsonb,
                pet_state JSONB,
                updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
            )
        """))
        await connection.execute(text("""
            CREATE TABLE IF NOT EXISTS gamification_events (
                id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
                user_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
                event_id TEXT NOT NULL,
                action TEXT NOT NULL,
                source_type TEXT,
                source_id TEXT,
                attempt_id TEXT,
                session_id TEXT,
                learning_path_id TEXT,
                xp_awarded INTEGER NOT NULL DEFAULT 0 CHECK (xp_awarded >= 0),
                status TEXT NOT NULL DEFAULT 'processing',
                total_xp_after INTEGER,
                level_after INTEGER,
                xp_to_next_after INTEGER,
                metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
                created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
                applied_at TIMESTAMPTZ,
                CONSTRAINT uq_gamification_events_user_event UNIQUE (user_id, event_id),
                CONSTRAINT ck_gamification_events_status CHECK (status IN ('processing', 'applied', 'rejected'))
            )
        """))


async def _seed(session: AsyncSession, course_id: str) -> None:
    await session.execute(text("INSERT INTO users(id) VALUES (:id) ON CONFLICT DO NOTHING"), {"id": USER_ID})
    await session.execute(text("""
        INSERT INTO courses(course_id,title,title_vi,description_vi,subtitle_vi,theme,category_key,
                            category_label,category_icon,age_range,level,catalog_preview,
                            student_testimonials,is_published)
        VALUES (:course_id,'H2 Neon Course','','','','','','','','5-8','beginner','[]'::jsonb,
                '[]'::jsonb,true)
    """), {"course_id": course_id})
    lesson_id = f"{course_id}_lesson"
    await session.execute(text("""
        INSERT INTO lessons(lesson_id,course_id,title,title_vi,lesson_order,duration_minutes,
                            learning_blocks,reward,generated_media,is_completed)
        VALUES (:lesson_id,:course_id,'H2 Neon Lesson','',1,3,
                CAST(:blocks AS jsonb),CAST(:reward AS jsonb),'[]'::jsonb,false)
    """), {
        "course_id": course_id,
        "lesson_id": lesson_id,
        "blocks": json.dumps({"schema_version": 1, "content_version": 1, "activities": []}),
        "reward": json.dumps({"xp": 60}),
    })
    await session.execute(text("""
        INSERT INTO lesson_sessions(session_id,user_id,course_id,lesson_id,content_version,status,
                                    current_step_id,current_step_index,progress_percent)
        VALUES (:session_id,:user_id,:course_id,:lesson_id,1,'started','finish',0,0)
    """), {"session_id": f"{course_id}_session", "user_id": USER_ID, "course_id": course_id, "lesson_id": lesson_id})
    await session.execute(text("""
        INSERT INTO lesson_session_steps(session_id,step_id,title,activity_type,activity_order,required,
                                         status,attempts,best_score,passed,last_response)
        VALUES (:session_id,'finish','Finish',NULL,NULL,true,'started',0,0,false,'{}'::jsonb)
    """), {"session_id": f"{course_id}_session"})


async def _run_completion(factory, course_id: str) -> None:
    async with factory() as session:
        async with session.begin():
            service = CourseService(CourseRepository(session), CompletionRewardRepository(session))
            await service.complete_lesson(USER_ID, course_id, f"{course_id}_lesson")


async def _readback(factory, course_id: str) -> dict:
    async with factory() as session:
        rows = {}
        for key, sql in {
            "progress": "SELECT count(*) FROM user_course_progress WHERE user_id=:user_id AND course_id=:course_id",
            "lesson_progress": "SELECT count(*) FROM user_course_lesson_progress WHERE user_id=:user_id AND course_id=:course_id AND status='completed'",
            "session_completed": "SELECT count(*) FROM lesson_sessions WHERE user_id=:user_id AND course_id=:course_id AND status='completed'",
            "events": "SELECT count(*) FROM gamification_events WHERE user_id=:user_id AND metadata->>'course_id'=:course_id",
            "aggregate": "SELECT count(*) FROM user_gamification WHERE user_id=:user_id",
        }.items():
            rows[key] = (await session.execute(text(sql), {"user_id": USER_ID, "course_id": course_id})).scalar_one()
        return rows


async def _cleanup(engine) -> None:
    async with engine.begin() as connection:
        await connection.execute(text("DROP TRIGGER IF EXISTS h2_force_reward_failure_trigger ON gamification_events"))
        await connection.execute(text("DROP FUNCTION IF EXISTS h2_force_reward_failure"))
        await connection.execute(text("DELETE FROM gamification_events WHERE user_id=:id"), {"id": USER_ID})
        await connection.execute(text("DELETE FROM user_gamification WHERE user_id=:id"), {"id": USER_ID})
        await connection.execute(text("DELETE FROM lesson_session_steps WHERE session_id LIKE 'h2_neon_%'"))
        await connection.execute(text("DELETE FROM lesson_sessions WHERE user_id=:id"), {"id": USER_ID})
        await connection.execute(text("DELETE FROM user_course_lesson_progress WHERE user_id=:id"), {"id": USER_ID})
        await connection.execute(text("DELETE FROM user_course_progress WHERE user_id=:id"), {"id": USER_ID})
        await connection.execute(text("DELETE FROM lessons WHERE course_id LIKE 'h2_neon_%'"))
        await connection.execute(text("DELETE FROM courses WHERE course_id LIKE 'h2_neon_%'"))
        await connection.execute(text("DELETE FROM users WHERE id=:id"), {"id": USER_ID})


async def test_complete_lesson_is_atomic_on_real_postgresql() -> None:
    database_url, connect_args = _test_database_url()
    engine = create_async_engine(database_url, connect_args=connect_args, pool_pre_ping=True)
    factory = async_sessionmaker(engine, expire_on_commit=False)
    try:
        await _create_required_schema(engine)
        async with factory() as session:
            async with session.begin():
                await _seed(session, ROLLBACK_COURSE_ID)
                await _seed(session, SUCCESS_COURSE_ID)

        # This disposable-DB trigger fails the real reward INSERT after learner
        # progress was written in the same AsyncSession transaction.
        async with engine.begin() as connection:
            await connection.execute(text("DROP TRIGGER IF EXISTS h2_force_reward_failure_trigger ON gamification_events"))
            await connection.execute(text("""
                CREATE OR REPLACE FUNCTION h2_force_reward_failure() RETURNS trigger AS $$
                BEGIN
                    IF NEW.metadata->>'course_id' = 'h2_neon_rollback_course' THEN
                        RAISE EXCEPTION 'h2 forced reward persistence failure';
                    END IF;
                    RETURN NEW;
                END;
                $$ LANGUAGE plpgsql
            """))
            await connection.execute(text("""
                CREATE TRIGGER h2_force_reward_failure_trigger
                BEFORE INSERT ON gamification_events
                FOR EACH ROW EXECUTE FUNCTION h2_force_reward_failure()
            """))

        with pytest.raises(Exception, match="h2 forced reward persistence failure"):
            await _run_completion(factory, ROLLBACK_COURSE_ID)
        assert await _readback(factory, ROLLBACK_COURSE_ID) == {
            "progress": 0, "lesson_progress": 0, "session_completed": 0, "events": 0, "aggregate": 0,
        }

        async with engine.begin() as connection:
            await connection.execute(text("DROP TRIGGER h2_force_reward_failure_trigger ON gamification_events"))
            await connection.execute(text("DROP FUNCTION h2_force_reward_failure"))

        await _run_completion(factory, SUCCESS_COURSE_ID)
        assert await _readback(factory, SUCCESS_COURSE_ID) == {
            "progress": 1, "lesson_progress": 1, "session_completed": 1, "events": 1, "aggregate": 1,
        }
    finally:
        await _cleanup(engine)
        await engine.dispose()
