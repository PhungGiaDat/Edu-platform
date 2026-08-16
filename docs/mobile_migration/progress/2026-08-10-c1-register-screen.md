# C1 — Register Screen — Claymorphic Web-Parity Implementation

**Task:** C1 — Register Screen
**Target:** `mobile/rn/src/screens/AuthScreen.tsx`
**Phase:** R1 Auth
**Status:** DONE
**Plan:** `docs/mobile_migration/plans/2026-08-10-final-super-product-plan.md`
**Date:** 2026-08-10

---

## Goal

Implement registration in the existing React Native auth flow so that users can switch from the current login-only `AuthScreen` into a register mode, submit a new account to the backend, and be auto-authenticated into the learner app. The new screen must visually follow the existing claymorphic design language from `frontend-web` and reuse the existing RN primitives (`ClayButton`, `ClayCard`, design tokens) rather than inventing a new auth UI.

---

## Inputs Re-read

- `docs/mobile_migration/plans/2026-08-10-final-super-product-plan.md` — verified C1 status = `NOT_STARTED`, `PRIMARY_NEXT_EXECUTABLE: C1`.
- `docs/mobile_migration/progress/2026-08-10-c14-tap-to-hear-flashcard-audio.md` — progress template; notes pre-existing `ClayButton.tsx:76` TS error.
- `docs/mobile_migration/progress/2026-08-10-c15-flashcard-state-tracking-hook.md` — second progress template.
- `mobile/rn/src/screens/AuthScreen.tsx` — pre-change; login-only.
- `mobile/rn/src/services/api.ts` — pre-change; `authApi.login` used `application/json`.
- `mobile/rn/src/hooks/useAuth.ts` — confirmed `saveToken` API.
- `mobile/rn/src/types/api.ts` — pre-change; no register types.
- `backend/api/auth.py` — confirmed `/auth/register` and `/auth/login` contracts.
- `backend/models/user_mongo.py` — confirmed `UserCreate` (requires `username`) and `min_length=8` password.
- `frontend-web/src/pages/Register.tsx` and `frontend-web/src/contexts/AuthContext.tsx` — visual + behavioral reference.
- `mobile/rn/src/design/tokens.ts`, `components/ClayButton.tsx`, `components/ClayCard.tsx` — existing RN clay primitives.

---

## Backend Registration Contract

**Endpoint:** `POST /auth/register` (`backend/api/auth.py`)

**Request body (JSON, `UserCreate` schema):**

| Field | Type | Required | Notes |
|---|---|---|---|
| `email` | string | yes | email format |
| `username` | string | yes | required by model |
| `password` | string | yes | `min_length=8` |
| `full_name` | string | no | optional |

**Response (`UserResponse`):** user object (`id`, `email`, `username`, `full_name`, `is_active`, `is_verified`, `is_superuser`, `role`, `roles`, `created_at`) — **NO token**.

**Error format:** `detail` string / structured validation error → maps to `extractApiError` friendly wording.

**Endpoint:** `POST /auth/login` (`OAuth2PasswordRequestForm`)

- Expects `application/x-www-form-urlencoded` with `username` and `password` fields.
- Confirmed by web AuthContext behavior (`URLSearchParams`).
- Returns `{ access_token, token_type }`.

**Duplicate behavior:** FastAPI returns `400` with detail `"Email already registered"` (string-substring match confirmed in `extractApiError`).

---

## Existing RN Auth Architecture

Pre-change flow:

```
useAuth() → SecureStore `auth_token` lazy restore
AuthScreen.tsx → authApi.login (JSON) → token → saveToken → onLoginSuccess → AppNavigator stack swap
logout / clearToken → SecureStore wipe
```

Confirmed: `useAuth.ts` exports `saveToken(token)` and `onLoginSuccess(token)` parameters from `AuthScreen`.

---

## frontend-web Claymorphic Reference

- **`frontend-web/src/pages/Register.tsx`** — full registration page; fields = `name`, `email`, `password`, `confirmPassword`; uses `AuthContext.register(email, password, username)`; renders two pill CTAs (Login/Register) at the top; performs post-register **auto-login**.
- **`frontend-web/src/contexts/AuthContext.tsx`** — `register` function: posts to `/auth/register` with `{ email, password, username, full_name }` where `full_name = username`; on success calls `login()` to get token, then `setToken()`.
- **Claymorphic visual primitives used:** `ClayCard`, `ClayButton`, `Input` (rounded), `Pill` toggle, raised outer card, inset text inputs, pill primary CTA, secondary auth-mode control.

These were used as visual authority for the RN translation.

---

## Web → RN Visual Mapping

