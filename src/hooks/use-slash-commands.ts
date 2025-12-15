'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';

export interface SlashCommand {
  id: string;
  trigger: string; // What user types after /
  label: string; // Display name
  text: string; // What gets inserted
  field: string; // Which rounding field (mapped for UI)
  category?: string;
  isCustom?: boolean; // User-created vs built-in
  isOverride?: boolean; // Overrides a built-in command
}

// API response type from database
interface QuickInsertOptionDB {
  id: string;
  trigger: string | null;
  label: string;
  text: string;
  category: string;
  field: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

const LEGACY_STORAGE_KEY = 'vethub-slash-commands';
const MIGRATION_FLAG_KEY = 'vethub-slash-commands-migrated-to-db';

// Map database fields to rounding sheet fields
const fieldToRoundingMap: Record<string, string> = {
  therapeutics: 'therapeutics',
  diagnostics: 'diagnosticFindings',
  concerns: 'comments', // O/N concerns commands go to Comments field
  problems: 'problems',
};

// Reverse map for saving to database
const roundingToFieldMap: Record<string, string> = {
  therapeutics: 'therapeutics',
  diagnosticFindings: 'diagnostics',
  comments: 'concerns',
  problems: 'problems',
};

// Convert database option to SlashCommand format
function dbToCommand(option: QuickInsertOptionDB): SlashCommand | null {
  // Only options with triggers become slash commands
  if (!option.trigger) return null;

  return {
    id: option.id,
    trigger: option.trigger,
    label: option.label,
    text: option.text,
    field: fieldToRoundingMap[option.field] || option.field,
    category: option.category,
    isCustom: !option.isDefault,
    isOverride: false,
  };
}

export function useSlashCommands() {
  const [commands, setCommands] = useState<SlashCommand[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load commands from API on mount
  useEffect(() => {
    async function loadCommands() {
      try {
        setIsLoading(true);
        setError(null);

        // First, migrate localStorage if needed
        await migrateLocalStorage();

        // Fetch from API
        const response = await fetch('/api/quick-options');

        if (!response.ok) {
          throw new Error('Failed to fetch quick options');
        }

        const data: QuickInsertOptionDB[] = await response.json();

        // If database is empty, seed with defaults
        if (data.length === 0) {
          console.log('[SlashCommands] Database empty, seeding defaults...');

          const seedResponse = await fetch('/api/quick-options/seed', {
            method: 'POST',
          });

          if (seedResponse.ok) {
            // Fetch again after seeding
            const refreshResponse = await fetch('/api/quick-options');
            if (refreshResponse.ok) {
              const seededData: QuickInsertOptionDB[] = await refreshResponse.json();
              const cmds = seededData
                .map(dbToCommand)
                .filter((cmd): cmd is SlashCommand => cmd !== null);
              setCommands(cmds);
            }
          }
        } else {
          // Convert to SlashCommand format (only items with triggers)
          const cmds = data
            .map(dbToCommand)
            .filter((cmd): cmd is SlashCommand => cmd !== null);
          setCommands(cmds);
        }

        setIsLoaded(true);
      } catch (e) {
        console.error('[SlashCommands] Error loading:', e);
        setError(e instanceof Error ? e.message : 'Failed to load commands');
        setIsLoaded(true);
      } finally {
        setIsLoading(false);
      }
    }

    loadCommands();
  }, []);

  // One-time migration from localStorage to database
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

      const customCommands = JSON.parse(stored) as SlashCommand[];

      if (customCommands.length > 0) {
        console.log(`[SlashCommands] Migrating ${customCommands.length} custom commands to database...`);

        for (const cmd of customCommands) {
          try {
            await fetch('/api/quick-options', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                trigger: cmd.trigger,
                label: cmd.label,
                text: cmd.text,
                category: cmd.category || 'other',
                field: roundingToFieldMap[cmd.field] || cmd.field,
                isDefault: false,
              }),
            });
          } catch (e) {
            console.error('[SlashCommands] Failed to migrate command:', cmd.trigger, e);
          }
        }

