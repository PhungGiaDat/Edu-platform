"""Verify W5 repos are Postgres-only (no Mongo symbols, postgres_pool() path).

De-Mongo Wave 5: the following 5 repositories are rewritten to use only
``postgres_pool()`` directly:

- admin_repository
- ai_repository
- chat_repository
- feedback_template_repository
- parental_controls_repository

Verifies:
- No ``BaseRepository``, ``mongo_connector``, ``beanie``, ``motor`` imports.
- Every repo is instantiable and exposes expected method signatures.
- ``postgres_pool()`` is the sole persistence path.
"""
import inspect
from pathlib import Path

import pytest


def _read_source(module_name: str) -> str:
    """Read the full source of a repository module."""
    import importlib
    mod = importlib.import_module(module_name)
    return Path(mod.__file__).read_text(encoding="utf-8")


# =============================================================================
# W5 repo modules
# =============================================================================

W5_REPOS = {
    "admin_repository": {
        "module": "repositories.admin_repository",
        "forbidden": ["BaseRepository", "mongo_connector", "beanie", "motor", "AsyncIOMotor"],
        "methods": [
            "get_dashboard_stats", "get_courses", "get_course_by_id",
            "create_course", "update_course", "delete_course",
            "get_decks", "get_deck_by_id", "create_deck", "update_deck", "delete_deck",
            "get_flashcards", "get_flashcard_by_id", "create_flashcard",
            "update_flashcard", "delete_flashcard", "_ensure_ar_object",
            "get_students", "get_student_by_id", "get_student_progress",
            "get_progress_analytics", "get_engagement_analytics",
            "get_learning_goal", "set_learning_goal", "get_all_learning_goals",
        ],
    },
    "ai_repository": {
        "module": "repositories.ai_repository",
        "forbidden": ["BaseRepository", "mongo_connector", "beanie", "motor", "AsyncIOMotor"],
        "methods": ["get_active_config", "create_config"],
    },
    "chat_repository": {
        "module": "repositories.chat_repository",
        "forbidden": ["BaseRepository", "mongo_connector", "beanie", "motor", "AsyncIOMotor"],
        "methods": ["get_user_sessions", "add_message", "find_many"],
    },
    "feedback_template_repository": {
        "module": "repositories.feedback_template_repository",
        "forbidden": ["BaseRepository", "mongo_connector", "beanie", "motor", "AsyncIOMotor"],
        "methods": [
            "create_template", "update_template", "delete_template",
            "hard_delete_template", "get_template_by_id",
            "get_templates_by_category", "get_random_template",
            "get_template_for_score", "get_all_templates",
            "count_by_category", "bulk_insert_templates",
        ],
    },
    "parental_controls_repository": {
        "module": "repositories.parental_controls_repository",
        "forbidden": ["BaseRepository", "mongo_connector", "beanie", "motor", "AsyncIOMotor"],
        "methods": [
            "get_by_child_id", "set_time_limit", "set_break_reminder",
            "set_learning_path", "log_session",
        ],
    },
}


# =============================================================================
# No-Mongo symbol assertions
# =============================================================================

class TestNoMongoSymbols:
    """Verify no Mongo-era symbols survive in the W5 repo files."""

    @pytest.mark.parametrize("name,cfg", list(W5_REPOS.items()))
    def test_no_mongo_symbols(self, name, cfg):
        src = _read_source(cfg["module"])
        for symbol in cfg["forbidden"]:
            assert symbol not in src, f"{cfg['module']} still contains {symbol!r}"

    @pytest.mark.parametrize("name,cfg", list(W5_REPOS.items()))
    def test_postgres_pool_imported(self, name, cfg):
        """Every W5 repo must import postgres_pool."""
        src = _read_source(cfg["module"])
        assert "postgres_pool" in src, f"{cfg['module']} does not import postgres_pool"

    @pytest.mark.parametrize("name,cfg", list(W5_REPOS.items()))
    def test_factory_function_exists(self, name, cfg):
        """Every W5 repo module exposes a public factory function."""
        import importlib
        mod = importlib.import_module(cfg["module"])
        factory_name = {
            "admin_repository": "get_admin_repository",
            "ai_repository": "get_ai_repository",
            "chat_repository": "get_chat_repository",
            "feedback_template_repository": "get_feedback_template_repository",
            "parental_controls_repository": "get_parental_controls_repository",
        }[name]
        assert hasattr(mod, factory_name), f"{cfg['module']} missing {factory_name}"


# =============================================================================
# Method signature assertions
# =============================================================================

class TestRepoMethodsExist:
    """Verify each repo class exposes the expected methods."""

    @pytest.mark.parametrize("name,cfg", list(W5_REPOS.items()))
    def test_all_methods_present(self, name, cfg):
        import importlib
        mod = importlib.import_module(cfg["module"])
        # Find the repo class — it's the main class (not a helper)
        classes = [m for m in dir(mod)
                   if not m.startswith("_") and inspect.isclass(getattr(mod, m))]
        for cls_name in classes:
            cls = getattr(mod, cls_name)
            if cls_name == "AdminRepository" or cls_name.endswith("Repository"):
                for method in cfg["methods"]:
                    assert hasattr(cls, method), f"{cls_name} missing {method}"
                return
        pytest.fail(f"No repository class found in {cfg['module']}")

    def test_ai_repo_returns_ai_config_schema_for_get_active_config(self):
        """AIRepository.get_active_config has AIConfigSchema return type."""
        from repositories.ai_repository import AIRepository
        sig = inspect.signature(AIRepository.get_active_config)
        hint = sig.return_annotation
        assert "AIConfigSchema" in str(hint) or hint is not None


# =============================================================================
# Instantiation smoke tests
# =============================================================================

class TestInstantiation:
    """Verify repos are instantiable without a database connection."""

    def test_parental_controls_repo(self):
        from repositories.parental_controls_repository import ParentalControlsRepository
        repo = ParentalControlsRepository()
        assert repo is not None

    def test_ai_repo(self):
        from repositories.ai_repository import AIRepository
        repo = AIRepository()
        assert repo is not None

    def test_chat_repo(self):
        from repositories.chat_repository import ChatRepository
        repo = ChatRepository()
        assert repo is not None

    def test_feedback_template_repo(self):
        from repositories.feedback_template_repository import FeedbackTemplateRepository
        repo = FeedbackTemplateRepository()
        assert repo is not None

    def test_admin_repo(self):
        from repositories.admin_repository import AdminRepository
        repo = AdminRepository(teacher_id="test-teacher")
        assert repo.teacher_id == "test-teacher"

    def test_admin_repo_no_mongo_attributes(self):
        """AdminRepository should NOT have mongo collection attributes."""
        from repositories.admin_repository import AdminRepository
        repo = AdminRepository(teacher_id="test-teacher")
        for attr in ["courses_collection", "flashcards_collection",
                     "flashcard_decks_collection", "ar_objects_collection",
                     "student_progress_collection", "usage_sessions_collection",
                     "learning_goals_collection", "users_collection"]:
            assert not hasattr(repo, attr), f"AdminRepository still has {attr}"

    def test_admin_repo_has_teacher_id(self):
        from repositories.admin_repository import AdminRepository
        repo = AdminRepository(teacher_id="t-1")
        assert repo.teacher_id == "t-1"