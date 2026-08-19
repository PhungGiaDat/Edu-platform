# Lexi Agentic RAG — Implementation Plan

**Spec:** [`spec/lexi-agentic-rag-spec.md`](../spec/lexi-agentic-rag-spec.md) (status: draft)
**Status:** draft
**Date:** 2026-08-19
**Roadmap slot:** R11 (AI Chat) — replaces the previous DECISION_REQUIRED stub

## Goal

Make the spec executable. Break `LEXI-AI-REQ-*` (backend) and `MOB-CHAT-REQ-*` (mobile) into a sequenced task graph a junior engineer can follow, with explicit TDD-style acceptance at each step.

## Task Graph

```
L0.1 (Settings+Env+Dep)  ─┐
L0.2 (llm_clients.py)     ├─→ L1 (agentic_rag refactor) ─→ L2 (api/chat wiring) ─→ L3 (chat_log migration)
                            └──────────────────────────────────────────────────┐
                                                                                ↓
L0.3 (Qdrant breaker) ─────────────────────────────────────────────────→ L3 (qdrant breaker)
                                                                                ↓
L4.1 (chatApi.ts) ─→ L4.2 (chat.ts types) ─→ L4.3 (ChatScreen.tsx) ─→ L4.4 (ModelPickerSheet) ─→ L4.5 (nav)
                                                                                                       ↓
                                                                                          L4.6 (rewire entries)
                                                                                                       ↓
                                                                                                  L5 (parity matrix)
                                                                                                       ↓
                                                                                                  L6 (gates + tests)
```

Each task is **one PR** with binary acceptance. Tasks are sequential; do not start task N+1 until task N passes its gate.

---

## L0 — Backend Foundation

### L0.1 — Settings + .env + requirements
**File:** `backend/settings.py`, `backend/.env`, `backend/.env.example`, `backend/requirements.txt`
**What:** Add 6 fields: `TOKENROUTER_API_KEY` (SecretStr), `TOKENROUTER_BASE_URL`, `MODEL_PLANNER`, `MODEL_GENERATOR`, `MODEL_VALIDATOR`, `MODEL_FALLBACKS` (CSV). Raise `AI_CONTENT_TIMEOUT_SECONDS` default 8.0 → 30.0, `AI_CONTENT_RETRIES` 2 → 3. Add `langchain-openai>=0.1`, `tenacity>=8.2` to `requirements.txt`.
**Acceptance:** `python -c "from settings import settings; print(settings.MODEL_PLANNER)"` prints the configured value; missing key logs warning at startup but does not crash.
**Gate:** LEXI-GATE-AI-1 helper (env-only).

### L0.2 — `services/llm_clients.py` (NEW)
**Files:** NEW `backend/services/llm_clients.py`, NEW `backend/tests/test_llm_clients.py`.
**What:** Build `get_tokenrouter_llm(model, temperature, timeout) -> ChatOpenAI`, `@tenacity.retry` decorator, `CircuitBreaker` class (minimal: `fail_max=5, reset_timeout=60s`), `ModelRouter` class with `.planner_llm()`, `.generator_llm()`, `.validator_llm()` returning primary-then-cascade iterators.
**TDD:** Unit tests for:
- breaker opens after 5 failures, resets after 60s
- cascade iterates correctly when primary fails
- tenacity decorator retries on mocked 429 twice then succeeds
- `get_tokenrouter_llm` accepts model param, base_url, api_key from settings
**Acceptance:** All tests pass (`pytest tests/test_llm_clients.py -v`).
**Gate:** None (TDD output).

### L0.3 — Qdrant circuit breaker integration
**File:** `backend/services/qdrant_rag_service.py`, NEW `backend/tests/test_qdrant_breaker.py`.
**What:** Wrap `retrieve()` in `CircuitBreaker`. On open breaker → return `[]` (current behavior already continues without context; this formalizes + observability).
**TDD:** Force breaker open → `retrieve()` returns `[]`; closing → real call attempted.
**Acceptance:** All tests pass.

---

## L1 — Pipeline Refactor

### L1.1 — `agentic_rag_service.py` ModelRouter integration
**File:** `backend/services/agentic_rag_service.py`, `backend/tests/test_agentic_rag_qdrant.py` (extend).
**What:** 
- Remove `ChatGoogleGenerativeAI` import; remove `_get_llm()` (or rewrite as thin wrapper)
- Each agent (`_planner`, `_generator`, `_validator`) accepts a `llm` constructed by `ModelRouter` for that role
- `run()` accepts optional `planner_model`, `generator_model`, `validator_model` overrides
- Replace inline `_call_llm_with_retry` with the centralized tenacity wrapper
- Append `model=<name>` and `fallback=true` markers to `agent_trace`
**TDD:** Extend `test_agentic_rag_qdrant.py`:
- Override `planner_model` → trace shows it
- Force `planner_model='invalid'` → fallback path taken, trace shows `fallback=true`
- All existing tests still pass
**Acceptance:** `pytest tests/test_agentic_rag_qdrant.py -v` green; manual smoke with each of the 3 real models returns 200.
**Gate:** LEXI-GATE-AI-1, LEXI-GATE-AI-2.

---

## L2 — API Wiring

