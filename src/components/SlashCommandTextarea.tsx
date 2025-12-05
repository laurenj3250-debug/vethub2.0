'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { SlashCommandMenu, type SlashCommand } from './SlashCommandMenu';
import { useFieldSlashCommands } from '@/hooks/use-slash-commands';

interface SlashCommandTextareaProps {
  value: string;
  onChange: (value: string) => void;
  onFocus?: () => void;
  onPaste?: (e: React.ClipboardEvent) => void;
  field: string; // Which rounding field this is for
  rows?: number;
  placeholder?: string;
  className?: string;
  style?: React.CSSProperties;
}

export function SlashCommandTextarea({
  value,
  onChange,
  onFocus,
  onPaste,
  field,
  rows = 2,
  placeholder,
  className = '',
  style,
}: SlashCommandTextareaProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isSlashMenuOpen, setIsSlashMenuOpen] = useState(false);
  const [slashQuery, setSlashQuery] = useState('');
  const [slashStartIndex, setSlashStartIndex] = useState<number | null>(null);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });

  const { commands } = useFieldSlashCommands(field);

  // Convert to SlashCommand format expected by menu
  const menuCommands: SlashCommand[] = commands.map(cmd => ({
    id: cmd.id,
    trigger: cmd.trigger,
    label: cmd.label,
    text: cmd.text,
    category: cmd.category,
  }));

  const updateMenuPosition = useCallback(() => {
    if (textareaRef.current && slashStartIndex !== null) {
      const textarea = textareaRef.current;
      const rect = textarea.getBoundingClientRect();

      // Position below the textarea
      setMenuPosition({
        top: rect.height + 4,
        left: 0,
      });
    }
  }, [slashStartIndex]);

  useEffect(() => {
    if (isSlashMenuOpen) {
      updateMenuPosition();
    }
  }, [isSlashMenuOpen, updateMenuPosition]);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    const cursorPosition = e.target.selectionStart || 0;

    // Check for slash command trigger
    const beforeCursor = newValue.substring(0, cursorPosition);
    const lastSlashIndex = beforeCursor.lastIndexOf('/');

    if (lastSlashIndex !== -1) {
      // Check if slash is at start or after whitespace
      const charBeforeSlash = lastSlashIndex > 0 ? newValue[lastSlashIndex - 1] : ' ';
      if (charBeforeSlash === ' ' || charBeforeSlash === '\n' || lastSlashIndex === 0) {
        const queryAfterSlash = beforeCursor.substring(lastSlashIndex + 1);

        // Only show menu if query doesn't contain spaces (still typing command)
        if (!queryAfterSlash.includes(' ')) {
          setIsSlashMenuOpen(true);
          setSlashQuery(queryAfterSlash);
          setSlashStartIndex(lastSlashIndex);
          onChange(newValue);
          return;
        }
      }
    }

    // No active slash command
    setIsSlashMenuOpen(false);
    setSlashQuery('');
    setSlashStartIndex(null);
    onChange(newValue);
  };

  const handleSelect = (text: string) => {
    if (slashStartIndex === null) return;

    // Replace /command with the selected text
    const before = value.substring(0, slashStartIndex);
    const afterSlash = value.substring(slashStartIndex);
    const spaceIndex = afterSlash.indexOf(' ');
    const newlineIndex = afterSlash.indexOf('\n');

    // Find the end of the command (space, newline, or end of string)
    let endIndex = afterSlash.length;
    if (spaceIndex !== -1 && (newlineIndex === -1 || spaceIndex < newlineIndex)) {
      endIndex = spaceIndex;
    } else if (newlineIndex !== -1) {
      endIndex = newlineIndex;
    }

    const after = afterSlash.substring(endIndex);

    // If inserting at the end and there's content, add a newline before
    const needsNewlineBefore = before.trim().length > 0 && !before.endsWith('\n');
    const prefix = needsNewlineBefore ? '\n' : '';

    const newValue = before + prefix + text + after;
    onChange(newValue);

    setIsSlashMenuOpen(false);
    setSlashQuery('');
    setSlashStartIndex(null);

    // Focus back on textarea
    textareaRef.current?.focus();
  };

  const handleClose = () => {
    setIsSlashMenuOpen(false);
    setSlashQuery('');
    setSlashStartIndex(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Let the menu handle keyboard events when open
    if (isSlashMenuOpen) {
      if (['ArrowUp', 'ArrowDown', 'Enter', 'Tab', 'Escape'].includes(e.key)) {
        // Menu will handle these via document listener
        return;
      }
    }
  };

  return (
    <div className="relative">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleInputChange}
        onFocus={onFocus}
        onPaste={onPaste}
        onKeyDown={handleKeyDown}
        rows={rows}
        placeholder={placeholder}
        className={className}
        style={style}
      />
      <SlashCommandMenu
        isOpen={isSlashMenuOpen}
        searchQuery={slashQuery}
        commands={menuCommands}
        onSelect={handleSelect}
        onClose={handleClose}
        position={menuPosition}
      />
    </div>
  );
}
