# Shared Mind Persistent Viewer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a 3D-only MindAR flow that loads one versioned lesson catalog once, scans the second QR from the viewer's existing camera stream, and activates both cards without remounting the iframe or restarting MindAR.

**Architecture:** `animals-v2.mind` is compiled from an ordered checked-in manifest and each flashcard carries an explicit `mind_catalog_id` plus `mind_target_index`. After the first QR resolves, one persistent viewer owns the camera, pre-creates every MindAR anchor, and receives complete revisioned active-target snapshots; Add card performs QR decoding against the existing video and never changes the viewer URL. Combo lookup uses `arTag`, UI uses `slotIndex`, MindAR uses `mindTargetIndex`, and all catalog/model failures are bounded and 3D-fatal without automatic 2D recovery.

**Tech Stack:** FastAPI, Beanie/Pydantic v2, MongoDB, React 18, TypeScript 5.8, Vitest 3, jsdom, A-Frame 1.4.2, MindAR 1.2.5, MessagePack, jsQR 1.4.0, Playwright.

## Global Constraints

- Implement only the web/backend AR flow; do not modify `mobile/unity`, session-break, RAG, or unrelated files.
- Work on `MindAR-Update`; preserve commit `6787d72` and the verified bootstrap watchdog.
- Use one immutable `.mind` per lesson catalog. For this rollout use catalog ID `animals-v2` with `elephant_marker_01` at index `0` and `shiba_marker_01` at index `1`.
- Do not reuse or overwrite the unmanifested five-target `animals.mind` object.
- Adding card two must not change the viewer iframe `src`, React key, camera stream, or MindAR scene.
- The standalone scanner may own the camera only before the first card. Add card scanning must reuse the persistent viewer's video and must not call `getUserMedia`.
- Keep `arTag`, `mindTargetIndex`, and `slotIndex` as separate fields in every frontend boundary.
- `maxTrack` is `2` from the first viewer bootstrap.
- `SET_ACTIVE_TARGETS` always sends the complete desired set and a monotonically increasing revision.
- Do not use runtime `.mind` merging, `MIND_BUFFER`, pair-specific combo `.mind` files, or `target_order` for new tracking behavior.
- No automatic 2D fallback. Explicit user-selected Learn/2D mode may remain, but model errors never select it.
- MongoDB migration is dry-run by default, uses exact mappings and compare-and-set filters, and never infers mappings with regex.
- Feature flag name is `VITE_PERSISTENT_MIND_VIEWER`; it is enabled only on the Render/Vercel test branch until both physical scan orders pass.
- Use `npm.cmd` from PowerShell. Run backend tests with the repository Python environment available to the executor.

---

## File Structure

### Catalog build and validation

- Create `frontend-web/public/assets/target/catalogs/animals-v2.sources.json` — ordered compiler inputs.
- Generate `frontend-web/public/assets/target/catalogs/animals-v2.mind` — immutable compiled artifact.
- Generate `frontend-web/public/assets/target/catalogs/animals-v2.manifest.json` — runtime/build contract with SHA-256.
- Create `frontend-web/scripts/buildMindCatalog.cjs` — deterministic compiler and manifest writer.
- Create `frontend-web/src/__tests__/mindCatalogContract.test.ts` — verifies artifact, manifest, lesson, and seed agreement.
- Modify `frontend-web/package.json` and `frontend-web/package-lock.json` — pin compiler/runtime QR dependencies and add catalog commands.

### Backend catalog contract and data repair

- Modify `backend/models/ar_object.py` — catalog fields and complete-triple validation.
- Modify `backend/models/ar_experience.py` only if response typing requires forward-compatible optional fields during migration.
- Modify `backend/database/seed/ar_objects.json` — animal rows use the shared versioned catalog and explicit indices.
- Modify `backend/database/seed/lessons.json` — `animals_001` references `animals-v2` and the same target map.
- Create `backend/database/migrations/backfill_ar_mind_catalog.py` — dry-run exact backfill.
- Create `backend/tests/test_ar_object_catalog_schema.py` — schema validation.
- Modify `backend/tests/test_flashcard_ar_response.py` — public response regression.
- Create `backend/tests/test_backfill_ar_mind_catalog.py` — migration safety.

### Frontend contracts and persistent lifecycle

- Create `frontend-web/src/components/ar/arCatalogContract.ts` — manifest parsing, catalog/card validation, and 3D preflight.
- Create `frontend-web/src/components/ar/activeTargetRevision.ts` — pure revision state transitions.
- Create `frontend-web/src/__tests__/arCatalogContract.test.ts` — manifest/card/model fail-fast tests.
- Create `frontend-web/src/__tests__/activeTargetRevision.test.ts` — stale/ack/reject behavior.
- Modify `frontend-web/src/core/types/ARMessages.ts` — protocol and identity types.
- Create `frontend-web/public/static/vendor/jsQR-1.4.0.min.js` — local QR decoder copied from the pinned package.
- Create `frontend-web/public/static/ar-assets/js/ar-add-card-scanner.js` — scans the existing viewer video.
- Create `frontend-web/src/__tests__/arAddCardScanner.test.ts` — scanner lifecycle without `getUserMedia`.
- Create `frontend-web/public/static/ar-assets/js/ar-target-registry.js` — pure slot/target/tag registry.
- Create `frontend-web/src/__tests__/arTargetRegistry.test.ts` — identity and revision validation.
- Modify `frontend-web/public/ar-viewer.html` — load local QR/registry scripts before the viewer runtime.
- Modify `frontend-web/public/static/ar-assets/js/ar-viewer.js` — pre-create catalog anchors, apply target revisions, scan Add card QR, and emit triple identities.
- Modify `frontend-web/src/components/ar/ARContainerV2.tsx` — stable viewer URL/key, revision transport, and Add card commands.
- Create `frontend-web/src/__tests__/ARContainerV2.persistentViewer.test.tsx` — iframe lifecycle regression.
- Modify `frontend-web/src/hooks/useMultiFlashcard.ts` — store catalog fields and remove combo asset probing from target selection.
- Modify `frontend-web/src/pages/LearnARV2.tsx` — Add card becomes a VIEWING sub-state; remove runtime merge and combo mind selection.
- Delete `frontend-web/src/utils/mergeMindTargets.ts` after all imports are removed.
- Delete `frontend-web/src/utils/mindTargetMerge.test.ts` after replacement coverage passes.

### End-to-end verification

- Create `frontend-web/e2e/persistent-mind-viewer.spec.ts` — mocked mobile lifecycle in both scan orders.
- Modify `frontend-web/src/__tests__/arViewerBootstrapContract.test.ts` — local vendor, one bootstrap, and no fallback contract.
- Create `docs/report/AR_PERSISTENT_VIEWER_TEST_RUNBOOK.md` — exact test-branch and physical-iPhone evidence checklist.

---

### Task 1: Build and lock the versioned animal catalog

**Files:**
- Create: `frontend-web/public/assets/target/catalogs/animals-v2.sources.json`
- Create: `frontend-web/scripts/buildMindCatalog.cjs`
- Generate: `frontend-web/public/assets/target/catalogs/animals-v2.mind`
- Generate: `frontend-web/public/assets/target/catalogs/animals-v2.manifest.json`
- Create: `frontend-web/src/__tests__/mindCatalogContract.test.ts`
- Modify: `frontend-web/package.json`
- Modify: `frontend-web/package-lock.json`

**Interfaces:**
- Consumes: marker images `/assets/flashcards/ele123_card.png` and `/assets/flashcards/shiba_dog.jpg`.
- Produces: `MindCatalogManifest` JSON with `catalogId`, `mindUrl`, `targetCount`, `sha256`, and ordered targets.

- [ ] **Step 1: Add the ordered source manifest**

```json
{
  "schemaVersion": 1,
  "catalogId": "animals-v2",
  "mindUrl": "/assets/target/catalogs/animals-v2.mind",
  "targets": [
    {
      "arTag": "elephant_marker_01",
      "mindTargetIndex": 0,
      "markerImage": "/assets/flashcards/ele123_card.png"
    },
    {
      "arTag": "shiba_marker_01",
      "mindTargetIndex": 1,
      "markerImage": "/assets/flashcards/shiba_dog.jpg"
    }
  ]
}
```

- [ ] **Step 2: Write the failing artifact contract test**

