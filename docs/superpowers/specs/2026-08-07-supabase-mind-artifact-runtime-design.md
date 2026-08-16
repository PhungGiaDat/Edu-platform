# Supabase Mind Artifact Runtime Design

**Status:** Revised from user review on 2026-08-07; awaiting written-spec re-review.

## Relationship to the Persistent Viewer Design

This document supersedes only the catalog compilation, artifact ownership, duplicated URL, and verification sections of `2026-08-06-shared-mind-persistent-viewer-design.md`. The persistent viewer, stable identity model, revision protocol, combo-by-tag behavior, and 3D-only failure policy remain unchanged.

The project already has a correctly compiled `animals-v2.mind` produced by the official MindAR web compiler. The repository and Vercel deployment therefore do not need a Node-based MindAR compiler.

## Problem

Compiler-only packages were added to `frontend-web`. A clean Vercel install consequently installs `mind-ar`, which pulls `canvas@2.11.2`. On Vercel Node 24 there is no matching prebuilt binary, so installation falls back to native compilation and fails because the build image lacks `pixman-1`. The deployment stops during `npm ci`, before TypeScript, Vite, or AR tests run.

The current catalog contract also produces false confidence:

- the `.mind` binary is ignored by Git but remains on existing developer machines;
- the unit test reads that ignored local file directly;
- the manifest points to Supabase while lesson and AR-object seeds still contain the former local URL;
- the physical-device runbook contains expected results and placeholders rather than measured deployment evidence.

Removing compiler dependencies fixes the confirmed Vercel installation blocker, but it does not prove that the AR runtime is correct. The MindAR integration is split between the inline bootstrap in `ar-viewer.html`, the vendored A-Frame and MindAR bundles, `static/ar-assets/js/ar-viewer.js`, the React iframe owner, and backend-driven target/model data. Divergent configuration, target identity, anchor creation, event translation, or model binding in any of those layers can independently produce the reported stuck or missing-model behavior.

The `ar_objects` MongoDB collection also has inconsistent document shapes and semantics. The current model requires a catalog pair, while historical documents may omit it, migrations may infer it, and raw repository writes bypass the Pydantic model. In particular, the seed editor assigns indices from row order while the admin auto-create path assigns every generated object to `legacy-singletons` index `0`. The admin path also writes transform values as JSON strings while the model examples use canonical A-Frame vector strings. These are codebase-level sources of inconsistent records inside the same collection, not isolated bad rows.

## Goals

- Keep compiled `.mind` binaries exclusively in Supabase Storage.
- Remove MindAR compilation and its native dependencies from the frontend install and Vercel build.
- Make the checked-in manifest the only runtime authority for catalog URL and target mapping.
- Keep backend records focused on business identity: catalog ID and target index.
- Preserve legacy URL fields without using them for catalog-aware runtime resolution.
- Make clean-install, remote-artifact, deployment, and physical-device checks explicit release gates.
- Fail fast on missing manifests, unreachable artifacts, invalid indices, checksum mismatch in verification, and model failures.
- Isolate and verify the actual MindAR engine path before changing viewer state logic.
- Define one enforceable MongoDB document contract with no partial or ambiguous tracking identity.
- Prevent raw repository writes and migrations from creating new collection inconsistency.

## Non-goals

- Recompiling `.mind` files inside this repository, CI, Vercel, Render, or the browser runtime.
- Installing native graphics or TensorFlow build dependencies on Vercel.
- Committing `.mind` binaries to Git.
- Automatically modifying existing MongoDB legacy documents as part of the deployment fix.
- Restoring per-card or pair-specific `.mind` files.
- Adding an automatic 2D fallback.
- Treating compiler removal as proof that target detection, anchor binding, or model rendering is fixed.
- Guessing MongoDB catalog identities or indices from regex, collection order, array position, or URL shape.

## Architecture Decision

