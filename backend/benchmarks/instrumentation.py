"""Instrumented AgenticRAGService wrapper for benchmarking.

Provides (no production code changes required):
  - per-stage latency capture (planner / generator / retrieval / validator)
  - token usage capture via LangChain model callbacks
  - optional cache bypass (cold-run measurement)
  - capture of retrieved context documents for judging

All patching is instance/module-local to the benchmark process.
"""
from __future__ import annotations

import logging
import time
from typing import Any, Callable, Dict, List, Optional

logger = logging.getLogger(__name__)

_RETRIEVED_DOC_FIELDS = ("text", "animal_en", "score", "topic", "level")


class TokenCollector:
    """Aggregates LLM token usage by attaching itself as a model callback."""

    def __init__(self) -> None:
        self.records: List[Dict[str, Any]] = []

    def reset(self) -> None:
        self.records.clear()

    def snapshot(self) -> Dict[str, Any]:
        totals = {"prompt": 0, "completion": 0, "total": 0, "calls": len(self.records)}
        models: Dict[str, int] = {}
        for rec in self.records:
            totals["prompt"] += int(rec.get("prompt_tokens") or 0)
            totals["completion"] += int(rec.get("completion_tokens") or 0)
            totals["total"] += int(rec.get("total_tokens") or 0)
            model = rec.get("model") or "unknown"
            models[model] = models.get(model, 0) + int(rec.get("total_tokens") or 0)
        return {**totals, "by_model": models}

    # ── LangChain BaseCallbackHandler protocol (sync methods are enough) ──
    def on_llm_end(self, response: Any, **kwargs: Any) -> None:  # noqa: D401
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
            self.records.append({**usage, "model": model})


def install_token_collector(collector: TokenCollector) -> None:
    """Patch llm_clients factories so every ChatOpenAI reports into `collector`.

    The services module resolves get_tokenrouter_llm / get_bai_llm at call time
    from the llm_clients module globals, so patching there intercepts all
    ModelRouter cascade construction.
    """
    from langchain_core.callbacks import BaseCallbackHandler

    from services import llm_clients

    class _Handler(BaseCallbackHandler):
        def on_llm_end(self, response: Any, **kwargs: Any) -> None:  # noqa: D401
            collector.on_llm_end(response, **kwargs)

    handler = _Handler()

    def _attach(llm: Any) -> Any:
        # Append (not replace): the factories now ship a production trace
        # callback (services.rag_trace_context.TRACE_HANDLER) that must keep
        # working alongside the benchmark collector.
        try:
            existing = list(llm.callbacks or [])
            llm.callbacks = existing + [handler]
        except Exception:  # noqa: BLE001
            try:
                llm.callbacks = [handler]
            except Exception:  # noqa: BLE001
                logger.warning("[bench] could not attach token collector to LLM")
        return llm

    orig_tr = llm_clients.get_tokenrouter_llm
    orig_bai = llm_clients.get_bai_llm

    def tr(model: str, *args: Any, **kwargs: Any) -> Any:
        # "bai/<model>" strings route directly to the BAI provider — lets the
        # benchmark A/B against BAI models through the standard ModelRouter.
        if str(model).startswith("bai/"):
            return _attach(orig_bai(str(model)[4:], *args, **kwargs))
        return _attach(orig_tr(model, *args, **kwargs))

    def bai(model: str, *args: Any, **kwargs: Any) -> Any:
        return _attach(orig_bai(model, *args, **kwargs))

    llm_clients.get_tokenrouter_llm = tr  # type: ignore[assignment]
    llm_clients.get_bai_llm = bai  # type: ignore[assignment]


def _async_timed(original: Callable[..., Any], key: str, store: Dict[str, Any]) -> Callable[..., Any]:
    async def wrapper(*args: Any, **kwargs: Any) -> Any:
        started = time.perf_counter()
        try:
            return await original(*args, **kwargs)
        finally:
            store[key] = time.perf_counter() - started

    return wrapper


class InstrumentedPipeline:
    """Owns one instrumented AgenticRAGService instance."""

    def __init__(self, no_cache: bool = True) -> None:
        from services.agentic_rag_service import AgenticRAGService

        self.collector = TokenCollector()
        self.store: Dict[str, Any] = {"retrieval_time": None, "retrieved_docs": []}
        self.service = AgenticRAGService()

        install_token_collector(self.collector)

        # per-stage timing (instance-level wrappers)
        self.service._planner = _async_timed(self.service._planner, "planner", self.store)  # type: ignore[method-assign]
        self.service._generator = _async_timed(self.service._generator, "generator", self.store)  # type: ignore[method-assign]
        self.service._validator = _async_timed(self.service._validator, "validator", self.store)  # type: ignore[method-assign]

        # retrieval timing + context capture
        retriever = self.service._retriever
        original_retrieve = retriever.retrieve
        outer = self

        async def retrieve_wrapper(query: str) -> List[Dict[str, Any]]:
            started = time.perf_counter()
            docs = await original_retrieve(query)
            outer.store["retrieval_time"] = time.perf_counter() - started
            outer.store["retrieved_docs"] = [
                {field: doc.get(field) for field in _RETRIEVED_DOC_FIELDS if doc.get(field) is not None}
                for doc in docs
            ]
            return docs

        retriever.retrieve = retrieve_wrapper  # type: ignore[method-assign]

        if no_cache:
            async def _noop(*args: Any, **kwargs: Any) -> None:
                return None

            self.service._get_cache = _noop  # type: ignore[method-assign]
            self.service._set_cache = _noop  # type: ignore[method-assign]

    async def run(self, question: str, session_id: str, generator_model: Optional[str] = None) -> Dict[str, Any]:
        """Run one question; returns pipeline result + benchmark metadata."""
        self.collector.reset()
        self.store["retrieval_time"] = None
        self.store["retrieved_docs"] = []

        started = time.perf_counter()
        result = await self.service.run(
            question=question,
            user_id=None,
            session_id=session_id,
            generator_model=generator_model,
        )
        e2e = time.perf_counter() - started

        stage_times = {
            "planner": self.store.get("planner"),
            "generator": self.store.get("generator"),
            "retrieval": self.store.get("retrieval_time"),
            "validator": self.store.get("validator"),
            "e2e": e2e,
        }
        tokens = self.collector.snapshot()
        return {
            **result,
            "stage_times": stage_times,
            "tokens": tokens,
            "retrieved_docs": self.store["retrieved_docs"],
        }
