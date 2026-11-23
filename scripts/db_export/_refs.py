import json
from pathlib import Path

COLL = Path("export/collections")


def load(p):
    out = []
    with open(p, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line:
                out.append(json.loads(line))
    return out


def oid(v):
    if isinstance(v, dict) and "$oid" in v:
        return v["$oid"]
    return v


users = load(COLL / "edu_platform__users.ndjson")
oids = {oid(u["_id"]) for u in users}
unames = {u.get("username") for u in users}
print("users _id oids:", sorted(oids))
print("usernames:", sorted(unames))

refs = set()
for name in [
    "user_points",
    "session_logs",
    "user_course_progress",
    "lesson_sessions",
    "ai_feedback",
]:
    for d in load(COLL / f"edu_platform__{name}.ndjson"):
        u = d.get("user_id")
        if u is not None:
            refs.add(u)
print("distinct user_id refs in children:", sorted(refs))
print("refs matching a user _id oid:", sorted(refs & oids))
print("refs NOT matching any user _id:", sorted(refs - oids))

# flashcard ar_tag vs ar_combinations.required_tags
fc = load(COLL / "edu_platform__flashcards.ndjson")
ar_tags = {c.get("ar_tag") for c in fc}
qr_ids = {c.get("qr_id") for c in fc}
print("flashcard ar_tags:", sorted(t for t in ar_tags if t))
print("flashcard qr_ids:", sorted(q for q in qr_ids if q))

combos = load(COLL / "edu_platform__ar_combinations.ndjson")
req = set()
for c in combos:
    for t in (c.get("required_tags") or []):
        req.add(t)
print("combination required_tags:", sorted(req))
print("required_tags NOT in flashcard ar_tags:", sorted(req - ar_tags))
