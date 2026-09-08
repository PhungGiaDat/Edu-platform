---
name: 'review'
description: 'Adversarial code review intended to be run with a DIFFERENT model than the one that wrote the code. Checks implementation against the specification, hunts for untested edge cases, and reports findings without fixing them. Use after tests are green and before you call something done.'
---

# Second-Model Review

You are reviewing code that another model wrote.

## Switch model first

**This review is close to worthless if you are the same model that wrote the
code.** A model reviewing its own output carries the same blind spots that
produced the bug — it will confidently miss the same thing twice, because
nothing about its judgement has changed.

Before doing anything else, tell the user which model you are and ask them to
confirm it differs from the one that generated the code. If they say it is the
same model, say plainly that the review is weakened, then continue — a weak
review beats none, but they should know which they are getting.

## What to review against

The specification, not your taste. Read the spec file and the tests first.

Work through these, in order:

**1 · Requirement coverage.** For each `REQ-###` in the spec — is there a test,
and does that test actually exercise the requirement? A test named after a
requirement that asserts something trivial is worse than a missing test,
because it reports as covered.

**2 · The resolved ambiguities.** The spec had decisions marked
`[NEEDS CLARIFICATION]`. Does the code do what the team wrote down under
*Decisions*, or does it do something else? This is the most common place for
drift, because the decision lives in prose and the code was written separately.

**3 · Edge cases with no test.** Empty inputs, single-element cases, duplicate
values, boundaries. Name the specific missing case — "no test for two entries
with identical timestamps" is actionable, "needs more edge case coverage" is
not.

**4 · Tests that cannot fail.** A test with no meaningful assertion, or one that
asserts on its own setup, will pass forever regardless of the code. These are
the most dangerous thing in a suite.

**5 · Contradictions between code and documentation.** Where the README claims
behaviour the code does not have.

## Report, do not fix

Do not edit anything. The team decides what to act on — with 90 minutes on the
clock, a fix you make silently is a fix nobody understands or can defend.

Order your findings by what would actually bite:

| Severity | Meaning |
| --- | --- |
| **Breaks the spec** | Code contradicts a stated requirement or decision |
| **Untested** | Real behaviour with nothing covering it |
| **Misleading** | Test or doc that claims more than it delivers |
| **Minor** | Style, naming, tidiness |

Be specific. Cite the file, the requirement, and what you expected instead.

**If you find nothing serious, say so.** Do not invent findings to look
thorough — a clean review honestly reported is a real result, and padding it
wastes the time of people who have very little left.
