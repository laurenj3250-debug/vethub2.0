# VetHub Learning System

This directory contains accumulated learnings, mistakes, and improvements for the VetHub 2.0 project. Claude Code automatically references these files to avoid repeating mistakes and continuously improve.

## How It Works

1. **Mistakes are documented** - When errors occur, they're logged here with context and solutions
2. **Claude learns** - Claude Code reads these files before making changes
3. **Patterns emerge** - Common issues become documented best practices
4. **Quality improves** - Same mistakes aren't repeated

## Files

- `mistakes.md` - Documented errors and how they were fixed
- `design-review-feedback.md` - Accumulated design review feedback
- `performance-issues.md` - Performance problems and optimizations
- `accessibility-issues.md` - Accessibility problems encountered and solved
- `veterinary-domain-knowledge.md` - Clinical workflow insights from users

## Usage

### When Making Changes
Claude Code will automatically check these learnings before:
- Creating new components
- Modifying existing features
- Writing tests
- Reviewing code

### Adding New Learnings
When you encounter an issue:

```markdown
## [Date] - Brief Description

**Context**: What were you trying to do?
**Mistake**: What went wrong?
**Impact**: How did it affect the system/users?
**Solution**: How was it fixed?
**Prevention**: How to avoid this in the future?
**Related**: Link to PR, issue, or commit
```

### Example Entry

```markdown
## 2025-11-14 - Patient Status Color Inconsistency

**Context**: Updating patient list to show status badges
**Mistake**: Used hardcoded `bg-red-600` instead of design token `bg-patient-status-critical`
**Impact**: Inconsistent colors across app, harder to maintain
**Solution**: Updated to use `patient-status-critical` from tailwind.config.ts
**Prevention**: Always check tailwind.config.ts for existing design tokens before hardcoding colors
**Related**: See .claude/context/style-guide.md for all design tokens
```

## Integration

This learning system is integrated into:
- ✅ Claude Code system prompts (via CLAUDE.md)
- ✅ Design review process (checks against past mistakes)
- ✅ Pre-commit hooks (optional - validates against known issues)
- ✅ Documentation (referenced in development workflow)

## Principles

1. **No Blame** - Mistakes are learning opportunities
2. **Be Specific** - Include concrete examples and code snippets
3. **Solution-Focused** - Always include how it was fixed
4. **Preventative** - Document how to avoid the mistake
5. **Searchable** - Use clear headings and keywords
