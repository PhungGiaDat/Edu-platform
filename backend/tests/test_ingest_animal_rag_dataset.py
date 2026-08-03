"""Tests for the safe, explicit Qdrant animal-dataset ingestion CLI."""

from unittest.mock import Mock

from scripts import ingest_animal_rag_dataset as ingestion
from services.animal_rag_dataset import AnimalRAGDocument


def document() -> AnimalRAGDocument:
    return AnimalRAGDocument(
        point_id="00000000-0000-0000-0000-000000000001",
        doc_id="animal-001",
        file_name="animal.txt",
        relative_path="data/animal.txt",
        file_format="txt",
        animal_en="ant",
        animal_vi="kien",
        topic="vocabulary_card",
        level="A0",
        age_range="6-8",
        safety_label="clean",
        text="An ant is an insect.",
        content_hash="hash",
        canonical_group="ant",
    )


def test_main_dry_run_validates_documents_without_constructing_qdrant(monkeypatch, tmp_path, capsys):
    documents = [document(), document()]
    loader = Mock(return_value=documents)
    constructor = Mock(side_effect=AssertionError("Qdrant must remain offline during dry-run"))
    monkeypatch.setattr(ingestion, "load_animal_dataset", loader)
    monkeypatch.setattr(ingestion, "_new_qdrant_service", constructor, raising=False)

    assert ingestion.main(["--dataset-path", str(tmp_path)]) == 0

    loader.assert_called_once_with(tmp_path.resolve())
    constructor.assert_not_called()
    assert capsys.readouterr().out == "Dry run validated 2 documents\n"


def test_main_apply_loads_once_then_ensures_uploads_and_verifies(monkeypatch, tmp_path, capsys):
    documents = [document()]
    loader = Mock(return_value=documents)
    service = Mock()
    constructor = Mock(return_value=service)
    monkeypatch.setattr(ingestion, "load_animal_dataset", loader)
    monkeypatch.setattr(ingestion, "_new_qdrant_service", constructor, raising=False)

    assert ingestion.main(["--dataset-path", str(tmp_path), "--apply"]) == 0

    loader.assert_called_once_with(tmp_path.resolve())
    constructor.assert_called_once_with()
    service.ensure_collection.assert_called_once_with()
    service.upsert_documents.assert_called_once_with(documents)
    service.verify_document_ids.assert_called_once_with([documents[0].point_id])
    assert capsys.readouterr().out == "Applied 1 documents to kids_english_animals_minilm_v1\n"
