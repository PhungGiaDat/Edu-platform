"""LC10 publication guard and deterministic Supabase Storage preflight.

The module intentionally separates Storage and database adapters so unit tests
cannot contact Supabase.  A missing canonical bucket fails before object reads,
uploads, or media binding.
"""

from __future__ import annotations

import argparse
import asyncio
import hashlib
import json
import os
from dataclasses import dataclass
from enum import StrEnum
from pathlib import Path
from typing import Protocol

import httpx
from dotenv import dotenv_values

from database.seed.canonical_animals import COURSE_ID, LESSONS
from database.seed.learner_asset_manifest import BUCKET, REPOSITORY_ROOT
from database.seed.prepare_learner_assets import PREPARATION_PATH, PreparationInventory, PreparedAsset
from models.asset_contract import AssetRole
from repositories.orm_media_asset_repository import MediaAssetRepository
from services.learner_asset_service import LearnerAssetService


PUBLICATION_SCHEMA_VERSION = 1
PUBLICATION_PATH = PREPARATION_PATH.with_name("animals_adventure_assets.publication.json")
EXPECTED_BUCKET = BUCKET
EXPECTED_COUNT = 11
ALLOWED_ROLES = frozenset({
    AssetRole.COURSE_COVER,
    AssetRole.VOCABULARY_ILLUSTRATION,
    AssetRole.PRONUNCIATION_AUDIO,
})


class PublicationError(RuntimeError):
    pass


class CanonicalBucketMissing(PublicationError):
    pass


class Action(StrEnum):
    UPLOAD_NEW = "UPLOAD_NEW"
    SKIP_ALREADY_MATCHES = "SKIP_ALREADY_MATCHES"
    BLOCK_CONFLICT = "BLOCK_CONFLICT"


@dataclass(frozen=True)
class BucketInfo:
    name: str
    public: bool


@dataclass(frozen=True)
class RemoteObject:
    data: bytes
    content_type: str

    @property
    def sha256(self) -> str:
        return hashlib.sha256(self.data).hexdigest()


@dataclass(frozen=True)
class PlannedObject:
    entry: PreparedAsset
    action: Action
    remote: RemoteObject | None


@dataclass(frozen=True)
class VerifiedObject:
    entry: PreparedAsset
    remote: RemoteObject
    application_reference: str


@dataclass(frozen=True)
class BindingResult:
    created: int
    updated: int
    unchanged: int


class StorageAdapter(Protocol):
    async def get_bucket(self, bucket: str) -> BucketInfo | None: ...
    async def download(self, bucket: str, object_path: str) -> RemoteObject | None: ...
    async def upload(self, bucket: str, object_path: str, data: bytes, content_type: str) -> None: ...
    def application_reference(self, bucket: BucketInfo, object_path: str) -> str: ...
    async def verify_application_reference(self, reference: str, expected: RemoteObject) -> None: ...


class MediaBindingAdapter(Protocol):
    async def bind_verified(self, objects: tuple[VerifiedObject, ...]) -> BindingResult | None: ...


def _sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def load_and_validate_inventory(
    path: Path = PREPARATION_PATH,
    root: Path = REPOSITORY_ROOT,
) -> PreparationInventory:
    inventory = PreparationInventory.model_validate_json(path.read_text(encoding="utf-8"))
    if len(inventory.entries) != EXPECTED_COUNT:
        raise PublicationError("LC10 accepts exactly the current 11-entry LC9 batch")
    if {entry.bucket for entry in inventory.entries} != {EXPECTED_BUCKET}:
        raise PublicationError(f"LC10 inventory must target only the canonical {EXPECTED_BUCKET} bucket")
    if len({entry.semantic_key for entry in inventory.entries}) != EXPECTED_COUNT:
        raise PublicationError("duplicate semantic key in LC10 inventory")
    if len({entry.object_path for entry in inventory.entries}) != EXPECTED_COUNT:
        raise PublicationError("object path collision in LC10 inventory")
    for entry in inventory.entries:
        if entry.validation_status != "READY_FOR_UPLOAD":
            raise PublicationError(f"non-ready entry: {entry.semantic_key}")
        if entry.asset_role not in ALLOWED_ROLES:
            raise PublicationError(f"non-learner role in LC10 batch: {entry.semantic_key}")
        local = root / entry.output_path
        if not local.is_file() or local.stat().st_size != entry.byte_size:
            raise PublicationError(f"local artifact size mismatch: {entry.semantic_key}")
        if _sha256(local) != entry.sha256:
            raise PublicationError(f"local artifact checksum mismatch: {entry.semantic_key}")
    return inventory


