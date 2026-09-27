# Section Blueprints

Load only the section needed for the current writing task. Adapt the structure to the paper rather than forcing every element into every manuscript.

## Abstract

Use one compact narrative:

1. establish the problem;
2. state the missing capability or limitation;
3. introduce the proposed artifact or method;
4. explain the mechanism at a readable level;
5. report the strongest evidence with concrete scope;
6. end with the supported takeaway.

Do not open with several sentences of broad field history. Do not list every component. Do not place a number in the abstract if the body does not report and explain it.

## Introduction

A strong introduction usually needs five logical moves:

1. explain the practical or scientific setting;
2. show why existing approaches leave a specific gap;
3. introduce the paper's answer;
4. explain the answer through one concrete example or system view;
5. state contributions and preview the evidence.

The first two paragraphs must connect causally. The second paragraph should arise from a limitation exposed by the first, not restart the topic.

Keep the contribution list aligned with the rest of the paper. If the paper contributes a protocol, an environment, and a benchmark, the abstract, introduction, section order, and experiments should preserve that hierarchy.

## Method or System

Introduce the architecture before local mechanics:

1. name the main components and their responsibilities;
2. explain how a typical request moves through them;
3. explain state, permissions, or learning signals where they naturally arise;
4. describe extension points only after the core path is clear.

Use examples to make responsibilities concrete. Avoid introducing all components, then interrupting the overview with a detailed equation, then returning to component definitions.

An equation belongs where its semantics become necessary. Precede it with a question or claim and follow it with an interpretation.

## Benchmark Construction

Explain the benchmark as a construction process:

1. define what one task contains and what the evaluated model sees;
2. describe how source data and controlled additions create the task world;
3. explain how capabilities and difficulty factors shape task variants;
4. describe review and validation without turning the section into a software test report;
5. explain scoring and what partial credit means.

Use a complete task example when the task definition is not obvious. Show the instruction, visible context, allowed action, and evaluation criteria. Keep internal task IDs out of the paper.

## Experiments

Open with the common setup once. Subsequent subsections should not repeat it.

Order evidence from the paper's central questions:

1. main benchmark results;
2. analysis that explains model or task differences;
3. environment studies that support system claims;
4. diagnostic or validity evidence whose main role is trust.

For a main results paragraph, state the overall pattern, then one or two notable comparisons, then a bounded interpretation. Do not narrate every table cell.

For a case study, make the task instruction explicit enough that the correct and incorrect decisions are not debatable. Show what the model did, what the environment executed, how the predicates were scored, and what the example teaches.

## Related Work

Organize around contribution boundaries, not a catalog of papers.

For each group:

1. state what the prior line of work enables;
2. identify the relevant boundary;
3. explain what the present paper adds;
4. make clear whether the goals are competing or complementary.

Use a comparison table when the same works must be compared across several properties. Prose should explain the important differences, not reproduce the table.

## Limitations and Responsible Use

State the limitations that change how a result should be interpreted. Group closely related limitations into flowing paragraphs. Avoid six short paragraphs that each begin with a bold label.

Separate current scope from future work. A maintenance plan does not repair a current validity limitation. Repository-specific licenses, takedown procedures, and operational instructions usually belong in the repository unless the venue requires them in the paper.

## Conclusion

Use one short synthesis:

1. restate the problem and answer;
2. summarize the main evidence;
3. state the broad implication within scope;
4. acknowledge the most important boundary or next step.

Do not introduce a new experiment, capability, or claim. Do not repeat the abstract sentence by sentence.
