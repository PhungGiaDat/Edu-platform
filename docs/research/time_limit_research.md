# Time Limit & Rest Reminder Feature - Research Document

**Version:** 1.0  
**Date:** 2026-06-26  
**Status:** Research Complete  

---

## 1. Research Findings

### 1.1 Duolingo Session Timer & Streak Protection Mechanics

Based on research into Duolingo's implementation patterns:

#### Core Streak Logic
- **Timezone-aware evaluation**: Streaks are calculated based on the user's local timezone, not server time
- **UTC storage**: Timestamps stored in UTC, but logic performed using local calendar dates
- **Grace period**: Streak survives if last activity was today or yesterday
- **Automatic streak freeze**: Consumable items that auto-activate when a gap is detected

#### Duolingo's Key Features
1. **Minimum viable action**: Only 3 minutes needed to preserve streak (low barrier)
2. **Streak freezes**: Purchasable with in-app currency, protect 1-2 days
3. **Streak repair**: Pay to restore broken streaks (psychological anchoring)
4. **Escalating notifications**: 22:00 reminder → increasingly desperate Duo owl messages
5. **Midnight deadline**: Daily cutoff in user's local timezone

#### Technical Implementation
```python
# Cron job at midnight UTC
def evaluate_streaks():
    users = find_users_with_last_activity_before_today()
    for user in users:
        if user.streak_freeze_count > 0:
            consume_freeze(user)  # Preserve streak
            update_freeze_count(user, -1)
        else:
            break_streak(user)  # Reset to 0
```

### 1.2 Auto-Lock / App Lock Screen Implementation Patterns

#### React Implementation Patterns

**Idle Detection Hook Pattern:**
```typescript
// Custom idle timer hook
function useIdleTimer({
  idleTime = 20 * 60 * 1000,  // 20 minutes default
  warningTime = 2 * 60 * 1000, // 2 minute warning
  onIdle,
  onWarning,
  onActive
}) {
  // Track mouse, keyboard, scroll, touch events
  // Reset timer on any activity
  // Trigger states: active → warning → idle
}
```

**Session Timeout Provider Pattern:**
```tsx
<TimeoutProvider
  timeoutDuration={30 * 60 * 1000}
  warningDuration={60 * 1000}
  onTimeout={handleLogout}
  onWarning={showNotification}
>
  <App />
</TimeoutProvider>
```

#### Lock Screen Patterns
1. **Non-dismissible overlay**: Blocks all interactions
2. **Countdown timer**: Clear visual feedback
3. **Activity reset**: Moving mouse/keyboard resets warning countdown
4. **No logout required**: Just a "rest reminder", not session timeout
5. **Progressive escalation**: Gentle → Warning → Lock

### 1.3 Rest Reminder UX Patterns

#### Gentle vs Strict Approaches

| Aspect | Gentle (Recommended) | Strict |
|--------|---------------------|--------|
| **Notification timing** | At 20 min | At 15 min |
| **Message tone** | Encouraging | Warning |
| **Action required** | Optional dismiss | Mandatory |
| **Streak impact** | None | None |
| **Visual intrusion** | Toast/banner | Full modal |

#### Duolingo-Style Flow
```
Session starts
    │
    ▼ (20 minutes)
┌─────────────────────────────────────────┐
│  Gentle Reminder Toast                   │
│  "Great work! 💪 Take a short break?"   │
│  [Continue Learning] [Take a Break]      │
└─────────────────────────────────────────┘
    │
    ▼ (User ignores, 5 more minutes)
┌─────────────────────────────────────────┐
│  Break Suggestion Modal                  │
│  "Your brain learns better with breaks!" │
│  🧠 💪 🌟                                │
│  [Keep Going] [Start Break]             │
└─────────────────────────────────────────┘
    │
    ▼ (User ignores again, 5 more minutes)
┌─────────────────────────────────────────┐
│  App Lock Screen                        │
│  "Time for a rest! 🌴"                  │
│                                         │
│  Break Duration: [5 min] [10 min] [15] │
│  [Resume Learning]                      │
│                                         │
│  (XP earned is preserved, streak intact)│
└─────────────────────────────────────────┘
```

### 1.4 Session Tracking & Persistence Strategies

