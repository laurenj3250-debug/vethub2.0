# Implementation Plan: VetHub Main Page Audit Fixes

## Summary
Fix the 5 priority issues identified in the comprehensive audit of the VetHub main page: time filter logic for status-triggered tasks, sticky header z-index blocking clicks, task accumulation cleanup, toast notification positioning, and By Patient view density.

## Requirements

### Functional
- [ ] Blood Work and other status-triggered tasks filter correctly by AM/PM
- [ ] All interactive elements are clickable regardless of scroll position
- [ ] Daily reset properly clears old tasks, preventing accumulation
- [ ] Toast notifications don't block content
- [ ] By Patient view is scannable with visual hierarchy

### Non-Functional
- [ ] Performance: No additional re-renders from filter changes
- [ ] Accessibility: Maintain keyboard navigation and screen reader support
- [ ] Mobile: All fixes work on mobile viewports

## Architecture Overview

**Components to Modify:**
- `src/lib/task-config.ts`: Extend time filter arrays to include all task types
- `src/components/Header.tsx` or layout: Fix z-index/pointer-events issue
- `src/app/api/daily-reset/route.ts`: Add task cleanup logic
- `src/components/TaskChecklist.tsx`: Improve By Patient view density
- Toast component or layout: Reposition notifications

**Data Flow:**
1. Time filter button clicked -> getTaskTimeOfDay() -> filters tasks
2. Currently only checks dailyRecurring.patient tasks
3. Need to include statusTriggered and typeSpecific tasks

---

## Implementation Phases

### Phase 1: Fix Time Filter Logic - Complexity: Medium
**Goal**: Make Blood Work, Chest X-rays, and all status-triggered tasks filter correctly by AM/PM

**Tasks:**
1. [ ] Extend MORNING_TASK_NAMES to include all morning tasks from all categories
2. [ ] Extend EVENING_TASK_NAMES to include all evening tasks from all categories
3. [ ] Add missing timeOfDay to Chest X-rays (determine if AM or PM)
4. [ ] Include general tasks in time filter logic

**Files to Modify:**
- `src/lib/task-config.ts`: Update helper arrays to aggregate from all task sources

**Current Code (lines 112-121):**
```typescript
export const MORNING_TASK_NAMES = TASK_CONFIG.dailyRecurring.patient
  .filter(t => t.timeOfDay === 'morning')
  .map(t => t.name);

export const EVENING_TASK_NAMES = TASK_CONFIG.dailyRecurring.patient
  .filter(t => t.timeOfDay === 'evening')
  .map(t => t.name);
```

**New Approach:**
```typescript
// Collect ALL tasks with timeOfDay from ALL sources
function getAllTasksWithTime(time: TaskTimeOfDay): string[] {
  const names: string[] = [];

  // Daily patient tasks
  TASK_CONFIG.dailyRecurring.patient
    .filter(t => t.timeOfDay === time)
    .forEach(t => names.push(t.name));

  // Daily general tasks
  TASK_CONFIG.dailyRecurring.general
    .filter(t => t.timeOfDay === time)
    .forEach(t => names.push(t.name));

  // Status-triggered tasks
  Object.values(TASK_CONFIG.statusTriggered)
    .flat()
    .filter(t => t.timeOfDay === time)
    .forEach(t => names.push(t.name));

  // Type-specific tasks
  Object.values(TASK_CONFIG.typeSpecific)
    .flat()
    .filter(t => t.timeOfDay === time)
    .forEach(t => names.push(t.name));

  return names;
}

export const MORNING_TASK_NAMES = getAllTasksWithTime('morning');
export const EVENING_TASK_NAMES = getAllTasksWithTime('evening');
```

**Tests:**
- [ ] Blood Work appears ONLY in PM filter
- [ ] Do All Rounding Summaries appears ONLY in PM filter
- [ ] Daily SOAP Done appears ONLY in AM filter
- [ ] All filter returns all tasks

**Verification Criteria:**
- [ ] Screenshot of AM filter shows NO Blood Work
- [ ] Screenshot of PM filter shows Blood Work
- [ ] Playwright test passes for time filter

**Commit Message**: "fix: time filter now includes status-triggered and type-specific tasks"

---

### Phase 2: Fix Sticky Header Z-Index - Complexity: Simple
**Goal**: Ensure interactive elements below header are always clickable

**Tasks:**
1. [ ] Identify the header component causing the issue
2. [ ] Add `pointer-events: none` to header when not hovered, or
3. [ ] Reduce z-index and ensure proper stacking context, or
4. [ ] Add padding-top to main content to prevent overlap

**Files to Modify:**
- `src/app/layout.tsx` or header component
- Possibly `src/components/TaskChecklist.tsx` if it needs scroll margin

**Investigation Needed:**
- Check exact header height
- Determine if position:sticky is necessary or can be position:fixed
- Test if adding `scroll-margin-top` to clickable elements fixes it

**Tests:**
- [ ] Playwright can click Add Task button
- [ ] Playwright can click filter buttons
- [ ] All buttons clickable at various scroll positions

**Verification Criteria:**
- [ ] Audit script completes without "header intercepts pointer events" error
- [ ] Manual test: scroll and click various elements

**Commit Message**: "fix: header no longer blocks pointer events on page elements"

---

