"""Unit tests for the Ops Monitoring P1 instrumentation layer.

Covers (docs/plan/20260912_ops_dashboard.md §6/§11):
  - rag_trace_context: sink binding, mark_stage no-op semantics, LLM callback
  - rag_observability: pure row builder, verdict/fallback parsing, hashing,
    question storage flags, schedule short-circuit when monitoring is disabled
  - AgenticRAGService.run(): trace scheduled exactly once on success, cache
    hit, and error paths — while the public return contract stays unchanged
"""
import asyncio
from datetime import datetime, timezone
from unittest.mock import AsyncMock

import pytest

from settings import settings
from services.rag_observability import (
    build_rag_trace_row,
    detect_fallback,
    parse_model_used,
    parse_validator_verdict,
    question_to_store,
    schedule_rag_trace,
    token_snapshot,
    user_hash,
)
from services.rag_trace_context import (
    TRACE_HANDLER,
    TraceSink,
    active_sink,
    begin_sink,
    end_sink,
    mark_stage,
)

GOOD_ANSWER = (
    "Chó là người bạn rất thân thiết của con người đó! "
    "Chúng sống tình cảm và luôn vui mừng khi thấy chủ."
)


# ─────────────────────────── sink + callback ───────────────────────────


def test_mark_stage_is_noop_without_sink():
    assert active_sink() is None
    mark_stage("planner", 1.0)  # must not raise


def test_sink_binding_roundtrip():
    token, sink = begin_sink()
    try:
        assert active_sink() is sink
        mark_stage("planner", 0.5)
        assert sink.stages == {"planner": 0.5}
    finally:
        end_sink(token)
    assert active_sink() is None


class _Msg:
    def __init__(self, usage=None, model_name="m-1"):
        self.usage_metadata = usage
        self.response_metadata = {"model_name": model_name}


class _Resp:
    def __init__(self, llm_output=None, message=None):
        self.llm_output = llm_output or {}
        self.generations = [[type("G", (), {"message": message or _Msg()})]]


def test_callback_records_only_with_active_sink():
    TRACE_HANDLER.on_llm_end(_Resp({"token_usage": {"prompt_tokens": 3}}))  # no sink
    token, sink = begin_sink()
    try:
        TRACE_HANDLER.on_llm_end(
            _Resp({"token_usage": {"prompt_tokens": 10, "completion_tokens": 4}})
        )
        TRACE_HANDLER.on_llm_end(_Resp(None, _Msg({"input_tokens": 1, "output_tokens": 2, "total_tokens": 3})))
        assert sink.token_records == [
            {"prompt_tokens": 10, "completion_tokens": 4, "model": "m-1"},
            {"prompt_tokens": 1, "completion_tokens": 2, "total_tokens": 3, "model": "m-1"},
        ]
    finally:
        end_sink(token)


# ─────────────────────────── pure helpers ───────────────────────────


def test_parse_model_used_takes_last_generator_done():
    trace = [
        "generator:start",
        "generator:done model=a",
        "validator:start",
        "generator:done model=b/x",
    ]
    assert parse_model_used(trace) == "b/x"
    assert parse_model_used(["planner:done model=a"]) is None


@pytest.mark.parametrize(
    "trace,expected",
    [
        ([], "skipped"),
        (["validator:start", "validator:rule-pass"], "rule-pass"),
        (["validator:rule-fix[refusal-repeat]"], "rule-fix[refusal-repeat]"),
        (["validator:done model=v-9"], "llm-pass:v-9"),
        (["validator:fallback"], "llm-fallback"),
        (["validator:weird-thing"], "weird-thing"),
    ],
)
def test_validator_verdicts(trace, expected):
    assert parse_validator_verdict(trace) == expected


def test_fallback_detection():
    assert detect_fallback(["generator:fallback"], "b", "a") is True
    assert detect_fallback([], "b", "a") is True  # landed on different model
    assert detect_fallback([], "a", "a") is False
    assert detect_fallback(["generator:done model=a"], None, None) is False


def test_token_snapshot_aggregates_by_model():
    records = [
        {"prompt_tokens": 10, "completion_tokens": 5, "model": "a"},
        {"prompt_tokens": 1, "completion_tokens": 2, "model": "a"},
        {"prompt_tokens": 7, "completion_tokens": 1, "model": None},
    ]
    snap = token_snapshot(records)
    assert snap["prompt"] == 18
    assert snap["completion"] == 8
    assert snap["calls"] == 3
    assert snap["by_model"] == {"a": {"p": 11, "c": 7}, "unknown": {"p": 7, "c": 1}}


def test_user_hash_stable_and_guest_free():
    assert user_hash(None) is None
    assert user_hash("") is None
    h1 = user_hash("user-1")
    assert h1 == user_hash("user-1")
    assert h1 != user_hash("user-2")
    assert len(h1) == 64
    assert "user-1" not in h1


def test_question_storage(monkeypatch):
    monkeypatch.setattr(settings, "MONITORING_STORE_QUESTIONS", True)
    assert question_to_store("mèo") == "mèo"
    assert question_to_store("x" * 900) == "x" * 500
    assert question_to_store("") is None
    monkeypatch.setattr(settings, "MONITORING_STORE_QUESTIONS", False)
    assert question_to_store("mèo") is None


