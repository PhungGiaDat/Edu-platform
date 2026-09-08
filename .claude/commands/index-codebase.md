---
description: Build or update the semantic codebase search index using ast-grep, LSP, and qmd
allowed-tools: Agent, Read, Write, Bash, Glob, Grep, mcp__ast-grep__find_code, mcp__ast-grep__find_code_by_rule, mcp__mcpls__get_document_symbols, mcp__mcpls__get_hover, mcp__mcpls__get_incoming_calls, mcp__mcpls__get_outgoing_calls, mcp__mcpls__get_cached_diagnostics, mcp__mcpls__workspace_symbol_search
---

Build or update the semantic codebase search index so agents can use `qmd vsearch` / `qmd query` to quickly understand this codebase without reading every file.

**Arguments:** $ARGUMENTS
- `--update` — re-embed only (skip scan, reuse existing `./qmd-index/` docs)
- _(no args)_ — full reindex: detect → scan → enrich → generate → embed

---

## Step 1 — Language Detection

Use the Agent tool to detect languages present in this codebase:

```
Scan all source files in this project (exclude node_modules, dist, .git, coverage, qmd-index).
Count files by extension. Return a JSON manifest:
[
  { "language": "typescript", "sgLang": "ts", "extensions": [".ts", ".tsx"], "fileCount": N },
  { "language": "python",     "sgLang": "py", "extensions": [".py"],         "fileCount": N },
  ...
]
Only include languages with at least 3 files.
Use this extension→language map:
  .ts/.tsx → typescript (sgLang: ts)
  .js/.jsx → javascript (sgLang: js)
  .py      → python     (sgLang: py)
  .go      → go         (sgLang: go)
  .rs      → rust       (sgLang: rs)
  .java    → java       (sgLang: java)
  .rb      → ruby       (sgLang: ruby)
  .php     → php        (sgLang: php)
  .cs      → csharp     (sgLang: cs)
  .swift   → swift      (sgLang: swift)
  .kt      → kotlin     (sgLang: kotlin)
```

Save the result to `./qmd-index/.manifest.json`.

---

## Step 2 — Structural Extraction (ast-grep)

> Skip this step if `--update` was passed.

Read `.claude/skills/codebase-indexer/SKILL.md` for the full pattern library per language.

For each language in the manifest, run the extraction patterns from the skill. Collect all matches grouped by file.

---

## Step 3 — Semantic Enrichment (mcpls)

> Skip this step if `--update` was passed.

For each source file (prioritize files with matches from Step 2):

1. `mcp__mcpls__get_document_symbols` — list all symbols (functions, classes, variables)
2. `mcp__mcpls__get_hover` — type signatures and JSDoc per symbol
3. `mcp__mcpls__get_incoming_calls` + `mcp__mcpls__get_outgoing_calls` — call hierarchy per function/method
4. `mcp__mcpls__get_cached_diagnostics` — errors and warnings

Merge results with Step 2 structural data, keyed by file path.

---

## Step 4 — Generate Chunk Documents

> Skip this step if `--update` was passed.

For each file, write `./qmd-index/<relative-file-path>.md` using the format defined in `.claude/skills/codebase-indexer/SKILL.md` (Document Format section).

Rules:
- Mirror the directory structure: `src/auth/auth.service.ts` → `./qmd-index/src/auth/auth.service.ts.md`
- One file = one document
- Include frontmatter with metadata for filtering
- If a file has no extractable symbols (config, assets), write a minimal doc with just the frontmatter

---

## Step 5 — Build qmd Index

```bash
# Ensure qmd is installed
qmd --version || echo "ERROR: qmd not found — install with: npm install -g qmd OR bun install -g qmd"

# Create or update collection
COLLECTION_NAME=$(basename "$(pwd)")
qmd collection add ./qmd-index --name "$COLLECTION_NAME" 2>/dev/null || true

# Generate embeddings (AST-aware chunking)
qmd embed --chunk-strategy auto

# Verify
qmd status
```

For `--update` mode:
```bash
qmd update
qmd embed --chunk-strategy auto -f
qmd status
```

---

## Step 6 — Report

Print a summary:

```
✓ Index complete
  Languages: [list]
  Files indexed: N
  Documents generated: N
  Collection: <project folder name>

Usage:
  qmd vsearch "authentication flow"        # semantic search
  qmd query "where are payments processed" # hybrid + LLM rerank
  qmd search "JWT"                         # keyword search
  qmd get src/auth/auth.service.ts.md      # retrieve specific doc
```
