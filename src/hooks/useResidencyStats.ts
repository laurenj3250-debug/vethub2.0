import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';

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

// Quick increment for dashboard card - optimistic updates for instant feedback
export function useQuickIncrement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      field: 'mriCount' | 'recheckCount' | 'newCount';
      delta: number; // +1 or -1
    }) => {
      const today = new Date().toISOString().split('T')[0];
      const res = await fetch('/api/residency/quick-increment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: today, ...data }),
      });
      if (!res.ok) throw new Error('Failed to update');
      return res.json();
    },
    onMutate: async ({ field, delta }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['residency-stats'] });
      await queryClient.cancelQueries({ queryKey: ['daily-entry'] });

      // Snapshot previous stats
      const previousStats = queryClient.getQueryData<Stats>(['residency-stats']);

      // Optimistically update stats
      queryClient.setQueryData<Stats>(['residency-stats'], (old) => {
        if (!old) return old;
        const newTotals = { ...old.totals };

        if (field === 'mriCount') {
          newTotals.mriCount = Math.max(0, newTotals.mriCount + delta);
        } else if (field === 'recheckCount') {
          newTotals.recheckCount = Math.max(0, newTotals.recheckCount + delta);
          newTotals.totalAppointments = newTotals.recheckCount + newTotals.newCount;
        } else if (field === 'newCount') {
          newTotals.newCount = Math.max(0, newTotals.newCount + delta);
          newTotals.totalAppointments = newTotals.recheckCount + newTotals.newCount;
        }

        return { ...old, totals: newTotals };
      });

      return { previousStats };
    },
    onError: (error, _, context) => {
      // Rollback on error
      if (context?.previousStats) {
        queryClient.setQueryData(['residency-stats'], context.previousStats);
      }
      toast({
        title: 'Failed to update',
        description: error instanceof Error ? error.message : 'Please try again.',
        variant: 'destructive',
      });
    },
    onSettled: () => {
      // Refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: ['residency-stats'] });
      queryClient.invalidateQueries({ queryKey: ['daily-entry'] });
      queryClient.invalidateQueries({ queryKey: ['milestones'] });
    },
  });
}

// Get today's entry for quick view
export function useTodayEntry() {
  const today = new Date().toISOString().split('T')[0];
  return useDailyEntry(today);
}

// Export types for use in components
export type { DailyEntry, Surgery, LMRIEntry, Stats };
