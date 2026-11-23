# backend/services/content_safety_service.py
"""Profanity/vulgarity gate for children 5-12. Pure, deterministic, no deps."""
import re
from dataclasses import dataclass
from typing import Optional

# Seed blocklist. Strong EN terms stored masked (f*ck) — _normalize strips
# mask chars, so a masked entry normalizes to the stripped spelling ("fck")
# and would MISS the plain word ("fuck"). Every masked EN term therefore has a
# plain form alongside it. VI entries are ASCII-folded (diacritics removed by
# _normalize).
_BLOCKED_TERMS = frozenset({
    # EN — masked strong terms (match masked/punctuated input after stripping)
    "f*ck", "f*ck*n", "sh*t", "b*tch", "d*ck", "c*ck", "a**ole", "bast*rd",
    "wh*re", "sl*t", "p*rn", "s*x", "s*xy", "n*de", "n*ked", "x*x",
    "d*mn", "cr*p", "bl*dy", "h*te", "st*pid", "id*ot",
    # EN — plain forms of every masked term above (catch the actual words)
    "fuck", "fucking", "shit", "bitch", "dick", "cock", "asshole", "bastard",
    "whore", "slut", "sex", "sexy", "nude", "naked", "damn", "crap", "bloody",
    "hate", "stupid", "idiot",
    # EN — unsafe-topic terms (plain) + plain "nazi" alongside masked "n*zi"
    "suicide", "cocaine", "heroin", "weapon", "n*zi", "nazi",
    # EN — plain stored term: masked "p*rn" normalizes to "prn", which would
    # miss the plain word and the leetspeak form ("p0rn" -> "porn"). Keep the
    # plain form alongside so plain/leet/punctuated input is caught.
    "porn",
    # VI — ASCII-folded romanizations
    "dit", "dm", "dcm", "vcl", "clgt", "oc cho", "khieu dam", "khoa than",
    "ma tuy", "giet nguoi",
})

_LEET = str.maketrans({"0": "o", "1": "i", "3": "e", "4": "a", "5": "s",
                       "7": "t", "@": "a", "$": "s"})
_VI_FOLD = str.maketrans({
    "à": "a", "á": "a", "ả": "a", "ã": "a", "ạ": "a", "ă": "a", "â": "a",
    "è": "e", "é": "e", "ẻ": "e", "ẽ": "e", "ẹ": "e", "ê": "e",
    "ì": "i", "í": "i", "ỉ": "i", "ĩ": "i", "ị": "i",
    "ò": "o", "ó": "o", "ỏ": "o", "õ": "o", "ọ": "o", "ô": "o", "ơ": "o",
    "ù": "u", "ú": "u", "ủ": "u", "ũ": "u", "ụ": "u", "ư": "u",
    "ỳ": "y", "ý": "y", "ỷ": "y", "ỹ": "y", "ỵ": "y", "đ": "d",
})


@dataclass(frozen=True)
class SafetyVerdict:
    ok: bool
    reason: Optional[str]
    matched: Optional[str]


class ContentSafetyError(ValueError):
    """Raised when content fails the children-safety gate."""


def _normalize(text: str) -> str:
    lowered = text.lower().translate(_VI_FOLD).translate(_LEET)
    cleaned = re.sub(r"[*#._\-]", "", lowered)          # strip mask chars
    cleaned = re.sub(r"[^a-z0-9\s]", " ", cleaned)      # strip punctuation
    return re.sub(r"\s+", " ", cleaned).strip()


_NORMALIZED_TERMS = [_normalize(t) for t in _BLOCKED_TERMS]


def _word_regex(term: str) -> re.Pattern:
    """Whole-word regex for a single-word term.

    Letters are joined with ``\\s*`` so a space-separated bypass ("f u c k")
    is caught, while the ``(?<![a-z0-9])...(?![a-z0-9])`` lookarounds keep the
    match whole-word — "classroom"/"bass" stay safe from "ass", "auditorium"
    stays safe from "dit", "diction" stays safe from "dit", etc.
    """
    spaced_term = r"\s*".join(re.escape(c) for c in term)
    return re.compile(rf"(?<![a-z0-9]){spaced_term}(?![a-z0-9])")


# Precompile a whole-word (space-tolerant) regex for every single-word term.
_WORD_PATTERNS = {t: _word_regex(t) for t in _NORMALIZED_TERMS if " " not in t}


def check_text(text: str) -> SafetyVerdict:
    normalized = _normalize(text)
    for term in _NORMALIZED_TERMS:
        if " " in term:
            hit = term in normalized
        else:
            hit = _WORD_PATTERNS[term].search(normalized) is not None
        if hit:
            return SafetyVerdict(ok=False, reason="blocked_term", matched=term)
    return SafetyVerdict(ok=True, reason=None, matched=None)


def assert_safe(text: str, field: str = "text") -> None:
    verdict = check_text(text)
    if not verdict.ok:
        raise ContentSafetyError(
            f"Unsafe content detected in {field} (matched: {verdict.matched})"
        )
