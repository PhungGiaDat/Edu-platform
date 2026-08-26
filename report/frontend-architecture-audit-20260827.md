# Frontend architecture audit

Date: 2026-08-27

## Conclusion

The frontend is primarily organized by technical layer (`pages`, `components`, `hooks`, `services`, `styles`) rather than by product domain. Domain ownership is therefore fragmented: a learner flow must import from multiple global folders, while shared CSS and interface definitions are scattered. This is a structural clean-code issue, not merely a formatting issue.

## Evidence

- `src` contains 111 components, 39 pages, 37 hooks, and 23 services, but only partial domain folders (`animals`, `pets`, `ar`, `admin`).
- CSS is global and oversized: `styles/claymorphic-utilities.css` (1,951 lines), `styles/animals.css` (1,121), `styles/course-catalog.css` (883), and `styles/sidebar.css` (493). Pages/components import these global files directly.
- Types are split between `src/types.ts`, `src/types/`, `src/core/types/`, `src/lib/combo/types.ts`, and local interfaces in pages/hooks/services. For example, AR types live in `useMultiFlashcard.ts`, `LearnARV2.tsx`, `core/types`, and root `types.ts`.
- Major pages coordinate unrelated concerns: `LearnARV2.tsx` imports AR UI, gamification, pets, state hooks, multiple services, API transport, and feature types.

## Target direction

Adopt a feature/domain-first layout while retaining a deliberately small shared layer:

```text
src/
  app/                    # routes, providers, global CSS, app bootstrap
  shared/                 # ui primitives, lib, http transport, design tokens
  features/
    learning/             # course, lesson, quiz, game, flashcard
    ar/                   # scanner, viewer, AR state, AR contracts
    gamification/         # XP, streak, badges, leaderboard, stickers
    pets/                 # pet UI, state, API, contracts
    pronunciation/        # speech UI, services, API, contracts
    auth/
    admin/
  pages/                  # route composition only; no domain logic
```

Every feature should own its `api.ts`, `types.ts`, `hooks/`, `components/`, and styles (CSS module or a colocated feature stylesheet). Cross-feature dependencies go through an explicit public `index.ts`, not deep imports.

## Non-breaking migration sequence

1. Fix build-only cleanup first (duplicate App imports and unused test variable).
2. Create a feature folder and move one leaf component with its CSS/types unchanged; add re-export shims at old paths.
3. Move one complete low-risk domain (pets or leaderboard) with tests intact.
4. Extract shared TTL cache and HTTP transport, but preserve existing URLs, payloads, auth, errors, and timing.
5. Refactor AR last, first moving presentational overlays and their local types; keep the orchestration route as an adapter until focused contract tests exist.

## Verification state

Two release-safe slices are now implemented:

- `pets` owns its page, hook, and components under `src/features/pets/`.
- `gamification` owns its components, hook, service, and type contracts under `src/features/gamification/`.
- `pronunciation` owns its practice/game components, speech hook, and pronunciation-specific services under `src/features/pronunciation/`; `AudioService` intentionally remains shared.
- `courses` owns its course services, course type contracts, and learning-block components under `src/features/courses/`; route pages remain in place for release safety.

The old `pages/PetsPage`, `hooks/usePets`, `components/pets/*`, `hooks/useGamification`, `services/GamificationService`, `types/gamification`, `components/Gamification/*`, `components/PronunciationPractice`, `components/game/PronunciationGame`, `hooks/useSpeech`, pronunciation-service paths, and course service/type/component paths are compatibility re-exports, so existing consumers were not changed. The build blockers in `App.tsx`, `__tests__/AIChatBuddy.test.tsx`, and `DictionaryPage.tsx` were corrected without altering behavior. `npm run build`, `npm run lint -- --quiet`, and `git diff --check` pass. Existing non-error lint warnings outside this migration remain out of scope.
