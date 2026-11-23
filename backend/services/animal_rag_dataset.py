"""Safe, deterministic ingestion of the audited animal-learning dataset."""

from __future__ import annotations

from dataclasses import dataclass
from hashlib import sha256
import json
from pathlib import Path
import re
from typing import Any
import uuid
import xml.etree.ElementTree as ElementTree
import zipfile


_SUPPORTED_FORMATS = {"txt", "md", "docx", "pptx", "xlsx"}
_REQUIRED_METADATA = (
    "doc_id", "file_name", "relative_path", "format", "animal_en", "animal_vi",
    "topic", "level", "age_range", "safety_label",
)
_ARTICLE_CORRECTIONS = {
    r"\bA ant\b": "An ant",
    r"\bA eagle\b": "An eagle",
    r"\bA elephant\b": "An elephant",
    r"\bA insect\b": "An insect",
    r"\bA otter\b": "An otter",
    r"\bA owl\b": "An owl",
    r"\ba insect\b": "an insect",
}
_NATURAL_NUMBER = re.compile(r"(\d+)")
_DEFAULT_EMBEDDING_MODEL = "sentence-transformers/all-MiniLM-L6-v2"


@dataclass(frozen=True)
class AnimalRAGDocument:
    point_id: str
    doc_id: str
    file_name: str
    relative_path: str
    file_format: str
    animal_en: str
    animal_vi: str
    topic: str
    level: str
    age_range: str
    safety_label: str
    text: str
    content_hash: str
    canonical_group: str


def _local_name(element: ElementTree.Element) -> str:
    return element.tag.rsplit("}", 1)[-1]


def _natural_key(value: str) -> list[object]:
    return [int(part) if part.isdigit() else part.casefold() for part in _NATURAL_NUMBER.split(value)]


def _xml_text(element: ElementTree.Element) -> str:
    return "".join(child.text or "" for child in element.iter() if _local_name(child) == "t")


def normalize_index_text(text: str) -> str:
    """Normalize layout whitespace and the seven audited article corrections only."""
    normalized = re.sub(r"\s+", " ", text).strip()
    for pattern, replacement in _ARTICLE_CORRECTIONS.items():
        normalized = re.sub(pattern, replacement, normalized)
    return normalized


def deterministic_point_id(doc_id: str) -> str:
    """Return the stable Qdrant point UUID for an audited document ID."""
    return str(uuid.uuid5(uuid.NAMESPACE_URL, f"edu-platform:animal-rag:{doc_id}"))


def _canonical_group(animal_en: str, topic: str) -> str:
    """Return a normalized retrieval-diversification key for one animal topic."""
    normalized_animal = " ".join(animal_en.casefold().split())
    normalized_topic = " ".join(topic.casefold().split())
    return f"{normalized_animal}:{normalized_topic}"


def _extract_docx(archive: zipfile.ZipFile) -> str:
    try:
        root = ElementTree.fromstring(archive.read("word/document.xml"))
    except KeyError as exc:
        raise ValueError("DOCX is missing word/document.xml") from exc
    paragraphs = [
        _xml_text(element)
        for element in root.iter()
        if _local_name(element) == "p" and _xml_text(element)
    ]
    return "\n".join(paragraphs)


def _extract_pptx(archive: zipfile.ZipFile) -> str:
    slide_names = sorted(
        (name for name in archive.namelist() if re.fullmatch(r"ppt/slides/slide\d+\.xml", name)),
        key=_natural_key,
    )
    if not slide_names:
        raise ValueError("PPTX contains no slide XML")
    slides: list[str] = []
    for name in slide_names:
        root = ElementTree.fromstring(archive.read(name))
        slide_text = "\n".join(
            element.text or "" for element in root.iter() if _local_name(element) == "t" and element.text
        )
        if slide_text:
            slides.append(slide_text)
    return "\n".join(slides)


def _shared_strings(archive: zipfile.ZipFile) -> list[str]:
    try:
        root = ElementTree.fromstring(archive.read("xl/sharedStrings.xml"))
    except KeyError:
        return []
    return [_xml_text(element) for element in root.iter() if _local_name(element) == "si"]


def _extract_xlsx(archive: zipfile.ZipFile) -> str:
    shared_strings = _shared_strings(archive)
    sheet_names = sorted(
        (name for name in archive.namelist() if re.fullmatch(r"xl/worksheets/sheet\d+\.xml", name)),
        key=_natural_key,
    )
    if not sheet_names:
        raise ValueError("XLSX contains no worksheet XML")
    values: list[str] = []
    for name in sheet_names:
        root = ElementTree.fromstring(archive.read(name))
        for cell in (element for element in root.iter() if _local_name(element) == "c"):
            cell_type = cell.attrib.get("t")
            if cell_type == "inlineStr":
                value = _xml_text(cell)
            else:
                value_element = next((child for child in cell if _local_name(child) == "v"), None)
                if value_element is None or value_element.text is None:
                    continue
                value = value_element.text
                if cell_type == "s":
                    try:
                        value = shared_strings[int(value)]
                    except (IndexError, ValueError) as exc:
                        raise ValueError("XLSX shared-string index is invalid") from exc
            if value:
                values.append(value)
    return "\n".join(values)


