"""Promote the approved six-item Cat Clay v1 batch through LC9/LC10 contracts.

The command uses the existing ``PreparationInventory`` representation and
LC10 Storage guards.  Versioned object paths ensure this promotion cannot
overwrite the legacy learner illustrations.
"""

from __future__ import annotations

import argparse
import asyncio
import hashlib
import json
import os
import shutil
from dataclasses import dataclass
from pathlib import Path

from dotenv import dotenv_values
from PIL import Image
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from database.seed.canonical_animals import COURSE_ID
from database.seed.canonical_flashcard_owners import FLASHCARDS, canonical_owner_mapping
from database.seed.learner_asset_manifest import BUCKET, REPOSITORY_ROOT
from database.seed.prepare_learner_assets import PreparationInventory, PreparedAsset
from database.seed.publish_learner_assets import (
    Action,
    BindingResult,
    PlannedObject,
    PublicationError,
    SupabaseStorageAdapter,
    VerifiedObject,
    preflight,
    publish_remote,
)
from models.asset_contract import (
    AssetRole,
    lesson_asset_key,
    mascot_asset_key,
    vocabulary_asset_key,
)
from models.lesson_media import MediaType
from repositories.orm_media_asset_repository import MediaAssetRepository


CAT_LESSON_ID = "learn-the-cat"
EXPECTED_COUNT = 6
PREPARATION_PATH = Path(__file__).with_name("manifests") / "cat_vertical_slice_assets.prepared.json"
PUBLICATION_PATH = PREPARATION_PATH.with_name("cat_vertical_slice_assets.publication.json")
SOURCE_ROOT = "mobile/rn/assets/prototypes/cat-lesson/clay-v1-vertical-slice/derivatives"
OUTPUT_ROOT = "backend/generated/learnar-assets"


@dataclass(frozen=True)
class PromotionSpec:
    semantic_key: str
    content_identity: str
    asset_identity: str
    asset_role: AssetRole
    source_name: str
    object_path: str
    lesson_id: str
    section_id: str
    flashcard_qr_id: str | None = None
    expected_word: str | None = None

    @property
    def source_path(self) -> str:
        return f"{SOURCE_ROOT}/{self.source_name}"

    @property
    def output_path(self) -> str:
        return f"{OUTPUT_ROOT}/{self.object_path}"


SPECS = (
    PromotionSpec(
        vocabulary_asset_key("animals-v1-cat", AssetRole.VOCABULARY_ILLUSTRATION),
        "animals-v1-cat",
        "vocabulary_illustration",
        AssetRole.VOCABULARY_ILLUSTRATION,
        "cat-vocabulary-clay-v1-512.png",
        f"courses/{COURSE_ID}/vocabulary/animals-v1-cat/vocabulary_illustration.clay-v1-512.png",
        CAT_LESSON_ID,
        "vocabulary",
        canonical_owner_mapping()["animals-v1-cat"],
        "cat",
    ),
    PromotionSpec(
        vocabulary_asset_key("animals-v1-dog", AssetRole.VOCABULARY_ILLUSTRATION),
        "animals-v1-dog",
        "vocabulary_illustration",
        AssetRole.VOCABULARY_ILLUSTRATION,
        "dog-vocabulary-clay-v1-512.png",
        f"courses/{COURSE_ID}/vocabulary/animals-v1-dog/vocabulary_illustration.clay-v1-512.png",
        "learn-the-dog",
        "vocabulary",
        canonical_owner_mapping()["animals-v1-dog"],
        "dog",
    ),
    PromotionSpec(
        vocabulary_asset_key("animals-v1-bird", AssetRole.VOCABULARY_ILLUSTRATION),
        "animals-v1-bird",
        "vocabulary_illustration",
        AssetRole.VOCABULARY_ILLUSTRATION,
        "bird-vocabulary-clay-v1-512.png",
        f"courses/{COURSE_ID}/vocabulary/animals-v1-bird/vocabulary_illustration.clay-v1-512.png",
        "learn-the-bird",
        "vocabulary",
        canonical_owner_mapping()["animals-v1-bird"],
        "bird",
    ),
    PromotionSpec(
        mascot_asset_key("lexi", AssetRole.MASCOT_NEUTRAL),
        "lexi",
        "neutral",
        AssetRole.MASCOT_NEUTRAL,
        "lexi-neutral-clay-v1-512.png",
        f"courses/{COURSE_ID}/mascots/lexi/neutral.clay-v1-512.png",
        CAT_LESSON_ID,
        "mascot",
    ),
    PromotionSpec(
        mascot_asset_key("lexi", AssetRole.MASCOT_CHEER),
        "lexi",
        "cheer",
        AssetRole.MASCOT_CHEER,
        "lexi-cheer-clay-v1-512.png",
        f"courses/{COURSE_ID}/mascots/lexi/cheer.clay-v1-512.png",
        CAT_LESSON_ID,
        "mascot",
    ),
    PromotionSpec(
        lesson_asset_key(CAT_LESSON_ID, "cat_champion_reward", AssetRole.LESSON_REWARD),
        CAT_LESSON_ID,
        "cat_champion_reward",
        AssetRole.LESSON_REWARD,
        "cat-champion-clay-v1-512.png",
        f"courses/{COURSE_ID}/lessons/{CAT_LESSON_ID}/rewards/cat_champion_reward.clay-v1-512.png",
        CAT_LESSON_ID,
        "reward",
    ),
)

