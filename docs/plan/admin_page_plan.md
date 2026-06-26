# Teacher Admin Dashboard - Project Plan

**Version:** 2.0  
**Date:** 2026-06-26  
**Status:** Updated - Awaiting Approval  

---

## 1. Overview

The Teacher Admin Dashboard provides educators with tools to manage educational content and monitor student learning progress. It integrates seamlessly with the existing Edu-platform infrastructure, extending the claymorphic design system with an admin-focused interface.

### 1.1 Key Features
1. **Flashcard Management** - Create, edit, delete, and organize flashcards with images and audio
2. **Student Learning Status** - Real-time monitoring of students enrolled in teacher's courses only
3. **Learning Progress Analytics** - Visual dashboards showing course completion, quiz scores, and engagement metrics (teacher-level only)
4. **Course Management** - Create and manage courses with lessons, quizzes, and rewards
5. **Time Limit & Rest Reminder** - Duolingo-style session management with streak protection

### 1.2 Approved Clarifications

| Item | Decision | Rationale |
|------|----------|-----------|
| **Student Scope** | Teachers see ONLY students enrolled in their courses | Privacy + relevance |
| **Flashcard Storage** | Extend existing `flashcards` collection with `teacher_id` + `deck_id` | Single source of truth |
| **Course Relationship** | Extend current system with `teacher_id` foreign key + `is_template` flag | Reuse existing schema |
| **Analytics Scope** | Teacher-level only (system-wide reserved for admin role) | Data isolation |
| **Mobile Support** | Full mobile-first responsive (iPhone 14 Pro + laptop 1440px+) | Diverse device support |
| **Multi-language** | Full i18n (EN/VI) for admin content | Target market |

### 1.3 Technology Stack
- **Frontend:** React 18 + TypeScript + Vite
- **Backend:** Python FastAPI
- **Database:** MongoDB (Beanie ODM + Pydantic schemas)
- **Styling:** Claymorphic CSS utilities + Tailwind CSS
- **Authentication:** JWT-based with role-based access control (RBAC)
- **Internationalization:** react-i18next

---

## 2. Design System

### 2.1 Claymorphic Admin Style System

Building on the existing Edu-platform claymorphic design tokens, we extend the system for admin interfaces.

#### Color Palette (Admin Extensions)

```css
:root {
  /* Admin Brand Colors */
  --admin-primary: #6EB9FF;           /* Sky Blue - Primary actions */
  --admin-primary-dark: #3A8FD1;
  --admin-secondary: #B4E197;          /* Mint Green - Success states */
  --admin-secondary-dark: #7DC760;
  --admin-accent: #FF9F9F;            /* Coral Pink - Alerts/Warnings */
  --admin-accent-dark: #D97070;
  --admin-warning: #FFD93D;           /* Sunshine Yellow - Caution */
  --admin-warning-dark: #E5B800;
  
  /* Admin Backgrounds */
  --admin-bg: #F5F7FA;                /* Light gray workspace */
  --admin-card: #FFFFFF;               /* Card backgrounds */
  --admin-sidebar: #1A2744;            /* Deep Slate sidebar */
  
  /* Admin Text */
  --admin-text-primary: #1A2744;       /* Deep Slate */
  --admin-text-secondary: #64748B;      /* Slate gray */
  --admin-text-muted: #94A3B8;         /* Light slate */
  --admin-text-inverse: #FFFFFF;       /* White text on dark */
  
  /* Admin Borders & Shadows */
  --admin-border: #E2E8F0;
  --admin-shadow: 0 4px 0 rgba(0,0,0,0.08), 0 2px 8px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.8);
  --admin-shadow-hover: 0 8px 0 rgba(0,0,0,0.1), 0 4px 16px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.9);
  --admin-shadow-pressed: 0 2px 0 rgba(0,0,0,0.06), 0 1px 4px rgba(0,0,0,0.04), inset 0 2px 4px rgba(0,0,0,0.06);
}
```

#### Claymorphic Admin Components

| Component | Base Style | Hover | Active/Pressed |
|-----------|-----------|-------|----------------|
| **Admin Card** | `bg-white rounded-3xl shadow-admin` | `shadow-admin-hover -translate-y-1` | `shadow-admin-pressed translate-y-1` |
| **Admin Button Primary** | `bg-skyBlue shadow-clayBlue` | `-translate-y-1 shadow-clayBlue-lg` | `translate-y-1 shadow-none` |
| **Admin Button Secondary** | `bg-white shadow-admin` | `shadow-admin-hover` | `shadow-admin-pressed` |
| **Admin Input** | `bg-gray-50 rounded-2xl border border-gray-200` | `border-admin-primary` | `ring-2 ring-admin-primary/20` |
| **Admin Select** | `bg-white rounded-2xl shadow-sm` | `shadow-admin` | `border-admin-primary` |
| **Admin Badge** | `bg-admin-primary/10 text-admin-primary rounded-full px-3 py-1` | - | - |
| **Admin Table Row** | `bg-white border-b border-gray-100` | `bg-gray-50` | - |

