'use client';

import { useState, useEffect, useCallback } from 'react';
import { quickInsertLibrary, type QuickInsertItem } from '@/data/quick-insert-library';

const LEGACY_STORAGE_KEY = 'vethub-quick-insert-items';
const MIGRATION_FLAG_KEY = 'vethub-quick-insert-migrated-to-db';

// API response type from database
interface QuickInsertOptionDB {
  id: string;
  label: string;
  text: string;
  category: string;
  field: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

// Convert DB response to QuickInsertItem format
function dbToItem(dbOption: QuickInsertOptionDB): QuickInsertItem {
  return {
    id: dbOption.id,
    label: dbOption.label,
    text: dbOption.text,
    category: dbOption.category as 'surgery' | 'seizures' | 'other',
    field: dbOption.field as 'therapeutics' | 'diagnostics' | 'concerns' | 'problems',
  };
}

/**
 * Hook for managing quick-insert phrases with server-side sync
 * Fetches from API, with optimistic updates for snappy UX
 */
export function useQuickInsert() {
  const [items, setItems] = useState<QuickInsertItem[]>(quickInsertLibrary);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load from API on mount
  useEffect(() => {
    async function loadOptions() {
      try {
        setIsLoading(true);
        setError(null);

        // First, try to load from API
        const response = await fetch('/api/quick-options');

        if (!response.ok) {
          throw new Error('Failed to fetch quick options');
        }

        const data: QuickInsertOptionDB[] = await response.json();

        // If database is empty, seed with defaults
        if (data.length === 0) {
          console.log('[QuickInsert] Database empty, seeding defaults...');

          const seedResponse = await fetch('/api/quick-options/seed', {
            method: 'POST',
          });

          if (!seedResponse.ok) {
            console.error('[QuickInsert] Failed to seed defaults');
            // Fall back to local library
            setItems(quickInsertLibrary);
            setIsLoaded(true);
            setIsLoading(false);
            return;
          }

          // Fetch again after seeding
          const refreshResponse = await fetch('/api/quick-options');
          if (refreshResponse.ok) {
            const seededData: QuickInsertOptionDB[] = await refreshResponse.json();
            setItems(seededData.map(dbToItem));
          } else {
            setItems(quickInsertLibrary);
          }
        } else {
          // Use the data from API
          setItems(data.map(dbToItem));
        }

        // Check for localStorage migration
        await migrateLocalStorage();

        setIsLoaded(true);
      } catch (e) {
        console.error('[QuickInsert] Error loading options:', e);
        setError(e instanceof Error ? e.message : 'Failed to load options');
        // Fall back to local library
        setItems(quickInsertLibrary);
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

      // Check for old localStorage data
      const stored = localStorage.getItem(LEGACY_STORAGE_KEY);
      if (!stored) {
        localStorage.setItem(MIGRATION_FLAG_KEY, 'true');
        return;
      }

      const parsed = JSON.parse(stored) as QuickInsertItem[];
      // Get only custom items (not defaults)
      const customItems = parsed.filter(item => item.id.startsWith('custom-'));

      if (customItems.length > 0) {
        console.log(`[QuickInsert] Migrating ${customItems.length} custom items to database...`);

        // Add each custom item to the database
        const addedItems: QuickInsertItem[] = [];
        for (const item of customItems) {
          try {
            const response = await fetch('/api/quick-options', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                label: item.label,
                text: item.text,
                category: item.category,
                field: item.field,
                isDefault: false,
              }),
            });

            if (response.ok) {
              const created: QuickInsertOptionDB = await response.json();
              addedItems.push(dbToItem(created));
            }
          } catch (e) {
            console.error('[QuickInsert] Failed to migrate item:', item.label, e);
          }
        }

        // Update local state with migrated items
        if (addedItems.length > 0) {
          setItems(prev => [...prev, ...addedItems]);
        }

        console.log(`[QuickInsert] Migrated ${addedItems.length} custom items`);
      }

      // Mark as migrated and clear old data
      localStorage.setItem(MIGRATION_FLAG_KEY, 'true');
      localStorage.removeItem(LEGACY_STORAGE_KEY);
      localStorage.removeItem('vethub-quick-insert-version');
    } catch (e) {
      console.error('[QuickInsert] Migration error:', e);
    }
  }

