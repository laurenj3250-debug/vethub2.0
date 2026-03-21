# Neurosurgery Certificate Tracker — Implementation Plan (v2)

**Date:** 2026-03-21
**Feature:** ACVIM Neurosurgery Certificate of Training progress tracker
**Location:** New "Certificate" tab in `/residency` page

## Context

The ACVIM Neurosurgery Certificate requires 6 items:
1. $500 application fee
2. ACVIM Neurology Board certification
3. Case log: 50 TL hemilaminectomies (≥25 primary) + 20 ventral slots (≥10 primary), all within 5 years
4. Case log: 12 special procedures (one of each), primary or assistant, all within 5 years
5. Advanced Techniques in Neurosurgery course attendance
6. 4-week clinical rotation with qualified supervisor

## Revision Notes (post-roast + mastermind)

Key changes from v1:
- **Tag-at-write replaces regex-at-read** — follows ACVS CERT pattern (industry standard for vet credential tracking)
- **`certificateCategories` is a string array** (not single string) — handles ACVIM double-count rule
- **"Needs Review" banner** for untagged cases
- **COMMON_PROCEDURES expanded** to cover all 12 special procedures (was 7/12)
- **Overall progress is binary per requirement** (no fractional "3.5/6")
- **Regex matchers demoted to suggestion logic** — auto-fill helper, not source of truth

## Data Strategy

**Pull from existing data — enhanced with explicit certificate tagging.**

The `ACVIMNeurosurgeryCase` table already stores every surgery with:
- `procedureName` (free text — "hemilaminectomy", "ventral slot", "craniotomy", etc.)
- `role` ("Primary" | "Assistant")
- `dateCompleted` (ISO date)
- `caseIdNumber`, `hours`, `notes`, `patientName`

**New field on existing model:** `certificateCategories String[] @default([])`

When Lauren logs a surgery, the form auto-suggests certificate categories based on the procedure name (ACVS CERT pattern). She confirms or overrides. The certificate tracker reads from this explicit tag, not from regex matching.

### New Model: `NeurosurgeryCertStatus`

One small model to track the non-case requirements (course, rotation, board cert status):

```prisma
model NeurosurgeryCertStatus {
  id                    String   @id @default("neurosurg_cert_status")

  // Requirement 2: Board certification
  boardCertified        Boolean  @default(false)
  boardCertDate         String?  // ISO date

  // Requirement 5: Course attendance
  courseCompleted        Boolean  @default(false)
  courseDate            String?  // ISO date
  courseType            String?  // "ACVIM" | "ECVN" (both accepted)

  // Requirement 6: Surgical rotation
  rotationWeeksCompleted Int     @default(0)  // 0-4
  rotationSupervisor    String?  // Name of supervisor
  rotationSupervisorType String? // "ACVS" | "ACVIM_Neurosurg" | "ECVN_Neurosurg"
  rotationDeclarationSigned Boolean @default(false)

  // Application tracking
  targetApplicationDate String?  // "March 15" or "October 15" next deadline
  applicationSubmitted  Boolean  @default(false)
  applicationDate       String?

  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt
}
```

## Certificate Categories (canonical list)

```typescript
// The 14 certificate-relevant procedure categories
export const CERT_CATEGORIES = {
  // Bread & butter (requirement 3)
  hemilaminectomy: 'TL Hemilaminectomy',
  ventral_slot: 'Ventral Slot',

  // Special procedures (requirement 4) — 12 total
  transfrontal_craniotomy: 'Transfrontal Craniotomy',
  lateral_craniotomy: 'Lateral Craniotomy / Craniectomy',
  foramen_magnum_decompression: 'Foramen Magnum Decompression',
  shunt_placement: 'Shunt Placement (Hydrocephalus)',
  atlantoaxial_stabilization: 'Atlantoaxial Stabilization',
  dorsal_cervical_decompression: 'Dorsal Cervical Decompression',
  cervical_distraction_stabilization: 'Cervical Distraction / Stabilization',
  dorsal_laminectomy_TL: 'Dorsal Laminectomy (TL Region)',
  vertebral_fracture_luxation: 'Vertebral Fracture / Luxation Repair',
  spinal_tumor_approach: 'Spinal Tumor Approach',
  lumbosacral_decompression: 'Lumbosacral Decompression',
  muscle_nerve_biopsy: 'Muscle / Nerve Biopsy',
} as const;

export type CertCategory = keyof typeof CERT_CATEGORIES;
```

## Auto-Suggest Logic (replaces regex-as-source-of-truth)

Regex matchers are now **suggestion helpers**, not the classification system. They auto-fill the certificate category dropdown when a procedure is selected.

