# Plan — In-App Operations Monitoring Dashboard ("Ops Dashboard")

*Date: 2026-09-12 · Status: DRAFT for user approval (Phase 1 gate)*
*Companion research: `docs/research/20260912_ops_dashboard.md` (repo evidence cited there)*

## 0. Executive summary

Self-built, Postgres-backed operations dashboard inside the existing admin area — **zero external SaaS**, works offline for thesis screenshots, plus a K8s-readiness bridge: the same in-memory collectors also expose a standard **Prometheus `/metrics`** endpoint so a future `kube-prometheus-stack` drop-in needs **no app-code changes**.

Four tabs: ① System Health · ② LLM/RAG Observability · ③ Learner Analytics · ④ API Metrics.

## 1. Goals & non-goals

**Goals**
- G1 Persist every Lexi RAG chat request as a trace row (stages, latencies, model, tokens, validator verdict, refusal, errors) → queryable + visualizable.
- G2 API-level request metrics (count, 4xx/5xx, p50/p95 per route, top-slow) from one ASGI middleware.
- G3 Component health panel: PostgreSQL, Qdrant, MongoDB(legacy), Redis, LLM providers (reuse `services/llm_health.probe_all`), process CPU/RAM (honest in containers).
- G4 Learner funnel + DAU/WAU **derived** from existing tables (no new instrumentation writes).
- G5 Prometheus text exposition at `/metrics` (flag-gated) — the K8s bridge.
- G6 Thesis-grade UI in the existing admin area, desktop-first, responsive-safe, auto-refresh.

**Non-goals** (explicit)
- No Grafana/Loki/Prometheus *server* deployment now (bridge only).
- No alerting/notifications, no distributed tracing (OTel), no per-user PII analytics, no client-side (browser) RUM.
- No changes to any existing API contract consumed by frontend/RN/Unity.
- No Redis/Kafka/new infra. MongoDB untouched.

## 2. User stories + acceptance criteria

Admin user = teacher/superuser (existing JWT role system).

### Tab 1 — System Health
> *As the ops admin, I see green/red status of every dependency and this process's resource usage, refreshable on demand.*

AC:
- Cards: PostgreSQL (pool up + `SELECT 1` latency), Qdrant, MongoDB, Redis, each LLM provider (`status`+`latency_ms` from `probe_all`), App (version, uptime, started_at), Process (RSS MB, CPU%), Node/host (cgroup when present, `runtime_source` badge).
- Manual "Re-probe" button (`POST .../monitoring/probe`) with 15s client-side debounce.
- Degraded states visible without opening devtools; page works when `MONITORING_ENABLED=false` (read endpoints still serve health; only *writes* are gated).

### Tab 2 — LLM/RAG Observability
> *As the ops admin, I see each Lexi request as a trace: question (truncated), language, sources hit, waterfall of planner→retrieval→generator→validator→e2e, tokens, model used, verdict, and I can filter failures/refusals.*

AC:
- Stats row (24h): request count, e2e p50/p95, refusal rate, validator verdict breakdown (rule-pass / rule-escalate / llm verdicts / errors), tokens in/out total.
- Trace table: newest-first, filterable (only_errors, only_refusals, language), paginated (limit/offset), row click → detail with CSS-waterfall bars per stage + `trace_segments` list + token breakdown by model.
- Chart: daily average stage latencies (stacked CSS/SVG bars) over last 7/14/30 days.
- Rows written **only** when `MONITORING_ENABLED=true`; trace insert failure never affects the chat response (isolated task + log).

### Tab 3 — Learner Analytics
> *As the product admin, I see DAU/WAU, the Auth→Course→Lesson→Flashcard funnel and time-on-task, derived from real product tables.*

AC:
- KPI cards: DAU (7d sparkline), WAU, avg session duration, words learned/day, games played/day.
- Funnel: distinct users with ≥1 event per stage in period (login `user_sessions` → course open `lesson_sessions` → lesson complete `user_course_lesson_progress` → flashcard/gamification events `gamification_events`).
- Date-range selector (7/30/90d). All numbers from SQL on existing tables — zero new writes; queries use existing indexes, each endpoint < 500 ms at demo scale.
- No raw user ids exposed beyond what existing admin pages already show; trace tables use hashed ids only.

