"""One-time, evidence-preserving MongoDB -> PostgreSQL importer.

The importer intentionally reads only from the canonical ``edu_platform``
database and writes only through ``DATABASE_URL``.  It does not touch Mongo,
Storage objects, Qdrant, or runtime Unity state.  Re-running is safe because
all target inserts use their stable business keys.
"""
from __future__ import annotations

import asyncio
import json
import os
from collections import Counter
from datetime import date, datetime
from typing import Any

import asyncpg
import certifi
from bson import ObjectId, json_util
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient


MIGRATION_NAME = "20260812_01_mobile_core"
SOURCE_DATABASE = "edu_platform"
SKIPPED_DUPLICATE = "tree_palm_02"
CANONICAL_DUPLICATE = "jungle01"
CATALOG_PROVENANCE = {
    "ele123": ("animals-v2", 0),
    "dog123": ("animals-v2", 1),
}


def jsonable(value: Any) -> Any:
    if isinstance(value, ObjectId):
        return str(value)
    if isinstance(value, (datetime, date)):
        return value.isoformat()
    if isinstance(value, dict):
        return {str(k): jsonable(v) for k, v in value.items()}
    if isinstance(value, (list, tuple)):
        return [jsonable(v) for v in value]
    return value


def js(value: Any) -> str:
    return json.dumps(jsonable(value if value is not None else {}), ensure_ascii=False)


def text(value: Any, default: str = "") -> str:
    if value is None:
        return default
    return str(value)


def ts(value: Any) -> datetime | None:
    """Accept BSON datetimes and legacy ISO timestamp strings without guessing."""
    if value is None or isinstance(value, datetime):
        return value
    if isinstance(value, str):
        try:
            return datetime.fromisoformat(value.replace("Z", "+00:00"))
        except ValueError as exc:
            raise ValueError(f"invalid source timestamp: {value!r}") from exc
    raise TypeError(f"unsupported source timestamp type: {type(value).__name__}")


