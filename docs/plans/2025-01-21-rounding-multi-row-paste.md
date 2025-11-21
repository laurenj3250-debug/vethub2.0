# Rounding Sheet Multi-Row Paste Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Enable pasting multiple rows of data from spreadsheets to fill multiple patients at once.

**Architecture:** Extend paste handler to process multi-line clipboard data. Map each row to a patient in order. Show preview dialog before applying. Handle mismatched row counts gracefully.

**Tech Stack:** React, TypeScript, Clipboard API, Modal dialogs

---

## Task 1: Create Paste Preview Modal Component

**Files:**
- Create: `src/components/PastePreviewModal.tsx`

**Step 1: Create modal component file**

```typescript
'use client';

import { useState } from 'react';
import { X, Check, AlertTriangle } from 'lucide-react';

interface PastePreviewData {
  patientId: number;
  patientName: string;
  fields: { [key: string]: string };
  rowIndex: number;
}

interface PastePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  previewData: PastePreviewData[];
  fieldNames: string[];
}

export function PastePreviewModal({
  isOpen,
  onClose,
  onConfirm,
  previewData,
  fieldNames
}: PastePreviewModalProps) {
  if (!isOpen) return null;

  const excessRows = previewData.filter(p => !p.patientId).length;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-800 rounded-xl border border-slate-700 max-w-4xl w-full max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-slate-700 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Check className="text-emerald-400" size={24} />
              Paste Preview
            </h2>
            <p className="text-sm text-slate-400 mt-1">
              {previewData.length} row{previewData.length > 1 ? 's' : ''} • {fieldNames.length} field{fieldNames.length > 1 ? 's' : ''}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
          >
            <X className="text-slate-400" size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4">
          {excessRows > 0 && (
            <div className="mb-4 p-3 bg-yellow-900/30 border border-yellow-600/50 rounded-lg flex items-start gap-2">
              <AlertTriangle className="text-yellow-400 flex-shrink-0 mt-0.5" size={18} />
              <div className="text-sm text-yellow-200">
                <strong>Warning:</strong> {excessRows} row{excessRows > 1 ? 's' : ''} will be ignored (not enough patients to fill)
              </div>
            </div>
          )}

          <div className="space-y-3">
            {previewData.map((preview, idx) => (
              <div
                key={idx}
                className={`p-3 rounded-lg border ${
                  preview.patientId
                    ? 'bg-slate-900/50 border-slate-700'
                    : 'bg-red-900/20 border-red-700/50'
                }`}
              >
                <div className="text-sm font-medium text-white mb-2">
                  Row {preview.rowIndex + 1}
                  {preview.patientId ? (
                    <span className="text-emerald-400 ml-2">→ {preview.patientName}</span>
                  ) : (
                    <span className="text-red-400 ml-2">→ No patient available (will be skipped)</span>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {Object.entries(preview.fields).map(([field, value]) => (
                    <div key={field} className="flex gap-2">
                      <span className="text-slate-400 font-medium">{field}:</span>
                      <span className="text-white truncate">{value || '(empty)'}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-700 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 text-slate-300 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
          >
            <Check size={18} />
            Apply Paste ({previewData.filter(p => p.patientId).length} patients)
          </button>
        </div>
      </div>
    </div>
  );
}
```

**Step 2: Verify compilation**

Run: `npm run typecheck`
Expected: No new errors

---

## Task 2: Add Multi-Row Paste State to RoundingSheet

**Files:**
- Modify: `src/components/RoundingSheet.tsx:43-50`

**Step 1: Import PastePreviewModal**

Add to imports at top of file:

```typescript
import { PastePreviewModal } from './PastePreviewModal';
```

**Step 2: Add state for paste preview**

Add after existing state declarations (around line 50):

```typescript
const [showPastePreview, setShowPastePreview] = useState(false);
const [pendingPasteData, setPendingPasteData] = useState<any[]>([]);
const [pasteStartPatientIndex, setPasteStartPatientIndex] = useState(0);
```

---

## Task 3: Create Multi-Row Paste Handler

**Files:**
- Modify: `src/components/RoundingSheet.tsx:145` (after autoSave function)

