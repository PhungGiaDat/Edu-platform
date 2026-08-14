# PostgreSQL cutover blocker reconciliation - 2026-08-13

## Session

2026-08-13, documentation-only reconciliation.

## Final status

- Database: `POSTGRES_CUTOVER_COMPLETE`
- Learner core: `LEARNER_CORE_COMPLETE`
- Legacy persistence: `LEGACY_NON_CORE_MONGO_REMAINS`
- Backend AR: `BACKEND_RUNTIME_READY`, `BACKEND_AR_SCHEMA_READY`
- Native AR content: `BACKEND_SCHEMA_READY_CONTENT_DATA_MISSING`
- Next core task: `RN ↔ UNITY BRIDGE SMOKE`

## Verified backend state

PostgreSQL is the default FastAPI learner-core runtime. Normal learner-core
startup does not initialize MongoDB/Beanie. The database contains 4 courses,
23 lessons, 24 canonical flashcards, 37 AR objects, and 24 tracking targets;
`tree_palm_02` is absent and `jungle01` is canonical.

The learner API intentionally exposes 3 published courses and 18 lessons.
`animals-adventure-en-5-7.is_published=false`; this is expected content
filtering, not migration loss. Publishing state must not be changed for this
reconciliation.

Auth, courses/lessons/session, flashcards, progress, AR composition, C26, and
pronunciation use PostgreSQL-backed paths. Core Mongo runtime dependencies:
`NONE`. Remaining Mongo code is `LEGACY_NON_CORE_MONGO_REMAINS` for admin,
editor, reports, legacy session/profile, chat/RAG, AI, and cache surfaces.

## AR gate separation

The backend implementation blocker is closed. The normalized ownership is:

```text
qr_id  → flashcard → ar_tracking_target
ar_tag → ar_object
```

The separate content dependency remains open: all 24 targets have
`reference_image_url=NULL` and `physical_width_m=NULL`. Do not infer either
value from card images, storage paths, pixels, GLB dimensions, `glb_size`, or
model scale.

## Unblocked tasks

The following may proceed without reopening PostgreSQL migration:

- RN ↔ Unity bridge smoke (`UNITY_READY`, `PING`, `PONG`)
- Unity bridge lifecycle pause/resume and unmount/remount
- Android physical bridge verification
- `ARBootstrapScene` and AR Foundation bootstrap
- `AR_READY` bridge event
- Unity registry/bridge infrastructure independent of real tracking content

## Blocking matrix

| Capability | Status | Blocking reason |
|---|---|---|
| PostgreSQL schema/data migration | DONE | none |
| FastAPI learner core | DONE | none |
| Auth, courses, lessons, flashcards | DONE | none |
| AR backend composition | DONE | none |
| C26 and pronunciation PostgreSQL | DONE | none |
| RN ↔ Unity bridge | READY_TO_EXECUTE | none |
| ARBootstrapScene | READY_TO_EXECUTE | none |
| `AR_READY` | READY_TO_EXECUTE | device/runtime verification required |
| Native image tracking | BLOCKED_ON_CONTENT | verified image and width missing |
| Single GLB | WAITING_ON_TRACKING | previous gate |
| Multi-card | WAITING_ON_SINGLE_CARD | previous gate |
| Combo | WAITING_ON_MULTI_CARD | previous gate |

## Next core gate

`RN ↔ Unity Bridge` → `UNITY_READY` → `PING/PONG` → lifecycle → physical
Android verification.

This entry supersedes stale progress statements that treat PostgreSQL cutover
or backend native fields as active learner-release blockers. Historical
progress files retain their original dated evidence.
