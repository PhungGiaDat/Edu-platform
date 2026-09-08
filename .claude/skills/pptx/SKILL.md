---
name: pptx
description: "Use this skill any time a .pptx file is involved in any way — as input, output, or both. This includes: creating slide decks, pitch decks, or presentations from scratch or FPT templates; reading, parsing, or extracting text from any .pptx file; editing or updating existing presentations. Trigger whenever the user mentions 'deck', 'slides', 'presentation', or references a .pptx filename. For FPT branded presentations, use the pre-unpacked template XML — never approximate with colors or icons."
---

# PPTX Skill

## Route First

```
User wants a presentation
├── FPT Software branded (Dark or Bright)?
│   └── → FPT Template Workflow  (copy pre-unpacked → edit XML → pack → cleanup)
└── Generic / no brand?
    ├── Structured content (lists, markdown, JSON)?
    │   └── → python-pptx Pipeline  (parse → map → create → cleanup)
    └── Creative / high design quality?
        └── → pptxgenjs Workflow  (write script → run → cleanup)
```

---

## FPT Template Workflow

Templates are **pre-unpacked** — never run unpack again. Copy to a working dir, edit, pack, then delete the working dir.

### Pre-unpacked Locations

| Template | Pre-unpacked dir | Original .pptx |
|----------|-----------------|----------------|
| **Dark** (client-facing, executive) | `.claude/skills/pptx/templates/dark-unpacked/` | `templates/Template_FPT Software Slide Dark_v1.2.pptx` |
| **Bright** (internal, workshops) | `.claude/skills/pptx/templates/bright-unpacked/` | `templates/Template_FPT Software Slide Bright_v1.2.pptx` |

### Step 1 — Copy to working dir

```bash
# Dark
cp -r .claude/skills/pptx/templates/dark-unpacked/ working/
ORIG=".claude/skills/pptx/templates/Template_FPT Software Slide Dark_v1.2.pptx"

# OR Bright
cp -r .claude/skills/pptx/templates/bright-unpacked/ working/
ORIG=".claude/skills/pptx/templates/Template_FPT Software Slide Bright_v1.2.pptx"
```

### Step 2 — Plan slide mapping

Use the slide catalog below. Pick the slides you need, decide which to keep/delete/duplicate.

### Step 3 — Build structure (complete ALL before editing content)

- **Delete unwanted slides**: remove their `<p:sldId>` entries from `working/ppt/presentation.xml` → `<p:sldIdLst>`
- **Duplicate a slide** to reuse its layout:
  ```bash
  python3 .claude/skills/pptx/scripts/add_slide.py working/ slide5.xml
  # Prints the <p:sldId> element — add it to <p:sldIdLst> at desired position
  ```
- **Reorder**: rearrange `<p:sldId>` elements in `<p:sldIdLst>`

### Step 4 — Edit content

Update text in `working/ppt/slides/slideN.xml`. See `.claude/skills/pptx/editing.md` for XML rules.

Use subagents to edit slides in parallel — each slide is a separate file.

### Step 5 — Clean + Pack

```bash
python3 .claude/skills/pptx/scripts/clean.py working/
python3 .claude/skills/_shared_/office/pack.py working/ output.pptx --original "$ORIG"
```

> Always pass `--original` — preserves embedded fonts, media, and theme data.

### Step 6 — Cleanup (after successful pack only)

```bash
rm -rf working/
```

The pre-unpacked template dirs are **permanent fixtures** — never delete them.

---

## Slide Catalog — Dark Template (51 slides)

