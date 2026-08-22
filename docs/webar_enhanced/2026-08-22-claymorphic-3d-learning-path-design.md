# Claymorphic 3D Learning Path

> **Spec Version:** 1.0  
> **Date:** 2026-08-22  
> **Author:** Claude  
> **Status:** Draft

## 1. Concept & Vision

A **Duolingo-inspired 3D learning path** where the user's active pet walks along a winding claymorphic path through a playful landscape. The path guides learners through lessons with clear visual progress — available nodes glow, completed nodes shine golden, and locked nodes appear muted. The pet serves as a friendly guide character, walking ahead and celebrating milestones.

**Personality:** Playful, encouraging, tactile. Every element feels like a physical clay sculpture — rounded edges, soft shadows, vibrant but not garish colors. The experience should feel like playing with a 3D toy, not using software.

---

## 2. Design Language

### Aesthetic Direction
**Claymorphic 3D** — All elements use soft, rounded forms with clay-like materials. High roughness (0.6-0.8), warm color temperatures, subtle ambient occlusion shadows. No sharp edges, no metalic/glass materials. Think Pixar's clay animation (early Aardman films) meets mobile gaming.

### Color Palette

| Token | Hex | Usage |
|-------|-----|-------|
| `path-base` | `#FFF0D9` | Clay path bricks |
| `path-accent` | `#FFB347` | Path edge highlights |
| `node-available` | `#5B8DEF` | Available lesson nodes (sky blue) |
| `node-completed` | `#FFD700` | Completed lesson nodes (gold) |
| `node-locked` | `#9CA3AF` | Locked lesson nodes (gray) |
| `grass-hill` | `#B8E6B8` | Landscape hills |
| `grass-dark` | `#8FBC8F` | Hill shadows |
| `sky-top` | `#87CEEB` | Sky gradient top |
| `sky-bottom` | `#E0F4FF` | Sky gradient bottom |
| `cloud` | `#FFFFFF` | Floating clouds |
| `cloud-shadow` | `#E8F4F8` | Cloud undersides |

### Typography
N/A — This is a 3D immersive experience. All text is in React UI overlays (see Component Inventory).

### Spatial System
- **Path width:** 2.0 units (world units)
- **Node spacing:** 4-6 units along path
- **Path winding:** S-curve with amplitude 8 units, period 20 units
- **Camera distance:** 8 units behind pet, 3 units elevation
- **Landscape depth:** Extends 50 units into background

### Motion Philosophy
| Element | Animation | Timing |
|---------|-----------|--------|
| Pet walking | Procedural bob + footstep squash | Continuous while active |
| Pet idle | Gentle breathing float | Subtle loop |
| Node hover | Scale 1.0 → 1.15, glow intensity increase | 200ms ease-out |
| Node completion | Burst particles + golden shimmer | 800ms celebration |
| Camera pan | Smooth follow with damping | 0.05 lerp factor |
| Cloud drift | Slow horizontal movement | 0.1 units/sec |
| Path reveal | Nodes fade in sequentially | 100ms stagger |

### Visual Assets
- **Pet model:** Existing GLB from `PetViewer3D` with clay-compatible aesthetics
- **Path bricks:** Procedural rounded box geometry with clay material
- **Lesson nodes:** Sphere geometry with emissive glow shader
- **Hills:** Smooth terrain mesh with grass material
- **Clouds:** Soft blob shapes using merged sphere geometries
- **Decorative trees:** Low-poly stylized trees, 3-4 variants

---

## 3. Layout & Structure

### Scene Composition

```
┌─────────────────────────────────────────────────────────────┐
│                         SKY GRADIENT                         │
│                    (light blue → white)                      │
│                                                              │
│     ☁️        ☁️                    ☁️        ☁️             │
│           ☁️                    ☁️                             │
│                                                              │
│  🏔️    ╭───────────────────────────────────╮    🏔️        │
│        ╱   [PATH WITH LESSON NODES]           ╲              │
│   🌳  ╱  🔵 ──── 🔵 ──── ⭐ ──── 🔵 ──── 🔒   ╲  🌳       │
│       ╲         PET WALKING →                 ╱             │
│        ╲                                  ╱                  │
│         ╰────────────────────────────────╯                   │
│                                                              │
│                    🏞️ GRASS HILLS 🏞️                        │
└─────────────────────────────────────────────────────────────┘
```

### Camera Behavior
- **Default:** Third-person follow behind pet, looking forward along path
- **On node tap:** Camera lerps to node, UI modal appears
- **On lesson complete:** Camera celebrates with pet, then continues

### Responsive Strategy
- **375px (iPhone SE):** Single-lane path, simplified landscape, reduced particles
- **390-430px (iPhone 14/Pro):** Full experience, all decorations visible
- **Tablet+:** Wider view frustum, more landscape visible, optional orbit controls

