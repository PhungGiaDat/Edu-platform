---
name: xlsx
description: "Use this skill any time a spreadsheet file is the primary input or output. This means any task where the user wants to: open, read, edit, or fix an existing .xlsx, .xlsm, .csv, or .tsv file (e.g., adding columns, computing formulas, formatting, charting, cleaning messy data); create a new spreadsheet from scratch or from other data sources; or convert between tabular file formats. Trigger especially when the user references a spreadsheet file by name or path — even casually (like 'the xlsx in my downloads') — and wants something done to it or produced from it. Also trigger for cleaning or restructuring messy tabular data files into proper spreadsheets. Do NOT trigger when the primary deliverable is a Word document, HTML report, standalone Python script, database pipeline, or Google Sheets API integration."
---

# XLSX creation, editing, and analysis

## Requirements for All Excel Outputs

- **Professional font**: Arial or Times New Roman throughout
- **Zero formula errors**: Deliver with ZERO `#REF!`, `#DIV/0!`, `#VALUE!`, `#N/A`, `#NAME?`
- **Preserve existing templates**: When modifying files, match existing format exactly

## Financial Models — Color Coding

| Color | Meaning |
|-------|---------|
| **Blue text** (0,0,255) | Hardcoded inputs users will change |
| **Black text** (0,0,0) | All formulas and calculations |
| **Green text** (0,128,0) | Links from other worksheets |
| **Red text** (255,0,0) | External links to other files |
| **Yellow background** (255,255,0) | Key assumptions needing attention |

## CRITICAL: Use Excel Formulas, Not Hardcoded Values

```python
# ❌ WRONG
sheet['B10'] = df['Sales'].sum()  # Hardcodes a number

# ✅ CORRECT
sheet['B10'] = '=SUM(B2:B9)'     # Let Excel calculate
```

This applies to ALL calculations — totals, percentages, ratios, averages.

## Scripts

```bash
# Recalculate all formulas (MANDATORY after using openpyxl with formulas)
python .claude/skills/xlsx/scripts/recalc.py output.xlsx

# Returns JSON with error details:
# { "status": "success"|"errors_found", "total_errors": 0, "error_summary": {...} }
```

## Common Workflow

1. Choose tool: pandas (data/analysis) or openpyxl (formulas/formatting)
2. Create or load workbook
3. Modify — add data, formulas, formatting
4. Save file
5. **Recalculate (MANDATORY if formulas used):** `python .claude/skills/xlsx/scripts/recalc.py output.xlsx`
6. Verify output — fix any errors, recalculate again

## Reading and Analyzing

```python
import pandas as pd

df = pd.read_excel('file.xlsx')
all_sheets = pd.read_excel('file.xlsx', sheet_name=None)  # All sheets as dict

df.head()       # Preview
df.info()       # Column info
df.describe()   # Statistics

df.to_excel('output.xlsx', index=False)
```

## Creating New Files

```python
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment

wb = Workbook()
sheet = wb.active

sheet['A1'] = 'Header'
sheet['B2'] = '=SUM(A1:A10)'

sheet['A1'].font = Font(bold=True, color='FF0000')
sheet['A1'].fill = PatternFill('solid', start_color='FFFF00')
sheet['A1'].alignment = Alignment(horizontal='center')
sheet.column_dimensions['A'].width = 20

wb.save('output.xlsx')
```

## Editing Existing Files

```python
from openpyxl import load_workbook

wb = load_workbook('existing.xlsx')
sheet = wb.active  # or wb['SheetName']

sheet['A1'] = 'New Value'
sheet.insert_rows(2)
sheet.delete_cols(3)

wb.save('modified.xlsx')
```

**Warning:** `data_only=True` replaces formulas with values permanently — never save after opening with it.

## Number Formatting Standards (Financial Models)

- **Years**: Format as text (`"2024"` not `"2,024"`)
- **Currency**: `$#,##0` format; units in headers (`"Revenue ($mm)"`)
- **Zeros**: Use `"$#,##0;($#,##0);-"` to show as `-`
- **Percentages**: `0.0%` format (one decimal)
- **Multiples**: `0.0x` (EV/EBITDA, P/E)
- **Negatives**: Parentheses `(123)` not minus `-123`

## Formula Verification Checklist

- [ ] Test 2-3 sample references before building full model
- [ ] Confirm Excel columns match (`column 64 = BL`, not BK)
- [ ] Row offset: Excel rows are 1-indexed (DataFrame row 5 = Excel row 6)
- [ ] NaN handling: check `pd.notna()` before referencing
- [ ] Division by zero: verify denominators
- [ ] Cross-sheet references: `Sheet1!A1` format

## Code Style

Write minimal, concise Python — no unnecessary comments, no verbose variable names, no redundant print statements.

## Dependencies

```bash
pip install openpyxl pandas
# LibreOffice required for recalc.py (assumed installed)
```
