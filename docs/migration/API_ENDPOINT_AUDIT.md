# API Endpoint Audit — RN Courses / Gamification / Pets

**Date:** 2026-07-25
**Audited files:** `backend/api/courses.py`, `backend/api/pets.py`, `backend/api/gamification.py`
**Supporting files:** `backend/main.py`, `backend/settings.py`, `backend/core/security.py`, `backend/models/course_model.py`, `backend/models/pet.py`, `backend/models/gamification_model.py`, `backend/services/course_service.py`, `backend/services/gamification_service.py`

---

## 1. Router Mount Prefixes

All routers register under one of two prefixes:

| Prefix | Value | Routers |
|--------|-------|---------|
| `API_V1_PREFIX` | `/api/v1` | `course_router`, `gamification_router`, `pet_router`, most others |
| `/api` | `/api` (hardcoded) | `lessons_router`, `session_tracking_router` |

**`lessons_router` and `session_tracking_router`** mount at `/api`, not `/api/v1`. Any RN client expecting consistent `/api/v1/` prefix will hit 404s for those endpoints.

---

## 2. Auth Behavior Summary

`get_current_user` (from `core/security.py`) is the standard auth dependency used by every protected endpoint. It:

1. Extracts a Bearer JWT from `Authorization` header.
2. Decodes with `SECRET_KEY` / `HS256`.
3. Looks up the user in MongoDB via `UserDocument.get(sub)`.
4. **Raises 404** if the user document does not exist (not 401).
5. **Raises 400** if the user is inactive.

All protected endpoints follow this pattern. Unauthenticated requests receive **401** from the OAuth2 dependency before reaching the handler.

---

## 3. Endpoint Matrix

### 3a. Courses (`course_router` → `/api/v1`)

| Method | Path | Auth | Response Model | Issues |
|--------|------|------|---------------|--------|
| `GET` | `/courses` | No | `List[CourseSchema]` | — |
| `GET` | `/courses/{course_id}` | No | `CourseSchema` | — |
| `GET` | `/courses/{course_id}/lessons/{lesson_id}` | No | *(raw dict)* | No `response_model` — shape unchecked |
| `GET` | `/courses/{course_id}/lessons/{lesson_id}/media` | **Yes** | *(raw dict)* | No `response_model` |
| `GET` | `/courses/{course_id}/lessons/{lesson_id}/session` | **Yes** | `LessonSession` (implicit) | No `response_model` on handler; service returns `Dict[str,Any]` |
| `POST` | `/courses/{course_id}/lessons/{lesson_id}/session/start` | **Yes** | `LessonSession` (implicit) | No `response_model` on handler |
| `POST` | `/courses/{course_id}/lessons/{lesson_id}/steps/attempt` | **Yes** | *(raw dict)* | No `response_model`; accepts `LessonStepAttemptRequest` (which expects `user_id` field from body, but the handler reads `user_id` from `current_user` instead) |
| `POST` | `/courses/generate` | No | `CourseSchema` | Admin/debug only |
| `POST` | `/courses/{course_id}/start` | No | `UserProgress` (implicit) | **No `response_model`**; `StartCourseRequest` body contains `user_id` field (should come from auth token, not body) |
| `POST` | `/lessons/{lesson_id}/complete` | **Yes** | *(raw dict)* | No `response_model`; path uses `{lesson_id}` not `{course_id}/lessons/{lesson_id}`; payload type `CompleteLessonRequest` — OK |
| `POST` | `/courses/{course_id}/lessons/{lesson_id}/complete` | No | *(raw dict)* | **Legacy duplicate** of above; uses `StartCourseRequest` instead of `CompleteLessonRequest`; no auth |
| `POST` | `/quizzes/{quiz_id}/submit` | No | *(raw dict)* | No `response_model`; `QuizSubmitRequest` body contains `user_id` (should come from auth) |
| `GET` | `/users/{user_id}/progress` | No | `List[UserProgress]` | **No auth**; `user_id` is a path param, not from token; returns progress for any user |

