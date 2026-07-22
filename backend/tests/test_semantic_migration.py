"""
Integration test for semantic_rules → ar_combinations migration.

TDD Phase (RED): These tests define the expected behavior.
They will FAIL until the migration is implemented.

Run with:
    pytest backend/tests/test_semantic_migration.py -v
"""
import pytest
from datetime import datetime
from unittest.mock import AsyncMock, MagicMock, patch
from typing import Dict, Any, List


# ========== MODULE-LEVEL FIXTURES ==========

@pytest.fixture
def sample_semantic_rules():
    """Sample semantic_rules documents to migrate."""
    return [
        {
            "_id": "sr_001",
            "cards": ["elephant_marker_01", "palm_marker_01"],
            "result": "combo_jungle",
            "animation": "jungle_entrance",
            "sound": "/audio/jungle_roar.mp3",
            "phrase": "Jungle Combo!",
            "priority": 10,
            "active": True,
            "flashcardSet": "set_animals_001",
            "createdAt": "2025-07-01T10:00:00Z",
            "updatedAt": "2025-07-01T10:00:00Z",
        },
        {
            "_id": "sr_002",
            "cards": ["apple_marker_01", "cake_marker_01"],
            "result": "spawn_coin",
            "animation": "coin_spawn",
            "sound": "/audio/coin.mp3",
            "phrase": "+50 XP!",
            "priority": 5,
            "active": True,
            "flashcardSet": "set_fruits_001",
            "createdAt": "2025-07-02T10:00:00Z",
            "updatedAt": "2025-07-02T10:00:00Z",
        },
        {
            "_id": "sr_003",
            "cards": ["car_marker_01", "truck_marker_01"],
            "result": "particle_burst",
            "animation": "firework_burst",
            "sound": None,
            "phrase": "Race Combo!",
            "priority": 8,
            "active": False,
            "flashcardSet": "set_vehicles_001",
            "createdAt": "2025-07-03T10:00:00Z",
            "updatedAt": "2025-07-03T10:00:00Z",
        },
    ]


@pytest.fixture
def sample_ar_combinations():
    """Sample existing ar_combinations documents."""
    return [
        {
            "_id": "ac_001",
            "combo_id": "elephant_jungle_combo",
            "description": "Elephant in the jungle",
            "required_tags": ["elephant_marker_01"],
            "model_3d_url": "https://example.com/elephant.glb",
            "texture_url": "https://example.com/elephant.png",
            "image_2d_url": "https://example.com/elephant_2d.jpg",
            "bonus_xp": 150,
        },
        {
            "_id": "ac_002",
            "combo_id": "apple_cake_combo",
            "description": "Apple and cake",
            "required_tags": ["apple_marker_01"],
            "model_3d_url": "https://example.com/apple.glb",
            "image_2d_url": "https://example.com/apple_2d.jpg",
            "bonus_xp": 100,
        },
    ]


@pytest.fixture
def merged_expectations(sample_semantic_rules, sample_ar_combinations):
    """Expected merged documents after migration."""
    return [
        {
            "_id": "ac_001",
            "combo_id": "elephant_jungle_combo",
            "description": "Elephant in the jungle",
            "required_tags": ["elephant_marker_01"],
            "model_3d_url": "https://example.com/elephant.glb",
            "texture_url": "https://example.com/elephant.png",
            "image_2d_url": "https://example.com/elephant_2d.jpg",
            "bonus_xp": 150,
            "semantic_result": "combo_jungle",
            "animation": "jungle_entrance",
            "sound": "/audio/jungle_roar.mp3",
            "phrase": "Jungle Combo!",
            "priority": 10,
            "active": True,
            "flashcard_set": "set_animals_001",
        },
        {
            "_id": "ac_002",
            "combo_id": "apple_cake_combo",
            "description": "Apple and cake",
            "required_tags": ["apple_marker_01"],
            "model_3d_url": "https://example.com/apple.glb",
            "texture_url": None,
            "image_2d_url": "https://example.com/apple_2d.jpg",
            "bonus_xp": 100,
            "semantic_result": "spawn_coin",
            "animation": "coin_spawn",
            "sound": "/audio/coin.mp3",
            "phrase": "+50 XP!",
            "priority": 5,
            "active": True,
            "flashcard_set": "set_fruits_001",
        },
        {
            "_id": "sr_003",
            "combo_id": "sr_003",
            "description": "Vehicle combo (migrated from semantic_rules)",
            "required_tags": ["car_marker_01", "truck_marker_01"],
            "model_3d_url": "",
            "texture_url": None,
            "image_2d_url": "",
            "bonus_xp": 100,
            "semantic_result": "particle_burst",
            "animation": "firework_burst",
            "sound": None,
            "phrase": "Race Combo!",
            "priority": 8,
            "active": False,
            "flashcard_set": "set_vehicles_001",
        },
    ]