        console.log('[SlashCommands] Migration complete');
      }

      // Mark as migrated and clear old data
      localStorage.setItem(MIGRATION_FLAG_KEY, 'true');
      localStorage.removeItem(LEGACY_STORAGE_KEY);
    } catch (e) {
      console.error('[SlashCommands] Migration error:', e);
    }
  }

  // Get custom commands (user-added, not defaults)
  const customCommands = useMemo(() => {
    return commands.filter(cmd => cmd.isCustom);
  }, [commands]);

  // Get built-in commands (defaults)
  const builtInCommands = useMemo(() => {
    return commands.filter(cmd => !cmd.isCustom);
  }, [commands]);

  // Get commands for a specific field
  const getCommandsForField = useCallback((field: string): SlashCommand[] => {
    return commands.filter(cmd => cmd.field === field);
  }, [commands]);

  // Add a new custom command
  const addCommand = useCallback(async (command: Omit<SlashCommand, 'id' | 'isCustom'>) => {
    // Create temporary command for optimistic update
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const tempCommand: SlashCommand = {
      ...command,
      id: tempId,
      isCustom: true,
    };

    // Optimistic update
    setCommands(prev => [...prev, tempCommand]);

    try {
      const response = await fetch('/api/quick-options', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trigger: command.trigger,
          label: command.label,
          text: command.text,
          category: command.category || 'other',
          field: roundingToFieldMap[command.field] || command.field,
          isDefault: false,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create command');
      }

      const created: QuickInsertOptionDB = await response.json();
      const newCommand = dbToCommand(created);

      if (newCommand) {
        // Replace temp command with real one
        setCommands(prev => prev.map(cmd =>
          cmd.id === tempId ? newCommand : cmd
        ));
        return newCommand;
      }
    } catch (e) {
      // Rollback on error
      setCommands(prev => prev.filter(cmd => cmd.id !== tempId));
      console.error('[SlashCommands] Failed to add command:', e);
      throw e;
    }
  }, []);

  // Update an existing command
  const updateCommand = useCallback(async (id: string, updates: Partial<SlashCommand>) => {
    // Store original for rollback
    const original = commands.find(cmd => cmd.id === id);
    if (!original) return;

    // Optimistic update
    setCommands(prev => prev.map(cmd =>
      cmd.id === id ? { ...cmd, ...updates } : cmd
    ));

    try {
      const response = await fetch(`/api/quick-options/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...(updates.trigger !== undefined && { trigger: updates.trigger }),
          ...(updates.label !== undefined && { label: updates.label }),
          ...(updates.text !== undefined && { text: updates.text }),
          ...(updates.field !== undefined && { field: roundingToFieldMap[updates.field] || updates.field }),
          ...(updates.category !== undefined && { category: updates.category }),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update command');
      }

      const updated: QuickInsertOptionDB = await response.json();
      const updatedCommand = dbToCommand(updated);

      if (updatedCommand) {
        setCommands(prev => prev.map(cmd =>
          cmd.id === id ? updatedCommand : cmd
        ));
      }
    } catch (e) {
      // Rollback on error
      setCommands(prev => prev.map(cmd =>
        cmd.id === id ? original : cmd
      ));
      console.error('[SlashCommands] Failed to update command:', e);
      throw e;
    }
  }, [commands]);

  // Delete a command
  const deleteCommand = useCallback(async (id: string) => {
    // Store original for rollback
    const original = commands.find(cmd => cmd.id === id);
    if (!original) return;

    // Optimistic update
    setCommands(prev => prev.filter(cmd => cmd.id !== id));

    try {
      const response = await fetch(`/api/quick-options/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete command');
      }
    } catch (e) {
      // Rollback on error
      setCommands(prev => [...prev, original]);
      console.error('[SlashCommands] Failed to delete command:', e);
      throw e;
    }
  }, [commands]);

  // Reset a built-in command to its original state (delete the override)
  const resetCommand = useCallback(async (id: string) => {
    await deleteCommand(id);
  }, [deleteCommand]);

  // Check if a command has been modified from its original
  const isModified = useCallback((id: string) => {
    return commands.some(cmd => cmd.id === id && cmd.isOverride);
  }, [commands]);

  // Import commands (for bulk operations)
  const importCommands = useCallback(async (commandsToImport: SlashCommand[]) => {
    for (const cmd of commandsToImport) {
      try {
        await addCommand({
          trigger: cmd.trigger,
          label: cmd.label,
          text: cmd.text,
          field: cmd.field,
          category: cmd.category,
        });
      } catch (e) {
        console.error('[SlashCommands] Failed to import command:', cmd.trigger, e);
      }
    }
  }, [addCommand]);

  // Export custom commands
  const exportCommands = useCallback(() => {
    return JSON.stringify(customCommands, null, 2);
  }, [customCommands]);

  // Refresh from server
  const refresh = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/quick-options');
      if (response.ok) {
        const data: QuickInsertOptionDB[] = await response.json();
        const cmds = data
          .map(dbToCommand)
          .filter((cmd): cmd is SlashCommand => cmd !== null);
        setCommands(cmds);
      }
    } catch (e) {
      console.error('[SlashCommands] Failed to refresh:', e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    commands,
    customCommands,
    builtInCommands,
    isLoaded,
    isLoading,
    error,
    getCommandsForField,
    addCommand,
    updateCommand,
    deleteCommand,
    resetCommand,
    isModified,
    importCommands,
    exportCommands,
    refresh,
  };
}

// Simpler hook for use in textareas - just returns commands for a field
export function useFieldSlashCommands(field: string) {
  const { commands, isLoaded } = useSlashCommands();

  const fieldCommands = useMemo(() => {
    return commands.filter(cmd => cmd.field === field);
  }, [commands, field]);

  return {
    commands: fieldCommands,
    isLoaded,
  };
}
