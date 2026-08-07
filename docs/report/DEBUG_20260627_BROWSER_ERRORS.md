# Debug Report: 422 Unprocessable Content Errors

**Date:** 2026-06-27  
**Severity:** High  
**Status:** Root Cause Identified

---

## Executive Summary

Four 422 errors were investigated across the pet and gamification API endpoints. The root causes are:

1. **Duplicate/Conflicting Endpoints**: Two routers define similar pet endpoints with different HTTP methods and request body shapes
2. **Frontend Mismatch**: Frontend uses wrong HTTP methods or URL paths compared to backend routes
3. **Schema Mismatch**: Frontend sends extra fields (e.g., `pet_id` in feed) that backend doesn't expect

---

## Error 1: `PUT /api/v1/pets/active` → 422

### Backend Route Handler
**File:** `backend/api/pets.py` (lines 262-305)
```python
@router.put("/pets/active", response_model=PetResponse)
async def set_active_pet(
    request: SetActivePetRequest,
    current_user: UserDocument = Depends(get_current_user),
    ...
):
```

### Pydantic Schema
**File:** `backend/models/pet.py` (lines 130-133)
```python
class SetActivePetRequest(BaseModel):
    """Schema for setting active pet"""
    pet_id: str
```

### Frontend Code
**File:** `frontend-web/src/hooks/usePets.ts` (line 173)
```typescript
await apiClient.put('/api/v1/pets/active', { pet_id: petId });
```

### Analysis
- **Method:** PUT ✅ (matches backend)
- **URL:** `/api/v1/pets/active` ✅ (matches backend)
- **Body:** `{ pet_id: petId }` ✅ (matches `SetActivePetRequest`)
- **Potential Issue:** Empty or null `pet_id` would fail Pydantic validation

### Additional Finding: Conflicting Endpoint
**File:** `frontend-web/src/services/apiClient.ts` (lines 893-899)
```typescript
setActivePet: (userId: string, petId: string) =>
  request('/api/v1/gamification/pets/active', {
    method: 'POST',  // ❌ Wrong method - should be PUT
    body: { user_id: userId, pet_id: petId },  // ❌ Extra user_id field
  }),
```

**Note:** This dedicated API method uses POST with extra `user_id` field, but the actual backend route at `/gamification/pets/active` doesn't exist. The correct endpoint is in `pets.py`.

### Root Cause
Schema validation failure - likely empty `pet_id` or the API is receiving unexpected content.

---

## Error 2: `GET /api/v1/gamification/stickers/collect` → 422

### Backend Route Handler
**File:** `backend/api/gamification.py` (lines 197-208)
```python
@router.post("/gamification/stickers/collect")  # ❌ POST method
async def collect_sticker(
    request: CollectStickerRequest,
    current_user: UserDocument = Depends(get_current_user),
    ...
):
```

### Pydantic Schema
**File:** `backend/api/gamification.py` (lines 42-44)
```python
class CollectStickerRequest(BaseModel):
    user_id: str
    sticker_id: str
```

### Frontend Code
**File:** `frontend-web/src/hooks/useGamification.ts` (lines 281-302)
```typescript
const result = await apiClient.post('/api/v1/gamification/stickers/collect', {
    user_id: userId,
    sticker_id: stickerId
});
```

### Analysis
- **Method:** POST ✅ (matches backend)
- **URL:** `/api/v1/gamification/stickers/collect` ✅ (matches backend)
- **Body:** `{ user_id, sticker_id }` ✅ (matches `CollectStickerRequest`)

### Root Cause
HTTP 422 on GET request to a POST-only endpoint. The browser/frontend is making a GET request instead of POST, causing FastAPI to return 422 (missing required request body).

---

## Error 3: `GET /api/v1/pets/active` → 422

### Backend Route Handler
**File:** `backend/api/pets.py` (lines 307-337)
```python
@router.get("/pets/active/current", response_model=Optional[PetResponse])  # Different path!
async def get_active_pet(
    current_user: UserDocument = Depends(get_current_user),
    ...
):
```

### Frontend Code
**File:** `frontend-web/src/hooks/usePets.ts` (line 117)
```typescript
const pet: Pet = await apiClient.get('/api/v1/pets/active/current');
```

