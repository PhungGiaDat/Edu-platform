---
name: technology-evaluation
description: Framework for evaluating and selecting technologies, frameworks, and tools
---
# Technology Evaluation

Comprehensive framework for researching, comparing, and selecting technologies for software projects.

## Overview

This skill provides structured approaches for making informed technology decisions.

## Evaluation Process

### Step 1: Define Requirements
- What problem needs solving?
- What are the constraints?
- What are the success criteria?
- What's the timeline?
- What's the budget?

### Step 2: Identify Candidates
- Industry standards
- Open source options
- Commercial solutions
- Emerging technologies

### Step 3: Research & Compare
- Feature comparison
- Performance benchmarks
- Community activity
- Learning curve
- Total cost of ownership

### Step 4: Prototype & Test
- Build proof of concept
- Test critical scenarios
- Measure performance
- Assess developer experience

### Step 5: Make Decision
- Weighted scoring
- Team consensus
- Document decision
- Plan implementation

## Evaluation Criteria

### Technical Criteria

| Criterion | Weight | Questions |
|-----------|--------|-----------|
| **Performance** | High | Speed, efficiency, scalability? |
| **Reliability** | High | Stability, uptime, bug rate? |
| **Security** | High | Vulnerabilities, compliance? |
| **Compatibility** | Medium | Works with existing stack? |
| **Extensibility** | Medium | Plugins, customizations? |
| **Maintainability** | High | Code quality, documentation? |

### Operational Criteria

| Criterion | Weight | Questions |
|-----------|--------|-----------|
| **Community** | Medium | Active development, support? |
| **Documentation** | High | Quality, completeness, examples? |
| **Learning Curve** | Medium | Training time, resources? |
| **Hiring** | Medium | Talent availability? |
| **Support** | Medium | Commercial support available? |
| **Licensing** | High | Cost, restrictions? |

### Business Criteria

| Criterion | Weight | Questions |
|-----------|--------|-----------|
| **Cost** | High | License, infrastructure, training? |
| **Vendor Lock-in** | Medium | Migration difficulty? |
| **Future Roadmap** | Medium | Long-term viability? |
| **Adoption Rate** | Low | Industry trends? |

## Comparison Templates

### Feature Matrix

```markdown
| Feature | Option A | Option B | Option C |
|---------|----------|----------|----------|
| Core feature 1 | ✅ | ✅ | ❌ |
| Core feature 2 | ✅ | ❌ | ✅ |
| Performance | ⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐ |
| Ease of use | ⭐⭐ | ⭐⭐⭐ | ⭐ |
| Documentation | ⭐⭐⭐ | ⭐⭐ | ⭐⭐ |

Legend: ✅ Supported | ❌ Not supported | ⭐ Rating (1-3)
```

### Weighted Scoring

```markdown
| Criterion | Weight | Option A | Score A | Option B | Score B |
|-----------|--------|----------|---------|----------|---------|
| Performance | 0.25 | 8 | 2.0 | 7 | 1.75 |
| Ease of use | 0.20 | 6 | 1.2 | 9 | 1.8 |
| Community | 0.15 | 9 | 1.35 | 6 | 0.9 |
| Cost | 0.20 | 7 | 1.4 | 8 | 1.6 |
| Documentation | 0.10 | 8 | 0.8 | 7 | 0.7 |
| Future-proof | 0.10 | 7 | 0.7 | 8 | 0.8 |
| **Total** | **1.0** | | **7.45** | | **7.55** |

Scale: 1-10 (10 = best)
```

### Cost Analysis

```markdown
## Cost Comparison: [Technology]

### Option A: [Name]

**Initial Costs:**
- License: $X/year
- Setup: $X
- Training: $X
- **Subtotal:** $X

**Ongoing Costs:**
- License renewal: $X/year
- Infrastructure: $X/month
- Support: $X/year
- Maintenance: $X/year
- **Annual:** $X

**3-Year TCO:** $X

### Option B: [Name]
[Same structure]
```

## Research Sources

### Primary Sources
1. **Official Documentation**
   - Getting started guides
   - API references
   - Best practices

2. **GitHub Repository**
   - Stars, forks, contributors
   - Issue activity
   - Release frequency
   - Code quality

3. **Community**
   - Stack Overflow tags
   - Discord/Slack channels
   - Reddit communities
   - Conference talks

4. **Benchmarks**
   - Official benchmarks
   - Third-party comparisons
   - Real-world case studies

### Secondary Sources
1. **Blog Posts**
   - Technical reviews
   - Migration stories
   - Lessons learned

2. **Videos**
   - Tutorial series
   - Conference talks
   - Live coding sessions

3. **Social Proof**
   - Company adoption
   - Job postings
   - Industry surveys

## Proof of Concept Template

