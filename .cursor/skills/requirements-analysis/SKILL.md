---
name: requirements-analysis
description: Comprehensive requirements gathering and analysis framework
---
# Requirements Analysis

Structured approach to gathering, analyzing, and documenting software requirements.

## Overview

This skill provides frameworks and templates for effective requirements engineering throughout the SDLC.

## Requirements Types

### Functional Requirements
What the system must do
- User features
- Business processes
- System behaviors
- Data operations

### Non-Functional Requirements
How the system must perform
- Performance
- Security
- Scalability
- Usability
- Reliability

### Constraint Requirements
Limitations and restrictions
- Technical constraints
- Business constraints
- Regulatory requirements
- Budget limitations

## Gathering Techniques

### 1. Stakeholder Interviews

**Preparation:**
- Identify all stakeholders
- Prepare interview questions
- Schedule appropriate time

**Interview Template:**
```markdown
## Interview: [Stakeholder Name]
**Role:** [Title]
**Date:** [Date]

### Current State
1. What is the current process?
2. What tools do you use?
3. What works well?
4. What are the pain points?

### Future State
1. What should the new system do?
2. What problems should it solve?
3. What features are must-haves?
4. What features are nice-to-have?

### Constraints
1. Timeline requirements?
2. Budget limitations?
3. Technical constraints?
4. Compliance requirements?

### Success Criteria
1. How will you measure success?
2. What would make this a failure?
3. What are the deal-breakers?

### Follow-ups
- [ ] Action item 1
- [ ] Action item 2
```

### 2. User Stories

**Standard Format:**
```
As a [type of user]
I want [goal]
So that [benefit]

Acceptance Criteria:
- Given [context]
  When [action]
  Then [outcome]
```

**Example:**
```markdown
As a registered customer
I want to save items to a wishlist
So that I can purchase them later

Acceptance Criteria:
- Given I am logged in
  When I click "Add to Wishlist" on a product
  Then the product is added to my wishlist
  
- Given I have items in my wishlist
  When I view my wishlist
  Then I see all saved items with prices and availability

Priority: Medium
Story Points: 3
Sprint: 5
```

### 3. Use Cases

**Template:**
```markdown
## Use Case: [Name]

**Actor:** [Primary user]
**Goal:** [What they want to achieve]
**Preconditions:** [What must be true before]
**Postconditions:** [What is true after success]

### Main Success Scenario
1. User does action 1
2. System responds with 2
3. User does action 3
4. System completes with 4

### Alternative Flows
**3a. Invalid input:**
1. System shows error
2. User corrects input
3. Return to step 3

### Exception Flows
**3b. System error:**
1. System logs error
2. System shows error message
3. User can retry or cancel

### Frequency: [How often]
### Priority: [High/Medium/Low]
### Special Requirements: [Performance, security, etc.]
```

### 4. Requirements Workshop

**Agenda:**
```markdown
## Requirements Workshop
**Project:** [Name]
**Date:** [Date]
**Duration:** [Hours]

### Attendees
- [ ] Product Owner
- [ ] Technical Lead
- [ ] UX Designer
- [ ] Key Stakeholders

### Agenda
1. **Introduction (15 min)**
   - Project overview
   - Workshop goals
   
2. **Current State Analysis (45 min)**
   - Process walkthrough
   - Pain points discussion
   
3. **Future State Vision (60 min)**
   - Feature brainstorming
   - Prioritization exercise
   
4. **Technical Discussion (45 min)**
   - Integration requirements
   - Technical constraints
   
5. **Wrap-up (15 min)**
   - Action items
   - Next steps

### Preparation
- [ ] Book room/zoom
- [ ] Send pre-read materials
- [ ] Prepare templates
- [ ] Set up collaboration tools

### Outputs
- [ ] Feature list
- [ ] Priority matrix
- [ ] Action items
- [ ] Risk list
```

## Analysis Frameworks

### MoSCoW Prioritization

| Priority | Meaning | Example |
|----------|---------|---------|
| **M**ust Have | Critical for launch | User authentication |
| **S**hould Have | Important but not critical | Password reset |
| **C**ould Have | Nice to have | Social login |
| **W**on't Have | Not in this release | Multi-factor auth |

### Requirements Matrix

```markdown
| Requirement | Priority | Complexity | Risk | Dependencies | Status |
|-------------|----------|------------|------|--------------|--------|
| User login | Must | Low | Low | None | Approved |
| Search | Must | Medium | Medium | Database | Review |
| Payment | Must | High | High | Gateway API | Draft |
| Reports | Should | Medium | Low | Analytics | New |
```

