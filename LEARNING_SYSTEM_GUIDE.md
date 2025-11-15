# VetHub Learning System - Complete Guide

## 🧠 What is the Learning System?

The VetHub Learning System creates a **feedback loop** where Claude Code learns from mistakes, design reviews, and user insights to continuously improve development quality.

### How It Works

```
┌─────────────────────────────────────────────────────────┐
│                  Development Cycle                      │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
         ┌──────────────────────────────────┐
         │  1. Claude checks learnings      │
         │     before making changes        │
         └──────────────────────────────────┘
                           │
                           ▼
         ┌──────────────────────────────────┐
         │  2. Implement feature using      │
         │     documented best practices    │
         └──────────────────────────────────┘
                           │
                           ▼
         ┌──────────────────────────────────┐
         │  3. Automated suggestion to      │
         │     run design review (hook)     │
         └──────────────────────────────────┘
                           │
                           ▼
         ┌──────────────────────────────────┐
         │  4. @agent-design-review runs    │
         │     comprehensive validation     │
         └──────────────────────────────────┘
                           │
                           ▼
         ┌──────────────────────────────────┐
         │  5. Feedback is categorized and  │
         │     documented in learnings/     │
         └──────────────────────────────────┘
                           │
                           ▼
         ┌──────────────────────────────────┐
         │  6. Patterns emerge, preventing  │
         │     same mistakes in future      │
         └──────────────────────────────────┘
                           │
                           ▼
         ┌──────────────────────────────────┐
         │  7. Quality improves, velocity   │
         │     increases over time          │
         └──────────────────────────────────┘
```

---

## 📂 Learning System Files

### `.claude/learnings/`

**Directory structure:**
```
.claude/learnings/
├── README.md                           # System overview
├── mistakes.md                         # Documented errors & solutions
├── design-review-feedback.md           # Accumulated design reviews
└── veterinary-domain-knowledge.md      # Clinical insights
```

### Purpose of Each File

#### `mistakes.md`
**What**: Documented coding errors and how they were fixed
**When to use**: After encountering any bug, issue, or mistake
**Format**:
```markdown
## [Date] - [Brief Description]

**Context**: What were you trying to do?
**Mistake**: What went wrong?
**Impact**: How did it affect users/system?
**Solution**: How was it fixed?
**Prevention**: How to avoid this in the future?
**Code Example**: Before/after code
```

#### `design-review-feedback.md`
**What**: Accumulated feedback from design reviews showing patterns
**When to use**: After each design review
**Format**:
```markdown
## [Date] - [Feature Name]

**Overall**: Summary
**Blockers**: Critical issues
**High-Priority**: Important issues
**Medium-Priority**: Suggestions
**Learnings**: What patterns emerged?
```

#### `veterinary-domain-knowledge.md`
**What**: Clinical workflow insights from veterinarians
**When to use**: When users provide feedback or request features
**Format**:
```markdown
## [Clinical Topic]

**Reality**: How it actually works in practice
**Requirements**: What veterinarians need
**Learning**: Key insight
**Implementation**: How VetHub supports this
```

---

## 🔗 Workflow Integration

### 1. Session Start Hook

**File**: `.claude/hooks/session-start.json`

**What it does**:
- Loads summary of documented learnings
- Displays recent mistakes to avoid
- Shows workflow reminders

**Example output**:
```
📚 VetHub Learning System Active

I have loaded 23 documented learnings to avoid repeating mistakes.

Recent learnings: Hardcoding Colors, Brittle Test Selectors,
Missing Form Labels, Incorrect Medical Units, Not Memoizing...

Workflow Reminders:
- Use design tokens from tailwind.config.ts
- Run @agent-design-review after UI changes
- Write Playwright tests for new features
- Check .claude/learnings/mistakes.md before implementing
```

### 2. Post-Edit Hook

**File**: `.claude/hooks/post-tool-use.json`

**What it does**:
- Detects when UI files are edited
- Automatically suggests running design review
- Reminds about validation steps

