# ACVIM Neurology Residency Tracker Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the current generic residency tracker with an ACVIM-compliant neurology residency documentation system that matches official ACVIM forms exactly.

**Architecture:** Database-backed (PostgreSQL via Prisma) with four main models: ResidencyProfile, NeurosurgeryCase, JournalClubEntry, and WeeklyScheduleEntry. The UI will have four tabs matching the ACVIM forms: Neurosurgery Case Log, Journal Club Log, Weekly Schedule, and Annual Summary/Export.

**Tech Stack:** Next.js 15, React 18, Prisma ORM, PostgreSQL (Railway), Tailwind CSS, Radix UI

---

## Database Models Overview

### Model 1: ResidencyProfile
Stores resident identity and settings.
```prisma
model ResidencyProfile {
  id                String   @id @default(cuid())
  residentName      String
  acvimCandidateId  String?
  trainingFacility  String?
  startDate         String?  // ISO date
  currentYear       Int      @default(1) // 1, 2, or 3
  supervisingDiplomateNames String[] // Array of diplomate names
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
}
```

### Model 2: NeurosurgeryCase
Matches ACVIM Neurosurgery Case Log exactly.
```prisma
model NeurosurgeryCase {
  id            String   @id @default(cuid())
  procedureName String   // Free text: "hemilaminectomy", "ventral slot", etc.
  dateCompleted String   // ISO date
  caseIdNumber  String   // Medical record number
  role          String   // "Primary" or "Assistant"
  hours         Float    // 0.25, 0.5, 0.75, 1, 1.25, etc.
  residencyYear Int      // 1, 2, or 3
  notes         String?

  // Optional patient link
  patientId     Int?
  patientName   String?

  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  @@index([residencyYear])
  @@index([dateCompleted])
}
```

### Model 3: JournalClubEntry
Matches ACVIM Journal Club Log exactly.
```prisma
model JournalClubEntry {
  id                    String   @id @default(cuid())
  date                  String   // ISO date
  articleTitles         String[] // Can be multiple articles
  supervisingNeurologists String[] // Board-certified neurologists present
  hours                 Float    // 0.5, 1, 1.5, etc. (0.5 increments)
  residencyYear         Int      // 1, 2, or 3
  notes                 String?

  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt

  @@index([residencyYear])
  @@index([date])
}
```

### Model 4: WeeklyScheduleEntry
Matches ACVIM Weekly Schedule exactly.
```prisma
model WeeklyScheduleEntry {
  id                      String   @id @default(cuid())
  residencyYear           Int      // 1, 2, or 3
  month                   Int      // 1-12
  weekNumber              Int      // 1-5 (week within month)
  weekStartDate           String   // ISO date (Monday)

  // All activity columns from ACVIM form
  clinicalNeurologyDirect Float?   // weeks (0, 0.5, 1)
  clinicalNeurologyIndirect Float? // weeks (0, 0.5, 1)
  neurosurgeryHours       Float?   // 0.25 increments
  radiologyHours          Float?   // whole hours only
  neuropathologyHours     Float?   // whole hours only
  clinicalPathologyHours  Float?   // whole hours only
  electrodiagnosticsHours Float?   // 0.25 increments
  journalClubHours        Float?   // 0.5 increments
  otherTime               String?  // weeks or days, free text
  otherTimeDescription    String?  // e.g., "vacation", "research"

  supervisingDiplomateName String  // REQUIRED for all weeks

  createdAt               DateTime @default(now())
  updatedAt               DateTime @updatedAt

  @@unique([residencyYear, month, weekNumber])
  @@index([residencyYear])
  @@index([month])
}
```

---

## Task 1: Add Database Models

**Files:**
- Modify: `prisma/schema.prisma`

**Step 1: Add the four new models to schema**

Add at the end of `prisma/schema.prisma`:

```prisma
// ==========================================
// ACVIM Residency Tracking Models
// ==========================================

// Resident Profile - identity and settings
model ResidencyProfile {
  id                      String   @id @default(cuid())
  residentName            String
  acvimCandidateId        String?
  trainingFacility        String?
  startDate               String?
  currentYear             Int      @default(1)
  supervisingDiplomateNames String[]
  createdAt               DateTime @default(now())
  updatedAt               DateTime @updatedAt
}

// Neurosurgery Case Log - matches ACVIM form exactly
model NeurosurgeryCase {
  id            String   @id @default(cuid())
  procedureName String
  dateCompleted String
  caseIdNumber  String
  role          String   // "Primary" or "Assistant"
  hours         Float
  residencyYear Int
  notes         String?
  patientId     Int?
  patientName   String?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  @@index([residencyYear])
  @@index([dateCompleted])
}

// Journal Club Log - matches ACVIM form exactly
model JournalClubEntry {
  id                      String   @id @default(cuid())
  date                    String
  articleTitles           String[]
  supervisingNeurologists String[]
  hours                   Float
  residencyYear           Int
  notes                   String?
  createdAt               DateTime @default(now())
  updatedAt               DateTime @updatedAt

  @@index([residencyYear])
  @@index([date])
}

// Weekly Schedule Entry - matches ACVIM form exactly
model WeeklyScheduleEntry {
  id                        String   @id @default(cuid())
  residencyYear             Int
  month                     Int
  weekNumber                Int
  weekStartDate             String
  clinicalNeurologyDirect   Float?
  clinicalNeurologyIndirect Float?
  neurosurgeryHours         Float?
  radiologyHours            Float?
  neuropathologyHours       Float?
  clinicalPathologyHours    Float?
  electrodiagnosticsHours   Float?
  journalClubHours          Float?
  otherTime                 String?
  otherTimeDescription      String?
  supervisingDiplomateName  String
  createdAt                 DateTime @default(now())
  updatedAt                 DateTime @updatedAt

  @@unique([residencyYear, month, weekNumber])
  @@index([residencyYear])
  @@index([month])
}
```

**Step 2: Generate migration**

```bash
npx prisma migrate dev --name add_acvim_residency_models
```

**Step 3: Generate Prisma client**

```bash
npx prisma generate
```

**Step 4: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat(db): add ACVIM residency tracking models

- ResidencyProfile for resident identity
- NeurosurgeryCase for case log
- JournalClubEntry for journal club log
- WeeklyScheduleEntry for weekly schedule"
```

---

## Task 2: Create TypeScript Types

**Files:**
- Replace: `src/lib/residency-types.ts`

**Step 1: Replace the file with ACVIM-compliant types**

```typescript
/**
 * ACVIM Neurology Residency Tracking Types
 * Matches official ACVIM Credentials Committee forms
 */

// Resident Profile
export interface ResidencyProfile {
  id: string;
  residentName: string;
  acvimCandidateId?: string;
  trainingFacility?: string;
  startDate?: string;
  currentYear: 1 | 2 | 3;
  supervisingDiplomateNames: string[];
}

// Neurosurgery Case Log Entry
export type SurgeryRole = 'Primary' | 'Assistant';

export interface NeurosurgeryCase {
  id: string;
  procedureName: string;
  dateCompleted: string;
  caseIdNumber: string;
  role: SurgeryRole;
  hours: number; // 0.25 increments
  residencyYear: 1 | 2 | 3;
  notes?: string;
  patientId?: number;
  patientName?: string;
}

// Journal Club Log Entry
export interface JournalClubEntry {
  id: string;
  date: string;
  articleTitles: string[];
  supervisingNeurologists: string[];
  hours: number; // 0.5 increments
  residencyYear: 1 | 2 | 3;
  notes?: string;
}

// Weekly Schedule Entry - matches ACVIM form columns exactly
export interface WeeklyScheduleEntry {
  id: string;
  residencyYear: 1 | 2 | 3;
  month: number; // 1-12
  weekNumber: number; // 1-5
  weekStartDate: string;