### Tab 4 — API Metrics
> *As the ops admin, I see requests/min, error-rate, p95 latency trend, and top endpoints (busiest & slowest).*

AC:
- From `api_metrics_minute`: line/area (SVG) of req/min and error/min (2xx vs 4xx vs 5xx), p95 trend per window (1h/6h/24h/7d).
- Top-10 tables: by volume and by p95. Health of the pipeline itself: last flush timestamp visible.
- `/health` and static asset routes excluded from aggregation.

## 3. Architecture

```
                         FastAPI process (backend/)
 ┌─────────────────────────────────────────────────────────────────┐
 │  ASGI: MetricsMiddleware (short-circuit when flag off)          │
 │        │ in-memory: Counter/Histogram (prometheus-client)       │
 │        │            + minute-aggregator dict                    │
 │        ▼                                                        │
 │  lifespan background tasks:                                     │
 │    • flush_api_metrics (every 60s) ──► Postgres api_metrics_minute
 │    • retention_cleanup  (daily)     ──► DELETE old rows         │
 │        ▲                                                        │
 │  AgenticRAGService (Lexi chat)                                  │
 │    └─ create_task(persist_rag_trace) ─► Postgres rag_traces     │
 │                                                                 │
 │  /api/v1/admin/monitoring/*  ◄── reads (Postgres + live probes) │
 │  /metrics                    ◄── prometheus-client exposition   │
 │  /health (liveness) · /health/detailed (readiness-style)        │
 └─────────────────────────────────────────────────────────────────┘
          ▲ scrapes later (K8s)              ▲ fetch (TanStack Query, 10s poll)
   kube-prometheus-stack / Grafana    frontend /admin/monitoring (4 tabs)
```

## 4. Data model (Postgres, Alembic revision — reversible)

New file `backend/database/orm_models/monitoring.py` + one migration in `backend/alembic/versions/`.

### 4.1 `rag_traces`
| column | type | notes |
|---|---|---|
| id | bigint PK | |
| request_id | uuid unique | generated per chat call |
| created_at | timestamptz idx | server default now |
| user_hash | char(64) | sha256(user_id + `MONITORING_HASH_SALT`) |
| session_id | varchar(100) idx | joins to `chat_logs` if needed |
| language | varchar(8) | vi/en |
| question | varchar(500) | truncated; store off-flag `MONITORING_STORE_QUESTIONS` |
| model_used | varchar(120) | final generator model |
| stage_planner_ms / stage_retrieval_ms / stage_generator_ms / stage_validator_ms / total_ms | int | from `perf_counter` segments |
| tokens_prompt / tokens_completion | int | summed |
| token_calls | int | # LLM calls |
| tokens_by_model | jsonb | `{model: {p, c}}` |
| cache_hit | boolean | (production cache path) |
| sources_count | int | |
| source_ids | text[] | card/lesson ids, max 20 |
| hit1 / hit3 | boolean null | only when question matched a golden set (benchmark import later); null in prod |
| validator_verdict | varchar(40) | `rule-pass` `rule-escalate:<reason>` `llm-pass` `llm-rewrite` `llm-fail` `error` |
| refusal | boolean | |
| error | text null | truncated 500 |
| trace_segments | text[] | same strings the benchmark harness emits |

Indexes: `created_at desc`, partial index `WHERE error IS NOT NULL OR refusal`.
Retention: delete older than `MONITORING_RETENTION_DAYS` (default 90).

### 4.2 `api_metrics_minute`
| column | type |
|---|---|
| minute | timestamptz (date_trunc 'minute') |
| route | varchar(200) — FastAPI **path template** (`/api/v1/chat/{id}`), never raw path → bounded cardinality |
| method | varchar(8) |
| status_class | varchar(3) `2xx|3xx|4xx|5xx` |
| requests | int |
| errors | int (>=500) |
| sum_ms | bigint |
| max_ms | int |
| buckets | bigint[] — fixed histogram `[5,10,25,50,100,250,500,1000,2500,5000,10000]` ms, +`le` convention in code |
- PK: (minute, route, method, status_class). p50/p95 computed from `buckets` in SQL or Python helper (documented interpolation — same math Prometheus uses).
- Retention: 30 days detail.

