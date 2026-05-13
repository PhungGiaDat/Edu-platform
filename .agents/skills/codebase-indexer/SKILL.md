---
name: codebase-indexer
description: Scan a codebase with ast-grep and mcpls, generate rich markdown chunks, and build a qmd semantic search index
---

# Codebase Indexer — Skill Reference

Used by `/index-codebase` command. Provides extraction patterns, document format, and qmd integration details.

---

## Language Detection

### Extension → Language Map

| Extension(s) | Language | ast-grep `sgLang` | mcpls server |
|---|---|---|---|
| `.ts`, `.tsx` | TypeScript | `ts` | tsserver |
| `.js`, `.jsx`, `.mjs` | JavaScript | `js` | tsserver |
| `.py` | Python | `py` | pyright / pylsp |
| `.go` | Go | `go` | gopls |
| `.rs` | Rust | `rs` | rust-analyzer |
| `.java` | Java | `java` | jdtls |
| `.rb` | Ruby | `ruby` | solargraph |
| `.php` | PHP | `php` | intelephense |
| `.cs` | C# | `cs` | omnisharp |
| `.swift` | Swift | `swift` | sourcekit-lsp |
| `.kt` | Kotlin | `kotlin` | kotlin-language-server |

### Detection Command

```bash
# Count files per extension (exclude generated dirs)
find . -type f \
  -not -path '*/node_modules/*' \
  -not -path '*/.git/*' \
  -not -path '*/dist/*' \
  -not -path '*/coverage/*' \
  -not -path '*/qmd-index/*' \
  -not -path '*/.qmd/*' \
  | sed 's/.*\.//' | sort | uniq -c | sort -rn
```

---

## ast-grep Extraction Patterns

Run with `sg run -p 'PATTERN' -l LANG --json` from the project root.

### TypeScript / TSX

```bash
# Named functions
sg run -p 'function $NAME($$$PARAMS): $RETURN { $$$BODY }' -l ts --json
sg run -p 'function $NAME($$$PARAMS) { $$$BODY }' -l ts --json
sg run -p 'async function $NAME($$$PARAMS) { $$$BODY }' -l ts --json

# Arrow functions (exported)
sg run -p 'export const $NAME = ($$$PARAMS): $RETURN => $$$BODY' -l ts --json
sg run -p 'export const $NAME = ($$$PARAMS) => $$$BODY' -l ts --json
sg run -p 'export const $NAME = async ($$$PARAMS) => $$$BODY' -l ts --json

# Classes
sg run -p 'class $NAME { $$$BODY }' -l ts --json
sg run -p 'class $NAME extends $BASE { $$$BODY }' -l ts --json
sg run -p 'class $NAME implements $IFACE { $$$BODY }' -l ts --json

# Interfaces and types
sg run -p 'interface $NAME { $$$BODY }' -l ts --json
sg run -p 'type $NAME = $$$DEF' -l ts --json
sg run -p 'enum $NAME { $$$BODY }' -l ts --json

# Exports
sg run -p 'export default $THING' -l ts --json
sg run -p 'export { $$$EXPORTS }' -l ts --json
sg run -p 'module.exports = $$$' -l ts --json

# Imports (dependency graph)
sg run -p 'import $$$IMPORTS from "$MODULE"' -l ts --json
sg run -p "import $$$IMPORTS from '$MODULE'" -l ts --json

# Express/Fastify/NestJS routes
sg run -p '$ROUTER.get("$PATH", $$$HANDLERS)' -l ts --json
sg run -p '$ROUTER.post("$PATH", $$$HANDLERS)' -l ts --json
sg run -p '$ROUTER.put("$PATH", $$$HANDLERS)' -l ts --json
sg run -p '$ROUTER.delete("$PATH", $$$HANDLERS)' -l ts --json
sg run -p '@Get("$PATH")' -l ts --json
sg run -p '@Post("$PATH")' -l ts --json
sg run -p '@Controller("$PATH")' -l ts --json

# React components
sg run -p 'export function $NAME($PROPS): JSX.Element { $$$BODY }' -l tsx --json
sg run -p 'export default function $NAME($PROPS) { $$$BODY }' -l tsx --json

# Decorators
sg run -p '@Injectable()' -l ts --json
sg run -p '@Module($$$)' -l ts --json
```

### JavaScript

```bash
# Functions
sg run -p 'function $NAME($$$PARAMS) { $$$BODY }' -l js --json
sg run -p 'const $NAME = function($$$PARAMS) { $$$BODY }' -l js --json
sg run -p 'const $NAME = ($$$PARAMS) => $$$BODY' -l js --json

# Classes
sg run -p 'class $NAME { $$$BODY }' -l js --json

# CommonJS
sg run -p 'module.exports = $$$' -l js --json
sg run -p 'const $NAME = require("$MODULE")' -l js --json

# Express routes
sg run -p '$ROUTER.get("$PATH", $$$)' -l js --json
sg run -p '$ROUTER.post("$PATH", $$$)' -l js --json
```

### Python

