# Lexi Qdrant Agentic RAG Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move Lexi's retrieval layer to Qdrant Cloud Inference and safely ingest the audited 250-document animal dataset without changing the existing frontend contract.

**Architecture:** Add a small dataset module for extraction and payload construction, a Qdrant service for collection validation/upsert/query, and a dry-run-first ingestion CLI. Inject the retriever into the existing Planner -> Generator -> Validator service, remove the MongoDB flashcard vector dependency from the RAG endpoint, and version response-cache keys by the Qdrant embedding space.

**Tech Stack:** Python 3, FastAPI, Pydantic Settings, qdrant-client Cloud Inference, pytest, MongoDB for existing progress/history/cache only.

## Global Constraints

- Use Qdrant Cloud Inference model `sentence-transformers/all-MiniLM-L6-v2` with exactly 384 dimensions and cosine distance.
- Default collection name is `kids_english_animals_minilm_v1`.
- Default score threshold is `0.35`, retrieval limit is `8`, and context limit is `3`.
- Preserve all 250 dataset records; never mutate the source dataset.
- Never delete or recreate an existing collection or point automatically.
- Ingestion defaults to dry-run and performs remote writes only with `--apply`.
- Qdrant secrets remain backend-only and must not appear in logs, tests, frontend files, or tracked configuration.
- MongoDB remains responsible for progress, chat history, and RAG response caching.
- No hidden fallback to MongoDB Atlas Vector Search or Gemini embeddings.
- Preserve `POST /api/v1/chat/rag` and the existing `{response, sources, session_id}` response shape.

---

## File Structure

- Create `backend/services/animal_rag_dataset.py`: extract, normalize, validate, and map dataset records to Qdrant payloads.
- Create `backend/services/qdrant_rag_service.py`: lazy Qdrant client, schema-safe collection setup, upsert, verification, and diversified retrieval.
- Create `backend/scripts/ingest_animal_rag_dataset.py`: dry-run/apply command orchestration.
- Create `backend/tests/test_animal_rag_dataset.py`: real ZIP/XML fixture coverage for all five formats and manifest validation.
- Create `backend/tests/test_qdrant_rag_service.py`: collection safety, idempotent upload, result filtering, and failure sanitization.
- Create `backend/tests/test_agentic_rag_qdrant.py`: cache-version, Generator, and API dependency regression coverage.
- Modify `backend/settings.py`: optional Qdrant settings and retrieval-version property.
- Modify `backend/.env.example`: operator-facing Qdrant configuration without secrets.
- Modify `backend/requirements.txt`: official Qdrant Python client.
- Modify `backend/services/agentic_rag_service.py`: inject and call Qdrant retrieval; remove Gemini query embedding and flashcard vector search.
- Modify `backend/api/chat.py`: remove `FlashcardRepository` from the RAG endpoint dependency graph.

---

### Task 1: Configuration and Qdrant Retrieval Boundary

**Files:**
- Create: `backend/tests/test_qdrant_rag_service.py`
- Create: `backend/services/qdrant_rag_service.py`
- Modify: `backend/settings.py`
- Modify: `backend/.env.example`
- Modify: `backend/requirements.txt`

**Interfaces:**
- Produces: `QdrantRAGUnavailable`, `QdrantRAGService.retrieve(query: str) -> list[dict[str, Any]]`, `QdrantRAGService.ensure_collection() -> None`, `QdrantRAGService.upsert_documents(documents: Sequence[dict[str, Any]]) -> int`, and `get_qdrant_rag_service()`.
- Consumes later: `settings.qdrant_retrieval_version` and payload keys `text`, `animal_en`, `canonical_group`, `safety_label`, `doc_id`, and `topic`.

- [ ] **Step 1: Write failing configuration and retrieval tests**

