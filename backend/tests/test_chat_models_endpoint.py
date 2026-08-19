"""Contract tests for GET /api/v1/chat/models endpoint (L3.3)."""
import pytest
from unittest.mock import patch

from api.chat import get_chat_models, MODELS_CATALOG, ChatModelsResponse


class TestGetChatModels:
    """Coverage: response schema, defaults, models catalog roles."""

    @pytest.mark.asyncio
    async def test_returns_models_and_defaults(self):
        """Response must contain both 'models' and 'defaults' fields."""
        result = await get_chat_models()
        assert isinstance(result, ChatModelsResponse)
        assert len(result.models) >= 1
        assert 'planner' in result.defaults
        assert 'generator' in result.defaults
        assert 'validator' in result.defaults

    @pytest.mark.asyncio
    async def test_defaults_match_settings(self):
        """defaults values must match the current settings."""
        from settings import settings as s
        result = await get_chat_models()
        assert result.defaults['planner'] == s.MODEL_PLANNER
        assert result.defaults['generator'] == s.MODEL_GENERATOR
        assert result.defaults['validator'] == s.MODEL_VALIDATOR

    def test_catalog_has_exactly_three_entries(self):
        """The models catalog must contain exactly 3 entries."""
        expected_roles = {'planner', 'generator', 'validator'}
        roles_seen = {m.role for m in MODELS_CATALOG}
        assert len(MODELS_CATALOG) == 3, f"Expected 3, got {len(MODELS_CATALOG)}"
        assert roles_seen == expected_roles, f"Expected {expected_roles}, got {roles_seen}"

    def test_each_model_has_required_fields(self):
        """Every model entry must expose non-empty id, role, and description."""
        for model in MODELS_CATALOG:
            assert model.id, "Model id must be non-empty"
            assert model.role in {'planner', 'generator', 'validator'}
            assert model.description, "Model description must be non-empty"