### 3b. Pets (`pet_router` → `/api/v1`)

| Method | Path | Auth | Response Model | Issues |
|--------|------|------|---------------|--------|
| `GET` | `/pets` | **Yes** | `PetListResponse` | — |
| `GET` | `/pets/{pet_id}` | **Yes** | `PetResponse` | — |
| `POST` | `/pets/{pet_id}/unlock` | **Yes** | `UnlockPetResponse` | — |
| `PUT` | `/pets/active` | **Yes** | `PetResponse` | — |
| `GET` | `/pets/active/current` | **Yes** | `Optional[PetResponse]` | FastAPI renders as `{"pets": null}` at the top level instead of `null` |
| `DELETE` | `/pets/active` | **Yes** | `{"success": bool, "message": str}` | Returns plain dict, not a Pydantic model |
| `POST` | `/pets/admin/create` | **No** | `PetResponse` | **No auth**; admin-only but unprotected |
| `PUT` | `/pets/admin/{pet_id}` | **No** | `PetResponse` | **No auth**; admin-only but unprotected |
| `DELETE` | `/pets/admin/{pet_id}` | **No** | `{"success": bool, "message": str}` | **No auth**; plain dict response |

### 3c. Gamification (`gamification_router` → `/api/v1`)

| Method | Path | Auth | Response Model | Issues |
|--------|------|------|---------------|--------|
| `GET` | `/gamification/leaderboard` | No | `List[Dict[str,Any]]` | Untyped |
| `GET` | `/gamification/user/{user_id}` | **Yes** | `UserPointsSchema` | Auth enforced but `user_id` path param is ignored; always returns `current_user`'s stats |
| `POST` | `/gamification/add-xp` | **Yes** | *(raw dict)* | Untyped; `AddXPRequest` body has `user_id` field (ignored — uses `current_user`) |
| `POST` | `/gamification/award-badge` | **Yes** | *(raw dict)* | Untyped |
| `GET` | `/gamification/pet/{user_id}` | **Yes** | *(raw dict)* | Auth enforced but `user_id` path param is ignored |
| `POST` | `/gamification/pet/feed` | **Yes** | *(raw dict)* | — |
| `POST` | `/gamification/pet/choose` | **Yes** | *(raw dict)* | `ChoosePetRequest` body has `user_id` field (ignored) |
| `POST` | `/gamification/pet/play` | **Yes** | *(raw dict)* | — |
| `POST` | `/gamification/pet/outfit` | **Yes** | *(raw dict)* | `ChangePetOutfitRequest` body has `user_id` field (ignored) |
| `GET` | `/gamification/pet-xp/{user_id}` | **Yes** | *(raw dict)* | Auth enforced but `user_id` path param is ignored |
| `GET` | `/gamification/stickers/catalog` | No | *(raw dict)* | Untyped; no auth |
| `GET` | `/gamification/stickers/{user_id}` | **Yes** | *(raw dict)* | Auth enforced but `user_id` path param is ignored |
| `POST` | `/gamification/stickers/collect` | **Yes** | *(raw dict)* | `CollectStickerRequest` body has `user_id` field (ignored) |
| `GET` | `/gamification/streak/{user_id}` | **Yes** | *(raw dict)* | Auth enforced but `user_id` path param is ignored |
| `POST` | `/gamification/track-learning` | **Yes** | *(raw dict)* | `TrackLearningRequest` body has `user_id` field (ignored) |
| `GET` | `/reports/child/{user_id}/summary` | **Yes** | *(raw dict)* | Auth enforced but `user_id` path param is ignored; mounted under `gamification_router` so full path is `/api/v1/reports/child/{user_id}/summary` |

---

## 4. Findings

### 4.1 CRITICAL

