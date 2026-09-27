---
name: thesis-writing-pipeline
description: Route thesis, dissertation, academic writing, literature review, methodology, results, and citation work through evidence, academic-writing, citation verification, and controlled humanization stages.
---

# Thesis-writing pipeline

Use this skill as the single entry point for thesis and dissertation prose. The
UserPromptSubmit hook only routes relevant prompts here; it never executes a
skill itself.

## Operating rules

1. Inspect the request and classify it as: full thesis prose, literature review,
   methodology/system architecture, experimental results, citation-only,
   humanization/audit, or simple grammar correction.
2. Discover available skills by their installed names. Optional skills are
   skipped when absent and the final response names the stages that ran.
3. Never invent references, evidence, experiments, measurements, limitations,
   contributions, or implementation status. Meaning preservation outranks
   naturalness.
4. Freeze citations `[1]`, ranges, DOI strings, author names, years, equations,
   table/figure/section numbers, percentages, measurements, datasets, APIs,
   identifiers, model/framework names, acronyms, and component names during
   every rewrite. Compare the final text against the input before returning it.
5. Keep these distinctions explicit: implemented capability, tested capability,
   and empirically demonstrated outcome.

## Deterministic routing

### Full prose with citations

Run the following sequence, only when each skill exists:

1. `research-writing-skill` for objective, claim inventory, evidence map, and
   assumptions. Use its literature-review capability for related work.
2. `academic-writing` for technical academic prose, calibrated claim strength,
   terminology, numbers, and capability/test/result boundaries.
3. `ref-verify` before humanization. Classify citation support as `VERIFIED`,
   `PARTIALLY_SUPPORTED`, `UNSUPPORTED`, or `UNVERIFIED`; never silently replace
   a questionable reference.
4. `academic-humanizer` when installed, then `humanizer` (the blader/humanizer
   skill) for mechanical LLM-pattern cleanup. The latter is mandatory when
   installed. Use `humanize` only when additional smoothing is necessary.
5. `ai-check` is an audit, not an automatic rewrite pass.
6. `text-humanizer` is the fact/meaning-preservation check when installed.
7. Run `ref-verify` again after all rewriting when the text contains citations,
   reference claims, DOI/author/year claims, or related-work statements.

### Literature review / related work

`research-writing-skill` (literature-review capability) → `academic-writing` →
`ref-verify` → available humanizers/auditors → `ref-verify` again.

### Methodology or system architecture

`research-writing-skill` → `academic-writing` → available academic humanizer →
fact/terminology check. Do not run citation verification unless citations are
present.

### Experimental results

`research-writing-skill` → `academic-writing` → verify every reported number
against supplied evidence → available humanizer/auditor → final fact check.

### Simple grammar correction

Use only the minimum relevant writing skill. Do not invoke the full pipeline.

### Citation-only verification

Use `ref-verify` directly. Do not rewrite prose unless requested.

## Humanizer roles

- `academic-humanizer`: preserve academic register while reducing mechanical prose.
- `humanizer`: remove generic transitions, repetitive structures, synthetic phrasing,
  and other common LLM patterns without changing claims.
- `humanize`: optional natural-language smoothing after the evidence stages.
- `ai-check`: report residual AI-style signals with evidence; do not rewrite by
  default.
- `text-humanizer`: final meaning/fact audit; restore any semantic drift.

Do not repeatedly rewrite already-clear prose merely to satisfy a pattern list.
Do not use Lynote or another multi-LLM translation pipeline automatically; it is
an explicit, user-requested heavy fallback only.

## Final response contract

Return the requested artifact plus a compact verification note. For academic
text, report which stages ran and any citation/fact items classified as
`PARTIALLY_SUPPORTED`, `UNSUPPORTED`, or `UNVERIFIED`. If a required verifier
could not run, say so instead of claiming a pass. If no citation is present,
state that the final citation pass was not applicable.