#### Typography Scale

```css
.admin-heading-1 { font-size: 2rem;    font-weight: 700; line-height: 1.2; }  /* Page titles */
.admin-heading-2 { font-size: 1.5rem; font-weight: 600; line-height: 1.3; }  /* Section headers */
.admin-heading-3 { font-size: 1.25rem; font-weight: 600; line-height: 1.4; }  /* Card titles */
.admin-body      { font-size: 1rem;    font-weight: 400; line-height: 1.6; }  /* Body text */
.admin-small     { font-size: 0.875rem; font-weight: 400; line-height: 1.5; } /* Labels, hints */
.admin-caption   { font-size: 0.75rem; font-weight: 500; line-height: 1.4; }  /* Badges, timestamps */
```

### 2.2 Page Layout Structure (Desktop)

```
┌─────────────────────────────────────────────────────────────────┐
│  [Sidebar - Deep Slate]  │  [Main Content Area]                 │
│                          │                                       │
│  ┌───────────────────┐   │  ┌─────────────────────────────────┐ │
│  │ Logo + Platform   │   │  │ Header: Page Title + Actions     │ │
│  └───────────────────┘   │  └─────────────────────────────────┘ │
│                          │                                       │
│  Navigation:             │  ┌─────────────────────────────────┐ │
│  ├─ Dashboard           │  │                                 │ │
│  ├─ Flashcards         │  │  Content Area                    │ │
│  ├─ Courses            │  │  (Scrollable)                    │ │
│  ├─ Students           │  │                                 │ │
│  └─ Analytics          │  │                                 │ │
│                          │  └─────────────────────────────────┘ │
│  ┌───────────────────┐   │                                       │
│  │ Teacher Profile    │   │                                       │
│  └───────────────────┘   │                                       │
└─────────────────────────────────────────────────────────────────┘

Sidebar: 280px fixed width
Header: 72px height
Main Content: max-width 1400px, centered
```

### 2.3 Mobile-First Responsive Design

#### Breakpoints

| Breakpoint | Width | Description |
|------------|-------|-------------|
| `xs` | < 640px | Mobile phones (iPhone SE, etc.) |
| `sm` | 640px+ | Large phones (iPhone 14 Pro) |
| `md` | 768px+ | Tablets (iPad) |
| `lg` | 1024px+ | Small laptops |
| `xl` | 1280px+ | Laptops (1440px+) |

#### Test Devices
- **Primary Mobile**: iPhone 14 Pro (393x852)
- **Primary Desktop**: Laptop (1440px+)

#### Mobile Layout Structure

```
┌─────────────────────────────────┐
│  [Header - Sticky]             │
│  ☰ Menu | Title      [Profile] │
├─────────────────────────────────┤
│                                 │
│  Main Content Area              │
│  (Full width, scrollable)      │
│                                 │
│                                 │
│                                 │
├─────────────────────────────────┤
│  [Bottom Navigation Bar]        │
│  🏠 │ 📇 │ 📚 │ 👥 │ 📊       │
│ Home|Flash|Course|Stdnts|Stats │
└─────────────────────────────────┘
```

#### Responsive Grid System

```css
/* Desktop: 4 columns */
.admin-grid { grid-template-columns: repeat(4, 1fr); }

/* Tablet: 2 columns */
@media (max-width: 1024px) {
  .admin-grid { grid-template-columns: repeat(2, 1fr); }
}

/* Mobile: 1 column */
@media (max-width: 640px) {
  .admin-grid { grid-template-columns: 1fr; }
}
```

#### Responsive Component Examples

**Admin Card (Mobile):**
```tsx
// Mobile: Full width, reduced padding
<div className="w-full p-4 rounded-2xl shadow-admin">
  {/* Content adapts to container */}
</div>

// Desktop: Fixed/max width, more padding
<div className="w-full md:w-auto max-w-md p-5 md:p-6 rounded-3xl shadow-admin">
  {/* Content adapts to container */}
</div>
```

**Data Table (Mobile):**
```tsx
// Mobile: Card-based list view
// Desktop: Traditional table with columns
```

