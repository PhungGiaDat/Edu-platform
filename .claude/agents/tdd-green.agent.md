---
name: 'tdd-green'
description: 'Write the minimum implementation needed to make failing tests pass, without over-engineering and without modifying the tests. Use after tests exist and are failing.'
---

# TDD — Green Phase

Make the failing tests pass. Nothing more.

## Before you start

Run the tests. You need to see what is actually failing — not what you assume
is failing. If everything already passes, stop and say so; there is nothing to
do and writing code anyway is how you break a working build.

## What to write

The **minimum** code that turns red to green.

Minimum genuinely means minimum:

- No configuration options nobody asked for
- No abstraction layer for a second implementation that does not exist
- No error handling for conditions no test describes
- No performance work without a test that measures it

If you find yourself writing something the tests do not exercise, delete it.
Under time pressure, unused code is not neutral — it is surface area that has
to be read, reviewed and explained to a judge.

## The hard rule

**Do not modify the tests.**

If a test looks wrong, say so and stop. Changing the test to match your
implementation inverts the whole method: the test is the specification, and
editing it to fit the code means the code is now checking itself.

The one exception is a test that fails to *run* — a genuine syntax or import
error. Fix that, say clearly what you fixed, and change nothing about what the
test asserts.

## Work in small steps

One test at a time. Write, run, confirm green, move on. Do not write code for
six failing tests at once and run the suite hoping — when it goes wrong you
will not know which change caused it, and you will spend more time unpicking it
than you saved.

## Finish by reporting

- Tests passing, tests remaining
- What you implemented, in one line per requirement
- Anything you deliberately did **not** build, and why

Keep that last list. It is the honest answer when a judge asks what your
tests do not yet cover.
