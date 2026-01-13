'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { X, ChevronDown, Check } from 'lucide-react';
import { quickInsertLibrary } from '@/data/quick-insert-library';

// Build drug options from quick-insert library + Fluids
const DRUG_OPTIONS = [
  // Add Fluids as first option
  { id: 'fluids', label: 'Fluids', text: 'Fluids' },
  // Get unique therapeutics from quick-insert library
  ...quickInsertLibrary
    .filter(item => item.field === 'therapeutics')
    .map(item => ({
      id: item.id,
      label: item.label,
      text: item.text,
    })),
];

interface MultiSelectDrugPickerProps {
  selectedDrugs: string[];
  onSelectedDrugsChange: (drugs: string[]) => void;
  customText: string;
  onCustomTextChange: (text: string) => void;
  onFluidsSelected?: (selected: boolean) => void;
}

export function MultiSelectDrugPicker({
  selectedDrugs,
  onSelectedDrugsChange,
  customText,
  onCustomTextChange,
  onFluidsSelected,
}: MultiSelectDrugPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close on Escape and reset search when closing
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
        setSearch(''); // Reset search on close
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    } else {
      // Reset search when dropdown closes
      setSearch('');
    }
  }, [isOpen]);

  // Filter options by search
  const filteredOptions = useMemo(() => {
    if (!search.trim()) return DRUG_OPTIONS;
    const lower = search.toLowerCase();
    return DRUG_OPTIONS.filter(
      opt => opt.label.toLowerCase().includes(lower) || opt.text.toLowerCase().includes(lower)
    );
  }, [search]);

  const toggleDrug = (drugId: string) => {
    const isSelected = selectedDrugs.includes(drugId);
    let newSelection: string[];

    if (isSelected) {
      newSelection = selectedDrugs.filter(id => id !== drugId);
    } else {
      newSelection = [...selectedDrugs, drugId];
    }

    onSelectedDrugsChange(newSelection);

    // Notify parent if Fluids selection changed
    if (drugId === 'fluids' && onFluidsSelected) {
      onFluidsSelected(!isSelected);
    }
  };

  const removeDrug = (drugId: string) => {
    const newSelection = selectedDrugs.filter(id => id !== drugId);
    onSelectedDrugsChange(newSelection);

    if (drugId === 'fluids' && onFluidsSelected) {
      onFluidsSelected(false);
    }
  };

  const getDrugLabel = (drugId: string) => {
    return DRUG_OPTIONS.find(opt => opt.id === drugId)?.label || drugId;
  };

  const hasFluidsSelected = selectedDrugs.includes('fluids');

  return (
    <div className="space-y-2">
      {/* Dropdown Button */}
      <div className="relative">
        <button
          ref={buttonRef}
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          aria-label={selectedDrugs.length === 0 ? 'Select medications' : `${selectedDrugs.length} medications selected`}
          className="w-full px-3 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-white text-sm focus:ring-2 focus:ring-cyan-500 flex items-center justify-between hover:border-slate-600 transition"
        >
          <span className="text-slate-400">
            {selectedDrugs.length === 0
              ? 'Select medications...'
              : `${selectedDrugs.length} medication${selectedDrugs.length > 1 ? 's' : ''} selected`}
          </span>
          <ChevronDown
            size={16}
            className={`text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          />
        </button>

        {/* Dropdown Menu */}
        {isOpen && (
          <div
            ref={dropdownRef}
            className="absolute z-50 mt-1 w-full bg-slate-800 border border-slate-600 rounded-lg shadow-xl max-h-64 overflow-hidden"
          >
            {/* Search Input */}
            <div className="p-2 border-b border-slate-700">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search medications..."
                className="w-full px-2 py-1.5 bg-slate-900 border border-slate-600 rounded text-white text-sm focus:ring-1 focus:ring-cyan-500 focus:outline-none"
                autoFocus
              />
            </div>

            {/* Options List */}
            <div role="listbox" aria-label="Medication options" className="overflow-y-auto max-h-48">
              {filteredOptions.length === 0 ? (
                <div className="p-3 text-center text-slate-400 text-sm">
                  No medications found
                </div>
              ) : (
                filteredOptions.map((option) => {
                  const isSelected = selectedDrugs.includes(option.id);
                  return (
                    <button
                      key={option.id}
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      onClick={() => toggleDrug(option.id)}
                      className={`w-full px-3 py-2.5 flex items-center gap-2 text-left text-sm hover:bg-slate-700 transition ${
                        isSelected ? 'bg-cyan-900/30' : ''
                      } ${option.id === 'fluids' ? 'border-b border-slate-700 bg-blue-900/20' : ''}`}
                    >
                      <div
                        className={`w-4 h-4 rounded border flex items-center justify-center ${
                          isSelected
                            ? 'bg-cyan-500 border-cyan-500'
                            : 'border-slate-500'
                        }`}
                      >
                        {isSelected && <Check size={12} className="text-white" />}
                      </div>
                      <span className={isSelected ? 'text-cyan-300' : 'text-white'}>
                        {option.label}
                      </span>
                      {option.id === 'fluids' && (
                        <span className="ml-auto text-xs text-blue-400">+ specify rate below</span>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>

      {/* Selected Chips */}
      {selectedDrugs.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selectedDrugs.map((drugId) => (
            <span
              key={drugId}
              className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                drugId === 'fluids'
                  ? 'bg-blue-600/30 text-blue-300 border border-blue-500/50'
                  : 'bg-cyan-600/30 text-cyan-300 border border-cyan-500/50'
              }`}
            >
              {getDrugLabel(drugId)}
              <button
                type="button"
                onClick={() => removeDrug(drugId)}
                aria-label={`Remove ${getDrugLabel(drugId)}`}
                className="hover:text-white transition p-1 -m-1 min-w-[24px] min-h-[24px] flex items-center justify-center"
              >
                <X size={14} />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Fluids Rate Reminder */}
      {hasFluidsSelected && (
        <p className="text-xs text-blue-400">
          Specify fluid rate in the Fluids field below
        </p>
      )}

      {/* Custom Text Textarea */}
      <textarea
        value={customText}
        onChange={(e) => onCustomTextChange(e.target.value)}
        rows={3}
        className="w-full px-3 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-white text-sm focus:ring-2 focus:ring-cyan-500 resize-y"
        placeholder="Additional medications (free text)..."
      />
    </div>
  );
}