SPEC_BY_KEY = {spec.semantic_key: spec for spec in SPECS}
EXPECTED_ROLES = frozenset({
    AssetRole.VOCABULARY_ILLUSTRATION,
    AssetRole.MASCOT_NEUTRAL,
    AssetRole.MASCOT_CHEER,
    AssetRole.LESSON_REWARD,
})


@dataclass(frozen=True)
class PromotionBindingResult:
    media: BindingResult
    flashcards_updated: int
    flashcards_unchanged: int


def _sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def _validate_png(path: Path, semantic_key: str) -> tuple[int, int]:
    if not path.is_file() or path.stat().st_size == 0:
        raise PublicationError(f"missing approved derivative: {semantic_key}")
    with Image.open(path) as image:
        image.load()
        if image.format != "PNG" or image.size != (512, 512) or image.mode != "RGBA":
            raise PublicationError(f"expected 512x512 RGBA PNG: {semantic_key}")
        alpha_min, alpha_max = image.getchannel("A").getextrema()
        if alpha_min >= 255 or alpha_max != 255:
            raise PublicationError(f"transparent alpha contract failed: {semantic_key}")
        return image.size


def prepare_inventory(root: Path = REPOSITORY_ROOT) -> PreparationInventory:
    entries: list[PreparedAsset] = []
    for spec in SPECS:
        source = root / spec.source_path
        width, height = _validate_png(source, spec.semantic_key)
        output = root / spec.output_path
        output.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(source, output)
        source_sha = _sha256(source)
        output_sha = _sha256(output)
        if source_sha != output_sha:
            raise PublicationError(f"approved derivative copy mismatch: {spec.semantic_key}")
        entries.append(PreparedAsset(
            semantic_key=spec.semantic_key,
            content_identity=spec.content_identity,
            asset_role=spec.asset_role,
            media_type=MediaType.IMAGE.value,
            source_classification="approved_production_derivative",
            source_path=spec.source_path,
            source_sha256=source_sha,
            output_path=spec.output_path,
            bucket=BUCKET,
            object_path=spec.object_path,
            mime_type="image/png",
            byte_size=output.stat().st_size,
            sha256=output_sha,
            validation_status="READY_FOR_UPLOAD",
            technical_validation="TECHNICALLY_VALID",
            content_validation="CONTENT_VALIDATED",
            preparation_method="approved_clay_v1_derivative_copy",
            width=width,
            height=height,
        ))
    inventory = PreparationInventory(
        input_manifest="approved:cat_vertical_slice:clay_v1",
        entries=tuple(entries),
    )
    PREPARATION_PATH.parent.mkdir(parents=True, exist_ok=True)
    PREPARATION_PATH.write_text(
        json.dumps(inventory.model_dump(mode="json"), indent=2) + "\n",
        encoding="utf-8",
    )
    return inventory


