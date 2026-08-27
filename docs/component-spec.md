# Gamification Component Specification

## Overview

This document specifies reusable components for the gamification pages (Daily Challenge and Leaderboard) of the EduAR educational platform. Components are designed with a claymorphic/playful aesthetic and consistent state handling patterns.

---

## Data Contracts

### LeaderboardEntry
```typescript
interface LeaderboardEntry {
    user_id: string;
    username: string;
    avatar_url?: string;
    points: number;
    rank: number;
}
```

### DailyChallenge
```typescript
interface DailyChallenge {
    title: string;
    target: number;
    progress: number;
    reward: string;
    completed: boolean;
}
```

---

## Component 1: ChallengeCard

**Purpose:** Displays daily challenge with progress visualization

### Props Interface
```typescript
interface ChallengeCardProps {
    title: string;
    target: number;
    progress: number;
    reward: string;
    onActionClick?: () => void;
    actionLabel?: string;
}
```

### States
| State | Visual |
|-------|--------|
| **Default** | White card with coral gradient header, progress bar at current percentage |
| **Completed** | Green progress bar, "Challenge Complete!" badge shown |
| **Loading** | Skeleton placeholder with pulsing animation |
| **Empty** | Shows empty state message with CTA |

### Usage Example
```tsx
<ChallengeCard
    title="Complete 3 vocabulary lessons"
    target={3}
    progress={2}
    reward="50 XP"
    onActionClick={() => navigate('/courses')}
    actionLabel="Continue Learning"
/>
```

### CSS Classes
- Container: `rounded-3xl overflow-hidden`
- Header gradient: `linear-gradient(135deg, #FF6B6B 0%, #FF8E8E 100%)`
- Card body: `bg-white rounded-3xl p-5 shadow-lg`
- Progress bar: `h-5 rounded-full overflow-hidden`

---

## Component 2: LeaderboardRow

**Purpose:** Individual user entry in leaderboard list

### Props Interface
```typescript
interface LeaderboardRowProps {
    entry: LeaderboardEntry;
    position: number;
    isCurrentUser: boolean;
}
```

### States
| State | Visual |
|-------|--------|
| **Default** | White background, standard rank badge |
| **Current User** | Yellow-tinted background, ring highlight, "You" badge |
| **Top 3** | Special emoji medals (🥇🥈🥉) instead of numbers |
| **Hover** | Light gray background on non-current rows |

### Usage Example
```tsx
<LeaderboardRow
    entry={{ user_id: '123', username: 'Alice', points: 500, rank: 4 }}
    position={4}
    isCurrentUser={false}
/>
```

### CSS Classes
- Container: `flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-2xl`
- Rank badge: `flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-full font-black text-sm sm:text-base`
- Avatar: `w-10 h-10 sm:w-12 sm:h-12 rounded-full overflow-hidden border-2 border-white shadow`

---

## Component 3: PodiumDisplay

**Purpose:** Visual top 3 leaderboard with podium layout

### Props Interface
```typescript
interface PodiumDisplayProps {
    entries: LeaderboardEntry[];
    currentUserId?: string;
}
```

### States
| State | Visual |
|-------|--------|
| **Default** | 1st (center, tallest), 2nd (left), 3rd (right) with medals |
| **Current User** | Ring highlight around their podium block |
| **Loading** | Skeleton podium shapes |

### Usage Example
```tsx
<PodiumDisplay
    entries={topThree}
    currentUserId={user?.id}
/>
```

### CSS Classes
- Container: `flex items-end justify-center gap-3 sm:gap-6 py-8`
- Podium block: `rounded-t-2xl flex flex-col items-center justify-end pb-3`
- Avatar: `rounded-full border-4 border-white shadow-lg`
- Heights: 1st (h-36 sm:h-44), 2nd (h-28 sm:h-32), 3rd (h-20 sm:h-24)

---

## Component 4: XPBadge

**Purpose:** Display experience points in a badge format

### Props Interface
```typescript
interface XPBadgeProps {
    points: number;
    size?: 'sm' | 'md' | 'lg';
    showLabel?: boolean;
}
```

### States
| State | Visual |
|-------|--------|
| **Default** | Yellow/gold badge with points number |
| **Compact** | Just the number without label |
| **Loading** | Skeleton placeholder |

### Usage Example
```tsx
<XPBadge points={1250} size="md" showLabel />
<XPBadge points={500} size="sm" />
```

### CSS Classes
- Container: `inline-flex items-center gap-1`
- Points text: `font-black text-yellow-600`
- Label: `text-xs text-slate-400`

---

## Component 5: ProgressRing

**Purpose:** Circular progress indicator for gamification progress

### Props Interface
```typescript
interface ProgressRingProps {
    progress: number;
    target: number;
    size?: 'sm' | 'md' | 'lg';
    color?: string;
    showLabel?: boolean;
}
```