```python
import pytest

from services.qdrant_rag_service import QdrantRAGService, QdrantRAGUnavailable


class FakePoint:
    def __init__(self, score, payload):
        self.score = score
        self.payload = payload


class FakeQueryResult:
    def __init__(self, points):
        self.points = points


class FakeClient:
    def __init__(self, points):
        self.points = points
        self.query_kwargs = None

    def query_points(self, **kwargs):
        self.query_kwargs = kwargs
        return FakeQueryResult(self.points)


@pytest.mark.asyncio
async def test_retrieve_filters_and_diversifies_clean_results(monkeypatch):
    points = [
        FakePoint(0.91, {"doc_id": "1", "text": "Elephant one", "animal_en": "elephant", "topic": "habitat_note", "canonical_group": "elephant:habitat_note", "safety_label": "clean"}),
        FakePoint(0.88, {"doc_id": "2", "text": "Elephant two", "animal_en": "elephant", "topic": "habitat_note", "canonical_group": "elephant:habitat_note", "safety_label": "clean"}),
        FakePoint(0.83, {"doc_id": "3", "text": "Elephant movement", "animal_en": "elephant", "topic": "movement_note", "canonical_group": "elephant:movement_note", "safety_label": "clean"}),
    ]
    service = QdrantRAGService(client=FakeClient(points))

    results = await service.retrieve("elephant habitat")

    assert [item["doc_id"] for item in results] == ["1", "3"]
    assert all(item["safety_label"] == "clean" for item in results)


@pytest.mark.asyncio
async def test_retrieve_rejects_missing_configuration(monkeypatch):
    monkeypatch.setattr("services.qdrant_rag_service.settings.QDRANT_URL", None)
    monkeypatch.setattr("services.qdrant_rag_service.settings.QDRANT_API_KEY", None)
    service = QdrantRAGService()

    with pytest.raises(QdrantRAGUnavailable, match="not configured"):
        await service.retrieve("owl")
```

- [ ] **Step 2: Run the tests and verify RED**

Run: `python -m pytest tests/test_qdrant_rag_service.py -q`

Expected: collection fails because `services.qdrant_rag_service` does not exist.

- [ ] **Step 3: Add exact Qdrant settings and dependency**

```python
# settings.py fields
QDRANT_URL: Optional[str] = None
QDRANT_API_KEY: Optional[SecretStr] = None
QDRANT_COLLECTION: str = "kids_english_animals_minilm_v1"
QDRANT_EMBEDDING_MODEL: str = "sentence-transformers/all-MiniLM-L6-v2"
QDRANT_VECTOR_SIZE: int = 384
QDRANT_SCORE_THRESHOLD: float = 0.35
QDRANT_RETRIEVAL_LIMIT: int = 8
QDRANT_CONTEXT_LIMIT: int = 3

@property
def qdrant_retrieval_version(self) -> str:
    return f"qdrant:{self.QDRANT_COLLECTION}:{self.QDRANT_EMBEDDING_MODEL}"
```

Add `qdrant-client>=1.14.2,<2.0.0` to `requirements.txt` and documented empty/default values to `.env.example`.

- [ ] **Step 4: Implement the minimal async retrieval adapter**

```python
class QdrantRAGUnavailable(RuntimeError):
    pass


class QdrantRAGService:
    def __init__(self, client=None):
        self._client = client

    def _get_client(self):
        if self._client is not None:
            return self._client
        if not settings.QDRANT_URL or not settings.QDRANT_API_KEY:
            raise QdrantRAGUnavailable("Qdrant is not configured")
        self._client = QdrantClient(
            url=settings.QDRANT_URL,
            api_key=settings.QDRANT_API_KEY.get_secret_value(),
            cloud_inference=True,
            timeout=30,
        )
        return self._client

    async def retrieve(self, query: str) -> list[dict[str, Any]]:
        if not query.strip():
            return []
        return await asyncio.to_thread(self._retrieve_sync, query.strip())

    def _retrieve_sync(self, query: str) -> list[dict[str, Any]]:
        try:
            response = self._get_client().query_points(
                collection_name=settings.QDRANT_COLLECTION,
                query=models.Document(text=query, model=settings.QDRANT_EMBEDDING_MODEL),
                query_filter=models.Filter(must=[
                    models.FieldCondition(key="safety_label", match=models.MatchValue(value="clean"))
                ]),
                with_payload=True,
                limit=settings.QDRANT_RETRIEVAL_LIMIT,
                score_threshold=settings.QDRANT_SCORE_THRESHOLD,
            )
        except QdrantRAGUnavailable:
            raise
        except Exception as exc:
            raise QdrantRAGUnavailable("Qdrant retrieval failed") from exc

        selected = []
        seen_groups = set()
        for point in response.points:
            payload = dict(point.payload or {})
            group = payload.get("canonical_group") or payload.get("doc_id")
            if payload.get("safety_label") != "clean" or group in seen_groups:
                continue
            payload["score"] = float(point.score)
            selected.append(payload)
            seen_groups.add(group)
            if len(selected) >= settings.QDRANT_CONTEXT_LIMIT:
                break
        return selected
```

