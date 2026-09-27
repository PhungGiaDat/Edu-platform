# text-humanizer

**Removes AI tells from text without changing what it says — benchmarked with pre-registered ground truth: the shipping version wins a blind human-ness preference over the un-processed AI text 8–4 while keeping 99.2% of facts intact (detector-API runs pending; see caveats below).** Every humanizer on the market is an unmeasured pattern list. The biggest one (28.6k★) ships 33 patterns and zero numbers: no detector scores, no meaning-preservation check, English only. Paid humanizer SaaS publishes numbers — claimed 99% bypass rates that independent tests measure at ~66%, achieved by paraphrasers that garble facts along the way. This skill is built on the opposite bet: prove the text got more human, and prove it didn't get less true.

Built and bench-tested by [SkillProof](https://skillproof.dev), the tested Claude skills directory.

## What it does differently

We surveyed ~50 humanizer skills in our 16k-skill catalog plus the 28.6k★ market leader before writing this one. Two things showed up in **none** of them as enforceable, verified rules — they are this skill's core:

1. **Meaning and facts frozen.** Numbers, names, quotes, URLs, and the direction and strength of every claim are immutable — "may cause" never becomes "causes". No added anecdotes, no dropped caveats. A mandatory final re-read walks the original claim by claim against the rewrite; any drift gets restored, even at the cost of elegance. Exactly one of ~50 skills even *mentions* meaning preservation; zero verify it. Paid SaaS demonstrably corrupts facts.
2. **Measured, not asserted.** Same 12 AI-generated texts, base-Claude rewrite vs skill rewrite: a reproducible tell-pattern count and blinded AI-likeness judging before and after (free detector APIs were key-gated at run time — see caveats), plus a claim-by-claim meaning audit against pre-registered ground truth and blind preference judging. Results below — negative results included, as with every SkillProof benchmark.

Plus the discipline the pattern lists skip: rewrite-don't-decorate (no fake typos, slang, or invented anecdotes — decoration is its own tell), register match (a legal memo comes back formal, not folksy), deliberate rhythm variance instead of random chopping, stock openers/closers killed at the edges, language-agnostic tell-hunting (the checklist applies in the text's own language, not just English), and a strict output contract: the rewritten text, nothing else.

## Install

```bash
git clone https://github.com/Skillproofdev/text-humanizer ~/.claude/skills/text-humanizer
# restart Claude Code — triggers on "humanize this", "sounds like AI", "make it sound natural"
```

One command — the repo IS the skill.

## Benchmark (measured, not estimated)

Twelve AI-generated texts across genres that stress different failure modes — blog intros, product copy, client emails, technical explainers (fact-dense), a formal memo (register stress), a numbers-heavy summary, one non-English text. Each rewritten twice: a baseline Claude agent told to "rewrite so it doesn't sound AI-generated, keep the meaning", and an identical agent that reads this SKILL.md first. Three metrics: an AI-likeness score before/after, a claim-by-claim meaning audit against pre-registered ground-truth inventories, and blind A/B human-ness preference. **Detector caveat:** the planned free detector APIs (GPTZero, Sapling, ZeroGPT) all required keys or payment at run time (curl-verified, logged in [`bench/scoring.md`](bench/scoring.md)), so AI-likeness below is a blinded in-context LLM judge plus a scripted, reproducible tell-pattern count — not a detector score. Real detector runs are a pending upgrade, not something we fake.

Four SKILL.md versions were benchmarked against the same unchanged baseline. **The first three failed and we're publishing that too** — the method only worked once we inverted it. That honesty is the point of a SkillProof benchmark.

**Five-way totals** (12 texts; base = naive one-line rewrite prompt, v1–v4 = same prompt + successive SKILL.md revisions; **v4 is the shipping version**):

