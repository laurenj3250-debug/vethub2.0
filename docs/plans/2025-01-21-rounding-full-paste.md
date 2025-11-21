# Rounding Sheet Full Paste Support Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Extend paste functionality to all 13 rounding sheet fields, including dropdowns and autocomplete inputs.

**Architecture:** Add onPaste handlers to all input fields. Create smart paste parser that handles dropdowns (text → option matching) and autocomplete fields. Support partial matches for dropdown values.

**Tech Stack:** React, TypeScript, Clipboard API, Fuzzy matching

---

## Task 1: Create Smart Dropdown Value Matcher

**Files:**
- Modify: `src/components/RoundingSheet.tsx:104` (before handlePaste function)

**Step 1: Add dropdown value matching utility**

Insert before the handlePaste function (line 104):

```typescript
const matchDropdownValue = (pastedValue: string, validOptions: string[]): string => {
  if (!pastedValue || !pastedValue.trim()) return '';

  const normalized = pastedValue.trim().toLowerCase();

  // Exact match (case-insensitive)
  const exactMatch = validOptions.find(opt => opt.toLowerCase() === normalized);
  if (exactMatch) return exactMatch;

  // Prefix match (e.g., "ic" matches "ICU")
  const prefixMatch = validOptions.find(opt => opt.toLowerCase().startsWith(normalized));
  if (prefixMatch) return prefixMatch;

  // Contains match (e.g., "crit" matches "Critical")
  const containsMatch = validOptions.find(opt => opt.toLowerCase().includes(normalized));
  if (containsMatch) return containsMatch;

  // No match - return original value (will show in field, user can edit)
  return pastedValue;
};
```

**Step 2: Define dropdown option constants**

Add after the matchDropdownValue function:

```typescript
const DROPDOWN_OPTIONS = {
  location: ['ICU', 'Ward', 'Isolation', 'Kennel', 'Run'],
  icuCriteria: ['Critical', 'Monitoring', 'Stable', 'None'],
  code: ['Green', 'Yellow', 'Orange', 'Red'],
  ivc: ['Yes', 'No', 'Removed'],
  fluids: ['LRS', 'Normosol', 'Plasmalyte', '0.9% NaCl', 'None'],
  cri: ['None', 'Fentanyl', 'Ketamine', 'Lidocaine', 'Methadone', 'Custom'],
};
```

**Step 3: Verify compilation**

Run: `npm run typecheck`
Expected: No new errors

---

## Task 2: Update Paste Handler to Support All Fields

**Files:**
- Modify: `src/components/RoundingSheet.tsx:104-143` (handlePaste function)

**Step 1: Replace existing handlePaste function**

Replace lines 104-143 with enhanced version:

```typescript
const handlePaste = useCallback((e: React.ClipboardEvent, patientId: number, startField: keyof RoundingData) => {
  e.preventDefault();
  const pasteData = e.clipboardData.getData('text');
  const rows = pasteData.split('\n');

  // Field order matching Google Sheets columns
  const fieldOrder: (keyof RoundingData)[] = [
    'signalment', 'location', 'icuCriteria', 'code', 'problems',
    'diagnosticFindings', 'therapeutics', 'ivc', 'fluids',
    'cri', 'overnightDx', 'concerns', 'comments'
  ];

  const startIndex = fieldOrder.indexOf(startField);
  if (startIndex === -1) return;

  // Parse first row (tab-separated values)
  const values = rows[0].split('\t');
  const updates: Partial<RoundingData> = {};

  values.forEach((value, index) => {
    const fieldIndex = startIndex + index;
    if (fieldIndex < fieldOrder.length) {
      const field = fieldOrder[fieldIndex];
      const trimmedValue = value.trim();

      // Handle dropdown fields with smart matching
      if (field === 'location') {
        updates[field] = matchDropdownValue(trimmedValue, DROPDOWN_OPTIONS.location);
      } else if (field === 'icuCriteria') {
        updates[field] = matchDropdownValue(trimmedValue, DROPDOWN_OPTIONS.icuCriteria);
      } else if (field === 'code') {
        updates[field] = matchDropdownValue(trimmedValue, DROPDOWN_OPTIONS.code) as 'Green' | 'Yellow' | 'Orange' | 'Red' | '';
      } else if (field === 'ivc') {
        updates[field] = matchDropdownValue(trimmedValue, DROPDOWN_OPTIONS.ivc);
      } else if (field === 'fluids') {
        updates[field] = matchDropdownValue(trimmedValue, DROPDOWN_OPTIONS.fluids);
      } else if (field === 'cri') {
        updates[field] = matchDropdownValue(trimmedValue, DROPDOWN_OPTIONS.cri);
      } else {
        // Text fields (signalment, problems, diagnosticFindings, therapeutics, overnightDx, concerns, comments)
        updates[field] = trimmedValue;
      }
    }
  });

  setEditingData(prev => ({
    ...prev,
    [patientId]: {
      ...getPatientData(patientId),
      ...updates
    }
  }));

  const fieldCount = Object.keys(updates).length;
  const dropdownFields = ['location', 'icuCriteria', 'code', 'ivc', 'fluids', 'cri'];
  const pastedDropdowns = Object.keys(updates).filter(f => dropdownFields.includes(f)).length;

  toast({
    title: 'Pasted',
    description: `Pasted ${fieldCount} field${fieldCount > 1 ? 's' : ''}${pastedDropdowns > 0 ? ` (${pastedDropdowns} dropdown${pastedDropdowns > 1 ? 's' : ''} matched)` : ''}`
  });
}, [toast]);
```

