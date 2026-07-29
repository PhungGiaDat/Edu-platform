# Research Report: Claymorphic UI in React Native

**Date:** 2026-07-23
**Researcher:** Agent-Researcher
**Project:** Edu-platform Mobile (React Native)
**Status:** COMPLETE

---

## Summary

React Native 0.86 (which this project uses via Expo SDK 57) ships with native `boxShadow` style support (since RN 0.76) that **includes inset shadows** on Android 10+. This eliminates the need for legacy workarounds. The claymorphism effect can be achieved through a layered View approach combining RN's new native `boxShadow` (for outer drop shadows) with `expo-linear-gradient` (already available in the project) for the inset highlight gradient, wrapped in a reusable `ClayCard` component. The `react-native-neomorph-shadows` package is **deprecated** (last updated 2022, depends on deprecated `@react-native-community/art`), and `@shopify/react-native-skia` is still in alpha as of 2026 — both should be avoided.

---

## 1. RN Package Audit

The project's `mobile/rn/package.json` reveals:

| Package | Version | Relevance |
|---------|---------|-----------|
| `react-native` | 0.86.0 | Full New Architecture (Fabric), boxShadow support |
| `expo` | 57.0.8 | expo-linear-gradient already available |
| `react-native-svg` | 15.15.5 | Already present, used by shadow-2 and Skia |
| `expo-linear-gradient` | not listed | **Not installed** — must add |
| `react-native-shadow-2` | not installed | Not needed with native boxShadow |
| `@shopify/react-native-skia` | not installed | Not recommended (still alpha) |

**Key finding:** No shadow/gradient packages are currently installed except `react-native-svg`. The project is clean and ready for a targeted add.

---

## 2. Web → RN Token Mapping Table

All hex and pixel values carry over directly. Only the shadow structure changes.

### 2.1 Shadow Tokens

| Web Token | Web CSS Value | RN Native `boxShadow` (array of BoxShadowValue) |
|-----------|--------------|----------------------------------------------|
| `clay-sm` drop | `0 4px 0 rgba(0,0,0,0.12)` | `{ offsetX: 0, offsetY: 4, blurRadius: 0, spreadDistance: 0, color: 'rgba(0,0,0,0.12)', inset: false }` |
| `clay-sm` ambient | `0 2px 8px rgba(0,0,0,0.06)` | `{ offsetX: 0, offsetY: 2, blurRadius: 8, spreadDistance: 0, color: 'rgba(0,0,0,0.06)', inset: false }` |
| `clay-sm` inset | `inset 0 1px 0 rgba(255,255,255,0.5)` | **Replaced by** `LinearGradient` overlay (see §2.3) |
| `clay` drop | `0 8px 0 rgba(0,0,0,0.12)` | `{ offsetX: 0, offsetY: 8, blurRadius: 0, spreadDistance: 0, color: 'rgba(0,0,0,0.12)', inset: false }` |
| `clay` ambient | `0 4px 16px rgba(0,0,0,0.08)` | `{ offsetX: 0, offsetY: 4, blurRadius: 16, spreadDistance: 0, color: 'rgba(0,0,0,0.08)', inset: false }` |
| `clay` inset | `inset 0 1px 0 rgba(255,255,255,0.7)` | **Replaced by** `LinearGradient` overlay (see §2.3) |
| `clay-lg` drop | `0 14px 0 rgba(0,0,0,0.12)` | `{ offsetX: 0, offsetY: 14, blurRadius: 0, spreadDistance: 0, color: 'rgba(0,0,0,0.12)', inset: false }` |
| `clay-lg` ambient | `0 8px 24px rgba(0,0,0,0.1)` | `{ offsetX: 0, offsetY: 8, blurRadius: 24, spreadDistance: 0, color: 'rgba(0,0,0,0.1)', inset: false }` |
| `clay-lg` inset | `inset 0 1px 0 rgba(255,255,255,0.7)` | **Replaced by** `LinearGradient` overlay (see §2.3) |