| ID | Issue | Location |
|----|-------|---------|
| C-01 | **`/pets/admin/*` endpoints have no auth.** `create_pet`, `update_pet`, and `delete_pet` are accessible to any unauthenticated request. | `pets.py:360, 417, 463` |
| C-02 | **`complete_lesson_legacy` uses wrong request model.** Uses `StartCourseRequest` (fields: `user_id`) instead of `CompleteLessonRequest` (fields: `user_id`, `course_id`, `score`, `time_spent`, etc.). Any RN call matching this path with a proper `CompleteLessonRequest` body will get a validation error. | `courses.py:182` |
| C-03 | **`/users/{user_id}/progress` has no auth.** Anyone can read any user's progress by guessing the `user_id`. | `courses.py:205` |
| C-04 | **`get_current_user` raises 404 (not 401) when user not found.** The MongoDB lookup returns 404, which leaks information about which user IDs exist in the system. | `security.py:123` |

### 4.2 HIGH

| ID | Issue | Location |
|---------|-------|---------|
| H-01 | **Duplicate `complete_lesson` paths with conflicting payloads.** Two endpoints accept lesson completion: `/lessons/{lesson_id}/complete` (auth, `CompleteLessonRequest`) and `/courses/{course_id}/lessons/{lesson_id}/complete` (no auth, `StartCourseRequest`). The second is a broken legacy duplicate. | `courses.py:154, 178` |
| H-02 | **`user_id` in request bodies is ignored but still required.** `AddXPRequest`, `ChoosePetRequest`, `ChangePetOutfitRequest`, `CollectStickerRequest`, `TrackLearningRequest`, `QuizSubmitRequest`, `LessonStepAttemptRequest`, `StartCourseRequest`, `CompleteLessonRequest`, and `LessonSessionRequest` all have a `user_id` field that is never read — the handler overwrites it from `current_user`. RN clients must still send these fields, creating unnecessary payload. | Multiple files |
| H-03 | **FastAPI route conflict on `/courses/{course_id}/lessons/{lesson_id}/complete` vs `/lessons/{lesson_id}/complete`.** FastAPI resolves `/lessons/{lesson_id}` as `/courses/{course_id}/lessons/{lesson_id}` with `course_id = "lessons"`, meaning the specific path takes priority. However, the legacy duplicate endpoint will never be reached, and the correct path uses wrong payload. | `courses.py:154, 178` |
| H-04 | **`lessons_router` and `session_tracking_router` mount at `/api` instead of `/api/v1`.** Any RN client using a base URL of `/api/v1` will get 404s for those endpoints. | `main.py:261–270` |

### 4.3 MEDIUM

| ID | Issue | Location |
|---------|-------|---------|
| M-01 | **Most endpoints lack `response_model`**, returning raw `Dict[str,Any]`. This means FastAPI cannot validate or document the response shape. The RN client has no generated-type guidance for these responses. | `courses.py`, `gamification.py` |
| M-02 | **`LessonStepAttemptRequest` and `LessonSessionRequest` both define `user_id` as required fields** but handlers ignore them. If the RN client omits `user_id` from the JSON body, FastAPI returns a 422 validation error. | `course_model.py:341, 359` |
| M-03 | **`GET /pets/active/current` returns `Optional[PetResponse]`.** FastAPI wraps this as `{"pets": null}` instead of a bare `null`. The `null` should be the direct response body. | `pets.py:307` |
| M-04 | **`DELETE /pets/active` returns a plain dict** (`{"success": true, "message": "..."}`) instead of a Pydantic model, bypassing schema documentation. | `pets.py:341` |
| M-05 | **`QuizSubmitRequest` requires `user_id` in body but handler ignores it.** Same issue as H-02. Also: `quiz_id` is mapped to `lesson_id` at the service layer with a comment "a separate quiz collection can be added later" — this is a known limitation. | `courses.py:191` |

### 4.4 LOW

