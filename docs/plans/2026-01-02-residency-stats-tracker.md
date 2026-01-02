# Residency Stats Tracker & Gamification Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add gamification and stats tracking to the existing /residency page - daily entry logging for MRIs/appointments/surgeries with participation levels, LMRI+ localization accuracy tracking, milestones, achievements, bingo cards, and a motivational dashboard.

**Architecture:** Extend the existing ACVIM residency tracking with new Prisma models for daily entries, participation tracking, and gamification. Add new tabs to the existing residency page: "Daily Entry", "Stats Dashboard", and "Achievements". Use TanStack Query for server state, Recharts for visualizations, and Framer Motion for celebration animations.

**Tech Stack:** Next.js 15, Prisma ORM, PostgreSQL, TanStack Query, Recharts, Framer Motion, Radix UI, Tailwind CSS

---

## Phase 1: Database Schema

### Task 1.1: Add DailyEntry Model

**Files:**
- Modify: `prisma/schema.prisma`

**Step 1: Add the DailyEntry model to track daily case counts**

Add to the end of `prisma/schema.prisma`:

```prisma
// ==========================================
// Residency Stats Tracker & Gamification
// ==========================================

// Daily Entry - tracks MRIs, appointments, and surgeries for a single day
model DailyEntry {
  id            String   @id @default(cuid())
  date          String   @unique // ISO date (YYYY-MM-DD) - one entry per day

  // MRI counts
  mriCount      Int      @default(0)

  // Appointment counts
  recheckCount  Int      @default(0)
  newCount      Int      @default(0)

  // Calculated totals (denormalized for quick queries)
  totalCases    Int      @default(0) // mri + recheck + new

  // Notes for the day
  notes         String?

  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  // Relations
  surgeries     Surgery[]
  lmriEntries   LMRIEntry[]

  @@index([date])
}
```

**Step 2: Run prisma format to validate syntax**

Run: `cd /Users/laurenjohnston/Documents/vethub2.0 && npx prisma format`
Expected: Schema formatted successfully

---

### Task 1.2: Add Surgery Model with Participation Tracking

**Files:**
- Modify: `prisma/schema.prisma`

**Step 1: Add Surgery model with S/O/C/D/K participation levels**

Add after DailyEntry model:

```prisma
// Surgery - individual surgery with participation level
// S = Surgeon (primary), O = Observer, C = Circulator, D = Dissector, K = Knife (cutting/suturing assistant)
model Surgery {
  id              String     @id @default(cuid())
  dailyEntryId    String
  dailyEntry      DailyEntry @relation(fields: [dailyEntryId], references: [id], onDelete: Cascade)

  procedureName   String     // e.g., "hemilaminectomy", "ventral slot", "craniotomy"
  participation   String     // "S" | "O" | "C" | "D" | "K"

  // Optional details
  patientName     String?
  notes           String?

  createdAt       DateTime   @default(now())

  @@index([dailyEntryId])
  @@index([participation])
}
```

**Step 2: Run prisma format**

Run: `cd /Users/laurenjohnston/Documents/vethub2.0 && npx prisma format`
Expected: Schema formatted successfully

---

### Task 1.3: Add LMRI+ Localization Tracking Model

**Files:**
- Modify: `prisma/schema.prisma`

**Step 1: Add LMRIEntry model to track neuro exam accuracy**

Add after Surgery model:

```prisma
// LMRI+ Entry - tracks neuro exam localization accuracy vs MRI findings
// L = Localized correctly, M = Missed (wrong localization), R = Right side correct
// I = Incorrect side, + = bonus (caught subtle finding)
model LMRIEntry {
  id              String     @id @default(cuid())
  dailyEntryId    String
  dailyEntry      DailyEntry @relation(fields: [dailyEntryId], references: [id], onDelete: Cascade)

  // Pre-MRI prediction
  predictedLocalization String  // e.g., "C2-C5 myelopathy", "L4-S3 LMN"
  predictedLaterality   String? // "Left" | "Right" | "Bilateral" | "Midline"

  // Post-MRI actual findings
  actualLocalization    String  // What MRI showed
  actualLaterality      String? // Actual side affected

  // Scoring
  localizationCorrect   Boolean // Was the spinal segment/region correct?
  lateralityCorrect     Boolean? // Was the side correct? (null if N/A)
  bonusFind             Boolean @default(false) // Caught something subtle

  // Patient reference (optional)
  patientName           String?
  notes                 String?

  createdAt             DateTime @default(now())

  @@index([dailyEntryId])
}
```

**Step 2: Run prisma format**

Run: `cd /Users/laurenjohnston/Documents/vethub2.0 && npx prisma format`
Expected: Schema formatted successfully

---

### Task 1.4: Add Milestone Model

**Files:**
- Modify: `prisma/schema.prisma`

**Step 1: Add Milestone model to track achievements**

Add after LMRIEntry model:

```prisma
// Milestone - tracks when user hits case count milestones
model Milestone {
  id          String   @id @default(cuid())
  type        String   // "mri" | "appointment" | "surgery" | "case"
  count       Int      // The milestone number (50, 100, 150, etc.)
  achievedAt  DateTime @default(now())

  // Celebration tracking
  celebrated  Boolean  @default(false) // Has user seen the celebration?

  @@unique([type, count])
  @@index([type])
}
```

**Step 2: Run prisma format**

Run: `cd /Users/laurenjohnston/Documents/vethub2.0 && npx prisma format`
Expected: Schema formatted successfully

---

### Task 1.5: Add Badge Model

**Files:**
- Modify: `prisma/schema.prisma`

**Step 1: Add Badge model for achievements**

Add after Milestone model:

```prisma
// Badge - gamification achievements
model Badge {
  id          String   @id @default(cuid())
  badgeId     String   @unique // e.g., "first_surgery", "mri_century", "streak_7"
  name        String   // Display name
  description String   // How it was earned
  icon        String?  // Emoji or icon identifier
  earnedAt    DateTime @default(now())

  // Celebration tracking
  celebrated  Boolean  @default(false)

  @@index([earnedAt])
}
```

**Step 2: Run prisma format**

Run: `cd /Users/laurenjohnston/Documents/vethub2.0 && npx prisma format`
Expected: Schema formatted successfully

---

### Task 1.6: Add BingoCard and BingoSquare Models