**Step 2: Verify compilation**

Run: `npm run typecheck`
Expected: No new errors

---

## Task 3: Add Paste Handlers to All Input Fields

**Files:**
- Modify: `src/components/RoundingSheet.tsx:360-500` (field definitions)

**Step 1: Add onPaste to location dropdown**

Find the location select (around line 370-378) and add onPaste:

```typescript
<select
  value={data.location || ''}
  onChange={(e) => handleFieldChange(patient.id, 'location', e.target.value)}
  onPaste={(e) => handlePaste(e, patient.id, 'location')}
  className="w-full px-2 py-1 bg-slate-900 border-none text-white text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
>
  <option value="">-</option>
  <option value="ICU">ICU</option>
  <option value="Ward">Ward</option>
  <option value="Isolation">Isolation</option>
  <option value="Kennel">Kennel</option>
  <option value="Run">Run</option>
</select>
```

**Step 2: Add onPaste to icuCriteria dropdown**

Find icuCriteria select (around line 380-389) and add:

```typescript
<select
  value={data.icuCriteria || ''}
  onChange={(e) => handleFieldChange(patient.id, 'icuCriteria', e.target.value)}
  onPaste={(e) => handlePaste(e, patient.id, 'icuCriteria')}
  className="w-full px-2 py-1 bg-slate-900 border-none text-white text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
>
```

**Step 3: Add onPaste to code dropdown**

Find code select (around line 391-400) and add:

```typescript
<select
  value={data.code || ''}
  onChange={(e) => handleFieldChange(patient.id, 'code', e.target.value as 'Green' | 'Yellow' | 'Orange' | 'Red')}
  onPaste={(e) => handlePaste(e, patient.id, 'code')}
  className="w-full px-2 py-1 bg-slate-900 border-none text-white text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
>
```

**Step 4: Add onPaste to problems AutoCompleteInput**

Find problems field (around line 406-413) and add onPaste to the wrapper div:

```typescript
<div onPaste={(e) => handlePaste(e, patient.id, 'problems')}>
  <AutoCompleteInput
    field="problems"
    value={data.problems || ''}
    onChange={(value) => handleFieldChange(patient.id, 'problems', value)}
    className="w-full px-2 py-1 bg-slate-900 border-none text-white text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
  />
</div>
```

**Step 5: Add onPaste to diagnosticFindings AutoCompleteInput**

Find diagnosticFindings field (around line 420-427) and add:

```typescript
<div onPaste={(e) => handlePaste(e, patient.id, 'diagnosticFindings')}>
  <AutoCompleteInput
    field="diagnosticFindings"
    value={data.diagnosticFindings || ''}
    onChange={(value) => handleFieldChange(patient.id, 'diagnosticFindings', value)}
    className="w-full px-2 py-1 bg-slate-900 border-none text-white text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
  />
</div>
```

**Step 6: Add onPaste to therapeutics AutoCompleteInput**

Find therapeutics field (around line 434-441) and add:

```typescript
<div onPaste={(e) => handlePaste(e, patient.id, 'therapeutics')}>
  <AutoCompleteInput
    field="therapeutics"
    value={data.therapeutics || ''}
    onChange={(value) => handleFieldChange(patient.id, 'therapeutics', value)}
    className="w-full px-2 py-1 bg-slate-900 border-none text-white text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
  />
</div>
```

**Step 7: Add onPaste to ivc dropdown**

Find ivc select (around line 443-450) and add:

```typescript
<select
  value={data.ivc || ''}
  onChange={(e) => handleFieldChange(patient.id, 'ivc', e.target.value)}
  onPaste={(e) => handlePaste(e, patient.id, 'ivc')}
  className="w-full px-2 py-1 bg-slate-900 border-none text-white text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
>
```

**Step 8: Add onPaste to fluids dropdown**

Find fluids select (around line 452-461) and add:

```typescript
<select
  value={data.fluids || ''}
  onChange={(e) => handleFieldChange(patient.id, 'fluids', e.target.value)}
  onPaste={(e) => handlePaste(e, patient.id, 'fluids')}
  className="w-full px-2 py-1 bg-slate-900 border-none text-white text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
>
```

**Step 9: Add onPaste to cri dropdown**

Find cri select (around line 463-469) and add:

```typescript
<select
  value={data.cri || ''}
  onChange={(e) => handleFieldChange(patient.id, 'cri', e.target.value)}
  onPaste={(e) => handlePaste(e, patient.id, 'cri')}
  className="w-full px-2 py-1 bg-slate-900 border-none text-white text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
>
```

**Step 10: Add onPaste to concerns AutoCompleteInput**

Find concerns field (around line 481-489) and add:

```typescript
<div onPaste={(e) => handlePaste(e, patient.id, 'concerns')}>
  <AutoCompleteInput
    field="concerns"
    value={data.concerns || ''}
    onChange={(value) => handleFieldChange(patient.id, 'concerns', value)}
    className="w-full px-2 py-1 bg-slate-900 border-none text-white text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
  />
</div>
```

**Step 11: Verify compilation**

Run: `npm run typecheck`
Expected: No new errors

---

## Task 4: Test Paste Functionality

**Files:**
- Test manually

**Step 1: Start dev server**

Run: `npm run dev`

**Step 2: Prepare test data**

Copy this tab-separated data to clipboard:

```
10y MN Lab	ICU	Critical	Red	IVDD post-op	MRI normal	Gabapentin 300mg	Yes	LRS	None	Monitor overnight	Watch for deep pain	Good prognosis
```

**Step 3: Test paste in signalment field**

1. Navigate to http://localhost:3002/rounding
2. Click in the "signalment" field of first patient
3. Paste (Cmd+V / Ctrl+V)
4. **Expected:** All 13 fields fill with data
5. **Expected:** Toast shows "Pasted 13 fields (6 dropdowns matched)"

**Step 4: Test partial paste**

1. Copy partial data: `ICU	Critical	Red`
2. Click in "location" field
3. Paste
4. **Expected:** location=ICU, icuCriteria=Critical, code=Red

**Step 5: Test dropdown matching**

1. Copy: `ic	crit	ye`
2. Paste in "location" field
3. **Expected:**
   - location="ICU" (matched "ic" → "ICU")
   - icuCriteria="Critical" (matched "crit" → "Critical")
   - code="Yellow" (matched "ye" → "Yellow")

**Step 6: Test paste in autocomplete fields**

1. Copy: `Seizures, wobbly	CT scan pending	Phenobarbital 60mg BID`
2. Paste in "problems" field
3. **Expected:** problems, diagnosticFindings, therapeutics all filled

**Step 7: Test paste doesn't break on invalid dropdown values**

1. Copy: `invalid_value	another_invalid`
2. Paste in "location" field
3. **Expected:** Values pasted as-is (no crash), user can edit/correct

---

## Task 5: Commit Changes

```bash
git add src/components/RoundingSheet.tsx
git commit -m "feat: add full paste support to all rounding sheet fields

Extend paste functionality from 3 fields to all 13 fields.

Features:
- onPaste handlers on all inputs, selects, and autocomplete fields
- Smart dropdown value matching (exact, prefix, contains)
- Handles partial matches (e.g., 'ic' → 'ICU')
- Graceful handling of invalid dropdown values
- Toast feedback shows field count and dropdown matches
- Works with AutoCompleteInput components

Users can now paste complete rows from spreadsheets.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Verification Checklist

- [ ] Paste works on all 13 fields
- [ ] Dropdown values match intelligently (prefix, contains)
- [ ] Invalid dropdown values don't crash
- [ ] AutoCompleteInput fields support paste
- [ ] Toast shows accurate field count
- [ ] Partial paste works (paste into middle field)
- [ ] Tab-separated format parses correctly
- [ ] No console errors during paste

---

## Expected Result

**Before:** Only 3 fields support paste (signalment, overnightDx, comments)

**After:** All 13 fields support paste with smart dropdown matching

**User Benefit:** Can paste entire rows from Google Sheets/Excel directly into rounding sheet
