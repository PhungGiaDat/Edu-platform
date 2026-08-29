# backend/tests/test_content_safety.py
import pytest
from services.content_safety_service import (
    SafetyVerdict, check_text, assert_safe, ContentSafetyError,
)

def test_clean_text_passes():
    v = check_text("Elephants have trunks")
    assert v == SafetyVerdict(ok=True, reason=None, matched=None)

@pytest.mark.parametrize("bad", ["porn", "p0rn", "f*ck", "khiêu dâm", "vcl"])
def test_blocked_terms_detected_with_normalization(bad):
    v = check_text(f"what does {bad} mean")
    assert v.ok is False and v.matched is not None

def test_mixed_case_and_punctuation_blocked():
    assert check_text("Say PORN!!!").ok is False
    assert check_text("Say F*CK!!!").ok is False  # masked input + uppercase + punctuation

def test_assert_safe_raises_with_field_name():
    with pytest.raises(ContentSafetyError, match="word"):
        assert_safe("porn", field="word")

def test_empty_and_long_text_are_safe():
    assert check_text("").ok is True
    assert check_text("a" * 5000).ok is True
