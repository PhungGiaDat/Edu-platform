"""RAG trace assembly + persistence — Ops Monitoring Dashboard (P1).

Pure builder :func:`build_rag_trace_row` maps one pipeline execution
(AgenticRAGService.run) to a ``rag_traces`` row dict. :func:`schedule_rag_trace`
fires a detached Postgres insert; failures are logged and never propagate to
the chat response (docs/plan/20260912_ops_dashboard.md §6, §12).

All writes are gated by ``settings.MONITORING_ENABLED``. Question text storage
is gated by ``settings.MONITORING_STORE_QUESTIONS`` (truncated to 500 chars).
"""

from __future__ import annotations

import asyncio
import hashlib
import json
import logging
import re
from typing import Any, Dict, List, Optional

from settings import settings
from services.rag_content_rules import match_refusal
from services.rag_trace_context import TraceSink

logger = logging.getLogger(__name__)

QUESTION_MAX_CHARS = 500
ERROR_MAX_CHARS = 500
SOURCE_IDS_MAX = 20

_MODEL_IN_SEGMENT = re.compile(r"model=(\S+)")

INSERT_SQL = """
INSERT INTO rag_traces (
    request_id, user_hash, session_id, language, question,
    model_requested, model_used, fallback, cache_hit,
    stage_planner_ms, stage_retrieval_ms, stage_generator_ms,
    stage_validator_ms, total_ms,
    tokens_prompt, tokens_completion, token_calls, tokens_by_model,
    sources_count, source_ids, validator_verdict, refusal, error, trace_segments
) VALUES (
    $1::uuid, $2, $3, $4, $5,
    $6, $7, $8, $9,
    $10, $11, $12, $13, $14,
    $15, $16, $17, $18::jsonb,
    $19, $20::text[], $21, $22, $23, $24::text[]
)
"""


# ────────────────────────────── pure helpers ──────────────────────────────


def monitoring_hash_salt() -> str:
    """Explicit salt, derived from SECRET_KEY when unset."""
    return settings.MONITORING_HASH_SALT or settings.SECRET_KEY.get_secret_value()


def user_hash(user_id: Optional[str]) -> Optional[str]:
    """Salted sha256 of the user id (stable, non-reversible). None for guests."""
    if not user_id:
        return None
    digest = hashlib.sha256(f"{monitoring_hash_salt()}:{user_id}".encode("utf-8"))
    return digest.hexdigest()


def question_to_store(question: Optional[str]) -> Optional[str]:
    if not question or not settings.MONITORING_STORE_QUESTIONS:
        return None
    return question[:QUESTION_MAX_CHARS]


def _ms(seconds: Optional[float]) -> Optional[int]:
    return None if seconds is None else max(0, round(seconds * 1000))


