"""Tests for deterministic, safe animal-dataset ingestion."""

import json
import os
import zipfile
from pathlib import Path

import pytest

from services.animal_rag_dataset import (
    AnimalRAGDocument,
    build_qdrant_payload,
    deterministic_point_id,
    extract_document_text,
    load_animal_dataset,
    normalize_index_text,
)


def _write_zip(path: Path, entries: dict[str, str]) -> None:
    with zipfile.ZipFile(path, "w") as archive:
        for name, value in entries.items():
            archive.writestr(name, value)


def _manifest_record(**overrides: str) -> dict[str, str]:
    record = {
        "doc_id": "animal-001",
        "file_name": "animal.txt",
        "relative_path": "data/animal.txt",
        "format": "txt",
        "animal_en": "ant",
        "animal_vi": "kien",
        "topic": "vocabulary_card",
        "level": "A0",
        "age_range": "6-8",
        "safety_label": "clean",
    }
    record.update(overrides)
    return record


def _write_manifest(root: Path, *records: dict[str, str]) -> None:
    root.joinpath("manifest_records.txt").write_text(
        "\n".join(json.dumps(record) for record in records) + "\n",
        encoding="utf-8",
    )


def _write_dataset(tmp_path: Path, records: list[dict[str, str]], files: dict[str, str]) -> Path:
    root = tmp_path / "dataset"
    root.mkdir()
    for relative_path, text in files.items():
        path = root / relative_path
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(text, encoding="utf-8")
    _write_manifest(root, *records)
    return root


def test_extracts_utf8_txt_and_markdown(tmp_path: Path):
    text = tmp_path / "animals.txt"
    markdown = tmp_path / "animals.md"
    text.write_text("Cá»«u are gentle.", encoding="utf-8")
    markdown.write_text("# Chá»“n\n\nA otter swims.", encoding="utf-8")

    assert extract_document_text(text) == "Cá»«u are gentle."
    assert extract_document_text(markdown) == "# Chá»“n\n\nA otter swims."


def test_extracts_docx_word_document_xml(tmp_path: Path):
    docx = tmp_path / "animal.docx"
    _write_zip(docx, {
        "word/document.xml": (
            '<w:document xmlns:w="urn:word"><w:body><w:p><w:r><w:t>Ant</w:t>'
            '</w:r><w:r><w:t> facts</w:t></w:r></w:p><w:p><w:r><w:t>for kids</w:t>'
            '</w:r></w:p></w:body></w:document>'
        )
    })

    assert extract_document_text(docx) == "Ant facts\nfor kids"


def test_extracts_pptx_slides_in_natural_numeric_order(tmp_path: Path):
    pptx = tmp_path / "animal.pptx"
    _write_zip(pptx, {
        "ppt/slides/slide10.xml": '<p:sld xmlns:p="urn:p"><p:t>ten</p:t></p:sld>',
        "ppt/slides/slide2.xml": '<p:sld xmlns:p="urn:p"><p:t>two</p:t></p:sld>',
        "ppt/slides/slide1.xml": '<p:sld xmlns:p="urn:p"><p:t>one</p:t></p:sld>',
    })

    assert extract_document_text(pptx) == "one\ntwo\nten"


def test_extracts_xlsx_direct_inline_shared_and_numeric_values_in_natural_sheet_order(tmp_path: Path):
    xlsx = tmp_path / "animal.xlsx"
    _write_zip(xlsx, {
        "xl/sharedStrings.xml": (
            '<sst xmlns="urn:ss"><si><t>shared text</t></si><si><r><t>rich</t></r>'
            '<r><t> text</t></r></si></sst>'
        ),
        "xl/worksheets/sheet10.xml": (
            '<worksheet xmlns="urn:x"><sheetData><row><c t="n"><v>10</v></c>'
            '<c t="s"><v>1</v></c></row></sheetData></worksheet>'
        ),
        "xl/worksheets/sheet2.xml": (
            '<worksheet xmlns="urn:x"><sheetData><row><c t="inlineStr"><is><t>inline text</t>'
            '</is></c><c t="str"><v>direct text</v></c></row></sheetData></worksheet>'
        ),
        "xl/worksheets/sheet1.xml": (
            '<worksheet xmlns="urn:x"><sheetData><row><c t="s"><v>0</v></c>'
            '<c t="n"><v>7</v></c></row></sheetData></worksheet>'
        ),
    })

    assert extract_document_text(xlsx) == "shared text\n7\ninline text\ndirect text\n10\nrich text"


def test_normalize_index_text_changes_only_audited_articles_and_whitespace():
    raw = " A ant\tand A eagle. A elephant! A insect? A otter; A owl. a insect. A cat.  "

    assert normalize_index_text(raw) == (
        "An ant and An eagle. An elephant! An insect? An otter; An owl. an insect. A cat."
    )


def test_rejects_duplicate_manifest_identifiers_before_any_source_extraction(tmp_path: Path):
    root = _write_dataset(
        tmp_path,
        [
            _manifest_record(doc_id="same", relative_path="data/missing.txt"),
            _manifest_record(doc_id="same", relative_path="data/other.txt"),
        ],
        {},
    )

    with pytest.raises(ValueError, match="duplicate doc_id"):
        load_animal_dataset(root)

    _write_manifest(
        root,
        _manifest_record(doc_id="first", relative_path="data/same.txt"),
        _manifest_record(doc_id="second", relative_path="data/same.txt"),
    )
    with pytest.raises(ValueError, match="duplicate relative_path"):
        load_animal_dataset(root)


