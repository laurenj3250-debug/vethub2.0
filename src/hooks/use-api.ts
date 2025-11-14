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

export function usePatients() {
  const [patients, setPatients] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchPatients = async (showLoading = false) => {
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

  useEffect(() => {
    fetchPatients(true); // Show loading on initial fetch

    // Only set up polling on client side
    if (typeof window === 'undefined') return;

    // Poll for updates every 2 minutes, but only when page is visible
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchPatients(false);
      }
    }, 120000);

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
  }, []);

  return { patients, isLoading, error, refetch: () => fetchPatients(true) };
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

    // Poll for updates every 2 minutes, but only when page is visible
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchTasks();
      }
    }, 120000);

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

  return { tasks, isLoading, error, refetch: fetchTasks };
}

export function useCommonItems() {
  console.log('[useCommonItems] Hook initializing...');
  const [problems, setProblems] = useState<any[]>([]);
  const [comments, setComments] = useState<any[]>([]);
  const [medications, setMedications] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchAll = async () => {
    try {
      console.log('[useCommonItems] fetchAll starting...');
      setIsLoading(true);
      const [p, c, m] = await Promise.all([
        apiClient.getCommonProblems(),
        apiClient.getCommonComments(),
        apiClient.getCommonMedications(),
      ]);
      console.log('[useCommonItems] fetchAll received:', { problems: p.length, comments: c.length, medications: m.length });
      setProblems(p);
      setComments(c);
      setMedications(m);
    } catch (err) {
      console.error('[useCommonItems] Fetch common items error:', err);
    } finally {
      setIsLoading(false);
      console.log('[useCommonItems] fetchAll complete');
    }
  };

  useEffect(() => {
    console.log('[useCommonItems] useEffect mounting, window available:', typeof window !== 'undefined');
    fetchAll();

    // Only set up polling on client side
    if (typeof window === 'undefined') {
      console.log('[useCommonItems] SSR detected, skipping polling setup');
      return;
    }

    // Poll for updates every 2 minutes, but only when page is visible
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchAll();
      }
    }, 120000);

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
