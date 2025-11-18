'use client';

import React, { useState, useEffect, useRef, KeyboardEvent } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

interface Suggestion {
  id: string;
  phrase: string;
  usageCount: number;
}

interface AutoCompleteInputProps {
  field: 'problems' | 'diagnostics' | 'therapeutics' | 'concerns';
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  multiline?: boolean;
  rows?: number;
}

export function AutoCompleteInput({
  field,
  value,
  onChange,
  placeholder,
  className,
  multiline = false,
  rows = 3,
}: AutoCompleteInputProps) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Fetch suggestions when user types
  useEffect(() => {
    const fetchSuggestions = async () => {
      if (value.length < 2) {
        setSuggestions([]);
        setShowSuggestions(false);
        return;
      }

      try {
        const response = await fetch(
          `/api/autocomplete?field=${field}&query=${encodeURIComponent(value)}`
        );

        if (response.ok) {
          const data = await response.json();
          setSuggestions(data);
          setShowSuggestions(data.length > 0);
          setSelectedIndex(0);
        }
      } catch (error) {
        console.error('Failed to fetch autocomplete suggestions:', error);
      }
    };

    const debounceTimeout = setTimeout(fetchSuggestions, 300);
    return () => clearTimeout(debounceTimeout);
  }, [value, field]);

  // Handle keyboard navigation
  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (!showSuggestions || suggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % suggestions.length);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + suggestions.length) % suggestions.length);
        break;
      case 'Enter':
        if (showSuggestions) {
          e.preventDefault();
          selectSuggestion(suggestions[selectedIndex]);
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        break;
    }
  };

  // Select a suggestion
  const selectSuggestion = async (suggestion: Suggestion) => {
    onChange(suggestion.phrase);
    setShowSuggestions(false);

    // Record usage
    try {
      await fetch('/api/autocomplete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          field,
          phrase: suggestion.phrase,
        }),
      });
    } catch (error) {
      console.error('Failed to record phrase usage:', error);
    }
  };

  // Record usage when user leaves field (saves current text)
  const handleBlur = async () => {
    // Delay to allow click on suggestion
    setTimeout(() => setShowSuggestions(false), 200);

    // If value is not empty, record it
    if (value.trim().length > 2) {
      try {
        await fetch('/api/autocomplete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            field,
            phrase: value.trim(),
          }),
        });
      } catch (error) {
        console.error('Failed to record phrase usage:', error);
      }
    }
  };

  const InputComponent = multiline ? Textarea : Input;

  return (
    <div className="relative">
      <InputComponent
        ref={inputRef as any}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        onFocus={() => {
          if (suggestions.length > 0) {
            setShowSuggestions(true);
          }
        }}
        placeholder={placeholder}
        className={className}
        rows={multiline ? rows : undefined}
      />

      {showSuggestions && suggestions.length > 0 && (
        <div
          ref={suggestionsRef}
          className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto"
        >
          {suggestions.map((suggestion, index) => (
            <div
              key={suggestion.id}
              className={`px-4 py-2 cursor-pointer ${
                index === selectedIndex
                  ? 'bg-blue-100 text-blue-900'
                  : 'hover:bg-gray-100'
              }`}
              onMouseDown={(e) => {
                e.preventDefault(); // Prevent blur
                selectSuggestion(suggestion);
              }}
              onMouseEnter={() => setSelectedIndex(index)}
            >
              <div className="flex justify-between items-center">
                <span className="text-sm">{suggestion.phrase}</span>
                <span className="text-xs text-gray-500">
                  {suggestion.usageCount > 1 ? `Used ${suggestion.usageCount}x` : ''}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