**Files:**
- Modify: `prisma/schema.prisma`

**Step 1: Add BingoCard and BingoSquare models**

Add after Badge model:

```prisma
// BingoCard - weekly rotating or permanent rare diagnosis cards
model BingoCard {
  id          String        @id @default(cuid())
  type        String        // "weekly" | "rare"
  weekStart   String?       // ISO date for weekly cards (null for rare)
  createdAt   DateTime      @default(now())
  completedAt DateTime?     // When all squares were completed

  squares     BingoSquare[]

  @@index([type])
  @@index([weekStart])
}

// BingoSquare - individual square on a bingo card
model BingoSquare {
  id          String    @id @default(cuid())
  cardId      String
  card        BingoCard @relation(fields: [cardId], references: [id], onDelete: Cascade)

  position    Int       // 0-24 for 5x5 grid
  text        String    // The bingo item text
  completed   Boolean   @default(false)
  completedAt DateTime?

  @@index([cardId])
}
```

**Step 3: Run prisma format and push to database**

Run: `cd /Users/laurenjohnston/Documents/vethub2.0 && npx prisma format && npx prisma db push`
Expected: Database schema updated successfully

**Step 4: Commit schema changes**

```bash
cd /Users/laurenjohnston/Documents/vethub2.0
git add prisma/schema.prisma
git commit -m "feat(residency): add gamification schema models

- DailyEntry for tracking MRIs, appointments, surgeries
- Surgery with S/O/C/D/K participation levels
- LMRIEntry for neuro exam accuracy tracking
- Milestone for case count achievements
- Badge for gamification rewards
- BingoCard and BingoSquare for weekly/rare bingo"
```

---

## Phase 2: API Routes

### Task 2.1: Create Daily Entry API Routes

**Files:**
- Create: `src/app/api/residency/daily-entry/route.ts`

**Step 1: Create the daily entry API route**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

// Validation schema for creating/updating daily entry
const dailyEntrySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD format'),
  mriCount: z.number().int().min(0).default(0),
  recheckCount: z.number().int().min(0).default(0),
  newCount: z.number().int().min(0).default(0),
  notes: z.string().optional(),
});

// GET - Fetch daily entries (optionally filtered by date range)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // Single date lookup
    if (date) {
      const entry = await prisma.dailyEntry.findUnique({
        where: { date },
        include: {
          surgeries: true,
          lmriEntries: true,
        },
      });
      return NextResponse.json(entry);
    }

    // Date range lookup
    const where: { date?: { gte?: string; lte?: string } } = {};
    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = startDate;
      if (endDate) where.date.lte = endDate;
    }

    const entries = await prisma.dailyEntry.findMany({
      where,
      include: {
        surgeries: true,
        lmriEntries: true,
      },
      orderBy: { date: 'desc' },
    });

    return NextResponse.json(entries);
  } catch (error) {
    console.error('Error fetching daily entries:', error);
    return NextResponse.json(
      { error: 'Failed to fetch daily entries' },
      { status: 500 }
    );
  }
}

// POST - Create or update daily entry (upsert by date)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = dailyEntrySchema.parse(body);

    const totalCases = validated.mriCount + validated.recheckCount + validated.newCount;

    const entry = await prisma.dailyEntry.upsert({
      where: { date: validated.date },
      create: {
        ...validated,
        totalCases,
      },
      update: {
        ...validated,
        totalCases,
      },
      include: {
        surgeries: true,
        lmriEntries: true,
      },
    });

    return NextResponse.json(entry);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }
    console.error('Error saving daily entry:', error);
    return NextResponse.json(
      { error: 'Failed to save daily entry' },
      { status: 500 }
    );
  }
}
```

**Step 2: Verify the file was created correctly**

Run: `cd /Users/laurenjohnston/Documents/vethub2.0 && npx tsc --noEmit src/app/api/residency/daily-entry/route.ts`
Expected: No errors

---

### Task 2.2: Create Surgery API Routes

**Files:**
- Create: `src/app/api/residency/surgery/route.ts`

**Step 1: Create the surgery API route**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const surgerySchema = z.object({
  dailyEntryId: z.string(),
  procedureName: z.string().min(1, 'Procedure name is required'),
  participation: z.enum(['S', 'O', 'C', 'D', 'K']),
  patientName: z.string().optional(),
  notes: z.string().optional(),
});

// GET - Fetch surgeries (optionally filtered)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const dailyEntryId = searchParams.get('dailyEntryId');
    const participation = searchParams.get('participation');

    const where: { dailyEntryId?: string; participation?: string } = {};
    if (dailyEntryId) where.dailyEntryId = dailyEntryId;
    if (participation) where.participation = participation;

    const surgeries = await prisma.surgery.findMany({
      where,
      include: {
        dailyEntry: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(surgeries);
  } catch (error) {
    console.error('Error fetching surgeries:', error);
    return NextResponse.json(
      { error: 'Failed to fetch surgeries' },
      { status: 500 }
    );
  }
}

// POST - Create new surgery
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = surgerySchema.parse(body);

    const surgery = await prisma.surgery.create({
      data: validated,
      include: {
        dailyEntry: true,
      },
    });

    return NextResponse.json(surgery);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }
    console.error('Error creating surgery:', error);
    return NextResponse.json(
      { error: 'Failed to create surgery' },
      { status: 500 }
    );
  }
}

// DELETE - Remove surgery by ID
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Surgery ID is required' },
        { status: 400 }
      );
    }

    await prisma.surgery.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting surgery:', error);
    return NextResponse.json(
      { error: 'Failed to delete surgery' },
      { status: 500 }
    );
  }
}
```

**Step 2: Verify the file**

Run: `cd /Users/laurenjohnston/Documents/vethub2.0 && npx tsc --noEmit src/app/api/residency/surgery/route.ts`
Expected: No errors

---

### Task 2.3: Create Stats API Route

**Files:**
- Create: `src/app/api/residency/stats/route.ts`

**Step 1: Create the stats aggregation API**