**Forms (Mobile):**
```tsx
// Full width inputs with larger touch targets
<input className="w-full h-12 text-base" />

// Stacked buttons (not side-by-side)
<div className="flex flex-col gap-3">
  <button>Action 1</button>
  <button>Action 2</button>
</div>
```

### 2.4 i18n Support

```typescript
// Translation file structure
{
  "admin": {
    "dashboard": {
      "title": "Dashboard",
      "welcome": "Welcome back, {{name}}"
    },
    "flashcards": {
      "title": "Flashcards",
      "create": "Create Flashcard",
      "edit": "Edit Flashcard",
      "delete": "Delete Flashcard"
    },
    "courses": {
      "title": "My Courses",
      "create": "Create Course",
      "publish": "Publish"
    },
    "students": {
      "title": "My Students",
      "enrolled": "{{count}} enrolled",
      "progress": "Progress"
    },
    "analytics": {
      "title": "Analytics",
      "overview": "Overview"
    }
  },
  "timeLimit": {
    "reminder": {
      "title": "Great job!",
      "message": "You've been learning for {{minutes}} minutes. Take a short break?",
      "continue": "Continue Learning",
      "takeBreak": "Take a Break"
    },
    "lock": {
      "title": "Rest Time!",
      "message": "Your streak is safe while you rest.",
      "chooseDuration": "Choose break length:",
      "resume": "Resume Learning"
    }
  }
}
```

---

## 3. MongoDB Collections & Schemas

### 3.1 Extended Flashcard Collection

```python
# backend/models/flashcard_model.py (EXTEND EXISTING)
from beanie import Document, Indexed
from pydantic import Field
from typing import Optional, Dict, List
from datetime import datetime

class FlashcardDocument(Document):
    """Flashcard document - extended with teacher_id and deck_id"""
    
    # EXISTING FIELDS (preserve)
    qr_id: Indexed(str, unique=True)
    word: Dict[str, str]
    translation: Dict[str, str]
    vector_embedding: Optional[List[float]] = None
    
    # NEW FIELDS
    teacher_id: Indexed(str)              # Creator's user ID (NEW)
    deck_id: Optional[str] = None        # Deck grouping (NEW)
    
    # Content
    pronunciation: Optional[str] = None
    audio_url: Optional[str] = None
    image_url: Optional[str] = None
    
    # Organization
    category: str = "general"
    difficulty: str = "beginner"
    tags: List[str] = Field(default_factory=list)
    
    # Metadata
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    is_active: bool = True
    
    class Settings:
        name = "flashcards"
        indexes = [
            "teacher_id",     # NEW
            "deck_id",        # NEW
            "category",
            "tags",
        ]
```

### 3.2 Flashcard Deck Collection (NEW)

```python
# backend/models/flashcard_deck_model.py
from beanie import Document, Indexed
from pydantic import Field
from typing import List
from datetime import datetime

class FlashcardDeck(Document):
    """Group flashcards into decks"""
    
    deck_id: Indexed(str, unique=True)
    teacher_id: Indexed(str)
    
    name: Dict[str, str]               # {"en": "Family Words", "vi": "Từ vựng gia đình"}
    description: Optional[Dict[str, str]] = None
    cover_image_url: Optional[str] = None
    
    # Stats
    card_count: int = 0
    
    # Metadata
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    is_active: bool = True
    
    class Settings:
        name = "flashcard_decks"
        indexes = ["teacher_id", "is_active"]
```

### 3.3 Extended Course Collection

```python
# backend/models/course_model.py (EXTEND EXISTING)
# ADD the following fields to existing CourseSchema or create CourseDocument

# NEW FIELDS TO ADD:
teacher_id: Indexed(str)              # Foreign key to teacher (NEW)
is_template: bool = False             # Template for reuse (NEW)

# For teacher-created courses, add relationship tracking:
enrolled_students: List[str] = Field(default_factory=list)  # Student IDs enrolled
```

### 3.4 Student Progress Collection

```python
# backend/models/student_progress_model.py
from beanie import Document, Indexed
from pydantic import Field, BaseModel
from typing import List, Optional, Dict
from datetime import datetime

class LessonProgress(BaseModel):
    lesson_id: str
    status: str = "not_started"
    attempts: int = 0
    best_score: Optional[int] = None
    time_spent_minutes: int = 0
    completed_at: Optional[datetime] = None

class CourseEnrollment(BaseModel):
    course_id: str
    enrolled_at: datetime
    progress_percent: float = 0.0
    lessons: List[LessonProgress] = Field(default_factory=list)
    last_activity: Optional[datetime] = None
    status: str = "active"

class StudentProgressDocument(Document):
    """Student learning progress - scoped to one teacher's view"""
    
    user_id: Indexed(str)
    teacher_id: Indexed(str)          # Links to specific teacher
    
    enrollments: List[CourseEnrollment] = Field(default_factory=list)
    
    flashcards_practiced: int = 0
    flashcards_mastered: int = 0
    
    total_xp: int = 0
    total_time_minutes: int = 0
    streak_days: int = 0
    last_active: Optional[datetime] = None
    
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Settings:
        name = "student_progress"
        indexes = [
            "user_id",
            "teacher_id",          # KEY: Enables teacher-scoped queries
            "last_active"
        ]
```