// Helper to parse existing therapeutics string back into selectedDrugs + customText
export function parseTherapeuticsString(therapeutics: string): {
  selectedDrugs: string[];
  customText: string;
} {
  if (!therapeutics?.trim()) {
    return { selectedDrugs: [], customText: '' };
  }

  const lines = therapeutics.split('\n').map(l => l.trim()).filter(Boolean);
  const selectedDrugs: string[] = [];
  const customLines: string[] = [];

  for (const line of lines) {
    // Try to match against known drugs
    const matchedDrug = DRUG_OPTIONS.find(opt =>
      line.toLowerCase().includes(opt.text.toLowerCase()) ||
      line.toLowerCase().includes(opt.label.toLowerCase())
    );

    if (matchedDrug && !selectedDrugs.includes(matchedDrug.id)) {
      selectedDrugs.push(matchedDrug.id);
    } else {
      customLines.push(line);
    }
  }

  return {
    selectedDrugs,
    customText: customLines.join('\n'),
  };
}

// Helper to combine selectedDrugs + customText back into a therapeutics string
export function combineTherapeutics(selectedDrugs: string[], customText: string): string {
  const drugTexts = selectedDrugs
    .filter(id => id !== 'fluids') // Don't include "Fluids" text in therapeutics
    .map(id => DRUG_OPTIONS.find(opt => opt.id === id)?.text || id);

  const parts = [...drugTexts];
  if (customText.trim()) {
    parts.push(customText.trim());
  }

  return parts.join('\n');
}

export { DRUG_OPTIONS };
