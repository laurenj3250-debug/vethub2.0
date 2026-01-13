import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';
import { getTodayET, getCurrentTimeET } from '@/lib/timezone';

interface Surgery {
  id: string;
  dailyEntryId: string;
  procedureName: string;
  participation: 'S' | 'O' | 'C' | 'D' | 'K';
  patientName?: string;
  patientId?: number;
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

interface DailyEntry {
  id: string;
  date: string;
  mriCount: number;
  recheckCount: number;
  newConsultCount: number;
  emergencyCount: number;
  newCount: number; // Legacy, = newConsultCount
  commsCount: number;
  shiftStartTime?: string;
  shiftEndTime?: string;
  totalCases: number;
  notes?: string;
  surgeries: Surgery[];
  lmriEntries: LMRIEntry[];
}

interface Stats {
  totals: {
    mriCount: number;
    recheckCount: number;
    newConsultCount: number;
    emergencyCount: number;
    commsCount: number;
    newCount: number; // Legacy
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
    enabled: !!date,
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
      toast({
        title: 'Entry saved',
        description: 'Your daily entry has been updated.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Failed to save',
        description: error instanceof Error ? error.message : 'Please try again.',
        variant: 'destructive',
      });
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
      patientId?: number;
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
    onMutate: async (newSurgery) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['daily-entry'] });

      // Snapshot the previous value
      const previousEntries = queryClient.getQueriesData({ queryKey: ['daily-entry'] });

      // Optimistically update the cache
      queryClient.setQueriesData<DailyEntry | null>(
        { queryKey: ['daily-entry'] },
        (old) => {
          if (!old || old.id !== newSurgery.dailyEntryId) return old;
          return {
            ...old,
            surgeries: [
              ...old.surgeries,
              {
                id: `temp-${Date.now()}`, // Temporary ID until server responds
                dailyEntryId: newSurgery.dailyEntryId,
                procedureName: newSurgery.procedureName,
                participation: newSurgery.participation,
                patientName: newSurgery.patientName,
                patientId: newSurgery.patientId,
                notes: newSurgery.notes,
              },
            ],
          };
        }
      );

