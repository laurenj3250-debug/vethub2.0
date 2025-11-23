'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { quickInsertLibrary, type QuickInsertItem } from '@/data/quick-insert-library';

const STORAGE_KEY = 'vethub-quick-insert-items';
const VERSION_KEY = 'vethub-quick-insert-version';

/**
 * Simple hash function for generating version from library content
 * Changes automatically when library items are added/modified
 */
function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

/**
 * Hook for managing editable quick-insert phrases
 * Stores custom items in localStorage, falls back to default library
 */
export function useQuickInsert() {
  const [items, setItems] = useState<QuickInsertItem[]>(quickInsertLibrary);
  const [isLoaded, setIsLoaded] = useState(false);

  // Auto-generate version from library content - no manual increment needed
  const LIBRARY_VERSION = useMemo(() => {
    return hashCode(JSON.stringify(quickInsertLibrary));
  }, []);

  // Load from localStorage on mount, with version migration
  useEffect(() => {
    try {
      const storedVersion = localStorage.getItem(VERSION_KEY);
      const stored = localStorage.getItem(STORAGE_KEY);

      // If version changed or no version stored, migrate
      if (storedVersion !== String(LIBRARY_VERSION)) {
        console.log(`[QuickInsert] Migration needed: stored=${storedVersion}, current=${LIBRARY_VERSION}`);

        if (stored) {
          try {
            const parsed = JSON.parse(stored) as QuickInsertItem[];
            // Keep user's custom items (id starts with 'custom-')
            const customItems = parsed.filter(item => item.id.startsWith('custom-'));
            // Use all new library items + user's custom items
            const mergedItems = [...quickInsertLibrary, ...customItems];
            setItems(mergedItems);

            // Only save after successful parse and merge
            localStorage.setItem(STORAGE_KEY, JSON.stringify(mergedItems));
            localStorage.setItem(VERSION_KEY, String(LIBRARY_VERSION));
            console.log(`[QuickInsert] Migrated: kept ${customItems.length} custom items, total ${mergedItems.length}`);
          } catch (parseError) {
            // Corrupted localStorage - fall back to defaults, don't corrupt further
            console.error('[QuickInsert] Corrupted data, using defaults:', parseError);
            setItems(quickInsertLibrary);
            localStorage.setItem(VERSION_KEY, String(LIBRARY_VERSION));
            // Don't save STORAGE_KEY - let it be rebuilt on next save
          }
        } else {
          // No stored items, just update version
          localStorage.setItem(VERSION_KEY, String(LIBRARY_VERSION));
        }
      } else if (stored) {
        // Same version, just load stored items
        try {
          const parsed = JSON.parse(stored);
          setItems(parsed);
        } catch (parseError) {
          console.error('[QuickInsert] Failed to parse stored items, using defaults:', parseError);
          setItems(quickInsertLibrary);
        }
      }
    } catch (e) {
      // Complete failure - use defaults, don't touch localStorage
      console.error('[QuickInsert] Failed to load, using defaults:', e);
      setItems(quickInsertLibrary);
    }
    setIsLoaded(true);
  }, [LIBRARY_VERSION]);

  // Save to localStorage whenever items change (after initial load)
  useEffect(() => {
    if (isLoaded) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
      } catch (e) {
        console.error('Failed to save quick-insert items:', e);
      }
    }
  }, [items, isLoaded]);

  // Get items by category and field
  const getItems = useCallback((
    category: 'surgery' | 'seizures' | 'other',
    field: 'therapeutics' | 'diagnostics' | 'concerns' | 'problems'
  ) => {
    return items.filter(item => item.category === category && item.field === field);
  }, [items]);

  // Add new item
  const addItem = useCallback((item: Omit<QuickInsertItem, 'id'>) => {
    const newItem: QuickInsertItem = {
      ...item,
      id: `custom-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    };
    setItems(prev => [...prev, newItem]);
    return newItem;
  }, []);

  // Update existing item
  const updateItem = useCallback((id: string, updates: Partial<QuickInsertItem>) => {
    setItems(prev => prev.map(item =>
      item.id === id ? { ...item, ...updates } : item
    ));
  }, []);

  // Delete item
  const deleteItem = useCallback((id: string) => {
    setItems(prev => prev.filter(item => item.id !== id));
  }, []);

  // Reset to defaults
  const resetToDefaults = useCallback(() => {
    setItems(quickInsertLibrary);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  return {
    items,
    getItems,
    addItem,
    updateItem,
    deleteItem,
    resetToDefaults,
    isLoaded,
  };
}
