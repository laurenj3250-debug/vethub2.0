# Rounding Sheet Investigation & Fix Plan

> **For Claude:** This is a diagnostic plan. Run investigation first, then create fix plan based on findings.

**Goal:** Identify and fix specific issues with rounding sheet that user reported: "doesn't really work, paste doesn't work, data doesn't save"

**Architecture:** Investigate RoundingSheet component, data persistence, paste functionality, and AI carry-forward features to find root causes.

**Tech Stack:** React, TypeScript, Clipboard API, Local storage or API persistence

---

## Phase 1: Investigation (DO THIS FIRST)

### Investigation 1: Find Rounding Sheet Component

**Step 1: Locate rounding sheet files**

```bash
find src -name "*rounding*" -o -name "*Rounding*" | grep -E "\.tsx?$"
```

Expected files:
- `src/components/RoundingSheet.tsx`
- `src/components/EnhancedRoundingSheet.tsx`
- `src/app/rounding/page.tsx`

**Step 2: Read each file to understand architecture**

```bash
# Read main rounding page
cat src/app/rounding/page.tsx | head -200

# Read rounding components
cat src/components/RoundingSheet.tsx | head -200
cat src/components/EnhancedRoundingSheet.tsx | head -200
```

**Document findings:**
- Which component is actually used?
- How is data stored (localStorage, API, state)?
- What save mechanism exists?
- What paste mechanism exists?

---

### Investigation 2: Test Current Behavior

**Step 1: Run dev server**

```bash
npm run dev
```

**Step 2: Navigate to rounding sheet**

Go to: http://localhost:3000/rounding

**Step 3: Test save functionality**

1. Find a patient row
2. Edit a cell (e.g., "problems" field)
3. Click somewhere else or press Tab
4. Refresh page
5. **Document:** Does data persist?

**Step 4: Test paste functionality**

1. Copy tab-separated data from spreadsheet:
   ```
   Patient1	10y MN Lab	ICU	DNR	Post-op IVDD	MRI normal	Gabapentin 300mg	Lactated Ringers
   ```
2. Try to paste into rounding sheet
3. **Document:** Does paste work? What happens?

**Step 5: Test cell editing**

1. Click on a cell
2. Type text
3. Press Tab to move to next cell
4. **Document:** Can you edit? Does Tab navigation work?

---

### Investigation 3: Check Console Errors

**Step 1: Open DevTools**

1. Open browser DevTools (F12)
2. Go to Console tab
3. Navigate to /rounding page
4. Perform actions (edit, paste, save)

**Document all errors:**
```
[Console errors go here]
```

**Step 2: Check Network tab**

1. Open Network tab
2. Filter by "Fetch/XHR"
3. Perform save action
4. **Document:** Are API calls made? Do they succeed?

---

### Investigation 4: Check Data Persistence Logic

**Step 1: Search for save functions**

```bash
grep -n "save\|persist\|update" src/app/rounding/page.tsx | head -30
grep -n "save\|persist\|update" src/components/RoundingSheet.tsx | head -30
```

**Step 2: Search for API calls**

```bash
grep -n "apiClient\|fetch\|axios" src/app/rounding/page.tsx | head -30
```

**Document:**
- How does data save? (API call? localStorage?)
- Is there auto-save or manual save button?
- What triggers save?

---

### Investigation 5: Check Paste Functionality

**Step 1: Search for paste handlers**

```bash
grep -n "paste\|onPaste\|clipboard" src/app/rounding/page.tsx
grep -n "paste\|onPaste\|clipboard" src/components/RoundingSheet.tsx
```

**Step 2: Search for input handlers**

```bash
grep -n "onChange\|onBlur\|onKeyDown" src/components/RoundingSheet.tsx | head -40
```

**Document:**
- Does paste handler exist?
- How does it parse TSV data?
- What fields does it map to?

---

## Phase 2: Fix Plan (CREATE AFTER INVESTIGATION)

Based on investigation findings, create specific fix tasks:

### Potential Fix 1: Data Not Saving

**If investigation shows:** No API calls on edit, or API calls fail

**Fix:**
- Add/fix save API call
- Add debounced auto-save on cell edit
- Add visual save indicator (saving... / saved!)

### Potential Fix 2: Paste Not Working

**If investigation shows:** No paste handler or it's broken

**Fix:**
- Add onPaste handler to table
- Parse tab-separated values
- Map columns to patient fields
- Show confirmation toast

### Potential Fix 3: Cell Editing Issues

**If investigation shows:** Cells not editable or focus issues

**Fix:**
- Add contentEditable or input fields
- Fix Tab navigation with keyboard handlers
- Add visual focus indicators

### Potential Fix 4: AI Carry Forward Broken

**If investigation shows:** AI button exists but doesn't work

**Fix:**
- Check AI parsing endpoint
- Fix error handling
- Show loading state during AI call

---

## Phase 3: Create Specific Implementation Plans

**After completing investigation:**

1. Review documented findings
2. Identify 1-3 actual root causes
3. Create detailed fix plans (like the other 3 plans)
4. Implement fixes with TDD approach

---

## Investigation Checklist

- [ ] Located all rounding sheet files
- [ ] Tested save functionality manually
- [ ] Tested paste functionality manually
- [ ] Tested cell editing manually
- [ ] Documented console errors
- [ ] Checked network requests
- [ ] Reviewed save/persistence code
- [ ] Reviewed paste handler code
- [ ] Identified root causes
- [ ] Created specific fix plan

---

## Expected Investigation Output

**Findings Summary:**
```
1. Save Issue: [What's broken and why]
2. Paste Issue: [What's broken and why]
3. Editing Issue: [What's broken and why]
```

**Recommended Fixes:**
```
Priority 1: [Most critical fix]
Priority 2: [Secondary fix]
Priority 3: [Nice to have]
```

**After investigation complete, create new implementation plan:** `2025-01-21-rounding-sheet-fixes.md`

---

## Notes

User reported: "rounding sheet doesn't really work"

This is vague - need investigation to find SPECIFIC issues:
- Data not persisting?
- Can't edit cells?
- Paste from spreadsheet broken?
- AI carry-forward not working?
- Something else?

**DO NOT START FIXING until investigation identifies root causes!**