#### Client-Side (LocalStorage/IndexedDB)
```typescript
interface SessionState {
  sessionId: string;
  startTime: number;  // Unix timestamp
  lastActivityTime: number;
  totalActiveTime: number;
  breakTime: number;
  isLocked: boolean;
}

// Persist to localStorage for page refresh survival
localStorage.setItem('edu_session', JSON.stringify(state));
```

#### Server-Side (MongoDB)
```python
class UsageSession(Document):
    session_id: str
    user_id: str
    started_at: datetime
    ended_at: Optional[datetime]
    total_active_seconds: int
    break_seconds: int
    break_count: int
    activities: List[SessionActivity]
    timezone: str  # For streak calculations
```

#### Hybrid Approach (Recommended)
- **Session timer**: Client-side for immediate UI feedback
- **Activity logging**: Server-side for analytics
- **Break persistence**: Server-side to prevent abuse
- **Streak calculation**: Server-side with timezone awareness

### 1.5 Mobile-First Responsive Considerations

#### Timer UI for Mobile

**iPhone 14 Pro (393x852) Considerations:**
- Timer display: Large, readable numbers (24pt+)
- Touch targets: Minimum 44x44pt
- Safe area: Respect notch and home indicator
- Notification: Use native iOS notifications if permitted

**Recommended Mobile Timer Component:**
```tsx
// Mobile-friendly timer display
<div className="flex flex-col items-center justify-center min-h-screen p-4">
  {/* Timer Circle */}
  <div className="relative w-64 h-64">
    <svg className="w-full h-full transform -rotate-90">
      <circle
        cx="128"
        cy="128"
        r="120"
        stroke="currentColor"
        strokeWidth="8"
        fill="none"
        strokeDasharray={circumference}
        strokeDashoffset={progress}
      />
    </svg>
    <div className="absolute inset-0 flex items-center justify-center">
      <span className="text-5xl font-bold">{minutes}:{seconds}</span>
    </div>
  </div>
  
  {/* Action Buttons */}
  <div className="flex gap-4 mt-8">
    <button className="clay-btn clay-btn-blue px-8 py-4">
      Continue
    </button>
    <button className="clay-btn clay-btn-white px-8 py-4">
      Take Break
    </button>
  </div>
</div>
```

### 1.6 Streak Protection During Breaks

#### Key Principle: Breaks Do NOT Penalize Streaks

```python
# On break start
async def start_break(user_id: str, duration_minutes: int):
    session = await get_active_session(user_id)
    
    # Log break start (streak-acceptable)
    session.breaks.append({
        "started_at": datetime.utcnow(),
        "planned_duration": duration_minutes,
        "actual_duration": None,
        "streak_preserved": True  # Explicit flag
    })
    
    # DO NOT update last_activity_date
    # This preserves the streak calculation
    # User can return anytime within the day
    
    return session

# On break end
async def end_break(user_id: str, actual_duration: int):
    session = await get_active_session(user_id)
    latest_break = session.breaks[-1]
    latest_break["actual_duration"] = actual_duration
    
    # XP earned is preserved
    # Streak calculation unchanged
    # User can continue seamlessly
```

#### Gamification Integration