### 3.5 Usage Session Collection (NEW - for Time Limit feature)

```python
# backend/models/usage_session_model.py
from beanie import Document, Indexed
from pydantic import Field, BaseModel
from typing import List, Optional, Dict
from datetime import datetime

class BreakData(BaseModel):
    """Embedded break data"""
    started_at: datetime
    planned_duration_minutes: int
    actual_duration_minutes: Optional[int] = None
    streak_preserved: bool = True      # Always True for voluntary breaks
    was_auto_triggered: bool = False

class UsageSession(Document):
    """Tracks learning sessions with break support for streak preservation"""
    
    session_id: Indexed(str, unique=True)
    user_id: Indexed(str)
    
    # Session timing
    started_at: datetime
    ended_at: Optional[datetime] = None
    timezone: str = "Asia/Ho_Chi_Minh"
    
    # Active time tracking
    total_active_seconds: int = 0
    last_activity_at: Optional[datetime] = None
    
    # Break tracking
    current_break: Optional[BreakData] = None
    break_history: List[BreakData] = Field(default_factory=list)
    
    # Gamification
    xp_earned: int = 0
    lessons_completed: int = 0
    quizzes_completed: int = 0
    
    # Metadata
    device_info: Optional[Dict] = None
    is_active: bool = True
    
    class Settings:
        name = "usage_sessions"
        indexes = [
            "user_id",
            "started_at",
            "is_active"
        ]
```

---

## 4. API Endpoints

### 4.1 Flashcard API

```
Base Path: /api/v1/admin/flashcards

┌─────────────────────────────────────────────────────────────────┐
│  Method  │  Endpoint                      │  Description        │
├─────────────────────────────────────────────────────────────────┤
│  GET     │  /flashcards                   │  List teacher's cards│
│  GET     │  /flashcards/:id               │  Get flashcard     │
│  POST    │  /flashcards                   │  Create flashcard   │
│  PUT     │  /flashcards/:id               │  Update flashcard   │
│  DELETE  │  /flashcards/:id               │  Delete flashcard   │
│  POST    │  /flashcards/bulk              │  Bulk import        │
│  GET     │  /flashcards/categories        │  List categories    │
│  GET     │  /flashcards/decks             │  List decks         │
│  POST    │  /flashcards/decks             │  Create deck        │
│  POST    │  /flashcards/:id/audio         │  Upload audio      │
│  POST    │  /flashcards/:id/image         │  Upload image       │
│  GET     │  /flashcards/export            │  Export flashcards  │
└─────────────────────────────────────────────────────────────────┘
```

### 4.2 Course Management API

```
Base Path: /api/v1/admin/courses

┌─────────────────────────────────────────────────────────────────┐
│  Method  │  Endpoint                      │  Description        │
├─────────────────────────────────────────────────────────────────┤
│  GET     │  /courses                      │  List teacher's    │
│  GET     │  /courses/:id                  │  Get course        │
│  POST    │  /courses                      │  Create course     │
│  PUT     │  /courses/:id                  │  Update course     │
│  DELETE  │  /courses/:id                 │  Delete course     │
│  POST    │  /courses/:id/publish         │  Publish course    │
│  POST    │  /courses/:id/lessons         │  Add lesson        │
│  PUT     │  /courses/:id/lessons/:lid    │  Update lesson     │
│  DELETE  │  /courses/:id/lessons/:lid    │  Delete lesson     │
│  GET     │  /courses/:id/students        │  List enrolled     │
│  GET     │  /courses/:id/analytics       │  Course analytics  │
└─────────────────────────────────────────────────────────────────┘
```

### 4.3 Student Management API

```
Base Path: /api/v1/admin/students

┌─────────────────────────────────────────────────────────────────┐
│  Method  │  Endpoint                      │  Description        │
├─────────────────────────────────────────────────────────────────┤
│  GET     │  /students                    │  List enrolled only│
│  GET     │  /students/:id                │  Get student detail│
│  GET     │  /students/:id/progress       │  Get progress      │
│  GET     │  /students/:id/activity       │  Recent activity   │
│  GET     │  /students/:id/quiz-results   │  Quiz history      │
│  POST    │  /students/:id/enroll         │  Enroll in course   │
│  GET     │  /students/export             │  Export student list│
│  GET     │  /students/stats              │  Overall stats     │
└─────────────────────────────────────────────────────────────────┘

NOTE: All queries automatically scoped to current teacher_id
```

