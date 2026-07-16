---
name: code-intelligence
description: Decision framework for using LSP tools and AST-Grep to give agents IDE-level code intelligence — when to use each tool, how to combine them
---

# Code Intelligence — LSP + AST-Grep

This skill teaches agents to use **AST-Grep** (structural code search/rewrite) and **LSP tools** (IDE-level intelligence) to perform surgical, precise code operations instead of brute-force file reading.

## Decision Tree — Which Tool to Use

```
WHAT DO YOU NEED?
│
├── FIND code that matches a syntax pattern
│   └── ast-grep: sg run -p 'PATTERN' -l LANG --json
│
├── UNDERSTAND what a symbol/function does
│   ├── Quick: LSP hover → get type + doc comment
│   └── Deep: LSP go-to-definition → read implementation
│
├── IMPACT ANALYSIS before changing/deleting
│   ├── LSP find-references → all usages in project
│   └── ast-grep → verify no pattern matches you missed
│
├── SAFE REFACTORING
│   ├── Single symbol rename: LSP rename (cross-file, compiler-validated)
│   └── Pattern-based bulk rewrite: ast-grep run -r 'NEW' -U
│
├── VALIDATE changes (catch errors before build)
│   └── LSP diagnostics → compiler errors, type errors, warnings
│
├── LINT for anti-patterns / security issues
│   └── ast-grep scan with YAML rules
│
└── UNDERSTAND call chains / data flow
    ├── LSP call hierarchy (incoming = callers, outgoing = callees)
    └── ast-grep pattern tracing across files
```

## Tool Comparison

| Task | Use | Why |
|------|-----|-----|
| Find all `fetch()` calls | ast-grep | Structural — avoids string matches |
| Find all callers of `processPayment()` | LSP references | Cross-language, follows imports |
| Check type of a variable | LSP hover | Compiler-accurate types |
| Navigate to interface definition | LSP definition | Follows re-exports and type aliases |
| Rename `userId` → `user_id` everywhere | LSP rename | Atomic, validated, cross-file |
| Replace `var` → `let` across codebase | ast-grep rewrite | Pattern-bulk, language-aware |
| Check if code has syntax errors | LSP diagnostics | Real compiler output |
| Find security anti-patterns | ast-grep scan | Custom YAML rules, CI-ready |
| Understand complex function | LSP hover + definition | Doc comments + implementation |
| Find all TODO comments | ast-grep | Pattern search |

## LSP Tools via mcpls MCP Server

The `mcpls` MCP server auto-detects language servers by project markers and exposes them as MCP tools.

### Core LSP Operations

```
hover(file, line, character)
  → Returns type information and doc comments for symbol at position
  → Use before: modifying a function, understanding return types

definition(file, line, character)
  → Returns location of symbol definition
  → Use before: modifying an implementation, understanding behavior

references(file, line, character)
  → Returns all usages of the symbol project-wide
  → Use before: renaming, deleting, changing function signatures

diagnostics(file)
  → Returns compiler errors, warnings, and lint messages
  → Use after: every file modification

rename(file, line, character, newName)
  → Renames symbol across entire workspace atomically
  → Safer than find-replace — compiler-validated

call_hierarchy_incoming(file, line, character)
  → Who calls this function?
  → Use for: understanding impact, finding dead code

call_hierarchy_outgoing(file, line, character)
  → What does this function call?
  → Use for: tracing data flow, understanding dependencies

document_symbols(file)
  → Lists all symbols (functions, classes, variables) in a file
  → Use for: building file outline before modification

workspace_symbols(query)
  → Search symbols across entire project by name
  → Use for: finding classes/functions when you don't know the file
```

### When LSP Isn't Available

If mcpls is not configured, fall back to:
- `grep -rn 'symbolName'` for references (less precise)
- Reading the file directly for hover info
- Manual search for definitions

## AST-Grep via Bash

AST-Grep is available via the `sg` CLI command.

### Structural Search Pattern
```bash
# Always use --json for programmatic output
sg run -p 'PATTERN' -l LANG --json 2>/dev/null

# Parse with jq to get just file locations
sg run -p 'PATTERN' -l LANG --json | jq -r '.[] | "\(.file):\(.range.start.line)"'

# Count matches
sg run -p 'PATTERN' -l LANG --json | jq 'length'
```

### Bulk Rewrite Pattern
```bash
# Dry run first — see what would change
sg run -p 'OLD_PATTERN' -r 'NEW_PATTERN' -l LANG --json

# Apply all changes
sg run -p 'OLD_PATTERN' -r 'NEW_PATTERN' -l LANG -U

# Interactive — confirm each change
sg run -p 'OLD_PATTERN' -r 'NEW_PATTERN' -l LANG -i
```

