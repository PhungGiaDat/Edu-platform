---
name: ast-grep
description: Structural code search, lint, and rewrite using AST pattern matching — faster and more precise than grep/ripgrep for code
---

# AST-Grep — Structural Code Intelligence

AST-Grep (`sg`) matches code by **syntax structure**, not text. It understands that `console.log` in a function call is different from `console.log` in a string or comment.

## Quick Reference

```bash
# Search — structural pattern matching
sg run -p 'console.log($$$)' -l js --json

# Rewrite — bulk refactoring
sg run -p 'var $N = $V' -r 'let $N = $V' -l js -U

# Lint — rule-based scanning
sg scan --json
sg scan --rule .ast-grep/rules/security/no-eval.yml

# Debug — visualize AST
sg run -p 'fetch($URL)' -l ts --debug-query

# Interactive rewrite — confirm each change
sg run -p 'old_api($$$)' -r 'new_api($$$)' -l py -i
```

## Pattern Syntax

| Meta-variable | Matches | Example |
|---------------|---------|---------|
| `$VAR` | Single AST node (captures) | `$VAR.length` matches `str.length`, `arr.length` |
| `$_` | Single AST node (discards) | `if ($_ ) {}` matches any condition |
| `$$$VAR` | Zero or more nodes (captures) | `fn($$$ARGS)` matches `fn()`, `fn(a, b, c)` |
| `$$$` | Zero or more nodes (discards) | `[$$$ ]` matches any array |

**Same-name variables must match identical subtrees:**
```bash
# Finds: x == x, (a+b) == (a+b) — NOT x == y
sg run -p '$A == $A' -l js
```

## Key Flags

| Flag | Short | Description |
|------|-------|-------------|
| `--pattern` | `-p` | AST pattern to match |
| `--rewrite` | `-r` | Replacement pattern |
| `--lang` | `-l` | Language (js, ts, py, go, rust, java, c, cpp, css, html...) |
| `--json` | | JSON output for programmatic use |
| `--update-all` | `-U` | Apply all rewrites without confirmation |
| `--interactive` | `-i` | Review each match before applying |
| `--context` | `-C` | Lines of context around match |
| `--rule` | | Use a YAML rule file |
| `--filter` | | Filter rules by ID pattern |
| `--format sarif` | | SARIF output (CI integration) |
| `--strictness` | | `cst` / `smart` (default) / `ast` / `relaxed` / `signature` |

## Common Patterns by Language

### JavaScript / TypeScript

```bash
# Find all async functions
sg run -p 'async function $NAME($$$) { $$$BODY }' -l ts --json

# Find all awaits inside Promise.all (anti-pattern)
sg run -p 'Promise.all([$$$, await $_, $$$])' -l ts --json

# Find React useState without initial value
sg run -p 'useState()' -l tsx --json

# Find all fetch() calls
sg run -p 'fetch($URL, $$$)' -l ts --json

# Find try/catch without error logging
sg run -p 'try { $$$BODY } catch ($E) { }' -l js --json

# Rewrite: .then() chains → async/await (pattern)
sg run -p '$P.then($CB)' -l ts --json

# Find all TODO comments (via regex fallback)
sg run -p '// TODO: $$$' -l ts --json

# Type assertions (potential runtime errors)
sg run -p '$X as any' -l ts --json
sg run -p '<any>$X' -l ts --json
```

### Python

```bash
# Find all print() calls (not print statements)
sg run -p 'print($$$)' -l py --json

# Find bare except clauses
sg run -p 'try: $$$BODY except: $$$HANDLER' -l py --json

# Find eval() usage
sg run -p 'eval($CODE)' -l py --json

# Find exec() usage
sg run -p 'exec($CODE)' -l py --json

# Find mutable default arguments
sg run -p 'def $NAME($$$, $PARAM=[]):' -l py --json

# Find hardcoded passwords
sg run -p 'password = $VAL' -l py --json
```

### Go

```bash
# Find all error ignoring patterns
sg run -p '$_, $ERR := $FUNC($$$); _ = $ERR' -l go --json

# Find fmt.Println (debug output)
sg run -p 'fmt.Println($$$)' -l go --json

# Find panic() calls
sg run -p 'panic($MSG)' -l go --json
```

### General

```bash
# Find TODO/FIXME comments in any language
sg run -p 'TODO' -l ts --json  # adjust lang as needed
```