# ─────────────────────────── row builder ───────────────────────────


def _sink_with(stages=None, tokens=None):
    sink = TraceSink()
    sink.stages.update(stages or {})
    sink.token_records.extend(tokens or [])
    return sink


def test_build_row_happy_path(monkeypatch):
    monkeypatch.setattr(settings, "MONITORING_STORE_QUESTIONS", True)
    sink = _sink_with(
        stages={"planner": 1.234, "retrieval": 0.4, "generator": 5.0, "validator": 0.01},
        tokens=[{"prompt_tokens": 100, "completion_tokens": 40, "model": "gen-1"}],
    )
    row = build_rag_trace_row(
        request_id="11111111-1111-1111-1111-111111111111",
        question="con mèo là gì",
        user_id="u-1",
        session_id="s-1",
        sink=sink,
        agent_trace=[
            "planner:done model=pl-1",
            "generator:done model=gen-1",
            "validator:rule-pass",
        ],
        final_response=GOOD_ANSWER,
        sources=[{"word": "cat"}, {"word": "dog"}],
        total_seconds=6.66,
        language="vi",
        generator_model_requested="gen-1",
    )
    assert row["stage_planner_ms"] == 1234
    assert row["stage_retrieval_ms"] == 400
    assert row["total_ms"] == 6660
    assert row["model_used"] == "gen-1"
    assert row["model_requested"] == "gen-1"
    assert row["fallback"] is False
    assert row["cache_hit"] is False
    assert row["tokens_prompt"] == 100
    assert row["tokens_completion"] == 40
    assert row["tokens_by_model"] == {"gen-1": {"p": 100, "c": 40}}
    assert row["source_ids"] == ["cat", "dog"]
    assert row["sources_count"] == 2
    assert row["validator_verdict"] == "rule-pass"
    assert row["refusal"] is False
    assert row["error"] is None
    assert row["trace_segments"][-1] == "validator:rule-pass"
    assert row["user_hash"] is not None


def test_build_row_error_and_refusal(monkeypatch):
    monkeypatch.setattr(settings, "MONITORING_STORE_QUESTIONS", True)
    from services.rag_content_rules import REFUSAL_VARIANTS

    sink = _sink_with(stages={"planner": 0.5})
    # Refusal detected from the final text
    row = build_rag_trace_row(
        request_id="22222222-2222-2222-2222-222222222222",
        question="x",
        user_id=None,
        session_id="s",
        sink=sink,
        agent_trace=["generator:done model=m"],
        final_response=REFUSAL_VARIANTS[0],
        sources=[],
        total_seconds=1.0,
    )
    assert row["refusal"] is True
    assert row["user_hash"] is None
    assert row["question"] == "x"

    # Explicit exception text wins; segment-marked error becomes pipeline_error
    row_err = build_rag_trace_row(
        request_id="33333333-3333-3333-3333-333333333333",
        question="x", user_id=None, session_id="s", sink=sink,
        agent_trace=["generator:done model=m"],
        final_response=None, sources=[], total_seconds=1.0, error="boom",
    )
    assert row_err["error"] == "boom"

    row_seg = build_rag_trace_row(
        request_id="44444444-4444-4444-4444-444444444444",
        question="x", user_id=None, session_id="s", sink=sink,
        agent_trace=["generator:error"],
        final_response=None, sources=[], total_seconds=1.0,
    )
    assert row_seg["error"] == "pipeline_error"


# ─────────────────────────── schedule gate ───────────────────────────


def test_schedule_short_circuits_when_disabled(monkeypatch):
    monkeypatch.setattr(settings, "MONITORING_ENABLED", False)
    created = []
    monkeypatch.setattr(
        "asyncio.get_running_loop",
        lambda: type("L", (), {"create_task": staticmethod(lambda coro: created.append(coro))})(),
    )
    assert schedule_rag_trace({"request_id": "x"}) is False
    assert created == []  # zero tasks, zero writes


@pytest.mark.asyncio
async def test_schedule_fires_persist_when_enabled(monkeypatch):
    monkeypatch.setattr(settings, "MONITORING_ENABLED", True)
    calls = []

    async def fake_persist(row):
        calls.append(row)

    monkeypatch.setattr("services.rag_observability.persist_rag_trace", fake_persist)
    assert schedule_rag_trace({"request_id": "r-1"}) is True
    await asyncio.sleep(0)  # let the fire-and-forget task run
    assert calls == [{"request_id": "r-1"}]


# ─────────────────────── run() instrumentation ───────────────────────


@pytest.fixture
def instrumented_service():
    from services.agentic_rag_service import AgenticRAGService

    svc = AgenticRAGService(retriever=AsyncMock(), chat_repo=AsyncMock())
    return svc


