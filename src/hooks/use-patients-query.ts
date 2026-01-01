'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

// Query keys for cache management
export const queryKeys = {
  patients: ['patients'] as const,
  generalTasks: ['generalTasks'] as const,
  commonItems: ['commonItems'] as const,
  notes: ['notes'] as const,
};

/**
 * React Query hook for fetching patients with tasks
 * Replaces the old usePatients() hook from use-api.ts
 *
 * Features:
 * - Automatic 30-second polling (configured in QueryClient)
 * - Refetch on window focus
 * - Proper cache invalidation
 */
export function usePatientsQuery() {
  return useQuery({
    queryKey: queryKeys.patients,
    queryFn: async () => {
      const data = await apiClient.getPatients();
      return data;
    },
  });
}

/**
 * React Query hook for fetching general (non-patient) tasks
 * Replaces the old useGeneralTasks() hook from use-api.ts
 */
export function useGeneralTasksQuery() {
  return useQuery({
    queryKey: queryKeys.generalTasks,
    queryFn: async () => {
      const data = await apiClient.getGeneralTasks();
      return data;
    },
  });
}

/**
 * Mutation for toggling a patient task's completed status
 * Uses optimistic updates with proper rollback on error
 */
export function useTogglePatientTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      patientId,
      taskId,
      completed,
    }: {
      patientId: number;
      taskId: string;
      completed: boolean;
    }) => {
      const result = await apiClient.updateTask(
        String(patientId),
        String(taskId),
        { completed }
      );
      return result;
    },
    onMutate: async ({ patientId, taskId, completed }) => {
      // Cancel any outgoing refetches to prevent race conditions
      await queryClient.cancelQueries({ queryKey: queryKeys.patients });

      // Snapshot the previous value for rollback
      const previousPatients = queryClient.getQueryData(queryKeys.patients);

      // Optimistically update the cache
      queryClient.setQueryData(queryKeys.patients, (old: any[] | undefined) => {
        if (!old) return old;
        return old.map((patient) =>
          patient.id === patientId
            ? {
                ...patient,
                tasks: (patient.tasks || []).map((task: any) =>
                  task.id === taskId ? { ...task, completed } : task
                ),
              }
            : patient
        );
      });

      // Return context with previous value for rollback
      return { previousPatients };
    },
    onError: (err, variables, context) => {
      // Rollback to previous value on error
      if (context?.previousPatients) {
        queryClient.setQueryData(queryKeys.patients, context.previousPatients);
      }
      console.error('Failed to toggle task:', err);
    },
    onSettled: () => {
      // Always refetch after mutation to ensure sync
      // This happens after success OR error
      queryClient.invalidateQueries({ queryKey: queryKeys.patients });
    },
  });
}

/**
 * Mutation for toggling a general task's completed status
 * Uses optimistic updates with proper rollback on error
 */
export function useToggleGeneralTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      taskId,
      completed,
    }: {
      taskId: string;
      completed: boolean;
    }) => {
      const result = await apiClient.updateGeneralTask(taskId, { completed });
      return result;
    },
    onMutate: async ({ taskId, completed }) => {
      // Cancel any outgoing refetches to prevent race conditions
      await queryClient.cancelQueries({ queryKey: queryKeys.generalTasks });

      // Snapshot the previous value for rollback
      const previousTasks = queryClient.getQueryData(queryKeys.generalTasks);

      // Optimistically update the cache
      queryClient.setQueryData(queryKeys.generalTasks, (old: any[] | undefined) => {
        if (!old) return old;
        return old.map((task) =>
          task.id === taskId ? { ...task, completed } : task
        );
      });

      // Return context with previous value for rollback
      return { previousTasks };
    },
    onError: (err, variables, context) => {
      // Rollback to previous value on error
      if (context?.previousTasks) {
        queryClient.setQueryData(queryKeys.generalTasks, context.previousTasks);
      }
      console.error('Failed to toggle general task:', err);
    },
    onSettled: () => {
      // Always refetch after mutation to ensure sync
      queryClient.invalidateQueries({ queryKey: queryKeys.generalTasks });
    },
  });
}

