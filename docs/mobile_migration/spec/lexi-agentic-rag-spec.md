# Lexi Agentic RAG — Product Specification

## Status
draft

## Goal

Replace the Gemini-only Lexi chat backend with a multi-model Agentic RAG pipeline that routes each pipeline stage (Planner → Generator → Validator) to a dedicated free LLM via TokenRouter (OpenAI-compatible), and ship the equivalent chat experience on React Native with a model picker. The pipeline degrades gracefully when any single provider rate-limits or fails.

## Why

- **Cost & sustainability:** Gemini free tier rate-limits break user experience at peak hours. Three free models routed by task give us 3× the request budget and isolate failures.
- **Specialization:** Different models excel at different tasks. Qwen3.8-max is strong at structured JSON plan extraction, DeepSeek-V4-Pro at narrative output, Nemotron-3 at quality validation. Routing by role plays to strengths.
- **Resilience:** Automatic fallback cascade + circuit breaker prevents one provider outage from killing Lexi entirely.
- **Web ↔ RN parity:** The web `AIChatBuddy.tsx` already calls `/api/v1/chat/rag`. The mobile placeholder Lexi components (no real API calls today) get the same UX with model awareness.

## Relationship to Other Artifacts

| Document | Role |
|---|---|
| `docs/mobile_migration/spec/learner-product-spec.md` | Core RN learner product requirements |
| `docs/mobile_migration/spec/learner-parity-matrix.md` | Feature parity decisions (Lexi: ADAPT — see Section D) |
| `frontend-web/src/components/AIChatBuddy.tsx` | Web reference UX (header, gradient, sprite, sources pill, typing indicator) |
| `frontend-web/src/services/ChatService.ts` | Web API client — pattern reference |
| `backend/services/agentic_rag_service.py` | Existing pipeline; modified, not replaced |
| `backend/services/qdrant_rag_service.py` | Vector retrieval — unchanged |
| `backend/settings.py` | Adds TokenRouter config block |
| `backend/api/chat.py` | Endpoint adds per-stage model override fields |
| `mobile/rn/src/components/LexiFloatingButton.tsx` | Bubble nav target |
| `mobile/rn/src/components/LexiBottomSheet.tsx` | Sheet component (legacy overlay; new ChatScreen supersedes for full conversation) |
| `mobile/rn/src/components/pets/CodexPetSprite.tsx` | Sprite renderer — reused for header avatar + AI bubbles |
| `docs/mobile_migration/plans/2026-08-10-super-product-plan.md` | Migration roadmap reference |

---

## A. Backend Pipeline

### LEXI-AI-REQ-001 — TokenRouter as primary LLM provider
**Product behavior:** All chat LLM calls (Planner, Generator, Validator) go through TokenRouter at `https://api.tokenrouter.com/v1` using `langchain_openai.ChatOpenAI` with `max_retries=0`. Gemini is removed from the active chat code path.
**Ownership:** Backend.
**Config:** `TOKENROUTER_API_KEY` (SecretStr), `TOKENROUTER_BASE_URL` (default `https://api.tokenrouter.com/v1`) in `settings.py` + `.env`.
**Verification:** `POST /api/v1/chat/rag` succeeds without `GOOGLE_API_KEY` being set.
**Status:** not started.

### LEXI-AI-REQ-002 — Per-stage model routing
**Product behavior:** Three pipeline stages use three distinct models by default:
- **Planner** → `qwen/qwen3.8-max-free` (JSON plan extraction from progress + question)
- **Generator** → `deepseek/deepseek-v4-pro-0813-free` (kid-friendly narrative + emoji)
- **Validator** → `nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free` (age-appropriate + dedup vs history)
**Ownership:** Backend (`services/agentic_rag_service.py`).
**Config:** `MODEL_PLANNER`, `MODEL_GENERATOR`, `MODEL_VALIDATOR` in `settings.py`.
**Verification:** `agent_trace` in response includes the resolved model per stage.
**Status:** not started.