  // Get items by category and field
  const getItems = useCallback((
    category: 'surgery' | 'seizures' | 'other',
    field: 'therapeutics' | 'diagnostics' | 'concerns' | 'problems'
  ) => {
    return items.filter(item => item.category === category && item.field === field);
  }, [items]);

  // Add new item with optimistic update
  const addItem = useCallback(async (item: Omit<QuickInsertItem, 'id'>) => {
    // Create temporary item for optimistic update
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const tempItem: QuickInsertItem = { ...item, id: tempId };

    // Optimistic update
    setItems(prev => [...prev, tempItem]);

    try {
      const response = await fetch('/api/quick-options', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...item,
          isDefault: false,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create option');
      }

      const created: QuickInsertOptionDB = await response.json();

      // Replace temp item with real one
      setItems(prev => prev.map(i => i.id === tempId ? dbToItem(created) : i));

      return dbToItem(created);
    } catch (e) {
      // Rollback on error
      setItems(prev => prev.filter(i => i.id !== tempId));
      console.error('[QuickInsert] Failed to add item:', e);
      throw e;
    }
  }, []);

  // Update existing item with optimistic update
  const updateItem = useCallback(async (id: string, updates: Partial<QuickInsertItem>) => {
    // Store original for rollback
    const original = items.find(i => i.id === id);
    if (!original) return;

    // Optimistic update
    setItems(prev => prev.map(item =>
      item.id === id ? { ...item, ...updates } : item
    ));

    try {
      const response = await fetch(`/api/quick-options/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        throw new Error('Failed to update option');
      }

      const updated: QuickInsertOptionDB = await response.json();
      // Update with server response
      setItems(prev => prev.map(item =>
        item.id === id ? dbToItem(updated) : item
      ));
    } catch (e) {
      // Rollback on error
      setItems(prev => prev.map(item =>
        item.id === id ? original : item
      ));
      console.error('[QuickInsert] Failed to update item:', e);
      throw e;
    }
  }, [items]);

  // Delete item with optimistic update
  const deleteItem = useCallback(async (id: string) => {
    // Store original for rollback
    const original = items.find(i => i.id === id);
    if (!original) return;

    // Optimistic update
    setItems(prev => prev.filter(item => item.id !== id));

    try {
      const response = await fetch(`/api/quick-options/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete option');
      }
    } catch (e) {
      // Rollback on error
      setItems(prev => [...prev, original]);
      console.error('[QuickInsert] Failed to delete item:', e);
      throw e;
    }
  }, [items]);

  // Reset to defaults
  const resetToDefaults = useCallback(async () => {
    try {
      // Delete all user-added options
      await fetch('/api/quick-options/seed', {
        method: 'DELETE',
      });

      // Re-seed defaults
      await fetch('/api/quick-options/seed', {
        method: 'POST',
      });

      // Refresh from API
      const response = await fetch('/api/quick-options');
      if (response.ok) {
        const data: QuickInsertOptionDB[] = await response.json();
        setItems(data.map(dbToItem));
      }
    } catch (e) {
      console.error('[QuickInsert] Failed to reset to defaults:', e);
      // Fall back to local library
      setItems(quickInsertLibrary);
    }
  }, []);

  // Refresh from server
  const refresh = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/quick-options');
      if (response.ok) {
        const data: QuickInsertOptionDB[] = await response.json();
        setItems(data.map(dbToItem));
      }
    } catch (e) {
      console.error('[QuickInsert] Failed to refresh:', e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    items,
    getItems,
    addItem,
    updateItem,
    deleteItem,
    resetToDefaults,
    refresh,
    isLoaded,
    isLoading,
    error,
  };
}