  // Activity columns (all optional, record what happened)
  clinicalNeurologyDirect?: number; // weeks (0, 0.5, 1)
  clinicalNeurologyIndirect?: number; // weeks
  neurosurgeryHours?: number; // 0.25 increments
  radiologyHours?: number; // whole hours
  neuropathologyHours?: number; // whole hours
  clinicalPathologyHours?: number; // whole hours
  electrodiagnosticsHours?: number; // 0.25 increments
  journalClubHours?: number; // 0.5 increments
  otherTime?: string; // weeks or days
  otherTimeDescription?: string; // vacation, research, etc.

  supervisingDiplomateName: string; // REQUIRED
}

// Summary totals for Annual Report
export interface AnnualSummary {
  year: 1 | 2 | 3;
  timePeriod: { from: string; to: string };

  // Totals
  neurologyDirectWeeks: number;
  neurologyIndirectWeeks: number;
  neurosurgeryHours: number;
  radiologyHours: number;
  clinicalPathologyHours: number;
  neuropathologyHours: number;
  electrodiagnosticsHours: number;
  journalClubHours: number;
  otherSpecialtyWeeks: number;
  otherDays: number;

  // Case counts
  totalCases: number;
  primaryCases: number;
  assistantCases: number;
  totalCaseHours: number;

  // Journal Club counts
  totalJournalClubSessions: number;
}

// ACVIM Export format
export interface ACVIMExport {
  profile: ResidencyProfile;
  neurosurgeryCases: NeurosurgeryCase[];
  journalClubEntries: JournalClubEntry[];
  weeklySchedule: WeeklyScheduleEntry[];
  summaries: {
    year1?: AnnualSummary;
    year2?: AnnualSummary;
    year3?: AnnualSummary;
  };
  exportDate: string;
}

// Hour increment options
export const NEUROSURGERY_HOUR_OPTIONS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2, 2.25, 2.5, 2.75, 3, 3.5, 4, 4.5, 5, 6, 7, 8];
export const JOURNAL_CLUB_HOUR_OPTIONS = [0.5, 1, 1.5, 2, 2.5, 3];
export const ELECTRODIAGNOSTICS_HOUR_OPTIONS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2, 2.5, 3, 4];
export const WEEK_OPTIONS = [0, 0.5, 1];
export const WHOLE_HOUR_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
```

**Step 2: Commit**

```bash
git add src/lib/residency-types.ts
git commit -m "feat(types): replace with ACVIM-compliant residency types"
```

---

## Task 3: Create API Routes

**Files:**
- Create: `src/app/api/residency/profile/route.ts`
- Create: `src/app/api/residency/cases/route.ts`
- Create: `src/app/api/residency/journal-club/route.ts`
- Create: `src/app/api/residency/weekly-schedule/route.ts`
- Create: `src/app/api/residency/export/route.ts`

### Step 1: Profile API

Create `src/app/api/residency/profile/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET - fetch profile (or create default)
export async function GET() {
  try {
    let profile = await prisma.residencyProfile.findFirst();

    if (!profile) {
      // Create default profile
      profile = await prisma.residencyProfile.create({
        data: {
          residentName: '',
          currentYear: 1,
          supervisingDiplomateNames: [],
        },
      });
    }

    return NextResponse.json(profile);
  } catch (error) {
    console.error('Error fetching residency profile:', error);
    return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 });
  }
}

