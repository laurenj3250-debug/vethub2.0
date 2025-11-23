'use client';

import { useState, useEffect, useCallback } from 'react';
import { quickInsertLibrary, type QuickInsertItem } from '@/data/quick-insert-library';

const STORAGE_KEY = 'vethub-quick-insert-items';
const VERSION_KEY = 'vethub-quick-insert-version';
const CURRENT_VERSION = 2; // Increment when adding new items to library

/**
 * Hook for managing editable quick-insert phrases
 * Stores custom items in localStorage, falls back to default library
 */
export function useQuickInsert() {
  const [items, setItems] = useState<QuickInsertItem[]>(quickInsertLibrary);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load from localStorage on mount, with version migration
  useEffect(() => {
    try {
      const storedVersion = localStorage.getItem(VERSION_KEY);
      const currentStoredVersion = storedVersion ? parseInt(storedVersion, 10) : 0;

      // If version changed, merge new library items with user's custom items
      if (currentStoredVersion < CURRENT_VERSION) {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored) as QuickInsertItem[];
          // Keep user's custom items (id starts with 'custom-')
          const customItems = parsed.filter(item => item.id.startsWith('custom-'));
          // Use all new library items + user's custom items
          const mergedItems = [...quickInsertLibrary, ...customItems];
          setItems(mergedItems);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(mergedItems));
        }
        // Update version
        localStorage.setItem(VERSION_KEY, String(CURRENT_VERSION));
      } else {
        // Same version, just load stored items
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          setItems(parsed);
        }
      }
    } catch (e) {
      console.error('Failed to load quick-insert items:', e);
    }
    setIsLoaded(true);
  }, []);

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