### 4.3 Tab 3 — **no new table** (derive). `learner_events` intentionally deferred (open question Q3).

## 5. API contract (new router `backend/api/admin_monitoring.py`)

Mounted: `app.include_router(admin_monitoring_router, prefix=f"{settings.API_V1_PREFIX}/admin/monitoring", tags=["Admin Monitoring"])`.
Auth: `Depends(get_current_teacher)` on every route (open question Q1).

| Endpoint | Response (abridged) |
|---|---|
| `GET /overview` | `{status, app:{version,started_at,uptime_s,environment}, process:{rss_mb,cpu_pct,source}, host:{mem_pct,cpu_pct,runtime_source:"cgroup"/"host"}, components:{postgres:{up,latency_ms},qdrant:{up},mongodb:{up},redis:{up}}, llm:[{provider,status,latency_ms}], rag_24h:{count,e2e_p50,e2e_p95,refusal_rate,tokens_total}, api_1h:{requests,error_rate,p95}}` |
| `POST /probe` | same as overview but forces fresh liveness/LLM pings |
| `GET /rag/stats?days=7` | `{count, p50,p95 by stage, verdict_counts{}, refusal_rate, tokens_by_model{}, daily:[{date,count,p95,refusals}]}` |
| `GET /rag/traces?limit=25&offset=0&only_errors=&only_refusals=&language=` | `{total, items:[{id,created_at,language,model_used,total_ms,validator_verdict,refusal,error,question_preview}]}` |
| `GET /rag/traces/{id}` | full row incl. `trace_segments`, `tokens_by_model`, `source_ids` |
| `GET /api/stats?window=1h|6h|24h|7d` | `{series:[{minute,requests,errors,p50,p95}], top_by_volume:[{route,method,requests,p95}], top_by_latency:[...], last_flush}` |
| `GET /learners?days=30` | `{dau:[{date,users}], wau, funnel:{auth,course_open,lesson_complete,practice}, engagement:{avg_session_s,words_per_day,games_per_day}}` |
| `GET /metrics` (root-level, NOT under admin) | Prometheus text format 0.0.4; gated by `METRICS_ENABLED`; optional `Authorization: Bearer ${METRICS_TOKEN}` when token set; excluded from metrics middleware itself |

Metric names (bridge contract for future Grafana): `edu_http_requests_total{route,method,status_class}`, `edu_http_request_duration_seconds_bucket{route,method,le}`, `edu_rag_requests_total{verdict,language}`, `edu_rag_stage_duration_seconds{stage}`, `edu_llm_tokens_total{model,kind}`, `edu_component_up{name}`, `edu_app_info{version}`.

## 6. Backend instrumentation design

New files:
- `backend/services/rag_observability.py` — `RagTraceCollector` (context: perf_counter marks, token deltas, verdict, segments) + `persist_rag_trace()`; **shares the token-collection concept with `backend/benchmarks/instrumentation.py` by copying ~80 lines into service layer; benchmarks keeps its copy (no production→benchmarks import, and optionally later refactor benchmarks to import from services — out of scope now)**.
- `backend/services/api_metrics.py` — minute aggregator (plain dict + `threading.Lock`), histogram bucket math, `flush_to_db()` using ORM session factory; pure functions for bucket math → unit-testable without DB.
- `backend/services/metrics_exposition.py` — prometheus-client registry + custom middleware; `expose()` helper.
- `backend/database/orm_models/monitoring.py` + alembic rev `2026091x_ops_monitoring.py`.

