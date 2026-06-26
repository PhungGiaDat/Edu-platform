# Research Report: Pet / Rewards / Progress Reporting System

**Date:** 2026-06-26
**Analyst:** Researcher Agent
**Mode:** YOLO

---

## Executive Summary

Three distinct bugs were identified in the gamification backend and frontend:

1. **Pet feed stat degradation**: The repository correctly reduces hunger, but the frontend incorrectly **adds** to hunger on feed (opposite of the intended mechanic). The backend service also reports stale `hunger` values in the response.
2. **Sticker collection appears broken**: No UI button exists to trigger `POST /gamification/stickers/collect`. The backend logic is correct; the frontend is simply missing the integration.
3. **Progress reporting is entirely mock data**: `backend/api/reports.py` returns hardcoded JSON with zero aggregation. `daily_stats` are pushed to MongoDB but never populated. `learning_path.py`'s `/progress` endpoint is a pure echo.

---

## Root Cause Findings

### Issue 1: Pet Feed Degrades Stats (Frontend + Backend Response Bug)

**Backend — `backend/repositories/gamification_repository.py` lines 116–134:**
The repository correctly feeds the pet:
```python
pet_data.update({
    "happiness": min(100, pet_data.get("happiness", 50) + happiness_boost),  # +10 ✓
    "hunger": max(0, pet_data.get("hunger", 45) - 35),                      # -35 ✓
    "energy": min(100, pet_data.get("energy", 70) + 5),                     # +5 ✓
```
This is correct.

**Frontend — `frontend-web/src/pages/PetsPage.tsx` lines 284–313 (handleFeed):**
The frontend **optimistically** modifies stats in the wrong direction:
```typescript
setPetCare(prev => ({
    ...prev,
    happiness: Math.min(100, prev.happiness + 8),   // +8 (direction matches)
    hunger: Math.min(100, prev.hunger + 16),        // BUG: +16 instead of -16
    mood: 'happy',
    last_action: 'feed',
}));
```
When the API responds, the frontend overwrites with `result.hunger ?? prev.hunger`. If the API returns a **stale** DB value (pre-dehydration, or the default-padded pet), the hunger appears wrong.

Additionally, `feed_pet` in `gamification_service.py` line 251 calls `repo.feed_pet(user_id, happiness_boost=10)` — but the service's response at lines 274–287 reports `hunger: pet.get("hunger", 10)`. The `pet` variable comes from `self._hydrate_pet_state(result.get("pet", {}))` at line 252, which should apply time-based decay. However, `feed_pet` itself does NOT update the hunger in the repo — the repo does (via `feed_pet` → `update_pet`). The service's `pet` object is the **result from the repo after update**, so it should be correct. The real issue is the **frontend's optimistic update**.

**Root cause:** `PetsPage.tsx:292` adds to hunger instead of subtracting.

**Secondary issue — Play also broken directionally:**
`handlePlay` at line 324 does `energy: Math.max(0, prev.energy - 8)` (correct: -8). But the backend `play_pet` repo at line 145 does `energy: max(0, pet_data.get("energy", 70) - 15)`. The frontend optimistically removes 8; backend removes 15. This mismatch causes visible stat jumps after API response.

---

### Issue 2: Sticker Collection Not Working (Frontend Bug)

**Backend — `backend/api/gamification.py` lines 178–189:**
The endpoint `POST /gamification/stickers/collect` exists and is wired to `service.collect_sticker()`.

**Backend — `backend/services/gamification_service.py` lines 419–450:**
`collect_sticker` correctly checks the catalog, checks for duplicates, adds the sticker via `$addToSet`, and awards XP. Logic is sound.

**Frontend — `PetsPage.tsx`:**
No button or API call exists to trigger sticker collection. The `STICKER_CATALOG` (lines 374–394 in the service) and `STICKER_REWARDS` (lines 397–413) define auto-award rules, but there's **no UI to manually collect stickers** and no sticker collection page.

**Root cause:** The `POST /gamification/stickers/collect` endpoint is never called from the frontend. Stickers can only be auto-awarded via `_check_sticker_rewards` triggered by XP actions. No sticker gallery or collect button exists.

---

### Issue 3: Progress Report Returns Mock Data (Backend Bug)