```ts
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { decode } from '@msgpack/msgpack';
import { describe, expect, it } from 'vitest';

const root = resolve('public/assets/target/catalogs');
const sources = JSON.parse(readFileSync(resolve(root, 'animals-v2.sources.json'), 'utf8'));
const manifest = JSON.parse(readFileSync(resolve(root, 'animals-v2.manifest.json'), 'utf8'));
const mindBytes = readFileSync(resolve(root, 'animals-v2.mind'));
const decoded = decode(mindBytes) as { v: number; dataList: unknown[] };

describe('animals-v2 MindAR catalog', () => {
  it('preserves the explicit tag/index map', () => {
    expect(manifest.targets).toEqual(sources.targets.map((target: any) => ({
      arTag: target.arTag,
      mindTargetIndex: target.mindTargetIndex,
    })));
    expect(manifest.targetCount).toBe(2);
  });

  it('matches the compiled artifact', () => {
    expect(decoded.v).toBe(2);
    expect(decoded.dataList).toHaveLength(manifest.targetCount);
    expect(createHash('sha256').update(mindBytes).digest('hex')).toBe(manifest.sha256);
  });
});
```

- [ ] **Step 3: Run the contract test and confirm RED**

Run: `cd frontend-web; npm.cmd test -- src/__tests__/mindCatalogContract.test.ts`

Expected: FAIL because `animals-v2.manifest.json` and `animals-v2.mind` do not exist.

- [ ] **Step 4: Pin compiler dependencies and add scripts**

Run: `cd frontend-web; npm.cmd install --save-dev mind-ar@1.2.5`

Add to `frontend-web/package.json`:

```json
{
  "scripts": {
    "ar:catalog:build": "node scripts/buildMindCatalog.cjs public/assets/target/catalogs/animals-v2.sources.json",
    "ar:catalog:verify": "vitest run src/__tests__/mindCatalogContract.test.ts"
  }
}
```

- [ ] **Step 5: Implement the deterministic compiler**

`buildMindCatalog.cjs` must validate contiguous indices before loading images, compile in array order, decode the output for count verification, calculate SHA-256, and write the `.mind` plus manifest atomically:

```js
const { Compiler } = require('mind-ar/dist/mindar-image.prod.js');
const { decode } = require('@msgpack/msgpack');
const { createCanvas, loadImage } = require('canvas');
const { createHash } = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

async function build(sourcePath) {
  const absoluteSource = path.resolve(sourcePath);
  const source = JSON.parse(fs.readFileSync(absoluteSource, 'utf8'));
  const publicRoot = path.resolve(__dirname, '..', 'public');
  const expected = source.targets.map((target, index) => index);
  const actual = source.targets.map((target) => target.mindTargetIndex);
  if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error('mindTargetIndex must be contiguous from zero');
  if (new Set(source.targets.map((target) => target.arTag)).size !== source.targets.length) throw new Error('arTag values must be unique');

  const imageDataList = [];
  for (const target of source.targets) {
    const imagePath = path.resolve(publicRoot, target.markerImage.replace(/^\//, ''));
    if (!fs.existsSync(imagePath)) throw new Error(`marker image not found: ${imagePath}`);
    const image = await loadImage(imagePath);
    const canvas = createCanvas(image.width, image.height);
    const context = canvas.getContext('2d');
    context.drawImage(image, 0, 0);
    imageDataList.push(context.getImageData(0, 0, image.width, image.height));
  }

  const compiler = new Compiler();
  await compiler.compileImageTargets(imageDataList, () => undefined);
  const bytes = Buffer.from(await compiler.exportData());
  const decoded = decode(bytes);
  if (decoded.v !== 2 || decoded.dataList.length !== source.targets.length) throw new Error('compiled MindAR output does not match source manifest');

  const outputPath = path.resolve(publicRoot, source.mindUrl.replace(/^\//, ''));
  const manifestPath = outputPath.replace(/\.mind$/, '.manifest.json');
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(`${outputPath}.tmp`, bytes);
  fs.renameSync(`${outputPath}.tmp`, outputPath);
  const manifest = {
    schemaVersion: source.schemaVersion,
    catalogId: source.catalogId,
    mindUrl: source.mindUrl,
    targetCount: source.targets.length,
    sha256: createHash('sha256').update(bytes).digest('hex'),
    targets: source.targets.map(({ arTag, mindTargetIndex }) => ({ arTag, mindTargetIndex }))
  };
  fs.writeFileSync(`${manifestPath}.tmp`, `${JSON.stringify(manifest, null, 2)}\n`);
  fs.renameSync(`${manifestPath}.tmp`, manifestPath);
}

build(process.argv[2]).catch((error) => { console.error(error); process.exitCode = 1; });
```

- [ ] **Step 6: Generate and verify the catalog**

Run: `cd frontend-web; npm.cmd run ar:catalog:build`

Expected: exit `0`; both generated files exist.

Run: `cd frontend-web; npm.cmd run ar:catalog:verify`

Expected: both catalog tests PASS.

- [ ] **Step 7: Commit the catalog boundary**

```bash
git add frontend-web/package.json frontend-web/package-lock.json frontend-web/scripts/buildMindCatalog.cjs frontend-web/public/assets/target/catalogs frontend-web/src/__tests__/mindCatalogContract.test.ts
git commit -m "feat(ar): add versioned animal mind catalog"
```

---

### Task 2: Add the backend catalog identity contract

**Files:**
- Modify: `backend/models/ar_object.py`
- Modify: `backend/tests/test_flashcard_ar_response.py`
- Create: `backend/tests/test_ar_object_catalog_schema.py`

**Interfaces:**
- Consumes: `catalogId=animals-v2`, URL `/assets/target/catalogs/animals-v2.mind`, and non-negative target indices.
- Produces: API fields `mind_catalog_id: str | null` and `mind_target_index: int | null` during the legacy migration window; create requests require a complete catalog triple.

- [ ] **Step 1: Write failing schema tests**

```python
import pytest
from pydantic import ValidationError
from models.ar_object import ARObjectCreate, ARObjectUpdate

BASE = {
    "ar_tag": "elephant_marker_01",
    "description": "Elephant",
    "nft_base_url": "/assets/target/catalogs/animals-v2.mind",
    "model_3d_url": "/assets/models/elephant.glb",
    "image_2d_url": "/assets/images/elephant.png",
}

def test_create_requires_catalog_identity():
    with pytest.raises(ValidationError):
        ARObjectCreate(**BASE)

def test_create_rejects_negative_target_index():
    with pytest.raises(ValidationError):
        ARObjectCreate(**BASE, mind_catalog_id="animals-v2", mind_target_index=-1)

def test_update_rejects_partial_catalog_identity():
    with pytest.raises(ValidationError):
        ARObjectUpdate(mind_catalog_id="animals-v2")
```

- [ ] **Step 2: Extend the HTTP 200 regression**

Add to `_elephant_ar_object()`:

```python
"mind_catalog_id": "animals-v2",
"mind_target_index": 0,
```

Add assertions:

```python
target = response.json()["target"]
assert target["mind_catalog_id"] == "animals-v2"
assert target["mind_target_index"] == 0
assert target["nft_base_url"] == "https://assets.example.com/elephant.mind"
```

- [ ] **Step 3: Run focused backend tests and confirm RED**

Run: `cd backend; python -m pytest tests/test_ar_object_catalog_schema.py tests/test_flashcard_ar_response.py -q`

Expected: schema tests FAIL because catalog fields are not defined.

- [ ] **Step 4: Implement complete-triple validation**

Use optional document/response fields only to read legacy Mongo rows during rollout. Require fields for new creates and validate update pairs:

```python
from pydantic import BaseModel, Field, model_validator

class ARObject(Document):
    # existing fields remain unchanged
    mind_catalog_id: Optional[str] = None
    mind_target_index: Optional[int] = Field(default=None, ge=0)

class ARObjectCreate(BaseModel):
    # existing fields remain unchanged
    mind_catalog_id: str = Field(min_length=1)
    mind_target_index: int = Field(ge=0)

class ARObjectUpdate(BaseModel):
    # existing fields remain unchanged
    mind_catalog_id: Optional[str] = Field(default=None, min_length=1)
    mind_target_index: Optional[int] = Field(default=None, ge=0)

    @model_validator(mode="after")
    def validate_catalog_pair(self):
        supplied = {"mind_catalog_id", "mind_target_index"} & self.model_fields_set
        if supplied and supplied != {"mind_catalog_id", "mind_target_index"}:
            raise ValueError("mind_catalog_id and mind_target_index must be updated together")
        if supplied and (not self.mind_catalog_id or self.mind_target_index is None):
            raise ValueError("catalog identity cannot be cleared with null values")
        return self
```

