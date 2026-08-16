from database.seed.canonical_animals import (
    CONTENT_VERSION,
    COURSE,
    COURSE_ID,
    InMemoryCanonicalSeedStore,
    LESSONS,
    VOCABULARY,
    asset_requirements,
    dry_run_summary,
    lesson_blocks,
    memory_match_payload,
    mini_game_seed_key,
    quiz_questions,
)
from models.asset_contract import AssetRole
from models.game_activity import MemoryMatchPayload
from models.lesson_activity import LessonLearningBlocks
from database.seed.apply_canonical_animals import validate_canonical_content


def test_canonical_identity_and_scope_are_stable():
    assert COURSE_ID == "animals-adventure-en-5-7"
    assert COURSE.category_key == "nature"
    assert [item.lesson_id for item in LESSONS] == [
        "learn-the-cat", "learn-the-dog", "learn-the-bird", "learn-the-fish", "learn-the-rabbit"
    ]
    assert [item[0] for item in VOCABULARY] == [
        "animals-v1-cat", "animals-v1-dog", "animals-v1-bird", "animals-v1-fish", "animals-v1-rabbit"
    ]


def test_every_lesson_materializes_a_valid_ordered_lc2_contract():
    for index, lesson in enumerate(LESSONS, start=1):
        blocks = LessonLearningBlocks.model_validate(lesson_blocks(lesson, [1000 + index], [2000 + index]))
        assert blocks.content_version == CONTENT_VERSION
        assert [activity.type for activity in blocks.activities] == ["learn_vocabulary", "mini_game", "quiz"]
        assert [activity.order for activity in blocks.activities] == [1, 2, 3]
        assert len({activity.activity_id for activity in blocks.activities}) == 3


def test_quiz_and_game_references_are_relational_and_deterministic():
    blocks = lesson_blocks(LESSONS[0], [101, 102], [201])
    quiz = blocks["activities"][2]
    game = blocks["activities"][1]
    assert quiz["config"]["question_ids"] == [101, 102]
    assert game["config"] == {"game_type": "memory_match", "mini_game_item_ids": [201]}


def test_lc3_quiz_content_is_supported_and_has_one_authoritative_answer():
    questions = [question for lesson in LESSONS for question in quiz_questions(lesson)]
    assert len(questions) == 25
    assert len({question.key for question in questions}) == 25
    for question in questions:
        assert question.correct_answer in question.options
        assert len(set(question.options)) == 2
    assert len({mini_game_seed_key(lesson) for lesson in LESSONS}) == 5


def test_memory_match_uses_vocabulary_asset_semantics_without_raw_url():
    vocabulary_id, word, _ = VOCABULARY[0]
    payload = MemoryMatchPayload.model_validate(memory_match_payload(vocabulary_id, word))
    image = next(card for card in payload.pairs if card.type == "image")
    assert image.vocabulary_id == vocabulary_id
    assert image.asset_role is AssetRole.VOCABULARY_ILLUSTRATION
    assert image.content is None


def test_asset_requirements_are_controlled_and_manifest_ready():
    requirements = asset_requirements()
    assert requirements.count((COURSE_ID, AssetRole.COURSE_COVER)) == 1
    assert sum(role is AssetRole.VOCABULARY_ILLUSTRATION for _, role in requirements) == 5
    assert sum(role is AssetRole.PRONUNCIATION_AUDIO for _, role in requirements) == 5
    assert AssetRole.COLORING_OUTLINE not in {role for _, role in requirements}


def test_dry_run_is_repeatable_and_does_not_describe_runtime_state():
    assert dry_run_summary() == dry_run_summary()
    assert dry_run_summary() == {
        "course_id": COURSE_ID, "course": 1, "lessons": 5, "vocabulary": 5,
        "quiz_questions": 25, "quiz_options": 50, "mini_game_items": 5,
        "course_cover": 1, "vocabulary_illustration": 5, "pronunciation_audio": 5,
    }


def test_fake_repository_upsert_is_idempotent_without_runtime_state():
    store = InMemoryCanonicalSeedStore()
    store.apply()
    first = store.snapshot()
    store.apply()
    assert store.snapshot() == first
    assert len(store.lessons) == 5
    assert len(store.quiz_rows) == 25
    assert len(store.game_rows) == 5


def test_production_reconciler_validates_all_authored_content_before_database_io():
    assert validate_canonical_content() == {
        "schema_v2_lessons": 5,
        "quiz_questions": 25,
        "quiz_options": 50,
        "mini_game_items": 5,
    }