// PUT - update profile
export async function PUT(request: NextRequest) {
  try {
    const data = await request.json();
    const profile = await prisma.residencyProfile.findFirst();

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    const updated = await prisma.residencyProfile.update({
      where: { id: profile.id },
      data: {
        residentName: data.residentName,
        acvimCandidateId: data.acvimCandidateId,
        trainingFacility: data.trainingFacility,
        startDate: data.startDate,
        currentYear: data.currentYear,
        supervisingDiplomateNames: data.supervisingDiplomateNames || [],
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error updating residency profile:', error);
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
  }
}
```

### Step 2: Cases API

Create `src/app/api/residency/cases/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET - fetch all cases
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const year = searchParams.get('year');

    const where = year ? { residencyYear: parseInt(year) } : {};

    const cases = await prisma.neurosurgeryCase.findMany({
      where,
      orderBy: { dateCompleted: 'desc' },
    });

    return NextResponse.json(cases);
  } catch (error) {
    console.error('Error fetching cases:', error);
    return NextResponse.json({ error: 'Failed to fetch cases' }, { status: 500 });
  }
}

// POST - create new case
export async function POST(request: NextRequest) {
  try {
    const data = await request.json();

    const newCase = await prisma.neurosurgeryCase.create({
      data: {
        procedureName: data.procedureName,
        dateCompleted: data.dateCompleted,
        caseIdNumber: data.caseIdNumber,
        role: data.role,
        hours: data.hours,
        residencyYear: data.residencyYear,
        notes: data.notes,
        patientId: data.patientId,
        patientName: data.patientName,
      },
    });

    return NextResponse.json(newCase);
  } catch (error) {
    console.error('Error creating case:', error);
    return NextResponse.json({ error: 'Failed to create case' }, { status: 500 });
  }
}

// DELETE - delete case
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Case ID required' }, { status: 400 });
    }

    await prisma.neurosurgeryCase.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting case:', error);
    return NextResponse.json({ error: 'Failed to delete case' }, { status: 500 });
  }
}
```

### Step 3: Journal Club API

Create `src/app/api/residency/journal-club/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET - fetch all entries
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const year = searchParams.get('year');

    const where = year ? { residencyYear: parseInt(year) } : {};

    const entries = await prisma.journalClubEntry.findMany({
      where,
      orderBy: { date: 'desc' },
    });

    return NextResponse.json(entries);
  } catch (error) {
    console.error('Error fetching journal club entries:', error);
    return NextResponse.json({ error: 'Failed to fetch entries' }, { status: 500 });
  }
}

// POST - create new entry
export async function POST(request: NextRequest) {
  try {
    const data = await request.json();

    const entry = await prisma.journalClubEntry.create({
      data: {
        date: data.date,
        articleTitles: data.articleTitles || [],
        supervisingNeurologists: data.supervisingNeurologists || [],
        hours: data.hours,
        residencyYear: data.residencyYear,
        notes: data.notes,
      },
    });

    return NextResponse.json(entry);
  } catch (error) {
    console.error('Error creating journal club entry:', error);
    return NextResponse.json({ error: 'Failed to create entry' }, { status: 500 });
  }
}

// DELETE - delete entry
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Entry ID required' }, { status: 400 });
    }

    await prisma.journalClubEntry.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting journal club entry:', error);
    return NextResponse.json({ error: 'Failed to delete entry' }, { status: 500 });
  }
}
```

### Step 4: Weekly Schedule API

Create `src/app/api/residency/weekly-schedule/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET - fetch schedule entries
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const year = searchParams.get('year');
    const month = searchParams.get('month');

    const where: Record<string, number> = {};
    if (year) where.residencyYear = parseInt(year);
    if (month) where.month = parseInt(month);

    const entries = await prisma.weeklyScheduleEntry.findMany({
      where,
      orderBy: [{ month: 'asc' }, { weekNumber: 'asc' }],
    });

    return NextResponse.json(entries);
  } catch (error) {
    console.error('Error fetching weekly schedule:', error);
    return NextResponse.json({ error: 'Failed to fetch schedule' }, { status: 500 });
  }
}