**Note on `blurRadius: 0`:** RN's boxShadow requires a blur value. Setting `blurRadius: 0` with `spreadDistance: 0` produces a hard-edged drop shadow matching the web's hard offset shadow.

### 2.2 Color Tokens

| Token Name | Hex | Usage |
|------------|-----|-------|
| Primary | `#6EB9FF` | Buttons, cards |
| Secondary | `#B4E197` | Buttons, badges |
| Accent | `#FFD93D` | CTAs, highlights |
| Coral | `#FF9F9F` | Buttons, badges |
| Warm white base | `#FFFBF0` | Card backgrounds |
| Dark shadow base | `rgba(0,0,0,0.12)` | All clay-card drop shadows |
| Ambient shadow | `rgba(0,0,0,0.06–0.1)` | Variable per size |

### 2.3 Inset Highlight → RN LinearGradient Mapping

The web's `inset 0 1px 0 rgba(255,255,255,0.5)` creates a top-to-bottom fade from white (top) to transparent (bottom), giving a raised/light-catching appearance. In RN this is achieved with an absolute-positioned `LinearGradient` overlay at the top of the card.

| Web Effect | RN Implementation |
|------------|-------------------|
| `inset 0 1px 0 rgba(255,255,255,0.5)` | `<LinearGradient>` from `rgba(255,255,255,0.5)` at y=0 to `transparent` at y=height×0.15` |
| `inset 0 2px 0 rgba(255,255,255,0.6)` (CTA) | Same pattern, higher opacity and spread |
| `inset 0 1px 0 rgba(255,255,255,0.28)` (XP panel) | Same pattern, lower opacity |

### 2.4 Border Radius Tokens

| Token | Web Value | RN Value |
|-------|-----------|----------|
| Card-sm | `24px` | `24` |
| Card (default) | `28px` | `28` |
| Card-lg | `32px` | `32` |
| Button | `20px` | `20` |
| Badge | `99px` | `99` |
| XP panel | `28px` | `28` |

### 2.5 Animation Tokens

| Token | Web Value | RN Equivalent |
|-------|-----------|---------------|
| Spring | `cubic-bezier(0.34,1.56,0.64,1)` | Use `react-native-reanimated` with `withSpring({ damping: 12, stiffness: 180 })` |
| Press offset | `translateY(3px)` | Use `withTiming` on `translateY` |
| Hover lift | `translateY(-6px) scale(1.02)` | Use `withSpring` on `translateY` and `scale` |
| Float | `translateY(-14px) rotate(2deg)` | Use `withRepeat(withTiming(...))` from reanimated |
| Shimmer | CSS `linear-gradient` + `@keyframes` | `LinearGradient` with animated `start`/`end` positions |

---

## 3. Approach Comparison

### Approach A: `react-native-shadow-2` + Layered Views

Uses `react-native-shadow-2` (SVG-based) for outer shadows, plus an `expo-linear-gradient` overlay for the inset highlight.

**How it works:** Stack three absolute-positioned layers — background color View, SVG shadow layer from `ShadowView`, and a `LinearGradient` overlay at the top edge for the inset highlight.

| Criterion | Assessment |
|-----------|-----------|
| **Complexity** | Medium. Requires managing 2–3 nested Views per clay element. Shadow props are straightforward but SVG-based approach adds rendering overhead. |
| **RN 0.86 Compatibility** | Compatible. Works on both Old and New Architecture. However, `react-native-shadow-2` v7.1.x (last updated Jul 2025) is now superseded by native `boxShadow`. |
| **Performance** | Moderate. SVG-based shadows render via SVG path fills — slower than native boxShadow which maps to platform APIs. |
| **iOS support** | Full. `react-native-shadow-2` was specifically designed to solve iOS shadow inconsistency. |
| **Android support** | Full. Solves the old Android shadow absence problem. |
| **Maintainability** | Low. Two external dependencies (`shadow-2` + `expo-linear-gradient`). Library is effectively in maintenance mode — no new features expected. |
| **Inset shadow** | **No.** `react-native-shadow-2` does not support inset shadows. The inset highlight must still be done with a gradient overlay. |

### Approach B: Native `boxShadow` (RN 0.76+) + `expo-linear-gradient` + Layered Views

Uses React Native's built-in `boxShadow` style prop (available since RN 0.76) for outer shadows, plus `expo-linear-gradient` for the inset highlight. Encapsulated in a `ClayCard` component.

**How it works:** Single `View` with `boxShadow` array (2–3 BoxShadowValue objects for the drop + ambient layers), plus an absolute-positioned inner `View` with `LinearGradient` for the inset highlight. All wrapped in a `ClayCard` component that accepts color, size, and pressed props.

| Criterion | Assessment |
|-----------|-----------|
| **Complexity** | Low. Single native API call. No extra dependencies for shadows. Gradient overlay is a single `<View>` with standard gradient library. |
| **RN 0.86 Compatibility** | **Perfect.** Uses native platform APIs. RN 0.86 is New Architecture-only, so all boxShadow features (including inset on Android 10+) are fully available. |
| **Performance** | **Best.** Maps directly to iOS `CGContext` shadow APIs and Android `android.graphics.LayerPaint`. No bridge overhead, no SVG rendering. |
| **iOS support** | Full native shadow via `shadowOffset`, `shadowOpacity`, `shadowRadius`. |
| **Android support** | Full — `boxShadow` maps to `android.graphics.LayerPaint.setShadowLayer`. |
| **Inset shadow** | **Partial.** Native inset `boxShadow` is supported on Android 10+ only. On iOS and older Android, falls back to gradient overlay (which is the standard claymorphic workaround). |
| **Maintainability** | **Highest.** Zero external shadow dependencies. Uses only `expo-linear-gradient` (needed anyway). |

### Approach C: `@shopify/react-native-skia`

Uses Skia's GPU-accelerated `Shadow` components inside a `Canvas` to draw neomorphic/clay effects.

| Criterion | Assessment |
|-----------|-----------|
| **Complexity** | Medium-High. Canvas-based — cannot use standard `View`, `Text`, `Pressable` directly inside. Requires wrapping or replacing native components. |
| **RN 0.86 Compatibility** | **Risky.** Skia is still in alpha/canary as of 2026. Fabric compatibility is improving but not stable. |
| **Performance** | Highest (GPU). Skia renders on GPU, bypasses native view system. |
| **iOS/Android support** | Both, via Skia engine. |
| **Inset shadow** | Yes — `<Shadow inner />` prop natively. |
| **Maintainability** | Low. Alpha status, breaking changes likely, no stable release. Not recommended for production. |

### Approach D: `react-native-neomorph-shadows`

Deprecated package based on `@react-native-community/art` (which is itself deprecated from Expo since SDK 52+).

| Criterion | Assessment |
|-----------|-----------|
| **Status** | **DO NOT USE.** Last updated May 2022. Explicitly incompatible with modern Expo. 364 weekly downloads. |
| **Maintainability** | Zero. Abandoned. |

---

## 4. Comparison Matrix

| Criterion | A: shadow-2 + gradient | B: Native boxShadow + gradient | C: Skia | D: neomorph-shadows |
|-----------|----------------------|------------------------------|---------|---------------------|
| **Complexity** | Medium | **Low** | Medium-High | Medium |
| **RN 0.86 compatible** | Yes | **Yes (native)** | Alpha risk | No |
| **Performance** | Moderate | **Best** | Highest | Poor |
| **Inset shadow** | Via gradient | Via gradient + partial native | Native | Native (deprecated) |
| **Dependencies added** | shadow-2 + linear-gradient | `expo-linear-gradient` only | Skia (large) + reanimated | neomorph + art |
| **iOS shadow** | SVG-based | **Native** | GPU | Native (deprecated) |
| **Android shadow** | SVG-based | **Native** | GPU | Native (deprecated) |
| **Long-term support** | Maintenance mode | **First-class native** | Alpha | Abandoned |
| **Recommended** | ❌ Fallback | ✅ **Primary** | ❌ Experimental | ❌ Avoid |

---

## 5. Recommended Approach: Approach B

**Approach B (Native `boxShadow` + `expo-linear-gradient`)** is the recommended path for this project, for the following reasons:

1. **RN 0.86 = New Architecture only** — `boxShadow` is a first-class native API. No third-party shadow library can match platform API performance.
2. **Minimal dependency footprint** — Only `expo-linear-gradient` needs to be added. No shadow-specific packages.
3. **Inset highlight via gradient is the established RN pattern** — Even with `react-native-shadow-2`, inset shadows required a gradient overlay. The gradient approach is not a workaround; it is the correct claymorphic technique for the top-edge highlight.
4. **The project already uses Expo** — `expo-linear-gradient` integrates cleanly and supports both iOS and Android.
5. **Gradual migration possible** — The `ClayCard` component can start simple and gain variants (pressed, hover-equivalent) incrementally.
6. **Android 10+ inset native fallback** — When Android 10+ devices render the component, the native inset shadow from `boxShadow` supplements the gradient, producing a richer effect.

---

## 6. Implementation Sketch

### 6.1 Required New Dependency

```bash
npx expo install expo-linear-gradient
```

No other packages are needed.

### 6.2 Token Constants (`src/styles/clayTokens.ts`)

```typescript
// Colors — direct hex equivalents
export const CLAYS = {
  PRIMARY: '#6EB9FF',
  SECONDARY: '#B4E197',
  ACCENT: '#FFD93D',
  CORAL: '#FF9F9F',
  WARM_WHITE: '#FFFBF0',
  WHITE: '#FFFFFF',
} as const;

