import json
from collections import defaultdict
from pathlib import Path

base = Path("export/collections")


def shape(value):
    """Return a compact type descriptor for a value."""
    if isinstance(value, dict):
        if "$oid" in value:
            return "ObjectId"
        if "$date" in value:
            return "Date"
        if "$numberInt" in value or "$numberLong" in value:
            return "int"
        if "$numberDouble" in value or "$numberDecimal" in value:
            return "double"
        return "object"
    if isinstance(value, list):
        if not value:
            return "array<empty>"
        return f"array<{shape(value[0])}>"
    if isinstance(value, bool):
        return "bool"
    if isinstance(value, str):
        return "string"
    if isinstance(value, (int, float)):
        return "number"
    if value is None:
        return "null"
    return type(value).__name__


def top_keys(doc, prefix=""):
    """Flatten one level of nested object keys for embedded detection."""
    out = {}
    for k, v in doc.items():
        out[k] = shape(v)
        if isinstance(v, dict) and shape(v) == "object":
            for nk, nv in v.items():
                out[f"{k}.{nk}"] = shape(nv)
    return out


files = sorted(base.glob("edu_platform__*.ndjson"))
for fp in files:
    lines = fp.read_text(encoding="utf-8").strip().splitlines()
    if not lines:
        continue
    coll = fp.stem.replace("edu_platform__", "")
    field_types = defaultdict(set)
    n = 0
    for line in lines:
        doc = json.loads(line)
        n += 1
        for k, t in top_keys(doc).items():
            field_types[k].add(t)
    print(f"\n=== {coll}  ({n} docs) ===")
    for k in sorted(field_types):
        types = "|".join(sorted(field_types[k]))
        print(f"  {k}: {types}")
