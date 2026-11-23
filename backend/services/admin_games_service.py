"""
Admin games management service — CRUD for games, topics, vocab.

Research basis: docs/research/20260909_admin_course_game_creation_research.md
("create game does not exist on either side"). Approved design:
docs/superpowers/specs/2026-09-09-admin-course-game-design.md §3.

Contract (spec §3.2):
- Games reference a topic; config JSONB validated per game_type by pydantic
  models in models/admin_models.py (discriminated by game_type).
- List endpoints are NOT scoped by teacher (teacher_id is informational) so
  admin-created content is never invisible (research MEDIUM-8 lesson).
- Learner XP flow untouched — backend authoritative, idempotent.
"""
from __future__ import annotations

import json
import logging
import re
import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional

from repositories.admin_repository import postgres_pool, _parse_jsonb

logger = logging.getLogger(__name__)

GAME_TYPES = ("drag_match", "catch_word", "word_scramble", "memory_match")

_SLUG_RE = re.compile(r"[^a-z0-9]+")
# JSONB columns that must be serialized before handing to asyncpg
_JSONB_COLUMNS = ("config",)


def slugify(value: str) -> str:
    """Vietnamese-friendly-enough slug: lowercase, strip accents crudely via
    unicodedata-free approach — keep [a-z0-9] runs joined by '-'."""
    s = (value or "").strip().lower()
    s = s.replace("đ", "d")
    s = _SLUG_RE.sub("-", s).strip("-")
    return s or "game"


def _now() -> datetime:
    return datetime.utcnow()


def _serialize_jsonb(data: Dict[str, Any]) -> Dict[str, Any]:
    for col in _JSONB_COLUMNS:
        if col in data and not isinstance(data[col], str):
            data[col] = json.dumps(data[col], ensure_ascii=False)
    return data


# ---------------------------------------------------------------------------
# Games
# ---------------------------------------------------------------------------

