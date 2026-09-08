---
name: skill-creator
description: "Create or improve OpenCode agent skills. Use when the user wants to build a new skill, add a new capability to the agent team, improve an existing skill's instructions or description, or create skill scripts and reference docs. Triggers: 'create a skill', 'add a skill', 'improve skill', 'new agent capability', 'skill for X'."
---

# Skill Creator

Create effective OpenCode skills using progressive disclosure and iterative refinement.

## Core Principles

- Skills are **practical instructions**, not documentation
- Each skill teaches the agent *how* to perform tasks
- **Progressive disclosure:** description → SKILL.md → reference files
- **Descriptions must be "pushy"** — aggressively trigger when relevant

## Skill Structure

New skills go in `.claude/skills/<skill-name>/`:

```
.claude/skills/<skill-name>/
├── SKILL.md              (required, ≤300 lines)
├── scripts/              (executable scripts the agent runs)
└── references/           (detail docs loaded on demand)
```

SKILL.md frontmatter:
```yaml
---
name: skill-name
description: "Trigger-aggressive description — when to use this skill"
---
```

## Creation Workflow

1. **Capture intent** — What does this skill do? When should it trigger? What does it produce?
2. **Research** — Read existing skills in `.claude/skills/` for patterns
3. **Write SKILL.md** — Core instructions, ≤300 lines
4. **Add scripts** — Put executable scripts in `scripts/`
5. **Add references** — Put detailed docs (loaded on demand) in `references/`
6. **Validate** — Run `python .claude/skills/skill-creator/scripts/quick_validate.py <path>`
7. **Test** — Ask: does the agent use this skill for the right inputs?
8. **Iterate** — Refine description and instructions based on test results

## Writing the Description

The description is the **trigger** — it must be aggressive:

```yaml
# ❌ Undertriggers
description: Data processing skill

# ✅ Triggers reliably
description: "Process CSV files and tabular data. Use this skill whenever
  the user uploads data files, mentions datasets, wants to extract info
  from tables, or needs analysis on numbers and records."
```

Rules:
- Start with what the skill does
- List specific trigger keywords and scenarios
- Include "Use this skill when..." phrasing
- Mention what NOT to use it for (prevents false triggers)
- Keep under 1024 characters

## SKILL.md Writing Rules

- **Imperative form:** "To do X, run Y" — not "You should..."
- **Concrete examples:** exact commands, code snippets, API calls
- **No duplication:** info lives in SKILL.md OR references, never both
- **Concise:** sacrifice grammar for brevity
- **Script paths:** always use full path from project root (`.claude/skills/<name>/scripts/...`)

## Scripts

Scripts are executable files the agent calls directly — not loaded into context.

```bash
# Quick validate a skill's frontmatter
python .claude/skills/skill-creator/scripts/quick_validate.py .claude/skills/<name>/SKILL.md
```

Available scripts in `.claude/skills/skill-creator/scripts/`:

| Script | Purpose |
|--------|---------|
| `quick_validate.py` | Validate frontmatter format |
| `init_skill.py` | Initialize new skill from template |
| `run_eval.py` | Test skill triggering on queries |
| `improve_description.py` | AI-powered description optimization |
| `aggregate_benchmark.py` | Consolidate eval runs into summary stats |
| `generate_report.py` | Generate eval review report |
| `run_loop.py` | Iterative description optimization loop |
| `llm_client.py` | OpenAI-compatible client factory (shared by eval scripts) |

All eval scripts use any OpenAI-compatible API — set via env vars or CLI flags:
- `LLM_API_BASE_URL` / `LLM_API_KEY` (or `OPENAI_API_BASE_URL` / `OPENAI_API_KEY`)
- Or pass `--api-base-url` / `--api-key` directly

```bash
# OpenAI
python .claude/skills/skill-creator/scripts/run_loop.py \
    --eval-set evals.json --skill-path .claude/skills/my-skill \
    --model gpt-4o --max-iterations 5 --verbose

# ZhipuAI / local model
LLM_API_BASE_URL=https://open.bigmodel.cn/api/paas/v4 LLM_API_KEY=<key> \
python .claude/skills/skill-creator/scripts/run_loop.py \
    --eval-set evals.json --skill-path .claude/skills/my-skill \
    --model glm-4-flash --max-iterations 5

# Ollama
python .claude/skills/skill-creator/scripts/run_loop.py \
    --eval-set evals.json --skill-path .claude/skills/my-skill \
    --api-base-url http://localhost:11434/v1 --api-key ollama \
    --model llama3.1:8b
```

## Reference Files

Reference files are detailed docs the agent loads only when needed — not always in context.

Good candidates for references:
- Detailed API documentation
- Large code examples
- Step-by-step guides for complex sub-tasks
- Troubleshooting tables

Reference files in `.claude/skills/skill-creator/references/` cover:
- `skill-anatomy-and-requirements.md` — full skill structure and requirements
- `skill-creation-workflow.md` — detailed creation workflow
- `skill-design-patterns.md` — patterns and anti-patterns
- `writing-effective-instructions.md` — instruction quality guidelines
- `validation-checklist.md` — quality checklist before finalizing
- `token-efficiency-criteria.md` — keeping SKILL.md lean
- `structure-organization-criteria.md` — folder and file organization
- `yaml-frontmatter-reference.md` — frontmatter field reference
- `metadata-quality-criteria.md` — metadata quality standards
- `script-quality-criteria.md` — script quality standards
- `troubleshooting-guide.md` — common issues and fixes
- `testing-and-iteration.md` — testing approaches

## Quality Checklist

Before finalizing a skill:

- [ ] Description ≤ 1024 chars, triggers aggressively
- [ ] SKILL.md ≤ 300 lines
- [ ] All script paths use full `.claude/skills/<name>/scripts/` prefix
- [ ] No duplication between SKILL.md and references
- [ ] Concrete examples with exact commands/code
- [ ] Scope declared: "This skill handles X. Does NOT handle Y."
- [ ] Quick validate passes: `python .claude/skills/skill-creator/scripts/quick_validate.py`

## Example: Minimal Valid Skill

```markdown
---
name: my-skill
description: "Use this skill when the user wants to X or Y. Triggers: 'do X', 'help with Y', '.xyz files'. Does NOT handle Z."
---

# My Skill

## What it does
[One paragraph]

## How to use it

Step 1: ...
Step 2: ...

# Example command
# python .claude/skills/my-skill/scripts/run.py input.xyz

## Output
[What the agent produces]
```
