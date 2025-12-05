# Task System Redesign Plan - Complete Overhaul

## Executive Summary
The current task system has two overlapping, confusing systems that cause unpredictable behavior. This plan merges them into a single, unified system with proper timezone handling, server-side scheduling, and smart task lifecycle management.

---

## Current Problems (Root Cause Analysis)

### Problem 1: Two Overlapping Systems
| System | Location | Purpose | When Triggered |
|--------|----------|---------|----------------|
| Daily Tasks | `task-definitions.ts` + `daily-reset/route.ts` | 6 recurring patient tasks + 1 general | On app open (localStorage check) |
| Status Tasks | `task-engine.ts` + `tasks/refresh/route.ts` | Admission, Pre-procedure, Discharge tasks | Manual call or unknown |

**Result**: Confusion about which tasks exist, duplicates, tasks not appearing when expected.

### Problem 2: Wrong Timezone
```javascript
// Current code uses UTC
const today = new Date().toISOString().split('T')[0]; // UTC midnight
```
- Reset triggers at midnight UTC = **7-8 PM Eastern** the day before
- Tasks reset while you're still working on them!

### Problem 3: Completed Tasks Are Deleted
```javascript
// daily-reset/route.ts line 41-46
const deletedTasks = await prisma.task.deleteMany({
  where: { completed: true }
});
```
- All history is lost
- Can't see what was done yesterday
- If task was completed, it's gone forever

### Problem 4: No Status Change Integration
- When patient status changes (e.g., to "Discharging"), **no tasks are auto-created**
- The PATCH endpoint doesn't trigger any task logic
- User has to remember to manually add tasks

### Problem 5: Tasks Keep Recurring When They Shouldn't
- Daily recurring tasks (SOAP, Vet Radar, etc.) are created for ALL non-discharged patients
- Even "Discharging" patients get new daily tasks
- No logic to stop recurring tasks based on status

### Problem 6: Client-Side Reset Trigger
- Uses localStorage which can be cleared/corrupted
- Multiple browser tabs = potential race conditions
- Incognito mode = reset every time

---

