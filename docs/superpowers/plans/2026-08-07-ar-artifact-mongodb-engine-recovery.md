# AR Artifact, MongoDB Consistency, and Engine Recovery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore a clean Vercel build, make every `ar_objects` MongoDB document conform to an explicit catalog-or-legacy contract, and only then repair and instrument the persistent MindAR source path without claiming mobile verification.

**Architecture:** The official MindAR web compiler remains external; the repository stores only a Supabase-backed manifest and never installs compiler dependencies. MongoDB uses an explicit `tracking_mode` discriminator, a shared validation/serialization boundary, exact dry-run-first repair, and staged database enforcement. After both prerequisite phases pass, a pinned isolated MindAR harness and single-owner viewer bootstrap distinguish engine failures from React/message/model wiring failures.

**Tech Stack:** React 18, TypeScript 5.8, Vite 7, Vitest 3, Playwright, A-Frame 1.4.2, MindAR 1.2.5, Node 24, FastAPI, Pydantic v2, Motor/Beanie, MongoDB, Pytest.

## Global Constraints

- Execute phases in order: Phase A artifact/build, Phase B MongoDB consistency, then Phase C engine/source code.
- Do not start Phase C until both Phase A and the test-database Phase B gate pass.
- Use the existing official MindAR web-compiled `.mind`; do not compile `.mind` in this repository, CI, Vercel, Render, or runtime code.
- Supabase Storage is the only location for compiled `.mind` bytes; Git stores the manifest and source metadata only.
- `animals-v2.manifest.json` is the only runtime URL authority for catalog-aware cards.
- Never infer MongoDB identities from regex, URL text, collection order, seed row order, or UI slot order.
- All MongoDB migrations are dry-run by default, use compare-and-set filters, preserve unknown fields, and require explicit `--apply` plus an expected test database name.
- Do not apply a migration or validator to production MongoDB in this plan.
- Keep vendored A-Frame at `1.4.2` and MindAR at `1.2.5`; engine upgrades are outside scope.
- Do not restore runtime `.mind` merging, pair-specific combo tracking files, or automatic 2D fallback.
- Desktop, unit, mocked browser, and isolated-engine checks do not count as physical mobile verification.
- Record the mobile gate as `NOT RUN — device unavailable`; never report it as passed.
- Use `npm.cmd` in PowerShell and `E:\University\Graduted Project\Edu-platform\.venv\Scripts\python.exe` for backend checks.
- Preserve unrelated dirty Unity, tooling, report, and workspace files; stage only paths listed by each task.
- Implement each task test-first and make the focused commit shown at the end of that task.

---

## File Structure

### Phase A — artifact and clean build

- Modify `frontend-web/package.json` — remove compiler commands/dependencies and pin Node 24.
- Modify `frontend-web/package-lock.json` — reflect the runtime-only frontend dependency graph.
- Create `frontend-web/.nvmrc` — keep local/CI/Vercel Node major aligned.
- Delete `frontend-web/scripts/buildMindCatalog.mjs` — external web compiler replaces it.
- Delete `frontend-web/scripts/mindar-loader.mjs` — compiler-only ESM alias.
- Delete `frontend-web/scripts/tfjs-node-entry.mjs` — compiler-only TensorFlow bridge.
- Delete `frontend-web/scripts/.tfjs-shim.mjs` — compiler-only shim.
- Create `frontend-web/src/__tests__/frontendDependencyBoundary.test.ts` — prove forbidden compiler packages and files cannot return.
- Modify `frontend-web/src/__tests__/mindCatalogContract.test.ts` — validate metadata without an ignored local binary.
- Modify `frontend-web/public/assets/target/catalogs/animals-v2.sources.json` — remove duplicated runtime URL.
- Create `frontend-web/scripts/verifyRemoteMindCatalog.mjs` — verify the Supabase bytes and checksum.
- Modify `.github/workflows/ci.yml` — clean Node 24 install plus local and remote catalog gates.

### Phase B — MongoDB consistency

- Create `backend/models/ar_object_contract.py` — tracking discriminator, canonical field validation, serializer, and vector normalization.
- Modify `backend/models/ar_object.py` — use the shared contract in document/create/update/response models.
- Modify `backend/models/ar_experience.py` — return the validated AR-object DTO.
- Modify `backend/repositories/ar_object_repository.py` — validate writes and serialize reads.
- Modify `backend/services/ar_service.py` — never return a raw Mongo repository dictionary.
- Modify `backend/models/admin_models.py` — stop implying an AR object can be created from `ar_tag` alone.
- Modify `backend/repositories/admin_repository.py` — require an existing valid AR object before inserting a flashcard.
- Modify `backend/api/admin.py` — map AR configuration errors to HTTP 422.
- Create `backend/database/migrations/ar_object_consistency_map.json` — exact reviewed classification for every checked-in AR tag.
- Create `backend/database/migrations/audit_ar_objects_consistency.py` — read-only collection-wide inventory.
- Create `backend/database/migrations/repair_ar_objects_consistency.py` — exact compare-and-set repair, dry-run by default.
- Create `backend/database/migrations/apply_ar_objects_validator.py` — partial unique index and staged MongoDB JSON Schema validator.
- Delete `backend/database/migrations/fill_legacy_catalog_defaults.py` — row-order inference is forbidden.
- Delete `backend/database/migrations/backfill_ar_mind_catalog.py` — superseded local-URL backfill.
- Modify `backend/database/seed/ar_objects.json` — explicit `tracking_mode`; no hybrid catalog/legacy records.
- Modify `backend/database/seed/lessons.json` — catalog identity without duplicated `.mind` URL.
- Create `backend/tests/test_ar_object_consistency.py` — model, serializer, repository, and response invariants.
- Create `backend/tests/test_audit_ar_objects_consistency.py` — inventory issue classification.
- Create `backend/tests/test_repair_ar_objects_consistency.py` — exact mapping, idempotence, and compare-and-set safety.
- Create `backend/tests/test_ar_objects_validator.py` — validator/index command contract.
- Modify `backend/tests/test_ar_object_catalog_schema.py` — catalog/legacy discriminator coverage.
- Modify `backend/tests/test_flashcard_ar_response.py` — HTTP 200 and sanitized catalog response.
- Modify `.github/workflows/ci.yml` — backend failures block CI.

### Phase C — engine and source code

- Create `frontend-web/src/__tests__/arVendorIntegrity.test.ts` — pin vendored file hashes.
- Create `frontend-web/public/ar-engine-harness.html` — debug-gated minimal engine page.
- Create `frontend-web/public/static/ar-assets/js/ar-engine-harness.js` — isolated manifest/MindAR/anchor bootstrap.
- Create `frontend-web/public/static/ar-assets/js/ar-engine-lifecycle.js` — bounded stage tracking.
- Create `frontend-web/src/__tests__/arEngineLifecycle.test.ts` — stage success/rejection/timeout contract.
- Modify `frontend-web/public/ar-viewer.html` — script loading only; no scene configuration.
- Modify `frontend-web/public/static/ar-assets/js/ar-viewer.js` — sole MindAR runtime/bootstrap owner.
- Modify `frontend-web/src/core/types/ARMessages.ts` — typed engine-stage events and errors.
- Modify `frontend-web/src/components/ar/arCatalogContract.ts` — manifest URL owns runtime; cards carry identity only.
- Modify `frontend-web/src/hooks/useMultiFlashcard.ts` — remove backend URL fallback for catalog-aware cards.
- Modify `frontend-web/src/components/ar/ARContainerV2.tsx` — preserve identities and stage errors across iframe boundary.
- Modify `frontend-web/src/pages/LearnARV2.tsx` — show bounded 3D errors without fallback/restart.
- Modify `frontend-web/src/__tests__/arViewerBootstrapContract.test.ts` — one bootstrap/config owner.
- Modify `frontend-web/src/__tests__/arCatalogContract.test.ts` — catalog identity without card URL.
- Modify `frontend-web/src/__tests__/ARContainerV2.persistentViewer.test.tsx` — stage and identity transport.
- Modify `frontend-web/src/__tests__/LearnARV2.catalogFlow.test.tsx` — first/second-card failure policy.
- Modify `frontend-web/tests/e2e/persistent-mind-viewer.spec.ts` — desktop/mocked lifecycle evidence only.
- Modify `docs/report/AR_PERSISTENT_VIEWER_TEST_RUNBOOK.md` — measured desktop evidence and explicit mobile deferral.

---

# Phase A — Remove Compiler Coupling and Prove the Supabase Artifact

### Task 1: Remove MindAR compiler dependencies from the frontend install

**Files:**
- Create: `frontend-web/src/__tests__/frontendDependencyBoundary.test.ts`
- Create: `frontend-web/.nvmrc`
- Modify: `frontend-web/package.json`
- Modify: `frontend-web/package-lock.json`
- Delete: `frontend-web/scripts/buildMindCatalog.mjs`
- Delete: `frontend-web/scripts/mindar-loader.mjs`
- Delete: `frontend-web/scripts/tfjs-node-entry.mjs`
- Delete: `frontend-web/scripts/.tfjs-shim.mjs`

**Interfaces:**
- Consumes: the already-uploaded Supabase `.mind`; no compiler output is produced.
- Produces: a Node-24 frontend dependency graph with no Node MindAR compiler or native canvas/TensorFlow dependency.

- [ ] **Step 1: Write the failing dependency-boundary test**