Add the same optional fields to `ARObjectResponse` and `ArObjectSchema`.

- [ ] **Step 5: Run focused backend tests**

Run: `cd backend; python -m pytest tests/test_ar_object_catalog_schema.py tests/test_flashcard_ar_response.py -q`

Expected: all focused tests PASS and the combo response still excludes `id`/`_id`.

- [ ] **Step 6: Commit the API contract**

```bash
git add backend/models/ar_object.py backend/tests/test_ar_object_catalog_schema.py backend/tests/test_flashcard_ar_response.py
git commit -m "feat(ar): expose mind catalog identity"
```

---

### Task 3: Backfill exact catalog mappings safely

**Files:**
- Modify: `backend/database/seed/ar_objects.json`
- Modify: `backend/database/seed/lessons.json`
- Create: `backend/database/migrations/backfill_ar_mind_catalog.py`
- Create: `backend/tests/test_backfill_ar_mind_catalog.py`
- Modify: `frontend-web/src/__tests__/mindCatalogContract.test.ts`

**Interfaces:**
- Consumes: exact mapping `{elephant_marker_01: 0, shiba_marker_01: 1}`.
- Produces: `build_operations(documents) -> list[CatalogRepair]` and CLI dry-run/apply behavior.

- [ ] **Step 1: Write failing migration safety tests**

```python
from database.migrations.backfill_ar_mind_catalog import build_operations, parse_args

def test_dry_run_is_default():
    assert parse_args([]).apply is False

def test_builds_only_exact_animal_repairs():
    docs = [
        {"ar_tag": "elephant_marker_01", "nft_base_url": "https://rofprrtoeyirssfndxag.supabase.co/storage/v1/object/public/AR_models/assets/mind-files/elephant_targets.mind"},
        {"ar_tag": "shiba_marker_01", "nft_base_url": "https://rofprrtoeyirssfndxag.supabase.co/storage/v1/object/public/AR_models/assets/mind-files/shiba_targets.mind"},
        {"ar_tag": "cat_marker_01", "nft_base_url": "cat.mind"},
    ]
    operations = build_operations(docs)
    assert [(op.ar_tag, op.mind_target_index) for op in operations] == [
        ("elephant_marker_01", 0),
        ("shiba_marker_01", 1),
    ]

def test_unknown_existing_catalog_is_not_overwritten():
    docs = [{
        "ar_tag": "elephant_marker_01",
        "nft_base_url": "unexpected.mind",
        "mind_catalog_id": "another-v3",
        "mind_target_index": 4,
    }]
    assert build_operations(docs) == []
```

- [ ] **Step 2: Run migration tests and confirm RED**

Run: `cd backend; python -m pytest tests/test_backfill_ar_mind_catalog.py -q`

Expected: FAIL because the migration module does not exist.

- [ ] **Step 3: Implement exact compare-and-set repairs**

```python
from dataclasses import dataclass
import argparse

CATALOG_ID = "animals-v2"
MIND_URL = "/assets/target/catalogs/animals-v2.mind"
INDEX_BY_TAG = {"elephant_marker_01": 0, "shiba_marker_01": 1}
ALLOWED_LEGACY_URLS = {
    "elephant_marker_01": {
        "https://rofprrtoeyirssfndxag.supabase.co/storage/v1/object/public/AR_models/assets/mind-files/elephant_targets.mind",
        "https://rofprrtoeyirssfndxag.supabase.co/storage/v1/object/public/AR_models/mind-files/animals.mind",
    },
    "shiba_marker_01": {
        "https://rofprrtoeyirssfndxag.supabase.co/storage/v1/object/public/AR_models/assets/mind-files/shiba_targets.mind",
        "https://rofprrtoeyirssfndxag.supabase.co/storage/v1/object/public/AR_models/mind-files/animals.mind",
    },
}

@dataclass(frozen=True)
class CatalogRepair:
    ar_tag: str
    old_mind_url: str
    mind_target_index: int

def build_operations(documents):
    repairs = []
    for doc in documents:
        tag = doc.get("ar_tag")
        if tag not in INDEX_BY_TAG:
            continue
        if doc.get("mind_catalog_id") == CATALOG_ID and doc.get("mind_target_index") == INDEX_BY_TAG[tag] and doc.get("nft_base_url") == MIND_URL:
            continue
        if doc.get("mind_catalog_id") not in (None, "") or doc.get("nft_base_url") not in ALLOWED_LEGACY_URLS[tag]:
            continue
        repairs.append(CatalogRepair(tag, doc.get("nft_base_url", ""), INDEX_BY_TAG[tag]))
    return repairs

def parse_args(argv=None):
    parser = argparse.ArgumentParser()
    parser.add_argument("--apply", action="store_true")
    return parser.parse_args(argv)
```

The apply path must call `update_one` with this filter and require `matched_count == 1`:

```python
filter_doc = {
    "ar_tag": repair.ar_tag,
    "nft_base_url": repair.old_mind_url,
    "$or": [{"mind_catalog_id": {"$exists": False}}, {"mind_catalog_id": None}, {"mind_catalog_id": ""}],
}
update_doc = {"$set": {
    "nft_base_url": MIND_URL,
    "mind_catalog_id": CATALOG_ID,
    "mind_target_index": repair.mind_target_index,
}}
```

- [ ] **Step 4: Update seeds to the exact catalog contract**

For the elephant and shiba rows in `ar_objects.json`, set:

```json
"nft_base_url": "/assets/target/catalogs/animals-v2.mind",
"mind_catalog_id": "animals-v2",
"mind_target_index": 0
```

Use index `1` for shiba. In `lessons.json`, set the `animals_001.mind_file_url` to `/assets/target/catalogs/animals-v2.mind`, add `mind_catalog_id: "animals-v2"`, and preserve the exact `target_map` of elephant `0`, shiba `1`.

- [ ] **Step 5: Extend the catalog test to compare backend seeds**

```ts
const lessonRows = JSON.parse(readFileSync(resolve('../backend/database/seed/lessons.json'), 'utf8'));
const objectRows = JSON.parse(readFileSync(resolve('../backend/database/seed/ar_objects.json'), 'utf8'));

it('matches lesson and AR object seeds', () => {
  const lesson = lessonRows.find((row: any) => row.lesson_id === 'animals_001');
  expect(lesson.mind_catalog_id).toBe(manifest.catalogId);
  expect(lesson.mind_file_url).toBe(manifest.mindUrl);
  for (const target of manifest.targets) {
    const row = objectRows.find((candidate: any) => candidate.ar_tag === target.arTag);
    expect(row).toMatchObject({
      nft_base_url: manifest.mindUrl,
      mind_catalog_id: manifest.catalogId,
      mind_target_index: target.mindTargetIndex,
    });
  }
});
```

- [ ] **Step 6: Verify tests and dry-run**

Run: `cd backend; python -m pytest tests/test_backfill_ar_mind_catalog.py -q`

Expected: PASS.

Run: `cd frontend-web; npm.cmd run ar:catalog:verify`

Expected: PASS.

Run against the configured test database only: `cd backend; python -m database.migrations.backfill_ar_mind_catalog`

Expected: prints exactly reviewed operations and `DRY RUN: no data changed`.

- [ ] **Step 7: Commit migration and seed alignment**

```bash
git add backend/database/seed/ar_objects.json backend/database/seed/lessons.json backend/database/migrations/backfill_ar_mind_catalog.py backend/tests/test_backfill_ar_mind_catalog.py frontend-web/src/__tests__/mindCatalogContract.test.ts
git commit -m "fix(ar): align animal catalog mappings"
```

---

### Task 4: Validate catalog cards and required GLB assets in the parent

**Files:**
- Create: `frontend-web/src/components/ar/arCatalogContract.ts`
- Create: `frontend-web/src/__tests__/arCatalogContract.test.ts`

**Interfaces:**
- Produces: `loadMindCatalog(catalogId, signal)`, `validateCardForCatalog(card, manifest)`, and `preflightRequiredGlb(url, signal)`.

- [ ] **Step 1: Write failing validation and preflight tests**

