# Figure and Table Review Standard

Use this standard for every academic figure, plot, diagram, and table. Treat visual artifacts as claim-bearing parts of the paper, not as decoration.

## Contents

(1) [Choose the Representation Before Polishing It](#1-choose-the-representation-before-polishing-it) (2) [Preserve Claim Priority and Visual Hierarchy](#2-preserve-claim-priority-and-visual-hierarchy) (3) [Use Unambiguous Visual Grammar](#3-use-unambiguous-visual-grammar) (4) [Enforce Geometric and Typographic Integrity](#4-enforce-geometric-and-typographic-integrity) (5) [Apply Table-Specific Standards](#5-apply-table-specific-standards) (6) [Keep Visuals, Captions, Prose, and Data Synchronized](#6-keep-visuals-captions-prose-and-data-synchronized) (7) [Preserve Reproducibility](#7-preserve-reproducibility) (8) [Mandatory Review Workflow](#8-mandatory-review-workflow) (9) [Immediate Rejection Conditions](#9-immediate-rejection-conditions)

## 1. Choose the Representation Before Polishing It

First state the artifact's communicative job in one sentence. If that sentence is unclear, redesign the content before adjusting fonts or colors.

(1) Use a table when readers need exact values, precise lookup, or comparison across several discrete attributes.

(2) Use a plot when readers need to compare magnitudes, trends, distributions, tradeoffs, or rankings. A bar chart is usually clearer than a numeric table for a small set of aligned magnitude comparisons.

(3) Use a diagram when readers need to understand architecture, sequence, ownership, interaction, extensibility, or causal flow.

(4) Use prose when the content is a short text-only inventory with no important relational structure. Do not preserve a table that merely places sentences in cells.

(5) Do not convert content into a figure merely to make it look substantial. Every graphical encoding must make a relationship easier to perceive.

(6) Do not preserve the current artifact type because it already exists. When a table is mostly text, when its numbers do not support a claim, or when its layout combines unrelated taxonomies, replace it with the representation that best serves the argument.

## 2. Preserve Claim Priority and Visual Hierarchy

(1) Give each figure one primary message. Secondary evidence may support that message but must not receive equal visual weight unless it is equally important to the paper's contribution.

(2) Make the reading order evident through position, scale, alignment, and connectors. A reviewer should understand where to start and what to follow without reading the caption first.

(3) Allocate panel area according to semantic load. Enlarge dense panels and shrink simple ones. Equal panel widths are not a virtue when their contents have different complexity.

(4) Avoid both hollow layouts and compressed layouts. Large unused centers weaken the flow, while tightly packed nodes, labels, or actors obscure relationships. Adjust container size and internal spacing together.

(5) For multi-panel figures, make panel boundaries and labels explicit. The caption and prose must use the same panel order and names as the visual.

(6) Match color density inversely to information density. A sparse conceptual figure may use several restrained colors to distinguish a few roles. A dense figure with many nodes, labels, rows, or connectors must be predominantly black, white, and gray, with at most one accent color for the primary claim. Do not assign a different saturated color to every component when position, shape, or labels already distinguish them.

## 3. Use Unambiguous Visual Grammar

(1) Every icon must have a conventional, immediately interpretable meaning. If an icon can plausibly mean several things, replace it with a labeled card or pair the icon with a short label. Decorative shields, loops, gears, and similar symbols are unacceptable when they do not encode a precise operation.

(2) Use the same shape, color, and line style for the same semantic role across the paper. Do not reuse one visual encoding for two unrelated referents.

(3) Do not rely on color alone. Preserve distinctions with labels, shapes, outlines, patterns, or positions so that the figure remains understandable in grayscale and for readers with color-vision deficiencies.

(4) Arrows must encode a defined direction or dependency. Each arrow needs a visible shaft and arrowhead, clear endpoints, and enough separation from text and node borders. An arrow must not begin inside a label, pass through a word, or disappear beneath an icon.

(5) Use bidirectional arrows only for genuinely bidirectional interaction. Use separate directed arrows when the two directions carry different meanings.

(6) Label operations with verbs and entities with nouns. Keep terminology and capitalization identical to the main text.

(7) Use sentence case or title case for figure text. Avoid all-capital labels because they create uniform visual emphasis and resemble automatically generated presentation graphics. Reserve all capitals for established acronyms, model names that require them, or conventional markers of at most three short words.

## 4. Enforce Geometric and Typographic Integrity

(1) No label may touch or cross its container border. Preserve visible padding on every side, including for two-line counts and long category names.

(2) No object may cover a rounded corner or border. When generating vector graphics, draw interior fills inside the shell and redraw the rounded outline last, or clip the fills to the rounded boundary.

(3) Align repeated cards, headers, baselines, arrows, and gutters. Small misalignments become conspicuous when elements repeat.

(4) Keep connector gaps large enough to distinguish the end of a label from the start of an arrow. Check both the line and arrowhead after rendering.

(5) Avoid text over strokes, grid lines, data marks, shadows, or ports. A label that is technically present but visually interrupted counts as a failure.

(6) Evaluate typography at the final paper size. Target at least 8 pt for ordinary figure text after scaling, and do not go below 7 pt unless a venue template makes it unavoidable. Important labels should be larger than secondary annotations.

(7) Use concise labels. If a label needs a sentence, move the explanation to the caption or prose instead of reducing the font until it fits.

(8) Keep line weights and contrast sufficient after reduction. Hairline borders and pale arrows that vanish in the compiled paper are defects even if they look acceptable in a zoomed standalone render.

## 5. Apply Table-Specific Standards

(1) Every row and column must support a comparison, definition, or lookup that the paper uses. Remove decorative counts and fields that do not support a claim.

(2) Do not place two unrelated grouping schemes side by side merely to save space. Separate them into panels, tables, or plots with independent headings and reading orders.

(3) Give columns stable units and precision. Align numeric values by decimal point when possible, use consistent significant digits, and state units once in the header.

(4) Order rows by a meaningful principle such as lifecycle, method family, difficulty, or measured value. Do not mix ordering rules within one block.

(5) Keep headers short and unambiguous. Define non-obvious abbreviations and variants in the caption rather than forcing long prose into header cells.

(6) Do not make a text-heavy table imitate prose. If most cells contain clauses or sentences, use structured prose or a relationship diagram.

(7) Do not make a numeric table imitate a chart. If the main task is to see relative magnitudes rather than retrieve exact values, use a plot. Retain exact values as data labels, a compact companion table, or supplementary material only when readers need them.

(8) Avoid false precision. Do not display more digits than the measurement or analysis justifies.

## 6. Keep Visuals, Captions, Prose, and Data Synchronized

(1) A caption must identify what is shown, define non-obvious encodings, and state scope-specific caveats. It must not narrate every visible element or duplicate the results paragraph.

(2) Surrounding prose must cite the exact figure, panel, table row, or column that supports the claim. It should interpret the evidence instead of repeating all labels or values.

(3) Update accessibility descriptions whenever actors, steps, directions, panel structure, or key labels change. The description must convey the same reading order and relationships as the image.

(4) After every visual revision, search for all references to its label and filename. Check captions, nearby paragraphs, distant result summaries, appendices, and supplementary materials for stale wording.

(5) Tie claim-bearing numbers to tracked source data whenever practical. Add assertions in generation scripts for fixed totals, category counts, and model counts. Do not manually duplicate values across several figure sources.

(6) If a change is purely cosmetic, explicitly verify that it did not alter the artifact's apparent meaning. If meaning changed, update the caption and prose in the same revision.

## 7. Preserve Reproducibility

(1) Prefer vector or code-native sources for diagrams and plots. Keep the generator, source data, and generated PDF or SVG synchronized.

(2) Edit the source of truth rather than only editing an exported artifact. Regenerate all committed formats after the final source change.

(3) Use deterministic generation where practical. Avoid timestamps, random layout changes, or environment-specific absolute paths in committed outputs.

(4) Preserve the paper's existing visual language unless there is a deliberate redesign. Match colors, typography, corner radii, stroke weights, and naming conventions across figures.

## 8. Mandatory Review Workflow

Perform these steps in order after the last meaningful change.

(1) Claim audit: state the artifact's single primary message and verify that every included element supports it.

(2) Representation audit: confirm that a figure, table, diagram, or prose is the correct form for the information.

(3) Semantic audit: inspect every icon, arrow, label, color, count, and unit for meaning and consistency.

(4) Geometry audit: inspect borders, rounded corners, padding, alignment, connector endpoints, crowding, and unused space.

(5) Standalone render: regenerate the vector asset and inspect a high-resolution render for clipping, overlap, broken glyphs, and missing elements.

(6) Paper-scale render: compile the full paper, render the containing PDF page to an image, and inspect the artifact at its actual placement size. Do not rely on the standalone render alone.

(7) Text synchronization audit: inspect the caption, accessibility description, surrounding prose, and every cross-reference after viewing the final rendering.

(8) Build audit: compile with errors treated as failures. Review overfull boxes, missing references, missing fonts, and image inclusion warnings.

(9) Final diff audit: confirm that generated outputs match their sources and that unrelated user changes were not modified.

## 9. Immediate Rejection Conditions

Do not declare a visual complete if any of the following remains:

(1) Text touches a border, icon, arrow, grid line, or another label.

(2) A square fill hides a rounded corner or a shadow looks like a second frame.

(3) An arrow has no clear shaft, arrowhead, source, or destination.

(4) An icon requires the caption to explain what basic operation it depicts.

(5) One panel is visibly cramped while another contains avoidable empty space.

(6) Figure text is readable only when zoomed beyond the paper's normal viewing size.

(7) A table contains mostly prose, combines unrelated taxonomies, or reports numbers that the argument never uses.

(8) A figure or table has changed but its caption, accessibility description, or surrounding prose still describes the old version.

(9) A dense figure uses several competing accent colors, or ordinary labels are rendered in all capitals without a conventional reason.
