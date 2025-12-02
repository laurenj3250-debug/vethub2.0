'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Save, Copy, ExternalLink, ChevronDown, X, Trash2, RotateCcw } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import Link from 'next/link';
import { carryForwardRoundingData, formatCarryForwardMessage, type CarryForwardResult } from '@/lib/rounding-carry-forward';
import { autoFillRoundingData, generateSignalment, isStaleData } from '@/lib/rounding-auto-fill';
import { PastePreviewModal } from './PastePreviewModal';
import { QuickInsertPanel } from '@/components/QuickInsertPanel';
import { useProblemOptions } from '@/hooks/use-problem-options';
import {
  ROUNDING_STORAGE_KEYS,
  ROUNDING_AUTO_SAVE_DELAY,
  ROUNDING_SAVE_SUCCESS_CLEAR_DELAY,
  ROUNDING_SAVE_ERROR_CLEAR_DELAY,
  ROUNDING_DROPDOWN_OPTIONS,
  ROUNDING_FIELD_ORDER,
  ROUNDING_TSV_HEADERS,
  NEO_POP_STYLES,
} from '@/lib/constants';
import type { RoundingData, RoundingPatient } from '@/types/rounding';

// Local Patient interface for component props (uses RoundingPatient pattern)
type Patient = RoundingPatient;

interface RoundingSheetProps {
  patients: Patient[];
  toast: (options: any) => void;
  onPatientUpdate?: () => void;
}

