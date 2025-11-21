# Rounding Sheet Unsaved Changes Warning Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add browser confirmation dialog when user tries to navigate away with unsaved rounding sheet changes.

**Architecture:** Use browser's `beforeunload` event to detect navigation attempts. Check if editingData has pending changes. Show native browser confirm dialog to prevent accidental data loss.

**Tech Stack:** React, TypeScript, Browser beforeunload API

---

## Task 1: Add Navigation Guard Hook

**Files:**
- Modify: `src/components/RoundingSheet.tsx:55` (after useEffect for timer cleanup)

**Step 1: Add beforeunload event listener**

Add after the timer cleanup useEffect (around line 55):

```typescript
useEffect(() => {
  const handleBeforeUnload = (e: BeforeUnloadEvent) => {
    // Check if there are unsaved changes
    const hasUnsavedChanges = Object.keys(editingData).length > 0;

    if (hasUnsavedChanges) {
      // Standard way to trigger browser confirmation dialog
      e.preventDefault();
      e.returnValue = '';

      // Some browsers show this message, most show generic message
      return 'You have unsaved changes in the rounding sheet. Are you sure you want to leave?';
    }
  };

  window.addEventListener('beforeunload', handleBeforeUnload);

  return () => {
    window.removeEventListener('beforeunload', handleBeforeUnload);
  };
}, [editingData]);
```

**Step 2: Verify compilation**

Run: `npm run typecheck`
Expected: No new errors

---

## Task 2: Add React Router Navigation Guard (if using client-side routing)

**Files:**
- Modify: `src/components/RoundingPageClient.tsx:30` (after mounted effect)

**Step 1: Add router navigation blocker**

Add after the mounted useEffect (around line 32):

```typescript
useEffect(() => {
  // This handles client-side navigation (Link clicks, router.push, etc.)
  const handleRouteChange = (e: Event) => {
    const hasUnsavedChanges = patients?.some(p => {
      const roundingData = p.roundingData;
      // Check if any patient has recent edits (within last 5 minutes as safety)
      const lastUpdated = roundingData?.lastUpdated;
      if (!lastUpdated) return false;
      const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
      const updatedAt = new Date(lastUpdated).getTime();
      return updatedAt > fiveMinutesAgo;
    });

    if (hasUnsavedChanges) {
      const confirmed = confirm(
        'You may have unsaved changes in the rounding sheet. Are you sure you want to leave?'
      );
      if (!confirmed) {
        e.preventDefault();
        e.stopPropagation();
      }
    }
  };

  // Listen for navigation events
  window.addEventListener('popstate', handleRouteChange);

  return () => {
    window.removeEventListener('popstate', handleRouteChange);
  };
}, [patients]);
```

**Step 2: Verify compilation**

Run: `npm run typecheck`
Expected: No new errors

---

## Task 3: Add Warning to "Back to VetHub" Link

**Files:**
- Modify: `src/components/RoundingPageClient.tsx:113-119` (Back to VetHub link)

**Step 1: Import useState and usePatients**

Ensure imports at top of file include useContext if needed:

```typescript
import { usePatientContext } from '@/contexts/PatientContext';
```

**Step 2: Add click handler to Back link**

Find the "Back to VetHub" Link (around line 113-119) and modify:

```typescript
<Link
  href="/"
  onClick={(e) => {
    // Check for unsaved changes
    const hasUnsavedChanges = patients?.some(p => {
      const roundingData = p.roundingData;
      const lastUpdated = roundingData?.lastUpdated;
      if (!lastUpdated) return false;

      // Check if edited in last 5 minutes (safety margin)
      const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
      const updatedAt = new Date(lastUpdated).getTime();
      return updatedAt > fiveMinutesAgo;
    });

    if (hasUnsavedChanges) {
      const confirmed = confirm(
        'You may have unsaved changes. Are you sure you want to leave the rounding sheet?'
      );
      if (!confirmed) {
        e.preventDefault();
      }
    }
  }}
  className="flex items-center gap-2 px-4 py-2 text-slate-300 hover:text-emerald-400 transition rounded-lg hover:bg-slate-700/50 border border-transparent hover:border-emerald-500/30"
>
  <ArrowLeft size={18} />
  Back to VetHub
</Link>
```

**Step 3: Verify compilation**

Run: `npm run typecheck`
Expected: No new errors

---

## Task 4: Enhance Warning with Specific Patient Names

**Files:**
- Modify: `src/components/RoundingSheet.tsx` (enhance beforeunload handler)

**Step 1: Replace simple beforeunload with detailed version**

Replace the beforeunload handler added in Task 1 with:

```typescript
useEffect(() => {
  const handleBeforeUnload = (e: BeforeUnloadEvent) => {
    const unsavedPatientIds = Object.keys(editingData).map(Number);

    if (unsavedPatientIds.length > 0) {
      // Log which patients have unsaved changes
      const unsavedPatients = unsavedPatientIds.map(id => {
        const patient = patients.find(p => p.id === id);
        return patient?.demographics?.name || patient?.name || `Patient ${id}`;
      });

      console.warn('[Rounding] Unsaved changes for:', unsavedPatients.join(', '));

      e.preventDefault();
      e.returnValue = '';

      // Note: Most modern browsers ignore custom messages and show generic warning
      return `You have unsaved changes for ${unsavedPatientIds.length} patient(s). Are you sure you want to leave?`;
    }
  };

  window.addEventListener('beforeunload', handleBeforeUnload);

  return () => {
    window.removeEventListener('beforeunload', handleBeforeUnload);
  };
}, [editingData, patients]);
```

**Step 2: Add patient dependency**

Ensure `patients` is available in scope of the RoundingSheet component (passed as prop).

---

## Task 5: Add Visual Indicator of Unsaved Changes

**Files:**
- Modify: `src/components/RoundingSheet.tsx:280-305` (header section)

**Step 1: Add unsaved changes count in header**

Find the header section (around line 280-305) and add indicator before Save All button:

```typescript
<div className="sticky top-0 z-20 bg-slate-900/95 backdrop-blur-sm border-b border-slate-700/50 p-3 flex items-center justify-between">
  <div className="flex items-center gap-4">
    <h2 className="text-emerald-400 font-bold text-lg">Rounding Sheet</h2>

    {/* NEW: Unsaved changes indicator */}
    {Object.keys(editingData).length > 0 && (
      <div className="flex items-center gap-2 px-3 py-1 bg-yellow-900/30 border border-yellow-600/50 rounded-lg">
        <span className="text-yellow-400 text-sm font-medium">
          ⚠️ {Object.keys(editingData).length} patient{Object.keys(editingData).length > 1 ? 's' : ''} with unsaved changes
        </span>
      </div>
    )}
  </div>

  <div className="flex items-center gap-2">
    <button
      onClick={() => {
        saveTimers.forEach((timer) => clearTimeout(timer));
        setSaveTimers(new Map());
        handleSaveAll();
      }}
      disabled={Object.keys(editingData).length === 0 || isSaving}
      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
    >
      <Save size={16} />
      Save All ({Object.keys(editingData).length})
    </button>

    {/* Export and other buttons */}
  </div>
</div>
```

---

## Task 6: Test Unsaved Changes Warning

**Files:**
- Test manually

**Step 1: Start dev server**

Run: `npm run dev`

**Step 2: Test browser navigation warning**

1. Navigate to http://localhost:3002/rounding
2. Edit a cell (e.g., change signalment)
3. Try to close the tab or refresh the page
4. **Expected:** Browser shows dialog: "Leave site? Changes you made may not be saved"
5. Click "Cancel" to stay
6. **Expected:** Stays on page, data preserved

**Step 3: Test Back button warning**

1. Edit a cell
2. Click "Back to VetHub" link
3. **Expected:** Confirm dialog appears
4. Click "Cancel"
5. **Expected:** Stays on rounding sheet

**Step 4: Test warning clears after save**

1. Edit a cell
2. Wait for auto-save (2 seconds) or click Save
3. After save completes, try to navigate away
4. **Expected:** No warning dialog (changes saved)

**Step 5: Test visual indicator**

1. Edit multiple patients (e.g., 3 patients)
2. **Expected:** Header shows "⚠️ 3 patients with unsaved changes"
3. Save one patient
4. **Expected:** Header shows "⚠️ 2 patients with unsaved changes"
5. Save all
6. **Expected:** Warning indicator disappears

**Step 6: Test console logging**

1. Edit a patient named "Stewie McNair"
2. Try to close tab
3. Open Console (F12)
4. **Expected:** Console shows: "[Rounding] Unsaved changes for: Stewie McNair"

---

## Task 7: Commit Changes

```bash
git add src/components/RoundingSheet.tsx src/components/RoundingPageClient.tsx
git commit -m "feat: add unsaved changes warning to rounding sheet

Prevent data loss by warning users before navigating away from unsaved changes.

Features:
- Browser beforeunload event blocks tab close/refresh
- React Router navigation guard for client-side routing
- Back to VetHub link shows confirmation dialog
- Visual header indicator shows unsaved patient count
- Console logging of which patients have unsaved changes
- Warning auto-clears after successful save

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Verification Checklist

- [ ] Browser shows warning on tab close with unsaved changes
- [ ] Browser shows warning on page refresh with unsaved changes
- [ ] "Back to VetHub" link shows confirmation dialog
- [ ] Visual indicator shows count of unsaved patients
- [ ] Console logs patient names with unsaved changes
- [ ] Warning disappears after save completes
- [ ] No warning shown when no changes present
- [ ] Works with both auto-save and manual save

---

## Expected Result

**Before:** Users can accidentally navigate away and lose all unsaved rounding sheet data

**After:** Browser/app warns before navigation when unsaved changes exist

**User Benefit:** No more accidentally losing hours of rounding sheet work