### 4.4 Analytics API

```
Base Path: /api/v1/admin/analytics

┌─────────────────────────────────────────────────────────────────┐
│  Method  │  Endpoint                      │  Description        │
├─────────────────────────────────────────────────────────────────┤
│  GET     │  /analytics/overview           │  Dashboard summary  │
│  GET     │  /analytics/progress           │  Progress trends    │
│  GET     │  /analytics/engagement         │  Engagement metrics │
│  GET     │  /analytics/quiz-performance   │  Quiz statistics    │
│  GET     │  /analytics/export             │  Export report      │
└─────────────────────────────────────────────────────────────────┘

NOTE: Teacher-level only - filters by teacher_id
```

### 4.5 Session Management API (NEW - Time Limit feature)

```
Base Path: /api/v1/sessions

┌─────────────────────────────────────────────────────────────────┐
│  Method  │  Endpoint                      │  Description        │
├─────────────────────────────────────────────────────────────────┤
│  POST    │  /sessions/start               │  Start new session  │
│  POST    │  /sessions/heartbeat           │  Update activity    │
│  POST    │  /sessions/break/start         │  Start break        │
│  POST    │  /sessions/break/end           │  End break          │
│  GET     │  /sessions/current             │  Get active session │
│  POST    │  /sessions/end                 │  End session        │
│  GET     │  /sessions/:id                 │  Get session details│
│  GET     │  /sessions/history             │  Get session history│
└─────────────────────────────────────────────────────────────────┘
```

---

## 5. User Flows

### 5.1 Flashcard Creation Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        FLASH CARD CREATION FLOW                             │
└─────────────────────────────────────────────────────────────────────────────┘

[Teacher clicks "New Flashcard"]
           │
           ▼
┌───────────────────────┐
│   Flashcard Form      │
│                       │
│  ┌─────────────────┐  │
│  │ Word (EN)       │  │
│  └─────────────────┘  │
│  ┌─────────────────┐  │
│  │ Word (VI)       │  │
│  └─────────────────┘  │
│  ┌─────────────────┐  │
│  │ Translation     │  │
│  └─────────────────┘  │
│  ┌─────────────────┐  │
│  │ Pronunciation   │  │
│  └─────────────────┘  │
│  ┌───────────┬─────┐  │
│  │ Deck      │  ▼  │  │  ── Select deck (optional)
│  └───────────┴─────┘  │
│  ┌───────────┬─────┐  │
│  │ Category  │  ▼  │  │
│  └───────────┴─────┘  │
│  ┌───────────┬─────┐  │
│  │ Difficulty│  ▼  │  │
│  └───────────┴─────┘  │
│                       │
│  [Cancel]  [Create] │
└───────────────────────┘
```

### 5.2 Student Progress Review Flow (Teacher-Scoped)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      STUDENT PROGRESS REVIEW FLOW                            │
└─────────────────────────────────────────────────────────────────────────────┘

[Teacher clicks "Students" - sees ONLY enrolled students]
           │
           ▼
┌───────────────────────────────────────────────────────────────────┐
│  STUDENT LIST (Enrolled in Teacher's Courses Only)                   │
│                                                                    │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │ 🔍 Search...                          [Filter ▼] [Export]   │ │
│  └──────────────────────────────────────────────────────────────┘ │
│                                                                    │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │ Avatar │ Name      │ Course │ Progress │ Last Active │ ⋮    │ │
│  ├──────────────────────────────────────────────────────────────┤ │
│  │   👤    │ Alice    │ Family │   ████░ 65%│ 2 hrs ago  │ ▶  │ │
│  │   👤    │ Bob      │ Nature │   ██████ 92%│ 1 day ago  │ ▶  │ │
│  └──────────────────────────────────────────────────────────────┘ │
└───────────────────────────────────────────────────────────────────┘
           │
           ▼
┌───────────────────────────────────────────────────────────────────┐
│  STUDENT DETAIL (Viewing own enrolled students only)                │
│                                                                    │
│  Shows:                                                            │
│  - Progress in teacher's courses only                               │
│  - Teacher's flashcards practiced                                  │
│  - Teacher's quiz scores                                          │
└───────────────────────────────────────────────────────────────────┘
```

