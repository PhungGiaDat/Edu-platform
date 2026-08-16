"""Audit and reconcile the LC7 vocabulary owners required by Quiz FKs."""

from __future__ import annotations

import argparse
import asyncio
import json
import sys
from dataclasses import asdict, dataclass
from typing import Any

from sqlalchemy import JSON, Boolean, Column, MetaData, Table, Text, insert, select, text

from database.orm_session import close_orm, connect_orm, session_factory
from database.seed.canonical_animals import VOCABULARY


COURSE_ID = "animals-adventure-en-5-7"
CAT_VOCABULARY_ID = "animals-v1-cat"
CAT_QR_ID = "cat001"
MISSING_VOCABULARY = tuple(item for item in VOCABULARY if item[0] != CAT_VOCABULARY_ID)
FLASHCARDS = Table(
    "flashcards",
    MetaData(),
    Column("qr_id", Text, primary_key=True),
    Column("deck_id", Text),
    Column("teacher_id", Text),
    Column("ar_tag", Text),
    Column("word", Text, nullable=False),
    Column("translation", JSON, nullable=False),
    Column("definition", Text),
    Column("category", Text, nullable=False),
    Column("image_url", Text, nullable=False),
    Column("audio_url", Text),
    Column("difficulty", Text, nullable=False),
    Column("image_animation_type", Text),
    Column("is_active", Boolean, nullable=False),
)


class OwnerConflict(RuntimeError):
    pass


@dataclass(frozen=True)
class OwnerReport:
    created: tuple[str, ...]
    updated: tuple[str, ...]
    unchanged: tuple[str, ...]
    conflicts: tuple[str, ...]
    mapping: dict[str, str]


def build_missing_owner_definitions(asset_urls: dict[str, str]) -> dict[str, dict[str, Any]]:
    """Build the four minimum learner owners from LC7 and ready LC10 assets."""
    expected = {vocabulary_id for vocabulary_id, _, _ in MISSING_VOCABULARY}
    missing_assets = sorted(expected - set(asset_urls))
    if missing_assets:
        raise OwnerConflict("Missing ready learner illustrations: " + ", ".join(missing_assets))
    definitions: dict[str, dict[str, Any]] = {}
    for vocabulary_id, word, translation in MISSING_VOCABULARY:
        definitions[vocabulary_id] = {
            "qr_id": vocabulary_id,
            "word": word,
            "translation": {"en": word.lower(), "vi": translation},
            "category": "animals",
            "image_url": asset_urls[vocabulary_id],
        }
    return definitions


def canonical_owner_mapping() -> dict[str, str]:
    return {CAT_VOCABULARY_ID: CAT_QR_ID} | {
        vocabulary_id: vocabulary_id for vocabulary_id, _, _ in MISSING_VOCABULARY
    }


async def _asset_urls(session) -> dict[str, str]:
    rows = (
        await session.execute(
            text(
                "SELECT asset_key, public_url FROM media_assets "
                "WHERE course_id=:course_id AND section_id='vocabulary' AND status='ready' "
                "AND asset_key=ANY(CAST(:keys AS text[])) ORDER BY id"
            ),
            {
                "course_id": COURSE_ID,
                "keys": [f"vocabulary:{item[0]}:vocabulary_illustration" for item in MISSING_VOCABULARY],
            },
        )
    ).mappings().all()
    result: dict[str, str] = {}
    for row in rows:
        key = str(row["asset_key"])
        vocabulary_id = key.removeprefix("vocabulary:").removesuffix(":vocabulary_illustration")
        if vocabulary_id in result:
            raise OwnerConflict(f"Ambiguous ready learner illustration for {vocabulary_id}")
        if not row["public_url"]:
            raise OwnerConflict(f"Ready learner illustration lacks public_url for {vocabulary_id}")
        result[vocabulary_id] = str(row["public_url"])
    return result


