# FIX_REPORT_20260627 — ast-grep (sg) Installation & Rule Fixes

## Summary

All four background tasks (263491, 69214, 887570, 558728) failed to install `sg`
because the system has **no working C linker** — neither MSVC `link.exe` nor
mingw-w64 GCC. Switched to the **prebuilt GitHub release**, then repaired four
broken YAML rules and the config path so `sg scan` runs cleanly.

## Root Cause

```
error: linker `link.exe` not found
note: the msvc targets depend on the msvc linker but `link.exe` was not found
note: please ensure that Visual Studio 2017 or later, or Build Tools for
      Visual Studio were installed with the Visual C++ option
```

- Active toolchain: `stable-x86_64-pc-windows-msvc` (needs `link.exe`).
- VS Build Tools are **not** installed (vswhere found nothing).
- `gcc` is **not** on PATH, so the GNU toolchain alternative also fails.
- `cargo install ast-grep` therefore can never succeed on this machine.

## Resolution

Downloaded the official `app-x86_64-pc-windows-msvc.zip` from the ast-grep
GitHub release (v0.44.0). The zip ships **two binaries**:

| File         | Size       | Role                              |
|--------------|------------|-----------------------------------|
| `ast-grep.exe` | 52,356,608 | main engine                       |
| `sg.exe`       | 212,480   | thin wrapper (spawns ast-grep.exe) |

Both were copied to `C:\Users\LENOVO\.cargo\bin\` so `sg` works from any shell.

```
$ sg --version
ast-grep 0.44.0
```

## Verification

```
=== ast-grep verification ===
sg.exe:        212,480 bytes
ast-grep.exe: 52,356,608 bytes
sg --version:  ast-grep 0.44.0
Rule library:  14 YAML rules in .ast-grep/rules/
Config:        .ast-grep/sgconfig.yml
Scan hits:     279 matches across repo
```

A `sg scan` against the full repo produces **279 real findings** (mostly
`no-console-log` warnings in hooks/services and `prefer-const` notes in legacy
AR runtime JS). Exit code `8` confirms matches.

## Rule / Config Repairs

| File | Issue | Fix |
|------|-------|-----|
| `.ast-grep/sgconfig.yml` | `ruleDirs: .ast-grep/rules` was resolved relative to the config file, becoming `.ast-grep/.ast-grep/rules` | Changed to `ruleDirs: rules` (relative to config file) |
| `.ast-grep/rules/quality/no-any-type.yml` | `pattern: $VAR: any` — unquoted colon parsed as YAML mapping | Quoted: `pattern: "$VAR: any"` |
| `.ast-grep/rules/quality/no-nested-ternary.yml` | `severity: suggestion` not valid (must be `hint/info/warning/error/off`) | Changed to `severity: info`; also quoted the pattern |
| `.ast-grep/rules/quality/prefer-const.yml` | Same `severity: suggestion` issue | Changed to `severity: info` |
| `.ast-grep/rules/security/no-hardcoded-secrets.yml` | `patterns:` (plural) invalid; `fix:` at top level wrong placement | Rewrote with valid `all:`/`any:`/`regex:`/`kind:` structure |

## Sample Findings

```
frontend-web\src\hooks\useGame.ts:25:7: warning[no-console-log]
frontend-web\src\services\WebSocketQRServices.ts:66:9: warning[no-console-log]
frontend-web\public\static\ar-assets\js\ar-scanner.js:12:5: note[prefer-const]
… (279 total)
```

## Recommended Follow-up

1. **Patch install script** — `install-code-intelligence.ps1` still calls
   `cargo install ast-grep --locked`, which will fail again. Replace step 3
   with the prebuilt download path (sketch included below). The edit was
   blocked by tooling permissions; please apply manually.

   ```powershell
   # 3 / 5 — ast-grep (prebuilt fallback)
   $sgVersion  = "0.44.0"
   $dest       = "$env:USERPROFILE\.cargo\bin"
   $zipPath    = Join-Path $env:TEMP "sg-$sgVersion.zip"
   $extractDir = Join-Path $env:TEMP "sg-extract-$sgVersion"
   $url        = "https://github.com/ast-grep/ast-grep/releases/download/$sgVersion/app-x86_64-pc-windows-msvc.zip"
   if (-not (Test-Path $dest)) { New-Item -ItemType Directory -Path $dest -Force | Out-Null }
   Invoke-WebRequest -Uri $url -OutFile $zipPath -UseBasicParsing
   Expand-Archive -Path $zipPath -DestinationPath $extractDir -Force
   Copy-Item "$extractDir\sg.exe"       "$dest\sg.exe"       -Force
   Copy-Item "$extractDir\ast-grep.exe" "$dest\ast-grep.exe" -Force
   ```

2. **Optional**: Install Visual Studio Build Tools (C++ workload) or
   `mingw-w64` GCC so future `cargo install` calls work without prebuilt
   downloads.

3. **Optional**: Address the 279 lint findings; priority is the
   `no-console-log` warnings in `frontend-web/src/hooks/` and
   `frontend-web/src/services/`.

## Status

- [x] `sg` installed and on PATH
- [x] All 14 YAML rules parse without error
- [x] `sg scan` runs successfully (279 hits)
- [ ] Install script patch (blocked — apply manually)