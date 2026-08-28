---
name: technical-writing
description: Comprehensive guide to technical documentation, writing, and communication
---
# Technical Writing

Complete guide to creating clear, comprehensive, and user-friendly technical documentation.

## Overview

This skill provides templates, guidelines, and best practices for all types of technical documentation.

## Documentation Types

### User Documentation
- Getting Started guides
- Tutorials
- How-to guides
- FAQs
- Troubleshooting guides

### Developer Documentation
- API references
- Architecture docs
- Code documentation
- Development guides
- Contribution guides

### Project Documentation
- README files
- CHANGELOGs
- Roadmaps
- Decision logs
- Meeting notes

## Core Principles

### 1. Audience First
Know who you're writing for:
- **Beginners:** More explanation, step-by-step
- **Experts:** Concise, reference-style
- **Mixed:** Progressive disclosure

### 2. Clear and Concise
- Use simple language
- Avoid jargon (or explain it)
- One idea per sentence
- Active voice
- Short paragraphs

### 3. Scannable
- Use headings and subheadings
- Bullet points for lists
- Bold for emphasis
- Code blocks for examples
- Tables for comparisons

### 4. Accurate
- Verify all information
- Keep it updated
- Test all code examples
- Version documentation
- Note deprecations

## Documentation Templates

### README Template

```markdown
# Project Name

Brief description of what this project does and who it's for.

[![Build Status](badge-url)](link)
[![npm version](badge-url)](link)
[![License](badge-url)](link)

## Features

- Feature 1
- Feature 2
- Feature 3

## Requirements

- Node.js >= 18.0
- npm >= 9.0
- PostgreSQL >= 14

## Installation

\`\`\`bash
# Clone repository
git clone https://github.com/org/project.git

# Install dependencies
npm install

# Setup environment
cp .env.example .env
# Edit .env with your configuration

# Initialize database
npm run db:init

# Start development server
npm run dev
\`\`\`

## Quick Start

\`\`\`javascript
import { Client } from 'project-name';

const client = new Client({
  apiKey: process.env.API_KEY
});

const result = await client.doSomething();
console.log(result);
\`\`\`

## Usage

### Basic Usage

[Detailed explanation with examples]

### Advanced Usage

[More complex scenarios]

### Configuration

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `apiKey` | string | required | Your API key |
| `timeout` | number | 5000 | Request timeout in ms |

## API Reference

### `methodName(param1, param2)`

Description of what the method does.

**Parameters:**
- `param1` (string): Description
- `param2` (number, optional): Description

**Returns:** `Promise<Result>`

**Example:**
\`\`\`javascript
const result = await client.methodName('value', 123);
\`\`\`

**Throws:**
- `ValidationError`: When parameters are invalid
- `NetworkError`: When request fails

## Examples

### Example 1: [Scenario]

\`\`\`javascript
// Complete working example
\`\`\`

## Troubleshooting

### Common Issues

**Problem:** Error message
**Solution:** Steps to fix

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

MIT © [Year] [Author]

## Acknowledgments

- Thanks to...
- Built with...
```

### API Documentation Template

```markdown
# API Reference

Base URL: `https://api.example.com/v1`

## Authentication

All API requests require authentication using Bearer tokens.

