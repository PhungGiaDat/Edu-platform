# Research — Operations Monitoring Dashboard (self-built, zero third-party)

*Date: 2026-09-12 · Author: orchestrator (research phase executed inline — subagent provider out of credits)*
*All claims below verified against repo evidence (file:line) or cited package metadata.*

## 1. Backend current state

| Fact | Evidence |
|---|---|
| App = FastAPI `main.py`, single custom middleware today: **CORS** | `backend/main.py:175` (`app.add_middleware(CORSMiddleware, ...)`) |
| Lifespan startup: Mongo init → `connect_orm()` (non-fatal) → **LLM provider ping `probe_all()`** at boot; shutdown closes Redis/ORM/asyncpg | `backend/main.py:124`, `133-141`, `148-158` |
| `/health` intentionally lightweight (no DB ping — designed for platform pollers) → **good kubelet liveness candidate as-is** | `backend/main.py:332-338` |
| `/health/detailed` already probes Postgres (`SELECT 1` via asyncpg pool) or Mongo, Redis, AI config → **strong starting point for Tab 1** | `backend/main.py:341-394` |
| Dual Postgres access: asyncpg raw pool + SQLAlchemy async ORM (both Supabase-pooler safe, `statement_cache_size=0`) | `backend/database/postgres_connection.py:26-32`, `backend/database/orm_session.py:34-40` |
| "PostgreSQL pool is not initialized" occurs only when `POSTGRES_CORE_ENABLED`/`DATABASE_URL` unset — graceful, not a bug | `backend/database/postgres_connection.py:17-18,46-49` |
| **Alembic exists** with one baseline revision → new tables get a proper reversible migration | `backend/alembic.ini`, `backend/alembic/versions/20260814_orm_baseline.py` |
| LLM provider health already callable on demand: `GET /api/v1/ai/llm-health` | `backend/api/ai.py:23`, `backend/services/llm_health.py::probe_all` |
| Optional Sentry boundary exists but is a no-op without `SENTRY_DSN` — we keep it OFF (thesis claims zero third-party; do not remove the escape hatch) | `backend/services/sentry_monitoring_service.py` (`dsn = os.getenv("SENTRY_DSN","")`) |

## 2. Admin auth pattern (to reuse)

- Strongest existing pattern: `Depends(get_current_teacher)` on admin routers (`backend/api/admin.py:41` dashboard stats; all 13 endpoints of `backend/api/admin_games.py`), plus `get_current_active_superuser` for the harshest ops (`backend/api/admin.py:469`).
- Definitions live in `backend/core/security.py:100/132/145`. JWT-based, `PostgresUser` typed.
- Admin routers are mounted under `f"{settings.API_V1_PREFIX}/admin"` (`backend/main.py:282-284`) → new router follows the same mount.
- **Recommendation:** `get_current_teacher` (matches the existing "admin surface" tier). Superuser-only is available if preferred — decision left to approval gate.

## 3. Frontend facts

| Question | Answer |
|---|---|
| Framework | **Vite + React SPA** (`react-router-dom` v6, NOT Next.js) — `frontend/package.json:43` |
| Data layer | `@tanstack/react-query` v5 + `zustand` v5 + axios (`frontend/package.json:30,46`; `src/services/apiClient.ts`, `adminApi.ts`) |
| Styling | Tailwind v4 (`@tailwindcss/vite`) |
| Existing admin area | YES — `src/pages/admin/`: `Dashboard.tsx` (234 L), `Analytics.tsx` (195 L), `CourseManager`, `StudentList/Detail`… lazy-imported in `src/App.tsx:47-56` with `AdminErrorBoundary` |
| Chart library installed | **NONE** — `Analytics.tsx` renders charts as **hand-rolled CSS gradient bars** (divs with widths, `src/pages/admin/Analytics.tsx:125,141-143,174`) |
| Implication | The project's established visual language for admin charts is zero-dependency CSS/SVG. Adding recharts is optional, not required. |

## 4. Prometheus endpoint options

| Option | Version / license | Notes | Verdict |
|---|---|---|---|
| (a) `prometheus-fastapi-instrumentator` | 8.1.0 (Jul 2026), ISC | 8.x requires **Starlette ≥1.0** (released May 2026 breaking change per its CHANGELOG) — version-matrix risk with this repo's pinned FastAPI stack; 7.1.0 is the last pre-Starlette-1 line | Avoid — dependency friction disproportionate to value |
| (b) Hand-rolled text-format endpoint | no dep | ~40 lines of code; format mistakes are invisible until scrape time | Acceptable fallback |
| (c) **`prometheus-client` + own middleware** | Apache-2.0, pure Python, THE reference impl | Correct counters/histograms/exposition guaranteed; we control label cardinality; zero service dependency (a pip lib ≠ a third-party monitoring vendor) | ✅ **Recommended** |

Pip line: `prometheus-client>=0.21`. Note: this is a *library*, not an external service — fully consistent with "zero third party".

## 5. psutil in containers / K8s