Settings (`backend/settings.py`, pattern-consistent):
```
MONITORING_ENABLED: bool = False          # master switch for WRITES (traces + flush)
MONITORING_RETENTION_DAYS: int = 90
MONITORING_STORE_QUESTIONS: bool = True
MONITORING_HASH_SALT: str = ""            # empty → derived from SECRET_KEY at runtime
METRICS_ENABLED: bool = False             # /metrics endpoint exposure
METRICS_TOKEN: str = ""                   # empty → no auth (documented: cluster-internal only)
```
- **Overhead when OFF**: middleware line 1 `if not settings.MONITORING_ENABLED and not settings.METRICS_ENABLED: await self.app(...); return`. RAG hook wrapped in the same check. No tasks scheduled in lifespan when off.
- **RAG hook placement**: inside `AgenticRAGService` response-assembly tail (single spot used by `api/chat.py:109`), `asyncio.create_task(...)` fire-and-forget with broad `try/except Exception: logger.debug` — mirrors existing non-fatal boot patterns (`main.py:123-141`).
- **Flusher**: lifespan-started task while `MONITORING_ENABLED`: every 60 s drain aggregator dict → batch `INSERT ... ON CONFLICT DO UPDATE`; every 24 h run retention deletes. On shutdown, final flush; all DB errors logged, never raised.
- Route label safety: `request.scope["route"].path` fallback `url.path`; skip list: `/health*`, `/metrics`, `/assets|/images|/audio*`, `/docs`, `/openapi.json`; cardinality cap: if >300 distinct routes in a minute, roll excess into `route="unmatched"` (label-cardinality guard).

## 7. Frontend design

- Route `/admin/monitoring` + lazy import + `AdminErrorBoundary` (pattern: `src/App.tsx:47-56`); nav entry in `src/pages/admin/Dashboard.tsx`.
- New: `src/services/monitoringApi.ts` (axios + apiClient auth pattern), `src/pages/admin/monitoring/MonitoringPage.tsx` + `TabHealth.tsx / TabRag.tsx / TabLearner.tsx / TabApi.tsx` + `components/WaterfallBar.tsx, Sparkline.tsx (svg polyline), MinuteChart.tsx`.
- Data: TanStack Query, `refetchInterval: 10_000` (paused when tab hidden), skeletons consistent with existing admin loading spinner (`Analytics.tsx:44`).
- **Charts: zero-dependency** — reuse the existing hand-rolled CSS/SVG bar language (`Analytics.tsx:125-143`). Waterfall = flex rows with proportional widths; time series = inline `<svg>` polylines. (Open question Q2: approve zero-dep vs add `recharts`.)
- Dark-mode not required (admin surfaces are light today). Mobile: tabs collapse to stacked sections (Tailwind breakpoints) — sufficient for demo screenshots.

## 8. Security & privacy

- Admin-only router (role dependency), no new auth mechanism.
- `/metrics`: `METRICS_ENABLED=false` by default → **not exposed on the public render URL**; enable only in-cluster where NetworkPolicy restricts scrapers; optional bearer token.
- PII: `user_hash` (salted sha256) only; questions truncated to 500 chars and behind `MONITORING_STORE_QUESTIONS` (flip off if thesis privacy review requires); no answer bodies stored (recoverable via existing `chat_logs` join by session).
- Existing Sentry SDK stays disabled (no DSN) — do not wire; document in thesis that error monitoring is local (structured logs + this dashboard).

## 9. K8s-readiness bridge (deliverable of this feature)

1. `/metrics` exposition (above) = Prometheus scrape target; future Helm `kube-prometheus-stack` + `ServiceMonitor` — zero app-code change.
2. Probes: `/health` = liveness (cheap, no DB — already true, `main.py:332-338`); `/health/detailed` = readiness/observability probe (never kubelet hot path); document in `docs/`.
3. 12-factor hygiene already met: env config, stateless app state (metrics live in Postgres), graceful lifespan shutdown — this feature keeps it that way (in-memory aggregators are disposable; flush on shutdown is best-effort).
4. psutil cgroup-awareness (research §5) so pod numbers are honest.
5. MinIO: **backlog item only** — self-hosted object storage replacing Supabase Storage on K8s (media), unrelated to monitoring (research §8).

## 10. Phased delivery (each phase ends with verification level)