```typescript
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    // Get all daily entries for aggregation
    const entries = await prisma.dailyEntry.findMany({
      include: {
        surgeries: true,
        lmriEntries: true,
      },
    });

    // Get all surgeries for participation breakdown
    const allSurgeries = await prisma.surgery.findMany();

    // Calculate totals
    const totals = entries.reduce(
      (acc, entry) => ({
        mriCount: acc.mriCount + entry.mriCount,
        recheckCount: acc.recheckCount + entry.recheckCount,
        newCount: acc.newCount + entry.newCount,
        totalCases: acc.totalCases + entry.totalCases,
        totalAppointments: acc.totalAppointments + entry.recheckCount + entry.newCount,
      }),
      { mriCount: 0, recheckCount: 0, newCount: 0, totalCases: 0, totalAppointments: 0 }
    );

    // Surgery participation breakdown
    const surgeryBreakdown = allSurgeries.reduce(
      (acc, surgery) => {
        acc[surgery.participation] = (acc[surgery.participation] || 0) + 1;
        acc.total += 1;
        return acc;
      },
      { S: 0, O: 0, C: 0, D: 0, K: 0, total: 0 } as Record<string, number>
    );

    // LMRI+ accuracy stats
    const allLmri = entries.flatMap((e) => e.lmriEntries);
    const lmriStats = {
      total: allLmri.length,
      localizationCorrect: allLmri.filter((l) => l.localizationCorrect).length,
      lateralityCorrect: allLmri.filter((l) => l.lateralityCorrect).length,
      bonusFinds: allLmri.filter((l) => l.bonusFind).length,
      accuracy: allLmri.length > 0
        ? Math.round((allLmri.filter((l) => l.localizationCorrect).length / allLmri.length) * 100)
        : 0,
    };

    // Weekly data for charts (last 12 weeks)
    const twelveWeeksAgo = new Date();
    twelveWeeksAgo.setDate(twelveWeeksAgo.getDate() - 84);
    const weeklyData = entries
      .filter((e) => new Date(e.date) >= twelveWeeksAgo)
      .sort((a, b) => a.date.localeCompare(b.date));

    // Get achieved milestones
    const milestones = await prisma.milestone.findMany({
      orderBy: { achievedAt: 'desc' },
    });

    // Get earned badges
    const badges = await prisma.badge.findMany({
      orderBy: { earnedAt: 'desc' },
    });

    // Get resident profile for program dates
    const profile = await prisma.aCVIMProfile.findFirst();
    const programStartDate = profile?.programStartDate;

    // Calculate days until freedom (assuming 3-year residency)
    let daysUntilFreedom = null;
    if (programStartDate) {
      const endDate = new Date(programStartDate);
      endDate.setFullYear(endDate.getFullYear() + 3);
      const today = new Date();
      daysUntilFreedom = Math.max(0, Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));
    }

    return NextResponse.json({
      totals,
      surgeryBreakdown,
      lmriStats,
      weeklyData,
      milestones,
      badges,
      daysUntilFreedom,
      daysLogged: entries.length,
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch stats' },
      { status: 500 }
    );
  }
}
```

**Step 2: Verify the file**

Run: `cd /Users/laurenjohnston/Documents/vethub2.0 && npx tsc --noEmit src/app/api/residency/stats/route.ts`
Expected: No errors

---

### Task 2.4: Create Milestone Check API

**Files:**
- Create: `src/app/api/residency/milestones/route.ts`

**Step 1: Create milestone checking and awarding API**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Milestone thresholds
const MILESTONES = {
  mri: [50, 100, 150, 200, 250, 300, 350, 400, 450, 500],
  appointment: [25, 50, 75, 100, 150, 200, 250, 300, 400, 500],
  surgery: [10, 25, 50, 75, 100, 150, 200],
  case: [100, 250, 500, 750, 1000, 1500, 2000],
};

// GET - Check for new milestones and return uncelebrated ones
export async function GET() {
  try {
    // Get current totals
    const entries = await prisma.dailyEntry.findMany();
    const surgeries = await prisma.surgery.findMany();

    const totals = entries.reduce(
      (acc, entry) => ({
        mri: acc.mri + entry.mriCount,
        appointment: acc.appointment + entry.recheckCount + entry.newCount,
        case: acc.case + entry.totalCases,
      }),
      { mri: 0, appointment: 0, case: 0 }
    );
    totals.case += surgeries.length; // Surgeries also count as cases

    const surgeryTotal = surgeries.length;

    // Check each milestone type
    const newMilestones: Array<{ type: string; count: number }> = [];

    for (const [type, thresholds] of Object.entries(MILESTONES)) {
      const currentCount = type === 'surgery' ? surgeryTotal : totals[type as keyof typeof totals];

      for (const threshold of thresholds) {
        if (currentCount >= threshold) {
          // Check if already achieved
          const existing = await prisma.milestone.findUnique({
            where: { type_count: { type, count: threshold } },
          });

          if (!existing) {
            // Award new milestone
            await prisma.milestone.create({
              data: { type, count: threshold },
            });
            newMilestones.push({ type, count: threshold });
          }
        }
      }
    }

    // Get uncelebrated milestones
    const uncelebrated = await prisma.milestone.findMany({
      where: { celebrated: false },
      orderBy: { achievedAt: 'desc' },
    });

    return NextResponse.json({
      newMilestones,
      uncelebrated,
      currentTotals: { ...totals, surgery: surgeryTotal },
    });
  } catch (error) {
    console.error('Error checking milestones:', error);
    return NextResponse.json(
      { error: 'Failed to check milestones' },
      { status: 500 }
    );
  }
}