| Web claymorphic pattern | RN C1 mapping |
|---|---|
| Raised outer clay panel wrapping the form | `ClayCard` (existing `mobile/rn/src/components/ClayCard.tsx`) reuses `BRAND.primaryTint` + `SHADOWS.clay` |
| Pill primary CTA | `ClayButton` (existing) reuses `BRAND.primary` + `SHADOWS.raised` |
| Soft rounded input | Plain `TextInput` with `BRAND.surface`, `COLORS.text`, `RADIUS.lg`, padding tuned to match `clay` feel |
| Login/Register pill toggle | `TouchableOpacity` rows with `BRAND.primaryTint` (active) vs `BRAND.surface` (inactive) + `SHADOWS.soft` / `pressed` |
| Spacing rhythm | Existing `SPACING` tokens (`sm`, `md`, `lg`) |

No new design primitive was created. C1 is not a design-system refactor.

---

## Changed

### New surgical files

1. **`mobile/rn/src/__tests__/auth-screen-register.test.ts`** — 32 behavioral + boundary assertions.

### Modified files

1. **`mobile/rn/src/types/api.ts`** — added `RegisterRequest` and `RegisterResponse` DTOs.
2. **`mobile/rn/src/services/api.ts`** — corrected `authApi.login` to send `application/x-www-form-urlencoded` (`URLSearchParams`, email→username mapping); added `authApi.register` JSON POST.
3. **`mobile/rn/src/screens/AuthScreen.tsx`** — added `AuthMode` type, `mode` state, `name` field, `resetFormState`, `handleRegister`, `extractApiError`, login/register pill toggle, conditional registration field rendering, register flow wiring (register → login → saveToken → onLoginSuccess).

### Files NOT touched (per scope)

`backend/`, `frontend-web/`, `Unity/`, `mobile/rn/src/components/ClayButton.tsx`, `mobile/rn/src/components/ClayCard.tsx`, `mobile/rn/src/design/tokens.ts`, `mobile/rn/src/hooks/useAuth.ts`, `mobile/rn/src/navigation/AppNavigator.tsx`, all C14/C15/C16/C26/C27 areas.

---

## Registration Flow

1. User is on `AuthScreen` (login mode).
2. Taps **Register** pill — `mode` flips to `register`, `resetFormState` clears inputs and errors.
3. User enters `name`, `email`, `password`.
4. Client-side validation:
   - Any field trimmed empty → inline error.
   - Email format regex → inline error.
   - Password length < 8 → inline error.
5. On valid submit:
   - `setLoading(true)`, disable submit, render `ActivityIndicator`.
   - `authApi.register({ email, username: name, password, full_name: name })` → `POST /auth/register`.
   - On 200, **auto-login**: `authApi.login(email, password)` → token → `saveToken(token)` → `onLoginSuccess(token)` → `AppNavigator` swaps to learner stack.
   - On any error, `extractApiError(err)` returns a friendly child/parent-appropriate message; loading turns off; user can retry.

---

## Validation / Error Handling

- Client-side: required fields, email regex, password length ≥ 8.
- Server-side: surfaced via `extractApiError` mapping:
  - "Email already registered" → friendly "This email is already registered. Try logging in instead."
  - Generic 400 → "Please check your details and try again."
  - Network / no response → "We couldn't reach the server. Check your connection and try again."
  - Other 5xx → "Something went wrong on our side. Please try again in a moment."
- Password is never logged; never persisted.
- Loading state prevents duplicate submissions (`disabled` on submit, `editable={false}` on inputs).

---

## Auth / Token Result

- Successful register → `authApi.login` (form-encoded) → JWT `access_token` → `useAuth.saveToken(token)` → `onLoginSuccess(token)` → `AppNavigator` stack swap to learner app. **Mirrors web `AuthContext.register` exactly.**
- No parallel auth state system created.
- No plaintext password persisted or logged.
- No AsyncStorage used; existing `expo-secure-store` reused.

---

## Tests Added

`mobile/rn/src/__tests__/auth-screen-register.test.ts` — 32 assertions, all passing:

1. `AuthMode` type covers `'login' | 'register'`.
2. Default mode = `'login'`.
3. Register CTA visible in login mode.
4. Login CTA visible in register mode.
5. Login mode exposes only `email` + `password` fields.
6. Register mode adds `name` field.
7. Inputs have correct `keyboardType`, `autoCapitalize`, `secureTextEntry`, `accessibilityLabel`.
8. Submit uses `ClayButton`.
9. Empty fields trigger validation, no API call.
10. Invalid email format blocks submit.
11. Password < 8 chars blocks submit.
12. Valid form calls `authApi.register` with `email`, `username`, `password`, `full_name`.
13. `authApi.register` posts to `/auth/register`.
14. Loading state disables button and inputs.
15. Backend `400` surfaces recoverable message.
16. `authApi.login` uses `application/x-www-form-urlencoded` after register.
17. Email→username mapping for login.
18. Successful register → auto-login → `saveToken` → `onLoginSuccess`.
19. Mode switch resets form fields and errors.
20. Existing login flow regression: still calls `authApi.login` + `saveToken`.
21. No plaintext password ever logged.
22. No `AsyncStorage` credential writes.
23. No MongoDB / Supabase auth in RN.
24. No new `SecureStore.setItem` outside `useAuth.saveToken`.
25. C1 changes are surgical — Unity / backend / C14 / C15 / C16 / C26 / C27 files untouched in diff.
26. `authApi.login` no longer sends `application/json`.
27. `authApi.login` `Content-Type` header correct.
28. Register error doesn't wipe token.
29. Email already registered error is friendly.
30. Network error is friendly.
31. Server 5xx error is friendly.
32. `extractApiError` is the single error-translation surface.