The official MindAR web compiler is the external authoring tool. A catalog author supplies the marker images in the reviewed order, downloads the compiled `.mind`, computes its SHA-256, and uploads it to a checksum-versioned public Supabase path. Replacing marker membership, marker images, or target order creates a new catalog version; an existing checksum URL is never overwritten.

The repository keeps only reviewable metadata:

- `animals-v2.manifest.json`, which is the runtime authority;
- `animals-v2.sources.json`, which records the ordered marker inputs and target identities for auditability;
- backend seed identities and target indices;
- tests and deployment verification scripts.

The repository does not keep compiler scripts, compiler shims, compiler dependencies, or the compiled binary.

The repair is divided into three independently verified workstreams:

1. **Build boundary:** remove compiler-only dependencies and restore clean Vercel installation.
2. **Engine/codebase correctness:** establish one MindAR bootstrap owner and trace the real target-to-model path.
3. **Data consistency:** classify, audit, and repair `ar_objects` documents against explicit invariants.

Passing one workstream does not imply the others pass. Each has its own failing reproduction and acceptance evidence.

## Catalog Ownership and Contract

The manifest contains exactly:

- `schemaVersion`;
- immutable `catalogId`;
- checksum-versioned public `mindUrl` on Supabase;
- `sha256` of the uploaded bytes;
- `targetCount`;
- ordered targets containing `arTag` and `mindTargetIndex`.

`mindTargetIndex` values are contiguous from zero, unique, and stable only within one `catalogId`. `arTag` values are unique business identifiers. The manifest URL is the sole runtime URL; no frontend or backend component may replace it with a seed or Mongo URL for a catalog-aware card.

The sources file records marker provenance and ordering but does not duplicate `mindUrl`. Its target list must match the manifest target list exactly. It is documentation and validation input, not a runtime asset.

## Backend Contract and Legacy Data

Every `ar_objects` document has an explicit `tracking_mode` discriminator:

- `catalog`: the persistent shared-catalog architecture;
- `legacy`: an old per-object tracking URL retained only for backward compatibility.

Catalog-aware AR objects require:

- `mind_catalog_id`;
- `mind_target_index` greater than or equal to zero.

They must not depend on `nft_base_url`. Legacy AR objects require `nft_base_url` and must not pretend to belong to a shared catalog. A document with one catalog field but not the other, a catalog pair under legacy mode, or a legacy URL under catalog mode is invalid. This explicit discriminator replaces accidental polymorphism based on whichever fields happen to exist.

`mind_file_url` and `nft_base_url` remain legacy fields. New catalog-aware seed rows omit them. Existing MongoDB documents retain them until a separately reviewed, dry-run-first migration classifies and repairs them. The public response may continue serializing a legacy URL for legacy clients, but the persistent catalog viewer ignores it whenever `tracking_mode` is `catalog`.

For a catalog-aware response, the frontend loads the checked-in manifest by `mind_catalog_id` and validates that the returned `mind_target_index` belongs to the matching `arTag`. A missing manifest, missing identity, or inconsistent mapping is a fatal catalog error. It must not fall back to `nft_base_url` or a local `.mind` path.

For a response explicitly classified as `legacy`, the existing legacy viewer path may continue using its URL while the feature remains supported. This exception cannot be entered by an invalid catalog-aware record or inferred merely because a catalog field is missing.

## MongoDB Collection Consistency Contract

The `ar_objects` collection must satisfy these invariants for every document:

- `ar_tag` is a non-empty string and globally unique;
- `tracking_mode` is exactly `catalog` or `legacy`;
- catalog mode has a non-empty string `mind_catalog_id` and integer `mind_target_index >= 0`;
- `(mind_catalog_id, mind_target_index)` is unique among catalog-mode documents;
- catalog `ar_tag` and index match the checked-in manifest exactly;
- legacy mode has a non-empty `nft_base_url` and no catalog identity fields;
- catalog mode has a non-empty `model_3d_url` ending in `.glb` or `.gltf`, using an approved HTTPS or root-relative asset URL;
- `image_2d_url` and `texture_url` are either `null` or non-empty approved URL strings, never empty strings;
- `glb_size` is a positive number, `description` is non-empty, and `animation_type` belongs to the documented enum;
- `position`, `rotation`, and `scale` use one canonical A-Frame `"x y z"` string representation, not a mixture of vector strings, JSON strings, objects, and arrays;
- timestamp fields use MongoDB dates rather than mixed strings and dates;
- no response exposes raw Mongo `_id`/`id` differences through repository dictionaries.

