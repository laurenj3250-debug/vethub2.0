# VetHub: Rounding Templates & Surgery Patient Linking

**Design Document**

| Field | Value |
|-------|-------|
| **Author** | Claude Code |
| **Created** | 2026-01-07 |
| **Status** | Ready for Review |
| **Reviewers** | @laurenjohnston |
| **Last Updated** | 2026-01-07 |

---

## 1. Overview

### 1.1 Problem Statement

Two usability issues are blocking effective clinical workflows:

1. **Rounding Templates Undiscoverable**: Templates exist but trigger is a 14px gray icon that users cannot find
2. **Surgery Logging Incomplete**: Quick-add surgeries have no patient linking; data fragmented across two models

### 1.2 Goals

| Goal | Success Metric |
|------|----------------|
| Templates discoverable | User can apply template within 2 clicks, no hunting |
| Surgery patient linking | 100% of new surgeries have patientId |
| Unified data model | Single source of truth for surgery-patient relationships |
| Zero data loss | Existing surgeries unaffected by migration |

### 1.3 Non-Goals

- Merging `Surgery` and `ACVIMNeurosurgeryCase` models (different purposes)
- Backfilling patientId for historical surgeries (optional enhancement)
- Template customization UI (future work)

---

## 2. Background

### 2.1 Current Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    ROUNDING TEMPLATES                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  src/data/rounding-templates.ts                                │
│  ├── 7 templates (seizures, TL myelopathy, etc.)              │
│  ├── 3 categories (pre-op, post-op, seizures)                 │
│  └── getTemplateCategories() → structured data                 │
│                                                                 │
│  src/components/RoundingSheet.tsx                              │
│  ├── TemplateSelector component (lines 399-463)               │
│  ├── 14px FileText icon trigger ← PROBLEM: INVISIBLE          │
│  ├── absolute positioned dropdown                              │
│  └── Parent has overflow-hidden ← PROBLEM: CLIPS DROPDOWN     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                    SURGERY DATA MODEL                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────────┐          ┌──────────────────────────┐    │
│  │ Surgery          │          │ ACVIMNeurosurgeryCase    │    │
│  ├──────────────────┤          ├──────────────────────────┤    │
│  │ id               │          │ id                       │    │
│  │ dailyEntryId  ●──┼──→       │ procedureName            │    │
│  │ procedureName    │          │ dateCompleted            │    │
│  │ participation    │          │ caseIdNumber ← WRONG     │    │
│  │ patientName?     │          │ role                     │    │
│  │ ❌ NO patientId  │          │ hours                    │    │
│  └──────────────────┘          │ patientId? ✓             │    │
│           │                    │ patientName?             │    │
│           │                    └──────────────────────────┘    │
│           │                               ▲                    │
│           │    DUAL WRITE                 │                    │
│           └───────────────────────────────┘                    │
│                                                                 │
│  POST /api/residency/surgery creates BOTH records              │
│  but only Surgery is displayed in ResidencyTracker             │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                    UI ENTRY POINTS                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. ResidencyTracker (floating widget)                         │
│     └── Quick Add Surgery form                                 │
│         └── ❌ NO patient selection                            │
│                                                                 │
│  2. SurgeryTracker component                                   │
│     └── Add Surgery form                                       │
│         └── ❌ Text input for patientName only                 │
│                                                                 │
│  3. /residency page (Neurosurgery Case Log)                    │
│     └── Full form with patient dropdown                        │
│         └── ✓ Has patient selection (ACVIMNeurosurgeryCase)    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 Identified Gaps (Self-Roast Analysis)