| Phase | Scope | Files | Verification |
|---|---|---|---|
| **P1 MVP** | flags + `rag_traces` + model/migration + hook in AgenticRAGService + `/overview`,`/rag/*` endpoints + **Tab 2 & Tab 1(front half)** UI | §4.1,§6 files, chat hook, 1 router, MonitoringPage skeleton + TabRag/TabHealth | CODE_VERIFIED (pytest: bucket math, verdict mapping, flag-off zero-write, hash stability; migration up/down) → then RUNTIME_VERIFIED (uvicorn + one /api/v1/chat → row appears → page renders) |
| **P2** | MetricsMiddleware + `api_metrics_minute` + flush/retention tasks + `/api/stats` + **Tab 4** + `/metrics` exposition + cgroup/psutil | §4.2, api_metrics.py, metrics_exposition.py | CODE_VERIFIED → RUNTIME_VERIFIED (curl /metrics in promtool-parseable format; Tab4 charts populate after 2 min traffic) |
| **P3** | **Tab 3** learner derivation SQL + endpoints + UI | learner queries service | CODE_VERIFIED → RUNTIME_VERIFIED (seed data via existing fixtures) |
| **P4** | polish for thesis: empty states, "as of" timestamps, probe button, retention test, Playwright smoke (`frontend` already has @playwright/test), ops doc `docs/operations/monitoring.md` + K8s bridge doc | tests + docs | DEVICE_BROWSER_VERIFIED (responsive emulation of /admin/monitoring) + screenshot pack for report |

Order rationale: Tab2 is the crown jewel for the thesis (RAG traces = the A/B evidence pipeline made live) — ships first with health.

## 11. Test strategy

- **Unit (no DB):** histogram bucket math + p50/p95 interpolation; minute-aggregator drain/rotate; `user_hash` determinism; settings-off short-circuits (middleware passthrough called exactly once); trace snapshot builder from a fake service response.
- **Integration (asyncpg test DB, pattern: existing gamification migration tests):** migration up/down reversibility; batch flush idempotent (ON CONFLICT); `persist_rag_trace` failure isolation (raise inside → chat response unaffected).
- **API tests:** 401/403 for non-admin; overview shape stable (`response_model` pydantic).
- **E2E smoke (P4):** Playwright — admin login → `/admin/monitoring` → four tabs render, no console errors.
- Regression: `pytest backend/tests` must stay green incl. the 41 Tier-1/2 tests.

## 12. Risks & mitigations

| Risk | Mitigation |
|---|---|
| Write path breaks chat if Postgres down | fire-and-forget task + broad except + flag default off |
| Label cardinality blows up `/metrics` (attacker hitting random paths) | route-template labels, unmatched rollup, skip-lists, cap 300 |
| psutil lies inside pods | cgroup-first + `runtime_source` badge |
| Retention forget → table creep | nightly delete task + row-count shown in Tab4 |
| `prometheus-client` new dep perception | documented as library-not-service; alternative hand-rolled kept simple (≤10 metric families) |
| Overlap/conflict with in-flight PostgreSQL migration work | monitoring tables created via own Alembic revision touching nothing else |
| Session subagent provider out of credits | orchestration fallback: orchestrator performs phase work inline (already done for P1 research/plan) |

## 13. Open questions (need user decision at this gate)

- **Q1 Admin role:** `get_current_teacher` (matches existing admin area) vs stricter `get_current_active_superuser`? → *Recommend teacher.*
- **Q2 Charts:** zero-dependency CSS/SVG (matches existing admin look, strongest "self-built" story) vs add `recharts`? → *Recommend zero-dep.*
- **Q3 Tab 3 scope:** pure derivation from existing tables (recommended, zero writes) — accept that "opened deck but no action" isn't a funnel step? → *Recommend accept for thesis; revisit post-defense.*
- **Q4 Question-text storage:** keep `MONITORING_STORE_QUESTIONS=true` for demo value (traces show the actual kid questions) vs false for max privacy? → *Recommend true (admin-only, truncated, thesis demo is richer).*

---
*Next after approval: Phase 3 (Development) per SDLC — @git-manager branch `feature/ops-monitoring-dashboard`, then P1 implementation. Benchmark A/B Batch 2 remains a separate pending approval and should land before new feature code to keep stash-based A/B clean.*

