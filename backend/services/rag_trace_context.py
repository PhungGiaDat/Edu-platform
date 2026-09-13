"""Per-request RAG trace sink (contextvar based).

Design (Ops Monitoring Dashboard P1, docs/plan/20260912_ops_dashboard.md §6):
  - A ``TraceSink`` is bound by ``AgenticRAGService.run()`` for the duration of
    one chat request. Stage code calls :func:`mark_stage` to record segment
    durations; the LangChain callback attached to every ChatOpenAI built by
    ``llm_clients`` pushes token usage into the same sink.
  - Everything is a strict no-op when no sink is active (non-chat endpoints,
    background tasks, and the benchmark process which binds its own sink).

This module must stay dependency-light: llm_clients.py imports the callback
handler from here, so nothing under ``services`` may be imported here.
"""

from __future__ import annotations

import contextvars
import logging
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, Tuple

from langchain_core.callbacks import BaseCallbackHandler

logger = logging.getLogger(__name__)


@dataclass
class TraceSink:
    """Mutable per-request collection of stage timings + LLM token usage."""

    #: stage name -> duration in seconds (planner / retrieval / generator / validator)
    stages: Dict[str, float] = field(default_factory=dict)
    #: one record per LLM call: {model, prompt_tokens, completion_tokens, total_tokens}
    token_records: List[Dict[str, Any]] = field(default_factory=list)


_sink_var: contextvars.ContextVar[Optional[TraceSink]] = contextvars.ContextVar(
    "rag_trace_sink", default=None
)


def begin_sink() -> Tuple[contextvars.Token, TraceSink]:
    """Bind a fresh sink to the current context; returns (token, sink)."""
    sink = TraceSink()
    return _sink_var.set(sink), sink


def end_sink(token: contextvars.Token) -> None:
    """Unbind the sink created by :func:`begin_sink`."""
    try:
        _sink_var.reset(token)
    except ValueError:  # pragma: no cover - token from a different context
        logger.debug("[RagTrace] sink token reset failed (foreign context)")


def active_sink() -> Optional[TraceSink]:
    return _sink_var.get()


def mark_stage(name: str, seconds: float) -> None:
    """Record a stage duration; no-op when no sink is active."""
    sink = _sink_var.get()
    if sink is not None:
        sink.stages[name] = seconds


class LlmTraceCallbackHandler(BaseCallbackHandler):
    """Forwards LangChain ``on_llm_end`` usage into the active sink."""

    def on_llm_end(self, response: Any, **kwargs: Any) -> None:  # noqa: D401
        sink = _sink_var.get()
        if sink is None:
            return
        usage: Optional[Dict[str, Any]] = None
        model: Optional[str] = None
        try:
            usage = dict((response.llm_output or {}).get("token_usage") or {})
        except Exception:  # noqa: BLE001
            usage = None
        try:
            message = response.generations[0][0].message
            meta = getattr(message, "usage_metadata", None)
            if meta and not usage:
                usage = {
                    "prompt_tokens": meta.get("input_tokens"),
                    "completion_tokens": meta.get("output_tokens"),
                    "total_tokens": meta.get("total_tokens"),
                }
            model = (getattr(message, "response_metadata", {}) or {}).get("model_name")
        except Exception:  # noqa: BLE001
            pass
        if usage:
            sink.token_records.append({**usage, "model": model})


#: Singleton attached to every ChatOpenAI built by services.llm_clients.
TRACE_HANDLER = LlmTraceCallbackHandler()
