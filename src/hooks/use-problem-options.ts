'use client';

import { useState, useEffect, useCallback } from 'react';

// Default problem options (fallback if API fails)
const DEFAULT_PROBLEMS = [
  'Cervical myelopathy',
  'TL pain',
  'LS pain',
  'Plegic',
  'Vestibular',
  'Seizures',
  'FCE',
  'GME',
  'MUE',
  'SRMA',
];

// API response type from database
interface ProblemOptionDB {
  id: string;
  label: string;
  isDefault: boolean;
  createdAt: string;
}

// Frontend type
export interface ProblemOption {
  id: string;
  label: string;
  isDefault: boolean;
}

// Convert DB response to frontend format
function dbToOption(dbOption: ProblemOptionDB): ProblemOption {
  return {
    id: dbOption.id,
    label: dbOption.label,
    isDefault: dbOption.isDefault,
  };
}

const LEGACY_STORAGE_KEY = 'vethub-custom-problems';
const HIDDEN_STORAGE_KEY = 'vethub-hidden-problems';
const MIGRATION_FLAG_KEY = 'vethub-problems-migrated-to-db';

/**
 * Hook for managing problem options with server-side sync
 * Fetches from API, with optimistic updates for snappy UX
 */
export function useProblemOptions() {
  const [options, setOptions] = useState<ProblemOption[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load from API on mount
  useEffect(() => {
    async function loadOptions() {
      try {
        setIsLoading(true);
        setError(null);

        const response = await fetch('/api/problem-options');

        if (!response.ok) {
          throw new Error('Failed to fetch problem options');
        }

        const data: ProblemOptionDB[] = await response.json();

        // If database is empty, seed with defaults
        if (data.length === 0) {
          console.log('[ProblemOptions] Database empty, seeding defaults...');

          const seedResponse = await fetch('/api/problem-options/seed', {
            method: 'POST',
          });

          if (!seedResponse.ok) {
            console.error('[ProblemOptions] Failed to seed defaults');
            // Fall back to defaults
            setOptions(DEFAULT_PROBLEMS.map((label, i) => ({
              id: `default-${i}`,
              label,
              isDefault: true,
            })));
            setIsLoaded(true);
            setIsLoading(false);
            return;
          }

          // Fetch again after seeding
          const refreshResponse = await fetch('/api/problem-options');
          if (refreshResponse.ok) {
            const seededData: ProblemOptionDB[] = await refreshResponse.json();
            setOptions(seededData.map(dbToOption));
          } else {
            setOptions(DEFAULT_PROBLEMS.map((label, i) => ({
              id: `default-${i}`,
              label,
              isDefault: true,
            })));
          }
        } else {
          // Use the data from API
          setOptions(data.map(dbToOption));
        }

        // Check for localStorage migration
        await migrateLocalStorage();

        setIsLoaded(true);
      } catch (e) {
        console.error('[ProblemOptions] Error loading options:', e);
        setError(e instanceof Error ? e.message : 'Failed to load options');
        // Fall back to defaults
        setOptions(DEFAULT_PROBLEMS.map((label, i) => ({
          id: `default-${i}`,
          label,
          isDefault: true,
        })));
        setIsLoaded(true);
      } finally {
        setIsLoading(false);
      }
    }

    loadOptions();
  }, []);

  // Migrate localStorage custom items to database (one-time)
  async function migrateLocalStorage() {
    try {
      // Check if already migrated
      const migrated = localStorage.getItem(MIGRATION_FLAG_KEY);
      if (migrated === 'true') return;

      // Check for old localStorage data (custom problems)
      const storedCustom = localStorage.getItem(LEGACY_STORAGE_KEY);
      if (storedCustom) {
        const customProblems = JSON.parse(storedCustom) as string[];

        if (customProblems.length > 0) {
          console.log(`[ProblemOptions] Migrating ${customProblems.length} custom problems to database...`);

          const addedOptions: ProblemOption[] = [];
          for (const label of customProblems) {
            try {
              const response = await fetch('/api/problem-options', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  label,
                  isDefault: false,
                }),
              });

              if (response.ok) {
                const created: ProblemOptionDB = await response.json();
                addedOptions.push(dbToOption(created));
              }
            } catch (e) {
              console.error('[ProblemOptions] Failed to migrate:', label, e);
            }
          }

          if (addedOptions.length > 0) {
            setOptions(prev => [...prev, ...addedOptions]);
          }

          console.log(`[ProblemOptions] Migrated ${addedOptions.length} custom problems`);
        }
      }

      // Clear old localStorage data
      localStorage.setItem(MIGRATION_FLAG_KEY, 'true');
      localStorage.removeItem(LEGACY_STORAGE_KEY);
      localStorage.removeItem(HIDDEN_STORAGE_KEY);
    } catch (e) {
      console.error('[ProblemOptions] Migration error:', e);
    }
  }

  // Add new option with optimistic update
  const addOption = useCallback(async (label: string) => {
    // Create temporary option for optimistic update
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const tempOption: ProblemOption = { id: tempId, label: label.trim(), isDefault: false };

    // Optimistic update
    setOptions(prev => [...prev, tempOption]);

    try {
      const response = await fetch('/api/problem-options', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          label: label.trim(),
          isDefault: false,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create option');
      }

      const created: ProblemOptionDB = await response.json();

      // Replace temp option with real one
      setOptions(prev => prev.map(o => o.id === tempId ? dbToOption(created) : o));

      return dbToOption(created);
    } catch (e) {
      // Rollback on error
      setOptions(prev => prev.filter(o => o.id !== tempId));
      console.error('[ProblemOptions] Failed to add option:', e);
      throw e;
    }
  }, []);

  // Delete option with optimistic update
  const deleteOption = useCallback(async (id: string) => {
    // Store original for rollback
    const original = options.find(o => o.id === id);
    if (!original) return;

    // Optimistic update
    setOptions(prev => prev.filter(o => o.id !== id));

    try {
      const response = await fetch(`/api/problem-options/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete option');
      }
    } catch (e) {
      // Rollback on error
      setOptions(prev => [...prev, original]);
      console.error('[ProblemOptions] Failed to delete option:', e);
      throw e;
    }
  }, [options]);

  // Reset to defaults
  const resetToDefaults = useCallback(async () => {
    try {
      // Delete all options
      await fetch('/api/problem-options/seed', {
        method: 'DELETE',
      });

      // Re-seed defaults
      await fetch('/api/problem-options/seed', {
        method: 'POST',
      });

      // Refresh from API
      const response = await fetch('/api/problem-options');
      if (response.ok) {
        const data: ProblemOptionDB[] = await response.json();
        setOptions(data.map(dbToOption));
      }
    } catch (e) {
      console.error('[ProblemOptions] Failed to reset to defaults:', e);
      setOptions(DEFAULT_PROBLEMS.map((label, i) => ({
        id: `default-${i}`,
        label,
        isDefault: true,
      })));
    }
  }, []);

  // Refresh from server
  const refresh = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/problem-options');
      if (response.ok) {
        const data: ProblemOptionDB[] = await response.json();
        setOptions(data.map(dbToOption));
      }
    } catch (e) {
      console.error('[ProblemOptions] Failed to refresh:', e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    options,
    addOption,
    deleteOption,
    resetToDefaults,
    refresh,
    isLoaded,
    isLoading,
    error,
  };
}
