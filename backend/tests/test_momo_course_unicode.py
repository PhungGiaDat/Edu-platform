import json
from pathlib import Path

from course_unicode import collect_repair_updates, is_suspicious, walk_strings


SEED_DIR = Path(__file__).resolve().parents[1] / "seeds" / "courses"
SEED_FILES = (
    SEED_DIR / "momo_home_family.json",
    SEED_DIR / "momo_nature.json",
    SEED_DIR / "momo_school_food.json",
)


EXPECTED_TITLES = {
    "momo-home-family-english-5-7": "Bé Gấu Momo Học Tiếng Anh Trong Ngôi Nhà Nhỏ",
    "momo-nature-english-5-7": "Bé Gấu Momo Học Tiếng Anh Cùng Thiên Nhiên",
    "momo-school-food-english-5-7": "Bé Gấu Momo Học Tiếng Anh Ở Trường",
}


def test_momo_seed_copy_has_no_lossy_unicode() -> None:
    seen_ids = set()
    for path in SEED_FILES:
        document = json.loads(Path(path).read_text(encoding="utf-8"))
        seen_ids.add(document["course_id"])
        assert document["title"] == EXPECTED_TITLES[document["course_id"]]
        suspicious = [(field, text) for field, text in walk_strings(document) if is_suspicious(text)]
        assert suspicious == []
    assert seen_ids == set(EXPECTED_TITLES)


def test_migration_updates_only_suspicious_string_fields() -> None:
    existing = {
        "course_id": "example",
        "title": "B? G?u",
        "description": "Already valid",
        "lessons": [{"title_vi": "Ch?o gia ??nh", "score": 10}],
    }
    reviewed = {
        "course_id": "example",
        "title": "Bé Gấu",
        "description": "Changed but valid",
        "lessons": [{"title_vi": "Chào gia đình", "score": 99}],
    }

    assert collect_repair_updates(existing, reviewed) == {
        "title": "Bé Gấu",
        "lessons.0.title_vi": "Chào gia đình",
    }