### Route Structure
```
/learning-path-3d     → 3D Path Experience (new page)
/learning-path        → Existing 2D CourseMap (unchanged)
```

---

## 4. Features & Interactions

### 4.1 Pet Guide System
**Core behavior:** The active pet from `usePets()` walks along the path ahead of the camera.

| State | Behavior |
|-------|----------|
| Idle | Pet bobs gently in place, looks around |
| Walking | Pet moves along path at constant speed, legs animate |
| Arriving at node | Pet stops, plays celebration animation |
| Lesson complete | Pet jumps, particles burst |
| No active pet | Show default mascot (owl/character) |

**Technical:** Pet position tracked along path spline. Animation blend between walk/idle based on distance to next node.

### 4.2 Lesson Node System
**Node types:**

| Status | Visual | Interaction |
|--------|--------|-------------|
| `available` | Blue glow, pulsing | Tap → Open lesson modal |
| `completed` | Gold shimmer, sparkle particles | Tap → Show "Already completed" toast |
| `locked` | Gray, no glow | Tap → Show unlock hint |

**Node data structure:**
```typescript
interface LessonNode {
  lesson_id: string;
  title: string;
  status: 'completed' | 'available' | 'locked';
  type: 'flashcard' | 'quiz' | 'ar_session' | 'lesson';
  xp_reward: number;
  icon: string; // emoji or icon key
  position: number; // 0-1 along path spline
  unlock_condition?: {
    type: 'xp' | 'streak' | 'lesson';
    value: number;
    prerequisite_id?: string;
  };
}
```

### 4.3 Lesson Detail Modal
When user taps an available node:

```
┌─────────────────────────────────────┐
│          [NODE ICON 3D VIEW]        │
│              (rotating)              │
├─────────────────────────────────────┤
│                                     │
│         Lesson Title                │
│         Subtitle/description        │
│                                     │
│    ⚡ +50 XP        📚 Flashcard     │
│                                     │
│  ┌─────────────────────────────┐    │
│  │      Start Lesson           │    │
│  └─────────────────────────────┘    │
│                                     │
│           [ × Close ]               │
└─────────────────────────────────────┘
```

### 4.4 Progress Trail
- Completed nodes leave a golden trail on the path
- Trail extends from start to furthest completed node
- Remaining path is neutral (cream colored)
- Visual: Path segments ahead of pet have subtle glow; behind is golden

### 4.5 Landscape Decorations
Procedural placement of:
- **Hills:** 3-5 rolling hills in background, varying sizes
- **Clouds:** 5-8 floating clouds, slow drift animation
- **Trees:** Low-poly stylized trees along path edges (3 variants)
- **Flowers:** Small colorful dots on hills (instanced meshes)

### 4.6 Error States
| State | Behavior |
|-------|----------|
| Pet model fails to load | Show clay blob fallback with pet icon |
| No lessons in path | Show empty state: "Start your first lesson!" |
| Network error | Show retry button, cached progress if available |
| WebGL not supported | Redirect to `/learning-path` (2D fallback) |

---

## 5. Component Inventory

### 5.1 ThreeJS Components

#### `<ClayPath />`
Clay brick path through the landscape.
- **Geometry:** Extruded rounded rectangles along spline
- **Material:** MeshStandardMaterial, roughness: 0.7, warm cream color
- **States:** Default (cream), Completed trail (golden tint)

#### `<LessonNode3D />`
Sphere node representing a lesson.
- **Geometry:** IcosahedronGeometry for faceted clay look
- **Material:** MeshStandardMaterial with emissive glow
- **States:**
  - Available: Blue emissive, pulse animation
  - Completed: Gold emissive, sparkle particles
  - Locked: Gray, no emissive, slight desaturation
  - Hover: Scale 1.15, increased glow

#### `<PetGuide3D />`
Active pet walking along path.
- **Uses:** Existing `PetViewer3D` component logic
- **Animation:** Procedural walk cycle (bob + squash/stretch)
- **States:** Idle, Walking, Celebrating, Waiting

#### `<Landscape />`
Background hills and environment.
- **Elements:** Terrain mesh, cloud groups, tree instances
- **Material:** MeshToonMaterial for cartoon shading
- **Optimization:** Static geometry, no per-frame updates

#### `<ProgressTrail />`
Golden trail showing completed path.
- **Geometry:** Path segments marked as completed
- **Material:** Emissive gold with animated shimmer

### 5.2 React UI Components

#### `<LearningPath3DPage />`
Main page container.
- **Layout:** Full viewport, no scrolling
- **Overlays:** Header bar, lesson modal

#### `<PathHeader />`
Top bar with progress info.
- **Position:** Fixed top, safe-area aware
- **Content:** Path name, XP total, streak
- **Style:** Claymorphic card with blur backdrop