## YAML Rule Configuration

Rules enable reusable, shareable lint checks with severity levels:

```yaml
id: no-await-in-promise-all
language: TypeScript
severity: warning
message: "Avoid await inside Promise.all — it defeats parallelism"
note: "Remove the await or restructure with Promise.all wrapping promises"
rule:
  pattern: Promise.all($$$)
  has:
    pattern: await $_
    stopBy: end
```

**Composite rules (all/any/not):**
```yaml
id: prefer-optional-chaining
language: JavaScript
severity: suggestion
message: "Use optional chaining instead of manual null check"
rule:
  any:
    - pattern: $A && $A.$B
    - pattern: $A != null && $A.$B
fix: "$A?.$B"
```

**Relational operators:**
| Operator | Meaning |
|----------|---------|
| `inside` | Match is inside another pattern |
| `has` | Match contains another pattern |
| `follows` | Match comes after another pattern |
| `precedes` | Match comes before another pattern |
| `stopBy` | Stop traversal at `neighbor` or `end` |

## Scanning with Project Config

```yaml
# sgconfig.yml
ruleDirs:
  - .ast-grep/rules
testConfigs:
  - testDir: .ast-grep/tests
```

```bash
sg scan                              # Use sgconfig.yml
sg scan --rule path/to/rule.yml      # Specific rule
sg scan --filter "security-*"        # Filter by ID
sg scan --json                       # JSON output
sg scan --format sarif               # SARIF for GitHub Code Scanning
```

## JSON Output Format

Use `--json` to get structured output for programmatic processing:

```json
[
  {
    "text": "console.log(\"debug\")",
    "range": {
      "byteOffset": { "start": 45, "end": 68 },
      "start": { "line": 3, "column": 2 },
      "end": { "line": 3, "column": 25 }
    },
    "file": "src/utils.ts",
    "lines": "  console.log(\"debug\")",
    "language": "TypeScript",
    "metaVariables": {
      "single": {},
      "multi": {
        "ARGS": [{ "text": "\"debug\"" }]
      }
    }
  }
]
```

Parse with `jq`:
```bash
sg run -p 'console.log($$$)' -l ts --json | jq '.[].file' | sort -u
```

## SDLC Phase Integration

### Phase 3 — Development (Refactoring)

```bash
# Migrate deprecated API
sg run -p 'oldApi($$$ARGS)' -r 'newApi($$$ARGS)' -l ts -U

# Convert var to let (bulk)
sg run -p 'var $N = $V' -r 'let $N = $V' -l js -U

# Add null checks before property access
sg run -p '$OBJ.$PROP' -l ts --json  # identify candidates
```

### Phase 4 — Code Review (Linting)

```bash
# Run full rule library
sg scan --json | jq '.[] | select(.severity == "error")'

# Check security rules only
sg scan --filter "security-*" --format sarif

# Get issue count by severity
sg scan --json | jq 'group_by(.severity) | map({severity: .[0].severity, count: length})'
```

### Phase 5 — Testing (Coverage Gaps)

```bash
# Find functions without test references
sg run -p 'export function $FN($$$) { $$$BODY }' -l ts --json

# Find error handling gaps
sg run -p 'try { $$$BODY } catch ($E) {}' -l ts --json
```

### Phase 7 — Documentation (API Extraction)

```bash
# Extract all exported functions
sg run -p 'export function $NAME($$$PARAMS): $RETURN { $$$BODY }' -l ts --json \
  | jq '.[] | {name: .metaVariables.single.NAME.text, file: .file}'

# Extract all exported classes
sg run -p 'export class $NAME { $$$BODY }' -l ts --json
```

## Supported Languages

`c`, `cpp`, `cs` (C#), `css`, `dart`, `elixir`, `go`, `groovy`, `hcl`, `html`, `java`, `js`/`javascript`, `json`, `jsx`, `kotlin`, `lua`, `ocaml`, `php`, `py`/`python`, `ruby`, `rs`/`rust`, `scala`, `sql`, `swift`, `toml`, `ts`/`typescript`, `tsx`, `yaml`, `zig`

## Installation

```bash
brew install ast-grep          # macOS
cargo install ast-grep         # cross-platform (Rust)
npm install -g @ast-grep/cli   # npm (slower)
```

Verify: `sg --version`
