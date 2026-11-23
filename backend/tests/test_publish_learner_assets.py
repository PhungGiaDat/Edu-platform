"""Focused LC10 publication behavior with in-memory adapters only."""

from __future__ import annotations

import hashlib
from pathlib import Path

import pytest
import httpx

from database.seed.prepare_learner_assets import PreparationInventory
from database.seed.publish_learner_assets import (
    Action,
    BindingResult,
    BucketInfo,
    CanonicalBucketMissing,
    PublicationError,
    OrmPublicationBindingAdapter,
    RemoteObject,
    load_and_validate_inventory,
    preflight,
    publish,
    SupabaseStorageAdapter,
)


class FakeStorage:
    def __init__(self, bucket=True, objects=None, corrupt_readback=False, fail_public=False):
        self.bucket = bucket
        self.objects = dict(objects or {})
        self.corrupt_readback = corrupt_readback
        self.fail_public = fail_public
        self.uploads = []

    async def get_bucket(self, bucket):
        return BucketInfo(bucket, True) if self.bucket else None

    async def download(self, bucket, path):
        value = self.objects.get((bucket, path))
        if self.corrupt_readback and self.uploads and value:
            return RemoteObject(b"corrupt", value.content_type)
        return value

    async def upload(self, bucket, path, data, content_type):
        self.uploads.append((bucket, path, data, content_type))
        self.objects[(bucket, path)] = RemoteObject(data, content_type)

    def application_reference(self, bucket, path):
        return f"https://assets.test/{bucket.name}/{path}"

    async def verify_application_reference(self, reference, expected):
        assert reference.startswith("https://assets.test/AR_models/")
        if self.fail_public:
            raise PublicationError("public application reference byte verification failed")


class FakeBindings:
    def __init__(self, fail=False, duplicates=False):
        self.fail = fail
        self.duplicates = duplicates
        self.calls = []

    async def bind_verified(self, objects):
        if self.duplicates:
            raise PublicationError("duplicate READY semantic media records")
        if self.fail:
            raise PublicationError("transaction rolled back")
        self.calls.append(objects)
        return BindingResult(created=len(objects), updated=0, unchanged=0)


class FakeMediaRepository:
    def __init__(self):
        self.cover = []
        self.media = []

    async def set_course_cover_url(self, course_id, public_url):
        self.cover.append((course_id, public_url))
        return "updated"

    async def upsert_ready_asset(self, values):
        self.media.append(values)
        return "created"


@pytest.fixture
def local_inventory(tmp_path):
    rows = []
    for index in range(11):
        data = f"asset-{index}".encode()
        output = tmp_path / f"asset-{index}.png"
        output.write_bytes(data)
        role = "course_cover" if index == 0 else ("vocabulary_illustration" if index % 2 else "pronunciation_audio")
        mime = "audio/wav" if role == "pronunciation_audio" else "image/png"
        rows.append({
            "semantic_key": f"course:test:{role}" if index == 0 else f"vocabulary:v{index}:{role}",
            "content_identity": "test" if index == 0 else f"v{index}",
            "asset_role": role,
            "media_type": "audio" if mime == "audio/wav" else "image",
            "source_classification": "existing_file",
            "source_path": None,
            "source_sha256": None,
            "output_path": output.name,
            "bucket": "AR_models",
            "object_path": f"courses/test/{output.name}",
            "mime_type": mime,
            "byte_size": len(data),
            "sha256": hashlib.sha256(data).hexdigest(),
            "validation_status": "READY_FOR_UPLOAD",
            "technical_validation": "TECHNICALLY_VALID",
            "content_validation": "CONTENT_VALIDATED",
            "preparation_method": "test",
        })
    path = tmp_path / "prepared.json"
    path.write_text(PreparationInventory(input_manifest="manifest.json", entries=tuple(rows)).model_dump_json(), encoding="utf-8")
    return load_and_validate_inventory(path, tmp_path), tmp_path


def _remote(entry, data=None, mime=None):
    return RemoteObject(data if data is not None else f"asset-{entry.content_identity.removeprefix('v')}".encode(), mime or entry.mime_type)


def test_ready_inventory_is_accepted(local_inventory):
    inventory, _ = local_inventory
    assert len(inventory.entries) == 11


def test_non_ready_entry_is_rejected(local_inventory, tmp_path):
    inventory, root = local_inventory
    changed = inventory.model_copy(update={"entries": (inventory.entries[0].model_copy(update={"validation_status": "BLOCKED"}),) + inventory.entries[1:]})
    path = tmp_path / "bad.json"; path.write_text(changed.model_dump_json(), encoding="utf-8")
    with pytest.raises(PublicationError, match="non-ready"):
        load_and_validate_inventory(path, root)


@pytest.mark.asyncio
async def test_missing_bucket_blocks_before_object_reads(local_inventory):
    inventory, _ = local_inventory; storage = FakeStorage(bucket=False)
    with pytest.raises(CanonicalBucketMissing): await preflight(inventory, storage)


@pytest.mark.asyncio
async def test_supabase_400_bucket_not_found_is_canonical_missing():
    async def handler(request):
        return httpx.Response(400, json={"message": "Bucket not found"}, request=request)
    async with httpx.AsyncClient(transport=httpx.MockTransport(handler)) as client:
        storage = SupabaseStorageAdapter("https://project.test", "secret", client)
        assert await storage.get_bucket("AR_models") is None


@pytest.mark.asyncio
async def test_missing_remote_plans_upload_new(local_inventory):
    inventory, _ = local_inventory
    _, plan = await preflight(inventory, FakeStorage())
    assert {item.action for item in plan} == {Action.UPLOAD_NEW}


