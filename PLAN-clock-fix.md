# Plan: Fix Clock In/Out Feature

## Investigation Summary

### Code Flow Traced
1. **UI** (`ResidencyTracker.tsx:272`): Button calls `clockAction({ action: 'clockIn' | 'clockOut' })`
2. **Hook** (`useResidencyStats.ts:449-489`): `useClockInOut` mutation POSTs to `/api/residency/quick-increment`
3. **API** (`quick-increment/route.ts:43-68`): Upserts DailyEntry with `shiftStartTime` or `shiftEndTime`
4. **Schema** (`schema.prisma:406-408`): Fields exist: `shiftStartTime String?`, `shiftEndTime String?`

### Issues Found

#### Issue 1: No Optimistic Update (UX feels broken)
- `useClockInOut` hook has NO `onMutate` handler
- User clicks "In" → waits for server roundtrip → then sees update
- With slow network, this feels like "it doesn't work"

#### Issue 2: Potential Timezone Mismatch
- Both client and server use `new Date().toISOString().split('T')[0]` (UTC)
- If user is at 10pm EST, UTC date is next day
- Could cause confusion (user thinks today, system says tomorrow)
- Query keys might not match if calculated at different milliseconds around midnight

#### Issue 3: No Loading State Feedback
- Button shows "In" or "Out" but no spinner during mutation
- `isClockingIn` is set but barely visible ("...")

#### Issue 4: Query Cache Key Synchronization
- `useTodayEntry()` generates key with current UTC date
- `onSuccess` tries to update `['daily-entry', data.date]`
- If dates differ, cache update fails silently

#### Issue 5: Missing Error Toast on Network Failure
- `onError` shows toast but only for explicit errors
- Network failures might not trigger proper feedback

---

## Implementation Plan

### Step 1: Add Optimistic Update to useClockInOut
**File:** `src/hooks/useResidencyStats.ts`

Add `onMutate` handler to immediately update UI:
```typescript
onMutate: async ({ action, time }) => {
  // Cancel outgoing queries
  await queryClient.cancelQueries({ queryKey: ['daily-entry'] });

  // Get current time
  const clockTime = time || new Date().toTimeString().slice(0, 5);
  const todayKey = new Date().toISOString().split('T')[0];

  // Snapshot previous value
  const previousEntry = queryClient.getQueryData(['daily-entry', todayKey]);

  // Optimistically update
  queryClient.setQueryData(['daily-entry', todayKey], (old) => {
    const base = old ?? { id: 'temp', date: todayKey, ... };
    return {
      ...base,
      shiftStartTime: action === 'clockIn' ? clockTime : base.shiftStartTime,
      shiftEndTime: action === 'clockOut' ? clockTime : base.shiftEndTime,
    };
  });

  return { previousEntry, todayKey };
},
```

### Step 2: Fix Query Key Consistency
**File:** `src/hooks/useResidencyStats.ts`

Ensure `onSuccess` uses the same key format:
```typescript
onSuccess: (data) => {
  const todayKey = new Date().toISOString().split('T')[0];
  // Force update with server data using consistent key
  queryClient.setQueryData(['daily-entry', todayKey], data);
  // Also set with server's date for redundancy
  if (data?.date && data.date !== todayKey) {
    queryClient.setQueryData(['daily-entry', data.date], data);
  }
  // Show toast...
},
```

### Step 3: Add Loading Spinner to UI
**File:** `src/components/dashboard/ResidencyTracker.tsx`

Change button content from "..." to proper loading indicator:
```tsx
{clockPending ? (
  <RefreshCw className="w-3 h-3 animate-spin" />
) : shiftStart && !shiftEnd ? 'Out' : 'In'}
```

### Step 4: Add Rollback on Error
**File:** `src/hooks/useResidencyStats.ts`

Add error rollback in `onError`:
```typescript
onError: (error, _, context) => {
  // Rollback optimistic update
  if (context?.todayKey && context?.previousEntry !== undefined) {
    queryClient.setQueryData(['daily-entry', context.todayKey], context.previousEntry);
  }
  toast({ ... });
},
```

### Step 5: Verify API Actually Saves (Debug Check)
Add console.log temporarily to verify the upsert works:
```typescript
// In quick-increment/route.ts
console.log('Clock action:', validated.action, 'time:', time, 'date:', today);
console.log('Entry created/updated:', entry);
```

### Step 6: Display Current Shift Duration
**File:** `src/components/dashboard/ResidencyTracker.tsx`

Calculate and show elapsed time when clocked in:
```tsx
const shiftDuration = useMemo(() => {
  if (!shiftStart || shiftEnd) return null;
  const start = new Date(`2000-01-01T${shiftStart}`);
  const now = new Date();
  const diffMs = now - start;
  const hours = Math.floor(diffMs / 3600000);
  const mins = Math.floor((diffMs % 3600000) / 60000);
  return `${hours}h ${mins}m`;
}, [shiftStart, shiftEnd]);
```

---

## Testing Checklist

- [ ] Click "In" → UI updates immediately (optimistic)
- [ ] Refresh page → Clock in time persists
- [ ] Click "Out" → UI updates, button disables
- [ ] Refresh page → Both times persist
- [ ] Check Railway logs → No errors
- [ ] Edit clock-in time → Updates correctly
- [ ] Network offline → Shows error toast, reverts UI

---

## Files to Modify

1. `src/hooks/useResidencyStats.ts` - Add optimistic update, fix cache keys
2. `src/components/dashboard/ResidencyTracker.tsx` - Better loading state
3. `src/app/api/residency/quick-increment/route.ts` - (Optional) Add debug logging

---

## Risk Assessment

- **Low risk**: Changes are isolated to clock feature
- **Optimistic updates**: Well-established pattern with TanStack Query
- **Rollback**: Preserves data integrity on failure
- **No schema changes**: Uses existing fields

---

## Estimated Changes

- ~30 lines added to `useClockInOut` hook
- ~5 lines changed in `ResidencyTracker.tsx`
- No database migrations needed