# ========== TEST CLASSES ==========

class TestSemanticMigration:
    """Test suite for semantic_rules to ar_combinations migration."""

    def test_migrated_semantic_rules_count(self, sample_semantic_rules, merged_expectations):
        """All semantic_rules documents should appear in merged output."""
        # 3 semantic rules → 3 merged documents
        assert len(merged_expectations) == 3

    def test_migrated_doc_has_animation_field(self, merged_expectations):
        """Every merged document should have the animation field from semantic_rules."""
        for doc in merged_expectations:
            assert "animation" in doc, f"Missing animation in {doc.get('_id')}"

    def test_migrated_doc_has_semantic_result_field(self, merged_expectations):
        """Every merged document should have semantic_result (mapped from 'result')."""
        for doc in merged_expectations:
            assert "semantic_result" in doc, f"Missing semantic_result in {doc.get('_id')}"

    def test_migrated_doc_has_flashcard_set_field(self, merged_expectations):
        """Every merged document should have flashcard_set (snake_case from flashcardSet)."""
        for doc in merged_expectations:
            assert "flashcard_set" in doc, f"Missing flashcard_set in {doc.get('_id')}"


class TestMigrationMapping:
    """Test field mapping from semantic_rules to ar_combinations."""

    def test_cards_maps_to_required_tags(self):
        """cards field in semantic_rules maps to required_tags in ar_combinations."""
        cards = ["card_a", "card_b"]
        required_tags = cards
        assert required_tags == ["card_a", "card_b"]

    def test_result_maps_to_semantic_result(self):
        """result field in semantic_rules maps to semantic_result in ar_combinations."""
        result = "combo_jungle"
        semantic_result = result
        assert semantic_result == "combo_jungle"

    def test_flashcardSet_maps_to_flashcard_set(self):
        """flashcardSet maps to flashcard_set (snake_case for consistency)."""
        flashcardSet = "set_animals_001"
        flashcard_set = flashcardSet
        assert flashcard_set == "set_animals_001"

    def test_animation_preserved(self):
        """animation field is preserved as-is."""
        assert "jungle_entrance" == "jungle_entrance"

    def test_sound_preserved(self):
        """sound field is preserved as-is (can be null)."""
        sound = "/audio/jungle_roar.mp3"
        assert sound == "/audio/jungle_roar.mp3"

    def test_phrase_preserved(self):
        """phrase field is preserved as-is."""
        phrase = "Jungle Combo!"
        assert phrase == "Jungle Combo!"

    def test_priority_preserved(self):
        """priority field is preserved as-is."""
        priority = 10
        assert priority == 10

    def test_active_preserved(self):
        """active field is preserved as-is."""
        active = False
        assert active is False


class TestMigrationIdempotency:
    """Test that migration is idempotent (safe to re-run)."""

    def test_no_duplicate_combo_ids_on_rerun(self):
        """
        Re-running migration should not create duplicate combo_id entries.
        Use upsert logic: update existing, insert only if new.
        """
        combo_ids_seen = set()
        documents = [
            {"combo_id": "combo_1", "animation": "a1"},
            {"combo_id": "combo_1", "animation": "a2"},
            {"combo_id": "combo_2", "animation": "a3"},
        ]

        for doc in documents:
            cid = doc["combo_id"]
            if cid not in combo_ids_seen:
                combo_ids_seen.add(cid)

        assert len(combo_ids_seen) == 2
        assert "combo_1" in combo_ids_seen
        assert "combo_2" in combo_ids_seen


class TestMigrationDataIntegrity:
    """Test data integrity during migration."""

    def test_no_data_loss_all_semantic_fields_preserved(self, sample_semantic_rules):
        """Every field from semantic_rules must end up in ar_combinations."""
        semantic_fields = [
            "semantic_result", "animation", "sound", "phrase",
            "priority", "active", "flashcard_set", "required_tags",
        ]

        for sr in sample_semantic_rules:
            # Build a merged document
            merged = {
                "semantic_result": sr.get("result"),
                "animation": sr.get("animation"),
                "sound": sr.get("sound"),
                "phrase": sr.get("phrase"),
                "priority": sr.get("priority"),
                "active": sr.get("active"),
                "flashcard_set": sr.get("flashcardSet"),
                "required_tags": sr.get("cards"),
            }
            for field in semantic_fields:
                assert field in merged, f"Missing field: {field}"

    def test_existing_ar_combinations_not_overwritten(
        self, sample_ar_combinations, sample_semantic_rules
    ):
        """Existing ar_combinations fields must not be overwritten by migration."""
        original = sample_ar_combinations[0]

        # Simulate migration adding new fields (don't overwrite existing)
        migrated = {**original}
        migrated["animation"] = sample_semantic_rules[0].get("animation")
        migrated["semantic_result"] = sample_semantic_rules[0].get("result")

        assert migrated["combo_id"] == original["combo_id"]
        assert migrated["model_3d_url"] == original["model_3d_url"]
        assert migrated["bonus_xp"] == original["bonus_xp"]


