'use client';

import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, X, Pill } from 'lucide-react';

// Medication groups by condition
const MED_GROUPS = {
  disc: {
    label: 'Disc',
    color: 'bg-blue-500',
    meds: ['Prednisone', 'Famotidine', 'Gabapentin', 'Tramadol', 'Trazodone', 'Amantadine', 'Maropitant', 'Fluids'],
  },
  seizures: {
    label: 'Seizures',
    color: 'bg-purple-500',
    meds: ['Phenobarbital', 'Diazepam', 'KBr', 'Keppra', 'Diazepam CRI'],
  },
  surgery: {
    label: 'Surgery',
    color: 'bg-orange-500',
    // Surgery includes its own + all Disc meds
    meds: ['Fentanyl CRI', 'Ketamine CRI', 'Clavamox', 'Cephalexin'],
    includesDisc: true,
  },
  brainy: {
    label: 'Brainy',
    color: 'bg-pink-500',
    meds: ['Dexamethasone SP', 'Mannitol', 'Prednisone'],
  },
} as const;

type GroupKey = keyof typeof MED_GROUPS;

// Frequency options
const FREQUENCIES = [
  { value: '', label: '-' },
  { value: 'SID', label: 'SID' },
  { value: 'BID', label: 'BID' },
  { value: 'TID', label: 'TID' },
  { value: 'QID', label: 'QID' },
  { value: 'PRN', label: 'PRN' },
  { value: 'CRI', label: 'CRI' },
] as const;

interface SelectedMed {
  name: string;
  frequency: string;
}

interface TherapeuticsMultiSelectProps {
  value: string;
  onChange: (val: string) => void;
  'aria-label'?: string;
}

// Parse "Gabapentin BID, Tramadol PRN" into structured data
function parseValue(value: string): SelectedMed[] {
  if (!value?.trim()) return [];

  return value.split(', ').filter(Boolean).map(item => {
    const trimmed = item.trim();
    const words = trimmed.split(' ');
    const lastWord = words[words.length - 1]?.toUpperCase();

    const isFreq = FREQUENCIES.some(f => f.value.toUpperCase() === lastWord);

    if (isFreq && words.length > 1) {
      return {
        name: words.slice(0, -1).join(' '),
        frequency: words[words.length - 1],
      };
    }
    return { name: trimmed, frequency: '' };
  });
}

// Convert back to string
function stringify(meds: SelectedMed[]): string {
  return meds
    .map(m => m.frequency ? `${m.name} ${m.frequency}` : m.name)
    .join(', ');
}