```ts
// frontend-web/src/__tests__/frontendDependencyBoundary.test.ts
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = resolve('.');
const pkg = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'));

describe('frontend deployment dependency boundary', () => {
  it('pins the same Node major used by Vercel', () => {
    expect(pkg.engines?.node).toBe('24.x');
    expect(readFileSync(resolve(root, '.nvmrc'), 'utf8').trim()).toBe('24');
  });

  it.each([
    'mind-ar',
    '@napi-rs/canvas',
    '@tensorflow/tfjs-node',
    'canvas',
    'msgpackr',
    'puppeteer',
  ])('does not install compiler-only package %s', (name) => {
    expect(pkg.dependencies?.[name]).toBeUndefined();
    expect(pkg.devDependencies?.[name]).toBeUndefined();
  });

  it.each([
    'scripts/buildMindCatalog.mjs',
    'scripts/mindar-loader.mjs',
    'scripts/tfjs-node-entry.mjs',
    'scripts/.tfjs-shim.mjs',
  ])('does not ship compiler file %s', (relativePath) => {
    expect(existsSync(resolve(root, relativePath))).toBe(false);
  });

  it('keeps the browser runtime and QR vendor step', () => {
    expect(pkg.scripts['ar:catalog:build']).toBeUndefined();
    expect(pkg.scripts.postinstall).toBe('node scripts/vendor-jsqr.cjs');
    expect(existsSync(resolve(root, 'public/static/vendor/mindar-image-aframe-1.2.5.prod.js'))).toBe(true);
  });
});
```

- [ ] **Step 2: Run the test and confirm RED**

Run:

```powershell
cd frontend-web
npm.cmd test -- src/__tests__/frontendDependencyBoundary.test.ts
```

Expected: FAIL for the six packages, four compiler files, missing `engines.node`, `.nvmrc`, and `ar:catalog:build`.

- [ ] **Step 3: Remove only compiler-era packages and scripts**

Run:

```powershell
cd frontend-web
npm.cmd uninstall --save-dev mind-ar @napi-rs/canvas @tensorflow/tfjs-node canvas msgpackr puppeteer
git rm scripts/buildMindCatalog.mjs scripts/mindar-loader.mjs scripts/tfjs-node-entry.mjs scripts/.tfjs-shim.mjs
```

Edit `package.json` so its relevant top-level fields are:

```json
{
  "name": "frontend-web",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "engines": {
    "node": "24.x"
  },
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "lint": "eslint .",
    "test": "vitest run",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "preview": "vite preview",
    "ar:catalog:verify": "vitest run src/__tests__/mindCatalogContract.test.ts",
    "vendor:jsqr": "node scripts/vendor-jsqr.cjs",
    "postinstall": "node scripts/vendor-jsqr.cjs"
  }
}
```

Create `frontend-web/.nvmrc` containing exactly:

```text
24
```

- [ ] **Step 4: Prove the clean dependency graph**

Run:

```powershell
cd frontend-web
npm.cmd ci
npm.cmd ls mind-ar canvas @tensorflow/tfjs-node @napi-rs/canvas msgpackr puppeteer --all
npm.cmd test -- src/__tests__/frontendDependencyBoundary.test.ts
```

Expected: `npm ci` exits `0` without `node-gyp`; `npm ls` prints `(empty)` and may exit `1` only because no requested package is installed; the Vitest file passes.

- [ ] **Step 5: Run the current frontend regression and build**

Run:

```powershell
npm.cmd test
npm.cmd run build
```

Expected: both exit `0`. If a test proves direct `canvas` is independently required, stop and identify that exact import before restoring any package; do not restore `mind-ar` or its nested `canvas@2.11.2`.

- [ ] **Step 6: Commit the dependency boundary**

```powershell
git add frontend-web/.nvmrc frontend-web/package.json frontend-web/package-lock.json frontend-web/src/__tests__/frontendDependencyBoundary.test.ts
git add -u frontend-web/scripts
git diff --cached --check
git commit -m "build(frontend): remove MindAR compiler dependencies"
```

---

### Task 2: Replace the local `.mind` test with manifest and remote-artifact verification

**Files:**
- Modify: `frontend-web/public/assets/target/catalogs/animals-v2.sources.json`
- Modify: `frontend-web/src/__tests__/mindCatalogContract.test.ts`
- Create: `frontend-web/scripts/verifyRemoteMindCatalog.mjs`
- Modify: `frontend-web/package.json`

**Interfaces:**
- Consumes: `MindCatalogManifest` with `mindUrl`, `sha256`, `targetCount`, and ordered targets.
- Produces: `npm run ar:catalog:verify` for offline metadata and `npm run ar:catalog:verify-remote` for actual Supabase bytes.

- [ ] **Step 1: Rewrite the unit contract so it fails on duplicated URL and never reads local bytes**

```ts
// frontend-web/src/__tests__/mindCatalogContract.test.ts
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = resolve('public/assets/target/catalogs');
const sources = JSON.parse(readFileSync(resolve(root, 'animals-v2.sources.json'), 'utf8'));
const manifest = JSON.parse(readFileSync(resolve(root, 'animals-v2.manifest.json'), 'utf8'));

describe('animals-v2 catalog metadata', () => {
  it('keeps the Supabase URL only in the runtime manifest', () => {
    expect(manifest.mindUrl).toMatch(/^https:\/\/[^/]+\.supabase\.co\//);
    expect(manifest.mindUrl).toContain(manifest.sha256);
    expect(sources).not.toHaveProperty('mindUrl');
  });

  it('preserves the reviewed source order and indices', () => {
    expect(manifest.targets).toEqual(sources.targets.map(({ arTag, mindTargetIndex }: any) => ({
      arTag,
      mindTargetIndex,
    })));
    expect(manifest.targets.map((target: any) => target.mindTargetIndex)).toEqual([0, 1]);
  });

});
```

- [ ] **Step 2: Run the unit contract and confirm RED**

Run:

```powershell
npm.cmd run ar:catalog:verify
```

Expected: FAIL because `animals-v2.sources.json` still duplicates the runtime `mindUrl`.

- [ ] **Step 3: Remove `mindUrl` only from the sources metadata**

The beginning of `animals-v2.sources.json` becomes:

```json
{
  "schemaVersion": 1,
  "catalogId": "animals-v2",
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

Run the offline contract again and require it to pass before continuing:

```powershell
npm.cmd run ar:catalog:verify
```

Expected: PASS. Seed consistency is deliberately introduced as a separate failing test in Phase B Task 6 so every Phase A commit remains green.

- [ ] **Step 4: Create the remote verifier**

```js
// frontend-web/scripts/verifyRemoteMindCatalog.mjs
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { decode } from '@msgpack/msgpack';

const manifestPath = new URL('../public/assets/target/catalogs/animals-v2.manifest.json', import.meta.url);
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));

const controller = new AbortController();
const timeout = setTimeout(() => controller.abort(), 15_000);
let response;
try {
  response = await fetch(manifest.mindUrl, { signal: controller.signal });
} finally {
  clearTimeout(timeout);
}
if (!response.ok) {
  throw new Error(`MIND_ARTIFACT_UNAVAILABLE status=${response.status}`);
}
const bytes = new Uint8Array(await response.arrayBuffer());
if (bytes.byteLength === 0) throw new Error('MIND_ARTIFACT_EMPTY');

const sha256 = createHash('sha256').update(bytes).digest('hex');
if (sha256 !== manifest.sha256) {
  throw new Error(`MIND_ARTIFACT_CHECKSUM_MISMATCH expected=${manifest.sha256} actual=${sha256}`);
}

const decoded = decode(bytes);
if (decoded?.v !== 2) throw new Error(`MIND_FORMAT_INVALID version=${decoded?.v}`);
if (!Array.isArray(decoded?.dataList) || decoded.dataList.length !== manifest.targetCount) {
  throw new Error(`MIND_TARGET_COUNT_MISMATCH expected=${manifest.targetCount} actual=${decoded?.dataList?.length}`);
}

console.log(JSON.stringify({
  catalogId: manifest.catalogId,
  sha256,
  bytes: bytes.byteLength,
  targetCount: decoded.dataList.length,
}));
```

Add the script:

```json
"ar:catalog:verify-remote": "node scripts/verifyRemoteMindCatalog.mjs"
```

- [ ] **Step 5: Run the remote verifier**

Run:

```powershell
npm.cmd run ar:catalog:verify-remote
```

Expected: exit `0` with JSON containing `catalogId: "animals-v2"`, SHA-256 `0a43e0b170f887b302324739b686003f482c24e9b35e4cefee4bbb22ffc45884`, byte count `756880`, and `targetCount: 2`.

- [ ] **Step 6: Commit the green artifact verifier**

```powershell
git add frontend-web/package.json frontend-web/public/assets/target/catalogs/animals-v2.sources.json frontend-web/scripts/verifyRemoteMindCatalog.mjs frontend-web/src/__tests__/mindCatalogContract.test.ts
git diff --cached --check
git commit -m "test(ar): verify Supabase MindAR artifact"
```

The focused offline contract and remote verifier must both be green before committing.

---

### Task 3: Make clean Node 24 installation a CI and Vercel gate

**Files:**
- Modify: `.github/workflows/ci.yml`
- Verify: `frontend-web/vercel.json`

**Interfaces:**
- Consumes: runtime-only `frontend-web/package-lock.json` and the public Supabase manifest URL.
- Produces: a branch/PR gate that reproduces Vercel installation before deployment.

- [ ] **Step 1: Update the CI trigger and Node version**

Use this top-level configuration:

```yaml
on:
  push:
    branches:
      - main
      - develop
      - MindAR-Update
  pull_request:
    branches:
      - main
  workflow_dispatch:

env:
  NODE_VERSION: '24'
  PYTHON_VERSION: '3.10'
```

- [ ] **Step 2: Add catalog gates immediately after frontend tests**

```yaml
      - name: Verify catalog metadata
        run: npm run ar:catalog:verify

      - name: Verify Supabase MindAR artifact
        run: npm run ar:catalog:verify-remote

      - name: Build frontend
        run: npm run build
