# Workstream A Phase 1 Review

**Files Reviewed:** 18
**Date:** July 23, 2026
**Reviewer:** Senior Code Reviewer Agent
**Phase:** React Native Phase 1 (Shell)

---

## Verdict: APPROVED_WITH_MINOR_ISSUES

The Phase 1 shell implementation is structurally sound. TypeScript coverage is solid, the API layer follows Axios conventions correctly, auth flow logic is correct, and there are no security vulnerabilities or runtime crash risks. A handful of async error-handling gaps and one unused prop should be addressed before Phase 2 builds on top of this foundation.

**Critical Issues:** 0
**Important Issues:** 7
**Minor Issues:** 5

---

## Critical Issues (block merge)

_(none)_

---

## Important Issues (should fix)

### ISSUE-001: Unused `onLogout` prop in AppNavigator
- **File:** `mobile/rn/src/navigation/AppNavigator.tsx`
- **Lines:** 19, 24
- **Category:** Code Quality
- **Description:** `AppNavigator` accepts `onLogout` in its `AppNavigatorProps` interface and destructures it in the component, but it is never used. The logout button is absent from the UI, so this prop currently does nothing.
- **Impact:** Dead code. In Phase 2 when a logout button is added, the developer may incorrectly wire up the callback expecting it to work, only to find it's not wired to anything.
- **Suggested Fix:**
  Either remove the prop entirely until it is needed, or wire it to a logout button in the Home screen header:
```tsx
// Option A: Remove from props until used
interface AppNavigatorProps {
  isAuthenticated: boolean;
  onLoginSuccess: () => void;
}

// Option B: Wire to a logout header button
<Stack.Screen name="Home">
  {() => <HomeScreen onLogout={onLogout} />}
</Stack.Screen>
```

---

### ISSUE-002: Missing error handling in `handleCoursePress`
- **File:** `mobile/rn/src/screens/HomeScreen.tsx`
- **Lines:** 71–79
- **Category:** Error Handling / Code Quality
- **Description:** `handleCoursePress` is an `async` function but has no `try/catch`. If `fetchLessons` throws (e.g., network failure), the error propagates silently and the UI may be left in an inconsistent state (selected course highlighted but no lessons shown).
- **Impact:** Silent failure. User sees selected course but no lessons, with no error message.
- **Suggested Fix:**
```tsx
const handleCoursePress = async (course: Course) => {
  if (selectedCourse === course.id) {
    setSelectedCourse(null);
    setLessons([]);
  } else {
    try {
      setSelectedCourse(course.id);
      await fetchLessons(course.id);
    } catch (err) {
      setError('Failed to load lessons');
      setSelectedCourse(null);
      console.error('Lessons fetch error:', err);
    }
  }
};
```

---

### ISSUE-003: `useAuth` useEffect lacks try/catch
- **File:** `mobile/rn/src/hooks/useAuth.ts`
- **Lines:** 10–21
- **Category:** Error Handling
- **Description:** The `useEffect` that loads the token on mount calls `SecureStore.getItemAsync` without a try/catch. While the `.catch()` handler exists on the Promise chain, the pattern is fragile — if a synchronous error occurs or the promise rejects in an unexpected way, it could cause an unhandled rejection.
- **Impact:** Potential unhandled promise rejection in development mode.
- **Suggested Fix:**
```tsx
useEffect(() => {
  const loadToken = async () => {
    try {
      const t = await SecureStore.getItemAsync(TOKEN_KEY);
      setToken(t);
    } catch (error) {
      console.error('Failed to load auth token:', error);
      setToken(null);
    } finally {
      setLoading(false);
    }
  };
  loadToken();
}, []);
```

---

### ISSUE-004: Direct call to render function in FlatList `ListFooterComponent`
- **File:** `mobile/rn/src/screens/HomeScreen.tsx`
- **Lines:** 147–149
- **Category:** React Patterns / Code Quality
- **Description:** `renderLessonItem` is defined as a regular function inside the component body. In `ListFooterComponent`, it is called directly: `renderLessonItem({ item: lesson })`. This circumvents FlatList's render virtualization — these lesson items will re-render on every parent re-render regardless of viewport. They are also rendered unconditionally even if the list is empty.
- **Impact:** Performance degradation with large lesson lists; potential inconsistent rendering behavior.
- **Suggested Fix:**
  Refactor `renderLessonItem` into a separate component and use it inside a keyed map:
```tsx
const LessonRow: React.FC<{ item: Lesson }> = ({ item }) => (
  <TouchableOpacity style={styles.lessonItem} onPress={() => handleLessonPress(item)}>
    <Text style={styles.lessonTitle}>{item.title}</Text>
    <Text style={styles.lessonArrow}>→</Text>
  </TouchableOpacity>
);

// In ListFooterComponent:
<FlatList
  data={lessons}
  renderItem={({ item }) => <LessonRow item={item} />}
  keyExtractor={(item) => item.id}
  scrollEnabled={false}
/>
```

---