## User Requirements (from conversation)
- Reset time: **Midnight US Eastern (ET)**
- Task visibility: **Show all tasks always** (no morning/evening hiding)
- Incomplete tasks: **Carry over to next day** (don't delete)
- Reset trigger: **Server cron job** (reliable, automatic)
- Task systems: **Merge into one unified system**
- Daily tasks: **All 6 patient tasks reset daily**
- Status changes: **Auto-add relevant tasks**

---

## New Unified Task Architecture

### Task Categories (Merged System)

| Category | Tasks | When Created | When Stops |
|----------|-------|--------------|------------|
| **Daily Recurring** | SOAP Done, Overnight Notes, Call Owner, Vet Radar, Rounding Sheet, Sticker | Every day at midnight ET | When patient is Discharged |
| **Admission** | Finalize Record, Treatment Sheet | When patient admitted (status = New Admit) | One-time, don't recur |
| **Pre-procedure** | Blood Work, Chest X-rays, NPO | When status = Pre-procedure | One-time, don't recur |
| **Discharge** | Discharge Instructions, Meds Ready, Owner Pickup Call | When status = Ready for Discharge or Discharging | One-time, don't recur |
| **General** | Do All Rounding Summaries | Every day at midnight ET | Never (team-wide) |

### Task Lifecycle Rules

```
                    ┌─────────────────────────────────────────┐
                    │           TASK LIFECYCLE                 │
                    └─────────────────────────────────────────┘

1. DAILY RECURRING TASKS (per patient)
   ├─ Created: Every midnight ET for active patients
   ├─ Condition: Patient status NOT in [Discharged, Discharging]
   ├─ If incomplete at reset: CARRY OVER (marked as carryover)
   └─ If completed: KEEP with completedDate (don't delete)

2. STATUS-TRIGGERED TASKS (one-time)
   ├─ Created: When patient status changes to trigger status
   ├─ Trigger statuses: New Admit, Pre-procedure, Ready for Discharge, Discharging
   ├─ If incomplete at reset: CARRY OVER
   └─ If completed: KEEP with completedDate

3. DISCHARGED PATIENTS
   ├─ All incomplete tasks: Auto-complete with note "Auto-completed on discharge"
   ├─ No new daily tasks created
   └─ Historical tasks preserved for record
```

---

## Database Schema Changes

### Add to Task Model
```prisma
model Task {
  // ... existing fields ...

  // NEW FIELDS
  createdForDate    String?   // YYYY-MM-DD in ET - which day this task is for
  isRecurring       Boolean   @default(false)  // Is this a daily recurring task?
  isCarryover       Boolean   @default(false)  // Was this carried over from previous day?
  autoCompleted     Boolean   @default(false)  // Was this auto-completed (e.g., on discharge)?
  triggeredBy       String?   // What triggered creation: "daily-reset", "status-change", "manual"
}
```

### Add Reset Tracking
```prisma
model DailyReset {
  id        String   @id @default(cuid())
  resetDate String   @unique  // YYYY-MM-DD in ET timezone
  timezone  String   @default("America/New_York")
  createdAt DateTime @default(now())
  stats     Json?    // { patientsProcessed, tasksCreated, etc. }
}
```

---

## Implementation Plan

### Phase 1: Fix Critical Bugs (No Schema Changes)

#### 1.1 Fix Timezone Issue
**File:** Create `src/lib/timezone.ts`

```typescript
export const APP_TIMEZONE = 'America/New_York';

export function getTodayET(): string {
  return new Date().toLocaleDateString('en-CA', {
    timeZone: APP_TIMEZONE
  });
}

export function getCurrentTimeET(): Date {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: APP_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  // Parse the formatted string back to get ET-aware date
  return new Date(formatter.format(new Date()));
}
```

#### 1.2 Fix `completedDate` Bug
**File:** `src/app/api/tasks/patients/[id]/tasks/[taskId]/route.ts`

The PATCH endpoint doesn't set `completedDate`. Add:
```typescript
completedDate: body.completed !== undefined
  ? (body.completed ? getTodayET() : null)
  : undefined
```

#### 1.3 Stop Deleting Completed Tasks
**File:** `src/app/api/daily-reset/route.ts`

Remove:
```typescript
// DELETE THIS CODE
const deletedTasks = await prisma.task.deleteMany({
  where: { completed: true }
});
```

---

### Phase 2: Unified Task System

#### 2.1 Create Single Task Configuration
**File:** `src/lib/task-config.ts` (new file, replaces task-definitions.ts + task-engine.ts)

```typescript
export const TASK_CONFIG = {
  // Daily recurring tasks - created every day for active patients
  dailyRecurring: {
    patient: [
      { name: 'Daily SOAP Done', category: 'Daily', timeOfDay: 'morning', priority: 'high' },
      { name: 'Overnight Notes Checked', category: 'Daily', timeOfDay: 'morning', priority: 'medium' },
      { name: 'Call Owner', category: 'Daily', timeOfDay: 'morning', priority: 'high' },
      { name: 'Vet Radar Done', category: 'Daily', timeOfDay: 'evening', priority: 'high' },
      { name: 'Rounding Sheet Done', category: 'Daily', timeOfDay: 'evening', priority: 'high' },
      { name: 'Sticker on Daily Sheet', category: 'Daily', timeOfDay: 'evening', priority: 'medium' },
    ],
    general: [
      { name: 'Do All Rounding Summaries', category: 'General', timeOfDay: 'evening', priority: 'high' },
    ],
    // Which statuses should NOT get daily recurring tasks
    excludeStatuses: ['Discharged', 'Discharging'],
  },

  // Status-triggered tasks - created once when status changes
  statusTriggered: {
    'New Admit': [
      { name: 'Finalize Record', category: 'Admission', priority: 'high' },
      { name: 'Admission SOAP', category: 'Admission', priority: 'high' },
      { name: 'Treatment Sheet Created', category: 'Admission', priority: 'high' },
    ],
    'Pre-procedure': [
      { name: 'Blood Work', category: 'Pre-procedure', priority: 'high' },
      { name: 'Chest X-rays', category: 'Pre-procedure', priority: 'high' },
      { name: 'NPO Confirmed', category: 'Pre-procedure', priority: 'high' },
    ],
    'Ready for Discharge': [
      { name: 'Discharge Instructions', category: 'Discharge', priority: 'high' },
      { name: 'Discharge Meds Ready', category: 'Discharge', priority: 'high' },
      { name: 'Owner Pickup Call', category: 'Discharge', priority: 'high' },
    ],
    'Discharging': [
      { name: 'Discharge Instructions', category: 'Discharge', priority: 'high' },
    ],
  },

  // Patient type specific tasks (MRI, Surgery) - created on admission
  typeSpecific: {
    'MRI': [
      { name: 'MRI Anesthesia Sheet', category: 'Pre-procedure', priority: 'high' },
      { name: 'Black Book', category: 'Admin', priority: 'medium' },
      { name: 'Print 5 Stickers', category: 'Admin', priority: 'medium' },
    ],
    'Surgery': [
      { name: 'Surgery Slip', category: 'Surgery Prep', priority: 'high' },
      { name: 'Written on Board', category: 'Surgery Prep', priority: 'high' },
      { name: 'Print Surgery Sheet', category: 'Surgery Prep', priority: 'high' },
    ],
  },
};
```

#### 2.2 New Daily Reset Logic
**File:** `src/app/api/daily-reset/route.ts` (complete rewrite)

```typescript
export async function POST(request: Request) {
  const today = getTodayET();

  // 1. Check if already reset today (idempotent)
  const existingReset = await prisma.dailyReset.findUnique({
    where: { resetDate: today }
  });
  if (existingReset && !body.force) {
    return { success: true, message: 'Already reset today', skipped: true };
  }

  // 2. Mark carryover tasks (incomplete tasks from before today)
  await prisma.task.updateMany({
    where: {
      completed: false,
      createdForDate: { not: today },
      isCarryover: false,
    },
    data: { isCarryover: true }
  });

  // 3. Create daily recurring tasks for eligible patients
  const eligiblePatients = await prisma.patient.findMany({
    where: {
      status: { notIn: TASK_CONFIG.dailyRecurring.excludeStatuses }
    }
  });

  for (const patient of eligiblePatients) {
    for (const taskDef of TASK_CONFIG.dailyRecurring.patient) {
      // Check if task already exists for today
      const exists = await prisma.task.findFirst({
        where: {
          patientId: patient.id,
          title: taskDef.name,
          createdForDate: today,
        }
      });

      if (!exists) {
        await prisma.task.create({
          data: {
            patientId: patient.id,
            title: taskDef.name,
            category: taskDef.category,
            timeOfDay: taskDef.timeOfDay,
            priority: taskDef.priority,
            isRecurring: true,
            createdForDate: today,
            triggeredBy: 'daily-reset',
          }
        });
      }
    }
  }

  // 4. Create general tasks for today
  // ... similar logic for general tasks

  // 5. Auto-complete tasks for discharged patients
  await prisma.task.updateMany({
    where: {
      patient: { status: 'Discharged' },
      completed: false,
    },
    data: {
      completed: true,
      completedAt: new Date(),
      completedDate: today,
      autoCompleted: true,
    }
  });

  // 6. Record the reset
  await prisma.dailyReset.create({
    data: { resetDate: today, stats: { ... } }
  });

  return { success: true };
}
```

#### 2.3 Status Change Hook
**File:** `src/app/api/patients/[id]/route.ts`

Add to PATCH endpoint after status update:
```typescript
// After updating patient, check if status changed
if (body.status && body.status !== existingPatient.status) {
  await handleStatusChange(patientId, body.status);
}

async function handleStatusChange(patientId: number, newStatus: string) {
  const today = getTodayET();
  const statusTasks = TASK_CONFIG.statusTriggered[newStatus] || [];

  for (const taskDef of statusTasks) {
    // Don't create duplicate
    const exists = await prisma.task.findFirst({
      where: {
        patientId,
        title: taskDef.name,
        completed: false,
      }
    });

    if (!exists) {
      await prisma.task.create({
        data: {
          patientId,
          title: taskDef.name,
          category: taskDef.category,
          priority: taskDef.priority,
          isRecurring: false,
          createdForDate: today,
          triggeredBy: `status-change:${newStatus}`,
        }
      });
    }
  }

  // If status is Discharged, auto-complete all tasks
  if (newStatus === 'Discharged') {
    await prisma.task.updateMany({
      where: { patientId, completed: false },
      data: {
        completed: true,
        completedAt: new Date(),
        completedDate: today,
        autoCompleted: true,
      }
    });
  }
}
```

---

### Phase 3: Server-Side Cron

#### 3.1 Railway Cron Setup
Create a cron job that runs at midnight ET (5 AM UTC standard, 4 AM UTC during DST):

**Option A: Use Railway's built-in cron**
- Configure in Railway dashboard
- Schedule: `0 5 * * *` (adjust for DST)

**Option B: External cron service (more reliable)**
- Use cron-job.org or EasyCron (free tier)
- Hit `POST /api/daily-reset` with a secret header
- Add authentication to the endpoint

#### 3.2 Secure the Endpoint
```typescript
export async function POST(request: Request) {
  const authHeader = request.headers.get('x-cron-secret');
  const isCronRequest = authHeader === process.env.CRON_SECRET;

  // Allow either cron or authenticated user
  if (!isCronRequest) {
    // Check if user is logged in (for manual trigger)
    // For now, allow manual triggers from the app
  }

  // ... rest of reset logic
}
```

---

### Phase 4: Remove Client-Side Reset

#### 4.1 Update page.tsx
Remove the localStorage-based auto-reset:
```typescript
// REMOVE this entire useEffect
useEffect(() => {
  const autoResetDaily = async () => {
    // ... all this code goes away
  };
  autoResetDaily();
}, [mounted]);
```

Replace with a simple "last reset" display:
```typescript
// Just fetch the last reset info for display
const { data: lastReset } = useQuery({
  queryKey: ['lastReset'],
  queryFn: () => fetch('/api/daily-reset').then(r => r.json()),
});
```

---

## Migration Plan

1. **Database migration**: Add new fields to Task model, create DailyReset table
2. **Backfill existing tasks**: Set `createdForDate` to today, `isRecurring` based on task name
3. **Deploy Phase 1**: Critical bug fixes (timezone, completedDate)
4. **Deploy Phase 2**: New unified task logic
5. **Deploy Phase 3**: Enable cron job
6. **Deploy Phase 4**: Remove client-side reset

---

## Files to Modify

| File | Action | Changes |
|------|--------|---------|
| `prisma/schema.prisma` | Modify | Add Task fields, add DailyReset model |
| `src/lib/timezone.ts` | Create | Timezone utilities |
| `src/lib/task-config.ts` | Create | Unified task configuration |
| `src/app/api/daily-reset/route.ts` | Rewrite | New reset logic |
| `src/app/api/patients/[id]/route.ts` | Modify | Add status change hook |
| `src/app/api/tasks/patients/[id]/tasks/[taskId]/route.ts` | Modify | Fix completedDate bug |
| `src/app/page.tsx` | Modify | Remove client-side reset |
| `src/lib/task-definitions.ts` | Deprecate | Replace with task-config.ts |
| `src/lib/task-engine.ts` | Deprecate | Replace with task-config.ts |

---

## Testing Plan

1. **Timezone tests**: Verify getTodayET() returns correct ET date
2. **Reset idempotency**: Call reset multiple times, verify no duplicates
3. **Task carryover**: Incomplete tasks marked as carryover, not deleted
4. **Status change**: Change status, verify correct tasks created
5. **Discharge handling**: Discharge patient, verify tasks auto-completed
6. **Daily recurring exclusion**: Discharging patients don't get new daily tasks
7. **Cron trigger**: Verify cron can trigger reset with secret

---

## Rollback Plan

1. Cron can be disabled instantly
2. New fields are additive (no destructive changes)
3. Keep old task-definitions.ts as backup
4. Feature flag for new vs old logic if needed