| # | Gap | Severity | Impact |
|---|-----|----------|--------|
| 1 | Template dropdown clipped by `overflow-hidden` parent | HIGH | Dropdown invisible |
| 2 | Surgery.patientId missing from Prisma schema | HIGH | No patient relation |
| 3 | Patient model missing reverse `surgeries` relation | HIGH | Prisma requires both |
| 4 | No hook for filtered patient list | MEDIUM | Extra dev work |
| 5 | API dual-writes but ACVIMNeurosurgeryCase uses patientName as caseIdNumber | HIGH | Wrong data |
| 6 | Three surgery forms need updating, not one | HIGH | Inconsistent UX |
| 7 | Race condition if todayEntry loading | MEDIUM | Potential errors |
| 8 | ResidencyTracker doesn't fetch patients | HIGH | Cannot show selector |
| 9 | No migration rollback plan | MEDIUM | Risk to prod data |

---

## 3. Design

### 3.1 Template Visibility Solution

#### 3.1.1 Current vs Proposed

```
CURRENT (invisible):
┌─────────────────────────────────────────┐
│ [📄]  Patient Name     Signalment  ...  │  ← 14px gray icon, no label
└─────────────────────────────────────────┘

PROPOSED (discoverable):
┌─────────────────────────────────────────┐
│ [📋 Template ▾]  Patient Name  ...      │  ← Labeled button, purple accent
└─────────────────────────────────────────┘
```

#### 3.1.2 Component Changes

**TemplateSelector Redesign:**

```typescript
// Before: Subtle icon
<button className="p-1 rounded hover:bg-gray-100">
  <FileText size={14} className="text-gray-500" />
</button>

// After: Prominent button with label
<button
  className="flex items-center gap-1.5 px-2 py-1 rounded-lg
             bg-purple-50 hover:bg-purple-100 border border-purple-200
             text-purple-700 text-xs font-medium transition-all"
  style={{ minHeight: '32px' }}  // Touch target
>
  <FileText size={14} />
  <span className="hidden sm:inline">Template</span>
  <ChevronDown size={12} />
</button>
```

**Portal Pattern for Dropdown:**

```typescript
// Use createPortal to escape overflow-hidden parent
const popoverContent = (
  <div
    ref={popoverRef}
    className="fixed z-[99999] bg-white rounded-lg shadow-xl"
    style={{
      top: position.top,
      left: position.left,
      transform: 'translateY(4px)',
    }}
  >
    {/* Template categories and options */}
  </div>
);

return (
  <>
    <button ref={buttonRef} onClick={() => setIsOpen(!isOpen)}>...</button>
    {isOpen && typeof document !== 'undefined' &&
      createPortal(popoverContent, document.body)}
  </>
);
```

#### 3.1.3 Keyboard Shortcut

| Shortcut | Action | Scope |
|----------|--------|-------|
| `Ctrl+T` / `Cmd+T` | Open template menu | When any rounding field focused |
| `↑` / `↓` | Navigate templates | When menu open |
| `Enter` | Apply selected template | When menu open |
| `Escape` | Close menu | When menu open |

---

### 3.2 Surgery Patient Linking Solution

#### 3.2.1 Database Schema Changes

```prisma
// prisma/schema.prisma

model Patient {
  id           Int       @id @default(autoincrement())
  status       String
  type         String?   @default("Medical")
  demographics Json
  // ... existing fields ...

  // NEW: Reverse relation for surgeries
  surgeries    Surgery[]

  // ... rest of model ...
}

model Surgery {
  id              String     @id @default(cuid())
  dailyEntryId    String
  dailyEntry      DailyEntry @relation(fields: [dailyEntryId], references: [id], onDelete: Cascade)

  procedureName   String
  participation   String     // "S" | "O" | "C" | "D" | "K"

  // EXISTING: Keep for backwards compat and display
  patientName     String?

  // NEW: Proper patient relation
  patientId       Int?
  patient         Patient?   @relation(fields: [patientId], references: [id], onDelete: SetNull)

  notes           String?
  createdAt       DateTime   @default(now())

  @@index([dailyEntryId])
  @@index([participation])
  @@index([patientId])        // NEW: Index for patient lookups
}
```

#### 3.2.2 Migration Strategy