**Step 1: Add multi-row paste function**

Insert after the autoSave function:

```typescript
const handleMultiRowPaste = useCallback((
  pasteData: string,
  startPatientId: number,
  startField: keyof RoundingData
) => {
  const rows = pasteData.split('\n').filter(row => row.trim());

  // If only one row, use existing single-row paste
  if (rows.length === 1) {
    return false; // Let single-row paste handle it
  }

  const fieldOrder: (keyof RoundingData)[] = [
    'signalment', 'location', 'icuCriteria', 'code', 'problems',
    'diagnosticFindings', 'therapeutics', 'ivc', 'fluids',
    'cri', 'overnightDx', 'concerns', 'comments'
  ];

  const startFieldIndex = fieldOrder.indexOf(startField);
  if (startFieldIndex === -1) return false;

  // Find the index of the starting patient in active patients list
  const activePatients = patients.filter(p => p.status !== 'Discharged');
  const startPatientIdx = activePatients.findIndex(p => p.id === startPatientId);
  if (startPatientIdx === -1) return false;

  // Parse all rows and create preview data
  const previewData = rows.map((row, rowIdx) => {
    const values = row.split('\t');
    const patientIdx = startPatientIdx + rowIdx;
    const patient = activePatients[patientIdx];

    const fields: { [key: string]: string } = {};

    values.forEach((value, valueIdx) => {
      const fieldIdx = startFieldIndex + valueIdx;
      if (fieldIdx < fieldOrder.length) {
        const field = fieldOrder[fieldIdx];
        const trimmedValue = value.trim();

        // Apply dropdown matching
        if (field === 'location') {
          fields[field] = matchDropdownValue(trimmedValue, DROPDOWN_OPTIONS.location);
        } else if (field === 'icuCriteria') {
          fields[field] = matchDropdownValue(trimmedValue, DROPDOWN_OPTIONS.icuCriteria);
        } else if (field === 'code') {
          fields[field] = matchDropdownValue(trimmedValue, DROPDOWN_OPTIONS.code);
        } else if (field === 'ivc') {
          fields[field] = matchDropdownValue(trimmedValue, DROPDOWN_OPTIONS.ivc);
        } else if (field === 'fluids') {
          fields[field] = matchDropdownValue(trimmedValue, DROPDOWN_OPTIONS.fluids);
        } else if (field === 'cri') {
          fields[field] = matchDropdownValue(trimmedValue, DROPDOWN_OPTIONS.cri);
        } else {
          fields[field] = trimmedValue;
        }
      }
    });

    return {
      patientId: patient?.id || 0,
      patientName: patient?.demographics?.name || patient?.name || '',
      fields,
      rowIndex: rowIdx
    };
  });

  // Show preview modal
  setPendingPasteData(previewData);
  setPasteStartPatientIndex(startPatientIdx);
  setShowPastePreview(true);

  return true; // Multi-row paste handled
}, [patients]);
```

**Step 2: Add function to apply multi-row paste**

```typescript
const applyMultiRowPaste = useCallback(() => {
  const updates: { [patientId: number]: Partial<RoundingData> } = {};

  pendingPasteData.forEach(preview => {
    if (preview.patientId) {
      const patient = patients.find(p => p.id === preview.patientId);
      updates[preview.patientId] = {
        ...getPatientData(preview.patientId),
        ...preview.fields
      };
    }
  });

  setEditingData(prev => ({
    ...prev,
    ...updates
  }));

  const appliedCount = Object.keys(updates).length;
  toast({
    title: 'Multi-Row Paste Applied',
    description: `Pasted data to ${appliedCount} patient${appliedCount > 1 ? 's' : ''}`
  });

  setShowPastePreview(false);
  setPendingPasteData([]);
}, [pendingPasteData, patients, toast]);
```

---

## Task 4: Update Paste Handler to Detect Multi-Row

**Files:**
- Modify: `src/components/RoundingSheet.tsx:104-143` (handlePaste function)

**Step 1: Add multi-row detection to handlePaste**

At the beginning of handlePaste function, add:

```typescript
const handlePaste = useCallback((e: React.ClipboardEvent, patientId: number, startField: keyof RoundingData) => {
  e.preventDefault();
  const pasteData = e.clipboardData.getData('text');

  // Check if multi-row paste
  const isMultiRow = handleMultiRowPaste(pasteData, patientId, startField);
  if (isMultiRow) {
    return; // Multi-row paste will show preview modal
  }

  // Continue with existing single-row paste logic...
  const rows = pasteData.split('\n');
  // ... rest of existing code
```

---

## Task 5: Add Preview Modal to Render

**Files:**
- Modify: `src/components/RoundingSheet.tsx:600+` (end of return statement)

**Step 1: Add modal before closing div**

At the end of the component's return statement, add:

```typescript
      </div>

      {/* Paste Preview Modal */}
      <PastePreviewModal
        isOpen={showPastePreview}
        onClose={() => {
          setShowPastePreview(false);
          setPendingPasteData([]);
        }}
        onConfirm={applyMultiRowPaste}
        previewData={pendingPasteData}
        fieldNames={[
          'signalment', 'location', 'icuCriteria', 'code', 'problems',
          'diagnosticFindings', 'therapeutics', 'ivc', 'fluids',
          'cri', 'overnightDx', 'concerns', 'comments'
        ]}
      />
    </>
  );
}
```

---

## Task 6: Test Multi-Row Paste

**Files:**
- Test manually

**Step 1: Prepare multi-row test data**

Copy this to clipboard:

```
10y MN Lab	ICU	Critical	Red	IVDD post-op	MRI normal	Gabapentin	Yes	LRS	None	Monitor	Watch	Good
8y FS Golden	Ward	Stable	Green	Seizures	CT pending	Phenobarb	No	None	None	Observe	None	Stable
12y MC Poodle	ICU	Monitoring	Yellow	Vestibular	Blood pending	Cerenia	Yes	Normosol	None	Recheck	Dizzy	Fair
```

**Step 2: Test multi-row paste**

1. Navigate to http://localhost:3002/rounding
2. Ensure you have 3+ active patients
3. Click in first patient's "signalment" field
4. Paste (Cmd+V / Ctrl+V)
5. **Expected:** Preview modal appears showing 3 rows
6. **Expected:** Each row shows patient name and field mappings
7. Click "Apply Paste"
8. **Expected:** All 3 patients filled with data

**Step 3: Test with more rows than patients**

1. Copy 5 rows of data
2. Have only 3 active patients
3. Paste in first patient
4. **Expected:** Modal shows warning "2 rows will be ignored"
5. **Expected:** Only 3 patients get data
6. **Expected:** No errors

**Step 4: Test cancellation**

1. Paste multi-row data
2. Click "Cancel" in preview modal
3. **Expected:** Modal closes, no data changed

**Step 5: Test single-row still works**

1. Copy single row: `10y MN Lab	ICU	Critical`
2. Paste
3. **Expected:** No modal, immediate paste (single-row behavior)

---

## Task 7: Commit Changes

```bash
git add src/components/RoundingSheet.tsx src/components/PastePreviewModal.tsx
git commit -m "feat: add multi-row paste support to rounding sheet

Enable pasting multiple rows from spreadsheets to fill multiple patients.

Features:
- Detects multi-row clipboard data (2+ rows)
- Shows preview modal before applying
- Maps each row to a patient in order
- Warns when more rows than available patients
- Applies dropdown matching to all rows
- Graceful handling of excess rows
- Cancel option to abort paste

Users can now paste entire patient lists from spreadsheets.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Verification Checklist

- [ ] Multi-row paste detected (2+ rows)
- [ ] Preview modal shows all rows
- [ ] Patient names shown for each row
- [ ] Field mappings visible in preview
- [ ] Warning shows when excess rows
- [ ] Apply button shows patient count
- [ ] Cancel closes modal without changes
- [ ] Single-row paste still works (no modal)
- [ ] Dropdown matching works in multi-row

---

## Expected Result

**Before:** Can only paste one patient row at a time

**After:** Can paste multiple rows, filling multiple patients with preview confirmation

**User Benefit:** Bulk data entry from spreadsheets for entire rounding list
