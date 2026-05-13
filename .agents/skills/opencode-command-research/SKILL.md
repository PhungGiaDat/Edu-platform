---
name: opencode-command-research
description: Migrated OpenCode slash command `research`. Use when the user asks to run or follow the old OpenCode `/research` workflow.
---

# opencode-command-research

This skill was migrated from `.opencode/commands/research.md`.

OpenCode slash-command runtime features such as `$ARGUMENTS`, automatic command routing, and shell interpolation are preserved as prompt guidance only. Adapt them to Codex tools when executing.

## Original Command

Research and investigate: $ARGUMENTS

## Research Objectives

### 1. Define Research Questions
- What specific questions need answering?
- What decisions need to be made?
- What constraints must be considered?

### 2. Research Scope

#### Technology Evaluation
- [ ] Core features and capabilities
- [ ] Performance characteristics
- [ ] Learning curve
- [ ] Community support
- [ ] Maintenance status
- [ ] License and cost

#### Problem Investigation
- [ ] Root cause analysis
- [ ] Similar issues reported
- [ ] Potential solutions
- [ ] Workarounds available
- [ ] Long-term fixes

#### Solution Comparison
- [ ] Feature comparison matrix
- [ ] Performance benchmarks
- [ ] Cost analysis
- [ ] Integration complexity
- [ ] Future scalability

### 3. Information Sources

Gather information from:
- [ ] Official documentation
- [ ] GitHub repositories
- [ ] Stack Overflow
- [ ] Technical blogs
- [ ] Industry reports
- [ ] Community forums

### 4. Analysis Criteria

Evaluate options based on:
- **Performance**: Speed, efficiency, resource usage
- **Usability**: Learning curve, developer experience
- **Reliability**: Stability, bug frequency
- **Community**: Support, ecosystem, plugins
- **Cost**: Licensing, hosting, maintenance
- **Future**: Roadmap, adoption trends

## Output Format

```markdown
# Research Report: [Topic]

## Executive Summary
[2-3 sentence summary of findings]

## Research Questions
1. Question 1
2. Question 2

## Findings

### Option A: [Name]
**Description:** [Brief overview]

**Pros:**
- Pro 1
- Pro 2

**Cons:**
- Con 1
- Con 2

**Code Example:**
```language
// Example usage
```

**Sources:**
- [Source 1](url)

### Option B: [Name]
[Same structure]

## Comparison Matrix

| Criteria | Option A | Option B | Option C |
|----------|----------|----------|----------|
| Performance | ⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐ |
| Ease of Use | ⭐⭐ | ⭐⭐⭐ | ⭐ |
| Cost | Free | $$$ | $ |

## Recommendation

[Clear recommendation with reasoning]

**Recommended:** Option X

**Reasoning:**
- Reason 1
- Reason 2

## Implementation Notes

[Important considerations for implementation]

## Next Steps

1. Action item 1
2. Action item 2

## References

- [Source 1](url) - Description
- [Source 2](url) - Description
```

Be thorough, objective, and cite all sources.

## File Output

Save the research report as a markdown file:
- **Location:** `./docs/research/` folder
- **Filename format:** `YYYYmmdd_<research_title>.md` (e.g., `20260225_redis_caching.md`)
- Create the `./docs/research` directory if it doesn't exist
- Use underscores for spaces in the title
