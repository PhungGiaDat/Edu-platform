# backend/services/prompt_guard.py
"""Neutralize prompt-injection vectors on the dictionary LLM path."""
import re

USER_CONTENT_FENCE = "<<<USER_CONTENT>>>"
CONTEXT_FENCE_START = "<<<CONTEXT_START>>>"
CONTEXT_FENCE_END = "<<<CONTEXT_END>>>"

_INJECTION_PATTERNS = [
    r"ignore\s+(all\s+)?(previous|prior|above)\s+instructions",
    r"disregard\s+(all\s+)?(previous|prior|above)",
    r"you\s+are\s+now\s+a",
    r"system\s*[:=]\s*",
    r"new\s+instructions?\s*[:=]\s*",
    r"</?(system|assistant|user)>",
]


def sanitize_user_text(text: str) -> str:
    cleaned = re.sub(r"[\x00-\x08\x0b-\x1f\x7f]", " ", text or "")
    cleaned = re.sub(r"```[a-zA-Z]*", " ", cleaned)     # kill code fences
    cleaned = cleaned.replace("```", " ")
    for pattern in _INJECTION_PATTERNS:
        cleaned = re.sub(pattern, " ", cleaned, flags=re.IGNORECASE)
    return re.sub(r"\s+", " ", cleaned).strip()


def wrap_user_content(text: str) -> str:
    return f"{USER_CONTENT_FENCE}\n{sanitize_user_text(text)}\n{USER_CONTENT_FENCE}"