### Phase 3: Task Accumulation Cleanup - Complexity: Medium
**Goal**: Prevent tasks from accumulating beyond today's tasks

**Tasks:**
1. [ ] Add logic to daily-reset to delete tasks older than today
2. [ ] Or: Add createdAt filter to task queries
3. [ ] Investigate why 95 tasks exist (expected: ~50-60 max)
4. [ ] Add one-time cleanup script for existing accumulated tasks

**Files to Modify:**
- `src/app/api/daily-reset/route.ts`: Add cleanup of old tasks
- Possibly add migration script

**Cleanup Logic:**
```typescript
// Delete incomplete tasks from previous days (not today)
const today = new Date();
today.setHours(0, 0, 0, 0);

await prisma.task.deleteMany({
  where: {
    createdAt: { lt: today },
    completed: false,
    // Only delete daily recurring task types, not one-time tasks
    title: { in: [...DAILY_PATIENT_TASK_NAMES, ...DAILY_GENERAL_TASK_NAMES] }
  }
});
```

**Tests:**
- [ ] After reset, task count is reasonable (~50-60 max)
- [ ] Old incomplete daily tasks are removed
- [ ] One-time tasks (admission, status-triggered) are preserved

**Verification Criteria:**
- [ ] Task counter shows reasonable number (<70)
- [ ] No duplicate "Do All Rounding Summaries"

**Commit Message**: "fix: daily reset now cleans up stale incomplete tasks"

---

### Phase 4: Toast Notification Positioning - Complexity: Simple
**Goal**: Toast notifications don't overlap with main content

**Tasks:**
1. [ ] Find toast/notification component
2. [ ] Move position to top-right or bottom-right
3. [ ] Ensure z-index is above content but doesn't block interactions
4. [ ] Add auto-dismiss after 3 seconds

**Files to Modify:**
- Toast provider or component (likely uses shadcn/ui Toaster)

**Tests:**
- [ ] Toast appears in non-blocking position
- [ ] Toast auto-dismisses
- [ ] Patient list is always fully visible

**Verification Criteria:**
- [ ] Screenshot shows toast not overlapping patient list

**Commit Message**: "fix: toast notifications positioned to not block content"

---

### Phase 5: Improve By Patient View Density - Complexity: Medium
**Goal**: Make By Patient view more scannable

**Tasks:**
1. [ ] Show only incomplete tasks by default (hide completed)
2. [ ] Collapse task lists with expand/collapse toggle
3. [ ] Or: Show task count with drill-down
4. [ ] Reduce visual noise in task items

**Files to Modify:**
- `src/components/TaskChecklist.tsx`: Modify By Patient rendering

**Design Options (pick one):**
A. **Collapsed by default**: Show patient name + progress bar, click to expand
B. **Summary counts**: "3 of 12 tasks done" with expand button
C. **Hide completed**: Only show incomplete tasks in collapsed cards

**Tests:**
- [ ] By Patient view fits on one screen for 8 patients
- [ ] Can expand to see all tasks
- [ ] Progress is visible at a glance

**Verification Criteria:**
- [ ] Screenshot shows cleaner By Patient view
- [ ] All task data still accessible

**Commit Message**: "improve: By Patient view now shows collapsed task summary"

---

## Risk Mitigation

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Time filter breaks existing behavior | Medium | High | Test all filter combinations |
| Task cleanup deletes wanted tasks | Medium | High | Only delete known daily recurring types |
| Header fix breaks sticky behavior | Low | Medium | Test scroll behavior thoroughly |
| By Patient UX regression | Medium | Medium | Get user feedback before finalizing |

## Testing Strategy

### Playwright Tests
- [ ] Time filter correctly filters AM/PM/All tasks
- [ ] All buttons clickable at various scroll positions
- [ ] Task count is reasonable after daily reset
- [ ] Toast doesn't block patient list

### Manual Testing Checklist
- [ ] AM filter hides Blood Work
- [ ] PM filter shows Blood Work
- [ ] Can click Add Task when scrolled
- [ ] Tasks don't accumulate after multiple days
- [ ] By Patient view is readable

## Dependencies
- No external dependencies
- All changes are internal to existing codebase

## Rollback Plan
1. Git revert individual commits if issues arise
2. Each phase is independently revertable
3. Keep screenshots of current state for comparison

## Questions for User

1. **Chest X-rays timing**: Should this be AM or PM? (Currently no timeOfDay set)
2. **By Patient view preference**:
   - A) Collapsed cards with expand button?
   - B) Just hide completed tasks?
   - C) Keep current but reduce visual clutter?
3. **Task cleanup aggressiveness**: Delete incomplete tasks from yesterday, or keep them for X days?

## Success Criteria

This implementation is complete when:
- [ ] Blood Work only appears in PM filter
- [ ] No "header intercepts pointer events" errors
- [ ] Task count under 70 after reset
- [ ] Toast doesn't overlap content
- [ ] By Patient view is cleaner (per user preference)
- [ ] All Playwright tests pass
- [ ] Deployed to Railway production

---

## Next Steps
After approval of this plan:
1. Answer the 3 questions above
2. Start with Phase 1 (time filter - highest impact)
3. Commit after each phase
4. Deploy and verify on production

**Ready to proceed? Approve this plan to begin implementation.**
