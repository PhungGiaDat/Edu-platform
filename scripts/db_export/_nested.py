import json
from pathlib import Path

base = Path("export/collections")


def describe(value, depth=0, maxd=3):
    if depth > maxd:
        return "..."
    if isinstance(value, dict):
        if "$oid" in value:
            return "ObjectId"
        if "$date" in value:
            return "Date"
        if "$numberInt" in value or "$numberLong" in value:
            return "int"
        if "$numberDouble" in value or "$numberDecimal" in value:
            return "double"
        return {k: describe(v, depth + 1, maxd) for k, v in value.items()}
    if isinstance(value, list):
        if not value:
            return "array<empty>"
        return [describe(value[0], depth + 1, maxd)]
    if isinstance(value, bool):
        return "bool"
    if isinstance(value, str):
        return "string"
    if isinstance(value, (int, float)):
        return "number"
    if value is None:
        return "null"
    return type(value).__name__


targets = {
    "courses": ["lessons", "catalogPreview", "studentTestimonials", "enrollmentCta"],
    "lesson_sessions": ["steps"],
    "quiz_questions": ["questions"],
    "mini_game_bank": ["pairs"],
}

for coll, fields in targets.items():
    fp = base / f"edu_platform__{coll}.ndjson"
    lines = fp.read_text(encoding="utf-8").strip().splitlines()
    if not lines:
        continue
    doc = json.loads(lines[0])
    print(f"\n=== {coll} (first doc nested shapes) ===")
    for field in fields:
        if field in doc:
            val = doc[field]
            shape = describe(val, maxd=3)
            print(f"  {field}: {json.dumps(shape, ensure_ascii=False)[:1200]}")
