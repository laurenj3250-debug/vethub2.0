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

/**
 * @deprecated Use usePatientsQuery from '@/hooks/use-patients-query' instead.
 * This hook is kept for backwards compatibility but polling is now handled by React Query.
 */
export function usePatients() {
  const [patients, setPatients] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchPatients = async () => {
    try {
      setIsLoading(true);
      const data = await apiClient.getPatients();
      setPatients(data);
      setError(null);
    } catch (err) {
      console.error('Fetch patients error:', err);
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPatients();
  }, []);

  return { patients, setPatients, isLoading, error, refetch: fetchPatients };
}

/**
 * @deprecated Use useGeneralTasksQuery from '@/hooks/use-patients-query' instead.
 * This hook is kept for backwards compatibility but polling is now handled by React Query.
 */
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
