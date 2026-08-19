---
name: lexi-rag-l0-l4
description: Lexi Agentic RAG L0-L4 completion evidence and key decisions
metadata:
  type: project
---

# Lexi Agentic RAG — L0→L4

**Date:** 2026-08-20 | **Branch:** `10-days-quick-run`

## Done
- TokenRouter multi-model settings + circuit breaker
- Agentic RAG pipeline (Planner→Generator→Validator)
- `GET /api/v1/chat/models` + `POST /api/v1/chat/rag` with model overrides
- RN ChatScreen + useChatSession (AsyncStorage persistence)
- Frontend web AIChatBuddy model picker
- Full test suite: 85 backend tests pass, 12 RN unit tests pass, 10 E2E (skip without credentials)

## Key decisions to remember

**FastAPI Depends() patching:** Always use `app.dependency_overrides[get_factory_fn]` — NOT `unittest.mock.patch`. FastAPI captures closure at module-load time.

**AsyncStorage JSON:** `ChatMessage.timestamp: number` (Unix ms) — NOT `Date`. Date objects fail JSON round-trip.

**RN reanimated SharedValue:** `LexiSharedValue = { value: number }` — local type alias workaround.

**Model override passthrough:** `planner_model`/`generator_model`/`validator_model` flow: API request → `agentic_rag.run(kwargs)` → per-stage `ModelRouter(role, primary_model=override)`.

## Docs
- `docs/lexi_rag/COMPLETION.md` — full completion evidence

## Pre-existing issues (don't fix unless asked)
- `test_profile_service.py` import error — unrelated
- 40+ Windows PermissionError on pytest temp — fix by rebooting or clearing `C:\Users\LENOVO\AppData\Local\Temp\pytest-of-LENOVO`
- 5 pre-existing FAILED tests in beanie_odm, course_schema_integrity, ar_objects_validator