```

Keep `frontend-web/vercel.json` using:

```json
"installCommand": "npm ci"
```

- [ ] **Step 3: Validate workflow syntax and run its frontend commands locally**

Run:

```powershell
cd frontend-web
npm.cmd ci
npm.cmd test -- src/__tests__/frontendDependencyBoundary.test.ts
npm.cmd run ar:catalog:verify-remote
npm.cmd run build
```

Expected: every command exits `0`.

- [ ] **Step 4: Commit the clean-install gate**

```powershell
git add .github/workflows/ci.yml frontend-web/vercel.json
git diff --cached --check
git commit -m "ci(frontend): reproduce Vercel clean install"
```

## Phase A Gate

Do not treat Phase A as complete merely because Task 1 removed `node-gyp`. Before Phase B begins, record:

```text
npm ci: PASS on Node 24 without mind-ar/canvas@2.11.2
remote artifact: PASS, sha256 and targetCount match
frontendDependencyBoundary.test.ts: PASS
mindCatalogContract.test.ts: PASS
```

---

# Phase B — Make `ar_objects` Consistent Before Runtime Refactoring

### Task 4: Build a read-only MongoDB consistency inventory

**Files:**
- Create: `backend/database/migrations/audit_ar_objects_consistency.py`
- Create: `backend/tests/test_audit_ar_objects_consistency.py`

**Interfaces:**
- Consumes: raw `ar_objects` dictionaries and the checked-in animals manifest.
- Produces: `audit_documents(documents, catalog_targets) -> AuditReport` and a redacted JSON dry-run report; performs no writes.

- [ ] **Step 1: Write failing classification tests**

```python
# backend/tests/test_audit_ar_objects_consistency.py
from database.migrations.audit_ar_objects_consistency import audit_documents

CATALOG = {
    "elephant_marker_01": ("animals-v2", 0),
    "shiba_marker_01": ("animals-v2", 1),
}

def test_audit_reports_partial_duplicate_and_mixed_shape_documents():
    documents = [
        {
            "_id": "1",
            "ar_tag": "elephant_marker_01",
            "tracking_mode": "catalog",
            "mind_catalog_id": "animals-v2",
            "mind_target_index": 0,
            "model_3d_url": "https://assets/elephant.glb",
            "image_2d_url": None,
            "texture_url": None,
            "glb_size": 1.0,
            "position": "0 0 0",
            "rotation": "0 0 0",
            "scale": "1 1 1",
        },
        {
            "_id": "2",
            "ar_tag": "shiba_marker_01",
            "mind_catalog_id": "animals-v2",
            "mind_target_index": "1",
            "nft_base_url": "/old.mind",
            "model_3d_url": "",
            "image_2d_url": "",
            "glb_size": 0,
            "position": '{"x":0,"y":0,"z":0}',
            "rotation": {"x": 0, "y": 0, "z": 0},
            "scale": [1, 1, 1],
        },
    ]
    report = audit_documents(documents, CATALOG)
    assert report.valid_catalog == 1
    assert report.invalid == 1
    assert set(report.documents[1].issues) >= {
        "TRACKING_MODE_MISSING",
        "CATALOG_INDEX_TYPE_INVALID",
        "CATALOG_URL_DUPLICATED",
        "MODEL_URL_EMPTY",
        "GLB_SIZE_INVALID",
        "TRANSFORM_ENCODING_MIXED",
    }

def test_audit_never_mutates_input():
    document = {"_id": "1", "ar_tag": "unknown"}
    original = dict(document)
    audit_documents([document], CATALOG)
    assert document == original
```

- [ ] **Step 2: Run the tests and confirm RED**

Run:

```powershell
cd backend
..\.venv\Scripts\python.exe -m pytest tests/test_audit_ar_objects_consistency.py -q
```

Expected: FAIL because the audit module does not exist.

- [ ] **Step 3: Implement pure issue classification and a read-only CLI**

The module defines these stable types and entry points:

```python
from collections import Counter
from dataclasses import asdict, dataclass, field
from datetime import datetime
from enum import Enum
from hashlib import sha256
from typing import Iterable, Mapping

class IssueCode(str, Enum):
    TRACKING_MODE_MISSING = "TRACKING_MODE_MISSING"
    TRACKING_MODE_INVALID = "TRACKING_MODE_INVALID"
    CATALOG_ID_PARTIAL = "CATALOG_ID_PARTIAL"
    CATALOG_INDEX_TYPE_INVALID = "CATALOG_INDEX_TYPE_INVALID"
    CATALOG_INDEX_NEGATIVE = "CATALOG_INDEX_NEGATIVE"
    CATALOG_MAPPING_MISMATCH = "CATALOG_MAPPING_MISMATCH"
    CATALOG_URL_DUPLICATED = "CATALOG_URL_DUPLICATED"
    DUPLICATE_AR_TAG = "DUPLICATE_AR_TAG"
    DUPLICATE_CATALOG_INDEX = "DUPLICATE_CATALOG_INDEX"
    LEGACY_URL_MISSING = "LEGACY_URL_MISSING"
    MODEL_URL_EMPTY = "MODEL_URL_EMPTY"
    GLB_SIZE_INVALID = "GLB_SIZE_INVALID"
    TRANSFORM_ENCODING_MIXED = "TRANSFORM_ENCODING_MIXED"
    TIMESTAMP_TYPE_INVALID = "TIMESTAMP_TYPE_INVALID"
    UNKNOWN_AR_TAG = "UNKNOWN_AR_TAG"

@dataclass(frozen=True)
class DocumentAudit:
    ar_tag: str
    redacted_id: str
    classification: str
    issues: tuple[str, ...]

@dataclass(frozen=True)
class AuditReport:
    total: int
    valid_catalog: int
    valid_legacy: int
    invalid: int
    documents: tuple[DocumentAudit, ...] = field(default_factory=tuple)

def _redact_id(value: object) -> str:
    return sha256(str(value).encode('utf-8')).hexdigest()[:12]

def _transform_encoding(value: object) -> str:
    if isinstance(value, str):
        return 'json-string'
    if isinstance(value, Mapping):
        return 'object'
    if isinstance(value, (list, tuple)):
        return 'array'
    return type(value).__name__

def audit_documents(
    documents: Iterable[Mapping[str, object]],
    catalog_targets: Mapping[str, tuple[str, int]],
) -> AuditReport:
    rows = [dict(document) for document in documents]
    tag_counts = Counter(str(row.get('ar_tag', '')) for row in rows)
    catalog_key_counts = Counter(
        (row.get('mind_catalog_id'), row.get('mind_target_index'))
        for row in rows
        if isinstance(row.get('mind_catalog_id'), str)
        and isinstance(row.get('mind_target_index'), int)
        and not isinstance(row.get('mind_target_index'), bool)
    )

    audits: list[DocumentAudit] = []
    valid_catalog = 0
    valid_legacy = 0

    for row in rows:
        issues: set[IssueCode] = set()
        ar_tag = str(row.get('ar_tag', ''))
        mode = row.get('tracking_mode')
        expected = catalog_targets.get(ar_tag)

        if mode is None:
            issues.add(IssueCode.TRACKING_MODE_MISSING)
        elif mode not in {'catalog', 'legacy'}:
            issues.add(IssueCode.TRACKING_MODE_INVALID)

        has_catalog_id = bool(row.get('mind_catalog_id'))
        has_catalog_index = row.get('mind_target_index') is not None
        index = row.get('mind_target_index')

        if has_catalog_id != has_catalog_index:
            issues.add(IssueCode.CATALOG_ID_PARTIAL)
        if has_catalog_index and (not isinstance(index, int) or isinstance(index, bool)):
            issues.add(IssueCode.CATALOG_INDEX_TYPE_INVALID)
        elif isinstance(index, int) and index < 0:
            issues.add(IssueCode.CATALOG_INDEX_NEGATIVE)

        if expected is not None:
            if (row.get('mind_catalog_id'), index) != expected:
                issues.add(IssueCode.CATALOG_MAPPING_MISMATCH)
            if 'nft_base_url' in row:
                issues.add(IssueCode.CATALOG_URL_DUPLICATED)
        elif mode == 'catalog' or mode is None:
            issues.add(IssueCode.UNKNOWN_AR_TAG)

        if mode == 'legacy' and not str(row.get('nft_base_url', '')).strip():
            issues.add(IssueCode.LEGACY_URL_MISSING)

        if not str(row.get('model_3d_url', '')).strip():
            issues.add(IssueCode.MODEL_URL_EMPTY)
        glb_size = row.get('glb_size')
        if isinstance(glb_size, bool) or not isinstance(glb_size, (int, float)) or glb_size <= 0:
            issues.add(IssueCode.GLB_SIZE_INVALID)

        encodings = {
            _transform_encoding(row[field])
            for field in ('position', 'rotation', 'scale')
            if field in row
        }
        if len(encodings) > 1:
            issues.add(IssueCode.TRANSFORM_ENCODING_MIXED)

        if any(
            field in row and not isinstance(row[field], (datetime, str))
            for field in ('created_at', 'updated_at')
        ):
            issues.add(IssueCode.TIMESTAMP_TYPE_INVALID)

        if tag_counts[ar_tag] > 1:
            issues.add(IssueCode.DUPLICATE_AR_TAG)
        catalog_key = (row.get('mind_catalog_id'), index)
        if has_catalog_id and has_catalog_index and catalog_key_counts[catalog_key] > 1:
            issues.add(IssueCode.DUPLICATE_CATALOG_INDEX)

        classification = 'invalid'
        if not issues and mode == 'catalog':
            classification = 'catalog'
            valid_catalog += 1
        elif not issues and mode == 'legacy':
            classification = 'legacy'
            valid_legacy += 1

        audits.append(DocumentAudit(
            ar_tag=ar_tag,
            redacted_id=_redact_id(row.get('_id')),
            classification=classification,
            issues=tuple(sorted(issue.value for issue in issues)),
        ))

    return AuditReport(
        total=len(rows),
        valid_catalog=valid_catalog,
        valid_legacy=valid_legacy,
        invalid=len(rows) - valid_catalog - valid_legacy,
        documents=tuple(audits),
    )
```

The CLI accepts only read/report arguments:

```text
python -m database.migrations.audit_ar_objects_consistency \
  --manifest ../frontend-web/public/assets/target/catalogs/animals-v2.manifest.json \
  --output .artifacts/ar-object-audit.json