class Importer:
    def __init__(self, source, target: asyncpg.Pool):
        self.source = source
        self.target = target
        self.counts: Counter[str] = Counter()
        self.skipped: list[dict[str, str]] = []
        self.user_ids: set[str] = set()
        self.course_ids: set[str] = set()
        self.lesson_ids: set[str] = set()
        self.flashcard_ids: set[str] = set()

    async def outcome(self, collection: str, key: str, outcome: str, reason: str, replacement: str | None = None) -> None:
        await self.target.execute(
            """INSERT INTO migration_record_outcomes
               (migration_name, source_collection, source_key, outcome, reason, replacement_key)
               VALUES ($1,$2,$3,$4,$5,$6)
               ON CONFLICT (migration_name, source_collection, source_key) DO UPDATE
               SET outcome=EXCLUDED.outcome, reason=EXCLUDED.reason, replacement_key=EXCLUDED.replacement_key""",
            MIGRATION_NAME, collection, key, outcome, reason, replacement,
        )
        self.skipped.append({"collection": collection, "key": key, "outcome": outcome, "reason": reason})

    async def users(self) -> None:
        async for raw in self.source.users.find({}):
            user_id = str(raw["_id"])
            await self.target.execute(
                """INSERT INTO users
                   (id,email,username,full_name,avatar_url,hashed_password,is_active,is_verified,is_superuser,
                    role,roles,active_pet_id,pet_preferences,legacy_mongo_id,created_at,updated_at,last_login)
                   VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::jsonb,NULL,$12::jsonb,$13,$14,$15,$16)
                   ON CONFLICT (id) DO UPDATE SET
                    email=EXCLUDED.email, username=EXCLUDED.username, full_name=EXCLUDED.full_name,
                    avatar_url=EXCLUDED.avatar_url, hashed_password=EXCLUDED.hashed_password,
                    is_active=EXCLUDED.is_active, is_verified=EXCLUDED.is_verified,
                    is_superuser=EXCLUDED.is_superuser, role=EXCLUDED.role, roles=EXCLUDED.roles,
                    pet_preferences=EXCLUDED.pet_preferences, updated_at=EXCLUDED.updated_at""",
                user_id, text(raw.get("email")), text(raw.get("username")), raw.get("full_name"), raw.get("avatar_url"),
                text(raw.get("hashed_password")), raw.get("is_active", True), raw.get("is_verified", False),
                raw.get("is_superuser", False), text(raw.get("role"), "learner"), js(raw.get("roles", [])),
                js(raw.get("pet_preferences")), user_id, ts(raw.get("created_at")), ts(raw.get("updated_at")), ts(raw.get("last_login")),
            )
            self.user_ids.add(user_id)
            self.counts["users"] += 1

    async def pets(self) -> None:
        async for raw in self.source.pets.find({}):
            pet_id = text(raw.get("pet_id"))
            if not pet_id:
                await self.outcome("pets", str(raw.get("_id")), "SKIPPED_WITH_REASON", "missing_pet_id")
                continue
            await self.target.execute(
                """INSERT INTO pets (pet_id,name,name_vi,model_url,texture_url,thumbnail_url,category,pack_source,rarity,color,
                    animations,unlock_condition,is_active,created_at,updated_at)
                   VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::jsonb,$12::jsonb,$13,$14,$15)
                   ON CONFLICT (pet_id) DO UPDATE SET name=EXCLUDED.name,name_vi=EXCLUDED.name_vi,
                    model_url=EXCLUDED.model_url,texture_url=EXCLUDED.texture_url,thumbnail_url=EXCLUDED.thumbnail_url,
                    category=EXCLUDED.category,pack_source=EXCLUDED.pack_source,rarity=EXCLUDED.rarity,color=EXCLUDED.color,
                    animations=EXCLUDED.animations,unlock_condition=EXCLUDED.unlock_condition,is_active=EXCLUDED.is_active,
                    updated_at=EXCLUDED.updated_at""",
                pet_id, text(raw.get("name")), raw.get("name_vi"), raw.get("model_url"), raw.get("texture_url"), raw.get("thumbnail_url"),
                raw.get("category"), raw.get("pack_source"), raw.get("rarity"), raw.get("color"), js(raw.get("animations", [])),
                js(raw.get("unlock_condition")), raw.get("is_active", True), ts(raw.get("created_at")), ts(raw.get("updated_at")),
            )
            self.counts["pets"] += 1

    async def courses_and_lessons(self) -> None:
        async for raw in self.source.courses.find({}):
            course_id = text(raw.get("course_id"))
            if not course_id:
                await self.outcome("courses", str(raw.get("_id")), "SKIPPED_WITH_REASON", "missing_course_id")
                continue
            level = text(raw.get("level"), "beginner")
            if level not in {"beginner", "intermediate", "advanced"}:
                level = "beginner"
            await self.target.execute(
                """INSERT INTO courses (course_id,title,title_vi,description,description_vi,thumbnail_url,subtitle_vi,theme,
                    category_key,category_label,category_icon,age_range,level,thumbnail,catalog_preview,student_testimonials,
                    enrollment_cta,is_published,created_at,updated_at)
                   VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14::jsonb,$15::jsonb,$16::jsonb,$17::jsonb,$18,$19,$20)
                   ON CONFLICT (course_id) DO UPDATE SET title=EXCLUDED.title,title_vi=EXCLUDED.title_vi,
                    description=EXCLUDED.description,description_vi=EXCLUDED.description_vi,thumbnail_url=EXCLUDED.thumbnail_url,
                    subtitle_vi=EXCLUDED.subtitle_vi,theme=EXCLUDED.theme,category_key=EXCLUDED.category_key,
                    category_label=EXCLUDED.category_label,category_icon=EXCLUDED.category_icon,age_range=EXCLUDED.age_range,
                    level=EXCLUDED.level,thumbnail=EXCLUDED.thumbnail,catalog_preview=EXCLUDED.catalog_preview,
                    student_testimonials=EXCLUDED.student_testimonials,enrollment_cta=EXCLUDED.enrollment_cta,
                    is_published=EXCLUDED.is_published,updated_at=EXCLUDED.updated_at""",
                course_id, text(raw.get("title")), text(raw.get("title_vi")), raw.get("description"), text(raw.get("description_vi")),
                raw.get("thumbnail_url"), text(raw.get("subtitle_vi")), text(raw.get("theme")), text(raw.get("category_key")),
                text(raw.get("category_label")), text(raw.get("category_icon")), text(raw.get("age_range"), "5-8"), level,
                js(raw.get("thumbnail")), js(raw.get("catalogPreview", [])), js(raw.get("studentTestimonials", [])),
                js(raw.get("enrollmentCta")), raw.get("is_published", False), ts(raw.get("created_at")), ts(raw.get("updated_at")),
            )
            self.course_ids.add(course_id)
            self.counts["courses"] += 1
            for order, lesson in enumerate(raw.get("lessons", []), start=1):
                lesson_id = text(lesson.get("lesson_id") or lesson.get("id"))
                if not lesson_id:
                    await self.outcome("courses.lessons", f"{course_id}:{order}", "SKIPPED_WITH_REASON", "missing_lesson_id")
                    continue
                blocks = {k: lesson.get(k) for k in ("vocabulary", "game", "activity", "readAloudStory", "pronunciation", "quiz") if k in lesson}
                duration = lesson.get("duration_minutes", lesson.get("video_duration", 3)) or 0
                await self.target.execute(
                    """INSERT INTO lessons (lesson_id,course_id,title,title_vi,description,lesson_order,duration_minutes,content,
                        video,media,learning_blocks,reward,ar_reference,generated_media,is_completed)
                       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,$10::jsonb,$11::jsonb,$12::jsonb,$13::jsonb,$14::jsonb,$15)
                       ON CONFLICT (lesson_id) DO UPDATE SET course_id=EXCLUDED.course_id,title=EXCLUDED.title,
                        title_vi=EXCLUDED.title_vi,description=EXCLUDED.description,lesson_order=EXCLUDED.lesson_order,
                        duration_minutes=EXCLUDED.duration_minutes,content=EXCLUDED.content,video=EXCLUDED.video,media=EXCLUDED.media,
                        learning_blocks=EXCLUDED.learning_blocks,reward=EXCLUDED.reward,ar_reference=EXCLUDED.ar_reference,
                        generated_media=EXCLUDED.generated_media,is_completed=EXCLUDED.is_completed""",
                    lesson_id, course_id, text(lesson.get("title")), text(lesson.get("title_vi")), lesson.get("description"),
                    int(lesson.get("order") or order), int(duration), lesson.get("content"), js(lesson.get("video")),
                    js({"images": lesson.get("images", []), "scene_images": lesson.get("scene_images", [])}), js(blocks),
                    js(lesson.get("reward")), js(lesson.get("arReference")), js(lesson.get("generatedMedia", [])), lesson.get("is_completed", False),
                )
                self.lesson_ids.add(lesson_id)
                self.counts["lessons"] += 1

    async def decks_and_flashcards(self) -> None:
        async for raw in self.source.flashcard_decks.find({}):
            deck_id = text(raw.get("deck_id"))
            if deck_id:
                await self.target.execute(
                    """INSERT INTO flashcard_decks (deck_id,name,description,cover_image_url,category,tags,teacher_id,is_active,card_count,created_at,updated_at)
                       VALUES ($1,$2::jsonb,$3::jsonb,$4,$5,$6::jsonb,$7,$8,$9,$10,$11)
                       ON CONFLICT (deck_id) DO UPDATE SET name=EXCLUDED.name,description=EXCLUDED.description,
                        cover_image_url=EXCLUDED.cover_image_url,category=EXCLUDED.category,tags=EXCLUDED.tags,
                        teacher_id=EXCLUDED.teacher_id,is_active=EXCLUDED.is_active,card_count=EXCLUDED.card_count,updated_at=EXCLUDED.updated_at""",
                    deck_id, js(raw.get("name", {})), js(raw.get("description")), raw.get("cover_image_url"), raw.get("category"),
                    js(raw.get("tags", [])), raw.get("teacher_id"), raw.get("is_active", True), int(raw.get("card_count") or 0), ts(raw.get("created_at")), ts(raw.get("updated_at")),
                )
                self.counts["flashcard_decks"] += 1
        async for raw in self.source.flashcards.find({}):
            qr_id = text(raw.get("qr_id"))
            if qr_id == SKIPPED_DUPLICATE:
                await self.outcome("flashcards", qr_id, "SKIPPED_DUPLICATE", "approved_redundant_duplicate", CANONICAL_DUPLICATE)
                continue
            if not qr_id:
                await self.outcome("flashcards", str(raw.get("_id")), "SKIPPED_WITH_REASON", "missing_qr_id")
                continue
            await self.target.execute(
                """INSERT INTO flashcards (qr_id,deck_id,teacher_id,ar_tag,word,translation,definition,category,image_url,audio_url,
                    difficulty,image_animation_type,is_active,created_at,updated_at)
                   VALUES ($1,$2,$3,$4,$5,$6::jsonb,$7,$8,$9,$10,$11,$12,$13,$14,$15)
                   ON CONFLICT (qr_id) DO UPDATE SET deck_id=EXCLUDED.deck_id,teacher_id=EXCLUDED.teacher_id,ar_tag=EXCLUDED.ar_tag,
                    word=EXCLUDED.word,translation=EXCLUDED.translation,definition=EXCLUDED.definition,category=EXCLUDED.category,
                    image_url=EXCLUDED.image_url,audio_url=EXCLUDED.audio_url,difficulty=EXCLUDED.difficulty,
                    image_animation_type=EXCLUDED.image_animation_type,is_active=EXCLUDED.is_active,updated_at=EXCLUDED.updated_at""",
                qr_id, raw.get("deck_id"), raw.get("teacher_id"), raw.get("ar_tag"), text(raw.get("word")), js(raw.get("translation", {})),
                raw.get("definition"), text(raw.get("category")), text(raw.get("image_url")), raw.get("audio_url"),
                text(raw.get("difficulty"), "easy"), raw.get("image_animation_type"), raw.get("is_active", True), ts(raw.get("created_at")), ts(raw.get("updated_at")),
            )
            self.flashcard_ids.add(qr_id)
            self.counts["flashcards"] += 1

    async def progress_and_sessions(self) -> None:
        async for raw in self.source.user_course_progress.find({}):
            key = f"{raw.get('user_id')}:{raw.get('course_id')}"
            if raw.get("user_id") not in self.user_ids:
                await self.outcome("user_course_progress", key, "SKIPPED_WITH_REASON", "missing_parent_user")
                continue
            if raw.get("course_id") not in self.course_ids:
                await self.outcome("user_course_progress", key, "SKIPPED_WITH_REASON", "missing_parent_course")
                continue
            await self.target.execute(
                """INSERT INTO user_course_progress (user_id,course_id,current_lesson_id,status,total_xp,rewards,started_at,updated_at)
                   VALUES ($1,$2,$3,$4,$5,$6::jsonb,$7,$8)
                   ON CONFLICT (user_id,course_id) DO UPDATE SET current_lesson_id=EXCLUDED.current_lesson_id,status=EXCLUDED.status,
                    total_xp=EXCLUDED.total_xp,rewards=EXCLUDED.rewards,updated_at=EXCLUDED.updated_at""",
                raw["user_id"], raw["course_id"], raw.get("current_lesson_id") if raw.get("current_lesson_id") in self.lesson_ids else None,
                text(raw.get("status"), "started"), int(raw.get("total_xp") or 0), js(raw.get("rewards", [])), ts(raw.get("started_at")), ts(raw.get("updated_at")),
            )
            for row in raw.get("lesson_progress", []):
                lesson_id = row.get("lesson_id")
                if lesson_id not in self.lesson_ids:
                    await self.outcome("user_course_progress.lesson_progress", f"{key}:{lesson_id}", "SKIPPED_WITH_REASON", "missing_parent_lesson")
                    continue
                await self.target.execute(
                    """INSERT INTO user_course_lesson_progress (user_id,course_id,lesson_id,status,best_score,attempts,completed_at)
                       VALUES ($1,$2,$3,$4,$5,$6,$7)
                       ON CONFLICT (user_id,course_id,lesson_id) DO UPDATE SET status=EXCLUDED.status,best_score=EXCLUDED.best_score,
                        attempts=EXCLUDED.attempts,completed_at=EXCLUDED.completed_at""",
                    raw["user_id"], raw["course_id"], lesson_id, text(row.get("status"), "not_started"), int(row.get("best_score") or 0), int(row.get("attempts") or 0), ts(row.get("completed_at")),
                )
            self.counts["user_course_progress"] += 1
        async for raw in self.source.lesson_sessions.find({}):
            session_id = text(raw.get("session_id"))
            if raw.get("user_id") not in self.user_ids or raw.get("course_id") not in self.course_ids or raw.get("lesson_id") not in self.lesson_ids:
                await self.outcome("lesson_sessions", session_id or str(raw.get("_id")), "SKIPPED_WITH_REASON", "missing_parent_reference")
                continue
            await self.target.execute(
                """INSERT INTO lesson_sessions (session_id,user_id,course_id,lesson_id,status,current_step_id,current_step_index,progress_percent,started_at,updated_at,completed_at)
                   VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
                   ON CONFLICT (session_id) DO UPDATE SET status=EXCLUDED.status,current_step_id=EXCLUDED.current_step_id,
                    current_step_index=EXCLUDED.current_step_index,progress_percent=EXCLUDED.progress_percent,updated_at=EXCLUDED.updated_at,completed_at=EXCLUDED.completed_at""",
                session_id, raw["user_id"], raw["course_id"], raw["lesson_id"], text(raw.get("status"), "started"),
                text(raw.get("current_step_id")), int(raw.get("current_step_index") or 0), int(raw.get("progress_percent") or 0),
                ts(raw.get("started_at")), ts(raw.get("updated_at")), ts(raw.get("completed_at")),
            )
            for step in raw.get("steps", []):
                await self.target.execute(
                    """INSERT INTO lesson_session_steps (session_id,step_id,title,status,attempts,best_score,passed,last_response,updated_at,completed_at)
                       VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9,$10)
                       ON CONFLICT (session_id,step_id) DO UPDATE SET title=EXCLUDED.title,status=EXCLUDED.status,attempts=EXCLUDED.attempts,
                        best_score=EXCLUDED.best_score,passed=EXCLUDED.passed,last_response=EXCLUDED.last_response,updated_at=EXCLUDED.updated_at,completed_at=EXCLUDED.completed_at""",
                    session_id, text(step.get("step_id")), text(step.get("title")), text(step.get("status"), "locked"),
                    int(step.get("attempts") or 0), int(step.get("best_score") or 0), bool(step.get("passed", False)), js(step.get("last_response", {})), ts(step.get("updated_at")), ts(step.get("completed_at")),
                )
            self.counts["lesson_sessions"] += 1

    async def gamification(self) -> None:
        async for raw in self.source.user_points.find({}):
            user_id = text(raw.get("user_id"))
            if user_id not in self.user_ids:
                await self.outcome("user_points", user_id, "SKIPPED_WITH_REASON", "missing_parent_user")
                continue
            await self.target.execute(
                """INSERT INTO user_gamification (user_id,total_points,level,xp_to_next_level,streak_days,longest_streak,last_activity_date,badges,pet_state,updated_at)
                   VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9::jsonb,now())
                   ON CONFLICT (user_id) DO UPDATE SET total_points=EXCLUDED.total_points,level=EXCLUDED.level,
                    xp_to_next_level=EXCLUDED.xp_to_next_level,streak_days=EXCLUDED.streak_days,longest_streak=EXCLUDED.longest_streak,
                    last_activity_date=EXCLUDED.last_activity_date,badges=EXCLUDED.badges,pet_state=EXCLUDED.pet_state,updated_at=now()""",
                user_id, int(raw.get("total_points") or 0), int(raw.get("level") or 1), int(raw.get("xp_to_next_level") or 100),
                int(raw.get("streak_days") or 0), int(raw.get("longest_streak") or 0), ts(raw.get("last_activity_date")), js(raw.get("badges", [])), js(raw.get("pet")),
            )
            for sticker in raw.get("stickers", []):
                if sticker.get("id"):
                    await self.target.execute(
                        """INSERT INTO user_gamification_stickers (user_id,sticker_id,name,rarity,image_url,earned_at)
                           VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (user_id,sticker_id) DO UPDATE SET name=EXCLUDED.name,
                            rarity=EXCLUDED.rarity,image_url=EXCLUDED.image_url,earned_at=EXCLUDED.earned_at""",
                        user_id, text(sticker.get("id")), sticker.get("name"), sticker.get("rarity"), sticker.get("imageUrl") or sticker.get("image_url"), ts(sticker.get("earned_at")),
                    )
            self.counts["user_gamification"] += 1
        async for raw in self.source.gamification_events.find({}):
            key = text(raw.get("event_id")) or str(raw.get("_id"))
            if raw.get("status") == "processing" and int(raw.get("xp_awarded") or 0) == 0:
                await self.outcome("gamification_events", key, "SKIPPED_WITH_REASON", "stale_processing_zero_xp_event")
            elif raw.get("user_id") not in self.user_ids:
                await self.outcome("gamification_events", key, "SKIPPED_WITH_REASON", "missing_parent_user")
            else:
                await self.target.execute(
                    """INSERT INTO gamification_events (user_id,event_id,action,source_type,source_id,attempt_id,session_id,learning_path_id,
                        xp_awarded,status,total_xp_after,level_after,xp_to_next_after,metadata,created_at,applied_at)
                       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14::jsonb,$15,$16)
                       ON CONFLICT (user_id,event_id) DO NOTHING""",
                    raw["user_id"], key, text(raw.get("action")), raw.get("source_type"), raw.get("source_id"), raw.get("attempt_id"), raw.get("session_id"),
                    raw.get("learning_path_id"), int(raw.get("xp_awarded") or 0), text(raw.get("status"), "rejected"), raw.get("total_xp_after"),
                    raw.get("level_after"), raw.get("xp_to_next_after"), js(raw.get("metadata", {})), ts(raw.get("created_at")), ts(raw.get("applied_at")),
                )
                self.counts["gamification_events"] += 1

    async def ar_and_games(self) -> None:
        ar_objects: dict[str, dict[str, Any]] = {}
        async for raw in self.source.ar_objects.find({}):
            ar_tag = text(raw.get("ar_tag"))
            if not ar_tag:
                await self.outcome("ar_objects", str(raw.get("_id")), "SKIPPED_WITH_REASON", "missing_ar_tag")
                continue
            ar_objects[ar_tag] = raw
            await self.target.execute(
                """INSERT INTO ar_objects (ar_tag,description,animation_type,glb_size,nft_base_url,model_3d_url,texture_url,image_2d_url,
                    position,rotation,scale,mind_catalog_id,mind_target_index,created_at,updated_at)
                   VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,NULL,NULL,$12,$13)
                   ON CONFLICT (ar_tag) DO UPDATE SET description=EXCLUDED.description,animation_type=EXCLUDED.animation_type,
                    glb_size=EXCLUDED.glb_size,nft_base_url=EXCLUDED.nft_base_url,model_3d_url=EXCLUDED.model_3d_url,
                    texture_url=EXCLUDED.texture_url,image_2d_url=EXCLUDED.image_2d_url,position=EXCLUDED.position,
                    rotation=EXCLUDED.rotation,scale=EXCLUDED.scale,updated_at=EXCLUDED.updated_at""",
                ar_tag, text(raw.get("description")), text(raw.get("animation_type"), "none"), float(raw.get("glb_size") or 1),
                raw.get("nft_base_url"), text(raw.get("model_3d_url")), raw.get("texture_url"), text(raw.get("image_2d_url")),
                text(raw.get("position"), "0 0 0"), text(raw.get("rotation"), "0 0 0"), text(raw.get("scale"), "1 1 1"), ts(raw.get("created_at")), ts(raw.get("updated_at")),
            )
            self.counts["ar_objects"] += 1
        async for raw in self.source.flashcards.find({}):
            qr_id = text(raw.get("qr_id"))
            if qr_id not in self.flashcard_ids:
                continue
            ar = ar_objects.get(text(raw.get("ar_tag")), {})
            catalog = CATALOG_PROVENANCE.get(qr_id)
            await self.target.execute(
                """INSERT INTO ar_tracking_targets (target_id,qr_id,reference_image_url,physical_width_m,mind_catalog_id,mind_file_url,mind_target_index,metadata,created_at,updated_at)
                   VALUES ($1,$2,NULL,NULL,$3,$4,$5,$6::jsonb,$7,$8)
                   ON CONFLICT (qr_id) DO UPDATE SET mind_catalog_id=EXCLUDED.mind_catalog_id,mind_file_url=EXCLUDED.mind_file_url,
                    mind_target_index=EXCLUDED.mind_target_index,metadata=EXCLUDED.metadata,updated_at=EXCLUDED.updated_at""",
                f"tracking:{qr_id}", qr_id, catalog[0] if catalog else None, ar.get("nft_base_url"), catalog[1] if catalog else None,
                js({"legacy_ar_tag": raw.get("ar_tag"), "provenance": "compiled_catalog" if catalog else "legacy_mind_file_only"}), ts(raw.get("created_at")), ts(raw.get("updated_at")),
            )
            self.counts["ar_tracking_targets"] += 1
        async for raw in self.source.ar_combinations.find({}):
            combo_id = text(raw.get("combo_id"))
            await self.target.execute(
                """INSERT INTO ar_combinations (combo_id,combo_name,description,combo_mind_url,image_2d_url,model_3d_url,texture_url,
                    center_transform,active,priority,reward_points,bonus_xp,semantic_result,phrase,sound,animation,flashcard_set,target_order,created_at,updated_at)
                   VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9,$10,$11,$12,$13,$14,$15,$16::jsonb,$17::jsonb,$18::jsonb,$19,$20)
                   ON CONFLICT (combo_id) DO UPDATE SET combo_name=EXCLUDED.combo_name,description=EXCLUDED.description,
                    combo_mind_url=EXCLUDED.combo_mind_url,image_2d_url=EXCLUDED.image_2d_url,model_3d_url=EXCLUDED.model_3d_url,
                    texture_url=EXCLUDED.texture_url,center_transform=EXCLUDED.center_transform,active=EXCLUDED.active,priority=EXCLUDED.priority,
                    reward_points=EXCLUDED.reward_points,bonus_xp=EXCLUDED.bonus_xp,semantic_result=EXCLUDED.semantic_result,
                    phrase=EXCLUDED.phrase,sound=EXCLUDED.sound,animation=EXCLUDED.animation,flashcard_set=EXCLUDED.flashcard_set,
                    target_order=EXCLUDED.target_order,updated_at=EXCLUDED.updated_at""",
                combo_id, raw.get("combo_name"), raw.get("description"), raw.get("combo_mind_url"), raw.get("image_2d_url"), raw.get("model_3d_url"), raw.get("texture_url"),
                js(raw.get("center_transform")), raw.get("active", True), int(raw.get("priority") or 0), int(raw.get("reward_points") or 0),
                int(raw.get("bonus_xp") or 0), raw.get("semantic_result"), raw.get("phrase"), raw.get("sound"), js(raw.get("animation")),
                js(raw.get("flashcard_set")), js(raw.get("target_order", [])), ts(raw.get("created_at")), ts(raw.get("updated_at")),
            )
            for position, tag in enumerate(raw.get("required_tags", [])):
                await self.target.execute(
                    """INSERT INTO ar_combination_required_tags (combo_id,ar_tag,tag_order) VALUES ($1,$2,$3)
                       ON CONFLICT (combo_id,ar_tag) DO UPDATE SET tag_order=EXCLUDED.tag_order""", combo_id, tag, position)
            self.counts["ar_combinations"] += 1
        async for raw in self.source.quiz_questions.find({}):
            qr_id = text(raw.get("flashcard_qr_id"))
            if qr_id not in self.flashcard_ids:
                await self.outcome("quiz_questions", str(raw.get("_id")), "SKIPPED_WITH_REASON", "missing_parent_flashcard")
                continue
            for question in raw.get("questions", []):
                row = await self.target.fetchrow(
                    """INSERT INTO quiz_questions (flashcard_qr_id,question_id,question_text,question_type,correct_answer,explanation,time_limit,passing_score)
                       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
                       ON CONFLICT (flashcard_qr_id,question_id) DO UPDATE SET question_text=EXCLUDED.question_text,
                        question_type=EXCLUDED.question_type,correct_answer=EXCLUDED.correct_answer,explanation=EXCLUDED.explanation,
                        time_limit=EXCLUDED.time_limit,passing_score=EXCLUDED.passing_score RETURNING id""",
                    qr_id, text(question.get("id")), text(question.get("question_text")), text(question.get("type")), question.get("correct_answer"),
                    question.get("explanation"), raw.get("time_limit"), raw.get("passing_score"),
                )
                for position, value in enumerate(question.get("options", [])):
                    await self.target.execute("""INSERT INTO quiz_question_options (question_id,option_order,value) VALUES ($1,$2,$3)
                        ON CONFLICT (question_id,option_order) DO UPDATE SET value=EXCLUDED.value""", row["id"], position, text(value))
                self.counts["quiz_questions"] += 1
        async for raw in self.source.mini_game_bank.find({}):
            qr_id = raw.get("flashcard_qr_id") if raw.get("flashcard_qr_id") in self.flashcard_ids else None
            payload = {k: v for k, v in raw.items() if k not in {"_id", "game_type", "flashcard_qr_id", "difficulty", "question", "image_url", "correct_answer", "stars_reward", "time_limit"}}
            await self.target.execute("""INSERT INTO mini_game_items (game_type,flashcard_qr_id,difficulty,question,image_url,correct_answer,stars_reward,time_limit,payload)
                VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb)""", text(raw.get("game_type")), qr_id, raw.get("difficulty"), raw.get("question"), raw.get("image_url"), raw.get("correct_answer"), raw.get("stars_reward"), raw.get("time_limit"), js(payload))
            self.counts["mini_game_items"] += 1

    async def media_and_legacy(self) -> None:
        async for raw in self.source.media_assets.find({}):
            if raw.get("course_id") not in self.course_ids or raw.get("lesson_id") not in self.lesson_ids:
                await self.outcome("media_assets", str(raw.get("_id")), "SKIPPED_WITH_REASON", "missing_parent_course_or_lesson")
                continue
            await self.target.execute(
                """INSERT INTO media_assets (course_id,lesson_id,section_id,asset_key,bucket,path,type,status,public_url,provider,metadata,created_at,updated_at)
                   VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::jsonb,$12,$13)
                   ON CONFLICT (course_id,lesson_id,section_id,asset_key,path) DO UPDATE SET type=EXCLUDED.type,status=EXCLUDED.status,
                    public_url=EXCLUDED.public_url,provider=EXCLUDED.provider,metadata=EXCLUDED.metadata,updated_at=EXCLUDED.updated_at""",
                raw["course_id"], raw["lesson_id"], text(raw.get("section_id")), text(raw.get("asset_key")), text(raw.get("bucket")),
                text(raw.get("path")), text(raw.get("type")), text(raw.get("status"), "pending"), raw.get("public_url"), text(raw.get("provider"), "supabase"),
                js(raw.get("metadata", {})), ts(raw.get("created_at")), ts(raw.get("updated_at")),
            )
            self.counts["media_assets"] += 1
        for collection in ("combos", "session_logs", "ai_feedback", "feedback_templates", "profile_content"):
            async for raw in self.source[collection].find({}):
                legacy_id = str(raw.get("_id"))
                payload = dict(raw)
                payload.pop("_id", None)
                await self.target.execute(
                    """INSERT INTO legacy_collection_documents (source_collection,legacy_mongo_id,payload,created_at)
                       VALUES ($1,$2,$3::jsonb,$4)
                       ON CONFLICT (source_collection,legacy_mongo_id) DO UPDATE SET payload=EXCLUDED.payload,created_at=EXCLUDED.created_at""",
                    collection, legacy_id, js(payload), ts(raw.get("created_at")),
                )
                self.counts[f"legacy:{collection}"] += 1
        # The historical record lacks public attempt_id.  It is deliberately not
        # coerced from Mongo _id, preserving the new retry/idempotency contract.
        async for raw in self.source.pronunciation_attempts.find({}):
            key = text(raw.get("attempt_id")) or str(raw.get("_id"))
            if not raw.get("attempt_id"):
                await self.outcome("pronunciation_attempts", key, "SKIPPED_WITH_REASON", "missing_public_attempt_id")
            elif raw.get("user_id") not in self.user_ids or raw.get("flashcard_qr_id") not in self.flashcard_ids:
                await self.outcome("pronunciation_attempts", key, "SKIPPED_WITH_REASON", "missing_parent_reference")

    async def run(self) -> dict[str, Any]:
        await self.users()
        await self.pets()
        await self.courses_and_lessons()
        await self.decks_and_flashcards()
        await self.progress_and_sessions()
        await self.gamification()
        await self.ar_and_games()
        await self.media_and_legacy()
        return {"migrated": dict(self.counts), "skipped": self.skipped}


