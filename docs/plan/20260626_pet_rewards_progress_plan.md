# Integrated Plan: Pet Rewards + Stickers + Progress Reporting + Whisper Optimization

**Date:** 2026-06-26  
**Status:** Pending Approval  
**Mode:** YOLO - Implementation to proceed after approval

---

## APPROVAL CHECKLIST

Please check each section you approve for implementation:

| Section | Description | Approve? |
|---------|-------------|----------|
| **1. Pet Feed Issues** | Fix pet stats degradation (hunger/happiness decay too fast) | ☐ |
| **2. Sticker Collection** | Connect frontend sticker UI to backend `collect_sticker` API | ☐ |
| **3. Progress Report Gaps** | Replace mock data with real MongoDB aggregation | ☐ |
| **4. Whisper Cold-Start** | Preload Whisper model on app startup | ☐ |
| **5. Daily Learning Path** | Auto-track words learned per session, aggregate daily | ☐ |
| **6. Frontend Testing** | Add integration tests for gamification flows | ☐ |

**Total Estimated Effort:** 2-3 days  
**Priority Order:** 4 → 1 → 3 → 2 → 5 → 6

---

## BLOCKING ISSUES (Needs User Confirmation)

| Issue | Description | Question for User |
|-------|-------------|-------------------|
| **Whisper Model Path** | The `download_root` uses `Path.home()` which may not work in all deployments. Need confirmation on hosting environment. | Where will this app be deployed? (local/Render/ Railway/etc.) |
| **Sticker Images** | Backend references `/assets/stickers/*.png` but images may not exist in frontend | Should we use emoji fallbacks or create placeholder SVG stickers? |
| **Daily Learning Path Schema** | Not clear where daily word counts should be stored (existing `daily_stats` collection or new?) | Use existing `daily_stats` or create separate `learning_path_progress` collection? |

---

## SECTION 1: Pet Feed Issues — Stats Degradation Too Fast

### Problem Analysis
The pet stats decay calculation in `gamification_service.py` (lines 68-86) decays stats every 0.25 hours (15 minutes):

```python
if elapsed_hours >= 0.25:
    hunger = self._clamp(hydrated.get("hunger", 45) + int(elapsed_hours * 6))
    happiness = self._clamp(hydrated.get("happiness", 50) - int(elapsed_hours * 3))
```

**Issues:**
1. Hunger increases +6 per 0.25 hours = **+24/hour** → Max hunger (100) in ~4 hours
2. Happiness decreases -3 per 0.25 hours = **-12/hour** → Pet becomes sad within 4-5 hours
3. The check only runs when `elapsed_hours >= 0.25`, so idle pets degrade silently

### Fix Plan