```

It uses SHA-256 of `_id` truncated to 12 characters in reports and contains no `update`, `replace`, `delete`, or `bulk_write` call.

- [ ] **Step 4: Run unit tests and a seed-only audit**

Run:

```powershell
..\.venv\Scripts\python.exe -m pytest tests/test_audit_ar_objects_consistency.py -q
..\.venv\Scripts\python.exe -m database.migrations.audit_ar_objects_consistency --seed database/seed/ar_objects.json --manifest ../frontend-web/public/assets/target/catalogs/animals-v2.manifest.json --output .artifacts/ar-object-seed-audit.json
```

Expected: tests pass; seed audit reports the current inconsistent classifications without changing `database/seed/ar_objects.json`.

- [ ] **Step 5: Commit the inventory tool**

```powershell
git add backend/database/migrations/audit_ar_objects_consistency.py backend/tests/test_audit_ar_objects_consistency.py
git diff --cached --check
git commit -m "feat(backend): audit AR object consistency"
```

---

### Task 5: Define one discriminated AR-object model and serializer

**Files:**
- Create: `backend/models/ar_object_contract.py`
- Modify: `backend/models/ar_object.py`
- Modify: `backend/models/ar_experience.py`
- Modify: `backend/repositories/ar_object_repository.py`
- Modify: `backend/services/ar_service.py`
- Create: `backend/tests/test_ar_object_consistency.py`
- Modify: `backend/tests/test_ar_object_catalog_schema.py`
- Modify: `backend/tests/test_flashcard_ar_response.py`

**Interfaces:**
- Consumes: raw Mongo dictionaries classified as `catalog` or `legacy`.
- Produces: `TrackingMode`, `ARObjectContract`, `normalize_vec3(value)`, and `serialize_ar_object(document)`; API output contains neither `id` nor `_id`.

- [ ] **Step 1: Write failing model and serializer tests**

```python
# backend/tests/test_ar_object_consistency.py
from datetime import datetime
import pytest
from pydantic import ValidationError
from models.ar_object_contract import ARObjectContract, serialize_ar_object

BASE = {
    "ar_tag": "elephant_marker_01",
    "description": "Elephant",
    "animation_type": "idle",
    "glb_size": 1.0,
    "model_3d_url": "https://assets.example/elephant.glb",
    "image_2d_url": None,
    "texture_url": None,
    "position": "0 0 0",
    "rotation": "0 0 0",
    "scale": "1 1 1",
    "created_at": datetime(2026, 8, 7),
}

def test_catalog_contract_requires_exact_pair_and_forbids_legacy_url():
    value = ARObjectContract(
        **BASE,
        tracking_mode="catalog",
        mind_catalog_id="animals-v2",
        mind_target_index=0,
    )
    assert value.mind_target_index == 0
    with pytest.raises(ValidationError):
        ARObjectContract(**BASE, tracking_mode="catalog", mind_catalog_id="animals-v2")
    with pytest.raises(ValidationError):
        ARObjectContract(
            **BASE,
            tracking_mode="catalog",
            mind_catalog_id="animals-v2",
            mind_target_index=0,
            nft_base_url="/old.mind",
        )

def test_legacy_contract_requires_url_and_forbids_catalog_pair():
    value = ARObjectContract(**BASE, tracking_mode="legacy", nft_base_url="https://assets/old.mind")
    assert value.mind_catalog_id is None
    with pytest.raises(ValidationError):
        ARObjectContract(**BASE, tracking_mode="legacy")

def test_serializer_normalizes_vectors_and_removes_mongo_ids():
    result = serialize_ar_object({
        **BASE,
        "_id": "mongo-id",
        "id": "beanie-id",
        "tracking_mode": "catalog",
        "mind_catalog_id": "animals-v2",
        "mind_target_index": 0,
        "position": {"x": 0, "y": 0.5, "z": 0},
    })
    assert result["position"] == "0 0.5 0"
    assert "_id" not in result
    assert "id" not in result
```

- [ ] **Step 2: Run the model tests and confirm RED**

Run:

```powershell
..\.venv\Scripts\python.exe -m pytest tests/test_ar_object_consistency.py tests/test_ar_object_catalog_schema.py tests/test_flashcard_ar_response.py -q
```

Expected: FAIL because the contract module and discriminator do not exist and the service still returns raw dictionaries.

- [ ] **Step 3: Implement the shared contract**

```python
# backend/models/ar_object_contract.py
from datetime import datetime
from enum import Enum
import json
from typing import Any, Optional
from pydantic import BaseModel, Field, field_validator, model_validator

class TrackingMode(str, Enum):
    CATALOG = "catalog"
    LEGACY = "legacy"

def _number(value: Any) -> str:
    number = float(value)
    return str(int(number)) if number.is_integer() else format(number, ".12g")

def normalize_vec3(value: Any) -> str:
    if isinstance(value, str):
        stripped = value.strip()
        if stripped.startswith("{"):
            value = json.loads(stripped)
        else:
            parts = stripped.split()
            if len(parts) != 3:
                raise ValueError("VECTOR3_INVALID")
            return " ".join(_number(part) for part in parts)
    if isinstance(value, dict):
        value = [value.get("x"), value.get("y"), value.get("z")]
    if isinstance(value, (list, tuple)) and len(value) == 3:
        return " ".join(_number(part) for part in value)
    raise ValueError("VECTOR3_INVALID")

class ARObjectContract(BaseModel):
    tracking_mode: TrackingMode
    ar_tag: str = Field(min_length=1)
    description: str = Field(min_length=1)
    animation_type: str
    glb_size: float = Field(gt=0)
    nft_base_url: Optional[str] = None
    model_3d_url: str = Field(min_length=1)
    texture_url: Optional[str] = None
    image_2d_url: Optional[str] = None
    position: str
    rotation: str
    scale: str
    mind_catalog_id: Optional[str] = None
    mind_target_index: Optional[int] = Field(default=None, ge=0)
    created_at: datetime
    updated_at: Optional[datetime] = None

    _vectors = field_validator("position", "rotation", "scale", mode="before")(normalize_vec3)

    @model_validator(mode="after")
    def validate_tracking_identity(self):
        if self.tracking_mode is TrackingMode.CATALOG:
            if not self.mind_catalog_id or self.mind_target_index is None or self.nft_base_url is not None:
                raise ValueError("CATALOG_IDENTITY_INVALID")
        elif not self.nft_base_url or self.mind_catalog_id is not None or self.mind_target_index is not None:
            raise ValueError("LEGACY_IDENTITY_INVALID")
        return self

def serialize_ar_object(document: Any) -> dict[str, Any]:
    if hasattr(document, "model_dump"):
        raw = document.model_dump()
    else:
        raw = dict(document)
    raw.pop("_id", None)
    raw.pop("id", None)
    return ARObjectContract.model_validate(raw).model_dump(mode="json")
```

Use the same contract fields in `ARObject`, `ARObjectCreate`, `ARObjectUpdate`, `ARObjectResponse`, and `ArObjectSchema`. `ARObjectRepository.get_by_tag()` returns `serialize_ar_object(raw)` and validated create/update methods persist `ARObjectContract.model_dump(mode="python")`. `ARService.get_ar_experience()` receives only serialized AR-object payloads.

- [ ] **Step 4: Verify API serialization and combo regression**

Run:

```powershell
..\.venv\Scripts\python.exe -m pytest tests/test_ar_object_consistency.py tests/test_ar_object_catalog_schema.py tests/test_flashcard_ar_response.py tests/test_ar_service.py -q
```

Expected: PASS; flashcard with related combo returns HTTP 200; target has `tracking_mode`, catalog identity, no `id`, and no `_id`.

- [ ] **Step 5: Commit the contract boundary**

```powershell
git add backend/models/ar_object_contract.py backend/models/ar_object.py backend/models/ar_experience.py backend/repositories/ar_object_repository.py backend/services/ar_service.py backend/tests/test_ar_object_consistency.py backend/tests/test_ar_object_catalog_schema.py backend/tests/test_flashcard_ar_response.py
git diff --cached --check
git commit -m "refactor(backend): validate and serialize AR objects"
```

---

### Task 6: Replace inferred migration logic with an exact, idempotent repair

**Files:**
- Create: `backend/database/migrations/ar_object_consistency_map.json`
- Create: `backend/database/migrations/repair_ar_objects_consistency.py`
- Create: `backend/tests/test_repair_ar_objects_consistency.py`
- Modify: `backend/database/seed/ar_objects.json`
- Modify: `backend/database/seed/lessons.json`
- Delete: `backend/database/migrations/fill_legacy_catalog_defaults.py`
- Delete: `backend/database/migrations/backfill_ar_mind_catalog.py`
- Modify: `frontend-web/src/__tests__/mindCatalogContract.test.ts`

**Interfaces:**
- Consumes: exact checked-in mapping and raw old document values.
- Produces: `build_repairs(documents, mapping) -> list[Repair]`, `build_filter(repair)`, and a dry-run/apply CLI that is idempotent.

- [ ] **Step 1: Add the exact mapping file**

```json
{
  "catalog": {
    "elephant_marker_01": { "mind_catalog_id": "animals-v2", "mind_target_index": 0 },
    "shiba_marker_01": { "mind_catalog_id": "animals-v2", "mind_target_index": 1 }
  },
  "legacy": [
    "apple_marker_01",
    "banana_marker_01",
    "cake_marker_01",
    "birthday_marker_01",
    "flower_marker_01",
    "mushroom_marker_01",
    "palm_marker_01",
    "tree_marker_01",
    "cactus_marker_01",
    "car_marker_01",
    "suv_marker_01",
    "truck_marker_01",
    "jungle_marker_01",
    "combo_ele_jungle_marker",
    "cat_marker_01",
    "hama_marker_01",
    "coconut_marker_01",
    "giraffe_marker_01",
    "hippo_marker_01",
    "britishshorthair_marker_01",
    "catcow_marker_01",
    "fredcat_marker_01"
  ]
}
```

- [ ] **Step 2: Write failing migration and seed-consistency tests**

```python
# backend/tests/test_repair_ar_objects_consistency.py
from database.migrations.repair_ar_objects_consistency import build_filter, build_repairs

MAPPING = {
    "catalog": {"elephant_marker_01": {"mind_catalog_id": "animals-v2", "mind_target_index": 0}},
    "legacy": ["apple_marker_01"],
}