- [ ] **Step 5: Run GREEN verification**

Run: `python -m pytest tests/test_qdrant_rag_service.py -q`

Expected: all Task 1 tests pass.

- [ ] **Step 6: Commit Task 1**

```powershell
git add backend/settings.py backend/.env.example backend/requirements.txt backend/services/qdrant_rag_service.py backend/tests/test_qdrant_rag_service.py
git commit -m "feat(rag): add Qdrant retrieval boundary"
```

---

### Task 2: Dataset Extraction, Validation, and Payload Mapping

**Files:**
- Create: `backend/tests/test_animal_rag_dataset.py`
- Create: `backend/services/animal_rag_dataset.py`

**Interfaces:**
- Produces: `AnimalRAGDocument`, `load_animal_dataset(dataset_root: Path) -> list[AnimalRAGDocument]`, and `build_qdrant_payload(document: AnimalRAGDocument) -> dict[str, Any]`.
- Consumes: the audited `manifest_records.txt` JSON Lines schema and the five supported source formats.

- [ ] **Step 1: Write failing real-fixture tests**

```python
from pathlib import Path
from zipfile import ZipFile

import pytest

from services.animal_rag_dataset import load_animal_dataset, normalize_index_text


def write_zip(path: Path, member: str, xml: str) -> None:
    with ZipFile(path, "w") as archive:
        archive.writestr(member, xml)


def test_normalize_index_text_fixes_only_audited_articles():
    text = "A elephant sees a insect. A dog runs."
    assert normalize_index_text(text) == "An elephant sees an insect. A dog runs."


def test_load_dataset_extracts_utf8_text_and_ooxml(tmp_path):
    data = tmp_path / "data"
    (data / "txt").mkdir(parents=True)
    (data / "docx").mkdir()
    (data / "txt" / "dog.txt").write_text("A dog says hello to chó.", encoding="utf-8")
    write_zip(
        data / "docx" / "owl.docx",
        "word/document.xml",
        '<w:document xmlns:w="urn:w"><w:body><w:p><w:r><w:t>A owl flies.</w:t></w:r></w:p></w:body></w:document>',
    )
    records = [
        '{"doc_id":"dog","file_name":"dog.txt","relative_path":"data/txt/dog.txt","format":"txt","animal_en":"dog","animal_vi":"chó","topic":"sound_note","level":"A0","age_range":"6-8","safety_label":"clean"}',
        '{"doc_id":"owl","file_name":"owl.docx","relative_path":"data/docx/owl.docx","format":"docx","animal_en":"owl","animal_vi":"cú","topic":"movement_note","level":"A0","age_range":"6-8","safety_label":"clean"}',
    ]
    (tmp_path / "manifest_records.txt").write_text("\n".join(records), encoding="utf-8")

    documents = load_animal_dataset(tmp_path)

    assert [document.doc_id for document in documents] == ["dog", "owl"]
    assert "chó" in documents[0].text
    assert documents[1].text == "An owl flies."
    assert documents[1].canonical_group == "owl:movement_note"


def test_load_dataset_rejects_duplicate_ids_before_output(tmp_path):
    (tmp_path / "manifest_records.txt").write_text(
        '\n'.join([
            '{"doc_id":"same","relative_path":"missing.txt","format":"txt","animal_en":"dog","topic":"quiz_card","safety_label":"clean"}',
            '{"doc_id":"same","relative_path":"missing2.txt","format":"txt","animal_en":"dog","topic":"quiz_card","safety_label":"clean"}',
        ]),
        encoding="utf-8",
    )
    with pytest.raises(ValueError, match="Duplicate doc_id"):
        load_animal_dataset(tmp_path)
```

- [ ] **Step 2: Run the tests and verify RED**

Run: `python -m pytest tests/test_animal_rag_dataset.py -q`

Expected: collection fails because `services.animal_rag_dataset` does not exist.

- [ ] **Step 3: Implement extractors and immutable document mapping**

```python
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


def normalize_index_text(text: str) -> str:
    normalized = re.sub(r"\s+", " ", text).strip()
    replacements = {
        r"\bA ant\b": "An ant",
        r"\bA eagle\b": "An eagle",
        r"\bA elephant\b": "An elephant",
        r"\bA insect\b": "An insect",
        r"\bA otter\b": "An otter",
        r"\bA owl\b": "An owl",
        r"\ba insect\b": "an insect",
    }
    for pattern, replacement in replacements.items():
        normalized = re.sub(pattern, replacement, normalized)
    return normalized


def deterministic_point_id(doc_id: str) -> str:
    return str(uuid.uuid5(uuid.NAMESPACE_URL, f"edu-platform:animal-rag:{doc_id}"))
```

