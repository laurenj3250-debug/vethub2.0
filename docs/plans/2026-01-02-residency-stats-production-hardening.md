# Residency Stats Production Hardening Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Elevate the residency stats feature to Google-engineer production quality with proper error handling, optimistic updates, loading states, mobile UX, centralized config, and comprehensive tests.

**Architecture:** Apply defensive programming patterns throughout - error boundaries at component level, optimistic updates for instant feedback, skeleton loaders for perceived performance, centralized milestone config as single source of truth, and Playwright E2E tests for critical paths.

**Tech Stack:** TanStack Query v5 (optimistic updates), react-error-boundary, existing shadcn toast/skeleton, Playwright, CSS animations for confetti (no JS library)

**Research Sources:**
- [TanStack Query Optimistic Updates](https://tanstack.com/query/v5/docs/react/guides/optimistic-updates)
- [react-error-boundary](https://github.com/bvaughn/react-error-boundary)
- [Next.js 15 Streaming Handbook](https://www.freecodecamp.org/news/the-nextjs-15-streaming-handbook/)
- [LogRocket Toast Comparison 2025](https://blog.logrocket.com/react-toast-libraries-compared-2025/)
- [Playwright Next.js Testing](https://nextjs.org/docs/pages/guides/testing/playwright)

---

## Phase 1: Centralized Configuration (DRY)

### Task 1.1: Create Milestone Configuration Module

**Files:**
- Create: `src/lib/residency-milestones.ts`

**Step 1: Create centralized milestone config**

```typescript
// src/lib/residency-milestones.ts
// Single source of truth for milestone thresholds, labels, and styling

export const MILESTONE_THRESHOLDS = {
  mri: [50, 100, 150, 200, 250, 300, 350, 400, 450, 500],
  appointment: [25, 50, 75, 100, 150, 200, 250, 300, 400, 500],
  surgery: [10, 25, 50, 75, 100, 150, 200],
  case: [100, 250, 500, 750, 1000, 1500, 2000],
} as const;

export type MilestoneType = keyof typeof MILESTONE_THRESHOLDS;

export const MILESTONE_CONFIG: Record<MilestoneType, {
  label: string;
  emoji: string;
  color: string;
  bgColor: string;
}> = {
  mri: { label: 'MRIs', emoji: '🧠', color: 'text-purple-500', bgColor: 'bg-purple-500' },
  appointment: { label: 'Appointments', emoji: '👥', color: 'text-blue-500', bgColor: 'bg-blue-500' },
  surgery: { label: 'Surgeries', emoji: '✂️', color: 'text-red-500', bgColor: 'bg-red-500' },
  case: { label: 'Total Cases', emoji: '🎯', color: 'text-green-500', bgColor: 'bg-green-500' },
};

export const PARTICIPATION_LEVELS = {
  S: { label: 'Surgeon', description: 'Primary surgeon', color: 'bg-green-500', textColor: 'text-green-700' },
  O: { label: 'Observer', description: 'Observing only', color: 'bg-gray-400', textColor: 'text-gray-600' },
  C: { label: 'Circulator', description: 'Circulating/assisting', color: 'bg-blue-400', textColor: 'text-blue-700' },
  D: { label: 'Dissector', description: 'Dissecting/exposing', color: 'bg-yellow-500', textColor: 'text-yellow-700' },
  K: { label: 'Knife', description: 'Cutting/suturing assistant', color: 'bg-orange-500', textColor: 'text-orange-700' },
} as const;

export type ParticipationLevel = keyof typeof PARTICIPATION_LEVELS;

export const COMMON_PROCEDURES = [
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
] as const;

export const CELEBRATION_MESSAGES = [
  "You're crushing it!",
  "Look at you go!",
  "Neuro superstar!",
  "Keep that momentum!",
  "One step closer to freedom!",
  "The spinal cord would be proud!",
  "Your neurons are firing!",
  "Myelin would be jealous!",
  "Axons of steel!",
  "Textbook localization!",
] as const;

// Utility functions
export function getNextMilestone(current: number, type: MilestoneType): number {
  const thresholds = MILESTONE_THRESHOLDS[type];
  return thresholds.find((t) => t > current) || thresholds[thresholds.length - 1];
}

export function getMilestoneProgress(current: number, type: MilestoneType): number {
  const thresholds = MILESTONE_THRESHOLDS[type];
  const next = getNextMilestone(current, type);
  const prev = thresholds.filter((t) => t < next).pop() || 0;
  const range = next - prev;
  const progress = current - prev;
  return range > 0 ? Math.min(100, Math.round((progress / range) * 100)) : 100;
}

export function getRandomCelebrationMessage(): string {
  return CELEBRATION_MESSAGES[Math.floor(Math.random() * CELEBRATION_MESSAGES.length)];
}
```

**Step 2: Commit config module**

```bash
git add src/lib/residency-milestones.ts
git commit -m "refactor(residency): centralize milestone config as single source of truth"
```

---

### Task 1.2: Update API to Use Centralized Config

**Files:**
- Modify: `src/app/api/residency/milestones/route.ts`

**Step 1: Import and use centralized config**

Replace the hardcoded MILESTONES object with import:

```typescript
import { MILESTONE_THRESHOLDS } from '@/lib/residency-milestones';

// Remove the old MILESTONES constant and use MILESTONE_THRESHOLDS instead
// Update references from MILESTONES to MILESTONE_THRESHOLDS
```

**Step 2: Update StatsOverview to use centralized config**

**Files:**
- Modify: `src/components/residency/StatsOverview.tsx`

Replace local constants with imports:

```typescript
import {
  MILESTONE_THRESHOLDS,
  MILESTONE_CONFIG,
  getNextMilestone,
  getMilestoneProgress
} from '@/lib/residency-milestones';

// Remove local NEXT_MILESTONES, getNextMilestone, getProgress functions
```

**Step 3: Update SurgeryTracker to use centralized config**

**Files:**
- Modify: `src/components/residency/SurgeryTracker.tsx`

```typescript
import {
  PARTICIPATION_LEVELS,
  COMMON_PROCEDURES,
  type ParticipationLevel
} from '@/lib/residency-milestones';

// Remove local PARTICIPATION_LABELS and COMMON_PROCEDURES
```

**Step 4: Commit**

```bash
git add -A
git commit -m "refactor(residency): use centralized config across all components"
```

---

## Phase 2: Error Boundaries

### Task 2.1: Create Stats-Specific Error Boundary

**Files:**
- Create: `src/components/residency/StatsErrorBoundary.tsx`

**Step 1: Create a lightweight error boundary for the stats tab**

```typescript
'use client';

import { ErrorBoundary as ReactErrorBoundary } from 'react-error-boundary';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface ErrorFallbackProps {
  error: Error;
  resetErrorBoundary: () => void;
}

function ErrorFallback({ error, resetErrorBoundary }: ErrorFallbackProps) {
  return (
    <Card className="border-destructive">
      <CardContent className="py-8">
        <div className="flex flex-col items-center text-center gap-4">
          <div className="p-3 rounded-full bg-destructive/10">
            <AlertTriangle className="h-8 w-8 text-destructive" />
          </div>
          <div>
            <h3 className="font-semibold text-lg">Something went wrong</h3>
            <p className="text-sm text-muted-foreground mt-1">
              {error.message || 'An unexpected error occurred'}
            </p>
          </div>
          <Button onClick={resetErrorBoundary} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Try again
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

interface StatsErrorBoundaryProps {
  children: React.ReactNode;
  onReset?: () => void;
}

export function StatsErrorBoundary({ children, onReset }: StatsErrorBoundaryProps) {
  return (
    <ReactErrorBoundary
      FallbackComponent={ErrorFallback}
      onReset={onReset}
      onError={(error, info) => {
        // Log to your error monitoring service
        console.error('[StatsErrorBoundary]', error, info);
      }}
    >
      {children}
    </ReactErrorBoundary>
  );
}
```

**Step 2: Install react-error-boundary**

```bash
npm install react-error-boundary
```

**Step 3: Wrap stats components with error boundaries**

Update `src/app/residency/page.tsx` StatsTabContent:

```typescript
import { StatsErrorBoundary } from '@/components/residency/StatsErrorBoundary';

function StatsTabContent() {
  const today = format(new Date(), 'yyyy-MM-dd');
  const { data: todayEntry } = useDailyEntry(today);

  return (
    <div className="space-y-6">
      <StatsErrorBoundary>
        <StatsOverview />
      </StatsErrorBoundary>

      <StatsErrorBoundary>
        <WeeklyChart />
      </StatsErrorBoundary>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <StatsErrorBoundary>
          <DailyEntryForm selectedDate={today} />
        </StatsErrorBoundary>
        <StatsErrorBoundary>
          <SurgeryTracker
            dailyEntryId={todayEntry?.id || null}
            surgeries={todayEntry?.surgeries || []}
          />
        </StatsErrorBoundary>
      </div>
    </div>
  );
}
```

**Step 4: Commit**

```bash
git add -A
git commit -m "feat(residency): add component-level error boundaries for graceful failure"
```

---

## Phase 3: Skeleton Loading States

### Task 3.1: Create Stats Skeleton Components

**Files:**
- Create: `src/components/residency/StatsSkeletons.tsx`

**Step 1: Create skeleton components**

```typescript
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

export function StatsOverviewSkeleton() {
  return (
    <div className="space-y-6">
      {/* Days Until Freedom Skeleton */}
      <Card className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 border-purple-500/20">
        <CardContent className="py-6">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-10 w-20" />
            </div>
            <div className="space-y-2 text-right">
              <Skeleton className="h-4 w-24 ml-auto" />
              <Skeleton className="h-8 w-16 ml-auto" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Grid Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <Skeleton className="h-5 w-5 rounded" />
                <Skeleton className="h-5 w-20" />
              </div>
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16 mb-2" />
              <Skeleton className="h-2 w-full mt-4" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Total Cases Skeleton */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Skeleton className="h-5 w-5 rounded" />
              <Skeleton className="h-5 w-24" />
            </div>
            <Skeleton className="h-8 w-16" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function WeeklyChartSkeleton() {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-5 rounded" />
          <Skeleton className="h-5 w-32" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] flex items-end justify-between gap-2 px-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-2">
              <Skeleton
                className="w-full rounded-t"
                style={{ height: `${Math.random() * 150 + 50}px` }}
              />
              <Skeleton className="h-3 w-10" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function DailyEntryFormSkeleton() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-5 rounded" />
          <Skeleton className="h-5 w-48" />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-4 w-32" />
            <div className="flex items-center gap-2">
              <Skeleton className="h-9 w-9 rounded" />
              <Skeleton className="h-9 w-20" />
              <Skeleton className="h-9 w-9 rounded" />
            </div>
          </div>
        ))}
        <Skeleton className="h-20 w-full" />
        <div className="flex justify-between pt-2 border-t">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-9 w-28" />
        </div>
      </CardContent>
    </Card>
  );
}

export function SurgeryTrackerSkeleton() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-5 rounded" />
            <Skeleton className="h-5 w-32" />
          </div>
          <Skeleton className="h-9 w-28" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {[1, 2].map((i) => (
            <div key={i} className="flex items-center gap-3 p-3 border rounded-lg">
              <Skeleton className="h-8 w-8 rounded-full" />
              <div className="flex-1 space-y-1">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-48" />
              </div>
              <Skeleton className="h-8 w-8 rounded" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
```

**Step 2: Update components to use skeletons**

Update StatsOverview.tsx:

```typescript
import { StatsOverviewSkeleton } from './StatsSkeletons';

export function StatsOverview() {
  const { data: stats, isLoading } = useResidencyStats();

  if (isLoading) {
    return <StatsOverviewSkeleton />;
  }
  // ... rest of component
}
```

Apply similar pattern to WeeklyChart, DailyEntryForm, SurgeryTracker.

**Step 3: Commit**

```bash
git add -A
git commit -m "feat(residency): add skeleton loading states for perceived performance"
```

---

## Phase 4: Toast Notifications

### Task 4.1: Add Toast Feedback to Mutations

**Files:**
- Modify: `src/hooks/useResidencyStats.ts`
- Modify: `src/components/residency/DailyEntryForm.tsx`
- Modify: `src/components/residency/SurgeryTracker.tsx`

**Step 1: Update hooks to support toast callbacks**

```typescript
// In useResidencyStats.ts, update useSaveDailyEntry:

export function useSaveDailyEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { /* ... */ }) => { /* ... */ },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['daily-entry', variables.date] });
      queryClient.invalidateQueries({ queryKey: ['residency-stats'] });
      queryClient.invalidateQueries({ queryKey: ['milestones'] });
    },
    // Let components handle toast - more flexible
  });
}
```

**Step 2: Add toast to DailyEntryForm**

```typescript
import { useToast } from '@/hooks/use-toast';

export function DailyEntryForm({ selectedDate, onSaved }: DailyEntryFormProps) {
  const { toast } = useToast();
  // ... existing code

  const handleSave = async () => {
    try {
      await saveMutation.mutateAsync({ date, ...formData });
      toast({
        title: 'Entry saved',
        description: `${totalCases} cases logged for today`,
      });
      onSaved?.();
    } catch (error) {
      toast({
        title: 'Failed to save',
        description: 'Please try again',
        variant: 'destructive',
      });
    }
  };
  // ...
}
```

**Step 3: Add toast to SurgeryTracker**

```typescript
import { useToast } from '@/hooks/use-toast';

export function SurgeryTracker({ /* ... */ }: SurgeryTrackerProps) {
  const { toast } = useToast();
  // ... existing code

  const handleAdd = async () => {
    if (!dailyEntryId) {
      toast({
        title: 'Save daily entry first',
        description: 'Log your daily counts before adding surgeries',
        variant: 'destructive',
      });
      return;
    }
    // ... rest of function
    try {
      await addMutation.mutateAsync({ /* ... */ });
      toast({
        title: 'Surgery added',
        description: `${newSurgery.procedureName} logged as ${PARTICIPATION_LEVELS[newSurgery.participation].label}`,
      });
      // ... reset form
    } catch (error) {
      toast({
        title: 'Failed to add surgery',
        description: 'Please try again',
        variant: 'destructive',
      });
    }
  };
  // ...
}
```

**Step 4: Commit**

```bash
git add -A
git commit -m "feat(residency): add toast notifications for save feedback"
```

---

## Phase 5: Optimistic Updates

### Task 5.1: Implement Optimistic Updates for Daily Entry

**Files:**
- Modify: `src/hooks/useResidencyStats.ts`

**Step 1: Update useSaveDailyEntry with optimistic updates**

```typescript
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

    // Optimistic update
    onMutate: async (newData) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['daily-entry', newData.date] });

      // Snapshot previous value
      const previousEntry = queryClient.getQueryData(['daily-entry', newData.date]);

      // Optimistically update
      queryClient.setQueryData(['daily-entry', newData.date], (old: DailyEntry | null) => ({
        ...old,
        ...newData,
        id: old?.id || 'temp-' + Date.now(),
        totalCases: newData.mriCount + newData.recheckCount + newData.newCount,
        surgeries: old?.surgeries || [],
        lmriEntries: old?.lmriEntries || [],
      }));

      return { previousEntry };
    },

    onError: (err, newData, context) => {
      // Rollback on error
      if (context?.previousEntry !== undefined) {
        queryClient.setQueryData(['daily-entry', newData.date], context.previousEntry);
      }
    },

    onSettled: (_, __, variables) => {
      // Always refetch after mutation settles
      queryClient.invalidateQueries({ queryKey: ['daily-entry', variables.date] });
      queryClient.invalidateQueries({ queryKey: ['residency-stats'] });
      queryClient.invalidateQueries({ queryKey: ['milestones'] });
    },
  });
}
```

**Step 2: Commit**

```bash
git add -A
git commit -m "feat(residency): implement optimistic updates for instant feedback"
```

---

## Phase 6: Mobile UX Improvements

### Task 6.1: Improve Surgery Participation Selector for Mobile

**Files:**
- Modify: `src/components/residency/SurgeryTracker.tsx`

**Step 1: Redesign participation selector for touch targets**

Replace the 5-column grid with a larger, more touch-friendly layout:

```typescript
{/* Your Role - Mobile-friendly */}
<div className="space-y-2">
  <Label>Your Role</Label>
  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
    {(Object.entries(PARTICIPATION_LEVELS) as [ParticipationLevel, typeof PARTICIPATION_LEVELS[ParticipationLevel]][]).map(([key, config]) => (
      <Button
        key={key}
        type="button"
        variant={newSurgery.participation === key ? 'default' : 'outline'}
        size="lg"
        className={cn(
          'flex flex-col h-auto py-3 min-h-[60px]',
          newSurgery.participation === key && config.color,
          newSurgery.participation === key && 'text-white'
        )}
        onClick={() => setNewSurgery((s) => ({ ...s, participation: key }))}
      >
        <span className="font-bold text-lg">{key}</span>
        <span className="text-xs opacity-80">{config.label}</span>
      </Button>
    ))}
  </div>
</div>
```

**Step 2: Add responsive improvements to DailyEntryForm**

Make +/- buttons larger on mobile:

```typescript
<Button
  variant="outline"
  size="lg"
  className="h-12 w-12 text-xl font-bold"
  onClick={() => setFormData((d) => ({ ...d, mriCount: Math.max(0, d.mriCount - 1) }))}
>
  -
</Button>
<Input
  type="number"
  min={0}
  value={formData.mriCount}
  onChange={(e) => setFormData((d) => ({ ...d, mriCount: parseInt(e.target.value) || 0 }))}
  className="w-24 h-12 text-center text-xl font-semibold"
/>
<Button
  variant="outline"
  size="lg"
  className="h-12 w-12 text-xl font-bold"
  onClick={() => setFormData((d) => ({ ...d, mriCount: d.mriCount + 1 }))}
>
  +
</Button>
```

**Step 3: Commit**

```bash
git add -A
git commit -m "fix(residency): improve mobile touch targets for participation selector"
```

---

## Phase 7: CSS Confetti (No JS Library)

### Task 7.1: Replace canvas-confetti with CSS Animation

**Files:**
- Create: `src/components/residency/CSSConfetti.tsx`
- Modify: `src/components/residency/MilestoneCelebration.tsx`

**Step 1: Create CSS-based confetti component**

```typescript
'use client';

import { useEffect, useState } from 'react';

interface ConfettiPiece {
  id: number;
  x: number;
  delay: number;
  duration: number;
  color: string;
  size: number;
}

const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981'];

export function CSSConfetti({ active }: { active: boolean }) {
  const [pieces, setPieces] = useState<ConfettiPiece[]>([]);

  useEffect(() => {
    if (active) {
      const newPieces: ConfettiPiece[] = Array.from({ length: 50 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        delay: Math.random() * 0.5,
        duration: 2 + Math.random() * 2,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        size: 8 + Math.random() * 8,
      }));
      setPieces(newPieces);

      // Clean up after animation
      const timer = setTimeout(() => setPieces([]), 4000);
      return () => clearTimeout(timer);
    }
  }, [active]);

  if (!active || pieces.length === 0) return null;

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-50">
      {pieces.map((piece) => (
        <div
          key={piece.id}
          className="absolute animate-confetti-fall"
          style={{
            left: `${piece.x}%`,
            width: piece.size,
            height: piece.size,
            backgroundColor: piece.color,
            borderRadius: Math.random() > 0.5 ? '50%' : '2px',
            animationDelay: `${piece.delay}s`,
            animationDuration: `${piece.duration}s`,
          }}
        />
      ))}
      <style jsx>{`
        @keyframes confetti-fall {
          0% {
            transform: translateY(-10vh) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(110vh) rotate(720deg);
            opacity: 0;
          }
        }
        .animate-confetti-fall {
          animation: confetti-fall linear forwards;
        }
      `}</style>
    </div>
  );
}
```

**Step 2: Update MilestoneCelebration to use CSS confetti**

```typescript
import { CSSConfetti } from './CSSConfetti';

// Remove the canvas-confetti import and useEffect

// In the component, add:
<CSSConfetti active={!!currentMilestone} />
```

**Step 3: Remove canvas-confetti dependency**

```bash
npm uninstall canvas-confetti @types/canvas-confetti
```

**Step 4: Commit**

```bash
git add -A
git commit -m "refactor(residency): replace canvas-confetti with CSS animation"
```

---

## Phase 8: Profile Setup Prompt

### Task 8.1: Add Profile Setup Prompt When Missing Start Date

**Files:**
- Modify: `src/components/residency/StatsOverview.tsx`

**Step 1: Add prompt when no program start date**

```typescript
export function StatsOverview() {
  const { data: stats, isLoading } = useResidencyStats();

  if (isLoading) {
    return <StatsOverviewSkeleton />;
  }

  if (!stats) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-8 text-center">
          <p className="text-muted-foreground">Unable to load stats</p>
        </CardContent>
      </Card>
    );
  }

  const { totals, surgeryBreakdown, daysUntilFreedom, daysLogged } = stats;

  return (
    <div className="space-y-6">
      {/* Days Until Freedom - or Setup Prompt */}
      {daysUntilFreedom !== null ? (
        <Card className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 border-purple-500/20">
          {/* ... existing countdown UI */}
        </Card>
      ) : (
        <Card className="border-dashed border-purple-300 bg-purple-50/50">
          <CardContent className="py-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-purple-100">
                <Calendar className="h-6 w-6 text-purple-600" />
              </div>
              <div className="flex-1">
                <p className="font-medium">Set Your Start Date</p>
                <p className="text-sm text-muted-foreground">
                  Configure your program start date in the Summary tab to see your countdown to freedom!
                </p>
              </div>
              <Button variant="outline" size="sm" asChild>
                <Link href="#" onClick={() => {/* TODO: Switch to summary tab */}}>
                  Set Up
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
      {/* ... rest of component */}
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add -A
git commit -m "feat(residency): add profile setup prompt when start date missing"
```

---

## Phase 9: Playwright E2E Tests

### Task 9.1: Create Stats Tab E2E Tests

**Files:**
- Create: `tests/residency-stats.spec.ts`

**Step 1: Create comprehensive E2E test suite**

```typescript
import { test, expect } from '@playwright/test';

test.describe('Residency Stats Tab', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/residency');
    // Click Stats tab
    await page.getByRole('button', { name: /stats/i }).click();
  });

  test('should display stats overview with counters', async ({ page }) => {
    // Wait for content to load
    await expect(page.getByText('MRIs')).toBeVisible();
    await expect(page.getByText('Appointments')).toBeVisible();
    await expect(page.getByText('Surgeries')).toBeVisible();
    await expect(page.getByText('Total Cases')).toBeVisible();
  });

  test('should increment MRI count', async ({ page }) => {
    // Find MRI section and click + button
    const mriSection = page.locator('text=MRIs').locator('..');
    const plusButton = mriSection.getByRole('button', { name: '+' });

    // Get initial value
    const input = mriSection.locator('input[type="number"]');
    const initialValue = await input.inputValue();

    // Click + and verify
    await plusButton.click();
    await expect(input).toHaveValue(String(Number(initialValue) + 1));
  });

  test('should save daily entry', async ({ page }) => {
    // Increment a counter
    await page.locator('text=MRIs').locator('..').getByRole('button', { name: '+' }).click();

    // Save
    await page.getByRole('button', { name: /save|update/i }).click();

    // Verify toast appears
    await expect(page.getByText(/saved/i)).toBeVisible();
  });

  test('should add surgery with participation level', async ({ page }) => {
    // First save a daily entry (required for surgeries)
    await page.getByRole('button', { name: /save|update/i }).click();
    await page.waitForTimeout(500);

    // Click Add Surgery
    await page.getByRole('button', { name: /add surgery/i }).click();

    // Select procedure
    await page.getByPlaceholder(/procedure/i).fill('Hemilaminectomy');

    // Select participation level
    await page.getByRole('button', { name: /surgeon/i }).click();

    // Add surgery
    await page.getByRole('button', { name: /add surgery/i }).last().click();

    // Verify surgery appears in list
    await expect(page.getByText('Hemilaminectomy')).toBeVisible();
  });

  test('should show skeleton loaders while loading', async ({ page }) => {
    // Navigate with slow network
    await page.route('**/api/residency/**', async (route) => {
      await new Promise((r) => setTimeout(r, 1000));
      await route.continue();
    });

    await page.reload();
    await page.getByRole('button', { name: /stats/i }).click();

    // Should show skeletons
    await expect(page.locator('.animate-pulse').first()).toBeVisible();
  });

  test('should handle error gracefully', async ({ page }) => {
    // Force API error
    await page.route('**/api/residency/stats', (route) =>
      route.fulfill({ status: 500, body: 'Server error' })
    );

    await page.reload();
    await page.getByRole('button', { name: /stats/i }).click();

    // Should show error state
    await expect(page.getByText(/something went wrong/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /try again/i })).toBeVisible();
  });

  test('should be responsive on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    // Verify layout adapts
    const counters = page.locator('[class*="grid-cols"]').first();
    await expect(counters).toBeVisible();

    // Participation buttons should stack
    await page.getByRole('button', { name: /add surgery/i }).click();
    const participationGrid = page.locator('text=Your Role').locator('..').locator('[class*="grid-cols"]');
    await expect(participationGrid).toHaveClass(/grid-cols-2/);
  });
});
```

**Step 2: Run tests**

```bash
npx playwright test tests/residency-stats.spec.ts --headed
```

**Step 3: Commit**

```bash
git add tests/residency-stats.spec.ts
git commit -m "test(residency): add comprehensive E2E tests for stats tab"
```

---

## Summary

### Files Created
- `src/lib/residency-milestones.ts` - Centralized config
- `src/components/residency/StatsErrorBoundary.tsx` - Error boundaries
- `src/components/residency/StatsSkeletons.tsx` - Loading states
- `src/components/residency/CSSConfetti.tsx` - Pure CSS confetti
- `tests/residency-stats.spec.ts` - E2E tests

### Files Modified
- `src/app/api/residency/milestones/route.ts` - Use centralized config
- `src/hooks/useResidencyStats.ts` - Optimistic updates
- `src/components/residency/StatsOverview.tsx` - Skeletons, config, profile prompt
- `src/components/residency/SurgeryTracker.tsx` - Mobile UX, toasts, config
- `src/components/residency/DailyEntryForm.tsx` - Mobile UX, toasts
- `src/components/residency/MilestoneCelebration.tsx` - CSS confetti
- `src/app/residency/page.tsx` - Error boundaries

### Dependencies
- Add: `react-error-boundary`
- Remove: `canvas-confetti`, `@types/canvas-confetti`

---

**Plan complete and saved to `docs/plans/2026-01-02-residency-stats-production-hardening.md`.**

**Two execution options:**

**1. Subagent-Driven (this session)** - I dispatch fresh subagent per task, review between tasks, fast iteration

**2. Parallel Session (separate)** - Open new session with executing-plans, batch execution with checkpoints

**Which approach?**