```bash
# Functions
sg run -p 'def $NAME($$$PARAMS): $$$BODY' -l py --json
sg run -p 'async def $NAME($$$PARAMS): $$$BODY' -l py --json

# Classes
sg run -p 'class $NAME: $$$BODY' -l py --json
sg run -p 'class $NAME($BASE): $$$BODY' -l py --json

# Imports
sg run -p 'import $MODULE' -l py --json
sg run -p 'from $MODULE import $$$NAMES' -l py --json

# FastAPI / Flask routes
sg run -p '@app.get("$PATH")' -l py --json
sg run -p '@app.post("$PATH")' -l py --json
sg run -p '@router.get("$PATH")' -l py --json
sg run -p '@router.post("$PATH")' -l py --json

# Decorators
sg run -p '@$DECORATOR' -l py --json
```

### Go

```bash
# Functions
sg run -p 'func $NAME($$$PARAMS) $$$RETURN { $$$BODY }' -l go --json
sg run -p 'func ($RECV) $NAME($$$PARAMS) $$$RETURN { $$$BODY }' -l go --json

# Structs and interfaces
sg run -p 'type $NAME struct { $$$BODY }' -l go --json
sg run -p 'type $NAME interface { $$$BODY }' -l go --json

# Imports
sg run -p 'import "$MODULE"' -l go --json
sg run -p 'import ($$$MODULES)' -l go --json

# HTTP handlers
sg run -p 'http.HandleFunc("$PATH", $HANDLER)' -l go --json
sg run -p '$ROUTER.GET("$PATH", $HANDLER)' -l go --json
sg run -p '$ROUTER.POST("$PATH", $HANDLER)' -l go --json
```

### Rust

```bash
# Functions
sg run -p 'fn $NAME($$$PARAMS) -> $RETURN { $$$BODY }' -l rs --json
sg run -p 'pub fn $NAME($$$PARAMS) -> $RETURN { $$$BODY }' -l rs --json
sg run -p 'async fn $NAME($$$PARAMS) -> $RETURN { $$$BODY }' -l rs --json

# Structs and enums
sg run -p 'struct $NAME { $$$BODY }' -l rs --json
sg run -p 'pub struct $NAME { $$$BODY }' -l rs --json
sg run -p 'enum $NAME { $$$BODY }' -l rs --json

# Traits
sg run -p 'trait $NAME { $$$BODY }' -l rs --json
sg run -p 'impl $TRAIT for $TYPE { $$$BODY }' -l rs --json
```

---

## mcpls Tool Usage

For each source file with extracted symbols:

### 1. Get All Symbols

```
mcp__mcpls__get_document_symbols(filePath: "<abs-path>")
→ Returns: [{name, kind, range, containerName}]
```

### 2. Hover Info per Symbol (type sig + JSDoc)

```
mcp__mcpls__get_hover(
  filePath: "<abs-path>",
  line: <symbol.range.start.line>,
  character: <symbol.range.start.character>
)
→ Returns: {contents: "type signature + JSDoc"}
```

### 3. Call Hierarchy

```
mcp__mcpls__prepare_call_hierarchy(
  filePath: "<abs-path>",
  line: <line>,
  character: <char>
)
→ Then:
mcp__mcpls__get_incoming_calls(item: <callHierarchyItem>)
→ Returns: [{from: {name, uri}, fromRanges}]

mcp__mcpls__get_outgoing_calls(item: <callHierarchyItem>)
→ Returns: [{to: {name, uri}, fromRanges}]
```

### 4. Diagnostics

```
mcp__mcpls__get_cached_diagnostics(filePath: "<abs-path>")
→ Returns: [{severity, message, range}]
```

### Efficiency Tips

- Use `mcp__mcpls__workspace_symbol_search("")` to get all symbols at once for small projects
- Only call `get_hover` for exported/public symbols — internal helpers don't need full enrichment
- Only call call hierarchy for functions with >0 callers found by symbol search
- Batch files: process 10 files at a time to avoid overwhelming the LSP server

---

## Document Format

Each `./qmd-index/<path>.md` file follows this structure:

```markdown
---
file: src/auth/auth.service.ts
language: typescript
type: service
module: auth
symbols:
  - AuthService
  - AuthService.login
  - AuthService.logout
  - AuthService.validateToken
imports:
  - "@nestjs/common"
  - "./user.service"
  - "./jwt.service"
exports:
  - AuthService
diagnostics: 0
---

# src/auth/auth.service.ts

**Module:** auth | **Language:** TypeScript | **Type:** Service

## Class: AuthService

Injectable service handling user authentication and JWT token lifecycle.

---

### AuthService.login(email: string, password: string): Promise<AuthToken>

**Signature:** `async login(email: string, password: string): Promise<AuthToken>`

**Description:** Validates user credentials, compares bcrypt hash, and issues a signed JWT.

**Callers:**
- `AuthController.login` (src/auth/auth.controller.ts:24)

**Callees:**
- `UserService.findByEmail` (src/user/user.service.ts)
- `bcrypt.compare`
- `JwtService.sign`

---

### AuthService.validateToken(token: string): User | null

**Signature:** `validateToken(token: string): User | null`

**Description:** Verifies JWT signature and returns the decoded user, or null if expired/invalid.

**Callers:**
- `AuthGuard.canActivate` (src/auth/auth.guard.ts:12)
- `WebSocketGateway.handleConnection` (src/gateway/ws.gateway.ts:8)

**Callees:**
- `JwtService.verify`
- `UserService.findById`

---

## Imports

| Module | Used For |
|--------|----------|
| `@nestjs/common` | Injectable, UnauthorizedException |
| `./user.service` | UserService |
| `./jwt.service` | JwtService |
| `bcrypt` | Password hashing |
```