### Analysis
- **Expected URL:** `/api/v1/pets/active/current` ✅ (matches backend)
- **Method:** GET ✅ (matches backend)

### Root Cause
The URL in the error message shows `/api/v1/pets/active` but the backend route is at `/api/v1/pets/active/current`. The frontend code actually uses the correct URL, so either:
1. A different code path is calling the wrong URL
2. The error message shows the wrong endpoint

**Secondary Issue:** There's also a gamification endpoint at `/api/v1/gamification/pet/{user_id}` for getting pet state. Check if code is using this instead.

---

## Error 4: `POST /api/v1/gamification/pet/feed` → 422

### Backend Route Handler
**File:** `backend/api/gamification.py` (lines 115-123)
```python
@router.post("/gamification/pet/feed")
async def feed_pet(
    request: FeedPetRequest,
    current_user: UserDocument = Depends(get_current_user),
    ...
):
```

### Pydantic Schema
**File:** `backend/api/gamification.py` (lines 24-25)
```python
class FeedPetRequest(BaseModel):
    user_id: str  # Only expects user_id
```

### Frontend Code
**File:** `frontend-web/src/hooks/useGamification.ts` (lines 193-224)
```typescript
const result = await apiClient.post('/api/v1/gamification/pet/feed', {
    user_id: userId
});
```

### Analysis
- **Method:** POST ✅ (matches backend)
- **URL:** `/api/v1/gamification/pet/feed` ✅ (matches backend)
- **Body:** `{ user_id: userId }` ✅ (matches `FeedPetRequest`)

### Additional Finding: Extra Field in API Client
**File:** `frontend-web/src/services/apiClient.ts` (lines 266-270)
```typescript
feedPet: (userId: string, petId?: string) =>
  request('/api/v1/gamification/pet/feed', {
    method: 'POST',
    body: { user_id: userId, pet_id: petId },  // ❌ Extra pet_id field!
  }),
```

**Note:** If this API client method is called with a `petId` argument, it sends `{ user_id, pet_id }` but the backend only expects `{ user_id }`. This would cause Pydantic validation to fail.

### Root Cause
Extra `pet_id` field in request body when using `apiClient.feedPet()` with the optional `petId` parameter. The backend `FeedPetRequest` schema doesn't define `pet_id`.

---

## Summary of Root Causes

| Endpoint | HTTP Method | Root Cause |
|----------|------------|------------|
| `/api/v1/pets/active` | PUT | Empty/null pet_id causing validation failure |
| `/api/v1/gamification/stickers/collect` | GET | Wrong HTTP method (GET instead of POST) |
| `/api/v1/pets/active/current` | GET | URL mismatch in error message; actual code is correct |
| `/api/v1/gamification/pet/feed` | POST | Extra `pet_id` field sent when not expected |

---

## Recommended Fixes

### Fix 1: Update `FeedPetRequest` Schema (Backend)
**File:** `backend/api/gamification.py`

Add optional `pet_id` field to match frontend usage:
```python
class FeedPetRequest(BaseModel):
    user_id: str
    pet_id: Optional[str] = None  # Optional pet_id for specific pet feeding
```

### Fix 2: Clean Up API Client (Frontend)
**File:** `frontend-web/src/services/apiClient.ts`

Fix the `feedPet` method to only send expected fields:
```typescript
feedPet: (userId: string, petId?: string) =>
  request('/api/v1/gamification/pet/feed', {
    method: 'POST',
    body: petId ? { user_id: userId, pet_id: petId } : { user_id: userId },
  }),
```

### Fix 3: Add Query Parameter Endpoint (Alternative)
If GET `/api/v1/gamification/stickers/collect` needs to work, add a new endpoint:
```python
@router.get("/gamification/stickers/collect")
async def collect_sticker_get(
    sticker_id: str,
    current_user: UserDocument = Depends(get_current_user),
    ...
):
```

### Fix 4: Verify Active Pet Endpoint URL
Ensure all code uses the correct URL `/api/v1/pets/active/current` for GET.

---

## Next Steps for Fix Agent

1. **Update backend schemas** to accept optional fields that frontend sends
2. **Fix frontend API client** methods to match backend expectations
3. **Add validation logging** to capture actual request bodies causing 422 errors
4. **Run integration tests** to verify all endpoints work with correct payloads