### LEXI-AI-REQ-003 — Fallback cascade
**Product behavior:** When the primary model for a stage fails (429 / 5xx / circuit open), the request retries on the next model in `MODEL_FALLBACKS` (CSV in settings, default: all three models in priority order). Cascade terminates when one succeeds or all are exhausted.
**Ownership:** Backend (`services/llm_clients.py`).
**Verification:** Force-fail the primary model (set env var to a bogus model) — request still succeeds via fallback; `agent_trace` shows `primary:failed fallback:ok`.
**Status:** not started.

### LEXI-AI-REQ-004 — Centralized retry with tenacity
**Product behavior:** Each LLM call wraps in `@tenacity.retry(wait=wait_exponential(multiplier=1, min=2, max=30), stop=stop_after_attempt(3))` that triggers on 429 / ResourceExhausted / 5xx / timeout. The custom `_call_llm_with_retry` helper is replaced.
**Ownership:** Backend (`services/llm_clients.py`).
**Verification:** Mock 429 twice, then success — log shows 2 retries, request succeeds.
**Status:** not started.

### LEXI-AI-REQ-005 — Circuit breaker
**Product behavior:** A simple in-process circuit breaker (`fail_max=5, reset_timeout=60s`) wraps each model. When open, requests skip that model and jump straight to the next in the cascade. Prevents wasting 30s timeouts on a known-down provider.
**Ownership:** Backend (`services/llm_clients.py`).
**Verification:** Force-fail a model 5 times — breaker opens; subsequent requests skip it within the 60s window.
**Status:** not started.

### LEXI-AI-REQ-006 — Qdrant resilience
**Product behavior:** Qdrant retrieval is wrapped in a circuit breaker. On `QdrantRAGUnavailable` the generator continues without context (existing behavior, formalized) — never crash the request.
**Ownership:** Backend (`services/llm_rag_service.py` minor change).
**Verification:** Set `QDRANT_API_KEY=invalid`, restart, send chat message — response still returns 200 with `sources: []`.
**Status:** not started.

### LEXI-AI-REQ-007 — Per-request model override
**Product behavior:** `RAGChatRequest` accepts optional `planner_model`, `generator_model`, `validator_model` strings. When supplied, those override the configured defaults for that single request. The model picker UI in the mobile screen uses this to send "use Nemotron for this turn."
**Ownership:** Backend (`api/chat.py`).
**Verification:** Send request with `validator_model=nvidia/nemotron-...` — `agent_trace` shows that model was used for validation.
**Status:** not started.

### LEXI-AI-REQ-008 — Agent trace visibility
**Product behavior:** `RAGChatResponse` exposes `agent_trace: List[str]` so clients can render per-stage model + outcome (e.g. `["planner:start", "planner:done model=qwen/qwen3.8-max-free", "generator:done model=deepseek/... sources=3", "validator:done model=nvidia/... fallback=true", "validator:fallback"]`).
**Ownership:** Backend.
**Verification:** Inspect trace after a forced fallback — both stages show their models.
**Status:** not started.

### LEXI-AI-REQ-009 — Chat log model attribution
**Product behavior:** `chat_logs.model_used` column records which generator model produced each AI message for observability.
**Ownership:** Backend (`repositories/postgres_chat_log_repository.py` + migration).
**Verification:** Insert chat message → row has `model_used='deepseek/...'`.
**Status:** not started.

---

## B. Mobile Chat Screen

### MOB-CHAT-REQ-001 — ChatScreen route
**Product behavior:** A new `Chat` screen is registered in `RootStackParamList` (React Navigation v7 native stack). Header hidden; full-screen modal-style push from any Lexi entry point.
**Ownership:** React Native.
**Files:** `src/navigation/AppNavigator.tsx`, `src/screens/ChatScreen.tsx`.
**Verification:** Press floating Lexi bubble → navigate to Chat screen.
**Status:** not started.

