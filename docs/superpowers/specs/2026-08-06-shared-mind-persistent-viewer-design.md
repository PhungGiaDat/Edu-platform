# Shared Mind Catalog and Persistent Viewer Design

**Status:** Approved direction on 2026-08-06; awaiting written-spec review.

## Problem

The current multi-card flow mixes three different identities:

- the target's index inside a compiled `.mind` file;
- the card's position in the current scan session;
- the DOM/model slot used by the viewer.

That coupling made both earlier approaches unstable. Pair-specific combo files have a fixed target order that may not match QR scan order. Runtime merging restores scan order but fetches, decodes, merges, transfers, and reloads MindAR when the second card is added. `ARContainerV2` also replaces the viewer iframe with a scanner iframe during Add card, so the camera, MindAR scene, and event listeners are destroyed and recreated at the most race-prone point of the flow.

The replacement must make adding a second card an in-place configuration update, not a viewer restart.

## Goals

- Load one immutable, versioned `.mind` catalog for a lesson session.
- Keep one MindAR viewer and one camera stream alive after the first QR has been resolved.
- Add the second card without changing iframe `src`, rebuilding `.mind` bytes, or restarting MindAR.
- Map every AR tag to an explicit stable target index.
- Keep session order separate from MindAR target order.
- Preserve combo behavior without combo-specific tracking files.
- Fail fast on missing or inconsistent catalog data and required 3D assets.
- Never use a 2D asset as automatic recovery for a failed 3D model.

## Non-goals

- Supporting cards from different catalogs in the same viewer session.
- Dynamically extending a compiled catalog at runtime.
- Reusing the existing unmanifested five-target `animals.mind` file.
- Keeping runtime MessagePack merge as a fallback.
- Keeping pair-specific `combo_mind_url` as a tracking dependency.
- Refactoring unrelated AR gameplay, gamification, Unity, or session-break code.

## Architecture Decision

Use one `.mind` catalog per lesson or bounded course catalog. For the current animal lesson, the new artifact is `animals-v2.mind`. It is compiled deterministically from the ordered targets already represented by `animals_001`: index `0` is `elephant_marker_01` and index `1` is `shiba_marker_01`.

The catalog is immutable. Changing membership, input images, or target order creates a new catalog ID and URL rather than overwriting the existing object. The existing five-target `animals.mind` is not reused because it has no trustworthy source manifest for every index.

After the first standalone QR scan resolves the card and catalog, the viewer loads the catalog once. Every catalog anchor is created before MindAR starts. `maxTrack` is `2`, even when only one card is active. Adding a card activates content on an existing anchor; it does not add a new MindAR anchor or reload the scene.

## Identity Model

The system must use three explicit fields:

| Field | Meaning | Stability |
|---|---|---|
| `arTag` | Business identity, such as `elephant_marker_01` | Stable across catalog versions |
| `mindTargetIndex` | Position inside one immutable `.mind` catalog | Stable only within `catalogId` |
| `slotIndex` | Position in the current learning session, `0` or `1` | Determined by scan order |

No component may infer `mindTargetIndex` from array position or `slotIndex`. No combo may use `slotIndex` as its business identity.

## Catalog Contract

The checked-in source manifest is the authority for compilation and validation. It contains:

- `schemaVersion`;
- immutable `catalogId`;
- versioned `mindUrl`;
- ordered target entries with `arTag`, `mindTargetIndex`, and marker image path;
- `targetCount`;
- SHA-256 of the compiled file, generated after compilation.

The compiler must reject duplicate tags, duplicate indices, gaps, missing marker images, and an output target count that differs from the manifest. CI decodes the generated MessagePack and verifies MindAR version `2`, target count, and SHA-256.

The lesson seed keeps `mind_file_url` and `target_map`, but contract tests require them to match the catalog manifest exactly. This prevents the existing lesson metadata from silently drifting away from the compiled artifact.

## Backend Contract

`ARObject`, `ARObjectCreate`, `ARObjectUpdate`, `ARObjectResponse`, and legacy `ArObjectSchema` gain:

- `mind_catalog_id: str`;
- `mind_target_index: int` constrained to zero or greater.

`nft_base_url` remains the catalog `.mind` URL for backward compatibility. The flashcard endpoint returns all three fields together: catalog ID, catalog URL, and target index.

The backend must reject a new or updated object when only part of this triple is supplied. The public response serializer remains responsible for removing MongoDB `id` and `_id` fields.