// POST - Mark milestone as celebrated
export async function POST(request: NextRequest) {
  try {
    const { milestoneId } = await request.json();

    if (!milestoneId) {
      return NextResponse.json(
        { error: 'Milestone ID is required' },
        { status: 400 }
      );
    }

    await prisma.milestone.update({
      where: { id: milestoneId },
      data: { celebrated: true },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error marking milestone celebrated:', error);
    return NextResponse.json(
      { error: 'Failed to update milestone' },
      { status: 500 }
    );
  }
}
```

**Step 2: Verify the file**

Run: `cd /Users/laurenjohnston/Documents/vethub2.0 && npx tsc --noEmit src/app/api/residency/milestones/route.ts`
Expected: No errors

**Step 3: Commit API routes**

```bash
cd /Users/laurenjohnston/Documents/vethub2.0
git add src/app/api/residency/
git commit -m "feat(residency): add API routes for stats tracking

- daily-entry: CRUD for daily MRI/appointment counts
- surgery: CRUD with participation levels (S/O/C/D/K)
- stats: aggregated totals, weekly data, LMRI+ accuracy
- milestones: automatic milestone detection and celebration"
```

---

## Phase 3: React Hooks

### Task 3.1: Create useResidencyStats Hook

**Files:**
- Create: `src/hooks/useResidencyStats.ts`

**Step 1: Create the main stats hook**

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface DailyEntry {
  id: string;
  date: string;
  mriCount: number;
  recheckCount: number;
  newCount: number;
  totalCases: number;
  notes?: string;
  surgeries: Surgery[];
  lmriEntries: LMRIEntry[];
}

interface Surgery {
  id: string;
  dailyEntryId: string;
  procedureName: string;
  participation: 'S' | 'O' | 'C' | 'D' | 'K';
  patientName?: string;
  notes?: string;
}

interface LMRIEntry {
  id: string;
  dailyEntryId: string;
  predictedLocalization: string;
  actualLocalization: string;
  localizationCorrect: boolean;
  lateralityCorrect?: boolean;
  bonusFind: boolean;
}

interface Stats {
  totals: {
    mriCount: number;
    recheckCount: number;
    newCount: number;
    totalCases: number;
    totalAppointments: number;
  };
  surgeryBreakdown: {
    S: number;
    O: number;
    C: number;
    D: number;
    K: number;
    total: number;
  };
  lmriStats: {
    total: number;
    localizationCorrect: number;
    lateralityCorrect: number;
    bonusFinds: number;
    accuracy: number;
  };
  weeklyData: DailyEntry[];
  milestones: Array<{ id: string; type: string; count: number; achievedAt: string }>;
  badges: Array<{ id: string; badgeId: string; name: string; description: string; icon?: string }>;
  daysUntilFreedom: number | null;
  daysLogged: number;
}

export function useResidencyStats() {
  return useQuery<Stats>({
    queryKey: ['residency-stats'],
    queryFn: async () => {
      const res = await fetch('/api/residency/stats');
      if (!res.ok) throw new Error('Failed to fetch stats');
      return res.json();
    },
  });
}

export function useDailyEntry(date: string) {
  return useQuery<DailyEntry | null>({
    queryKey: ['daily-entry', date],
    queryFn: async () => {
      const res = await fetch(`/api/residency/daily-entry?date=${date}`);
      if (!res.ok) throw new Error('Failed to fetch daily entry');
      return res.json();
    },
  });
}

export function useSaveDailyEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      date: string;
      mriCount: number;
      recheckCount: number;
      newCount: number;
      notes?: string;
    }) => {
      const res = await fetch('/api/residency/daily-entry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to save daily entry');
      return res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['daily-entry', variables.date] });
      queryClient.invalidateQueries({ queryKey: ['residency-stats'] });
      queryClient.invalidateQueries({ queryKey: ['milestones'] });
    },
  });
}

export function useAddSurgery() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      dailyEntryId: string;
      procedureName: string;
      participation: 'S' | 'O' | 'C' | 'D' | 'K';
      patientName?: string;
      notes?: string;
    }) => {
      const res = await fetch('/api/residency/surgery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to add surgery');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['daily-entry'] });
      queryClient.invalidateQueries({ queryKey: ['residency-stats'] });
      queryClient.invalidateQueries({ queryKey: ['milestones'] });
    },
  });
}

export function useDeleteSurgery() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/residency/surgery?id=${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete surgery');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['daily-entry'] });
      queryClient.invalidateQueries({ queryKey: ['residency-stats'] });
    },
  });
}

export function useMilestones() {
  return useQuery({
    queryKey: ['milestones'],
    queryFn: async () => {
      const res = await fetch('/api/residency/milestones');
      if (!res.ok) throw new Error('Failed to fetch milestones');
      return res.json();
    },
  });
}

export function useCelebrateMilestone() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (milestoneId: string) => {
      const res = await fetch('/api/residency/milestones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ milestoneId }),
      });
      if (!res.ok) throw new Error('Failed to celebrate milestone');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['milestones'] });
      queryClient.invalidateQueries({ queryKey: ['residency-stats'] });
    },
  });
}
```

**Step 2: Verify the hook compiles**

Run: `cd /Users/laurenjohnston/Documents/vethub2.0 && npx tsc --noEmit src/hooks/useResidencyStats.ts`
Expected: No errors

**Step 3: Commit the hook**

```bash
cd /Users/laurenjohnston/Documents/vethub2.0
git add src/hooks/useResidencyStats.ts
git commit -m "feat(residency): add TanStack Query hooks for stats tracking"
```

---

## Phase 4: UI Components

### Task 4.1: Create DailyEntryForm Component

**Files:**
- Create: `src/components/residency/DailyEntryForm.tsx`

**Step 1: Create the daily entry form component**

```typescript
'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useDailyEntry, useSaveDailyEntry } from '@/hooks/useResidencyStats';
import { Calendar, Stethoscope, Brain, Users, Loader2 } from 'lucide-react';

interface DailyEntryFormProps {
  selectedDate?: string;
  onSaved?: () => void;
}

export function DailyEntryForm({ selectedDate, onSaved }: DailyEntryFormProps) {
  const today = format(new Date(), 'yyyy-MM-dd');
  const date = selectedDate || today;

  const { data: existingEntry, isLoading } = useDailyEntry(date);
  const saveMutation = useSaveDailyEntry();

  const [formData, setFormData] = useState({
    mriCount: 0,
    recheckCount: 0,
    newCount: 0,
    notes: '',
  });

  // Load existing data when entry is fetched
  useEffect(() => {
    if (existingEntry) {
      setFormData({
        mriCount: existingEntry.mriCount,
        recheckCount: existingEntry.recheckCount,
        newCount: existingEntry.newCount,
        notes: existingEntry.notes || '',
      });
    } else {
      setFormData({ mriCount: 0, recheckCount: 0, newCount: 0, notes: '' });
    }
  }, [existingEntry]);

  const handleSave = async () => {
    await saveMutation.mutateAsync({ date, ...formData });
    onSaved?.();
  };

  const totalCases = formData.mriCount + formData.recheckCount + formData.newCount;

  if (isLoading) {
    return (
      <Card className="neo-card">
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="neo-card">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Calendar className="h-5 w-5 text-primary" />
          Daily Entry - {format(new Date(date + 'T12:00:00'), 'EEEE, MMM d, yyyy')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* MRI Count */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Brain className="h-4 w-4 text-purple-500" />
            MRIs
          </Label>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setFormData((d) => ({ ...d, mriCount: Math.max(0, d.mriCount - 1) }))}
            >
              -
            </Button>
            <Input
              type="number"
              min={0}
              value={formData.mriCount}
              onChange={(e) => setFormData((d) => ({ ...d, mriCount: parseInt(e.target.value) || 0 }))}
              className="w-20 text-center"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => setFormData((d) => ({ ...d, mriCount: d.mriCount + 1 }))}
            >
              +
            </Button>
          </div>
        </div>

        {/* Appointments - Recheck */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Users className="h-4 w-4 text-blue-500" />
            Recheck Appointments
          </Label>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setFormData((d) => ({ ...d, recheckCount: Math.max(0, d.recheckCount - 1) }))}
            >
              -
            </Button>
            <Input
              type="number"
              min={0}
              value={formData.recheckCount}
              onChange={(e) => setFormData((d) => ({ ...d, recheckCount: parseInt(e.target.value) || 0 }))}
              className="w-20 text-center"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => setFormData((d) => ({ ...d, recheckCount: d.recheckCount + 1 }))}
            >
              +
            </Button>
          </div>
        </div>

        {/* Appointments - New */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Stethoscope className="h-4 w-4 text-green-500" />
            New Appointments
          </Label>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setFormData((d) => ({ ...d, newCount: Math.max(0, d.newCount - 1) }))}
            >
              -
            </Button>
            <Input
              type="number"
              min={0}
              value={formData.newCount}
              onChange={(e) => setFormData((d) => ({ ...d, newCount: parseInt(e.target.value) || 0 }))}
              className="w-20 text-center"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => setFormData((d) => ({ ...d, newCount: d.newCount + 1 }))}
            >
              +
            </Button>
          </div>
        </div>

        {/* Notes */}
        <div className="space-y-2">
          <Label>Notes (optional)</Label>
          <Textarea
            value={formData.notes}
            onChange={(e) => setFormData((d) => ({ ...d, notes: e.target.value }))}
            placeholder="Interesting cases, learnings, etc."
            rows={2}
          />
        </div>

        {/* Total & Save */}
        <div className="flex items-center justify-between pt-2 border-t">
          <div className="text-sm text-muted-foreground">
            Total cases today: <span className="font-semibold text-foreground">{totalCases}</span>
          </div>
          <Button onClick={handleSave} disabled={saveMutation.isPending}>
            {saveMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : existingEntry ? (
              'Update Entry'
            ) : (
              'Save Entry'
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
```

**Step 2: Verify it compiles**

Run: `cd /Users/laurenjohnston/Documents/vethub2.0 && npx tsc --noEmit src/components/residency/DailyEntryForm.tsx`
Expected: No errors (or manageable type issues)

---

### Task 4.2: Create SurgeryTracker Component

**Files:**
- Create: `src/components/residency/SurgeryTracker.tsx`

**Step 1: Create the surgery tracker with participation levels**

```typescript
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAddSurgery, useDeleteSurgery } from '@/hooks/useResidencyStats';
import { Scissors, Plus, Trash2, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Surgery {
  id: string;
  procedureName: string;
  participation: 'S' | 'O' | 'C' | 'D' | 'K';
  patientName?: string;
}

interface SurgeryTrackerProps {
  dailyEntryId: string | null;
  surgeries: Surgery[];
  onNeedsDailyEntry?: () => void;
}

const PARTICIPATION_LABELS: Record<string, { label: string; description: string; color: string }> = {
  S: { label: 'Surgeon', description: 'Primary surgeon', color: 'bg-green-500' },
  O: { label: 'Observer', description: 'Observing only', color: 'bg-gray-400' },
  C: { label: 'Circulator', description: 'Circulating/assisting', color: 'bg-blue-400' },
  D: { label: 'Dissector', description: 'Dissecting/exposing', color: 'bg-yellow-500' },
  K: { label: 'Knife', description: 'Cutting/suturing assistant', color: 'bg-orange-500' },
};

const COMMON_PROCEDURES = [
  'Hemilaminectomy',
  'Ventral Slot',
  'Craniotomy',
  'Foramen Magnum Decompression',
  'Atlantoaxial Stabilization',
  'Lumbosacral Dorsal Laminectomy',
  'Lateral Corpectomy',
  'VP Shunt',
  'Peripheral Nerve Biopsy',
  'Muscle Biopsy',
];

export function SurgeryTracker({ dailyEntryId, surgeries, onNeedsDailyEntry }: SurgeryTrackerProps) {
  const addMutation = useAddSurgery();
  const deleteMutation = useDeleteSurgery();

  const [showForm, setShowForm] = useState(false);
  const [newSurgery, setNewSurgery] = useState({
    procedureName: '',
    participation: 'O' as const,
    patientName: '',
  });

  const handleAdd = async () => {
    if (!dailyEntryId) {
      onNeedsDailyEntry?.();
      return;
    }
    if (!newSurgery.procedureName) return;

    await addMutation.mutateAsync({
      dailyEntryId,
      procedureName: newSurgery.procedureName,
      participation: newSurgery.participation,
      patientName: newSurgery.patientName || undefined,
    });

    setNewSurgery({ procedureName: '', participation: 'O', patientName: '' });
    setShowForm(false);
  };

  const handleDelete = async (id: string) => {
    await deleteMutation.mutateAsync(id);
  };

  return (
    <Card className="neo-card">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2 text-lg">
            <Scissors className="h-5 w-5 text-red-500" />
            Surgeries Today
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowForm(!showForm)}
          >
            <Plus className="h-4 w-4 mr-1" />
            Add Surgery
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Add Surgery Form */}
        {showForm && (
          <div className="p-4 border rounded-lg bg-muted/50 space-y-3">
            <div className="space-y-2">
              <Label>Procedure</Label>
              <Select
                value={newSurgery.procedureName}
                onValueChange={(v) => setNewSurgery((s) => ({ ...s, procedureName: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select or type procedure..." />
                </SelectTrigger>
                <SelectContent>
                  {COMMON_PROCEDURES.map((proc) => (
                    <SelectItem key={proc} value={proc}>
                      {proc}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                placeholder="Or type custom procedure..."
                value={newSurgery.procedureName}
                onChange={(e) => setNewSurgery((s) => ({ ...s, procedureName: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label>Your Role</Label>
              <div className="grid grid-cols-5 gap-2">
                {Object.entries(PARTICIPATION_LABELS).map(([key, { label, color }]) => (
                  <Button
                    key={key}
                    variant={newSurgery.participation === key ? 'default' : 'outline'}
                    size="sm"
                    className={cn(
                      'flex flex-col h-auto py-2',
                      newSurgery.participation === key && color
                    )}
                    onClick={() => setNewSurgery((s) => ({ ...s, participation: key as Surgery['participation'] }))}
                  >
                    <span className="font-bold">{key}</span>
                    <span className="text-xs opacity-80">{label}</span>
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Patient Name (optional)</Label>
              <Input
                placeholder="e.g., Max, Bella..."
                value={newSurgery.patientName}
                onChange={(e) => setNewSurgery((s) => ({ ...s, patientName: e.target.value }))}
              />
            </div>

            <div className="flex gap-2 pt-2">
              <Button onClick={handleAdd} disabled={!newSurgery.procedureName || addMutation.isPending}>
                {addMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Add Surgery
              </Button>
              <Button variant="ghost" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Surgery List */}
        {surgeries.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No surgeries logged today
          </p>
        ) : (
          <div className="space-y-2">
            {surgeries.map((surgery) => (
              <div
                key={surgery.id}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      'w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm',
                      PARTICIPATION_LABELS[surgery.participation].color
                    )}
                  >
                    {surgery.participation}
                  </div>
                  <div>
                    <p className="font-medium">{surgery.procedureName}</p>
                    <p className="text-sm text-muted-foreground">
                      {PARTICIPATION_LABELS[surgery.participation].description}
                      {surgery.patientName && ` • ${surgery.patientName}`}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDelete(surgery.id)}
                  disabled={deleteMutation.isPending}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
```

**Step 2: Verify compilation**

Run: `cd /Users/laurenjohnston/Documents/vethub2.0 && npx tsc --noEmit src/components/residency/SurgeryTracker.tsx`
Expected: No errors

---

### Task 4.3: Create StatsOverview Component

**Files:**
- Create: `src/components/residency/StatsOverview.tsx`

**Step 1: Create the stats overview with counters and progress**

```typescript
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useResidencyStats } from '@/hooks/useResidencyStats';
import { Brain, Users, Scissors, Calendar, Target, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

// Next milestone thresholds
const NEXT_MILESTONES = {
  mri: [50, 100, 150, 200, 250, 300, 350, 400, 450, 500],
  appointment: [25, 50, 75, 100, 150, 200, 250, 300, 400, 500],
  surgery: [10, 25, 50, 75, 100, 150, 200],
};

function getNextMilestone(current: number, thresholds: number[]): number {
  return thresholds.find((t) => t > current) || thresholds[thresholds.length - 1];
}

function getProgress(current: number, next: number, thresholds: number[]): number {
  const prev = thresholds.filter((t) => t < next).pop() || 0;
  const range = next - prev;
  const progress = current - prev;
  return Math.min(100, Math.round((progress / range) * 100));
}

export function StatsOverview() {
  const { data: stats, isLoading } = useResidencyStats();

  if (isLoading || !stats) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const { totals, surgeryBreakdown, daysUntilFreedom, daysLogged } = stats;

  const nextMriMilestone = getNextMilestone(totals.mriCount, NEXT_MILESTONES.mri);
  const nextApptMilestone = getNextMilestone(totals.totalAppointments, NEXT_MILESTONES.appointment);
  const nextSurgeryMilestone = getNextMilestone(surgeryBreakdown.total, NEXT_MILESTONES.surgery);

  const mriProgress = getProgress(totals.mriCount, nextMriMilestone, NEXT_MILESTONES.mri);
  const apptProgress = getProgress(totals.totalAppointments, nextApptMilestone, NEXT_MILESTONES.appointment);
  const surgeryProgress = getProgress(surgeryBreakdown.total, nextSurgeryMilestone, NEXT_MILESTONES.surgery);

  return (
    <div className="space-y-6">
      {/* Days Until Freedom */}
      {daysUntilFreedom !== null && (
        <Card className="neo-card bg-gradient-to-r from-purple-500/10 to-pink-500/10 border-purple-500/20">
          <CardContent className="py-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Days Until Freedom</p>
                <p className="text-4xl font-bold text-purple-500">{daysUntilFreedom}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Days Logged</p>
                <p className="text-2xl font-semibold">{daysLogged}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* MRI Counter */}
        <Card className="neo-card">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Brain className="h-5 w-5 text-purple-500" />
              MRIs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totals.mriCount}</div>
            <div className="mt-2 space-y-1">
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Next: {nextMriMilestone}</span>
                <span>{totals.mriCount}/{nextMriMilestone}</span>
              </div>
              <Progress value={mriProgress} className="h-2" />
            </div>
          </CardContent>
        </Card>

        {/* Appointments Counter */}
        <Card className="neo-card">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="h-5 w-5 text-blue-500" />
              Appointments
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totals.totalAppointments}</div>
            <div className="flex gap-4 text-sm text-muted-foreground mt-1">
              <span>Recheck: {totals.recheckCount}</span>
              <span>New: {totals.newCount}</span>
            </div>
            <div className="mt-2 space-y-1">
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Next: {nextApptMilestone}</span>
                <span>{totals.totalAppointments}/{nextApptMilestone}</span>
              </div>
              <Progress value={apptProgress} className="h-2" />
            </div>
          </CardContent>
        </Card>

        {/* Surgeries Counter */}
        <Card className="neo-card">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Scissors className="h-5 w-5 text-red-500" />
              Surgeries
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{surgeryBreakdown.total}</div>
            <div className="flex flex-wrap gap-2 text-sm mt-1">
              {Object.entries(surgeryBreakdown)
                .filter(([k]) => k !== 'total')
                .map(([role, count]) => (
                  <span
                    key={role}
                    className={cn(
                      'px-2 py-0.5 rounded-full text-xs font-medium',
                      role === 'S' && 'bg-green-500/20 text-green-700',
                      role === 'O' && 'bg-gray-400/20 text-gray-600',
                      role === 'C' && 'bg-blue-400/20 text-blue-700',
                      role === 'D' && 'bg-yellow-500/20 text-yellow-700',
                      role === 'K' && 'bg-orange-500/20 text-orange-700'
                    )}
                  >
                    {role}: {count}
                  </span>
                ))}
            </div>
            <div className="mt-2 space-y-1">
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Next: {nextSurgeryMilestone}</span>
                <span>{surgeryBreakdown.total}/{nextSurgeryMilestone}</span>
              </div>
              <Progress value={surgeryProgress} className="h-2" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Total Cases */}
      <Card className="neo-card">
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              <span className="font-medium">Total Cases</span>
            </div>
            <span className="text-2xl font-bold">{totals.totalCases + surgeryBreakdown.total}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
```

**Step 2: Verify compilation**

Run: `cd /Users/laurenjohnston/Documents/vethub2.0 && npx tsc --noEmit src/components/residency/StatsOverview.tsx`
Expected: No errors

**Step 3: Commit UI components**

```bash
cd /Users/laurenjohnston/Documents/vethub2.0
git add src/components/residency/
git commit -m "feat(residency): add stats tracking UI components

- DailyEntryForm: log MRIs, appointments with +/- buttons
- SurgeryTracker: add surgeries with S/O/C/D/K participation
- StatsOverview: counters with progress to next milestone"
```

---

## Phase 5: Integration

### Task 5.1: Add Stats Tab to Residency Page

**Files:**
- Modify: `src/app/residency/page.tsx`

**Step 1: Import the new components at the top of the file**

Add after existing imports:

```typescript
import { DailyEntryForm } from '@/components/residency/DailyEntryForm';
import { SurgeryTracker } from '@/components/residency/SurgeryTracker';
import { StatsOverview } from '@/components/residency/StatsOverview';
import { useDailyEntry } from '@/hooks/useResidencyStats';
import { format } from 'date-fns';
```

**Step 2: Add "Stats" to the tabs array**

Find the tabs definition and add "Stats" tab:

```typescript
const tabs = ['Cases', 'Journal', 'Schedule', 'Summary', 'Stats'];
```

**Step 3: Add Stats tab content**

Inside the TabsContent mapping or switch statement, add the Stats tab:

```typescript
{activeTab === 'Stats' && (
  <StatsTabContent />
)}
```

**Step 4: Create the StatsTabContent component (add at bottom of file before final export)**

```typescript
function StatsTabContent() {
  const today = format(new Date(), 'yyyy-MM-dd');
  const { data: todayEntry } = useDailyEntry(today);

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <StatsOverview />

      {/* Two-column layout for daily entry + surgeries */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DailyEntryForm selectedDate={today} />
        <SurgeryTracker
          dailyEntryId={todayEntry?.id || null}
          surgeries={todayEntry?.surgeries || []}
          onNeedsDailyEntry={() => {
            // Show toast or auto-create entry
            console.log('Need to save daily entry first');
          }}
        />
      </div>
    </div>
  );
}
```

**Step 5: Verify the page compiles**

Run: `cd /Users/laurenjohnston/Documents/vethub2.0 && npm run typecheck`
Expected: No errors

**Step 6: Commit integration**

```bash
cd /Users/laurenjohnston/Documents/vethub2.0
git add src/app/residency/page.tsx
git commit -m "feat(residency): integrate Stats tab with daily entry and tracking"
```

---

## Phase 6: Milestone Celebrations

### Task 6.1: Create MilestoneCelebration Component

**Files:**
- Create: `src/components/residency/MilestoneCelebration.tsx`

**Step 1: Create the celebration modal with confetti**

```typescript
'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useMilestones, useCelebrateMilestone } from '@/hooks/useResidencyStats';
import { Trophy, Brain, Users, Scissors, Target, PartyPopper } from 'lucide-react';
import confetti from 'canvas-confetti';

const MILESTONE_CONFIG: Record<string, { icon: React.ElementType; color: string; emoji: string }> = {
  mri: { icon: Brain, color: 'text-purple-500', emoji: '🧠' },
  appointment: { icon: Users, color: 'text-blue-500', emoji: '👥' },
  surgery: { icon: Scissors, color: 'text-red-500', emoji: '✂️' },
  case: { icon: Target, color: 'text-green-500', emoji: '🎯' },
};

const CELEBRATION_MESSAGES = [
  "You're crushing it!",
  "Look at you go!",
  "Neuro superstar!",
  "Keep that momentum!",
  "One step closer to freedom!",
  "The spinal cord would be proud!",
  "Your neurons are firing!",
];

export function MilestoneCelebration() {
  const { data: milestoneData, refetch } = useMilestones();
  const celebrateMutation = useCelebrateMilestone();
  const [currentMilestone, setCurrentMilestone] = useState<{
    id: string;
    type: string;
    count: number;
  } | null>(null);

  useEffect(() => {
    if (milestoneData?.uncelebrated?.length > 0) {
      setCurrentMilestone(milestoneData.uncelebrated[0]);
    }
  }, [milestoneData]);

  useEffect(() => {
    if (currentMilestone) {
      // Fire confetti!
      const duration = 3000;
      const end = Date.now() + duration;

      const frame = () => {
        confetti({
          particleCount: 3,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
          colors: ['#6366f1', '#8b5cf6', '#ec4899'],
        });
        confetti({
          particleCount: 3,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
          colors: ['#6366f1', '#8b5cf6', '#ec4899'],
        });

        if (Date.now() < end) {
          requestAnimationFrame(frame);
        }
      };
      frame();
    }
  }, [currentMilestone]);

  const handleCelebrate = async () => {
    if (!currentMilestone) return;
    await celebrateMutation.mutateAsync(currentMilestone.id);
    setCurrentMilestone(null);
    refetch();
  };

  if (!currentMilestone) return null;

  const config = MILESTONE_CONFIG[currentMilestone.type];
  const Icon = config?.icon || Trophy;
  const message = CELEBRATION_MESSAGES[Math.floor(Math.random() * CELEBRATION_MESSAGES.length)];

  return (
    <Dialog open={!!currentMilestone} onOpenChange={() => handleCelebrate()}>
      <DialogContent className="sm:max-w-md text-center">
        <DialogHeader>
          <DialogTitle className="text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', duration: 0.5 }}
            >
              <PartyPopper className="h-16 w-16 mx-auto text-yellow-500 mb-4" />
            </motion.div>
            <span className="text-2xl">Milestone Achieved!</span>
          </DialogTitle>
        </DialogHeader>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="py-6 space-y-4"
        >
          <div className="flex items-center justify-center gap-3">
            <Icon className={`h-12 w-12 ${config?.color || 'text-primary'}`} />
            <div className="text-left">
              <p className="text-4xl font-bold">{currentMilestone.count}</p>
              <p className="text-muted-foreground capitalize">{currentMilestone.type}s</p>
            </div>
          </div>

          <p className="text-lg text-muted-foreground">{message}</p>

          <div className="text-6xl">{config?.emoji || '🏆'}</div>
        </motion.div>

        <Button onClick={handleCelebrate} size="lg" className="w-full">
          <Trophy className="mr-2 h-5 w-5" />
          Celebrate!
        </Button>
      </DialogContent>
    </Dialog>
  );
}
```

**Step 2: Verify compilation**

Run: `cd /Users/laurenjohnston/Documents/vethub2.0 && npx tsc --noEmit src/components/residency/MilestoneCelebration.tsx`
Expected: No errors

**Step 3: Add MilestoneCelebration to residency page**

Add the component inside the residency page layout:

```typescript
import { MilestoneCelebration } from '@/components/residency/MilestoneCelebration';

// Inside the page component, add:
<MilestoneCelebration />
```

**Step 4: Commit celebration feature**

```bash
cd /Users/laurenjohnston/Documents/vethub2.0
git add src/components/residency/MilestoneCelebration.tsx src/app/residency/page.tsx
git commit -m "feat(residency): add milestone celebration with confetti

- Auto-detect new milestones
- Show celebration modal with animation
- Fire confetti on achievement
- Track celebrated status in database"
```

---

## Phase 7: Weekly Charts

### Task 7.1: Create WeeklyChart Component

**Files:**
- Create: `src/components/residency/WeeklyChart.tsx`

**Step 1: Create the weekly activity chart**

```typescript
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useResidencyStats } from '@/hooks/useResidencyStats';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { format, parseISO, startOfWeek, endOfWeek, eachDayOfInterval, isWithinInterval } from 'date-fns';
import { TrendingUp, Loader2 } from 'lucide-react';

export function WeeklyChart() {
  const { data: stats, isLoading } = useResidencyStats();

  if (isLoading || !stats) {
    return (
      <Card className="neo-card">
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  // Group data by week for last 8 weeks
  const today = new Date();
  const weeks: Array<{
    week: string;
    mri: number;
    recheck: number;
    new: number;
    surgery: number;
  }> = [];

  for (let i = 7; i >= 0; i--) {
    const weekStart = startOfWeek(new Date(today.getTime() - i * 7 * 24 * 60 * 60 * 1000), { weekStartsOn: 1 });
    const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });

    const weekEntries = stats.weeklyData.filter((entry) => {
      const entryDate = parseISO(entry.date);
      return isWithinInterval(entryDate, { start: weekStart, end: weekEnd });
    });

    const weekTotals = weekEntries.reduce(
      (acc, entry) => ({
        mri: acc.mri + entry.mriCount,
        recheck: acc.recheck + entry.recheckCount,
        new: acc.new + entry.newCount,
        surgery: acc.surgery + entry.surgeries.length,
      }),
      { mri: 0, recheck: 0, new: 0, surgery: 0 }
    );

    weeks.push({
      week: format(weekStart, 'MMM d'),
      ...weekTotals,
    });
  }

  return (
    <Card className="neo-card">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          Weekly Activity
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={weeks} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              dataKey="week"
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
            />
            <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
              }}
            />
            <Legend />
            <Bar dataKey="mri" name="MRIs" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
            <Bar dataKey="recheck" name="Rechecks" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            <Bar dataKey="new" name="New Appts" fill="#22c55e" radius={[4, 4, 0, 0]} />
            <Bar dataKey="surgery" name="Surgeries" fill="#ef4444" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
```

**Step 2: Add WeeklyChart to Stats tab**

Update the StatsTabContent in residency/page.tsx:

```typescript
import { WeeklyChart } from '@/components/residency/WeeklyChart';

// Inside StatsTabContent, add after StatsOverview:
<WeeklyChart />
```

**Step 3: Commit chart component**

```bash
cd /Users/laurenjohnston/Documents/vethub2.0
git add src/components/residency/WeeklyChart.tsx src/app/residency/page.tsx
git commit -m "feat(residency): add weekly activity bar chart

- 8-week rolling view
- Stacked bars for MRIs, appointments, surgeries
- Responsive Recharts implementation"
```

---

## Future Phases (Scope for Later)

### Phase 8: LMRI+ Localization Tracking
- Create LMRIEntryForm component
- Add LMRI accuracy chart
- Track predictions vs MRI results

### Phase 9: Bingo Cards
- Create BingoCard component
- Weekly card generation logic
- Rare diagnosis permanent card
- Completion celebration

### Phase 10: Badge System
- Define badge criteria
- Create BadgeDisplay component
- Automatic badge awarding
- Badge showcase

---

## Summary of Files Created/Modified

**New Files:**
- `prisma/schema.prisma` (modified - added 6 models)
- `src/app/api/residency/daily-entry/route.ts`
- `src/app/api/residency/surgery/route.ts`
- `src/app/api/residency/stats/route.ts`
- `src/app/api/residency/milestones/route.ts`
- `src/hooks/useResidencyStats.ts`
- `src/components/residency/DailyEntryForm.tsx`
- `src/components/residency/SurgeryTracker.tsx`
- `src/components/residency/StatsOverview.tsx`
- `src/components/residency/MilestoneCelebration.tsx`
- `src/components/residency/WeeklyChart.tsx`

**Modified Files:**
- `src/app/residency/page.tsx` (add Stats tab)

---

## Testing Checklist

- [ ] Daily entry saves and loads correctly
- [ ] Surgery participation levels work (S/O/C/D/K)
- [ ] Stats aggregate correctly
- [ ] Milestone detection triggers celebration
- [ ] Confetti fires on milestone
- [ ] Weekly chart displays data
- [ ] Mobile responsive design
- [ ] Dark mode compatible

---

**Plan complete and saved to `docs/plans/2026-01-02-residency-stats-tracker.md`.**