### MOB-CHAT-REQ-002 — Header gradient + Lexi avatar
**Product behavior:** Header mirrors web `AIChatBuddy` — sky-cyan-emerald gradient, white Lexi sprite avatar (`waving` animation) in a clay-styled rounded square, "Lexi" title in white, "New" pill button + close (back) button on the right.
**Ownership:** React Native (`ChatScreen.tsx`).
**Verification:** Visual parity with web; sprite animates on entry.
**Status:** not started.

### MOB-CHAT-REQ-003 — Chat history scroll
**Product behavior:** Messages render in a `ScrollView` with auto-scroll to bottom on update. AI bubbles left-aligned with sprite avatar; user bubbles right-aligned. Source words render as pill chips below AI bubbles. Loading indicator is the same 3-dot bounce as web.
**Ownership:** React Native.
**Verification:** Send 3 messages — bubbles stack, scroll-to-bottom works, sources render.
**Status:** not started.

### MOB-CHAT-REQ-004 — Input bar
**Product behavior:** TextInput + Send button row at bottom. `KeyboardAvoidingView` keeps the input above the keyboard. Send disabled when input empty or loading.
**Ownership:** React Native.
**Verification:** Keyboard opens → input visible; tap send → input clears, message appears in history.
**Status:** not started.

### MOB-CHAT-REQ-005 — Model picker
**Product behavior:** A horizontal chip row below the header shows the 3 models with role labels (Qwen · Planner, DeepSeek · Generator, Nemotron · Validator). Tapping opens a modal sheet listing per-role assignments — user can swap which model serves which role. Selection persists per session.
**Ownership:** React Native.
**Files:** `src/screens/ChatScreen.tsx` + `src/components/ModelPickerSheet.tsx` (NEW).
**Verification:** Change validator to Qwen → next chat sends `validator_model=qwen/...` and `agent_trace` confirms.
**Status:** not started.

### MOB-CHAT-REQ-006 — Session persistence
**Product behavior:** Session ID is created on first message and persisted in `AsyncStorage` (key: `lexi.session_id`). "New" button regenerates session ID and clears history. App restart resumes same session unless explicitly reset.
**Ownership:** React Native (`useChatSession` hook).
**Verification:** Send 2 messages, kill app, relaunch — same session ID + history re-loads from cache.
**Status:** not started.

### MOB-CHAT-REQ-007 — Real API wiring
**Product behavior:** `chatApi.sendRAGMessage(...)` calls `POST /api/v1/chat/rag` with `{question, session_id, user_id, planner_model, generator_model, validator_model}`. Bearer token injected via the existing axios interceptor in `services/api.ts`. No mock replies anywhere on the path.
**Ownership:** React Native (`src/services/chatApi.ts`).
**Verification:** Stub `setTimeout` is removed from `LexiBottomSheet.tsx` and any chat call goes through `chatApi`.
**Status:** not started.

### MOB-CHAT-REQ-008 — Source navigation
**Product behavior:** Tapping a source pill chip on an AI bubble navigates to the relevant flashcard detail screen (if exists) or opens a small info card with the word + score.
**Ownership:** React Native.
**Verification:** Tap "elephant" chip → relevant screen/card opens.
**Status:** not started.