// POST - create or update entry
export async function POST(request: NextRequest) {
  try {
    const data = await request.json();

    // Upsert - update if exists, create if not
    const entry = await prisma.weeklyScheduleEntry.upsert({
      where: {
        residencyYear_month_weekNumber: {
          residencyYear: data.residencyYear,
          month: data.month,
          weekNumber: data.weekNumber,
        },
      },
      update: {
        weekStartDate: data.weekStartDate,
        clinicalNeurologyDirect: data.clinicalNeurologyDirect,
        clinicalNeurologyIndirect: data.clinicalNeurologyIndirect,
        neurosurgeryHours: data.neurosurgeryHours,
        radiologyHours: data.radiologyHours,
        neuropathologyHours: data.neuropathologyHours,
        clinicalPathologyHours: data.clinicalPathologyHours,
        electrodiagnosticsHours: data.electrodiagnosticsHours,
        journalClubHours: data.journalClubHours,
        otherTime: data.otherTime,
        otherTimeDescription: data.otherTimeDescription,
        supervisingDiplomateName: data.supervisingDiplomateName,
      },
      create: {
        residencyYear: data.residencyYear,
        month: data.month,
        weekNumber: data.weekNumber,
        weekStartDate: data.weekStartDate,
        clinicalNeurologyDirect: data.clinicalNeurologyDirect,
        clinicalNeurologyIndirect: data.clinicalNeurologyIndirect,
        neurosurgeryHours: data.neurosurgeryHours,
        radiologyHours: data.radiologyHours,
        neuropathologyHours: data.neuropathologyHours,
        clinicalPathologyHours: data.clinicalPathologyHours,
        electrodiagnosticsHours: data.electrodiagnosticsHours,
        journalClubHours: data.journalClubHours,
        otherTime: data.otherTime,
        otherTimeDescription: data.otherTimeDescription,
        supervisingDiplomateName: data.supervisingDiplomateName,
      },
    });

    return NextResponse.json(entry);
  } catch (error) {
    console.error('Error saving weekly schedule entry:', error);
    return NextResponse.json({ error: 'Failed to save entry' }, { status: 500 });
  }
}

// DELETE - delete entry
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Entry ID required' }, { status: 400 });
    }

    await prisma.weeklyScheduleEntry.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting weekly schedule entry:', error);
    return NextResponse.json({ error: 'Failed to delete entry' }, { status: 500 });
  }
}
```

### Step 5: Export API

Create `src/app/api/residency/export/route.ts`:

```typescript
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
  try {
    // Fetch all data
    const [profile, cases, journalClub, weeklySchedule] = await Promise.all([
      prisma.residencyProfile.findFirst(),
      prisma.neurosurgeryCase.findMany({ orderBy: { dateCompleted: 'asc' } }),
      prisma.journalClubEntry.findMany({ orderBy: { date: 'asc' } }),
      prisma.weeklyScheduleEntry.findMany({ orderBy: [{ residencyYear: 'asc' }, { month: 'asc' }, { weekNumber: 'asc' }] }),
    ]);

    // Calculate summaries per year
    const calculateYearSummary = (year: number) => {
      const yearCases = cases.filter(c => c.residencyYear === year);
      const yearJournalClub = journalClub.filter(j => j.residencyYear === year);
      const yearSchedule = weeklySchedule.filter(w => w.residencyYear === year);

      return {
        year,
        totalCases: yearCases.length,
        primaryCases: yearCases.filter(c => c.role === 'Primary').length,
        assistantCases: yearCases.filter(c => c.role === 'Assistant').length,
        totalCaseHours: yearCases.reduce((sum, c) => sum + c.hours, 0),
        totalJournalClubSessions: yearJournalClub.length,
        totalJournalClubHours: yearJournalClub.reduce((sum, j) => sum + j.hours, 0),
        neurologyDirectWeeks: yearSchedule.reduce((sum, w) => sum + (w.clinicalNeurologyDirect || 0), 0),
        neurologyIndirectWeeks: yearSchedule.reduce((sum, w) => sum + (w.clinicalNeurologyIndirect || 0), 0),
        neurosurgeryHours: yearSchedule.reduce((sum, w) => sum + (w.neurosurgeryHours || 0), 0),
        radiologyHours: yearSchedule.reduce((sum, w) => sum + (w.radiologyHours || 0), 0),
        neuropathologyHours: yearSchedule.reduce((sum, w) => sum + (w.neuropathologyHours || 0), 0),
        clinicalPathologyHours: yearSchedule.reduce((sum, w) => sum + (w.clinicalPathologyHours || 0), 0),
        electrodiagnosticsHours: yearSchedule.reduce((sum, w) => sum + (w.electrodiagnosticsHours || 0), 0),
        journalClubHours: yearSchedule.reduce((sum, w) => sum + (w.journalClubHours || 0), 0),
      };
    };

    const exportData = {
      profile,
      neurosurgeryCases: cases,
      journalClubEntries: journalClub,
      weeklySchedule,
      summaries: {
        year1: calculateYearSummary(1),
        year2: calculateYearSummary(2),
        year3: calculateYearSummary(3),
      },
      exportDate: new Date().toISOString(),
    };

    return NextResponse.json(exportData);
  } catch (error) {
    console.error('Error exporting residency data:', error);
    return NextResponse.json({ error: 'Failed to export data' }, { status: 500 });
  }
}
```

### Step 6: Commit API routes

```bash
git add src/app/api/residency/
git commit -m "feat(api): add ACVIM residency API routes