**Phase 1: Schema Migration (Zero Downtime)**

```sql
-- Migration: add_patient_id_to_surgery

-- Step 1: Add nullable column (no data change)
ALTER TABLE "Surgery" ADD COLUMN "patientId" INTEGER;

-- Step 2: Add foreign key constraint with ON DELETE SET NULL
ALTER TABLE "Surgery"
  ADD CONSTRAINT "Surgery_patientId_fkey"
  FOREIGN KEY ("patientId")
  REFERENCES "Patient"("id")
  ON DELETE SET NULL
  ON UPDATE CASCADE;

-- Step 3: Create index for query performance
CREATE INDEX "Surgery_patientId_idx" ON "Surgery"("patientId");
```

**Phase 2: Backfill (Optional, Offline)**

```sql
-- Attempt to match existing surgeries to patients by name
-- Run during low-traffic window, log unmatched for manual review

UPDATE "Surgery" s
SET "patientId" = p.id
FROM "Patient" p,
     jsonb_extract_path_text(p.demographics::jsonb, 'name') as pname
WHERE LOWER(TRIM(s."patientName")) = LOWER(TRIM(pname))
  AND s."patientId" IS NULL
  AND s."patientName" IS NOT NULL;

-- Log unmatched for review
SELECT id, "patientName", "procedureName", "createdAt"
FROM "Surgery"
WHERE "patientId" IS NULL AND "patientName" IS NOT NULL;
```

**Rollback Plan:**

```sql
-- If migration fails, rollback:
ALTER TABLE "Surgery" DROP CONSTRAINT IF EXISTS "Surgery_patientId_fkey";
DROP INDEX IF EXISTS "Surgery_patientId_idx";
ALTER TABLE "Surgery" DROP COLUMN IF EXISTS "patientId";
```

#### 3.2.3 API Changes

**Updated Zod Schema:**

```typescript
// src/app/api/residency/surgery/route.ts

const surgerySchema = z.object({
  dailyEntryId: z.string(),
  procedureName: z.string().min(1, 'Procedure name is required'),
  participation: z.enum(['S', 'O', 'C', 'D', 'K']),

  // NEW: Optional patient ID (preferred)
  patientId: z.number().int().positive().optional(),

  // KEEP: Backwards compat, used if patientId not provided
  patientName: z.string().optional(),

  notes: z.string().optional(),
});
```

**Updated POST Handler:**

```typescript
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = surgerySchema.parse(body);

    // If patientId provided, look up patient details
    let patientName = validated.patientName;
    let patientInfo = '';
    let caseIdNumber = 'N/A';

    if (validated.patientId) {
      const patient = await prisma.patient.findUnique({
        where: { id: validated.patientId },
      });

      if (patient) {
        const demo = patient.demographics as { name?: string; age?: string; breed?: string; species?: string };
        patientName = demo.name || patientName;
        patientInfo = `${demo.age || ''} ${demo.breed || demo.species || ''}`.trim();
        caseIdNumber = `VH-${patient.id}`; // Proper case ID format
      }
    }

    const result = await prisma.$transaction(async (tx) => {
      // 1. Create Surgery record
      const surgery = await tx.surgery.create({
        data: {
          dailyEntryId: validated.dailyEntryId,
          procedureName: validated.procedureName,
          participation: validated.participation,
          patientId: validated.patientId,      // NEW
          patientName: patientName,
          notes: validated.notes,
        },
        include: { dailyEntry: true },
      });

      // 2. Create ACVIM case (unless skipped)
      if (!body.skipAcvim) {
        await tx.aCVIMNeurosurgeryCase.create({
          data: {
            procedureName: validated.procedureName,
            dateCompleted: surgery.dailyEntry.date,
            caseIdNumber: caseIdNumber,         // FIXED: Use proper case ID
            role: validated.participation === 'S' ? 'Primary' : 'Assistant',
            hours: 1.0,
            residencyYear: await getResidencyYear(),
            patientId: validated.patientId,     // NEW
            patientName: patientName,
            patientInfo: patientInfo,           // NEW
            notes: validated.notes,
          },
        });
      }

      return surgery;
    });

    return NextResponse.json(result);
  } catch (error) {
    // ... error handling
  }
}
```