### ISSUE-005: Potential information disclosure in Axios request interceptor
- **File:** `mobile/rn/src/services/api.ts`
- **Lines:** 21–23
- **Category:** Security
- **Description:** The request interceptor calls `console.error` with the raw `error` object when token retrieval fails. In production, console output may be captured by crash reporting tools (Sentry, Firebase Crashlytics) or device logs, potentially exposing internal system details about SecureStore failures.
- **Impact:** Low severity — the error is a library-level failure, not user data. But in adversarial environments (jailbroken devices, rooted emulators), verbose error logs are a risk.
- **Suggested Fix:**
```tsx
} catch (error) {
  // Log only a safe diagnostic message, no raw error object
  console.warn('Auth: Token retrieval skipped');
}
```

---

### ISSUE-006: Duplicate SecureStore key definitions
- **Files:** `mobile/rn/src/utils/secureStorage.ts` (line 3) and `mobile/rn/src/hooks/useAuth.ts` (line 4)
- **Category:** Maintainability
- **Description:** The constant `TOKEN_KEY = 'jwt_token'` is defined independently in two separate files. If the token storage key needs to change in the future, both locations must be updated — a potential source of bugs.
- **Impact:** Maintainability risk. If not caught, changing one and not the other will cause silent auth failures.
- **Suggested Fix:**
  Extract to a shared constants file:
```tsx
// mobile/rn/src/constants/auth.ts
export const TOKEN_KEY = 'jwt_token';
export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000';
```
Then import in both files.

---

### ISSUE-007: ESLint disable directive suppressing type safety in glbCache
- **File:** `mobile/rn/src/utils/glbCache.ts`
- **Line:** 1
- **Category:** TypeScript Quality
- **Description:** The file begins with `/* eslint-disable @typescript-eslint/no-explicit-any */` to suppress errors from casting `ExpoFileSystem as any`. This is a common pattern for working around incomplete type definitions, but it disables type checking for the entire file rather than just the specific line(s) that need it.
- **Impact:** Any future implicit `any` usage in this file will go undetected.
- **Suggested Fix:**
  Narrow the disable directive to only the specific cast:
```tsx
import * as ExpoFileSystem from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHE_KEY_PREFIX = 'glb_cache_';
const FileSystem = ExpoFileSystem as unknown as typeof ExpoFileSystem;
// Alternatively, define a minimal interface:
interface IFileSystem {
  cacheDirectory: string | null;
  documentDirectory: string | null;
  getInfoAsync(path: string): Promise<{ exists: boolean }>;
  makeDirectoryAsync(path: string, opts: object): Promise<void>;
  createDownloadResumable(url: string, path: string): {
    downloadAsync(): Promise<{ uri: string }>;
  };
}
const FileSystem: IFileSystem = ExpoFileSystem as IFileSystem;
```

---

## Minor Issues (note only)

### MINOR-001: Console.log in production code
- **Files:** `mobile/rn/src/App.tsx` (line 11), `mobile/rn/src/bridge/UnityBridgeModule.ts` (lines 36, 55, 63, 70)
- **Category:** Code Quality
- **Description:** `console.log` and `console.warn` calls remain in production code. For a Phase 1 shell this is acceptable, but these should be replaced with a proper logging abstraction before production release to allow log level filtering.
- **Suggested Fix:** Consider wrapping in `__DEV__` guards or using a library like `react-native-loglevel`.

---