/**
 * Mutation for adding a task to a patient
 */
export function useAddPatientTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      patientId,
      task,
    }: {
      patientId: number;
      task: { title: string; category?: string; timeOfDay?: string };
    }) => {
      const result = await apiClient.createTask(String(patientId), task);
      return result;
    },
    onSuccess: () => {
      // Invalidate to refetch with new task
      queryClient.invalidateQueries({ queryKey: queryKeys.patients });
    },
  });
}

/**
 * Mutation for deleting a patient task
 */
export function useDeletePatientTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      patientId,
      taskId,
    }: {
      patientId: number;
      taskId: string;
    }) => {
      await apiClient.deleteTask(String(patientId), taskId);
    },
    onMutate: async ({ patientId, taskId }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.patients });

      const previousPatients = queryClient.getQueryData(queryKeys.patients);

      // Optimistically remove the task
      queryClient.setQueryData(queryKeys.patients, (old: any[] | undefined) => {
        if (!old) return old;
        return old.map((patient) =>
          patient.id === patientId
            ? {
                ...patient,
                tasks: (patient.tasks || []).filter(
                  (task: any) => task.id !== taskId
                ),
              }
            : patient
        );
      });

      return { previousPatients };
    },
    onError: (err, variables, context) => {
      if (context?.previousPatients) {
        queryClient.setQueryData(queryKeys.patients, context.previousPatients);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.patients });
    },
  });
}

/**
 * Mutation for adding a general task
 */
export function useAddGeneralTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (task: {
      title: string;
      category?: string;
      timeOfDay?: string;
    }) => {
      const result = await apiClient.createGeneralTask(task);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.generalTasks });
    },
  });
}

/**
 * Mutation for deleting a general task
 */
export function useDeleteGeneralTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (taskId: string) => {
      await apiClient.deleteGeneralTask(taskId);
    },
    onMutate: async (taskId) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.generalTasks });

      const previousTasks = queryClient.getQueryData(queryKeys.generalTasks);

      // Optimistically remove the task
      queryClient.setQueryData(queryKeys.generalTasks, (old: any[] | undefined) => {
        if (!old) return old;
        return old.filter((task) => task.id !== taskId);
      });

      return { previousTasks };
    },
    onError: (err, variables, context) => {
      if (context?.previousTasks) {
        queryClient.setQueryData(queryKeys.generalTasks, context.previousTasks);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.generalTasks });
    },
  });
}

/**
 * React Query hook for fetching common items (problems, comments, medications)
 * Replaces the old useCommonItems() hook from use-api.ts
 */
export function useCommonItemsQuery() {
  return useQuery({
    queryKey: queryKeys.commonItems,
    queryFn: async () => {
      const [problems, comments, medications] = await Promise.all([
        apiClient.getCommonProblems(),
        apiClient.getCommonComments(),
        apiClient.getCommonMedications(),
      ]);
      return { problems, comments, medications };
    },
  });
}

/**
 * React Query hook for fetching notes
 * Replaces the old useNotes() hook from use-api.ts
 */
export function useNotesQuery() {
  return useQuery({
    queryKey: queryKeys.notes,
    queryFn: () => apiClient.getNotes(),
  });
}

/**
 * Hook to manually invalidate and refetch all data
 * Useful for force-refresh scenarios
 */
export function useRefreshAllData() {
  const queryClient = useQueryClient();

  return {
    refreshPatients: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.patients }),
    refreshGeneralTasks: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.generalTasks }),
    refreshCommonItems: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.commonItems }),
    refreshNotes: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.notes }),
    refreshAll: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.patients });
      queryClient.invalidateQueries({ queryKey: queryKeys.generalTasks });
      queryClient.invalidateQueries({ queryKey: queryKeys.commonItems });
      queryClient.invalidateQueries({ queryKey: queryKeys.notes });
    },
  };
}