Use `zipfile.ZipFile` and `xml.etree.ElementTree.iter()` local-name matching for DOCX/PPTX/XLSX. Validate all IDs and metadata first, then extract. Reject unsupported formats, paths escaping the dataset root, missing files, non-clean labels, and empty normalized text.

- [ ] **Step 4: Add PPTX, XLSX, missing-file, traversal, and empty-text tests**

```python
def test_pptx_extraction_preserves_slide_order(tmp_path):
    path = tmp_path / "slides.pptx"
    with ZipFile(path, "w") as archive:
        archive.writestr("ppt/slides/slide2.xml", '<p:sld xmlns:p="urn:p" xmlns:a="urn:a"><a:t>Second</a:t></p:sld>')
        archive.writestr("ppt/slides/slide1.xml", '<p:sld xmlns:p="urn:p" xmlns:a="urn:a"><a:t>First cú</a:t></p:sld>')
    assert extract_document_text(path, "pptx") == "First cú Second"


def test_xlsx_extraction_reads_direct_string_cells(tmp_path):
    path = tmp_path / "sheet.xlsx"
    write_zip(
        path,
        "xl/worksheets/sheet1.xml",
        '<x:worksheet xmlns:x="urn:x"><x:sheetData><x:row><x:c t="str"><x:v>owl</x:v></x:c><x:c t="str"><x:v>cú</x:v></x:c></x:row></x:sheetData></x:worksheet>',
    )
    assert extract_document_text(path, "xlsx") == "owl cú"


def test_extraction_rejects_empty_ooxml(tmp_path):
    path = tmp_path / "empty.docx"
    write_zip(path, "word/document.xml", '<w:document xmlns:w="urn:w"><w:body /></w:document>')
    with pytest.raises(ValueError, match="empty text"):
        extract_document_text(path, "docx")


def test_manifest_rejects_path_outside_dataset_root(tmp_path):
    outside = tmp_path.parent / "outside.txt"
    outside.write_text("unsafe path", encoding="utf-8")
    (tmp_path / "manifest_records.txt").write_text(
        '{"doc_id":"outside","relative_path":"../outside.txt","format":"txt","animal_en":"owl","topic":"quiz_card","safety_label":"clean"}',
        encoding="utf-8",
    )
    with pytest.raises(ValueError, match="escapes dataset root"):
        load_animal_dataset(tmp_path)
```

- [ ] **Step 5: Run GREEN verification against fixtures and the real dataset**

Run: `python -m pytest tests/test_animal_rag_dataset.py -q`

Run:

```powershell
python -c "from pathlib import Path; from services.animal_rag_dataset import load_animal_dataset; docs=load_animal_dataset(Path(r'D:\Downloads\animal_agentic_rag_250_dataset\animal_agentic_rag_250_dataset')); print(len(docs), len({d.doc_id for d in docs}), min(len(d.text) for d in docs))"
```

Expected: tests pass and command prints `250 250` followed by a positive minimum length.

- [ ] **Step 6: Commit Task 2**

```powershell
git add backend/services/animal_rag_dataset.py backend/tests/test_animal_rag_dataset.py
git commit -m "feat(rag): validate animal dataset ingestion"
```

---

### Task 3: Dry-run-first Idempotent Ingestion Command

**Files:**
- Modify: `backend/services/qdrant_rag_service.py`
- Modify: `backend/tests/test_qdrant_rag_service.py`
- Create: `backend/scripts/ingest_animal_rag_dataset.py`
- Create: `backend/tests/test_ingest_animal_rag_dataset.py`

**Interfaces:**
- Produces: CLI `python -m scripts.ingest_animal_rag_dataset --dataset-path PATH [--apply]`.
- Consumes: `load_animal_dataset`, `QdrantRAGService.ensure_collection`, and `QdrantRAGService.upsert_documents`.

- [ ] **Step 1: Write failing dry-run and collection-safety tests**