def test_repairs_catalog_and_legacy_without_inference():
    docs = [
        {"_id": "1", "ar_tag": "elephant_marker_01", "nft_base_url": "/old.mind", "mind_catalog_id": None},
        {"_id": "2", "ar_tag": "apple_marker_01", "nft_base_url": "https://assets/apple.mind", "mind_catalog_id": "legacy-singletons", "mind_target_index": 7},
        {"_id": "3", "ar_tag": "unknown_marker", "nft_base_url": "https://assets/unknown.mind"},
    ]
    repairs = build_repairs(docs, MAPPING)
    assert [repair.ar_tag for repair in repairs] == ["elephant_marker_01", "apple_marker_01"]
    assert repairs[0].set_values["tracking_mode"] == "catalog"
    assert "nft_base_url" in repairs[0].unset_fields
    assert repairs[1].set_values["tracking_mode"] == "legacy"
    assert {"mind_catalog_id", "mind_target_index"} <= repairs[1].unset_fields

def test_compare_and_set_filter_uses_explicit_and_or_groups():
    repair = build_repairs([
        {"_id": "1", "ar_tag": "elephant_marker_01", "nft_base_url": "/old.mind", "mind_catalog_id": None}
    ], MAPPING)[0]
    query = build_filter(repair)
    assert "$and" in query
    assert sum(1 for clause in query["$and"] if "$or" in clause) >= 2

def test_second_pass_plans_zero_repairs():
    clean = [{
        "_id": "1",
        "ar_tag": "elephant_marker_01",
        "tracking_mode": "catalog",
        "mind_catalog_id": "animals-v2",
        "mind_target_index": 0,
    }]
    assert build_repairs(clean, MAPPING) == []
```

Extend the already-green frontend metadata contract with the cross-repository seed boundary:

```ts
// append to frontend-web/src/__tests__/mindCatalogContract.test.ts
const lessons = JSON.parse(
  readFileSync(resolve('../backend/database/seed/lessons.json'), 'utf8'),
);
const objects = JSON.parse(
  readFileSync(resolve('../backend/database/seed/ar_objects.json'), 'utf8'),
);

it('keeps backend seeds identity-only for the catalog', () => {
  const lesson = lessons.find((row: any) => row.lesson_id === 'animals_001');
  expect(lesson).toMatchObject({ mind_catalog_id: 'animals-v2' });
  expect(lesson).not.toHaveProperty('mind_file_url');

  for (const target of manifest.targets) {
    const row = objects.find((candidate: any) => candidate.ar_tag === target.arTag);
    expect(row).toMatchObject({
      tracking_mode: 'catalog',
      mind_catalog_id: 'animals-v2',
      mind_target_index: target.mindTargetIndex,
    });
    expect(row).not.toHaveProperty('nft_base_url');
  }
});
```

- [ ] **Step 3: Run the migration tests and confirm RED**

Run:

```powershell
..\.venv\Scripts\python.exe -m pytest tests/test_repair_ar_objects_consistency.py -q
cd ..\frontend-web
npm.cmd run ar:catalog:verify
```

Expected: the Python test fails because the repair module does not exist, and the frontend contract fails because the checked-in seeds still duplicate URL/identity shapes.

- [ ] **Step 4: Implement exact repairs and database safety flags**

The CLI must require these arguments for any write:

```text
python -m database.migrations.repair_ar_objects_consistency \
  --mapping database/migrations/ar_object_consistency_map.json \
  --expected-db edu_platform_test \
  --apply
```

Without `--apply`, it prints JSON operations and exits `0`. With `--apply`, it first compares the active database name exactly to `--expected-db`. Each filter is constructed from the original `_id`, `ar_tag`, and old field states:

```python
def _old_value_clause(field: str, old_value: object) -> dict:
    if old_value is MISSING:
        return {"$or": [{field: {"$exists": False}}, {field: None}]}
    return {"$or": [{field: old_value}, {field: {"$eq": old_value}}]}

def build_filter(repair: Repair) -> dict:
    return {
        "$and": [
            {"_id": repair.object_id},
            {"ar_tag": repair.ar_tag},
            _old_value_clause("tracking_mode", repair.old_values.get("tracking_mode", MISSING)),
            _old_value_clause("mind_catalog_id", repair.old_values.get("mind_catalog_id", MISSING)),
            _old_value_clause("mind_target_index", repair.old_values.get("mind_target_index", MISSING)),
        ]
    }
```

Use `$set` for validated canonical values and `$unset` for forbidden duplicate identity fields. Preserve all fields not named in the operation.

- [ ] **Step 5: Update seeds to the same discriminator contract**

For elephant and shiba, add `tracking_mode: "catalog"`, keep catalog ID/index, and remove `nft_base_url`. For every tag in the mapping's `legacy` list, add `tracking_mode: "legacy"`, keep its reviewed `nft_base_url`, and remove `mind_catalog_id` and `mind_target_index`. Remove `mind_file_url` from the `animals_001` lesson; retain `mind_catalog_id` and target map.

Delete the two superseded migration scripts. No replacement code may assign an index from enumeration order.

- [ ] **Step 6: Run migration, seed, API, and frontend manifest tests**

Run:

```powershell
..\.venv\Scripts\python.exe -m pytest tests/test_repair_ar_objects_consistency.py tests/test_audit_ar_objects_consistency.py tests/test_ar_object_consistency.py tests/test_flashcard_ar_response.py -q
cd ..\frontend-web
npm.cmd run ar:catalog:verify
```

Expected: all pass; the Phase B seed-consistency test is now green; a second seed dry-run plans zero repairs.

- [ ] **Step 7: Commit the exact repair path**

```powershell
git add backend/database/migrations/ar_object_consistency_map.json backend/database/migrations/repair_ar_objects_consistency.py backend/database/seed/ar_objects.json backend/database/seed/lessons.json backend/tests/test_repair_ar_objects_consistency.py frontend-web/src/__tests__/mindCatalogContract.test.ts
git add -u backend/database/migrations/fill_legacy_catalog_defaults.py backend/database/migrations/backfill_ar_mind_catalog.py
git diff --cached --check
git commit -m "fix(backend): repair AR object identities exactly"
```

---

### Task 7: Close raw MongoDB write paths and stop invalid admin auto-creation

**Files:**
- Modify: `backend/models/admin_models.py`
- Modify: `backend/repositories/admin_repository.py`
- Modify: `backend/api/admin.py`
- Modify: `backend/repositories/ar_object_repository.py`
- Create: `backend/tests/test_admin_ar_object_consistency.py`

**Interfaces:**
- Consumes: `serialize_ar_object()` and `ARObjectContract` from Task 5.
- Produces: `ARObjectConfigurationError` and `_require_valid_ar_object(ar_tag)`; flashcards cannot create invalid AR documents or orphan rows.

- [ ] **Step 1: Write failing admin transaction-order tests**

```python
# backend/tests/test_admin_ar_object_consistency.py
import pytest
from models.ar_object_contract import ARObjectConfigurationError

@pytest.mark.asyncio
async def test_flashcard_creation_rejects_missing_ar_object_before_insert(admin_repo):
    admin_repo.ar_objects_collection.find_one.return_value = None
    with pytest.raises(ARObjectConfigurationError, match="AR_OBJECT_NOT_CONFIGURED"):
        await admin_repo.create_flashcard({
            "qr_id": "new-card",
            "word": "New",
            "translation": {"vi": "Mới"},
            "ar_tag": "new_marker",
        })
    admin_repo.flashcards_collection.insert_one.assert_not_awaited()
    admin_repo.ar_objects_collection.insert_one.assert_not_awaited()

@pytest.mark.asyncio
async def test_flashcard_creation_accepts_existing_valid_ar_object(admin_repo, valid_catalog_document):
    admin_repo.ar_objects_collection.find_one.return_value = valid_catalog_document
    await admin_repo.create_flashcard({
        "qr_id": "ele123",
        "word": "Elephant",
        "translation": {"vi": "Voi"},
        "ar_tag": "elephant_marker_01",
    })
    admin_repo.flashcards_collection.insert_one.assert_awaited_once()
    admin_repo.ar_objects_collection.insert_one.assert_not_awaited()
```

- [ ] **Step 2: Run the tests and confirm RED**

Run:

```powershell
..\.venv\Scripts\python.exe -m pytest tests/test_admin_ar_object_consistency.py -q
```

Expected: FAIL because admin currently inserts the flashcard first and then invents `legacy-singletons/index 0`.

- [ ] **Step 3: Replace `_ensure_ar_object` with pre-insert validation**

```python
class ARObjectConfigurationError(ValueError):
    pass

async def _require_valid_ar_object(self, ar_tag: str) -> dict:
    raw = await self.ar_objects_collection.find_one({"ar_tag": ar_tag})
    if raw is None:
        raise ARObjectConfigurationError("AR_OBJECT_NOT_CONFIGURED")
    try:
        return serialize_ar_object(raw)
    except ValidationError as exc:
        raise ARObjectConfigurationError("AR_OBJECT_SCHEMA_INVALID") from exc
```

Call `_require_valid_ar_object(ar_tag)` before `flashcards_collection.insert_one`. Delete `_ensure_ar_object` and every raw `ar_objects_collection.insert_one` in the admin flow.

In `backend/api/admin.py`, map the explicit error:

```python
except ARObjectConfigurationError as exc:
    raise HTTPException(status_code=422, detail=str(exc)) from exc
```

Do not catch it under the generic HTTP 500 block.

- [ ] **Step 4: Route repository writes through the contract**

`ARObjectRepository` exposes:

```python
async def create_validated(self, payload: ARObjectContract) -> dict:
    raw = payload.model_dump(mode="python")
    result = await self.collection.insert_one(raw)
    raw["_id"] = result.inserted_id
    return serialize_ar_object(raw)

async def update_validated(self, ar_tag: str, payload: ARObjectContract) -> bool:
    result = await self.collection.update_one(
        {"ar_tag": ar_tag},
        {"$set": payload.model_dump(mode="python")},
    )
    return result.matched_count == 1
