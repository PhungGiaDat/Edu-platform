# Benchmark verdict — text-humanizer

> **FINAL 2026-07-10 (v4 re-test) — verdict: SHIP (v4).** After v1–v3 all lost the blind
> human-ness preference (8-0 / 12-0 / 12-0) by staying welded to the AI skeleton, v4 inverted
> the rule — freeze only the claim set, rebuild structure freely — and **won the blind
> preference 8–4 while keeping facts 99.2% intact** (0 altered, 0 added, 1 dropped acronym
> gloss). Full v4 section at the very bottom of this file. The v2/v3 notes and the v1 scoring
> below are kept for the record.
>
> **UPDATE 2026-07-10 (v2 re-test) — verdict: DO-NOT-SHIP.** After the v1 loss below,
> SKILL.md was rewritten toward surgical/minimal edits. The v2 skill arm
> (`results/skill-v2.md`) was re-scored against the unchanged base. It **fixed meaning
> preservation completely (130/130 claims intact, 100%) but lost the blind human-ness
> preference 12–0 and scored WORSE on AI-likeness and tell-count than both base and v1** —
> the minimal-edit rule now under-corrects, leaving classic tells standing. Full v2 section
> at the bottom of this file. The rest of this document is the original v1 scoring.

Scored 2026-07-10 per `bench/scoring.md`. Arms: `results/base.md` (naive prompt) vs
`results/skill.md` (v1, same prompt + SKILL.md). 12 texts, 24 rewrites.

## Method actually used (limitations first)

- **No external AI detector ran.** GPTZero and Sapling APIs require keys; ZeroGPT's API is
  paid-only (all curl-verified 2026-07-10, see `bench/scoring.md`). Tier A2 (manual web-UI
  detector runs) has NOT been performed. AI-likeness below is **Tier A1: in-context blinded
  judging by the scoring agent itself** (Claude Fable 5) — not a detector, not an independent
  judge session, and the same model family as the rewriter. Labeled accordingly everywhere.
- **Blinding:** arms were shuffled A/B per task by seeded script
  (`results/blinded.md`, map in `results/blinding-map.json`); scores were recorded before
  unblinding. **Compromise disclosure:** before blinding, the scorer had incidentally read
  the base arm's tasks 1–2 while inspecting file structure, so tasks 1–2 were effectively
  unblinded (both went to skill). Preference is reported with and without them.
- **Corpus authorship:** the scorer also authored the 12 source texts (they were written to
  be maximally AI-typical). Source AI-likeness scores are anchors, not findings.
- The mechanical tell-count (scripted, reproducible: `results/tell-counts.json`) and the
  claim audit against pre-registered inventories in `bench/ground-truth/` are the most
  objective numbers here.

## Per-text results

Tells = mechanical Rule-1 pattern count (orig → base / skill). AI-like = blinded in-context
judge, 0–100, lower = more human. Claims = intact/total (a=altered, d=dropped, +=added).

| # | Text | Tells o→b/s | AI-like b/s | Blind pref | Claims base | Claims skill |
|---|------|------------|-------------|------------|-------------|--------------|
| 1 | blog, remote work | 19→0/0 | 40/30 | skill † | 10/10 | 9/10 (1d) |
| 2 | blog, coffee | 12→1/0 | 35/25 | skill † | 8/9 (1a, minor) | 9/9 |
| 3 | product, note app | 10→0/0 | 30/40 | base | 11/11 | 11/11 |
| 4 | product, tracker | 8→0/0 | 30/35 | base | 12/12 | 12/12 |
| 5 | email, delay | 5→0/0 | 20/35 | base | 12/12 | 12/12 |
| 6 | email, follow-up | 2→0/0 | 20/35 | base | 12/13 (1a) | 13/13 |
| 7 | explainer, Docker | 10→0/0 | 35/30 | skill | 9/9 | 9/9 |
| 8 | explainer, OAuth | 8→0/0 | 25/30 | base | 9/10 (1d) | 10/10 |
| 9 | memo, retention | 7→0/0 | 25/20 | skill | 11/11 | 11/11 |
| 10 | LinkedIn, failure | 7→1/1 | 35/45 | base | 10/10 | 10/10 |
| 11 | earnings summary | 6→1/2 | 25/25 | base | 13/13 | 13/13 |
| 12 | blog RU | 9→1/1 | 30/38 | base | 10/10 | 8/10 (1a, 1d) |

