import pytest
from httpx import AsyncClient, ASGITransport
from backend.main import app


@pytest.mark.asyncio
async def test_list_courses():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/api/v1/pronunciation-course")
        assert response.status_code == 200
        data = response.json()
        assert "courses" in data
        assert len(data["courses"]) == 4


@pytest.mark.asyncio
async def test_get_course():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/api/v1/pronunciation-course/animals")
        assert response.status_code == 200
        data = response.json()
        assert data["topic_id"] == "animals"
        assert len(data["words"]) == 8


@pytest.mark.asyncio
async def test_get_course_not_found():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/api/v1/pronunciation-course/nonexistent")
        assert response.status_code == 404
