'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Search, Plus, Edit2, Trash2 } from 'lucide-react';

export interface SlashCommand {
  id: string;
  trigger: string; // e.g., "gaba300" - what user types after /
  label: string; // Display name
  text: string; // What gets inserted
  category?: string;
}

interface SlashCommandMenuProps {
  isOpen: boolean;
  searchQuery: string; // Everything after the /
  commands: SlashCommand[];
  onSelect: (text: string) => void;
  onClose: () => void;
  position?: { top: number; left: number };
  onAddCommand?: () => void;
}

export function SlashCommandMenu({
  isOpen,
  searchQuery,
  commands,
  onSelect,
  onClose,
  position,
  onAddCommand,
}: SlashCommandMenuProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const menuRef = useRef<HTMLDivElement>(null);
  const selectedRef = useRef<HTMLButtonElement>(null);

  // Filter commands based on search query
  const filteredCommands = useMemo(() => {
    if (!searchQuery) return commands.slice(0, 15); // Show first 15 if no query

    const query = searchQuery.toLowerCase();
    return commands
      .filter(cmd =>
        cmd.trigger.toLowerCase().includes(query) ||
        cmd.label.toLowerCase().includes(query) ||
        cmd.text.toLowerCase().includes(query)
      )
      .slice(0, 10); // Limit to 10 results
  }, [commands, searchQuery]);

  // Reset selection when filtered results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [filteredCommands.length, searchQuery]);

  // Scroll selected item into view
  useEffect(() => {
    if (selectedRef.current) {
      selectedRef.current.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(prev =>
            prev < filteredCommands.length - 1 ? prev + 1 : prev
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(prev => prev > 0 ? prev - 1 : prev);
          break;
        case 'Enter':
        case 'Tab':
          e.preventDefault();
          if (filteredCommands[selectedIndex]) {
            onSelect(filteredCommands[selectedIndex].text);
          }
          break;
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filteredCommands, selectedIndex, onSelect, onClose]);

  // Click outside to close
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      ref={menuRef}
      className="absolute z-50 bg-white rounded-lg shadow-xl overflow-hidden"
      style={{
        top: position?.top ?? '100%',
        left: position?.left ?? 0,
        minWidth: '320px',
        maxWidth: '450px',
        border: '2px solid #000',
        boxShadow: '4px 4px 0 #000',
      }}
    >
      {/* Header */}
      <div
        className="px-3 py-2 flex items-center gap-2 text-xs font-bold text-gray-600"
        style={{ backgroundColor: '#F3F4F6', borderBottom: '1px solid #E5E7EB' }}
      >
        <span className="text-gray-900">/</span>
        <span>{searchQuery || 'type to search...'}</span>
        <span className="ml-auto text-[10px] text-gray-400">↑↓ navigate · Enter select · Esc close</span>
      </div>

      {/* Results */}
      <div className="max-h-[280px] overflow-y-auto">
        {filteredCommands.length === 0 ? (
          <div className="px-4 py-6 text-center text-gray-500 text-sm">
            No commands match "<span className="font-medium">{searchQuery}</span>"
            {onAddCommand && (
              <button
                onClick={onAddCommand}
                className="mt-2 flex items-center gap-1 mx-auto px-3 py-1.5 text-xs font-medium rounded-lg hover:bg-gray-100 transition"
                style={{ border: '1px solid #D1D5DB' }}
              >
                <Plus size={12} />
                Add new command
              </button>
            )}
          </div>
        ) : (
          filteredCommands.map((cmd, index) => (
            <button
              key={cmd.id}
              ref={index === selectedIndex ? selectedRef : null}
              onClick={() => onSelect(cmd.text)}
              className={`w-full px-3 py-2 text-left flex flex-col gap-0.5 transition ${
                index === selectedIndex
                  ? 'bg-purple-50'
                  : 'hover:bg-gray-50'
              }`}
              style={{
                borderBottom: index < filteredCommands.length - 1 ? '1px solid #F3F4F6' : 'none',
              }}
            >
              {/* Command trigger and label */}
              <div className="flex items-center gap-2">
                <code
                  className="px-1.5 py-0.5 rounded text-xs font-mono font-bold"
                  style={{
                    backgroundColor: index === selectedIndex ? '#DCC4F5' : '#F3F4F6',
                    color: '#374151',
                  }}
                >
                  /{cmd.trigger}
                </code>
                <span className="text-sm font-medium text-gray-700">{cmd.label}</span>
                {cmd.category && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500">
                    {cmd.category}
                  </span>
                )}
              </div>

              {/* Preview of what gets inserted */}
              <div
                className="text-xs text-gray-500 truncate pl-1"
                style={{ maxWidth: '400px' }}
              >
                → {cmd.text.length > 60 ? cmd.text.substring(0, 60) + '...' : cmd.text}
              </div>
            </button>
          ))
        )}
      </div>

      {/* Footer hint */}
      {filteredCommands.length > 0 && onAddCommand && (
        <div
          className="px-3 py-1.5 flex items-center justify-between text-[10px] text-gray-400"
          style={{ backgroundColor: '#FAFAFA', borderTop: '1px solid #E5E7EB' }}
        >
          <span>{filteredCommands.length} command{filteredCommands.length !== 1 ? 's' : ''}</span>
          <button
            onClick={onAddCommand}
            className="flex items-center gap-1 hover:text-gray-600 transition"
          >
            <Plus size={10} />
            Add new
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * Hook to manage slash command state for a text input
 */
export function useSlashCommands(commands: SlashCommand[]) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [slashStartIndex, setSlashStartIndex] = useState<number | null>(null);

  const handleInputChange = (
    value: string,
    cursorPosition: number,
    onChange: (newValue: string) => void
  ) => {
    // Check for slash command trigger
    const beforeCursor = value.substring(0, cursorPosition);
    const lastSlashIndex = beforeCursor.lastIndexOf('/');

    if (lastSlashIndex !== -1) {
      // Check if slash is at start or after whitespace
      const charBeforeSlash = lastSlashIndex > 0 ? value[lastSlashIndex - 1] : ' ';
      if (charBeforeSlash === ' ' || charBeforeSlash === '\n' || lastSlashIndex === 0) {
        const queryAfterSlash = beforeCursor.substring(lastSlashIndex + 1);

        // Only show menu if query doesn't contain spaces (still typing command)
        if (!queryAfterSlash.includes(' ')) {
          setIsOpen(true);
          setQuery(queryAfterSlash);
          setSlashStartIndex(lastSlashIndex);
          onChange(value);
          return;
        }
      }
    }

    // No active slash command
    setIsOpen(false);
    setQuery('');
    setSlashStartIndex(null);
    onChange(value);
  };

  const handleSelect = (
    text: string,
    currentValue: string,
    onChange: (newValue: string) => void
  ) => {
    if (slashStartIndex === null) return;

    // Replace /command with the selected text
    const before = currentValue.substring(0, slashStartIndex);
    const afterSlash = currentValue.substring(slashStartIndex);
    const spaceIndex = afterSlash.indexOf(' ');
    const after = spaceIndex !== -1 ? afterSlash.substring(spaceIndex) : '';

    const newValue = before + text + after;
    onChange(newValue);

    setIsOpen(false);
    setQuery('');
    setSlashStartIndex(null);
  };

  const close = () => {
    setIsOpen(false);
    setQuery('');
    setSlashStartIndex(null);
  };

  return {
    isOpen,
    query,
    handleInputChange,
    handleSelect,
    close,
  };
}
