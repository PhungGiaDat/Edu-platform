"""Metric computation for the Agentic RAG benchmark.

Pure functions over benchmark row dicts — no I/O, no service imports.
"""
from __future__ import annotations

from collections import Counter
from typing import Any, Dict, List, Optional


def _norm(word: Optional[str]) -> str:
    return str(word or "").strip().lower()


def hit_at_k(sources: List[Dict[str, Any]], expected: Optional[str], k: int = 3) -> bool:
    """True when the expected animal appears within the top-k sources."""
    if not expected:
        return False
    words = [_norm(s.get("word")) for s in (sources or [])[:k]]
    return _norm(expected) in words


def mrr(sources: List[Dict[str, Any]], expected: Optional[str]) -> float:
    """Reciprocal rank of the first matching source (0 when absent)."""
    if not expected:
        return 0.0
    for rank, source in enumerate(sources or [], start=1):
        if _norm(source.get("word")) == _norm(expected):
            return 1.0 / rank
    return 0.0


def pctl(values: List[float], q: float) -> Optional[float]:
    """Linear-interpolated percentile of a non-empty list; None when empty."""
    if not values:
        return None
    ordered = sorted(values)
    if len(ordered) == 1:
        return ordered[0]
    pos = (len(ordered) - 1) * q
    low = int(pos)
    high = min(low + 1, len(ordered) - 1)
    frac = pos - low
    return ordered[low] * (1 - frac) + ordered[high] * frac


def _mean(values: List[float]) -> Optional[float]:
    return sum(values) / len(values) if values else None


def latency_stats(rows: List[Dict[str, Any]], key: str) -> Dict[str, Optional[float]]:
    values = [
        float(row["latency"][key])
        for row in rows
        if row.get("latency") and row["latency"].get(key) is not None
    ]
    return {
        "count": len(values),
        "mean": _mean(values),
        "p50": pctl(values, 0.50),
        "p95": pctl(values, 0.95),
        "min": min(values) if values else None,
        "max": max(values) if values else None,
    }


def summarize(rows: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Aggregate all benchmark rows into a summary dict for dashboard/report."""
    indomain = [row for row in rows if row.get("expected_animal_en")]
    ood = [row for row in rows if row.get("category") == "ood"]

    faith = [float(row["judge"]["faithfulness"]) for row in rows if row.get("judge", {}).get("faithfulness") is not None]
    hallucinated = [
        row for row in rows if row.get("judge", {}).get("hallucination") is True
    ]
    refusals = [
        bool(row["judge"]["refusal_correct"])
        for row in rows
        if row.get("judge", {}).get("refusal_correct") is not None
    ]

    error_types: Counter[str] = Counter()
    for row in rows:
        for err in (row.get("judge", {}) or {}).get("error_types") or []:
            if err and err != "none":
                error_types[err] += 1

    pair_verdicts: Dict[str, bool] = {}
    for row in rows:
        pair_id = row.get("pair_id")
        consistency = (row.get("judge", {}) or {}).get("consistent")
        if pair_id and consistency is not None:
            pair_verdicts[pair_id] = bool(consistency)

    trace_counter = Counter()
    for row in rows:
        for step in row.get("agent_trace") or []:
            if step.startswith("planner:fallback"):
                trace_counter["planner_fallback"] += 1
            elif step.startswith("generator:error"):
                trace_counter["generator_error"] += 1
            elif step.startswith("validator:fallback"):
                trace_counter["validator_fallback"] += 1
            elif step.startswith("cache:hit"):
                trace_counter["cache_hit"] += 1
            elif step.startswith("planner:done"):
                trace_counter["planner_done"] += 1
            elif step.startswith("generator:done"):
                trace_counter["generator_done"] += 1
            elif step.startswith("validator:done"):
                trace_counter["validator_done"] += 1

    tokens_total = sum(int((row.get("tokens") or {}).get("total") or 0) for row in rows)
    tokens_prompt = sum(int((row.get("tokens") or {}).get("prompt") or 0) for row in rows)
    tokens_completion = sum(int((row.get("tokens") or {}).get("completion") or 0) for row in rows)

    rows_with_error = [row["id"] for row in rows if row.get("error")]

    return {
        "total": len(rows),
        "by_category": dict(Counter(row.get("category", "?") for row in rows)),
        "retrieval": {
            "hit1_rate": (
                sum(1 for row in indomain if hit_at_k(row.get("sources") or [], row["expected_animal_en"], 1))
                / len(indomain)
                if indomain
                else None
            ),
            "hit3_rate": (
                sum(1 for row in indomain if hit_at_k(row.get("sources") or [], row["expected_animal_en"], 3))
                / len(indomain)
                if indomain
                else None
            ),
            "mrr": (
                _mean([mrr(row.get("sources") or [], row["expected_animal_en"]) for row in indomain])
                if indomain
                else None
            ),
            "indomain_count": len(indomain),
        },
        "quality": {
            "judged_count": len(faith),
            "faithfulness_mean": _mean(faith),
            "hallucination_rate": len(hallucinated) / len(rows) if rows else None,
            "hallucinated_ids": [row["id"] for row in hallucinated],
            "error_taxonomy": dict(error_types),
            "refusal_accuracy": _mean([float(v) for v in refusals]) if refusals else None,
            "refusal_judged": len(refusals),
            "consistency_rate": (
                sum(1 for v in pair_verdicts.values() if v) / len(pair_verdicts) if pair_verdicts else None
            ),
            "consistency_pairs": len(pair_verdicts),
        },
        "latency": {key: latency_stats(rows, key) for key in ("planner", "generator", "retrieval", "validator", "e2e")},
        "agentic": {
            "planner_done": trace_counter.get("planner_done", 0),
            "planner_fallback": trace_counter.get("planner_fallback", 0),
            "generator_done": trace_counter.get("generator_done", 0),
            "generator_error": trace_counter.get("generator_error", 0),
            "validator_done": trace_counter.get("validator_done", 0),
            "validator_fallback": trace_counter.get("validator_fallback", 0),
            "cache_hit": trace_counter.get("cache_hit", 0),
            "pipeline_errors": len(rows_with_error),
        },
        "tokens": {"prompt": tokens_prompt, "completion": tokens_completion, "total": tokens_total},
        "errors": rows_with_error,
    }


def summarize_ab(ab_rows: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Per-generator-model aggregate for the A/B table."""
    by_model: Dict[str, List[Dict[str, Any]]] = {}
    for row in ab_rows:
        model = (row.get("config") or {}).get("generator_model") or "default"
        by_model.setdefault(model, []).append(row)

    table = []
    for model, rows in sorted(by_model.items()):
        summary = summarize(rows)
        table.append(
            {
                "generator_model": model,
                "n": len(rows),
                "e2e_p50": summary["latency"]["e2e"]["p50"],
                "e2e_p95": summary["latency"]["e2e"]["p95"],
                "hit1": summary["retrieval"]["hit1_rate"],
                "faithfulness_mean": summary["quality"]["faithfulness_mean"],
                "hallucination_rate": summary["quality"]["hallucination_rate"],
                "refusal_accuracy": summary["quality"]["refusal_accuracy"],
                "pipeline_errors": summary["agentic"]["pipeline_errors"],
                "tokens_total": summary["tokens"]["total"],
            }
        )
    return table
