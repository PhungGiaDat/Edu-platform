"""Admin Monitoring API — in-app Ops Monitoring Dashboard backend.

P1 scope (docs/plan/20260912_ops_dashboard.md §5): system overview + probe,
RAG trace stats and trace list/detail. API-metrics endpoints arrive with P2.

Auth: every route requires ``get_current_teacher``. Reads are raw asyncpg over
``rag_traces`` (same boundary style as repositories/postgres_chat_log_repository).

Postgres note: ordered-set aggregates (``percentile_cont ... WITHIN GROUP``)
cannot take a ``FILTER`` clause, so count aggregates and latency percentiles
run as separate queries scoped by WHERE instead.
"""

from __future__ import annotations

import asyncio
import json
import logging
import time
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional, Tuple

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field

from core.security import get_current_teacher
from database.postgres_connection import postgres_core_enabled, postgres_pool
from settings import settings

try:  # declared dependency, but never let monitoring 500 on import
    import psutil
except ImportError:  # pragma: no cover
    psutil = None

logger = logging.getLogger(__name__)

router = APIRouter(dependencies=[Depends(get_current_teacher)])

APP_STARTED_AT = datetime.now(timezone.utc)
_APP_START_MONOTONIC = time.monotonic()

# Baseline for process.cpu_percent(None) deltas between dashboard refreshes.
_PROCESS: Optional["psutil.Process"] = None
if psutil is not None:
    try:
        _PROCESS = psutil.Process()
        _PROCESS.cpu_percent(None)  # prime the counter
    except Exception:  # noqa: BLE001
        _PROCESS = None


# ────────────────────────────── schemas ──────────────────────────────


class ComponentStatus(BaseModel):
    up: Optional[bool] = None
    latency_ms: Optional[float] = None
    note: Optional[str] = None


class OverviewResponse(BaseModel):
    status: str  # ok | degraded | error
    as_of: datetime
    app: Dict[str, Any]
    process: Dict[str, Any] = Field(default_factory=dict)
    host: Dict[str, Any] = Field(default_factory=dict)
    components: Dict[str, ComponentStatus] = Field(default_factory=dict)
    llm: List[Dict[str, Any]] = Field(default_factory=list)
    rag_24h: Dict[str, Any] = Field(default_factory=dict)
    monitoring: Dict[str, Any] = Field(default_factory=dict)


class RagStatsResponse(BaseModel):
    window_hours: int
    as_of: datetime
    totals: Dict[str, Any]
    by_model: List[Dict[str, Any]]
    stages: Dict[str, Any]
    verdicts: Dict[str, int]
    timeline: List[Dict[str, Any]]


class TraceListItem(BaseModel):
    id: int
    created_at: datetime
    session_id: str
    language: Optional[str] = None
    model_requested: Optional[str] = None
    model_used: Optional[str] = None
    fallback: bool
    cache_hit: bool
    total_ms: Optional[int] = None
    stage_planner_ms: Optional[int] = None
    stage_retrieval_ms: Optional[int] = None
    stage_generator_ms: Optional[int] = None
    stage_validator_ms: Optional[int] = None
    tokens_prompt: Optional[int] = None
    tokens_completion: Optional[int] = None
    sources_count: Optional[int] = None
    validator_verdict: Optional[str] = None
    refusal: bool
    has_error: bool
    error: Optional[str] = None
    question_preview: Optional[str] = None


class TraceListResponse(BaseModel):
    total: int
    limit: int
    offset: int
    items: List[TraceListItem]


# ────────────────────────────── helpers ──────────────────────────────


def _f(value: Any) -> Optional[float]:
    """asyncpg numeric/Decimal → float (None passes through)."""
    return None if value is None else float(value)


def _pool_or_503():
    if not postgres_core_enabled():
        raise HTTPException(503, detail="PostgreSQL core is disabled")
    try:
        return postgres_pool()
    except RuntimeError as exc:
        raise HTTPException(503, detail="Database pool not ready") from exc


def _read_file(path: str) -> Optional[str]:
    try:
        with open(path, "r", encoding="utf-8") as fh:
            return fh.read().strip()
    except OSError:
        return None


