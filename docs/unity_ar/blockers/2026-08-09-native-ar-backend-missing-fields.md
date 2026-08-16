# Native AR backend fields and content readiness

## Status

`resolved` for the backend/persistence concern; `deferred` for native content
values.

## Required distinction

This blocker originally combined two separate concerns:

1. Backend/schema/API support for native tracking metadata — **RESOLVED**.
2. Real tracking-image provenance and measured card width — **OPEN as a
   content-preparation dependency**.

The correct aggregate state is:

`NATIVE_AR_BACKEND_BLOCKER_RESOLVED`

`BACKEND_SCHEMA_READY_CONTENT_DATA_MISSING`

Do not describe this as `NATIVE AR BLOCKER RESOLVED` without the content
qualification.

## Backend / persistence resolution

PostgreSQL now contains the normalized AR ownership model:

- `flashcards`: `qr_id` and `ar_tag` business identity.
- `ar_objects`: semantic/model data resolved through `ar_tag`.
- `ar_tracking_targets`: tracking provenance and optional native metadata
  resolved through `qr_id`.

FastAPI composition is verified as:

```text
qr_id   → flashcard
qr_id   → ar_tracking_target
ar_tag  → ar_object
```

The learner-core runtime is PostgreSQL-backed with
`POSTGRES_CORE_ENABLED=true`. The AR response contract supports optional:

- `reference_image_url`
- `physical_width_m`

No model URL, 2D image, pixel dimension, GLB dimension, `glb_size`, or scale
fallback is used. The backend implementation blocker is closed.

## Content blocker remains open

All 24 live tracking targets currently remain:

- `reference_image_url = NULL`
- `physical_width_m = NULL`

These values must remain unset until a content owner supplies both:

- a verified physical tracking image; and
- a measured `physical_width_m > 0` in metres.

No value may be fabricated from `image_url`, `image_2d_url`, Supabase paths,
legacy MindAR assets, pixels, GLB dimensions, `glb_size`, or model scale.

Backend/schema/runtime is ready. Native image-tracking content is not ready.

## Blocking matrix

| Capability | Status | Blocking reason |
|---|---|---|
| PostgreSQL schema/data migration | DONE | none |
| FastAPI PostgreSQL learner core | DONE | none |
| Auth / Courses / Lessons / Flashcards | DONE | none |
| AR backend composition | DONE | none |
| C26 / Pronunciation PostgreSQL paths | DONE | none |
| RN ↔ Unity bridge | READY_TO_EXECUTE | none |
| ARBootstrapScene | READY_TO_EXECUTE | none |
| `AR_READY` | READY_TO_EXECUTE | device/runtime verification required |
| Native image tracking | BLOCKED_ON_CONTENT | no verified image and width |
| Single GLB after tracking | WAITING_ON_TRACKING | previous gate |
| Multi-card | WAITING_ON_SINGLE_CARD | previous gate |
| Combo | WAITING_ON_MULTI_CARD | previous gate |

## Downstream tasks now unblocked

The following must not wait on PostgreSQL migration:

- RN ↔ Unity native bridge smoke (`UNITY_READY`, `PING`, `PONG`)
- lifecycle pause/resume and unmount/remount
- Android physical bridge verification
- `ARBootstrapScene` and AR Foundation bootstrap
- `AR_READY` bridge event
- Unity registry/bridge infrastructure that does not require a real tracking
  image

## Next AR gate sequence

```text
Backend/PostgreSQL                 COMPLETE
RN ↔ Unity Bridge                 NEXT CORE GATE
ARBootstrapScene → AR_READY
Prepare one verified tracking target
Single-card physical image tracking
Single GLB
Multi-card
Combo
```

The only remaining content dependency before physical image tracking is
`reference_image_url` plus `physical_width_m`.

## Historical context

The original 2026-08-09 blocker recorded the pre-cutover absence of native
fields and the unresolved image/width provenance decision. That historical
observation remains valid for its date; it is superseded as a backend blocker
by the PostgreSQL schema, repository, DTO, and runtime evidence above.
