import json
from collections import defaultdict
from pathlib import Path

COLL_DIR = Path("export/collections")


def type_of(v):
    if isinstance(v, dict):
        if "$oid" in v:
            return "ObjectId"
        if "$date" in v:
            return "Date"
        if "$numberLong" in v:
            return "Long"
        if "$numberDecimal" in v:
            return "Decimal"
        return "object"
    if isinstance(v, bool):
        return "bool"
    if isinstance(v, int):
        return "int"
    if isinstance(v, float):
        return "double"
    if isinstance(v, str):
        return "string"
    if isinstance(v, list):
        return "array"
    if v is None:
        return "null"
    return type(v).__name__


def walk(doc, prefix, fields, depth=0):
    if depth > 3:
        return
    if isinstance(doc, dict):
        for k, v in doc.items():
            if k in ("$oid", "$date", "$numberLong", "$numberDecimal"):
                continue
            path = f"{prefix}.{k}" if prefix else k
            fields[path].add(type_of(v))
            t = type_of(v)
            if t == "object":
                walk(v, path, fields, depth + 1)
            elif t == "array":
                # sample first element structure
                if v and isinstance(v[0], dict) and type_of(v[0]) == "object":
                    walk(v[0], path + "[]", fields, depth + 1)
                elif v:
                    fields[path + "[]"].add(type_of(v[0]))


def summarize(path):
    fields = defaultdict(set)
    n = 0
    sample = None
    with open(path, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            doc = json.loads(line)
            if sample is None:
                sample = doc
            walk(doc, "", fields)
            n += 1
    return n, fields, sample


def main():
    targets = sorted(
        p for p in COLL_DIR.glob("edu_platform__*.ndjson")
        if p.stat().st_size > 0
    )
    for p in targets:
        name = p.stem.replace("edu_platform__", "")
        n, fields, sample = summarize(p)
        print("=" * 70)
        print(f"COLLECTION: {name}  ({n} docs)")
        print("-" * 70)
        for path in sorted(fields):
            types = ",".join(sorted(fields[path]))
            print(f"  {path}: {types}")
    print("=" * 70)


if __name__ == "__main__":
    main()