class ExportCursor:
    """Minimal read-only Motor cursor adapter for an MCP-created EJSON export."""
    def __init__(self, rows: list[dict[str, Any]]):
        self.rows = rows

    def __aiter__(self):
        self._iterator = iter(self.rows)
        return self

    async def __anext__(self):
        try:
            return next(self._iterator)
        except StopIteration as exc:
            raise StopAsyncIteration from exc


class ExportCollection:
    def __init__(self, rows: list[dict[str, Any]]):
        self.rows = rows

    def find(self, _filter: dict[str, Any]) -> ExportCursor:
        # The importer only performs full, source-export controlled scans.
        return ExportCursor(self.rows)


class ExportDatabase:
    """Collection adapter retaining Mongo MCP as the sole source read path."""
    def __init__(self, path: str):
        payload = json_util.loads(open(path, encoding="utf-8").read())
        self.rows: dict[str, list[dict[str, Any]]] = {}
        for item in payload:
            self.rows.setdefault(item["source"], []).append(item["document"])

    def __getattr__(self, name: str) -> ExportCollection:
        return ExportCollection(self.rows.get(name, []))

    def __getitem__(self, name: str) -> ExportCollection:
        return ExportCollection(self.rows.get(name, []))


async def main() -> None:
    load_dotenv(os.path.join(os.path.dirname(__file__), "..", "..", ".env"))
    mongo_url, database_url = os.getenv("MONGO_URL"), os.getenv("DATABASE_URL")
    export_path = os.getenv("MONGO_EXPORT_PATH")
    if not database_url:
        raise RuntimeError("DATABASE_URL is required; its value is never printed")
    client = None
    try:
        if export_path:
            source = ExportDatabase(export_path)
        else:
            if not mongo_url:
                raise RuntimeError("MONGO_URL is required when MONGO_EXPORT_PATH is not provided")
            client = AsyncIOMotorClient(mongo_url, tls=True, tlsCAFile=certifi.where(), serverSelectionTimeoutMS=10_000)
            names = await client.list_database_names()
            if SOURCE_DATABASE not in names:
                raise RuntimeError(f"canonical source database {SOURCE_DATABASE!r} is unavailable")
            source = client[SOURCE_DATABASE]
        # Supabase's pooled DATABASE_URL may use transaction-mode PgBouncer.
        # Disable asyncpg's prepared-statement cache so the import remains
        # compatible without changing database pooling configuration.
        pool = await asyncpg.create_pool(
            database_url, min_size=1, max_size=4, statement_cache_size=0
        )
        try:
            async with pool.acquire() as connection:
                async with connection.transaction():
                    report = await Importer(source, connection).run()
            print(json.dumps(report, ensure_ascii=False, default=str))
        finally:
            await pool.close()
    finally:
        if client is not None:
            client.close()


if __name__ == "__main__":
    asyncio.run(main())
