"""Generate the golden-QA benchmark dataset for the Agentic RAG chatbot.

Usage (run from backend/):
    python -m benchmarks.generate_dataset                       # lexicon-only
    python -m benchmarks.generate_dataset --from-qdrant         # enrich with corpus texts

Deterministic output (seed=42). Distribution:
    24 vi_kid + 12 en + 12 ood + 6 consistency pairs (12 rows) = 60 rows.

Row schema:
    {
      "id": str,                    # vi-kid-001 / en-001 / ood-001 / pair-01-a
      "category": str,              # vi_kid | en | ood | consistency_a | consistency_b
      "pair_id": str | null,        # pair-01 for consistency rows
      "question": str,
      "expected_animal_en": str | null,
      "animal_vi": str | null,
      "golden_context": str | null  # corpus text for the animal (if --from-qdrant)
    }
"""
from __future__ import annotations

import argparse
import asyncio
import json
import random
import sys
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))
if not (Path.cwd() / ".env").exists():
    import os

    os.chdir(BACKEND_ROOT)

try:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")  # type: ignore[attr-defined]
except Exception:
    pass

from services.qdrant_rag_service import ANIMAL_VI_EN, QdrantRAGService  # noqa: E402

SEED = 42
VI_TEMPLATES = [
    "con {vi} ăn gì vậy?",
    "{vi} tiếng anh là gì nhỉ?",
    "con {vi} sống ở đâu?",
    "{vi} có nguy hiểm không?",
    "con {vi} to không vậy bác?",
    "{vi} biết bơi không?",
    "con {vi} kêu thế nào vậy?",
    "{vi} chạy nhanh không?",
    "bác ơi con {vi} ngủ ở đâu vậy?",
    "con {vi} có đẻ trứng không?",
    "{vi} thích ăn j nhất?",
    "con {vi} màu gì vậy?",
]
EN_TEMPLATES = [
    "What does a {en} eat?",
    "Where does a {en} live?",
    "Is a {en} dangerous?",
    "Can a {en} swim?",
    "How big is a {en}?",
    "What color is a {en}?",
]
CONSISTENCY_TEMPLATE_PAIRS: List[Tuple[str, str]] = [
    ("con {vi} ăn gì vậy?", "{vi} thích ăn gì hả bác?"),
    ("con {vi} sống ở đâu vậy?", "{vi} ở đâu thế ạ?"),
    ("{vi} có nguy hiểm không?", "con {vi} có nguy hiểm không vậy?"),
    ("con {vi} to không?", "{vi} to lắm phải không?"),
    ("con {vi} kêu thế nào?", "tiếng {vi} kêu ra sao vậy?"),
    ("{vi} chạy nhanh không?", "con {vi} chạy có nhanh không?"),
]
OOD_QUESTIONS = [
    "con khủng long to không vậy?",
    "khủng long ăn gì hả?",
    "tàu vũ trụ bay nhanh lắm đúng không?",
    "sao trên trời có bao nhiêu cái vậy?",
    "máy bay bay được nhờ cái gì vậy?",
    "hôm nay mình nên ăn gì cho ngon?",
    "con robot biết buồn không?",
    "số 9 cộng số 10 bằng bao nhiêu?",
    "ai đã vẽ nên cầu vồng vậy?",
    "ma có thật không hả bác?",
    "tháng nào lạnh nhất ở Việt Nam?",
    "xe hơi chạy bằng gì vậy?",
]


def en_to_vi_map() -> Dict[str, str]:
    """Reverse the VI->EN lexicon keeping the first (canonical) VI term per animal."""
    mapping: Dict[str, str] = {}
    for vi_term, en_term in ANIMAL_VI_EN.items():
        if en_term not in mapping:
            mapping[en_term] = vi_term
    return mapping


