"""
Deterministic content-protection rules for the Agentic RAG validator stage.

Baseline benchmark evidence (raw_baseline_20260912_015558):
  - LLM validator cost 7.08s p50 (~34% of end-to-end latency)
  - It caught 0/11 hallucinations and modified 0/60 answers
  - 24/60 answers echoed the single hardcoded refusal string verbatim

This module replaces the always-on LLM validation with cheap rule checks
(banned terms, refusal echo/rotation, length bounds, duplicate detection).
The LLM validator is only escalated for drafts the rules cannot fix, or when
settings.VALIDATOR_MODE = "llm" (legacy behaviour) / a validator_model
override is explicitly passed.

REFUSAL_VARIANTS is the single source of truth shared with GENERATOR_PROMPT:
the generator is told to pick one of these, the validator detects when the
model echoes one verbatim too often.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import List, Optional, Sequence, Set

# ──────────────────────────────────────────────────────────────────────────────
# Canonical refusal variants (shared with GENERATOR_PROMPT)
# ──────────────────────────────────────────────────────────────────────────────

REFUSAL_VARIANTS: tuple[str, ...] = (
    "Mình chưa biết từ này, hỏi thầy cô nhé! 📚",
    "Ôi, bài học của mình chưa có thông tin này, con hỏi thầy cô nhé! 🙌",
    "Cái này mình chưa được học, con hỏi thầy cô để biết thêm nhé! 🌟",
    "Mình chịu câu này rồi, con hỏi cô giáo nhé! 📖",
)

# ──────────────────────────────────────────────────────────────────────────────
# Thresholds
# ──────────────────────────────────────────────────────────────────────────────

# A structured 4-6 sentence kid answer is ~250-900 chars. Anything shorter is a
# degenerate draft (bare echo, truncation); anything longer risks wall-of-text.
ANSWER_MIN_CHARS = 100
ANSWER_MAX_CHARS = 1400

# Word-level Jaccard >= this against a recent AI message = the bot repeated itself
# (the duplicate check the old LLM validator was paid to do and never did).
DUPLICATE_JACCARD_THRESHOLD = 0.8

# Word-level Jaccard >= this against a refusal variant = answer is a bare refusal.
REFUSAL_ECHO_SIMILARITY = 0.7

# ──────────────────────────────────────────────────────────────────────────────
# Content protection vocabulary (deliberately narrow = high precision, so
# legitimate animal facts are never stripped).
# ──────────────────────────────────────────────────────────────────────────────

BANNED_TERMS: tuple[str, ...] = (
    "tự tử",
    "ma túy",
    "heroin",
    "cần sa",
    "thuốc lá",
    "rượu bia",
    "khiêu dâm",
    "dâm ô",
    "tình dục",
    "bạo hành trẻ em",
    "giết người",
    "chết chóc",
    "súng đạn",
    "bom đạn",
    "porn",
    "suicide",
    "hard drug",
)

# ──────────────────────────────────────────────────────────────────────────────
# Text helpers
# ──────────────────────────────────────────────────────────────────────────────

_NON_WORD_RE = re.compile(r"[^\w\s]", re.UNICODE)
_WS_RE = re.compile(r"\s+")


def _clean(text: str) -> str:
    """Lowercase, drop punctuation/emoji, collapse whitespace. Unicode-aware for Vietnamese."""
    text = text.lower()
    text = _NON_WORD_RE.sub(" ", text)
    return _WS_RE.sub(" ", text).strip()


def _token_set(text: str) -> Set[str]:
    cleaned = _clean(text)
    return set(cleaned.split()) if cleaned else set()


def jaccard(a: str, b: str) -> float:
    """Word-level Jaccard similarity between two texts (0.0-1.0)."""
    ta, tb = _token_set(a), _token_set(b)
    if not ta or not tb:
        return 0.0
    return len(ta & tb) / len(ta | tb)


# ──────────────────────────────────────────────────────────────────────────────
# Refusal detection / rotation
# ──────────────────────────────────────────────────────────────────────────────

def match_refusal(text: str) -> Optional[int]:
    """Index of the REFUSAL_VARIANTS entry the answer is essentially equal to, else None.

    Only *bare* refusals (answer ≈ the variant itself) match — a refusal phrase
    followed by real content drops the similarity and is treated as a normal answer.
    """
    if not text or not text.strip():
        return None
    for index, variant in enumerate(REFUSAL_VARIANTS):
        if jaccard(text, variant) >= REFUSAL_ECHO_SIMILARITY:
            return index
    return None


def refusal_indices_in(text: str) -> Set[int]:
    """Which refusal variants appear (as substrings) inside a longer message."""
    cleaned = _clean(text)
    if not cleaned:
        return set()
    return {
        index
        for index, variant in enumerate(REFUSAL_VARIANTS)
        if _clean(variant) in cleaned
    }


def pick_refusal_variant(history: Sequence[str] = ()) -> str:
    """Deterministically choose a refusal variant not recently used, for rotation."""
    used: Set[int] = set()
    for message in history:
        used |= refusal_indices_in(message)
        bare = match_refusal(message)
        if bare is not None:
            used.add(bare)
    for index in range(len(REFUSAL_VARIANTS)):
        if index not in used:
            return REFUSAL_VARIANTS[index]
    return REFUSAL_VARIANTS[0]


# ──────────────────────────────────────────────────────────────────────────────
# Banned terms
# ──────────────────────────────────────────────────────────────────────────────

def find_banned_term(text: str) -> Optional[str]:
    cleaned = _clean(text)
    for term in BANNED_TERMS:
        if _clean(term) in cleaned:
            return term
    return None


_SENTENCE_SPLIT_RE = re.compile(r"(?<=[.!?])\s+|\n+")


def strip_banned_sentences(text: str, term: str) -> str:
    """Remove sentences containing the banned term. '' if nothing survives."""
    needle = _clean(term)
    kept = [
        sentence
        for sentence in _SENTENCE_SPLIT_RE.split(text.strip())
        if sentence and needle not in _clean(sentence)
    ]
    return " ".join(kept).strip()


# ──────────────────────────────────────────────────────────────────────────────
# Main entry point
# ──────────────────────────────────────────────────────────────────────────────

@dataclass
class RuleVerdict:
    """Outcome of deterministic validation for one draft answer."""

    flags: List[str] = field(default_factory=list)
    sanitized: str = ""
    needs_llm: bool = False

    @property
    def clean(self) -> bool:
        return not self.flags


def evaluate_answer(
    draft: str,
    recent_history: Sequence[str] = (),
    has_sources: bool = True,
) -> RuleVerdict:
    """Rule-based validator: returns a verdict with an optionally fixed draft.

    Args:
        draft: the generator's raw answer.
        recent_history: recent AI messages for this session (order-independent).
        has_sources: whether retrieval produced context documents. A bare refusal
            with sources present means the answerer gave up too early.
    """
    text = (draft or "").strip()
    verdict = RuleVerdict(sanitized=text)

    if not text:
        verdict.flags.append("empty_output")
        verdict.sanitized = pick_refusal_variant(recent_history)
        return verdict

    # ── 1. Content protection ─────────────────────────────────────────────
    banned = find_banned_term(text)
    if banned:
        verdict.flags.append(f"banned_term:{banned}")
        stripped = strip_banned_sentences(text, banned)
        verdict.sanitized = stripped or pick_refusal_variant(recent_history)
        verdict.needs_llm = True

    # ── 2. Refusal handling (echo + rotation) ─────────────────────────────
    refusal_idx = match_refusal(verdict.sanitized)
    if refusal_idx is not None:
        used = set()
        for message in recent_history:
            used |= refusal_indices_in(message)
            bare = match_refusal(message)
            if bare is not None:
                used.add(bare)
        if refusal_idx in used:
            verdict.flags.append("refusal_repeat")
            verdict.sanitized = pick_refusal_variant(recent_history)
        if has_sources:
            # Context WAS retrieved but the draft is a bare refusal → likely a
            # premature give-up the generator prompt should prevent; let the LLM
            # validator rewrite it from the same draft's language.
            verdict.flags.append("refusal_without_grounding")
            verdict.needs_llm = True
        return verdict  # bare refusals are not subject to length/duplicate rules

    # ── 3. Length bounds ──────────────────────────────────────────────────
    if len(verdict.sanitized) < ANSWER_MIN_CHARS:
        verdict.flags.append("too_short")
        verdict.needs_llm = True
    if len(verdict.sanitized) > ANSWER_MAX_CHARS:
        verdict.flags.append("too_long")
        verdict.needs_llm = True

    # ── 4. Duplicate vs recent AI answers ─────────────────────────────────
    for message in recent_history:
        if message and jaccard(verdict.sanitized, message) >= DUPLICATE_JACCARD_THRESHOLD:
            verdict.flags.append("duplicate_of_recent_answer")
            verdict.needs_llm = True
            break

    return verdict