- Profile API for resident info
- Cases API for neurosurgery case log
- Journal Club API for journal club log
- Weekly Schedule API for weekly activity tracking
- Export API for ACVIM-format data export"
```

---

## Task 4: Redesign Residency Page UI

**Files:**
- Replace: `src/app/residency/page.tsx`

This is the largest task. The new page will have:
1. **Header** with resident info and year selector
2. **Four tabs**: Neurosurgery Cases, Journal Club, Weekly Schedule, Annual Summary
3. **Each tab** matches ACVIM form layout exactly

Due to length, the full page.tsx code will be implemented incrementally:
- Task 4a: Page structure and Profile section
- Task 4b: Neurosurgery Case Log tab
- Task 4c: Journal Club Log tab
- Task 4d: Weekly Schedule tab
- Task 4e: Annual Summary tab

See implementation below for each sub-task.

---

## Task 4a: Page Structure and Profile

Replace `src/app/residency/page.tsx` header and structure:

```typescript
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ArrowLeft, Download, Settings, Stethoscope, BookOpen, Calendar,
  FileText, Plus, Trash2, ChevronDown, ChevronUp, Save
} from 'lucide-react';

// Types
type ResidencyYear = 1 | 2 | 3;
type SurgeryRole = 'Primary' | 'Assistant';
type TabType = 'cases' | 'journal' | 'schedule' | 'summary';

interface ResidencyProfile {
  id: string;
  residentName: string;
  acvimCandidateId?: string;
  trainingFacility?: string;
  startDate?: string;
  currentYear: ResidencyYear;
  supervisingDiplomateNames: string[];
}

interface NeurosurgeryCase {
  id: string;
  procedureName: string;
  dateCompleted: string;
  caseIdNumber: string;
  role: SurgeryRole;
  hours: number;
  residencyYear: ResidencyYear;
  notes?: string;
  patientId?: number;
  patientName?: string;
}

interface JournalClubEntry {
  id: string;
  date: string;
  articleTitles: string[];
  supervisingNeurologists: string[];
  hours: number;
  residencyYear: ResidencyYear;
  notes?: string;
}

interface WeeklyScheduleEntry {
  id: string;
  residencyYear: ResidencyYear;
  month: number;
  weekNumber: number;
  weekStartDate: string;
  clinicalNeurologyDirect?: number;
  clinicalNeurologyIndirect?: number;
  neurosurgeryHours?: number;
  radiologyHours?: number;
  neuropathologyHours?: number;
  clinicalPathologyHours?: number;
  electrodiagnosticsHours?: number;
  journalClubHours?: number;
  otherTime?: string;
  otherTimeDescription?: string;
  supervisingDiplomateName: string;
}

// Constants
const HOUR_OPTIONS_015 = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2, 2.5, 3, 4, 5, 6, 8];
const HOUR_OPTIONS_05 = [0.5, 1, 1.5, 2, 2.5, 3];
const HOUR_OPTIONS_WHOLE = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const WEEK_OPTIONS = [0, 0.5, 1];

