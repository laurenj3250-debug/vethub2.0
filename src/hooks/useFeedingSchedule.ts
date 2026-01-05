import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';

export type FeedingFrequency = 'q4h' | 'q6h' | 'q8h' | 'q12h' | 'tid' | 'bid';

export interface FeedingSchedule {
  id: string;
  patientId: number;
  foodType: string;
  amountGrams: number;
  kcalPerDay?: number;
  frequency: FeedingFrequency;
  feedingTimes: string[];
  notes?: string;
  waterOnly: boolean;
  isActive: boolean;
  createdAt: string;
  patient?: {
    id: number;
    demographics: {
      name?: string;
      weight?: string | number;
      species?: string;
    };
  };
  feedingRecords?: FeedingRecord[];
}

export interface FeedingRecord {
  id: string;
  scheduleId: string;
  scheduledTime: string;
  scheduledDate: string;
  completedAt?: string;
  completedBy?: string;
  amountGiven?: number;
  percentEaten?: number;
  vomited: boolean;
  refused: boolean;
  notes?: string;
}

export interface DueFeeding {
  scheduleId: string;
  patientId: number;
  patientName: string;
  weight?: string | number;
  foodType: string;
  amountGrams: number;
  scheduledTime: string;
  scheduledDate: string;
  status: 'overdue' | 'due' | 'upcoming';
  notes?: string;
}

// Get feeding schedules for a patient
export function useFeedingSchedule(patientId?: number) {
  return useQuery<FeedingSchedule[]>({
    queryKey: ['feeding-schedule', patientId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (patientId) params.append('patientId', patientId.toString());
      params.append('includeRecords', 'true');

      const res = await fetch(`/api/feeding?${params}`);
      if (!res.ok) throw new Error('Failed to fetch feeding schedules');
      return res.json();
    },
    enabled: patientId !== undefined,
  });
}

// Get all due feedings across patients (for dashboard widget)
export function useDueFeedings() {
  return useQuery<DueFeeding[]>({
    queryKey: ['feeding-due'],
    queryFn: async () => {
      const res = await fetch('/api/feeding?dueOnly=true');
      if (!res.ok) throw new Error('Failed to fetch due feedings');
      return res.json();
    },
    refetchInterval: 60000, // Refresh every minute
  });
}

// Create a new feeding schedule
export function useCreateFeedingSchedule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      patientId: number;
      foodType: string;
      amountGrams: number;
      kcalPerDay?: number;
      frequency: FeedingFrequency;
      feedingTimes?: string[];
      notes?: string;
      waterOnly?: boolean;
    }) => {
      const res = await fetch('/api/feeding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to create feeding schedule');
      return res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['feeding-schedule', variables.patientId] });
      queryClient.invalidateQueries({ queryKey: ['feeding-due'] });
      toast({
        title: 'Feeding schedule created',
        description: `${variables.foodType} schedule set up successfully.`,
      });
    },
    onError: (error) => {
      toast({
        title: 'Failed to create schedule',
        description: error instanceof Error ? error.message : 'Please try again.',
        variant: 'destructive',
      });
    },
  });
}

// Log a feeding record
export function useLogFeeding() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      scheduleId: string;
      scheduledTime: string;
      scheduledDate: string;
      amountGiven?: number;
      percentEaten?: number;
      vomited?: boolean;
      refused?: boolean;
      completedBy?: string;
      notes?: string;
    }) => {
      const res = await fetch('/api/feeding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to log feeding');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feeding-schedule'] });
      queryClient.invalidateQueries({ queryKey: ['feeding-due'] });
      toast({
        title: 'Feeding logged',
        description: 'Feeding has been recorded.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Failed to log feeding',
        description: error instanceof Error ? error.message : 'Please try again.',
        variant: 'destructive',
      });
    },
  });
}

// Update a feeding schedule
export function useUpdateFeedingSchedule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Partial<FeedingSchedule> & { id: string }) => {
      const res = await fetch('/api/feeding', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to update feeding schedule');
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['feeding-schedule', data.patientId] });
      queryClient.invalidateQueries({ queryKey: ['feeding-due'] });
      toast({
        title: 'Schedule updated',
        description: 'Feeding schedule has been updated.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Failed to update',
        description: error instanceof Error ? error.message : 'Please try again.',
        variant: 'destructive',
      });
    },
  });
}

// Delete (deactivate) a feeding schedule
export function useDeleteFeedingSchedule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/feeding?id=${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete feeding schedule');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feeding-schedule'] });
      queryClient.invalidateQueries({ queryKey: ['feeding-due'] });
      toast({
        title: 'Schedule removed',
        description: 'Feeding schedule has been deactivated.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Failed to remove',
        description: error instanceof Error ? error.message : 'Please try again.',
        variant: 'destructive',
      });
    },
  });
}

// Helper to calculate RER and food amounts
export function calculateFeedingAmount(
  weightKg: number,
  kcalPer100g: number,
  rerMultiplier = 0.5 // Default 50% RER for hospitalized patients
): { kcalPerDay: number; gramsPerDay: number; gramsPerFeeding: Record<FeedingFrequency, number> } {
  const rer = Math.pow(weightKg, 0.75) * 70;
  const targetKcal = rer * rerMultiplier;
  const gramsPerDay = (targetKcal / kcalPer100g) * 100;

  return {
    kcalPerDay: targetKcal,
    gramsPerDay,
    gramsPerFeeding: {
      q4h: Math.round(gramsPerDay / 6),
      q6h: Math.round(gramsPerDay / 4),
      q8h: Math.round(gramsPerDay / 3),
      q12h: Math.round(gramsPerDay / 2),
      tid: Math.round(gramsPerDay / 3),
      bid: Math.round(gramsPerDay / 2),
    },
  };
}

// Common food options with kcal/100g
export const FOOD_OPTIONS = [
  { name: 'Chicken & Rice (homemade)', kcalPer100g: 118 },
  { name: 'RC GI Low Fat Dry', kcalPer100g: 321 },
  { name: 'RC GI Low Fat Wet', kcalPer100g: 72 },
  { name: 'Hill\'s i/d Dry', kcalPer100g: 357 },
  { name: 'Hill\'s i/d Wet', kcalPer100g: 98 },
  { name: 'Purina EN Dry', kcalPer100g: 401 },
  { name: 'Purina EN Wet', kcalPer100g: 89 },
  { name: 'Hill\'s a/d Critical Care', kcalPer100g: 183 },
] as const;

export const FREQUENCY_LABELS: Record<FeedingFrequency, string> = {
  q4h: 'Every 4 hours',
  q6h: 'Every 6 hours',
  q8h: 'Every 8 hours',
  q12h: 'Every 12 hours',
  tid: 'Three times daily',
  bid: 'Twice daily',
};
