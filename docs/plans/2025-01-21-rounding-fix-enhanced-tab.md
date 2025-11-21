# Enhanced Rounding Sheet Tab Navigation Fix Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix Tab key conflict in EnhancedRoundingSheet where text expansion blocks natural Tab navigation.

**Architecture:** Remove Tab from text expansion triggers, keep only Space and Enter. Let Tab handle cell navigation naturally without interference.

**Tech Stack:** React, TypeScript, Keyboard event handling

---

## Task 1: Remove Tab from Text Expansion Triggers

**Files:**
- Modify: `src/components/EnhancedRoundingSheet.tsx:449-470` (handleKeyDown function)

**Step 1: Find the text expansion logic**

Locate around line 449-470:

```typescript
const handleKeyDown = (e: React.KeyboardEvent, patientId: number, field: string) => {
  // Text expansion logic
  if (e.key === ' ' || e.key === 'Tab' || e.key === 'Enter') {
    // ... expansion code
  }
```

**Step 2: Remove Tab from expansion triggers**

Replace the condition:

```typescript
const handleKeyDown = (e: React.KeyboardEvent, patientId: number, field: string) => {
  const currentValue = getFieldValue(patientId, field) as string;

  // Text expansion (Space and Enter only - NOT Tab)
  if (e.key === ' ' || e.key === 'Enter') {
    if (!currentValue) return;

    const words = currentValue.trim().split(/\s+/);
    const lastWords = words.slice(-5).join(' '); // Last 5 words max

    const expandedValue = handleTextExpansion(patientId, field, lastWords, e);

    if (expandedValue !== currentValue) {
      e.preventDefault();
      updateFieldDebounced(patientId, field, expandedValue);

      toast({
        title: 'Text Expanded',
        description: `"${lastWords}" → expanded`,
        duration: 2000,
      });
    }
  }

  // Tab key now handles natural navigation (no preventDefault)
  if (e.key === 'Tab') {
    // Let browser handle Tab navigation naturally
    return;
  }

  // Copy row shortcut
  if (e.ctrlKey && e.key === 'Enter') {
    e.preventDefault();
    copyRoundingSheetLine(patientId);
  }

  // Protocol menu shortcut
  if (e.ctrlKey && e.key === 'p') {
    e.preventDefault();
    setShowProtocolSelector(showProtocolSelector === patientId ? null : patientId);
  }

  // Duplicate field to selected patients
  if (e.ctrlKey && e.key === 'd') {
    e.preventDefault();
    if (selectedPatients.size === 0) {
      toast({
        title: 'No patients selected',
        description: 'Select patients with checkboxes to use Ctrl+D',
        variant: 'destructive',
      });
      return;
    }

    const value = getFieldValue(patientId, field);
    selectedPatients.forEach((selectedId) => {
      if (selectedId !== patientId) {
        updateFieldDebounced(selectedId, field, value);
      }
    });

    toast({
      title: 'Field Duplicated',
      description: `Copied "${field}" to ${selectedPatients.size} patient(s)`,
    });
  }
};
```

**Step 3: Verify compilation**

Run: `npm run typecheck`
Expected: No new errors (existing errors in this file are okay)

---

## Task 2: Update Documentation Comments

**Files:**
- Modify: `src/components/EnhancedRoundingSheet.tsx:447` (comment above handleKeyDown)

**Step 1: Add clear documentation**

Replace or add comment above handleKeyDown:

```typescript
/**
 * Keyboard shortcuts:
 * - Space/Enter: Trigger text expansion for shortcuts (e.g., "q4t" → "Q4h turns, padded bedding")
 * - Tab: Natural cell navigation (browser default)
 * - Shift+Tab: Reverse navigation (browser default)
 * - Ctrl+Enter: Copy patient row to clipboard
 * - Ctrl+P: Open protocol quick-fill menu
 * - Ctrl+D: Duplicate current field to all selected patients
 */
const handleKeyDown = (e: React.KeyboardEvent, patientId: number, field: string) => {
```