// Shadow color base
const SHADOW_DARK = 'rgba(0,0,0,0.12)';
const SHADOW_AMBIENT_MED = 'rgba(0,0,0,0.08)';
const SHADOW_AMBIENT_LG = 'rgba(0,0,0,0.1)';

// Inset highlight: white → transparent (top to ~15% of height)
const HIGHLIGHT_TOP_MED = 'rgba(255,255,255,0.7)';
const HIGHLIGHT_TOP_SM = 'rgba(255,255,255,0.5)';
const HIGHLIGHT_BOTTOM = 'rgba(255,255,255,0)';
```

### 6.3 ClayCard Component Signature (`src/components/ClayCard.tsx`)

```tsx
import { LinearGradient } from 'expo-linear-gradient';
import { View, StyleSheet, ViewStyle, Pressable } from 'react-native';

type ClaySize = 'sm' | 'md' | 'lg';

interface ClayCardProps {
  children: React.ReactNode;
  size?: ClaySize;
  color?: string;
  style?: ViewStyle;
  onPress?: () => void;
}

// Shadow configuration per size
const SHADOW_CONFIG: Record<ClaySize, object[]> = {
  sm: [
    { offsetX: 0, offsetY: 4, blurRadius: 0, color: 'rgba(0,0,0,0.12)' },
    { offsetX: 0, offsetY: 2, blurRadius: 8, color: 'rgba(0,0,0,0.06)' },
  ],
  md: [
    { offsetX: 0, offsetY: 8, blurRadius: 0, color: 'rgba(0,0,0,0.12)' },
    { offsetX: 0, offsetY: 4, blurRadius: 16, color: 'rgba(0,0,0,0.08)' },
  ],
  lg: [
    { offsetX: 0, offsetY: 14, blurRadius: 0, color: 'rgba(0,0,0,0.12)' },
    { offsetX: 0, offsetY: 8, blurRadius: 24, color: 'rgba(0,0,0,0.1)' },
  ],
};