### MOB-CHAT-REQ-009 — Lexi entry points rewire
**Product behavior:** All existing Lexi entry points (`LexiFloatingButton`, `LexiOrb`, `LexiBottomSheet`'s open trigger, "Ask Lexi" tile in `LexiQuickActionSheet`) navigate to `Chat` screen instead of opening in-place sheets for the conversation flow.
**Ownership:** React Native.
**Files:** `LexiFloatingButton.tsx`, `LexiOrb.tsx`, `LexiBottomSheet.tsx`, `LexiQuickActionSheet.tsx`.
**Verification:** Tap floating bubble from Home or Pet screen → Chat screen opens with empty history.
**Status:** not started.

---

## C. Web / Mobile Parity

### MOB-CHAT-REQ-010 — Same RAG endpoint
**Product behavior:** Both web (`AIChatBuddy.tsx` → `ChatService.sendRAGMessage`) and mobile (`ChatScreen.tsx` → `chatApi.sendRAGMessage`) call the same `POST /api/v1/chat/rag`. Web does NOT need TokenRouter-specific changes — the existing endpoint shape works for both.
**Ownership:** Backend (already satisfied) + mobile.
**Verification:** Mobile `chatApi` request shape matches `RAGChatRequest` schema.
**Status:** not started.

### MOB-CHAT-REQ-011 — Parity matrix update
**Product behavior:** `learner-parity-matrix.md` row for Lexi chatbot is upgraded from `ADAPT` to `ADAPT+MODEL-PICKER` (mobile-only feature: model picker is a mobile addition; web keeps its current single-default-model UX).
**Ownership:** Mobile product.
**Files:** `docs/mobile_migration/spec/learner-parity-matrix.md`.
**Verification:** Parity matrix row reflects the new model-picker capability.
**Status:** not started.

---

## D. Configuration & Ops

### LEXI-AI-REQ-010 — Env block
**Product behavior:** `.env` includes:
```
TOKENROUTER_API_KEY=<secret>
TOKENROUTER_BASE_URL=https://api.tokenrouter.com/v1
MODEL_PLANNER=qwen/qwen3.8-max-free
MODEL_GENERATOR=deepseek/deepseek-v4-pro-0813-free
MODEL_VALIDATOR=nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free
MODEL_FALLBACKS=qwen/qwen3.8-max-free,deepseek/deepseek-v4-pro-0813-free,nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free
```
**Ownership:** Backend.
**Files:** `.env`, `.env.example`.
**Verification:** Server starts with these vars; missing `TOKENROUTER_API_KEY` → startup warning, not crash.
**Status:** not started.

### LEXI-AI-REQ-011 — Dep updates
**Product behavior:** `requirements.txt` adds `langchain-openai>=0.1.0` and `tenacity>=8.2.0`.
**Ownership:** Backend.
**Verification:** `pip install -r requirements.txt` succeeds; imports work.
**Status:** not started.

### LEXI-AI-REQ-012 — Settings validator
**Product behavior:** `settings.py` validates at import time: if `TOKENROUTER_API_KEY` is missing AND any of `MODEL_PLANNER/GENERATOR/VALIDATOR` is set, log a warning. Do not crash (chat endpoint can still return a 503 if `TOKENROUTER_API_KEY` is missing at call time).
**Ownership:** Backend.
**Verification:** Missing key → warning logged; `/api/v1/chat/rag` returns 503 with clear message.
**Status:** not started.

---

## E. Acceptance Gates

- **RN-GATE-CHAT-1:** ChatScreen mounts, header + bubble sprites render, no crashes on cold start.
- **RN-GATE-CHAT-2:** Send 5 messages in a row — all return real LLM responses, history scroll works, sources render.
- **RN-GATE-CHAT-3:** Switch validator model in picker → next response `agent_trace` shows the new model.
- **RN-GATE-CHAT-4:** Kill app mid-conversation, relaunch — same session ID restored from AsyncStorage.
- **LEXI-GATE-AI-1:** Force `MODEL_PLANNER=invalid/model` — request still succeeds via fallback within 30s.
- **LEXI-GATE-AI-2:** Force `QDRANT_API_KEY=invalid` — request still succeeds (sources: []).
- **LEXI-GATE-AI-3:** Send 10 rapid requests with all 3 providers returning 429 — cascade exhausts gracefully, returns 503 with user-friendly message; breaker opens for 60s.
- **LEXI-GATE-AI-4:** `agent_trace` in response matches actual models invoked (verified by `pytest` snapshot test).