\`\`\`
Authorization: Bearer <your-token>
\`\`\`

Get your token from the [Dashboard](url).

## Rate Limits

| Plan | Requests/min | Requests/day |
|------|--------------|--------------|
| Free | 60 | 1,000 |
| Pro | 600 | 50,000 |
| Enterprise | Unlimited | Unlimited |

## Endpoints

### Users

#### List Users

\`\`\`http
GET /users
\`\`\`

List all users with pagination.

**Parameters:**
| Name | Type | Location | Required | Description |
|------|------|----------|----------|-------------|
| `page` | integer | query | No | Page number (default: 1) |
| `limit` | integer | query | No | Items per page (default: 20, max: 100) |
| `search` | string | query | No | Search by name or email |

**Response:**
\`\`\`json
{
  "data": [
    {
      "id": "usr_123",
      "name": "John Doe",
      "email": "john@example.com",
      "created_at": "2024-01-01T00:00:00Z"
    }
  ],
  "meta": {
    "total": 100,
    "page": 1,
    "limit": 20,
    "total_pages": 5
  }
}
\`\`\`

**Status Codes:**
- `200` - Success
- `401` - Unauthorized
- `429` - Rate limit exceeded

#### Create User

\`\`\`http
POST /users
\`\`\`

Create a new user.

**Request Body:**
\`\`\`json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "securepassword123"
}
\`\`\`

**Response:**
\`\`\`json
{
  "id": "usr_123",
  "name": "John Doe",
  "email": "john@example.com",
  "created_at": "2024-01-01T00:00:00Z"
}
\`\`\`

**Status Codes:**
- `201` - Created
- `400` - Invalid request
- `409` - Email already exists

## Error Handling

All errors follow this format:

\`\`\`json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid email format",
    "details": {
      "field": "email",
      "constraint": "email"
    }
  }
}
\`\`\`

### Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `VALIDATION_ERROR` | 400 | Invalid request data |
| `AUTHENTICATION_ERROR` | 401 | Missing or invalid token |
| `AUTHORIZATION_ERROR` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `RATE_LIMIT` | 429 | Too many requests |
| `SERVER_ERROR` | 500 | Internal server error |

## Webhooks

Configure webhooks in your dashboard to receive real-time events.

### Events

| Event | Description |
|-------|-------------|
| `user.created` | New user registered |
| `user.updated` | User profile updated |
| `user.deleted` | User account deleted |

### Payload

\`\`\`json
{
  "event": "user.created",
  "data": {
    "id": "usr_123",
    "name": "John Doe"
  },
  "timestamp": "2024-01-01T00:00:00Z",
  "signature": "sha256=..."
}
\`\`\`
```

### Tutorial Template

```markdown
# Tutorial: [Title]

**Level:** Beginner/Intermediate/Advanced
**Time:** [Estimated time]
**Prerequisites:**
- [Requirement 1]
- [Requirement 2]

## What You'll Build

[Brief description of the end result]

[Screenshot or diagram if applicable]

## What You'll Learn

- Objective 1
- Objective 2
- Objective 3

## Prerequisites

Before starting, make sure you have:
- [Item 1 with link]
- [Item 2 with link]

## Step 1: [Title]

[Explanation of what we're doing and why]

\`\`\`bash
# Command to run
npm install package-name
\`\`\`

**What this does:**
[Explanation]

**Expected output:**
\`\`\`
Success message
\`\`\`

### Common Issues

**Problem:** [Issue description]
**Solution:** [Fix]

## Step 2: [Title]

[Continue with next step...]

## Testing Your Work

Verify your implementation:

\`\`\`bash
npm test
\`\`\`

You should see:
\`\`\`
✓ Test 1 passed
✓ Test 2 passed
\`\`\`

## Next Steps

- [Link to next tutorial]
- [Link to advanced topics]
- [Link to API reference]

## Troubleshooting

### [Common Problem 1]
[Solution]

### [Common Problem 2]
[Solution]

## Summary

Congratulations! You've learned:
- [Recap of objectives]

Keep learning with [next resource].
```

## Code Documentation

### JSDoc (JavaScript/TypeScript)

```javascript
/**
 * Calculates the total price including tax and discounts.
 * 
 * @description
 * This function applies the tax rate to the subtotal and then
 * subtracts any applicable discounts. The order of operations
 * matters for accurate calculation.
 * 
 * @param {number} subtotal - The base price before tax and discounts
 * @param {number} taxRate - The tax rate as a decimal (e.g., 0.1 for 10%)
 * @param {Discount[]} discounts - Array of applicable discounts
 * @returns {number} The final price after tax and discounts
 * @throws {ValidationError} If subtotal is negative
 * @throws {ValidationError} If taxRate is not between 0 and 1
 * 
 * @example
 * // Basic usage
 * const total = calculateTotal(100, 0.1, []);
 * console.log(total); // 110
 * 
 * @example
 * // With discount
 * const total = calculateTotal(100, 0.1, [{ type: 'percentage', value: 0.2 }]);
 * console.log(total); // 88 (110 - 20% = 88)
 * 
 * @see {@link https://example.com/docs/pricing|Pricing Documentation}
 * @since 1.0.0
 */
function calculateTotal(subtotal, taxRate, discounts) {
  // Implementation
}
```