#### 3.2.4 New Hook: useSurgeryPatients

```typescript
// src/hooks/useSurgeryPatients.ts

import { useQuery } from '@tanstack/react-query';

interface SurgeryPatient {
  id: number;
  name: string;
  species: string;
  breed?: string;
  type: string;
}

export function useSurgeryPatients() {
  return useQuery<SurgeryPatient[]>({
    queryKey: ['surgery-patients'],
    queryFn: async () => {
      // Fetch active patients, prioritize Surgery type
      const res = await fetch('/api/patients?status=Active');
      if (!res.ok) throw new Error('Failed to fetch patients');

      const patients = await res.json();

      // Transform and sort: Surgery type first, then by name
      return patients
        .map((p: any) => ({
          id: p.id,
          name: p.demographics?.name || `Patient ${p.id}`,
          species: p.demographics?.species || 'Unknown',
          breed: p.demographics?.breed,
          type: p.type || 'Medical',
        }))
        .sort((a: SurgeryPatient, b: SurgeryPatient) => {
          // Surgery type first
          if (a.type === 'Surgery' && b.type !== 'Surgery') return -1;
          if (b.type === 'Surgery' && a.type !== 'Surgery') return 1;
          // Then alphabetical
          return a.name.localeCompare(b.name);
        });
    },
    staleTime: 5 * 60 * 1000,  // Cache 5 minutes
    gcTime: 10 * 60 * 1000,    // Keep in memory 10 minutes
  });
}
```

#### 3.2.5 PatientQuickSelect Component

