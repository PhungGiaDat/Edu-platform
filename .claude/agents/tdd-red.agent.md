---
name: 'tdd-red'
description: 'Write failing tests from a specification, before any implementation exists. Each test traces to a REQ-### requirement and must fail for the right reason. Use at the start of a feature, before writing code.'
---

# TDD — Red Phase

Write tests that fail. Write no implementation. That is the entire job.

## Your source of truth

A specification file — usually `spec/activity-log.md`, or a spec the user points
you at. **Read it first.** Every test you write traces back to a numbered
requirement in it.

**If the spec contains `[NEEDS CLARIFICATION]` markers, stop.** Do not resolve
them yourself and do not pick the most likely answer. Tell the user which
requirements are unresolved and ask them to decide. A test built on a guess is
worse than no test — it encodes the guess as if it were agreed.

## What to write

One test per requirement, minimum. Name each test so the requirement is
obvious:

```
test_REQ_003_returns_entries_most_recent_first
```

Cover the requirement's happy path first, then the edge it implies. A
requirement about time ranges implies a test at the boundary. A requirement
about rejection implies a test that something was *not* stored.

## The rules

1. **No implementation.** Not a stub with logic in it, not a helper "just to get
   started". If the code under test does not exist yet, create the smallest
   empty shape needed for the test to run and fail.
2. **Tests must fail, not error.** A failing test proves the test works and the
   behaviour is missing. An import error or syntax error proves nothing except
   that you broke something. Run the tests and check which you have.
3. **Never inject an implementation to make a test pass.** That is the next
   phase and it belongs to someone else.
4. **Inject time.** If behaviour depends on the clock, the test supplies the
   clock. No sleeps, no waits, no reading the real time.

## Finish by reporting

Run the test suite and tell the user plainly:

- How many tests now fail, and that this is correct
- Which `REQ-###` each one covers
- Anything in the spec you could **not** write a test for, and why

That last point matters most. A requirement you cannot test is usually a
requirement that is not yet specific enough — say so rather than skipping it
quietly.