| Metric | Base | v1 | v2 | v3 | **v4 (ships)** |
|--------|------|----|----|----|----------------|
| Mechanical tells left (of 103) | 4 | 4 | 13 | 12 | **2** |
| AI-likeness, median¹ (lower = more human) | 27 | 32.5 | 46.5 | 45 | **26** |
| Claims intact (of 130) | 127 (97.7%) | 127 (97.7%) | 130 (100%) | 130 (100%) | **129 (99.2%)** |
| altered / dropped / added facts | 2 / 1 / 0 | 1 / 2 / 0 | 0 / 0 / 0 | 0 / 0 / 0 | **0 / 1 / 0** |
| Blind human-ness preference (skill W-T-L vs base) | — | 4-0-8 | 0-0-12 | 0-0-12 | **8-0-4** |

¹ Blinded in-context LLM judge (0–100), same model family as the rewriter — labeled honestly, **not a detector**. The planned free detector APIs (GPTZero, Sapling, ZeroGPT) were all key- or payment-gated at run time (curl-verified, [`bench/scoring.md`](bench/scoring.md)); tell counts are the scripted, reproducible metric ([`bench/results/`](bench/results/)). Base's median wobbled 27–30 between rounds — judge variance, disclosed not smoothed.

Read this honestly — the failures are the story:

- **v1 over-corrected with fancier words:** drifted meaning (dropped 2 claims, went corporate-stiff) and lost the blind preference 8–4.
- **v2 / v3 under-corrected surgically:** froze meaning perfectly (130/130) but stayed welded to the source's AI skeleton, so they left 12–13 tells standing and **lost the blind preference 12–0 twice** — reading *more* AI-like than doing nothing.
- **The diagnosis after three losses: the problem is structure, not vocabulary.** The baseline wins by *restructuring* into a human voice; an edit-in-place humanizer can't out-human a free rewrite no matter how clean its word swaps.
- **v4 inverted the core rule — freeze only the claim set, rebuild the structure freely (resequence, merge, new openings, cut scaffolding)** — and it's the first version to win: **blind preference 8–4 over base, AI-likeness tied (26 vs 27), fewest tells of any arm (2).** Crucially, free restructuring did **not** break the facts: 129/130 claims intact, every number/name/date/caveat and the one verbatim quote preserved, 0 altered, 0 added. The single drop was an acronym's full-name gloss ("Proof Key for Code Exchange" → kept "PKCE" and its purpose) — non-load-bearing, and now patched in the re-read step.
- **What we don't claim:** no external detector scores (APIs gated), a single in-context judge from the rewriter's own model family, corpus authored by the same project, and an 8–4 margin with several near-coin-flip texts — a clear win, not a blowout. Treat AI-likeness/preference as directional pending a human-rater or live-detector confirmation; tell-count and claim audit are the solid metrics. Full per-text tables, all five arms, failure logs, and per-claim audits: [`bench/results/verdict.md`](bench/results/verdict.md).

Full corpus, rewrites, detector logs, and claim-audit tables live in [`bench/`](bench/).

## When it triggers

"Humanize this", "this sounds like AI / like ChatGPT", "make it sound human/natural", "remove the AI tells", AI-detection worries, cleaning up an AI-generated draft in any language. Explicitly excluded: writing new content from scratch, translation jobs, non-text tasks.

Two honest boundaries, stated in the skill itself: it will not fabricate humanity (no invented anecdotes or typos), and it will not promise detector results — detectors disagree on 15–25% of texts and false-positive on real human writing. It removes tells; it doesn't sell a guarantee. If your context requires AI disclosure (academic work, publisher policies), disclose — this skill is an editor, not a disguise.

## Why trust this

We test other people's skills for a living ([public methodology](https://skillproof.dev/methodology)). Our own skills get the same treatment — measured benchmarks, negative results included.

More skills from us: [skillproof-skills index](https://github.com/Skillproofdev/skillproof-skills) · Free tools for skill authors: [SKILL.md validator, token calculator, Rules⇄SKILL.md converter](https://skillproof.dev/tools).

## License

MIT — use it, fork it, ship it.