def build_rows(rng: random.Random) -> List[Dict[str, Any]]:
    """Build the 60-row dataset skeleton (no golden_context yet)."""
    animals = sorted(en_to_vi_map().keys())
    if len(animals) < 24:
        raise RuntimeError(f"lexicon has only {len(animals)} animals, need >= 24")

    vi_animals = rng.sample(animals, 24)
    en_animals = rng.sample(animals, 12)
    consistency_animals = rng.sample(animals, 6)

    rows: List[Dict[str, Any]] = []

    for i, en in enumerate(vi_animals):
        vi = en_to_vi_map()[en]
        template = VI_TEMPLATES[i % len(VI_TEMPLATES)]
        rows.append(
            {
                "id": f"vi-kid-{i + 1:03d}",
                "category": "vi_kid",
                "pair_id": None,
                "question": template.format(vi=vi),
                "expected_animal_en": en,
                "animal_vi": vi,
                "golden_context": None,
            }
        )

    for i, en in enumerate(en_animals):
        template = EN_TEMPLATES[i % len(EN_TEMPLATES)]
        rows.append(
            {
                "id": f"en-{i + 1:03d}",
                "category": "en",
                "pair_id": None,
                "question": template.format(en=en),
                "expected_animal_en": en,
                "animal_vi": en_to_vi_map()[en],
                "golden_context": None,
            }
        )

    for i, question in enumerate(OOD_QUESTIONS):
        rows.append(
            {
                "id": f"ood-{i + 1:03d}",
                "category": "ood",
                "pair_id": None,
                "question": question,
                "expected_animal_en": None,
                "animal_vi": None,
                "golden_context": None,
            }
        )

    for i, en in enumerate(consistency_animals):
        vi = en_to_vi_map()[en]
        t1, t2 = CONSISTENCY_TEMPLATE_PAIRS[i % len(CONSISTENCY_TEMPLATE_PAIRS)]
        pair_id = f"pair-{i + 1:02d}"
        rows.append(
            {
                "id": f"{pair_id}-a",
                "category": "consistency_a",
                "pair_id": pair_id,
                "question": t1.format(vi=vi),
                "expected_animal_en": en,
                "animal_vi": vi,
                "golden_context": None,
            }
        )
        rows.append(
            {
                "id": f"{pair_id}-b",
                "category": "consistency_b",
                "pair_id": pair_id,
                "question": t2.format(vi=vi),
                "expected_animal_en": en,
                "animal_vi": vi,
                "golden_context": None,
            }
        )

    return rows


async def enrich_with_qdrant(rows: List[Dict[str, Any]], delay: float = 0.4) -> None:
    """Fill golden_context from the live Qdrant animal corpus (best match per animal)."""
    service = QdrantRAGService()
    wanted: Dict[str, str] = {}
    for row in rows:
        en = row["expected_animal_en"]
        if en and en not in wanted:
            wanted[en] = row["animal_vi"] or en

    print(f"[qdrant] fetching golden context for {len(wanted)} animals ...")
    done = 0
    for en, vi in wanted.items():
        try:
            docs = await service.retrieve(f"{en} {vi}")
        except Exception as exc:  # noqa: BLE001
            print(f"[qdrant] retrieve failed for {en}: {exc!r}")
            docs = []
        text = None
        for doc in docs:
            if str(doc.get("animal_en", "")).lower() == en and doc.get("text"):
                text = str(doc["text"]).strip()
                break
        if text is None and docs:
            text = str(docs[0].get("text") or "").strip() or None
        for row in rows:
            if row["expected_animal_en"] == en:
                row["golden_context"] = text
        done += 1
        print(f"[qdrant] {done}/{len(wanted)} {en}: {'ok' if text else 'no doc'} ({len(docs)} docs)")
        await asyncio.sleep(delay)


def main() -> int:
    parser = argparse.ArgumentParser(description="Generate golden-QA benchmark dataset")
    parser.add_argument(
        "--out",
        type=Path,
        default=BACKEND_ROOT / "benchmarks" / "data" / "golden_qa.jsonl",
        help="Output JSONL path",
    )
    parser.add_argument("--from-qdrant", action="store_true", help="Enrich rows with live corpus texts")
    parser.add_argument("--seed", type=int, default=SEED)
    args = parser.parse_args()

    rows = build_rows(random.Random(args.seed))
    if args.from_qdrant:
        asyncio.run(enrich_with_qdrant(rows))

    args.out.parent.mkdir(parents=True, exist_ok=True)
    with args.out.open("w", encoding="utf-8") as fh:
        for row in rows:
            fh.write(json.dumps(row, ensure_ascii=False) + "\n")

    by_cat: Dict[str, int] = {}
    for row in rows:
        by_cat[row["category"]] = by_cat.get(row["category"], 0) + 1
    golden = sum(1 for row in rows if row["golden_context"])
    print(f"[done] wrote {len(rows)} rows -> {args.out}")
    print(f"[done] categories: {by_cat}, golden_context populated: {golden}/{len(rows)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
