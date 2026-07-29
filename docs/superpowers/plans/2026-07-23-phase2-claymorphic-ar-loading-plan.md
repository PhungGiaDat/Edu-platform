# Phase 2 — Claymorphic UI + Unity AR Loading Plan

> **Status:** PLANNING — awaiting Product Owner review  
> **Branch:** `feature/mobile-ar-mvp`  
> **Date:** 2026-07-23

---

## 1. Design Read (taste-skill Section 0.B)

> *"Reading this as: education AR flashcard app for children, with a claymorphic/kawaii language, leaning toward EduAR's existing claymorphic design system — warm-white base, oversized radii, 3-layer shadows, playful floating animations, Nunito typeface."*

**Design variance:** `VARIANCE: 7 / MOTION: 7 / DENSITY: 4` — playful, kid-focused, high-fun

---

## 2. Claymorphic Token Specification (Web → React Native)

The web frontend defines claymorphism via 3-layer shadows (drop shadow + ambient shadow + inset highlight). RN has no CSS `inset` box-shadow, so translation requires layered Views.

### 2.A Token Mapping Table

| Token | Web (CSS) | RN equivalent |
|-------|-----------|---------------|
| **Background base** | `#FFFBF0` warm white | `#FFFBF0` |
| **Primary** | `#6EB9FF` | `#6EB9FF` |
| **Secondary** | `#B4E197` | `#B4E197` |
| **Accent/Yellow** | `#FFD93D` | `#FFD93D` |
| **Coral/Pink** | `#FF9F9F` | `#FF9F9F` |
| **Shadow dark** | `rgba(0,0,0,0.12)` | `rgba(0,0,0,0.15)` |
| **Shadow ambient** | `rgba(0,0,0,0.08)` | `rgba(0,0,0,0.10)` |
| **Inset highlight** | `rgba(255,255,255,0.7)` | Linear gradient top → transparent |
| **clay-sm shadow** | `0 4px 0 rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.5)` | Layered View stack (see §2.B) |
| **clay shadow** | `0 8px 0 rgba(0,0,0,0.12), 0 4px 16px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.7)` | Layered View stack |
| **clay-lg shadow** | `0 14px 0 rgba(0,0,0,0.12), 0 8px 24px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.7)` | Layered View stack |
| **clay-btn pressed** | `translateY(3px) + 0 3px 0 shadow` | `translateY(3px)` + shadow offset ÷ 2 |
| **clay-btn hover** | `translateY(-3px) + 0 9px 0 shadow` | `translateY(-3px)` + shadow offset × 1.5 |
| **Border radius xl** | `1rem` | `16` |
| **Border radius 2xl** | `1.5rem` | `24` |
| **Border radius 3xl/4xl** | `2rem` | `32` |
| **Spring transition** | `cubic-bezier(0.34,1.56,0.64,1)` | `withSpring` (React Native Reanimated) |
| **Float animation** | `translateY(-14px) rotate(±2deg)` | Reanimated `withRepeat(withTiming)` |
| **Font** | `Nunito` | Import Nunito via `expo-font` or `@expo-google-fonts/nunito` |

### 2.B Clay Shadow View Stack (RN Implementation)

```tsx
// Layer 1: Colored background
// Layer 2: Bottom drop shadow (View with backgroundColor darker shade, offset -4px)
// Layer 3: Ambient shadow (View behind, blurred lighter)
// Layer 4: Inset highlight (LinearGradient from top: rgba(255,255,255,0.7) → transparent)
```

---

## 3. Claymorphic RN Approach — Best-of-N Comparison *(Updated: RN 0.86 native boxShadow)*

> **Updated by researcher (2026-07-23):** React Native 0.86 ships native `boxShadow` support (since RN 0.76). The `react-native-shadow-2` recommendation is superseded.

### Approach A: Native `boxShadow` + `expo-linear-gradient` *(Recommended)*

- **How:** Use RN's built-in `boxShadow` (2 BoxShadow objects — drop + ambient) on the outer View, and an inner `LinearGradient` from `rgba(255,255,255,0.7)` at top → transparent at 15% height for the inset highlight. Single `expo-linear-gradient` dependency only.
- **Library:** `expo-linear-gradient`
- **Pros:** No shadow library needed; matches web 3-layer token exactly; works on both iOS and Android (RN 0.76+); native performance
- **Cons:** `boxShadow` support on iOS may need testing for the exact inset gradient; Android 10+ required for best results
- **Score:** ⭐⭐⭐⭐⭐

### Approach B: `react-native-shadow-2` + layered gradient Views

- **How:** Install `react-native-shadow-2` for drop shadows. Stack 3 Views: colored bg, shadow View, LinearGradient highlight overlay.
- **Library:** `react-native-shadow-2` + `expo-linear-gradient`
- **Pros:** Proven compatibility; fine-grained shadow control
- **Cons:** Extra dependency; `react-native-shadow-2` may conflict with RN 0.86's native boxShadow
- **Score:** ⭐⭐⭐

### Approach C: Custom `ClayCard` component + absolute-positioned layers

- **How:** Single `ClayCard` component encapsulating all shadow logic. Uses `StyleSheet.absoluteFill` for layering.
- **Pros:** Clean consumer API; easy to update tokens
- **Cons:** Still needs layered Views; shadow layering via offset Views looks different from real box shadows
- **Score:** ⭐⭐⭐

### Approach D: Pre-baked PNG/SVG clay assets

- **How:** Export clay card backgrounds as transparent PNGs with baked shadows/highlights
- **Pros:** Zero runtime shadow computation
- **Cons:** Not scalable; can't respond to theme changes; inflates bundle
- **Score:** ⭐⭐

### Approach E: `@shopify/react-native-skia`

- **How:** Use Skia's `Shadow` blur primitives
- **Cons:** Skia is still in alpha for RN 0.76+; risky for production
- **Score:** ⭐

### Recommendation: **Native `boxShadow` + `expo-linear-gradient`**

Rationale: RN 0.86 (via Expo SDK 57) has native `boxShadow` support. `react-native-neomorph-shadows` is abandoned since 2022. Only `expo-linear-gradient` needs to be added as a dependency. The inset highlight becomes a `LinearGradient` overlay — directly mirroring the web's 3-layer shadow spec.

**New RN dependencies to add:**
```bash
npx expo install expo-linear-gradient
# No shadow library needed — RN 0.86 has native boxShadow
```

---

## 4. AR Mode: Image Tracking *(Not Plane Detection)*

> **Critical clarification from Product Owner (2026-07-23):** The AR mode is **image tracking**, not plane/surface detection. The user scans a **printed physical flashcard** with the camera. ARKit/ARCore tracks that image and anchors a 3D model to it. The flashcard IS the AR target.

### 4.A Old State Machine (Incorrect — Plane Detection)

```
IDLE → AR_INITIALIZING → AR_READY → PLANE_DETECTED → LOADING_MODEL → MODEL_LOADED → AR_INTERACTING
```

### 4.B New State Machine (Correct — Image Tracking)

```
IDLE → [Lesson tap / QR scan]
  ↓
AR_INITIALIZING → [Unity loads, onArReady event]
  ↓
IMAGE_TRACKING_READY → [Camera active, tracking images]
  ↓
IMAGE_DETECTED → [Flashcard image found, onImageDetected]
  ↓
MODEL_SPAWNING → [Model spawns on detected image anchor]
  ↓
MODEL_LOADED → [Model visible, interaction ready]
  ↓
AR_INTERACTING → [Card combo, food feed, gestures]
  ↓
[EXIT / next card] → IDLE
```

### 4.C Key Differences from Plane Detection

| Aspect | Old (Plane Detection) | New (Image Tracking) |
|--------|-----------------------|----------------------|
| AR target | Floor / table surface | Printed flashcard image |
| Unity manager | `ARPlaneManager` | `ARTrackedImageManager` |
| Configuration | `ARWorldTrackingConfiguration` | `ARImageTrackingConfiguration` |
| No surface scan needed | User must scan environment | User points camera at flashcard |
| Model anchor | World coordinates | `trackedImage.transform` (child-of) |
| Multi-target | Harder | Supports 20–100 simultaneous images |

### 4.D Loading Overlay: RN vs Unity vs Hybrid

| Approach | Description | Pros | Cons | Score |
|---------|-------------|------|------|-------|
| **A: RN claymorphic overlay** | RN renders clay-styled loading screen (spinner, progress bar, shimmer) on top of UnityView | Full design control; matches app theme | Must coordinate z-index with Unity view | ⭐⭐⭐⭐ |
| **B: Unity-rendered loading** | Unity renders a loading screen inside its own view | No RN coordination needed | Breaks claymorphic design | ⭐⭐ |
| **C: Hybrid** | RN shows quick "Preparing AR..." state; Unity shows subtle in-scene progress | Best UX — immediate feedback + in-scene progress | Most complex; both sides coordinate | ⭐⭐⭐⭐⭐ |

**Recommendation: Approach C — Hybrid**  
RN shows claymorphic "Preparing AR..." immediately after QR scan. Once `onArReady` fires, ARScreen transitions to AR mode. For cached models, skip progress entirely. For image tracking, the "initializing" phase includes setting up the reference image database — no surface scanning needed.

### 4.E GLBLoader Progress Events

GLBLoader.cs currently loads silently. Add an `onProgress` event:

```csharp
RNEventEmitter.Instance.SendEvent("onModelProgress", new {
    stage = "download" | "load" | "instantiate",
    progress = 0.0f,  // 0.0–1.0
    message = "Downloading model..."
});
```

---

## 5. Interaction Features During AR_INTERACTING

During `AR_INTERACTING` state, two core interactions are supported simultaneously:

### 5.A Card Combo / Merge System

When 2+ flashcards are scanned simultaneously, their models can combine into a reward model.

**Proximity detection algorithm:**
- Track positions of all `ARTrackedImage` instances
- `float distance = Vector3.Distance(imageA.transform.position, imageB.transform.position)`
- Proximity threshold: **0.5 world units** (≈ 50cm in AR) — configurable per combo
- When distance < threshold AND both images tracked for > 1 second → trigger combo

**Combo state flow:**
```
MODEL_LOADED (Card A)
MODEL_LOADED (Card B)
[Proximity detected] → COMBO_TRIGGERED
[Combo animation plays] → COMBO_COMPLETE
[Reward model spawns] → MODEL_SPAWNING → MODEL_LOADED
[XP awarded] → onComboComplete event to RN
```

**Combo data model:**
- Combo definitions as a lookup table: `{ cardIdA, cardIdB, rewardCardId, xpReward }`
- For MVP: simple pairs table in Unity (e.g., `chicken + egg → baby_chicken`)
- Post-DB-migration: stored in Supabase `combos` table
- Combo can be auto-triggered (proximity) or tap-triggered (COMBO button in RN overlay)

**Combo animation:**
- Both models fly to scene midpoint over 0.8s (ease-in-out)
- Particle burst / flash effect at midpoint
- Reward model scales from 0 → 1 over 0.4s with bounce
- Claymorphic: reward model uses clay shader (soft rim light, muted colors)

### 5.B Food Feed Animation

Food flashcards produce 3D food models that can be "fed" to a virtual pet character.

**Pet character:**
- Simple clay-styled sphere with googly eyes (placeholder for full pet system)
- Position: fixed in scene, offset from flashcard detection area
- States: `idle`, `anticipating` (food nearby), `eating` (chomp animation), `satisfied` (heart popup)

**Food interaction:**
- Food model spawns on flashcard (same as normal card)
- User drags food model toward pet using Unity touch: `IDragHandler` on food GameObject
- Movement constrained to XZ plane (AR tracked surface)
- When food model center enters pet proximity radius (0.3 world units) → trigger feed

**Feed animation sequence:**
1. Food model lerps to pet position (0.3s)
2. Food model scales to 0 (0.15s)
3. Pet plays "chomp" animation (0.3s)
4. Claymorphic XP popup floats up from pet (0.8s, fades out)
5. XP event `onFoodFed` sent to RN with `{ xpAwarded, streakCount }`
6. Pet returns to `idle` state

**Claymorphic 3D:**
- Simple approach: use `MeshRenderer` with `Material.color` set to food color, plus a soft rim-light shader
- Rim-light shader: `o.Rim = pow(1.0 - dot(Normalize(ViewDir), worldNormal), 3.0)` tinted warm white
- Alternative: bake clay material into the GLB model itself (post-DB migration, model pipeline)