const BORDER_RADIUS: Record<ClaySize, number> = {
  sm: 24,
  md: 28,
  lg: 32,
};

export function ClayCard({ children, size = 'md', color = CLAYS.WARM_WHITE, style, onPress }: ClayCardProps) {
  const Wrapper = onPress ? Pressable : View;

  return (
    <Wrapper
      style={[styles.card, { backgroundColor: color, borderRadius: BORDER_RADIUS[size] }, style]}
    >
      {/* Outer drop + ambient shadows via native boxShadow */}
      <View
        style={[
          styles.shadowLayer,
          { borderRadius: BORDER_RADIUS[size] },
          { boxShadow: SHADOW_CONFIG[size] },
        ]}
      >
        {/* Inset highlight: LinearGradient overlay at top edge */}
        <LinearGradient
          colors={['rgba(255,255,255,0.5)', 'rgba(255,255,255,0)']}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 0.15 }}
          style={[styles.highlightOverlay, { borderRadius: BORDER_RADIUS[size] }]}
          pointerEvents="none"
        />
        {children}
      </View>
    </Wrapper>
  );
}

const styles = StyleSheet.create({
  card: { overflow: 'visible' },
  shadowLayer: { overflow: 'hidden' },
  highlightOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '15%',
  },
});
```

### 6.4 ClayButton Component (`src/components/ClayButton.tsx`)

```tsx
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, Text, StyleSheet } from 'react-native';