| Slide | Category | Use for |
|-------|----------|---------|
| 1 | Document header | Template/version cover (formal) |
| 2 | Record of Change | Version history table |
| 3–7 | Cover / Title | Opening slides (multiple layout variants) |
| 8–10 | Table of Contents | Agenda with 4 numbered items |
| 11–14 | Section Divider | `01. SECTION TITLE` chapter openers |
| 15 | Content — image + text | Single column with visual |
| 16 | OKR / KPI grid | Key results / metrics |
| 17 | Table / Staffing | Position/headcount matrix |
| 18–22 | Content — multi-column | 2–3 column body content |
| 23 | OKR / Activities | Plan, performance, progress grid |
| 24 | Content | Single column body |
| 25 | Section with large number | Numbered section opener |
| 26 | Content | Single column body |
| 27–28 | Content with subtitle | Title + body + subtitle area |
| 29 | Content | Body text slide |
| 30 | Stage / Process | 3-stage flow (STAGE 1–3) |
| 31 | Timeline (horizontal) | Monthly/quarterly bands (2022 Jan–Dec) |
| 32 | Multi-column overview | 4-column content grid |
| 33 | Pricing / Plans | FREE / paid plan cards |
| 34 | Comparison | Side-by-side content blocks |
| 35 | Timeline (years) | Year-range roadmap (2021–2027) |
| 36 | Client / Testimonial | Quote + content area |
| 37 | Contact Us | Address, QR, logo |
| 38–39 | Logo Guideline | Brand appendix |
| 40 | Font Guideline | Brand appendix |
| 41 | Color Guideline | Brand appendix |
| 42–45 | Icons | Icon reference slides |
| 46 | Global Map | World map visual |
| 47–48 | Full-bleed showcase | Hero image slides |
| 49–51 | Blank / extra | Additional blank slides |

---

## Slide Catalog — Bright Template (47 slides)

| Slide | Category | Use for |
|-------|----------|---------|
| 1 | Document header | Template/version cover (formal) |
| 2 | Record of Change | Version history table |
| 3–5 | Cover / Title | Opening slides |
| 6–8 | Table of Contents | Agenda with 4 numbered items |
| 9–10 | Section Divider | `01. SECTION TITLE` openers |
| 11 | Content — image + text | Single column with visual |
| 12 | OKR / KPI grid | Key results / metrics |
| 13 | Table / Staffing | Position/headcount matrix |
| 14–15 | Content — single column | Body text |
| 16–17 | Content — multi-column | 2-column body |
| 18–19 | Content | Single column body |
| 20–21 | Content | Single column body |
| 22 | Section with large number | Numbered section opener |
| 23–24 | Content | Body text slides |
| 25 | Stage / Process | 3-stage flow (STAGE 1–3) |
| 26 | Timeline (horizontal) | Monthly/quarterly bands |
| 27 | Multi-column overview | 4-column content grid |
| 28 | Pricing / Plans | FREE / paid plan cards |
| 29 | Comparison | Side-by-side content blocks |
| 30 | Client / Testimonial | Quote + content area |
| 31 | Timeline (years) | Year-range roadmap |
| 32–33 | Contact Us | Address, QR, logo (2 variants) |
| 34–35 | Logo Guideline | Brand appendix |
| 36 | Font Guideline | Brand appendix |
| 37 | Color Guideline | Brand appendix |
| 38–41 | Icons | Icon reference slides |
| 42 | Global Map | World map visual |
| 43–44 | Full-bleed showcase | Hero image slides |
| 45–47 | Blank / extra | Additional blank slides |

---

## Brand Identity

| Element | Value |
|---------|-------|
| Primary font | Segoe UI |
| Blue (primary) | `#034EA2` |
| Orange (accent) | `#F37021` |
| Navy (dark bg) | `#19226D` |
| Teal | `#33B2C1` |
| Green | `#50B848` |

---

## pptxgenjs Workflow (Creative / From Scratch)

Full design freedom — no template constraints.

**Read `.claude/skills/pptx/pptxgenjs.md` for full API reference.**

```bash
npm install -g pptxgenjs
node presentation.js    # generates output.pptx
rm presentation.js       # cleanup after success
```

### Design Rules

- **Bold, topic-specific palette** — not generic blue. Dominant color 60–70%, 1–2 supporting, one accent.
- **Every slide needs a visual** — shape, icon, image, or chart. Text-only slides fail.
- **Vary layouts** — two-column, icon rows, 2×2 grid, half-bleed image. Never repeat the same layout.
- **Never** use accent lines under titles (AI-generated tell).
- Left-align body text. Dark for title + closing, light for content.