```python
def test_main_dry_run_never_constructs_qdrant(monkeypatch, dataset_root, capsys):
    monkeypatch.setattr("scripts.ingest_animal_rag_dataset.load_animal_dataset", lambda path: [sample_document()])
    monkeypatch.setattr(
        "scripts.ingest_animal_rag_dataset.get_qdrant_rag_service",
        lambda: (_ for _ in ()).throw(AssertionError("Qdrant must not be used")),
    )
    assert main(["--dataset-path", str(dataset_root)]) == 0
    assert "Dry run validated 1 documents" in capsys.readouterr().out


def test_ensure_collection_refuses_vector_mismatch():
    client = FakeCollectionClient(size=1024, distance="Cosine")
    service = QdrantRAGService(client=client)
    with pytest.raises(QdrantRAGUnavailable, match="vector size"):
        service.ensure_collection()
    assert client.delete_calls == 0


def test_upsert_documents_uses_deterministic_ids():
    client = FakeUploadClient()
    service = QdrantRAGService(client=client)
    count = service.upsert_documents([sample_payload("dog"), sample_payload("owl")])
    assert count == 2
    assert client.upload_calls[0]["ids"] == [
        deterministic_point_id("dog"),
        deterministic_point_id("owl"),
    ]
```

- [ ] **Step 2: Run the tests and verify RED**

Run: `python -m pytest tests/test_qdrant_rag_service.py tests/test_ingest_animal_rag_dataset.py -q`

Expected: failures identify missing collection/upload methods and CLI module.

- [ ] **Step 3: Implement non-destructive collection setup and batch upload**

```python
def ensure_collection(self) -> None:
    client = self._get_client()
    if not client.collection_exists(settings.QDRANT_COLLECTION):
        client.create_collection(
            collection_name=settings.QDRANT_COLLECTION,
            vectors_config=models.VectorParams(
                size=settings.QDRANT_VECTOR_SIZE,
                distance=models.Distance.COSINE,
            ),
        )
        return
    info = client.get_collection(settings.QDRANT_COLLECTION)
    vector_config = info.config.params.vectors
    if vector_config.size != settings.QDRANT_VECTOR_SIZE:
        raise QdrantRAGUnavailable("Existing Qdrant collection vector size is incompatible")
    if vector_config.distance != models.Distance.COSINE:
        raise QdrantRAGUnavailable("Existing Qdrant collection distance is incompatible")


def upsert_documents(self, documents: Sequence[AnimalRAGDocument]) -> int:
    client = self._get_client()
    for batch in batched(documents, 32):
        client.upload_collection(
            collection_name=settings.QDRANT_COLLECTION,
            vectors=[models.Document(text=item.text, model=settings.QDRANT_EMBEDDING_MODEL) for item in batch],
            payload=[build_qdrant_payload(item) for item in batch],
            ids=[item.point_id for item in batch],
            wait=True,
        )
    return len(documents)
```

After upload, retrieve deterministic IDs in batches and fail if any expected point is absent.

- [ ] **Step 4: Implement the CLI**

```python
def main(argv: Sequence[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Validate or ingest the animal RAG dataset")
    parser.add_argument("--dataset-path", type=Path, required=True)
    parser.add_argument("--apply", action="store_true")
    args = parser.parse_args(argv)
    documents = load_animal_dataset(args.dataset_path.resolve())
    if not args.apply:
        print(f"Dry run validated {len(documents)} documents")
        return 0
    service = get_qdrant_rag_service()
    service.ensure_collection()
    uploaded = service.upsert_documents(documents)
    service.verify_document_ids([document.point_id for document in documents])
    print(f"Applied {uploaded} documents to {settings.QDRANT_COLLECTION}")
    return 0
```

- [ ] **Step 5: Run GREEN verification and real dry run**

Run: `python -m pytest tests/test_qdrant_rag_service.py tests/test_ingest_animal_rag_dataset.py -q`

Run: `python -m scripts.ingest_animal_rag_dataset --dataset-path "D:\Downloads\animal_agentic_rag_250_dataset\animal_agentic_rag_250_dataset"`

Expected: tests pass and dry run reports exactly 250 validated documents without contacting Qdrant.

- [ ] **Step 6: Commit Task 3**

```powershell
git add backend/services/qdrant_rag_service.py backend/tests/test_qdrant_rag_service.py backend/scripts/ingest_animal_rag_dataset.py backend/tests/test_ingest_animal_rag_dataset.py
git commit -m "feat(rag): add safe Qdrant dataset ingestion"
```

---

### Task 4: Integrate Qdrant into Lexi's Agent Pipeline

