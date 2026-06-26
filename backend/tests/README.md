# Edu-platform Backend Tests

This directory contains pytest-based tests for the backend services.

## Structure

```
tests/
├── __init__.py
├── conftest.py          # Pytest fixtures and configuration
├── test_gamification_service.py   # GamificationService unit tests
├── test_course_service_gamification.py  # CourseService integration tests
└── test_api_auth_required.py  # API authentication tests
```

## Running Tests

```bash
# Install dependencies
pip install pytest pytest-asyncio httpx

# Run all tests
cd backend
pytest

# Run with coverage
pytest --cov=. --cov-report=html

# Run specific test file
pytest tests/test_gamification_service.py

# Run specific test class
pytest tests/test_gamification_service.py::TestAddXP

# Run specific test
pytest tests/test_gamification_service.py::TestAddXP::test_addXp_lessonComplete
```

## Test Categories

### Gamification Service Tests (`test_gamification_service.py`)
- Helper methods (`_clamp`, `_parse_dt`, `_is_today_active`, `_mood_from_stats`)
- XP calculation and level-up logic
- Streak management
- Track learning
- Sticker awards
- Pet methods
- Progress reports

### Course Service Tests (`test_course_service_gamification.py`)
- `complete_lesson()` with gamification hooks
- XP calculation for lesson completion
- Daily stat upsert-per-day logic
- Session advancement
- Quiz submission

### API Authentication Tests (`test_api_auth_required.py`)
- Protected endpoints require authentication
- Invalid tokens rejected
- Public endpoints accessible without auth
- Input validation

## Fixtures

Located in `conftest.py`:

- `mock_user_id` - Sample user ID for testing
- `mock_user_data` - Sample user gamification data
- `mock_repository` - Mocked gamification repository
- `gamification_service` - GamificationService with mocked repo
- `sample_course_data` - Sample course data
- `sample_lesson_session` - Sample lesson session

## Coverage Targets

- Backend: ≥70%
- Frontend: ≥60%