### 5.C New Unity → RN Events for Interactions

| Event | When fires | Payload |
|-------|-----------|---------|
| `onImageDetected` | Tracked image first found | `{ imageId: string, transform: { x, y, z } }` |
| `onImageTrackingLost` | Tracking state → lost | `{ imageId: string }` |
| `onMultiImageDetected` | 2+ images tracked simultaneously | `{ imageIds: string[], count: number }` |
| `onProximityNear` | Two images approaching combo threshold | `{ imageIdA, imageIdB, distance: number }` |
| `onComboTriggered` | Combo threshold met | `{ cardIdA, cardIdB, comboId: string }` |
| `onComboComplete` | Combo animation done, reward spawned | `{ rewardCardId: string, xpAwarded: number }` |
| `onFoodDragging` | Food model picked up by user | `{ foodModelId: string }` |
| `onFoodFed` | Food eaten by pet | `{ foodModelId: string, xpAwarded: number, streakCount: number }` |
| `onPetStateChanged` | Pet animation state changed | `{ state: 'idle' | 'anticipating' | 'eating' | 'satisfied' }` |

### 5.D RN State Changes for Multi-Card Interactions

Current ARScreen tracks 1 model at a time. Needs multi-card tracking:

```tsx
// New state shape in useARSession
interface TrackedImage {
  imageId: string;
  modelId: string;
  transform: Vector3;
  trackingState: 'found' | 'updated' | 'lost';
}

interface ARSessionState {
  primaryState: 'IDLE' | 'AR_INITIALIZING' | 'IMAGE_TRACKING_READY' | ...;
  trackedImages: Map<string, TrackedImage>;  // supports multi-card
  activeCombos: string[];                    // combo IDs in progress
  petState: 'idle' | 'anticipating' | 'eating' | 'satisfied';
  currentStreak: number;
}
```

**RN overlay additions during AR_INTERACTING:**
- COMBO button: shown when `trackedImages.size >= 2`; triggers combo attempt
- Pet status indicator: shown near pet character (mobile screen corner)
- Streak counter: shown when `currentStreak > 0`

---

## 6. Component-by-Component Breakdown (mobile/rn/)

### 6.0 New: `src/design/tokens.ts`

**File:** `mobile/rn/src/design/tokens.ts` (new file)

**Purpose:** Single source of truth for all claymorphic design tokens.

**Step-by-step:**
1. Create `src/design/` directory
2. Export `COLORS`, `SHADOWS`, `RADIUS`, `ANIMATION` constants
3. Add RN 0.86 `boxShadow`-compatible shadow definitions
4. Export clay variants (sm/md/lg) as named objects

**Function signatures:**
```typescript
export const COLORS = {
  backgroundBase: '#FFFBF0', // warm white
  primary: '#6EB9FF',
  secondary: '#B4E197',
  accent: '#FFD93D',
  coral: '#FF9F9F',
  shadowDark: 'rgba(0,0,0,0.15)',
  shadowAmbient: 'rgba(0,0,0,0.10)',
  insetHighlight: 'rgba(255,255,255,0.7)',
} as const;

export const SHADOWS = {
  claySm: {
    shadowColor: COLORS.shadowDark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 4,
    // Ambient layer via absolute-positioned View behind
  },
  clayMd: {
    shadowColor: COLORS.shadowDark,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 8,
  },
  clayLg: {
    shadowColor: COLORS.shadowDark,
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 1,
    shadowRadius: 14,
  },
} as const;

export const RADIUS = {
  sm: 12,
  md: 16,
  lg: 24,
  xl: 32,
} as const;

export const ANIMATION = {
  spring: { damping: 15, stiffness: 150 }, // Reanimated withSpring config
  floatY: -14, // translateY offset for float
  shimmerDuration: 1500, // ms
} as const;
```

**Acceptance criteria:**
- [ ] File created at `src/design/tokens.ts`
- [ ] All claymorphic color tokens match Section 2 token mapping
- [ ] Shadow definitions use RN 0.86 `boxShadow` syntax (no `elevation`-only Android fallback in code comments)
- [ ] All components import from this file, never hardcode color/shadow values

**Dependencies:** None — pure design constants
**Estimated effort:** S (1-2 hours)
**Test strategy:** Visual snapshot test of token values; verify shadow objects match ClayCard expected props

### 6.1 New: `src/components/ClayCard.tsx`

**File:** `mobile/rn/src/components/ClayCard.tsx` (new file)

**Purpose:** Reusable claymorphic card using native `boxShadow` (RN 0.86+) + `expo-linear-gradient` top-edge inset highlight.

**Existing patterns to follow:** Follows the component structure already used in `ProgressTracker.tsx` and `UnityView.tsx`.

**Step-by-step:**
1. Import `LinearGradient` from `expo-linear-gradient`
2. Import tokens from `src/design/tokens`
3. Create layered View structure:
   - Layer 0: Colored background container with `boxShadow` (2 BoxShadow values)
   - Layer 1: Absolute-positioned ambient shadow View (darker, offset)
   - Layer 2: `LinearGradient` overlay from `rgba(255,255,255,0.5)` top → transparent at 20% height
4. Support variants: `sm` (RADIUS.sm), `md` (RADIUS.md), `lg` (RADIUS.lg)
5. Support colors: `yellow`, `blue`, `green`, `coral`, `white` (map to COLORS)
6. Support `onPress` with `TouchableOpacity` wrapper
7. Add Reanimated `withSpring` press animation: `translateY(3px)` on press

**Component signature:**
```typescript
interface ClayCardProps {
  variant?: 'sm' | 'md' | 'lg';
  color?: 'yellow' | 'blue' | 'green' | 'coral' | 'white';
  borderRadius?: number; // override
  padding?: number;
  style?: ViewStyle;
  onPress?: () => void;
  children: React.ReactNode;
}

export const ClayCard: React.FC<ClayCardProps> = ({
  variant = 'md',
  color = 'white',
  borderRadius,
  padding = 16,
  style,
  onPress,
  children,
}) => { ... }
```

**Inner layered structure:**
```tsx
// Outer container with boxShadow (drop shadow)
<View style={[styles.container, { borderRadius, ...SHADOWS[`clay${capitalize(variant)}`] }]}>
  {/* Colored background */}
  <View style={[styles.background, { backgroundColor: COLORS[color], borderRadius }]}>
    {/* Ambient shadow layer (absolute positioned, offset) */}
    <View style={[styles.ambientShadow, { backgroundColor: COLORS.shadowAmbient, borderRadius }]} />
    {/* Inset highlight via LinearGradient */}
    <LinearGradient
      colors={['rgba(255,255,255,0.5)', 'transparent']}
      style={styles.highlight}
      start={{ x: 0.5, y: 0 }}
      end={{ x: 0.5, y: 0.2 }}
    />
    {/* Content */}
    <View style={[styles.content, { padding }]}>
      {children}
    </View>
  </View>
</View>
```

**boxShadow implementation (RN 0.86):**
```tsx
// Two BoxShadow values on outer container
const boxShadowStyle: ViewStyle = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 8 },
  shadowOpacity: 0.12,
  shadowRadius: 8,
  elevation: 4, // Android fallback
};
```

**Acceptance criteria:**
- [ ] Card renders with visible claymorphic shadow (drop + ambient layers visible)
- [ ] LinearGradient top-edge highlight visible on all color variants
- [ ] Press animation: `translateY(3px)` with `withSpring` damping
- [ ] Works on iOS and Android (RN 0.86 `boxShadow` + `elevation` fallback)
- [ ] Backward compatible: existing code using `TouchableOpacity` cards still works

**Dependencies:** Task 2 (tokens.ts), `expo-linear-gradient` installation
**Estimated effort:** M (4-6 hours)
**Test strategy:**
- Unit: Snapshot test of ClayCard renders for each variant/color combination
- Integration: Verify ClayCard works inside FlatList (HomeScreen lessons)
- Manual: Physical device visual verification of shadow depth

### 6.2 New: `src/components/ClayButton.tsx`

**File:** `mobile/rn/src/components/ClayButton.tsx` (new file)

**Purpose:** Claymorphic button with animated press/lift states via Reanimated `withSpring`.