**`backend/api/reports.py` lines 27–55:**
```python
# TODO: Replace with actual MongoDB aggregation
# For now return mock data structure
return JSONResponse({
    "user_id": user_id,
    "stats": {
        "total_words_learned": 24,   # HARDCODED
        "total_xp": 1250,            # HARDCODED
        "level": 5,                  # HARDCODED
        ...
        "favorite_topic": "Animals", # HARDCODED
    },
    ...
})
```
This endpoint is the one called by `useProgressReport.ts:133`: `GET /api/v1/reports/user/${userId}/summary`.

**`gamification_service.py` lines 519–551 (`get_progress_report`):**
The service aggregates `daily_stats` from `user_points` documents. However:
1. `daily_stats` are only populated when `track_learning` is called (which requires frontend to call `POST /gamification/track-learning`).
2. `words_learned` and `favorite_topic` are never computed from session logs.
3. The `/gamification/track-learning` endpoint accepts client-supplied `words_learned` and `time_mins` — no server-side validation or session-log cross-reference.

**`backend/api/learning_path.py` lines 174–201 (`track_daily_progress`):**
```python
# Simple echo-back: actual accumulation lives in session_logs
updated = {
    "time_spent_mins": progress.time_spent_mins,   # ECHOES CLIENT INPUT
    "words_learned": progress.words_learned,       # ECHOES CLIENT INPUT
    ...
}
```
This confirms the stub. No session log aggregation is performed.

---

### Issue 4: Daily Progress Tracking is a Stub

**`backend/api/learning_path.py` line 103–104:**
```python
# Daily progress is not tracked in this repo — return zeros so frontend renders
today_progress = _default_progress()
```
And `POST /learning-path/progress` at lines 187–193 echoes the client's input without persisting or aggregating.

**Session logs are created** (`SessionLogDocument` in `backend/models/session_log.py`) but **never queried** for progress reporting.

---

## Proposed Fixes

### Fix 1: Pet Feed Frontend Direction

**File:** `frontend-web/src/pages/PetsPage.tsx`, line 292

**Change:**
```typescript
// BEFORE (wrong):
hunger: Math.min(100, prev.hunger + 16),

// AFTER (correct):
hunger: Math.max(0, prev.hunger - 16),
```

Also align play energy: change `Math.max(0, prev.energy - 8)` to `Math.max(0, prev.energy - 15)` to match the backend.

---

### Fix 2: Add Sticker Collection UI

**Option A (Minimal):** Add a "Collect Sticker" button to `PetsPage.tsx` or create a `StickersPage.tsx` that calls `apiClient.post('/api/v1/gamification/stickers/collect', { sticker_id: 'star_gold' })`.

**Option B (Full):** Create a sticker gallery at `frontend-web/src/pages/StickersPage.tsx` that:
1. Fetches `GET /gamification/stickers/{userId}` to show collected stickers.
2. Displays the full `STICKER_CATALOG` from the service (or a new `GET /gamification/stickers/catalog` endpoint).
3. Has a "Collect" button for each uncollected sticker that calls `POST /gamification/stickers/collect`.

**Backend change needed:** Create `GET /gamification/stickers/catalog` endpoint in `gamification_service.py` that returns the `STICKER_CATALOG` dict.

---

### Fix 3: Progress Report — Replace Mock Data

**File:** `backend/api/reports.py` lines 15–55

Replace the mock with actual MongoDB aggregation:

```python
from models.gamification_model import UserPointsSchema
from repositories.gamification_repository import get_gamification_repository
from models.session_log import SessionLogDocument
from models.learning_path import LearningProgressDocument

@get("/user/{user_id}/summary")
async def get_user_progress_summary(...):
    repo = get_gamification_repository()
    gam = await repo.get_by_user_id(user_id)

    # Aggregate words from LearningProgressDocument
    from beanie import PydanticObjectId
    progress_docs = await LearningProgressDocument.find(
        LearningProgressDocument.user_id == user_id
    ).to_list()

    mastered_count = sum(1 for p in progress_docs if p.mastery_level >= 4)
    total_words_learned = mastered_count  # or sum of mastery_level

    # Aggregate session logs for time and favorite topic
    from datetime import datetime, timedelta
    week_ago = datetime.utcnow() - timedelta(days=7)
    sessions = await SessionLogDocument.find(
        SessionLogDocument.user_id == user_id,
        SessionLogDocument.started_at >= week_ago
    ).to_list()

    total_time_mins = sum(s.duration_seconds or 0 for s in sessions) // 60

    # Favorite topic: most frequent active_topic
    topic_counts: Dict[str, int] = {}
    for s in sessions:
        if s.active_topic:
            topic_counts[s.active_topic] = topic_counts.get(s.active_topic, 0) + 1
    favorite_topic = max(topic_counts, key=topic_counts.get) if topic_counts else "—"

    return JSONResponse({
        "user_id": user_id,
        "stats": {
            "total_words_learned": total_words_learned,
            "total_xp": gam.get("total_points", 0) if gam else 0,
            "level": gam.get("level", 1) if gam else 1,
            "streak_days": gam.get("streak_days", 0) if gam else 0,
            "favorite_topic": favorite_topic,
            "time_spent_mins": total_time_mins,
            "games_played": 0,  # needs game session tracking
            "pronunciation_score_avg": 0,  # needs pronunciation session tracking
        },
        ...
    })
```

