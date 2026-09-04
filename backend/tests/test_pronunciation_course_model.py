import pytest
from backend.models.pronunciation_course_model import (
    PronunciationCourseDocument,
    PronunciationWord,
    PronunciationAttemptLog,
)


def test_pronunciation_word_schema():
    word = PronunciationWord(
        word_id="cat",
        word="cat",
        phonetic="/kæt/",
        difficulty="easy"
    )
    assert word.word_id == "cat"
    assert word.difficulty == "easy"


def test_pronunciation_course_document():
    words = [
        PronunciationWord(word_id="cat", word="cat", phonetic="/kæt/", difficulty="easy")
    ]
    course = PronunciationCourseDocument(
        topic_id="animals",
        name="Animals",
        name_vi="Động vật",
        icon="🐾",
        color="sky-blue",
        words=words,
        order=1
    )
    assert course.topic_id == "animals"
    assert len(course.words) == 1