```ts
import { describe, expect, it, vi } from 'vitest';
import { preflightRequiredGlb, validateCardForCatalog } from '@/components/ar/arCatalogContract';

const manifest = {
  schemaVersion: 1,
  catalogId: 'animals-v2',
  mindUrl: '/assets/target/catalogs/animals-v2.mind',
  targetCount: 2,
  sha256: 'a'.repeat(64),
  targets: [
    { arTag: 'elephant_marker_01', mindTargetIndex: 0 },
    { arTag: 'shiba_marker_01', mindTargetIndex: 1 },
  ],
};

it('keeps slot identity separate from mind target index', () => {
  expect(validateCardForCatalog({
    arTag: 'shiba_marker_01', mindCatalogId: 'animals-v2', mindUrl: manifest.mindUrl, mindTargetIndex: 1,
  }, manifest)).toMatchObject({ arTag: 'shiba_marker_01', mindTargetIndex: 1 });
});

it('rejects a catalog mismatch', () => {
  expect(() => validateCardForCatalog({
    arTag: 'shiba_marker_01', mindCatalogId: 'animals-v3', mindUrl: manifest.mindUrl, mindTargetIndex: 1,
  }, manifest)).toThrow('MIND_CATALOG_MISMATCH');
});

it('rejects a non-GLB response without suggesting 2D', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('missing', { status: 404 })));
  await expect(preflightRequiredGlb('/missing.glb', new AbortController().signal))
    .rejects.toThrow('MODEL_ASSET_UNAVAILABLE');
});
```

- [ ] **Step 2: Run the test and confirm RED**

Run: `cd frontend-web; npm.cmd test -- src/__tests__/arCatalogContract.test.ts`

Expected: FAIL because the module does not exist.

- [ ] **Step 3: Implement typed validation**

```ts
export interface MindCatalogTarget { arTag: string; mindTargetIndex: number }
export interface MindCatalogManifest {
  schemaVersion: 1;
  catalogId: string;
  mindUrl: string;
  targetCount: number;
  sha256: string;
  targets: MindCatalogTarget[];
}
export interface CatalogCardIdentity extends MindCatalogTarget {
  mindCatalogId: string;
  mindUrl: string;
}

export function validateCardForCatalog(card: CatalogCardIdentity, manifest: MindCatalogManifest): MindCatalogTarget {
  if (card.mindCatalogId !== manifest.catalogId || card.mindUrl !== manifest.mindUrl) throw new Error('MIND_CATALOG_MISMATCH');
  const expected = manifest.targets.find((target) => target.arTag === card.arTag);
  if (!expected || expected.mindTargetIndex !== card.mindTargetIndex || card.mindTargetIndex >= manifest.targetCount) {
    throw new Error('MIND_TARGET_INDEX_INVALID');
  }
  return expected;
}
```

`loadMindCatalog` fetches `/assets/target/catalogs/${encodeURIComponent(catalogId)}.manifest.json`, validates schema version, contiguous unique indices, unique tags, SHA format, and non-empty URL. `preflightRequiredGlb` performs `GET` with `Range: bytes=0-3`, a 5-second composed abort signal, requires success, and verifies the first four bytes equal `glTF`.

- [ ] **Step 4: Run focused tests**

Run: `cd frontend-web; npm.cmd test -- src/__tests__/arCatalogContract.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit catalog validation**

```bash
git add frontend-web/src/components/ar/arCatalogContract.ts frontend-web/src/__tests__/arCatalogContract.test.ts
git commit -m "feat(ar): validate catalog card identities"
```

---

### Task 5: Add the revisioned active-target protocol

**Files:**
- Modify: `frontend-web/src/core/types/ARMessages.ts`
- Create: `frontend-web/src/components/ar/activeTargetRevision.ts`
- Create: `frontend-web/src/__tests__/activeTargetRevision.test.ts`

**Interfaces:**
- Produces: `ActiveViewerTarget`, new message payloads, `requestRevision`, `acknowledgeRevision`, and `rejectRevision`.

- [ ] **Step 1: Write failing revision tests**

```ts
import { describe, expect, it } from 'vitest';
import { acknowledgeRevision, initialRevisionState, requestRevision } from '@/components/ar/activeTargetRevision';

const elephant = { slotIndex: 0, mindTargetIndex: 0, arTag: 'elephant_marker_01', modelUrl: '/elephant.glb', word: 'elephant' };
const shiba = { slotIndex: 1, mindTargetIndex: 1, arTag: 'shiba_marker_01', modelUrl: '/shiba.glb', word: 'shiba dog' };

it('keeps the last acknowledged target set until the new revision is acknowledged', () => {
  const first = acknowledgeRevision(requestRevision(initialRevisionState, [elephant]), 1);
  const second = requestRevision(first, [elephant, shiba]);
  expect(second.desiredRevision).toBe(2);
  expect(second.acknowledgedTargets).toEqual([elephant]);
  expect(acknowledgeRevision(second, 2).acknowledgedTargets).toEqual([elephant, shiba]);
});

it('ignores a stale acknowledgement', () => {
  const state = requestRevision(requestRevision(initialRevisionState, [elephant]), [elephant, shiba]);
  expect(acknowledgeRevision(state, 1)).toBe(state);
});
```

- [ ] **Step 2: Run the tests and confirm RED**

Run: `cd frontend-web; npm.cmd test -- src/__tests__/activeTargetRevision.test.ts`

Expected: FAIL because the revision module does not exist.

- [ ] **Step 3: Define protocol identities**

Add to `ARMessages.ts`:

```ts
export interface ActiveViewerTarget {
  slotIndex: 0 | 1;
  mindTargetIndex: number;
  arTag: string;
  modelUrl: string;
  textureUrl?: string;
  word: string;
  position?: string;
  rotation?: string;
  scale?: string;
}
```

Add message types and exact payloads:

```ts
BEGIN_ADD_CARD_SCAN: { sessionId: string; excludedQrIds: string[]; timeoutMs: 15000 };
CANCEL_ADD_CARD_SCAN: { sessionId: string };
ADD_CARD_SCAN_STARTED: { sessionId: string };
ADD_CARD_SCAN_TIMEOUT: { sessionId: string };
SET_ACTIVE_TARGETS: { catalogId: string; revision: number; targets: ActiveViewerTarget[] };
ACTIVE_TARGETS_APPLIED: { catalogId: string; revision: number; targets: Array<Pick<ActiveViewerTarget, 'slotIndex' | 'mindTargetIndex' | 'arTag'>> };
ACTIVE_TARGETS_REJECTED: { catalogId: string; revision: number; code: string; stage: string; message: string };
```

Extend `TARGET_FOUND`, `TARGET_LOST`, and `MODEL_CLICKED` with required `slotIndex`, `mindTargetIndex`, and `arTag` in the persistent path.

- [ ] **Step 4: Implement the pure revision state**

```ts
import type { ActiveViewerTarget } from '@/core/types/ARMessages';

export interface ActiveTargetRevisionState {
  desiredRevision: number;
  desiredTargets: ActiveViewerTarget[];
  acknowledgedRevision: number;
  acknowledgedTargets: ActiveViewerTarget[];
  rejectedRevision: number | null;
}
export const initialRevisionState: ActiveTargetRevisionState = {
  desiredRevision: 0, desiredTargets: [], acknowledgedRevision: 0, acknowledgedTargets: [], rejectedRevision: null,
};
export const requestRevision = (state: ActiveTargetRevisionState, targets: ActiveViewerTarget[]): ActiveTargetRevisionState => ({
  ...state, desiredRevision: state.desiredRevision + 1, desiredTargets: targets, rejectedRevision: null,
});
export const acknowledgeRevision = (state: ActiveTargetRevisionState, revision: number): ActiveTargetRevisionState =>
  revision === state.desiredRevision
    ? { ...state, acknowledgedRevision: revision, acknowledgedTargets: state.desiredTargets, rejectedRevision: null }
    : state;
export const rejectRevision = (state: ActiveTargetRevisionState, revision: number): ActiveTargetRevisionState =>
  revision === state.desiredRevision ? { ...state, rejectedRevision: revision } : state;