Existing MongoDB documents are backfilled by exact `ar_tag` mappings from the reviewed catalog manifest. The migration is dry-run by default, uses no regex inference, verifies current values before updates, and requires an explicit apply flag. Unknown or unexpected documents are reported and left unchanged.

## Viewer Lifecycle

### Initial card

1. The standalone scanner owns the camera before a catalog is known.
2. It detects the first QR and the parent fetches the flashcard response.
3. The parent validates that `mind_catalog_id`, `nft_base_url`, and `mind_target_index` are present and mutually consistent.
4. The required model URL is preflighted as a GLB.
5. The scanner is removed and the viewer starts once with the catalog URL, catalog ID, and `maxTrack: 2`.
6. The viewer declares every catalog anchor before MindAR initialization and activates slot `0` on the first card's anchor.

### Add card

1. The Add card button sends `BEGIN_ADD_CARD_SCAN` to the existing viewer.
2. The viewer reads frames from MindAR's existing video element and runs the locally vendored QR decoder. It must not call `getUserMedia`.
3. QR decoding is active only during Add card mode and stops on detection, cancellation, or a 15-second timeout.
4. The parent fetches the second flashcard without changing the iframe or viewer phase.
5. The parent rejects the card if its catalog ID or catalog URL differs from the active catalog, its index is outside the manifest, or its required model fails preflight.
6. The parent sends the full active target set with a monotonically increasing revision.
7. The viewer binds the second model to the already-declared anchor identified by `mindTargetIndex`.
8. The viewer acknowledges the revision only after both active target bindings are valid and required models are loaded.
9. The parent commits the second card to visible session state only after that acknowledgement.

The first card remains active while the second QR is being scanned or rejected.

## Message Protocol

The typed protocol adds:

- `BEGIN_ADD_CARD_SCAN` with `sessionId`, `excludedQrIds`, and timeout;
- `CANCEL_ADD_CARD_SCAN`;
- `ADD_CARD_SCAN_STARTED`;
- `ADD_CARD_SCAN_TIMEOUT`;
- `SET_ACTIVE_TARGETS` with `catalogId`, `revision`, and the complete active target array;
- `ACTIVE_TARGETS_APPLIED` with the accepted revision and resolved identities;
- `ACTIVE_TARGETS_REJECTED` with revision, error code, and stage.

Each active target contains `slotIndex`, `mindTargetIndex`, `arTag`, `modelUrl`, texture URL when present, word, and transform settings.

Messages from a stale iframe, stale session ID, or older revision are ignored. A new revision replaces the entire desired target set; it is not a partial mutation.

## Viewer DOM Contract

Catalog anchors use their real target index:

- anchor ID: `mind-target-{mindTargetIndex}`;
- `mindar-image-target`: `targetIndex: {mindTargetIndex}`.

Session content uses slot identity:

- model ID: `slot-model-{slotIndex}`;
- word/audio state keyed by `slotIndex`;
- a lookup table maps `mindTargetIndex` to the current slot and AR tag.

`TARGET_FOUND`, `TARGET_LOST`, and `MODEL_CLICKED` include all three identities. Parent UI handlers use `slotIndex`; combo lookup uses `arTag`; MindAR listeners use `mindTargetIndex`.

## Combo Behavior

Tracking no longer depends on `combo_mind_url` or `target_order`. When two active tags match a backend combination, the existing combo model/effects may activate after both target anchors are found.

`required_tags` remains the combo identity. `target_order` and `combo_mind_url` remain readable during migration for backward compatibility but are ignored by the new viewer. They can be removed only in a separate cleanup after the new flow is deployed and verified.

## 3D-Only Failure Policy

There is no automatic image fallback.

- First-card catalog, mapping, or model failure transitions to the existing retryable AR error screen.
- Second-card validation or model failure rejects only the Add card operation and returns to the still-running first-card viewer.
- A catalog mismatch returns `MIND_CATALOG_MISMATCH` and does not restart with another `.mind`.
- An invalid index returns `MIND_TARGET_INDEX_INVALID`.
- A required model failure returns `MODEL_ASSET_UNAVAILABLE` during preflight or `MODEL_LOAD_ERROR` during viewer binding.
- A missing acknowledgement returns `ACTIVE_TARGETS_TIMEOUT`; the parent keeps the last acknowledged revision.
- An internal viewer/catalog contract violation is fatal because tracking state can no longer be trusted.

