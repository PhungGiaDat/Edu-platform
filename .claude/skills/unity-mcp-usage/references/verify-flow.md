# Verify Flow — Post-Edit Verification

> Use after any Unity-side change to confirm the change is live and
> the project compiles.

## The minimum viable verification

```text
1. Refresh Unity
2. Wait for compilation done
3. Read console
4. Run tests (if applicable)
```

### Step 1: Refresh

```text
refresh_unity scope="all"
```

`scope="all"` triggers a full asset re-import. For scripts only,
`scope="scripts"` is faster.

### Step 2: Wait for compilation

```text
read mcpforunity://editor/state
```

Look at `data.compilation.is_compiling`. If `true`, wait. Don't
issue more tool calls until `false`.

Alternative: poll `read_console` filters every few seconds.

### Step 3: Read console

```text
read_console
```

Or filtered:
```text
read_console action="filter" filter='{"logType": ["error"]}'
```

If errors are present, they MUST be fixed before claiming the work
is done. The `Read` tool's tally of error count is a stand-in for
"is this change kosher?" — but only if the editor has refreshed.

### Step 4: Run tests

```text
run_tests testMode="EditMode"
→ returns jobId
get_test_job jobId=...
```

Wait for `status: "Completed"`. Inspect `failedTests` count.

## What to do when errors are present

```text
read_console action="filter" filter='{"logType": ["error"]}'
```

For each error:
1. Read the file path and line number.
2. Read the file with `Read` tool.
3. Fix the issue directly.
4. Re-run the verify cycle.

Don't `Write` past an error. The file system edit will succeed but
Unity will not pick up the change until errors are cleared.

## Verifying scene changes

For scene mutations (`manage_scene`, `manage_gameobject`):

```text
1. get_hierarchy action="get_hierarchy" page_size=50 → confirm scene structure
2. manage_gameobject action="get_components" → confirm component values
```

Visual verification:
```text
manage_camera action="screenshot" outputPath="verify.png"
```

The screenshot is saved to the workspace and can be embedded in
your response.

## Verifying compile check after edits

A composite workflow:

```text
1. apply_text_edits / script_apply_edits ← make the change
2. refresh_unity scope="scripts"
3. read mcpforunity://editor/state → wait compilation done
4. read_console filter="error" → must be empty
5. (if errors) → fix and loop
```

For new scripts:

```text
1. create_script → file written
2. refresh_unity scope="scripts"
3. read_console → confirm new class compiled
4. manage_gameobject action="add_component" → try adding the new component
5. read_console → confirm add succeeded
```

If `add_component` fails, the script doesn't compile or the
component is missing attributes. Check `read_console`.

## Verifying tests

```text
run_tests testMode="EditMode" filter="ARSessionManagerRegressionTests"
→ jobId
```

Poll:
```text
get_test_job jobId=... → status
```

`status` values:
- `Pending` — queued, not yet started
- `Running` — in progress
- `Completed` — done, check `failedTests`
- `Failed` — Unity test runner failed to start

Inspect `failedTests` for details. The shape is:
```json
[
  {
    "name": "TestFoo",
    "resultState": "Failed",
    "message": "...",
    "stackTrace": "...",
    "durationSeconds": 0.5
  }
]
```

For PlayMode tests, run with `testMode="PlayMode"`. **PlayMode
tests can take 30+ seconds** because they spin up an actual play
mode session.

## Common verification traps

| Trap | Mitigation |
|---|---|
| Tests pass but changes don't show at runtime | Domain reload not complete. Check `editor/state`. |
| Edit succeeded but `read_console` shows old errors | Stale errors. Clear console or use `filter="logType: [\"error\"]"` with strict filter. |
| Tests pass locally but fail on CI | Check Unity version, package versions, and platform target. |
| PlayMode test never returns | Test entered infinite loop. Cancel via `manage_editor action="stop_play_mode"`. |
| `run_tests` returns "no tests found" | Test fixture not in `Assets/Tests/`. Check the `Tests` folder structure. |

## When to use `validate_script` instead of full verify

Before writing a big edit, use `validate_script` to dry-run:

```text
create_script path="Assets/test.cs" dryRun=true
```

If `validate_script` returns errors, fix them before the real edit.

## See also

- `references/script-mutation.md` — the edit itself
- `references/server-config.md` — connection issues
- `references/project-state.md` — discovering the editor state
