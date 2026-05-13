---
name: opencode-command-index-codebase
description: Migrated OpenCode slash command `index-codebase`. Use when the user asks to run or follow the old OpenCode `/index-codebase` workflow.
---

# opencode-command-index-codebase

This skill was migrated from `.opencode/commands/index-codebase.md`.

OpenCode slash-command runtime features such as `$ARGUMENTS`, automatic command routing, and shell interpolation are preserved as prompt guidance only. Adapt them to Codex tools when executing.

## Original Command

Build or update the semantic codebase search index so all agents can use `qmd` to quickly understand this codebase without reading every file.

**Arguments:** $ARGUMENTS
- `--update` — re-embed only (skip scan, reuse existing `./qmd-index/` docs)
- _(no args)_ — full reindex: detect → scan → enrich → generate → embed

Read `.opencode/skills/codebase-indexer/SKILL.md` for full extraction patterns, document format, and qmd commands. Then execute all steps below.

---

## Step 1 — Language Detection

Scan all source files (exclude `node_modules`, `dist`, `.git`, `coverage`, `qmd-index`).
Count by extension and map to a language manifest:

```json
[
  { "language": "typescript", "sgLang": "ts", "extensions": [".ts", ".tsx"], "fileCount": N },
  { "language": "python",     "sgLang": "py", "extensions": [".py"],         "fileCount": N }
]
```

Only include languages with ≥ 3 files. Save to `./qmd-index/.manifest.json`.

Extension map: `.ts/.tsx` → ts · `.js/.jsx` → js · `.py` → py · `.go` → go · `.rs` → rs · `.java` → java · `.rb` → ruby · `.php` → php · `.cs` → cs

---

## Step 2 — Structural Extraction (ast-grep)

> Skip if `--update` was passed.

Use the ast-grep MCP server or `sg run` CLI. For each language, run the extraction patterns from the skill to collect: functions, classes, interfaces, exports, import graph, API routes.

---

## Step 3 — Semantic Enrichment (mcpls)

> Skip if `--update` was passed.

For each source file, use the mcpls MCP server to collect:
- `get_document_symbols` — all symbols
- `get_hover` per exported symbol — type signatures and JSDoc
- `get_incoming_calls` / `get_outgoing_calls` — call hierarchy
- `get_cached_diagnostics` — errors and warnings

---

## Step 4 — Generate Chunk Documents

> Skip if `--update` was passed.

Write `./qmd-index/<relative-path>.md` per file using the document format in the skill (frontmatter + symbol sections). Mirror directory structure: `src/auth/auth.service.ts` → `./qmd-index/src/auth/auth.service.ts.md`.

---

## Step 5 — Build qmd Index

```bash
# Full reindex
qmd collection add ./qmd-index --name codebase 2>/dev/null || true
qmd embed --chunk-strategy auto
qmd status

# --update mode only
# qmd update && qmd embed --chunk-strategy auto -f && qmd status
```

---

## Step 6 — Report

Print summary:
```
✓ Index complete
  Languages: [list]
  Files indexed: N
  Documents generated: N
  Collection: codebase

Usage:
  qmd vsearch "authentication flow"
  qmd query "where are payments processed"
  qmd search "JWT"
```
