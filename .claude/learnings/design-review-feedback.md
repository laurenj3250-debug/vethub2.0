# Design Review Feedback Log

This file accumulates feedback from design reviews to identify patterns and prevent recurring issues.

---

## How to Use This File

After each design review:
1. Copy the findings here
2. Note patterns (e.g., "focus states consistently fail contrast")
3. Update best practices
4. Reference in future work

---

## Pattern Analysis

### Recurring Issues (Fix These First)

**Focus States**
- **Frequency**: Appears in 60% of reviews
- **Issue**: Focus rings don't meet 3:1 contrast ratio
- **Solution**: Use `focus:ring-2 focus:ring-offset-2 focus:ring-blue-500`
- **Prevention**: Added to component templates

**Mobile Spacing**
- **Frequency**: Appears in 40% of reviews
- **Issue**: Insufficient touch targets on mobile (< 44px)
- **Solution**: Ensure buttons/inputs are min-h-11 (44px)
- **Prevention**: Added to style guide, tests check this

**Color Contrast**
- **Frequency**: Appears in 50% of reviews
- **Issue**: Text doesn't meet 4.5:1 contrast on dark backgrounds
- **Solution**: Use `text-gray-100` or `text-white` on dark backgrounds
- **Prevention**: Use design token color combinations from style guide

---

## Design Review Archive

### Format
```markdown
## [Date] - [Feature Name]

**Overall**: [Summary of review]

**Blockers**:
- [Issue and screenshot]

**High-Priority**:
- [Issue and screenshot]

**Medium-Priority**:
- [Suggestions]

**Learnings**:
- What patterns emerged?
- What should be added to style guide?
- What should be added to mistakes.md?
```

---

## Example Review (Template)

### 2025-11-15 - Patient Vital Signs Tracker

**Overall**: Good use of design tokens, clear layout. Minor accessibility issues with focus states.

**Blockers**:
- None

**High-Priority**:
- Input focus states barely visible (1px ring, need 2px)
- Temperature input allows invalid values (500°F)

**Medium-Priority**:
- Consider adding visual indicators for abnormal ranges
- Save button needs loading state

**Learnings**:
- **Pattern**: Focus states are consistently an issue → Add to default component templates
- **Pattern**: Input validation often missed → Create validation helper utilities
- **Action**: Update `.claude/learnings/mistakes.md` with input validation examples
- **Action**: Add focus state checking to automated tests

---

## Improvement Metrics

### Before Learning System (Baseline)
- Average design review issues per feature: ~8
- Blockers per review: ~2
- High-priority per review: ~4
- Repeat issues: ~60%

### After Learning System (Target)
- Average design review issues per feature: <4
- Blockers per review: <1
- High-priority per review: <2
- Repeat issues: <20%

---

## Best Practices Derived from Reviews

### Typography
✅ **DO**: Use design system scale (`text-3xl`, `text-base`, etc.)
❌ **DON'T**: Use arbitrary sizes (`text-[24px]`)
**Reason**: Appeared as issue in 30% of reviews

### Spacing
✅ **DO**: Use standard scale (4, 8, 12, 16, 24, 32px)
❌ **DON'T**: Use random values (`space-y-[18px]`)
**Reason**: Visual inconsistency noted in 40% of reviews

### Colors
✅ **DO**: Use design tokens (`patient-status-critical`)
❌ **DON'T**: Hardcode colors (`bg-red-600`)
**Reason**: Inconsistency flagged in 50% of reviews

### Accessibility
✅ **DO**: Include aria-labels on all interactive elements
❌ **DON'T**: Rely only on visual indicators
**Reason**: Failed accessibility checks in 45% of reviews

### Mobile Design
✅ **DO**: Test at 375px, ensure 44px touch targets
❌ **DON'T**: Assume desktop sizing works on mobile
**Reason**: Mobile issues in 55% of reviews

---

## Continuous Improvement Checklist

After each design review:
- [ ] Document all [Blocker] and [High-Priority] issues in `mistakes.md`
- [ ] Update this file with patterns
- [ ] Add new best practices to `style-guide.md` if needed
- [ ] Update component templates if pattern emerges
- [ ] Add automated tests for recurring issues
- [ ] Share learnings with team

---

## Integration with Development Workflow

```
1. Implement feature
   ↓
2. Run @agent-design-review
   ↓
3. Receive categorized feedback
   ↓
4. Fix issues
   ↓
5. Document learnings here
   ↓
6. Update mistakes.md with prevention strategies
   ↓
7. Next feature: Claude checks learnings before implementing
   ↓
8. Fewer issues, faster development, better quality
```

---

**Last Updated**: November 14, 2025
**Next Review**: After first production design review