```

- [ ] **Step 5: Run focused tests and type-check**

Run: `cd frontend-web; npm.cmd test -- src/__tests__/activeTargetRevision.test.ts`

Expected: PASS.

Run: `cd frontend-web; npm.cmd run build`

Expected: exit `0` or only failures caused by later protocol consumers, which must be fixed within this task before commit.

- [ ] **Step 6: Commit the protocol**

```bash
git add frontend-web/src/core/types/ARMessages.ts frontend-web/src/components/ar/activeTargetRevision.ts frontend-web/src/__tests__/activeTargetRevision.test.ts
git commit -m "feat(ar): add revisioned target protocol"
```

---

### Task 6: Vendor jsQR and scan Add card from the viewer video

**Files:**
- Modify: `frontend-web/package.json`
- Modify: `frontend-web/package-lock.json`
- Create: `frontend-web/public/static/vendor/jsQR-1.4.0.min.js`
- Create: `frontend-web/public/static/ar-assets/js/ar-add-card-scanner.js`
- Create: `frontend-web/src/__tests__/arAddCardScanner.test.ts`
- Modify: `frontend-web/public/ar-scanner.html`
- Modify: `frontend-web/public/ar-viewer.html`

**Interfaces:**
- Produces: `window.ARAddCardScanner.create(options)` with `start`, `cancel`, and `isScanning`.

- [ ] **Step 1: Pin and copy the local decoder**

Run: `cd frontend-web; npm.cmd install jsqr@1.4.0`

Copy `frontend-web/node_modules/jsqr/dist/jsQR.js` to `frontend-web/public/static/vendor/jsQR-1.4.0.min.js`. Add a `postinstall` script that runs a small Node copy command so clean installs reproduce the vendor file; the copy must fail if the pinned source is missing.

- [ ] **Step 2: Write the failing scanner behavior test**

Load the IIFE with `node:vm`, inject a fake video, fake canvas, fake decoder, and fake timers. Assert:

```ts
it('uses the supplied viewer video and never requests another camera', async () => {
  const getUserMedia = vi.fn();
  Object.defineProperty(navigator, 'mediaDevices', { value: { getUserMedia }, configurable: true });
  const scanner = createScannerHarness({ decode: () => ({ data: 'dog123' }) });
  scanner.start({ sessionId: 'session-1', excludedQrIds: ['ele123'], timeoutMs: 15000 });
  await vi.advanceTimersByTimeAsync(200);
  expect(getUserMedia).not.toHaveBeenCalled();
  expect(scanner.events).toContainEqual({ type: 'QR_DETECTED', qrId: 'dog123', sessionId: 'session-1' });
  expect(scanner.api.isScanning()).toBe(false);
});
```

Also test excluded QR IDs, cancellation, one terminal event, and the 15-second timeout.

- [ ] **Step 3: Run the test and confirm RED**

Run: `cd frontend-web; npm.cmd test -- src/__tests__/arAddCardScanner.test.ts`

Expected: FAIL because `ARAddCardScanner` is undefined.

- [ ] **Step 4: Implement the reusable scanner**

The IIFE stores one canvas/context, accepts `getVideo`, `decode`, `emit`, and `intervalMs`, and never accesses `navigator.mediaDevices`:

```js
(function (root) {
  function create({ getVideo, decode, emit, intervalMs = 150 }) {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d', { willReadFrequently: true });
    let timer = null;
    let deadlineTimer = null;
    let request = null;

    function cancel(reason = 'cancelled') {
      if (timer) clearTimeout(timer);
      if (deadlineTimer) clearTimeout(deadlineTimer);
      timer = null; deadlineTimer = null; request = null;
      return reason;
    }

    function tick() {
      if (!request) return;
      const video = getVideo();
      if (video && video.readyState >= video.HAVE_CURRENT_DATA && video.videoWidth > 0) {
        canvas.width = video.videoWidth; canvas.height = video.videoHeight;
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        const image = context.getImageData(0, 0, canvas.width, canvas.height);
        const result = decode(image.data, image.width, image.height, { inversionAttempts: 'dontInvert' });
        if (result?.data && !request.excludedQrIds.includes(result.data)) {
          const sessionId = request.sessionId;
          cancel('detected');
          emit({ type: 'QR_DETECTED', qrId: result.data, sessionId });
          return;
        }
      }
      timer = setTimeout(tick, intervalMs);
    }

    function start(nextRequest) {
      cancel('restart');
      request = { ...nextRequest, excludedQrIds: [...nextRequest.excludedQrIds] };
      emit({ type: 'ADD_CARD_SCAN_STARTED', sessionId: request.sessionId });
      deadlineTimer = setTimeout(() => {
        const sessionId = request?.sessionId;
        cancel('timeout');
        emit({ type: 'ADD_CARD_SCAN_TIMEOUT', sessionId });
      }, request.timeoutMs);
      tick();
    }

    return { start, cancel, isScanning: () => request !== null };
  }
  root.ARAddCardScanner = { create };
})(globalThis);
```

- [ ] **Step 5: Load the same local decoder in both HTML entry points**

Replace the jsDelivr jsQR tag in `ar-scanner.html` with:

```html
<script src="/static/vendor/jsQR-1.4.0.min.js"></script>
```

In the viewer bootstrap, load the local decoder and scanner before `ar-viewer.js`:

```js
await loadScript('/static/vendor/jsQR-1.4.0.min.js', 'jsqr', deadlineAt);
await loadScript('/static/ar-assets/js/ar-add-card-scanner.js', 'add-card-scanner', deadlineAt);
```

- [ ] **Step 6: Verify scanner tests and JavaScript parsing**

Run: `cd frontend-web; npm.cmd test -- src/__tests__/arAddCardScanner.test.ts`

Expected: PASS.

Run: `cd frontend-web; node --check public/static/ar-assets/js/ar-add-card-scanner.js`

Expected: exit `0`.

- [ ] **Step 7: Commit local single-camera scanning**

```bash
git add frontend-web/package.json frontend-web/package-lock.json frontend-web/public/static/vendor/jsQR-1.4.0.min.js frontend-web/public/static/ar-assets/js/ar-add-card-scanner.js frontend-web/public/ar-scanner.html frontend-web/public/ar-viewer.html frontend-web/src/__tests__/arAddCardScanner.test.ts
git commit -m "feat(ar): scan add-card qr from viewer camera"
```

---

### Task 7: Pre-create catalog anchors and bind revisioned slots

**Files:**
- Create: `frontend-web/public/static/ar-assets/js/ar-target-registry.js`
- Create: `frontend-web/src/__tests__/arTargetRegistry.test.ts`
- Modify: `frontend-web/public/ar-viewer.html`
- Modify: `frontend-web/public/static/ar-assets/js/ar-viewer.js`

**Interfaces:**
- Consumes: `SET_ACTIVE_TARGETS` messages and catalog query parameters `catalogId`, `targetCount`, `mind`.
- Produces: `ACTIVE_TARGETS_APPLIED/REJECTED` and target events containing the identity triple.

- [ ] **Step 1: Write failing registry tests**

```ts
it('maps scan slots independently from MindAR indices', () => {
  const registry = createRegistry({ catalogId: 'animals-v2', targetCount: 5 });
  const result = registry.apply({ catalogId: 'animals-v2', revision: 1, targets: [
    { slotIndex: 0, mindTargetIndex: 3, arTag: 'elephant_marker_01', modelUrl: '/elephant.glb', word: 'elephant' },
    { slotIndex: 1, mindTargetIndex: 0, arTag: 'cat_marker_01', modelUrl: '/cat.glb', word: 'cat' },
  ]});
  expect(result.byMindTargetIndex.get(3).slotIndex).toBe(0);
  expect(result.byMindTargetIndex.get(0).slotIndex).toBe(1);
});