def _cgroup_memory() -> Optional[Dict[str, Any]]:
    """Container memory limit/usage (cgroup v2 then v1). None on host/dev."""
    cur = _read_file("/sys/fs/cgroup/memory.current")
    lim = _read_file("/sys/fs/cgroup/memory.max")
    if cur and lim and lim != "max":
        try:
            return {
                "used_bytes": int(cur),
                "limit_bytes": int(lim),
                "runtime_source": "cgroupv2",
            }
        except ValueError:
            return None
    cur = _read_file("/sys/fs/cgroup/memory/memory.usage_in_bytes")
    lim = _read_file("/sys/fs/cgroup/memory/memory.limit_in_bytes")
    if cur and lim:
        try:
            limit = int(lim)
            # v1 encodes "unlimited" as a huge sentinel (~PAGE_COUNTER_MAX)
            if limit >= 2**62:
                return None
            return {
                "used_bytes": int(cur),
                "limit_bytes": limit,
                "runtime_source": "cgroupv1",
            }
        except ValueError:
            return None
    return None


def _process_info() -> Dict[str, Any]:
    info: Dict[str, Any] = {
        "source": "psutil" if _PROCESS else "unavailable",
        "uptime_s": round(time.monotonic() - _APP_START_MONOTONIC, 1),
    }
    if _PROCESS is None:
        return info
    try:
        info["rss_mb"] = round(_PROCESS.memory_info().rss / (1024 * 1024), 1)
        info["cpu_pct_since_last_call"] = _PROCESS.cpu_percent(None)
        info["threads"] = _PROCESS.num_threads()
        cgroup = _cgroup_memory()
        if cgroup:
            info["cgroup"] = {
                "used_mb": round(cgroup["used_bytes"] / (1024 * 1024), 1),
                "limit_mb": round(cgroup["limit_bytes"] / (1024 * 1024), 1),
                "mem_pct": round(100 * cgroup["used_bytes"] / cgroup["limit_bytes"], 1),
                "runtime_source": cgroup["runtime_source"],
            }
    except Exception as exc:  # noqa: BLE001
        info["error"] = str(exc)[:200]
    return info


def _host_info() -> Dict[str, Any]:
    if psutil is None:
        return {"source": "unavailable"}
    try:
        vm = psutil.virtual_memory()
        out: Dict[str, Any] = {
            "source": "host",
            "mem_total_mb": round(vm.total / (1024 * 1024), 1),
            "mem_used_mb": round(vm.used / (1024 * 1024), 1),
            "mem_pct": vm.percent,
            "cpu_count": psutil.cpu_count(),
        }
        try:
            out["load_avg_1m"] = round(psutil.getloadavg()[0], 2)
        except (AttributeError, OSError):  # Windows has no loadavg
            pass
        return out
    except Exception as exc:  # noqa: BLE001
        return {"source": "error", "error": str(exc)[:200]}


# ────────────────────────────── component probes ──────────────────────────────


async def _probe_postgres() -> ComponentStatus:
    t0 = time.perf_counter()
    try:
        if not postgres_core_enabled():
            return ComponentStatus(up=False, note="disabled (POSTGRES_CORE_ENABLED=false)")
        await postgres_pool().fetchval("SELECT 1")
        return ComponentStatus(
            up=True, latency_ms=round((time.perf_counter() - t0) * 1000, 1)
        )
    except Exception as exc:  # noqa: BLE001
        return ComponentStatus(up=False, note=str(exc)[:200])


async def _probe_qdrant() -> ComponentStatus:
    if not settings.QDRANT_URL:
        return ComponentStatus(up=None, note="not configured")
    url = settings.QDRANT_URL.rstrip("/")
    headers = {}
    if settings.QDRANT_API_KEY:
        headers["api-key"] = settings.QDRANT_API_KEY.get_secret_value()
    t0 = time.perf_counter()
    try:
        async with httpx.AsyncClient(timeout=3.0) as client:
            resp = await client.get(
                f"{url}/collections/{settings.QDRANT_COLLECTION}", headers=headers
            )
        latency = round((time.perf_counter() - t0) * 1000, 1)
        if resp.status_code == 200:
            return ComponentStatus(up=True, latency_ms=latency)
        return ComponentStatus(
            up=resp.status_code < 500,
            latency_ms=latency,
            note=f"HTTP {resp.status_code} (collection may be missing)",
        )
    except Exception as exc:  # noqa: BLE001
        return ComponentStatus(up=False, note=str(exc)[:200])