### Gap Analysis

```markdown
## Gap Analysis: [Feature Area]

### Current State
- What exists today
- Current capabilities
- Current limitations

### Desired State
- What should exist
- Required capabilities
- Success metrics

### Gap
| Gap | Impact | Effort | Priority |
|-----|--------|--------|----------|
| Missing feature 1 | High | High | 1 |
| Missing feature 2 | Medium | Low | 2 |
| Missing feature 3 | Low | Medium | 3 |

### Recommendations
1. [Recommendation 1]
2. [Recommendation 2]
```

## Documentation Templates

### Requirements Document

```markdown
# Requirements Document
**Project:** [Name]
**Version:** [1.0]
**Date:** [Date]

## 1. Executive Summary
[2-3 paragraphs summarizing the project]

## 2. Project Overview
### 2.1 Purpose
[Why this project exists]

### 2.2 Scope
**In Scope:**
- [Item 1]
- [Item 2]

**Out of Scope:**
- [Item 1]
- [Item 2]

### 2.3 Definitions
| Term | Definition |
|------|------------|
| API | Application Programming Interface |

## 3. Stakeholders
| Role | Name | Responsibilities |
|------|------|------------------|
| Product Owner | [Name] | Requirements approval |

## 4. Functional Requirements
### FR-001: [Requirement Name]
**Priority:** Must Have
**Description:** [Detailed description]
**Acceptance Criteria:**
- [ ] Criterion 1
- [ ] Criterion 2

## 5. Non-Functional Requirements
### NFR-001: Performance
- Response time: < 200ms
- Concurrent users: 10,000
- Availability: 99.9%

### NFR-002: Security
- Authentication: OAuth 2.0
- Encryption: AES-256
- Compliance: GDPR

## 6. User Stories
[Link to user stories]

## 7. Use Cases
[Link to use cases]

## 8. Constraints
- Technical: [List]
- Budget: [Amount]
- Timeline: [Date]

## 9. Assumptions
- [Assumption 1]
- [Assumption 2]

## 10. Dependencies
| Dependency | Type | Status |
|------------|------|--------|
| API Gateway | External | Available |

## 11. Risks
| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| [Risk] | High/Medium/Low | High/Medium/Low | [Plan] |

## 12. Approval
| Role | Name | Signature | Date |
|------|------|-----------|------|
| Product Owner | | | |
| Tech Lead | | | |
```

### Architecture Decision Record

```markdown
# ADR-[Number]: [Title]

## Status
[Proposed | Accepted | Deprecated | Superseded]

## Context
[What is the issue we need to address]

## Decision
[What is the change we're proposing/have made]

## Consequences
### Positive
- [Benefit 1]

### Negative
- [Trade-off 1]

### Neutral
- [Impact 1]

## Alternatives Considered
1. [Alternative 1]
   - Pros: [List]
   - Cons: [List]
   - Why not chosen: [Reason]

## References
- [Link 1]
- [Link 2]
```

## Validation Checklist

### Requirements Review Checklist
- [ ] All requirements are clear and unambiguous
- [ ] Requirements are testable
- [ ] No duplicate requirements
- [ ] No conflicting requirements
- [ ] All requirements are prioritized
- [ ] Dependencies identified
- [ ] Risks documented
- [ ] Stakeholders reviewed
- [ ] Acceptance criteria defined
- [ ] Estimated effort assigned

### Quality Criteria (INVEST)
- **I**ndependent: Can be developed separately
- **N**egotiable: Can be adjusted
- **V**aluable: Provides value to user
- **E**stimable: Can be estimated
- **S**mall: Fits in one sprint
- **T**estable: Can be verified

## Traceability Matrix

```markdown
| Requirement | User Story | Test Case | Status |
|-------------|------------|-----------|--------|
| FR-001 | US-101 | TC-001 | Pass |
| FR-002 | US-102 | TC-002 | Fail |
```

## Common Pitfalls

1. **Vague requirements** - Be specific and measurable
2. **Missing acceptance criteria** - Always include
3. **Gold plating** - Don't add unrequested features
4. **Scope creep** - Strict change control
5. **Missing non-functional** - Performance matters
6. **No prioritization** - Everything can't be #1
7. **Ignoring stakeholders** - Get sign-off
8. **Technical jargon** - Use clear language

## Best Practices

1. **Involve all stakeholders early**
2. **Use multiple gathering techniques**
3. **Document everything**
4. **Prioritize ruthlessly**
5. **Validate with users**
6. **Review and iterate**
7. **Maintain traceability**
8. **Keep requirements current**