### 5.3 Time Limit & Rest Reminder Flow (NEW)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    TIME LIMIT & REST REMINDER FLOW                         │
│                    (Duolingo-style, streak protection)                     │
└─────────────────────────────────────────────────────────────────────────────┘

[Student starts learning session]
           │
           ▼
┌─────────────────────────────────────────────────────────────────┐
│  Session Timer Active (Client-side + Server heartbeat)            │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  ⏱ Session: 20:00  │  XP: 45  │  🔥 Streak: 15 days   │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
│  Learning continues...                                           │
└─────────────────────────────────────────────────────────────────┘
           │
           ▼ (20 minutes reached)
┌─────────────────────────────────────────────────────────────────┐
│  REMINDER - Gentle Toast (Optional dismiss)                      │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  💪 Great job! You've been learning for 20 minutes.     │  │
│  │                                                         │  │
│  │  Your brain might appreciate a short break!             │  │
│  │                                                         │  │
│  │        [Continue Learning]    [Take a Break]            │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ⚠️ Streak is SAFE during breaks!                              │
└─────────────────────────────────────────────────────────────────┘
           │
    ┌─────┴─────┐
    │           │
[Continue]    [Take Break]
    │           │
    │           ▼
    │  ┌─────────────────┐
    │  │  BREAK MODE     │
    │  │  XP saved: 45   │
    │  │  Streak: 🔒     │
    │  └─────────────────┘
    │
    │ (User continues learning)
    │
    ▼ (25 minutes - optional warning)
┌─────────────────────────────────────────────────────────────────┐
│  WARNING - Suggestive Modal (Optional dismiss)                    │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  🧠 Time for a breather!                                  │  │
│  │                                                          │  │
│  │  Regular breaks help you remember things better.          │  │
│  │                                                          │  │
│  │        [Keep Going]    [Start Break]                    │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
    │
    │ (User continues, ignores again)
    │
    ▼ (30 minutes - forced)
┌─────────────────────────────────────────────────────────────────┐
│  APP LOCK - Full Screen Lock                                     │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                                                          │  │
│  │                    🌴                                    │  │
│  │                                                          │  │
│  │              Rest Time!                                  │  │
│  │                                                          │  │
│  │     Your streak is safe while you rest!                   │  │
│  │              🔥 15-day streak                            │  │
│  │                                                          │  │
│  │  ┌─────────────────────────────────────────────────┐   │  │
│  │  │        Choose your break length:                  │   │  │
│  │  │                                                  │   │  │
│  │  │   [5 min]    [10 min]    [15 min]              │   │  │
│  │  │                                                  │   │  │
│  │  └─────────────────────────────────────────────────┘   │  │
│  │                                                          │  │
│  │                 [Resume Learning]                        │  │
│  │                                                          │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
│  XP earned this session: 45 XP ✓                                │
└─────────────────────────────────────────────────────────────────┘
           │
           ▼ (After break or resume)
┌─────────────────────────────────────────────────────────────────┐
│  Session continues with XP preserved                              │
│                                                                 │
│  Streak: 15 days ✓ (no penalty for breaks)                      │
└─────────────────────────────────────────────────────────────────┘
```

---

## 6. Component Specifications

### 6.1 Admin Layout (Responsive)

```tsx
// Desktop Layout
<div className="hidden lg:flex min-h-screen">
  <AdminSidebar />           {/* 280px fixed */}
  <div className="flex-1 ml-64">
    <AdminHeader />
    <main className="p-6">{children}</main>
  </div>
</div>

// Mobile Layout
<div className="lg:hidden min-h-screen pb-20">
  <header className="sticky top-0 z-50">
    <MobileHeader />
  </header>
  <main className="p-4">{children}</main>
  <BottomNav />             {/* Fixed bottom nav */}
</div>
```

### 6.2 Mobile Bottom Navigation

```tsx
const bottomNavItems = [
  { path: '/admin', label: 'Dashboard', icon: HomeIcon },
  { path: '/admin/flashcards', label: 'Flash', icon: CardsIcon },
  { path: '/admin/courses', label: 'Courses', icon: BookIcon },
  { path: '/admin/students', label: 'Students', icon: UsersIcon },
  { path: '/admin/analytics', label: 'Stats', icon: ChartIcon },
];
```

### 6.3 Session Timer Components

```tsx
// components/session/SessionTimer.tsx
interface SessionTimerProps {
  isActive: boolean;
  remainingSeconds: number;
  onReminder: () => void;
  onWarning: () => void;
  onLock: () => void;
}

// components/session/ReminderToast.tsx
interface ReminderToastProps {
  minutes: number;
  onDismiss: () => void;
  onTakeBreak: () => void;
}

