---
name: pdf
description: "Use this skill whenever the user wants to do anything with PDF files. This includes reading or extracting text/tables from PDFs, combining or merging multiple PDFs into one, splitting PDFs apart, rotating pages, adding watermarks, creating new PDFs, filling PDF forms, encrypting/decrypting PDFs, extracting images, and OCR on scanned PDFs to make them searchable. If the user mentions a .pdf file or asks to produce one, use this skill."
---

# PDF Processing

## Quick Start

```python
from pypdf import PdfReader, PdfWriter

reader = PdfReader("document.pdf")
print(f"Pages: {len(reader.pages)}")

text = ""
for page in reader.pages:
    text += page.extract_text()
```

## Scripts

All scripts are in `.claude/skills/pdf/scripts/`:

| Script | Purpose |
|--------|---------|
| `check_bounding_boxes.py` | Inspect element positions |
| `check_fillable_fields.py` | List form fields |
| `convert_pdf_to_images.py` | Convert pages to images |
| `create_validation_image.py` | Visual validation helper |
| `extract_form_field_info.py` | Get field metadata |
| `extract_form_structure.py` | Map form structure |
| `fill_fillable_fields.py` | Fill standard form fields |
| `fill_pdf_form_with_annotations.py` | Fill via annotations |

For PDF forms specifically, read `.claude/skills/pdf/forms.md`. For advanced usage, read `.claude/skills/pdf/reference.md`.

## Common Operations

### Merge PDFs
```python
from pypdf import PdfWriter, PdfReader

writer = PdfWriter()
for pdf_file in ["doc1.pdf", "doc2.pdf"]:
    reader = PdfReader(pdf_file)
    for page in reader.pages:
        writer.add_page(page)

with open("merged.pdf", "wb") as output:
    writer.write(output)
```

### Split PDF
```python
reader = PdfReader("input.pdf")
for i, page in enumerate(reader.pages):
    writer = PdfWriter()
    writer.add_page(page)
    with open(f"page_{i+1}.pdf", "wb") as output:
        writer.write(output)
```

### Extract Text with Layout
```python
import pdfplumber

with pdfplumber.open("document.pdf") as pdf:
    for page in pdf.pages:
        print(page.extract_text())
```

### Extract Tables
```python
import pdfplumber, pandas as pd

with pdfplumber.open("document.pdf") as pdf:
    all_tables = []
    for page in pdf.pages:
        for table in page.extract_tables():
            if table:
                all_tables.append(pd.DataFrame(table[1:], columns=table[0]))

pd.concat(all_tables).to_excel("tables.xlsx", index=False)
```

### Create PDF
```python
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet

doc = SimpleDocTemplate("report.pdf", pagesize=letter)
styles = getSampleStyleSheet()
story = [Paragraph("Title", styles['Title']), Spacer(1, 12),
         Paragraph("Body text here.", styles['Normal'])]
doc.build(story)
```

**IMPORTANT — Subscripts/Superscripts in ReportLab:** Never use Unicode sub/superscript characters (₀¹²). Use XML markup instead:
```python
Paragraph("H<sub>2</sub>O and x<super>2</super>", styles['Normal'])
```

### Rotate Pages
```python
reader = PdfReader("input.pdf")
writer = PdfWriter()
page = reader.pages[0]
page.rotate(90)
writer.add_page(page)
with open("rotated.pdf", "wb") as f:
    writer.write(f)
```

### Add Watermark
```python
watermark = PdfReader("watermark.pdf").pages[0]
reader = PdfReader("document.pdf")
writer = PdfWriter()
for page in reader.pages:
    page.merge_page(watermark)
    writer.add_page(page)
with open("watermarked.pdf", "wb") as f:
    writer.write(f)
```

### Password Protection
```python
reader = PdfReader("input.pdf")
writer = PdfWriter()
for page in reader.pages:
    writer.add_page(page)
writer.encrypt("userpassword", "ownerpassword")
with open("encrypted.pdf", "wb") as f:
    writer.write(f)
```

### OCR Scanned PDFs
```python
import pytesseract
from pdf2image import convert_from_path

images = convert_from_path('scanned.pdf')
text = ""
for i, image in enumerate(images):
    text += f"Page {i+1}:\n" + pytesseract.image_to_string(image) + "\n\n"
```

## Command-Line Tools

```bash
# Extract text
pdftotext -layout input.pdf output.txt
pdftotext -f 1 -l 5 input.pdf output.txt  # Pages 1-5

# Merge
qpdf --empty --pages file1.pdf file2.pdf -- merged.pdf

# Split
qpdf input.pdf --pages . 1-5 -- pages1-5.pdf

# Rotate
qpdf input.pdf output.pdf --rotate=+90:1

# Remove password
qpdf --password=mypassword --decrypt encrypted.pdf decrypted.pdf

# Extract images
pdfimages -j input.pdf output_prefix
```

## Quick Reference

| Task | Best Tool |
|------|-----------|
| Merge | pypdf |
| Split | pypdf |
| Extract text | pdfplumber |
| Extract tables | pdfplumber |
| Create PDFs | reportlab |
| Command line | qpdf |
| OCR scanned | pytesseract |
| Fill forms | See forms.md |

## Dependencies

```bash
pip install pypdf pdfplumber reportlab pytesseract pdf2image
# CLI: poppler-utils (pdftotext, pdfimages), qpdf
```
