import pytest
from httpx import AsyncClient, ASGITransport
from backend.main import app


@pytest.mark.asyncio
async def test_list_courses():
    """List courses — public, no auth required."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/api/v1/pronunciation-course")
        print(f"status={response.status_code} body={response.text[:200]}")
        assert response.status_code == 200
        data = response.json()
        assert "courses" in data
        assert len(data["courses"]) == 4


@pytest.mark.asyncio
async def test_get_course():
    """Get course detail — public, no auth required."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/api/v1/pronunciation-course/animals")
        print(f"status={response.status_code} body={response.text[:200]}")
        assert response.status_code == 200
        data = response.json()
        assert data["topic_id"] == "animals"
        assert len(data["words"]) == 8


@pytest.mark.asyncio
async def test_get_course_not_found():
    """404 for nonexistent course."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/api/v1/pronunciation-course/nonexistent")
        print(f"status={response.status_code} body={response.text[:200]}")
        assert response.status_code == 404


@pytest.mark.asyncio
async def test_progress_requires_auth():
    """Progress endpoint requires user_id or auth."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/api/v1/pronunciation-course/progress")
        print(f"PROGRESS status={response.status_code} body={response.text[:200]}")
        # Should be 401 (auth required) or 200 (with user_id query param)
        # 404 means the route isn't registered at this path
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