**Files:**
- Create: `backend/tests/test_agentic_rag_qdrant.py`
- Modify: `backend/services/agentic_rag_service.py`
- Modify: `backend/api/chat.py`

**Interfaces:**
- Consumes: `QdrantRAGService.retrieve` and `settings.qdrant_retrieval_version`.
- Preserves: `AgenticRAGService.run(question, user_id, session_id) -> dict[str, Any]` and the public response schema.

- [ ] **Step 1: Write failing cache, Generator, and API dependency tests**

```python
from unittest.mock import AsyncMock

import pytest

from services.agentic_rag_service import AgenticRAGService, _cache_key


def test_cache_key_changes_with_retrieval_version():
    first = _cache_key("What is an owl?", None, "collection-a:model-a")
    second = _cache_key("What is an owl?", None, "collection-b:model-a")
    assert first != second


@pytest.mark.asyncio
async def test_generator_uses_qdrant_text_and_returns_compatible_sources(monkeypatch):
    from langchain_core.runnables import RunnableLambda
    import services.agentic_rag_service as agentic_module

    retriever = AsyncMock()
    retriever.retrieve.return_value = [{
        "doc_id": "owl-1",
        "animal_en": "owl",
        "topic": "habitat_note",
        "text": "An owl is a bird that can fly quietly.",
        "score": 0.91,
    }]
    service = AgenticRAGService(retriever=retriever)
    captured = {}

    async def fake_llm_call(chain, inputs, agent_name):
        captured.update(inputs)
        return "Owls are quiet birds."

    monkeypatch.setattr(agentic_module, "_call_llm_with_retry", fake_llm_call)

    draft, sources = await service._generator(
        question="What is an owl?",
        plan={"topic": "animals", "keywords": ["owl", "bird"]},
        llm=RunnableLambda(lambda value: value),
        agent_trace=[],
    )

    retriever.retrieve.assert_awaited_once_with("animals owl bird")
    assert "An owl is a bird that can fly quietly." in captured["context"]
    assert draft == "Owls are quiet birds."
    assert sources == [{"word": "owl", "score": 0.91}]


def test_rag_endpoint_has_no_flashcard_repository_dependency():
    from fastapi.dependencies.utils import get_dependant
    from api.chat import rag_chat

    dependant = get_dependant(path="/chat/rag", call=rag_chat)
    dependency_names = {
        getattr(dependency.call, "__name__", "")
        for dependency in dependant.dependencies
    }
    assert "get_flashcard_repository" not in dependency_names
```

- [ ] **Step 2: Run the tests and verify RED**

Run: `python -m pytest tests/test_agentic_rag_qdrant.py -q`

Expected: failures show the old cache signature, old Generator parameters, and flashcard repository dependency.

- [ ] **Step 3: Replace only Generator retrieval and version the cache**

```python
def _cache_key(question: str, user_id: Optional[str], retrieval_version: str) -> str:
    raw = f"{question.strip().lower()}|{user_id or 'anon'}|{retrieval_version}"
    return hashlib.sha256(raw.encode()).hexdigest()


def __init__(self, retriever: Optional[QdrantRAGService] = None):
    self._parser = StrOutputParser()
    self._retriever = retriever or get_qdrant_rag_service()


async def _generator(self, question, plan, llm, agent_trace):
    keywords = [str(value) for value in plan.get("keywords", [])]
    topic = str(plan.get("topic", "")).strip()
    search_query = " ".join(value for value in [topic, *keywords] if value).strip() or question
    try:
        context_documents = await self._retriever.retrieve(search_query)
    except QdrantRAGUnavailable as exc:
        logger.warning("[AgenticRAG] Qdrant retrieval unavailable: %s", exc)
        context_documents = []
    context = "\n".join(
        f"{index}. {item['text']}" for index, item in enumerate(context_documents, 1)
    ) or "Không tìm thấy tài liệu an toàn liên quan."
```

Remove `google_genai` query embedding imports and `FlashcardRepository` parameters. Keep Gemini chat generation and validation unchanged. In the Planner prompt, require English retrieval keywords while allowing `language` to remain `vi`, `en`, or `bilingual`.

- [ ] **Step 4: Remove the repository dependency from the endpoint**

```python
async def rag_chat(
    request: RAGChatRequest,
    agentic_rag: AgenticRAGService = Depends(get_agentic_rag_service),
):
    result = await agentic_rag.run(
        question=request.question,
        user_id=request.user_id,
        session_id=session_id,
    )
```