      return { previousEntries };
    },
    onError: (error, _, context) => {
      // Rollback on error
      if (context?.previousEntries) {
        context.previousEntries.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
      toast({
        title: 'Failed to add surgery',
        description: error instanceof Error ? error.message : 'Please try again.',
        variant: 'destructive',
      });
    },
    onSuccess: (_, variables) => {
      toast({
        title: 'Surgery logged',
        description: `${variables.procedureName} added successfully.`,
      });
    },
    onSettled: () => {
      // Always refetch after mutation settles
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
    onMutate: async (surgeryId) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['daily-entry'] });

      // Snapshot the previous value
      const previousEntries = queryClient.getQueriesData({ queryKey: ['daily-entry'] });

      // Optimistically remove the surgery from cache
      queryClient.setQueriesData<DailyEntry | null>(
        { queryKey: ['daily-entry'] },
        (old) => {
          if (!old) return old;
          return {
            ...old,
            surgeries: old.surgeries.filter((s) => s.id !== surgeryId),
          };
        }
      );

      return { previousEntries };
    },
    onError: (error, _, context) => {
      // Rollback on error
      if (context?.previousEntries) {
        context.previousEntries.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
      toast({
        title: 'Failed to delete',
        description: error instanceof Error ? error.message : 'Please try again.',
        variant: 'destructive',
      });
    },
    onSuccess: () => {
      toast({
        title: 'Surgery removed',
        description: 'The surgery has been deleted.',
      });
    },
    onSettled: () => {
      // Always refetch after mutation settles
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

// Counter field types
type CounterField = 'mriCount' | 'recheckCount' | 'newConsultCount' | 'emergencyCount' | 'commsCount';

// Quick increment for dashboard card - optimistic updates for instant feedback
export function useQuickIncrement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      field: CounterField;
      delta: number; // +1 or -1
    }) => {
      // Let server determine "today" to avoid timezone mismatch
      const res = await fetch('/api/residency/quick-increment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to update');
      }
      return res.json();
    },
    onMutate: async ({ field, delta }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['residency-stats'] });
      await queryClient.cancelQueries({ queryKey: ['daily-entry'] });

      // Snapshot previous values for rollback
      const previousStats = queryClient.getQueryData<Stats>(['residency-stats']);

      // Get today's date in Eastern Time for query key matching
      const todayKey = getTodayET();
      const previousDailyEntry = queryClient.getQueryData<DailyEntry | null>(['daily-entry', todayKey]);

      // Get today's current value for the field
      const currentTodayValue = (previousDailyEntry?.[field] as number) ?? 0;

      // Calculate the actual delta (can't go below 0 for TODAY's values)
      let actualDelta = delta;
      if (delta < 0 && currentTodayValue <= 0) {
        // Can't decrement - today's value is already 0
        actualDelta = 0;
      }

      // Only update if there's an actual change
      if (actualDelta === 0 && delta < 0) {
        // Decrement was blocked - don't update anything
        return { previousStats, previousDailyEntry, blocked: true };
      }

      // Optimistically update global stats
      queryClient.setQueryData<Stats>(['residency-stats'], (old) => {
        if (!old) return old;
        const newTotals = { ...old.totals };
        const fieldValue = (newTotals[field] as number) ?? 0;
        newTotals[field] = Math.max(0, fieldValue + actualDelta);

        // Update calculated fields
        if (field === 'newConsultCount') {
          newTotals.newCount = newTotals.newConsultCount; // Keep legacy field in sync
        }
        // Recalculate totalAppointments
        newTotals.totalAppointments = (newTotals.recheckCount ?? 0) +
          (newTotals.newConsultCount ?? 0) + (newTotals.emergencyCount ?? 0);

        return { ...old, totals: newTotals };
      });

      // Optimistically update today's daily entry
      queryClient.setQueryData<DailyEntry | null>(['daily-entry', todayKey], (old) => {
        const baseEntry: DailyEntry = old ?? {
          id: 'temp-' + Date.now(),
          date: todayKey,
          mriCount: 0,
          recheckCount: 0,
          newConsultCount: 0,
          emergencyCount: 0,
          newCount: 0,
          commsCount: 0,
          totalCases: 0,
          surgeries: [],
          lmriEntries: [],
        };

        const currentValue = (baseEntry[field] as number) ?? 0;
        const newValue = Math.max(0, currentValue + actualDelta);

        const updated = {
          ...baseEntry,
          [field]: newValue,
        };

        // Keep newCount in sync with newConsultCount
        if (field === 'newConsultCount') {
          updated.newCount = newValue;
        }

        // Recalculate totalCases
        updated.totalCases = updated.mriCount + updated.recheckCount +
          updated.newConsultCount + updated.emergencyCount;

        return updated;
      });

      return { previousStats, previousDailyEntry, todayKey };
    },
    onError: (error, _, context) => {
      // Rollback on error
      if (context?.previousStats) {
        queryClient.setQueryData(['residency-stats'], context.previousStats);
      }
      if (context?.todayKey && context?.previousDailyEntry !== undefined) {
        queryClient.setQueryData(['daily-entry', context.todayKey], context.previousDailyEntry);
      }
      toast({
        title: 'Failed to update',
        description: error instanceof Error ? error.message : 'Please try again.',
        variant: 'destructive',
      });
    },
    onSuccess: (data) => {
      // Update with server response to ensure consistency
      if (data?.date) {
        queryClient.setQueryData(['daily-entry', data.date], data);
      }
    },
    onSettled: (_, __, ___, context) => {
      // Don't refetch if mutation was blocked
      if (context?.blocked) return;

      // Refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: ['residency-stats'] });
      queryClient.invalidateQueries({ queryKey: ['daily-entry'] });
      queryClient.invalidateQueries({ queryKey: ['milestones'] });
    },
  });
}