def load_and_validate_inventory(
    path: Path = PREPARATION_PATH,
    root: Path = REPOSITORY_ROOT,
) -> PreparationInventory:
    inventory = PreparationInventory.model_validate_json(path.read_text(encoding="utf-8"))
    if len(inventory.entries) != EXPECTED_COUNT:
        raise PublicationError("Cat Clay v1 promotion requires exactly six entries")
    if {entry.semantic_key for entry in inventory.entries} != set(SPEC_BY_KEY):
        raise PublicationError("Cat Clay v1 semantic key set mismatch")
    if {entry.object_path for entry in inventory.entries} != {spec.object_path for spec in SPECS}:
        raise PublicationError("Cat Clay v1 object path set mismatch")
    if {entry.bucket for entry in inventory.entries} != {BUCKET}:
        raise PublicationError(f"promotion must target only {BUCKET}")
    for entry in inventory.entries:
        spec = SPEC_BY_KEY[entry.semantic_key]
        if entry.asset_role not in EXPECTED_ROLES or entry.asset_role is not spec.asset_role:
            raise PublicationError(f"unexpected role: {entry.semantic_key}")
        if entry.mime_type != "image/png" or entry.width != 512 or entry.height != 512:
            raise PublicationError(f"PNG metadata mismatch: {entry.semantic_key}")
        if entry.validation_status != "READY_FOR_UPLOAD":
            raise PublicationError(f"non-ready entry: {entry.semantic_key}")
        local = root / entry.output_path
        _validate_png(local, entry.semantic_key)
        if local.stat().st_size != entry.byte_size or _sha256(local) != entry.sha256:
            raise PublicationError(f"local checksum mismatch: {entry.semantic_key}")
    return inventory


class CatVerticalSliceBindingAdapter:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.repository = MediaAssetRepository(session)

    async def bind_verified(self, objects: tuple[VerifiedObject, ...]) -> PromotionBindingResult:
        if len(objects) != EXPECTED_COUNT or {item.entry.semantic_key for item in objects} != set(SPEC_BY_KEY):
            raise PublicationError("canonical binding requires the complete verified six-object batch")
        states: list[str] = []
        verified_by_key = {item.entry.semantic_key: item for item in objects}
        for spec in SPECS:
            item = verified_by_key[spec.semantic_key]
            entry = item.entry
            states.append(await self.repository.upsert_ready_asset({
                "course_id": COURSE_ID,
                "lesson_id": spec.lesson_id,
                "section_id": spec.section_id,
                "asset_key": spec.semantic_key,
                "bucket": entry.bucket,
                "path": entry.object_path,
                "type": entry.media_type,
                "public_url": item.application_reference,
                "metadata": {
                    "semantic_key": spec.semantic_key,
                    "content_identity": spec.content_identity,
                    "asset_identity": spec.asset_identity,
                    "asset_role": spec.asset_role.value,
                    "sha256": entry.sha256,
                    "mime_type": entry.mime_type,
                    "width": entry.width,
                    "height": entry.height,
                    "transparent": True,
                    "rendition": "clay_v1_512",
                    "source_classification": entry.source_classification,
                },
            }))

        flashcard_specs = [spec for spec in SPECS if spec.flashcard_qr_id]
        qr_ids = [spec.flashcard_qr_id for spec in flashcard_specs]
        rows = (await self.session.execute(
            select(FLASHCARDS.c.qr_id, FLASHCARDS.c.word, FLASHCARDS.c.image_url).where(
                FLASHCARDS.c.qr_id.in_(qr_ids)
            )
        )).mappings().all()
        by_id = {str(row["qr_id"]): row for row in rows}
        if len(by_id) != len(flashcard_specs):
            raise PublicationError("one or more canonical Cat/Dog/Bird flashcard owners are missing")
        updated = 0
        unchanged = 0
        for spec in flashcard_specs:
            row = by_id[str(spec.flashcard_qr_id)]
            if str(row["word"]).casefold() != spec.expected_word:
                raise PublicationError(f"flashcard semantic owner mismatch: {spec.flashcard_qr_id}")
            reference = verified_by_key[spec.semantic_key].application_reference
            if row["image_url"] == reference:
                unchanged += 1
                continue
            await self.session.execute(
                update(FLASHCARDS)
                .where(FLASHCARDS.c.qr_id == spec.flashcard_qr_id)
                .values(image_url=reference)
            )
            updated += 1
        return PromotionBindingResult(
            media=BindingResult(
                created=states.count("created"),
                updated=states.count("updated"),
                unchanged=states.count("unchanged"),
            ),
            flashcards_updated=updated,
            flashcards_unchanged=unchanged,
        )