---

### Fix 4: Daily Progress Accumulation from Session Logs

**File:** `backend/api/learning_path.py`, replace `track_daily_progress` (lines 174–201)

```python
@router.post("/progress")
async def track_daily_progress(
    progress: DailyGoalProgress,
    current_user: UserDocument = Depends(get_current_user),
    lp_repo: LearningPathRepository = Depends(get_learning_path_repository),
):
    """
    Compute daily progress from session_logs instead of trusting client input.
    """
    user_id = str(current_user.id)
    date_str = progress.date  # YYYY-MM-DD
    date = datetime.strptime(date_str, "%Y-%m-%d")
    next_date = date + timedelta(days=1)

    # Aggregate from session_logs
    sessions = await SessionLogDocument.find(
        SessionLogDocument.user_id == user_id,
        SessionLogDocument.started_at >= date,
        SessionLogDocument.started_at < next_date,
    ).to_list()

    actual_time = sum(s.duration_seconds or 0 for s in sessions) // 60

    # Words learned: count LearningProgressDocument mastered words for this day
    # (add a `mastered_at` field to track when mastery was achieved)
    from models.learning_path import LearningProgressDocument
    words_doc = await LearningProgressDocument.find_one(
        LearningProgressDocument.user_id == user_id,
        LearningProgressDocument.next_review_at >= date,
        LearningProgressDocument.next_review_at < next_date,
        LearningProgressDocument.mastery_level == 5,
    )
    actual_words = words_doc.times_correct if words_doc else progress.words_learned

    goals = lp_repo.get_by_user(user_id) or {}
    time_goal = goals.get("daily_time_goal_mins", 15) or 15
    words_goal = goals.get("daily_words_goal", 5) or 5

    return JSONResponse({
        "status": "tracked",
        "progress": {
            "time_spent_mins": actual_time,
            "words_learned": actual_words,
            "games_played": progress.games_played,  # still from client for now
            "pronunciation_attempts": progress.pronunciation_attempts,
        },
        "goals_met": {
            "time_goal_met": actual_time >= time_goal,
            "words_goal_met": actual_words >= words_goal,
            "all_goals_met": actual_time >= time_goal and actual_words >= words_goal,
        },
    })
```

---

## Schema / Service Change Recommendations

### 1. LearningProgressDocument — Add `mastered_at` field

**File:** `backend/models/learning_path.py` (or wherever `LearningProgressDocument` is defined — appears to be in `backend/models/user_mongo.py` as `LearningProgressDocument`)

Add:
```python
mastered_at: Optional[datetime] = None  # Set when mastery_level reaches 5
```

This enables time-based queries for "words mastered today."

### 2. GamificationRepository — `daily_stats` as separate collection (not embedded array)

**File:** `backend/repositories/gamification_repository.py` lines 210–231

The current `$push` approach accumulates forever in the `user_points` document. A separate `daily_progress` collection is cleaner:

```python
async def add_daily_stat(self, user_id: str, date: str, words: int, time_mins: int):
    await self.collection.update_one(
        {"user_id": user_id, "date": date},
        {"$setOnInsert": {"user_id": user_id, "date": date},
         "$set": {"words": words, "time_mins": time_mins}},
        upsert=True,
    )

async def get_daily_stats(self, user_id: str, days: int) -> List[Dict]:
    from datetime import datetime, timedelta
    cutoff = (datetime.utcnow() - timedelta(days=days)).strftime("%Y-%m-%d")
    docs = await self.collection.find(
        {"user_id": user_id, "date": {"$gte": cutoff}}
    ).sort("date", -1).to_list()
    return [{"date": d["date"], "words": d.get("words", 0), "time_mins": d.get("time_mins", 0)} for d in docs]
```

