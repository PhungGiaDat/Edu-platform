# React Native Learner Migration — Specification Index

**Authority:** All spec topics in this workspace are authoritative for the mobile learner product. Code conforms to spec; spec does not bend to code. `docs/unity_ar/spec/` remains authoritative for the Unity/native-AR domain.

## Status key
- `draft` — open design questions
- `approved` — all questions resolved; code must conform
- `superseded` — replaced by a newer spec

## Spec Topics

| ID | File | Status | Summary |
|----|------|--------|---------|
| INV | `web-feature-inventory.md` | approved | Raw Web → RN feature inventory + backend endpoint surface (73 features across 13 domains A–O) |
| PARITY | `learner-parity-matrix.md` | approved | Authoritative Web → RN feature parity matrix (18 KEEP, 37 ADAPT, 2 MERGE, 2 DEFER, 2 WEB_ONLY, 1 LEGACY, 10 DECISION_REQUIRED; 57 implementation target) |
| SPEC | `learner-product-spec.md` | approved | Mobile learner product requirements (69 MOB-*-REQ across 13 requirement namespaces) |
| NAR-INT | `native-ar-integration.md` | approved | Native AR product integration boundary (entry/navigation only; delegates engine behavior to `docs/unity_ar/`) |
| FLASH | `flashcard-expansion.md` | approved | Tap-to-hear audio, visual interaction feedback, flashcard state tracking (NEW/SEEN/PRACTICING/LEARNED) |
| GAME | `game-catalog.md` | approved | Educational mini-game catalog (DragMatch, MemoryPairs, ColorLearn core; ListenChoose, SoundMatch, QuickTap, FeedThePet, FindIt bonus) |
| 3DINT | `interactive-3d-model-spec.md` | approved | Native 3D model touch interaction (touch → raycast → hotspot → animation → audio → event pipeline; Cat first fixture) |
| PRON-SPEC | `pronunciation-ai-spec.md` | approved | Pronunciation AI product spec (recording UX, child-friendly scoring bands, audio categories, privacy boundary) |
| PRON-ML | `pronunciation-ai-ml-plan.md` | approved | Pronunciation AI ML workstream (PRON-A0 through PRON-A9 + PRON-B0; dataset, fine-tuning, evaluation, calibration) |
| LEXI-RAG | `lexi-agentic-rag-spec.md` | draft | Lexi Agentic RAG with TokenRouter multi-model routing (Qwen planner / DeepSeek generator / Nemotron validator + fallback cascade + circuit breaker) and the equivalent React Native chat screen with model picker |

## Requirement ID Conventions

Requirement IDs in this workspace MUST NOT collide with the Mobile AR IDs owned by `docs/unity_ar/spec/` (`MOB-AR-REQ-*`, `MOB-QR-REQ-*`, `MOB-PERM-REQ-*`, `MOB-LOAD-REQ-*`, `MOB-TRACK-REQ-*`, `MOB-COMBO-REQ-*`, `MOB-GAME-REQ-*`, `MOB-LIFE-REQ-*`, `MOB-ERR-REQ-*`, `MOB-FALLBACK-REQ-*`).

| Prefix (this workspace) | Domain |
|-------------------------|--------|
| `MOB-AUTH-REQ-xxx` | Auth / app shell / guest mode |
| `MOB-COURSE-REQ-xxx` | Course catalog, detail, enrollment, lesson navigation |
| `MOB-PATH-REQ-xxx` | Learning path / topic selection / daily goals / onboarding |
| `MOB-LESSON-REQ-xxx` | Lesson player (intro, story/media, game, vocab, reading, pronunciation, quiz, finish/reward) |
| `MOB-FLASH-REQ-xxx` | Flashcard list, practice, audio, game launch, QR entry |
| `MOB-MINIGAME-REQ-xxx` | Mini-games (KEEP/ADAPT per-game decisions) |
| `MOB-PRON-REQ-xxx` | Pronunciation (recording, assessment, feedback, retry, permissions, fallback) |
| `MOB-GAM-REQ-xxx` | Gamification (XP, levels, streaks, badges, stickers, rewards, leaderboard, events) |
| `MOB-PROGRESS-REQ-xxx` | Profile / progress dashboard / achievements / reports |
| `MOB-PET-REQ-xxx` | Pets (collection, active pet, unlock, feed, play, evolution, viewer) |
| `MOB-SESSION-REQ-xxx` | Learning-session lifecycle (start/end, timer, idle, warning, hard limit, break, background/foreground) |
| `MOB-CHAT-REQ-xxx` | AI chat (Lexi / RAG) — optional, not mandatory |
| `MOB-ARINT-REQ-xxx` | Native AR product integration (entry/navigation only) |

**Collision note:** the task brief suggested `MOB-GAME-REQ` for mini-games, but `MOB-GAME-REQ-*` is already the AR-side gamification namespace in `docs/unity_ar/`. To satisfy the cross-workspace no-collision rule, mini-games use **`MOB-MINIGAME-REQ-*`** and gamification uses **`MOB-GAM-REQ-*`**.

## Acceptance Gate Conventions

- Gates use `MOB-GATE-xxx` in `docs/unity_ar/spec/acceptance-gates.md` (AR domain). This workspace uses **`RN-GATE-xxx`** to avoid collision and to keep learner gates distinct from AR gates.
- Every Cursor task ends with a binary acceptance criterion and a stop condition.

## Relationship to `docs/unity_ar/`

| docs/unity_ar artifact | Relationship |
|------------------------|--------------|
| `spec/mobile-ar-product-spec.md` | AR product behavior (MOB-AR-REQ … MOB-ERR-REQ) — authoritative for the AR lane; reference, do not duplicate |
| `spec/mobile-feature-parity-matrix.md` | AR feature parity (52 AR features) — authoritative for AR features; the learner matrix (`learner-parity-matrix.md`) is authoritative for learner features |
| `spec/bridge-contract.md` | Shared RN ↔ Unity message contract — frozen; contract changes require a STOP + spec decision |
| `plans/2026-08-09-mobile-ar-migration-plan.md` | Mobile AR track M0–M12 — separate from this workspace's R0–R15 |
| `plans/2026-08-09-unity-ar-migration-plan.md` | Unity engine P0–P11 |
| `plans/2026-08-09-master-orchestration-plan.md` | Thin cross-system orchestration — updated 2026-08-09 to reference this workspace |
| `spec/2026-08-09-mobile-product-design.md` | Prior design that planned the mobile product track inside `docs/unity_ar/`; placement superseded by this workspace (see reconciliation note in that file) |

## Provenance Notes

- `frontend-web/` is the **legacy/product parity source** (read-only reference; web is held as legacy)
- `mobile/rn/` is the **native implementation source of truth** (Expo RN; do not infer implementation from web code)
- Backend: FastAPI at `/api/v1/*` — **reuse existing endpoints**; new endpoints only via a backend-gap blocker
- Session constants (web parity source): 30-min learning window, 25-min warning, 5-min break cooldown (`frontend-web/src/session/sessionBreakState.ts`)
- Prior planning that this workspace absorbs: `docs/superpowers/plans/2026-07-25-courses-pets-rn-migration-plan.md` (courses + pets RN migration, Phase-0 contract gate, claymorphic token rules)
