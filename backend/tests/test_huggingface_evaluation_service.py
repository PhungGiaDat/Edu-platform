import pytest
from backend.services.huggingface_evaluation_service import HuggingFaceEvaluationService


def test_evaluation_result_structure():
    result = HuggingFaceEvaluationService.evaluate(b"fake_audio", "cat")
    assert hasattr(result, "score")
    assert hasattr(result, "stars")
    assert hasattr(result, "feedback")
    assert result.stars >= 1
    assert result.score >= 0