it('rejects duplicate slots, duplicate target indices, out-of-range indices, catalog mismatch, and stale revisions', () => {
  expect(() => registry.apply(invalidDuplicateSlot)).toThrow('ACTIVE_TARGETS_INVALID');
  expect(() => registry.apply(staleRevision)).toThrow('ACTIVE_TARGETS_STALE');
});
```

- [ ] **Step 2: Run the test and confirm RED**

Run: `cd frontend-web; npm.cmd test -- src/__tests__/arTargetRegistry.test.ts`

Expected: FAIL because the registry script does not exist.

- [ ] **Step 3: Implement a pure registry**

`ar-target-registry.js` exposes `create({catalogId, targetCount})`. `apply(snapshot)` validates catalog ID, strictly increasing revision, target count `1..2`, unique slots, unique indices, index bounds, non-empty tag/model URL, and returns maps keyed by slot, target index, and tag. It commits internal revision only after all validation succeeds.

- [ ] **Step 4: Pre-create anchors before MindAR initialization**

Replace sequential `ensureDynamicTargets()` with:

```js
function ensureCatalogAnchors(targetCount) {
  for (let mindTargetIndex = 0; mindTargetIndex < targetCount; mindTargetIndex += 1) {
    let anchor = document.getElementById(`mind-target-${mindTargetIndex}`);
    if (!anchor) {
      anchor = document.createElement('a-entity');
      anchor.id = `mind-target-${mindTargetIndex}`;
      anchor.setAttribute('mindar-image-target', `targetIndex: ${mindTargetIndex}`);
      anchor.setAttribute('visible', 'true');
      scene.appendChild(anchor);
    }
  }
}
```

Call it after catalog query validation and before setting/starting the MindAR scene. Remove hardcoded `target-0` and `target-1` anchors from `ar-viewer.html` so there is one source of anchor creation.

- [ ] **Step 5: Apply full target snapshots**

Implement `applyActiveTargets(payload)` to validate through the registry, load every required GLB, place `slot-model-{slotIndex}` beneath `mind-target-{mindTargetIndex}`, remove slot content not present in the new snapshot, and emit `ACTIVE_TARGETS_APPLIED` only after all `model-loaded` promises resolve. Any asset error emits `ACTIVE_TARGETS_REJECTED` with `MODEL_LOAD_ERROR`; it must not call `showImageFallbackForTarget`.

- [ ] **Step 6: Emit complete identities from anchor events**

When target index `n` is found/lost, resolve the active registry entry and send:

```js
sendToParent('TARGET_FOUND', {
  slotIndex: active.slotIndex,
  mindTargetIndex: active.mindTargetIndex,
  targetIndex: active.mindTargetIndex,
  arTag: active.arTag
});
```

Use the same identity for `TARGET_LOST` and `MODEL_CLICKED`. Ignore events for catalog anchors without active slot content.

- [ ] **Step 7: Wire Add card commands to the viewer scanner**

In `handleParentMessage`, handle `BEGIN_ADD_CARD_SCAN` and `CANCEL_ADD_CARD_SCAN`. Create the scanner once with `getVideo: () => document.querySelector('video')`, `decode: globalThis.jsQR`, and `emit: sendToParent`. Do not change MindAR running state.

- [ ] **Step 8: Verify registry, parser, and bootstrap tests**

Run: `cd frontend-web; npm.cmd test -- src/__tests__/arTargetRegistry.test.ts src/__tests__/arViewerBootstrapContract.test.ts`

Expected: PASS.

Run: `cd frontend-web; node --check public/static/ar-assets/js/ar-target-registry.js; node --check public/static/ar-assets/js/ar-viewer.js`

Expected: both exit `0`.

- [ ] **Step 9: Commit persistent viewer bindings**

```bash
git add frontend-web/public/static/ar-assets/js/ar-target-registry.js frontend-web/public/static/ar-assets/js/ar-viewer.js frontend-web/public/ar-viewer.html frontend-web/src/__tests__/arTargetRegistry.test.ts frontend-web/src/__tests__/arViewerBootstrapContract.test.ts
git commit -m "feat(ar): bind catalog targets without restart"
```

---

### Task 8: Keep `ARContainerV2` stable and transport revisions

**Files:**
- Modify: `frontend-web/src/components/ar/ARContainerV2.tsx`
- Create: `frontend-web/src/__tests__/ARContainerV2.persistentViewer.test.tsx`

**Interfaces:**
- Consumes: `catalogId`, `mindUrl`, `catalogTargetCount`, `activeTargets`, and Add card event-bus commands.
- Produces: stable iframe, revision ACK callbacks, and QR events from the active viewer.

- [ ] **Step 1: Write the failing lifecycle regression**

```tsx
it('does not remount or change viewer src when the second target is added', async () => {
  const first = [elephantTarget];
  const view = render(<ARContainerV2 initialPhase="VIEWING" catalogId="animals-v2" mindUrl={mindUrl} catalogTargetCount={2} activeTargets={first} />);
  const iframeBefore = view.container.querySelector('iframe')!;
  const srcBefore = iframeBefore.getAttribute('src');
  dispatchViewerMessage(iframeBefore, 'AR_READY', { targetCount: 2, catalogId: 'animals-v2' });
  view.rerender(<ARContainerV2 initialPhase="VIEWING" catalogId="animals-v2" mindUrl={mindUrl} catalogTargetCount={2} activeTargets={[elephantTarget, shibaTarget]} />);
  const iframeAfter = view.container.querySelector('iframe')!;
  expect(iframeAfter).toBe(iframeBefore);
  expect(iframeAfter.getAttribute('src')).toBe(srcBefore);
});
```

Also assert the second render sends `SET_ACTIVE_TARGETS` revision `2` and does not send `MIND_BUFFER`.

- [ ] **Step 2: Run the test and confirm RED**

Run: `cd frontend-web; npm.cmd test -- src/__tests__/ARContainerV2.persistentViewer.test.tsx`

Expected: FAIL because target/model query parameters currently change `viewerSrc` and the component has no active-target revision props.

- [ ] **Step 3: Replace model query parameters with catalog-only viewer identity**

Use props:

```ts
interface ARContainerV2Props {
  catalogId?: string | null;
  mindUrl?: string | null;
  catalogTargetCount?: number;
  activeTargets?: ActiveViewerTarget[];
  onActiveTargetsApplied?: (revision: number) => void;
  onActiveTargetsRejected?: (error: { revision: number; code: string; stage: string; message: string }) => void;
  // retain existing non-catalog callbacks
}
```

Build viewer URL only from `mind`, `catalogId`, `targetCount`, `maxTrack=2`, and debug flags. Set `mindIdentityKey` to `catalogId|mindUrl`; model URLs, words, combo assets, active count, and revisions must not affect the key or URL.

- [ ] **Step 4: Send revisions after `AR_READY` and on active-target changes**

Store revision state in a ref/reducer. After the viewer becomes ready, send the latest desired snapshot. On prop changes, request the next revision and send it to the same iframe. Arm a 7-second ACK timeout; on timeout call rejection with `ACTIVE_TARGETS_TIMEOUT` while preserving the last acknowledged set.

- [ ] **Step 5: Handle viewer scanner messages without changing phase**

Accept `QR_DETECTED` from the active viewer while phase is `VIEWING` and Add card scanning is active. Add event-bus handlers:

```ts
eventBus.on('AR_BEGIN_ADD_CARD_SCAN' as any, ({ sessionId, excludedQrIds }) =>
  sendToMain('BEGIN_ADD_CARD_SCAN', { sessionId, excludedQrIds, timeoutMs: 15000 }));
eventBus.on('AR_CANCEL_ADD_CARD_SCAN' as any, ({ sessionId }) =>
  sendToMain('CANCEL_ADD_CARD_SCAN', { sessionId }));