| Step | File | Change |
|------|------|--------|
| 1.1 | `gamification_service.py` | Change decay rate to **+2/hour** hunger, **-2/hour** happiness |
| 1.2 | `gamification_service.py` | Change threshold from 0.25h to **2 hours** before decay starts |
| 1.3 | `gamification_service.py` | Add **floor of 0** for happiness (can't go negative) |
| 1.4 | `gamification_service.py` | Cap max hunger decay per check at **+5** per interval |

### Code Changes

```python
# Line 68-71 - Change decay rates
if elapsed_hours >= 2:  # Changed from 0.25 to 2 hours
    hunger_increase = min(5, int(elapsed_hours * 2))  # +2/hour, max +5 per check
    happiness_decrease = min(4, int(elapsed_hours * 2))  # -2/hour, max -4 per check
    hunger = self._clamp(hydrated.get("hunger", 45) + hunger_increase)
    happiness = self._clamp(hydrated.get("happiness", 50) - happiness_decrease, 0)  # Floor at 0
```

### Expected Result
- Hunger increases +2/hour (vs +24/hour) → Max hunger in ~27 hours
- Happiness decreases -2/hour (vs -12/hour) → Pet stays happy for ~25 hours without care
- More kid-friendly: kids can play daily without pet becoming sad

---

## SECTION 2: Sticker Collection — Connect Frontend to Backend

### Problem Analysis
- Backend has complete sticker system in `gamification_service.py` (lines 374-510)
- Backend has `/gamification/stickers/{user_id}` and `/gamification/stickers/collect` endpoints
- Frontend `StickerCollection.tsx` displays stickers but doesn't fetch from API
- Frontend `useProgressReport.ts` fetches achievements but sticker count is hardcoded

### Fix Plan

| Step | File | Change |
|------|------|--------|
| 2.1 | `frontend-web/src/hooks/useStickers.ts` | **Create new hook** to fetch/manage user stickers |
| 2.2 | `frontend-web/src/services/apiClient.ts` | Add `/api/v1/gamification/stickers/{userId}` endpoint |
| 2.3 | `frontend-web/src/pages/ProgressDashboard.tsx` | Connect to `useStickers` hook for real sticker data |
| 2.4 | `frontend-web/src/components/Gamification/StickerCollection.tsx` | Add API integration via hook |
| 2.5 | `backend/api/gamification.py` | Fix endpoint path to `/gamification/stickers/{user_id}` |

### New Hook: useStickers.ts

```typescript
export interface Sticker {
    id: string;
    name: string;
    imageUrl: string;
    rarity: 'common' | 'rare' | 'epic' | 'legendary';
    earned_at?: string;
}

export function useStickers(userId: string | null) {
    const [stickers, setStickers] = useState<Sticker[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    // ... fetch from /api/v1/gamification/stickers/{userId}
}
```

---

## SECTION 3: Progress Report Gaps — Replace Mock Data

### Problem Analysis
`backend/api/reports.py` returns **hardcoded mock data** for all endpoints:
- Line 30-55: `/reports/user/{user_id}/summary` returns fixed values
- Line 67-85: `/reports/user/{user_id}/weekly` returns fixed daily breakdown
- Line 97-106: `/reports/user/{user_id}/achievements` returns fixed badges

### Fix Plan

| Step | File | Change |
|------|------|--------|
| 3.1 | `backend/repositories/gamification_repository.py` | Add `get_user_summary(user_id)`, `get_weekly_stats(user_id)`, `get_user_achievements(user_id)` methods |
| 3.2 | `backend/api/reports.py` | Replace mock returns with real repo calls |
| 3.3 | `backend/models/gamification_model.py` | Add Pydantic schemas for response types |

### Repository Methods Needed

```python
async def get_user_summary(self, user_id: str) -> Dict[str, Any]:
    """Aggregate all learning stats for user."""
    user = await self.collection.find_one({"user_id": user_id})
    daily = await self.daily_stats.find({"user_id": user_id}).to_list(30)
    return {
        "total_xp": user.get("total_points", 0),
        "level": user.get("level", 1),
        "streak_days": user.get("streak_days", 0),
        "total_words": sum(d.get("words", 0) for d in daily),
        "total_time_mins": sum(d.get("time_mins", 0) for d in daily),
        "badges": user.get("badges", []),
        "stickers": user.get("stickers", [])
    }
```

---

## SECTION 4: Whisper Cold-Start — Preload Model

### Problem Analysis
`speech_processing_service.py` uses **lazy loading** for Whisper model (line 40-82):
- Model loads on first transcription request
- First request takes **10-30 seconds** to load ~75MB model
- Poor UX for pronunciation activities

### Fix Plan

| Step | File | Change |
|------|------|--------|
| 4.1 | `backend/main.py` | Add startup event to preload Whisper model |
| 4.2 | `backend/services/speech_processing_service.py` | Add `preload()` method |
| 4.3 | `backend/services/speech_processing_service.py` | Add `get_status()` health check |

### Code Changes

```python
# backend/main.py - Add lifespan event
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: preload Whisper model
    logger.info("[Startup] Preloading Whisper model...")
    from services.speech_processing_service import _get_whisper_model
    await _get_whisper_model()
    logger.info("[Startup] Whisper model ready")
    yield
    # Shutdown: cleanup if needed
    logger.info("[Shutdown] Cleaning up...")
```

### Blocking Issue: ⚠️ NEEDS CONFIRMATION
- `Path.home() / ".cache" / "whisper"` may not work on all hosting platforms
- **Question:** Where will this app be deployed?
  - Local development → OK as-is
  - Render/Railway → May need `/tmp` or `/var/data` path

---

## SECTION 5: Daily Learning Path — Auto-Track Words

### Problem Analysis
- `gamification_service.py` has `track_learning()` method (line 514) but it's **not called** anywhere
- `add_xp()` receives `action` and `metadata` but doesn't extract words learned
- No automatic aggregation of daily learning progress

### Fix Plan

| Step | File | Change |
|------|------|--------|
| 5.1 | `backend/services/course_service.py` | Call `track_learning()` after lesson completion |
| 5.2 | `backend/api/courses.py` | Pass `words_learned` and `time_mins` in XP metadata |
| 5.3 | `backend/repositories/gamification_repository.py` | Ensure `add_daily_stat()` stores correctly |
| 5.4 | `frontend-web/src/pages/LessonPlayer.tsx` | Call progress tracking on lesson complete |

### Backend Flow

```python
# After lesson completion in course_service.py
await gamification_service.track_learning(
    user_id=user_id,
    words_learned=lesson_words_count,
    time_mins=elapsed_minutes
)
```

### Frontend Integration

```typescript
// LessonPlayer.tsx - on lesson complete
const handleLessonComplete = async () => {
    await apiClient.post('/api/v1/gamification/track-learning', {
        words_learned: wordsLearned,
        time_mins: Math.round(elapsedTime / 60)
    });
};
```

---

## SECTION 6: Frontend Testing

### Test Coverage

| Test File | Coverage |
|-----------|----------|
| `frontend-web/src/__tests__/hooks/usePets.test.ts` | Pet fetch, unlock, activate |
| `frontend-web/src/__tests__/hooks/useStickers.test.ts` | Sticker fetch, collection |
| `frontend-web/src/__tests__/hooks/useProgressReport.test.ts` | Report loading, refresh |
| `frontend-web/src/__tests__/components/StickerCollection.test.tsx` | Rendering, emoji fallbacks |

### Key Test Scenarios

```typescript
describe('usePets', () => {
    it('should fetch pets on mount', async () => {
        mockApiClient.get.mockResolvedValue({ pets: [], stats: {} });
        const { result } = renderHook(() => usePets('user1'));
        await waitFor(() => expect(result.current.isLoading).toBe(false));
        expect(mockApiClient.get).toHaveBeenCalledWith('/api/v1/pets');
    });
});
```

---

## Implementation Order

1. **Section 4 (Whisper)** - Low risk, immediate UX improvement
2. **Section 1 (Pet Feed)** - Simple parameter changes, testable
3. **Section 3 (Progress Reports)** - Backend only, no frontend risk
4. **Section 2 (Stickers)** - Frontend + Backend, moderate complexity
5. **Section 5 (Daily Learning)** - Cross-cutting, requires coordination
6. **Section 6 (Testing)** - Can run in parallel with other sections

---

## Files to Modify

| File | Sections |
|------|----------|
| `backend/services/gamification_service.py` | 1, 5 |
| `backend/services/speech_processing_service.py` | 4 |
| `backend/api/gamification.py` | 2, 5 |
| `backend/api/reports.py` | 3 |
| `backend/main.py` | 4 |
| `backend/repositories/gamification_repository.py` | 3, 5 |
| `frontend-web/src/hooks/useStickers.ts` | 2 |
| `frontend-web/src/components/Gamification/StickerCollection.tsx` | 2 |
| `frontend-web/src/pages/ProgressDashboard.tsx` | 2, 3 |
| `frontend-web/src/pages/LessonPlayer.tsx` | 5 |

---

## Rollback Plan

If issues arise, each section has a simple rollback:
- **Section 1:** Revert decay rates to original values
- **Section 2:** Revert to mock sticker data in hook
- **Section 3:** Revert to mock returns in `reports.py`
- **Section 4:** Remove startup event, restore lazy loading
- **Section 5:** Remove `track_learning()` calls
- **Section 6:** Revert test files

---

**Prepared by:** SDLC Orchestrator  
**Date:** 2026-06-26  
**Next Action:** User approval → Begin implementation