async def preflight(inventory: PreparationInventory, storage: StorageAdapter) -> tuple[BucketInfo, tuple[PlannedObject, ...]]:
    bucket = await storage.get_bucket(EXPECTED_BUCKET)
    if bucket is None:
        raise CanonicalBucketMissing("LC10 BLOCKED — CANONICAL BUCKET MISSING")
    planned: list[PlannedObject] = []
    for entry in inventory.entries:
        remote = await storage.download(entry.bucket, entry.object_path)
        if remote is None:
            action = Action.UPLOAD_NEW
        elif (
            remote.sha256 == entry.sha256
            and len(remote.data) == entry.byte_size
            and remote.content_type.split(";", 1)[0].strip().casefold() == entry.mime_type.casefold()
        ):
            action = Action.SKIP_ALREADY_MATCHES
        else:
            action = Action.BLOCK_CONFLICT
        planned.append(PlannedObject(entry, action, remote))
    return bucket, tuple(planned)


async def publish_remote(
    inventory: PreparationInventory,
    storage: StorageAdapter,
    root: Path = REPOSITORY_ROOT,
) -> tuple[VerifiedObject, ...]:
    bucket, plan = await preflight(inventory, storage)
    conflicts = [item for item in plan if item.action is Action.BLOCK_CONFLICT]
    if conflicts:
        raise PublicationError(f"remote conflicts block the full batch: {len(conflicts)}")
    verified: list[VerifiedObject] = []
    for item in plan:
        entry = item.entry
        if item.action is Action.UPLOAD_NEW:
            await storage.upload(entry.bucket, entry.object_path, (root / entry.output_path).read_bytes(), entry.mime_type)
        remote = await storage.download(entry.bucket, entry.object_path)
        if remote is None or remote.sha256 != entry.sha256 or len(remote.data) != entry.byte_size:
            raise PublicationError(f"remote readback mismatch: {entry.semantic_key}")
        if remote.content_type.split(";", 1)[0].strip().casefold() != entry.mime_type.casefold():
            raise PublicationError(f"remote MIME mismatch: {entry.semantic_key}")
        reference = storage.application_reference(bucket, entry.object_path)
        await storage.verify_application_reference(reference, remote)
        verified.append(VerifiedObject(entry, remote, reference))
    return tuple(verified)


async def publish(
    inventory: PreparationInventory,
    storage: StorageAdapter,
    bindings: MediaBindingAdapter,
    root: Path = REPOSITORY_ROOT,
) -> tuple[VerifiedObject, ...]:
    verified = await publish_remote(inventory, storage, root)
    await bindings.bind_verified(verified)
    return verified


