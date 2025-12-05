# Implementation Plan: Rounding Sheet Overhaul

## Summary
Complete overhaul of the RoundingSheet component to fix all paste/copy workflows, remove dead code, and make the QuickInsertPanel more logical. The goal is to enable fast data entry where you can paste a full row from Google Sheets and it intelligently fills all 13 fields including dropdowns.

## Requirements

### Functional
- [ ] Paste a full tab-separated row → fills ALL 13 fields (including dropdowns)
- [ ] Paste into any field → smart matching for dropdowns, direct text for text fields
- [ ] Multi-row paste → paste multiple patients at once with preview modal
- [ ] Copy row → always gets current data (not stale)
- [ ] QuickInsertPanel → triggered by button/shortcut, not auto-popup on focus

### Non-Functional
- [ ] Performance: No lag when pasting large amounts of text
- [ ] Security: Validate pasted data before applying
- [ ] Accessibility: Keyboard-navigable, proper ARIA labels

## Architecture Overview

**Current Problem:**
- `<select>` elements don't fire `onPaste` events
- Need to intercept paste at the row level, parse TSV, and distribute to fields

**Solution:**
Wrap each patient row in a container that captures paste events, then intelligently distributes values to the correct fields based on field order.

**Components to Create:**
- None (refactoring existing)

**Components to Modify:**
- `RoundingSheet.tsx`: Major refactor of paste handling, QuickInsert, cleanup dead code
- `ProblemsMultiSelect`: Add paste support inside the component
- `types/rounding.ts`: Single source of truth for RoundingData (remove duplicates)

**Data Flow for Paste:**
1. User pastes in any cell
2. `onPaste` handler on the row container captures event
3. Parse clipboard as TSV (tab-separated values)
4. If 1 value → apply to focused field
5. If multiple values → distribute starting from focused field using `ROUNDING_FIELD_ORDER`
6. For dropdown fields → use `matchDropdownValue` to find best match
7. For text fields → apply directly

## Implementation Phases

---

### Phase 1: Fix Core Paste Infrastructure - Complexity: Medium
**Goal**: Make paste work for ALL fields including dropdowns

**Tasks:**
1. [ ] Remove useless `onPaste` handlers from `<select>` elements
2. [ ] Add row-level paste handler that distributes values to all fields
3. [ ] Update `handlePaste` to be called from row-level, not field-level
4. [ ] Smart paste: if pasting into signalment with 13+ values, fill entire row
5. [ ] Test: paste "ICU" into Location field → selects ICU option

**Files to Modify:**
- `src/components/RoundingSheet.tsx`:
  - Add `onPaste` to `<tr>` wrapper
  - Modify `handlePaste` to accept optional `focusedField` parameter
  - When paste contains tabs, fill starting from focused field
  - Map pasted values through `matchDropdownValue` for dropdown fields

**Logic Change:**
```
Before: Each <input>/<textarea>/<select> has own onPaste
After:  Row has onPaste, distributes to fields based on position
```

**Verification Criteria:**
- [ ] Paste "ICU\tYes\tGreen" starting from Location → fills Location, ICU Criteria, Code
- [ ] Paste "IP" into Location dropdown cell → Location becomes "IP"
- [ ] Paste full 13-column row → all fields filled correctly

**Commit Message**: "fix(rounding): implement row-level paste for all fields including dropdowns"

---

### Phase 2: Implement Multi-Row Paste - Complexity: Medium
**Goal**: Wire up existing dead code to enable multi-patient paste

**Tasks:**
1. [ ] Add `<PastePreviewModal>` to component render
2. [ ] Connect `handleMultiRowPaste` to the row paste handler
3. [ ] When pasting multiple lines (detected by newline count), show preview modal
4. [ ] Connect `applyMultiRowPaste` to modal confirm button
5. [ ] Fix stale closure issues in these functions

**Files to Modify:**
- `src/components/RoundingSheet.tsx`:
  - Render `<PastePreviewModal>` with proper props
  - Modify paste flow: multi-line → preview, single-line → direct apply

