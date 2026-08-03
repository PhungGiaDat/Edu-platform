# Lexi Qdrant Agentic RAG Design

**Date:** 2026-08-04

**Status:** Approved

**Scope:** Replace Lexi's MongoDB Atlas vector retrieval and Gemini query embeddings with Qdrant Cloud and Qdrant Cloud Inference while preserving the existing Planner -> Generator -> Validator flow.

## Context

Lexi already exposes `POST /api/v1/chat/rag` and runs a three-stage agentic RAG flow:

1. Planner derives a topic, search keywords, difficulty, and response language.
2. Generator embeds the planned query, retrieves context, and drafts an answer.
3. Validator checks age appropriateness, clarity, and recent-session repetition.

The current Generator uses Gemini embeddings and MongoDB Atlas Vector Search over flashcards. The new animal dataset contains 250 synthetic educational documents in TXT, Markdown, DOCX, XLSX, and PPTX formats. It is intended for children ages 6-8 and contains English content with Vietnamese labels.

The dataset audit found:

- 250 unique document IDs and paths.
- 100 TXT, 80 Markdown, 30 DOCX, 25 XLSX, and 15 PPTX files.
- No missing, corrupt, empty, or exact-duplicate extracted documents.
- No simple prompt-injection, executable-code, or secret-pattern hits.
- 205 document pairs with trigram Jaccard similarity at or above 0.80 and 28 at or above 0.90.
- 217 English article-agreement errors across 57 files, including patterns such as `A elephant` and `a insect`.

## Goals

- Store and query the animal dataset in the supplied Qdrant Cloud cluster.
- Use Qdrant Cloud Inference with the free `sentence-transformers/all-MiniLM-L6-v2` model.
- Keep backend memory low by avoiding local embedding model downloads and inference.
- Preserve the current Lexi endpoint, frontend contract, Planner, Generator, Validator, MongoDB chat history, learning progress, and response cache.
- Make ingestion dry-run-first, deterministic, idempotent, and safe for repeated execution.
- Keep all 250 source records while preventing near-duplicate retrieval results from crowding the Generator context.
- Preserve the original dataset files unchanged.
- Fail safely when configuration, Qdrant, inference, or collection schema is unavailable.

## Non-goals

- No frontend redesign.
- No replacement of MongoDB for users, progress, chat logs, or response caching.
- No migration or deletion of existing MongoDB flashcard embeddings.
- No automatic deletion or recreation of an existing Qdrant collection.
- No local FastEmbed, PyTorch, SentenceTransformers, or other model runtime.
- No general-purpose document ingestion platform beyond the audited dataset formats and structures.
- No automatic pruning of Qdrant points that are absent from a later dataset version.

## Selected Approach

Add a focused Qdrant retrieval boundary and leave the rest of Lexi's agent pipeline intact.

Rejected alternatives:

- A LangChain Qdrant rewrite would broaden framework coupling without improving this small corpus.
- Dual MongoDB/Qdrant retrieval would maintain two embedding systems, complicate ranking, and risk mixing incompatible result semantics.

## Configuration

Add the following backend settings and `.env.example` entries:

- `QDRANT_URL`: HTTPS cluster endpoint.
- `QDRANT_API_KEY`: database API key stored only in backend environment configuration.
- `QDRANT_COLLECTION`: defaults to `kids_english_animals_minilm_v1`.
- `QDRANT_EMBEDDING_MODEL`: defaults to `sentence-transformers/all-MiniLM-L6-v2`.
- `QDRANT_VECTOR_SIZE`: fixed default `384`.
- `QDRANT_SCORE_THRESHOLD`: defaults to `0.35`.
- `QDRANT_RETRIEVAL_LIMIT`: defaults to `8` before diversification.
- `QDRANT_CONTEXT_LIMIT`: defaults to `3` after diversification.

Qdrant configuration remains optional for unrelated backend features. The client is initialized lazily when ingestion or RAG retrieval needs it. Secrets must never appear in source, frontend bundles, logs, API responses, or tests.

Because the supplied API key was shared in chat, it should be rotated after initial setup and before long-term production use.

## Collection Schema

Collection name: `kids_english_animals_minilm_v1`

Dense vector size: `384`

Distance: cosine

Point granularity: one point per source document

One point is appropriate because every extracted document is short. The audited extracted lengths range from roughly 892 to 1,589 characters, below the dataset's suggested split threshold.

Each point payload contains:

- `text`
- `doc_id`
- `file_name`
- `relative_path`
- `file_format`
- `animal_en`
- `animal_vi`
- `topic`
- `level`
- `age_range`
- `safety_label`
- `source_type` set to `synthetic_child_safe_learning_material`
- `chunk_index` set to `0`
- `content_hash`
- `canonical_group`
- `embedding_model`
- `dataset_version` set to `2026-08-03`, the dataset generation date

`canonical_group` is derived from normalized `animal_en` and `topic`. It supports runtime diversification without dropping source records.

## Dataset Extraction and Normalization

The ingestion module reads `manifest_records.txt` as UTF-8 JSON Lines and resolves every `relative_path` under the supplied dataset root.

Extraction rules:

- TXT and Markdown: UTF-8 text.
- DOCX: ordered text nodes from `word/document.xml`.
- PPTX: ordered text nodes from `ppt/slides/slide*.xml`.
- XLSX: ordered string cell values from `xl/worksheets/sheet*.xml`, with shared-string support when present.

Only Python standard-library ZIP and XML facilities are needed for the audited OOXML files. Extractors reject missing required content instead of silently indexing empty text.

