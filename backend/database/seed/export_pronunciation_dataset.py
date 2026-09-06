"""
export_pronunciation_dataset.py
================================
Export consented pronunciation recordings from Supabase PostgreSQL and
format them as a HuggingFace Dataset ready for wav2vec2 fine-tuning.

Usage:
    cd backend
    python database/seed/export_pronunciation_dataset.py

Output:
    datasets/pronunciation_dataset/
    ├── train/           ← 80% of consented, reviewed recordings
    ├── val/             ← 10%
    ├── test/            ← 10%
    └── dataset_info.json

Requirements:
    HF_TOKEN env var (for upload)
    SUPABASE_* env vars (for DB access)

Note:
    Run this on a machine with DB access. Audio files are downloaded from
    Supabase Storage (audio_url) and saved locally before upload.
    On Colab (no DB access), copy the export folder to Colab and run
    fine_tune_wav2vec2.py there.
"""
from __future__ import annotations

import json
import os
import sys
import shutil
import uuid
from pathlib import Path
from datetime import datetime

import requests

# Add backend to path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

from database.postgres_connection import postgres_pool


ROOT = Path(__file__).resolve().parent.parent.parent / "datasets" / "pronunciation_dataset"
TRAIN = ROOT / "train"
VAL = ROOT / "val"
TEST = ROOT / "test"
AUDIO_DIR = ROOT / "audio"


def ensure_dirs():
    for d in [TRAIN, VAL, TEST, AUDIO_DIR]:
        d.mkdir(parents=True, exist_ok=True)


def fetch_consented_recordings() -> list[dict]:
    """Pull consented + reviewed recordings from PostgreSQL."""
    async def _fetch():
        pool = postgres_pool()
        rows = await pool.fetch(
            """SELECT
                   r.recording_id,
                   r.user_id,
                   r.topic_id,
                   r.word_id,
                   r.audio_url,
                   r.transcription,
                   r.quality_rating,
                   r.created_at,
                   w.word,
                   t.name_vi AS topic_name
               FROM public.pronunciation_recordings r
               JOIN public.pronunciation_words w ON w.word_id = r.word_id
               JOIN public.pronunciation_topics t ON t.topic_id = r.topic_id
               WHERE r.is_consent_granted = TRUE
                 AND r.reviewed = TRUE
                 AND r.quality_rating >= 3
                 AND r.transcription IS NOT NULL
                 AND r.audio_url IS NOT NULL
               ORDER BY r.created_at DESC"""
        )
        return [dict(row) for row in rows]

    import asyncio
    return asyncio.run(_fetch())


def download_audio(url: str, dest: Path, timeout: int = 30) -> bool:
    """Download audio file from URL to dest path."""
    try:
        resp = requests.get(url, timeout=timeout, stream=True)
        resp.raise_for_status()
        dest.write_bytes(resp.content)
        return True
    except Exception as e:
        print(f"  [WARN] Failed to download {url}: {e}")
        return False


def split_dataset(items: list[dict]) -> tuple[list, list, list]:
    """80/10/10 train/val/test split, stratified by word_id."""
    from collections import defaultdict
    import random

    random.seed(42)

    by_word: dict[str, list] = defaultdict(list)
    for item in items:
        by_word[item["word_id"]].append(item)

    train, val, test = [], [], []
    for word_id, samples in by_word.items():
        random.shuffle(samples)
        n = len(samples)
        train.extend(samples[: int(n * 0.8)])
        val.extend(samples[int(n * 0.8) : int(n * 0.9)])
        test.extend(samples[int(n * 0.9) :])

    random.shuffle(train)
    random.shuffle(val)
    random.shuffle(test)
    return train, val, test