**Verification Criteria:**
- [ ] Paste 3 rows of tab-separated data → preview modal shows 3 patients
- [ ] Click confirm → all 3 patients updated
- [ ] Click cancel → nothing changes

**Commit Message**: "feat(rounding): enable multi-row paste with preview modal"

---

### Phase 3: Fix Copy Stale Data Bug - Complexity: Simple
**Goal**: Copy always returns current data, not stale API data

**Tasks:**
1. [ ] After manual save, DON'T clear `editingData` for that patient
2. [ ] Or: After save, refetch patient data to update `patient.roundingData`
3. [ ] Chosen approach: Keep editingData after save (simpler, no network request)

**Files to Modify:**
- `src/components/RoundingSheet.tsx`:
  - Remove lines 762-767 that delete from `editingData` after save
  - Keep user's changes visible even after saving

**Verification Criteria:**
- [ ] Enter data → Save → Copy → paste into Google Sheets → data matches what you entered

**Commit Message**: "fix(rounding): preserve editingData after save to fix stale copy"

---

### Phase 4: Revamp QuickInsertPanel - Complexity: Medium
**Goal**: Make QuickInsert logical - button trigger, not auto-popup

**Tasks:**
1. [ ] Remove `onFocus` auto-show behavior
2. [ ] Add a small button (⚡ or ➕) next to Dx/Tx/Concerns fields
3. [ ] Click button → shows QuickInsert panel for that field
4. [ ] Add keyboard shortcut: Ctrl+Space while focused → toggle panel
5. [ ] Panel should close when clicking outside or pressing Escape

**Files to Modify:**
- `src/components/RoundingSheet.tsx`:
  - Remove `setShowQuickInsert(true)` from `onFocus` handlers
  - Add toggle button next to each textarea that supports QuickInsert
  - Add keyboard handler for Ctrl+Space

**New UX:**
```
Before: Click in field → popup appears (annoying)
After:  Click in field → just type
        Click ⚡ button → popup appears
        Ctrl+Space → popup appears
```

**Verification Criteria:**
- [ ] Focus on Therapeutics → no popup
- [ ] Click ⚡ button → popup appears
- [ ] Ctrl+Space while focused → popup toggles
- [ ] Click outside popup → closes

**Commit Message**: "refactor(rounding): revamp QuickInsert to button trigger instead of auto-popup"

---

### Phase 5: Add Paste to ProblemsMultiSelect - Complexity: Simple
**Goal**: Paste comma-separated problems and they get selected

**Tasks:**
1. [ ] Add hidden input to capture paste events
2. [ ] On paste, parse comma-separated values
3. [ ] For each value, find matching option or add as custom
4. [ ] Select all matching options

**Files to Modify:**
- `src/components/RoundingSheet.tsx` (ProblemsMultiSelect component):
  - Add `onPaste` handler to the clickable div
  - Parse pasted text by comma
  - Match each to existing options or create new

**Verification Criteria:**
- [ ] Paste "IVDD, Seizures, GME" → all three selected
- [ ] Paste "Custom Problem" → gets added and selected

**Commit Message**: "feat(rounding): add paste support to ProblemsMultiSelect"

---

### Phase 6: Clean Up Dead Code & Unused Imports - Complexity: Simple
**Goal**: Remove all dead code identified in the roast

**Tasks:**
1. [ ] Remove unused imports:
   - `formatCarryForwardMessage`
   - `generateSignalment`, `isStaleData`
   - `ROUNDING_SAVE_SUCCESS_CLEAR_DELAY`, `ROUNDING_SAVE_ERROR_CLEAR_DELAY`
2. [ ] Remove unused state (if any remains after multi-row paste implementation)
3. [ ] Remove `NEO_SHADOW_SM` from destructuring
4. [ ] Replace hardcoded dropdown options with constants

**Files to Modify:**
- `src/components/RoundingSheet.tsx`: Remove all unused code

**Verification Criteria:**
- [ ] No unused imports (ESLint clean)
- [ ] Build passes
- [ ] Functionality unchanged

**Commit Message**: "chore(rounding): remove dead code and unused imports"

---