type ClayButtonVariant = 'primary' | 'secondary' | 'accent' | 'coral' | 'white';
type ClayButtonSize = 'sm' | 'md' | 'lg';

interface ClayButtonProps {
  title: string;
  variant?: ClayButtonVariant;
  size?: ClayButtonSize;
  onPress?: () => void;
}

const VARIANT_COLORS: Record<ClayButtonVariant, [string, string]> = {
  primary:   [CLAYS.PRIMARY,   '#3A8FD1'],
  secondary:  [CLAYS.SECONDARY, '#7DC760'],
  accent:    [CLAYS.ACCENT,    '#E5B800'],
  coral:     [CLAYS.CORAL,     '#D97070'],
  white:     ['#FFFFFF',       '#E2E8F0'],
};

const VARIANT_TEXT: Record<ClayButtonVariant, string> = {
  primary:   '#FFFFFF',
  secondary:  '#1A2744',
  accent:    '#1A2744',
  coral:     '#FFFFFF',
  white:     '#1A2744',
};

const BUTTON_SHADOWS = {
  default: [
    { offsetX: 0, offsetY: 6, blurRadius: 0, color: 'rgba(0,0,0,0.18)' },
  ],
  pressed: [
    { offsetX: 0, offsetY: 3, blurRadius: 0, color: 'rgba(0,0,0,0.18)' },
  ],
};

export function ClayButton({ title, variant = 'primary', size = 'md', onPress }: ClayButtonProps) {
  const [bgColor, shadowColor] = VARIANT_COLORS[variant];
  const textColor = VARIANT_TEXT[variant];

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: bgColor,
          borderRadius: 20,
          boxShadow: pressed ? BUTTON_SHADOWS.pressed : BUTTON_SHADOWS.default,
          transform: [{ translateY: pressed ? 3 : 0 }],
        },
      ]}
    >
      {({ pressed }) => (
        <>
          <LinearGradient
            colors={['rgba(255,255,255,0.4)', 'rgba(255,255,255,0)']}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 0.4 }}
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
          />
          <Text style={[styles.text, { color: textColor }]}>{title}</Text>
        </>
      )}
    </Pressable>
  );
}
```

### 6.5 Animation with Reanimated

For press/spring animations, add `react-native-reanimated` (already documented as recommended for RN + claymorphism in web research):

```tsx
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

const springConfig = { damping: 12, stiffness: 180 };