async def reconcile_owners(session, *, mutate: bool) -> OwnerReport:
    definitions = build_missing_owner_definitions(await _asset_urls(session))
    mapping = canonical_owner_mapping()
    qr_ids = list(mapping.values())
    rows = (
        await session.execute(select(FLASHCARDS).where(FLASHCARDS.c.qr_id.in_(qr_ids)))
    ).mappings().all()
    by_id = {str(row["qr_id"]): dict(row) for row in rows}
    conflicts: list[str] = []
    created: list[str] = []
    unchanged: list[str] = []
    cat = by_id.get(CAT_QR_ID)
    if cat is None or str(cat["word"]).lower() != "cat":
        conflicts.append("Existing Cat owner cat001 is missing or has unrelated semantics")
    else:
        unchanged.append(CAT_QR_ID)

    for vocabulary_id, values in definitions.items():
        existing = by_id.get(values["qr_id"])
        if existing is None:
            created.append(values["qr_id"])
            continue
        comparable = {key: existing[key] for key in ("qr_id", "word", "translation", "category", "image_url")}
        if comparable != values:
            conflicts.append(f"Owner identity collision for {vocabulary_id}")
        else:
            unchanged.append(values["qr_id"])

    if conflicts:
        return OwnerReport(tuple(created), (), tuple(unchanged), tuple(conflicts), mapping)
    if mutate:
        for qr_id in created:
            await session.execute(insert(FLASHCARDS).values(**definitions[qr_id]))
        await session.flush()
    return OwnerReport(tuple(created), (), tuple(unchanged), (), mapping)


async def verify_owners(session) -> dict[str, Any]:
    mapping = canonical_owner_mapping()
    rows = (
        await session.execute(
            select(FLASHCARDS.c.qr_id, FLASHCARDS.c.word).where(
                FLASHCARDS.c.qr_id.in_(mapping.values())
            )
        )
    ).mappings().all()
    by_id = {str(row["qr_id"]): str(row["word"]).lower() for row in rows}
    expected_words = {vocabulary_id: word.lower() for vocabulary_id, word, _ in VOCABULARY}
    valid = {
        vocabulary_id: by_id.get(qr_id) == expected_words[vocabulary_id]
        for vocabulary_id, qr_id in mapping.items()
    }
    quiz_fk_total = sum(1 for _lesson in range(5) for _vocabulary in VOCABULARY)
    quiz_fk_valid = sum(1 for _lesson in range(5) for vocabulary_id, _, _ in VOCABULARY if valid[vocabulary_id])
    tracking_count = (
        await session.execute(
            text("SELECT count(*) FROM ar_tracking_targets WHERE qr_id=ANY(CAST(:ids AS text[]))"),
            {"ids": [item[0] for item in MISSING_VOCABULARY]},
        )
    ).scalar_one()
    return {
        "mapping": mapping,
        "owners_valid": valid,
        "valid_owner_count": sum(valid.values()),
        "quiz_fk_valid": quiz_fk_valid,
        "quiz_fk_total": quiz_fk_total,
        "new_ar_tracking_targets": int(tracking_count),
    }


async def run_reconciliation(*, mutate: bool) -> dict[str, Any]:
    await connect_orm()
    try:
        if mutate:
            async with session_factory()() as session:
                async with session.begin():
                    report = await reconcile_owners(session, mutate=True)
                    if report.conflicts:
                        raise OwnerConflict("; ".join(report.conflicts))
            async with session_factory()() as fresh:
                verification = await verify_owners(fresh)
        else:
            async with session_factory()() as session:
                report = await reconcile_owners(session, mutate=False)
                verification = await verify_owners(session)
        return {
            "mode": "apply" if mutate else "dry-run",
            "report": asdict(report),
            "verification": verification,
        }
    finally:
        await close_orm()


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
                        "AND section_id='vocabulary' AND status='ready' "
                        "AND asset_key=ANY(CAST(:keys AS text[])) ORDER BY asset_key,id"
                    ),
                    {"keys": [f'vocabulary:{item[0]}:vocabulary_illustration' for item in VOCABULARY]},
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
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument("--audit", action="store_true")
    mode.add_argument("--dry-run", action="store_true")
    mode.add_argument("--apply", action="store_true")
    args = parser.parse_args()
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    try:
        result = asyncio.run(audit_live() if args.audit else run_reconciliation(mutate=args.apply))
    except OwnerConflict as exc:
        print(json.dumps({"status": "CONFLICT", "reason": str(exc)}, ensure_ascii=False, indent=2))
        raise SystemExit(2) from exc
    print(json.dumps(result, ensure_ascii=False, indent=2, default=str))


if __name__ == "__main__":
    main()