**Example output**:
```
💡 Design Review Suggestion: You just modified a UI component.
Consider running @agent-design-review to validate:
- Responsive design (375px, 768px, 1440px)
- Accessibility (WCAG 2.1 AA)
- Design system compliance
- VetHub clinical workflow patterns

Or run /design-review for a quick check.
```

---

## 🎯 How to Use the Learning System

### For New Development

**Before implementing**:
1. Read `.claude/learnings/mistakes.md` for relevant patterns
2. Check `.claude/learnings/design-review-feedback.md` for common issues
3. Review `.claude/learnings/veterinary-domain-knowledge.md` for domain context

**During implementation**:
- Claude automatically checks learnings
- Hooks remind about design review
- Best practices are applied proactively

**After implementation**:
1. Run `@agent-design-review`
2. Document any new learnings
3. Update patterns if issues recur

### Documenting a New Mistake

**Scenario**: You hardcoded a color and design review flagged it

**Steps**:
1. Open `.claude/learnings/mistakes.md`
2. Add new entry:
```markdown
## 2025-11-15 - Hardcoded Patient Status Color

**Context**: Adding new patient type badge
**Mistake**: Used `bg-orange-500` instead of design token
**Impact**: Inconsistent with other status badges
**Solution**: Changed to `bg-patient-status-monitoring`
**Prevention**: Always check tailwind.config.ts for design tokens first
**Code Example**:
```tsx
// ❌ WRONG
<Badge className="bg-orange-500">Monitoring</Badge>

// ✅ CORRECT
<Badge className="bg-patient-status-monitoring">Monitoring</Badge>
```
**Reference**: tailwind.config.ts line 40
```

3. Save file
4. Next time: Claude knows to use design tokens

### Documenting Design Review Feedback

**Scenario**: Design review found focus state issues

**Steps**:
1. Open `.claude/learnings/design-review-feedback.md`
2. Add review entry:
```markdown
## 2025-11-15 - Medication Input Form

**Overall**: Good structure, but accessibility issues with focus

**Blockers**: None

**High-Priority**:
- Input focus states only 1px ring, need 2px for 3:1 contrast
- Submit button has no disabled state

**Medium-Priority**:
- Consider adding medication autocomplete
- Validation error messages could be more specific

**Learnings**:
- **Pattern**: Focus states are consistently flagged → Update default Input component
- **Pattern**: Disabled states often missed → Add to component checklist
- **Action**: Update mistakes.md with focus state examples
```

3. Note patterns in "Learnings" section
4. If pattern appears 3+ times, update base components

### Documenting Clinical Insights

**Scenario**: Veterinarian requests dose calculator

**Steps**:
1. Open `.claude/learnings/veterinary-domain-knowledge.md`
2. Add to "Future Clinical Features" or create new section:
```markdown
## Dose Calculator Request

**Reality**: Residents calculate drug doses manually during rounds
**Timing**: Under time pressure, easy to make errors
**Requirements**:
- Weight-based dosing (mg/kg → total mg)
- Common drugs pre-populated
- Quick access from medication input
- Dose range validation

**Learning**: Manual calculations are error-prone under pressure
**Implementation**: Add dose calculator modal with drug library
**Priority**: High - affects patient safety

**User Quote**: "I spend 2-3 minutes per patient calculating doses.
With 10 patients, that's 20-30 minutes I could spend on patient care."
```

3. Prioritize feature
4. Reference when implementing

---

## 📊 Measuring Improvement

### Metrics to Track

**Before Learning System**:
- Design review issues per feature: ~8
- Blockers per review: ~2
- Repeat mistakes: ~60%
- Time to implement feature: Baseline

**After Learning System (Target)**:
- Design review issues per feature: <4 (50% reduction)
- Blockers per review: <1 (50% reduction)
- Repeat mistakes: <20% (70% reduction)
- Time to implement feature: -20% (faster with fewer mistakes)

### How to Track