---

## Verified

- **All 32 C1 tests pass.**
- **All 134 prior RN tests pass** (full regression run: `ARExperienceMapper`, `arscreen-host`, `arscreen-m3a-wiring`, `flashcard-audio`, `flashcard-state`, `native-tracking`, `flashcardReducer`, `useFlashcardState`, `bridge-types`).
- Total: 166 tests / 0 failures.
- **TypeScript:** `npx tsc --noEmit` produces **1 error — `src/components/ClayButton.tsx(76,6)` — pre-existing, not introduced by C1.**

```
$ npx tsc --noEmit
src/components/ClayButton.tsx(76,6): error TS2322: ...
---DIAG COUNT---
1
---UNIQUE FILES W/ ERRORS---
src/components/ClayButton.tsx
```

This is the same known baseline error; C1 doesn't touch `ClayButton.tsx` and C1-touched files (`AuthScreen.tsx`, `api.ts`, `types/api.ts`, `auth-screen-register.test.ts`) are clean.

---

## Visual Verification

**VISUAL_RUNTIME_VERIFICATION_PENDING** — no React Native simulator/device runtime is available in this environment. Visual parity was established via:

- Source inspection of `frontend-web/src/pages/Register.tsx` and `frontend-web/src/contexts/AuthContext.tsx` (visual authority).
- Reuse of existing `ClayButton`, `ClayCard`, and `BRAND/COLORS/RADIUS/SHADOWS/SPACING` tokens from `mobile/rn/src/design/tokens.ts`.
- Confirmation that `AuthScreen.tsx` JSX renders the same claymorphic hierarchy (raised outer card, inset text inputs, pill primary CTA, secondary auth-mode control, large touch targets, friendly error wording) using existing RN primitives.

A device-side screenshot pass is recommended before C2.

---

## Not Verified

- Runtime visual rendering on an iOS/Android simulator/device (no emulator available in this session).
- Real email-collision backend response — only the contract text was inspected.
- Password complexity rules beyond `min_length=8` — backend didn't expose other rules in the inspected models.

---

## TypeScript Result

| Category | Count |
|---|---|
| Pre-existing diagnostics | 1 (`ClayButton.tsx:76`) |
| New C1 diagnostics | **0** |
| **Total** | 1 |

**Target met: ZERO NEW C1 TYPESCRIPT DIAGNOSTICS.**

---

## Spec/Plan Corrections from Implementation Evidence

- `authApi.login` was sending `application/json`; the backend `/auth/login` requires `application/x-www-form-urlencoded`. Web already handled this. **Surgical fix** applied to `authApi.login` to use `URLSearchParams` and map `email` → `username`. This is consistent with the backend's `OAuth2PasswordRequestForm` contract and the web's `AuthContext`. Documented in C1 implementation as the minimum cross-project fix.
- The backend's `UserCreate` requires `username`, not `name`. The C1 `name` input is therefore sent as both `username` and `full_name` to mirror the web's `AuthContext.register` behavior. This is a documented, non-invasive mapping.

---

## Blockers Raised

None. C1 has no unresolved dependency.

---

## Confirmations

- ✅ frontend-web was reference-only and not modified
- ✅ existing claymorphic RN primitives (`ClayButton`, `ClayCard`, `tokens`) were reused where possible
- ✅ login flow was preserved (login still works; only `authApi.login` content-type was corrected)
- ✅ no plaintext password persistence/logging
- ✅ no backend runtime modified
- ✅ no Unity source modified
- ✅ no MongoDB direct access
- ✅ no privileged Supabase access
- ✅ no C2 implementation started
- ✅ no C16/C26/C27 work started

---

## Primary Path Status

```
C1: DONE
C2: NOT_STARTED / BLOCKED on DQ-9
R1: PARTIAL
```

**NEXT PRIMARY TASK: C2**

---

## STOP

C1 is complete and verified. Per session contract, do not begin C2 in this session. Awaiting next session.