| Gamification Element | Break Behavior |
|---------------------|----------------|
| **XP** | Preserved (earned before break) |
| **Streak** | Preserved (breaks don't count as inactivity) |
| **Pet happiness** | Pauses during break |
| **Daily goals** | Pauses during break |
| **Leaderboard** | Position preserved |
| **Lessons in progress** | Saved state, resume after break |

---

## 2. Recommended Implementation Approach

### 2.1 Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND (React)                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │ SessionTimer│  │BreakManager │  │   LockScreenOverlay     │  │
│  │   Hook     │  │   Hook      │  │   (Non-dismissible)    │  │
│  └──────┬──────┘  └──────┬──────┘  └───────────┬─────────────┘  │
│         │                │                      │                │
│         └────────────────┼──────────────────────┘                │
│                          │                                       │
│                    ┌─────▼─────┐                                │
│                    │ SessionCtx │                                │
│                    │ Provider  │                                │
│                    └─────┬─────┘                                │
└──────────────────────────┼──────────────────────────────────────┘
                           │
                    ┌──────▼──────┐
                    │  API Client │
                    └──────┬──────┘
                           │
┌──────────────────────────┼──────────────────────────────────────┐
│                        BACKEND (FastAPI)                        │
│                    ┌─────▼─────┐                                │
│                    │ SessionAPI │                                │
│                    └─────┬─────┘                                │
│         ┌────────────────┼────────────────┐                      │
│   ┌─────▼─────┐   ┌─────▼─────┐   ┌─────▼─────┐                │
│   │ Session   │   │  Usage    │   │Gamification│                │
│   │ Service   │   │ Repository│   │  Service   │                │
│   └─────┬─────┘   └─────┬─────┘   └─────┬─────┘                │
│         │               │               │                      │
│   ┌─────▼───────────────▼───────────────▼─────┐                │
│   │              MongoDB Collections            │                │
│   │  usage_sessions │ session_breaks │ user_points│                │
│   └────────────────────────────────────────────┘                │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 Session State Machine

```
┌─────────────────────────────────────────────────────────────────┐
│                     SESSION STATE MACHINE                       │
└─────────────────────────────────────────────────────────────────┘

                    ┌──────────────────┐
                    │   SESSION_START  │
                    └────────┬─────────┘
                             │
                    ┌────────▼─────────┐
              ┌─────│   LEARNING_ACTIVE │◄────────────────────┐
              │     └────────┬──────────┘                     │
              │              │                                │
              │    20 min    │                                │
              │              ▼                                │
              │     ┌─────────────────┐                       │
              │     │ REMINDER_GENTLE │ (Toast notification)  │
              │     └────────┬────────┘                       │
              │              │                                │
              │    5 min     │ (no action)                    │
              │              ▼                                │
              │     ┌─────────────────┐                       │
              │     │ REMINDER_WARN   │ (Modal, optional)    │
              │     └────────┬────────┘                       │
              │              │                                │
              │    5 min     │ (no action)                   │
              │              ▼                                │
              │     ┌─────────────────┐                       │
              │     │    APP_LOCKED   │ (Full screen)        │
              │     └────────┬────────┘                       │
              │              │                                │
              │    User     │                                │
              │   chooses   │                                │
              │   break     ▼                                │
              │     ┌─────────────────┐                       │
              │     │    ON_BREAK     │──────┐               │
              │     └─────────────────┘      │               │
              │              │               │ Break          │
              │         Break ends           │ complete       │
              │              │               │               │
              │              └───────────────┘               │
              │                                                │
              │  Continue button ─────────────────────────────┘
              │  (Return to LEARNING_ACTIVE)
              │
              │  Session ends normally
              └──────────────► [SESSION_END]
```

### 2.3 Break Forgiveness Logic

To ensure breaks don't break streaks:

```python
# Key insight: Breaks extend the "active day" window

async def on_break_start(user_id: str, break_duration: int):
    """Starting a break - does NOT affect streak"""
    session = await get_or_create_session(user_id)
    
    session.current_break = {
        "started_at": datetime.utcnow(),
        "planned_minutes": break_duration,
        "streak_safe": True  # CRITICAL: Flag that this is a voluntary break
    }
    
    # Do NOT update last_activity_date
    # This is the key to streak preservation
    
    await session.save()
    return session


async def on_break_end(user_id: str):
    """Ending a break - streak still preserved"""
    session = await get_active_session(user_id)
    
    break_duration = datetime.utcnow() - session.current_break.started_at
    
    # Log break in history
    session.break_history.append({
        "started_at": session.current_break.started_at,
        "ended_at": datetime.utcnow(),
        "duration_minutes": break_duration.total_seconds() / 60,
        "streak_preserved": True  # Always True for voluntary breaks
    })
    
    session.current_break = None
    session.active_time_seconds += break_duration.total_seconds()
    
    await session.save()
    return session


async def calculate_streak(user_id: str):
    """Streak calculation ignores break periods"""
    user = await get_user(user_id)
    session = await get_latest_session(user_id)
    
    # Get last activity date (NOT break time)
    last_activity = session.last_activity_at
    
    # Normal streak calculation using local timezone
    local_now = get_local_date(datetime.utcnow(), user.timezone)
    local_last = get_local_date(last_activity, user.timezone)
    
    # Days diff calculation (breaks don't affect this)
    days_diff = (local_now - local_last).days
    
    if days_diff <= 1:
        return user.streak_count  # Streak intact
    else:
        # Check for streak freeze
        if user.streak_freezes > 0:
            return user.streak_count  # Freeze protected
        else:
            return 0  # Streak broken
```

---

## 3. UX Recommendations

### 3.1 Notification Timing

| Phase | Duration | Notification | Tone |
|-------|----------|--------------|------|
| Learning | 0-20 min | None | - |
| Gentle reminder | 20 min | Toast banner | Encouraging |
| Warning | 25 min | Modal (optional dismiss) | Suggestive |
| Lock | 30 min | Full-screen lock | Firm but friendly |

### 3.2 Copy & Messaging

**Gentle Reminder (20 min):**
> "Great job! 💪 You've been learning for 20 minutes. Your brain might appreciate a short break?"

**Warning Modal (25 min):**
> "Time for a breather! 🧠
> 
> Regular breaks help you remember things better. Take 5-15 minutes to stretch, drink water, and look away from the screen."

**Lock Screen (30 min):**
> "Rest time! 🌴
> 
> You've earned it. Take a proper break — your streak is safe!
> 
> Choose your break length:
> [5 min] [10 min] [15 min]
> 
> [Resume Learning]"

### 3.3 Streak Protection Messaging

Always reassure users that breaks don't affect their streaks:

- "Take a break without worry — your streak is protected!"
- "💪 Breaks don't break streaks"
- "Your 15-day streak is safe while you're resting"

### 3.4 Gamification During Breaks

**Pet Behavior:**
- Pet "sleeps" or "rests" during break
- Pet happiness paused (not decreased)
- Return animation when learning resumes

**XP Display:**
- Show XP earned during session prominently
- "You earned 45 XP! It's saved and waiting for you."
- After break: "+45 XP ✓"

**Progress Indicators:**
- Current lesson progress preserved
- Quiz answers auto-saved
- Resume exactly where left off

---

## 4. Technical Architecture Suggestions

### 4.1 Frontend Architecture

```typescript
// hooks/useSessionTimer.ts
interface UseSessionTimerProps {
  sessionDurationMinutes: number;      // Default: 30
  reminderAtMinutes: number;           // Default: 20
  warningAtMinutes: number;           // Default: 25
  onReminder: () => void;
  onWarning: () => void;
  onLock: () => void;
  onBreakStart: (duration: number) => void;
  onBreakEnd: () => void;
}

// Context provider
interface SessionContextValue {
  state: SessionState;
  startSession: () => void;
  pauseSession: () => void;
  resumeSession: () => void;
  startBreak: (minutes: number) => void;
  endBreak: () => void;
  dismissReminder: () => void;
  remainingTime: number;
  isBreakActive: boolean;
  xpEarned: number;
}
```

### 4.2 Backend API Design

```
┌─────────────────────────────────────────────────────────────────┐
│                    SESSION MANAGEMENT API                        │
├─────────────────────────────────────────────────────────────────┤
│  POST /api/v1/sessions/start           │ Start new session      │
│  POST /api/v1/sessions/heartbeat       │ Update activity        │
│  POST /api/v1/sessions/break/start     │ Start break            │
│  POST /api/v1/sessions/break/end       │ End break              │
│  GET  /api/v1/sessions/current         │ Get active session     │
│  POST /api/v1/sessions/end             │ End session            │
│  GET  /api/v1/sessions/:id             │ Get session details    │
│  GET  /api/v1/sessions/history         │ Get session history    │
└─────────────────────────────────────────────────────────────────┘
```

### 4.3 MongoDB Schema

```python
class UsageSession(Document):
    """Tracks learning sessions with break support"""
    
    session_id: Indexed(str, unique=True)
    user_id: Indexed(str)
    
    # Session timing
    started_at: datetime
    ended_at: Optional[datetime]
    timezone: str  # User's timezone for streak calc
    
    # Active time tracking
    total_active_seconds: int = 0
    last_activity_at: Optional[datetime]
    
    # Break tracking
    current_break: Optional[BreakData]  # Embedded, not separate doc
    break_history: List[BreakData] = Field(default_factory=list)
    
    # Gamification
    xp_earned: int = 0
    lessons_completed: int = 0
    quizzes_completed: int = 0
    
    # Metadata
    device_info: Optional[Dict]
    is_active: bool = True
    
    class Settings:
        name = "usage_sessions"
        indexes = [
            "user_id",
            "started_at",
            "is_active"
        ]

class BreakData(BaseModel):
    """Embedded break data"""
    started_at: datetime
    planned_duration_minutes: int
    actual_duration_minutes: Optional[int]
    streak_preserved: bool = True  # Always True for user-initiated
    was_auto_triggered: bool = False  # True if forced by lock
```

### 4.4 Web Worker for Accurate Timing

```typescript
// workers/sessionTimer.worker.ts
let intervalId: number;
let remainingSeconds: number;

self.onmessage = (e: MessageEvent) => {
  const { type, payload } = e.data;
  
  switch (type) {
    case 'START':
      remainingSeconds = payload.durationSeconds;
      intervalId = setInterval(() => {
        remainingSeconds--;
        self.postMessage({ type: 'TICK', remaining: remainingSeconds });
        
        if (remainingSeconds <= 0) {
          clearInterval(intervalId);
          self.postMessage({ type: 'COMPLETE' });
        }
      }, 1000);
      break;
      
    case 'PAUSE':
      clearInterval(intervalId);
      break;
      
    case 'RESUME':
      intervalId = setInterval(() => {
        remainingSeconds--;
        self.postMessage({ type: 'TICK', remaining: remainingSeconds });
      }, 1000);
      break;
      
    case 'STOP':
      clearInterval(intervalId);
      remainingSeconds = 0;
      break;
  }
};
```

### 4.5 Persistence Strategy

```typescript
// Session persistence for page refresh
const SESSION_STORAGE_KEY = 'edu_session';

interface PersistedSession {
  sessionId: string;
  startTime: number;
  remainingSeconds: number;
  state: SessionState;
  xpEarned: number;
}

function persistSession(session: PersistedSession) {
  localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
}

function restoreSession(): PersistedSession | null {
  const stored = localStorage.getItem(SESSION_STORAGE_KEY);
  if (!stored) return null;
  
  const session = JSON.parse(stored) as PersistedSession;
  
  // Calculate elapsed time since page refresh
  const elapsedSeconds = (Date.now() - session.startTime) / 1000;
  session.remainingSeconds = Math.max(0, session.remainingSeconds - elapsedSeconds);
  
  return session;
}
```

---

## 5. Implementation Checklist

### Backend (Est: 4h)
- [ ] Create `usage_sessions` MongoDB collection
- [ ] Implement session service with break support
- [ ] Add streak-preservation logic to break endpoints
- [ ] Create session API routes
- [ ] Add heartbeat endpoint for activity tracking

### Frontend (Est: 6h)
- [ ] Create `useSessionTimer` hook
- [ ] Create `SessionProvider` context
- [ ] Build reminder toast component
- [ ] Build warning modal component
- [ ] Build lock screen overlay
- [ ] Integrate with existing gamification display

### Integration (Est: 2h)
- [ ] Connect session timer to XP tracking
- [ ] Ensure pet status pauses during break
- [ ] Save lesson progress on break start
- [ ] Test streak preservation after breaks

### Testing (Est: 2h)
- [ ] Unit tests for session timer logic
- [ ] Integration tests for break → resume flow
- [ ] Verify streak calculation after breaks
- [ ] Mobile responsive testing

---

## 6. References

1. [Duolingo Streak System Analysis](https://engagefabric.com/blog/building-duolingo-style-streak-system)
2. [Trophy Streak Implementation](https://trophy.so/blog/streak-timezone-dst-handling)
3. [React Idle Detection](https://reactuse.com/blog/react-idle-detection-session/)
4. [Session Timeout Modal](https://nayanajithpriyasad.medium.com/how-to-implement-a-session-timeout-modal-in-a-react-application)
5. [FocusLock App Pattern](https://github.com/IMDigitalHQ/FocusLock)
6. [Chronos Pomodoro Timer](https://github.com/guilhermehfr/chronos-pomodoro)