def test_validates_every_source_extension_before_extracting_any_document(tmp_path: Path):
    root = _write_dataset(
        tmp_path,
        [
            _manifest_record(format="docx", file_name="first.docx", relative_path="data/first.docx"),
            _manifest_record(doc_id="second", file_name="second.md", relative_path="data/second.md"),
        ],
        {"data/first.docx": "not a zip", "data/second.md": "text"},
    )

    with pytest.raises(ValueError, match="source extension does not match format"):
        load_animal_dataset(root)


@pytest.mark.parametrize(
    ("record", "files", "error"),
    [
        (_manifest_record(format="pdf", relative_path="data/animal.pdf"), {"data/animal.pdf": "x"}, "unsupported format"),
        (_manifest_record(), {}, "missing source file"),
        (_manifest_record(relative_path="../outside.txt"), {}, "escapes dataset root"),
        (_manifest_record(safety_label="review"), {"data/animal.txt": "x"}, "safety_label"),
        ({"doc_id": "only-id"}, {}, "missing required metadata"),
    ],
)
def test_rejects_invalid_manifest_records(tmp_path: Path, record, files, error):
    root = _write_dataset(tmp_path, [record], files)

    with pytest.raises(ValueError, match=error):
        load_animal_dataset(root)


def test_rejects_malformed_manifest_and_empty_normalized_text(tmp_path: Path):
    root = tmp_path / "dataset"
    root.mkdir()
    root.joinpath("manifest_records.txt").write_text("not json\n", encoding="utf-8")
    with pytest.raises(ValueError, match="malformed JSON"):
        load_animal_dataset(root)

    data_path = root / "data" / "animal.txt"
    data_path.parent.mkdir()
    data_path.write_text(" \t\n ", encoding="utf-8")
    _write_manifest(root, _manifest_record())
    with pytest.raises(ValueError, match="empty normalized text"):
        load_animal_dataset(root)


def test_rejects_symlink_escape_after_resolving_source_path(tmp_path: Path):
    root = tmp_path / "dataset"
    root.mkdir()
    outside = tmp_path / "outside.txt"
    outside.write_text("outside", encoding="utf-8")
    link = root / "data" / "animal.txt"
    link.parent.mkdir()
    try:
        os.symlink(outside, link)
    except OSError as exc:
        pytest.skip(f"symlinks unavailable: {exc}")
    _write_manifest(root, _manifest_record())

    with pytest.raises(ValueError, match="escapes dataset root"):
        load_animal_dataset(root)


def test_loads_valid_document_with_stable_id_hash_and_canonical_group(tmp_path: Path):
    record = _manifest_record(
        doc_id="ant-001",
        animal_en="  ANT  ",
        topic="  Habitat_Note  ",
        relative_path="data/ant.txt",
    )
    root = _write_dataset(tmp_path, [record], {"data/ant.txt": "A ant is an insect."})

    documents = load_animal_dataset(root)

    assert documents == load_animal_dataset(root)
    assert documents[0].point_id == deterministic_point_id("ant-001")
    assert documents[0].text == "An ant is an insect."
    assert documents[0].content_hash == "28420b5fc4dd654fa22e6bb14f38d402bea03eb60ebb5ffe71d0865227691b85"
    assert documents[0].canonical_group == "ant:habitat_note"


def test_build_qdrant_payload_contains_exact_runtime_and_audit_metadata():
    document = AnimalRAGDocument(
        point_id="id", doc_id="ant-001", file_name="ant.txt", relative_path="data/ant.txt",
        file_format="txt", animal_en="ant", animal_vi="kien", topic="vocabulary_card",
        level="A0", age_range="6-8", safety_label="clean", text="An ant.",
        content_hash="hash", canonical_group="ant:vocabulary_card",
    )

    assert build_qdrant_payload(document) == {
        "text": "An ant.", "doc_id": "ant-001", "file_name": "ant.txt",
        "relative_path": "data/ant.txt", "file_format": "txt", "animal_en": "ant",
        "animal_vi": "kien", "topic": "vocabulary_card", "level": "A0",
        "age_range": "6-8", "safety_label": "clean",
        "source_type": "synthetic_child_safe_learning_material", "chunk_index": 0,
        "content_hash": "hash", "canonical_group": "ant:vocabulary_card",
        "embedding_model": "sentence-transformers/all-MiniLM-L6-v2",
        "dataset_version": "2026-08-03",
    }


def test_build_qdrant_payload_uses_explicit_active_embedding_model():
    document = AnimalRAGDocument(
        point_id="id", doc_id="ant-001", file_name="ant.txt", relative_path="data/ant.txt",
        file_format="txt", animal_en="ant", animal_vi="kien", topic="vocabulary_card",
        level="A0", age_range="6-8", safety_label="clean", text="An ant.",
        content_hash="hash", canonical_group="ant:vocabulary_card",
    )

    assert build_qdrant_payload(document, embedding_model="custom/active-model")["embedding_model"] == (
        "custom/active-model"
    )