Normalization rules:

- Normalize line endings and repeated whitespace.
- Preserve Unicode, Vietnamese labels, emojis, and educational content.
- Correct only the audited article-agreement patterns in indexed text, such as `A elephant` -> `An elephant` and `a insect` -> `an insect`.
- Do not modify the source files.
- Compute `content_hash` after normalization.

## Ingestion Command

The command is:

```powershell
python -m scripts.ingest_animal_rag_dataset --dataset-path "D:\Downloads\animal_agentic_rag_250_dataset\animal_agentic_rag_250_dataset"
```

Default behavior is a read-only dry run. It validates and summarizes the dataset without connecting to or changing Qdrant.

`--apply` performs remote writes:

1. Validate all manifest records, IDs, paths, formats, metadata, safety labels, and extracted text before the first write.
2. Connect to Qdrant with `cloud_inference=True`.
3. Create the collection only when it is absent.
4. If the collection exists, verify vector size and cosine distance. Refuse to continue on mismatch.
5. Generate deterministic UUID point IDs from `doc_id`.
6. Upload documents in small batches using Qdrant `Document` objects and the configured Cloud Inference model.
7. Verify that all expected deterministic point IDs are present and report collection count information.

The command never deletes a collection or point. A partially completed upload is recoverable by rerunning `--apply`; deterministic IDs cause upserts rather than duplicates.

## Runtime Retrieval Flow

1. The frontend sends the existing RAG request.
2. Planner derives the topic and produces English retrieval keywords even when the requested response language is Vietnamese or bilingual.
3. Generator builds a search query from the planned topic and keywords.
4. The Qdrant retriever queries with a Cloud Inference `Document` using the same configured model as ingestion.
5. Retrieval filters require `safety_label=clean`.
6. Qdrant returns up to eight candidates with payloads and scores.
7. The retriever drops results below the configured threshold and keeps at most one result per `canonical_group` until the diversified pass is exhausted.
8. The best three results become Generator context.
9. Generator drafts strictly from retrieved `text`.
10. Validator applies the existing child-safety, brevity, and recent-history checks.
11. The API returns the existing `response`, `session_id`, and source shape. Each source keeps `word` and `score`; `word` is populated from `animal_en` so the current frontend remains compatible.

The RAG cache key includes a retrieval version derived from collection and embedding model. Responses cached under the previous MongoDB/Gemini retrieval space cannot be reused accidentally.

## Error Handling

- Missing Qdrant configuration: return Lexi's safe configuration-unavailable response; do not affect unrelated endpoints.
- Authentication or connectivity failure: log a sanitized error without URL credentials or API-key material and return a safe no-knowledge response.
- Cloud Inference failure: treat retrieval as unavailable; do not call MongoDB Atlas Vector Search as a hidden fallback.
- Collection missing at runtime: return a safe no-knowledge response and direct operators to run ingestion.
- Collection vector mismatch: ingestion exits before uploading; runtime treats the retriever as unavailable.
- Empty or below-threshold results: Generator receives no context and uses the existing non-invention response.
- Partial batch upload: command exits non-zero with completed/failed counts; rerunning is safe.
- Invalid source document: dry run fails before any remote write and identifies the record without dumping its full content.

## Testing Strategy

Tests follow red-green-refactor and cover:

- TXT, Markdown, DOCX, PPTX, and XLSX extraction using small real fixtures.
- UTF-8 and Vietnamese text preservation.
- Deterministic article correction and preservation of unrelated text.
- Manifest validation, missing files, duplicate IDs, empty extraction, and unsafe labels.
- Deterministic UUIDs and payload construction.
- Dry-run behavior with no Qdrant calls.
- Existing-collection compatibility checks with no destructive recreation.
- Idempotent batch upserts.
- Qdrant result mapping, score thresholding, safety filtering, and canonical-group diversification.
- Cache-version behavior.
- Agentic RAG integration proving Generator uses Qdrant context and does not call MongoDB vector search.
- Sanitized failure behavior when Qdrant is unavailable.
- Existing RAG API response compatibility.

External Qdrant behavior is represented behind a narrow client interface for deterministic unit tests. A live smoke test is environment-gated and runs only when Qdrant credentials are configured.

## Verification and Rollout

1. Run targeted backend unit tests.
2. Run backend compile checks.
3. Run the ingestion command without `--apply` and confirm all 250 records validate.
4. Configure Qdrant environment values locally without committing secrets.
5. Run ingestion with `--apply`.
6. Verify expected points and execute representative English and Vietnamese/bilingual retrieval queries.
7. Exercise `/api/v1/chat/rag` with a representative animal question when the Gemini chat key and database services are available.
8. Review logs for secret leakage and ensure failures remain sanitized.

Deployment environment variables must be set in Render separately. The local ignored `.env` may be used for verification, but it is never committed.

## Acceptance Criteria

- Dry run validates all 250 source records and extracts non-empty text from every format.
- `--apply` creates or safely reuses a 384-dimensional cosine collection and upserts all 250 deterministic points.
- A second `--apply` run produces no duplicate points.
- Representative animal queries return relevant, `clean` payloads with no repeated canonical groups in the final context.
- Lexi's Generator uses Qdrant text and no longer generates query embeddings through Gemini or calls MongoDB vector search.
- Planner, Validator, cache storage, history, progress, endpoint path, and frontend source rendering remain functional.
- Qdrant outages produce a safe response without invented facts or secret leakage.
- All new targeted tests and relevant existing backend tests pass.
