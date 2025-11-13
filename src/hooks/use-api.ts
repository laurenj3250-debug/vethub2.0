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

    // Poll for updates every 2 minutes (no loading indicator)
    const interval = setInterval(() => fetchPatients(false), 120000);
    return () => clearInterval(interval);
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

    // Poll for updates every 2 minutes
    const interval = setInterval(fetchTasks, 120000);
    return () => clearInterval(interval);
  }, []);

  return { tasks, isLoading, error, refetch: fetchTasks };
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

    // Poll for updates every 2 minutes
    const interval = setInterval(fetchAll, 120000);
    return () => clearInterval(interval);
  }, []);

  return { problems, comments, medications, isLoading, refetch: fetchAll };
}