// Multi-select dropdown for Problems field - uses database-backed options
function ProblemsMultiSelect({ value, onChange }: { value: string; onChange: (val: string) => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const [customInput, setCustomInput] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { options, addOption, deleteOption, resetToDefaults, isLoading } = useProblemOptions();

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

  const handleAddCustom = async () => {
    const trimmed = customInput.trim();
    if (!trimmed) return;

    setIsAdding(true);
    try {
      // Add to database (hook handles optimistic update)
      await addOption(trimmed);
      // Add to selected items for this patient
      if (!selectedItems.includes(trimmed)) {
        onChange([...selectedItems, trimmed].join(', '));
      }
      setCustomInput('');
    } catch (e: any) {
      // If it already exists, just add to selection
      if (e.message?.includes('already exists')) {
        if (!selectedItems.includes(trimmed)) {
          onChange([...selectedItems, trimmed].join(', '));
        }
        setCustomInput('');
      }
      console.error('Failed to add problem option:', e);
    } finally {
      setIsAdding(false);
    }
  };

  const handleDeleteOption = async (optionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    try {
      await deleteOption(optionId);
    } catch (e) {
      console.error('Failed to delete problem option:', e);
    }
  };

  return (
    <div ref={dropdownRef} className="relative">
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-0.5 py-0.5 rounded text-gray-900 text-xs bg-gray-50 cursor-pointer min-h-[26px] flex items-center justify-between gap-1"
        style={{ border: '1px solid #ccc' }}
      >
        <div className="flex-1 flex flex-wrap gap-0.5 overflow-hidden">
          {selectedItems.length === 0 ? (
            <span className="text-gray-400">-</span>
          ) : (
            selectedItems.map(item => (
              <span
                key={item}
                className="inline-flex items-center gap-0.5 px-1 py-0.5 bg-purple-100 text-purple-800 rounded text-[10px] font-medium"
              >
                {item}
                <X
                  size={10}
                  className="cursor-pointer hover:text-purple-600"
                  onClick={(e) => removeItem(item, e)}
                />
              </span>
            ))
          )}
        </div>
        <ChevronDown size={12} className={`text-gray-400 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </div>

      {isOpen && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute top-full left-0 mt-0.5 bg-white rounded shadow-lg z-50 max-h-[320px] overflow-y-auto min-w-[200px]"
          style={{ border: '1px solid #ccc' }}
        >
          {isLoading ? (
            <div className="px-2 py-3 text-xs text-gray-400 text-center">Loading...</div>
          ) : options.length === 0 ? (
            <div className="px-2 py-3 text-xs text-gray-400 text-center">No options. Add one below.</div>
          ) : (
            options.map(option => (
              <div
                key={option.id}
                className="flex items-center justify-between px-2 py-1 hover:bg-gray-50 text-xs"
              >
                <label className="flex items-center gap-2 cursor-pointer flex-1">
                  <input
                    type="checkbox"
                    checked={selectedItems.includes(option.label)}
                    onChange={() => toggleOption(option.label)}
                    className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                  />
                  <span className="whitespace-nowrap">{option.label}</span>
                  {option.isDefault && (
                    <span className="text-[8px] text-gray-400">(default)</span>
                  )}
                </label>
                <button
                  onClick={(e) => handleDeleteOption(option.id, e)}
                  className="p-1 rounded hover:bg-red-100"
                  title="Delete from list"
                >
                  <Trash2 size={10} className="text-gray-400 hover:text-red-500" />
                </button>
              </div>
            ))
          )}
          <div className="border-t border-gray-200 p-2 sticky bottom-0 bg-white">
            <div className="flex gap-1">
              <input
                type="text"
                value={customInput}
                onChange={(e) => setCustomInput(e.target.value)}
                onKeyDown={(e) => {
                  e.stopPropagation();
                  if (e.key === 'Enter') handleAddCustom();
                }}
                placeholder="Type custom problem..."
                className="flex-1 px-2 py-1.5 text-xs rounded border border-gray-300 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                disabled={isAdding}
              />
              <button
                onClick={handleAddCustom}
                disabled={!customInput.trim() || isAdding}
                className="px-3 py-1.5 text-xs font-medium rounded bg-purple-500 text-white hover:bg-purple-600 disabled:opacity-50 disabled:bg-gray-300"
              >
                {isAdding ? '...' : 'Add'}
              </button>
            </div>
            <button
              onClick={resetToDefaults}
              className="mt-2 w-full flex items-center justify-center gap-1 px-2 py-1 text-[10px] text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
            >
              <RotateCcw size={10} />
              Reset to defaults
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Pure function to merge rounding data from multiple sources.
 * Prevents code duplication and ensures consistent merge behavior.
 *
 * Merge priority (lowest to highest):
 * 1. savedData - Data from API (baseline)
 * 2. existingEdits - User's unsaved edits from this session
 * 3. updates - New changes being applied
 */
function mergePatientRoundingData(
  savedData: RoundingData,
  existingEdits: RoundingData,
  updates: Partial<RoundingData>
): RoundingData {
  return {
    ...savedData,
    ...existingEdits,
    ...updates,
  };
}

export function RoundingSheet({ patients, toast, onPatientUpdate }: RoundingSheetProps) {
  const [editingData, setEditingData] = useState<Record<number, RoundingData>>(() => {
    // Restore from localStorage on mount if available
    if (typeof window !== 'undefined') {
      try {
        const backup = localStorage.getItem(ROUNDING_STORAGE_KEYS.BACKUP);
        if (backup) {
          const parsed = JSON.parse(backup);
          if (Object.keys(parsed).length > 0) {
            return parsed;
          }
        }
      } catch (e) {
        console.error('[Rounding] Failed to restore backup:', e);
      }
    }
    return {};
  });
  const [isSaving, setIsSaving] = useState(false);
  const [saveTimers, setSaveTimers] = useState<Map<number, NodeJS.Timeout>>(new Map());
  const [saveStatus, setSaveStatus] = useState<Map<number, 'saving' | 'saved' | 'error'>>(new Map());
  const [carryForwardResults, setCarryForwardResults] = useState<Record<number, CarryForwardResult>>({});
  const [showPastePreview, setShowPastePreview] = useState(false);
  const [pendingPasteData, setPendingPasteData] = useState<any[]>([]);
  const [pasteStartPatientIndex, setPasteStartPatientIndex] = useState(0);
  const [autoFilledFields, setAutoFilledFields] = useState<Record<number, Set<string>>>({});
  const autoFillInitialized = useRef(false);

  // Quick-insert: Track currently focused field for inserting text
  const [focusedField, setFocusedField] = useState<{
    patientId: number;
    field: 'therapeutics' | 'diagnosticFindings' | 'concerns';
  } | null>(null);
  const [showQuickInsert, setShowQuickInsert] = useState(false);

  // Ref to always get fresh editingData in async callbacks (avoids stale closure)
  const editingDataRef = useRef(editingData);
  useEffect(() => {
    editingDataRef.current = editingData;
  }, [editingData]);

  useEffect(() => {
    return () => {
      // Clean up all timers on unmount
      saveTimers.forEach(timer => clearTimeout(timer));
    };
  }, [saveTimers]);

  // Backup editingData to localStorage on every change
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        if (Object.keys(editingData).length > 0) {
          localStorage.setItem(ROUNDING_STORAGE_KEYS.BACKUP, JSON.stringify(editingData));
        } else {
          localStorage.removeItem(ROUNDING_STORAGE_KEYS.BACKUP);
        }
      } catch (e) {
        console.error('[Rounding] Failed to backup:', e);
      }
    }
  }, [editingData]);

  const activePatients = patients.filter(p => p.status !== 'Discharged');

  // Auto-Fill & Carry-Forward: Pre-fill rounding data from demographics and yesterday's data
  // Runs once when patients are actually loaded (not when empty)
  useEffect(() => {
    // Only run once when we have actual patients loaded
    if (autoFillInitialized.current) return;
    if (activePatients.length === 0) return;  // Wait until patients are loaded
    autoFillInitialized.current = true;

    const newCarryForwardResults: Record<number, CarryForwardResult> = {};
    const newEditingData: Record<number, RoundingData> = {};
    const newAutoFilledFields: Record<number, Set<string>> = {};

    activePatients.forEach((patient) => {
      const previousData = (patient as any)?.roundingData || patient?.rounding_data;

      // Step 1: Carry forward from yesterday
      const carryResult = carryForwardRoundingData(previousData);
      newCarryForwardResults[patient.id] = carryResult;

      // Step 2: Auto-fill from demographics (overrides carry-forward for demographic fields)
      const autoFillResult = autoFillRoundingData({
        demographics: patient.demographics,
        currentStay: patient.currentStay,
        roundingData: previousData,
      });

      // Merge carry-forward and auto-fill data
      const mergedData: RoundingData = {
        ...carryResult.data,
        ...autoFillResult, // Auto-fill takes precedence
      };

      // Track which fields were auto-filled
      const autoFields = new Set<string>([
        ...autoFillResult.autoFilledFields,
        ...autoFillResult.carriedForwardFields,
      ]);
      newAutoFilledFields[patient.id] = autoFields;

      // Only pre-fill if data was carried forward or auto-filled
      if (carryResult.carriedForward || autoFields.size > 0) {
        newEditingData[patient.id] = mergedData;
      }
    });

    setCarryForwardResults(newCarryForwardResults);
    setAutoFilledFields(newAutoFilledFields);
    // CRITICAL: Merge with existing edits instead of replacing
    // This prevents data loss when auto-fill re-runs
    setEditingData(prev => ({ ...prev, ...newEditingData }));
  }, [activePatients.length]); // Re-run when patients load (but ref prevents re-running after that)

  // Navigation Guard: Warn before leaving with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      // Check if there are unsaved changes
      const hasUnsavedChanges = Object.keys(editingData).length > 0;

      if (hasUnsavedChanges) {
        // Standard way to trigger browser confirmation dialog
        e.preventDefault();
        e.returnValue = '';

        // Some browsers show this message, most show generic message
        return 'You have unsaved changes in the rounding sheet. Are you sure you want to leave?';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [editingData]);

  // Get rounding data for a patient - prioritizes local edits over saved data
  const getPatientData = (patientId: number): RoundingData => {
    // If user has edited this patient locally, use that data
    if (editingData[patientId]) return editingData[patientId];

    // Otherwise, use the saved data from API (camelCase) or legacy format (snake_case)
    const patient = patients.find(p => p.id === patientId);
    return (patient as any)?.roundingData || patient?.rounding_data || {};
  };

  const handleFieldChange = (patientId: number, field: keyof RoundingData, value: string) => {
    // Update editing data immediately - use prev state to avoid stale closure bug
    setEditingData(prev => {
      const patient = patients.find(p => p.id === patientId);
      const savedData = (patient as any)?.roundingData || patient?.rounding_data || {};
      const existingEdits = prev[patientId] || {};

      return {
        ...prev,
        [patientId]: mergePatientRoundingData(savedData, existingEdits, { [field]: value }),
      };
    });

    // Remove field from auto-filled set (user manually edited it)
    setAutoFilledFields(prev => {
      const newFields = { ...prev };
      if (newFields[patientId]) {
        const updated = new Set(newFields[patientId]);
        updated.delete(field);
        newFields[patientId] = updated;
      }
      return newFields;
    });

    // Auto-save after 2 second delay (debounced)
    // Clear any existing timer for this patient
    const existingTimer = saveTimers.get(patientId);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Set new timer for auto-save
    const newTimer = setTimeout(() => {
      autoSave(patientId);
    }, ROUNDING_AUTO_SAVE_DELAY);

    setSaveTimers(prev => new Map(prev).set(patientId, newTimer));
  };

  // Quick-insert: Insert text into currently focused field
  const handleQuickInsert = (text: string) => {
    if (!focusedField) return;

    const { patientId, field } = focusedField;
    const currentData = getPatientData(patientId);
    const currentValue = currentData[field] || '';

    const newValue = currentValue ? `${currentValue}\n${text}` : text;
    handleFieldChange(patientId, field as keyof RoundingData, newValue);
  };

  const matchDropdownValue = (pastedValue: string, validOptions: string[]): string => {
    if (!pastedValue || !pastedValue.trim()) return '';

    const normalized = pastedValue.trim().toLowerCase();

    // Exact match (case-insensitive)
    const exactMatch = validOptions.find(opt => opt.toLowerCase() === normalized);
    if (exactMatch) return exactMatch;

    // Prefix match (e.g., "ic" matches "ICU")
    const prefixMatch = validOptions.find(opt => opt.toLowerCase().startsWith(normalized));
    if (prefixMatch) return prefixMatch;

    // Contains match (e.g., "crit" matches "Critical")
    const containsMatch = validOptions.find(opt => opt.toLowerCase().includes(normalized));
    if (containsMatch) return containsMatch;

    // No match - return original value (will show in field, user can edit)
    return pastedValue;
  };

  // Use shared dropdown options from constants
  const DROPDOWN_OPTIONS = ROUNDING_DROPDOWN_OPTIONS;

  // Helper to parse TSV - properly handles quoted fields with embedded newlines/tabs
  // Google Sheets wraps cells containing newlines in double quotes
  const parseTSVRow = (text: string): string[] => {
    const values: string[] = [];
    let currentValue = '';
    let inQuotes = false;
    let i = 0;

    // Normalize line endings first
    const normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

    while (i < normalized.length) {
      const char = normalized[i];

      if (inQuotes) {
        if (char === '"') {
          // Check for escaped quote (double quote)
          if (i + 1 < normalized.length && normalized[i + 1] === '"') {
            currentValue += '"';
            i += 2;
            continue;
          }
          // End of quoted field
          inQuotes = false;
          i++;
          continue;
        }
        // Inside quotes - handle newlines by converting to space
        if (char === '\n') {
          currentValue += ' ';
        } else {
          currentValue += char;
        }
        i++;
      } else {
        if (char === '"' && currentValue === '') {
          // Start of quoted field (only at beginning of value)
          inQuotes = true;
          i++;
          continue;
        }
        if (char === '\t') {
          // Tab separator - end current value, start new one
          values.push(currentValue.trim());
          currentValue = '';
          i++;
          continue;
        }
        if (char === '\n') {
          // Newline outside quotes - treat as end of row, convert remaining to space
          // This handles cases where clipboard has trailing newlines
          currentValue += ' ';
          i++;
          continue;
        }
        currentValue += char;
        i++;
      }
    }

    // Don't forget the last value
    values.push(currentValue.trim());

    return values;
  };

  const handlePaste = useCallback((e: React.ClipboardEvent, patientId: number, startField: keyof RoundingData) => {
    e.preventDefault();
    e.stopPropagation();
    const pasteData = e.clipboardData.getData('text');

    // Parse TSV row (converts newlines to spaces, splits by tab)
    const values = parseTSVRow(pasteData);

    // Field order matching Google Sheets columns (EXCLUDING patient name column)
    // When pasting from Google Sheets export, first column is Patient name which we skip
    const fieldOrder = ROUNDING_FIELD_ORDER;

    const startIndex = fieldOrder.indexOf(startField);
    if (startIndex === -1) return;

    // Values already parsed by parseTSVRow - now check if we need to skip patient name column
    let finalValues = values;

    // Smart detection: if pasting a full row into signalment field,
    // check if we need to skip the patient name column
    // Export format has 14 cols (Patient + 13 data fields), paste expects 13 data fields
    if (startField === 'signalment' && finalValues.length >= fieldOrder.length) {
      // If we have 14+ values and pasting to signalment, first col is likely patient name
      // Also check: if first value doesn't look like a signalment (no breed/age/sex patterns),
      // and second value does look like signalment or is short, skip first
      const firstVal = finalValues[0]?.trim().toLowerCase() || '';
      const secondVal = finalValues[1]?.trim().toLowerCase() || '';

      // Common signalment patterns: "8y MN DSH", "4yo FS Lab", "5 M/N Pit mix"
      const signalmentPattern = /\d+\s*(y|yo|yr|m|mo)?\s*(m|f|fs|mn|cm|sf|intact)/i;
      const firstLooksLikeSignalment = signalmentPattern.test(firstVal);
      const secondLooksLikeSignalment = signalmentPattern.test(secondVal);

      // If first doesn't look like signalment but second does (or we just have too many cols), skip first
      if (finalValues.length > fieldOrder.length || (!firstLooksLikeSignalment && secondLooksLikeSignalment)) {
        finalValues = finalValues.slice(1); // Skip patient name column
      }
    }
    const updates: Partial<RoundingData> = {};

    finalValues.forEach((value, index) => {
      const fieldIndex = startIndex + index;
      if (fieldIndex < fieldOrder.length) {
        const field = fieldOrder[fieldIndex];
        const trimmedValue = value.trim();

        // Handle dropdown fields with smart matching
        if (field === 'location') {
          updates[field] = matchDropdownValue(trimmedValue, DROPDOWN_OPTIONS.location);
        } else if (field === 'icuCriteria') {
          updates[field] = matchDropdownValue(trimmedValue, DROPDOWN_OPTIONS.icuCriteria);
        } else if (field === 'code') {
          updates[field] = matchDropdownValue(trimmedValue, DROPDOWN_OPTIONS.code) as 'Green' | 'Yellow' | 'Orange' | 'Red' | '';
        } else if (field === 'ivc') {
          updates[field] = matchDropdownValue(trimmedValue, DROPDOWN_OPTIONS.ivc);
        } else if (field === 'fluids') {
          updates[field] = matchDropdownValue(trimmedValue, DROPDOWN_OPTIONS.fluids);
        } else if (field === 'cri') {
          updates[field] = matchDropdownValue(trimmedValue, DROPDOWN_OPTIONS.cri);
        } else {
          // Text fields (signalment, problems, diagnosticFindings, therapeutics, overnightDx, concerns, comments)
          (updates as Record<string, string>)[field] = trimmedValue;
        }
      }
    });

    // Merge with existing data - use prev state to avoid stale closure bug
    setEditingData(prev => {
      const patient = patients.find(p => p.id === patientId);
      const savedData = (patient as any)?.roundingData || patient?.rounding_data || {};
      const existingEdits = prev[patientId] || {};

      const merged = mergePatientRoundingData(savedData, existingEdits, updates);

      return {
        ...prev,
        [patientId]: merged,
      };
    });

    const fieldCount = Object.keys(updates).length;

    toast({
      title: 'Pasted',
      description: `Pasted ${fieldCount} field${fieldCount > 1 ? 's' : ''}`
    });
  }, [patients, toast]);

  const autoSave = useCallback(async (patientId: number) => {
    try {
      setSaveStatus(prev => new Map(prev).set(patientId, 'saving'));

      // Use ref to get fresh data (avoids stale closure from setTimeout)
      const updates = editingDataRef.current[patientId];
      if (!updates) {
        setSaveStatus(prev => {
          const newMap = new Map(prev);
          newMap.delete(patientId);
          return newMap;
        });
        return;
      }

      const dataWithTimestamp = {
        ...updates,
        lastUpdated: new Date().toISOString(),
      };

      await apiClient.updatePatient(String(patientId), {
        roundingData: dataWithTimestamp
      });

      setSaveStatus(prev => new Map(prev).set(patientId, 'saved'));

      // Clear "saved" status after 2 seconds
      setTimeout(() => {
        setSaveStatus(prev => {
          const newMap = new Map(prev);
          newMap.delete(patientId);
          return newMap;
        });
      }, 2000);

      // DON'T clear editing data - keep user's changes visible for continued editing
      // DON'T refetch patients - prevents flickering
    } catch (error) {
      console.error('Auto-save failed:', error);
      setSaveStatus(prev => new Map(prev).set(patientId, 'error'));

      // Keep error status for 5 seconds
      setTimeout(() => {
        setSaveStatus(prev => {
          const newMap = new Map(prev);
          newMap.delete(patientId);
          return newMap;
        });
      }, 5000);
    }
  }, []);

  const handleMultiRowPaste = useCallback((
    pasteData: string,
    startPatientId: number,
    startField: keyof RoundingData
  ) => {
    const rows = pasteData.split('\n').filter(row => row.trim());

    // If only one row, use existing single-row paste
    if (rows.length === 1) {
      return false; // Let single-row paste handle it
    }

    const fieldOrder = ROUNDING_FIELD_ORDER;

    const startFieldIndex = fieldOrder.indexOf(startField);
    if (startFieldIndex === -1) return false;

    // Find the index of the starting patient in active patients list
    const activePatients = patients.filter(p => p.status !== 'Discharged');
    const startPatientIdx = activePatients.findIndex(p => p.id === startPatientId);
    if (startPatientIdx === -1) return false;

    // Parse all rows and create preview data
    const previewData = rows.map((row, rowIdx) => {
      const values = row.split('\t');
      const patientIdx = startPatientIdx + rowIdx;
      const patient = activePatients[patientIdx];

      const fields: { [key: string]: string } = {};

      values.forEach((value, valueIdx) => {
        const fieldIdx = startFieldIndex + valueIdx;
        if (fieldIdx < fieldOrder.length) {
          const field = fieldOrder[fieldIdx];
          fields[field] = value.trim();
        }
      });

      return {
        patientId: patient?.id || 0,
        patientName: patient?.name || '',
        fields,
        rowIndex: rowIdx
      };
    });

    // Show preview modal
    setPendingPasteData(previewData);
    setPasteStartPatientIndex(startPatientIdx);
    setShowPastePreview(true);

    return true; // Multi-row paste handled
  }, [patients]);

  const applyMultiRowPaste = useCallback(() => {
    const updates: { [patientId: number]: Partial<RoundingData> } = {};

    pendingPasteData.forEach(preview => {
      if (preview.patientId) {
        updates[preview.patientId] = {
          ...getPatientData(preview.patientId),
          ...preview.fields
        };
      }
    });

    setEditingData(prev => ({
      ...prev,
      ...updates
    }));

    const appliedCount = Object.keys(updates).length;
    toast({
      title: 'Multi-Row Paste Applied',
      description: `Pasted data to ${appliedCount} patient${appliedCount > 1 ? 's' : ''}`
    });

    setShowPastePreview(false);
    setPendingPasteData([]);
  }, [pendingPasteData, patients, toast]);

  const handleSave = async (patientId: number) => {
    try {
      setIsSaving(true);
      const updates = editingData[patientId];
      if (!updates) return;

      // Add timestamp for carry-forward tracking
      const dataWithTimestamp = {
        ...updates,
        lastUpdated: new Date().toISOString(),
      };

      await apiClient.updatePatient(String(patientId), {
        roundingData: dataWithTimestamp
      });

      const dayCount = updates.dayCount || 1;
      toast({
        title: '✅ Saved',
        description: `Rounding data saved (Day ${dayCount})`
      });

      // Clear this patient from editingData since it's saved
      setEditingData(prev => {
        const updated = { ...prev };
        delete updated[patientId];
        return updated;
      });

      // DON'T refetch - prevents flickering
    } catch (error) {
      console.error('Failed to save:', error);
      toast({
        title: 'Error',
        description: 'Failed to save rounding data',
        variant: 'destructive'
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveAll = async () => {
    try {
      setIsSaving(true);
      const timestamp = new Date().toISOString();
      const promises = Object.entries(editingData).map(([patientId, data]) =>
        apiClient.updatePatient(patientId, {
          roundingData: { ...data, lastUpdated: timestamp }
        })
      );

      await Promise.all(promises);

      toast({
        title: '✅ Saved All',
        description: `Saved ${promises.length} patients`
      });

      // Clear editingData since all are saved (backup will auto-clear via effect)
      setEditingData({});

      // DON'T refetch - prevents flickering
    } catch (error) {
      console.error('Failed to save all:', error);
      toast({
        title: 'Error',
        description: 'Failed to save some patients',
        variant: 'destructive'
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Helper to escape a value for TSV format
  // TSV doesn't have standard quoting like CSV, so we replace problematic characters
  // CRITICAL: This MUST eliminate ALL line breaks or Google Sheets will create multiple rows
  const escapeTSVValue = (value: string | undefined | null): string => {
    if (!value) return '';

    // Convert to string in case it's not
    let escaped = String(value);

    // Replace ALL types of line breaks with " | " separator
    // This includes: CRLF, CR, LF, and Unicode line/paragraph separators
    escaped = escaped
      .replace(/\r\n/g, ' | ')  // Windows CRLF first
      .replace(/\r/g, ' | ')     // Mac CR
      .replace(/\n/g, ' | ')     // Unix LF
      .replace(/\u2028/g, ' | ') // Unicode Line Separator
      .replace(/\u2029/g, ' | ') // Unicode Paragraph Separator
      .replace(/\v/g, ' | ')     // Vertical tab
      .replace(/\f/g, ' | ');    // Form feed

    // Replace tabs with spaces (tabs are column separators in TSV)
    escaped = escaped.replace(/\t/g, '    ');

    // Clean up multiple consecutive separators
    escaped = escaped.replace(/(\s*\|\s*){2,}/g, ' | ');

    // Trim leading/trailing separators and whitespace
    escaped = escaped.replace(/^\s*\|\s*/, '').replace(/\s*\|\s*$/, '').trim();

    return escaped;
  };

  const exportToTSV = () => {
    const headers = ROUNDING_TSV_HEADERS;

    const rows = activePatients.map(patient => {
      const data = getPatientData(patient.id);
      const patientName = (patient as any)?.demographics?.name || patient.name || patient.patient_info?.name || `Patient ${patient.id}`;

      return [
        escapeTSVValue(patientName),
        escapeTSVValue(data.signalment),
        escapeTSVValue(data.location),
        escapeTSVValue(data.icuCriteria),
        escapeTSVValue(data.code),
        escapeTSVValue(data.problems),
        escapeTSVValue(data.diagnosticFindings),
        escapeTSVValue(data.therapeutics),
        escapeTSVValue(data.ivc),
        escapeTSVValue(data.fluids),
        escapeTSVValue(data.cri),
        escapeTSVValue(data.overnightDx),
        escapeTSVValue(data.concerns),
        escapeTSVValue(data.comments)
      ].join('\t');
    });

    const tsv = [headers.join('\t'), ...rows].join('\n');
    navigator.clipboard.writeText(tsv);

    toast({
      title: 'Copied to Clipboard',
      description: `${activePatients.length} patients copied as TSV`
    });
  };

  const copyPatientRow = (patientId: number) => {
    const patient = activePatients.find(p => p.id === patientId);
    if (!patient) return;

    const data = getPatientData(patientId);
    const patientName = (patient as any)?.demographics?.name || patient.name || patient.patient_info?.name || `Patient ${patient.id}`;

    // Build row with all 14 columns - each value MUST be escaped to prevent multi-line pastes
    const row = [
      escapeTSVValue(patientName),
      escapeTSVValue(data.signalment),
      escapeTSVValue(data.location),
      escapeTSVValue(data.icuCriteria),
      escapeTSVValue(data.code),
      escapeTSVValue(data.problems),
      escapeTSVValue(data.diagnosticFindings),
      escapeTSVValue(data.therapeutics),
      escapeTSVValue(data.ivc),
      escapeTSVValue(data.fluids),
      escapeTSVValue(data.cri),
      escapeTSVValue(data.overnightDx),
      escapeTSVValue(data.concerns),
      escapeTSVValue(data.comments)
    ].join('\t');

    navigator.clipboard.writeText(row);

    // Count non-empty columns for feedback
    const filledColumns = [
      data.signalment, data.location, data.icuCriteria, data.code,
      data.problems, data.diagnosticFindings, data.therapeutics,
      data.ivc, data.fluids, data.cri, data.overnightDx,
      data.concerns, data.comments
    ].filter(Boolean).length;

    toast({
      title: 'Row Copied',
      description: `${patientName} (${filledColumns}/13 fields)`
    });
  };

  // Neo-pop styling from shared constants
  const { BORDER: NEO_BORDER, SHADOW: NEO_SHADOW, SHADOW_SM: NEO_SHADOW_SM, COLORS } = NEO_POP_STYLES;

  return (
    <div className="space-y-4">
      {/* Header Actions */}
      <div
        className="flex items-center justify-between rounded-2xl p-4"
        style={{ backgroundColor: 'white', border: NEO_BORDER, boxShadow: NEO_SHADOW }}
      >
        <div className="flex items-center gap-3">
          <button
            onClick={exportToTSV}
            className="px-4 py-2 rounded-xl font-bold text-gray-900 transition hover:-translate-y-0.5 flex items-center gap-2"
            style={{ backgroundColor: COLORS.lavender, border: NEO_BORDER, boxShadow: '3px 3px 0 #000' }}
          >
            <Copy size={16} />
            Copy to Clipboard
          </button>
          <div>
            <h2 className="text-xl font-black text-gray-900">Rounding Sheet</h2>
            <p className="text-sm font-medium text-gray-500">{activePatients.length} active patients</p>
          </div>
        </div>
        <button
          onClick={handleSaveAll}
          disabled={isSaving || Object.keys(editingData).length === 0}
          className="px-4 py-2 rounded-xl font-bold text-gray-900 transition hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          style={{ backgroundColor: COLORS.mint, border: NEO_BORDER, boxShadow: '3px 3px 0 #000' }}
        >
          <Save size={16} />
          Save All {Object.keys(editingData).length > 0 && `(${Object.keys(editingData).length})`}
        </button>
      </div>

      {/* Rounding Sheet Table */}
      <div
        className="overflow-x-auto rounded-2xl"
        style={{ border: NEO_BORDER, boxShadow: NEO_SHADOW }}
      >
        <table className="w-full border-collapse bg-white overflow-hidden">
          <thead>
            <tr className="text-gray-900 text-[10px] font-bold" style={{ backgroundColor: COLORS.mint }}>
              <th className="p-1 text-left sticky left-0 z-10 min-w-[85px]" style={{ backgroundColor: COLORS.mint, borderRight: NEO_BORDER, borderBottom: NEO_BORDER }}>Patient</th>
              <th className="p-1 text-left min-w-[90px]" style={{ borderRight: '1px solid #000', borderBottom: NEO_BORDER }}>Signalment</th>
              <th className="p-1 text-left min-w-[55px]" style={{ borderRight: '1px solid #000', borderBottom: NEO_BORDER }}>Loc</th>
              <th className="p-1 text-left min-w-[55px]" style={{ borderRight: '1px solid #000', borderBottom: NEO_BORDER }}>ICU</th>
              <th className="p-1 text-left min-w-[55px]" style={{ borderRight: '1px solid #000', borderBottom: NEO_BORDER }}>Code</th>
              <th className="p-1 text-left min-w-[80px]" style={{ borderRight: '1px solid #000', borderBottom: NEO_BORDER }}>Problems</th>
              <th className="p-1 text-left min-w-[120px]" style={{ borderRight: '1px solid #000', borderBottom: NEO_BORDER }}>Dx Findings</th>
              <th className="p-1 text-left min-w-[120px]" style={{ borderRight: '1px solid #000', borderBottom: NEO_BORDER }}>Tx</th>
              <th className="p-1 text-left min-w-[40px]" style={{ borderRight: '1px solid #000', borderBottom: NEO_BORDER }}>IVC</th>
              <th className="p-1 text-left min-w-[50px]" style={{ borderRight: '1px solid #000', borderBottom: NEO_BORDER }}>Fluids</th>
              <th className="p-1 text-left min-w-[50px]" style={{ borderRight: '1px solid #000', borderBottom: NEO_BORDER }}>CRI</th>
              <th className="p-1 text-left min-w-[100px]" style={{ borderRight: '1px solid #000', borderBottom: NEO_BORDER }}>O/N Dx</th>
              <th className="p-1 text-left min-w-[110px]" style={{ borderRight: '1px solid #000', borderBottom: NEO_BORDER }}>O/N Concerns</th>
              <th className="p-1 text-left min-w-[100px]" style={{ borderRight: '1px solid #000', borderBottom: NEO_BORDER }}>Extra Notes</th>
              <th className="p-1 text-center sticky right-0 z-10 min-w-[60px]" style={{ backgroundColor: COLORS.mint, borderLeft: NEO_BORDER, borderBottom: NEO_BORDER }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {activePatients.map(patient => {
              const data = getPatientData(patient.id);
              const hasChanges = editingData[patient.id] !== undefined;
              const carryForward = carryForwardResults[patient.id];

              // API returns demographics.name, not patient.name or patient_info.name
              const patientName = (patient as any)?.demographics?.name || patient.name || patient.patient_info?.name || `Patient ${patient.id}`;

              // Alternating row colors for neo-pop
              const rowBg = hasChanges ? COLORS.mint + '40' : 'white';

              return (
                <tr key={patient.id} style={{ backgroundColor: rowBg }}>
                  <td className="p-1 sticky left-0 z-10" style={{ backgroundColor: rowBg, borderRight: NEO_BORDER, borderBottom: '1px solid #000' }}>
                    <Link
                      href={`/?patient=${patient.id}`}
                      className="group flex flex-col hover:text-[#6BB89D] transition"
                    >
                      <div className="font-bold text-xs text-gray-900 group-hover:text-[#6BB89D] truncate">{patientName}</div>
                      <div className="text-[10px] text-gray-500 truncate">
                        {(patient as any)?.demographics?.age} {(patient as any)?.demographics?.breed}
                      </div>
                    </Link>
                  </td>
                  <td className="p-0.5" style={{ borderRight: '1px solid #ccc', borderBottom: '1px solid #ccc' }}>
                    <input
                      type="text"
                      value={data.signalment || ''}
                      onChange={(e) => handleFieldChange(patient.id, 'signalment', e.target.value)}
                      onPaste={(e) => handlePaste(e, patient.id, 'signalment')}
                      className="w-full px-1 py-0.5 rounded text-gray-900 text-xs focus:outline-none focus:ring-1 focus:ring-[#6BB89D] bg-gray-50"
                      style={{ border: '1px solid #ccc' }}
                    />
                  </td>
                  <td className="p-0.5" style={{ borderRight: '1px solid #ccc', borderBottom: '1px solid #ccc' }}>
                    <select
                      value={data.location || ''}
                      onChange={(e) => handleFieldChange(patient.id, 'location', e.target.value)}
                      onPaste={(e) => handlePaste(e, patient.id, 'location')}
                      className="w-full px-0.5 py-0.5 rounded text-gray-900 text-xs focus:outline-none focus:ring-1 focus:ring-[#6BB89D] bg-gray-50"
                      style={{ border: '1px solid #ccc' }}
                    >
                      <option value="">-</option>
                      <option value="IP">IP</option>
                      <option value="ICU">ICU</option>
                    </select>
                  </td>
                  <td className="p-0.5" style={{ borderRight: '1px solid #ccc', borderBottom: '1px solid #ccc' }}>
                    <select
                      value={data.icuCriteria || ''}
                      onChange={(e) => handleFieldChange(patient.id, 'icuCriteria', e.target.value)}
                      onPaste={(e) => handlePaste(e, patient.id, 'icuCriteria')}
                      className="w-full px-0.5 py-0.5 rounded text-gray-900 text-xs focus:outline-none focus:ring-1 focus:ring-[#6BB89D] bg-gray-50"
                      style={{ border: '1px solid #ccc' }}
                    >
                      <option value="">-</option>
                      <option value="Yes">Y</option>
                      <option value="No">N</option>
                      <option value="n/a">n/a</option>
                    </select>
                  </td>
                  <td className="p-0.5" style={{ borderRight: '1px solid #ccc', borderBottom: '1px solid #ccc' }}>
                    <select
                      value={data.code || ''}
                      onChange={(e) => handleFieldChange(patient.id, 'code', e.target.value)}
                      onPaste={(e) => handlePaste(e, patient.id, 'code')}
                      className="w-full px-0.5 py-0.5 rounded text-gray-900 text-xs focus:outline-none focus:ring-1 focus:ring-[#6BB89D]"
                      style={{
                        border: '1px solid #ccc',
                        backgroundColor: data.code === 'Green' ? '#D1FAE5' : data.code === 'Yellow' ? '#FEF3C7' : data.code === 'Orange' ? '#FFEDD5' : data.code === 'Red' ? '#FEE2E2' : '#F9FAFB'
                      }}
                    >
                      <option value="">-</option>
                      <option value="Green">Green</option>
                      <option value="Yellow">Yellow</option>
                      <option value="Orange">Orange</option>
                      <option value="Red">Red</option>
                    </select>
                  </td>
                  <td className="p-0.5 relative" style={{ borderRight: '1px solid #ccc', borderBottom: '1px solid #ccc' }}>
                    <ProblemsMultiSelect
                      value={data.problems || ''}
                      onChange={(val) => handleFieldChange(patient.id, 'problems', val)}
                    />
                  </td>
                  <td className="p-0.5 relative" style={{ borderRight: '1px solid #ccc', borderBottom: '1px solid #ccc' }}>
                    <textarea
                      value={data.diagnosticFindings || ''}
                      onChange={(e) => handleFieldChange(patient.id, 'diagnosticFindings', e.target.value)}
                      onFocus={() => {
                        setFocusedField({ patientId: patient.id, field: 'diagnosticFindings' });
                        setShowQuickInsert(true);
                      }}
                      onPaste={(e) => handlePaste(e, patient.id, 'diagnosticFindings')}
                      rows={2}
                      className="w-full px-1 py-0.5 rounded text-gray-900 text-xs focus:outline-none focus:ring-1 focus:ring-[#6BB89D] bg-gray-50 resize-none overflow-auto"
                      style={{ border: '1px solid #ccc' }}
                    />
                    {showQuickInsert && focusedField?.patientId === patient.id && focusedField?.field === 'diagnosticFindings' && (
                      <div className="absolute top-full left-0 mt-1 z-30 min-w-[350px]">
                        <QuickInsertPanel field="diagnostics" onInsert={handleQuickInsert} currentValue={data.diagnosticFindings} />
                      </div>
                    )}
                  </td>
                  <td className="p-0.5 relative" style={{ borderRight: '1px solid #ccc', borderBottom: '1px solid #ccc' }}>
                    <textarea
                      value={data.therapeutics || ''}
                      onChange={(e) => handleFieldChange(patient.id, 'therapeutics', e.target.value)}
                      onFocus={() => {
                        setFocusedField({ patientId: patient.id, field: 'therapeutics' });
                        setShowQuickInsert(true);
                      }}
                      onPaste={(e) => handlePaste(e, patient.id, 'therapeutics')}
                      rows={2}
                      className="w-full px-1 py-0.5 rounded text-gray-900 text-xs focus:outline-none focus:ring-1 focus:ring-[#6BB89D] bg-gray-50 resize-none overflow-auto"
                      style={{ border: '1px solid #ccc' }}
                    />
                    {showQuickInsert && focusedField?.patientId === patient.id && focusedField?.field === 'therapeutics' && (
                      <div className="absolute top-full left-0 mt-1 z-30 min-w-[350px]">
                        <QuickInsertPanel field="therapeutics" onInsert={handleQuickInsert} currentValue={data.therapeutics} />
                      </div>
                    )}
                  </td>
                  <td className="p-0.5" style={{ borderRight: '1px solid #ccc', borderBottom: '1px solid #ccc' }}>
                    <select
                      value={data.ivc || ''}
                      onChange={(e) => handleFieldChange(patient.id, 'ivc', e.target.value)}
                      onPaste={(e) => handlePaste(e, patient.id, 'ivc')}
                      className="w-full px-0.5 py-0.5 rounded text-gray-900 text-xs focus:outline-none focus:ring-1 focus:ring-[#6BB89D] bg-gray-50"
                      style={{ border: '1px solid #ccc' }}
                    >
                      <option value="">-</option>
                      <option value="Yes">Y</option>
                      <option value="No">N</option>
                    </select>
                  </td>
                  <td className="p-0.5" style={{ borderRight: '1px solid #ccc', borderBottom: '1px solid #ccc' }}>
                    <select
                      value={data.fluids || ''}
                      onChange={(e) => handleFieldChange(patient.id, 'fluids', e.target.value)}
                      onPaste={(e) => handlePaste(e, patient.id, 'fluids')}
                      className="w-full px-0.5 py-0.5 rounded text-gray-900 text-xs focus:outline-none focus:ring-1 focus:ring-[#6BB89D] bg-gray-50"
                      style={{ border: '1px solid #ccc' }}
                    >
                      <option value="">-</option>
                      <option value="Yes">Y</option>
                      <option value="No">N</option>
                      <option value="n/a">n/a</option>
                    </select>
                  </td>
                  <td className="p-0.5" style={{ borderRight: '1px solid #ccc', borderBottom: '1px solid #ccc' }}>
                    <select
                      value={data.cri || ''}
                      onChange={(e) => handleFieldChange(patient.id, 'cri', e.target.value)}
                      onPaste={(e) => handlePaste(e, patient.id, 'cri')}
                      className="w-full px-0.5 py-0.5 rounded text-gray-900 text-xs focus:outline-none focus:ring-1 focus:ring-[#6BB89D] bg-gray-50"
                      style={{ border: '1px solid #ccc' }}
                    >
                      <option value="">-</option>
                      <option value="Yes">Y</option>
                      <option value="No">N</option>
                      <option value="No but...">N...</option>
                      <option value="Yes but...">Y...</option>
                    </select>
                  </td>
                  <td className="p-0.5" style={{ borderRight: '1px solid #ccc', borderBottom: '1px solid #ccc' }}>
                    <textarea
                      value={data.overnightDx || ''}
                      onChange={(e) => handleFieldChange(patient.id, 'overnightDx', e.target.value)}
                      onPaste={(e) => handlePaste(e, patient.id, 'overnightDx')}
                      rows={2}
                      className="w-full px-1 py-0.5 rounded text-gray-900 text-xs focus:outline-none focus:ring-1 focus:ring-[#6BB89D] bg-gray-50 resize-none overflow-auto"
                      style={{ border: '1px solid #ccc' }}
                    />
                  </td>
                  <td className="p-0.5 relative" style={{ borderRight: '1px solid #ccc', borderBottom: '1px solid #ccc' }}>
                    <textarea
                      value={data.concerns || ''}
                      onChange={(e) => handleFieldChange(patient.id, 'concerns', e.target.value)}
                      onFocus={() => {
                        setFocusedField({ patientId: patient.id, field: 'concerns' });
                        setShowQuickInsert(true);
                      }}
                      onPaste={(e) => handlePaste(e, patient.id, 'concerns')}
                      rows={2}
                      placeholder={carryForward?.carriedForward ? "Today's concerns..." : ""}
                      className="w-full px-1 py-0.5 rounded text-gray-900 text-xs focus:outline-none focus:ring-1 focus:ring-[#6BB89D] bg-gray-50 resize-none overflow-auto"
                      style={{ border: '1px solid #ccc' }}
                    />
                    {showQuickInsert && focusedField?.patientId === patient.id && focusedField?.field === 'concerns' && (
                      <div className="absolute top-full left-0 mt-1 z-30 min-w-[350px]">
                        <QuickInsertPanel field="concerns" onInsert={handleQuickInsert} currentValue={data.concerns} />
                      </div>
                    )}
                  </td>
                  <td className="p-0.5" style={{ borderRight: '1px solid #ccc', borderBottom: '1px solid #ccc' }}>
                    <textarea
                      value={data.comments || ''}
                      onChange={(e) => handleFieldChange(patient.id, 'comments', e.target.value)}
                      onPaste={(e) => handlePaste(e, patient.id, 'comments')}
                      rows={2}
                      className="w-full px-1 py-0.5 rounded text-gray-900 text-xs focus:outline-none focus:ring-1 focus:ring-[#6BB89D] bg-gray-50 resize-none overflow-auto"
                      style={{ border: '1px solid #ccc' }}
                    />
                  </td>
                  <td className="p-1 text-center sticky right-0 z-10" style={{ backgroundColor: rowBg, borderLeft: NEO_BORDER, borderBottom: '1px solid #000' }}>
                    <div className="flex flex-col gap-0.5">
                      <button
                        onClick={() => copyPatientRow(patient.id)}
                        className="px-1.5 py-0.5 rounded text-[10px] font-bold transition hover:-translate-y-0.5 text-gray-900"
                        style={{ backgroundColor: COLORS.lavender, border: '1px solid #000' }}
                        title="Copy row"
                      >
                        <Copy size={10} className="inline" />
                      </button>
                      <button
                        onClick={() => handleSave(patient.id)}
                        disabled={!hasChanges || isSaving}
                        className="px-1.5 py-0.5 rounded text-[10px] font-bold transition hover:-translate-y-0.5 disabled:opacity-50 text-gray-900"
                        style={{ backgroundColor: COLORS.mint, border: '1px solid #000' }}
                      >
                        Save
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {activePatients.length === 0 && (
        <div
          className="text-center py-8 rounded-2xl"
          style={{ backgroundColor: 'white', border: NEO_BORDER, boxShadow: NEO_SHADOW }}
        >
          <div
            className="w-16 h-16 rounded-full mx-auto mb-3 flex items-center justify-center text-2xl"
            style={{ backgroundColor: COLORS.lavender, border: NEO_BORDER }}
          >
            📋
          </div>
          <p className="text-gray-500 font-bold">No active patients to display</p>
        </div>
      )}
    </div>
  );
}