class OrmPublicationBindingAdapter:
    """LC10-owned mapping onto Course cover plus lesson-scoped media rows."""

    def __init__(self, repository: MediaAssetRepository):
        self.repository = repository
        self.lesson_by_vocabulary = {lesson.focus_vocabulary_id: lesson.lesson_id for lesson in LESSONS}

    async def bind_verified(self, objects: tuple[VerifiedObject, ...]) -> BindingResult:
        if len(objects) != EXPECTED_COUNT:
            raise PublicationError("media binding requires the complete verified 11-object batch")
        states: list[str] = []
        for item in objects:
            entry = item.entry
            if entry.asset_role is AssetRole.COURSE_COVER:
                states.append(await self.repository.set_course_cover_url(COURSE_ID, item.application_reference))
                continue
            lesson_id = self.lesson_by_vocabulary.get(entry.content_identity)
            if lesson_id is None:
                raise PublicationError(f"missing canonical lesson mapping for {entry.content_identity}")
            states.append(await self.repository.upsert_ready_asset({
                "course_id": COURSE_ID,
                "lesson_id": lesson_id,
                "section_id": "vocabulary",
                "asset_key": entry.semantic_key,
                "bucket": entry.bucket,
                "path": entry.object_path,
                "type": entry.media_type,
                "public_url": item.application_reference,
                "metadata": {
                    "semantic_key": entry.semantic_key,
                    "content_identity": entry.content_identity,
                    "asset_role": entry.asset_role.value,
                    "sha256": entry.sha256,
                    "mime_type": entry.mime_type,
                    "source_classification": entry.source_classification,
                },
            }))
        return BindingResult(
            created=states.count("created"),
            updated=states.count("updated"),
            unchanged=states.count("unchanged"),
        )


class SupabaseStorageAdapter:
    """Narrow service-role adapter. It never creates buckets and never upserts."""

    def __init__(self, project_url: str, service_role_key: str, client: httpx.AsyncClient | None = None):
        self.project_url = project_url.rstrip("/")
        self._headers = {"Authorization": f"Bearer {service_role_key}", "apikey": service_role_key}
        self._client = client or httpx.AsyncClient(timeout=30)
        self._owns_client = client is None

    async def close(self) -> None:
        if self._owns_client:
            await self._client.aclose()

    async def get_bucket(self, bucket: str) -> BucketInfo | None:
        response = await self._client.get(f"{self.project_url}/storage/v1/bucket/{bucket}", headers=self._headers)
        if response.status_code == 404:
            return None
        # Supabase Storage currently returns HTTP 400 with a structured
        # "Bucket not found" payload for this endpoint in some deployments.
        if response.status_code == 400:
            try:
                error = response.json()
            except ValueError:
                error = {}
            message = " ".join(str(error.get(key, "")) for key in ("error", "message", "code")).casefold()
            if "bucket" in message and "not found" in message:
                return None
        response.raise_for_status()
        body = response.json()
        return BucketInfo(name=body.get("id") or body.get("name") or bucket, public=bool(body.get("public")))

    async def download(self, bucket: str, object_path: str) -> RemoteObject | None:
        response = await self._client.get(
            f"{self.project_url}/storage/v1/object/{bucket}/{object_path}", headers=self._headers
        )
        if response.status_code == 404 or self._is_not_found(response):
            return None
        response.raise_for_status()
        return RemoteObject(response.content, response.headers.get("content-type", "application/octet-stream"))

    async def upload(self, bucket: str, object_path: str, data: bytes, content_type: str) -> None:
        response = await self._client.post(
            f"{self.project_url}/storage/v1/object/{bucket}/{object_path}",
            headers={**self._headers, "content-type": content_type, "x-upsert": "false"},
            content=data,
        )
        response.raise_for_status()

    def application_reference(self, bucket: BucketInfo, object_path: str) -> str:
        if not bucket.public:
            raise PublicationError("private canonical bucket requires an approved signed-URL backend flow")
        from core.url_builders import supabase_base_url

        expected_base = f"{self.project_url}/storage/v1/object/public/{bucket.name}"
        canonical_base = supabase_base_url().rstrip("/")
        if canonical_base != expected_base:
            raise PublicationError("configured public URL helper disagrees with the verified publication bucket")
        return f"{canonical_base}/{object_path.lstrip('/')}"

    async def verify_application_reference(self, reference: str, expected: RemoteObject) -> None:
        response = await self._client.get(reference)
        response.raise_for_status()
        actual = RemoteObject(response.content, response.headers.get("content-type", "application/octet-stream"))
        if actual.sha256 != expected.sha256 or len(actual.data) != len(expected.data):
            raise PublicationError("public application reference byte verification failed")
        if actual.content_type.split(";", 1)[0].strip().casefold() != expected.content_type.split(";", 1)[0].strip().casefold():
            raise PublicationError("public application reference MIME verification failed")

    @staticmethod
    def _is_not_found(response: httpx.Response) -> bool:
        if response.status_code != 400:
            return False
        try:
            error = response.json()
        except ValueError:
            return False
        message = " ".join(str(error.get(key, "")) for key in ("error", "message", "code")).casefold()
        return "not found" in message


