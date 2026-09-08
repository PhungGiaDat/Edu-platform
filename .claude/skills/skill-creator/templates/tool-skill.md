---
name: {{SKILL_NAME}}
description: {{SKILL_DESCRIPTION}}
---
# {{SKILL_TITLE}}

Tool skill with automation scripts and data processing capabilities.

## Prerequisites

Check if required tools are installed:

```bash
# Check Node.js
node --version

# Check Python (if needed)
python3 --version
```

If not installed, follow OS-specific installation instructions.

---

## How to Use This Skill

When user requests work in this skill's domain, follow this workflow:

### Step 1: Analyze Requirements

Extract key information:
- **Input:** What data/input does user provide?
- **Output:** What should be generated/returned?
- **Options:** Any specific configurations?

### Step 2: Run the Tool

```bash
cd skills/{{SKILL_NAME}}/scripts
npm install
npx tsx main.ts [options]
```

### Step 3: Process Results

Explain how to interpret and use the tool output.

---

## Available Commands

### Command 1: [Command Name]

**Purpose:** What this command does

**Usage:**
```bash
npx tsx main.ts command1 [options]
```

**Options:**

| Option | Alias | Description | Default |
|--------|-------|-------------|---------|
| `--input` | `-i` | Input file | Required |
| `--output` | `-o` | Output file | `output.md` |

**Example:**
```bash
npx tsx main.ts command1 --input data.csv --output result.md
```

### Command 2: [Command Name]

**Purpose:** What this command does

**Usage:**
```bash
npx tsx main.ts command2 [options]
```

---

## Data Files

### data/main.csv

**Purpose:** Description of what this data contains

**Format:**
```csv
column1,column2,column3
value1,value2,value3
```

**Usage:** How to use this data

---

## Output Formats

### Format 1: Markdown

```markdown
# Output Title

## Section
- Item 1
- Item 2
```

### Format 2: JSON

```json
{
  "key": "value",
  "items": ["item1", "item2"]
}
```

---

## Examples

### Example 1: [Use Case]

**Input:**
```bash
npx tsx main.ts --example option1
```

**Output:**
```markdown
Generated output...
```

### Example 2: [Use Case]

**Input:**
```bash
npx tsx main.ts --example option2
```

**Output:**
```markdown
Generated output...
```

---

## Configuration

### config.json

```json
{
  "setting1": "value1",
  "setting2": "value2"
}
```

| Setting | Type | Description | Default |
|---------|------|-------------|---------|
| `setting1` | string | Description | `"default"` |
| `setting2` | number | Description | `100` |

---

## Best Practices

### Do's ✅
- Always check prerequisites first
- Validate input before processing
- Handle errors gracefully
- Provide clear output messages

### Don'ts ❌
- Don't skip error handling
- Don't hardcode paths
- Don't ignore configuration options
- Don't leave temporary files

---

## Troubleshooting

### Error: [Error Name]

**Cause:** Why this error occurs

**Solution:**
```bash
# Fix command
```

### Error: [Error Name]

**Cause:** Why this error occurs

**Solution:** Step-by-step fix
