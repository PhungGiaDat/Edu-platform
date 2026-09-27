# text-humanizer benchmark — arm tasks

Pre-registered 2026-07-10, BEFORE any arm ran. Corpus frozen (SHA-256 below). Do not edit
`bench/materials/` after this point; any change invalidates the run.

## Conditions (two arms per text, 24 runs total)

- **Arm A — baseline:** fresh Claude Sonnet agent. Give it ONLY the prompt below. It must
  NOT read `SKILL.md`.
- **Arm B — skill:** fresh Claude Sonnet agent, identical prompt, but instructed first:
  "Read `/Users/afin/Desktop/SkillProof-GitHub/text-humanizer/SKILL.md` and follow it for
  this task." Skill-reading cost counts as part of the skill run.
- Same model and settings for both arms. One run each, no retries, no cherry-picking.
  Failed/refused runs are reported as failures, not re-rolled.
- Output capture: save Arm A output to `bench/outputs/baseline/NN-<slug>.md` and Arm B to
  `bench/outputs/skill/NN-<slug>.md`, exactly as delivered (including any trailing
  commentary the arm wrongly adds — that is data).

## Paths the arm-agents must NOT open

An arm that reads any of these is contaminated; discard and rerun as a fresh agent:

- `bench/ground-truth/` (any file) — pre-registered claim inventories
- `bench/scoring.md` — scoring procedure
- `bench/tasks.md` — this file
- `bench/outputs/` — the other arm's rewrites
- `/Users/afin/Desktop/Skill Agregator/docs/humanizer-skill-research.md` — benchmark design
- `README.md` of the text-humanizer repo
- Arm A additionally must not open `SKILL.md`; Arm B opens ONLY `SKILL.md` plus its source text.

The only files an arm may read: its one source text under `bench/materials/`, and (Arm B
only) `SKILL.md`.

## Exact prompts (self-contained; paste verbatim, one agent per prompt)

The prompt is identical across texts except the file path. Template:

> Humanize this text — it sounds AI-generated. Rewrite it so it reads like a competent
> human wrote it, keeping the meaning. The text is in the file:
> `/Users/afin/Desktop/SkillProof-GitHub/text-humanizer/bench/materials/<FILE>`
> Reply with the rewritten text only.

### Task 1 — blog intro, remote work
Humanize this text — it sounds AI-generated. Rewrite it so it reads like a competent human wrote it, keeping the meaning. The text is in the file: `/Users/afin/Desktop/SkillProof-GitHub/text-humanizer/bench/materials/01-blog-remote-work.md` Reply with the rewritten text only.

### Task 2 — blog intro, coffee brewing
Humanize this text — it sounds AI-generated. Rewrite it so it reads like a competent human wrote it, keeping the meaning. The text is in the file: `/Users/afin/Desktop/SkillProof-GitHub/text-humanizer/bench/materials/02-blog-coffee-brewing.md` Reply with the rewritten text only.

### Task 3 — product copy, note-taking app
Humanize this text — it sounds AI-generated. Rewrite it so it reads like a competent human wrote it, keeping the meaning. The text is in the file: `/Users/afin/Desktop/SkillProof-GitHub/text-humanizer/bench/materials/03-product-notetaking-app.md` Reply with the rewritten text only.

### Task 4 — product copy, fitness tracker
Humanize this text — it sounds AI-generated. Rewrite it so it reads like a competent human wrote it, keeping the meaning. The text is in the file: `/Users/afin/Desktop/SkillProof-GitHub/text-humanizer/bench/materials/04-product-fitness-tracker.md` Reply with the rewritten text only.

### Task 5 — business email, project delay
Humanize this text — it sounds AI-generated. Rewrite it so it reads like a competent human wrote it, keeping the meaning. The text is in the file: `/Users/afin/Desktop/SkillProof-GitHub/text-humanizer/bench/materials/05-email-project-delay.md` Reply with the rewritten text only.

### Task 6 — business email, demo follow-up
Humanize this text — it sounds AI-generated. Rewrite it so it reads like a competent human wrote it, keeping the meaning. The text is in the file: `/Users/afin/Desktop/SkillProof-GitHub/text-humanizer/bench/materials/06-email-demo-followup.md` Reply with the rewritten text only.