async def _run_with_fakes(service, monkeypatch, *, cached=None, generator_error=None):
    """Patch run() internals; return (result-or-exc, scheduled_rows)."""
    monkeypatch.setattr("services.agentic_rag_service.INTER_AGENT_DELAY", 0)
    rows = []
    monkeypatch.setattr(
        "services.agentic_rag_service.schedule_rag_trace", lambda row: rows.append(row) or True
    )

    async def fake_planner(question, user_id, model, trace):
        await asyncio.sleep(0.02)  # run() measures planner itself via perf_counter
        trace.append("planner:done model=pl-1")
        active_sink().token_records.append(
            {"prompt_tokens": 5, "completion_tokens": 2, "model": "pl-1"}
        )
        return {"language": "vi"}

    async def fake_generator(question, plan, model, trace):
        if generator_error:
            trace.append("generator:error")
            raise generator_error
        trace.append("generator:done model=gen-1")
        mark_stage("retrieval", 0.03)  # real _generator marks this internally
        return GOOD_ANSWER, [{"word": "cat"}]

    async def fake_validator(draft, session_id, model, trace, sources):
        trace.append("validator:rule-pass")
        return draft

    service._get_cache = AsyncMock(return_value=cached)
    service._set_cache = AsyncMock()
    service._planner = fake_planner
    service._generator = fake_generator
    service._validator = fake_validator
    exc = None
    result = None
    try:
        result = await service.run("con mèo là gì", "u-1", "s-1")
    except Exception as e:  # noqa: BLE001
        exc = e
    return result, exc, rows


@pytest.mark.asyncio
async def test_run_success_schedules_one_complete_row(instrumented_service, monkeypatch):
    result, exc, rows = await _run_with_fakes(instrumented_service, monkeypatch)
    assert exc is None
    # public contract unchanged
    assert set(result) == {"response", "sources", "cached", "agent_trace"}
    assert result["cached"] is False
    # exactly one monitoring row
    assert len(rows) == 1
    row = rows[0]
    assert row["cache_hit"] is False
    assert row["error"] is None
    assert row["language"] == "vi"
    assert row["model_used"] == "gen-1"
    assert row["validator_verdict"] == "rule-pass"
    assert row["stage_planner_ms"] >= 10  # measured by run() around the fake's sleep
    assert row["stage_retrieval_ms"] == 30
    assert row["tokens_prompt"] == 5
    assert row["trace_segments"][0] == "planner:done model=pl-1"
    # sink is unbound after run()
    assert active_sink() is None


@pytest.mark.asyncio
async def test_run_cache_hit_row(instrumented_service, monkeypatch):
    cached = {"response": GOOD_ANSWER, "sources": [{"word": "cat"}]}
    result, exc, rows = await _run_with_fakes(
        instrumented_service, monkeypatch, cached=cached
    )
    assert exc is None
    assert result["cached"] is True
    assert result["agent_trace"] == ["cache:hit"]
    assert len(rows) == 1
    assert rows[0]["cache_hit"] is True
    assert rows[0]["validator_verdict"] == "cache-hit"
    assert rows[0]["model_used"] is None
    assert rows[0]["fallback"] is False


@pytest.mark.asyncio
async def test_run_error_path_still_schedules_row(instrumented_service, monkeypatch):
    result, exc, rows = await _run_with_fakes(
        instrumented_service, monkeypatch, generator_error=RuntimeError("qdrant down")
    )
    assert isinstance(exc, RuntimeError)
    assert result is None
    assert len(rows) == 1
    assert rows[0]["error"] == "qdrant down"
    assert rows[0]["stage_planner_ms"] >= 10  # planner work before the failure is kept
    assert "generator:error" in rows[0]["trace_segments"]
    assert active_sink() is None


# ─────────────────────── factory callback wiring ───────────────────────


def test_tokenrouter_factory_attaches_trace_handler():
    from services.llm_clients import get_tokenrouter_llm
    from services.rag_trace_context import LlmTraceCallbackHandler

    llm = get_tokenrouter_llm("some/model", temperature=0)
    assert any(isinstance(cb, LlmTraceCallbackHandler) for cb in llm.callbacks)


# ─────────────────────── trace filter SQL (P1 runtime bug guard) ───────────────────────


def test_trace_filters_value_clauses_use_dollar_placeholders():
    """`model_used = 2` (no $) made Postgres compare varchar=int → 503."""
    from api.admin_monitoring import _build_trace_filters

    fixed_now = datetime(2026, 9, 13, 12, 0, 0, tzinfo=timezone.utc)
    where, args = _build_trace_filters(
        24, False, False, "glm-4.7", "vi", now=fixed_now
    )
    assert where == [
        "created_at >= $1",
        "model_used = $2",
        "language = $3",
    ]
    assert args == [fixed_now, "glm-4.7", "vi"]
    joined = " AND ".join(where)
    # every placeholder must be asyncpg-style $n, never a bare number
    assert "= $2" in joined and "= 2" not in joined.replace("= $2", "")


def test_trace_filters_bool_and_empty_cases():
    from api.admin_monitoring import _build_trace_filters

    where, args = _build_trace_filters(72, True, True, None, None)
    assert where == ["created_at >= $1", "error IS NOT NULL", "refusal"]
    assert len(args) == 1  # only the window param