```

Remove `MIND_BUFFER_REQUEST` delivery and runtime-buffer identity logic only after Task 9 removes all callers.

- [ ] **Step 6: Verify lifecycle tests**

Run: `cd frontend-web; npm.cmd test -- src/__tests__/ARContainerV2.persistentViewer.test.tsx src/__tests__/activeTargetRevision.test.ts`

Expected: PASS; iframe node and URL remain identical across card two.

- [ ] **Step 7: Commit the parent lifecycle**

```bash
git add frontend-web/src/components/ar/ARContainerV2.tsx frontend-web/src/__tests__/ARContainerV2.persistentViewer.test.tsx
git commit -m "fix(ar): keep viewer alive while adding cards"
```

---

### Task 9: Replace LearnAR runtime merge with catalog activation

**Files:**
- Modify: `frontend-web/src/hooks/useMultiFlashcard.ts`
- Modify: `frontend-web/src/pages/LearnARV2.tsx`
- Modify: `frontend-web/src/components/ar/ARContainerV2.tsx`
- Modify: `frontend-web/src/config.ts`
- Delete: `frontend-web/src/utils/mergeMindTargets.ts`
- Delete: `frontend-web/src/utils/mindTargetMerge.test.ts`
- Create: `frontend-web/src/__tests__/LearnARV2.catalogFlow.test.tsx`

**Interfaces:**
- Consumes: flashcard API catalog fields, catalog validator, GLB preflight, and revision ACK callbacks.
- Produces: ordered `ActiveViewerTarget[]` where slot order follows scan order and Mind target index follows catalog mapping.

- [ ] **Step 1: Write failing page-flow tests**

Mock the AR container and API. Test both scan orders:

```ts
it.each([
  [['ele123', 'dog123'], [
    { slotIndex: 0, arTag: 'elephant_marker_01', mindTargetIndex: 0 },
    { slotIndex: 1, arTag: 'shiba_marker_01', mindTargetIndex: 1 },
  ]],
  [['dog123', 'ele123'], [
    { slotIndex: 0, arTag: 'shiba_marker_01', mindTargetIndex: 1 },
    { slotIndex: 1, arTag: 'elephant_marker_01', mindTargetIndex: 0 },
  ]],
])('keeps scan slots separate from catalog indices', async (qrIds, expected) => {
  const result = await runCatalogFlow(qrIds);
  expect(result.activeTargets.map(({ slotIndex, arTag, mindTargetIndex }) => ({ slotIndex, arTag, mindTargetIndex }))).toEqual(expected);
  expect(result.viewerSrcChangesAfterFirstCard).toBe(0);
});
```

The test-local `runCatalogFlow(qrIds)` renders `LearnARV2` with `ARContainerV2` mocked to capture its latest props, dispatches each QR through the captured `onQRDetected`, resolves the mocked API/manifest/model responses, invokes the captured `onActiveTargetsApplied` after each requested revision, and returns `{ activeTargets, viewerSrcChangesAfterFirstCard }`. It must use `waitFor` after each QR so React state and the serialized `addFlashcard` chain settle before the next scan.

Add tests for catalog mismatch, second model 404, timeout, and cancellation; each must retain the first acknowledged card.

- [ ] **Step 2: Run the page-flow test and confirm RED**

Run: `cd frontend-web; npm.cmd test -- src/__tests__/LearnARV2.catalogFlow.test.tsx`

Expected: FAIL because flashcard state lacks catalog identities and Add card still transitions to scanner/runtime merge.

- [ ] **Step 3: Extend `FlashcardData` and validate before state mutation**

Add:

```ts
mindCatalogId: string;
mindTargetIndex: number;
```

In `addFlashcardImpl`, reject absent catalog fields, load/validate the manifest, and preflight the required model before adding the card to `detectedFlashcards`. Emit `FLASHCARD_CATALOG_REJECTED` with exact error code and stage on failure.

- [ ] **Step 4: Make Add card a VIEWING sub-state**

Replace `handleAddCardScan` with:

```ts
const handleAddCardScan = useCallback(() => {
  const sessionId = crypto.randomUUID();
  addCardScanSessionRef.current = sessionId;
  setIsAddingCard(true);
  setAddCardStatus('scanning');
  eventBus.emit('AR_BEGIN_ADD_CARD_SCAN' as any, {
    sessionId,
    excludedQrIds: Array.from(detectedFlashcards.keys()),
  });
}, [detectedFlashcards]);
```

Do not call `setAppState('SCANNING')` or `AR_SWITCH_TO_SCANNER`. Cancellation emits `AR_CANCEL_ADD_CARD_SCAN` and leaves `appState` as `VIEWING`.

- [ ] **Step 5: Derive active targets with independent identities**

```ts
const activeTargets: ActiveViewerTarget[] = scannedTargets.map((target, slotIndex) => ({
  slotIndex: slotIndex as 0 | 1,
  mindTargetIndex: target.mindTargetIndex,
  arTag: target.arTag,
  modelUrl: target.model3dUrl,
  textureUrl: target.textureUrl,
  word: target.word,
}));
```

Pass `catalogId`, catalog URL, manifest target count, and `activeTargets` to `ARContainerV2`. Commit card-two UI state only when `onActiveTargetsApplied` acknowledges the current revision.

- [ ] **Step 6: Remove obsolete tracking selection paths**

Delete `multiPreparation`, runtime fetch/merge/import, `mindBufferRef`, `MIND_BUFFER` props and handlers in `ARContainerV2`, `shouldUseComboMindUrl`, viewer selection by `combo_mind_url`, and target ordering by `target_order`. Keep backend combo resolution by `required_tags`/`arTag` and combo model/effect fields.

Delete `mergeMindTargets.ts` and its old tests only after `git grep -n "mergeMindTargetBuffers\|runtime-buffer\|MIND_BUFFER" -- frontend-web/src` returns no new-flow references.

- [ ] **Step 7: Enforce no automatic 2D fallback**

Remove calls to `showImageFallbackForTarget` from required model asset/entity errors. Emit `SYSTEM_ERROR` for first-card failure and `ACTIVE_TARGETS_REJECTED` for second-card binding failure. Do not change explicit user-selected display mode behavior.

- [ ] **Step 8: Add the explicit test-deployment gate**

Export from `frontend-web/src/config.ts`:

```ts
export function isPersistentMindViewerEnabled(): boolean {
  return import.meta.env.VITE_PERSISTENT_MIND_VIEWER === 'true';
}
```

`LearnARV2` must fail closed with `PERSISTENT_VIEWER_DISABLED` when this build contains the new architecture but the flag is absent. It must not invoke the deleted merge/combo-mind paths. The test deployment sets the flag to `true`; the normal deployment remains on its previous commit until physical verification and explicit publication.

- [ ] **Step 9: Run focused flow tests**

Run: `cd frontend-web; npm.cmd test -- src/__tests__/LearnARV2.catalogFlow.test.tsx src/__tests__/ARContainerV2.persistentViewer.test.tsx src/__tests__/arCatalogContract.test.ts`

Expected: PASS in both scan orders, mismatch, model failure, timeout, and cancel cases.

- [ ] **Step 10: Commit the catalog flow cutover**

```bash
git add frontend-web/src/hooks/useMultiFlashcard.ts frontend-web/src/pages/LearnARV2.tsx frontend-web/src/components/ar/ARContainerV2.tsx frontend-web/src/config.ts frontend-web/src/utils/mergeMindTargets.ts frontend-web/src/utils/mindTargetMerge.test.ts frontend-web/src/__tests__/LearnARV2.catalogFlow.test.tsx frontend-web/public/static/ar-assets/js/ar-viewer.js
git commit -m "fix(ar): activate second card in persistent catalog"
```

---

### Task 10: Lock combo semantics to AR tags

**Files:**
- Modify: `frontend-web/src/pages/LearnARV2.tsx`
- Modify: `frontend-web/src/hooks/useMultiFlashcard.ts`
- Create: `frontend-web/src/__tests__/arComboTagIdentity.test.ts`

**Interfaces:**
- Consumes: acknowledged active targets and backend `required_tags`.
- Produces: scan-order-independent combo activation without changing catalog URL.

- [ ] **Step 1: Write the failing tag-identity test**

```ts
it.each([
  ['elephant-first', [elephantSlot0, jungleSlot1]],
  ['jungle-first', [jungleSlot0, elephantSlot1]],
])('activates the same combo in %s order', (_label, targets) => {
  expect(resolveComboByTags(targets, jungleCombo)?.comboId).toBe('jungle_scene_v1');
});

it('does not use combo_mind_url or target_order for tracking', () => {
  const result = buildComboDisplayState([elephantSlot0, jungleSlot1], jungleCombo);
  expect(result).not.toHaveProperty('mindUrl');
  expect(result).not.toHaveProperty('targetOrder');
});
```

- [ ] **Step 2: Run the test and confirm RED**

Run: `cd frontend-web; npm.cmd test -- src/__tests__/arComboTagIdentity.test.ts`

Expected: FAIL while current combo viewer still selects tracking files/order.

- [ ] **Step 3: Implement tag-set combo resolution**

Create/export pure helpers from `useMultiFlashcard.ts` or a focused adjacent module:

```ts
export function sameTagSet(left: string[], right: string[]): boolean {
  return left.length === right.length && [...left].sort().every((tag, index) => tag === [...right].sort()[index]);
}