The explicit Learn/2D product mode may remain available as a user-selected mode, but it is never entered because a 3D asset failed.

## Local QR Decoder

The same jsQR version currently used by `ar-scanner.html` is vendored under the static AR assets and loaded locally by both scanner and viewer. Add-card QR scanning reuses the viewer's video element, a reusable canvas, and a throttled loop. It allocates no canvas per frame and stops immediately after a terminal event.

This establishes one camera owner on iOS and removes CDN availability from the Add card critical path.

## State Machine

The parent tracks:

- `catalogStatus`: `idle | validating | ready | fatal`;
- `addCardStatus`: `idle | scanning | resolving | applying | rejected`;
- `desiredRevision`;
- `acknowledgedRevision`;
- last acknowledged active targets.

`VIEWING` no longer means that a new iframe should be created. It means the persistent viewer is visible. Add card is a sub-state of `VIEWING`, not a transition back to the standalone `SCANNING` phase.

## Observability

The debug stream must make the no-reload invariant visible:

- exactly one `VIEWER_BOOTSTRAP_START` after the first card;
- exactly one `MINDAR_CONFIG_ACTIVE` for the session;
- `ADD_CARD_SCAN_STARTED` and terminal scan event;
- `ACTIVE_TARGETS_REQUESTED` with revision and identity triples;
- `ACTIVE_TARGETS_APPLIED` or `ACTIVE_TARGETS_REJECTED`;
- no `MULTI_MIND_PREPARE_STARTED`, `MULTI_MIND_MERGED`, or `MIND_BUFFER_REQUEST` in the new flow.

Debug payloads must not contain secrets or full binary buffers.

## Testing Strategy

### Catalog and backend

- Compiler contract verifies deterministic order, target count, MindAR version, and SHA-256.
- Seed contract verifies `lessons.json`, AR objects, and the manifest agree.
- Schema tests require non-negative target indices and complete catalog triples.
- Flashcard regression asserts HTTP 200 and the catalog fields for a card that has related combos.
- Migration tests prove dry-run default, exact mapping, compare-and-set filters, and no regex inference.

### Parent and viewer

- Identity tests prove scan slot `0` may map to Mind target `3`, and slot `1` may map to Mind target `0`.
- Lifecycle tests prove adding a card does not change iframe `src`, React key, or bootstrap count.
- Protocol tests prove stale revisions and stale iframe messages are ignored.
- Viewer tests prove all anchors exist before MindAR starts and use global indices.
- QR tests prove Add card uses the existing video and never calls `getUserMedia`.
- Failure tests prove model errors never trigger image fallback.
- Combo tests prove tag matching is independent of scan order and MindAR indices.

### Mobile regression

The automated mobile simulator exercises the message and lifecycle flow with mocked QR/target events on every change. Physical iPhone verification remains the final camera/tracking gate:

1. scan elephant as the first card;
2. enter Add card without camera permission being requested again;
3. scan shiba as the second card;
4. observe the same viewer instance and the same catalog URL;
5. detect and render each model on its own marker;
6. repeat in reverse scan order;
7. verify no 2D fallback after a deliberately broken model response.

## Migration and Rollout

1. Generate and verify the new versioned catalog from its checked-in source manifest.
2. Add backend fields and serializers while retaining old response fields.
3. Run the MongoDB migration in dry-run against the Render test database.
4. Apply only the reviewed exact mappings.
5. Deploy the backend and confirm flashcard responses carry valid catalog triples.
6. Deploy the persistent viewer behind an explicit frontend feature flag on `MindAR-Update`.
7. Run automated lifecycle tests and the physical-device matrix.
8. Remove the feature flag only after both scan orders pass.
9. Delete runtime merge and pair-specific tracking paths in the same release after the flag is promoted; do not leave an automatic fallback between architectures.

## Acceptance Criteria

- The first and second animal cards use the same versioned catalog URL.
- Adding the second card performs no iframe remount, MindAR restart, binary merge, or second `getUserMedia` call.
- Both scan orders map the correct model to the correct physical marker.
- Viewer events expose `arTag`, `mindTargetIndex`, and `slotIndex` without inference.
- Combo activation is based on tags and does not select another `.mind` file.
- Invalid catalog data or required models fail within bounded time and never fall back to 2D.
- Backend, frontend, catalog, migration, build, simulator, and physical iPhone checks pass before normal-branch rollout.
