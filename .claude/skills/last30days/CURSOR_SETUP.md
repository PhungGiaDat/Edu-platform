# Cursor Setup — last30days

Installed at: `.cursor/skills/last30days/`
Upstream: https://github.com/mvanhorn/last30days-skill

## What this skill does

Research any topic across Reddit, X, YouTube, TikTok, Instagram, HN, Polymarket, GitHub, Bluesky, Truth Social, Pinterest, Trustpilot, Digg, Stocktwits, Techmeme, arXiv, and the web — scored by real engagement: upvotes, likes, comments, views, and market activity. The engine produces a compact synthesis with the engine footer passed through verbatim.

## Install

```bash
npx skills add mvanhorn/last30days-skill -g
```

If `npx skills add` is unavailable in this environment, the files have been
manually copied into `.cursor/skills/last30days/`. To update later, re-run the
same command or re-pull from GitHub.

## Prerequisites

- Python 3.12+
- Node.js
- Recommended: `uv` for Python venv

## First-run configuration

1. Open Cursor Settings → Agents → Skills. Confirm `last30days` appears.
2. Set any optional API keys in your shell profile or `.env`:
   - `SCRAPECREATORS_API_KEY` — recommended for Instagram/TikTok comments and ScrapeCreators search
   - `XAI_API_KEY` or `OPENAI_API_KEY` or `PERPLEXITY_API_KEY` or `PARALLEL_API_KEY` or `BRAVE_API_KEY` or `APIFY_API_TOKEN` — for web search/ranking
   - `AUTH_TOKEN` and `CT0` — for X/Twitter authenticated search
   - `BSKY_HANDLE` / `BSKY_APP_PASSWORD` — for Bluesky
   - `TRUTHSOCIAL_TOKEN` — for Truth Social
3. Optional CLIs: `yt-dlp` for YouTube comments, `digg-pp-cli` for Digg.
4. From the repo root, run the engine health check:
   ```bash
   cd .cursor/skills/last30days/scripts
   python3 last30days.py "test query" --emit=compact
   ```
5. If sources are missing, use the engine's built-in setup wizard:
   ```bash
   python3 last30days.py "setup" --welcome
   ```

## Usage in Cursor

Use the `/last30days` slash command in the chat:

```
/last30days NVIDIA earnings reaction
/last30days AI video tools
/last30days React Server Components vs Remix
```

### Options

- `--emit=compact` — compact synthesis with engine footer
- `--emit=md` — full Markdown output
- `--emit=html` — publishable HTML brief
- `--save-dir <path>` — save raw output to a directory
- `--plan <path>` — provide a query plan JSON for named-entity topics
- `--welcome` — first-run onboarding wizard
- `--competitors` — comparison/competitor mode

## Source activation

| Source | Default | Notes |
|--------|---------|-------|
| Reddit | ✅ | Public + authenticated |
| X/Twitter | ✅ | Public search; `AUTH_TOKEN`+`CT0` unlocks more |
| YouTube | ✅ | `yt-dlp` optional for comments |
| TikTok | ✅ | `SCRAPECREATORS_API_KEY` for comments |
| Instagram | ✅ | `SCRAPECREATORS_API_KEY` required |
| LinkedIn | ✅ | Public profiles |
| Bluesky | ✅ | `BSKY_HANDLE`+`BSKY_APP_PASSWORD` |
| Truth Social | ✅ | `TRUTHSOCIAL_TOKEN` |
| Threads | ⚪ opt-in | Step 5 Everything option |
| Pinterest | ⚪ opt-in | Step 5 Everything option |
| HN | ✅ | Public |
| Polymarket | ✅ | Public |
| GitHub | ✅ | Public |
| Trustpilot | ✅ | Public |
| Digg | ✅ | `digg-pp-cli` on PATH |
| Stocktwits | ✅ | Public |
| Techmeme | ✅ | Public |
| arXiv | ✅ | Public |
| Web search | ✅ | Provider-dependent |

## Notes

- Working-tree edits in `.cursor/skills/last30days/` do NOT propagate to
  `~/.agents/skills/` or `npx` global installs. Re-run `npx skills add` to
  sync if you install globally later.
- The `lib/__init__.py` is intentionally a bare package marker — no eager
  imports.
- For Hermes/OpenClaw-specific setup, see `HERMES_SETUP.md`.

## Troubleshooting

- If sources show as unavailable, run the engine health check and follow the
  printed remediation steps. The engine diagnoses missing CLIs, expired
  cookies, and credential issues.
- If X search is thin, verify `AUTH_TOKEN` and `CT0` are set in your
  environment. The `--welcome` wizard can help extract them.
- If YouTube comments are missing, install `yt-dlp` and ensure it's on the
  agent subprocess PATH.