| Theme | Primary | Secondary | Accent |
|-------|---------|-----------|--------|
| Midnight Executive | `1E2761` | `CADCFC` | `FFFFFF` |
| Coral Energy | `F96167` | `F9E795` | `2F3C7E` |
| Ocean Gradient | `065A82` | `1C7293` | `21295C` |
| Charcoal Minimal | `36454F` | `F2F2F2` | `212121` |
| Teal Trust | `028090` | `00A896` | `02C39A` |

---

## python-pptx Pipeline (Structured Content)

For markdown/JSON/YAML input using the FSO layout system.

```bash
# Parse
python pptx-generator/scripts/parse_markdown.py input.md        # → input.slides.json
python pptx-generator/scripts/parse_structured.py input.json    # → input.slides.json

# Map layouts
python pptx-generator/scripts/content_mapper.py input.slides.json   # → input.mapped.json

# Generate
python pptx-generator/scripts/create_presentation.py input.mapped.json -o output.pptx

# Cleanup
rm input.slides.json input.mapped.json
```

### Layout Auto-Mapping

| Signal | Layout |
|--------|--------|
| `# Cover` | Cover |
| `# Table of Contents` | Table of Contents |
| `# Section: X` | Section Title |
| `# Compare: X` / 2 cols | 2 Columns |
| `# Compare:` + 3 | 3 Columns |
| `# Top 3:` | 3 Rows |
| `# Top 2:` | 2 Rows |
| `# Table: X` | 4 Columns Stacked |
| 3 cards | 3 Text Boxes |
| 4 cards | 4 Text Boxes |
| Image + bullets | Picture with List |
| Team list | Organizational Chart |
| `# Thank You` | Thank You |

---

## Reading / Analyzing PPTX

```bash
python -m markitdown presentation.pptx                          # text extraction
python3 .claude/skills/pptx/scripts/thumbnail.py pres.pptx   # visual grid
```

---

## QA (Required)

```bash
# Content check
python -m markitdown output.pptx | grep -iE "xxxx|lorem|ipsum|this.*(page|slide)"

# Visual check
soffice --headless --convert-to pdf output.pptx && pdftoppm -jpeg -r 150 output.pdf slide
```

Inspect every slide: overlapping elements, text overflow, leftover placeholder text, low contrast.
Fix → re-check → repeat until clean.

---

## Cleanup Summary

| Workflow | Remove after success |
|----------|---------------------|
| FPT template | `rm -rf working/` (working copy only — never delete `dark-unpacked/` or `bright-unpacked/`) |
| pptxgenjs | `rm presentation.js` |
| python-pptx pipeline | `rm *.slides.json *.mapped.json` |
| SVG temp icons | `rm *.svg` |

---

## Scripts

| Script | Path | Purpose |
|--------|------|---------|
| `pack.py` | `.claude/skills/_shared_/office/` | Repack XML → .pptx (shared) |
| `unpack.py` | `.claude/skills/_shared_/office/` | Unpack .pptx → XML (shared) |
| `validate.py` | `.claude/skills/_shared_/office/` | Validate OOXML structure (shared) |
| `clean.py` | `.claude/skills/pptx/scripts/` | Remove orphaned files from working dir |
| `add_slide.py` | `.claude/skills/pptx/scripts/` | Duplicate a slide |
| `thumbnail.py` | `.claude/skills/pptx/scripts/` | Visual slide grid |
| `parse_markdown.py` | `pptx-generator/scripts/` | Markdown → slide defs |
| `content_mapper.py` | `pptx-generator/scripts/` | Auto-select layouts |
| `create_presentation.py` | `pptx-generator/scripts/` | Generate PPTX from defs |
| `edit_presentation.py` | `pptx-generator/scripts/` | Edit existing PPTX |
| `svg_to_png.py` | `pptx-generator/scripts/` | SVG → PNG |

---

## Dependencies

```bash
pip install python-pptx "markitdown[pptx]" Pillow defusedxml pyyaml
npm install -g pptxgenjs
# LibreOffice + Poppler for visual QA
```