```typescript
// Maps procedure dropdown values to suggested certificate categories
const CERT_CATEGORY_SUGGESTIONS: Record<string, CertCategory[]> = {
  'Hemilaminectomy': ['hemilaminectomy'],
  'Ventral Slot': ['ventral_slot'],
  'Transfrontal Craniotomy': ['transfrontal_craniotomy'],
  'Lateral Craniotomy': ['lateral_craniotomy'],
  'Lateral Craniectomy': ['lateral_craniotomy'],
  'Foramen Magnum Decompression': ['foramen_magnum_decompression'],
  'VP Shunt': ['shunt_placement'],
  'Atlantoaxial Stabilization': ['atlantoaxial_stabilization'],
  'Dorsal Cervical Laminectomy': ['dorsal_cervical_decompression'],
  'Cervical Distraction-Stabilization': ['cervical_distraction_stabilization'],
  'Dorsal Laminectomy (TL)': ['dorsal_laminectomy_TL'],
  'Vertebral Fracture-Luxation Repair': ['vertebral_fracture_luxation'],
  'Spinal Tumor Approach': ['spinal_tumor_approach', 'dorsal_laminectomy_TL'], // ACVIM allows double-count
  'Lumbosacral Decompression': ['lumbosacral_decompression'],
  'Muscle Biopsy': ['muscle_nerve_biopsy'],
  'Nerve Biopsy': ['muscle_nerve_biopsy'],
  'Peripheral Nerve Biopsy': ['muscle_nerve_biopsy'],
};

// Fuzzy fallback for free-text entries (suggestion only, not authoritative)
function suggestCertCategories(procedureName: string): CertCategory[] {
  // Exact match first
  if (CERT_CATEGORY_SUGGESTIONS[procedureName]) {
    return CERT_CATEGORY_SUGGESTIONS[procedureName];
  }
  // Fuzzy match as fallback suggestion
  const suggestions: CertCategory[] = [];
  const lower = procedureName.toLowerCase();
  if (/hemi/i.test(lower) && !/cervical/i.test(lower)) suggestions.push('hemilaminectomy');
  if (/ventral\s*slot/i.test(lower)) suggestions.push('ventral_slot');
  if (/transfrontal/i.test(lower)) suggestions.push('transfrontal_craniotomy');
  if (/lateral\s*(craniotomy|craniectomy)/i.test(lower)) suggestions.push('lateral_craniotomy');
  if (/foramen\s*magnum|FMD/i.test(lower)) suggestions.push('foramen_magnum_decompression');
  if (/shunt/i.test(lower)) suggestions.push('shunt_placement');
  if (/atlanto\s*axial|AA\s*stab/i.test(lower)) suggestions.push('atlantoaxial_stabilization');
  if (/dorsal\s*cervical/i.test(lower)) suggestions.push('dorsal_cervical_decompression');
  if (/cervical\s*(distraction|stabilization)/i.test(lower)) suggestions.push('cervical_distraction_stabilization');
  if (/dorsal\s*laminectomy/i.test(lower) && !/cervical/i.test(lower)) suggestions.push('dorsal_laminectomy_TL');
  if (/vertebral.*fracture|fracture.*luxation/i.test(lower)) suggestions.push('vertebral_fracture_luxation');
  if (/spinal\s*tumor/i.test(lower)) suggestions.push('spinal_tumor_approach');
  if (/lumbosacral|LS\s*decompression/i.test(lower)) suggestions.push('lumbosacral_decompression');
  if (/biopsy/i.test(lower) && /(muscle|nerve)/i.test(lower)) suggestions.push('muscle_nerve_biopsy');
  return suggestions;
}
```

## 5-Year Window Logic

```typescript
function isWithin5Years(dateCompleted: string): boolean {
  const caseDate = new Date(dateCompleted);
  const fiveYearsAgo = new Date();
  fiveYearsAgo.setFullYear(fiveYearsAgo.getFullYear() - 5);
  return caseDate >= fiveYearsAgo;
}

function getExpiryDate(dateCompleted: string): Date {
  const d = new Date(dateCompleted);
  d.setFullYear(d.getFullYear() + 5);
  return d;
}

// Warning levels
function getExpiryStatus(dateCompleted: string): 'valid' | 'expiring_soon' | 'expired' {
  const expiry = getExpiryDate(dateCompleted);
  const now = new Date();
  const monthsUntilExpiry = (expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24 * 30);
  if (monthsUntilExpiry <= 0) return 'expired';
  if (monthsUntilExpiry <= 6) return 'expiring_soon';
  return 'valid';
}
```

## Files to Create/Modify

### New Files

1. **`src/components/residency/CertificateTracker.tsx`** (~450 lines)
   - Main certificate tab component
   - Sections: Needs Review banner, Overall progress, Bread & Butter, Special Procedures, Other Requirements
   - Uses existing neo-pop design system