---

## Task 3: Add Toast Hint for Tab Navigation

**Files:**
- Modify: `src/components/EnhancedRoundingSheet.tsx:200` (after component mount)

**Step 1: Add one-time hint on first visit**

Add useEffect after mounted check:

```typescript
useEffect(() => {
  // Show Tab navigation hint once per session
  const hasSeenHint = sessionStorage.getItem('rounding-tab-hint-seen');
  if (!hasSeenHint && mounted) {
    setTimeout(() => {
      toast({
        title: '💡 Tip: Tab Navigation',
        description: 'Use Tab to move between fields. Press Space or Enter for text expansion shortcuts.',
        duration: 5000,
      });
      sessionStorage.setItem('rounding-tab-hint-seen', 'true');
    }, 1000);
  }
}, [mounted, toast]);
```

---

## Task 4: Test Tab Navigation

**Files:**
- Test manually

**Step 1: Start dev server**

Run: `npm run dev`

**Step 2: Navigate to Enhanced Rounding Sheet**

1. Go to http://localhost:3002/rounding
2. **Note:** Check which rounding sheet is currently used
3. If using basic RoundingSheet, temporarily switch to EnhancedRoundingSheet in `src/components/RoundingPageClient.tsx` line 12

**Step 3: Test Tab moves between fields**

1. Click in "signalment" field
2. Press Tab
3. **Expected:** Focus moves to next field (location dropdown)
4. Press Tab again
5. **Expected:** Focus moves to icuCriteria dropdown
6. Continue tabbing through all fields
7. **Expected:** Natural left-to-right, top-to-bottom navigation

**Step 4: Test Shift+Tab reverse navigation**

1. Tab to "problems" field
2. Press Shift+Tab
3. **Expected:** Focus moves back to "code" dropdown
4. Press Shift+Tab again
5. **Expected:** Focus moves back to "icuCriteria"

**Step 5: Test text expansion still works with Space**

1. Type "q4t" in a field
2. Press Space
3. **Expected:** "q4t" expands to full text (if shortcut defined)
4. **Expected:** Toast shows "Text Expanded"

**Step 6: Test text expansion with Enter**

1. Type "ivdd" in a field
2. Press Enter
3. **Expected:** Text expands if shortcut exists
4. **Expected:** No interference with Tab navigation

**Step 7: Test Tab does NOT trigger expansion**

1. Type "test" in a field
2. Press Tab
3. **Expected:** Focus moves to next field WITHOUT expansion attempt
4. **Expected:** "test" remains as typed

---

## Task 5: Commit Changes

```bash
git add src/components/EnhancedRoundingSheet.tsx
git commit -m "fix: remove Tab key from text expansion in EnhancedRoundingSheet

Allow Tab to handle natural cell navigation without interference.

Changes:
- Removed Tab from text expansion triggers
- Text expansion now uses Space and Enter only
- Tab key passes through for browser's default navigation
- Added documentation comment explaining keyboard shortcuts
- Added one-time toast hint about navigation

Fixes Tab navigation blocking issue in Enhanced Rounding Sheet.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Verification Checklist

- [ ] Tab moves to next field (no expansion trigger)
- [ ] Shift+Tab moves to previous field
- [ ] Space still triggers text expansion
- [ ] Enter still triggers text expansion
- [ ] Ctrl+Enter copies row
- [ ] Ctrl+P opens protocol menu
- [ ] Ctrl+D duplicates to selected patients
- [ ] Toast hint shows on first visit
- [ ] No console errors during navigation

---

## Expected Result

**Before:** Pressing Tab can trigger text expansion, blocking normal navigation

**After:** Tab always moves focus to next field, expansion only on Space/Enter

**User Benefit:** Natural keyboard navigation works as expected, no surprising expansion behavior
