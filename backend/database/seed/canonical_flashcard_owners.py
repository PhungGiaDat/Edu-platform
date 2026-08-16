"""Audit and reconcile the LC7 vocabulary owners required by Quiz FKs."""

from __future__ import annotations

import argparse
import asyncio
import json
from typing import Any

from sqlalchemy import text

from database.orm_session import close_orm, connect_orm, session_factory
from database.seed.canonical_animals import VOCABULARY


async def audit_live() -> dict[str, Any]:
    await connect_orm()
    try:
        async with session_factory()() as session:
            columns = (
                await session.execute(
                    text(
                        "SELECT column_name, data_type, is_nullable, column_default "
                        "FROM information_schema.columns "
                        "WHERE table_schema='public' AND table_name='flashcards' "
                        "ORDER BY ordinal_position"
                    )
                )
            ).mappings().all()
            constraints = (
                await session.execute(
                    text(
                        "SELECT c.conname, pg_get_constraintdef(c.oid) AS definition "
                        "FROM pg_constraint c "
                        "JOIN pg_class t ON t.oid=c.conrelid "
                        "JOIN pg_namespace n ON n.oid=t.relnamespace "
                        "WHERE n.nspname='public' AND t.relname IN "
                        "('flashcards','quiz_questions') ORDER BY t.relname,c.conname"
                    )
                )
            ).mappings().all()
            words = [word.lower() for _, word, _ in VOCABULARY]
            owners = (
                await session.execute(
                    text(
                        "SELECT qr_id, deck_id, teacher_id, ar_tag, word, translation, definition, "
                        "category, image_url, audio_url, difficulty, image_animation_type, is_active, "
                        "created_at, updated_at FROM flashcards "
                        "WHERE lower(word)=ANY(CAST(:words AS text[])) OR qr_id=ANY(CAST(:ids AS text[])) "
                        "ORDER BY qr_id"
                    ),
                    {"words": words, "ids": [item[0] for item in VOCABULARY]},
                )
            ).mappings().all()
            assets = (
                await session.execute(
                    text(
                        "SELECT asset_key, lesson_id, section_id, status, public_url "
                        "FROM media_assets WHERE course_id='animals-adventure-en-5-7' "
                        "AND section_id='vocabulary_illustration' "
                        "AND asset_key=ANY(CAST(:ids AS text[])) ORDER BY asset_key,id"
                    ),
                    {"ids": [item[0] for item in VOCABULARY]},
                )
            ).mappings().all()
            tracking = (
                await session.execute(
                    text(
                        "SELECT qr_id, reference_image_url, physical_width_m, mind_catalog_id, "
                        "mind_file_url, mind_target_index FROM ar_tracking_targets "
                        "WHERE qr_id=ANY(CAST(:ids AS text[])) OR qr_id='cat001' ORDER BY qr_id"
                    ),
                    {"ids": [item[0] for item in VOCABULARY]},
                )
            ).mappings().all()
            return {
                "columns": [dict(row) for row in columns],
                "constraints": [dict(row) for row in constraints],
                "owners": [dict(row) for row in owners],
                "illustration_assets": [dict(row) for row in assets],
                "ar_tracking_targets": [dict(row) for row in tracking],
            }
    finally:
        await close_orm()


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--audit", action="store_true", required=True)
    parser.parse_args()
    print(json.dumps(asyncio.run(audit_live()), ensure_ascii=False, indent=2, default=str))


if __name__ == "__main__":
    main()