**Step-by-step:**
1. Import `LinearGradient` from `expo-linear-gradient`
2. Import tokens from `src/design/tokens`
3. Import `withSpring` from `react-native-reanimated`
4. Create press/lift animation using `useSharedValue` and `useAnimatedStyle`
5. Support sizes: `sm` (min-height 44px touch target), `md` (56px), `lg` (60px)
6. Support colors: `yellow` (#FFD93D), `blue` (#6EB9FF), `green` (#B4E197), `coral` (#FF9F9F)
7. Add disabled state (reduced opacity, no press animation)
8. Add loading state (spinner overlay)

**Component signature:**
```typescript
interface ClayButtonProps {
  variant?: 'sm' | 'md' | 'lg';
  color?: 'yellow' | 'blue' | 'green' | 'coral';
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  children: React.ReactNode;
}

export const ClayButton: React.FC<ClayButtonProps> = ({
  variant = 'md',
  color = 'blue',
  onPress,
  disabled = false,
  loading = false,
  style,
  children,
}) => { ... }
```

**Animation logic:**
```typescript
const pressed = useSharedValue(0);

const animatedStyle = useAnimatedStyle(() => ({
  transform: [
    { translateY: withSpring(pressed.value ? 3 : 0, { damping: 15, stiffness: 200 }) },
    { scale: withSpring(pressed.value ? 0.97 : 1, { damping: 15, stiffness: 200 }) },
  ],
  shadowOffset: {
    height: withSpring(pressed.value ? 4 : (variant === 'sm' ? 4 : variant === 'lg' ? 14 : 8), ANIMATION.spring),
  },
}));

// On press in: pressed.value = 1
// On press out: pressed.value = 0
```

**Acceptance criteria:**
- [ ] Button renders with claymorphic shadow matching color variant
- [ ] Press animation: `translateY(3px)` + shadow offset ÷ 2 + slight scale down
- [ ] Lift animation on `onPressIn`: `translateY(-3px)` + shadow offset × 1.5
- [ ] Touch target ≥ 44px (kids design system — `variant === 'sm'` sets min-height to 44)
- [ ] Loading spinner shown when `loading={true}`, `onPress` disabled
- [ ] Disabled state: `opacity: 0.5`, no animation, no `onPress` response
- [ ] All 12 variant combinations (3 sizes × 4 colors) visually distinct

**Dependencies:** Task 2 (tokens.ts), `expo-linear-gradient` installation
**Estimated effort:** M (4-6 hours)
**Test strategy:**
- Unit: Snapshot tests for each variant × color combination
- Unit: Verify press/release callbacks fire correctly
- Integration: Replace existing `TouchableOpacity` buttons in HomeScreen

### 6.3 New: `src/components/ClayProgressBar.tsx`

**File:** `mobile/rn/src/components/ClayProgressBar.tsx` (new file)

**Purpose:** Claymorphic progress bar with animated fill and shimmer effect.

**Step-by-step:**
1. Import `LinearGradient` from `expo-linear-gradient`
2. Import tokens from `src/design/tokens`
3. Import `useAnimatedStyle`, `withTiming`, `Easing`, `useSharedValue` from `react-native-reanimated`
4. Animate `width` of fill bar using `withTiming` with claymorphic easing
5. Add shimmer overlay: second `LinearGradient` that animates left→right continuously
6. Support custom fill color (default: `COLORS.primary` = `#6EB9FF`)

**Component signature:**
```typescript
interface ClayProgressBarProps {
  progress: number; // 0.0 – 1.0
  fillColor?: string; // default: COLORS.primary
  trackColor?: string; // default: rgba(0,0,0,0.1)
  height?: number; // default: 12
  borderRadius?: number; // default: RADIUS.sm (12)
  showShimmer?: boolean; // default: true
  style?: ViewStyle;
}
```

**Acceptance criteria:**
- [ ] Fill width animates from 0 to `progress` with `withTiming` (300ms)
- [ ] Shimmer overlay animates continuously when `showShimmer={true}`
- [ ] Clamps `progress` to [0, 1] range
- [ ] Claymorphic container: `boxShadow` + rounded corners
- [ ] When `progress === 1.0`, shimmer stops and bar pulses once

**Dependencies:** Task 2 (tokens.ts), `expo-linear-gradient` installation
**Estimated effort:** S (2-3 hours)
**Test strategy:**
- Unit: Test that `progress > 1` clamps to 1.0
- Unit: Test shimmer stops at `progress === 1.0`
- Integration: Replace existing progress fill in ProgressTracker

### 6.4 New: `src/components/ARLoadingOverlay.tsx`

**File:** `mobile/rn/src/components/ARLoadingOverlay.tsx` (new file)

**Purpose:** Full-screen claymorphic overlay shown during AR initialization and model loading. Hybrid approach: RN shows immediately, Unity shows subtle in-scene progress.

**Step-by-step:**
1. Import `ClayCard`, `ClayProgressBar`, `ClayButton` components
2. Import `ActivityIndicator` for fallback (not claymorphic spinner)
3. Define overlay states: `'initializing' | 'loading_model' | 'error' | 'cached'`
4. For `'initializing'`: show "Preparing AR..." + spinner + progress bar at 0%
5. For `'loading_model'`: show model name + progress bar + stage text
6. For `'cached'`: show "Ready!" + quick fade-out transition (2s auto-dismiss)
7. For `'error'`: show error message + claymorphic "Retry" button
8. Semi-transparent backdrop: `rgba(0,0,0,0.4)`

**Component signature:**
```typescript
interface ARLoadingOverlayProps {
  state: 'initializing' | 'loading_model' | 'error' | 'cached';
  progress?: number; // 0.0 – 1.0 (for loading_model)
  stage?: 'download' | 'load' | 'instantiate'; // for loading_model
  modelName?: string;
  errorMessage?: string;
  onRetry?: () => void;
  onDismiss?: () => void; // for cached state
}
```

**Layout:**
```
┌──────────────────────────────────────┐
│          [dark backdrop]               │
│                                       │
│    ┌──────────────────────────────┐    │
│    │  [clay card]                │    │
│    │                             │    │
│    │    [icon: spinner/card/❌]  │    │
│    │                             │    │
│    │    [stage label]            │    │
│    │    [ClayProgressBar]        │    │
│    │    [model name]             │    │
│    │                             │    │
│    │    [Retry button] (error)   │    │
│    │                             │    │
│    └──────────────────────────────┘    │
│                                       │
└──────────────────────────────────────┘
```

**Acceptance criteria:**
- [ ] Overlay appears immediately when `state !== 'cached'`
- [ ] Progress bar shows real progress from `onModelProgress` events
- [ ] Stage label updates: "Downloading..." → "Loading model..." → "Placing..."
- [ ] Error state shows retry button that calls `onRetry()`
- [ ] Cached state auto-dismisses after 2s (or calls `onDismiss`)
- [ ] Claymorphic card in center of screen, backdrop covers all
- [ ] Works with RN navigation header hidden (`headerShown: false`)

**Dependencies:** Tasks 3, 4 (ClayCard, ClayProgressBar, ClayButton)
**Estimated effort:** M (4 hours)
**Test strategy:**
- Unit: Snapshot test for each state (initializing, loading_model, error, cached)
- Integration: Verify overlay displays when ARScreen enters AR_INITIALIZING state
- Manual: Verify backdrop covers UnityView completely on both iOS/Android

### 6.5 New: `src/hooks/useARSession.ts`

**File:** `mobile/rn/src/hooks/useARSession.ts` (new file)

**Purpose:** Central hook managing the image-tracking AR state machine, Unity bridge subscriptions, and multi-card tracking state.

**Step-by-step:**
1. Define `ARState` enum matching the image-tracking state machine
2. Define `TrackedImage` interface for multi-card tracking
3. Set up Unity bridge subscriptions for all events (all `onImage*`, `onCombo*`, `onFood*`, `onPet*` events)
4. Implement state transitions based on Unity events
5. Expose imperative actions: `startSession`, `stopSession`, `triggerCombo`, `feedPet`, `retry`
6. Handle error states and timeouts per state

**Type definitions:**
```typescript
export type ARState =
  | 'IDLE'
  | 'AR_INITIALIZING'
  | 'IMAGE_TRACKING_READY'
  | 'IMAGE_DETECTED'
  | 'MODEL_SPAWNING'
  | 'MODEL_LOADED'
  | 'AR_INTERACTING'
  | 'AR_ERROR';

export interface TrackedImage {
  imageId: string;
  imageName: string;
  modelId: string;
  transform: { x: number; y: number; z: number };
  trackingState: 'found' | 'updated' | 'lost';
  detectedAt: number; // timestamp ms
}

export interface ARSessionState {
  arState: ARState;
  trackedImages: Map<string, TrackedImage>; // keyed by imageId
  activeCombos: string[]; // combo IDs in progress
  petState: 'idle' | 'anticipating' | 'eating' | 'satisfied';
  currentStreak: number;
  error: string | null;
  progress: number; // 0.0 – 1.0
  progressStage: 'download' | 'load' | 'instantiate' | null;
}
```

**Hook signature:**
```typescript
export const useARSession = (lessonId: string, payload: UnityARExperiencePayload) => {
  const [state, setState] = useState<ARSessionState>({
    arState: 'IDLE',
    trackedImages: new Map(),
    activeCombos: [],
    petState: 'idle',
    currentStreak: 0,
    error: null,
    progress: 0,
    progressStage: null,
  });

  // Unity bridge subscriptions — set up in useEffect
  // State transition logic per Unity event
  // Imperative actions exposed via returned object

  return {
    arState: state.arState,
    trackedImages: state.trackedImages,
    petState: state.petState,
    currentStreak: state.currentStreak,
    error: state.error,
    progress: state.progress,
    progressStage: state.progressStage,
    canCombo: state.trackedImages.size >= 2,
    startSession: () => void,
    stopSession: () => void,
    triggerCombo: () => Promise<void>,
    feedPet: (foodModelId: string) => void,
    retry: () => void,
  };
};
```

**State transitions triggered by Unity events:**
```
Unity event          → AR state transition
─────────────────────────────────────────────────────
onArReady           → IDLE → IMAGE_TRACKING_READY
onImageDetected     → IMAGE_TRACKING_READY → IMAGE_DETECTED
onModelProgress     → IMAGE_DETECTED → MODEL_SPAWNING (progress updates)
onObjectPlaced      → MODEL_SPAWNING → MODEL_LOADED
onMultiImageDetected→ MODEL_LOADED → AR_INTERACTING (if 2+ images)
onImageTrackingLost → any → IMAGE_TRACKING_READY (graceful fallback)
onComboComplete     → AR_INTERACTING (streak update)
onFoodFed           → AR_INTERACTING (streak update)
onError            → any → AR_ERROR
```

**Acceptance criteria:**
- [ ] All 14 Unity→RN events are subscribed on mount, unsubscribed on unmount
- [ ] State transitions are deterministic and match the state machine
- [ ] `trackedImages.size >= 2` correctly enables combo UI
- [ ] `startSession` calls `unityBridge.startARSession()` and sets `AR_INITIALIZING`
- [ ] `retry` resets error state and calls `startSession()`
- [ ] No memory leaks: all subscriptions removed on unmount

**Dependencies:** Task 5 (Unity bridge updated), Task 4 (Unity events emitted)
**Estimated effort:** L (6-8 hours)
**Test strategy:**
- Unit: Mock Unity events, verify state transitions
- Unit: Verify trackedImages Map updates correctly on onImageDetected/lost
- Integration: Full flow test with real Unity bridge (device testing)

### 6.6 Modify: `src/screens/ARScreen.tsx`

**File:** `mobile/rn/src/screens/ARScreen.tsx` (modify existing)

**Existing code:** Lines 1-207. Currently has placeholder UI (`#1a1a1a` dark background, `TouchableOpacity` button, `ActivityIndicator`). Replace with claymorphic AR experience.

**Step-by-step:**
1. Add `useARSession` import
2. Replace `useState` for `loading/error/placeholder` with `useARSession` hook
3. Add `UnityView` (real integration — replaces placeholder emoji `🎮`)
4. Add `ARLoadingOverlay` for `AR_INITIALIZING` / `MODEL_SPAWNING` states
5. Add `ComboOverlay` for `AR_INTERACTING` when `canCombo === true`
6. Add `PetStatusOverlay` for `AR_INTERACTING` when pet is active
7. Replace all inline styles with claymorphic components
8. Update navigation header to claymorphic style (or hide it)
9. Replace `#1a1a1a` background with claymorphic `#FFFBF0` base
10. Subscribe to `onImageDetected`, `onImageTrackingLost`, `onComboComplete`, `onFoodFed`, `onPetStateChanged`

**New imports:**
```typescript
import { ARLoadingOverlay } from '../components/ARLoadingOverlay';
import { ComboOverlay } from '../components/ComboOverlay';
import { PetStatusOverlay } from '../components/PetStatusOverlay';
import { useARSession } from '../hooks/useARSession';
import { mapToUnityPayload } from '../bridge/ARExperienceMapper';
```

**New render logic:**
```typescript
export const ARScreen: React.FC<ARScreenProps> = ({ navigation, route }) => {
  const { lessonId, lessonTitle } = route.params;
  const { arState, canCombo, progress, progressStage, error, retry } = useARSession(lessonId, payload);

  // Fetch payload and start session
  useEffect(() => {
    flashcardApi.getFlashcard(lessonId).then(response => {
      const payload = mapToUnityPayload(response.data);
      // useARSession handles session start
    });
  }, [lessonId]);

  return (
    <View style={styles.container}>
      {/* Unity camera view — full screen */}
      <UnityView
        style={styles.unityView}
        onUnityEvent={handleUnityEvent}
      />

      {/* Claymorphic loading overlay */}
      {(arState === 'AR_INITIALIZING' || arState === 'MODEL_SPAWNING') && (
        <ARLoadingOverlay
          state={arState === 'AR_INITIALIZING' ? 'initializing' : 'loading_model'}
          progress={progress}
          stage={progressStage}
        />
      )}

      {/* Claymorphic error overlay */}
      {arState === 'AR_ERROR' && (
        <ARLoadingOverlay
          state="error"
          errorMessage={error ?? 'AR session failed'}
          onRetry={retry}
        />
      )}

      {/* Combo UI — shown when 2+ cards tracked */}
      {arState === 'AR_INTERACTING' && canCombo && (
        <ComboOverlay onComboTrigger={triggerCombo} />
      )}

      {/* Pet status — shown during AR_INTERACTING */}
      {arState === 'AR_INTERACTING' && <PetStatusOverlay />}

      {/* Exit button — always visible */}
      <TouchableOpacity style={styles.exitButton} onPress={() => navigation.goBack()}>
        <Text style={styles.exitText}>✕</Text>
      </TouchableOpacity>
    </View>
  );
};
```

**New styles:**
```typescript
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.backgroundBase, // '#FFFBF0'
  },
  unityView: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
  },
  exitButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    width: 44, height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  exitText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
});
```

**Acceptance criteria:**
- [ ] Full state machine implemented: IDLE → AR_INITIALIZING → IMAGE_TRACKING_READY → IMAGE_DETECTED → MODEL_SPAWNING → MODEL_LOADED → AR_INTERACTING
- [ ] `UnityView` renders full-screen camera feed
- [ ] `ARLoadingOverlay` shown during `AR_INITIALIZING` and `MODEL_SPAWNING`
- [ ] `ComboOverlay` shown when 2+ cards tracked in `AR_INTERACTING`
- [ ] `PetStatusOverlay` shown during `AR_INTERACTING`
- [ ] Claymorphic background (`#FFFBF0`) replaces dark `#1a1a1a`
- [ ] All 14 Unity events wired up correctly
- [ ] Error recovery: `AR_ERROR` state shows retry option
- [ ] Graceful tracking loss: `IMAGE_TRACKING_LOST` returns to `IMAGE_TRACKING_READY`

**Dependencies:** Tasks 4, 5, 6.3, 6.4, 6.5, 6.6 (all components must exist first)
**Estimated effort:** L (8-10 hours)
**Test strategy:**
- Unit: Mock `useARSession`, verify correct overlay renders per state
- Integration: End-to-end flow with real Unity bridge on device
- Manual: Verify camera feed visible, overlays appear/disappear correctly on physical device

### 6.7 Modify: `src/components/UnityView.tsx`

**File:** `mobile/rn/src/components/UnityView.tsx` (modify existing)

**Existing code:** Lines 1-60. Currently renders placeholder emoji `🎮` with static text. Replace with real Unity AR view via native module.

**Step-by-step:**
1. Add `onUnityEvent` callback prop (receives all Unity bridge events)
2. Add `fullscreen` prop for AR screen (always true in Phase 2)
3. Replace placeholder `View` with `React.NativeModules.UnityView` or custom native view
4. For Phase 2 shell: wrap in a container that forwards `onUnityEvent` to the bridge subscriber
5. Add `onLayout` to handle safe area / notch correctly
6. Pass through style for positioning

**Updated component signature:**
```typescript
interface UnityViewProps {
  style?: ViewStyle;
  fullscreen?: boolean; // default: true
  onUnityEvent?: (event: ARMessage) => void;
  onModelLoaded?: () => void;
  onError?: (error: string) => void;
}

export const UnityView: React.FC<UnityViewProps> = ({
  style,
  fullscreen = true,
  onUnityEvent,
  onModelLoaded,
  onError,
}) => {
  // Subscribe to Unity events via unityBridge
  // Forward events to onUnityEvent callback
  // ...
}
```

**Acceptance criteria:**
- [ ] Component renders full-screen camera view (not placeholder)
- [ ] `onUnityEvent` callback fires for all subscribed Unity events
- [ ] `onModelLoaded` fires when Unity emits `onObjectPlaced`
- [ ] `onError` fires when Unity emits `onError`
- [ ] Handles safe area correctly on iPhone with notch
- [ ] Falls back to placeholder gracefully if Unity bridge unavailable (development mode)

**Dependencies:** Task 4 (Unity bridge integration)
**Estimated effort:** M (4-5 hours)
**Test strategy:**
- Integration: Real Unity view on device vs placeholder in development
- Manual: Verify camera feed renders, safe areas respected

### 6.8 Modify: `src/components/ProgressTracker.tsx`

**File:** `mobile/rn/src/components/ProgressTracker.tsx` (modify existing)

**Existing code:** Lines 1-83. Currently has basic progress bar with no claymorphic styling. Apply claymorphic restyle.

**Step-by-step:**
1. Replace `ProgressFill` background with `ClayProgressBar` component
2. Wrap entire component in `ClayCard` variant="sm"
3. Update `levelBadge` to use `ClayCard` color variant="accent" (yellow) or `color="yellow"`
4. Update XP text to use claymorphic text styles (softer, Nunito-like)
5. Ensure all dimensions unchanged — just visual claymorphic restyle

**Acceptance criteria:**
- [ ] Progress bar uses `ClayProgressBar` component (with shimmer)
- [ ] Level badge wrapped in claymorphic badge (yellow `ClayCard`)
- [ ] Container uses `ClayCard` wrapper (variant="sm", color="white")
- [ ] Props unchanged — backward compatible with existing callers
- [ ] Progress animation visible: fill animates from 0 to `currentXP/maxXP`

**Dependencies:** Tasks 2, 3, 4 (tokens, ClayCard, ClayProgressBar)
**Estimated effort:** S (2 hours)
**Test strategy:**
- Unit: Verify component still accepts same props (backward compatible)
- Visual: Shimmer animation visible, clay badge renders correctly

### 6.9 Modify: `src/screens/HomeScreen.tsx`

**File:** `mobile/rn/src/screens/HomeScreen.tsx` (modify existing)

**Existing code:** Lines 1-261. Currently uses plain `TouchableOpacity` cards, `#f5f5f5` background. Replace with claymorphic components.

**Step-by-step:**
1. Import `ClayCard`, `ClayButton` components
2. Replace `TouchableOpacity` course cards → `<ClayCard variant="md" color="white" onPress={...}>`
3. Replace `TouchableOpacity` lesson rows → `<ClayCard variant="sm" color="white" onPress={...}>`
4. Replace "Load Demo AR" button → `<ClayButton color="blue" variant="md">`
5. Replace header area with claymorphic styling
6. Update background from `#f5f5f5` → `COLORS.backgroundBase` (`#FFFBF0`)
7. Update `courseCardSelected` border to use claymorphic highlight instead of blue border
8. Ensure all touch targets ≥ 48px (kids design system)

**Acceptance criteria:**
- [ ] All course cards use `ClayCard` component
- [ ] All lesson rows use `ClayCard` variant="sm"
- [ ] "Load Demo AR" button uses `ClayButton`
- [ ] Background matches claymorphic base (`#FFFBF0`)
- [ ] Selected state uses claymorphic highlight (shadow increase) instead of blue border
- [ ] All touch targets ≥ 48px
- [ ] Props unchanged for `fetchCourses`, `fetchLessons`, `handleCoursePress`, `handleLessonPress`

**Dependencies:** Tasks 3, 4 (ClayCard, ClayButton)
**Estimated effort:** M (4-5 hours)
**Test strategy:**
- Integration: Verify course cards expand/collapse correctly
- Visual: Claymorphic cards visible on iOS and Android
- Manual: Touch targets feel comfortable for children (minimum 48px)

### 6.10 New: `src/components/ComboOverlay.tsx`

**File:** `mobile/rn/src/components/ComboOverlay.tsx` (new file)

**Purpose:** Shown during `AR_INTERACTING` when 2+ flashcards are tracked. Triggers combo attempt.

**Step-by-step:**
1. Import `ClayButton`, `ClayCard` from design components
2. Accept `onComboTrigger` callback prop
3. Show combo hint text (which combos are available)
4. Render large "COMBO!" claymorphic button
5. Position in lower portion of screen (doesn't obstruct AR camera)
6. Add floating animation to combo button (Reanimated `withRepeat`)

**Component signature:**
```typescript
interface ComboOverlayProps {
  availableCombos?: Array<{ cardA: string; cardB: string; reward: string }>;
  onComboTrigger: () => Promise<void>;
}
```

**Acceptance criteria:**
- [ ] Button visible only when `trackedImages.size >= 2`
- [ ] "COMBO!" button uses `ClayButton` variant="lg" color="yellow"
- [ ] Button floats with subtle `withRepeat(withTiming)` animation
- [ ] `onComboTrigger` called when button pressed
- [ ] Positioned in bottom portion of screen (safe for children reaching)

**Dependencies:** Tasks 3, 4 (ClayButton), Task 6.5 (useARSession)
**Estimated effort:** S (2-3 hours)
**Test strategy:**
- Unit: Verify button hidden when 1 card tracked, shown when 2+ tracked
- Integration: `triggerCombo` called correctly on press

### 6.11 New: `src/components/PetStatusOverlay.tsx`

**File:** `mobile/rn/src/components/PetStatusOverlay.tsx` (new file)

**Purpose:** Small claymorphic indicator showing pet state, positioned in screen corner.

**Step-by-step:**
1. Import `ClayCard`, `Text` components
2. Accept `petState` prop: `'idle' | 'anticipating' | 'eating' | 'satisfied'`
3. Position in top-right corner of screen (does not obstruct AR view)
4. Render emoji/icon based on pet state:
   - `idle`: neutral face (🤖)
   - `anticipating`: excited face (😆)
   - `eating`: chomping (😋)
   - `satisfied`: hearts (💖)
5. Show streak counter when `currentStreak > 0`
6. Claymorphic badge styling

**Component signature:**
```typescript
interface PetStatusOverlayProps {
  petState: 'idle' | 'anticipating' | 'eating' | 'satisfied';
  currentStreak?: number;
}
```

**Acceptance criteria:**
- [ ] Shows correct emoji per petState
- [ ] Streak counter appears when `currentStreak > 0`
- [ ] Positioned in top-right corner, does not overlap AR view
- [ ] Claymorphic badge styling matches design system
- [ ] Animates between states with `withSpring`

**Dependencies:** Task 3 (ClayCard), Task 6.5 (useARSession)
**Estimated effort:** S (2 hours)
**Test strategy:**
- Unit: Verify correct emoji shown per state
- Visual: Positioned correctly on different screen sizes

---

## 7. Unity-Side Changes (mobile/unity/)

## 7. Unity-Side Changes (mobile/unity/Assets/)

### 7.1 Modify: `Assets/Models/GLBLoader.cs`

**File:** `mobile/unity/Assets/Models/GLBLoader.cs` (modify existing)

**Existing code:** Lines 1-147. Currently loads silently. Add progress event emissions.

**Step-by-step:**
1. Add `RNEventEmitter` instance field for event emissions
2. Add progress callback registration (or inline emissions)
3. Emit `onModelProgress` events at key stages:
   - Stage `"download"`: progress 0.0 on start, 0.4 at download start
   - Stage `"load"`: progress 0.5 on GLTFast Load start, 0.8 on InstantiateMainSceneAsync start
   - Stage `"instantiate"`: progress 0.95 when InstantiateMainSceneAsync completes
   - progress 1.0 + emit `onCacheHit` when `GetCachedPath` returns existing file
4. Emit `onModelLoaded` after successful instantiation (progress 1.0)
5. Clean up `GetCachedPath` async warning — use synchronous `File.Exists` (already sync)
6. Add `onCacheHit` event when model found in `Application.temporaryCachePath/GLBCache/`

**New event emissions:**
```csharp
// At download start
RNEventEmitter.Instance.SendEvent("onModelProgress", new {
    stage = "download",
    progress = 0.0f,
    message = "Starting download..."
});

// Progress during download (every ~25%)
RNEventEmitter.Instance.SendEvent("onModelProgress", new {
    stage = "download",
    progress = 0.25f,
    message = "Downloading..."
});

// Cache hit — skip download
RNEventEmitter.Instance.SendEvent("onCacheHit", new {
    modelUrl = url,
    cachedPath = localFile
});
RNEventEmitter.Instance.SendEvent("onModelProgress", new {
    stage = "download",
    progress = 1.0f,
    message = "Using cached model"
});

// On successful load
RNEventEmitter.Instance.SendEvent("onModelLoaded", new {
    modelUrl = url,
    modelName = Path.GetFileNameWithoutExtension(url)
});
```

**Acceptance criteria:**
- [ ] `onModelProgress` events fire at download, load, and instantiate stages
- [ ] `progress` value increases monotonically from 0.0 to 1.0
- [ ] `onCacheHit` fires when cached model is used (skips download progress)
- [ ] `onModelLoaded` fires after successful instantiation
- [ ] No breaking changes to existing `LoadGLB` public API
- [ ] Async cancellation still works correctly with new event emissions

**Dependencies:** Task 4 (RNEventEmitter exists)
**Estimated effort:** S (2-3 hours)
**Test strategy:**
- Unit: Verify event payloads match expected schema
- Integration: Monitor events on RN side during model load

### 7.2 Modify: `Assets/AR/ARSessionManager.cs`

**File:** `mobile/unity/Assets/AR/ARSessionManager.cs` (modify existing)

**Existing code:** Lines 1-121. Currently manages ARKit session for plane detection. Switch to image tracking.

**Step-by-step:**
1. Add `ARTrackedImageManager` reference field
2. Add `ARReferenceImageLibrary` reference (pre-bundled reference images)
3. Add `OnImageDetected` event (for ARExperienceHandler)
4. Switch `InitSession` to create `ARImageTrackingConfiguration` instead of default AR session
5. Add `SetReferenceImages` method to configure reference image library at runtime
6. Wire `ARTrackedImageManager.trackedImagesChanged` → handle image added/updated/removed
7. Emit `onImageDetected` / `onImageTrackingLost` via `RNEventEmitter`
8. Emit `onArReady` when `ARSessionState.Ready` fires (already exists, keep)
9. For MVP: load pre-bundled images from `StreamingAssets/ARResources/`

**New Unity event emissions:**
```csharp
// When tracked image first detected
RNEventEmitter.Instance.SendEvent("onImageDetected", new {
    imageId = trackedImage.referenceImage.name,
    imageName = trackedImage.referenceImage.name,
    transform = new {
        x = trackedImage.transform.position.x,
        y = trackedImage.transform.position.y,
        z = trackedImage.transform.position.z
    }
});

// When tracking lost
RNEventEmitter.Instance.SendEvent("onImageTrackingLost", new {
    imageId = trackedImage.referenceImage.name
});

// When 2+ images tracked simultaneously
RNEventEmitter.Instance.SendEvent("onMultiImageDetected", new {
    imageIds = trackedImages.Select(t => t.referenceImage.name).ToArray(),
    count = trackedImages.Count
});
```

**Modified InitSession:**
```csharp
public void InitImageTrackingSession(ARReferenceImageLibrary library) {
    var config = new ARImageTrackingConfiguration {
        ReferenceImageLibrary = library,
        MaximumNumberOfTrackedImages = 2, // MVP: 2 images max
        EnableAutoFocus = true,
    };
    _session.Run(config);
}
```

**Acceptance criteria:**
- [ ] `ARImageTrackingConfiguration` created with reference image library
- [ ] `onImageDetected` fires when a reference image is first tracked
- [ ] `onImageTrackingLost` fires when tracking state changes to limited/stopped
- [ ] `onMultiImageDetected` fires when ≥ 2 images tracked simultaneously
- [ ] `onArReady` fires when session is ready (existing behavior preserved)
- [ ] Graceful fallback: if image tracking unavailable, log warning and attempt plane detection
- [ ] Physical size hints configured per reference image (from DB or hardcoded MVP)

**Dependencies:** Task 4 (RNEventEmitter exists), Q8 (reference images)
**Estimated effort:** M (4-5 hours)
**Test strategy:**
- Unit: Verify ARTrackedImageManager events fire correctly in test scene
- Integration: Physical device testing with real printed flashcards
- Manual: Print test flashcard images, verify tracking on iOS/Android

### 7.3 Modify: `Assets/AR/ARExperienceHandler.cs`

**File:** `mobile/unity/Assets/AR/ARExperienceHandler.cs` (modify existing)

**Existing code:** Lines 1-216. Currently uses plane detection flow. Replace with image tracking flow.

**Step-by-step:**
1. Replace `planeDetection.OnPlaneDetected` subscription with `ARTrackedImageManager.trackedImagesChanged`
2. Update `LoadARExperience` to load reference image library before starting session
3. Remove `HandlePlaneDetected` — replace with `HandleImageDetected`
4. Remove `HandleScreenTap` — image tracking doesn't require tap-to-place
5. Update `SpawnAndAnimate` signature to accept image transform instead of tap position
6. Wire `onModelProgress` from GLBLoader to RN bridge
7. Hook up new combo/food events to `RNEventEmitter`
8. Add `LoadReferenceImages` method for loading from `StreamingAssets/ARResources/`
9. Add `StartImageTracking` method called by `RNMessageReceiver`
10. Remove or deprecate `SetPlaneDetection` method (no longer plane-based)
11. Handle `OnDestroy` cleanup for new subscriptions

**New image tracking flow:**
```csharp
public void LoadARExperience(string json) {
    try {
        _currentPayload = ARPayloadMapper.Parse(json);
        // Load reference images for this lesson
        LoadReferenceImages(_currentPayload.Value.QrId);
        // Start AR session with image tracking
        sessionManager?.InitImageTrackingSession(_referenceImageLibrary);
    } catch (Exception ex) {
        RNEventEmitter.Instance.SendEvent("onError", new {
            code = "SESSION_FAILED",
            message = $"LoadARExperience failed: {ex.Message}"
        });
    }
}

private void HandleImageDetected(ARTrackedImage trackedImage) {
    if (_currentPayload == null) return;

    var imageName = trackedImage.referenceImage.name;
    if (!_trackedImages.ContainsKey(imageName)) {
        _trackedImages[imageName] = trackedImage;

        // Emit to RN
        RNEventEmitter.Instance.SendEvent("onImageDetected", new {
            imageId = imageName,
            imageName = imageName,
            transform = new {
                x = trackedImage.transform.position.x,
                y = trackedImage.transform.position.y,
                z = trackedImage.transform.position.z
            }
        });

        // Check for multi-image
        if (_trackedImages.Count >= 2) {
            RNEventEmitter.Instance.SendEvent("onMultiImageDetected", new {
                imageIds = _trackedImages.Keys.ToArray(),
                count = _trackedImages.Count
            });
        }

        // Spawn model at tracked image position
        SpawnModelAtImage(trackedImage);
    }
}

private async Task SpawnModelAtImage(ARTrackedImage trackedImage) {
    if (_currentPayload == null) return;
    var payload = _currentPayload.Value;

    var modelPrefab = await glbLoader.LoadGLB(payload.ModelUrl);
    if (modelPrefab == null) return;

    // Parent model to tracked image transform
    var spawned = modelSpawner.SpawnOnTrackedImage(
        modelPrefab,
        trackedImage.transform,
        payload.Rotation,
        payload.Scale
    );
}
```

**Acceptance criteria:**
- [ ] `LoadARExperience` triggers image tracking session (not plane detection)
- [ ] `onImageDetected` fires for each new tracked image
- [ ] Model spawns as child of tracked image transform (not world position)
- [ ] `onMultiImageDetected` fires when 2+ images tracked
- [ ] `onObjectPlaced` fires after model spawn (existing behavior preserved)
- [ ] `planeDetection.OnPlaneDetected` subscription removed
- [ ] `HandleScreenTap` removed (not needed for image tracking)
- [ ] `onModelProgress` from GLBLoader connected to RN bridge

**Dependencies:** Tasks 7.1, 7.2 (GLBLoader events, ARSessionManager image tracking)
**Estimated effort:** L (6-8 hours)
**Test strategy:**
- Unit: Verify image tracking flow in test scene
- Integration: Real device test with physical flashcard images

### 7.4 Modify: `Assets/Bridge/RNEventEmitter.cs`

**File:** `mobile/unity/Assets/Bridge/RNEventEmitter.cs` (modify existing)

**Existing code:** Lines 1-74. Currently guarded by `#if UNITY_IOS` only. Add Android support.

**Step-by-step:**
1. Add `#elif UNITY_ANDROID` block for Android event forwarding
2. On Android: use `UnityPlayer.UnitySendMessage()` via JNI to forward events to RN native module
3. Verify the existing RN native module can receive messages on both iOS and Android
4. Add fallback logging for unsupported platforms (Editor, WebGL)
5. Consider adding `SendEventAsync` variant for high-frequency events (e.g., food dragging)

**Modified code:**
```csharp
public void SendEvent(string eventName, object payload) {
    try {
        string json = JsonUtility.ToJson(payload);
        string message = $"{eventName}|{json}";
        UnityEngine.Debug.Log($"[RNEventEmitter] Sending: {eventName}");

#if UNITY_IOS
        UnitySendMessage(TARGET_OBJECT, METHOD_NAME, message);
#elif UNITY_ANDROID
        // Android: forward to UnityBridgeModule in RN
        using (var javaClass = new AndroidJavaClass("com.unity3d.player.UnityPlayer")) {
            using (var activity = javaClass.GetStatic<AndroidJavaObject>("currentActivity")) {
                activity.Call("runOnUiThread", new AndroidJavaRunnable(() => {
                    // Find and call the UnityBridgeModule
                    UnityPlayer.UnitySendMessage("RNMessageReceiver", "OnNativeEvent", message);
                }));
            }
        }
#else
        UnityEngine.Debug.LogWarning($"[RNEventEmitter] Platform not supported: {Application.platform}");
#endif
    } catch (Exception ex) {
        UnityEngine.Debug.LogError($"[RNEventEmitter] SendEvent failed: {ex.Message}");
    }
}
```

**Acceptance criteria:**
- [ ] Events fire on iOS (existing behavior unchanged)
- [ ] Events fire on Android via `UnitySendMessage`
- [ ] Events logged as warning on unsupported platforms (Editor, WebGL)
- [ ] No crashes on Android when UnityBridgeModule is unavailable
- [ ] High-frequency events (e.g., `onFoodDragging`) throttled or sent via `SendRaw` (no JSON serialization overhead)

**Dependencies:** Q13 (Android parity decision)
**Estimated effort:** M (4 hours)
**Test strategy:**
- Manual: Test on iOS device (existing behavior)
- Manual: Test on Android device (new code path)
- Unit: Verify `SendRaw` path for high-frequency events

### 7.5 New: `Assets/Scripts/Interactions/ComboManager.cs`

**File:** `mobile/unity/Assets/Scripts/Interactions/ComboManager.cs` (new file)

**Purpose:** Tracks all active tracked images, detects proximity between card pairs, and orchestrates combo animations.

**Step-by-step:**
1. Create `ComboManager.cs` in `Assets/Scripts/Interactions/` directory
2. Track all `ARTrackedImage` instances in a `Dictionary<string, TrackedImageState>`
3. Every frame (`Update`): compute pairwise distance between all tracked images
4. When distance < threshold (0.5 world units) for > 1 second → emit `onProximityNear`
5. When combo triggered (proximity met OR user taps COMBO button):
   - Emit `onComboTriggered`
   - Animate both models toward midpoint over 0.8s
   - Spawn particle burst effect
   - Spawn reward model
   - Emit `onComboComplete`
6. Combo table: `Dictionary<(string cardA, string cardB), ComboDefinition>`
7. For MVP: hardcode 3-5 combo pairs in Unity (chicken + egg → baby_chicken, etc.)

**Class structure:**
```csharp
public class ComboManager : MonoBehaviour
{
    [SerializeField] private float proximityThreshold = 0.5f;
    [SerializeField] private float proximityHoldTime = 1.0f;

    private readonly Dictionary<string, TrackedImageState> _trackedImages = new();
    private readonly Dictionary<(string, string), ComboDefinition> _comboTable = new();

    public event Action<string, string, float> OnProximityNear;
    public event Action<string, string, string> OnComboTriggered; // cardA, cardB, comboId
    public event Action<string, int> OnComboComplete; // rewardCardId, xpAwarded

    private class TrackedImageState {
        public ARTrackedImage Image;
        public float FirstDetectedTime;
        public float NearStartTime;
        public GameObject SpawnedModel;
    }

    public void RegisterTrackedImage(ARTrackedImage image, GameObject model) { ... }
    public void UnregisterTrackedImage(string imageId) { ... }
    public void TriggerCombo(string cardA, string cardB) { ... } // called from RN

    private void Update() {
        // Pairwise distance check
        var images = _trackedImages.Values.ToList();
        for (int i = 0; i < images.Count; i++) {
            for (int j = i + 1; j < images.Count; j++) {
                var dist = Vector3.Distance(
                    images[i].Image.transform.position,
                    images[j].Image.transform.position
                );
                if (dist < proximityThreshold) {
                    // Start/progress proximity timer
                    if (images[i].NearStartTime < 0) images[i].NearStartTime = Time.time;
                    if (images[j].NearStartTime < 0) images[j].NearStartTime = Time.time;

                    if (Time.time - images[i].NearStartTime > proximityHoldTime) {
                        OnProximityNear?.Invoke(images[i].Image.referenceImage.name,
                            images[j].Image.referenceImage.name, dist);
                    }
                }
            }
        }
    }
}
```

**Acceptance criteria:**
- [ ] Detects proximity between any two tracked images
- [ ] Emits `onProximityNear` after 1 second of proximity
- [ ] `TriggerCombo` called from RN via message
- [ ] Combo animation: models fly to midpoint, particle burst, reward spawn
- [ ] `onComboComplete` emitted with rewardCardId and xpAwarded
- [ ] Combo table loaded from config file (MVP: hardcoded in code)
- [ ] Handles 3+ simultaneous tracked images (pairwise combos)

**Dependencies:** Tasks 7.2, 7.3 (ARSessionManager, ARExperienceHandler)
**Estimated effort:** M (5-6 hours)
**Test strategy:**
- Unit: Mock ARTrackedImage positions, verify proximity detection
- Integration: Test with 2 physical flashcards, measure distance to trigger

### 7.6 New: `Assets/Scripts/Interactions/PetController.cs`

**File:** `mobile/unity/Assets/Scripts/Interactions/PetController.cs` (new file)

**Purpose:** Simple clay sphere pet character with state machine for food interactions.

**Step-by-step:**
1. Create `PetController.cs` in `Assets/Scripts/Interactions/`
2. Create clay sphere GameObject with googly eyes as child objects
3. Implement state machine: `idle → anticipating → eating → satisfied → idle`
4. Track food proximity: `OnFoodDragging` event → eyes follow food position
5. On `OnFoodFed`: play chomp animation → emit `onPetStateChanged` → emit `onFoodFed` to RN
6. Clay material: soft rim-light shader applied to sphere
7. Position pet in scene offset from flashcard detection area

**Class structure:**
```csharp
public class PetController : MonoBehaviour
{
    public enum PetState { Idle, Anticipating, Eating, Satisfied }
    public PetState CurrentState { get; private set; } = PetState.Idle;

    public event Action<PetState> OnStateChanged;

    [SerializeField] private Transform foodProximityTarget; // where food goes
    [SerializeField] private float feedProximityRadius = 0.3f;
    [SerializeField] private GameObject[] heartsParticles;

    private Animator _animator;
    private Transform _eyeLeft, _eyeRight;
    private int _streakCount = 0;

    private void Awake() {
        _animator = GetComponent<Animator>();
        _eyeLeft = transform.Find("Eyes/Left");
        _eyeRight = transform.Find("Eyes/Right");
    }

    public void OnFoodDragging(string foodModelId, Vector3 foodPosition) {
        if (CurrentState == PetState.Idle) {
            TransitionTo(PetState.Anticipating);
        }
        // Eyes follow food
        var dir = (foodPosition - transform.position).normalized;
        _eyeLeft.localPosition = dir * 0.05f;
        _eyeRight.localPosition = dir * 0.05f;
    }

    public void OnFoodFed(string foodModelId) {
        TransitionTo(PetState.Eating);
        // Play chomp animation
        _animator.SetTrigger("Chomp");

        StartCoroutine(FeedSequence());
    }

    private IEnumerator FeedSequence() {
        yield return new WaitForSeconds(0.3f); // chomp duration
        _streakCount++;

        TransitionTo(PetState.Satisfied);

        RNEventEmitter.Instance.SendEvent("onFoodFed", new {
            foodModelId = "",
            xpAwarded = 10,
            streakCount = _streakCount
        });

        yield return new WaitForSeconds(2.0f); // satisfied duration
        TransitionTo(PetState.Idle);
    }

    private void TransitionTo(PetState newState) {
        CurrentState = newState;
        OnStateChanged?.Invoke(newState);

        RNEventEmitter.Instance.SendEvent("onPetStateChanged", new {
            state = newState.ToString().ToLowerInvariant()
        });
    }
}
```

**Acceptance criteria:**
- [ ] Pet sphere renders with claymorphic rim-light material
- [ ] Eyes follow food model position when food is dragged
- [ ] Chomp animation plays on food feed
- [ ] Hearts particle effect shows on `satisfied` state
- [ ] `onPetStateChanged` emitted for each state transition
- [ ] `onFoodFed` emitted with xpAwarded and streakCount after feeding
- [ ] Streak counter increments on consecutive feeds

**Dependencies:** Task 7.9 (ClayShader), Task 7.7 (FoodInteraction)
**Estimated effort:** M (4-5 hours)
**Test strategy:**
- Unit: Verify state transitions fire in correct order
- Integration: Food dragged toward pet, verify feed sequence completes

### 7.7 New: `Assets/Scripts/Interactions/FoodInteraction.cs`

**File:** `mobile/unity/Assets/Scripts/Interactions/FoodInteraction.cs` (new file)

**Purpose:** Makes food model draggable via Unity's event system, constrained to XZ plane.

**Step-by-step:**
1. Create `FoodInteraction.cs` in `Assets/Scripts/Interactions/`
2. Implement `IDragHandler` from Unity's EventSystem
3. Constrain drag movement to XZ plane (AR tracking surface)
4. On drag start: emit `onFoodDragging` to RN
5. When food center enters pet proximity radius (0.3 world units): trigger feed sequence via `PetController.OnFoodFed()`
6. On drag end: if not fed, return to original position

**Class structure:**
```csharp
using UnityEngine;
using UnityEngine.EventSystems;
using UnityEngine.XR.ARFoundation;

public class FoodInteraction : MonoBehaviour, IDragHandler
{
    [SerializeField] private PetController petController;
    [SerializeField] private float petProximityRadius = 0.3f;

    private Vector3 _originalPosition;
    private Vector3 _dragOffset;
    private bool _isDragging;
    private Plane _arPlane;

    private void Awake() {
        _originalPosition = transform.position;
    }

    public void OnDrag(PointerEventData eventData) {
        if (eventData.pointerDrag != gameObject) return;
        _isDragging = true;

        // Get screen position
        var screenPos = eventData.position;
        // Raycast to AR plane
        if (Physics.Raycast(Camera.main.ScreenPointToRay(screenPos), out var hit, 100f)) {
            var newPos = hit.point;
            newPos.y = _originalPosition.y; // constrain to XZ plane
            transform.position = newPos;

            // Check pet proximity
            if (petController != null) {
                var distToPet = Vector3.Distance(transform.position, petController.transform.position);
                if (distToPet < petProximityRadius) {
                    // Trigger feed!
                    petController.OnFoodFed(gameObject.name);
                }
            }
        }
    }

    public void OnBeginDrag(PointerEventData eventData) {
        _isDragging = true;
        _originalPosition = transform.position;

        RNEventEmitter.Instance.SendEvent("onFoodDragging", new {
            foodModelId = gameObject.name
        });
    }

    public void OnEndDrag(PointerEventData eventData) {
        _isDragging = false;
        if (transform.position.y < _originalPosition.y - 0.5f) {
            // Return to original position if dropped far from pet
            transform.position = _originalPosition;
        }
    }
}
```

**Acceptance criteria:**
- [ ] Food model draggable via touch on AR plane
- [ ] Drag constrained to XZ plane
- [ ] `onFoodDragging` fires on drag start
- [ ] Auto-feeds pet when food enters pet proximity radius
- [ ] Returns to original position if not fed

**Dependencies:** Task 7.6 (PetController)
**Estimated effort:** S (2-3 hours)
**Test strategy:**
- Manual: Drag food toward pet, verify feed triggers at correct distance

### 7.8 Optional: `Assets/Scripts/UI/ARLoadingUI.cs`

**File:** `mobile/unity/Assets/Scripts/UI/ARLoadingUI.cs` (new file — optional)

**Purpose:** Subtle in-scene progress indicator for Hybrid approach. Shows only if model load exceeds 2 seconds.

**Step-by-step:**
1. Create `Assets/Scripts/UI/` directory
2. Create `ARLoadingUI.cs` monobehaviour
3. Subscribe to `onModelProgress` events
4. After 2 seconds of loading, show subtle spinning indicator in bottom-right of AR view
5. Claymorphic styling: small rounded quad with spinner
6. Hide indicator when `onModelLoaded` fires

**Acceptance criteria:**
- [ ] Indicator appears only if model loading exceeds 2 seconds
- [ ] Small, unobtrusive (bottom-right corner, does not obstruct AR view)
- [ ] Claymorphic styling: rounded quad, spinner
- [ ] Hidden when model loads successfully

**Dependencies:** Task 7.1 (GLBLoader events)
**Estimated effort:** S (1-2 hours)
**Test strategy:** Manual — verify indicator appears during slow loads

### 7.9 New: `Assets/Shaders/ClayShader.shader`

**File:** `mobile/unity/Assets/Shaders/ClayShader.shader` (new file)

**Purpose:** Claymorphic rim-light shader for 3D models. Applied to all spawned GLB models and the pet character.

**Step-by-step:**
1. Create `Assets/Shaders/` directory
2. Create `ClayShader.shader` with rim-light effect
3. Create `ClayShaderMaterial.mat` in Materials folder
4. Apply to pet sphere and reward/food models

**Shader code:**
```glsl
Shader "Custom/ClayShader"
{
    Properties
    {
        _Color ("Base Color", Color) = (1, 1, 1, 1)
        _RimColor ("Rim Color", Color) = (1, 0.95, 0.9, 1)
        _RimPower ("Rim Power", Range(0.0, 5.0)) = 3.0
        _RimIntensity ("Rim Intensity", Range(0.0, 1.0)) = 0.5
    }

    SubShader
    {
        Tags { "RenderType"="Opaque" }
        LOD 100

        Pass
        {
            CGPROGRAM
            #pragma vertex vert
            #pragma fragment frag

            #include "UnityCG.cginc"

            struct appdata {
                float4 vertex : POSITION;
                float3 normal : NORMAL;
            };

            struct v2f {
                float4 pos : SV_POSITION;
                float3 worldNormal : TEXCOORD0;
                float3 worldViewDir : TEXCOORD1;
            };

            sampler2D _MainTex;
            float4 _Color;
            float4 _RimColor;
            float _RimPower;
            float _RimIntensity;

            v2f vert (appdata v) {
                v2f o;
                o.pos = UnityObjectToClipPos(v.vertex);
                o.worldNormal = UnityObjectToWorldNormal(v.normal);
                o.worldViewDir = WorldSpaceViewDir(v.vertex);
                return o;
            }

            fixed4 frag (v2f i) : SV_Target {
                fixed4 col = _Color;
                float3 normal = normalize(i.worldNormal);
                float3 viewDir = normalize(i.worldViewDir);

                // Rim light: pow(1 - dot(viewDir, normal), rimPower) * rimColor
                float rim = 1.0 - max(dot(viewDir, normal), 0.0);
                rim = pow(rim, _RimPower) * _RimIntensity;
                col.rgb += _RimColor.rgb * rim;

                return col;
            }
            ENDCG
        }
    }
}
```

**Acceptance criteria:**
- [ ] Shader compiles without errors
- [ ] Rim light visible on sphere edges
- [ ] `_Color` parameter set per model from GLB material or script
- [ ] Applied to pet sphere, reward models, food models

**Dependencies:** None
**Estimated effort:** S (2-3 hours)
**Test strategy:**
- Manual: Verify rim light visible on physical device under different lighting

---

## 8. Task Dependency Graph & Recommended Execution Order

### 8.1 Parallelizable Tracks

Phase 2 work splits into **three parallel tracks** that can run concurrently after foundational setup:

```
Track A: Claymorphic Design System
├── Task 1: Install expo-linear-gradient
├── Task 2: Create tokens.ts
├── Task 3: Create ClayCard, ClayButton
├── Task 4: Create ClayProgressBar, ARLoadingOverlay
├── Task 6.8: Restyle ProgressTracker
└── Task 6.9: Restyle HomeScreen

Track B: Unity AR Bridge & Image Tracking
├── Task 7.1: GLBLoader onProgress events
├── Task 7.2: ARSessionManager image tracking
├── Task 7.3: ARExperienceHandler refactor
├── Task 7.4: RNEventEmitter Android support
└── Task 7.7: FoodInteraction

Track C: RN-Unity Integration & State Machine
├── Task 4: Unity bridge update (RN side)
├── Task 5: Unity event integration (RN side)
├── Task 6.5: useARSession hook
├── Task 6.6: ARScreen state machine
└── Task 6.7: UnityView real integration
```

### 8.2 Serial Dependencies (Critical Path)

```
[Q8 decision] ─────────────────────────────────────────┐
     │                                                      │
     ▼                                                      │
[Task 1] expo-linear-gradient ──► [Task 2] tokens.ts       │
                                        │                  │
                                        ▼                  │
                              [Task 3] ClayCard, ClayButton │
                                        │                  │
                    ┌────────────────────┼────────────┐    │
                    ▼                    ▼            ▼    │
              [Task 6.8]          [Task 4]        [Task 6.9]
           ProgressTracker      ClayProgressBar   HomeScreen
                    │              ARLoadingOverlay       │
                    └─────────────────────┬────────────┘    │
                                          ▼                  │
                              [Task 6.6] ARScreen ──────────┤
                                          │                  │
                    ┌─────────────────────┼────────────┐    │
                    ▼                     ▼            ▼    │
             [Task 7.1]           [Task 7.2]     [Task 7.3]  │
               GLBLoader          ARSession      ARExpHandler │
                    │                     │            │    │
                    └─────────────────────┼────────────┘    │
                                          ▼                  │
                                [Task 7.4] RNEventEmitter ──┘
                                          │
                    ┌─────────────────────┴────────────┐
                    ▼                                   ▼
           [Track C] useARSession              [Track C] UnityView
                    │                                   │
                    └──────────────┬────────────────────┘
                                   ▼
                         [Task 6.5] ARScreen integration
                                   │
                    ┌──────────────┴──────────────┐
                    ▼                             ▼
           [Task 7.5] ComboManager         [Task 7.6] PetController
                                   │
                    ┌──────────────┴──────────────┐
                    ▼                             ▼
            [Task 6.10] ComboOverlay      [Task 6.11] PetStatusOverlay
```

### 8.3 Blocking Dependencies Summary

| Task | Blocks | Blocked By |
|------|--------|------------|
| Task 1 (expo-linear-gradient) | Tasks 2, 3 | None |
| Task 2 (tokens.ts) | Tasks 3, 4, 6.8, 6.9 | Task 1 |
| Task 3 (ClayCard, ClayButton) | Tasks 4, 6.9 | Task 2 |
| Task 4 (ClayProgressBar, ARLoadingOverlay) | Task 6.6 | Task 3 |
| Task 6.8 (ProgressTracker) | None | Tasks 2, 3 |
| Task 6.9 (HomeScreen) | None | Task 3 |
| Task 7.1 (GLBLoader events) | Task 7.3 | None |
| Task 7.2 (ARSessionManager) | Task 7.3 | None |
| Task 7.3 (ARExperienceHandler) | Task 7.4 | Tasks 7.1, 7.2 |
| Task 7.4 (RNEventEmitter Android) | Task 6.5 | Task 7.3 |
| Task 6.5 (useARSession) | Task 6.6 | Tasks 4, 7.4 |
| Task 6.6 (ARScreen) | All interaction overlays | Task 6.5 |
| Task 6.7 (UnityView) | Task 6.6 | Task 4 (bridge) |
| Task 6.10 (ComboOverlay) | None | Task 6.6 |
| Task 6.11 (PetStatusOverlay) | None | Task 6.6 |

### 8.4 Estimated Timeline

| Week | Track A | Track B | Track C |
|------|---------|---------|---------|
| Week 1 | Tasks 1-2 | Task 7.1 | None |
| Week 2 | Tasks 3-4 | Tasks 7.2-7.3 | None |
| Week 3 | Tasks 6.8-6.9 | Task 7.4 | Tasks 6.5-6.7 |
| Week 4 | Integration | Integration | Integration |
| Week 5 | Device testing + polish | Device testing | Full E2E test |

**Total estimated effort:** 6-8 weeks of parallel work (3 tracks × 4 weeks)

---

## 9. RN ↔ Unity Event Contract

Complete bidirectional event contract for all messages crossing the React Native ↔ Unity bridge.

### 9.1 Unity → React Native Events

All events sent via `RNEventEmitter.Instance.SendEvent()` → `UnityBridgeModule.subscribe()`.

| Event Name | Direction | Payload Shape | When Fired | Consumed By |
|-----------|-----------|--------------|------------|-------------|
| `onArReady` | Unity→RN | `{ version: string }` | AR session initializes successfully | `useARSession` → `IMAGE_TRACKING_READY` |
| `onError` | Unity→RN | `{ code: string, message: string }` | Any Unity error | `useARSession` → `AR_ERROR` |
| `onImageDetected` | Unity→RN | `{ imageId: string, imageName: string, transform: { x: number, y: number, z: number } }` | First time a reference image is tracked | `useARSession` → `IMAGE_DETECTED` |
| `onImageTrackingLost` | Unity→RN | `{ imageId: string }` | Tracking state changes to limited/stopped | `useARSession` → back to `IMAGE_TRACKING_READY` |
| `onMultiImageDetected` | Unity→RN | `{ imageIds: string[], count: number }` | ≥ 2 images tracked simultaneously | `useARSession` → enables combo UI |
| `onProximityNear` | Unity→RN | `{ imageIdA: string, imageIdB: string, distance: number }` | Two images within combo threshold | `useARSession` → combo hint UI |
| `onComboTriggered` | Unity→RN | `{ cardIdA: string, cardIdB: string, comboId: string }` | Combo threshold met, animation starting | `useARSession` → combo animation state |
| `onComboComplete` | Unity→RN | `{ rewardCardId: string, xpAwarded: number }` | Combo animation done, reward spawned | `useARSession` → streak update |
| `onModelProgress` | Unity→RN | `{ stage: "download" \| "load" \| "instantiate", progress: number (0-1), message: string }` | GLB loading progress updates | `useARSession` → progress bar update |
| `onCacheHit` | Unity→RN | `{ modelUrl: string, cachedPath: string }` | Model found in cache, download skipped | `useARSession` → show "Using cached model" |
| `onObjectPlaced` | Unity→RN | `{ qrId: string, worldX: number, worldY: number, worldZ: number }` | Model spawned at anchor | `useARSession` → `MODEL_LOADED` |
| `onModelLoaded` | Unity→RN | `{ modelUrl: string, modelName: string }` | GLB instantiation complete | `useARSession` → `MODEL_LOADED` |
| `onFoodDragging` | Unity→RN | `{ foodModelId: string }` | Food model picked up by user | `useARSession` → pet eyes follow |
| `onFoodFed` | Unity→RN | `{ foodModelId: string, xpAwarded: number, streakCount: number }` | Food eaten by pet | `useARSession` → streak update |
| `onPetStateChanged` | Unity→RN | `{ state: "idle" \| "anticipating" \| "eating" \| "satisfied" }` | Pet animation state changed | `useARSession` → `PetStatusOverlay` update |
| `onAnimationComplete` | Unity→RN | `{ clip: string, qrId: string }` | Model animation finished | (existing, from `AnimationController`) |

### 9.2 React Native → Unity Commands

All commands sent via `UnityBridgeModule.method()` → `RNMessageReceiver.OnMessageFromRN()`.

| Method Name | Direction | Payload Shape | When Called | Unity Handler |
|------------|-----------|--------------|-------------|-------------|
| `initSession` | RN→Unity | none | Start AR session | `RNMessageReceiver:initSession` → `ARExperienceHandler.InitSession` |
| `loadARExperience` | RN→Unity | `UnityARExperiencePayload` (JSON) | Load lesson into AR | `RNMessageReceiver:loadARExperience` → `ARExperienceHandler.LoadARExperience` |
| `startImageTracking` | RN→Unity | `{ referenceImageLibraryId?: string }` | Begin image tracking | `RNMessageReceiver:startImageTracking` → `ARSessionManager.InitImageTrackingSession` |
| `triggerCombo` | RN→Unity | `{ cardA: string, cardB: string }` | User taps combo button | `RNMessageReceiver:triggerCombo` → `ComboManager.TriggerCombo` |
| `pauseSession` | RN→Unity | none | App backgrounded | `RNMessageReceiver:pauseSession` → `ARExperienceHandler.PauseSession` |
| `resumeSession` | RN→Unity | none | App foregrounded | `RNMessageReceiver:resumeSession` → `ARExperienceHandler.ResumeSession` |
| `destroySession` | RN→Unity | none | AR screen exit | `RNMessageReceiver:destroySession` → `ARExperienceHandler.DestroySession` |
| `setPlaneDetection` | RN→Unity | `{ enabled: boolean }` | (deprecated) | Kept for backward compat only |

### 9.3 Bridge Message Format

All messages use format: `"methodName|{jsonPayload}"` (from `RNMessageReceiver.cs` line 20).

**Example Unity→RN event:**
```
onImageDetected|{"imageId":"flashcard_cat","imageName":"flashcard_cat","transform":{"x":0.1,"y":-0.05,"z":0.3}}
```

**Example RN→Unity command:**
```
loadARExperience|{"qrId":"flashcard_cat","word":"cat","translationVi":"mèo","modelUrl":"https://.../cat.glb",...}
```

---

## 10. ARScreen State Machine — Expanded Specification

### 10.1 State Definitions

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│ IDLE                                                                              │
│ ─────────────────────────────────────────────────────────────────────────────────  │
│ Entry actions:   • Reset all state (trackedImages, petState, streak)             │
│                  • Fetch AR lesson payload from API                               │
│ Exit conditions: • API response received → AR_INITIALIZING                        │
│ Events consumed: None                                                             │
│ UI shown:        Loading spinner (fetching lesson) OR empty state                 │
│ Error path:     Network error → AR_ERROR                                          │
└─────────────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────────────┐
│ AR_INITIALIZING                                                                  │
│ ─────────────────────────────────────────────────────────────────────────────────  │
│ Entry actions:   • Show ARLoadingOverlay (state: 'initializing')                  │
│                  • Call unityBridge.startARSession()                             │
│                  • Wait for onArReady event                                     │
│ Exit conditions: • onArReady received → IMAGE_TRACKING_READY                      │
│                  • Timeout > 10s → AR_ERROR                                      │
│                  • onError received → AR_ERROR                                    │
│ Events consumed: onArReady, onError                                              │
│ UI shown:        Claymorphic overlay: "Preparing AR..." + spinner                │
│ Error path:     Timeout/onError → AR_ERROR (retry available)                     │
└─────────────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────────────┐
│ IMAGE_TRACKING_READY                                                              │
│ ─────────────────────────────────────────────────────────────────────────────────  │
│ Entry actions:   • Show UnityView (camera active, scanning for flashcards)        │
│                  • Dismiss ARLoadingOverlay                                       │
│                  • Show "Point camera at flashcard" hint                        │
│ Exit conditions: • onImageDetected received → IMAGE_DETECTED                    │
│                  • onError received → AR_ERROR                                  │
│ Events consumed: onImageDetected, onError                                        │
│ UI shown:        Full-screen camera view + hint text overlay                     │
│ Error path:     onError → AR_ERROR                                               │
└─────────────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────────────┐
│ IMAGE_DETECTED                                                                   │
│ ─────────────────────────────────────────────────────────────────────────────────  │
│ Entry actions:   • Add detected image to trackedImages Map                        │
│                  • Show ARLoadingOverlay (state: 'loading_model')                │
│                  • Begin model download/instantiation                            │
│ Exit conditions: • onObjectPlaced received → MODEL_SPAWNING                     │
│                  • onImageTrackingLost → back to IMAGE_TRACKING_READY (graceful)│
│                  • onError received → AR_ERROR                                   │
│ Events consumed: onObjectPlaced, onModelProgress, onImageTrackingLost, onError   │
│ UI shown:        Camera view + loading overlay with progress bar                  │
│ Progress stages: download (0-40%) → load (40-80%) → instantiate (80-100%)       │
│ Error path:     onError → AR_ERROR (image still tracked, can retry)              │
└─────────────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────────────┐
│ MODEL_SPAWNING                                                                   │
│ ─────────────────────────────────────────────────────────────────────────────────  │
│ Entry actions:   • Parent model to tracked image transform                        │
│                  • Play spawn animation                                          │
│                  • Update progress to 100%                                      │
│ Exit conditions: • onModelLoaded received → MODEL_LOADED                        │
│                  • Animation complete (~500ms) → MODEL_LOADED                   │
│                  • onImageTrackingLost → back to IMAGE_TRACKING_READY             │
│ Events consumed: onModelLoaded, onAnimationComplete, onImageTrackingLost          │
│ UI shown:        Brief spawn animation (no overlay)                              │
│ Error path:     Tracking lost → IMAGE_TRACKING_READY                              │
└─────────────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────────────┐
│ MODEL_LOADED                                                                     │
│ ─────────────────────────────────────────────────────────────────────────────────  │
│ Entry actions:   • Dismiss ARLoadingOverlay                                       │
│                  • Play idle animation                                           │
│                  • Check if second card already tracked → enable combo UI        │
│ Exit conditions: • onMultiImageDetected OR canCombo=true → AR_INTERACTING        │
│                  • onImageTrackingLost → IMAGE_TRACKING_READY                    │
│                  • Exit button → IDLE                                            │
│ Events consumed: onMultiImageDetected, onImageTrackingLost                        │
│ UI shown:        Camera view + model + combo button (if 2+ cards)               │
│ Error path:     Tracking lost → IMAGE_TRACKING_READY                             │
└─────────────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────────────┐
│ AR_INTERACTING                                                                   │
│ ─────────────────────────────────────────────────────────────────────────────────  │
│ Entry actions:   • Enable combo UI (if 2+ cards)                                │
│                  • Enable pet status overlay                                    │
│                  • Start combo proximity monitoring                               │
│ Exit conditions: • Exit button → IDLE                                            │
│                  • Tracking lost → IMAGE_TRACKING_READY                         │
│ Events consumed: onProximityNear, onComboTriggered, onComboComplete,             │
│                  onFoodDragging, onFoodFed, onPetStateChanged,                   │
│                  onImageTrackingLost                                            │
│ UI shown:        Camera view + ComboOverlay + PetStatusOverlay + streak counter  │
│ Sub-states:      COMBO_ANIMATING, FEEDING, IDLE                                  │
└─────────────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────────────┐
│ AR_ERROR                                                                         │
│ ─────────────────────────────────────────────────────────────────────────────────  │
│ Entry actions:   • Show ARLoadingOverlay (state: 'error')                        │
│                  • Log error details                                            │
│                  • Stop AR session                                               │
│ Exit conditions: • Retry → AR_INITIALIZING                                       │
│                  • Exit → IDLE                                                   │
│ UI shown:        Claymorphic error card + Retry button + Exit button             │
│ Error codes:     SESSION_FAILED, MODEL_LOAD_FAILED, PLANE_DETECTION_ERROR,         │
│                  IMAGE_TRACKING_ERROR, UNKNOWN_ERROR                              │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

### 10.2 Error Recovery Paths

| Error State | Error Code | Recovery Action | Can Retry |
|-------------|------------|-----------------|------------|
| AR session failed | `SESSION_FAILED` | Re-initialize session | Yes |
| Model load failed | `MODEL_LOAD_FAILED` | Retry load with same payload | Yes |
| Tracking lost | `IMAGE_TRACKING_LOST` | Wait for re-detection | Auto |
| Network error | `NETWORK_ERROR` | Retry on network restore | Yes |
| Reference image not found | `IMAGE_NOT_FOUND` | Show "flashcard not recognized" | Yes |
| Unknown error | `UNKNOWN_ERROR` | Log and show generic error | Yes |

### 10.3 State Transition Matrix

| Current State | Event | Next State | Actions |
|--------------|-------|------------|---------|
| IDLE | `flashcardApi` success | AR_INITIALIZING | Start AR session |
| IDLE | Network error | AR_ERROR | Show error |
| AR_INITIALIZING | `onArReady` | IMAGE_TRACKING_READY | Dismiss overlay |
| AR_INITIALIZING | `onError` / timeout | AR_ERROR | Show error |
| IMAGE_TRACKING_READY | `onImageDetected` | IMAGE_DETECTED | Start model load |
| IMAGE_TRACKING_READY | `onError` | AR_ERROR | Show error |
| IMAGE_DETECTED | `onObjectPlaced` | MODEL_SPAWNING | Spawn animation |
| IMAGE_DETECTED | `onImageTrackingLost` | IMAGE_TRACKING_READY | Graceful |
| IMAGE_DETECTED | `onError` | AR_ERROR | Show error |
| IMAGE_DETECTED | `onModelProgress` | (same) | Update progress |
| MODEL_SPAWNING | `onModelLoaded` | MODEL_LOADED | Enable interaction |
| MODEL_SPAWNING | `onImageTrackingLost` | IMAGE_TRACKING_READY | Graceful |
| MODEL_LOADED | `trackedImages.size >= 2` | AR_INTERACTING | Enable combo |
| MODEL_LOADED | `onImageTrackingLost` | IMAGE_TRACKING_READY | Graceful |
| MODEL_LOADED | Exit | IDLE | Clean up |
| AR_INTERACTING | `onComboTriggered` | COMBO_ANIMATING | Play combo |
| AR_INTERACTING | `onFoodFed` | AR_INTERACTING | Update streak |
| AR_INTERACTING | `onImageTrackingLost` | IMAGE_TRACKING_READY | Graceful |
| AR_INTERACTING | Exit | IDLE | Clean up |
| COMBO_ANIMATING | `onComboComplete` | AR_INTERACTING | Update UI |
| AR_ERROR | Retry | AR_INITIALIZING | Reset session |
| AR_ERROR | Exit | IDLE | Clean up |

---

## 11. Rollout & Verification Plan

### 11.1 Build Commands

```bash
# React Native build
cd mobile/rn

# Install new dependencies
npx expo install expo-linear-gradient

# iOS build
npx expo run:ios --configuration Release

# Android build
npx expo run:android --variant release

# Unity build (requires Unity Editor)
# Build for iOS: File > Build Settings > iOS > Build
# Build for Android: File > Build Settings > Android > Build
```

### 11.2 Development Testing

```bash
# Start Metro bundler
npx expo start

# Start with iOS simulator
npx expo start --ios

# Start with Android emulator
npx expo start --android

# Clear Metro cache
npx expo start --clear
```

### 11.3 Device Testing Matrix

| Test | iPhone (iOS 17+) | Android (API 29+) | Notes |
|------|-------------------|-------------------|-------|
| Claymorphic shadows visible | Required | Required | Compare to design spec |
| Claymorphic gradient highlight | Required | Required | Check top edge glow |
| AR session starts | Required | Required | Camera permission prompt |
| Flashcard tracking | Required | Q13 | Print test images |
| Multi-card tracking | Required | Q13 | Two flashcards simultaneously |
| Combo detection | Required | Q13 | Distance threshold test |
| Food drag and feed | Required | Q13 | Pet proximity trigger |
| Model loading progress | Required | Required | Progress bar updates |
| Cached model skip | Required | Required | No progress bar shown |
| Error recovery | Required | Required | Retry button works |
| Safe area (notch) | Required | N/A | iPhone X+ |
| Safe area (hole punch) | N/A | Required | Android devices |

### 11.4 Test Flashcard Images (MVP Pre-bundled)

For device testing, pre-bundle these reference images in `StreamingAssets/ARResources/`:

| Image | Physical Size | QR ID | Lesson |
|-------|-------------|-------|--------|
| `flashcard_cat.png` | 85×54mm (credit card) | `flashcard_cat` | Animals |
| `flashcard_dog.png` | 85×54mm | `flashcard_dog` | Animals |
| `flashcard_bird.png` | 85×54mm | `flashcard_bird` | Animals |
| `flashcard_fish.png` | 85×54mm | `flashcard_fish` | Animals |

### 11.5 Definition of Done — Phase 2

| # | Criterion | Verification Method |
|---|-----------|--------------------|
| 1 | Claymorphic design system applied to HomeScreen, ARScreen, ProgressTracker | Visual inspection on iOS + Android |
| 2 | All ClayCard variants render correctly with shadows | Snapshot tests (CI) |
| 3 | AR session starts and camera activates | Manual device test |
| 4 | Physical flashcard tracked and 3D model spawns | Manual device test with printed flashcards |
| 5 | Multi-card tracking detects 2+ flashcards | Manual device test |
| 6 | Combo system triggers and plays reward animation | Manual device test |
| 7 | Food drag-and-feed interaction works | Manual device test |
| 8 | Pet state updates reflect in PetStatusOverlay | Manual device test |
| 9 | ARLoadingOverlay shows real progress | Manual device test (monitor events) |
| 10 | Cached models skip progress bar | Manual device test (second load) |
| 11 | Error states show claymorphic retry UI | Manual device test (simulate error) |
| 12 | Graceful tracking loss returns to IMAGE_TRACKING_READY | Manual device test (cover flashcard) |
| 13 | Android events fire correctly | Manual device test (Q13) |
| 14 | iOS build succeeds | CI/CD pipeline |
| 15 | Android build succeeds | CI/CD pipeline |
| 16 | All 14 Unity→RN events fire correctly | Device log inspection |

### 11.6 Known Device Testing Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| iOS ARKit reference image library limit | Medium | Medium | Start with 4 images, expand later |
| Android ARCore image tracking support | Low | High | Check device compatibility before testing |
| Physical flashcard print quality | Medium | Medium | Use high-res PNG, avoid compression artifacts |
| Lighting conditions affecting tracking | Medium | Medium | Test in multiple lighting conditions |
| Device thermal throttling | Low | Low | Monitor device temperature, rest between tests |

---

## 12. DEFERRED / BLOCKED ON DB MIGRATION

The following work is **explicitly out of scope** for Phase 2 and is blocked on the MongoDB → Supabase Postgres migration:

| Item | Description | Blocker |
|------|-------------|---------|
| **Flashcard image download** | Adding reference images to `ARReferenceImageSet` at runtime from Supabase Storage URLs | Supabase not available; no image download API |
| **Combo definitions table** | Storing combo pairs (`cardIdA + cardIdB → rewardCardId`) in Supabase `combos` table | DB migration required |
| **AR reference image database** | Dynamic `ARReferenceImageSet.AddImage()` with downloaded flashcard images | Same |
| **GLB model URLs** | Storing GLB model URLs per lesson in Supabase | DB migration required |
| **XP persistence** | Writing XP rewards back to database after AR session | Same |
| **Lesson progress** | Storing which flashcards have been scanned/completed per user | Same |
| **Pet character persistence** | Saving pet state/stats across sessions | Same |
| **Leaderboard** | XP leaderboard from Supabase | Same |
| **AR lesson analytics** | Tracking image tracking success rate, combo completion rate, load times | Same |

> **Note:** Reference images CAN be pre-bundled in the app without DB migration. The MVP ships with pre-bundled images in `StreamingAssets/ARResources/`. DB migration enables dynamic/runtime reference image loading.

---

## 9. Open Questions for Product Owner

### Original 7 Questions (unchanged)
1. **Font loading:** Nunito is the web font. Load via `@expo-google-fonts/nunito` now, or system font for MVP?
2. **Loading UX timing:** 2-second threshold for in-scene progress, or from model load start?
3. **AR camera permission:** Clay-styled prompt before AR screen, or silent request on entry?
4. **Error recovery:** Fall back to 2D flashcard on model load failure, or retry-only?
5. **Cached model indication:** Separate "cached" vs "downloading" messages, or unified "Loading model..."?
6. **Progress bar color:** Primary blue (`#6EB9FF`) or accent yellow (`#FFD93D`)?
7. **HomeScreen clay scope:** Full clay pass (all cards, headers) or buttons/CTAs only?

### New Questions from AR Clarification (2026-07-23)
8. **Reference image packaging:** For MVP, pre-bundle flashcard images in app (requires rebuild when images change), or defer all images until after DB migration (runtime download)? **→ BLOCKS Task 7.2**
9. **Combo trigger:** Auto-trigger when 2 flashcards are close (proximity), or require user to tap COMBO button? Auto is more "magic" but needs proximity tuning.
10. **Pet character:** Is there an existing virtual pet character in the Unity scene? If so, what's its name and can we modify its animations? If not, should we build a simple clay sphere placeholder?
11. **Combo definitions MVP:** How many combo pairs should the MVP support? Hardcoded in Unity or loaded from a config file?
12. **Food flashcard category:** Are food flashcards a separate lesson/category? Does the app know at scan time whether a flashcard is "food"?
13. **Android parity:** `RNEventEmitter` is iOS-only (critical bug). Fix Android event forwarding in Phase 2, or ship iOS-only AR in MVP? **→ BLOCKS Task 7.4**
14. **Flashcard physical size:** What is the approximate physical size of printed flashcards? (Credit-card ~85×54mm, A7 ~74×105mm, other?) Critical for reference image physical size hints in AR tracking.

### New Questions from Deep-Dive Analysis (2026-07-23)
15. **ARResource image format:** Should reference images use PNG (lossless, larger) or JPEG (lossy, smaller)? ARKit accepts both. PNG recommended for sharp edges critical for tracking.
16. **Pet proximity radius:** 0.3 world units is the default for food-to-pet feed trigger. Should this be configurable per lesson, or hardcoded?
17. **Combo proximity threshold:** 0.5 world units (~50cm) is the default for combo detection. Should this be tuned per lesson, or a global constant?
18. **Flashcard-to-model mapping:** When a flashcard is detected, how does Unity know which GLB model URL to load? Via the `QrId` matching the `ModelUrl` in the payload? Or is there a lesson API that provides the mapping?
19. **Model spawn offset:** When a model spawns on a tracked image, should it appear at the image center, or offset above/below the image? Affects `ModelSpawner.SpawnOnTrackedImage()` implementation.
20. **Nunito font vs system font for MVP:** Since `@expo-google-fonts/nunito` adds bundle weight, should Phase 2 MVP use system font and defer Nunito to Phase 3?
21. **ARLoadingOverlay 2s timeout:** The Hybrid approach shows RN overlay until `onArReady` fires. If AR session takes >2s, Unity shows in-scene indicator. Is this threshold correct, or should it be 3s?
22. **Pet character placement:** Where in the AR scene should the pet character appear? Fixed position (e.g., lower-left of camera view) or dynamic based on detected flashcard positions?
23. **Multi-card combo priority:** If 3+ flashcards are tracked simultaneously, should Unity attempt all pairwise combos or just the closest pair?

---

*Plan prepared: 2026-07-23 | Updated: 2026-07-23 (AR mode clarification + research findings) | Authors: Orchestrator + Researcher agents*