† blinding compromised (see above); both compromised tasks fell to skill.

## Totals

| Metric | Source | Base arm | Skill arm |
|--------|--------|----------|-----------|
| Mechanical tells (sum, 12 texts) | 103 | 4 | 4 |
| AI-likeness, median (in-context blind judge) | 85 | 30 | 32.5 |
| Claims intact | — | 127/130 (97.7%) | 127/130 (97.7%) |
| altered / dropped / added | — | 2a / 1d / 0+ | 1a / 2d / 0+ |
| Texts 100% intact | — | 9/12 | 10/12 |
| Texts with hard failures (altered/added) | — | 2 (T2, T6) | 1 (T12) |
| Blind preference (of 12) | — | 8 | 4 |
| Blind preference excl. compromised T1–T2 | — | 8 | 2 |

## Failure log (verbatim, per pre-registration)

**Base arm:**
- T2/C7 altered (minor): "Beans start losing their aroma within **about** two weeks" — hedge
  added to a pre-registered value ("within two weeks").
- T6/C4 altered: value-prop triple reduced — "streamline incident response" is gone ("cut
  down on data downtime and free up your engineers from firefighting").
- T8/C1 dropped: "industry-standard protocol for delegated authorization" status claim absent.

**Skill arm:**
- T1/C10 dropped: audience sentence (seasoned + beginners) deleted entirely.
- T12/C8 altered: leadership triple reduced — "мотивированными" dropped ("оставались
  сплочёнными и вовлечёнными").
- T12/C10 dropped: audience sentence deleted (same deletion pattern as T1).

Register/language: both arms kept the memo formal (T9), emails professional (T5/T6), and
T12 in Russian. No fabricated anecdotes, typos, or statistics in either arm. Quote and every
number in T11 survived verbatim in both arms.

## Honest reading

1. **Both arms flatten the mechanical tells** (103 → 4 vs 4). Against a competent naive
   baseline of the same model, the skill adds nothing measurable on tell removal.
2. **Meaning preservation tied at 97.7%**, with different failure shapes: the skill arm had
   fewer hard failures (1 text vs 2) and more fully-intact texts (10 vs 9), but its
   aggressive filler-deletion rule cost it two pre-registered claims (the audience framing
   in T1 and T12) — Rule 2's "delete filler" collided with Rule 3's "drop nothing".
   The skill did NOT hit its own 100%-intact target on all 12.
3. **Blind preference went to the baseline, 8–4** (8–2 excluding the compromised pairs).
   The judge's recurring reason: baseline rewrites kept a light human framing (audience
   asides, transitions) that the skill arm's stricter deletion produced tighter but flatter
   text; the skill also left original tells standing more often in T3/T10 headers/hashtags.
4. **What this run cannot claim:** no external detector scores (API access unavailable);
   single in-context judge from the rewriter's own model family; corpus authored by the
   scorer. Treat AI-likeness and preference as directional, the tell-count and claim audit
   as solid.

**Verdict: on this run the skill proves its meaning-discipline edge only weakly (fewer hard
failures, but two claim drops of its own) and loses the human-ness preference to the naive
baseline. Not a marketing result — a to-fix list: reconcile Rule 2 vs Rule 3 on deleting
audience/framing sentences, and re-run with real detector access and independent judges.**

---

# v2 RE-TEST — skill-v2 vs unchanged base (2026-07-10)

Re-scored after SKILL.md was rewritten (root cause of the v1 loss diagnosed as
over-correction: wholesale rewriting, register escalation, choppy rhythm, the skill's own
tics; v2 aims for surgical minimal edits that keep readability). Base arm unchanged
(`results/base.md`); new skill output `results/skill-v2.md`. Same method as v1: scripted
tell-count (`results/tell-counts-v2.json`), blinded in-context AI-likeness judging
(`results/blinded-v2.md`, map `results/blinding-map-v2.json`, scores recorded before
unblinding), claim audit against the pre-registered inventories in `bench/ground-truth/`.

Same honesty caveats as v1: no external detector ran (APIs key/paid-gated); the AI-likeness
judge is the scoring agent itself (same model family as the rewriter), not an independent
detector; the corpus was authored by the scorer. Tell-count and claim audit are the objective
metrics. This blind round was clean — no incidental pre-exposure (unlike v1's tasks 1–2).

## Per-text (base vs skill-v2)

AI-like = blinded in-context judge, 0–100, lower = more human. Pref = which arm the blind
judge picked as more human.

| # | Text | Tells base/v2 | AI-like base/v2 | Blind pref | Claims base | Claims skill-v2 |
|---|------|---------------|-----------------|------------|-------------|-----------------|
| 1 | blog, remote work | 0 / 4 | 30 / 65 | base | 10/10 | 10/10 |
| 2 | blog, coffee | 1 / 1 | 30 / 40 | base | 8/9 (1a) | 9/9 |
| 3 | product, note app | 0 / 1 | 28 / 45 | base | 11/11 | 11/11 |
| 4 | product, tracker | 0 / 2 | 30 / 50 | base | 12/12 | 12/12 |
| 5 | email, delay | 0 / 1 | 25 / 55 | base | 12/12 | 12/12 |
| 6 | email, follow-up | 0 / 0 | 25 / 55 | base | 12/13 (1a) | 13/13 |
| 7 | explainer, Docker | 0 / 0 | 30 / 45 | base | 9/9 | 9/9 |
| 8 | explainer, OAuth | 0 / 0 | 28 / 40 | base | 9/10 (1d) | 10/10 |
| 9 | memo, retention | 0 / 0 | 28 / 45 | base | 11/11 | 11/11 |
| 10 | LinkedIn, failure | 1 / 1 | 32 / 48 | base | 10/10 | 10/10 |
| 11 | earnings summary | 1 / 2 | 25 / 30 | base | 13/13 | 13/13 |
| 12 | blog RU | 1 / 1 | 28 / 40 | base | 10/10 | 10/10 |

## Three-way totals (base vs skill-v1 vs skill-v2)

| Metric | Base | Skill v1 | Skill v2 |
|--------|------|----------|----------|
| Mechanical tells (sum, orig=103) | 4 | 4 | **13** |
| AI-likeness, median (in-context blind) | 28¹ | 32.5 | **46.5** |
| Claims intact (of 130) | 127 (97.7%) | 127 (97.7%) | **130 (100%)** |
| altered / dropped / added | 2a / 1d / 0 | 1a / 2d / 0 | **0 / 0 / 0** |
| Texts 100% intact | 9/12 | 10/12 | **12/12** |
| Blind human-ness preference | — | base 8 : v1 4 | **base 12 : v2 0** |

¹ Base was re-judged fresh in the v2 round at median 28; in the v1 round the same base arm
scored median 30. The ~2-point drift is in-context-judge variance (disclosed, not smoothed) —
another reason these AI-likeness numbers are directional, not detector-grade. Preference and
tell-count, the load-bearing metrics, are unaffected.

## Did v2 flip the loss? No — it got worse on human-ness.

- **Meaning preservation: fully fixed.** 130/130 claims intact, zero altered/dropped/added,
  12/12 texts perfect. The two v1 drops (the audience-framing sentence in T1 and
  "мотивированными" in T12) both survive in v2. Quote in T11 verbatim, every number intact.
  This is the one thing v2 nailed.
- **Human-ness: regressed hard. Blind preference base 12 : skill-v2 0 — the skill lost every
  single text.** v1 lost 8–4; v2 lost 12–0.
- **Tell removal regressed too:** 13 residual tells vs base's 4 (and v1's 4). The surgical
  rule now under-edits — v2 left "cornerstone / paradigm shift / thrive in the evolving world
  of work" (T1), "personal health command center / paints a comprehensive picture" (T4),
  "I hope this email finds you well" (T5/T6), "serves to inform / play a central role" (T9)
  standing. The blind judge flagged exactly these and rated v2 markedly more AI-like
  (median 46.5 vs base 28).
- **Root cause of the new failure:** the over-correction fix overshot. v1 rewrote too
  aggressively (drifted meaning, went corporate-stiff); v2 edits too timidly (preserves
  meaning perfectly but preserves the tells with it). Neither version beats a competent naive
  prompt on human-ness. The target — remove tells *and* keep facts *and* read more human than
  baseline — was hit by neither.

**Verdict: DO-NOT-SHIP.** v2 trades v1's meaning drift for tell-retention and a total
preference loss (0/12). Shipping it would mean shipping a humanizer that reads *more*
AI-generated than doing nothing but a one-line prompt. The fix is a middle setting between
v1 and v2: remove the named tells (v1's strength) without wholesale restructuring or register
escalation (v2's strength), then re-run. Do not ship until the skill arm at minimum wins the
blind preference against base.

---

# v3 RE-TEST — skill-v3 vs unchanged base (2026-07-10) — FINAL ATTEMPT

v3 added a tell→plain-word replacement table plus a zero-tolerance re-scan gate ("remove
EVERY tell, replace *plainer* never fancier") to fix v1's fancy-word over-correction and
v2's tell-retention. Base unchanged; new output `results/skill-v3.md`. Same method: scripted
tell-count (`results/tell-counts-v3.json`), blinded in-context AI-likeness judging
(`results/blinded-v3.md`, map `blinding-map-v3.json`, `aijudge-v3.json`; scored before
unblinding), claim audit vs pre-registered inventories. Same caveats as before (no external
detector reachable; in-context judge from the rewriter's model family; scorer-authored corpus).

## Per-text (base vs skill-v3)

| # | Text | Tells base/v3 | AI-like base/v3 | Blind pref | Claims base | Claims v3 |
|---|------|---------------|-----------------|------------|-------------|-----------|
| 1 | blog, remote work | 0 / 2 | 28 / 40 | base | 10/10 | 10/10 |
| 2 | blog, coffee | 1 / 1 | 28 / 38 | base | 8/9 (1a) | 9/9 |
| 3 | product, note app | 0 / 0 | 28 / 45 | base | 11/11 | 11/11 |
| 4 | product, tracker | 0 / 4 | 30 / 55 | base | 12/12 | 12/12 |
| 5 | email, delay | 0 / 1 | 25 / 55 | base | 12/12 | 12/12 |
| 6 | email, follow-up | 0 / 0 | 25 / 50 | base | 12/13 (1a) | 13/13 |
| 7 | explainer, Docker | 0 / 0 | 28 / 45 | base | 9/9 | 9/9 |
| 8 | explainer, OAuth | 0 / 0 | 28 / 42 | base | 9/10 (1d) | 10/10 |
| 9 | memo, retention | 0 / 0 | 28 / 45 | base | 11/11 | 11/11 |
| 10 | LinkedIn, failure | 1 / 1 | 32 / 45 | base | 10/10 | 10/10 |
| 11 | earnings summary | 1 / 2 | 26 / 32 | base | 13/13 | 13/13 |
| 12 | blog RU | 1 / 1 | 28 / 42 | base | 10/10 | 10/10 |

## Four-way totals (base vs v1 vs v2 vs v3)

| Metric | Base | Skill v1 | Skill v2 | Skill v3 |
|--------|------|----------|----------|----------|
| Mechanical tells left (orig=103) | 4 | 4 | 13 | 12 |
| AI-likeness, median (in-context blind) | 28 | 32.5 | 46.5 | 45 |
| Claims intact (of 130) | 127 (97.7%) | 127 (97.7%) | 130 (100%) | 130 (100%) |
| altered / dropped / added | 2 / 1 / 0 | 1 / 2 / 0 | 0 / 0 / 0 | 0 / 0 / 0 |
| Texts 100% intact | 9/12 | 10/12 | 12/12 | 12/12 |
| Blind preference vs base (W-T-L for skill) | — | 4-0-8 | 0-0-12 | **0-0-12** |

## Did v3 beat base? No.

- **Meaning preservation: still perfect.** 130/130 claims intact, zero altered/dropped/added,
  12/12 texts clean, quote and all numbers verbatim. v3 holds v2's one real gain.
- **Human-ness: still lost, 12–0.** The blind judge preferred the un-processed base on every
  single text for the third version running. AI-likeness median 45 vs base's 28 — v3 reads
  markedly *more* machine-made than doing nothing but a one-line rewrite prompt.
- **The tell table didn't fix the real problem.** v3 swapped some vocabulary (v2's 13
  residual tells → 12) but the loss isn't about word choice. Base *restructures* into a human
  voice (varied rhythm, openings that start inside the subject, dropped promo scaffolding);
  all three skill versions stay welded to the source's AI *structure* — topic-sentence
  openers, uniform paragraph shape, rule-of-three, promotional product-copy framing (T4 kept
  "personal health command center / paints a comprehensive picture", T5 kept "I hope this
  email finds you well / at your earliest convenience"). Plainer words on an AI skeleton still
  reads AI.
- **The core tension is now demonstrated three times:** the skill's meaning-freeze discipline
  (its unique selling point) keeps it hugging the original so closely that it can't out-human
  a free rewrite. Fact-safety and human-ness are pulling against each other, and structural
  fidelity is losing the reader every time.

**Verdict: DO-NOT-SHIP.** Three versions, zero blind-preference wins against the raw baseline
(cumulative 0-0-32 across v2+v3, 4-0-28 including v1). The ship bar — win or clearly tie the
blind preference — was not met, and was not close. A humanizer that a blind reader prefers the
*un-processed* version of, on 12 texts out of 12, should not ship. What the data says to try
next: let the skill restructure (vary rhythm, rebuild openers, strip promo scaffolding) the
way base does, while keeping the claim-freeze re-read as the guardrail — i.e. move the
constraint from "edit minimally" to "rewrite freely, then prove no claim moved." Until a
revision actually wins blind reads, hold.

---

# v4 RE-TEST — skill-v4 vs unchanged base (2026-07-10) — the method inversion that worked

v1–v3 all stayed welded to the source's AI skeleton (surgical/in-place edits) and lost the
blind preference 8-0 / 12-0 / 12-0. v4 inverts the core rule: **freeze only the claim set**
(facts, numbers, names, quotes, caveats) and **rebuild structure freely** — resequence, merge,
new openings, drop scaffolding — exactly what the winning baseline does. Base unchanged; new
output `results/skill-v4.md`. Same method + caveats as prior rounds (scripted tell-count
`tell-counts-v4.json`; blinded in-context AI-likeness judging `blinded-v4.md` /
`blinding-map-v4.json` / `aijudge-v4.json`, scored before unblinding; claim audit vs the
pre-registered `bench/ground-truth/` inventories — extra-strict this round because free
restructuring is the classic way to drift facts).

## Per-text (base vs skill-v4)

| # | Text | Tells base/v4 | AI-like base/v4 | Blind pref | Claims base | Claims v4 |
|---|------|---------------|-----------------|------------|-------------|-----------|
| 1 | blog, remote work | 0 / 0 | 25 / 28 | base | 10/10 | 10/10 |
| 2 | blog, coffee | 1 / 0 | 28 / 24 | **v4** | 8/9 (1a) | 9/9 |
| 3 | product, note app | 0 / 0 | 28 / 32 | base | 11/11 | 11/11 |
| 4 | product, tracker | 0 / 0 | 30 / 26 | **v4** | 12/12 | 12/12 |
| 5 | email, delay | 0 / 0 | 26 / 25 | **v4** | 12/12 | 12/12 |
| 6 | email, follow-up | 0 / 0 | 26 / 28 | base | 12/13 (1a) | 13/13 |
| 7 | explainer, Docker | 0 / 0 | 30 / 26 | **v4** | 9/9 | 9/9 |
| 8 | explainer, OAuth | 0 / 0 | 26 / 27 | base | 9/10 (1d) | 9/10 (1d) |
| 9 | memo, retention | 0 / 0 | 28 / 24 | **v4** | 11/11 | 11/11 |
| 10 | LinkedIn, failure | 1 / 1 | 34 / 28 | **v4** | 10/10 | 10/10 |
| 11 | earnings summary | 1 / 1 | 26 / 24 | **v4** | 13/13 | 13/13 |
| 12 | blog RU | 1 / 0 | 26 / 26 | **v4** | 10/10 | 10/10 |

## Five-way totals (base vs v1 vs v2 vs v3 vs v4)

| Metric | Base | v1 | v2 | v3 | v4 |
|--------|------|----|----|----|----|
| Mechanical tells left (orig=103) | 4 | 4 | 13 | 12 | **2** |
| AI-likeness, median (in-context blind) | 27 | 32.5 | 46.5 | 45 | **26** |
| Claims intact (of 130) | 127 (97.7%) | 127 (97.7%) | 130 (100%) | 130 (100%) | **129 (99.2%)** |
| altered / dropped / added | 2 / 1 / 0 | 1 / 2 / 0 | 0 / 0 / 0 | 0 / 0 / 0 | **0 / 1 / 0** |
| Texts 100% intact | 9/12 | 10/12 | 12/12 | 12/12 | 11/12 |
| Blind preference (skill W-T-L vs base) | — | 4-0-8 | 0-0-12 | 0-0-12 | **8-0-4** |

## Did v4 beat base without breaking facts? Yes — both.

- **Human-ness: v4 WON the blind preference 8–4** (first version to beat base at all; v1–v3
  went 4/0/0 wins). AI-likeness median essentially tied (v4 26 vs base 27), tells the lowest
  of any arm (2). The judge's reasons for v4 wins: cold opens that start inside the subject
  (T7 drops the throat-clearing intro; T11 leads with the revenue figure like a real wire
  lede), prose that merges listy scaffolding (T10), tightened register that still fits genre
  (T9 memo stays formal, T5 email stays professional).
- **Facts: essentially intact — 129/130 (99.2%), 0 altered, 0 added, 0 caveats lost.** Every
  number, name, date, price, and the T11 CEO quote survived verbatim; load-bearing qualifiers
  held ("up to 4%", the litigation-hold exception, "usually about an hour", "roughly 10
  hours"). The three-pillar/four-variable lists and claim directions (margin narrowed,
  guidance raised, containers-beat-VMs) all held under free resequencing.
- **The single miss:** T8 (OAuth) dropped the acronym expansion "Proof Key for Code Exchange"
  — v4 kept "the PKCE extension" and its purpose but not the full-name gloss. Counted here as
  1 dropped, strictly, for honesty. It is an explanatory gloss, not a number/name/date/quote/
  caveat; no claim drifted. This is the failure mode the free-restructure rule risks, and it
  showed up once in 130 claims — small, and worth a one-line note in the skill's re-read step
  ("keep acronym expansions") rather than a blocker.
- **Honesty on the margins:** the win is real but not a blowout. Several texts were near
  coin-flips (T5 25 vs 26, T8 26 vs 27, T12 26 vs 26), and this is in-context single-judge
  scoring from the rewriter's own model family, not an external detector — treat the 8–4 as
  "v4 clears the bar," not "v4 dominates." A human-rater or real-detector round is the
  recommended confirmation before publishing the number as final.

**Verdict: SHIP (v4).** It meets the pre-set bar — won the blind human-ness preference (8–4,
where every prior version lost) AND kept facts essentially intact (99.2%, the lone drop a
non-load-bearing acronym gloss, zero altered/added, zero caveats lost). The method inversion
was the fix: freeze the claim set, rebuild the structure. Recommended follow-ups before
calling the benchmark final: (1) add "preserve acronym expansions" to the claim-freeze
re-read to close the T8 gap; (2) confirm the preference margin with human raters or a live
detector when access is available.
