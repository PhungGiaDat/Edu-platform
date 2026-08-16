## Status
draft

## Goal
Lock in the backend AR API contract and document native AR additive field requirements.

---

## Current Backend AR API

### Endpoint: `GET /api/v1/flashcard/{qr_id}`

`qr_id` is an opaque business identifier (e.g., `ele123`, `apple_001`).

Response shape:
```json
{
  "flashcard": {
    "qr_id": "...",
    "word": "...",
    "translation_vi": "...",
    "ar_tag": "...",
    "audio_url": "..."
  },
  "target": {
    "ar_tag": "...",
    "description": "...",
    "animation_type": "rotate|bounce|idle|none",
    "glb_size": 1.0,
    "nft_base_url": "...",
    "model_3d_url": "https://cdn.example.com/model.glb",
    "texture_url": null,
    "image_2d_url": "https://cdn.example.com/image.png",
    "position": "0 0 0",
    "rotation": "0 0 0",
    "scale": "1 1 1",
    "mind_catalog_id": "animals-v2",
    "mind_target_index": 0
  },
  "related_combos": [
    {
      "combo_id": "chicken_egg_reward",
      "required_tags": ["flashcard_chicken", "flashcard_egg"],
      "target_order": null,
      "model_3d_url": "https://cdn.example.com/combo.glb",
      "combo_mind_url": null,
      "bonus_xp": 25,
      "center_transform": { "position": "0 0 0", "rotation": null, "scale": null },
      "semantic_result": "spawn_reward",
      "animation": "particle_burst",
      "sound": null,
      "phrase": "Great combo!",
      "priority": 0,
      "active": true,
      "flashcard_set": "animals",
      "cross_category_allowed": false
    }
  ]
}
```

---

## Native AR Additive Requirements

The following fields are REQUIRED for native AR image tracking. They exist in the `ar_tracking_targets` PostgreSQL table (added in prior session). Backend API schema (`ARExperienceResponseSchema`) already includes both fields.

### Required: `reference_image_url`
- **Type:** `str`
- **Description:** URL of the physical printout's reference image (PNG/JPG) for native AR tracking
- **Purpose:** Unity downloads this image at runtime → adds to `MutableRuntimeReferenceImageLibrary`
- **Naming note:** The field name in `UnityARExperiencePayload` (RN) and `CardDescriptor` (Unity) follows existing conventions. See **Tracking Identity** section below.
- **Validation:** Must be a valid HTTPS URL; image must be suitable for AR image tracking (sufficient feature points)
- **Default:** None — must be populated per ar_object

### Required: `physical_width_m`
- **Type:** `float`
- **Description:** Physical width of the printed card in meters
- **Purpose:** AR subsystem uses this to determine tracking distance and scale; printed card width ≠ 3D model size
- **Note:** `glb_size` is NOT a substitute — it is for model content sizing only
- **Typical values:** 0.05–0.20 meters depending on print size
- **Default:** None — must be populated per ar_object

### Schema status

The `reference_image_url` and `physical_width_m` columns already exist in the `ar_tracking_targets` PostgreSQL table. The `ARExperienceResponseSchema` already includes both fields. No schema migration is required.

The remaining work is content population (see P2 fast-path plan).

---

## Tracking Identity

There are four distinct identity layers. Each has a specific semantic purpose and must not be conflated with the others.

| Layer | Field name | Scope | Examples | Purpose |
|-------|-----------|-------|----------|---------|
| `qrId` | `qr_id` (backend) | Business flashcard identity | `ele123`, `apple_001` | Primary lookup key across RN, Unity registry, backend |
| `arTag` | `ar_tag` (backend) | Semantic AR / combo identity | `elephant`, `apple_marker` | Combo lookup via `required_tags` in `ARCombination` |
| Reference image identity | `reference_image_url` (backend) / `imageUrl` (Unity CardDescriptor) | AR Foundation tracking definition | `https://cdn.example.com/ref_ele.png` | Unity runtime image library construction |
| `TrackableId` | `ARTrackedImage.trackingId` (AR Foundation) | Runtime tracked physical instance | `guid-xxx-yyy` | Ephemeral per-session runtime handle; NOT a stable card key |

**Resolving `required_tags` to runtime cards:** Backend `ARCombination.required_tags` contains `ar_tag` values. Unity resolves `ar_tag` → `qrId` via `MultiCardRegistry` (which holds the full `CardDescriptor` per card, including `qrId`). Detection order does NOT determine card identity.

**Note on naming:** `referenceImageUrl` (mixed case) does not appear in existing naming conventions. The RN payload uses `imageUrl` in `CardDescriptorRN`; Unity uses `imageUrl` in `CardDescriptor`. The backend uses `reference_image_url`. These are intentionally aligned: all three names refer to the same runtime tracking image URL.

## Combo Definitions

Backend `ARCombination` documents define combo semantics.

Required for native AR:
- `required_tags`: list of `ar_tag` values (NOT `qr_id` values) that must all be visible simultaneously for the combo to fire
- `bonus_xp`: XP awarded on trigger
- `semantic_result`: effect type
- `animation`: animation to play
- `center_transform`: position/rotation/scale of combo reward model

Optional:
- `cross_category_allowed`: whether combos can span flashcard categories

**Note:** `required_tags` contains `ar_tag` values. Unity `ComboManager` resolves `ar_tag → qrId` via `MultiCardRegistry` to find the correct `CardDescriptor` for each participant.

---

## Gamification

Unity emits events. React Native performs authenticated backend mutations.

Do NOT move gamification into Unity.

---

## Open questions

| # | Question | Blocks approval? |
|---|----------|-----------------|
| BQ-1 | What is the exact migration path for existing ar_objects to populate `reference_image_url` and `physical_width_m`? | Yes |
| BQ-2 | Who creates and hosts the reference images? Is it the same as `image_2d_url` or a separate higher-quality image? | Yes |
| BQ-3 | What is the default `physical_width_m` for cards that don't have it set? | Yes | **Resolved** — `physical_width_m = NULL` is acceptable. Unity handles null width via the unknown-size registration path (`widthMeters = 0f` for ARCore). No fallback constant is used. Production physical measurements are required before production deployment. |
