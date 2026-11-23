# backend/tests/test_retrieval_reranker.py
from services.retrieval_reranker import rerank

def test_empty_input_returns_empty():
    assert rerank("elephant", [], top_k=4) == []

def test_lexical_overlap_boosts_relevant_chunk():
    chunks = [
        {"text": "Lions live in prides.", "score": 0.9, "source": "qdrant", "canonical_group": "lion"},
        {"text": "The elephant is the largest land animal with a trunk.", "score": 0.9, "source": "qdrant", "canonical_group": "elephant"},
    ]
    out = rerank("elephant trunk", chunks, top_k=2)
    assert out[0]["canonical_group"] == "elephant"

def test_dedupes_by_canonical_group():
    chunks = [
        {"text": "a", "score": 0.9, "canonical_group": "g"},
        {"text": "b", "score": 0.8, "canonical_group": "g"},
    ]
    assert len(rerank("g", chunks, top_k=2)) == 1

def test_missing_scores_get_neutral_norm():
    out = rerank("x", [{"text": "x word"}], top_k=1)
    assert 0.0 <= out[0]["rerank_score"] <= 1.0

def test_top_k_truncates():
    chunks = [{"text": f"c{i}", "score": i / 10, "canonical_group": f"g{i}"} for i in range(6)]
    assert len(rerank("c", chunks, top_k=4)) == 4