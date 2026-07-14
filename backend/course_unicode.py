"""Pure helpers for validating and repairing localized Momo course strings."""

from __future__ import annotations

from typing import Any, Dict, Iterable, Tuple


def is_suspicious(text: str) -> bool:
    body = text.rstrip().rstrip("?!")
    return "?" in body or "�" in text or "Ã" in text


def walk_strings(value: Any, path: str = "") -> Iterable[Tuple[str, str]]:
    if isinstance(value, str):
        yield path, value
    elif isinstance(value, list):
        for index, item in enumerate(value):
            next_path = f"{path}.{index}" if path else str(index)
            yield from walk_strings(item, next_path)
    elif isinstance(value, dict):
        for key, item in value.items():
            next_path = f"{path}.{key}" if path else key
            yield from walk_strings(item, next_path)


def _get_path(document: Any, dotted_path: str) -> Any:
    value = document
    for part in dotted_path.split("."):
        if isinstance(value, list):
            try:
                value = value[int(part)]
            except (ValueError, IndexError):
                return None
        elif isinstance(value, dict):
            value = value.get(part)
        else:
            return None
    return value


def collect_repair_updates(existing: Dict[str, Any], reviewed_seed: Dict[str, Any]) -> Dict[str, str]:
    updates: Dict[str, str] = {}
    for path, repaired_text in walk_strings(reviewed_seed):
        current = _get_path(existing, path)
        if (
            isinstance(current, str)
            and current != repaired_text
            and is_suspicious(current)
            and not is_suspicious(repaired_text)
        ):
            updates[path] = repaired_text
    return updates