def extract_document_text(path: Path) -> str:
    """Read an allowed source format without executing document content."""
    file_format = path.suffix.lower().lstrip(".")
    if file_format not in _SUPPORTED_FORMATS:
        raise ValueError(f"unsupported format: {path.suffix or '<none>'}")
    if file_format in {"txt", "md"}:
        return path.read_text(encoding="utf-8")
    try:
        with zipfile.ZipFile(path) as archive:
            if file_format == "docx":
                return _extract_docx(archive)
            if file_format == "pptx":
                return _extract_pptx(archive)
            return _extract_xlsx(archive)
    except (OSError, zipfile.BadZipFile, ElementTree.ParseError) as exc:
        raise ValueError(f"cannot read {file_format.upper()} source: {path.name}") from exc


def _validate_record(record: Any, line_number: int) -> dict[str, str]:
    if not isinstance(record, dict):
        raise ValueError(f"manifest line {line_number}: record must be an object")
    missing = [key for key in _REQUIRED_METADATA if not isinstance(record.get(key), str) or not record[key].strip()]
    if missing:
        raise ValueError(f"manifest line {line_number}: missing required metadata: {', '.join(missing)}")
    validated = {key: record[key].strip() for key in _REQUIRED_METADATA}
    if validated["format"].casefold() not in _SUPPORTED_FORMATS:
        raise ValueError(f"manifest line {line_number}: unsupported format: {validated['format']}")
    if validated["safety_label"] != "clean":
        raise ValueError(f"manifest line {line_number}: safety_label must be clean")
    return validated


def _load_manifest(dataset_root: Path) -> list[dict[str, str]]:
    manifest_path = dataset_root / "manifest_records.txt"
    if not manifest_path.is_file():
        raise ValueError("missing manifest_records.txt")
    records: list[dict[str, str]] = []
    for line_number, line in enumerate(manifest_path.read_text(encoding="utf-8").splitlines(), start=1):
        if not line.strip():
            continue
        try:
            raw_record = json.loads(line)
        except json.JSONDecodeError as exc:
            raise ValueError(f"manifest line {line_number}: malformed JSON") from exc
        records.append(_validate_record(raw_record, line_number))
    if not records:
        raise ValueError("manifest contains no records")
    doc_ids = [record["doc_id"] for record in records]
    paths = [record["relative_path"] for record in records]
    if len(doc_ids) != len(set(doc_ids)):
        raise ValueError("manifest contains duplicate doc_id")
    if len(paths) != len(set(paths)):
        raise ValueError("manifest contains duplicate relative_path")
    return records


def _resolve_source_path(dataset_root: Path, relative_path: str) -> Path:
    candidate = dataset_root / relative_path
    resolved = candidate.resolve()
    try:
        resolved.relative_to(dataset_root)
    except ValueError as exc:
        raise ValueError(f"source path escapes dataset root: {relative_path}") from exc
    if not resolved.is_file():
        raise ValueError(f"missing source file: {relative_path}")
    return resolved


def load_animal_dataset(dataset_root: Path) -> list[AnimalRAGDocument]:
    """Validate every manifest entry before extracting its read-only source."""
    root = dataset_root.resolve()
    if not root.is_dir():
        raise ValueError("dataset root does not exist")
    records = _load_manifest(root)
    resolved_records: list[tuple[dict[str, str], Path]] = []
    for record in records:
        source_path = _resolve_source_path(root, record["relative_path"])
        source_format = record["format"].casefold()
        if source_path.suffix.casefold() != f".{source_format}":
            raise ValueError(f"source extension does not match format: {record['relative_path']}")
        resolved_records.append((record, source_path))

    documents: list[AnimalRAGDocument] = []
    for record, source_path in resolved_records:
        source_format = record["format"].casefold()
        text = normalize_index_text(extract_document_text(source_path))
        if not text:
            raise ValueError(f"empty normalized text: {record['relative_path']}")
        documents.append(AnimalRAGDocument(
            point_id=deterministic_point_id(record["doc_id"]),
            doc_id=record["doc_id"],
            file_name=record["file_name"],
            relative_path=record["relative_path"],
            file_format=source_format,
            animal_en=record["animal_en"],
            animal_vi=record["animal_vi"],
            topic=record["topic"],
            level=record["level"],
            age_range=record["age_range"],
            safety_label=record["safety_label"],
            text=text,
            content_hash=sha256(text.encode("utf-8")).hexdigest(),
            canonical_group=_canonical_group(record["animal_en"], record["topic"]),
        ))
    return documents


def build_qdrant_payload(
    document: AnimalRAGDocument,
    embedding_model: str = _DEFAULT_EMBEDDING_MODEL,
) -> dict[str, Any]:
    """Map one validated source document to its stable Qdrant payload."""
    return {
        "text": document.text,
        "doc_id": document.doc_id,
        "file_name": document.file_name,
        "relative_path": document.relative_path,
        "file_format": document.file_format,
        "animal_en": document.animal_en,
        "animal_vi": document.animal_vi,
        "topic": document.topic,
        "level": document.level,
        "age_range": document.age_range,
        "safety_label": document.safety_label,
        "source_type": "synthetic_child_safe_learning_material",
        "chunk_index": 0,
        "content_hash": document.content_hash,
        "canonical_group": document.canonical_group,
        "embedding_model": embedding_model,
        "dataset_version": "2026-08-03",
    }