async def verify_fresh_bindings(objects: tuple[VerifiedObject, ...]) -> int:
    from database.orm_session import session_factory

    verified_by_key = {item.entry.semantic_key: item for item in objects}
    async with session_factory()() as session:
        repository = MediaAssetRepository(session)
        for spec in SPECS:
            row = await repository.get_ready_asset(
                COURSE_ID, spec.lesson_id, spec.section_id, spec.semantic_key
            )
            item = verified_by_key[spec.semantic_key]
            if row is None or row.public_url != item.application_reference or row.path != spec.object_path:
                raise PublicationError(f"fresh-session media readback mismatch: {spec.semantic_key}")
            metadata = row.metadata_ or {}
            if (
                metadata.get("sha256") != item.entry.sha256
                or metadata.get("mime_type") != "image/png"
                or metadata.get("width") != 512
                or metadata.get("height") != 512
                or metadata.get("transparent") is not True
            ):
                raise PublicationError(f"fresh-session metadata mismatch: {spec.semantic_key}")

        flashcard_specs = [spec for spec in SPECS if spec.flashcard_qr_id]
        rows = (await session.execute(
            select(FLASHCARDS.c.qr_id, FLASHCARDS.c.image_url).where(
                FLASHCARDS.c.qr_id.in_([spec.flashcard_qr_id for spec in flashcard_specs])
            )
        )).mappings().all()
        image_by_id = {str(row["qr_id"]): str(row["image_url"]) for row in rows}
        for spec in flashcard_specs:
            if image_by_id.get(str(spec.flashcard_qr_id)) != verified_by_key[spec.semantic_key].application_reference:
                raise PublicationError(f"fresh-session flashcard readback mismatch: {spec.flashcard_qr_id}")
    return EXPECTED_COUNT


def _action_counts(plan: tuple[PlannedObject, ...]) -> dict[str, int]:
    return {action.value: sum(item.action is action for item in plan) for action in Action}


def publication_evidence(
    inventory: PreparationInventory,
    project_ref: str,
    plan: tuple[PlannedObject, ...],
    verified: tuple[VerifiedObject, ...] = (),
    binding: PromotionBindingResult | None = None,
    second_plan: tuple[PlannedObject, ...] = (),
) -> dict:
    verified_by_key = {item.entry.semantic_key: item for item in verified}
    planned_by_key = {item.entry.semantic_key: item.action.value for item in plan}
    complete = len(verified) == EXPECTED_COUNT and binding is not None
    return {
        "schema_version": 1,
        "content_batch": "cat_vertical_slice_clay_v1",
        "project_ref": project_ref,
        "bucket": BUCKET,
        "publication_status": "VERIFIED" if complete else "BLOCKED_CONFLICT",
        "prepared_entries": len(inventory.entries),
        "local_checksum_validation": "PASS",
        "remote_plan": _action_counts(plan),
        "remote_verified": len(verified),
        "application_references_verified": len(verified),
        "binding_result": None if binding is None else {
            "media": {
                "created": binding.media.created,
                "updated": binding.media.updated,
                "unchanged": binding.media.unchanged,
            },
            "flashcards_updated": binding.flashcards_updated,
            "flashcards_unchanged": binding.flashcards_unchanged,
        },
        "second_preflight": _action_counts(second_plan) if second_plan else None,
        "entries": [
            {
                "semantic_key": entry.semantic_key,
                "asset_role": entry.asset_role.value,
                "bucket": entry.bucket,
                "object_path": entry.object_path,
                "mime_type": entry.mime_type,
                "width": entry.width,
                "height": entry.height,
                "local_sha256": entry.sha256,
                "local_byte_size": entry.byte_size,
                "planned_action": planned_by_key.get(entry.semantic_key),
                "remote_sha256": verified_by_key[entry.semantic_key].remote.sha256 if entry.semantic_key in verified_by_key else None,
                "remote_byte_size": len(verified_by_key[entry.semantic_key].remote.data) if entry.semantic_key in verified_by_key else None,
                "remote_verification_status": "REMOTE_VERIFIED" if entry.semantic_key in verified_by_key else "NOT_VERIFIED",
                "application_reference": verified_by_key[entry.semantic_key].application_reference if entry.semantic_key in verified_by_key else None,
                "canonical_binding_state": "BOUND" if complete else "NOT_ATTEMPTED",
            }
            for entry in inventory.entries
        ],
    }


