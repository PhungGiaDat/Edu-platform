# Lexi Agentic RAG — L0→L4 Completion Evidence

**Date:** 2026-08-20
**Branch:** `10-days-quick-run`
**Status:** ✅ L0–L4 complete

---

## What was built

End-to-end Agentic RAG chat feature for Lexi (kids' English learning chatbot):

1. **L0 — Backend infrastructure**
   - TokenRouter multi-model settings (`MODEL_PLANNER`, `MODEL_GENERATOR`, `MODEL_VALIDATOR`, `MODEL_FALLBACKS`)
   - Circuit breaker + retry in `services/llm_clients.py` (`ModelRouter`, `acall_with_retry`)
   - Qdrant retriever with circuit breaker + safety filter in `services/qdrant_rag_service.py`
   - Agentic RAG pipeline `services/agentic_rag_service.py` (Planner → Generator → Validator)

2. **L1 — API endpoints**
   - `GET /api/v1/chat/models` — returns model catalog + defaults
   - `POST /api/v1/chat/rag` — full pipeline with optional model overrides
   - Response includes `sources[]`, `agent_trace[]`, `session_id`

3. **L2 — React Native integration**
   - `src/types/api.ts` — shared types: `ModelInfo`, `ChatModelsResponse`, `RAGChatResponse`, `ChatMessage`
   - `src/services/api.ts` — `chatApi.getModels()`, `chatApi.sendRAG()`
   - `src/hooks/useChatSession.ts` — AsyncStorage session persistence (saveMessage, setSessionId, reset)
   - `src/screens/ChatScreen.tsx` — full UI: bubbles, model picker modal, source chips, agent trace debug
   - `src/navigation/BottomTabs.tsx` + `AppNavigator.tsx` + `HomeScreen.tsx` — navigation wiring

4. **L3 — Frontend web model picker**
   - `frontend/src/services/ChatService.ts` — `getModels()`, `modelOverrides` in `sendRAGMessage()`
   - `frontend/src/components/AIChatBuddy.tsx` — `ModelPicker` dropdown, agent trace panel, model overrides

5. **L4 — Tests**
   - `tests/test_chat_models_endpoint.py` — 4 tests (GET /chat/models schema)
   - `tests/test_chat_rag_with_model_override.py` — 7 tests (override passthrough to pipeline)
   - `tests/test_chat_integration.py` — 19 tests (full HTTP round-trip via TestClient + dependency_overrides)
   - `tests/conftest.py` — added TokenRouter + Qdrant env vars
   - `src/hooks/useChatSession.test.ts` — 12 unit tests (pure TS, node:test runner)
   - `e2e/lexi-chat.spec.ts` — 10 Playwright E2E tests (skip without credentials)
   - `.env.e2e.example` — credentials template

---

## Test counts

```
backend (chat/RAG only)
  test_chat_integration.py          19 pass  ✅ NEW
  test_chat_models_endpoint.py      4 pass  ✅ NEW
  test_chat_rag_with_model_override 7 pass  ✅ NEW
  test_agentic_rag_qdrant.py       9 pass  ✅
  test_qdrant_rag_service.py      27 pass  ✅
  test_llm_clients.py             19 pass  ✅
  ─────────────────────────────────────────
  chat/RAG backend total          85 pass  ✅

mobile
  useChatSession.test.ts         12 pass  ✅ NEW
  lexi-chat.spec.ts              10 skip  🟡 needs LC11_WEB_EMAIL/PASSWORD
```

---

## Key technical decisions

### FastAPI Depends() patching in tests
`TestClient(main.app)` with `app.dependency_overrides` — NOT `unittest.mock.patch`.
FastAPI captures a closure at module-load time; patching the function reference after the fact
does not update the Depends object. `app.dependency_overrides[get_factory_fn]` is the correct path.

### AsyncStorage JSON compat
`ChatMessage.timestamp: number` (Unix ms) — NOT `Date`. Date objects cannot round-trip through
`JSON.stringify`/`JSON.parse`.

### Model router override passthrough
`planner_model`, `generator_model`, `validator_model` flow from API request body → `agentic_rag.run()`
kwargs → per-stage `ModelRouter(role, primary_model=override)`. Each stage independently routes.

### React Native reanimated SharedValue type
`LexiSharedValue = { value: number }` — local type alias workaround for react-native-reanimated
namespace export differences across versions.

---

## Files changed/created

```
backend/
  api/chat.py                          (modified)
  settings.py                         (verified)
  services/agentic_rag_service.py     (verified)
  services/llm_clients.py            (verified)
  services/qdrant_rag_service.py     (verified)
  tests/test_chat_integration.py      (NEW)
  tests/test_chat_models_endpoint.py  (NEW)
  tests/test_chat_rag_with_model_override.py (NEW)
  tests/conftest.py                   (modified)
mobile/rn/
  src/screens/ChatScreen.tsx         (new)
  src/hooks/useChatSession.ts        (new)
  src/types/api.ts                   (modified)
  src/services/api.ts                (modified)
  src/navigation/BottomTabs.tsx      (modified)
  src/navigation/AppNavigator.tsx     (modified)
  src/navigation/HomeScreen.tsx      (modified)
  src/hooks/useChatSession.test.ts   (NEW)
  e2e/lexi-chat.spec.ts              (NEW)
  .env.e2e.example                   (NEW)
frontend/src/
  services/ChatService.ts            (modified)
  components/AIChatBuddy.tsx        (modified)
docs/lexi_rag/COMPLETION.md         (NEW)
```

---

## Pre-existing test issues (not addressed)

- `tests/test_profile_service.py` — `ImportError: cannot import name 'UserResponse'` (pre-existing, unrelated)
- 40+ ERROR tests — Windows `PermissionError: [WinError 5]` on `C:\Users\LENOVO\AppData\Local\Temp\pytest-of-LENOVO` (fix: reboot or clear temp dir)
- 5 FAILED tests in `test_beanie_odm.py`, `test_course_schema_integrity.py`, `test_ar_objects_validator_blocked_in_ci.py` (pre-existing, unrelated)
