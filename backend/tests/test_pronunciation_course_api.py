"""Tests for pronunciation_course API endpoints — mocks repository classes directly."""
import pytest
from unittest.mock import AsyncMock, patch

from httpx import AsyncClient, ASGITransport


# ── Mock data ─────────────────────────────────────────────────────────────────

_mock_topic = {
    "topic_id": "animals", "name": "Animals", "name_vi": "Động vật",
    "icon": "🐾", "color": "sky-blue", "display_order": 1,
}
_mock_words = [
    {"word_id": "cat", "topic_id": "animals", "word": "cat",
     "phonetic": "/kæt/", "difficulty": "easy", "audio_url": None, "display_order": 1},
    {"word_id": "dog", "topic_id": "animals", "word": "dog",
     "phonetic": "/dɔːɡ/", "difficulty": "easy", "audio_url": None, "display_order": 2},
]


# ── Mock repository classes ────────────────────────────────────────────────────

class MockCourseRepo:
    async def list_active_topics(self):
        return [_mock_topic]

    async def get_topic(self, topic_id):
        return _mock_topic if topic_id == "animals" else None

    async def list_words(self, topic_id):
        return _mock_words if topic_id == "animals" else []


class MockAttemptRepo:
    _progress = {"cat": 2, "dog": 3}  # best stars per word

    async def get_topic_progress(self, uid, topic_id, word_ids):
        if uid == "test-user-123":
            return self._progress
        return {}

    async def log_attempt(self, **kw):
        return {
            "attempt_id": "attempt-abc123",
            "user_id": kw["user_id"], "topic_id": kw["topic_id"],
            "word_id": kw["word_id"], "score": kw["score"],
            "stars": kw["stars"], "transcription": kw.get("transcription", ""),
            "evaluation_method": kw.get("evaluation_method", "browser"),
        }

    async def get_words_per_topic(self, uid):
        return [{"topic_id": "animals", "topic_name": "Động vật",
                 "words_learned": 2, "topic_stars": 5, "total_words": 8}]

    async def get_favorite_topic(self, uid):
        return {"topic_id": "animals", "topic_name": "Động vật", "words_learned": 2}

    async def get_total_progress(self, uid):
        return {"total_attempts": 10, "words_practiced": 2,
                "total_stars": 5, "topics_started": 1}

    async def get_streak(self, uid):
        return 3


class MockRecordingRepo:
    async def store_recording(self, **kw):
        return "recording-xyz789"

    async def get_consented_recordings(self, limit=100, skip_reviewed=True):
        return []


@pytest.fixture(autouse=True)
def mock_repos():
    with patch(
        "repositories.pronunciation_course_repository"
        ".get_pronunciation_course_repository",
        return_value=MockCourseRepo(),
    ), patch(
        "repositories.pronunciation_course_repository"
        ".get_pronunciation_attempt_repository",
        return_value=MockAttemptRepo(),
    ), patch(
        "repositories.pronunciation_course_repository"
        ".get_pronunciation_recording_repository",
        return_value=MockRecordingRepo(),
    ):
        yield


@pytest.fixture
def fake_token():
    import jwt
    from settings import settings
    return jwt.encode(
        {"sub": "test-user-123", "email": "test@example.com"},
        settings.SECRET_KEY.get_secret_value(),
        algorithm=settings.ALGORITHM,
    )


# ── Tests ─────────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_list_courses():
    from backend.main import app
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        r = await client.get("/api/v1/pronunciation-course")
        assert r.status_code == 200
        data = r.json()
        assert "courses" in data
        assert len(data["courses"]) == 1
        assert data["courses"][0]["topic_id"] == "animals"


@pytest.mark.asyncio
async def test_list_courses_with_auth(fake_token):
    from backend.main import app
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        r = await client.get(
            "/api/v1/pronunciation-course",
            headers={"Authorization": f"Bearer {fake_token}"},
        )
        assert r.status_code == 200
        # 2/2 words in mock = 100%
        assert r.json()["courses"][0]["completion_percent"] == 100.0


@pytest.mark.asyncio
async def test_get_course():
    from backend.main import app
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        r = await client.get("/api/v1/pronunciation-course/animals")
        assert r.status_code == 200
        data = r.json()
        assert data["topic_id"] == "animals"
        assert len(data["words"]) == 2


@pytest.mark.asyncio
async def test_get_course_not_found():
    from backend.main import app
    # Override repo
    repo = MockCourseRepo()
    repo.get_topic = AsyncMock(return_value=None)
    with patch(
        "repositories.pronunciation_course_repository"
        ".get_pronunciation_course_repository",
        return_value=repo,
    ):
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            r = await client.get("/api/v1/pronunciation-course/nonexistent")
            assert r.status_code == 404


@pytest.mark.asyncio
async def test_progress_requires_auth():
    from backend.main import app
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        r = await client.get("/api/v1/pronunciation-course/progress")
        assert r.status_code == 401


@pytest.mark.asyncio
async def test_progress_with_auth(fake_token):
    from backend.main import app
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        r = await client.get(
            "/api/v1/pronunciation-course/progress",
            headers={"Authorization": f"Bearer {fake_token}"},
        )
        assert r.status_code == 200
        data = r.json()
        assert data["total_words_learned"] == 2
        assert data["current_streak"] == 3


@pytest.mark.asyncio
async def test_log_attempt(fake_token):
    from backend.main import app
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        r = await client.post(
            "/api/v1/pronunciation-course/animals/attempt",
            json={
                "user_id": "test-user-123",
                "topic_id": "animals",
                "word_id": "cat",
                "score": 85, "stars": 2,
                "transcription": "cat",
                "evaluation_method": "browser",
            },
            headers={"Authorization": f"Bearer {fake_token}"},
        )
        assert r.status_code == 200
        data = r.json()
        assert data["success"] is True
        assert data["stars"] == 2
        assert data["attempt_id"] == "attempt-abc123"


@pytest.mark.asyncio
async def test_store_recording():
    from backend.main import app
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        r = await client.post(
            "/api/v1/pronunciation-course/store-recording",
            params={
                "word_id": "cat",
                "topic_id": "animals",
                "audio_url": "https://storage.example.com/rec.webm",
                "is_consent_granted": True,
            },
        )
        assert r.status_code == 200
        assert r.json()["success"] is True
        assert r.json()["recording_id"] == "recording-xyz789"


@pytest.mark.asyncio
async def test_huggingface_evaluate():
    from backend.main import app
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        r = await client.post(
            "/api/v1/pronunciation-course/huggingface-evaluate",
            params={"expected_word": "cat", "browser_score": 65},
        )
        assert r.status_code == 200
        data = r.json()
        assert "score" in data
        assert "stars" in data
        assert "feedback" in data