async def remote_run(*, execute_publication: bool, record_evidence: bool) -> int:
    inventory = load_and_validate_inventory()
    env = {**dotenv_values(REPOSITORY_ROOT / "backend/.env"), **os.environ}
    project_url = str(env.get("SUPABASE_PROJECT_URL") or env.get("SUPABASE_URL") or "")
    service_key = str(env.get("SUPABASE_SERVICE_ROLE_KEY") or "")
    if not project_url or not service_key:
        raise PublicationError("Supabase publication credentials are unavailable")
    project_ref = project_url.removeprefix("https://").split(".", 1)[0]
    storage = SupabaseStorageAdapter(project_url, service_key)
    try:
        bucket, plan = await preflight(inventory, storage)
        if not bucket.public:
            raise PublicationError("canonical learner asset bucket is not public")
        counts = _action_counts(plan)
        print(" ".join(f"{key}={value}" for key, value in counts.items()))
        if counts[Action.BLOCK_CONFLICT.value]:
            if record_evidence:
                PUBLICATION_PATH.write_text(
                    json.dumps(publication_evidence(inventory, project_ref, plan), indent=2) + "\n",
                    encoding="utf-8",
                )
            return 3
        if not execute_publication:
            return 0

        verified = await publish_remote(inventory, storage)
        from database.orm_session import close_orm, connect_orm, session_factory

        await connect_orm()
        try:
            async with session_factory()() as session:
                async with session.begin():
                    binding = await CatVerticalSliceBindingAdapter(session).bind_verified(verified)
            resolved = await verify_fresh_bindings(verified)
        finally:
            await close_orm()
        _, second_plan = await preflight(inventory, storage)
        if _action_counts(second_plan) != {
            Action.UPLOAD_NEW.value: 0,
            Action.SKIP_ALREADY_MATCHES.value: EXPECTED_COUNT,
            Action.BLOCK_CONFLICT.value: 0,
        }:
            raise PublicationError("second preflight did not prove 0/6/0 idempotency")
        if record_evidence:
            PUBLICATION_PATH.write_text(
                json.dumps(
                    publication_evidence(inventory, project_ref, plan, verified, binding, second_plan),
                    indent=2,
                ) + "\n",
                encoding="utf-8",
            )
        print(
            f"REMOTE_VERIFIED={len(verified)} MEDIA_BOUND={resolved} "
            f"media_created={binding.media.created} media_updated={binding.media.updated} "
            f"media_unchanged={binding.media.unchanged} "
            f"flashcards_updated={binding.flashcards_updated} "
            f"flashcards_unchanged={binding.flashcards_unchanged} SECOND_PREFLIGHT=0/6/0"
        )
        return 0
    finally:
        await storage.close()


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument("--prepare", action="store_true")
    mode.add_argument("--remote-preflight", action="store_true")
    mode.add_argument("--publish", action="store_true")
    parser.add_argument("--record-evidence", action="store_true")
    args = parser.parse_args()
    if args.prepare:
        inventory = prepare_inventory()
        print(f"PREPARED={len(inventory.entries)} READY_FOR_UPLOAD={len(inventory.entries)}")
        return 0
    if args.remote_preflight or args.publish:
        return asyncio.run(remote_run(execute_publication=args.publish, record_evidence=args.record_evidence))
    inventory = load_and_validate_inventory()
    print(f"prepared={len(inventory.entries)} local_valid={len(inventory.entries)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