// components/session/LockScreen.tsx
interface LockScreenProps {
  streakDays: number;
  xpEarned: number;
  breakOptions: number[];  // [5, 10, 15]
  onResume: () => void;
  onSelectBreak: (minutes: number) => void;
}
```

---

## 7. Implementation Tasks

### Epic 1: Backend Infrastructure (Est: 10h)

- [ ] **Task 1.1** - Extend admin MongoDB schemas
  - Add `teacher_id` + `deck_id` to flashcards
  - Add `teacher_id` + `is_template` to courses
  - Add `UsageSession` collection
  - Add `FlashcardDeck` collection
- [ ] **Task 1.2** - Implement admin repositories
  - Teacher-scoped student queries
  - Session management repository
- [ ] **Task 1.3** - Implement admin services
  - Add streak-preservation logic to break endpoints
- [ ] **Task 1.4** - Create admin API routes
  - All existing endpoints
  - Session management endpoints
- [ ] **Task 1.5** - Add RBAC middleware
  - Teacher permission checks
  - Student scope filtering

### Epic 2: Session Timer System (Est: 8h) - NEW

- [ ] **Task 2.1** - Create session timer hooks
  - `useSessionTimer.ts`
  - `useIdleDetection.ts`
  - `useBreakManager.ts`
- [ ] **Task 2.2** - Create session provider
  - `SessionProvider.tsx`
  - Session state management
  - Server synchronization
- [ ] **Task 2.3** - Build UI components
  - Reminder toast
  - Warning modal
  - Lock screen overlay
- [ ] **Task 2.4** - Implement break logic
  - Break start/end endpoints
  - Streak preservation verification
  - XP persistence

### Epic 3: Frontend Admin Components (Est: 14h)

- [ ] **Task 3.1** - Create admin layout components
  - Responsive sidebar
  - Mobile header
  - Bottom navigation
- [ ] **Task 3.2** - Create shared admin UI components
  - All existing components
  - Mobile-optimized variants
- [ ] **Task 3.3** - Create Flashcard components
  - All existing components
  - Deck management
- [ ] **Task 3.4** - Create Course components
  - All existing components
- [ ] **Task 3.5** - Create Student components
  - Teacher-scoped views only
- [ ] **Task 3.6** - Create Analytics components

### Epic 4: Admin Pages & Routing (Est: 6h)

- [ ] **Task 4.1** - Set up admin routing
  - Add admin routes to App.tsx
  - Create responsive `AdminLayout` wrapper
  - Auth guards for teacher role
- [ ] **Task 4.2** - Implement all admin pages
  - Dashboard
  - Flashcards
  - Courses
  - Students (enrolled only)
  - Analytics

### Epic 5: i18n Integration (Est: 4h) - NEW

- [ ] **Task 5.1** - Set up react-i18next
  - Translation files structure
  - Language switcher
- [ ] **Task 5.2** - Add translations
  - English translations
  - Vietnamese translations
- [ ] **Task 5.3** - Update all components
  - Use translation keys
  - RTL support (if needed)

### Epic 6: Testing & Polish (Est: 6h)

- [ ] **Task 6.1** - Component testing
- [ ] **Task 6.2** - Responsive testing
  - iPhone 14 Pro (393x852)
  - Laptop 1440px+
- [ ] **Task 6.3** - Accessibility
- [ ] **Task 6.4** - Performance optimization

---

## 8. Dependencies

### 8.1 External Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `chart.js` | ^4.4 | Progress charts |
| `react-chartjs-2` | ^5.2 | Chart.js React wrapper |
| `react-dropzone` | ^14.2 | File upload |
| `date-fns` | ^3.0 | Date formatting |
| `@tanstack/react-table` | ^8.11 | Advanced table |
| `react-hot-toast` | ^2.4 | Toast notifications |
| `framer-motion` | ^11.0 | Smooth animations |
| `i18next` | ^23.0 | Internationalization |
| `react-i18next` | ^14.0 | React i18n integration |

### 8.2 Internal Dependencies

| Module | Purpose |
|--------|---------|
| `@/design-tokens/claymorphic` | Design tokens |
| `@/styles/claymorphic-utilities.css` | Claymorphic CSS |
| `@/services/apiClient` | API client |
| `@/types/course` | Course types |

---

## 9. File Structure

```
frontend-web/src/
├── components/
│   ├── admin/
│   │   ├── layout/
│   │   │   ├── AdminSidebar.tsx
│   │   │   ├── AdminHeader.tsx
│   │   │   ├── AdminMobileHeader.tsx
│   │   │   ├── AdminBottomNav.tsx
│   │   │   └── AdminLayout.tsx
│   │   ├── ui/
│   │   │   ├── AdminCard.tsx
│   │   │   ├── AdminButton.tsx
│   │   │   ├── AdminInput.tsx
│   │   │   ├── AdminSelect.tsx
│   │   │   ├── AdminTable.tsx
│   │   │   ├── AdminModal.tsx
│   │   │   ├── AdminBadge.tsx
│   │   │   ├── AdminTabs.tsx
│   │   │   └── AdminToast.tsx
│   │   ├── flashcards/
│   │   ├── courses/
│   │   ├── students/
│   │   └── analytics/
│   ├── session/                        # NEW - Session timer
│   │   ├── SessionProvider.tsx
│   │   ├── SessionTimer.tsx
│   │   ├── ReminderToast.tsx
│   │   ├── WarningModal.tsx
│   │   ├── LockScreen.tsx
│   │   └── BreakSelector.tsx
│   └── clay/
│
├── pages/
│   └── admin/
│       ├── AdminDashboard.tsx
│       ├── AdminFlashcards.tsx
│       ├── AdminCourses.tsx
│       ├── AdminStudents.tsx
│       └── AdminAnalytics.tsx
│
├── services/
│   ├── adminApi.ts
│   └── sessionApi.ts                   # NEW - Session API
│
├── hooks/
│   ├── useFlashcards.ts
│   ├── useCourses.ts
│   ├── useStudents.ts
│   ├── useAnalytics.ts
│   ├── useSessionTimer.ts              # NEW
│   ├── useIdleDetection.ts             # NEW
│   └── useBreakManager.ts              # NEW
│
├── i18n/                              # NEW
│   ├── index.ts
│   └── locales/
│       ├── en.json
│       └── vi.json
│
├── types/
│   ├── admin.ts
│   └── session.ts                      # NEW
│
└── styles/
    ├── admin-claymorphic.css
    └── [existing styles]

