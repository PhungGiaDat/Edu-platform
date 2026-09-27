"""Route academic prompts to the thesis-writing-pipeline skill.

The hook is deliberately lexical and fail-open. It never invokes a skill or
blocks a turn; it only adds a short instruction to the model context.
"""

from __future__ import annotations

import json
import re
import sys
from typing import Any


ADDITIONAL_CONTEXT_LIMIT = 480
KEYWORDS = (
    # English
    "thesis",
    "dissertation",
    "academic writing",
    "technical writing",
    "academic prose",
    "chapter",
    "literature review",
    "related work",
    "research gap",
    "methodology",
    "experiment",
    "results",
    "discussion",
    "citation",
    "reference",
    "paper",
    "paraphrase academic",
    "humanize thesis",
    "rewrite thesis",
    "proofread thesis",
    # Vietnamese
    "luận văn",
    "khóa luận",
    "chương",
    "tài liệu tham khảo",
    "trích dẫn",
    "nghiên cứu",
    "phương pháp",
    "kết quả",
    "viết học thuật",
)


def _prompt(payload: Any) -> str:
    if not isinstance(payload, dict):
        return ""
    for key in ("prompt", "user_prompt", "userPrompt"):
        value = payload.get(key)
        if isinstance(value, str):
            return value
    return ""


def _matches(prompt: str) -> bool:
    folded = re.sub(r"\s+", " ", prompt.casefold()).strip()
    return any(term in folded for term in KEYWORDS)


def main() -> int:
    try:
        # Codex hook JSON is UTF-8. Reading bytes avoids Windows console-codepage
        # corruption for Vietnamese thesis keywords.
        payload = json.loads(sys.stdin.buffer.read().decode("utf-8-sig"))
    except (json.JSONDecodeError, UnicodeDecodeError, OSError):
        print(json.dumps({"continue": True}, ensure_ascii=False))
        return 0

    if not _matches(_prompt(payload)):
        print(json.dumps({"continue": True}, ensure_ascii=False))
        return 0

    context = (
        "Academic/thesis task detected. You MUST invoke the "
        "thesis-writing-pipeline skill and follow its routing rules before "
        "returning the final artifact."
    )[:ADDITIONAL_CONTEXT_LIMIT]
    print(
        json.dumps(
            {
                "continue": True,
                "hookSpecificOutput": {
                    "hookEventName": "UserPromptSubmit",
                    "additionalContext": context,
                },
            },
            ensure_ascii=False,
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