def publication_evidence(
    inventory: PreparationInventory,
    project_ref: str,
    plan: tuple[PlannedObject, ...],
    verified: tuple[VerifiedObject, ...] = (),
    binding: BindingResult | None = None,
    second_plan: tuple[PlannedObject, ...] = (),
) -> dict:
    previous: dict = {}
    if PUBLICATION_PATH.is_file():
        try:
            previous = json.loads(PUBLICATION_PATH.read_text(encoding="utf-8"))
        except (json.JSONDecodeError, OSError):
            previous = {}
    verified_by_key = {item.entry.semantic_key: item for item in verified}
    action_by_key = {item.entry.semantic_key: item.action.value for item in plan}
    complete = len(verified) == EXPECTED_COUNT and binding is not None
    current_plan = {action.value: sum(item.action is action for item in plan) for action in Action}
    first_plan = previous.get("first_publication_plan")
    if first_plan is None and complete and current_plan[Action.UPLOAD_NEW.value]:
        first_plan = current_plan
    first_binding = previous.get("first_binding_result")
    if first_binding is None and complete and binding and (binding.created or binding.updated):
        first_binding = {"created": binding.created, "updated": binding.updated, "unchanged": binding.unchanged}
    return {
        "schema_version": PUBLICATION_SCHEMA_VERSION,
        "content_batch": COURSE_ID,
        "project_ref": project_ref,
        "bucket": EXPECTED_BUCKET,
        "publication_status": "VERIFIED" if complete else "BLOCKED_CONFLICT",
        "blocking_invariant": None if complete else "EXISTING_SHARED_BUCKET_OBJECT_CONFLICT",
        "prepared_entries": len(inventory.entries),
        "local_checksum_validation": "PASS",
        "remote_plan": current_plan,
        "first_publication_plan": first_plan,
        "remote_verified": len(verified),
        "application_references_verified": len(verified),
        "canonical_bindings": len(verified) if binding else 0,
        "binding_result": None if binding is None else {
            "created": binding.created,
            "updated": binding.updated,
            "unchanged": binding.unchanged,
        },
        "first_binding_result": first_binding,
        "second_preflight": (
            {action.value: sum(item.action is action for item in second_plan) for action in Action}
            if second_plan else None
        ),
        "production_storage_mutated": bool(previous.get("production_storage_mutated")) or (any(item.action is Action.UPLOAD_NEW for item in plan) and complete),
        "production_database_mutated": bool(previous.get("production_database_mutated")) or bool(binding and (binding.created or binding.updated)),
        "entries": [
            {
                "semantic_key": entry.semantic_key,
                "bucket": entry.bucket,
                "object_path": entry.object_path,
                "local_sha256": entry.sha256,
                "local_byte_size": entry.byte_size,
                "content_type": entry.mime_type,
                "planned_action": action_by_key.get(entry.semantic_key),
                "remote_sha256": verified_by_key[entry.semantic_key].remote.sha256 if entry.semantic_key in verified_by_key else None,
                "remote_byte_size": len(verified_by_key[entry.semantic_key].remote.data) if entry.semantic_key in verified_by_key else None,
                "remote_verification_status": "REMOTE_VERIFIED" if entry.semantic_key in verified_by_key else "NOT_VERIFIED",
                "application_reference": verified_by_key[entry.semantic_key].application_reference if entry.semantic_key in verified_by_key else None,
                "media_binding_state": "MEDIA_BOUND" if complete else "NOT_ATTEMPTED",
            }
            for entry in inventory.entries
        ],
    }