Before mutation, an inventory command performs a collection-wide aggregation and reports counts and document identifiers for:

- valid catalog documents;
- valid legacy documents;
- missing, partial, null, string-typed, negative, or conflicting catalog fields;
- duplicate tags and duplicate catalog indices;
- transform and timestamp type variants;
- manifest mapping mismatches;
- deprecated URLs on catalog-mode documents;
- unknown documents that cannot be repaired from an exact reviewed mapping.

The repair migration is dry-run by default. It uses exact `ar_tag -> tracking_mode/catalog/index` mappings, compare-and-set filters containing the old values, and one-document updates. It never derives an index from regex, URL text, collection order, or the current array position. Unknown documents are reported and left unchanged. `fill_legacy_catalog_defaults.py` and the admin `legacy-singletons/index 0` behavior are retired because they create identities that do not correspond to one real shared `.mind` catalog.

All write paths use the same Pydantic/serializer boundary before reaching MongoDB. Raw dictionary inserts cannot bypass the tracking and transform validators. Admin auto-create must either receive an exact manifest mapping or fail with a validation error; it must not invent catalog identity.

After the inventory reports zero invalid documents, create a partial unique MongoDB index on `(mind_catalog_id, mind_target_index)` for catalog mode. Introduce a MongoDB JSON Schema validator with `validationAction: warn`, observe test-branch writes, then move to `validationAction: error` only after repository and admin regression tests prove every write path is compliant.

## Frontend Dependency Boundary

Remove the repository compiler entry point and shims:

- `scripts/buildMindCatalog.mjs`;
- `scripts/mindar-loader.mjs`;
- `scripts/tfjs-node-entry.mjs`;
- `scripts/.tfjs-shim.mjs`.

Remove `ar:catalog:build` from `frontend-web/package.json`. Remove direct packages whose only verified use is compilation, including `mind-ar`, `@napi-rs/canvas`, `@tensorflow/tfjs-node`, and `msgpackr`. Audit direct `canvas` and `puppeteer` usage; remove them when repository search and the clean frontend suite confirm there is no independent test or runtime consumer.

The locally vendored browser MindAR runtime remains. Removing the Node compiler package must not remove `public/static/vendor` assets used by `ar-viewer.html`. `jsqr` and the `vendor:jsqr` postinstall step remain because Add card scanning uses them.

## MindAR Engine and Codebase Investigation Contract

The compiled `.mind` is treated as known-good input only after it passes remote checksum and decode verification. Runtime debugging then proceeds through the real code path rather than assuming an artifact problem:

```text
LearnARV2
  -> useMultiFlashcard
  -> ARContainerV2
  -> ar-viewer.html bootstrap
  -> vendored A-Frame 1.4.2 and MindAR 1.2.5
  -> static/ar-assets/js/ar-viewer.js
  -> Supabase .mind
  -> MindAR anchors
  -> GLB asset and model entity
```

First, load the same Supabase `.mind` and marker in a minimal isolated viewer using the pinned vendor bundles. If target detection fails there, investigate artifact compatibility, vendor integrity, browser/WebGL support, and MindAR configuration. If it succeeds there but fails in `/learn-ar`, the defect is in the application integration, state machine, message protocol, data mapping, or model layer.

The vendored A-Frame and MindAR files have recorded versions and SHA-256 checksums. No CDN copy may shadow them. Do not upgrade either engine while fixing catalog/data wiring; an engine upgrade is a separate hypothesis and commit.

