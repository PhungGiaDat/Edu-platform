# Script Mutation — Safe Edit Workflow

> Use when modifying `Assets/**/*.cs` and you need to verify the
> change compiles inside the Unity Editor.

## The four-step cycle

1. **Read**
2. **Edit**
3. **Refresh**
4. **Verify**

Each step has a specific tool. Skipping a step is the #1 cause of
"works on my machine, broken in Unity" bugs.

### Step 1: Read

For small files (`< 200 lines`):
```text
manage_script action="read" uri="Assets/AR/ARSessionManager.cs"
```

For large files, use page-by-page:
```text
read_file path=... limit=200 offset=1
```

Or use `find_in_file` to locate a specific pattern:
```text
find_in_file uri="Assets/AR/ARSessionManager.cs" pattern="InitializeImageTracking"
```

Either way, **read before edit**. Line/column numbers in
`apply_text_edits` are 1-indexed and an off-by-one error breaks the
edit silently.

### Step 2: Edit

For new files: `create_script`
For existing files: `apply_text_edits` for precise line/col
For pattern-based replacement: `script_apply_edits` with anchors

Use `Read` + `Write` for plain edits, then verify compilation
afterwards. The MCP tools are **not** the only way to edit — they're
the verification path.

### Step 3: Refresh

```text
refresh_unity scope="all"
```

This forces Unity to re-import the changed files and trigger a
domain reload. Necessary because the file-system watcher may not
fire for scripts edited by external tools.

Wait for completion:
```text
read mcpforunity://editor/state → data.compilation.is_compiling == false
```

### Step 4: Verify

```text
read_console action="filter" filter='{"logType": ["error", "warning"]}'
```

If there are errors, **fix them before continuing**. Stale errors
from prior edits may need to be cleared by dismissing them in the
Console window.

## What `manage_script` does

`manage_script` is the structured wrapper. It accepts:

- `uri` — file path (relative to `Assets/`)
- `action` — what to do
- `position`/`anchor`/`newText` — edit description

It does NOT bypass Unity's compile pipeline. After calling it, you
still need to call `refresh_unity` and `read_console`.

## What `apply_text_edits` does

`apply_text_edits` is the precise text editor. It accepts:

- `uri` — file path
- `edits` — list of `{startLine, startCol, endLine, endCol, newText}`
- `precondition_sha256` — fail the edit if the file's hash changed

Use `precondition_sha256` if you have a stale view of the file.
Get the current hash with `get_sha`. This prevents a class of
"two editors, one file" bugs.

## What `script_apply_edits` does

`script_apply_edits` is the structural editor. It accepts:

- `uri` — file path
- `edits` — list of operations with `anchor` (regex match) and
  `newText`

This is **safer than `apply_text_edits`** for pattern-based changes
because it locates the edit site by content, not by line numbers.

Prefer `script_apply_edits` when:
- You want to add a method to a class
- You want to add a field after another field
- You want to wrap a block with a try/catch

## What `create_script` does

`create_script` creates a new C# file from scratch. It will:

- Create the file at the given path
- Add the `.meta` file Unity needs
- Trigger a domain reload

New MonoBehaviour scripts are detected by Unity, which will compile
them. Check `read_console` after.

## What `validate_script` does

`validate_script` checks syntax without writing the file. Useful
for "would this compile?" previews.

## Common failure modes

| Symptom | Cause | Fix |
|---|---|---|
| `apply_text_edits` returns "content mismatch" | File changed between read and edit | Re-read with `manage_script action="read"`, get fresh hash, retry |
| `refresh_unity` hangs | Long domain reload | Wait. Don't issue more tool calls. |
| `read_console` shows errors after a clean edit | Stale errors from prior session | Clear console in Unity window |
| `create_script` succeeds but Unity shows type not found | Classified as "AddComponent" only | Add `[CreateAssetMenu]` or `[AddComponentMenu]` attribute |
| Edit works but new code not visible at runtime | Scriptable asset path not refreshed | Call `refresh_unity scope="all"` |

## When to use `execute_code` instead

`execute_code` runs arbitrary C# inside the Unity Editor. Use it when:

- You need access to a private API that has no MCP tool
- You need to verify a runtime state that's hard to inspect statically
- You need to attach a debugger or instrumentation hook

**Avoid** using `execute_code` as a shortcut for management that has
purpose-built tools. `manage_script`, `manage_scene`, etc. are
reflection-aware and safer.

## Edit-then-verify examples

### Example: rename a method

```text
1. find_in_file pattern="OldMethodName" → confirm hits
2. apply_text_edits with edits: [{ startLine: 50, startCol: 17, endLine: 50, endCol: 30, newText: "NewMethodName" }]
3. refresh_unity
4. read_console → verify no errors
5. find_in_file pattern="NewMethodName" → confirm rename
```

### Example: add a new method

```text
1. read Assets/AR/ARSessionManager.cs (find a class to extend)
2. script_apply_edits with anchor: "class ARSessionManager", newText: "\n    public void NewMethod() { ... }"
3. refresh_unity
4. read_console → verify no errors
```

### Example: create a new MonoBehaviour

```text
1. create_script path="Assets/MyComponent.cs"
2. (issue is created with skeleton)
3. apply_text_edits / script_apply_edits to fill in fields
4. refresh_unity
5. read_console → verify no errors
```

## See also

- `references/verify-flow.md` — the post-edit verification steps
- `references/server-config.md` — connection issues
- `references/project-state.md` — package and scene discovery
