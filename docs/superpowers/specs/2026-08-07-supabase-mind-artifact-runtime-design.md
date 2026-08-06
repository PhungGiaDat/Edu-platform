# Supabase Mind Artifact Runtime Design

**Status:** Approved direction on 2026-08-07; awaiting written-spec review.

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

## Goals

- Keep compiled `.mind` binaries exclusively in Supabase Storage.
- Remove MindAR compilation and its native dependencies from the frontend install and Vercel build.
- Make the checked-in manifest the only runtime authority for catalog URL and target mapping.
- Keep backend records focused on business identity: catalog ID and target index.
- Preserve legacy URL fields without using them for catalog-aware runtime resolution.
- Make clean-install, remote-artifact, deployment, and physical-device checks explicit release gates.
- Fail fast on missing manifests, unreachable artifacts, invalid indices, checksum mismatch in verification, and model failures.

## Non-goals

- Recompiling `.mind` files inside this repository, CI, Vercel, Render, or the browser runtime.
- Installing native graphics or TensorFlow build dependencies on Vercel.
- Committing `.mind` binaries to Git.
- Automatically modifying existing MongoDB legacy documents as part of the deployment fix.
- Restoring per-card or pair-specific `.mind` files.
- Adding an automatic 2D fallback.

## Architecture Decision

The official MindAR web compiler is the external authoring tool. A catalog author supplies the marker images in the reviewed order, downloads the compiled `.mind`, computes its SHA-256, and uploads it to a checksum-versioned public Supabase path. Replacing marker membership, marker images, or target order creates a new catalog version; an existing checksum URL is never overwritten.

The repository keeps only reviewable metadata:

- `animals-v2.manifest.json`, which is the runtime authority;
- `animals-v2.sources.json`, which records the ordered marker inputs and target identities for auditability;
- backend seed identities and target indices;
- tests and deployment verification scripts.

The repository does not keep compiler scripts, compiler shims, compiler dependencies, or the compiled binary.

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

Catalog-aware AR objects require:

- `mind_catalog_id`;
- `mind_target_index` greater than or equal to zero.

`mind_file_url` and `nft_base_url` remain optional legacy fields. New catalog-aware seed rows omit them. Existing MongoDB documents retain them until a separately reviewed, dry-run-first migration removes or normalizes them. The public response may continue serializing a legacy URL for legacy clients, but the persistent catalog viewer ignores it whenever `mind_catalog_id` is present.

For a catalog-aware response, the frontend loads the checked-in manifest by `mind_catalog_id` and validates that the returned `mind_target_index` belongs to the matching `arTag`. A missing manifest, missing identity, or inconsistent mapping is a fatal catalog error. It must not fall back to `nft_base_url` or a local `.mind` path.

For a genuinely legacy response without `mind_catalog_id`, the existing legacy viewer path may continue using its URL while the feature remains supported. This exception cannot be entered by an invalid catalog-aware record.

## Frontend Dependency Boundary

Remove the repository compiler entry point and shims:

- `scripts/buildMindCatalog.mjs`;
- `scripts/mindar-loader.mjs`;
- `scripts/tfjs-node-entry.mjs`;
- `scripts/.tfjs-shim.mjs`.

Remove `ar:catalog:build` from `frontend-web/package.json`. Remove direct packages whose only verified use is compilation, including `mind-ar`, `@napi-rs/canvas`, `@tensorflow/tfjs-node`, and `msgpackr`. Audit direct `canvas` and `puppeteer` usage; remove them when repository search and the clean frontend suite confirm there is no independent test or runtime consumer.

The locally vendored browser MindAR runtime remains. Removing the Node compiler package must not remove `public/static/vendor` assets used by `ar-viewer.html`. `jsqr` and the `vendor:jsqr` postinstall step remain because Add card scanning uses them.

## Runtime Data Flow

1. The backend returns `arTag`, `mind_catalog_id`, `mind_target_index`, and model metadata.
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

The first-card failures stop the 3D flow with a retryable visible error. Add-card failures keep the last acknowledged first-card viewer alive. None of these errors select 2D automatically or use an ignored local artifact.

## Verification Strategy

### Manifest unit contract

Unit tests validate manifest schema, unique tags, contiguous indices, source/manifest mapping, backend seed identity, and catalog-aware response mapping. They do not read `animals-v2.mind` from the repository and do not require network access.

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

1. Remove compiler scripts and compiler-only dependencies from `frontend-web`.
2. Update the manifest/source/backend identity contract so the manifest owns the only catalog URL.
3. Replace the local-binary unit test with manifest and remote-artifact verification.
4. Add the Node pin and clean Linux install/build gate.
5. Run backend tests, frontend tests, remote artifact verification, and clean build.
6. Deploy only to the Vercel test branch with `VITE_PERSISTENT_MIND_VIEWER=true`.
7. Complete both physical scan orders and failure cases.
8. Promote only after the runbook contains measured passing evidence.

## Acceptance Criteria

- A clean Vercel `npm ci` does not install `mind-ar`, TensorFlow Node, or the nested `canvas@2.11.2` compiler dependency.
- No Node MindAR compiler or compiler shim remains in `frontend-web`.
- No tracked test reads an ignored local `.mind` file.
- The manifest is the only URL authority for catalog-aware runtime loading.
- New catalog-aware seeds do not duplicate the manifest URL.
- Existing legacy MongoDB URL fields remain data-safe and are not used as fallback for invalid catalog-aware records.
- Remote verification proves the Supabase bytes match the manifest checksum and target count.
- Clean Linux install, full frontend tests, TypeScript/Vite build, targeted backend tests, and the preview deployment pass.
- Both physical scan orders render the correct 3D models without viewer restart, second camera acquisition, runtime merge, or automatic 2D fallback.