| ID | Issue | Location |
|---------|-------|---------|
| L-01 | **`get_user_stats` ignores the `user_id` path param** (overwrites with `current_user.id`). Inconsistent with REST conventions but functionally correct for auth-gated endpoints. | `gamification.py:55` |
| L-02 | **`/gamification/stickers/catalog` has no auth.** Returns sticker definitions (non-user-specific). Acceptable but should be documented as intentionally public. | `gamification.py:168` |
| L-03 | **`get_active_pet` returns `None` (not wrapped)** when no active pet is set, which FastAPI serializes correctly. However, the `Optional[PetResponse]` annotation on the endpoint suggests the intent was a nullable object, not a bare `null` response body. | `pets.py:307` |
| L-04 | **`submit_lesson_step` handler ignores `payload.user_id`** — same pattern as H-02. | `courses.py:102` |

---

## 5. RN-Specific Endpoint Availability

| RN Need | Backend Endpoint | Status | Notes |
|---------|-----------------|--------|-------|
| List courses | `GET /api/v1/courses` | ✅ Available | No auth |
| Course detail | `GET /api/v1/courses/{id}` | ✅ Available | No auth |
| Lesson detail | `GET /api/v1/courses/{id}/lessons/{id}` | ✅ Available | No auth; no `response_model` |
| Start lesson session | `POST /api/v1/courses/{id}/lessons/{id}/session/start` | ✅ Available | Auth required |
| Get session | `GET /api/v1/courses/{id}/lessons/{id}/session` | ✅ Available | Auth required |
| Submit step | `POST /api/v1/courses/{id}/lessons/{id}/steps/attempt` | ⚠️ Partial | Auth; body requires `user_id` (ignored); no `response_model` |
| Complete lesson | `POST /api/v1/lessons/{id}/complete` | ⚠️ Partial | Auth; correct path; wrong request model on legacy duplicate |
| Start course | `POST /api/v1/courses/{id}/start` | ⚠️ Partial | No auth; requires `user_id` in body (should be from token) |
| Quiz submit | `POST /api/v1/quizzes/{id}/submit` | ⚠️ Partial | No auth; `user_id` in body (ignored by handler); `quiz_id` maps to `lesson_id` |
| User progress | `GET /api/v1/users/{id}/progress` | ❌ No Auth | Anyone can read any user's progress |
| Pet list | `GET /api/v1/pets` | ✅ Available | Auth required |
| Pet detail | `GET /api/v1/pets/{id}` | ✅ Available | Auth required |
| Unlock pet | `POST /api/v1/pets/{id}/unlock` | ✅ Available | Auth required |
| Set active pet | `PUT /api/v1/pets/active` | ✅ Available | Auth required; body: `{pet_id}` |
| Get active pet | `GET /api/v1/pets/active/current` | ⚠️ Partial | Auth; response may wrap as `{"pets": null}` |
| XP / user stats | `GET /api/v1/gamification/user/{id}` | ⚠️ Partial | Auth; ignores path param (uses token) |
| Add XP | `POST /api/v1/gamification/add-xp` | ⚠️ Partial | Auth; untyped; body requires `user_id` (ignored) |
| Streak | `GET /api/v1/gamification/streak/{id}` | ⚠️ Partial | Auth; ignores path param; untyped |
| Leaderboard | `GET /api/v1/gamification/leaderboard` | ✅ Available | No auth; untyped |

---

## 6. Summary

- **4 Critical issues** require immediate attention (C-01 through C-04).
- **4 High-priority issues** affect data integrity and correct routing for RN clients (H-01 through H-04).
- **5 Medium issues** reduce type safety and API discoverability (M-01 through M-05).
- **4 Low issues** are cosmetic or advisory (L-01 through L-04).
- **No AR-only endpoints** were audited per scope exclusion.

The most impactful fixes for the RN migration are:
1. Add auth to `/pets/admin/*` (C-01).
2. Remove or fix the legacy `complete_lesson_legacy` duplicate (C-02, H-01).
3. Add auth to `/users/{user_id}/progress` (C-03).
4. Fix `lessons_router`/`session_tracking_router` mount prefix to `/api/v1` (H-04).
5. Remove `user_id` from all request body schemas that are auth-protected (H-02).