// Get today's entry for quick view (uses Eastern Time)
export function useTodayEntry() {
  const today = getTodayET();
  return useDailyEntry(today);
}

// Clock in/out mutation with optimistic updates - supports editing past dates
export function useClockInOut() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { action: 'clockIn' | 'clockOut'; time?: string; date?: string }) => {
      const res = await fetch('/api/residency/quick-increment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to clock');
      }
      return res.json();
    },
    onMutate: async ({ action, time, date }) => {
      const targetDate = date || getTodayET();
      const clockTime = time || getCurrentTimeET();

      // Cancel outgoing queries
      await queryClient.cancelQueries({ queryKey: ['daily-entry', targetDate] });

      // Snapshot previous value for rollback
      const previousEntry = queryClient.getQueryData<DailyEntry | null>(['daily-entry', targetDate]);

      // Optimistically update the cache
      queryClient.setQueryData<DailyEntry | null>(['daily-entry', targetDate], (old) => {
        const base: DailyEntry = old ?? {
          id: 'temp-' + Date.now(),
          date: targetDate,
          mriCount: 0,
          recheckCount: 0,
          newConsultCount: 0,
          emergencyCount: 0,
          newCount: 0,
          commsCount: 0,
          totalCases: 0,
          surgeries: [],
          lmriEntries: [],
        };

        return {
          ...base,
          shiftStartTime: action === 'clockIn' ? clockTime : base.shiftStartTime,
          shiftEndTime: action === 'clockOut' ? clockTime : base.shiftEndTime,
        };
      });

      return { previousEntry, targetDate };
    },
    onSuccess: (data, variables, context) => {
      // Update with server response to ensure consistency
      const targetDate = context?.targetDate || getTodayET();
      if (data?.date) {
        queryClient.setQueryData(['daily-entry', data.date], data);
        // Also update target date key if different
        if (data.date !== targetDate) {
          queryClient.setQueryData(['daily-entry', targetDate], data);
        }
      }
      const isToday = !variables.date || variables.date === getTodayET();
      toast({
        title: data.shiftEndTime && !data.shiftStartTime ? 'Clock Out Updated' :
               data.shiftStartTime && !data.shiftEndTime ? 'Clock In Updated' :
               'Time Updated',
        description: isToday
          ? (data.shiftEndTime ? `Shift ended at ${data.shiftEndTime}` : `Shift started at ${data.shiftStartTime}`)
          : `Updated ${variables.date}`,
      });
    },
    onError: (error, _, context) => {
      // Rollback optimistic update on error
      if (context?.targetDate && context?.previousEntry !== undefined) {
        queryClient.setQueryData(['daily-entry', context.targetDate], context.previousEntry);
      }
      toast({
        title: 'Failed to update',
        description: error instanceof Error ? error.message : 'Please try again.',
        variant: 'destructive',
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['daily-entry'] });
      queryClient.invalidateQueries({ queryKey: ['residency-stats'] });
    },
  });
}

// Atomic update of both shift times for any date
export function useUpdateShiftTimes() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      date: string;
      shiftStartTime?: string | null; // null = clear, undefined = no change
      shiftEndTime?: string | null;   // null = clear, undefined = no change
    }) => {
      const res = await fetch('/api/residency/quick-increment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'updateShiftTimes',
          ...data,
        }),
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to update shift times');
      }
      return res.json();
    },
    onSuccess: (data) => {
      // Update cache with server response
      if (data?.date) {
        queryClient.setQueryData(['daily-entry', data.date], data);
      }
      toast({
        title: 'Times Updated',
        description: `Shift times for ${data.date} saved.`,
      });
    },
    onError: (error) => {
      toast({
        title: 'Failed to update',
        description: error instanceof Error ? error.message : 'Please try again.',
        variant: 'destructive',
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['daily-entry'] });
      queryClient.invalidateQueries({ queryKey: ['residency-stats'] });
    },
  });
}

// Export types for use in components
export type { DailyEntry, Surgery, LMRIEntry, Stats, CounterField };