async def _verify_fresh_bindings(verified: tuple[VerifiedObject, ...]) -> int:
    from database.orm_session import session_factory

    expected = {item.entry.semantic_key: item for item in verified}
    async with session_factory()() as session:
        service = LearnerAssetService(MediaAssetRepository(session))
        cover = await service.resolve_course_asset(COURSE_ID, AssetRole.COURSE_COVER)
        if cover.url != expected[f"course:{COURSE_ID}:course_cover"].application_reference:
            raise PublicationError("fresh-session Course cover readback mismatch")
        resolved = 1
        lesson_by_vocabulary = {lesson.focus_vocabulary_id: lesson.lesson_id for lesson in LESSONS}
        for item in verified:
            entry = item.entry
            if entry.asset_role is AssetRole.COURSE_COVER:
                continue
            asset = await service.resolve_vocabulary_asset(
                COURSE_ID,
                lesson_by_vocabulary[entry.content_identity],
                entry.content_identity,
                entry.asset_role,
            )
            if asset.url != item.application_reference:
                raise PublicationError(f"fresh-session media readback mismatch: {entry.semantic_key}")
            resolved += 1
        return resolved


async def _remote_run(record_evidence: bool, execute_publication: bool) -> int:
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
            raise PublicationError("canonical shared application bucket is not public")
        counts = {action: sum(item.action is action for item in plan) for action in Action}
        print(" ".join(f"{action.value}={counts[action]}" for action in Action))
        if counts[Action.BLOCK_CONFLICT]:
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
                    binding = await OrmPublicationBindingAdapter(MediaAssetRepository(session)).bind_verified(verified)
            resolved = await _verify_fresh_bindings(verified)
            if resolved != EXPECTED_COUNT:
                raise PublicationError(f"fresh-session semantic resolution incomplete: {resolved}/{EXPECTED_COUNT}")
        finally:
            await close_orm()

        _, second_plan = await preflight(inventory, storage)
        second_counts = {action: sum(item.action is action for item in second_plan) for action in Action}
        if second_counts != {Action.UPLOAD_NEW: 0, Action.SKIP_ALREADY_MATCHES: EXPECTED_COUNT, Action.BLOCK_CONFLICT: 0}:
            raise PublicationError("second preflight did not prove 0/11/0 idempotency")
        if record_evidence:
            PUBLICATION_PATH.write_text(
                json.dumps(publication_evidence(inventory, project_ref, plan, verified, binding, second_plan), indent=2) + "\n",
                encoding="utf-8",
            )
        print(
            f"REMOTE_VERIFIED={len(verified)} MEDIA_BOUND={resolved} "
            f"created={binding.created} updated={binding.updated} unchanged={binding.unchanged} "
            "SECOND_PREFLIGHT=0/11/0"
        )
        return 0
    finally:
        await storage.close()


def main() -> int:
    parser = argparse.ArgumentParser(description="LC10 canonical learner asset publication preflight")
    parser.add_argument("--remote-preflight", action="store_true")
    parser.add_argument("--publish", action="store_true")
    parser.add_argument("--record-evidence", action="store_true")
    args = parser.parse_args()
    if not args.remote_preflight and not args.publish:
        inventory = load_and_validate_inventory()
        print(f"prepared={len(inventory.entries)} local_valid={len(inventory.entries)}")
        return 0
    return asyncio.run(_remote_run(args.record_evidence, args.publish))


if __name__ == "__main__":
    raise SystemExit(main())