export function TherapeuticsMultiSelect({
  value,
  onChange,
  'aria-label': ariaLabel,
}: TherapeuticsMultiSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeGroup, setActiveGroup] = useState<GroupKey>('disc');
  const [selectedMeds, setSelectedMeds] = useState<SelectedMed[]>(() => parseValue(value));
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Sync with external value
  useEffect(() => {
    const parsed = parseValue(value);
    if (JSON.stringify(parsed) !== JSON.stringify(selectedMeds)) {
      setSelectedMeds(parsed);
    }
  }, [value]);

  // Notify parent
  useEffect(() => {
    const newValue = stringify(selectedMeds);
    if (newValue !== value) {
      onChange(newValue);
    }
  }, [selectedMeds]);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Get meds for active group (Surgery includes Disc meds)
  const getGroupMeds = (groupKey: GroupKey): string[] => {
    const group = MED_GROUPS[groupKey];
    if (groupKey === 'surgery') {
      return [...group.meds, ...MED_GROUPS.disc.meds];
    }
    return [...group.meds];
  };

  const isSelected = (medName: string) => selectedMeds.some(m => m.name === medName);

  const toggleMed = (medName: string) => {
    if (isSelected(medName)) {
      setSelectedMeds(selectedMeds.filter(m => m.name !== medName));
    } else {
      setSelectedMeds([...selectedMeds, { name: medName, frequency: '' }]);
    }
  };

  const updateFrequency = (medName: string, frequency: string) => {
    setSelectedMeds(selectedMeds.map(m =>
      m.name === medName ? { ...m, frequency } : m
    ));
  };

  const removeMed = (medName: string) => {
    setSelectedMeds(selectedMeds.filter(m => m.name !== medName));
  };

  const clearAll = () => {
    setSelectedMeds([]);
  };

  return (
    <div ref={dropdownRef} className="relative">
      {/* Trigger Button - BIGGER */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full min-h-[44px] px-3 py-2 rounded-lg bg-white text-left flex items-center justify-between gap-2 hover:border-emerald-400 transition-colors"
        style={{ border: '2px solid #10b981' }}
        aria-label={ariaLabel}
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-2">
          <Pill size={18} className="text-emerald-600" />
          <span className="text-sm font-medium text-gray-700">
            {selectedMeds.length === 0
              ? 'Tap to add meds'
              : `${selectedMeds.length} med${selectedMeds.length !== 1 ? 's' : ''}`}
          </span>
        </div>
        <ChevronDown
          size={20}
          className={`text-emerald-600 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Selected Meds with Frequency */}
      {selectedMeds.length > 0 && (
        <div className="mt-2 space-y-1.5">
          {selectedMeds.map((med) => (
            <div
              key={med.name}
              className="flex items-center gap-2 px-3 py-2 bg-emerald-50 rounded-lg border-2 border-emerald-200"
            >
              <span className="flex-1 text-sm font-medium text-emerald-800">
                {med.name}
              </span>
              <select
                value={med.frequency}
                onChange={(e) => updateFrequency(med.name, e.target.value)}
                className="px-3 py-1.5 text-sm font-medium rounded-lg border-2 border-emerald-300 bg-white text-gray-700 focus:ring-2 focus:ring-emerald-500 focus:outline-none min-w-[70px]"
              >
                {FREQUENCIES.map(f => (
                  <option key={f.value} value={f.value}>{f.label}</option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => removeMed(med.name)}
                className="p-2 rounded-lg hover:bg-emerald-200 text-emerald-600 hover:text-emerald-800 transition-colors"
                aria-label={`Remove ${med.name}`}
              >
                <X size={18} />
              </button>
            </div>
          ))}
          {selectedMeds.length > 1 && (
            <button
              type="button"
              onClick={clearAll}
              className="w-full py-1.5 text-xs text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors"
            >
              Clear all
            </button>
          )}
        </div>
      )}

      {/* Dropdown */}
      {isOpen && (
        <div
          className="absolute top-full left-0 mt-2 bg-white rounded-xl shadow-2xl z-50 w-full min-w-[300px] overflow-hidden"
          style={{ border: '3px solid #000', boxShadow: '6px 6px 0 #000' }}
        >
          {/* Group Tabs */}
          <div className="flex border-b-2 border-gray-200">
            {(Object.keys(MED_GROUPS) as GroupKey[]).map((key) => {
              const group = MED_GROUPS[key];
              const isActive = activeGroup === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setActiveGroup(key)}
                  className={`flex-1 py-3 px-2 text-sm font-bold transition-colors ${
                    isActive
                      ? `${group.color} text-white`
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {group.label}
                </button>
              );
            })}
          </div>

          {/* Medication Grid */}
          <div className="p-3 max-h-[300px] overflow-y-auto">
            <div className="grid grid-cols-2 gap-2">
              {getGroupMeds(activeGroup).map((med) => {
                const selected = isSelected(med);
                const groupColor = MED_GROUPS[activeGroup].color;
                return (
                  <button
                    key={med}
                    type="button"
                    onClick={() => toggleMed(med)}
                    className={`p-3 rounded-lg text-sm font-medium text-left transition-all ${
                      selected
                        ? `${groupColor} text-white shadow-md`
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {med}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Done Button */}
          <div className="p-3 border-t-2 border-gray-200 bg-gray-50">
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="w-full py-3 bg-emerald-500 text-white font-bold rounded-lg hover:bg-emerald-600 transition-colors text-sm"
            >
              Done ({selectedMeds.length} selected)
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
