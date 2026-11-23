"""Unit tests for the deterministic RAG content-protection rules."""
import pytest

from services.rag_content_rules import (
    ANSWER_MIN_CHARS,
    REFUSAL_VARIANTS,
    evaluate_answer,
    find_banned_term,
    jaccard,
    match_refusal,
    pick_refusal_variant,
    strip_banned_sentences,
)

GOOD_ANSWER = (
    "Chó là người bạn rất thân thiết của con người đó! 🐶 "
    "Chúng sống tình cảm và luôn vui mừng khi thấy chủ. "
    "Chó có mũi rất thính giúp chúng ngửi thấy mùi từ xa. "
    "Dogs run fast. = Chó chạy rất nhanh. (dog: con chó). "
    "Con biết chó thường làm gì khi vui không?"
)

assert len(GOOD_ANSWER) >= ANSWER_MIN_CHARS


# ── helpers ──────────────────────────────────────────────────────────────────

def test_refusal_variants_are_distinct_and_multiple():
    assert len(REFUSAL_VARIANTS) >= 3
    assert len(set(REFUSAL_VARIANTS)) == len(REFUSAL_VARIANTS)


def test_jaccard_ignores_punctuation_and_case():
    assert jaccard("Chào Bé, Edu!", "chào bé edu") == pytest.approx(1.0)
    assert jaccard("mèo hay ngủ", "con voi to lớn") == 0.0


def test_match_refusal_only_matches_bare_refusals():
    assert match_refusal(REFUSAL_VARIANTS[0]) == 0
    assert match_refusal(REFUSAL_VARIANTS[0] + " 🙏") == 0
    # refusal phrase + substantial content → not a bare refusal
    assert match_refusal(GOOD_ANSWER + " " + REFUSAL_VARIANTS[0]) is None


def test_pick_refusal_variant_rotates_away_from_history():
    history = [REFUSAL_VARIANTS[0], "một câu trả lời bình thường"]
    picked = pick_refusal_variant(history)
    assert picked != REFUSAL_VARIANTS[0]
    assert picked in REFUSAL_VARIANTS


def test_find_banned_term_and_strip():
    text = "Chó chạy nhanh. Trẻ em có thể bị ung thư nếu buồn. Mèo rất dễ thương."
    assert find_banned_term(text) is None  # ung thư không nằm trong danh mục cấm hẹp
    risky = "Câu này bình thường. Con nên dùng súng đạn để chơi nhé."
    term = find_banned_term(risky)
    assert term == "súng đạn"
    stripped = strip_banned_sentences(risky, term)
    assert "súng đạn" not in stripped
    assert "bình thường" in stripped


# ── evaluate_answer verdicts ─────────────────────────────────────────────────

def test_clean_answer_passes_without_escalation():
    verdict = evaluate_answer(GOOD_ANSWER, [], has_sources=True)
    assert verdict.clean
    assert not verdict.needs_llm
    assert verdict.sanitized == GOOD_ANSWER


def test_empty_draft_gets_fresh_refusal_without_llm():
    verdict = evaluate_answer("   ", [], has_sources=False)
    assert verdict.flags == ["empty_output"]
    assert not verdict.needs_llm
    assert verdict.sanitized in REFUSAL_VARIANTS


def test_short_draft_escalates():
    verdict = evaluate_answer("Con chó cute.", [], has_sources=True)
    assert "too_short" in verdict.flags
    assert verdict.needs_llm


def test_bare_refusal_with_sources_is_ungrounded_and_escalates():
    verdict = evaluate_answer(REFUSAL_VARIANTS[1], [], has_sources=True)
    assert "refusal_without_grounding" in verdict.flags
    assert verdict.needs_llm


def test_bare_refusal_without_sources_is_accepted():
    verdict = evaluate_answer(REFUSAL_VARIANTS[2], [], has_sources=False)
    assert verdict.clean
    assert not verdict.needs_llm


def test_repeated_refusal_is_swapped_deterministically():
    history = [REFUSAL_VARIANTS[0]]
    verdict = evaluate_answer(REFUSAL_VARIANTS[0], history, has_sources=False)
    assert "refusal_repeat" in verdict.flags
    assert not verdict.needs_llm  # rule fixes it itself — no LLM cost
    assert verdict.sanitized != REFUSAL_VARIANTS[0]
    assert verdict.sanitized in REFUSAL_VARIANTS


def test_duplicate_of_recent_answer_escalates():
    verdict = evaluate_answer(GOOD_ANSWER, [GOOD_ANSWER], has_sources=True)
    assert "duplicate_of_recent_answer" in verdict.flags
    assert verdict.needs_llm


def test_banned_term_flags_and_escalates_but_strips_for_fallback():
    draft = GOOD_ANSWER + " Con hãy thử ma túy xem sao nhé!"
    verdict = evaluate_answer(draft, [], has_sources=True)
    assert any(flag.startswith("banned_term:") for flag in verdict.flags)
    assert verdict.needs_llm
    assert "ma túy" not in verdict.sanitized
    # the grounded part survives for the LLM-down fallback path
    assert "Chó là người bạn" in verdict.sanitized


def test_very_long_draft_escalates():
    verdict = evaluate_answer(GOOD_ANSWER * 20, [], has_sources=True)
    assert "too_long" in verdict.flags
    assert verdict.needs_llm