Create `.claude/learnings/metrics.md`:
```markdown
# VetHub Quality Metrics

## Week of Nov 11-17, 2025

**Features Implemented**: 3
**Design Reviews Run**: 3
**Total Issues Found**: 18
**Blockers**: 2
**High-Priority**: 6
**Medium-Priority**: 8
**Nitpicks**: 2

**Repeat Issues**:
- Focus states: 2 times (pattern emerging)
- Color contrast: 1 time
- Mobile spacing: 2 times (pattern emerging)

**Actions**:
- Update default Button component with focus:ring-2
- Add mobile spacing to style guide
```

---

## 🔄 Continuous Improvement Process

### Weekly Review (Recommended)

**Every Friday**:
1. Review all design feedback from the week
2. Identify patterns (3+ occurrences)
3. Update base components if needed
4. Add to `mistakes.md` if preventable
5. Update style guide with new best practices

### Monthly Review

**First Monday of Month**:
1. Analyze metrics (issues per review, repeat rate)
2. Review veterinary domain knowledge additions
3. Prioritize feature requests from clinical insights
4. Update development workflow guide if needed
5. Celebrate improvements in quality metrics

### Quarterly Review

**Every 3 Months**:
1. Comprehensive review of all learning files
2. Retire outdated learnings
3. Consolidate patterns into component library
4. Update design system based on learnings
5. Plan major improvements based on accumulated insights

---

## 🎓 Best Practices

### Do's

✅ **Document immediately** - Don't wait, capture learnings while fresh
✅ **Be specific** - Include code examples, not just descriptions
✅ **Focus on prevention** - Always include "how to avoid this"
✅ **Link to sources** - Reference PRs, commits, design reviews
✅ **Update regularly** - Keep learnings current and relevant
✅ **Share patterns** - When same issue appears 3+ times, it's a pattern

### Don'ts

❌ **Don't blame** - Mistakes are learning opportunities
❌ **Don't be vague** - "Fix UI" doesn't help; "Add focus:ring-2 to buttons" does
❌ **Don't skip documentation** - Even small learnings add up
❌ **Don't hoard learnings** - If you learned it, others should too
❌ **Don't leave outdated entries** - Clean up obsolete learnings
❌ **Don't ignore patterns** - 3+ occurrences = systematic issue to fix

---

## 🚀 Advanced Usage

### Creating Learning Templates

For recurring mistake types, create templates:

**`.claude/learnings/templates/design-mistake.md`**:
```markdown
## [Date] - [Component Name] - [Issue Type]

**Context**: Implementing [feature] for [user story]
**Mistake**: [Specific error made]
**Impact**: [How it affected quality/users]
**Solution**: [How it was fixed]
**Prevention**: [Checklist to prevent recurrence]

**Code Example**:
```tsx
// ❌ WRONG
[bad code]

// ✅ CORRECT
[good code]
```

**Design Review Evidence**: [Screenshot or quote]
**Related Learnings**: [Links to similar past mistakes]
**Action Items**:
- [ ] Update base component
- [ ] Add to style guide
- [ ] Create test case
- [ ] Update documentation
```

### Automated Pattern Detection

Future enhancement: Script to analyze learnings and detect patterns:

```bash
# Count occurrences of specific issues
grep -r "focus state" .claude/learnings/ | wc -l

# Find most common mistakes
grep "^##" .claude/learnings/mistakes.md | sort | uniq -c | sort -rn

# Identify recurring design review issues
grep "High-Priority" .claude/learnings/design-review-feedback.md
```

---

## 🔧 Troubleshooting

### "Learnings aren't being referenced"

**Check**:
1. Files exist in `.claude/learnings/`
2. CLAUDE.md references the learning system
3. Session start hook is enabled
4. Claude Code has been restarted

**Fix**: Restart Claude Code session to reload learnings

### "Hooks aren't triggering"

**Check**:
1. Hook files are in `.claude/hooks/`
2. JSON syntax is valid
3. Hooks are enabled in settings
4. Timeout is sufficient (2000ms recommended)

**Fix**: Validate JSON with `cat .claude/hooks/session-start.json | jq`