```markdown
# PoC: [Technology Name]

## Objective
[Test specific capability or concern]

## Scope
**In Scope:**
- Feature A
- Feature B

**Out of Scope:**
- Feature C

## Implementation

### Setup
[Steps to set up the technology]

### Test Cases
1. **Test Case 1: [Name]**
   - Objective: [What to test]
   - Steps: [How to test]
   - Expected: [Expected result]
   - Actual: [Actual result]
   - Status: [Pass/Fail]

### Code
```language
// Proof of concept code
```

## Findings

### Performance
- Metric 1: [Value]
- Metric 2: [Value]

### Developer Experience
- Setup difficulty: [Easy/Medium/Hard]
- Documentation quality: [1-5]
- Debugging: [Easy/Medium/Hard]

### Limitations
- [Limitation 1]
- [Limitation 2]

## Conclusion
**Recommendation:** [Proceed/Do not proceed/More research needed]

**Rationale:**
[Reasoning]

**Next Steps:**
- [ ] Action 1
- [ ] Action 2
```

## Evaluation Report Template

```markdown
# Technology Evaluation Report
**Technology:** [Name]
**Date:** [Date]
**Evaluator:** [Name]

## Executive Summary
[2-3 sentences with recommendation]

## Background
### Problem Statement
[What problem we're trying to solve]

### Requirements
1. [Requirement 1]
2. [Requirement 2]

## Options Evaluated
1. **Option A:** [Name]
2. **Option B:** [Name]
3. **Option C:** [Name]

## Detailed Analysis

### Option A: [Name]

**Overview:**
[Brief description]

**Pros:**
- [Pro 1]
- [Pro 2]

**Cons:**
- [Con 1]
- [Con 2]

**Key Findings:**
- Finding 1
- Finding 2

**Code Example:**
```language
// Example usage
```

**References:**
- [Link 1]
- [Link 2]

### Option B: [Name]
[Same structure as Option A]

## Comparison Matrix
[Insert comparison table]

## Risk Analysis

| Risk | Option A | Option B | Mitigation |
|------|----------|----------|------------|
| Vendor lock-in | High | Low | Use abstractions |
| Performance | Low | Medium | Load testing |

## Recommendation

**Selected:** [Option X]

**Rationale:**
1. [Reason 1]
2. [Reason 2]
3. [Reason 3]

**Trade-offs Accepted:**
- [Trade-off 1]
- [Trade-off 2]

## Implementation Plan
1. [Step 1]
2. [Step 2]
3. [Step 3]

## Appendix
- Detailed benchmarks
- Code samples
- Community research
```

## Decision Framework

### When to Choose Established Technology
- ✅ Production-critical systems
- ✅ Large team, diverse skill levels
- ✅ Long-term maintenance important
- ✅ Strong support needed
- ✅ Risk-averse stakeholders

### When to Choose Cutting-Edge Technology
- ✅ Experimental projects
- ✅ Small, experienced team
- ✅ Competitive advantage needed
- ✅ Performance is critical
- ✅ Willing to accept risk

### When to Choose Commercial Solutions
- ✅ Enterprise requirements
- ✅ Budget available
- ✅ Support SLA needed
- ✅ Compliance requirements
- ✅ Time to market critical

## Common Pitfalls

1. **Resume-driven development** - Choosing what's trendy
2. **Not testing assumptions** - Believe marketing claims
3. **Ignoring team skills** - Steep learning curve
4. **Underestimating costs** - Hidden expenses
5. **Short-term thinking** - Not considering maintenance
6. **Not prototyping** - Commit without testing
7. **Ignoring community** - Poor support options
8. **Over-engineering** - Too complex for needs

## Best Practices

1. **Define clear requirements first**
2. **Evaluate multiple options**
3. **Build working prototypes**
4. **Test with real scenarios**
5. **Involve the team**
6. **Consider long-term costs**
7. **Document decisions (ADRs)**
8. **Plan for migration**
9. **Have a backup plan**
10. **Review decisions periodically**

## Quick Decision Guide

```markdown
## Frontend Framework
- **Small project:** Vanilla JS, Alpine.js
- **Medium project:** Vue, Svelte
- **Large project:** React, Next.js, Angular
- **Performance critical:** Svelte, Solid

## Backend Framework
- **Startup:** Express, FastAPI, Rails
- **Enterprise:** Spring Boot, .NET, Django
- **Microservices:** Go, Rust, Node.js
- **Real-time:** Elixir, Node.js

## Database
- **Relational:** PostgreSQL, MySQL
- **Document:** MongoDB, CouchDB
- **Key-value:** Redis, DynamoDB
- **Graph:** Neo4j, ArangoDB
- **Search:** Elasticsearch, Meilisearch

## Cloud Provider
- **AWS:** Most features, mature
- **GCP:** ML/AI focus, Kubernetes
- **Azure:** Enterprise, Microsoft stack
- **Vercel/Netlify:** Frontend, simple
```