```

No AR-object write may call generic `BaseRepository.create()` with an unvalidated dictionary.

- [ ] **Step 5: Run admin, repository, and endpoint regression tests**

Run:

```powershell
..\.venv\Scripts\python.exe -m pytest tests/test_admin_ar_object_consistency.py tests/test_ar_object_consistency.py tests/test_flashcard_ar_response.py -q
```

Expected: PASS; missing/invalid AR configuration is HTTP 422 and no flashcard/AR object is inserted.

- [ ] **Step 6: Commit the write boundary**

```powershell
git add backend/models/admin_models.py backend/repositories/admin_repository.py backend/api/admin.py backend/repositories/ar_object_repository.py backend/tests/test_admin_ar_object_consistency.py
git diff --cached --check
git commit -m "fix(admin): prevent inconsistent AR object writes"
```

---

### Task 8: Add staged MongoDB enforcement and make backend CI blocking

**Files:**
- Create: `backend/database/migrations/apply_ar_objects_validator.py`
- Create: `backend/tests/test_ar_objects_validator.py`
- Modify: `.github/workflows/ci.yml`

**Interfaces:**
- Consumes: a zero-invalid audit report and the shared discriminator contract.
- Produces: `build_validator(action)`, a partial unique index, and `warn`/`error` CLI modes; backend test failures block CI.

- [ ] **Step 1: Write failing validator tests**

```python
# backend/tests/test_ar_objects_validator.py
from database.migrations.apply_ar_objects_validator import build_index, build_validator

def test_validator_uses_discriminated_catalog_and_legacy_branches():
    command = build_validator("warn")
    schema = command["validator"]["$jsonSchema"]
    assert command["validationAction"] == "warn"
    assert len(schema["oneOf"]) == 2
    assert "tracking_mode" in schema["required"]
    catalog, legacy = schema["oneOf"]
    assert catalog["not"] == {"required": ["nft_base_url"]}
    assert legacy["not"] == {"anyOf": [
        {"required": ["mind_catalog_id"]},
        {"required": ["mind_target_index"]},
    ]}

def test_catalog_index_is_partial_and_unique():
    keys, options = build_index()
    assert keys == [("mind_catalog_id", 1), ("mind_target_index", 1)]
    assert options["unique"] is True
    assert options["partialFilterExpression"] == {"tracking_mode": "catalog"}
```

- [ ] **Step 2: Run the tests and confirm RED**

Run:

```powershell
..\.venv\Scripts\python.exe -m pytest tests/test_ar_objects_validator.py -q
```

Expected: FAIL because the validator module does not exist.

- [ ] **Step 3: Implement warning-first database enforcement**

`build_validator("warn")` returns a `collMod` document with:

```python
{
    "collMod": "ar_objects",
    "validator": {
        "$jsonSchema": {
            "bsonType": "object",
            "required": [
                "tracking_mode", "ar_tag", "description", "animation_type",
                "glb_size", "model_3d_url", "position", "rotation", "scale",
            ],
            "oneOf": [
                {
                    "properties": {
                        "tracking_mode": {"enum": ["catalog"]},
                        "mind_catalog_id": {"bsonType": "string", "minLength": 1},
                        "mind_target_index": {"bsonType": "int", "minimum": 0},
                    },
                    "required": ["mind_catalog_id", "mind_target_index"],
                    "not": {"required": ["nft_base_url"]},
                },
                {
                    "properties": {
                        "tracking_mode": {"enum": ["legacy"]},
                        "nft_base_url": {"bsonType": "string", "minLength": 1},
                    },
                    "required": ["nft_base_url"],
                    "not": {
                        "anyOf": [
                            {"required": ["mind_catalog_id"]},
                            {"required": ["mind_target_index"]},
                        ]
                    },
                },
            ],
        }
    },
    "validationLevel": "moderate",
    "validationAction": "warn",
}
```

The CLI accepts `--action warn|error`, defaults to a printed dry-run, and requires `--expected-db` plus `--apply` to call `db.command()` or `create_index()`. `--action error --apply` additionally requires a fresh audit report whose `invalid` count is zero.

- [ ] **Step 4: Make backend failures block CI**

Remove this line from `.github/workflows/ci.yml`:

```yaml
continue-on-error: true
```

Add focused consistency tests before the full backend suite:

```yaml
      - name: Run AR consistency tests
        run: |
          pytest tests/test_ar_object_consistency.py \
                 tests/test_audit_ar_objects_consistency.py \
                 tests/test_repair_ar_objects_consistency.py \
                 tests/test_ar_objects_validator.py \
                 tests/test_flashcard_ar_response.py -q
```

- [ ] **Step 5: Verify against an isolated test MongoDB only**

Run the following only when `MONGO_URL` points to the test database named `edu_platform_test`:

```powershell
..\.venv\Scripts\python.exe -m database.migrations.audit_ar_objects_consistency --expected-db edu_platform_test --output .artifacts/ar-object-audit-before.json
..\.venv\Scripts\python.exe -m database.migrations.repair_ar_objects_consistency --expected-db edu_platform_test
..\.venv\Scripts\python.exe -m database.migrations.repair_ar_objects_consistency --expected-db edu_platform_test --apply
..\.venv\Scripts\python.exe -m database.migrations.audit_ar_objects_consistency --expected-db edu_platform_test --output .artifacts/ar-object-audit-after.json
..\.venv\Scripts\python.exe -m database.migrations.apply_ar_objects_validator --expected-db edu_platform_test --action warn --apply
```

Expected: before report is archived; apply counts equal reviewed planned counts; after report has `invalid: 0`; second repair dry-run plans `0`; validator is `warn`, not `error`.

- [ ] **Step 6: Run backend regression and commit**

Run:

```powershell
..\.venv\Scripts\python.exe -m pytest tests/test_ar_object_consistency.py tests/test_audit_ar_objects_consistency.py tests/test_repair_ar_objects_consistency.py tests/test_ar_objects_validator.py tests/test_admin_ar_object_consistency.py tests/test_flashcard_ar_response.py tests/test_ar_service.py -q
```

Expected: all pass.

Commit:

```powershell
git add backend/database/migrations/apply_ar_objects_validator.py backend/tests/test_ar_objects_validator.py .github/workflows/ci.yml
git diff --cached --check
git commit -m "feat(backend): enforce AR object schema safely"
```

## Phase B Gate

Phase C is blocked until all of the following are true on the test database:

```text
seed audit after repair: invalid = 0
test Mongo audit after repair: invalid = 0
second migration dry-run: planned repairs = 0
catalog pair duplicates: 0
admin invalid auto-creation test: PASS
flashcard with combo HTTP 200 regression: PASS
Mongo validator: warning mode applied
backend focused suite: PASS with real exit code 0
frontend ar:catalog:verify: PASS
```

Production MongoDB remains unchanged. Store redacted audit reports outside Git unless the user explicitly requests committing them.

---

# Phase C — Investigate and Repair the Real MindAR Source Path

### Task 9: Pin vendor integrity and create an isolated engine harness

**Files:**
- Create: `frontend-web/src/__tests__/arVendorIntegrity.test.ts`
- Create: `frontend-web/public/ar-engine-harness.html`
- Create: `frontend-web/public/static/ar-assets/js/ar-engine-harness.js`

**Interfaces:**
- Consumes: pinned vendor bundles and `animals-v2.manifest.json`.
- Produces: a debug-only page that distinguishes engine/artifact failure from React application integration.

- [ ] **Step 1: Write the vendor hash test**

```ts
// frontend-web/src/__tests__/arVendorIntegrity.test.ts
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const expected = {
  'aframe-1.4.2.min.js': '86cb0642dc14a4f554a436d4ef8377b8f4cd8090b1542b88b706767e8195eb11',
  'mindar-image-aframe-1.2.5.prod.js': '42764d6f1b39387f5786b9c4cfbe50883e13ca3f47b42bf1e54e84510b374013',
  'jsQR-1.4.0.min.js': 'bc40c8a15196236b2314db0856f72ca0b49980cd5413b8c852a7349f5fee0859',
};