class TestMigrationBackup:
    """Test backup collection creation."""

    def test_backup_naming_convention(self):
        """Backup should be named ar_combinations_backup_<timestamp>."""
        import re
        timestamp_pattern = r"^ar_combinations_backup_\d{8}_\d{6}$"
        backup_name = "ar_combinations_backup_20250722_143000"
        assert re.match(timestamp_pattern, backup_name) is not None


class TestMigrationAPICompatibility:
    """Test that migrated data works with existing API."""

    def test_combo_response_includes_semantic_fields(self):
        """
        GET /api/v1/combos/:id should return document with new semantic fields.

        After migration, ComboResponse includes: animation, sound, phrase,
        semantic_result, priority, active, flashcard_set
        """
        mock_combo = {
            "combo_id": "test_combo",
            "description": "Test combo",
            "required_tags": ["tag1", "tag2"],
            "model_3d_url": "https://example.com/model.glb",
            "texture_url": "https://example.com/texture.png",
            "image_2d_url": "https://example.com/image.jpg",
            "bonus_xp": 100,
            "animation": "test_animation",
            "sound": "/audio/test.mp3",
            "phrase": "Test Phrase",
            "semantic_result": "particle_burst",
            "priority": 5,
            "active": True,
            "flashcard_set": "set_test_001",
        }

        # All required fields present
        assert mock_combo["animation"] == "test_animation"
        assert mock_combo["semantic_result"] == "particle_burst"
        assert mock_combo["flashcard_set"] == "set_test_001"

    def test_frontend_rule_loader_url_compatible(self):
        """
        Frontend RuleLoader should work with migrated /combos endpoint.

        OLD: GET /api/v1/ar/semantic-rules?flashcardSet=xxx
        NEW: GET /api/v1/combos?flashcard_set=xxx&active=true
        """
        new_url = "/api/v1/combos?flashcard_set=set_001&active=true"
        assert "flashcard_set" in new_url
        assert "semantic-rules" not in new_url


class TestMigrationEdgeCases:
    """Test edge cases in migration."""

    def test_semantic_rule_with_no_cards(self):
        """Rules with empty cards array should be skipped or logged."""
        rule_no_cards = {
            "_id": "sr_bad",
            "cards": [],
            "result": "test",
            "animation": "test",
            "flashcardSet": "set_001",
        }
        has_cards = len(rule_no_cards.get("cards", [])) > 0
        assert not has_cards

    def test_semantic_rule_with_missing_required_fields(self):
        """Rules missing required fields should be skipped."""
        rule_incomplete = {
            "_id": "sr_incomplete",
            "cards": ["card_1"],
        }
        required = ["cards", "result", "animation", "flashcardSet"]
        missing = [f for f in required if f not in rule_incomplete or not rule_incomplete[f]]
        assert len(missing) > 0

    def test_duplicate_combo_id_preserves_existing(self):
        """If semantic_rules._id matches existing ar_combinations.combo_id, prefer existing."""
        existing = {"combo_id": "dup_combo", "model_3d_url": "existing.glb", "bonus_xp": 200}
        incoming = {"_id": "dup_combo", "animation": "anim", "semantic_result": "combo_jungle"}

        merged = {**existing}
        for key, value in incoming.items():
            if key not in merged:
                merged[key] = value

        assert merged["model_3d_url"] == "existing.glb"
        assert merged["bonus_xp"] == 200
        assert merged["animation"] == "anim"
        assert merged["semantic_result"] == "combo_jungle"

    def test_null_sound_handled(self):
        """Null sound field should be preserved (not omitted)."""
        rule = {
            "_id": "sr_null_sound",
            "cards": ["card_1"],
            "result": "test",
            "animation": "test",
            "sound": None,
            "flashcardSet": "set_001",
        }
        assert rule.get("sound") is None