### Task 7 — technical explainer, Docker
Humanize this text — it sounds AI-generated. Rewrite it so it reads like a competent human wrote it, keeping the meaning. The text is in the file: `/Users/afin/Desktop/SkillProof-GitHub/text-humanizer/bench/materials/07-explainer-docker.md` Reply with the rewritten text only.

### Task 8 — technical explainer, OAuth
Humanize this text — it sounds AI-generated. Rewrite it so it reads like a competent human wrote it, keeping the meaning. The text is in the file: `/Users/afin/Desktop/SkillProof-GitHub/text-humanizer/bench/materials/08-explainer-oauth.md` Reply with the rewritten text only.

### Task 9 — legal-ish memo, data retention (register stress)
Humanize this text — it sounds AI-generated. Rewrite it so it reads like a competent human wrote it, keeping the meaning. The text is in the file: `/Users/afin/Desktop/SkillProof-GitHub/text-humanizer/bench/materials/09-memo-data-retention.md` Reply with the rewritten text only.

### Task 10 — LinkedIn post, failed launch
Humanize this text — it sounds AI-generated. Rewrite it so it reads like a competent human wrote it, keeping the meaning. The text is in the file: `/Users/afin/Desktop/SkillProof-GitHub/text-humanizer/bench/materials/10-linkedin-failed-launch.md` Reply with the rewritten text only.

### Task 11 — news-style earnings summary (immutability stress)
Humanize this text — it sounds AI-generated. Rewrite it so it reads like a competent human wrote it, keeping the meaning. The text is in the file: `/Users/afin/Desktop/SkillProof-GitHub/text-humanizer/bench/materials/11-news-earnings-summary.md` Reply with the rewritten text only.

### Task 12 — Russian blog intro (multilingual stress)
Humanize this text — it sounds AI-generated. Rewrite it so it reads like a competent human wrote it, keeping the meaning. The text is in the file: `/Users/afin/Desktop/SkillProof-GitHub/text-humanizer/bench/materials/12-blog-remote-work-ru.md` Reply with the rewritten text only.

## Frozen corpus — SHA-256 (2026-07-10)

```
2a058d390568b14d6b1efdaec6849e2a281becc4ece0133a794549cd5da1c1fd  01-blog-remote-work.md
ab959cac395109e4de47a7f027f8c2333e4635f26af57059e107cf8592c8b644  02-blog-coffee-brewing.md
f3ae3e630931fdc4861ef1c2121e239b4ffb748fbf5231e2ed07a05bf6c70dfe  03-product-notetaking-app.md
74b3fda79ba021e7455a0a5a17e6072d82ed002a0f11cce3e5823be194cb2cac  04-product-fitness-tracker.md
87c8cb38cf01524ac229f685b8347937a6318db6de31709823ae5902a4ee6864  05-email-project-delay.md
8386565ded1f8048fdda3d7c1d8830e3454459ff4dc96d241faf67a1c501ecd1  06-email-demo-followup.md
1df130da425ecc329b3f15f9c0496a82205cc51f18c5c19e0058b913e3361781  07-explainer-docker.md
bc5f7ba62defd7f33c2b36f9efb7586790111afb529f3833837ca7a22d4425c9  08-explainer-oauth.md
8a623f8ada525fd314ee2de2732ae4f42d5a435f2c164cfa491629d5ad34725b  09-memo-data-retention.md
96ad3f4ba0ad379dce0ed42808c65dc9bc877cf6296195b57922eca6fa172f71  10-linkedin-failed-launch.md
4bd8c05199f21525db17d695ac96ec1d5576147f4b96fe72258d344b60e80868  11-news-earnings-summary.md
4a93f6fb56646f86e4c572d10a6ac6eaf244d8187d7e9b97a886f0c4b34b3a31  12-blog-remote-work-ru.md
```

Verify before running: `cd bench/materials && shasum -a 256 -c ../corpus.sha256` (or compare
against the block above).

## Corpus provenance (disclosed in README)

All 12 texts were generated 2026-07-10 by Claude (Fable 5) deliberately writing in
default-assistant style, per the benchmark design's corpus spec (genres, lengths 150–400
words, natural AI tells: stock openers/closers, rule of three, negative parallelism,
vocabulary tells, uniform rhythm, vague attribution). All entities, figures, and quotes in
the corpus are fictional and exist only as rewrite-immutability targets. Claim inventories
in `bench/ground-truth/` were registered the same day, before any arm ran.
