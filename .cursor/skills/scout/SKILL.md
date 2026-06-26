---
name: scout
description: "Codebase Exploration & Discovery. Uses the pre-built qmd index + ast-grep + MCPLS to quickly locate relevant files and answer code questions. Triggers: 'find', 'locate', 'where is', 'which files', 'what does X do', 'how does X work', 'who calls X', 'explain X', 'search for X', 'show all X', 'find files for task', 'trace code path', 'map feature'"
---

# Scout — Codebase Exploration & Discovery

Scout is a **consumer** of the pre-built qmd index (`./qmd-index/`). It quickly locates files, traces call chains, and answers questions about the codebase without brute-force file reading.

**Prerequisite:** The qmd index must exist. Call `mcp__qmd__status` first. If missing → tell the user to run `/index-codebase`.

---

## Two Modes

| Mode | Trigger words | Output |
|------|--------------|--------|
| **Discovery** | find · locate · where is · which files · show all · search for | File paths + line numbers relevant to a task |
| **Q&A** | what does · how does · explain · who calls · trace · describe | Code explanation with file:line evidence |

---

## Search Tool Priority

Always try tools in this order — stop when you have sufficient context:

### 1. qmd — Semantic / Hybrid Search (start here)

```
# Natural language → best for "find files related to X"
mcp__qmd__query(
  searches=[{type:"hyde", query:"<describe what the answer looks like>"}],
  intent="<specific goal>"
)

# Keyword → best for exact symbol names
mcp__qmd__query(
  searches=[{type:"lex", query:"<SymbolName>"}],
  intent="find usages of <symbol>"
)

# Combined — best accuracy (lex finds exact, vec finds semantically similar)
mcp__qmd__query(
  searches=[
    {type:"lex", query:"<keyword>"},
    {type:"vec", query:"<natural language description>"}
  ],
  intent="<specific goal>",
  minScore: 0.5
)

# Retrieve a specific indexed file
mcp__qmd__get("src/auth/auth.service.ts.md")

# Batch retrieve files matching a glob
mcp__qmd__multi_get("src/auth/*.md")
```

### 2. ast-grep — Structural Pattern Search

Use to confirm qmd results or find *all* occurrences of a code pattern:

```bash
# All calls to a method
sg run -p '$OBJ.$METHOD($$$ARGS)' -l ts --json 2>/dev/null

# All exported functions
sg run -p 'export function $NAME($$$) { $$$ }' -l ts --json 2>/dev/null

# All class definitions
sg run -p 'class $NAME $$${ $$$ }' -l ts --json 2>/dev/null

# Imports of a specific module
sg run -p 'import $$$FROM "$MODULE"' -l ts --json 2>/dev/null

# All async functions
sg run -p 'async function $NAME($$$) { $$$ }' -l ts --json 2>/dev/null

# All route handlers
sg run -p '$ROUTER.$METHOD("$PATH", $$$)' -l ts --json 2>/dev/null
```

### 3. mcpls — Symbol-Level Navigation

Use for pinpoint navigation on specific files/symbols already found:

```
# Who calls this function?
mcp__mcpls__prepare_call_hierarchy(filePath, line, character)
→ mcp__mcpls__get_incoming_calls(item)   # callers
→ mcp__mcpls__get_outgoing_calls(item)   # callees

# All usages of a symbol across the project
mcp__mcpls__get_references(filePath, line, character)

# File symbol outline (functions, classes, vars)
mcp__mcpls__get_document_symbols(filePath)

# Type signature + JSDoc for a symbol
mcp__mcpls__get_hover(filePath, line, character)

# Jump to definition
mcp__mcpls__get_definition(filePath, line, character)

# Project-wide symbol search
mcp__mcpls__workspace_symbol_search("AuthService")
```

### 4. Glob + Grep — Fallback (no index)

```
Glob("**/*.ts")              # find files by name pattern
Grep("symbolName", "**")     # find text occurrences
Read(filePath)               # read a specific file
```

---

## Decision Tree