#### `<LessonModal />`
Lesson detail overlay.
- **Trigger:** Tap available node
- **Content:** Node icon (3D), title, XP, type badge, start button
- **Animation:** Scale + fade in from node position

#### `<PathControls />`
Camera and interaction controls.
- **Elements:** Reset camera button, settings gear
- **Position:** Fixed bottom-right corner
- **Style:** Minimal, semi-transparent

---

## 6. Technical Approach

### Stack
- **Framework:** React + React Router
- **3D Engine:** React Three Fiber (R3F) + Drei
- **State:** Zustand for path state, existing `usePets` hook
- **Animation:** R3F useFrame for 3D, Framer Motion for UI
- **Styling:** Tailwind CSS (matching existing codebase)

### File Structure
```
frontend/src/
├── pages/
│   └── LearningPath3D.tsx          # Main page
├── components/
│   ├── learning-path-3d/
│   │   ├── LearningPathScene.tsx   # R3F Canvas wrapper
│   │   ├── ClayPath.tsx            # Path geometry + material
│   │   ├── LessonNode.tsx          # 3D lesson node
│   │   ├── PetGuide.tsx            # Pet walking on path
│   │   ├── Landscape.tsx           # Background environment
│   │   ├── ProgressTrail.tsx       # Golden completed trail
│   │   ├── PathCamera.tsx          # Follow camera logic
│   │   └── LessonModal.tsx         # UI overlay modal
│   └── pets/
│       └── PetViewer3D.tsx         # Existing (reused)
├── hooks/
│   ├── useLearningPath3D.ts        # Path data + state
│   └── usePetOnPath.ts             # Pet position along spline
├── lib/
│   └── pathSpline.ts               # CatmullRom spline utilities
└── types/
    └── learning-path.ts            # TypeScript interfaces
```

### Key Implementation Details

#### Path Spline
- Use `CatmullRomCurve3` from Three.js
- Control points generated from lesson positions
- Pet and camera follow via `getPointAt(t)` where t = progress

#### Pet Animation
- Procedural walk: sine-wave bob, alternating foot squash
- Position interpolation: lerp between path points
- Rotation: face direction of travel (tangent)

#### Performance Targets (iPhone 14 Pro)
- 60 FPS target
- < 50 draw calls
- < 100k triangles total
- LOD for nodes: full detail within 15 units
- Instanced meshes for: trees, flowers, clouds

#### Claymorphic Materials
```typescript
// Standard clay material
const clayMaterial = new MeshStandardMaterial({
  color: '#FFF0D9',        // warm cream
  roughness: 0.75,          // matte, not shiny
  metalness: 0.0,          // no metal
  flatShading: false,       // smooth normals
});

// Glowing node material
const nodeMaterial = new MeshStandardMaterial({
  color: '#5B8DEF',
  emissive: '#5B8DEF',
  emissiveIntensity: 0.3,
  roughness: 0.5,
});
```

### Data Flow
```
User selects learning path
        ↓
Load lessons from API (existing /api/v1/learning-paths)
        ↓
Generate path spline from lesson positions
        ↓
Render scene with PetGuide at current progress
        ↓
User taps node → Lesson Modal → Start lesson
        ↓
Complete lesson → Update state → Animate node to completed
        ↓
Pet walks to next node
```

### Existing Integration
- Reuse `usePets()` hook for active pet data
- Reuse `PetViewer3D` model loading logic
- Use existing API endpoints for lesson data
- Maintain consistent routing with React Router

---

## 7. Milestones

| Phase | Deliverable |
|-------|-------------|
| 1 | Path spline + basic scene setup |
| 2 | Pet walking along path |
| 3 | Lesson nodes (available/completed/locked) |
| 4 | Lesson modal UI |
| 5 | Progress trail + completion animation |
| 6 | Landscape decorations |
| 7 | Polish: particles, sound, haptic feedback |
| 8 | Performance optimization |
| 9 | Integration testing on iPhone 14 Pro |

---

## Appendix A: Duolingo Path Reference

Key visual references from Duolingo:
1. **Path shape:** S-curve winding through landscape
2. **Node style:** Glowing orbs, floating above path
3. **Progress:** Golden trail behind completed lessons
4. **Character:** Owl mascot walks the path
5. **Background:** Layered landscape with depth
6. **Celebration:** Confetti + character dance on lesson complete

Our adaptation: Same structure, claymorphic materials, pet as guide.

---

## Appendix B: Related Files

| File | Purpose |
|------|---------|
| `frontend/src/components/pets/PetViewer3D.tsx` | Existing pet 3D viewer (reused) |
| `frontend/src/hooks/usePets.ts` | Pet state management |
| `frontend/src/pages/LearningPathSetup.tsx` | Path configuration (existing) |
| `frontend/src/components/CourseMap.tsx` | 2D path reference |
| `frontend/src/lib/learningPathTopics.ts` | Topic definitions |