```typescript
// src/components/PatientQuickSelect.tsx

'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Search, ChevronDown, X, User } from 'lucide-react';
import { useSurgeryPatients } from '@/hooks/useSurgeryPatients';
import { cn } from '@/lib/utils';

interface PatientQuickSelectProps {
  value: number | null;
  onChange: (patientId: number | null, patientName?: string) => void;
  placeholder?: string;
  className?: string;
}

export function PatientQuickSelect({
  value,
  onChange,
  placeholder = 'Select patient...',
  className
}: PatientQuickSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [position, setPosition] = useState({ top: 0, left: 0, width: 0 });

  const buttonRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: patients = [], isLoading } = useSurgeryPatients();

  // Find selected patient
  const selectedPatient = useMemo(
    () => patients.find(p => p.id === value),
    [patients, value]
  );

  // Filter patients by search
  const filteredPatients = useMemo(() => {
    if (!search) return patients.slice(0, 20); // Show first 20 if no search

    const lower = search.toLowerCase();
    return patients.filter(p =>
      p.name.toLowerCase().includes(lower) ||
      p.species.toLowerCase().includes(lower) ||
      p.breed?.toLowerCase().includes(lower)
    ).slice(0, 20);
  }, [patients, search]);

  // Update position when opening
  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setPosition({
        top: rect.bottom + 4,
        left: rect.left,
        width: Math.max(rect.width, 280),
      });
      // Focus search input
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;

    const handleClick = (e: MouseEvent) => {
      if (!buttonRef.current?.contains(e.target as Node)) {
        setIsOpen(false);
        setSearch('');
      }
    };

    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [isOpen]);

  const handleSelect = (patient: typeof patients[0]) => {
    onChange(patient.id, patient.name);
    setIsOpen(false);
    setSearch('');
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(null);
  };

  const dropdown = (
    <div
      className="fixed z-[99999] bg-white rounded-lg shadow-xl border-2 border-black overflow-hidden"
      style={{
        top: position.top,
        left: position.left,
        width: position.width,
        maxHeight: '300px',
      }}
    >
      {/* Search input */}
      <div className="p-2 border-b border-gray-200 bg-gray-50">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            ref={inputRef}
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search patients..."
            className="w-full pl-8 pr-3 py-1.5 text-sm rounded border border-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>
      </div>

      {/* Patient list */}
      <div className="max-h-[220px] overflow-y-auto">
        {isLoading ? (
          <div className="p-4 text-center text-sm text-gray-500">Loading...</div>
        ) : filteredPatients.length === 0 ? (
          <div className="p-4 text-center text-sm text-gray-500">
            {search ? 'No patients found' : 'No active patients'}
          </div>
        ) : (
          filteredPatients.map((patient) => (
            <button
              key={patient.id}
              onClick={() => handleSelect(patient)}
              className={cn(
                'w-full px-3 py-2 text-left hover:bg-purple-50 transition-colors flex items-center gap-2',
                patient.id === value && 'bg-purple-100'
              )}
            >
              <div className={cn(
                'w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold',
                patient.type === 'Surgery' ? 'bg-red-100 text-red-700' :
                patient.type === 'MRI' ? 'bg-purple-100 text-purple-700' :
                'bg-blue-100 text-blue-700'
              )}>
                {patient.type.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm text-gray-900 truncate">
                  {patient.name}
                </div>
                <div className="text-xs text-gray-500 truncate">
                  {patient.species} {patient.breed && `• ${patient.breed}`}
                </div>
              </div>
            </button>
          ))
        )}
      </div>

      {/* Optional: Unknown patient option */}
      <div className="p-2 border-t border-gray-200 bg-gray-50">
        <button
          onClick={() => { onChange(null); setIsOpen(false); }}
          className="w-full text-left text-xs text-gray-500 hover:text-gray-700 py-1"
        >
          Continue without patient link
        </button>
      </div>
    </div>
  );

  return (
    <>
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'w-full flex items-center justify-between gap-2 px-3 py-2 text-left',
          'rounded-lg border-2 border-gray-300 bg-white',
          'hover:border-purple-400 transition-colors',
          'text-sm',
          className
        )}
      >
        {selectedPatient ? (
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <User className="w-4 h-4 text-purple-500 flex-shrink-0" />
            <span className="font-medium truncate">{selectedPatient.name}</span>
            <button
              onClick={handleClear}
              className="p-0.5 rounded hover:bg-gray-200"
            >
              <X className="w-3 h-3 text-gray-500" />
            </button>
          </div>
        ) : (
          <span className="text-gray-500">{placeholder}</span>
        )}
        <ChevronDown className={cn(
          'w-4 h-4 text-gray-400 transition-transform',
          isOpen && 'rotate-180'
        )} />
      </button>

      {isOpen && typeof document !== 'undefined' &&
        createPortal(dropdown, document.body)}
    </>
  );
}
```

#### 3.2.6 ResidencyTracker Integration

```typescript
// src/components/dashboard/ResidencyTracker.tsx (relevant changes)

import { PatientQuickSelect } from '@/components/PatientQuickSelect';

// Add state
const [surgeryPatientId, setSurgeryPatientId] = useState<number | null>(null);
const [surgeryPatientName, setSurgeryPatientName] = useState<string>('');

// Update handler
const handleAddSurgery = useCallback(async () => {
  if (!surgeryProcedure || !todayEntry?.id) return;

  await addSurgery({
    dailyEntryId: todayEntry.id,
    procedureName: surgeryProcedure,
    participation: surgeryRole,
    patientId: surgeryPatientId || undefined,     // NEW
    patientName: surgeryPatientName || undefined, // Auto-populated
  });

  setSurgeryProcedure('');
  setSurgeryPatientId(null);      // Reset
  setSurgeryPatientName('');      // Reset
  setShowSurgeryForm(false);
}, [surgeryProcedure, surgeryRole, surgeryPatientId, surgeryPatientName, todayEntry?.id, addSurgery]);

// In JSX, add patient selector FIRST in form:
{showSurgeryForm && (
  <div className="space-y-2 p-2 bg-slate-50 dark:bg-slate-800 rounded-lg">
    {/* NEW: Patient selector */}
    <PatientQuickSelect
      value={surgeryPatientId}
      onChange={(id, name) => {
        setSurgeryPatientId(id);
        setSurgeryPatientName(name || '');
      }}
      placeholder="🔍 Search patient..."
    />

    {/* Existing: Procedure dropdown */}
    <select ... />

    {/* Existing: Role buttons */}
    <div className="flex gap-1">...</div>

    {/* Existing: Add button */}
    <button ... />
  </div>
)}
```