function ClayCardAnimated({ children, ...props }) {
  const scale = useSharedValue(1);
  const translateY = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  // On press-in: reduce shadow offset manually via boxShadow style
  // On press-out: spring back
  const handlePressIn = () => {
    scale.value = withSpring(0.98, springConfig);
    translateY.value = withTiming(3, { duration: 100 }); // pressed-in offset
  };
  const handlePressOut = () => {
    scale.value = withSpring(1, springConfig);
    translateY.value = withSpring(0, springConfig);
  };

  return (
    <Pressable onPressIn={handlePressIn} onPressOut={handlePressOut}>
      <Animated.View style={animatedStyle}>
        <ClayCard {...props}>{children}</ClayCard>
      </Animated.View>
    </Pressable>
  );
}
```

### 6.6 CSS → RN Shadow Translation Rules

```
Web: 0 8px 0 rgba(0,0,0,0.12)
  → RN: boxShadow: [{ offsetY: 8, blurRadius: 0, color: 'rgba(0,0,0,0.12)', inset: false }]

Web: 0 4px 16px rgba(0,0,0,0.08)
  → RN: boxShadow: [{ offsetY: 4, blurRadius: 16, color: 'rgba(0,0,0,0.08)', inset: false }]

Web: inset 0 1px 0 rgba(255,255,255,0.7)
  → RN: <LinearGradient colors={['rgba(255,255,255,0.7)', 'rgba(255,255,255,0)']}
      start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 0.15 }} />

Web: inset 0 2px 0 rgba(255,255,255,0.28)  (XP panel)
  → RN: <LinearGradient colors={['rgba(255,255,255,0.28)', 'rgba(255,255,255,0)']}
      start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 0.2 }} />
```

---

## 7. Open Questions for Product Owner

1. **Minimum Android version target?** If the app must support Android 9 and below, the native inset shadow (`inset: true` on `BoxShadowValue`) will not work — only the gradient overlay will provide the highlight. Confirm whether Android 10+ coverage is acceptable or if pre-Android 10 support is required.

2. **Interactive states on Android vs iOS parity?** The gradient overlay approach produces identical results on both platforms for the inset highlight. However, the pressed-state shadow reduction (translateY + reduced boxShadow offsetY) relies on RN's native shadow APIs which behave slightly differently on Android (elevation-based) vs iOS (CGContext). Should the pressed visual be identical across platforms, or is platform-native behavior acceptable?

3. **Complex clay components (testimonial cards, XP panels, course cards)?** The implementation sketch covers `ClayCard` and `ClayButton`. The full web design system includes multi-region cards (e.g., `clay-course-card` with colored XP panel + white body). Should these be single unified `ClayCard` variants accepting region-specific props, or separate components (`ClayCard.XP`, `ClayCard.Body`)?

4. **Animation scope?** The `clay-float` and `clay-shimmer` animations add significant visual polish. Confirm whether these are in scope for Phase 2, or deferred to a later iteration. Note: shimmer requires animated `LinearGradient` which adds complexity.

5. **Dark mode variant?** The web claymorphic tokens are designed for a warm white base. Should RN include a dark-mode token set with adjusted shadow opacity and highlight colors, or is only the current light-mode design in scope?

---

## 8. References

- [React Native 0.76 New Architecture: boxShadow & filter props](https://reactnative.dev/blog/2024/10/23/release-0.76-new-architecture#box-shadow-and-filter-style-props)
- [React Native View Style Props — boxShadow](https://reactnative.dev/docs/view-style-props)
- [BoxShadowValue Object Type — React Native](https://reactnative.dev/docs/boxshadowvalue)
- [react-native-shadow-2 GitHub](https://github.com/ftzi/react-native-shadow-2) — explicitly recommends native boxShadow instead
- [react-native-neomorph-shadows npm](https://www.npmjs.com/package/react-native-neomorph-shadows) — deprecated, incompatible with Expo SDK 52+
- [react-native-inner-shadow GitHub](https://github.com/ShinMini/react-native-inner-shadow) — fallback for pre-RN 0.76 projects
- [expo-linear-gradient documentation](https://docs.expo.dev/versions/latest/sdk/linear-gradient/)
- [Shopify React Native Skia — Shadows](https://shopify.github.io/react-native-skia/docs/image-filters/shadows/) — alpha/canary only
- [StackOverflow: Inner shadow in React Native](https://stackoverflow.com/questions/79143681/how-to-create-an-inner-shadow-effect-similar-to-box-shadow-inset-in-react-nativ)