class AdminGamesService:
    """PostgreSQL-backed admin games CRUD (teacher-gated at the API layer)."""

    # -- Games ------------------------------------------------------------

    async def list_games(self, skip: int = 0, limit: int = 100,
                         topic_id: Optional[str] = None) -> List[Dict[str, Any]]:
        clauses = ["1=1"]
        params: List[Any] = []
        if topic_id:
            params.append(topic_id)
            clauses.append(f"topic_id=${len(params)}")
        params.append(skip)
        params.append(limit)
        rows = await postgres_pool().fetch(
            f"""SELECT * FROM public.games
                WHERE {' AND '.join(clauses)}
                ORDER BY created_at DESC NULLS LAST
                OFFSET ${len(params) - 1} LIMIT ${len(params)}""",
            *params,
        )
        return [self._row_game(r) for r in rows]

    async def get_game(self, game_id: str) -> Optional[Dict[str, Any]]:
        row = await postgres_pool().fetchrow(
            "SELECT * FROM public.games WHERE id=$1", game_id)
        return self._row_game(row) if row else None

    async def create_game(self, data: Dict[str, Any],
                          teacher_id: str) -> Dict[str, Any]:
        game_id = str(uuid.uuid4())
        slug = data.get("slug") or slugify(data.get("title", "game"))
        # Slug conflict → caller maps to 409
        existing = await postgres_pool().fetchrow(
            "SELECT id FROM public.games WHERE slug=$1", slug)
        if existing:
            raise ValueError("SLUG_CONFLICT")

        row = await postgres_pool().fetchrow(
            """INSERT INTO public.games
                   (id, slug, title, title_vi, game_type, topic_id, config,
                    is_published, teacher_id)
               VALUES ($1,$2,$3,$4,$5,$6,CAST($7 AS jsonb),$8,$9)
               RETURNING *""",
            game_id, slug, data["title"], data.get("title_vi", ""),
            data["game_type"], data["topic_id"],
            json.dumps(data.get("config") or {}, ensure_ascii=False),
            bool(data.get("is_published", False)), teacher_id,
        )
        return self._row_game(row)

    async def update_game(self, game_id: str,
                          data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        set_parts, values = [], []

        def add(col: str, val: Any) -> None:
            values.append(val)
            set_parts.append(f"{col}=${len(values)}")

        if "title" in data:
            add("title", data["title"])
        if "title_vi" in data:
            add("title_vi", data["title_vi"])
        if data.get("slug"):
            slug = data["slug"]
            existing = await postgres_pool().fetchrow(
                "SELECT id FROM public.games WHERE slug=$1 AND id<>$2", slug, game_id)
            if existing:
                raise ValueError("SLUG_CONFLICT")
            add("slug", slug)
        if "game_type" in data and data["game_type"]:
            add("game_type", data["game_type"])
        if "topic_id" in data and data["topic_id"]:
            add("topic_id", data["topic_id"])
        if "config" in data and data["config"] is not None:
            values.append(json.dumps(data["config"], ensure_ascii=False))
            set_parts.append(f"config=${len(values)}")
        if "is_published" in data and data["is_published"] is not None:
            add("is_published", bool(data["is_published"]))

        add("updated_at", _now())
        row = await postgres_pool().fetchrow(
            f"""UPDATE public.games SET {', '.join(set_parts)}
                WHERE id=$1 RETURNING *""",
            game_id, *values,
        )
        return self._row_game(row) if row else None

    async def delete_game(self, game_id: str) -> bool:
        row = await postgres_pool().fetchrow(
            "DELETE FROM public.games WHERE id=$1 RETURNING id", game_id)
        return row is not None

    # -- Topics -----------------------------------------------------------

    async def list_topics(self, include_unpublished: bool = True
                          ) -> List[Dict[str, Any]]:
        clause = "" if include_unpublished else "WHERE is_published=TRUE"
        rows = await postgres_pool().fetch(
            f"""SELECT * FROM public.game_topics {clause}
                ORDER BY sort_order ASC, created_at ASC""")
        return [self._row_topic(r) for r in rows]

    async def get_topic(self, topic_id: str) -> Optional[Dict[str, Any]]:
        row = await postgres_pool().fetchrow(
            "SELECT * FROM public.game_topics WHERE id=$1", topic_id)
        return self._row_topic(row) if row else None

    async def get_topic_by_slug(self, slug: str) -> Optional[Dict[str, Any]]:
        row = await postgres_pool().fetchrow(
            "SELECT * FROM public.game_topics WHERE slug=$1", slug)
        return self._row_topic(row) if row else None

    async def create_topic(self, data: Dict[str, Any]) -> Dict[str, Any]:
        slug = data.get("slug") or slugify(data.get("name", "topic"))
        existing = await postgres_pool().fetchrow(
            "SELECT id FROM public.game_topics WHERE slug=$1", slug)
        if existing:
            raise ValueError("SLUG_CONFLICT")
        row = await postgres_pool().fetchrow(
            """INSERT INTO public.game_topics
                   (id, slug, name, name_vi, description, cover_image_url,
                    is_published, sort_order)
               VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *""",
            str(uuid.uuid4()), slug, data["name"],
            data.get("name_vi", data["name"]),
            data.get("description"), data.get("cover_image_url"),
            bool(data.get("is_published", False)),
            int(data.get("sort_order", 0)),
        )
        return self._row_topic(row)

    async def update_topic(self, topic_id: str,
                           data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        set_parts, values = [], []

        def add(col: str, val: Any) -> None:
            values.append(val)
            set_parts.append(f"{col}=${len(values)}")

        if "name" in data and data["name"]:
            add("name", data["name"])
        if "name_vi" in data and data["name_vi"]:
            add("name_vi", data["name_vi"])
        if "description" in data:
            add("description", data["description"])
        if "cover_image_url" in data:
            add("cover_image_url", data["cover_image_url"])
        if "is_published" in data and data["is_published"] is not None:
            add("is_published", bool(data["is_published"]))
        if "sort_order" in data and data["sort_order"] is not None:
            add("sort_order", int(data["sort_order"]))

        add("updated_at", _now())
        row = await postgres_pool().fetchrow(
            f"""UPDATE public.game_topics SET {', '.join(set_parts)}
                WHERE id=$1 RETURNING *""",
            topic_id, *values,
        )
        return self._row_topic(row) if row else None

    # -- Vocab ------------------------------------------------------------

    async def list_vocab(self, topic_id: str) -> List[Dict[str, Any]]:
        rows = await postgres_pool().fetch(
            """SELECT * FROM public.game_vocab_items
               WHERE topic_id=$1 ORDER BY sort_order ASC, created_at ASC""",
            topic_id,
        )
        return [self._row_vocab(r) for r in rows]

    async def add_vocab(self, topic_id: str,
                        data: Dict[str, Any]) -> Dict[str, Any]:
        # duplicate word in same topic → caller maps to 409
        existing = await postgres_pool().fetchrow(
            "SELECT id FROM public.game_vocab_items WHERE topic_id=$1 AND word=$2",
            topic_id, data["word"],
        )
        if existing:
            raise ValueError("VOCAB_CONFLICT")
        row = await postgres_pool().fetchrow(
            """INSERT INTO public.game_vocab_items
                   (id, topic_id, word, translation_vi, image_url, audio_url, sort_order)
               VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *""",
            str(uuid.uuid4()), topic_id, data["word"],
            data.get("translation_vi", ""), data.get("image_url"),
            data.get("audio_url"), int(data.get("sort_order", 0)),
        )
        return self._row_vocab(row)

    async def update_vocab(self, item_id: str,
                           data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        set_parts, values = [], []

        def add(col: str, val: Any) -> None:
            values.append(val)
            set_parts.append(f"{col}=${len(values)}")

        for col in ("word", "translation_vi", "image_url", "audio_url"):
            if col in data:
                add(col, data[col])
        if "sort_order" in data and data["sort_order"] is not None:
            add("sort_order", int(data["sort_order"]))

        if not set_parts:
            row = await postgres_pool().fetchrow(
                "SELECT * FROM public.game_vocab_items WHERE id=$1", item_id)
            return self._row_vocab(row) if row else None

        row = await postgres_pool().fetchrow(
            f"""UPDATE public.game_vocab_items SET {', '.join(set_parts)}
                WHERE id=$1 RETURNING *""",
            item_id, *values,
        )
        return self._row_vocab(row) if row else None

    async def delete_vocab(self, item_id: str) -> bool:
        row = await postgres_pool().fetchrow(
            "DELETE FROM public.game_vocab_items WHERE id=$1 RETURNING id", item_id)
        return row is not None

    # -- Row mappers -------------------------------------------------------

    def _row_game(self, row) -> Dict[str, Any]:
        value = dict(row)
        value["config"] = _parse_jsonb(value.get("config")) or {}
        value["_id"] = value.get("id", "")
        return value

    def _row_topic(self, row) -> Dict[str, Any]:
        value = dict(row)
        value["_id"] = value.get("id", "")
        return value

    def _row_vocab(self, row) -> Dict[str, Any]:
        value = dict(row)
        value["_id"] = value.get("id", "")
        return value
