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

## Error #5: VetRadar Sync Still Not Populating Medications (Deep Merge Issue)

**Date**: 2025-01-16
**Severity**: 🔴 CRITICAL - Feature regression

### Symptom
- User reports: "when i sync, meds are still not coming through from the vetradar sync"
- VetRadar sync completes successfully (200 response)
- Medications extracted from VetRadar correctly
- But therapeutics field remains empty in rounding sheet after sync

### Root Cause
The previous fix (Error #3) used shallow object merge with spread operator:
```typescript
// ❌ WRONG - Shallow merge overwrites with undefined values
const mergedRoundingData = {
  ...(existingPatient.roundingData as any || {}),
  ...(patient.roundingData || {}),
};
```

**Why this failed:**
- If VetRadar returns `roundingData: { therapeutics: "med list", ... }` but some other fields are undefined
- Shallow spread copies ALL properties from right side, including undefined ones
- Result: `{ therapeutics: "med list", someField: undefined }` overwrites `{ someField: "existing value" }`
- Existing data gets wiped by undefined values

### Solution
```typescript
// ✅ CORRECT - Conditional deep merge only overwrites non-empty values
const existingRounding = (existingPatient.roundingData as any) || {};
const newRounding = (patient.roundingData as any) || {};

const mergedRoundingData = {
  ...existingRounding,
  // Only overwrite if VetRadar has actual non-empty values
  ...(newRounding.signalment ? { signalment: newRounding.signalment } : {}),
  ...(newRounding.location ? { location: newRounding.location } : {}),
  ...(newRounding.icuCriteria ? { icuCriteria: newRounding.icuCriteria } : {}),
  ...(newRounding.code ? { code: newRounding.code } : {}),
  ...(newRounding.codeStatus ? { codeStatus: newRounding.codeStatus } : {}),
  ...(newRounding.problems ? { problems: newRounding.problems } : {}),
  ...(newRounding.diagnosticFindings ? { diagnosticFindings: newRounding.diagnosticFindings } : {}),
  ...(newRounding.therapeutics ? { therapeutics: newRounding.therapeutics } : {}),
  ...(newRounding.ivc ? { ivc: newRounding.ivc } : {}),
  ...(newRounding.fluids ? { fluids: newRounding.fluids } : {}),
  ...(newRounding.cri ? { cri: newRounding.cri } : {}),
  ...(newRounding.overnightDx ? { overnightDx: newRounding.overnightDx } : {}),
  ...(newRounding.concerns ? { concerns: newRounding.concerns } : {}),
  ...(newRounding.comments ? { comments: newRounding.comments } : {}),
};
```

Now:
- Only fields with actual data from VetRadar overwrite existing values
- Empty/undefined fields from VetRadar are ignored
- Existing manual entries are preserved
- VetRadar medications appear correctly in therapeutics field

### Prevention Rule
**When merging nested objects where some fields may be undefined: use conditional spread to only include non-empty values. NEVER use plain spread operator for partial updates.**

```typescript
// Pattern to follow for all object merges:
const merged = {
  ...existing,
  ...(newData.field ? { field: newData.field } : {}),
  ...(newData.field2 ? { field2: newData.field2 } : {}),
};

// NOT this:
const merged = { ...existing, ...newData }; // Overwrites with undefined!
```

### Files Fixed
- `src/app/api/integrations/vetradar/patients/route.ts` (lines 106-127)

**Commit**: `c9ed22a` - "Fix VetRadar sync medications issue: use deep merge instead of shallow merge"

---

## Error #6: Patient Type Dropdown 500 Error - Missing Database Field

**Date**: 2025-01-16
**Severity**: 🔴 CRITICAL - Core feature completely broken

### Symptom
- User reports: "still cannot change status" and "only medical can't swap to mri or get the mri specific tasks"
- Trying to change patient type from Medical → MRI or Surgery
- GET /api/patients/40 returns 500 error
- Error: "Uncaught (in promise) Error: Request failed"
- Patient type never changes, MRI tasks never auto-create

### Root Cause
The code referenced `patient.type` field in the API routes, but **the field did not exist in the database schema**.

**Timeline of the issue:**
1. Previous commits (32a4083, 38e4d8f) added `patient.type` references to API routes
2. But Prisma schema only had `status` field, not `type` field
3. TypeScript compiler showed errors: "Property 'type' does not exist on type..."
4. At runtime, attempting to read `patient.type` returned `undefined`
5. This caused API transformation to crash with 500 error

**Why it kept happening:**
- API routes tried to access `patient.type` on lines 44, 119, 146
- Prisma had no `type` column, so patient.type was always undefined
- GET request after PATCH crashed during data transformation

### Solution
```typescript
// ❌ WRONG - Before (in Prisma schema):
model Patient {
  id     Int      @id @default(autoincrement())
  status String   // Active | Discharged | MRI | Surgery
  // No type field!
}

// ✅ CORRECT - After (in Prisma schema):
model Patient {
  id     Int      @id @default(autoincrement())
  status String   // Active | Discharged
  type   String   @default("Medical") // Medical | MRI | Surgery
}
```

**Database Migration:**
```sql
-- Add type column to Patient table
ALTER TABLE "Patient" ADD COLUMN "type" TEXT NOT NULL DEFAULT 'Medical';

-- Add comment for documentation
COMMENT ON COLUMN "Patient"."type" IS 'Patient type: Medical | MRI | Surgery';
```

**Steps taken:**
1. Added `type` field to Prisma schema with default value 'Medical'
2. Created migration file: `prisma/migrations/20250116_add_patient_type_field/migration.sql`
3. Regenerated Prisma client: `npx prisma generate`
4. Migration will run automatically when Railway deploys

Now:
- `patient.type` exists in database
- Can change patient type from Medical → MRI → Surgery
- GET /api/patients/[id] no longer crashes
- MRI-specific tasks auto-create when type changes to MRI

### Prevention Rule
**ALWAYS ensure database schema matches code expectations. When adding new field references in API routes, FIRST add the field to Prisma schema and run migration.**

**Checklist before referencing new fields:**
1. ✅ Add field to Prisma schema
2. ✅ Create and run migration
3. ✅ Regenerate Prisma client
4. ✅ Then add field references in API code
5. ✅ Check TypeScript compilation errors - they often reveal schema mismatches

**Never ignore TypeScript errors like:**
- "Property 'xyz' does not exist on type..."
- These are red flags that database schema doesn't match code

### Files Fixed
- `prisma/schema.prisma` - Added type field
- `prisma/migrations/20250116_add_patient_type_field/migration.sql` - Database migration
- API routes (`src/app/api/patients/route.ts`, `src/app/api/patients/[id]/route.ts`) - Already referenced patient.type

**Commit**: `620c14b` - "Add patient type field to database schema"

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