async def _probe_mongodb() -> ComponentStatus:
    """Legacy/transitional store — reported but not product-critical."""
    try:
        from database.connection import get_database

        db = get_database()
        t0 = time.perf_counter()
        await asyncio.wait_for(db.command("ping"), timeout=3.0)
        return ComponentStatus(
            up=True,
            latency_ms=round((time.perf_counter() - t0) * 1000, 1),
            note="legacy/transitional",
        )
    except Exception as exc:  # noqa: BLE001
        return ComponentStatus(up=False, note=str(exc)[:120])


async def _probe_redis() -> ComponentStatus:
    try:
        from services.redis_service import redis_service

        health = await redis_service.health_check()
        return ComponentStatus(
            up=bool(health.get("healthy")), note=str(health.get("status", ""))[:80]
        )
    except Exception as exc:  # noqa: BLE001
        return ComponentStatus(up=False, note=str(exc)[:120])


_LLM_SNAPSHOT_FIELDS = (
    "provider",
    "status",
    "latency_ms",
    "preferred",
    "consecutive_failures",
    "default_model",
)


def _llm_statuses_cached() -> List[Dict[str, Any]]:
    """Registry snapshot (no network); key hints intentionally dropped."""
    from services import llm_health

    try:
        return [
            {k: item.get(k) for k in _LLM_SNAPSHOT_FIELDS}
            for item in llm_health.snapshot()
        ]
    except Exception as exc:  # noqa: BLE001
        return [{"provider": "*", "status": "snapshot_failed", "note": str(exc)[:160]}]


async def _llm_statuses_fresh() -> List[Dict[str, Any]]:
    from services.llm_health import probe_all

    try:
        results = await probe_all()
        return [
            {
                "provider": r.get("provider"),
                "status": r.get("status"),
                "latency_ms": r.get("latency_ms"),
                "preferred": r.get("preferred"),
                "fresh": True,
            }
            for r in results
        ]
    except Exception as exc:  # noqa: BLE001
        return [{"provider": "*", "status": "probe_failed", "note": str(exc)[:160]}]


# ────────────────────────────── RAG aggregates ──────────────────────────────


async def _rag_window(hours: int = 24) -> Dict[str, Any]:
    """Summary over rag_traces for the overview panel.

    Degrades to ``{"available": False}`` when Postgres or the table is missing
    (pre-migration dev environments) — the overview must never fail because of
    the monitoring store itself.
    """
    since = datetime.now(timezone.utc) - timedelta(hours=hours)
    counts_sql = """
        SELECT
            count(*)                                                    AS total,
            count(*) FILTER (WHERE cache_hit)                           AS cache_hits,
            count(*) FILTER (WHERE error IS NOT NULL)                   AS errors,
            count(*) FILTER (WHERE refusal)                             AS refusals,
            count(*) FILTER (WHERE fallback)                            AS fallbacks,
            COALESCE(sum(COALESCE(tokens_prompt,0)+COALESCE(tokens_completion,0)),0)
                                                                        AS tokens_total
        FROM rag_traces WHERE created_at >= $1
    """
    latency_sql = """
        SELECT
            percentile_cont(0.5)  WITHIN GROUP (ORDER BY total_ms)      AS p50,
            percentile_cont(0.95) WITHIN GROUP (ORDER BY total_ms)      AS p95
        FROM rag_traces
        WHERE created_at >= $1 AND NOT cache_hit AND total_ms IS NOT NULL
    """
    try:
        pool = postgres_pool() if postgres_core_enabled() else None
        if pool is None:
            return {"available": False, "note": "postgres disabled"}
        counts = await pool.fetchrow(counts_sql, since)
        lat = await pool.fetchrow(latency_sql, since)
    except Exception as exc:  # noqa: BLE001 — incl. UndefinedTableError pre-migration
        return {"available": False, "note": str(exc)[:160]}

    n = int(counts["total"] or 0)
    llm_calls = max(n - int(counts["cache_hits"] or 0), 0)
    return {
        "available": True,
        "window_hours": hours,
        "total": n,
        "cache_hits": int(counts["cache_hits"] or 0),
        "cache_hit_rate": round(int(counts["cache_hits"] or 0) / n, 3) if n else None,
        "errors": int(counts["errors"] or 0),
        "error_rate": round(int(counts["errors"] or 0) / llm_calls, 3) if llm_calls else None,
        "refusals": int(counts["refusals"] or 0),
        "refusal_rate": round(int(counts["refusals"] or 0) / llm_calls, 3) if llm_calls else None,
        "fallbacks": int(counts["fallbacks"] or 0),
        "tokens_total": int(counts["tokens_total"] or 0),
        "e2e_p50_ms": _f(lat["p50"]) if lat else None,
        "e2e_p95_ms": _f(lat["p95"]) if lat else None,
    }