- [ ] **Step 5: Run GREEN and relevant regression tests**

Run: `python -m pytest tests/test_agentic_rag_qdrant.py tests/test_api_auth_required.py -q`

Expected: targeted tests pass and no flashcard vector dependency remains in the RAG route.

- [ ] **Step 6: Commit Task 4**

```powershell
git add backend/services/agentic_rag_service.py backend/api/chat.py backend/tests/test_agentic_rag_qdrant.py
git commit -m "feat(rag): route Lexi retrieval through Qdrant"
```

---

### Task 5: Full Verification and Live Qdrant Ingestion

**Files:**
- No tracked files are expected before review; tested review fixes remain limited to files listed in Tasks 1-4.
- Local ignored file: `backend/.env` receives the supplied endpoint and key for the live run and remains untracked.

**Interfaces:**
- Validates the complete feature and remote collection without expanding production scope.

- [ ] **Step 1: Install the declared backend dependency in the project environment**

Run: `python -m pip install "qdrant-client>=1.14.2,<2.0.0"`

Expected: installation succeeds without installing FastEmbed, PyTorch, or SentenceTransformers.

- [ ] **Step 2: Run the complete targeted suite**

Run:

```powershell
python -m pytest tests/test_animal_rag_dataset.py tests/test_qdrant_rag_service.py tests/test_ingest_animal_rag_dataset.py tests/test_agentic_rag_qdrant.py -q
```

Expected: all targeted tests pass.

- [ ] **Step 3: Run backend regression and compile checks**

Run: `python -m pytest tests -q`

Run: `python -m compileall api services scripts settings.py`

Expected: no failures and compile command exits zero. If unrelated baseline failures exist, record their exact scope and rerun all directly affected tests.

- [ ] **Step 4: Verify the real dataset dry run**

Run: `python -m scripts.ingest_animal_rag_dataset --dataset-path "D:\Downloads\animal_agentic_rag_250_dataset\animal_agentic_rag_250_dataset"`

Expected: `Dry run validated 250 documents` and no network write.

- [ ] **Step 5: Configure ignored local Qdrant values and confirm they remain ignored**

Set `QDRANT_URL` and `QDRANT_API_KEY` in `backend/.env`, then run:

```powershell
git check-ignore -v backend/.env
git status --short
```

Expected: `.env` is ignored and no secret-bearing file appears in status.

- [ ] **Step 6: Apply ingestion twice and verify idempotency**

Run:

```powershell
python -m scripts.ingest_animal_rag_dataset --dataset-path "D:\Downloads\animal_agentic_rag_250_dataset\animal_agentic_rag_250_dataset" --apply
python -m scripts.ingest_animal_rag_dataset --dataset-path "D:\Downloads\animal_agentic_rag_250_dataset\animal_agentic_rag_250_dataset" --apply
```

Expected: both runs verify 250 deterministic document IDs, and the second run does not increase unique point count.

- [ ] **Step 7: Run live representative retrieval**

Run:

```powershell
python -c "import asyncio; from services.qdrant_rag_service import get_qdrant_rag_service; service=get_qdrant_rag_service(); keys=('doc_id','animal_en','topic','score','safety_label'); queries=('elephant habitat','owl movement','dolphin lives in the ocean'); [(print(query, [{key:item.get(key) for key in keys} for item in asyncio.run(service.retrieve(query))])) for query in queries]"
```

The command prints only `doc_id`, `animal_en`, `topic`, `score`, and `safety_label`; it never prints configuration or secrets.

Expected: results are relevant, all are `clean`, scores meet `0.35`, and no result set repeats a canonical group.

- [ ] **Step 8: Request code review and address all Critical/Important findings**

Provide the reviewer the design spec, this plan, base SHA `2f6a9a2`, current HEAD, changed-file diff, and fresh test output.

- [ ] **Step 9: Run final verification after review changes**

Repeat Steps 2-4 plus `git diff --check`. Inspect staged scope before any final commit.

- [ ] **Step 10: Commit any review fixes**

```powershell
git add backend docs/superpowers/plans/2026-08-04-lexi-qdrant-agentic-rag.md
git diff --cached --check
git diff --cached --name-status
git commit -m "fix(rag): address Qdrant integration review"
```

Skip this commit when review produces no code changes. Never stage unrelated `.cursor/skills/ar-mobile-edu/` or `mindar-agent-skills/` paths.