def token_snapshot(records: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Aggregate raw on_llm_end records into {prompt, completion, calls, by_model}."""
    prompt = completion = calls = 0
    by_model: Dict[str, Dict[str, int]] = {}
    for rec in records:
        p = int(rec.get("prompt_tokens") or 0)
        c = int(rec.get("completion_tokens") or 0)
        prompt += p
        completion += c
        calls += 1
        model = rec.get("model") or "unknown"
        bucket = by_model.setdefault(model, {"p": 0, "c": 0})
        bucket["p"] += p
        bucket["c"] += c
    return {"prompt": prompt, "completion": completion, "calls": calls, "by_model": by_model}


def parse_model_used(agent_trace: List[str]) -> Optional[str]:
    """Generator model actually used (last ``generator:done model=X`` segment)."""
    used = None
    for seg in agent_trace:
        if seg.startswith("generator:done"):
            found = _MODEL_IN_SEGMENT.search(seg)
            if found:
                used = found.group(1)
    return used


def parse_validator_verdict(agent_trace: List[str]) -> str:
    """Map validator segments to one short verdict label (max 40 chars)."""
    segs = [s for s in agent_trace if s.startswith("validator:")]
    if not segs:
        return "skipped"
    last = segs[-1]
    if last.startswith("validator:rule-pass"):
        return "rule-pass"
    if last.startswith("validator:rule-fix"):
        return f"rule-fix{last[len('validator:rule-fix'):]}"[:40]
    if last.startswith("validator:done"):
        found = _MODEL_IN_SEGMENT.search(last)
        return f"llm-pass:{found.group(1)}" if found else "llm-pass"
    if last.startswith("validator:fallback"):
        return "llm-fallback"
    if last.startswith("validator:rule-escalate"):
        return f"rule-escalate{last[len('validator:rule-escalate'):]}"[:40]
    return last.replace("validator:", "")[:40]


def detect_fallback(
    agent_trace: List[str],
    model_used: Optional[str],
    model_requested: Optional[str],
) -> bool:
    """True when any segment reports a fallback or the generator landed on a
    different model than the requested primary."""
    if any(":fallback" in seg for seg in agent_trace):
        return True
    return bool(model_used and model_requested and model_used != model_requested)


def build_rag_trace_row(
    *,
    request_id: str,
    question: Optional[str],
    user_id: Optional[str],
    session_id: str,
    sink: TraceSink,
    agent_trace: List[str],
    final_response: Optional[str],
    sources: Optional[List[Dict[str, Any]]],
    total_seconds: float,
    language: Optional[str] = None,
    generator_model_requested: Optional[str] = None,
    cache_hit: bool = False,
    error: Optional[str] = None,
) -> Dict[str, Any]:
    """Assemble one ``rag_traces`` row from the pipeline outcome (pure)."""
    stages = sink.stages
    tokens = token_snapshot(sink.token_records)
    model_used = parse_model_used(agent_trace) or (
        None if cache_hit else generator_model_requested
    )
    error_text = None if error is None else str(error)[:ERROR_MAX_CHARS]
    if error_text is None and any(
        seg.endswith(":error") or seg == "generator:error" for seg in agent_trace
    ):
        error_text = "pipeline_error"
    source_ids = [
        str(s.get("word")) for s in (sources or [])[:SOURCE_IDS_MAX] if s.get("word")
    ]
    return {
        "request_id": request_id,
        "user_hash": user_hash(user_id),
        "session_id": session_id[:100],
        "language": (language or "")[:8] or None,
        "question": question_to_store(question),
        "model_requested": (generator_model_requested or "")[:120] or None,
        "model_used": (model_used or "")[:120] or None,
        "fallback": detect_fallback(agent_trace, model_used, generator_model_requested),
        "cache_hit": cache_hit,
        "stage_planner_ms": _ms(stages.get("planner")),
        "stage_retrieval_ms": _ms(stages.get("retrieval")),
        "stage_generator_ms": _ms(stages.get("generator")),
        "stage_validator_ms": _ms(stages.get("validator")),
        "total_ms": _ms(total_seconds),
        "tokens_prompt": tokens["prompt"],
        "tokens_completion": tokens["completion"],
        "token_calls": tokens["calls"],
        "tokens_by_model": tokens["by_model"],
        "sources_count": len(sources or []),
        "source_ids": source_ids,
        "validator_verdict": parse_validator_verdict(agent_trace),
        "refusal": bool(final_response) and match_refusal(final_response or "") is not None,
        "error": error_text,
        "trace_segments": list(agent_trace),
    }


# ────────────────────────────── persistence ──────────────────────────────


async def persist_rag_trace(row: Dict[str, Any]) -> None:
    """Insert one trace row. Never raises — monitoring must not affect chat."""
    try:
        from database.postgres_connection import postgres_core_enabled, postgres_pool

        if not postgres_core_enabled():
            return
        await postgres_pool().execute(
            INSERT_SQL,
            row["request_id"],
            row["user_hash"],
            row["session_id"],
            row["language"],
            row["question"],
            row["model_requested"],
            row["model_used"],
            row["fallback"],
            row["cache_hit"],
            row["stage_planner_ms"],
            row["stage_retrieval_ms"],
            row["stage_generator_ms"],
            row["stage_validator_ms"],
            row["total_ms"],
            row["tokens_prompt"],
            row["tokens_completion"],
            row["token_calls"],
            json.dumps(row["tokens_by_model"]),
            row["sources_count"],
            row["source_ids"],
            row["validator_verdict"],
            row["refusal"],
            row["error"],
            row["trace_segments"],
        )
    except Exception as exc:  # noqa: BLE001
        logger.debug(f"[RagTrace] persist failed (ignored): {exc}")


def schedule_rag_trace(row: Dict[str, Any]) -> bool:
    """Fire-and-forget persistence. Returns True when a task was created.

    Short-circuits (zero writes) while ``MONITORING_ENABLED`` is false.
    """
    if not settings.MONITORING_ENABLED:
        return False
    try:
        asyncio.get_running_loop().create_task(persist_rag_trace(row))
        return True
    except RuntimeError:  # pragma: no cover - no event loop (sync context)
        return False


__all__ = [
    "build_rag_trace_row",
    "persist_rag_trace",
    "schedule_rag_trace",
    "token_snapshot",
    "user_hash",
]