export default function ACVIMResidencyTracker() {
  // State
  const [activeTab, setActiveTab] = useState<TabType>('cases');
  const [selectedYear, setSelectedYear] = useState<ResidencyYear>(1);
  const [profile, setProfile] = useState<ResidencyProfile | null>(null);
  const [cases, setCases] = useState<NeurosurgeryCase[]>([]);
  const [journalClub, setJournalClub] = useState<JournalClubEntry[]>([]);
  const [weeklySchedule, setWeeklySchedule] = useState<WeeklyScheduleEntry[]>([]);
  const [showProfileSettings, setShowProfileSettings] = useState(false);
  const [loading, setLoading] = useState(true);

  // Fetch all data on mount
  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    try {
      const [profileRes, casesRes, journalRes, scheduleRes] = await Promise.all([
        fetch('/api/residency/profile'),
        fetch('/api/residency/cases'),
        fetch('/api/residency/journal-club'),
        fetch('/api/residency/weekly-schedule'),
      ]);

      if (profileRes.ok) setProfile(await profileRes.json());
      if (casesRes.ok) setCases(await casesRes.json());
      if (journalRes.ok) setJournalClub(await journalRes.json());
      if (scheduleRes.ok) setWeeklySchedule(await scheduleRes.json());
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filter data by selected year
  const yearCases = cases.filter(c => c.residencyYear === selectedYear);
  const yearJournalClub = journalClub.filter(j => j.residencyYear === selectedYear);
  const yearSchedule = weeklySchedule.filter(w => w.residencyYear === selectedYear);

  // Calculate totals
  const yearCaseHours = yearCases.reduce((sum, c) => sum + c.hours, 0);
  const yearJournalHours = yearJournalClub.reduce((sum, j) => sum + j.hours, 0);

  const exportData = async () => {
    const res = await fetch('/api/residency/export');
    if (res.ok) {
      const data = await res.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ACVIM_Residency_Export_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-rose-50 to-purple-50 flex items-center justify-center">
        <div className="text-gray-600">Loading residency data...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 to-purple-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/" className="flex items-center gap-2 text-gray-600 hover:text-gray-900">
                <ArrowLeft size={20} />
                <span className="text-sm">Back to Dashboard</span>
              </Link>
              <div className="h-6 w-px bg-gray-300" />
              <h1 className="text-xl font-bold text-gray-900">ACVIM Residency Tracker</h1>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowProfileSettings(!showProfileSettings)}
                className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
              >
                <Settings size={18} />
                <span className="text-sm">Settings</span>
              </button>
              <button
                onClick={exportData}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                <Download size={18} />
                <span className="text-sm">Export ACVIM</span>
              </button>
            </div>
          </div>

          {/* Profile Info Bar */}
          {profile && (
            <div className="mt-3 flex items-center gap-6 text-sm text-gray-600">
              <span><strong>Resident:</strong> {profile.residentName || 'Not set'}</span>
              <span><strong>ACVIM ID:</strong> {profile.acvimCandidateId || 'Not set'}</span>
              <span><strong>Facility:</strong> {profile.trainingFacility || 'Not set'}</span>
            </div>
          )}
        </div>
      </header>

      {/* Year Selector */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-gray-700">Residency Year:</span>
            <div className="flex gap-2">
              {([1, 2, 3] as ResidencyYear[]).map(year => (
                <button
                  key={year}
                  onClick={() => setSelectedYear(year)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                    selectedYear === year
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Year {year}
                </button>
              ))}
            </div>
            <div className="ml-auto flex items-center gap-4 text-sm">
              <span className="text-gray-600">
                <strong>{yearCases.length}</strong> cases ({yearCaseHours} hrs)
              </span>
              <span className="text-gray-600">
                <strong>{yearJournalClub.length}</strong> journal clubs ({yearJournalHours} hrs)
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex gap-1">
            {[
              { id: 'cases' as TabType, label: 'Neurosurgery Case Log', icon: Stethoscope },
              { id: 'journal' as TabType, label: 'Journal Club Log', icon: BookOpen },
              { id: 'schedule' as TabType, label: 'Weekly Schedule', icon: Calendar },
              { id: 'summary' as TabType, label: 'Annual Summary', icon: FileText },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition ${
                  activeTab === tab.id
                    ? 'border-purple-600 text-purple-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                <tab.icon size={18} />
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Profile Settings Modal would go here */}

        {/* Tab Content */}
        {activeTab === 'cases' && (
          <NeurosurgeryCaseLog
            cases={yearCases}
            selectedYear={selectedYear}
            onRefresh={fetchAllData}
          />
        )}
        {activeTab === 'journal' && (
          <JournalClubLog
            entries={yearJournalClub}
            selectedYear={selectedYear}
            onRefresh={fetchAllData}
          />
        )}
        {activeTab === 'schedule' && (
          <WeeklyScheduleTab
            entries={yearSchedule}
            selectedYear={selectedYear}
            onRefresh={fetchAllData}
          />
        )}
        {activeTab === 'summary' && (
          <AnnualSummaryTab
            cases={yearCases}
            journalClub={yearJournalClub}
            schedule={yearSchedule}
            selectedYear={selectedYear}
            profile={profile}
          />
        )}
      </main>
    </div>
  );
}

// Component stubs - will be implemented in subsequent tasks
function NeurosurgeryCaseLog({ cases, selectedYear, onRefresh }: {
  cases: NeurosurgeryCase[];
  selectedYear: ResidencyYear;
  onRefresh: () => void;
}) {
  return <div>Case Log - TODO</div>;
}

function JournalClubLog({ entries, selectedYear, onRefresh }: {
  entries: JournalClubEntry[];
  selectedYear: ResidencyYear;
  onRefresh: () => void;
}) {
  return <div>Journal Club - TODO</div>;
}

function WeeklyScheduleTab({ entries, selectedYear, onRefresh }: {
  entries: WeeklyScheduleEntry[];
  selectedYear: ResidencyYear;
  onRefresh: () => void;
}) {
  return <div>Weekly Schedule - TODO</div>;
}

function AnnualSummaryTab({ cases, journalClub, schedule, selectedYear, profile }: {
  cases: NeurosurgeryCase[];
  journalClub: JournalClubEntry[];
  schedule: WeeklyScheduleEntry[];
  selectedYear: ResidencyYear;
  profile: ResidencyProfile | null;
}) {
  return <div>Annual Summary - TODO</div>;
}
```

---

## Remaining Tasks (4b-4e)

Due to document length, the remaining component implementations will follow the same pattern:

**Task 4b: NeurosurgeryCaseLog component**
- Table with columns: Procedure Name, Date, Case ID, Primary/Assistant, Hours
- Add Case dialog matching ACVIM form
- Year totals row

**Task 4c: JournalClubLog component**
- Table with columns: Date, Article Titles, Supervising Neurologists, Hours
- Add Entry dialog
- Year totals row

**Task 4d: WeeklyScheduleTab component**
- Grid organized by Month → Weeks
- All 10 ACVIM columns
- Month subtotals and year totals

**Task 4e: AnnualSummaryTab component**
- Matches ACVIM Annual Report format
- Totals for all categories
- Printable format

---

## Task 5: Delete Old Residency Types File Exports

Clean up unused exports from old implementation that may cause conflicts.

---

## Task 6: Final Testing & Deployment

**Step 1: Run type check**
```bash
npm run typecheck
```

**Step 2: Run build**
```bash
npm run build
```

**Step 3: Test on production**
```bash
git push origin main
# Wait for Railway deploy
# Test at https://empathetic-clarity-production.up.railway.app/residency
```

**Step 4: Verify all features**
- [ ] Profile settings save
- [ ] Add neurosurgery case
- [ ] Add journal club entry
- [ ] Add weekly schedule entry
- [ ] Year totals calculate correctly
- [ ] Export generates valid JSON
- [ ] Data persists after refresh

---

## Summary

| Task | Description | Estimated Steps |
|------|-------------|-----------------|
| 1 | Database models | 4 |
| 2 | TypeScript types | 2 |
| 3 | API routes | 6 |
| 4a | Page structure | 2 |
| 4b | Case log component | 4 |
| 4c | Journal club component | 4 |
| 4d | Weekly schedule component | 6 |
| 4e | Annual summary component | 4 |
| 5 | Cleanup | 2 |
| 6 | Testing & deploy | 4 |

**Total: ~38 steps**