- `psutil 7.2.2` already present in the system env (add `psutil>=5.9` to `backend/requirements.txt`).
- **Caveat:** `psutil.cpu_percent()` / `virtual_memory()` read **host** `/proc` — inside a K8s pod they over-report (host CPU/RAM, not cgroup limits). On Windows dev machine they're accurate.
- Thesis-safe pattern: report **pod-scoped** values when available — `cgroupfs` v2 (`/sys/fs/cgroup/memory.current`, `memory.max`, `cpu.stat` usage) — fall back to psutil, and include `runtime_source: "cgroup"|"host"` in the payload so numbers are never misleading. A `Process.memory_info().rss` (psutil, per-process) is accurate everywhere → use for "this API process" card, host/cgroup for "node" card.

## 6. RAG trace persistence hook (narrowest place)

- Single funnel point for Lexi chat: `backend/api/chat.py:109` depends on `get_agentic_rag_service()` → `AgenticRAGService` produces the final response **including `agent_trace` (list[str]), per-stage info, tokens via benchmark instrumentation wrapper, retrieval sources**.
- The service (not the router) knows stage timings and validator verdicts; production already returns them (benchmarks observed them via monkeypatch). So: **one hook inside `AgenticRAGService` after response assembly**:
  - `asyncio.create_task(persist_rag_trace(snapshot))` wrapped in `try/except: logger.debug` — fire-and-forget, never blocks/breaks the response. (Same non-fatal philosophy as boot-time probes in `main.py:123-141`.)
  - Token usage: lift the collector concept from `backend/benchmarks/instrumentation.py` into `backend/services/rag_observability.py` (shared helper; **production must never import `benchmarks/`**). If the service's call sites already return `usage_metadata`, read it there; otherwise a `contextvars` collector identical to the benchmark's.
- `chat_logs` (per-message) is **not** sufficient for traces: no latency/model/tokens columns (`backend/database/orm_models/misc.py:69-81`) → new `rag_traces` table justified.

## 7. Learner events — derive vs instrument

Existing Postgres tables already cover the funnel:

| Funnel step | Table (evidence) | Useful columns |
|---|---|---|
| Auth/session | `user_sessions` (`misc.py:240`) | login events for DAU |
| Course/lesson opens+completes | `lesson_sessions`, `lesson_session_steps`, `user_course_progress`, `user_course_lesson_progress` (`learner.py:79-183`) | started/finished timestamps |
| Flashcard practice | `gamification_events` (`misc.py:135`) + `chat_logs.context_flashcard_ids` | event_type rows |
| Games | `game_activity` model, `session_logs.games_played` (`misc.py:168-190`) | per-session counters |
| Time on task | `session_logs.duration_seconds, words_learned, pronunciation_attempts` (`misc.py:168`) | engagement |

**Recommendation: Tab 3 = pure SQL derivation, zero new instrumentation writes.** Only add `learner_events` if a UI-only step (e.g. "opened flashcard deck but never answered") proves invisible server-side — defer.

## 8. MinIO note (backlog framing only)

MinIO is S3-compatible **object storage** — unrelated to monitoring. Today binary/media assets live in **Supabase Storage** (upload services: `services/flashcard_upload_service.py`, `services/game_media_upload_service.py`, `services/lesson_media_service.py`) with metadata rows in `media_assets` (`database/orm_models/learner.py:196`). If the backend later moves to our own K8s cluster, MinIO (or SeaweedFS/cloud S3) becomes the natural self-hosted replacement for Supabase Storage — a *storage* migration item, not part of this feature. No action now.

## 9. Write amplification math

Student scale: ≤ ~300 users, thesis demo bursts maybe 2-5 req/s sustained average ≪ 1 rps → per-request row insert ≈ <100k rows/day worst case = trivial for Postgres, but noisy for dashboard queries and painful for retention.
**Recommendation:** middleware aggregates **in-memory by (route, method, status_class, minute)** with fixed latency histogram buckets; a background flusher task writes **1 row per route-minute** to `api_metrics_minute`. RAG traces stay per-request (low volume, high analytical value). Retention: nightly `DELETE` older than `MONITORING_RETENTION_DAYS`.

## Recommendations table

| Decision | Recommendation | Rationale (one line) |
|---|---|---|
| Chart lib | Reuse existing **zero-dep CSS/SVG pattern** (`admin/Analytics.tsx` style); recharts only if time-series curves needed | Consistency + smaller bundle + thesis "self-built" story |
| Prometheus approach | `prometheus-client` lib + our own middleware, `/metrics` gated by `METRICS_ENABLED` + optional bearer token | Correct exposition without instrumentator's Starlette-1 version risk |
| psutil scope | Per-process RSS + boot time via psutil; node CPU/mem via cgroup-with-fallback + `runtime_source` label | Honest numbers on both dev box and K8s |
| Trace write pattern | `asyncio.create_task` fire-and-forget inside `AgenticRAGService`, error-isolated | Proven non-fatal pattern in lifespan; response path untouched |
| Tab 3 | **Derive** from `session_logs`/`lesson_sessions`/`gamification_events`/`user_sessions` | No new writes, no new schema, data already authoritative |
| API metrics storage | Minute-bucket aggregation flushed by background task (not per-request rows) | Bounded table, exact-enough p50/p95 from histogram buckets |
| Admin auth | `get_current_teacher` dependency on `/api/v1/admin/monitoring/*` | Matches existing admin surface conventions |
| Feature flag | `MONITORING_ENABLED=False` default; middleware short-circuits first line | Near-zero overhead when off; production behavior unchanged |