### Frontmatter Fields

| Field | Description | Example |
|---|---|---|
| `file` | Relative path from project root | `src/auth/auth.service.ts` |
| `language` | Detected language | `typescript` |
| `type` | Inferred file role | `service`, `controller`, `model`, `route`, `util`, `test`, `config` |
| `module` | Parent directory name | `auth` |
| `symbols` | All exported/public symbol names | `[AuthService, login]` |
| `imports` | All imported module names | `["@nestjs/common"]` |
| `exports` | Named exports | `[AuthService]` |
| `diagnostics` | Number of LSP errors | `0` |

### Inferring `type` from filename/path

| Pattern | Type |
|---|---|
| `*.service.ts`, `*_service.py` | `service` |
| `*.controller.ts`, `*_controller.py` | `controller` |
| `*.model.ts`, `*.entity.ts`, `models/*.py` | `model` |
| `*.repository.ts`, `*.repo.ts` | `repository` |
| `routes/*.ts`, `*router*.ts` | `route` |
| `*.middleware.ts` | `middleware` |
| `*.guard.ts`, `*.interceptor.ts` | `middleware` |
| `*.util.ts`, `utils/*.ts`, `helpers/*.ts` | `util` |
| `*.test.ts`, `*.spec.ts`, `test_*.py` | `test` |
| `*.config.ts`, `config/*.ts` | `config` |
| `index.ts`, `main.ts`, `app.ts` | `entrypoint` |

---

## qmd Setup & Commands

### Initial Setup

```bash
# Install qmd globally (requires Node >= 22 or Bun >= 1.0)
npm install -g qmd
# or
bun install -g qmd

# Verify
qmd --version
```

### Index Build

```bash
# Create collection pointing at generated docs
qmd collection add ./qmd-index --name codebase

# Generate embeddings with AST-aware chunking
qmd embed --chunk-strategy auto

# Check status
qmd status
```

### Incremental Update (--update mode)

```bash
# Re-scan filesystem (picks up new/changed files)
qmd update

# Re-embed with force flag
qmd embed --chunk-strategy auto -f

# Verify
qmd status
```

### Search Commands (for agents)

```bash
# Semantic / vector search
qmd vsearch "authentication and token validation" -c codebase -n 10

# Hybrid search (BM25 + vector + LLM rerank — best quality)
qmd query "where are database queries made" -c codebase

# Keyword search (fastest)
qmd search "PaymentService" -c codebase

# Retrieve a specific document
qmd get src/auth/auth.service.ts.md

# Retrieve multiple documents matching a pattern
qmd multi-get "src/auth/*.md"
```

### Output Formats

```bash
qmd vsearch "query" --json          # structured JSON
qmd vsearch "query" --files         # file paths only (tab-separated)
qmd vsearch "query" --md            # markdown output
qmd vsearch "query" --full          # include full document content
qmd vsearch "query" --explain       # show relevance score breakdown
qmd vsearch "query" --min-score 0.7 # filter by relevance threshold
```

---

## Freshness Strategy

| Trigger | Command | When |
|---|---|---|
| New project / full reindex | `/index-codebase` | First time or after major refactor |
| Code changes | `/index-codebase --update` | After significant changes |
| Phase 1 auto-run | `/index-codebase` | At start of every SDLC workflow |
| Stale check | `qmd status` | Any time to verify index health |

### Staleness Indicators

- `qmd status` shows 0 documents → index was deleted, run full reindex
- `qmd status` shows docs but search returns nothing relevant → run `--update`
- New files added since last index → run `--update`

---

## MCP Server Mode

`qmd mcp` starts qmd as an MCP server, exposing search as native agent tools. Configured in `.claude/settings.json`:

```json
"mcpServers": {
  "qmd": {
    "command": "qmd",
    "args": ["mcp"],
    "type": "stdio"
  }
}
```

Once running, agents can call:
- `mcp__qmd__vsearch` — vector search
- `mcp__qmd__search` — keyword search  
- `mcp__qmd__query` — hybrid search
- `mcp__qmd__get` — retrieve document

---

## Error Handling

| Error | Cause | Fix |
|---|---|---|
| `qmd: command not found` | Not installed | `npm install -g qmd` |
| `No collection named 'codebase'` | Collection not created | `qmd collection add ./qmd-index --name codebase` |
| `Embedding model not found` | First run, model not downloaded | Wait — qmd auto-downloads (~2GB) |
| `mcpls: file not found` | File path wrong | Use absolute paths for mcpls tools |
| `sg: pattern syntax error` | Bad ast-grep pattern | Check pattern with `sg run -p 'PATTERN' --debug-query` |