### L2.1 — `api/chat.py` request/response extension
**File:** `backend/api/chat.py`.
**What:**
- `RAGChatRequest` adds `planner_model: Optional[str]`, `generator_model: Optional[str]`, `validator_model: Optional[str]`
- `RAGChatResponse` adds `agent_trace: List[str]`
- Pass-through to `agentic_rag.run(...)`
**Acceptance:** `curl -X POST /api/v1/chat/rag -d '{"question":"hi","validator_model":"nvidia/..."}'` returns `agent_trace` reflecting the override.
**Gate:** LEXI-GATE-AI-1, LEXI-GATE-AI-4.

---

## L3 — Persistence + Qdrant hardening

### L3.1 — Chat log `model_used` column
**Files:** `backend/database/migrations/00X_add_chat_log_model.sql` (NEW), `backend/repositories/postgres_chat_log_repository.py`.
**What:** Add `model_used VARCHAR(64) NULL` to `chat_logs`. Update `log_message()` signature to accept `model_used`. Update `api/chat.py` to pass through the generator model name from `result["generator_model_used"]` returned by the service.
**TDD:** Test `log_message()` round-trip with `model_used` set.
**Acceptance:** After a chat request, row in `chat_logs` has `model_used='deepseek/...'`.
**Gate:** None.

---

## L4 — Mobile Chat

### L4.1 — `mobile/rn/src/services/chatApi.ts` (NEW)
**File:** NEW.
**What:** `sendRAGMessage(question, userId, sessionId, modelSelection?)` calls `POST /api/v1/chat/rag` with shape `{question, session_id, user_id, planner_model?, generator_model?, validator_model?}`. Bearer token injected via existing axios interceptor. Define `MODEL_OPTIONS` constant for the 3 free models (id, display name, role hint).
**Acceptance:** `npx tsc --noEmit` clean.
**Gate:** RN-GATE-CHAT-2 prerequisite.

### L4.2 — `mobile/rn/src/types/chat.ts` (NEW)
**File:** NEW.
**What:** `RAGChatRequest`, `RAGChatResponse`, `ChatMessage`, `ModelSelection`, `ModelRole`.
**Acceptance:** types compile.

### L4.3 — `mobile/rn/src/screens/ChatScreen.tsx` (NEW)
**File:** NEW.
**What:** Full RN screen mirroring `AIChatBuddy.tsx`. Header gradient + Lexi sprite, chat history scroll, sources pills, input bar with `KeyboardAvoidingView`. Use `useChatSession` hook for session persistence.
**Acceptance:** `npx tsc --noEmit` clean; Expo dev server renders screen.
**Gate:** RN-GATE-CHAT-1.

### L4.4 — `mobile/rn/src/components/ModelPickerSheet.tsx` (NEW)
**File:** NEW.
**What:** Modal sheet listing 3 models per role. Tap chip on chat header → opens. Selection state lives in screen-level state.
**Acceptance:** Opens/closes; selection updates chat header chip.
**Gate:** RN-GATE-CHAT-3.

### L4.5 — Navigation route + `useChatSession` hook
**Files:** `mobile/rn/src/navigation/AppNavigator.tsx`, NEW `mobile/rn/src/hooks/useChatSession.ts`.
**What:** Add `Chat` route to `RootStackParamList`. Hook persists session ID in `AsyncStorage` (key `lexi.session_id`), generates on first send, regenerates on "New".
**Acceptance:** App restart preserves session ID.
**Gate:** RN-GATE-CHAT-4.

### L4.6 — Rewire Lexi entry points
**Files:** `mobile/rn/src/components/LexiFloatingButton.tsx`, `LexiOrb.tsx`, `LexiBottomSheet.tsx`, `LexiQuickActionSheet.tsx`, `mobile/rn/src/screens/HomeScreen.tsx`, `PetsScreen.tsx`.
**What:** Add `onPressNavigate?: () => void` prop; bubble → navigate to `Chat`. Remove `setTimeout` mock replies from `LexiBottomSheet`.
**Acceptance:** All Lexi entry points open `Chat` screen.
**Gate:** RN-GATE-CHAT-1.

---

## L5 — Parity Matrix Update

### L5.1 — Update `learner-parity-matrix.md`
**File:** `docs/mobile_migration/spec/learner-parity-matrix.md`.
**What:** Mark Lexi chatbot row as `ADAPT+MODEL-PICKER` (mobile-only addition).
**Acceptance:** Parity matrix reflects the addition.

---

## L6 — Acceptance Gates

### L6.1 — Backend test suite green
**What:** Run `pytest backend/tests/ -v`. All existing + new tests green.
**Gate:** LEXI-GATE-AI-1, 2, 3, 4.

### L6.2 — Mobile type check + manual E2E
**What:** `npx tsc --noEmit` clean. Manual walk: open Chat, send 5 messages, swap validator model, kill app + relaunch, verify session persistence.
**Gate:** RN-GATE-CHAT-1, 2, 3, 4.

### L6.3 — Cross-system integration
**What:** Force `QDRANT_API_KEY=invalid` → chat still 200. Force all 3 models 429 → 503 with friendly message + breaker opens. Force `MODEL_PLANNER=invalid` → fallback succeeds within 30s.
**Gate:** LEXI-GATE-AI-1, 2, 3; RN-GATE-CHAT-3.

---

## Rollout order

1. L0.1 → L0.2 → L0.3 (backend foundation; ship together as one PR)
2. L1.1 (pipeline refactor — single PR; gates 1 + 2)
3. L2.1 + L3.1 (API + persistence — one PR)
4. L4.1 → L4.6 (mobile — one PR; all mobile gates)
5. L5.1 (parity doc — single commit)
6. L6 (final acceptance)

Total PRs: 5 + 1 doc + 1 acceptance = 7 PRs max.