import pytest
from backend.models.pronunciation_course_model import (
    PronunciationWord,
    PronunciationWordWithStars,
    PronunciationAttemptLog,
    PronunciationProgressResponse,
)


def test_pronunciation_word_schema():
    word = PronunciationWord(
        word_id="cat",
        topic_id="animals",
        word="cat",
        phonetic="/kæt/",
        difficulty="easy",
    )
    assert word.word_id == "cat"
    assert word.difficulty == "easy"
    assert word.topic_id == "animals"


def test_pronunciation_word_with_stars():
    word = PronunciationWordWithStars(
        word_id="cat",
        topic_id="animals",
        word="cat",
        phonetic="/kæt/",
        difficulty="easy",
        best_stars=3,
    )
    assert word.best_stars == 3


def test_pronunciation_attempt_log():
    attempt = PronunciationAttemptLog(
        user_id="user123",
        topic_id="animals",
        word_id="cat",
        score=85,
        stars=2,
        transcription="cat",
        evaluation_method="browser",
    )
    assert attempt.stars == 2
    assert attempt.evaluation_method == "browser"


def test_pronunciation_progress_response():
    resp = PronunciationProgressResponse(
        total_words_learned=10,
        words_per_topic=[
            {"topic_id": "animals", "topic_name": "Động vật", "count": 5},
        ],
        favorite_topic={"topic_id": "animals", "topic_name": "Động vật", "count": 5},
        total_stars=25,
        current_streak=3,
    )
    assert resp.total_words_learned == 10
    assert len(resp.words_per_topic) == 1
    assert resp.current_streak == 3