export function resolveComboByTags(targets: ActiveViewerTarget[], combo: ComboData): ComboData | null {
  return sameTagSet(targets.map((target) => target.arTag), combo.requiredTags) ? combo : null;
}
```

Only acknowledged targets participate. Activating/deactivating combo content sends viewer commands but never changes `mindUrl`, catalog ID, anchor mapping, or iframe key.

- [ ] **Step 4: Run combo and lifecycle tests together**

Run: `cd frontend-web; npm.cmd test -- src/__tests__/arComboTagIdentity.test.ts src/__tests__/ARContainerV2.persistentViewer.test.tsx`

Expected: PASS and viewer URL stays constant through combo activation.

- [ ] **Step 5: Commit combo decoupling**

```bash
git add frontend-web/src/pages/LearnARV2.tsx frontend-web/src/hooks/useMultiFlashcard.ts frontend-web/src/__tests__/arComboTagIdentity.test.ts
git commit -m "refactor(ar): resolve combos by active tags"
```

---

### Task 11: Add regression gates and mobile-simulator coverage

**Files:**
- Modify: `frontend-web/src/__tests__/arViewerBootstrapContract.test.ts`
- Create: `frontend-web/e2e/persistent-mind-viewer.spec.ts`
- Create: `docs/report/AR_PERSISTENT_VIEWER_TEST_RUNBOOK.md`

**Interfaces:**
- Consumes: debug events and the `VITE_PERSISTENT_MIND_VIEWER` test deployment.
- Produces: automated evidence for one bootstrap/camera and both scan orders.

- [ ] **Step 1: Strengthen static bootstrap contracts**

Assert:

```ts
expect(viewerHtml).toContain('/static/vendor/jsQR-1.4.0.min.js');
expect(viewerHtml).toContain('/static/ar-assets/js/ar-add-card-scanner.js');
expect(viewerJs).toContain("case 'SET_ACTIVE_TARGETS'");
expect(viewerJs).toContain("case 'BEGIN_ADD_CARD_SCAN'");
expect(viewerJs).not.toContain("showImageFallbackForTarget(0, 'model-0-asset-error')");
expect(viewerJs).not.toContain("showImageFallbackForTarget(1, 'model-1-asset-error')");
```

- [ ] **Step 2: Write Playwright lifecycle tests**

Mock flashcard responses, model range responses, and target messages. Capture debug labels and iframe nodes. In each scan order assert:

```ts
expect(debugLabels.filter((label) => label === 'VIEWER_BOOTSTRAP_START')).toHaveLength(1);
expect(debugLabels.filter((label) => label === 'MINDAR_CONFIG_ACTIVE')).toHaveLength(1);
expect(debugLabels).toContain('ADD_CARD_SCAN_STARTED');
expect(debugLabels).toContain('ACTIVE_TARGETS_APPLIED');
expect(debugLabels).not.toContain('MULTI_MIND_PREPARE_STARTED');
expect(debugLabels).not.toContain('MULTI_MIND_MERGED');
expect(viewerSrcAfterSecondCard).toBe(viewerSrcAfterFirstCard);
```

Use the existing mobile viewport/project configuration. The mocked viewer must echo revisions and emit target events with all three identities.

- [ ] **Step 3: Run focused unit and E2E tests**

Run: `cd frontend-web; npm.cmd test -- src/__tests__/arViewerBootstrapContract.test.ts`

Expected: PASS.

Run: `cd frontend-web; npm.cmd run test:e2e -- e2e/persistent-mind-viewer.spec.ts`

Expected: PASS for elephant→shiba and shiba→elephant.

- [ ] **Step 4: Write the physical-device runbook**

The runbook records deployment commit, catalog ID/URL/SHA-256, API payload, iPhone/browser version, both scan orders, debug-label counts, model rendering result, catalog mismatch result, deliberately broken model result, and confirmation that no second permission prompt occurred.

- [ ] **Step 5: Commit regression gates**

```bash
git add frontend-web/src/__tests__/arViewerBootstrapContract.test.ts frontend-web/e2e/persistent-mind-viewer.spec.ts docs/report/AR_PERSISTENT_VIEWER_TEST_RUNBOOK.md
git commit -m "test(ar): cover persistent viewer mobile flow"
```

---

### Task 12: Verify the complete feature and stage test-branch rollout

**Files:**
- Modify only if verification exposes a scoped defect in files already listed above.
- Do not apply production data changes or remove the feature flag in this task.

**Interfaces:**
- Consumes: all earlier deliverables.
- Produces: a verified commit set ready for the test deployment and physical-device gate.

- [ ] **Step 1: Run backend regression suite**

Run: `cd backend; python -m pytest tests/test_ar_object_catalog_schema.py tests/test_backfill_ar_mind_catalog.py tests/test_flashcard_ar_response.py tests/test_ar_service.py -q`

Expected: all selected tests PASS.

- [ ] **Step 2: Run catalog verification**

Run: `cd frontend-web; npm.cmd run ar:catalog:verify`

Expected: PASS with MindAR v2, target count `2`, and matching SHA-256.

- [ ] **Step 3: Run the full frontend suite and build**

Run: `cd frontend-web; npm.cmd test`

Expected: all tests PASS.

Run: `cd frontend-web; npm.cmd run build`

Expected: TypeScript and Vite exit `0`.

- [ ] **Step 4: Parse static viewer scripts**

Run: `cd frontend-web; node --check public/static/ar-assets/js/ar-add-card-scanner.js; node --check public/static/ar-assets/js/ar-target-registry.js; node --check public/static/ar-assets/js/ar-viewer.js`

Expected: all exit `0`.

- [ ] **Step 5: Verify obsolete paths are absent from the new flow**

Run: `git grep -n -E "mergeMindTargetBuffers|runtime-buffer|MULTI_MIND_MERGED|MIND_BUFFER_REQUEST" -- frontend-web/src frontend-web/public/static/ar-assets/js/ar-viewer.js`

Expected: no matches except explicitly retained backward-compatibility code documented for deletion; before completion, remove those remaining matches so the final command returns no output.

Run: `git grep -n -E "showImageFallbackForTarget\([01], 'model-[01]-(asset|entity)-error'" -- frontend-web/public/static/ar-assets/js/ar-viewer.js`

Expected: no output.

- [ ] **Step 6: Review branch scope before publication**

Run: `git diff main...HEAD --check`

Expected: no whitespace errors.

Run: `git status --short`

Expected: only pre-existing user-owned Unity/docs/tooling changes remain; no implementation file is unintentionally uncommitted.

- [ ] **Step 7: Deploy only to the test branch with the feature flag**

Set `VITE_PERSISTENT_MIND_VIEWER=true` on the Vercel test deployment. Run the Mongo migration once without `--apply`, archive output, review the exact two rows, then run it with `--apply` against the Render test database only. Do not touch the production database.

- [ ] **Step 8: Execute the physical-device gate**

Follow `docs/report/AR_PERSISTENT_VIEWER_TEST_RUNBOOK.md`. Both scan orders, the model-failure case, and the no-second-permission-prompt check must pass. A failure blocks flag promotion and must not trigger the old architecture.

- [ ] **Step 9: Record the verification commit**

If the runbook gains measured evidence, commit only that update:

```bash
git add docs/report/AR_PERSISTENT_VIEWER_TEST_RUNBOOK.md
git commit -m "docs(ar): record persistent viewer verification"
```

Do not push, merge, remove the feature flag, or change normal-branch environment settings unless the user explicitly requests publication after reviewing the test evidence.

---

## Final Acceptance Checklist

- [ ] `animals-v2.mind` decodes as MindAR v2 with exactly two targets and matches the generated SHA-256 manifest.
- [ ] Animal lesson/AR-object seeds and Mongo test rows agree on catalog URL, catalog ID, and indices.
- [ ] Flashcard API returns HTTP 200 with catalog identity even when related combos exist.
- [ ] Viewer bootstraps once, uses `maxTrack=2`, and pre-creates every catalog anchor.
- [ ] Add card reuses the viewer video, issues no second `getUserMedia`, and times out after 15 seconds.
- [ ] Second-card activation changes only the active-target revision, not iframe `src`, key, camera, or `.mind`.
- [ ] Both scan orders render the correct model on the correct physical marker.
- [ ] Target and model events include `arTag`, `mindTargetIndex`, and `slotIndex`.
- [ ] Combo activation uses tag sets and never selects `combo_mind_url` or `target_order` for tracking.
- [ ] Required model/catalog failures are bounded, visible, retryable where specified, and never fall back to 2D.
- [ ] Runtime merge, `MIND_BUFFER`, and pair-specific tracking paths are absent from the new flow.
- [ ] Backend tests, frontend tests, catalog verification, build, Playwright flow, and physical iPhone runbook pass before promotion.
