# MRI Individual Line Copy Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add copy button to each MRI patient row in MRI Schedule view so users can copy individual patient data instead of exporting entire schedule.

**Architecture:** Reuse existing `handleExportMRISchedule` logic but create new function that processes single patient. Add button with copy icon to each patient row in the MRI Schedule table.

**Tech Stack:** React, TypeScript, Lucide icons, Clipboard API

---

## Task 1: Create Single MRI Line Copy Function

**Files:**
- Modify: `src/app/page.tsx:1255-1294` (near handleExportMRISchedule)

**Step 1: Write the new function after handleExportMRISchedule**

Add this function immediately after `handleExportMRISchedule` (around line 1294):

```typescript
const handleCopySingleMRILine = (patientId: number) => {
  try {
    const patient = patients.find(p => p.id === patientId);
    if (!patient) {
      toast({ variant: 'destructive', title: 'Patient not found' });
      return;
    }

    // Build single line TSV (no header)
    const name = patient.demographics?.name || patient.name || '';
    const patientIdStr = patient.demographics?.patientId || '';
    const weight = (patient.demographics?.weight || '').replace(/[^\d.]/g, '');
    const scanType = patient.mriData?.scanType || '';

    const tsvLine = `${name}\t${patientIdStr}\t${weight}\t${scanType}`;

    // Copy to clipboard
    navigator.clipboard.writeText(tsvLine);

    toast({
      title: '✅ MRI Line Copied!',
      description: `${name}'s data ready to paste`
    });
  } catch (error) {
    console.error('MRI line copy error:', error);
    toast({ variant: 'destructive', title: 'Copy failed', description: 'Could not copy MRI line' });
  }
};
```

**Step 2: Verify function compiles**

Run: `npm run typecheck`
Expected: No TypeScript errors in page.tsx

**Step 3: Add copy button to MRI Schedule UI**

Find the MRI Schedule rendering section (search for "MRI Schedule View" comment around line 2466).

Locate the table row rendering for each patient (around line 2492). It should look like:
```typescript
{patients.filter(p => p.type === 'MRI' && p.status === 'New Admit').map((patient, idx) => {
```

**Modify the table row to add a copy button column.**

Current structure (around line 2492-2553):
```typescript
<tr key={patient.id} className="border-b border-slate-700">
  <td className="p-2">...</td>  {/* Name */}
  <td className="p-2">...</td>  {/* Patient ID input */}
  <td className="p-2">...</td>  {/* Weight input */}
  <td className="p-2">...</td>  {/* Scan Type input */}
</tr>
```

**Add new column BEFORE the closing `</tr>`:**

```typescript
<tr key={patient.id} className="border-b border-slate-700">
  <td className="p-2">...</td>  {/* Name */}
  <td className="p-2">...</td>  {/* Patient ID input */}
  <td className="p-2">...</td>  {/* Weight input */}
  <td className="p-2">...</td>  {/* Scan Type input */}

  {/* NEW: Copy button column */}
  <td className="p-2">
    <button
      onClick={() => handleCopySingleMRILine(patient.id)}
      className="p-1.5 rounded hover:bg-slate-700 transition-colors"
      title="Copy this patient's MRI line"
    >
      <Copy className="w-4 h-4 text-slate-400" />
    </button>
  </td>
</tr>
```

**Step 4: Add Copy icon import**

At the top of `src/app/page.tsx`, find the lucide-react imports (around line 3) and add `Copy`:

```typescript
import { ChevronDown, ChevronRight, Plus, X, Trash2, Calendar, Clock, AlertCircle, CheckCircle2, Circle, MoreVertical, Save, FileText, Download, Upload, Menu, Home, ClipboardList, Stethoscope, CalendarDays, Settings, LogOut, User, Search, Filter, SortAsc, MessageSquare, Tag, Zap, TrendingUp, Activity, Users, Copy } from 'lucide-react';
```

**Step 5: Add header column to MRI Schedule table**

Find the table header (around line 2475-2490) and add "Actions" column:

```typescript
<thead>
  <tr className="border-b-2 border-slate-600">
    <th className="p-2 text-left text-xs font-medium text-slate-400 uppercase">Name</th>
    <th className="p-2 text-left text-xs font-medium text-slate-400 uppercase">Patient ID</th>
    <th className="p-2 text-left text-xs font-medium text-slate-400 uppercase">Weight (kg)</th>
    <th className="p-2 text-left text-xs font-medium text-slate-400 uppercase">Scan Type</th>
    {/* NEW: Actions header */}
    <th className="p-2 text-left text-xs font-medium text-slate-400 uppercase">Actions</th>
  </tr>
</thead>
```

**Step 6: Test the feature**

Run: `npm run dev`

Navigate to: http://localhost:3000
1. Add or find an MRI patient
2. Click "Tools" → "MRI Schedule"
3. Look for new copy button (clipboard icon) in each row
4. Click the copy button
5. Paste into spreadsheet (Cmd+V / Ctrl+V)
6. Verify: Single line with Name, Patient ID, Weight, Scan Type

Expected:
- ✅ Copy button appears in each MRI patient row
- ✅ Clicking button shows "✅ MRI Line Copied!" toast
- ✅ Pasted data is single TSV line (4 columns)

**Step 7: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat: add individual line copy to MRI Schedule

Add copy button to each MRI patient row in schedule view.
Users can now copy individual patient lines instead of full export.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Verification Checklist

- [ ] Copy icon imported from lucide-react
- [ ] handleCopySingleMRILine function created
- [ ] Copy button added to each MRI patient row
- [ ] "Actions" header column added to table
- [ ] Button shows hover effect
- [ ] Toast notification shows on copy
- [ ] Pasted data is valid TSV format
- [ ] Works with patients that have missing data fields

---

## Expected Result

**Before:** Only way to get MRI data is "Export All" button (copies entire schedule)

**After:** Each MRI patient row has copy button → Click → That patient's line copied → Paste into spreadsheet

**User Benefit:** Can quickly copy individual MRI patients without exporting and manually extracting from full schedule