### Python Docstrings

```python
def calculate_total(subtotal: float, tax_rate: float, discounts: List[Discount]) -> float:
    """
    Calculate the total price including tax and discounts.
    
    This function applies the tax rate to the subtotal and then
    subtracts any applicable discounts. The order of operations
    matters for accurate calculation.
    
    Args:
        subtotal: The base price before tax and discounts.
            Must be a non-negative number.
        tax_rate: The tax rate as a decimal (e.g., 0.1 for 10%).
            Must be between 0 and 1 inclusive.
        discounts: List of discount objects to apply.
            Each discount must have 'type' and 'value' attributes.
    
    Returns:
        The final price after tax and discounts, rounded to 2 decimal places.
    
    Raises:
        ValidationError: If subtotal is negative.
        ValidationError: If tax_rate is not between 0 and 1.
    
    Example:
        >>> calculate_total(100, 0.1, [])
        110.0
        
        >>> calculate_total(100, 0.1, [{'type': 'percentage', 'value': 0.2}])
        88.0
    
    Note:
        The function rounds the result to 2 decimal places to
        avoid floating-point precision issues in monetary calculations.
    
    See Also:
        - apply_discount: For applying a single discount
        - calculate_tax: For tax calculation only
    """
    pass
```

## Writing Style Guide

### Voice and Tone
- **Be helpful:** Anticipate questions
- **Be clear:** Avoid ambiguity
- **Be concise:** Respect reader's time
- **Be consistent:** Use same terminology

### Formatting Rules

**Headings:**
```markdown
# H1 - Page title (one per page)
## H2 - Major sections
### H3 - Subsections
#### H4 - Details
```

**Lists:**
```markdown
- Unordered list item
  - Nested item
- Another item

1. Ordered list
2. Second item
   1. Nested ordered
```

**Emphasis:**
- **Bold** for UI elements, important terms
- *Italic* for emphasis, first use of terms
- `Code` for commands, file names, code

**Links:**
```markdown
[Link text](url)
[Reference to section](#section-id)
```

## Common Documentation

### CHANGELOG

```markdown
# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/),
and this project adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added
- New feature description

### Changed
- Change description

### Fixed
- Bug fix description

## [1.2.0] - 2024-01-15

### Added
- Feature: User authentication
- Feature: Dashboard analytics

### Changed
- Improved API response time by 50%

### Fixed
- Fixed memory leak in worker process

### Security
- Updated dependencies to fix CVE-2024-1234

## [1.1.0] - 2024-01-01
...
```

### CONTRIBUTING

```markdown
# Contributing Guide

Thank you for your interest in contributing!

## Code of Conduct

Please read our [Code of Conduct](CODE_OF_CONDUCT.md).

## Getting Started

1. Fork the repository
2. Clone your fork
3. Install dependencies: `npm install`
4. Create a branch: `git checkout -b feature/my-feature`

## Development

### Setup
\`\`\`bash
npm install
npm run dev
\`\`\`

### Testing
\`\`\`bash
npm test
npm run test:coverage
\`\`\`

### Linting
\`\`\`bash
npm run lint
npm run lint:fix
\`\`\`

## Pull Request Process

1. Update documentation
2. Add tests for new features
3. Ensure all tests pass
4. Update CHANGELOG.md
5. Request review

## Coding Standards

- Follow existing code style
- Write meaningful commit messages
- Add comments for complex logic
- Update documentation

## Questions?

Open an issue or email maintainers@example.com.
```

## Best Practices

1. **Write for your audience**
2. **Keep it updated**
3. **Use examples liberally**
4. **Test all code snippets**
5. **Provide context**
6. **Link to related docs**
7. **Version your docs**
8. **Accept feedback**
9. **Use simple language**
10. **Structure for scanning**