---

## 4. Implementation Plan

### 4.1 Phase 1: Template Visibility (Low Risk)

| Step | Task | Files | Est. |
|------|------|-------|------|
| 1.1 | Redesign TemplateSelector button | `RoundingSheet.tsx` | 20 min |
| 1.2 | Implement Portal pattern for dropdown | `RoundingSheet.tsx` | 30 min |
| 1.3 | Add position calculation + scroll close | `RoundingSheet.tsx` | 15 min |
| 1.4 | Add keyboard shortcut (Ctrl+T) | `RoundingSheet.tsx` | 15 min |
| 1.5 | Test on mobile + desktop | Manual | 10 min |
| **Total** | | | **1.5 hrs** |

**Verification:**
```bash
npm run build && npm run dev
# Visual test: Navigate to /rounding, verify template button visible
# Click test: Apply template to patient row
# Keyboard test: Focus field, press Ctrl+T
```

### 4.2 Phase 2: Database Migration (Medium Risk)

| Step | Task | Files | Est. |
|------|------|-------|------|
| 2.1 | Create migration file | `prisma/migrations/` | 10 min |
| 2.2 | Update Prisma schema | `schema.prisma` | 10 min |
| 2.3 | Run migration locally | Terminal | 5 min |
| 2.4 | Test with existing data | Manual | 10 min |
| 2.5 | Deploy to Railway | Railway CLI | 10 min |
| **Total** | | | **45 min** |

**Verification:**
```bash
npx prisma migrate dev --name add_patient_id_to_surgery
npx prisma generate
# Check: SELECT * FROM "Surgery" LIMIT 5; -- patientId column exists
```

**Rollback:**
```bash
npx prisma migrate resolve --rolled-back add_patient_id_to_surgery
```

### 4.3 Phase 3: API Updates (Medium Risk)

| Step | Task | Files | Est. |
|------|------|-------|------|
| 3.1 | Update Zod schema | `api/residency/surgery/route.ts` | 10 min |
| 3.2 | Add patient lookup logic | `api/residency/surgery/route.ts` | 20 min |
| 3.3 | Fix caseIdNumber format | `api/residency/surgery/route.ts` | 10 min |
| 3.4 | Update both create calls | `api/residency/surgery/route.ts` | 15 min |
| 3.5 | Add error handling for missing patient | `api/residency/surgery/route.ts` | 10 min |
| **Total** | | | **1 hr** |

**Verification:**
```bash
curl -X POST http://localhost:3000/api/residency/surgery \
  -H "Content-Type: application/json" \
  -d '{"dailyEntryId":"...","procedureName":"Hemilaminectomy","participation":"S","patientId":123}'
# Check: Both Surgery and ACVIMNeurosurgeryCase created with patientId
```

### 4.4 Phase 4: Hook & Component (Medium Risk)

| Step | Task | Files | Est. |
|------|------|-------|------|
| 4.1 | Create useSurgeryPatients hook | `hooks/useSurgeryPatients.ts` | 20 min |
| 4.2 | Create PatientQuickSelect component | `components/PatientQuickSelect.tsx` | 45 min |
| 4.3 | Add Portal + positioning logic | `components/PatientQuickSelect.tsx` | 20 min |
| 4.4 | Add search/filter functionality | `components/PatientQuickSelect.tsx` | 15 min |
| **Total** | | | **1.5 hrs** |