@pytest.mark.asyncio
async def test_matching_remote_plans_skip(local_inventory):
    inventory, _ = local_inventory
    objects = {(e.bucket, e.object_path): RemoteObject(f"asset-{i}".encode(), e.mime_type) for i, e in enumerate(inventory.entries)}
    _, plan = await preflight(inventory, FakeStorage(objects=objects))
    assert {item.action for item in plan} == {Action.SKIP_ALREADY_MATCHES}


@pytest.mark.asyncio
@pytest.mark.parametrize("difference", ["bytes", "mime"])
async def test_differing_remote_plans_conflict(local_inventory, difference):
    inventory, _ = local_inventory; entry = inventory.entries[0]
    remote = RemoteObject(b"different", entry.mime_type) if difference == "bytes" else RemoteObject(b"asset-0", "text/plain")
    _, plan = await preflight(inventory, FakeStorage(objects={(entry.bucket, entry.object_path): remote}))
    assert plan[0].action is Action.BLOCK_CONFLICT


@pytest.mark.asyncio
async def test_conflict_prevents_every_upload_and_binding(local_inventory):
    inventory, root = local_inventory; entry = inventory.entries[-1]
    storage = FakeStorage(objects={(entry.bucket, entry.object_path): RemoteObject(b"conflict", entry.mime_type)}); bindings = FakeBindings()
    with pytest.raises(PublicationError, match="conflicts"): await publish(inventory, storage, bindings, root)
    assert storage.uploads == [] and bindings.calls == []


@pytest.mark.asyncio
async def test_upload_uses_exact_path_bytes_and_mime(local_inventory):
    inventory, root = local_inventory; storage = FakeStorage(); bindings = FakeBindings()
    await publish(inventory, storage, bindings, root)
    first = inventory.entries[0]
    assert storage.uploads[0] == (first.bucket, first.object_path, (root / first.output_path).read_bytes(), first.mime_type)


@pytest.mark.asyncio
async def test_readback_mismatch_prevents_binding(local_inventory):
    inventory, root = local_inventory; storage = FakeStorage(corrupt_readback=True); bindings = FakeBindings()
    with pytest.raises(PublicationError, match="readback mismatch"): await publish(inventory, storage, bindings, root)
    assert bindings.calls == []


@pytest.mark.asyncio
async def test_public_reference_mismatch_prevents_binding(local_inventory):
    inventory, root = local_inventory; bindings = FakeBindings()
    with pytest.raises(PublicationError, match="public application reference"):
        await publish(inventory, FakeStorage(fail_public=True), bindings, root)
    assert bindings.calls == []


@pytest.mark.asyncio
async def test_binding_receives_only_fully_verified_batch(local_inventory):
    inventory, root = local_inventory; bindings = FakeBindings()
    verified = await publish(inventory, FakeStorage(), bindings, root)
    assert len(verified) == 11 and bindings.calls == [verified]


@pytest.mark.asyncio
async def test_binding_transaction_failure_never_claims_success(local_inventory):
    inventory, root = local_inventory
    with pytest.raises(PublicationError, match="rolled back"):
        await publish(inventory, FakeStorage(), FakeBindings(fail=True), root)


@pytest.mark.asyncio
async def test_retry_skips_previously_uploaded_matching_objects(local_inventory):
    inventory, root = local_inventory; storage = FakeStorage()
    await publish(inventory, storage, FakeBindings(), root); storage.uploads.clear()
    await publish(inventory, storage, FakeBindings(), root)
    assert storage.uploads == []


@pytest.mark.asyncio
async def test_binding_idempotency_is_delegated_once_per_complete_batch(local_inventory):
    inventory, root = local_inventory; storage = FakeStorage(); bindings = FakeBindings()
    await publish(inventory, storage, bindings, root)
    assert len(bindings.calls) == 1 and len(bindings.calls[0]) == 11


@pytest.mark.asyncio
async def test_duplicate_ready_records_are_rejected(local_inventory):
    inventory, root = local_inventory
    with pytest.raises(PublicationError, match="duplicate READY"):
        await publish(inventory, FakeStorage(), FakeBindings(duplicates=True), root)


@pytest.mark.asyncio
async def test_orm_binding_uses_course_cover_and_ten_focus_lesson_media_records(local_inventory):
    inventory, root = local_inventory
    verified = await publish(inventory, FakeStorage(), FakeBindings(), root)
    repository = FakeMediaRepository()
    adapter = OrmPublicationBindingAdapter(repository)
    adapter.lesson_by_vocabulary = {f"v{index}": f"lesson-{index}" for index in range(1, 11)}
    result = await adapter.bind_verified(verified)
    assert len(repository.cover) == 1
    assert len(repository.media) == 10
    assert all(row["section_id"] == "vocabulary" and row["bucket"] == "AR_models" for row in repository.media)
    assert {row["lesson_id"] for row in repository.media} == {f"lesson-{index}" for index in range(1, 11)}
    assert result == BindingResult(created=10, updated=1, unchanged=0)


def test_non_learner_ar_role_is_rejected_before_remote_access(local_inventory, tmp_path):
    inventory, root = local_inventory
    data = inventory.model_dump(mode="json"); data["entries"][0]["asset_role"] = "reference_image"
    path = tmp_path / "ar.json"; path.write_text(__import__("json").dumps(data), encoding="utf-8")
    with pytest.raises(Exception): load_and_validate_inventory(path, root)


def test_module_has_no_progress_or_reward_persistence_path():
    source = Path(__import__("database.seed.publish_learner_assets", fromlist=["x"]).__file__).read_text(encoding="utf-8")
    for forbidden in ("user_course_progress", "lesson_sessions", "gamification", "reward"):
        assert forbidden not in source