backend/
├── models/
│   ├── flashcard_model.py              # Extended
│   ├── flashcard_deck_model.py         # NEW
│   ├── course_model.py                 # Extended
│   ├── student_progress_model.py
│   ├── usage_session_model.py          # NEW
│   └── quiz_model.py
│
├── repositories/
│   ├── flashcard_repository.py
│   ├── course_repository.py
│   ├── student_repository.py
│   ├── analytics_repository.py
│   └── session_repository.py            # NEW
│
├── services/
│   ├── flashcard_service.py
│   ├── course_service.py
│   ├── student_service.py
│   ├── analytics_service.py
│   └── session_service.py               # NEW (with streak protection)
│
└── api/
    ├── admin/
    │   ├── flashcards.py
    │   ├── courses.py
    │   ├── students.py
    │   └── analytics.py
    └── sessions/
        └── session_api.py               # NEW
```

---

## 10. Risks & Mitigations

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Large dataset performance | Medium | High | Pagination, virtual scrolling |
| Session timer drift on page refresh | Medium | Medium | Web Worker + localStorage persistence |
| Streak calculation edge cases | Medium | High | Timezone-aware evaluation, comprehensive tests |
| Break abuse (fake breaks) | Low | Medium | Server-side break tracking, reasonable limits |
| Mobile responsive issues | High | Medium | Extensive mobile testing on target devices |
| i18n string coverage | Medium | Low | Automated extraction + linting |

---

## 11. Estimated Timeline

| Phase | Tasks | Estimated Time |
|-------|-------|----------------|
| **Phase 1: Backend** | Epic 1 | 10 hours |
| **Phase 2: Session Timer** | Epic 2 | 8 hours |
| **Phase 3: Frontend Components** | Epic 3 | 14 hours |
| **Phase 4: Pages & Routing** | Epic 4 | 6 hours |
| **Phase 5: i18n Integration** | Epic 5 | 4 hours |
| **Phase 6: Polish & Testing** | Epic 6 | 6 hours |
| **Total** | | **48 hours** |

---

## 12. Approval Checklist

- [x] **Architecture design approved** (teacher-scoped queries)
- [x] **MongoDB schemas approved** (extend existing with FK)
- [x] **API endpoints approved** (20+ endpoints + session API)
- [x] **User flows approved** (including time limit flow)
- [x] **Design system approved** (mobile-first responsive)
- [x] **i18n support approved** (EN/VI)
- [x] **Time Limit feature approved** (Duolingo-style)
- [ ] Timeline acceptable (48 hours vs previous 34 hours)
- [ ] All clarifications implemented

---

## 13. References

- Research: `docs/research/time_limit_research.md`
- Original Plan: `docs/plan/admin_page_plan.md` (v1.0)