**Verification:**
```typescript
// In browser console:
// Check hook returns data
const patients = useSurgeryPatients();
console.log(patients.data?.length); // Should be > 0
```

### 4.5 Phase 5: UI Integration (Medium Risk)

| Step | Task | Files | Est. |
|------|------|-------|------|
| 5.1 | Add PatientQuickSelect to ResidencyTracker | `dashboard/ResidencyTracker.tsx` | 30 min |
| 5.2 | Update useAddSurgery hook signature | `hooks/useResidencyStats.ts` | 15 min |
| 5.3 | Add PatientQuickSelect to SurgeryTracker | `residency/SurgeryTracker.tsx` | 30 min |
| 5.4 | Test all three entry points | Manual | 30 min |
| 5.5 | Fix any edge cases | Various | 30 min |
| **Total** | | | **2 hrs** |

**Verification:**
- [ ] ResidencyTracker quick add shows patient selector
- [ ] SurgeryTracker shows patient selector
- [ ] /residency full form still works
- [ ] Surgery saved with patientId
- [ ] Surgery list shows patient name
- [ ] ACVIMNeurosurgeryCase has correct caseIdNumber

---

## 5. Testing Plan

### 5.1 Unit Tests

```typescript
// __tests__/surgery-api.test.ts

describe('POST /api/residency/surgery', () => {
  it('creates surgery with patientId', async () => {
    const res = await POST({
      dailyEntryId: 'test-entry',
      procedureName: 'Hemilaminectomy',
      participation: 'S',
      patientId: 123,
    });

    expect(res.patientId).toBe(123);
    expect(res.patientName).toBeDefined();
  });

  it('creates surgery without patientId (backwards compat)', async () => {
    const res = await POST({
      dailyEntryId: 'test-entry',
      procedureName: 'Ventral Slot',
      participation: 'O',
      patientName: 'Max',
    });

    expect(res.patientId).toBeNull();
    expect(res.patientName).toBe('Max');
  });

  it('looks up patient info when patientId provided', async () => {
    // Create test patient first
    const patient = await createPatient({ name: 'Bella', breed: 'Poodle' });

    const res = await POST({
      dailyEntryId: 'test-entry',
      procedureName: 'Craniotomy',
      participation: 'S',
      patientId: patient.id,
    });

    expect(res.patientName).toBe('Bella');
  });
});
```

### 5.2 E2E Tests

```typescript
// tests/surgery-patient-linking.spec.ts

test('surgery quick add includes patient', async ({ page }) => {
  await page.goto('/');

  // Open ResidencyTracker
  await page.hover('[data-testid="residency-tracker"]');

  // Click Quick Add
  await page.click('text=Quick Add');

  // Select patient
  await page.click('[data-testid="patient-selector"]');
  await page.fill('[data-testid="patient-search"]', 'Bella');
  await page.click('text=Bella');

  // Select procedure
  await page.selectOption('[data-testid="procedure-select"]', 'Hemilaminectomy');

  // Select role
  await page.click('button:has-text("S")');

  // Submit
  await page.click('text=Add Surgery');

  // Verify surgery added with patient
  await expect(page.locator('text=Hemilaminectomy')).toBeVisible();
  await expect(page.locator('text=Bella')).toBeVisible();
});
```

---

## 6. Rollback Plan

### 6.1 Template Changes
- Revert `RoundingSheet.tsx` to previous commit
- No data changes, instant rollback

### 6.2 Surgery Schema Changes

```sql
-- Emergency rollback script
BEGIN;

-- Remove foreign key
ALTER TABLE "Surgery" DROP CONSTRAINT IF EXISTS "Surgery_patientId_fkey";

-- Drop index
DROP INDEX IF EXISTS "Surgery_patientId_idx";

-- Drop column (DATA LOSS WARNING: patientId values will be lost)
ALTER TABLE "Surgery" DROP COLUMN IF EXISTS "patientId";

COMMIT;
```