There must be one owner for each bootstrap responsibility. `ar-viewer.html` may load scripts and enforce a deadline, while `ar-viewer.js` owns scene configuration, anchors, listeners, and runtime lifecycle. The same `mindar-image` configuration must not be independently constructed in both files. React owns the iframe and revision protocol but never mutates MindAR anchors directly.

Instrumentation emits timestamped stage events with catalog ID, manifest target count, global index, slot index, and AR tag where applicable:

- `MIND_MANIFEST_VALIDATED`;
- `MIND_FETCH_START` and `MIND_FETCH_OK`;
- `MINDAR_CONFIG_APPLIED`;
- `MINDAR_SYSTEM_READY`;
- `ANCHORS_DECLARED`;
- `ACTIVE_TARGETS_APPLIED` or `ACTIVE_TARGETS_REJECTED`;
- `TARGET_FOUND` and `TARGET_LOST`;
- `MODEL_ASSET_LOADED` and `MODEL_ENTITY_READY`.

Every start event has a success, rejection, or bounded timeout. Errors preserve their originating stage. Mocked unit tests validate protocol logic, but only the isolated engine harness and physical marker tests are accepted as evidence for real target detection.

## Runtime Data Flow

1. The backend returns `tracking_mode`, `arTag`, catalog identity when applicable, and model metadata.
2. The frontend loads the checked-in manifest for `mind_catalog_id`.
3. The frontend validates catalog ID, tag/index mapping, target count, and Supabase URL format.
4. The persistent viewer receives the manifest `mindUrl` once and creates every anchor before MindAR starts.
5. The browser fetches the `.mind` directly from Supabase; Vercel and Render do not proxy or store the binary.
6. Add card changes only the active-target revision. It never changes the catalog URL or reloads the viewer.

The checksum-versioned URL prevents stale-object ambiguity. Runtime code does not fetch the file twice merely to recompute SHA-256 on mobile. Remote checksum verification belongs to the release gate.

## Failure Policy

- `CATALOG_MANIFEST_MISSING`: no checked-in manifest exists for the backend catalog ID.
- `CATALOG_ID_MISMATCH`: manifest and backend identity disagree.
- `MIND_TARGET_INDEX_INVALID`: tag/index mapping is absent, duplicated, or out of range.
- `MIND_ARTIFACT_UNAVAILABLE`: the Supabase object cannot be fetched.
- `MIND_ARTIFACT_CHECKSUM_MISMATCH`: release verification downloaded bytes that do not match the manifest.
- `MINDAR_BOOTSTRAP_FAILED`: MindAR cannot parse or initialize the verified artifact.
- `AR_OBJECT_SCHEMA_INVALID`: a backend document violates the collection discriminator or field types.
- `ENGINE_STAGE_TIMEOUT`: an engine stage started but did not reach success or a specific rejection before its deadline.

The first-card failures stop the 3D flow with a retryable visible error. Add-card failures keep the last acknowledged first-card viewer alive. None of these errors select 2D automatically or use an ignored local artifact.

## Verification Strategy

### Manifest unit contract

Unit tests validate manifest schema, unique tags, contiguous indices, source/manifest mapping, backend seed identity, and catalog-aware response mapping. They do not read `animals-v2.mind` from the repository and do not require network access.

### MongoDB consistency contract

Repository tests feed catalog, legacy, partial, duplicate, wrong-type, and mixed-transform fixtures through every create, update, auto-create, serializer, and migration path. The dry-run inventory result is archived before apply. After apply, the same inventory must report zero invalid known documents and no unexpected mutation. The migration is rerunnable and a second dry-run plans zero changes.

The test database also enables the JSON Schema validator in warning mode so raw insert paths are visible before enforcement.

### Remote artifact contract

A separate verification command downloads the public Supabase object to a temporary location, then verifies:

- HTTP success and non-empty bytes;
- SHA-256 equals the manifest;
- decoded MindAR format version is `2`;
- decoded target count equals `targetCount`.

This command runs in CI or as a mandatory pre-deployment check. A network failure is a failed release gate, not a reason to use a local fallback.

### Clean frontend gate

The frontend pins Node `24.x` in repository and Vercel configuration. CI uses a clean Linux checkout and runs:

```text
npm ci
npm test
npm run build
```

Passing against an existing local `node_modules` directory is not accepted as clean-install evidence.

### Engine isolation and integration gate

The minimal isolated viewer must reach `MINDAR_SYSTEM_READY`, declare the manifest target count, and emit the correct global `TARGET_FOUND` for each physical marker. The application integration test then proves the same indices survive the React-to-iframe message boundary and bind to the correct GLB entities. A mocked event is not substituted for the isolated engine result.

### Deployment and physical-device gate

After a successful preview deployment:

- verify manifest and `.mind` requests from the deployed origin;
- test elephant then shiba;
- test shiba then elephant;
- verify one viewer bootstrap, one camera permission flow, stable iframe source, and two applied revisions;
- verify both correct 3D models render on their global target indices;
- verify catalog and model failure cases remain 3D-fatal without fallback.

The runbook records the actual deployment commit, URL, browser/device version, debug-label counts, screenshots, and pass/fail result. Expected-output examples are not accepted as measured evidence.

## Rollout Sequence

1. Capture the current failing engine-stage log and run the minimal isolated viewer before changing runtime logic.
2. Run the MongoDB collection inventory in dry-run mode and archive every inconsistency category.
3. Remove compiler scripts and compiler-only dependencies from `frontend-web`.
4. Update the manifest/source/backend identity contract so the manifest owns the only catalog URL.
5. Replace inferred/raw MongoDB writes with the discriminated validated write boundary and exact dry-run repair.
6. Replace the local-binary unit test with manifest and remote-artifact verification.
7. Consolidate MindAR bootstrap ownership and add bounded engine-stage instrumentation without upgrading vendor versions.
8. Add the Node pin and clean Linux install/build gate.
9. Run backend tests, MongoDB post-repair inventory, frontend tests, isolated engine verification, remote artifact verification, and clean build.
10. Deploy only to the Vercel test branch with `VITE_PERSISTENT_MIND_VIEWER=true`.
11. Complete both physical scan orders and failure cases.
12. Promote only after the runbook contains measured passing evidence.

## Acceptance Criteria

- A clean Vercel `npm ci` does not install `mind-ar`, TensorFlow Node, or the nested `canvas@2.11.2` compiler dependency.
- No Node MindAR compiler or compiler shim remains in `frontend-web`.
- No tracked test reads an ignored local `.mind` file.
- The manifest is the only URL authority for catalog-aware runtime loading.
- New catalog-aware seeds do not duplicate the manifest URL.
- Existing legacy MongoDB URL fields remain data-safe and are not used as fallback for invalid catalog-aware records.
- Every `ar_objects` document is explicitly catalog or legacy mode; no partial/hybrid document remains.
- No write path invents a catalog ID/index or bypasses shared validation.
- Collection inventory reports no duplicate catalog indices, wrong field types, mixed transform encodings, or known manifest mapping mismatch.
- The MongoDB partial unique index exists and the JSON Schema validator has completed warning-mode observation before enforcement.
- Remote verification proves the Supabase bytes match the manifest checksum and target count.
- The isolated pinned-engine viewer detects both real markers at their manifest indices before application integration is considered passing.
- `ar-viewer.html`, `ar-viewer.js`, React, and the backend each have one documented responsibility with no duplicated MindAR configuration owner.
- Clean Linux install, full frontend tests, TypeScript/Vite build, targeted backend tests, and the preview deployment pass.
- Both physical scan orders render the correct 3D models without viewer restart, second camera acquisition, runtime merge, or automatic 2D fallback.