2. **`src/lib/certificate-logic.ts`** (~200 lines)
   - Certificate category constants and types
   - Auto-suggest logic (CERT_CATEGORY_SUGGESTIONS + fuzzy fallback)
   - 5-year window calculations
   - Progress computation from tagged case data
   - CertificateProgress interface

3. **`src/app/api/acvim/certificate-status/route.ts`** (~80 lines)
   - GET: fetch `NeurosurgeryCertStatus` (upsert singleton if not exists)
   - PUT: update non-case requirements (course, rotation, board cert)

### Modified Files

4. **`prisma/schema.prisma`**
   - Add `NeurosurgeryCertStatus` model
   - Add `certificateCategories String[] @default([])` to `ACVIMNeurosurgeryCase`

5. **`src/app/residency/page.tsx`**
   - Add `'certificate'` to `TabType` union and `VALID_TABS`
   - Add Certificate tab button (Award icon, gold/amber color)
   - Add `{activeTab === 'certificate' && <CertificateTracker />}` render block
   - Import `CertificateTracker` component

6. **`src/lib/residency-types.ts`**
   - Add `CertificateProgress` interface
   - Add `NeurosurgeryCertStatus` interface
   - Add `CertCategory` type

7. **`src/lib/residency-milestones.ts`**
   - Expand `COMMON_PROCEDURES` to include all 12 special procedures (currently 7/12 = 58%, target 100%)

8. **`src/components/residency/SurgeryQuickForm.tsx`**
   - Add certificate category multi-select (auto-suggested from procedure name)
   - Categories are optional — Lauren can skip if the case isn't cert-relevant

9. **`src/app/api/acvim/cases/route.ts`**
   - Handle `certificateCategories` in POST/PUT
   - Add `?all=true` param to fetch all cases (no year filter) for certificate tab

## UI Design

### Certificate Tab Layout

```
┌─────────────────────────────────────────────────────┐
│  ⚠ 5 surgeries not tagged for certificate           │
│  These cases aren't counted. Review and tag them.   │
│  [Review Cases →]                                    │
├─────────────────────────────────────────────────────┤
│  NEUROSURGERY CERTIFICATE              2 / 6 met    │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━              │
│                                                      │
│  ┌──────────────────┐  ┌──────────────────┐         │
│  │  HEMILAMINECTOMIES│  │  VENTRAL SLOTS   │         │
│  │  ▓▓▓▓▓▓▓▓░░ 34/50│  │  ▓▓▓▓▓▓▓░░░ 15/20│         │
│  │  Primary: 20/25  │  │  Primary: 8/10   │         │
│  │  ⚠ 3 expiring    │  │  All valid       │         │
│  │  within 6 months │  │                  │         │
│  └──────────────────┘  └──────────────────┘         │
│                                                      │
│  SPECIAL PROCEDURES                    8/12          │
│  ┌──────────────────────────────────────────┐       │
│  │  Transfrontal craniotomy    2024-09-15   │       │
│  │  Lateral craniotomy         2025-01-20   │       │
│  │  Foramen magnum decomp.     2024-11-03   │       │
│  │  Shunt placement            -- needed -- │       │
│  │  AA stabilization           2025-06-12   │       │
│  │  ...                                     │       │
│  └──────────────────────────────────────────┘       │
│                                                      │
│  OTHER REQUIREMENTS                                  │
│  ┌──────────────────────────────────────────┐       │
│  │  Board Certified              [Toggle]   │       │
│  │  Advanced Neurosurgery Course [Toggle]   │       │
│  │  Surgical Rotation           2/4 weeks   │       │
│  └──────────────────────────────────────────┘       │
│                                                      │
│  NEXT DEADLINE: October 15, 2026                     │
│  Submit to Sarah.Z@ACVIM.org                         │
└─────────────────────────────────────────────────────┘
```

### Design Tokens

- **Overall progress bar:** NEO_POP.colors.mint (green) fill
- **Needs Review banner:** NEO_POP.colors.yellow background with 4px amber left border (matches existing "No Surgery Patients" pattern in residency/page.tsx:792)
- **Expiry warning:** NEO_POP.colors.yellow background with amber border
- **Expired:** NEO_POP.colors.pink background, strikethrough text
- **Completed items:** green check, green-100 background
- **Missing items:** gray-200 background, dashed border
- **Cards:** `neoCard` style (2px black border, 4px shadow)
- **Buttons/toggles:** `neoButton` style

### Progress Computation

