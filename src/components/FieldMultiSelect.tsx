'use client';

import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, X } from 'lucide-react';

interface FieldMultiSelectProps {
  value: string;
  onChange: (val: string) => void;
  options: readonly string[];
  placeholder?: string;
  'aria-label'?: string;
  className?: string;
}

/**
 * Generic multi-select dropdown for rounding sheet fields.
 * Supports:
 * - Multiple selection from predefined options
 * - Direct typing to add custom values
 * - Paste handling for comma/semicolon separated values
 * - Chips display with remove buttons
 */
export function FieldMultiSelect({
  value,
  onChange,
  options,
  placeholder = "Type or click \u25BC",
  'aria-label': ariaLabel,
  className,
}: FieldMultiSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [directInput, setDirectInput] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Parse comma-separated value into array
  const selectedItems = value ? value.split(', ').filter(Boolean) : [];

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleOption = (optionLabel: string) => {
    const newSelected = selectedItems.includes(optionLabel)
      ? selectedItems.filter(item => item !== optionLabel)
      : [...selectedItems, optionLabel];
    onChange(newSelected.join(', '));
  };

  const removeItem = (item: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(selectedItems.filter(i => i !== item).join(', '));
  };

  // Add an item from direct input
  const addItem = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;

    // Check if already selected
    if (selectedItems.includes(trimmed)) return;

    // Check if it matches an existing option (case-insensitive)
    const matchingOption = options.find(opt =>
      opt.toLowerCase() === trimmed.toLowerCase()
    );

    const labelToAdd = matchingOption || trimmed;
    onChange([...selectedItems, labelToAdd].join(', '));
  };

  const handleDirectInputSubmit = () => {
    const trimmed = directInput.trim();
    if (!trimmed) return;
    addItem(trimmed);
    setDirectInput('');
  };

  // Handle paste - parse comma/newline separated values
  const handlePaste = (e: React.ClipboardEvent) => {
    const pasteData = e.clipboardData.getData('text');
    if (!pasteData.trim()) return;

    e.preventDefault();
    e.stopPropagation();

    // Parse by comma, semicolon, or newline
    const pastedItems = pasteData
      .split(/[,;\n]/)
      .map(item => item.trim())
      .filter(Boolean);

    if (pastedItems.length === 0) return;

    const newSelected = [...selectedItems];

    for (const item of pastedItems) {
      // Check if already selected
      if (newSelected.includes(item)) continue;

      // Try to find matching option (case-insensitive)
      const matchingOption = options.find(opt =>
        opt.toLowerCase() === item.toLowerCase()
      );

      newSelected.push(matchingOption || item);
    }

    onChange(newSelected.join(', '));
  };

  return (
    <div ref={dropdownRef} className={`relative ${className || ''}`}>
      <div
        onClick={(e) => {
          // Don't toggle dropdown if clicking on the input
          if ((e.target as HTMLElement).tagName !== 'INPUT') {
            setIsOpen(!isOpen);
          }
        }}
        onPaste={handlePaste}
        tabIndex={0}
        className="w-full px-0.5 py-0.5 rounded text-gray-900 text-xs bg-gray-50 cursor-pointer min-h-[26px] flex items-center justify-between gap-1 focus:outline-none focus:ring-1 focus:ring-[#6BB89D]"
        style={{ border: '1px solid #ccc' }}
      >
        <div className="flex-1 flex flex-wrap gap-0.5 items-center overflow-hidden">
          {selectedItems.map(item => (
            <span
              key={item}
              className="inline-flex items-center gap-0.5 px-1 py-0.5 bg-emerald-100 text-emerald-800 rounded text-[10px] font-medium"
            >
              {item}
              <X
                size={10}
                className="cursor-pointer hover:text-emerald-600"
                onClick={(e) => removeItem(item, e)}
              />
            </span>
          ))}
          {/* Inline input for typing directly */}
          <input
            ref={inputRef}
            type="text"
            value={directInput}
            onChange={(e) => setDirectInput(e.target.value)}
            onKeyDown={(e) => {
              e.stopPropagation();
              if (e.key === 'Enter') {
                e.preventDefault();
                handleDirectInputSubmit();
              }
              if (e.key === 'Escape') {
                setDirectInput('');
                inputRef.current?.blur();
              }
            }}
            onClick={(e) => e.stopPropagation()}
            placeholder={selectedItems.length === 0 ? placeholder : ""}
            aria-label={ariaLabel}
            className="flex-1 min-w-[60px] bg-transparent border-none outline-none text-xs placeholder-gray-400"
          />
        </div>
        <ChevronDown size={12} className={`text-gray-400 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </div>

      {isOpen && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute top-full left-0 mt-0.5 bg-white rounded shadow-lg z-50 max-h-[280px] overflow-y-auto min-w-[200px] max-w-[300px]"
          style={{ border: '1px solid #ccc' }}
        >
          {options.length === 0 ? (
            <div className="px-2 py-3 text-xs text-gray-400 text-center">No options available</div>
          ) : (
            options.map(option => (
              <div
                key={option}
                onClick={() => toggleOption(option)}
                className="flex items-center gap-2 px-2 py-1.5 hover:bg-gray-50 text-xs cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={selectedItems.includes(option)}
                  onChange={() => toggleOption(option)}
                  className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 shrink-0"
                />
                <span className="truncate" title={option}>{option}</span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
