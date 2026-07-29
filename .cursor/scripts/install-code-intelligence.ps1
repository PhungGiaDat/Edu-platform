# =============================================================
# install-code-intelligence.ps1
# Migrated from sdlc-kit/scripts/ to .cursor/scripts/
# Installs: uv/uvx, Rust/cargo, ast-grep (sg), typescript-language-server, mcpls
#
# Platform: Windows (PowerShell 5.1+ or 7+)
# Usage:    powershell -ExecutionPolicy Bypass -File .cursor\scripts\install-code-intelligence.ps1
# =============================================================

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$scriptDir   = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = Split-Path -Parent (Split-Path -Parent $scriptDir)

function Ok   { param($msg) Write-Host "  [OK] $msg" -ForegroundColor Green }
function Info { param($msg) Write-Host "  [..] $msg" -ForegroundColor Cyan }
function Warn { param($msg) Write-Host "  [!!] $msg" -ForegroundColor Yellow }
function Err  { param($msg) Write-Host "  [XX] $msg" -ForegroundColor Red }
function Step { param($msg) Write-Host "`n-- $msg " -ForegroundColor White }

function Have-Cmd {
    param($cmd)
    $null -ne (Get-Command $cmd -ErrorAction SilentlyContinue)
}

function Refresh-Path {
    $machinePath = [System.Environment]::GetEnvironmentVariable('PATH', 'Machine')
    $userPath    = [System.Environment]::GetEnvironmentVariable('PATH', 'User')
    $env:PATH    = "$userPath;$machinePath"
}

# 1 / 5 — uv + uvx
Step "1 / 5  uv + uvx"
if (Have-Cmd uvx) {
    Ok "uvx already installed"
} else {
    Info "Installing uv..."
    powershell -ExecutionPolicy Bypass -c "irm https://astral.sh/uv/install.ps1 | iex"
    Refresh-Path
    $uvBin = "$env:APPDATA\uv\bin"
    if (Test-Path $uvBin) { $env:PATH = "$uvBin;$env:PATH" }
    if (Have-Cmd uv) { Ok "uv installed - $(uv --version)" } else { Err "uv install failed"; exit 1 }
}

# 2 / 5 — Rust + cargo
Step "2 / 5  Rust + cargo"
if (Have-Cmd cargo) {
    Ok "cargo already installed - $(cargo --version)"
} else {
    if (-not (Have-Cmd winget)) { Err "winget not found"; exit 1 }
    winget install --id Rustlang.Rustup -e --accept-source-agreements --accept-package-agreements
    Refresh-Path
    $cargoBin = "$env:USERPROFILE\.cargo\bin"
    if (Test-Path $cargoBin) { $env:PATH = "$cargoBin;$env:PATH" }
    if (Have-Cmd cargo) { Ok "cargo installed - $(cargo --version)" } else { Err "cargo install failed"; exit 1 }
}

# 3 / 5 — ast-grep
Step "3 / 5  ast-grep  (sg)"
if (Have-Cmd sg) {
    Ok "ast-grep already installed - $(sg --version)"
} else {
    Info "Installing ast-grep..."
    cargo install ast-grep --locked
    Refresh-Path
    if (Have-Cmd sg) { Ok "ast-grep installed - $(sg --version)" } else { Err "ast-grep install failed"; exit 1 }
}

# 4 / 5 — typescript-language-server
Step "4 / 5  typescript-language-server"
if (Have-Cmd typescript-language-server) {
    Ok "typescript-language-server already installed"
} else {
    if (-not (Have-Cmd npm)) { Err "npm not found"; exit 1 }
    npm install -g typescript-language-server typescript
    Refresh-Path
    if (Have-Cmd typescript-language-server) { Ok "typescript-language-server installed" } else { Err "install failed"; exit 1 }
}

# 5 / 5 — mcpls
Step "5 / 5  mcpls"
if (Have-Cmd mcpls) {
    Ok "mcpls already installed"
} else {
    Info "Installing mcpls..."
    cargo install mcpls --locked
    Refresh-Path
    if (Have-Cmd mcpls) { Ok "mcpls installed" } else { Err "mcpls install failed"; exit 1 }
}

# Verification
Write-Host ""
Write-Host "Verification:" -ForegroundColor White
$tools = @(
    @{ Name = "uvx";                        Cmd = { uvx --version 2>$null } },
    @{ Name = "cargo";                      Cmd = { cargo --version 2>$null } },
    @{ Name = "sg";                         Cmd = { sg --version 2>$null } },
    @{ Name = "typescript-language-server"; Cmd = { typescript-language-server --version 2>$null } },
    @{ Name = "mcpls";                      Cmd = { mcpls --version 2>$null } }
)
foreach ($t in $tools) {
    $ver = try { & $t.Cmd } catch { "installed" }
    Write-Host ("  {0,-30} {1}" -f $t.Name, $ver)
}

$ruleDir = Join-Path $projectRoot ".ast-grep\rules"
if (Test-Path $ruleDir) {
    $count = (Get-ChildItem -Path $ruleDir -Recurse -Filter "*.yml" | Measure-Object).Count
    Ok "Rule library: $count YAML rules in .ast-grep\rules\"
}

Write-Host ""
Write-Host "Next steps:" -ForegroundColor White
Write-Host "  1. Restart your terminal so PATH changes take effect"
Write-Host "  2. Run: sg scan --json"
Write-Host "  3. Run mcpls from project root"
Write-Host ""
Ok "Done."