describe('vendored AR engine integrity', () => {
  it.each(Object.entries(expected))('%s matches the reviewed bytes', (file, sha256) => {
    const bytes = readFileSync(resolve('public/static/vendor', file));
    expect(createHash('sha256').update(bytes).digest('hex')).toBe(sha256);
  });
});
```

- [ ] **Step 2: Create the minimal harness contract first**

Add assertions to the same test:

```ts
it('uses local pinned scripts and no React application code', () => {
  const html = readFileSync(resolve('public/ar-engine-harness.html'), 'utf8');
  expect(html).toContain('/static/vendor/aframe-1.4.2.min.js');
  expect(html).toContain('/static/vendor/mindar-image-aframe-1.2.5.prod.js');
  expect(html).toContain('/static/ar-assets/js/ar-engine-harness.js');
  expect(html).not.toContain('cdn.jsdelivr.net');
  expect(html).not.toContain('/src/');
});
```

Run and confirm RED because the harness does not exist.

- [ ] **Step 3: Implement a debug-gated engine-only harness**

`ar-engine-harness.html` contains one empty `<a-scene>` and the three local scripts. `ar-engine-harness.js` must:

```js
(async function () {
  const params = new URLSearchParams(location.search);
  if (params.get('debug') !== 'true') {
    document.body.textContent = 'AR engine harness disabled';
    return;
  }
  const catalogId = params.get('catalogId') || 'animals-v2';
  const manifestResponse = await fetch(`/assets/target/catalogs/${encodeURIComponent(catalogId)}.manifest.json`);
  if (!manifestResponse.ok) throw new Error('CATALOG_MANIFEST_MISSING');
  const manifest = await manifestResponse.json();
  window.parent.postMessage({ type: 'AR_DEBUG', label: 'MIND_MANIFEST_VALIDATED', details: {
    catalogId: manifest.catalogId,
    targetCount: manifest.targetCount,
  } }, location.origin);

  const scene = document.querySelector('a-scene');
  scene.setAttribute('mindar-image', `imageTargetSrc: ${manifest.mindUrl}; maxTrack: 2; uiLoading: no; uiScanning: no; uiError: no`);
  for (const target of manifest.targets) {
    const anchor = document.createElement('a-entity');
    anchor.id = `harness-target-${target.mindTargetIndex}`;
    anchor.setAttribute('mindar-image-target', `targetIndex: ${target.mindTargetIndex}`);
    anchor.addEventListener('targetFound', () => window.parent.postMessage({
      type: 'AR_DEBUG', label: 'TARGET_FOUND', details: target,
    }, location.origin));
    scene.appendChild(anchor);
  }
  scene.addEventListener('arReady', () => window.parent.postMessage({
    type: 'AR_DEBUG', label: 'MINDAR_SYSTEM_READY', details: { catalogId },
  }, location.origin));
})();
```

No React bundle, model loader, combo state, or Add card code is included.

- [ ] **Step 4: Verify desktop initialization without claiming marker detection**

Run:

```powershell
npm.cmd test -- src/__tests__/arVendorIntegrity.test.ts
npm.cmd run dev
```

Open `/ar-engine-harness.html?debug=true&catalogId=animals-v2` in a desktop browser. Expected evidence available without a mobile device: manifest validates, Supabase `.mind` request is HTTP 200, the scene reaches `MINDAR_SYSTEM_READY`, and two anchors exist. Record real marker detection as `NOT RUN` if no usable camera/card setup is available.

- [ ] **Step 5: Commit the isolated harness**

```powershell
git add frontend-web/src/__tests__/arVendorIntegrity.test.ts frontend-web/public/ar-engine-harness.html frontend-web/public/static/ar-assets/js/ar-engine-harness.js
git diff --cached --check
git commit -m "test(ar): isolate pinned MindAR engine"
```

---

### Task 10: Make `ar-viewer.js` the single MindAR bootstrap owner

**Files:**
- Modify: `frontend-web/public/ar-viewer.html`
- Modify: `frontend-web/public/static/ar-assets/js/ar-viewer.js`
- Modify: `frontend-web/src/__tests__/arViewerBootstrapContract.test.ts`

**Interfaces:**
- Consumes: script-load deadline and URL parameters.
- Produces: exactly one `VIEWER_BOOTSTRAP_START`, one `mindar-image` configuration, and one anchor-registration path.

- [ ] **Step 1: Write failing ownership assertions**

```ts
it('keeps MindAR configuration in ar-viewer.js only', () => {
  const html = readFileSync(resolve('public/ar-viewer.html'), 'utf8');
  const runtime = readFileSync(resolve('public/static/ar-assets/js/ar-viewer.js'), 'utf8');
  expect(html).not.toContain("scene.setAttribute('mindar-image'");
  expect(html).not.toContain('VIEWER_BOOTSTRAP_START');
  expect(runtime.match(/VIEWER_BOOTSTRAP_START/g)).toHaveLength(1);
  expect(runtime.match(/setAttribute\(['\"]mindar-image['\"]/g)).toHaveLength(1);
});
```

- [ ] **Step 2: Run and confirm RED**

Run:

```powershell
npm.cmd test -- src/__tests__/arViewerBootstrapContract.test.ts
```

Expected: FAIL because `ar-viewer.html` currently emits bootstrap and constructs MindAR config before loading `ar-viewer.js`.

- [ ] **Step 3: Reduce HTML to script loading and delegate runtime bootstrap**

The inline HTML loader may emit script-stage diagnostics, but after loading the vendor it must only call:

```js
await loadScript('/static/vendor/aframe-1.4.2.min.js', 'aframe', deadlineAt);
await loadScript('/static/vendor/mindar-image-aframe-1.2.5.prod.js', 'mindar', deadlineAt);
await loadScript('/static/ar-assets/js/ar-viewer.js', 'viewer', deadlineAt);
if (!window.ARViewerBootstrap) throw new Error('VIEWER_BOOTSTRAP_EXPORT_MISSING');
await window.ARViewerBootstrap.start({ deadlineAt });
```

`ar-viewer.js` exports exactly one owner:

```js
window.ARViewerBootstrap = Object.freeze({
  start: bootstrapViewer,
});
```

`bootstrapViewer` parses `mindUrl`, `catalogId`, `targetCount`, `maxTrack`, creates anchors, sets the scene's `mindar-image` attribute once, installs listeners, and rejects repeated calls with `VIEWER_BOOTSTRAP_DUPLICATE`.

- [ ] **Step 4: Parse and test the static runtime**

Run:

```powershell
node --check public/static/ar-assets/js/ar-viewer.js
npm.cmd test -- src/__tests__/arViewerBootstrapContract.test.ts src/__tests__/ARContainerV2.persistentViewer.test.tsx
```

Expected: PASS; static syntax valid; the iframe does not remount in persistent tests.

- [ ] **Step 5: Commit bootstrap ownership**

```powershell
git add frontend-web/public/ar-viewer.html frontend-web/public/static/ar-assets/js/ar-viewer.js frontend-web/src/__tests__/arViewerBootstrapContract.test.ts
git diff --cached --check
git commit -m "refactor(ar): centralize MindAR viewer bootstrap"
```

---

### Task 11: Add bounded engine-stage lifecycle and typed diagnostics

**Files:**
- Create: `frontend-web/public/static/ar-assets/js/ar-engine-lifecycle.js`
- Create: `frontend-web/src/__tests__/arEngineLifecycle.test.ts`
- Modify: `frontend-web/public/ar-viewer.html`
- Modify: `frontend-web/public/static/ar-assets/js/ar-viewer.js`
- Modify: `frontend-web/src/core/types/ARMessages.ts`
- Modify: `frontend-web/src/components/ar/ARContainerV2.tsx`

**Interfaces:**
- Consumes: stage name, timeout, catalog/target identity, and debug transport.
- Produces: `startStage(name, details, timeoutMs) -> { succeed, reject, cancel }` and typed `AR_ENGINE_STAGE` messages.

- [ ] **Step 1: Write lifecycle tests against a fake clock**

```ts
it('emits exactly one terminal result per engine stage', () => {
  vi.useFakeTimers();
  const events: any[] = [];
  const lifecycle = createAREngineLifecycle((event) => events.push(event));
  const stage = lifecycle.startStage('MIND_FETCH', { catalogId: 'animals-v2' }, 5000);
  stage.succeed({ bytes: 756880 });
  stage.reject('LATE_ERROR');
  vi.advanceTimersByTime(5000);
  expect(events.map((event) => event.status)).toEqual(['started', 'succeeded']);
});

it('turns an unfinished stage into a bounded timeout', () => {
  vi.useFakeTimers();
  const events: any[] = [];
  const lifecycle = createAREngineLifecycle((event) => events.push(event));
  lifecycle.startStage('MINDAR_SYSTEM_READY', { catalogId: 'animals-v2' }, 8000);
  vi.advanceTimersByTime(8000);
  expect(events.at(-1)).toMatchObject({
    stage: 'MINDAR_SYSTEM_READY',
    status: 'rejected',
    errorCode: 'ENGINE_STAGE_TIMEOUT',
  });
});
```

- [ ] **Step 2: Implement a browser-global lifecycle utility**

```js
window.createAREngineLifecycle = function createAREngineLifecycle(emit) {
  const active = new Map();
  return {
    startStage(stage, details, timeoutMs) {
      if (active.has(stage)) throw new Error(`ENGINE_STAGE_DUPLICATE:${stage}`);
      let terminal = false;
      emit({ stage, status: 'started', details, timestamp: Date.now() });
      const finish = (status, extra) => {
        if (terminal) return;
        terminal = true;
        clearTimeout(timer);
        active.delete(stage);
        emit({ stage, status, details: { ...details, ...extra }, timestamp: Date.now() });
      };
      const timer = setTimeout(() => finish('rejected', { errorCode: 'ENGINE_STAGE_TIMEOUT' }), timeoutMs);
      active.set(stage, finish);
      return {
        succeed: (extra = {}) => finish('succeeded', extra),
        reject: (errorCode, extra = {}) => finish('rejected', { errorCode, ...extra }),
        cancel: () => finish('cancelled', {}),
      };
    },
  };
};
```

- [ ] **Step 3: Wire named stages through viewer and parent**

Load `ar-engine-lifecycle.js` before `ar-viewer.js`. Wrap manifest validation, `.mind` fetch readiness, MindAR config, system ready, anchor declaration, active-target apply, and model entity readiness. Send:

```ts
AR_ENGINE_STAGE: {
  stage: 'MIND_MANIFEST' | 'MIND_FETCH' | 'MINDAR_CONFIG' | 'MINDAR_SYSTEM_READY' | 'ANCHORS_DECLARED' | 'ACTIVE_TARGETS' | 'MODEL_ENTITY';
  status: 'started' | 'succeeded' | 'rejected' | 'cancelled';
  errorCode?: string;
  catalogId?: string;
  arTag?: string;
  mindTargetIndex?: number;
  slotIndex?: number;
  timestamp: number;
}
```

`ARContainerV2` forwards the complete payload to the mobile debug panel and rejects unknown stage/status values; it does not reinterpret global target index as slot index.

- [ ] **Step 4: Run lifecycle, type, viewer, and build checks**

Run:

```powershell
node --check public/static/ar-assets/js/ar-engine-lifecycle.js
node --check public/static/ar-assets/js/ar-viewer.js
npm.cmd test -- src/__tests__/arEngineLifecycle.test.ts src/__tests__/arViewerBootstrapContract.test.ts src/__tests__/ARContainerV2.persistentViewer.test.tsx
npm.cmd run build
```

Expected: all exit `0`; every simulated started stage has one terminal event.

- [ ] **Step 5: Commit engine-stage observability**

```powershell
git add frontend-web/public/static/ar-assets/js/ar-engine-lifecycle.js frontend-web/public/ar-viewer.html frontend-web/public/static/ar-assets/js/ar-viewer.js frontend-web/src/core/types/ARMessages.ts frontend-web/src/components/ar/ARContainerV2.tsx frontend-web/src/__tests__/arEngineLifecycle.test.ts
git diff --cached --check
git commit -m "feat(ar): bound and trace engine lifecycle stages"
```

---

### Task 12: Remove backend URL fallback and preserve catalog identity end to end

**Files:**
- Modify: `frontend-web/src/components/ar/arCatalogContract.ts`
- Modify: `frontend-web/src/hooks/useMultiFlashcard.ts`
- Modify: `frontend-web/src/components/ar/ARContainerV2.tsx`
- Modify: `frontend-web/src/pages/LearnARV2.tsx`
- Modify: `frontend-web/src/__tests__/arCatalogContract.test.ts`
- Modify: `frontend-web/src/__tests__/ARContainerV2.persistentViewer.test.tsx`
- Modify: `frontend-web/src/__tests__/LearnARV2.catalogFlow.test.tsx`
- Modify: `frontend-web/tests/e2e/persistent-mind-viewer.spec.ts`

**Interfaces:**
- Consumes: backend `tracking_mode`, `ar_tag`, `mind_catalog_id`, `mind_target_index`, and manifest-resolved `mindUrl`.
- Produces: catalog-aware cards whose URL can only originate from the manifest; legacy mode is explicit and cannot be entered by malformed catalog data.

- [ ] **Step 1: Write failing manifest-authority tests**

```ts
it('validates catalog identity without accepting a backend mind URL', () => {
  const manifest = animalsManifest();
  expect(validateCardForCatalog({
    trackingMode: 'catalog',
    arTag: 'elephant_marker_01',
    mindCatalogId: 'animals-v2',
    mindTargetIndex: 0,
  }, manifest)).toEqual(manifest.targets[0]);
});

it('does not fall back when a catalog-aware card is malformed', async () => {
  const response = catalogResponse({ mind_catalog_id: 'animals-v2', mind_target_index: null, nft_base_url: '/legacy.mind' });
  await expect(resolveCard(response, new AbortController().signal)).rejects.toThrow('CATALOG_IDENTITY_INVALID');
});

it('allows URL loading only for an explicit legacy response', async () => {
  const response = legacyResponse({ tracking_mode: 'legacy', nft_base_url: 'https://assets/legacy.mind' });
  await expect(resolveCard(response, new AbortController().signal)).resolves.toMatchObject({ trackingMode: 'legacy' });
});
```

- [ ] **Step 2: Run focused flow tests and confirm RED**

Run:

```powershell
npm.cmd test -- src/__tests__/arCatalogContract.test.ts src/__tests__/LearnARV2.catalogFlow.test.tsx src/__tests__/ARContainerV2.persistentViewer.test.tsx
```

Expected: FAIL because `CatalogCardIdentity` currently includes `mindUrl` and `useMultiFlashcard` retains a backend URL fallback.

- [ ] **Step 3: Make manifest resolution the only catalog URL path**

Change the identity shape to:

```ts
export interface CatalogCardIdentity extends MindCatalogTarget {
  trackingMode: 'catalog';
  mindCatalogId: string;
}
```

`validateCardForCatalog()` compares `mindCatalogId`, `arTag`, and `mindTargetIndex`; it no longer accepts or compares a card URL. `useMultiFlashcard` performs:

```ts
if (arObject.tracking_mode === 'catalog') {
  if (!arObject.mind_catalog_id || !Number.isInteger(arObject.mind_target_index)) {
    throw new Error('CATALOG_IDENTITY_INVALID');
  }
  const manifest = await loadMindCatalog(arObject.mind_catalog_id, signal);
  validateCardForCatalog({
    trackingMode: 'catalog',
    arTag: arObject.ar_tag,
    mindCatalogId: arObject.mind_catalog_id,
    mindTargetIndex: arObject.mind_target_index,
  }, manifest);
  mindUrl = manifest.mindUrl;
} else if (arObject.tracking_mode === 'legacy' && arObject.nft_base_url) {
  mindUrl = arObject.nft_base_url;
} else {
  throw new Error('AR_OBJECT_SCHEMA_INVALID');
}
```

No nullish coalescing or `||` expression may fall from a catalog manifest failure to `nft_base_url`.

- [ ] **Step 4: Preserve triple identity across active-target messages**

Every catalog active target and event contains:

```ts
{
  arTag: string;
  mindTargetIndex: number;
  slotIndex: number;
}
```

`LearnARV2` uses `slotIndex` for UI, combo lookup uses `arTag`, and viewer anchors use `mindTargetIndex`. On second-card rejection, keep the last acknowledged first-card revision and do not change iframe `src`.

- [ ] **Step 5: Run unit, mocked E2E, and build verification**

Run:

```powershell
npm.cmd test -- src/__tests__/arCatalogContract.test.ts src/__tests__/ARContainerV2.persistentViewer.test.tsx src/__tests__/LearnARV2.catalogFlow.test.tsx src/__tests__/arComboTagIdentity.test.ts
npm.cmd run test:e2e -- tests/e2e/persistent-mind-viewer.spec.ts
npm.cmd run build
```

Expected: all exit `0`; E2E output is labeled mocked desktop evidence, not physical target detection.

- [ ] **Step 6: Commit catalog/source wiring**

```powershell
git add frontend-web/src/components/ar/arCatalogContract.ts frontend-web/src/hooks/useMultiFlashcard.ts frontend-web/src/components/ar/ARContainerV2.tsx frontend-web/src/pages/LearnARV2.tsx frontend-web/src/__tests__/arCatalogContract.test.ts frontend-web/src/__tests__/ARContainerV2.persistentViewer.test.tsx frontend-web/src/__tests__/LearnARV2.catalogFlow.test.tsx frontend-web/tests/e2e/persistent-mind-viewer.spec.ts
git diff --cached --check
git commit -m "fix(ar): resolve catalog identity through manifest"
```

---

### Task 13: Run desktop verification and record the mobile gate honestly

**Files:**
- Modify: `docs/report/AR_PERSISTENT_VIEWER_TEST_RUNBOOK.md`
- Modify only if a test exposes a scoped defect: files already listed in Tasks 9–12.

**Interfaces:**
- Consumes: Phase A/B evidence and the fully instrumented desktop/test viewer.
- Produces: a measured verification record with explicit unsupported mobile claims.

- [ ] **Step 1: Run the complete backend and frontend gates from clean environments**

Run:

```powershell
cd backend
..\.venv\Scripts\python.exe -m pytest tests/test_ar_object_consistency.py tests/test_audit_ar_objects_consistency.py tests/test_repair_ar_objects_consistency.py tests/test_ar_objects_validator.py tests/test_admin_ar_object_consistency.py tests/test_ar_object_catalog_schema.py tests/test_flashcard_ar_response.py tests/test_ar_service.py -q

cd ..\frontend-web
npm.cmd ci
npm.cmd run ar:catalog:verify
npm.cmd run ar:catalog:verify-remote
npm.cmd test
npm.cmd run test:e2e -- tests/e2e/persistent-mind-viewer.spec.ts
npm.cmd run build
node --check public/static/ar-assets/js/ar-engine-harness.js
node --check public/static/ar-assets/js/ar-engine-lifecycle.js
node --check public/static/ar-assets/js/ar-viewer.js
```

Expected: every command exits `0`; no process is terminated to manufacture a passing result.

- [ ] **Step 2: Run the isolated harness in a desktop browser**

Record the actual commit, URL, browser version, manifest URL/status, `.mind` byte count, SHA-256, target count, `MINDAR_SYSTEM_READY`, and anchor count. If real printed markers and a desktop camera are available, record `TARGET_FOUND` separately; otherwise write `NOT RUN — desktop marker/camera unavailable`.

- [ ] **Step 3: Update the runbook with measured and deferred states**

The summary table must use these exact result categories:

```markdown
| Gate | Result | Evidence |
|---|---|---|
| Clean Node 24 `npm ci` | PASS/FAIL | command exit code and log timestamp |
| Supabase artifact checksum/count | PASS/FAIL | URL, SHA-256, bytes, target count |
| MongoDB test audit after repair | PASS/FAIL | redacted report path and invalid count |
| Isolated desktop engine bootstrap | PASS/FAIL | debug labels and browser version |
| Mocked persistent viewer E2E | PASS/FAIL | Playwright exit code |
| Physical iPhone scan order A | NOT RUN — device unavailable | no substitute evidence |
| Physical iPhone scan order B | NOT RUN — device unavailable | no substitute evidence |
| Physical no-second-camera check | NOT RUN — device unavailable | no substitute evidence |
```

Remove placeholder deployed URLs and old commit IDs. Do not write expected output under a heading named “Results.”

- [ ] **Step 4: Verify branch scope and plan completion boundary**

Run:

```powershell
git diff main...HEAD --check
git status --short
git grep -n -E "buildMindCatalog|mindar-loader|tfjs-node-entry|fill_legacy_catalog_defaults|legacy-singletons" -- frontend-web backend
```

Expected: no whitespace errors; only known unrelated user-owned files remain dirty; grep has no executable compiler/inference/write path matches. Historical documentation may mention removed names only when clearly labeled historical.

- [ ] **Step 5: Commit measured desktop evidence**

```powershell
git add docs/report/AR_PERSISTENT_VIEWER_TEST_RUNBOOK.md
git diff --cached --check
git commit -m "docs(ar): record desktop recovery verification"
```

Do not mark the overall AR feature complete and do not promote the feature flag while any physical mobile row remains `NOT RUN`.

---

## Final Acceptance and Stop Condition

The implementation session may finish the code and report **desktop/test ready, mobile unverified** when:

- Vercel-equivalent Node 24 `npm ci` no longer installs the compiler dependency graph.
- The Supabase `.mind` matches the manifest checksum, format version, and target count.
- Seed and test MongoDB audits report zero invalid documents after exact repair.
- All AR-object writes pass through the shared contract and serializer.
- The test MongoDB partial unique index and warning-mode validator are active.
- The isolated viewer reaches MindAR system ready using pinned local bundles.
- Frontend unit tests, mocked Playwright lifecycle, TypeScript/Vite build, and focused backend tests exit `0`.
- The runbook contains actual desktop evidence and explicitly labels every mobile gate `NOT RUN — device unavailable`.

The feature remains **not production-promotable** until a later physical-device session passes both scan orders, correct global index/model rendering, stable iframe/camera ownership, and no automatic 2D fallback.