```typescript
interface CertificateProgress {
  // Overall — binary per requirement, no fractions
  requirementsMet: number;         // 0-6

  // Bread & butter (within 5-year window)
  hemis: {
    total: number;                 // valid tagged cases
    primary: number;
    target: 50;
    primaryTarget: 25;
    met: boolean;                  // total >= 50 AND primary >= 25
    expiringSoon: number;          // within 6 months
    expired: number;
  };
  ventralSlots: {
    total: number;
    primary: number;
    target: 20;
    primaryTarget: 10;
    met: boolean;
    expiringSoon: number;
    expired: number;
  };

  // Special procedures
  specialProcedures: Array<{
    id: CertCategory;              // e.g. 'transfrontal_craniotomy'
    name: string;                  // Display name
    completed: boolean;
    caseDate?: string;
    caseId?: string;
    caseName?: string;             // Patient name for reference
    role?: string;
    expiryStatus?: 'valid' | 'expiring_soon' | 'expired';
  }>;
  specialProceduresMet: boolean;   // all 12 completed

  // Other requirements
  boardCertified: boolean;
  courseCompleted: boolean;
  rotationWeeks: number;           // 0-4
  rotationComplete: boolean;       // weeks >= 4 AND declaration signed

  // Untagged cases (for "Needs Review" banner)
  untaggedCount: number;
  untaggedCases: Array<{ id: string; procedureName: string; dateCompleted: string }>;
}

// Overall progress — binary, no fractions
function computeRequirementsMet(p: CertificateProgress): number {
  let met = 0;
  if (p.hemis.met) met++;
  if (p.ventralSlots.met) met++;
  if (p.specialProceduresMet) met++;
  if (p.boardCertified) met++;
  if (p.courseCompleted) met++;
  if (p.rotationComplete) met++;
  return met;
}
```

## SurgeryQuickForm Enhancement

Add a certificate category selector to the existing form. Behavior:

1. Lauren selects procedure from dropdown (or types custom)
2. Certificate categories auto-populate based on `suggestCertCategories()`
3. She can confirm, modify, or clear the suggestion
4. Multi-select enabled (for double-count cases like spinal tumor approach)
5. Categories are optional — "None" / empty is valid for non-cert cases

```tsx
// In SurgeryQuickForm, after procedure selection:
<div>
  <Label className="text-xs font-bold">Certificate Category (optional)</Label>
  <MultiSelect
    options={Object.entries(CERT_CATEGORIES).map(([key, label]) => ({ value: key, label }))}
    selected={certCategories}
    onChange={setCertCategories}
    placeholder="Not counted toward certificate"
  />
  <p className="text-xs text-gray-400 mt-1">Auto-suggested from procedure name</p>
</div>
```

## API Design

### `GET /api/acvim/certificate-status`

Returns the `NeurosurgeryCertStatus` record (course, rotation, board cert toggles). Upserts singleton on first access.

### `PUT /api/acvim/certificate-status`

Updates any fields on the status record. Body: partial `NeurosurgeryCertStatus`.

### `GET /api/acvim/cases?all=true`

Fetches ALL cases across all years (no year filter) for certificate progress computation. Certificate tab uses this.

### Certificate progress is computed client-side

The CertificateTracker component fetches all cases + cert status, then runs `computeCertificateProgress()` in `certificate-logic.ts`. Pure function, testable, transparent.

## Implementation Order

1. Schema changes: add `certificateCategories` to `ACVIMNeurosurgeryCase` + add `NeurosurgeryCertStatus` model + migration
2. Update `COMMON_PROCEDURES` in `residency-milestones.ts` (12/12 special procedures)
3. Create `certificate-logic.ts` (types, constants, auto-suggest, progress computation)
4. Update `SurgeryQuickForm.tsx` with certificate category multi-select
5. Update `acvim/cases/route.ts` to handle `certificateCategories` + `?all=true`
6. Create `acvim/certificate-status/route.ts` API
7. Create `CertificateTracker.tsx` component
8. Wire into residency page (add tab)
9. Test with existing case data

## Edge Cases

- **No cases yet:** Show empty state with "Start logging surgeries to track progress"
- **Existing cases without tags:** Show in "Needs Review" banner with one-click tagging UI
- **Multiple cases matching same special procedure:** Use most recent valid (within 5-year window) case
- **All cases expired:** Show warning, all progress bars reset to 0/N
- **Board cert toggle:** Cannot apply without it, but can track other requirements during residency
- **Course & rotation:** Simple boolean/counter toggles since these don't come from case logs
- **Double-count cases:** `certificateCategories` is an array — one case can count in multiple categories (per ACVIM rules)
- **Course procedures:** Cases logged at the Advanced Neurosurgery Course can be tagged to special procedure categories

## Not In Scope (v1)

- Application form generation/export
- $500 fee payment tracking
- Audit preparation tools (but case log IS verifiable — random auditing support is implicit)
- Integration with ACVIM systems
