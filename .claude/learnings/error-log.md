# VetHub Error Log & Solutions

**Purpose**: Document every error encountered and its solution so they NEVER happen again.

---

## Error #1: Field Name Mismatches (snake_case vs camelCase)

**Date**: 2025-01-16
**Severity**: 🔴 CRITICAL - Data not saving
**Occurrences**: 49 instances across 4 files

### Symptom
- Data appears to save (shows success toast) but doesn't persist
- API returns 200 but silently ignores fields
- Frontend sends data, database never gets updated

### Root Cause
Frontend sending snake_case field names (`rounding_data`, `mri_data`, `patient_info`) but API/Database expecting camelCase (`roundingData`, `mriData`, `demographics`).

### Example
```typescript
// ❌ WRONG - Field ignored by API
await apiClient.updatePatient(id, {
  rounding_data: updates  // API doesn't recognize this
});

// ✅ CORRECT - Field saved to database
await apiClient.updatePatient(id, {
  roundingData: updates  // API accepts this
});
```

### Prevention Rule
**ALWAYS use camelCase for all field names in TypeScript/JavaScript code.**
- API routes: camelCase
- Frontend components: camelCase
- Database (Prisma): camelCase
- Only exception: Prisma schema definitions use camelCase anyway

### Files Fixed
- `src/contexts/PatientContext.tsx` (7 fixes)
- `src/components/EnhancedRoundingSheet.tsx` (15 fixes)
- `src/components/SimpleRoundingSheet.tsx` (4 fixes)
- `src/app/page.tsx` (23 fixes)

**Commit**: `9926e33` - "Fix all field name mismatches: convert snake_case to camelCase"

---

## Error #2: VetRadar Credentials Re-prompting Every Sync

**Date**: 2025-01-16
**Severity**: 🟡 MEDIUM - Annoying UX issue

### Symptom
User has to re-enter VetRadar email/password every single time they click "Sync VetRadar"

### Root Cause
Credentials were being read from environment variables that don't exist on client-side. No persistence mechanism.

### Solution
```typescript
// Store in localStorage after first prompt
const email = localStorage.getItem('vetradar_email') || prompt('Enter email:');
localStorage.setItem('vetradar_email', email);

// Clear if login fails
if (result.error?.includes('login')) {
  localStorage.removeItem('vetradar_email');
  localStorage.removeItem('vetradar_password');
}
```

### Prevention Rule
**For user credentials that need persistence across sessions: use localStorage (client-side) or secure cookies (server-side). NEVER rely on environment variables for user-specific data.**

**File**: `src/components/RoundingPageClient.tsx`
**Commit**: `9926e33` (included in field name fix)

---

## Error #3: VetRadar Sync Not Populating Medications

**Date**: 2025-01-16
**Severity**: 🔴 CRITICAL - Feature not working

### Symptom
VetRadar sync completes successfully but medications/therapeutics don't appear in rounding sheet

### Root Cause
API was using OR logic instead of merging:
```typescript
// ❌ WRONG - Uses one or the other, never merges
roundingData: patient.roundingData || existingPatient.roundingData

// If patient has ANY existing roundingData, VetRadar data is discarded
```

### Solution
```typescript
// ✅ CORRECT - Properly merges objects
const mergedRoundingData = {
  ...(existingPatient.roundingData as any || {}),
  ...(patient.roundingData || {}),
};
// VetRadar data takes priority for conflicts, existing data preserved otherwise
```

### Prevention Rule
**When updating nested objects, ALWAYS merge with existing data using spread operator. Never use OR (`||`) logic for objects.**

**File**: `src/app/api/integrations/vetradar/patients/route.ts`
**Commit**: `80f4b9d` - "Fix VetRadar sync to properly merge roundingData"

---

## Error #4: 500 Error When Fetching Patients After Type Update

**Date**: 2025-01-16
**Severity**: 🔴 CRITICAL - Blocks patient type changes

### Symptom
- Changing patient type shows success toast
- Type doesn't persist, reverts on refresh
- 500 error in console: `GET /api/patients/39 failed`
- React hydration error #418

### Root Cause
API trying to convert `currentStay.admitDate` to Date object, but some patients have `currentStay` WITHOUT `admitDate`:
```typescript
// ❌ WRONG - Crashes if admitDate is undefined
admitDate: new Date((patient.currentStay as any).admitDate)
// Result: new Date(undefined) → Invalid Date → 500 error
```

### Solution
```typescript
// ✅ CORRECT - Check if admitDate exists first
admitDate: (patient.currentStay as any).admitDate
  ? new Date((patient.currentStay as any).admitDate)
  : undefined
```

### Prevention Rule
**ALWAYS null-check before converting to Date. Fields like admitDate may be optional/missing in database.**

```typescript
// Pattern to follow for all Date conversions:
someDate: data.someDate ? new Date(data.someDate) : undefined
```

### Files Fixed
- `src/app/api/patients/route.ts`
- `src/app/api/patients/[id]/route.ts`

**Commit**: `32a4083` - "Fix 500 error when fetching patients with missing admitDate"

---

## Error Pattern Recognition

### Pattern 1: "Data saves but doesn't persist"
**Diagnosis**: Field name mismatch (see Error #1)
**Check**: Compare frontend field names with API expectations

### Pattern 2: "Feature works once, then stops working"
**Diagnosis**: Missing merge logic or credential storage (see Error #2, #3)
**Check**: Look for `||` logic when objects should be merged

### Pattern 3: "500 error with no obvious cause"
**Diagnosis**: Missing null checks on optional fields (see Error #4)
**Check**: Look for Date conversions, array operations on potentially undefined values

---

## Debugging Checklist

When encountering ANY error:

1. ✅ **Read the FULL error message** - Don't skip stack traces
2. ✅ **Check browser Network tab** - See actual API request/response
3. ✅ **Check browser Console** - Look for client-side errors
4. ✅ **Add console.log** before/after suspicious code
5. ✅ **Document the error** - Add to this file immediately after fixing
6. ✅ **Add prevention rule** - So it never happens again

---

## Next Error Goes Here

**Template for new errors:**

## Error #X: [Brief Description]

**Date**: YYYY-MM-DD
**Severity**: 🔴 CRITICAL / 🟡 MEDIUM / 🟢 LOW

### Symptom
What the user sees/experiences

### Root Cause
Technical explanation of what's broken

### Solution
Code fix with before/after examples

### Prevention Rule
General rule to prevent this class of errors

**File**: path/to/file
**Commit**: hash - "message"

---