# ────────────────────────────── routes ──────────────────────────────


async def _build_overview(fresh_llm: bool) -> OverviewResponse:
    postgres, qdrant, mongodb, redis = await asyncio.gather(
        _probe_postgres(), _probe_qdrant(), _probe_mongodb(), _probe_redis()
    )
    components = {
        "postgres": postgres,
        "qdrant": qdrant,
        "redis": redis,
        "mongodb": mongodb,  # transitional — excluded from overall status
    }
    critical_up = bool(postgres.up) and bool(qdrant.up)
    llm = await _llm_statuses_fresh() if fresh_llm else _llm_statuses_cached()
    rag = await _rag_window(hours=24)

    if not critical_up:
        status = "error"
    elif redis.up is False or any(item.get("status") == "unhealthy" for item in llm):
        status = "degraded"
    else:
        status = "ok"

    return OverviewResponse(
        status=status,
        as_of=datetime.now(timezone.utc),
        app={
            "name": settings.APP_NAME,
            "environment": "development" if settings.DEBUG else "production",
            "started_at": APP_STARTED_AT.isoformat(),
            "uptime_s": round(time.monotonic() - _APP_START_MONOTONIC, 1),
        },
        process=_process_info(),
        host=_host_info(),
        components=components,
        llm=llm,
        rag_24h=rag,
        monitoring={
            "enabled": settings.MONITORING_ENABLED,
            "store_questions": settings.MONITORING_STORE_QUESTIONS,
            "retention_days": settings.MONITORING_RETENTION_DAYS,
            "api_metrics": False,  # P2
        },
    )


@router.get("/overview", response_model=OverviewResponse, summary="System overview")
async def get_overview() -> OverviewResponse:
    """Component health + process/host stats + 24h RAG summary (cheap probes)."""
    return await _build_overview(fresh_llm=False)


@router.post("/probe", response_model=OverviewResponse, summary="System overview (fresh LLM ping)")
async def post_probe() -> OverviewResponse:
    """Same as /overview but forces fresh LLM provider generation pings."""
    return await _build_overview(fresh_llm=True)