### Phase 7: Consolidate Type Definitions - Complexity: Simple
**Goal**: Single source of truth for RoundingData type

**Tasks:**
1. [ ] Keep `src/types/rounding.ts` as the canonical source
2. [ ] Remove duplicate `RoundingData` from `rounding-carry-forward.ts`
3. [ ] Update `rounding-auto-fill.ts` to import from types
4. [ ] Update all imports

**Files to Modify:**
- `src/lib/rounding-carry-forward.ts`: Remove interface, add import
- `src/lib/rounding-auto-fill.ts`: Update PatientData type, add import
- Any other files with duplicate type definitions

**Verification Criteria:**
- [ ] Only one `RoundingData` interface in codebase (grep confirms)
- [ ] TypeScript compiles
- [ ] All tests pass

**Commit Message**: "refactor: consolidate RoundingData type to single source of truth"

---

### Phase 8: Create Patient Name Utility - Complexity: Simple
**Goal**: Consistent patient name access across component

**Tasks:**
1. [ ] Create `getPatientName(patient)` utility function
2. [ ] Replace all 4 occurrences of the fallback chain
3. [ ] Handle all edge cases consistently

**Files to Modify:**
- `src/components/RoundingSheet.tsx`:
  - Add utility function
  - Replace lines 852, 886, 989, 699

**Verification Criteria:**
- [ ] All patient names display correctly
- [ ] No "Patient 123" fallbacks when name exists

**Commit Message**: "refactor(rounding): extract getPatientName utility function"

---

## Risk Mitigation

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Row-level paste breaks individual field paste | Medium | High | Test both scenarios thoroughly before committing |
| Multi-row paste maps to wrong patients | Low | High | Preview modal shows which patient gets which data |
| QuickInsert button clutters UI | Low | Medium | Make button small, subtle, positioned cleanly |
| Type consolidation breaks imports | Low | Medium | Run full TypeScript check after changes |

## Testing Strategy

### Manual Testing Checklist (Per Phase)

**Phase 1 - Paste Infrastructure:**
- [ ] Paste single value into signalment → fills signalment only
- [ ] Paste 3 tab-separated values starting from Location → fills Location, ICU, Code
- [ ] Paste full 13-column row starting from Signalment → all fields filled
- [ ] Paste "icu" into Location area → dropdown shows "ICU"
- [ ] Paste "green" into Code area → dropdown shows "Green"

**Phase 2 - Multi-Row:**
- [ ] Paste 1 row → no preview, fills directly
- [ ] Paste 3 rows → preview shows 3 patients
- [ ] Cancel preview → nothing changes
- [ ] Confirm preview → 3 patients updated

**Phase 3 - Copy Fix:**
- [ ] Enter data → Save → Copy → Paste to Google Sheets → matches

**Phase 4 - QuickInsert:**
- [ ] Focus on Therapeutics → no popup
- [ ] Click button → popup
- [ ] Ctrl+Space → popup
- [ ] Escape → closes popup
- [ ] Click outside → closes popup

**Phase 5 - Problems Paste:**
- [ ] Paste "IVDD, Seizures" → both selected

## Success Criteria

This implementation is complete when:
- [ ] All 13 fields can be filled via paste
- [ ] Paste a full row from Google Sheets → single row in Google Sheets (no multi-line)
- [ ] Copy a row → always current data
- [ ] QuickInsert only appears when explicitly triggered
- [ ] Multi-row paste works with preview
- [ ] No dead code or unused imports
- [ ] Single RoundingData type definition
- [ ] Build passes with no errors

## Estimated Effort

| Phase | Complexity | Est. Lines Changed |
|-------|------------|-------------------|
| Phase 1 | Medium | ~100 |
| Phase 2 | Medium | ~30 |
| Phase 3 | Simple | ~5 |
| Phase 4 | Medium | ~50 |
| Phase 5 | Simple | ~30 |
| Phase 6 | Simple | ~20 (deletions) |
| Phase 7 | Simple | ~20 |
| Phase 8 | Simple | ~15 |

**Total**: ~270 lines changed, significant refactor

---

**Ready to proceed? Approve this plan to begin implementation.**