### 3. SessionLogDocument — Add `words_learned` and `games_played` fields

**File:** `backend/models/session_log.py`

```python
class SessionLogDocument(Document):
    ...
    words_learned: int = 0
    games_played: int = 0
    pronunciation_attempts: int = 0
```

These get set when the session ends by the frontend that knows the activity breakdown.

### 4. Clean Pet State Model

**Current model (from `gamification_repository.py` defaults):**
```
{ type, happiness, hunger, energy, mood, last_fed, last_played,
  last_care_at, last_mood_update, outfit, xp_earned, stage,
  last_action, animation_clip }
```

**Recommended clean model (stored in `user_points.pet`):**

```typescript
interface PetState {
  type: string;              // "bunny" | "cat" | "dog" | etc.
  stage: string;            // "baby" | "child" | "teen" | "adult"
  xp_earned: number;        // Pet's own XP (separate from user XP)
  happiness: number;         // 0–100, decays over time
  hunger: number;            // 0–100, increases over time (higher = hungrier)
  energy: number;            // 0–100, decays when playing
  mood: string;              // "happy" | "content" | "sad" | "hungry" | "sleeping"
  outfit: string;            // "none" | "crown" | "wizard_hat" | etc.
  last_fed: string | null;   // ISO datetime
  last_played: string | null;// ISO datetime
  last_care_at: string;      // ISO datetime (last interaction)
  last_mood_update: string;  // ISO datetime (for decay calculation)
  last_action: string;       // "idle" | "feed" | "play"
  animation_clip: string;     // "idle" | "feed" | "play" | "sleep" | "eat"
}
```

**Key invariants:**
- `happiness` decreases over time (decay rate: -3/hour)
- `hunger` increases over time (decay rate: +6/hour — **higher = hungrier**)
- `energy` increases over time when idle (+4/hour)
- Feeding: `hunger -= 35`, `happiness += 10`, `energy += 5`
- Playing: `happiness += 15`, `energy -= 15`, `hunger += 10`
- Mood is derived from stats (never stored independently)

---

## Open Questions Requiring Human Decision

1. **Sticker collection UX**: Should stickers be auto-awarded only (current design), or should there also be a manual collect button? If manual, should each sticker have a cost (XP or coins)?

2. **Favorite topic algorithm**: The `favorite_topic` should be the topic with the most session time in the reporting period, OR the topic with the most mastered words. Which is the intended behavior?

3. **Words learned definition**: Should `total_words_learned` count words with `mastery_level >= 1`, `>= 3`, or `== 5`? The current mock uses 24 as a placeholder.

4. **Pet stat persistence**: The pet state is stored in `user_points.pet` (embedded). Should it be a separate collection (`user_pets`)? The `UserDocument.active_pet` and `unlocked_pets` fields suggest a split model — the pet **instance state** lives in `user_points` while the pet **catalog/unlock** data lives in `UserDocument`. This split is fine but should be documented.

5. **`daily_stats` strategy**: Push-once per day (current `$push`) vs upsert-per-day (recommended above). Push-once accumulates all calls into an array, which is correct if `track_learning` is called exactly once per day. Which is the intended design?

6. **Game session tracking**: `games_played` in reports is always 0 because no game sessions are logged. Should game sessions write to `SessionLogDocument` with a `game_id` field?

---

## Files with Changes Required

| File | Change Type |
|------|-------------|
| `frontend-web/src/pages/PetsPage.tsx` | Bug fix (lines 292, 324) |
| `backend/api/reports.py` | Rewrite to aggregate real data |
| `backend/api/learning_path.py` | Rewrite `/progress` to aggregate session logs |
| `backend/repositories/gamification_repository.py` | Add `add_daily_stat_v2`, `get_daily_stats_v2` |
| `backend/models/session_log.py` | Add `words_learned`, `games_played`, `pronunciation_attempts` fields |
| `backend/models/learning_path.py` or `user_mongo.py` | Add `mastered_at` to `LearningProgressDocument` |
| `frontend-web/src/pages/StickersPage.tsx` | New file for sticker collection UI |
| `backend/api/gamification.py` | Add `GET /gamification/stickers/catalog` endpoint |
| `backend/services/gamification_service.py` | Expose `get_sticker_catalog()` method |