### "Too many learnings, overwhelming"

**Solution**:
1. Archive old learnings to `.claude/learnings/archive/`
2. Keep only last 3 months in active files
3. Create `quick-reference.md` with top 10 patterns
4. Focus on patterns, not individual mistakes

---

## 📈 Success Stories

### Example: Focus State Pattern

**Before**:
- Focus states failed in 60% of design reviews
- Each fix took 15-20 minutes
- Same issue repeated across components

**Learning Process**:
1. Documented in `mistakes.md` after first occurrence
2. Added to `design-review-feedback.md` pattern analysis
3. Updated default Button component template
4. Added automated test for focus states

**After**:
- Focus states pass in 95% of reviews
- New components inherit correct pattern
- Time saved: ~10 hours over 3 months
- Quality improvement: Consistent accessibility

---

## 🎯 Integration with Your Workflow

### Daily Workflow

**Morning**:
1. Start Claude Code
2. Session hook shows learning summary
3. Review relevant learnings for today's tasks

**During Development**:
1. Implement feature
2. Edit UI file → Hook suggests design review
3. Run `@agent-design-review`
4. Fix issues
5. Document any new learnings

**End of Day**:
1. Review what was learned
2. Add to appropriate learning file
3. Commit learnings with code changes

### Example Integration

```bash
# Morning routine
code .  # Claude Code loads learnings automatically

# During development
# [Make changes to src/components/PatientCard.tsx]
# Hook: "💡 Design Review Suggestion: You just modified a UI component..."

# Run design review
# In Claude Code: @agent-design-review

# Document learnings
vim .claude/learnings/mistakes.md
# [Add new entry about discovered issue]

# Commit everything
git add .
git commit -m "Add patient card with accessibility improvements

Learning: Added focus states per design review feedback
See .claude/learnings/mistakes.md for details"
```

---

## 🌟 Future Enhancements

### Planned Improvements

1. **Automated metrics dashboard** - Visualize quality trends over time
2. **AI-powered pattern detection** - Auto-identify recurring issues
3. **Learning recommendations** - Claude suggests which learnings to review before each task
4. **Team learning sharing** - Export/import learnings across team
5. **Integration with GitHub** - Auto-comment on PRs with relevant learnings

### Contributing to Learning System

Have ideas for improving the learning system?
1. Document your enhancement in `.claude/learnings/system-improvements.md`
2. Test with your workflow
3. Share results and iterate

---

## 📚 Quick Reference

### Common Commands

```bash
# View all learnings
ls -la .claude/learnings/

# Search for specific mistake
grep -r "focus state" .claude/learnings/

# Count documented learnings
grep "^##" .claude/learnings/mistakes.md | wc -l

# View recent design reviews
tail -n 50 .claude/learnings/design-review-feedback.md

# Add new mistake (open editor)
vim .claude/learnings/mistakes.md
```

### File Locations

- **Learnings**: `.claude/learnings/`
- **Hooks**: `.claude/hooks/`
- **Config**: `CLAUDE.md` (references learning system)
- **Workflow Guide**: `VETHUB_DEVELOPMENT_WORKFLOW.md`

### Getting Help

1. **Read**: This guide
2. **Check**: `.claude/learnings/README.md`
3. **Search**: Existing learnings for similar issues
4. **Ask**: Claude Code can explain the learning system

---

## 🎉 Conclusion

The VetHub Learning System transforms mistakes into knowledge, creating a compounding quality improvement effect. The more you use it, the better your development becomes.

**Key Principles**:
1. **Document everything** - Mistakes, reviews, insights
2. **Learn from patterns** - 3+ occurrences = systematic issue
3. **Improve continuously** - Each cycle makes the next one better
4. **Share knowledge** - Learnings benefit everyone

**Result**: Higher quality code, fewer bugs, faster development, better clinical outcomes for veterinary patients.

---

**Start using it today**: Just document your next mistake in `.claude/learnings/mistakes.md`

**Last Updated**: November 14, 2025
**Version**: 1.0
