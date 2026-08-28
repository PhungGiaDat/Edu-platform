# Plan: Lexi Agentic RAG Chatbot (TokenRouter multi-model)

## Context

Currently the FastAPI backend chat pipeline (Planner → Generator → Validator) uses a single Google Gemini LLM (`gemini-2.5-flash`), with a custom exponential backoff retry (3 attempts, 5/10/20s) baked into `services/agentic_rag_service.py`. The web frontend (`AIChatBuddy.tsx`) calls `/api/v1/chat/rag` once with no model awareness. The React Native mobile app has placeholder Lexi components (`LexiFloatingButton`, `LexiBottomSheet`, `LexiOrb`, `LexiQuickActionSheet`) that simulate responses — no real API calls.

This change replaces Gemini with **3 free models routed through TokenRouter** (OpenAI-compatible at `https://api.tokenrouter.com/v1`), adds per-task model routing + automatic fallback cascade, exposes the model choice through the request, and ships a new RN chat screen that mirrors the web `AIChatBuddy` UX with a model picker.

The goal: a robust, free, multi-model agentic RAG chatbot for Lexi (kids' English learning) that degrades gracefully when any single provider rate-limits, with the same UI/UX on mobile that the web has today, plus per-session model selection.

## Approach

### Backend changes (`backend/`)

1. **Settings (`settings.py`):** add TokenRouter config block.
   - `TOKENROUTER_API_KEY: Optional[SecretStr]`
   - `TOKENROUTER_BASE_URL: str = "https://api.tokenrouter.com/v1"`
   - `MODEL_PLANNER: str = "qwen/qwen3.8-max-free"` (Qwen3.8 for plan JSON extraction)
   - `MODEL_GENERATOR: str = "deepseek/deepseek-v4-pro-0813-free"` (DeepSeek-V4 for narrative generation)
   - `MODEL_VALIDATOR: str = "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free"` (Nemotron for quality check)
   - `MODEL_FALLBACKS: str` (CSV, comma-separated) for the cascade
   - Raise `AI_CONTENT_TIMEOUT_SECONDS` default from 8.0 → 30.0, `AI_CONTENT_RETRIES` from 2 → 3

2. **New module `services/llm_clients.py`:**
   - `get_tokenrouter_llm(model: str, temperature: float = 0.4, timeout: float = 30.0) -> ChatOpenAI` — uses `langchain_openai.ChatOpenAI` with `base_url`, `api_key`, `max_retries=0` (centralized retry)
   - `@retry` wrapper using **tenacity** with `wait_exponential(multiplier=1, min=2, max=30)` + `stop_after_attempt(3)`, triggers on 429/503/timeouts
   - `class CircuitBreaker` — minimal in-process breaker (`fail_max=5`, `reset_timeout=60s`); on open raises `CircuitOpenError`
   - `class ModelRouter`:
     - `planner_llm()`, `generator_llm()`, `validator_llm()` — primary then fallback cascade
     - Per-call: tries primary; on `CircuitOpenError` or `tenacity.RetryError` → next model; on exhausted → final exception

3. **Modify `services/agentic_rag_service.py`:**
   - Replace `_get_llm()` with calls through `ModelRouter`
   - Each agent (`_planner`, `_generator`, `_validator`) takes a per-request `model_override` param
   - `run()` accepts optional `planner_model`, `generator_model`, `validator_model` overrides
   - Replace the inline `_call_llm_with_retry` with the centralized tenacity wrapper
   - Update `agent_trace` to include the actual model used per stage
   - Keep the existing 1-second inter-agent delay (RPM safety)
   - MongoDB cache check stays unchanged

4. **Modify `api/chat.py`:**
   - `RAGChatRequest` adds `planner_model`, `generator_model`, `validator_model` (all `Optional[str]`)
   - Pass through to `agentic_rag.run(...)`
   - `RAGChatResponse` adds `agent_trace` field (already returned by service but not exposed)
   - Persist `model_name` to `chat_logs` (extend schema with optional `model_used` column)

5. **`.env`:** add `TOKENROUTER_API_KEY=...`, `TOKENROUTER_BASE_URL=https://api.tokenrouter.com/v1`

6. **`requirements.txt`:** add `langchain-openai>=0.1`, `tenacity>=8.2`

7. **Qdrant (`services/qdrant_rag_service.py`):** already wired and tested — no changes. The pipeline still uses `QDRANT_URL`, `QDRANT_API_KEY`, `QDRANT_COLLECTION` exactly as today. Wrap `retrieve()` call in `qdrant_breaker` so the generator continues without context on Qdrant outages (already the behavior — formalize it).

### Frontend mobile changes (`mobile/rn/`)

8. **New file `src/services/chatApi.ts`:**
   - `sendRAGMessage(question, userId, sessionId, modelSelection?)` → calls `POST /api/v1/chat/rag` with the same shape as web `ChatService.sendRAGMessage` but with model selection
   - `getAvailableModels()` → returns the 3 free models with display labels (constants)
   - `MODEL_OPTIONS` constant — `{id, label, color, role}` for Qwen/DeepSeek/Nemotron

9. **New file `src/types/chat.ts`:**
   - `RAGChatRequest`, `RAGChatResponse`, `ChatMessage`, `ModelSelection`
   - `ModelRole = 'planner' | 'generator' | 'validator'`

10. **New file `src/screens/ChatScreen.tsx`:**
    - Mirrors `frontend-web/src/components/AIChatBuddy.tsx` 1:1 but as a full-screen screen (per mobile UX best practice — easier to type with keyboard, supports bottom-sheet keyboard handling)
    - Header: gradient (sky-cyan-emerald), Lexi sprite with `waving` animation, "Lexi" title, "New" button + close button (navigates back)
    - Model picker: row of 3 chips below header, each shows model name + role icon. Tap to open modal sheet with role-by-role assignment
    - Chat body: ScrollView with messages. AI bubbles have `CodexPetSprite` avatar with `idle` animation, sources as pill chips below bubble. User bubbles are right-aligned sky-gradient. Loading: 3-dot bounce.
    - Input: TextInput + Send button at bottom, `KeyboardAvoidingView` for keyboard handling
    - `useChatSession` custom hook handles session ID persistence in `AsyncStorage`
    - Sources tap → navigate to `CourseDetailScreen` or flashcard detail

11. **Modify `src/navigation/AppNavigator.tsx`:**
    - Add `Chat` route to `RootStackParamList` (no new tab — modal-style push from floating bubble or pet screen)
    - Screen options: headerShown: false (Lexi has its own header)

12. **Modify `src/components/LexiFloatingButton.tsx`:**
    - Add optional `onPressNavigate?: () => void` prop
    - When pressed, navigate to `Chat` screen with `session_id=null` (forces fresh session)
    - Default `onPress` still works for backward compat (callbacks)

13. **Modify existing `LexiBottomSheet.tsx`, `LexiOrb.tsx`, `LexiQuickActionSheet.tsx`:**
    - Add navigation handler to open `Chat` screen on press
    - Quick action "Ask Lexi anything" now opens `Chat` screen

14. **Modify `src/screens/HomeScreen.tsx` and `src/screens/PetsScreen.tsx`:**
    - Wire the Lexi bubble/orb tap → navigate to `Chat` screen

### Files to modify (representative)

| File | Change |
|---|---|
| `backend/settings.py` | +8 fields for TokenRouter config |
| `backend/services/llm_clients.py` | NEW: ChatOpenAI factory + tenacity + breaker + ModelRouter |
| `backend/services/agentic_rag_service.py` | Replace `_get_llm` with ModelRouter; per-stage model override |
| `backend/api/chat.py` | Add model override fields to request/response |
| `backend/requirements.txt` | +langchain-openai, +tenacity |
| `backend/.env` | +TOKENROUTER_API_KEY, +TOKENROUTER_BASE_URL |
| `mobile/rn/src/services/chatApi.ts` | NEW |
| `mobile/rn/src/types/chat.ts` | NEW |
| `mobile/rn/src/screens/ChatScreen.tsx` | NEW |
| `mobile/rn/src/navigation/AppNavigator.tsx` | +Chat route |
| `mobile/rn/src/components/LexiFloatingButton.tsx` | +navigation |
| `mobile/rn/src/components/LexiBottomSheet.tsx` | +navigation |
| `mobile/rn/src/components/LexiOrb.tsx` | +navigation |
| `mobile/rn/src/screens/HomeScreen.tsx` | +navigation handler |
| `mobile/rn/src/screens/PetsScreen.tsx` | +navigation handler |

### Reuse of existing pieces

- **QdrantRAGService** — keep as-is. The generator's `retrieve()` call is unchanged; only its failure mode gets wrapped in a circuit breaker for observability.
- **CodexPetSprite** (`mobile/rn/src/components/pets/CodexPetSprite.tsx`) — already renders the Lexi sprite sheet, supports all 9 animation states. Reuse in `ChatScreen` header + each AI bubble avatar.
- **PostgresChatLogRepository** — already persists user/ai messages. Extend schema with optional `model_used VARCHAR(64)`.
- **Auth context + SecureStore** — already injects bearer token via `api.interceptors`. Reuse for chat calls.
- **design tokens** (`BRAND`, `COLORS`, `FEATURE_TONES.lex`, `FONT`, `RADIUS`, `SHADOWS`) — use for chat screen styling to stay on-brand with rest of mobile.
- **expo-secure-store / AsyncStorage** — already imported. Use for session ID persistence (no new dep).

## Verification

### Backend
```bash
cd backend && pytest tests/test_agentic_rag_qdrant.py -v   # existing tests still pass
python -c "from services.llm_clients import ModelRouter; print('OK')"
# Smoke test the endpoint with a model override:
curl -s -X POST http://localhost:8000/api/v1/chat/rag \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"question":"What is an elephant?","planner_model":"qwen/qwen3.8-max-free","generator_model":"deepseek/deepseek-v4-pro-0813-free"}'
# Expect 200 with agent_trace showing the per-stage models.
```

### Mobile
```bash
cd mobile/rn && npx tsc --noEmit             # type check
npx expo start                               # dev server
# In Expo Go: open Chat tab, send "Hi Lexi", expect real response from /api/v1/chat/rag
# Tap model chip → modal opens → swap to Nemotron → send again → agent_trace reflects the new validator
```

### Cross-system
- Confirm the existing `GET /api/v1/admin/dashboard` and `GET /api/v1/session-lock/status` still return safe defaults (Phase 5 guards untouched).
- Confirm Qdrant outage test: temporarily set `QDRANT_API_KEY=invalid` in `.env`, restart, send a chat message — generator must continue without context (no crash).
- Confirm 429 test: hit the same model 10 times in 5s, verify the cascade kicks in and the breaker opens after 5 failures.
