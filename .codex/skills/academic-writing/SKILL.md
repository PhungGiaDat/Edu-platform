---
name: academic-writing
description: >
  Draft and revise research-paper prose, captions, tables, figures, and appendices for ML, AI, and adjacent technical venues. Use while writing or restructuring a regular conference or journal paper, improving argument flow, translating evidence into claims, or synchronizing prose with a changed visual. Do not use this as the final submission audit; use academic-self-check after drafting. For surveys use survey-writing, for outlines use academic-outline, and for reviewer responses use rebuttal-craft.
---

# Academic Writing

Write evidence-led research prose. Optimize for a reader who wants to understand the problem, the contribution, how the system works, what the experiments show, and where the evidence stops. Prefer a clear explanation over compressed terminology.

## Working Sequence

### 1. Establish the paper contract

Before drafting, identify:

1. the paper's central problem and one-sentence answer;
2. the two to four contribution claims;
3. the evidence supporting each claim;
4. the intended venue, page limit, and anonymity mode;
5. the canonical terminology, notation, model names, and reported numbers.

Inspect adjacent sections and source artifacts before rewriting. If a requested claim is not supported, narrow it or mark the missing evidence. Do not silently invent experiments, reviews, data sources, implementation behavior, or release status.

### 2. Give each section one job

Write the section's purpose in one sentence before editing it. Give every paragraph one primary function: establish a problem, explain a mechanism, report evidence, interpret a result, or connect two ideas. Merge paragraphs that merely restate one another. Split paragraphs that change purpose midway.

Load [section-blueprints.md](references/section-blueprints.md) when drafting or restructuring the abstract, introduction, method, experiments, related work, limitations, or conclusion.

### 3. Lead with meaning

State the idea before internal names and implementation detail. Introduce a component through what it does in the system, then name its interfaces. Avoid sentences that stack four or more nouns or responsibilities.

Prefer:

> The platform mediates the market. It checks an agent's request before the shared state changes.

Avoid:

> The runtime binds identity, references, replies, idempotency, validation, settlement, and governance.

When a process is easier to understand through an example, introduce one concrete actor goal and follow it through the mechanism. The example must be faithful to an implemented task or clearly labeled as illustrative.

### 4. Match claim strength to evidence

Use distinct language for distinct support:

| Support | Appropriate language |
| --- | --- |
| formal result | proves, guarantees, establishes under the stated assumptions |
| deterministic verification | verifies, reconstructs, passes the defined checks |
| measured result | observes, achieves, is associated with |
| qualitative inspection | suggests, is consistent with, may reflect |
| proposed use | can support, is designed for, provides an interface for |

Do not turn a capability into a demonstrated outcome. An interface for process rewards does not establish successful reinforcement learning. A multiagent environment does not by itself establish strategic multiagent evaluation. A public repository must not be described as available until it is actually accessible.

### 5. Report results as arguments

For every experiment, write:

1. the question;
2. the comparison or measurement;
3. the minimum numbers needed to support the conclusion;
4. the conclusion;
5. the boundary of that conclusion.

Lead result paragraphs with the pattern, not a list of numbers. Use numbers to support the pattern. Distinguish an interesting observation from a controlled causal finding.

### 6. Keep terminology and notation economical

Choose one term for each referent and one referent for each term. Define necessary acronyms once. Prefer a familiar phrase over a new compound term. Do not repeat acronym expansions already visible in an adjacent table.

Define every equation symbol at first use. Explain why the equation is present and what later reasoning depends on it. Remove an equation that only renames a prose list.

### 7. Apply the repository's prose conventions

In manuscript prose:

1. do not use em dashes or en dashes as stylistic punctuation;
2. do not use contractions;
3. avoid informal intensifiers and unsupported superlatives;
4. avoid unordered lists inside the paper unless the venue or content clearly requires one;
5. do not disguise a list as a sequence of bold inline labels in limitations or discussion;
6. keep each prose paragraph on one physical source line unless syntax requires a break;
7. prefer declarative, concrete subsection titles over abstract noun stacks or a page full of questions;
8. avoid one-sentence paragraphs unless the sentence has a deliberate structural role.

Treat 35 words as a warning threshold, not a mechanical limit. Split a long sentence when it carries more than one logical relationship.

Load [writing-examples.md](references/writing-examples.md) when a passage feels dense, repetitive, abstract, or disconnected from its figure.

## Figures and Tables

Choose the representation by the claim:

| Intended reading | Preferred form |
| --- | --- |
| exact lookup | table |
| trend or comparison | chart |
| process or responsibility | diagram |
| concrete task structure | compact example box |

If information density is high, reduce decorative color. If information density is low, color may establish grouping or emphasis. Never use color to compensate for weak hierarchy.

Write a visual so it can be read at final paper size. Keep labels human-readable, align repeated elements, use one arrow grammar, and remove internal titles that duplicate the caption. A caption should state what is shown and the takeaway needed to interpret it. The nearby prose should explain the implication rather than restate every element.

Load [figure-table-review.md](references/figure-table-review.md) whenever creating or substantially revising a visual.

## Revision Workflows

### Framing change

When the paper's emphasis changes, update the title, abstract, introduction, contribution list, section openings, figure captions, results interpretation, limitations, and conclusion. Search for residual language from the old framing.

### Data or model-panel change

Treat one changed result as a dependency update. Recompute every aggregate and inspect the abstract, result prose, tables, plots, captions, appendix tables, rankings, case studies, and conclusion. Never patch only the nearest table.

### Figure change

After changing a figure, inspect every reference to its number, panels, visual encoding, and takeaway. Remove descriptions of deleted content. Keep the figure near its first substantive discussion.

### Moving material

After moving content between the main paper and appendix, repair transitions, references, numbering, and claims of self-containment. Do not leave an orphan appendix artifact or a main-text promise whose evidence moved away.

## Finish the Draft

Compile or render the paper after substantive edits. Inspect the relevant pages, not only the log. Fix obvious overflow, overlap, stranded headings, one-word terminal lines, large unexplained whitespace, and figures separated from their analysis.

Then invoke `academic-self-check` for the independent full-paper audit. Do not duplicate its checklist during drafting.