@router.get("/rag/stats", response_model=RagStatsResponse, summary="RAG trace aggregates")
async def get_rag_stats(
    hours: int = Query(24, ge=1, le=720),
) -> RagStatsResponse:
    """Per-model / per-stage / verdict / timeline aggregates over rag_traces."""
    pool = _pool_or_503()
    since = datetime.now(timezone.utc) - timedelta(hours=hours)

    counts_sql = """
        SELECT
            count(*)                                              AS total,
            count(*) FILTER (WHERE NOT cache_hit)                 AS llm_calls,
            count(*) FILTER (WHERE cache_hit)                     AS cache_hits,
            count(*) FILTER (WHERE error IS NOT NULL)             AS errors,
            count(*) FILTER (WHERE refusal)                       AS refusals,
            count(*) FILTER (WHERE fallback)                      AS fallbacks
        FROM rag_traces WHERE created_at >= $1
    """
    latency_sql = """
        SELECT
            avg(total_ms)                                         AS avg_ms,
            percentile_cont(0.5)  WITHIN GROUP (ORDER BY total_ms) AS p50,
            percentile_cont(0.95) WITHIN GROUP (ORDER BY total_ms) AS p95,
            max(total_ms)                                         AS max_ms
        FROM rag_traces
        WHERE created_at >= $1 AND NOT cache_hit AND total_ms IS NOT NULL
    """
    # tok/s denominator: generator stage minus retrieval (LLM-only time), floored at 1ms.
    models_sql = """
        SELECT model_used,
               count(*)                                        AS n,
               percentile_cont(0.5)  WITHIN GROUP (ORDER BY total_ms) AS p50,
               percentile_cont(0.95) WITHIN GROUP (ORDER BY total_ms) AS p95,
               max(total_ms)                                   AS max_ms,
               sum(COALESCE(tokens_prompt,0)+COALESCE(tokens_completion,0)) AS tokens,
               avg(COALESCE(tokens_prompt,0)+COALESCE(tokens_completion,0)) AS tokens_avg,
               sum(COALESCE(tokens_completion,0))              AS completion_tokens,
               sum(GREATEST(COALESCE(stage_generator_ms,0)-COALESCE(stage_retrieval_ms,0), 1)) AS llm_ms,
               count(*) FILTER (WHERE error IS NOT NULL)       AS errors,
               count(*) FILTER (WHERE fallback)                AS fallbacks
        FROM rag_traces
        WHERE created_at >= $1 AND NOT cache_hit
        GROUP BY model_used ORDER BY n DESC
    """
    stages_sql = """
        SELECT
            percentile_cont(0.5)  WITHIN GROUP (ORDER BY stage_planner_ms)    AS planner_p50,
            percentile_cont(0.95) WITHIN GROUP (ORDER BY stage_planner_ms)    AS planner_p95,
            percentile_cont(0.5)  WITHIN GROUP (ORDER BY stage_retrieval_ms)  AS retrieval_p50,
            percentile_cont(0.95) WITHIN GROUP (ORDER BY stage_retrieval_ms)  AS retrieval_p95,
            percentile_cont(0.5)  WITHIN GROUP (ORDER BY stage_generator_ms)  AS generator_p50,
            percentile_cont(0.95) WITHIN GROUP (ORDER BY stage_generator_ms)  AS generator_p95,
            percentile_cont(0.5)  WITHIN GROUP (ORDER BY stage_validator_ms)  AS validator_p50,
            percentile_cont(0.95) WITHIN GROUP (ORDER BY stage_validator_ms)  AS validator_p95
        FROM rag_traces
        WHERE created_at >= $1 AND NOT cache_hit
    """
    verdicts_sql = """
        SELECT COALESCE(validator_verdict,'(none)') AS verdict, count(*) AS n
        FROM rag_traces WHERE created_at >= $1
        GROUP BY 1 ORDER BY 2 DESC LIMIT 20
    """
    timeline_sql = """
        SELECT date_trunc('hour', created_at)
               + make_interval(mins => (FLOOR(EXTRACT(MINUTE FROM created_at) / 30) * 30)::int)
                 AS bucket,
               count(*)                                            AS n,
               percentile_cont(0.5)  WITHIN GROUP (ORDER BY total_ms) AS p50,
               percentile_cont(0.95) WITHIN GROUP (ORDER BY total_ms) AS p95
        FROM rag_traces
        WHERE created_at >= $1 AND NOT cache_hit AND total_ms IS NOT NULL
        GROUP BY 1 ORDER BY 1
    """
    try:
        counts = await pool.fetchrow(counts_sql, since)
        lat = await pool.fetchrow(latency_sql, since)
        model_rows = await pool.fetch(models_sql, since)
        stage_row = await pool.fetchrow(stages_sql, since)
        verdict_rows = await pool.fetch(verdicts_sql, since)
        timeline_rows = await pool.fetch(timeline_sql, since)
    except HTTPException:
        raise
    except Exception as exc:  # noqa: BLE001 — table may not exist pre-migration
        raise HTTPException(
            503, detail=f"rag_traces unavailable: {str(exc)[:160]}"
        ) from exc

    c = dict(counts or {})
    llm_calls = int(c.get("llm_calls") or 0)
    by_model = []
    for r in model_rows:
        n = int(r["n"])
        llm_ms = int(r["llm_ms"] or 0)
        completion = int(r["completion_tokens"] or 0)
        by_model.append(
            {
                "model": r["model_used"] or "(unknown)",
                "n": n,
                "p50_ms": _f(r["p50"]),
                "p95_ms": _f(r["p95"]),
                "max_ms": r["max_ms"],
                "tokens": int(r["tokens"] or 0),
                "tokens_avg": _f(r["tokens_avg"]),
                "tok_per_sec": round(completion / (llm_ms / 1000.0), 1)
                if llm_ms > 0 and completion > 0
                else None,
                "error_rate": round(int(r["errors"] or 0) / n, 3),
                "fallback_rate": round(int(r["fallbacks"] or 0) / n, 3),
            }
        )

    l = dict(lat or {})
    return RagStatsResponse(
        window_hours=hours,
        as_of=datetime.now(timezone.utc),
        totals={
            "total": int(c.get("total") or 0),
            "llm_calls": llm_calls,
            "cache_hits": int(c.get("cache_hits") or 0),
            "errors": int(c.get("errors") or 0),
            "refusals": int(c.get("refusals") or 0),
            "fallbacks": int(c.get("fallbacks") or 0),
            "avg_ms": _f(l.get("avg_ms")),
            "p50_ms": _f(l.get("p50")),
            "p95_ms": _f(l.get("p95")),
            "max_ms": l.get("max_ms"),
        },
        by_model=by_model,
        stages={k: _f(v) for k, v in dict(stage_row or {}).items()},
        verdicts={r["verdict"]: int(r["n"]) for r in verdict_rows},
        timeline=[
            {
                "bucket": r["bucket"].isoformat(),
                "n": int(r["n"]),
                "p50_ms": _f(r["p50"]),
                "p95_ms": _f(r["p95"]),
            }
            for r in timeline_rows
        ],
    )


