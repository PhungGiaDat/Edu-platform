# text-humanizer benchmark — scoring procedure

Pre-registered 2026-07-10, before any arm ran. Three metrics, scored in this order per text:
B (meaning) → A (AI-likeness) → C (preference). A rewrite that fails B is reported with its
A and C scores anyway — no hiding failures.

---

## Metric A — AI-likeness

### Detector availability — verified 2026-07-10 (curl, sample: `materials/01-blog-remote-work.md`)

| Detector | Endpoint tested | Result | Verdict |
|----------|-----------------|--------|---------|
| GPTZero | `POST https://api.gptzero.me/v2/predict/text` (no key, then with browser-origin headers) | `{"error":"Require login or API key"}` both times | NOT queryable without an account/API key |
| Sapling | `POST https://api.sapling.ai/api/v1/aidetect` (no key; key `"free"`) | `{"msg":"Missing API key."}` / `{"msg":"Invalid API key."}` | NOT queryable without an API key |
| ZeroGPT | `POST https://api.zerogpt.com/api/detect/detectText` (with site Origin header) | `{"success":false,"code":403,"message":"Please make a purchase..."}` | API is paid-only |
| Web UIs (GPTZero, QuillBot, Sapling, ZeroGPT) | — | Exist, but browser-only and bot-gated; not scriptable from this environment | Human-operator only |

**Verdict: no AI detector is scriptably queryable from this environment right now without
credentials.** Therefore Metric A runs in two tiers:

### Tier A1 (primary, always runs) — blinded LLM-judge AI-likeness rubric

This is an LLM-judge score, NOT a detector score, and must be labeled exactly that way in
the README (e.g., "AI-likeness (blinded LLM judge, 0–100; lower = more human) — no external
detector was scriptable at run time"). Never present these numbers as GPTZero/detector
results.

Procedure per text (3 items: source, baseline rewrite, skill rewrite):

1. Strip all labels. Assign each item a random ID (`T1`,`T2`,`T3`) using Python
   `random.Random(20260710 + text_number)` — deterministic, auditable shuffle.
2. Three independent fresh judge sessions per item (nine judge calls per text). Judge model
   MUST differ from the rewriter model (rewriter: Claude Sonnet → judge: Claude Opus or
   Haiku; record exact model IDs in the results CSV). Judges get no conversation history,
   no file access, only the prompt below.
3. Judge prompt (verbatim):

   > Rate how likely this text is to be AI-generated, 0–100 (0 = certainly a competent
   > human wrote it, 100 = certainly raw LLM output). Base your score only on observable
   > features: stock openers/closers, "not X but Y" constructions, triple lists, inflated
   > significance language, uniform sentence and paragraph rhythm, signposting, vague
   > attributions, AI-typical vocabulary. Do not reward informality as such — a formal memo
   > written like a competent lawyer scores low. Reply with exactly two lines:
   > `SCORE: <integer 0-100>` and `TELLS: <the 3 strongest features you saw, comma-separated,
   > or "none">`.

4. Record all nine raw scores; per item report the **median of 3 judges**. No averaging
   across items or texts at this stage.
5. Sanity anchor: the source texts were written to be maximally AI-typical; if a judge
   scores a source below 60, flag that judge's triplet as low-confidence in the results
   table (do not discard — report it).

Mechanical companion (objective, reproducible): a tell-count per item — count of Rule 1
checklist hits (vocabulary tells from the SKILL.md list, "not X but Y", "In conclusion"/
"Let's dive in"/"It's important to note", "from X to Y" false ranges) via case-insensitive
grep. Report raw counts alongside judge scores. Crude, but not a judgment call.

### Tier A2 (optional, human operator) — real detector runs

If/when the operator has a GPTZero API key (free tier after signup, 10k words/mo) or runs
the web UIs by hand: run source, baseline, and skill outputs through 2–3 detectors,
screenshot each result, save to `bench/detector-runs/`, record scores in
`bench/results/detectors.csv` (columns: text_id, condition, detector, score, date, method).
Rules from the design doc apply: report every detector per text, never average across
detectors; "passed" = majority-human verdict on ≥2 of 3 detectors. If Tier A2 never runs,
the README says so plainly.

---

## Metric B — meaning-preservation audit

Auditor: a separate fresh agent (not the rewriter of either arm, no access to this file's
Metric A/C sections needed). Per rewrite:

1. Auditor reads the source text, the pre-registered claim inventory
   `bench/ground-truth/NN-<slug>.md`, and one rewrite.
2. For each claim ID, the auditor finds it in the rewrite and labels it:
   - `intact` — value, direction, and strength survived (rewording is fine)
   - `altered` — number/name/date/quote changed, qualifier dropped or hardened, direction
     or strength shifted
   - `dropped` — claim absent from the rewrite
   - `added` — (row appended per finding) a fact/example/anecdote/statistic/opinion the
     source did not state
3. Auditor quotes the exact rewrite sentence for every non-`intact` label. No verdicts
   without quotes.
4. Score per rewrite = % `intact` of the inventory. Any `altered` or `added` = hard failure
   for that text (the text cannot "pass" overall regardless of Metrics A/C), listed verbatim
   in the report.
5. Register/language check (recorded per rewrite, separate from claim score): 09 stays a
   formal memo; 05/06 stay professional emails; 12 stays in Russian. Violation = register
   failure flag.
6. Audit both arms with the same auditor session per text, arms presented in randomized
   order and unlabeled ("Rewrite X"/"Rewrite Y", mapping stored in
   `bench/results/blinding-map.json`), so the auditor cannot favor the skill arm.

Output: `bench/results/claims-NN.md` per text + summary CSV (text_id, condition,
claims_total, intact, altered, dropped, added, register_ok).

## Metric C — blind human-ness preference

1. Per text: baseline rewrite vs skill rewrite. Strip labels; order (which is "A") from
   `random.Random(920260710 + text_number).random() < 0.5` — recorded in the blinding map.
2. Three independent fresh LLM-judge sessions (same judge-model rule as Metric A; judges
   who scored Metric A for a text must be fresh sessions here). Human raters replace LLM
   judges where available — the README labels each round "human raters" or "LLM judges
   (blind)"; never pass LLM judges off as humans.
3. Judge prompt (verbatim):

   > Which of these two texts reads more like a competent human wrote it? Answer with
   > exactly `A` or `B` on the first line, then one sentence explaining the single biggest
   > reason.

4. Majority vote of 3 = the text's preference verdict. Report skill win-rate /12 and every
   judge's reason verbatim in `bench/results/preference.md`. Ties impossible (3 votes,
   forced binary); a judge refusing to pick counts as a non-vote and is reported — if
   non-votes break the majority, the text is scored "no verdict".

---

## Reporting

`bench/results/` gets: detector/judge CSVs, claim audits, preference transcripts,
blinding-map.json. README receives `{{BENCH_TABLE}}` (per text: AI-likeness before/after per
arm, claims-intact %, hard failures, preference) and `{{BENCH_SUMMARY}}` (medians across 12
texts + honest reading). Negative results, judge disagreements, and any skill-arm failure
are published verbatim. Nothing is rerun to get a better number.
