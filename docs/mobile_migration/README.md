# `docs/mobile_migration/` — React Native Learner Product Migration Memory

Local-lite memory hub for the **Web → React Native learner-product migration**: migrating the existing learner-facing `frontend-web/` product features (auth, courses, learning path, lesson player, flashcards, mini-games, pronunciation, gamification, profile/progress, pets, session management, AI chat) into the native React Native app (`mobile/rn/`).

This is the **sibling workspace** to `docs/unity_ar/`. The two domains are split by ownership:

| Domain | Workspace | Owns |
|--------|-----------|------|
| **React Native learner product** (this workspace) | `docs/mobile_migration/` | RN screens, navigation, hooks, API adapters, state, learner UX, gamification UI, pets, courses, lessons, sessions, mini-games, tests, product integration with native AR (entry/navigation only) |
| **Unity / native AR** | `docs/unity_ar/` | AR Foundation, GLTFast, image tracking, runtime image library, CardRegistry, combo spatial engine, Unity animation/content, AR native runtime, AR product specs (MOB-AR-*, MOB-COMBO-*, …) |

`frontend-web` is the **legacy/product parity source** (read-only reference). `mobile/rn` is the **native implementation source of truth**. Do not infer mobile implementation from web code — read `mobile/rn/` for what actually exists.

Mirrors the TencentDB Agent Memory 4-asset pattern used by `docs/unity_ar/` without requiring their full stack.

## Asset mapping

| TencentDB concept | Local equivalent | Location |
|--------------------|------------------|----------|
| Chat Memory (L0–L3) | Session transcripts + memory file | `C:\Users\LENOVO\.cursor\projects\<workspace>\agent-transcripts\` (auto) + this folder's `progress/` (curated) |
| Skill | Reusable workflow + guardrails | `.claude/skills/` and `.cursor/skills/` (mobile-context, react-native-patterns) |
| Wiki | Authoritative specifications | `docs/mobile_migration/spec/` |
| Code-Graph | Real file structure + read-by-name routing | workspace tree + `mobile/rn/` source |

## Folder structure

```
docs/mobile_migration/
├── spec/       # Authoritative product specs (what & why)
├── progress/   # Implementation evidence (when & verified)
├── plans/      # Multi-session migration plans (how)
├── blockers/   # Things preventing spec implementation
└── tasks/      # Single-session work items pulled from plans
```

Each folder has its own `README.md` defining content rules. The conventions mirror `docs/unity_ar/` (same lifecycle states, same evidence protocol) so one agent host can work both domains without re-learning the memory system.

## Workflow

1. **Brainstorm / design** → produces a new `spec/<topic>.md` (status: draft)
2. **Plan** → `plans/YYYY-MM-DD-<slug>.md` decomposes approved spec into phases and tasks
3. **Task** → `tasks/YYYY-MM-DD-<slug>.md` pulls a single bounded Cursor task from a plan
4. **Work** → implement + verify + write `progress/YYYY-MM-DD-<slug>.md`
5. **Blocked?** → `blockers/YYYY-MM-DD-<slug>.md`, link from spec + plan + task
6. **Loop** → next session reads `progress/` newest-first, picks up the task

## Boundary with `docs/unity_ar/`

- **Do NOT** put general mobile product migration work in `docs/unity_ar/`. It is the authoritative Unity/native-AR domain only.
- **Do NOT** duplicate Unity/native-AR architecture here. Native AR engine behavior, bridge contracts, AR UX, and AR requirement IDs stay in `docs/unity_ar/`.
- This workspace owns **AR entry/navigation/product integration only** (e.g. "Practice in AR" button on a lesson, routing to the AR screen). Reference `docs/unity_ar/` specs from here; never re-derive them.
- Requirement IDs are namespaced to **avoid collision** with existing Mobile AR IDs (`MOB-AR-REQ-*`, `MOB-COMBO-REQ-*`, `MOB-GAME-REQ-*`, `MOB-LIFE-REQ-*`, `MOB-ERR-REQ-*`, `MOB-FALLBACK-REQ-*`, …). See `spec/000-index.md`.

## Shared contract with the Unity lane

The RN ↔ Unity bridge contract is owned by `docs/unity_ar/spec/bridge-contract.md`. Mobile implementation must not alter Unity contracts merely to make RN code easier. If a shared-contract change is required, **STOP and raise a spec/contract decision** (per `CLAUDE.md` Unity AR spec-change boundary).

## When a session ends

Mandatory evidence write (agent must do, not user):

```markdown
docs/mobile_migration/progress/YYYY-MM-DD-<short-topic>.md

with sections:
- Session (date/time, agent, branch)
- Goal
- Changed (files + one-line what changed)
- Verified (what was checked and passed)
- Not Verified (explicit list)
- Specs touched (links)
- Blockers raised (links)
- Next task
```

## Why this matters

- The next session does not re-derive what the previous one learned.
- Specs are **durable**. Progress is **disposable**.
- A blocker file outlives any single Claude / Cursor session.
- Cursor executes bounded RN tasks from `tasks/`; Claude Code works the Unity AR lane. Both write evidence here (Cursor) and in `docs/unity_ar/progress/` (Claude), keeping the two lanes independently verifiable.