### 6.3 API Changes
- Deploy previous API version
- New surgeries will fail to set patientId (graceful degradation)
- Existing surgeries unaffected

---

## 7. Monitoring & Alerts

### 7.1 Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Template usage | > 10 applies/day | Log template applies |
| Surgery patient link rate | > 90% | `SELECT COUNT(patientId IS NOT NULL) / COUNT(*) FROM Surgery` |
| API error rate | < 0.1% | Railway logs |

### 7.2 Alerts

```sql
-- Alert: High rate of surgeries without patient
SELECT COUNT(*) as unlinked_count
FROM "Surgery"
WHERE "patientId" IS NULL
  AND "createdAt" > NOW() - INTERVAL '24 hours';
-- Alert if > 50% unlinked
```

---

## 8. Timeline

| Phase | Start | Duration | Dependencies |
|-------|-------|----------|--------------|
| Phase 1: Templates | Day 1 | 1.5 hrs | None |
| Phase 2: Migration | Day 1 | 45 min | None |
| Phase 3: API | Day 1 | 1 hr | Phase 2 |
| Phase 4: Components | Day 1 | 1.5 hrs | Phase 3 |
| Phase 5: Integration | Day 1 | 2 hrs | Phase 4 |
| Testing & Polish | Day 1 | 1 hr | Phase 5 |
| **Total** | | **~8 hrs** | |

---

## 9. Open Questions

| # | Question | Decision Needed By | Default |
|---|----------|-------------------|---------|
| 1 | Should patient be REQUIRED for new surgeries? | Before Phase 3 | No (optional) |
| 2 | Include "Create new patient" in selector? | Before Phase 4 | No (link to existing) |
| 3 | Backfill existing surgeries by name match? | After deploy | Manual review |
| 4 | Add keyboard shortcut for patient selector? | Phase 4 | No (touch friendly) |

---

## 10. Appendix

### A. Affected Files Summary

```
src/
├── app/
│   └── api/
│       └── residency/
│           └── surgery/
│               └── route.ts        # API changes
├── components/
│   ├── dashboard/
│   │   └── ResidencyTracker.tsx    # Quick add integration
│   ├── residency/
│   │   └── SurgeryTracker.tsx      # Full form integration
│   ├── RoundingSheet.tsx           # Template visibility
│   └── PatientQuickSelect.tsx      # NEW component
├── hooks/
│   ├── useResidencyStats.ts        # Type updates
│   └── useSurgeryPatients.ts       # NEW hook
└── lib/
    └── prisma.ts                   # No changes

prisma/
├── schema.prisma                   # Schema changes
└── migrations/
    └── add_patient_id_to_surgery/  # NEW migration
```

### B. Database Schema Diff

```diff
model Patient {
  id           Int       @id @default(autoincrement())
  status       String
  type         String?   @default("Medical")
  demographics Json
  medicalHistory Json @default("{}")
  currentStay Json?
  roundingData Json?
  mriData Json?
  stickerData Json?
  tasks Task[]
  notes Note[]
+ surgeries Surgery[]    // NEW
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model Surgery {
  id              String     @id @default(cuid())
  dailyEntryId    String
  dailyEntry      DailyEntry @relation(...)
  procedureName   String
  participation   String
  patientName     String?
+ patientId       Int?                           // NEW
+ patient         Patient? @relation(...)        // NEW
  notes           String?
  createdAt       DateTime @default(now())

  @@index([dailyEntryId])
  @@index([participation])
+ @@index([patientId])                           // NEW
}
```

---

**Document Status:** Ready for Implementation

**Approval Required:** @laurenjohnston

---

*This document follows Google Engineering Design Doc standards with VetHub-specific context.*
