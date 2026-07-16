---
name: opencode-command-document
description: Migrated OpenCode slash command `document`. Use when the user asks to run or follow the old OpenCode `/document` workflow.
---

# opencode-command-document

This skill was migrated from `.opencode/commands/document.md`.

OpenCode slash-command runtime features such as `$ARGUMENTS`, automatic command routing, and shell interpolation are preserved as prompt guidance only. Adapt them to Codex tools when executing.

## Original Command

Create or update documentation for: $ARGUMENTS

## Documentation Requirements

### 1. Document Type Detection
Identify what type of documentation is needed:
- [ ] README file
- [ ] API documentation
- [ ] User guide
- [ ] Developer documentation
- [ ] Contribution guide
- [ ] Changelog entry

### 2. Content Requirements

#### For README:
- [ ] Project description
- [ ] Installation instructions
- [ ] Quick start guide
- [ ] Usage examples
- [ ] Configuration options
- [ ] Contributing information
- [ ] License

#### For API Documentation:
- [ ] Endpoint descriptions
- [ ] Request/response formats
- [ ] Parameters and types
- [ ] Authentication requirements
- [ ] Error codes and handling
- [ ] Code examples

#### For User Guides:
- [ ] Getting started steps
- [ ] Feature walkthroughs
- [ ] Screenshots/diagrams
- [ ] Common use cases
- [ ] Troubleshooting tips

#### For Developer Docs:
- [ ] Architecture overview
- [ ] Setup instructions
- [ ] Code structure
- [ ] Development workflow
- [ ] Testing guidelines

### 3. Quality Standards

- [ ] Clear and concise language
- [ ] Proper formatting and structure
- [ ] Code examples that work
- [ ] Up-to-date information
- [ ] Links to relevant resources
- [ ] Proper markdown formatting

### 4. Code Documentation

For code comments (JSDoc/docstrings):
```javascript
/**
 * Brief description of function
 * 
 * @param {Type} paramName - Description
 * @returns {Type} Description
 * @throws {Error} When/why
 * 
 * @example
 * const result = functionName('value');
 * // Returns: expectedResult
 */
```

## File Output

Save all documentation files in the `./docs` folder:
- **Location:** `./docs/` folder
- Create the `./docs` directory if it doesn't exist
- Sub-folders: `./docs/plan/`, `./docs/research/`, `./docs/report/`, `./docs/context/`
- Use descriptive filenames (e.g., `api_reference.md`, `user_guide.md`)

## Output Format

Create appropriate documentation files:
- README.md for project overview
- API.md for API documentation
- CONTRIBUTING.md for contribution guidelines
- Inline code comments
- Separate doc files as needed

Ensure documentation is:
- Easy to navigate
- Accurate and current
- Well-formatted
- Includes examples
