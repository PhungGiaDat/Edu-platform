---
name: last30days
version: "3.11.0"
description: "Research what people actually say about any topic in the last 30 days across Reddit, X, YouTube, TikTok, Instagram, HN, Polymarket, GitHub, Bluesky, Truth Social, Pinterest, Trustpilot, Digg, Stocktwits, Techmeme, arXiv, and the web. Scored by upvotes, likes, comments, views, and market activity. Use when asked for recent discussion, trends, competitor sentiment, or social listening. Triggers: 'last30days', 'what are people saying about', 'recent discussion of', 'social sentiment on', 'trending on reddit about'."
argument-hint: 'last30days nvidia earnings reaction | last30days AI video tools | last30days what users want in react'
disable-model-invocation: false
paths: []
metadata:
  scope: project
  primaryEnv: SCRAPECREATORS_API_KEY
  optionalEnv:
    - SCRAPECREATORS_API_KEY
    - OPENAI_API_KEY
    - XAI_API_KEY
    - OPENROUTER_API_KEY
    - PERPLEXITY_API_KEY
    - PARALLEL_API_KEY
    - BRAVE_API_KEY
    - APIFY_API_TOKEN
    - AUTH_TOKEN
    - CT0
    - BSKY_HANDLE
    - BSKY_APP_PASSWORD
    - TRUTHSOCIAL_TOKEN
  bins:
    - node
    - python3
---

# last30days — Cursor Skill

Research any topic from the last 30 days. The Python engine is the skill. WebSearch is a supplement after the engine runs, not a substitute.

## Output Contract

These rules dominate every other instruction in this file.

1. **Badge first.** Emit `🌐 last30days v3.11.0 · synced {YYYY-MM-DD}` as line 1, then one blank line.
2. **GENERAL/NEWS/PROMPTING/RECOMMENDATIONS:** badge, blank line, `What I learned:` on its own line, then bold-lead-in paragraphs.
3. **COMPARISON:** badge, blank line, `# {A} vs {B} [vs {C}]: What the Community Says (/Last30Days)`.
4. **No `##`/`###` section headers in body** for GENERAL queries. Comparison queries may use `## Quick Verdict`, `## {Entity}`, `## Head-to-Head`, `## The Bottom Line`, `## The emerging stack`.
5. **No `Sources:` block at the end.** The engine's emoji-tree footer is the only visible citation.
6. **No raw ranked evidence clusters in body.** Transform `## Ranked Evidence Clusters` into prose.
7. **Engine footer pass-through.** Include the `✅ All agents reported back!` block verbatim after KEY PATTERNS and before the invitation.
8. **Plain source labels on visible-URL hosts (Cursor).** Cite as `per @handle`, `per r/subreddit`, `per Rolling Stone`. Do NOT inline-link citations on Cursor because Cursor renders `[text](url)` as `text (https://...)`, creating URL soup. Leave full URLs to the engine footer and saved raw file.
9. **Weave community voice.** Include at least 2 verbatim attributed comments/quotes from actual people (`u/name`, `@handle`) mixed into the narrative. Never narrate engine behavior.
10. **No em-dashes.** Use ` - ` instead of `—` or `–`.

## Invocation

Resolve host web search first. If web search is available, set `LAST30DAYS_NATIVE_SEARCH=1` so the engine uses it instead of the keyless floor.

**First-run gate:**

```bash
grep -q "SETUP_COMPLETE=true" ~/.config/last30days/.env 2>/dev/null && echo "1" || echo "FIRST_RUN_DETECTED"
```

- `1` → setup complete, continue.
- `FIRST_RUN_DETECTED` → run the setup wizard before research.

**Engine invocation pattern:**

```bash
SKILL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")" && pwd)"
python3 "$SKILL_DIR/scripts/last30days.py" "<topic>" --emit=compact [flags]
```

On Cursor, use the Bash tool with the command above. Never answer from WebSearch alone.

### Required flags

- Always include `--emit=compact`.
- For named-entity topics (people, products, companies), include `--plan "$QUERY_PLAN_FILE"` where `$QUERY_PLAN_FILE` is a tmpfile you wrote with a JSON plan (you ARE the planner).
- For person topics: add `--x-handle=`, `--github-user=`, `--subreddits=`, and `--x-related=` unless Step 0.5 explicitly says "no account".
- For comparison topics: add `--competitors` or phrase as `A vs B`.

### Step 0.5 Pre-Flight Checklist

Before running the engine, resolve:
- [ ] Host web search available? If yes → use it and set `LAST30DAYS_NATIVE_SEARCH=1`.
- [ ] Topic quality check — keyword traps need ONE clarifying question.
- [ ] For person topics: handle resolution, GitHub user, subreddits, related voices.
- [ ] Full pre-flight resolved before engine call.

## Step 0: First-Run Setup Wizard

If first-run gate returned `FIRST_RUN_DETECTED`:

```bash
python3 "$SKILL_DIR/scripts/last30days.py" "setup" --welcome
```

The wizard installs `yt-dlp`, Digg CLI, and extracts browser cookies. Complete it before doing any topic research.

## Step 1: Research Execution

Run the engine with all pre-flight flags resolved. Read the engine output. Pass through the footer verbatim. Do not skip straight to WebSearch.

## Step 2: Synthesis

After the engine returns:

1. Read the `## Ranked Evidence Clusters`, `## Stats`, and `## Source Coverage` blocks.
2. Read `## Top Community Comments` and `## Best Takes` if present.
3. Write the `What I learned:` synthesis per the Output Contract above.
4. Weave at least 2 verbatim comments into the narrative.
5. Pass through the engine footer verbatim.
6. Do NOT append `Sources:`, `References:`, or any trailing URL list.

## Step 2.5: Saved Raw File

The engine may save raw output to `LAST30DAYS_MEMORY_DIR` or `--save-dir`. This is the durable citation record.

## What the engine does

- Searches Reddit, X, YouTube, TikTok, Instagram, HN, Polymarket, GitHub, Bluesky, Truth Social, Pinterest, Trustpilot, Digg, Stocktwits, Techmeme, arXiv, and the web.
- Scores by engagement signals: upvotes, likes, comments, views, market odds.
- Deduplicates, clusters, reranks, and synthesizes.
- Emits a compact synthesis with an emoji-tree stats footer.

## Host notes

- **Cursor:** plain labels for citations, no inline links, no em-dashes.
- **Codex:** inline-link citations (`[name](url)`), modal-first onboarding.
- **Codex / Gemini CLI / raw CLI:** same as Cursor — plain labels, no URL soup.

## Troubleshooting

- If sources show unavailable, run the engine health check and follow printed remediation.
- If X search is thin, verify `AUTH_TOKEN` and `CT0` env vars. Run `--welcome` to extract cookies.
- If YouTube comments are missing, install `yt-dlp` and ensure it's on PATH.
- If the engine warns `No --plan and no LLM provider configured`, YOU are the planner — generate a plan JSON and pass it via `--plan`.

## Files

| File | Purpose |
|------|---------|
| `SKILL.md` | This file — runtime contract |
| `scripts/last30days.py` | Main research engine |
| `scripts/lib/` | Search, enrichment, rendering modules |
| `scripts/lib/vendor/bird-search/` | Vendored X search client |
| `CONFIGURATION.md` | Full user-facing configuration reference |
| `CONCEPTS.md` | Shared domain vocabulary |
| `CURSOR_SETUP.md` | Cursor-specific setup instructions |
| `HERMES_SETUP.md` | Hermes harness setup |
| `AGENTS.md` | Agent maintenance rules |
| `AGENTS.md` | Symlink to AGENTS.md |