### MINOR-002: Hardcoded fallback API URL
- **File:** `mobile/rn/src/services/api.ts` (line 5)
- **Category:** Configuration
- **Description:** `const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000'`
  Falling back to `localhost:8000` in production builds is unlikely to work (mobile devices won't resolve localhost to the dev machine). This should either fail fast or use a proper staging URL.
- **Suggested Fix:**
```tsx
const API_BASE = process.env.EXPO_PUBLIC_API_URL;
if (!API_BASE) {
  throw new Error('EXPO_PUBLIC_API_URL environment variable is required');
}
```

---

### MINOR-003: `flashcardApi` path inconsistency
- **File:** `mobile/rn/src/services/api.ts` (line 52)
- **Category:** API Design
- **Description:** `flashcardApi.getFlashcard` uses `/flashcard/${qrId}` while other endpoints use trailing slashes (`/courses/`, `/courses/${id}/lessons/`). Inconsistent trailing slashes can cause routing issues on some server implementations.
- **Suggested Fix:** Standardize — add trailing slashes to all endpoints or remove them all:
```tsx
getFlashcard: (qrId: string) =>
  api.get<ARExperienceResponse>(`/flashcard/${qrId}/`),
```

---

### MINOR-004: Text used as interactive element in FlashcardOverlay
- **File:** `mobile/rn/src/components/FlashcardOverlay.tsx` (lines 36–37)
- **Category:** Accessibility
- **Description:** The audio button is rendered as a `<Text>` component with `onPress`, not a `<TouchableOpacity>` or `<Pressable>`. This is inaccessible to screen readers and lacks native touch feedback.
- **Suggested Fix:**
```tsx
import { Pressable } from 'react-native';
// ...
<Pressable style={styles.audioButton} onPress={handlePlayAudio}>
  <Text style={styles.audioButtonText}>🔊 Play Audio</Text>
</Pressable>
```

---

### MINOR-005: Missing return type on `useAuth` hook
- **File:** `mobile/rn/src/hooks/useAuth.ts` (line 6)
- **Category:** TypeScript Quality
- **Description:** `useAuth` is a custom hook but has no explicit return type annotation. While TypeScript infers it correctly from the return statement, an explicit return type improves IDE tooling and documents the contract.
- **Suggested Fix:**
```tsx
interface UseAuthReturn {
  token: string | null;
  loading: boolean;
  saveToken: (token: string) => Promise<void>;
  clearToken: () => Promise<void>;
  isAuthenticated: boolean;
}

export const useAuth = (): UseAuthReturn => { /* ... */ }
```

---

## Strengths

- **TypeScript coverage is comprehensive.** All component props are typed, hooks have typed state, and the API response types match the backend schema. No implicit `any` was found outside the intentionally suppressed `glbCache.ts` cast.

- **Auth flow logic is correct.** Token storage uses `SecureStore` (appropriate for JWT storage on mobile), the interceptor pattern for attaching Bearer tokens is idiomatic, and 401 responses correctly clear the stored token.

- **API layer is clean and maintainable.** Separating `authApi`, `coursesApi`, `flashcardApi`, and `arConfigApi` into named exports makes call sites readable and the Axios instance is correctly configured with a 15s timeout.

- **Component structure follows React best practices.** All screens are top-level components, styles are defined with `StyleSheet.create` (not inline objects), and state is properly lifted where needed.

- **UnityBridgeModule is a well-structured bridge abstraction.** The class-based singleton pattern with availability checking, event subscription cleanup, and graceful fallback is appropriate for a Phase 1/Phase 2 split implementation.

- **ARExperienceMapper is a clean data transformation.** The one-to-one field mapping between `ARExperienceResponse` and `UnityARExperiencePayload` is clear and easy to extend.

- **Error handling in `AuthScreen`** correctly narrows the caught error with `instanceof Error` and avoids exposing Axios error structures to the UI.

---

## Summary

| Severity   | Count |
|------------|-------|
| Critical   | 0     |
| Important  | 7     |
| Minor      | 5     |

**Recommendation:** The code is ready to serve as the Phase 2 foundation. The 7 Important issues should be addressed in a follow-up patch before the auth/logout flows and AR screen are wired up in Phase 2. The Minor issues are non-blocking but should be cleaned up before production.

---

## Fix Priority Order

1. **ISSUE-002** — Missing try/catch in `handleCoursePress` (user-facing silent failures)
2. **ISSUE-003** — Unhandled promise in `useAuth` useEffect
3. **ISSUE-001** — Remove dead `onLogout` prop or wire it up
4. **ISSUE-004** — FlatList virtualized lessons (performance)
5. **ISSUE-005** — Reduce console error verbosity in API interceptor
6. **ISSUE-006** — Deduplicate `TOKEN_KEY` constant
7. **ISSUE-007** — Narrow ESLint disable in `glbCache.ts`

**Next Step:** Hand off to fix agent with this issue list.

---

## Fix Agent Report — July 23, 2026

**Fix Agent:** Senior Fix Agent
**Branch:** `feature/mobile-ar-mvp`
**Files Modified:** 6

| # | Issue | File(s) | Status | Notes |
|---|-------|---------|--------|-------|
| ISSUE-001 | Unused `onLogout` prop | `AppNavigator.tsx` | **Fixed** | Removed `onLogout` from `AppNavigatorProps` interface and destructuring. |
| ISSUE-002 | Missing try/catch in `handleCoursePress` | `HomeScreen.tsx` | **Fixed** | Wrapped `fetchLessons` call in try/catch; sets inline error + resets `selectedCourse` on failure. |
| ISSUE-003 | Fragile Promise chain in `useAuth` useEffect | `useAuth.ts` | **Fixed** | Rewritten as named async function `load()` with cancellation guard. Also added explicit `UseAuthReturn` interface (covers MINOR-005). |
| ISSUE-004 | Direct render function call in FlatList ListFooterComponent | `HomeScreen.tsx` | **Fixed** | Extracted `LessonRow` as a proper component; replaced `.map()` + direct call with a nested FlatList for correct virtualization. |
| ISSUE-005 | `console.error` leaking raw error in request interceptor | `api.ts` | **Fixed** | Removed `console.error`; silent catch block with inline comment. Also fixed 401 handler to use imported `TOKEN_KEY`. |
| ISSUE-006 | Duplicate `TOKEN_KEY` across files | `secureStorage.ts`, `useAuth.ts`, `api.ts` | **Fixed** | Exported `TOKEN_KEY` from `secureStorage.ts`; imported in `useAuth.ts` and `api.ts`. |
| ISSUE-007 | File-wide `eslint-disable @typescript-eslint/no-explicit-any` | `glbCache.ts` | **Fixed** | Replaced with typed `IFileSystem` interface and a minimal safe cast `ExpoFileSystem as IFileSystem`. Removed the file-wide directive and eliminated all `any` types. |