### States
| State | Visual |
|-------|--------|
| **In Progress** | Partial ring with percentage |
| **Complete** | Full ring with green color |
| **Loading** | Animated skeleton ring |

### Usage Example
```tsx
<ProgressRing progress={3} target={5} size="md" showLabel />
```

### CSS Classes
- SVG circle: `transform -rotate-90`
- Track: `stroke-gray-200`
- Progress: `stroke-current transition-all duration-700`

---

## Component 6: TimeFilterTabs

**Purpose:** Filter tabs for leaderboard time periods

### Props Interface
```typescript
interface TimeFilterTabsProps {
    value: TimeFilter;
    onChange: (filter: TimeFilter) => void;
    options?: { value: TimeFilter; label: string }[];
}

type TimeFilter = 'all' | 'weekly' | 'daily';
```

### States
| State | Visual |
|-------|--------|
| **Selected** | White background, colored text, shadow |
| **Unselected** | Semi-transparent white, hover state |
| **Disabled** | Reduced opacity |

### Usage Example
```tsx
<TimeFilterTabs
    value={timeFilter}
    onChange={setTimeFilter}
/>
```

### CSS Classes
- Container: `flex gap-2`
- Tab: `px-4 py-2 rounded-full text-sm font-bold transition-all`
- Active: `bg-white text-yellow-700 shadow`
- Inactive: `bg-white/20 text-white hover:bg-white/30`

---

## Shared Patterns

### Loading Skeleton
```tsx
const LoadingSkeleton: React.FC<{ count?: number }> = ({ count = 5 }) => (
    <div className="space-y-4">
        {Array.from({ length: count }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 p-4 bg-white rounded-2xl animate-pulse">
                <div className="w-10 h-10 rounded-full bg-gray-200" />
                <div className="flex-1 space-y-2">
                    <div className="h-4 w-24 bg-gray-200 rounded" />
                    <div className="h-3 w-16 bg-gray-200 rounded" />
                </div>
                <div className="h-6 w-16 bg-gray-200 rounded" />
            </div>
        ))}
    </div>
);
```

### Error State
```tsx
const ErrorState: React.FC<{ onRetry: () => void; message?: string }> = ({ onRetry, message = "Something went wrong" }) => (
    <div className="text-center py-16">
        <div className="text-6xl mb-6">😢</div>
        <h3 className="text-2xl font-black text-slate-700 mb-2">{message}</h3>
        <button onClick={onRetry} className="clay-cta-primary">Try again</button>
    </div>
);
```

### Empty State
```tsx
const EmptyState: React.FC<{ icon: string; title: string; description: string; actionLabel?: string; onAction?: () => void }> = ({ icon, title, description, actionLabel, onAction }) => (
    <div className="text-center py-16">
        <div className="text-7xl mb-6">{icon}</div>
        <h3 className="text-2xl font-black text-slate-700 mb-2">{title}</h3>
        <p className="text-slate-500 mb-6 max-w-sm mx-auto">{description}</p>
        {actionLabel && onAction && (
            <button onClick={onAction} className="clay-cta-primary">{actionLabel}</button>
        )}
    </div>
);
```

---

## Styling Constants

### Color Palette
```css
--color-coral: #FF6B6B;
--color-coral-light: #FF8E8E;
--color-gold: #FFD93D;
--color-gold-light: #FFF9E6;
--color-amber: #F59E0B;
--color-green: #22c55e;
--color-green-light: #4ade80;
```

### Claymorphic Utilities
- Primary button: `clay-cta-primary`
- Secondary button: `clay-cta-secondary`
- Background: `clay-bg-playful`

### Responsive Breakpoints
- Mobile: default
- Tablet: `sm:` (640px+)
- Desktop: `md:` (768px+)
- Large desktop: `lg:` (1024px+)

---

## API Integration

### Leaderboard Endpoint
```
GET /gamification/leaderboard
Response: LeaderboardEntry[]
```

### User Stats Endpoint
```
GET /gamification/user/{userId}
Response: UserStats
```

### Profile (includes daily challenge)
```
GET /api/profile
Response: { ..., daily_challenge: DailyChallenge }
```

---

## File Structure

```
src/
├── components/
│   └── gamification/
│       ├── ChallengeCard.tsx
│       ├── LeaderboardRow.tsx
│       ├── PodiumDisplay.tsx
│       ├── XPBadge.tsx
│       ├── ProgressRing.tsx
│       ├── TimeFilterTabs.tsx
│       └── shared/
│           ├── LoadingSkeleton.tsx
│           ├── ErrorState.tsx
│           └── EmptyState.tsx
├── pages/
│   ├── DailyChallengePage.tsx
│   └── Leaderboard.tsx
└── services/
    └── GamificationService.ts
```
