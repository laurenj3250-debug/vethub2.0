import { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api-client';

export function useAuth() {
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const token = localStorage.getItem('auth_token');
        if (!token) {
          setIsLoading(false);
          return;
        }

        const data = await apiClient.getCurrentUser();
        setUser(data.user);
      } catch (err) {
        console.error('Auth error:', err);
        setError(err as Error);
        localStorage.removeItem('auth_token');
      } finally {
        setIsLoading(false);
      }
    };

    loadUser();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const data = await apiClient.login(email, password);
      setUser(data.user);
      return data;
    } catch (err) {
      throw err;
    }
  };

  const register = async (email: string, password: string) => {
    try {
      const data = await apiClient.register(email, password);
      setUser(data.user);
      return data;
    } catch (err) {
      throw err;
    }
  };

  const logout = () => {
    apiClient.logout();
    setUser(null);
  };

  return { user, isLoading, error, login, register, logout };
}

// Track if we're in the middle of an optimistic update to prevent polling from overwriting it
let isOptimisticUpdatePending = false;
let optimisticUpdateTimeout: NodeJS.Timeout | null = null;

export function usePatients() {
  const [patients, setPatients] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchPatients = async (showLoading = false, force = false) => {
    // Skip polling if an optimistic update is pending (unless forced)
    if (!force && isOptimisticUpdatePending) {
      console.log('[usePatients] Skipping fetch - optimistic update pending');
      return;
    }

    try {
      if (showLoading) {
        setIsLoading(true);
      }
      const data = await apiClient.getPatients();
      setPatients(data);
      setError(null);
    } catch (err) {
      console.error('Fetch patients error:', err);
      setError(err as Error);
    } finally {
      if (showLoading) {
        setIsLoading(false);
      }
    }
  };

  // Wrap setPatients to track optimistic updates
  const setOptimisticPatients = (updater: React.SetStateAction<any[]>) => {
    // Mark that an optimistic update is in progress
    isOptimisticUpdatePending = true;

    // Clear any existing timeout
    if (optimisticUpdateTimeout) {
      clearTimeout(optimisticUpdateTimeout);
    }

    // Clear the flag after 5 seconds (enough time for API to complete)
    optimisticUpdateTimeout = setTimeout(() => {
      isOptimisticUpdatePending = false;
    }, 5000);

    setPatients(updater);
  };

  useEffect(() => {
    fetchPatients(true); // Show loading on initial fetch

    // Only set up polling on client side
    if (typeof window === 'undefined') return;

    // Poll for updates every 30 seconds for cross-device sync
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchPatients(false);
      }
    }, 30000);

    // Fetch when tab becomes visible again (after a short delay to avoid conflicts)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Wait 500ms before fetching to allow any pending API calls to complete
        setTimeout(() => {
          fetchPatients(false);
        }, 500);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (optimisticUpdateTimeout) {
        clearTimeout(optimisticUpdateTimeout);
      }
    };
  }, []);

  return {
    patients,
    setPatients: setOptimisticPatients,
    isLoading,
    error,
    refetch: () => fetchPatients(true, true) // Force refetch bypasses optimistic guard
  };
}

export function useGeneralTasks() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchTasks = async () => {
    try {
      setIsLoading(true);
      const data = await apiClient.getGeneralTasks();
      setTasks(data);
      setError(null);
    } catch (err) {
      console.error('Fetch general tasks error:', err);
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();

    // Only set up polling on client side
    if (typeof window === 'undefined') return;

    // Poll for updates every 30 seconds for cross-device sync
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchTasks();
      }
    }, 30000);

    // Fetch when tab becomes visible again
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchTasks();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  return { tasks, setTasks, isLoading, error, refetch: fetchTasks };
}

export function useCommonItems() {
  const [problems, setProblems] = useState<any[]>([]);
  const [comments, setComments] = useState<any[]>([]);
  const [medications, setMedications] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchAll = async () => {
    try {
      setIsLoading(true);
      const [p, c, m] = await Promise.all([
        apiClient.getCommonProblems(),
        apiClient.getCommonComments(),
        apiClient.getCommonMedications(),
      ]);
      setProblems(p);
      setComments(c);
      setMedications(m);
    } catch (err) {
      console.error('Fetch common items error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();

    // Only set up polling on client side
    if (typeof window === 'undefined') return;

    // Poll for updates every 30 seconds for cross-device sync
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchAll();
      }
    }, 30000);

    // Fetch when tab becomes visible again
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchAll();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  return { problems, comments, medications, isLoading, refetch: fetchAll };
}

export function useNotes() {
  const [notes, setNotes] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchNotes = async () => {
    try {
      setIsLoading(true);
      const data = await apiClient.getNotes();
      setNotes(data);
      setError(null);
    } catch (err) {
      console.error('Fetch notes error:', err);
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchNotes();

    if (typeof window === 'undefined') return;

    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchNotes();
      }
    }, 30000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchNotes();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  return { notes, setNotes, isLoading, error, refetch: fetchNotes };
}
