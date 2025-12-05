'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { quickInsertLibrary } from '@/data/quick-insert-library';

export interface SlashCommand {
  id: string;
  trigger: string; // What user types after /
  label: string; // Display name
  text: string; // What gets inserted
  field: string; // Which rounding field
  category?: string;
  isCustom?: boolean; // User-created vs built-in
  isOverride?: boolean; // Overrides a built-in command
}

const STORAGE_KEY = 'vethub-slash-commands';

// Map quick-insert fields to rounding fields
const fieldMapping: Record<string, string> = {
  therapeutics: 'therapeutics',
  diagnostics: 'diagnosticFindings',
  concerns: 'concerns',
  problems: 'problems',
};

// Convert existing quick-insert library to slash commands
function getBuiltInCommands(): SlashCommand[] {
  return quickInsertLibrary.map(item => ({
    id: item.id,
    trigger: item.id.replace(/-/g, ''), // gaba-300 -> gaba300
    label: item.label,
    text: item.text,
    field: fieldMapping[item.field] || item.field,
    category: item.category,
    isCustom: false,
  }));
}

export function useSlashCommands() {
  const [customCommands, setCustomCommands] = useState<SlashCommand[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load custom commands from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setCustomCommands(JSON.parse(stored));
      }
    } catch (e) {
      console.error('Failed to load slash commands:', e);
    }
    setIsLoaded(true);
  }, []);

  // Save custom commands to localStorage
  const saveCustomCommands = useCallback((commands: SlashCommand[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(commands));
      setCustomCommands(commands);
    } catch (e) {
      console.error('Failed to save slash commands:', e);
    }
  }, []);

  // Get all commands - custom commands and overrides take precedence over built-in
  const allCommands = useMemo(() => {
    const builtIn = getBuiltInCommands();
    const customIds = new Set(customCommands.map(c => c.id));

    // Filter out built-in commands that have been overridden
    const filteredBuiltIn = builtIn.filter(cmd => !customIds.has(cmd.id));

    return [...filteredBuiltIn, ...customCommands];
  }, [customCommands]);

  // Get commands for a specific field
  const getCommandsForField = useCallback((field: string): SlashCommand[] => {
    return allCommands.filter(cmd => cmd.field === field);
  }, [allCommands]);

  // Add a new custom command
  const addCommand = useCallback((command: Omit<SlashCommand, 'id' | 'isCustom'>) => {
    const newCommand: SlashCommand = {
      ...command,
      id: `custom-${Date.now()}`,
      isCustom: true,
    };
    saveCustomCommands([...customCommands, newCommand]);
    return newCommand;
  }, [customCommands, saveCustomCommands]);

  // Update an existing command (works for both custom and built-in)
  const updateCommand = useCallback((id: string, updates: Partial<SlashCommand>) => {
    // Check if this is a built-in command being edited
    const builtIn = getBuiltInCommands().find(c => c.id === id);
    const existingCustom = customCommands.find(c => c.id === id);

    if (existingCustom) {
      // Update existing custom command
      const updated = customCommands.map(cmd =>
        cmd.id === id ? { ...cmd, ...updates } : cmd
      );
      saveCustomCommands(updated);
    } else if (builtIn) {
      // Create an override for the built-in command
      const override: SlashCommand = {
        ...builtIn,
        ...updates,
        id: id, // Keep the same ID to override
        isCustom: true,
        isOverride: true,
      };
      saveCustomCommands([...customCommands, override]);
    }
  }, [customCommands, saveCustomCommands]);

  // Delete a command
  const deleteCommand = useCallback((id: string) => {
    const filtered = customCommands.filter(cmd => cmd.id !== id);
    saveCustomCommands(filtered);
  }, [customCommands, saveCustomCommands]);

  // Reset a built-in command to its original state
  const resetCommand = useCallback((id: string) => {
    const filtered = customCommands.filter(cmd => cmd.id !== id);
    saveCustomCommands(filtered);
  }, [customCommands, saveCustomCommands]);

  // Check if a command has been modified from its original
  const isModified = useCallback((id: string) => {
    return customCommands.some(cmd => cmd.id === id && cmd.isOverride);
  }, [customCommands]);

  // Import commands (for bulk operations)
  const importCommands = useCallback((commands: SlashCommand[]) => {
    const withCustomFlag = commands.map(cmd => ({
      ...cmd,
      id: cmd.id || `custom-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      isCustom: true,
    }));
    saveCustomCommands([...customCommands, ...withCustomFlag]);
  }, [customCommands, saveCustomCommands]);

  // Export custom commands
  const exportCommands = useCallback(() => {
    return JSON.stringify(customCommands, null, 2);
  }, [customCommands]);

  return {
    commands: allCommands,
    customCommands,
    builtInCommands: getBuiltInCommands(),
    isLoaded,
    getCommandsForField,
    addCommand,
    updateCommand,
    deleteCommand,
    resetCommand,
    isModified,
    importCommands,
    exportCommands,
  };
}

// Simpler hook for use in textareas - just returns commands for a field
export function useFieldSlashCommands(field: string) {
  const { commands, isLoaded } = useSlashCommands();

  const fieldCommands = commands.filter(cmd => cmd.field === field);

  return {
    commands: fieldCommands,
    isLoaded,
  };
}