### Rule-Based Scanning Pattern
```bash
# Run all rules in project config
sg scan --json 2>/dev/null

# Run only security rules
sg scan --filter "security-*" --json 2>/dev/null

# Run a specific rule
sg scan --rule .ast-grep/rules/security/no-eval.yml --json 2>/dev/null

# Filter by severity
sg scan --json 2>/dev/null | jq '.[] | select(.severity == "error")'
```

## SDLC Phase Playbook

### Phase 3 — Development

**Before editing a function:**
1. `hover(file, line, col)` → understand current types
2. `references(file, line, col)` → count callers (if signature changes)
3. `definition(file, line, col)` → read interface/type definitions

**After editing a file:**
1. `diagnostics(file)` → catch type errors immediately
2. `sg scan --json` → catch anti-patterns introduced

**For API migrations:**
```bash
# 1. Find all usages of deprecated API
sg run -p 'oldApi($$$ARGS)' -l ts --json | jq '.[].file' | sort -u

# 2. Apply migration
sg run -p 'oldApi($$$ARGS)' -r 'newApi($$$ARGS)' -l ts -U

# 3. Validate no errors introduced
# → LSP diagnostics on each changed file
```

### Phase 4 — Code Review

**Standard review workflow:**
```bash
# 1. Run full rule library — security + quality
sg scan --json 2>/dev/null | jq '.[] | {id: .ruleId, severity: .severity, file: .file, line: .range.start.line, message: .message}'

# 2. Check for specific high-priority patterns
sg scan --filter "security-*" --json 2>/dev/null

# 3. Get LSP diagnostics for all modified files
# → diagnostics(file) for each file in git diff

# 4. Find functions with no references (dead code)
# → workspace_symbols + references for each
```

**Key rules in this project:**
- `.ast-grep/rules/security/` — XSS, eval, innerHTML, hardcoded secrets
- `.ast-grep/rules/quality/` — console.log, any types, var usage, nested ternary

### Phase 5 — Testing

**Pre-test validation:**
```bash
# Run diagnostics on test files
# → diagnostics(test_file) for each test file

# Find test files missing assertions
sg run -p 'it($DESC, async () => { $$$BODY })' -l ts --json \
  | jq '.[] | select(.metaVariables.multi.BODY | map(.text) | join("") | contains("expect") | not)'
```

**Post-test analysis:**
```bash
# Find error paths not covered by tests
sg run -p 'throw new Error($$$)' -l ts --json
sg run -p 'catch ($E) { $$$BODY }' -l ts --json
```

### Phase 7 — Documentation

**Extract public API surface:**
```bash
# All exported functions with signatures
sg run -p 'export function $NAME($$$PARAMS) { $$$BODY }' -l ts --json \
  | jq '.[] | {name: .metaVariables.single.NAME.text, file: .file, line: .range.start.line}'

# All exported classes
sg run -p 'export class $NAME $$$REST { $$$BODY }' -l ts --json \
  | jq '.[] | {name: .metaVariables.single.NAME.text, file: .file}'

# All route handlers (Express pattern)
sg run -p 'router.$METHOD($PATH, $$$HANDLERS)' -l ts --json \
  | jq '.[] | {method: .metaVariables.single.METHOD.text, path: .metaVariables.single.PATH.text}'
```

## Output Integration

### For Code Review Reports

When using ast-grep in Phase 4, format findings for the issue list:

```bash
sg scan --json 2>/dev/null | jq -r '.[] | "### \(.ruleId): \(.message)\n- **File:** `\(.file):\(.range.start.line)`\n- **Severity:** \(.severity)\n"'
```

### For Fix Agent

When handing off to the fix agent, include:
1. Exact file:line locations from ast-grep JSON output
2. The specific rule ID that triggered
3. The suggested fix (from rule's `fix` field or manual suggestion)

## MCP Server Configuration

### mcpls (LSP bridge)
```json
// In opencode.json or claude_desktop_config.json
{
  "mcpServers": {
    "mcpls": {
      "command": "mcpls",
      "args": []
    }
  }
}
```

### ast-grep-mcp (official)
```json
{
  "mcpServers": {
    "ast-grep": {
      "command": "uvx",
      "args": [
        "--from", "git+https://github.com/ast-grep/ast-grep-mcp",
        "ast-grep-server"
      ]
    }
  }
}
```

## Troubleshooting

**ast-grep not found:**
```bash
brew install ast-grep   # macOS
cargo install ast-grep  # cross-platform
```

**Pattern not matching:**
```bash
# Visualize AST first
sg run -p 'YOUR_PATTERN' -l LANG --debug-query
# Then adjust meta-variables to match AST nodes
```

**LSP not responding:**
- Ensure the language server for your project is installed
- Check mcpls is in PATH: `which mcpls`
- Verify project markers exist (e.g., `package.json` for TypeScript)

**Too many false positives:**
- Increase strictness: `--strictness ast` (default: `smart`)
- Use relational operators to add context: `inside`, `has`
- Add `not` rules to exclude specific cases
