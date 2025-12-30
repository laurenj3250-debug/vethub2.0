import { useState, useEffect, useRef, useCallback } from 'react';
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

export function usePatients() {
  const [patients, setPatients] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Ref to track if polling should be paused (during optimistic updates)
  const pollingPausedRef = useRef(false);

  const fetchPatients = useCallback(async (showLoading = false, force = false) => {
    // Skip polling if paused (during in-flight task updates) unless forced
    if (pollingPausedRef.current && !force && !showLoading) {
      console.log('[POLLING] Skipped fetch - polling paused during task update');
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
  }, []);

  // Pause polling during optimistic updates to prevent race conditions
  const pausePolling = useCallback(() => {
    pollingPausedRef.current = true;
    console.log('[POLLING] Paused - task update in progress');
  }, []);

  // Resume polling after optimistic update API call completes
  const resumePolling = useCallback(() => {
    pollingPausedRef.current = false;
    console.log('[POLLING] Resumed - task update complete');
  }, []);

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

    // Fetch when tab becomes visible again
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchPatients(false);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [fetchPatients]);

  return {
    patients,
    setPatients,
    isLoading,
    error,
    refetch: () => fetchPatients(true, true),
    pausePolling,
    resumePolling
  };
}

export function useGeneralTasks() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Ref to track if polling should be paused (during optimistic updates)
  const pollingPausedRef = useRef(false);

  const fetchTasks = useCallback(async (showLoading = true, force = false) => {
    // Skip polling if paused (during in-flight task updates) unless forced
    if (pollingPausedRef.current && !force && !showLoading) {
      console.log('[POLLING] Skipped general tasks fetch - polling paused during task update');
      return;
    }

    try {
      if (showLoading) {
        setIsLoading(true);
      }
      const data = await apiClient.getGeneralTasks();
      setTasks(data);
      setError(null);
    } catch (err) {
      console.error('Fetch general tasks error:', err);
      setError(err as Error);
    } finally {
      if (showLoading) {
        setIsLoading(false);
      }
    }
  }, []);

  // Pause polling during optimistic updates to prevent race conditions
  const pausePolling = useCallback(() => {
    pollingPausedRef.current = true;
    console.log('[POLLING] General tasks polling paused');
  }, []);

  // Resume polling after optimistic update API call completes
  const resumePolling = useCallback(() => {
    pollingPausedRef.current = false;
    console.log('[POLLING] General tasks polling resumed');
  }, []);

  useEffect(() => {
    fetchTasks();

    // Only set up polling on client side
    if (typeof window === 'undefined') return;

    // Poll for updates every 30 seconds for cross-device sync
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchTasks(false);
      }
    }, 30000);

    // Fetch when tab becomes visible again
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchTasks(false);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [fetchTasks]);

  return {
    tasks,
    setTasks,
    isLoading,
    error,
    refetch: () => fetchTasks(true, true),
    pausePolling,
    resumePolling
  };
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