def write_split(split_name: str, samples: list[dict]):
    rows = []
    for sample in samples:
        audio_filename = f"{sample['recording_id']}.webm"
        rows.append({
            "file": f"audio/{audio_filename}",
            "text": sample["transcription"].strip().lower(),
            "word": sample["word"].strip().lower(),
            "word_id": sample["word_id"],
            "topic_id": sample["topic_id"],
            "topic_name": sample["topic_name"],
            "quality_rating": sample["quality_rating"],
            "recording_id": sample["recording_id"],
        })

    out_path = ROOT / f"{split_name}.json"
    out_path.write_text(json.dumps(rows, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"  {split_name}: {len(rows)} samples → {out_path}")


def write_readme():
    readme = f"""---
license: cc-by-nc-sa-4.0
language:
- en
- vi
annotations_creators:
- expert-generated
source_datasets:
- original
dataset_info:
  features:
    file:
      dtype: string
      description: Path to audio file
    text:
      dtype: string
      description: Transcription of the audio
    word:
      dtype: string
      description: Target English word pronounced
    word_id:
      dtype: string
    topic_id:
      dtype: string
    topic_name:
      dtype: string
    quality_rating:
      dtype: int
    recording_id:
      dtype: string
  splits:
    train: {len(list(TRAIN.glob('*.json')))} files
    val: {len(list(VAL.glob('*.json')))} files
    test: {len(list(TEST.glob('*.json')))} files
  dataset_size:
    downloads: 0
    num_examples: {sum(1 for _ in TRAIN.glob('*.json')) + sum(1 for _ in VAL.glob('*.json')) + sum(1 for _ in TEST.glob('*.json'))}
  version: 1.0.0
---

# Vietnamese Children English Pronunciation Dataset

Children's English pronunciation recordings for fine-tuning wav2vec2 ASR models.

**Collection:** In-app pronunciation practice with parent consent
**Languages:** English (children's speech), metadata in Vietnamese
**Quality:** Recordings rated 3-5 by reviewers

## Citation
```
@misc{{eduplatform_pronunciation_2026,
  title={{Vietnamese Children English Pronunciation Dataset}},
  author={{EduPlatform}},
  year={{2026}},
  url={{https://github.com/your-org/edu-platform}}
}}
```
"""
    (ROOT / "dataset_info.json").write_text(readme, encoding="utf-8")


def main():
    print("=" * 60)
    print("Pronunciation Dataset Exporter")
    print("=" * 60)

    ensure_dirs()

    # Fetch
    print("\n[1/4] Fetching consented recordings from PostgreSQL...")
    recordings = fetch_consented_recordings()
    print(f"  Found {len(recordings)} consented + reviewed recordings")

    if len(recordings) < 10:
        print(f"  [WARN] Only {len(recordings)} recordings found.")
        print("  Collect more recordings before fine-tuning.")
        print("  Run: python database/seed/export_pronunciation_dataset.py")
        return

    # Download audio
    print(f"\n[2/4] Downloading audio files to {AUDIO_DIR}...")
    downloaded = 0
    for r in recordings:
        audio_filename = f"{r['recording_id']}.webm"
        dest = AUDIO_DIR / audio_filename
        if dest.exists():
            downloaded += 1
            continue
        if download_audio(r["audio_url"], dest):
            downloaded += 1

    print(f"  Downloaded: {downloaded}/{len(recordings)}")

    # Split
    print("\n[3/4] Splitting into train/val/test (80/10/10)...")
    train, val, test = split_dataset(recordings)
    print(f"  Train: {len(train)}, Val: {len(val)}, Test: {len(test)}")

    write_split("train", train)
    write_split("val", val)
    write_split("test", test)

    # Summary
    print("\n[4/4] Summary")
    write_readme()

    total_samples = len(train) + len(val) + len(test)
    topic_counts: dict[str, int] = {}
    for s in train + val + test:
        topic_counts[s["topic_id"]] = topic_counts.get(s["topic_id"], 0) + 1

    print(f"\n  Total samples: {total_samples}")
    print(f"  Train: {len(train)} ({len(train)/total_samples*100:.0f}%)")
    print(f"  Val:   {len(val)} ({len(val)/total_samples*100:.0f}%)")
    print(f"  Test:  {len(test)} ({len(test)/total_samples*100:.0f}%)")
    print(f"\n  Samples per topic:")
    for topic, count in sorted(topic_counts.items()):
        print(f"    {topic}: {count}")

    print(f"\n  Output: {ROOT}")
    print("\n  Next step:")
    print("  1. Upload to Google Drive / copy to Colab")
    print("  2. Run: python fine_tune_wav2vec2.py")
    print("  3. Push model to HuggingFace Hub")
    print("=" * 60)


if __name__ == "__main__":
    main()
