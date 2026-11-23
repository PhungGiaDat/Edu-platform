"""LC4 memory-match contract and learner-safe vertical fixture tests."""
import pytest
from pydantic import ValidationError
from models.game_activity import MemoryMatchPayload, MiniGameCompleteRequest
from models.lesson_activity import LessonLearningBlocks

FIXTURE = {"pairs":[{"id":"fox","type":"word","content":"Fox"},{"id":"fox","type":"image","content":"https://example.test/fox.png"}]}

def test_memory_match_activity_and_payload_are_valid():
    block = LessonLearningBlocks.model_validate({"schema_version":2,"content_version":1,"vocabulary":["fox"],"activities":[{"activity_id":"lc4-memory","type":"mini_game","order":1,"required":True,"completion_policy":{"mode":"game_complete"},"config":{"game_type":"memory_match","mini_game_item_ids":[101]}}]})
    assert block.activities[0].config.mini_game_item_ids == [101]
    assert MemoryMatchPayload.model_validate(FIXTURE).pairs[0].content == "Fox"

@pytest.mark.parametrize("payload", [{"pairs":[]},{"pairs":[{"id":"fox","type":"word","content":"Fox"},{"id":"fox","type":"word","content":"Fox"}]},{"pairs":[{"id":"","type":"word","content":"Fox"},{"id":"fox","type":"image","content":"x"}]}])
def test_malformed_memory_payload_is_rejected(payload):
    with pytest.raises(ValidationError): MemoryMatchPayload.model_validate(payload)

def test_completion_request_only_accepts_pair_identity():
    request = MiniGameCompleteRequest.model_validate({"matched_pair_ids":["101"]})
    assert request.model_dump() == {"matched_pair_ids":["101"]}
    with pytest.raises(ValidationError): MiniGameCompleteRequest.model_validate({"matched_pair_ids":["101"],"xp":999})
