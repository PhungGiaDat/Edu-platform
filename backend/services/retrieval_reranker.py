# backend/services/retrieval_reranker.py
"""Deterministic hybrid reranker: vector score + lexical overlap. No deps."""
import re
from typing import Optional, Sequence


def _tokens(text: str) -> set[str]:
    return {t for t in re.findall(r"[a-z0-9à-ỹ]{2,}", text.lower()) if len(t) >= 2}


def _normalize_scores(chunks: Sequence[dict]) -> list[float]:
    scores = [c.get("score") for c in chunks]
    usable = [s for s in scores if isinstance(s, (int, float))]
    if len(usable) < 2:
        return [0.5 if not isinstance(s, (int, float)) else float(s) for s in scores]
    lo, hi = min(usable), max(usable)
    span = (hi - lo) or 1.0
    return [(float(s) - lo) / span if isinstance(s, (int, float)) else 0.5 for s in scores]


def rerank(query: str, chunks: Sequence[dict], top_k: int = 4) -> list[dict]:
    if not chunks:
        return []
    q_tokens = _tokens(query)
    norms = _normalize_scores(chunks)
    ranked: list[dict] = []
    seen_groups: set[str] = set()
    for chunk, norm in sorted(zip(chunks, norms), key=lambda pair: -pair[1]):
        group = str(chunk.get("canonical_group") or id(chunk))
        if group in seen_groups:
            continue
        seen_groups.add(group)
        c_tokens = _tokens(str(chunk.get("text", "")))
        lexical = (len(q_tokens & c_tokens) / len(q_tokens)) if q_tokens else 0.0
        out = dict(chunk)
        out["rerank_score"] = round(0.6 * norm + 0.4 * lexical, 4)
        ranked.append(out)
    ranked.sort(key=lambda c: -c["rerank_score"])
    return ranked[:top_k]