def _build_trace_filters(
    hours: int,
    only_errors: bool,
    only_refusals: bool,
    model: Optional[str],
    language: Optional[str],
    now: Optional[datetime] = None,
) -> Tuple[List[str], List[Any]]:
    """WHERE clauses + positional args for the trace list (asyncpg ``$n``).

    Regression guard: value filters must carry the ``$`` prefix after
    ``format(i=...)`` — a bare ``model_used = 2`` makes Postgres compare
    varchar to integer (503 at runtime, first seen in P1 verification).
    """
    where = ["created_at >= $1"]
    args: List[Any] = [now or datetime.now(timezone.utc) - timedelta(hours=hours)]

    def _add(clause: str, value: Any) -> None:
        args.append(value)
        where.append(clause.format(i=len(args)))

    if only_errors:
        where.append("error IS NOT NULL")
    if only_refusals:
        where.append("refusal")
    if model:
        _add("model_used = ${i}", model)
    if language:
        _add("language = ${i}", language)
    return where, args


@router.get("/rag/traces", response_model=TraceListResponse, summary="RAG trace list")
async def list_rag_traces(
    hours: int = Query(24, ge=1, le=720),
    limit: int = Query(25, ge=1, le=200),
    offset: int = Query(0, ge=0),
    only_errors: bool = False,
    only_refusals: bool = False,
    model: Optional[str] = None,
    language: Optional[str] = None,
) -> TraceListResponse:
    """Paginated request log with filters (newest first)."""
    pool = _pool_or_503()
    where, args = _build_trace_filters(hours, only_errors, only_refusals, model, language)
    where_sql = " AND ".join(where)
    count_sql = f"SELECT count(*) FROM rag_traces WHERE {where_sql}"
    items_sql = f"""
        SELECT id, created_at, session_id, language, model_requested, model_used,
               fallback, cache_hit, total_ms, stage_planner_ms, stage_retrieval_ms,
               stage_generator_ms, stage_validator_ms, tokens_prompt,
               tokens_completion, sources_count, validator_verdict, refusal,
               error IS NOT NULL AS has_error,
               CASE WHEN error IS NOT NULL THEN left(error, 200) END AS error,
               left(question, 120) AS question_preview
        FROM rag_traces WHERE {where_sql}
        ORDER BY id DESC LIMIT ${len(args) + 1} OFFSET ${len(args) + 2}
    """
    filter_args = list(args)
    args.extend([limit, offset])
    try:
        total = await pool.fetchval(count_sql, *filter_args)
        rows = await pool.fetch(items_sql, *args)
    except HTTPException:
        raise
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(
            503, detail=f"rag_traces unavailable: {str(exc)[:160]}"
        ) from exc

    return TraceListResponse(
        total=int(total or 0),
        limit=limit,
        offset=offset,
        items=[TraceListItem(**dict(r)) for r in rows],
    )


@router.get("/rag/traces/{trace_id}", summary="RAG trace detail")
async def get_rag_trace(trace_id: int) -> Dict[str, Any]:
    """Full trace row (segments, per-model tokens, question) for one request."""
    pool = _pool_or_503()
    try:
        row = await pool.fetchrow("SELECT * FROM rag_traces WHERE id = $1", trace_id)
    except HTTPException:
        raise
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(
            503, detail=f"rag_traces unavailable: {str(exc)[:160]}"
        ) from exc
    if not row:
        raise HTTPException(404, detail="trace not found")
    item = dict(row)
    if isinstance(item.get("tokens_by_model"), str):
        try:
            item["tokens_by_model"] = json.loads(item["tokens_by_model"])
        except ValueError:
            pass
    if isinstance(item.get("created_at"), datetime):
        item["created_at"] = item["created_at"].isoformat()
    # Benchmark-import slots stay internal until a backfill exists.
    item.pop("hit1", None)
    item.pop("hit3", None)
    return item