---

## 14. Status ledger (updated inline as phases land)

| Phase | Status | Date | Verification level | Notes |
|-------|--------|------|--------------------|-------|
| P1 (rag_traces + monitoring API + Tab "Độ trễ & Model" + Tab "Hệ thống") | ✅ DONE | 2026-09-13 | RUNTIME_VERIFIED (API layer) | 24/24 unit tests; all 5 endpoints exercised against live dev DB (seeded 41 traces); UI reviewed in user browser (design polish may follow) |
| Scope change vs §2 | Applied | 2026-09-13 | — | **Tab 3 "Learner Analytics" REMOVED** per approved v3 design (dev-tool scope only). §2/§4.3/§5 `/learners` rows are superseded. |
| Branching policy | Applied | 2026-09-13 | — | Per user directive: work committed **directly on `10-days-quick-run`**, pathspec-limited; no feature branch, no history rewriting. |
| P2 (ASGI middleware + `api_metrics_minute` + `/metrics` + API tab) | ⏳ Not started | — | — | Next chatbot-side infra task; also add `prometheus-client` here. |
| Chatbot LLM outage fix (Gemini provider) | ✅ DONE | 2026-09-14 | DEVICE-pending / RUNTIME_VERIFIED | Live audit 2026-09-14: `/chat/rag` degraded (all providers dead → canned apology, ~60s). Fix: provider-prefixed model routing (`google/…`, `bai/…`, bare=tokenrouter) in `llm_clients.py` + `google` in health registry + `.env` MODEL_* → live-verified Gemini slugs. Post-fix audit: real Vietnamese answers, `planner:done model=google/… → generator:done sources=3 → validator:rule-pass`, refusal path intact, `rag_traces` rows persisted (fallback=False, per-model token counts), dashboard shows `google/gemini-flash-latest` err 0%. 91/91 related tests green (6 new routing tests). |
| Chat auth gate (P0 security) | ✅ DONE | 2026-09-14 | RUNTIME_VERIFIED | Per user decision: guests blocked + Vietnamese login prompt; all 4 LLM-costing endpoints (`/chat/rag`, `/chat/message`, `/chat/pronunciation`, `/chat/test-embedding`) now `Depends(get_current_user)`; `/chat/models` stays public (no LLM cost, gates the picker UI). Body `user_id` is IGNORED — identity from JWT (live proof: spoofed `user_id` never reached DB, `chat_logs` rows carry real uuid). Frontend: apiClient `onUnauthorized:'throw'` opt-in (guest no longer hard-redirected), ChatService returns `requires_login` + VN prompt on 401. Fixed `LearnARV2` PetChatPopup silent 422 (sent `message` not `question`, no auth) → routes via ChatService, guests get static pet line. RN (paused) already sent Bearer → contract intact. 12 new tests (`test_chat_auth.py`) + 2 identity tests + 14/14 AIChatBuddy + tsc clean; live: anon 401 ×4, models 200, authed 200 real answer. |
| Chat error UX (`sendRAGMessage` swallow → typed VN errors) | ✅ DONE | 2026-09-14 | CODE_VERIFIED (device-browser pass pending) | Killed the single generic English fallback string. ChatService now classifies: 401→`auth` (VN login prompt, non-retryable), 90s `AbortSignal.timeout`→`timeout`, ≥500→`server`, no-status network failure→`offline`, else `unknown` — each VN text + `error_kind`/`retryable` flags on `RAGChatResponse`. AIChatBuddy: error bubbles (sky=auth, red=retryable), **Thử lại ✨** replays the question in place (no duplicate user bubble via `isResend`), **Đăng nhập** button navigates for guests, loading bubble says pipeline can be slow, guest send no longer a silent no-op (dropped `!effectiveUserId` guard). 7 new ChatService classification tests + 3 new AIChatBuddy error-UX tests (24/24 green, tsc clean). |

**Dev-data caveat:** dev DB contains seeded demo rows in `rag_traces` (`random.seed(20260913)`) + dev admin `monitor.dev@example.com` — acceptable demo data per DoD; delete/truncate before any staging deploy.
