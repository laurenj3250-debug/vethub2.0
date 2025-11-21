# Rounding Sheet Auto-Save Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add auto-save with debouncing to RoundingSheet component to prevent data loss and improve UX.

**Architecture:** Add debounced save mechanism that triggers 2 seconds after user stops typing. Update state management to track saving status. Add visual feedback showing "Saving..." → "Saved" → cleared.

**Tech Stack:** React, TypeScript, Debouncing (setTimeout), API client

---

## Task 1: Add Debounced Save State Management

**Files:**
- Modify: `src/components/RoundingSheet.tsx:43-50`

**Step 1: Add new state for auto-save tracking**

Add after line 43 (`const [editingData, setEditingData] = useState...`):

```typescript
const [isSaving, setIsSaving] = useState(false);
const [saveTimers, setSaveTimers] = useState<Map<number, NodeJS.Timeout>>(new Map());
const [saveStatus, setSaveStatus] = useState<Map<number, 'saving' | 'saved' | 'error'>>(new Map());
const autoSaveDelay = 2000; // 2 seconds
```

**Step 2: Verify TypeScript compilation**

Run: `npm run typecheck`
Expected: No new errors (existing errors okay)

---

## Task 2: Create Debounced Auto-Save Function

**Files:**
- Modify: `src/components/RoundingSheet.tsx:145` (before handleSave function)

**Step 1: Add auto-save function before handleSave**

Insert before line 145:

```typescript
const autoSave = useCallback(async (patientId: number) => {
  try {
    setIsSaving(true);
    setSaveStatus(prev => new Map(prev).set(patientId, 'saving'));

    const updates = editingData[patientId];
    if (!updates) {
      setSaveStatus(prev => {
        const newMap = new Map(prev);
        newMap.delete(patientId);
        return newMap;
      });
      return;
    }

    const dataWithTimestamp = {
      ...updates,
      lastUpdated: new Date().toISOString(),
    };

    await apiClient.updatePatient(String(patientId), {
      roundingData: dataWithTimestamp
    });

    setSaveStatus(prev => new Map(prev).set(patientId, 'saved'));

    // Clear "saved" status after 2 seconds
    setTimeout(() => {
      setSaveStatus(prev => {
        const newMap = new Map(prev);
        newMap.delete(patientId);
        return newMap;
      });
    }, 2000);

    // Clear editing data after successful save
    setEditingData(prev => {
      const newData = { ...prev };
      delete newData[patientId];
      return newData;
    });

    onPatientUpdate?.();
  } catch (error) {
    console.error('Auto-save failed:', error);
    setSaveStatus(prev => new Map(prev).set(patientId, 'error'));

    // Keep error status for 5 seconds
    setTimeout(() => {
      setSaveStatus(prev => {
        const newMap = new Map(prev);
        newMap.delete(patientId);
        return newMap;
      });
    }, 5000);
  } finally {
    setIsSaving(false);
  }
}, [editingData, onPatientUpdate]);
```

**Step 2: Add useCallback import if not present**

At top of file (line 2), ensure useCallback is imported:

```typescript
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
```

**Step 3: Verify compilation**

Run: `npm run typecheck`
Expected: No new errors

---

## Task 3: Trigger Auto-Save on Field Changes

**Files:**
- Modify: `src/components/RoundingSheet.tsx:94-102` (handleFieldChange function)

**Step 1: Update handleFieldChange to trigger debounced save**

Replace the entire handleFieldChange function (lines 94-102):

```typescript
const handleFieldChange = (patientId: number, field: keyof RoundingData, value: string) => {
  // Update editing data immediately
  setEditingData(prev => ({
    ...prev,
    [patientId]: {
      ...getPatientData(patientId),
      [field]: value
    }
  }));

  // Clear existing timer for this patient
  const existingTimer = saveTimers.get(patientId);
  if (existingTimer) {
    clearTimeout(existingTimer);
  }

  // Set new timer for auto-save
  const newTimer = setTimeout(() => {
    autoSave(patientId);
    setSaveTimers(prev => {
      const newMap = new Map(prev);
      newMap.delete(patientId);
      return newMap;
    });
  }, autoSaveDelay);

  setSaveTimers(prev => new Map(prev).set(patientId, newTimer));
};
```

**Step 2: Add cleanup on unmount**

Add useEffect after state declarations (around line 55):

```typescript
useEffect(() => {
  return () => {
    // Clean up all timers on unmount
    saveTimers.forEach(timer => clearTimeout(timer));
  };
}, [saveTimers]);
```

**Step 3: Verify compilation**

Run: `npm run typecheck`
Expected: No new errors

---

## Task 4: Add Visual Save Status Indicators

**Files:**
- Modify: `src/components/RoundingSheet.tsx:332-339` (patient row rendering)

**Step 1: Find the table row className**

Around line 332, find:

```typescript
<tr
  key={patient.id}
  className={`border-b border-slate-700/50 ${hasChanges ? 'bg-emerald-900/20' : ''}`}
>
```

**Step 2: Add save status to row className**

Replace with:

```typescript
<tr
  key={patient.id}
  className={`border-b border-slate-700/50 transition-colors ${
    saveStatus.get(patient.id) === 'saving' ? 'bg-yellow-900/20' :
    saveStatus.get(patient.id) === 'saved' ? 'bg-green-900/20' :
    saveStatus.get(patient.id) === 'error' ? 'bg-red-900/20' :
    hasChanges ? 'bg-emerald-900/20' : ''
  }`}
>
```

**Step 3: Add save status text indicator in first cell**

Find the name cell (around line 340-353) and add status text after patient name:

```typescript
<td className="p-2 sticky left-0 bg-slate-900 z-10">
  <div className="flex items-center gap-2">
    <button
      onClick={() => {
        const patientName = patient.demographics?.name || patient.name;
        console.log('[Rounding] Selected patient:', patientName);
        setSelectedPatient?.(patient);
      }}
      className="text-cyan-400 hover:text-cyan-300 font-medium text-sm underline decoration-dotted cursor-pointer"
    >
      {patient.demographics?.name || patient.name || 'Unnamed'}
    </button>
    {saveStatus.get(patient.id) === 'saving' && (
      <span className="text-xs text-yellow-400 animate-pulse">💾 Saving...</span>
    )}
    {saveStatus.get(patient.id) === 'saved' && (
      <span className="text-xs text-green-400">✓ Saved</span>
    )}
    {saveStatus.get(patient.id) === 'error' && (
      <span className="text-xs text-red-400">⚠️ Failed</span>
    )}
  </div>
</td>
```

**Step 4: Verify compilation**

Run: `npm run typecheck`
Expected: No new errors

---

## Task 5: Update Manual Save Button Behavior

**Files:**
- Modify: `src/components/RoundingSheet.tsx:510-516` (Save button)

**Step 1: Update Save button to cancel auto-save timer**

Find the Save button (around line 510-516) and update the onClick:

```typescript
<button
  onClick={() => {
    // Cancel auto-save timer
    const timer = saveTimers.get(patient.id);
    if (timer) {
      clearTimeout(timer);
      setSaveTimers(prev => {
        const newMap = new Map(prev);
        newMap.delete(patient.id);
        return newMap;
      });
    }
    // Trigger immediate save
    handleSave(patient.id);
  }}
  disabled={!hasChanges || isSaving}
  className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded text-xs font-medium transition-colors"
>
  Save
</button>
```

**Step 2: Update Save All button similarly**

Find Save All button (around line 294-301) and update:

```typescript
<button
  onClick={() => {
    // Cancel all auto-save timers
    saveTimers.forEach((timer, patientId) => {
      clearTimeout(timer);
    });
    setSaveTimers(new Map());
    // Trigger save all
    handleSaveAll();
  }}
  disabled={Object.keys(editingData).length === 0 || isSaving}
  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
>
  <Save size={16} />
  Save All ({Object.keys(editingData).length})
</button>
```

---

## Task 6: Test Auto-Save Functionality

**Files:**
- Test manually (no automated tests for this feature yet)

**Step 1: Start dev server**

Run: `npm run dev`

**Step 2: Navigate to rounding sheet**

Go to: http://localhost:3002/rounding

**Step 3: Test auto-save**

1. Edit a cell in the "signalment" column
2. Wait 2 seconds without typing
3. **Expected:** Row turns yellow with "💾 Saving..." text
4. After save completes: Row turns green with "✓ Saved" text
5. After 2 more seconds: Status clears

**Step 4: Test manual save cancels auto-save**

1. Edit a cell
2. Immediately click "Save" button (before 2 seconds)
3. **Expected:** Auto-save timer cancelled, manual save runs
4. Status shows normally

**Step 5: Test error handling**

1. Disconnect network (DevTools → Network → Offline)
2. Edit a cell
3. Wait 2 seconds
4. **Expected:** Row turns red with "⚠️ Failed" text
5. Error persists for 5 seconds

**Step 6: Test cleanup on navigation**

1. Edit a cell
2. Immediately click "Back to VetHub" (before auto-save)
3. **Expected:** No console errors about setState on unmounted component

---

## Task 7: Commit Changes

```bash
git add src/components/RoundingSheet.tsx
git commit -m "feat: add auto-save to rounding sheet

Add 2-second debounced auto-save that triggers after user stops typing.

Features:
- Auto-save triggers 2s after last keystroke
- Visual status indicators (Saving/Saved/Failed)
- Row color changes based on save state
- Manual save buttons cancel auto-save timers
- Cleanup timers on component unmount
- Clear saved status after 2s, error status after 5s

Prevents data loss from forgetting to click Save button.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Verification Checklist

- [ ] Auto-save triggers 2 seconds after typing stops
- [ ] "💾 Saving..." indicator shows during save
- [ ] "✓ Saved" indicator shows after successful save
- [ ] "⚠️ Failed" indicator shows on save error
- [ ] Row background color changes (yellow → green/red)
- [ ] Manual Save button cancels auto-save timer
- [ ] Save All button cancels all auto-save timers
- [ ] No memory leaks (timers cleaned up on unmount)
- [ ] No console errors during normal operation
- [ ] Editing data cleared after successful auto-save

---

## Expected Result

**Before:** Users must click "Save" button or risk losing data

**After:** Data automatically saves 2 seconds after typing stops, with clear visual feedback

**User Benefit:** No more lost data from forgetting to save. Immediate feedback on save status.
