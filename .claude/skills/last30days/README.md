# last30days — Cursor Skill

Research any topic across Reddit, X, YouTube, TikTok, Instagram, HN, Polymarket, GitHub, Bluesky, Truth Social, Pinterest, Trustpilot, Digg, Stocktwits, Techmeme, arXiv, and the web — scored by real engagement signals: upvotes, likes, comments, views, and market activity.

**Installed path:** `.cursor/skills/last30days/`  
**Upstream:** https://github.com/mvanhorn/last30days-skill  
**Version:** 3.11.0  
**License:** MIT

## Quick start

```bash
# From the repo root
python3 .cursor/skills/last30days/scripts/last30days.py "AI video tools" --emit=compact
```

Or use the `/last30days` slash command in Cursor chat:

```
/last30days NVIDIA earnings reaction
/last30days React Server Components vs Remix
/last30days what users want in react
```

## Options

| Flag | Description |
|------|-------------|
| `--emit=compact` | Compact synthesis with engine footer |
| `--emit=md` | Full Markdown output |
| `--emit=html` | Publishable HTML brief |
| `--save-dir <path>` | Save raw output to directory |
| `--plan <path>` | Query plan JSON for named-entity topics |
| `--welcome` | First-run onboarding wizard |
| `--competitors` | Comparison/competitor mode |

## Prerequisites

- Python 3.12+
- Node.js
- Optional: `uv`, `yt-dlp`, `digg-pp-cli`

## API keys / environment

| Variable | Purpose |
|----------|---------|
| `SCRAPECREATORS_API_KEY` | Instagram/TikTok comments, web search |
| `XAI_API_KEY` / `OPENAI_API_KEY` / `PERPLEXITY_API_KEY` / `PARALLEL_API_KEY` / `BRAVE_API_KEY` / `APIFY_API_TOKEN` | Web search/ranking |
| `AUTH_TOKEN` + `CT0` | X/Twitter authenticated search |
| `BSKY_HANDLE` + `BSKY_APP_PASSWORD` | Bluesky |
| `TRUTHSOCIAL_TOKEN` | Truth Social |

## Files

| File | Purpose |
|------|---------|
| `SKILL.md` | Canonical skill definition / runtime contract |
| `scripts/last30days.py` | Main research engine |
| `scripts/lib/` | Search, enrichment, rendering modules |
| `CONFIGURATION.md` | User-facing configuration reference |
| `CONCEPTS.md` | Shared domain vocabulary |
| `CURSOR_SETUP.md` | Cursor-specific setup instructions |
| `HERMES_SETUP.md` | Hermes harness setup |

## Updating

```bash
npx skills add mvanhorn/last30days-skill -g
```

Or re-pull from GitHub into `.cursor/skills/last30days/`.
