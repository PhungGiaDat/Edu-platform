"""Validator-stage tests: rule mode (default) vs legacy LLM mode.

Covers the contract introduced with the benchmark fix:
  - settings.VALIDATOR_MODE="rule": clean drafts never touch the validator LLM
  - rule-sanitizable flags (refusal repeat) are fixed deterministically
  - rule-flagged drafts that need rewriting escalate to the LLM validator
  - an explicit validator_model override always uses the LLM path (API contract)
"""
from unittest.mock import AsyncMock, patch

import pytest

from settings import settings
from services.agentic_rag_service import AgenticRAGService
from services.rag_content_rules import REFUSAL_VARIANTS

GOOD_ANSWER = (
    "Chó là người bạn rất thân thiết của con người đó! 🐶 "
    "Chúng sống tình cảm và luôn vui mừng khi thấy chủ. "
    "Chó có mũi rất thính giúp chúng ngửi thấy mùi từ xa. "
    "Dogs run fast. = Chó chạy rất nhanh. (dog: con chó). "
    "Con biết chó thường làm gì khi vui không?"
)


@pytest.fixture
def service_factory():
    def make(history_messages=None):
        chat_repo = AsyncMock()
        chat_repo.find_many = AsyncMock(
            return_value=[{"message": m} for m in (history_messages or [])]
        )
        return AgenticRAGService(retriever=AsyncMock(), chat_repo=chat_repo)

    return make


@pytest.mark.asyncio
async def test_rule_mode_clean_draft_skips_llm_validator(service_factory, monkeypatch):
    monkeypatch.setattr(settings, "VALIDATOR_MODE", "rule")
    service = service_factory()
    trace = []

    with patch("services.agentic_rag_service.ModelRouter") as MockRouter:
        out = await service._validator(
            GOOD_ANSWER, "s-1", None, trace, [{"word": "dog", "score": 0.9}]
        )

    assert out == GOOD_ANSWER
    MockRouter.assert_not_called()
    assert "validator:rule-pass" in trace


@pytest.mark.asyncio
async def test_rule_mode_repeated_refusal_fixed_without_llm(service_factory, monkeypatch):
    monkeypatch.setattr(settings, "VALIDATOR_MODE", "rule")
    service = service_factory(history_messages=[REFUSAL_VARIANTS[0]])
    trace = []

    with patch("services.agentic_rag_service.ModelRouter") as MockRouter:
        out = await service._validator(REFUSAL_VARIANTS[0], "s-1", None, trace, [])

    assert out in REFUSAL_VARIANTS and out != REFUSAL_VARIANTS[0]
    MockRouter.assert_not_called()
    assert any(t.startswith("validator:rule-fix") for t in trace)


@pytest.mark.asyncio
async def test_rule_mode_ungrounded_refusal_escalates_to_llm(service_factory, monkeypatch):
    monkeypatch.setattr(settings, "VALIDATOR_MODE", "rule")
    service = service_factory()
    trace = []

    with patch("services.agentic_rag_service.ModelRouter") as MockRouter:
        router = AsyncMock()
        router.call_with_fallback = AsyncMock(return_value=("bản đã sửa", "m/x"))
        MockRouter.return_value = router

        out = await service._validator(
            REFUSAL_VARIANTS[1], "s-1", None, trace, [{"word": "cat", "score": 0.8}]
        )

    assert out == "bản đã sửa"
    assert any(t.startswith("validator:rule-escalate") for t in trace)
    assert "validator:done model=m/x" in trace


@pytest.mark.asyncio
async def test_llm_mode_validates_every_draft(service_factory, monkeypatch):
    monkeypatch.setattr(settings, "VALIDATOR_MODE", "llm")
    service = service_factory()
    trace = []

    with patch("services.agentic_rag_service.ModelRouter") as MockRouter:
        router = AsyncMock()
        router.call_with_fallback = AsyncMock(return_value=("validated", "m/y"))
        MockRouter.return_value = router

        out = await service._validator(GOOD_ANSWER, "s-1", None, trace, [])

    assert out == "validated"
    assert "validator:start" in trace
    assert not any(t.startswith("validator:rule") for t in trace)


@pytest.mark.asyncio
async def test_validator_model_override_forces_llm_even_in_rule_mode(service_factory, monkeypatch):
    monkeypatch.setattr(settings, "VALIDATOR_MODE", "rule")
    service = service_factory()
    trace = []

    with patch("services.agentic_rag_service.ModelRouter") as MockRouter:
        router = AsyncMock()
        router.call_with_fallback = AsyncMock(return_value=("override out", "custom/v"))
        MockRouter.return_value = router

        out = await service._validator(
            GOOD_ANSWER, "s-1", "custom/v", trace, [{"word": "dog"}]
        )

    assert out == "override out"
    used_roles = [call.kwargs.get("role") for call in MockRouter.call_args_list]
    assert "validator" in used_roles
    assert MockRouter.call_args_list[-1].kwargs.get("primary_model") == "custom/v"


@pytest.mark.asyncio
async def test_llm_validator_failure_returns_sanitized_draft(service_factory, monkeypatch):
    monkeypatch.setattr(settings, "VALIDATOR_MODE", "rule")
    service = service_factory()
    trace = []

    with patch("services.agentic_rag_service.ModelRouter") as MockRouter:
        router = AsyncMock()
        router.call_with_fallback = AsyncMock(side_effect=RuntimeError("up down"))
        MockRouter.return_value = router

        out = await service._validator(
            REFUSAL_VARIANTS[2], "s-1", None, trace, [{"word": "ant", "score": 0.7}]
        )

    # escalation failed → falls back to the rule-sanitized draft (the refusal)
    assert out == REFUSAL_VARIANTS[2]
    assert "validator:fallback" in trace