```
USER QUERY
│
├── "find files for [task]" / "where is [feature]" / "locate [X]"
│   ├─ mcp__qmd__query (hyde, intent = task description)
│   ├─ Read top 3-5 result files for confirmation
│   └─ Return: ranked file list with descriptions
│
├── "what does [X] do" / "explain [X]" / "how does [feature] work"
│   ├─ mcp__qmd__query (lex+vec, intent = explain X)
│   ├─ mcp__qmd__get specific chunk files
│   ├─ Read source if chunk lacks detail
│   └─ Return: explanation + code snippets with file:line refs
│
├── "who calls [function]" / "what uses [class/interface]"
│   ├─ mcp__qmd__query to locate the symbol's file
│   ├─ mcp__mcpls__prepare_call_hierarchy → get_incoming_calls
│   └─ Return: caller list with file:line
│
├── "find all [pattern]" / "show me all [X]" / "list every [Y]"
│   ├─ ast-grep structural search (exhaustive)
│   ├─ mcp__qmd__query for semantic matches
│   ├─ Deduplicate by file path
│   └─ Return: complete list with file:line
│
├── "trace [data/call] from X to Y" / "how does X reach Y"
│   ├─ mcp__qmd__query for both X and Y
│   ├─ mcp__mcpls__prepare_call_hierarchy on X → get_outgoing_calls
│   ├─ Follow call chain until Y is reached
│   └─ Return: step-by-step path with file:line at each hop
│
└── "is there any [X]" / "does this have [feature]"
    ├─ mcp__qmd__query + ast-grep
    └─ Return: yes/no + evidence (file:line or "not found")
```

---

## Index Health Check

Run before every scout operation:

```
1. mcp__qmd__status()
   → "0 documents" or error → tell user: run /index-codebase first
   → OK → proceed

2. (Optional) spot-check freshness:
   Read ./qmd-index/.manifest.json → check scan date
   If >24h old → warn: "Index may be stale. Run /index-codebase --update for latest results."
```

---

## Multi-Directory Parallel Search

For tasks spanning multiple modules, run parallel qmd queries in one message:

```
# All in one message (parallel execution):
Query 1: mcp__qmd__query("authentication and JWT tokens")
Query 2: mcp__qmd__query("user session management")
Query 3: mcp__qmd__query("login and logout flows")

→ Merge results, deduplicate by file path
→ Score by frequency (file appearing in 2+ results = higher relevance)
```

---

## Incremental Deep-Dive Protocol

When a broad search returns too many results, narrow progressively:

```
Step 1: Broad qmd query → filter by minScore: 0.6
Step 2: ast-grep on top 5 files to confirm pattern
Step 3: mcp__mcpls__get_document_symbols on best-match file
Step 4: mcp__mcpls__get_hover at specific symbol for type + JSDoc
Step 5: Read only the relevant section of the file
```

---

## Output Formats

### Discovery output

```markdown
## Files: <query>

| File | Description |
|------|-------------|
| `src/auth/auth.service.ts:45` | JWT validation + user lookup |
| `src/auth/auth.guard.ts:12` | Route guard middleware |
| `src/auth/auth.controller.ts:8` | Login/logout endpoints |

**Key symbols:** `AuthService`, `validateToken`, `AuthGuard`
**Start reading:** `src/auth/auth.service.ts` — core logic lives here
```

### Q&A output

```markdown
## How does [feature] work?

**Summary:** [1–2 sentence answer]

**Code path:**
1. `src/entry.ts:N` — request enters here
2. `src/service.ts:N` — business logic applied
3. `src/repository.ts:N` — data persisted

**Key code:**
```typescript
// src/auth/auth.service.ts:45
async validateToken(token: string): Promise<User | null> {
  return this.jwt.verify(token);
}
```
```

---

## Integration with SDLC Team

When delegating to scout from another agent, format the request:

```
Use the scout skill (read .claude/skills/scout/SKILL.md).
Query: "<specific question or task>"
Mode: discovery | qa
Return: file paths + line numbers / explanation with evidence
```

| Agent | Scout usage |
|-------|-------------|
| **planner** | Find all API endpoints, service boundaries, module structure |
| **reviewer** | Find all DB queries, all eval/innerHTML calls, all error handlers |
| **tester** | Find all exported service methods, all route handlers |
| **fix** | Who calls `brokenFunction`? Find all callers to assess impact |
| **debug** | Trace data flow from HTTP request to database write |
| **documenter** | Find all exported interfaces, all public methods |
