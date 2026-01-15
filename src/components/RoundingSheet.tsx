'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Save, Copy, ChevronDown, X, Trash2, RotateCcw, ChevronRight, Pencil, Check, FileText } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-media-query';
import { apiClient } from '@/lib/api-client';
import Link from 'next/link';
import { carryForwardRoundingData, type CarryForwardResult } from '@/lib/rounding-carry-forward';
import { autoFillRoundingData } from '@/lib/rounding-auto-fill';
import { PastePreviewModal } from './PastePreviewModal';
import { SlashCommandTextarea } from '@/components/SlashCommandTextarea';
import { useProblemOptions } from '@/hooks/use-problem-options';
import {
  ROUNDING_STORAGE_KEYS,
  ROUNDING_AUTO_SAVE_DELAY,
  ROUNDING_DROPDOWN_OPTIONS,
  ROUNDING_MULTISELECT_OPTIONS,
  ROUNDING_FIELD_ORDER,
  ROUNDING_TSV_HEADERS,
  NEO_POP_STYLES,
} from '@/lib/constants';
import { FieldMultiSelect } from './FieldMultiSelect';
import type { RoundingData, RoundingPatient } from '@/types/rounding';
import { getTemplateCategories, type RoundingTemplate } from '@/data/rounding-templates';

// Local Patient interface for component props (uses RoundingPatient pattern)
type Patient = RoundingPatient;

interface RoundingSheetProps {
  patients: Patient[];
  toast: (options: any) => void;
  onPatientUpdate?: () => void;
}

// Multi-select dropdown for Problems field - uses database-backed options
// Now supports direct typing in the field (not just dropdown selection)
function ProblemsMultiSelect({ value, onChange, 'aria-label': ariaLabel }: { value: string; onChange: (val: string) => void; 'aria-label'?: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [customInput, setCustomInput] = useState('');
  const [directInput, setDirectInput] = useState(''); // For typing directly in the field
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const editInputRef = useRef<HTMLInputElement>(null);
  const { options, addOption, deleteOption, editOption, resetToDefaults, isLoading } = useProblemOptions();

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

  // Add a problem from any input (dropdown or direct)
  const addProblem = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;

    // Check if it matches an existing option (case-insensitive)
    const matchingOption = options.find(opt =>
      opt.label.toLowerCase() === trimmed.toLowerCase()
    );

    const labelToAdd = matchingOption ? matchingOption.label : trimmed;

    // Already selected? Do nothing
    if (selectedItems.includes(labelToAdd)) return;

    // If not in options, add it
    if (!matchingOption) {
      try {
        await addOption(trimmed);
      } catch (e: any) {
        // Already exists is fine
        if (!e.message?.includes('already exists')) {
          console.error('Failed to add problem option:', e);
        }
      }
    }

    // Add to selection
    onChange([...selectedItems, labelToAdd].join(', '));
  };

  const handleAddCustom = async () => {
    const trimmed = customInput.trim();
    if (!trimmed) return;

    setIsAdding(true);
    await addProblem(trimmed);
    setCustomInput('');
    setIsAdding(false);
  };

  // Handle direct input in the main field
  const handleDirectInputSubmit = async () => {
    const trimmed = directInput.trim();
    if (!trimmed) return;

    setIsAdding(true);
    await addProblem(trimmed);
    setDirectInput('');
    setIsAdding(false);
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

  const startEditing = (optionId: string, currentLabel: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setEditingId(optionId);
    setEditingValue(currentLabel);
    // Focus the input after render
    setTimeout(() => editInputRef.current?.focus(), 0);
  };

  const handleEditSave = async (optionId: string) => {
    const trimmed = editingValue.trim();
    if (!trimmed) {
      setEditingId(null);
      return;
    }
    try {
      // Find the old label to update selected items if needed
      const oldOption = options.find(o => o.id === optionId);
      const oldLabel = oldOption?.label;

      await editOption(optionId, trimmed);

      // If this option was selected, update the selection with new label
      if (oldLabel && selectedItems.includes(oldLabel)) {
        const newSelected = selectedItems.map(item => item === oldLabel ? trimmed : item);
        onChange(newSelected.join(', '));
      }

      setEditingId(null);
    } catch (e) {
      console.error('Failed to edit problem option:', e);
    }
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditingValue('');
  };

  // Handle paste - parse comma/newline separated values and select matching options
  const handlePaste = async (e: React.ClipboardEvent) => {
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
        opt.label.toLowerCase() === item.toLowerCase()
      );

      if (matchingOption) {
        // Add matching option
        newSelected.push(matchingOption.label);
      } else {
        // Add as custom option
        try {
          await addOption(item);
          newSelected.push(item);
        } catch (err) {
          // If already exists, just add to selection
          newSelected.push(item);
        }
      }
    }

    onChange(newSelected.join(', '));
  };

  return (
    <div ref={dropdownRef} className="relative">
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
              className="inline-flex items-center gap-0.5 px-1 py-0.5 bg-purple-100 text-purple-800 rounded text-[10px] font-medium"
            >
              {item}
              <X
                size={10}
                className="cursor-pointer hover:text-purple-600"
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
            placeholder={selectedItems.length === 0 ? "Type or click ▼" : ""}
            aria-label={ariaLabel}
            className="flex-1 min-w-[60px] bg-transparent border-none outline-none text-xs placeholder-gray-400"
            disabled={isAdding}
          />
        </div>
        <ChevronDown size={12} className={`text-gray-400 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </div>

      {isOpen && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute top-full left-0 mt-0.5 bg-white rounded shadow-lg z-50 max-h-[320px] overflow-y-auto min-w-[320px] max-w-[400px]"
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
                {editingId === option.id ? (
                  // Edit mode - inline input
                  <div className="flex items-center gap-1 flex-1">
                    <input
                      ref={editInputRef}
                      type="text"
                      value={editingValue}
                      onChange={(e) => setEditingValue(e.target.value)}
                      onKeyDown={(e) => {
                        e.stopPropagation();
                        if (e.key === 'Enter') {
                          handleEditSave(option.id);
                        }
                        if (e.key === 'Escape') {
                          cancelEditing();
                        }
                      }}
                      onClick={(e) => e.stopPropagation()}
                      className="flex-1 px-1 py-0.5 text-xs rounded border border-purple-400 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                    />
                    <button
                      onClick={(e) => { e.stopPropagation(); handleEditSave(option.id); }}
                      className="p-1 rounded hover:bg-green-100"
                      title="Save"
                    >
                      <Check size={10} className="text-green-600" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); cancelEditing(); }}
                      className="p-1 rounded hover:bg-gray-200"
                      title="Cancel"
                    >
                      <X size={10} className="text-gray-500" />
                    </button>
                  </div>
                ) : (
                  // View mode - checkbox with label
                  <>
                    <label className="flex items-center gap-2 cursor-pointer flex-1 min-w-0">
                      <input
                        type="checkbox"
                        checked={selectedItems.includes(option.label)}
                        onChange={() => toggleOption(option.label)}
                        className="rounded border-gray-300 text-purple-600 focus:ring-purple-500 shrink-0"
                      />
                      <span className="truncate" title={option.label}>{option.label}</span>
                    </label>
                    <div className="flex items-center gap-0.5 shrink-0">
                      <button
                        onClick={(e) => startEditing(option.id, option.label, e)}
                        className="p-1 rounded hover:bg-blue-100"
                        title="Edit"
                      >
                        <Pencil size={10} className="text-gray-400 hover:text-blue-500" />
                      </button>
                      <button
                        onClick={(e) => handleDeleteOption(option.id, e)}
                        className="p-1 rounded hover:bg-red-100"
                        title="Delete from list"
                      >
                        <Trash2 size={10} className="text-gray-400 hover:text-red-500" />
                      </button>
                    </div>
                  </>
                )}
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
 * Template Selector - Dropdown to apply rounding templates to a patient
 * Uses Portal pattern to escape overflow-hidden parents
 */
function TemplateSelector({
  onSelect,
  patientName
}: {
  onSelect: (template: RoundingTemplate) => void;
  patientName: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const categories = getTemplateCategories();

  // Update position when opening
  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setPosition({
        top: rect.bottom + 4,
        left: rect.left,
      });
    }
  }, [isOpen]);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;

    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (
        popoverRef.current &&
        !popoverRef.current.contains(target) &&
        buttonRef.current &&
        !buttonRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Close on scroll (but NOT when scrolling inside the popover)
  useEffect(() => {
    if (!isOpen) return;
    const handleScroll = (e: Event) => {
      // Don't close if scrolling inside the popover itself
      if (popoverRef.current && popoverRef.current.contains(e.target as Node)) {
        return;
      }
      setIsOpen(false);
    };
    window.addEventListener('scroll', handleScroll, true);
    return () => window.removeEventListener('scroll', handleScroll, true);
  }, [isOpen]);

  const popoverContent = (
    <div
      ref={popoverRef}
      className="fixed z-[99999] bg-white rounded-lg shadow-xl min-w-[220px] max-h-[320px] overflow-y-auto"
      style={{
        top: position.top,
        left: position.left,
        border: '2px solid #000',
        boxShadow: '4px 4px 0 #000',
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="px-3 py-2 border-b border-gray-200 bg-purple-50">
        <span className="text-xs font-bold text-purple-700">Apply Template to {patientName}</span>
      </div>
      {categories.map(({ category, label, templates }) => (
        <div key={category}>
          <div className="px-3 py-1.5 bg-gray-100 border-b border-gray-200">
            <span className="text-[10px] font-bold text-gray-500 uppercase">{label}</span>
          </div>
          {templates.map(template => (
            <button
              key={template.id}
              onClick={() => {
                onSelect(template);
                setIsOpen(false);
              }}
              className="w-full px-3 py-2.5 text-left text-xs hover:bg-purple-50 transition-colors flex items-center gap-2 border-b border-gray-100 last:border-b-0"
            >
              <span className="font-medium text-gray-900">{template.name}</span>
              {template.description && (
                <span className="text-[10px] text-gray-500 ml-auto">{template.description.slice(0, 30)}</span>
              )}
            </button>
          ))}
        </div>
      ))}
    </div>
  );

  return (
    <>
      <button
        ref={buttonRef}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className="flex items-center gap-1 px-2 py-1 rounded-lg bg-purple-50 hover:bg-purple-100 border border-purple-200 text-purple-700 text-xs font-medium transition-all hover:-translate-y-0.5"
        style={{ minHeight: '28px' }}
        title={`Apply template to ${patientName}`}
        aria-label={`Apply template to ${patientName}`}
      >
        <FileText size={12} />
        <span className="hidden sm:inline">Template</span>
        <ChevronDown size={10} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && typeof document !== 'undefined' && createPortal(popoverContent, document.body)}
    </>
  );
}

/**
 * Get patient name from various possible sources.
 * Handles API format (demographics.name), legacy format (patient_info.name), and fallbacks.
 */
function getPatientName(patient: Patient): string {
  return (patient as any)?.demographics?.name
    || patient.name
    || patient.patient_info?.name
    || `Patient ${patient.id}`;
}

/**
 * Pure function to merge rounding data from multiple sources.
 * Prevents code duplication and ensures consistent merge behavior.
 *
 * Merge priority (lowest to highest):
 * 1. savedData - Data from API (baseline)
 * 2. existingEdits - User's unsaved edits from this session
 * 3. updates - New changes being applied
 *
 * CRITICAL: Problems and therapeutics are NEVER auto-populated from savedData.
 * Users must fill these fresh each day. They are only preserved if already in existingEdits.
 */
function mergePatientRoundingData(
  savedData: RoundingData,
  existingEdits: RoundingData,
  updates: Partial<RoundingData>
): RoundingData {
  // Strip problems and therapeutics from savedData - these should never auto-populate
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { problems: _savedProblems, therapeutics: _savedTherapeutics, ...cleanSavedData } = savedData;

  return {
    ...cleanSavedData,
    // Only include problems/therapeutics if they exist in existingEdits
    problems: existingEdits.problems ?? '',
    therapeutics: existingEdits.therapeutics ?? '',
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
  const [autoFilledFields, setAutoFilledFields] = useState<Record<number, Set<string>>>({});
  const autoFillInitialized = useRef(false);

  // Mobile responsive handling
  const isMobile = useIsMobile();
  const [expandedCards, setExpandedCards] = useState<Set<number>>(new Set());

  const toggleCardExpanded = (patientId: number) => {
    setExpandedCards(prev => {
      const newSet = new Set(prev);
      if (newSet.has(patientId)) {
        newSet.delete(patientId);
      } else {
        newSet.add(patientId);
      }
      return newSet;
    });
  };

  // Track currently focused field for paste distribution and QuickInsert
  const [focusedField, setFocusedField] = useState<{
    patientId: number;
    field: keyof RoundingData;
  } | null>(null);
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

      // Destructure to separate tracking arrays from actual data fields
      const { autoFilledFields: autoFilled, carriedForwardFields: carriedFields, ...autoFillData } = autoFillResult;

      // Merge carry-forward and auto-fill data
      // Cast needed because autoFillData.code is string but RoundingData.code is a union type
      const mergedData: RoundingData = {
        ...carryResult.data,
        ...autoFillData,
        code: autoFillData.code as RoundingData['code'],
      };

      // Track which fields were auto-filled
      const autoFields = new Set<string>([
        ...autoFilled,
        ...carriedFields,
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
    const savedData = (patient as any)?.roundingData || patient?.rounding_data || {};

    // CRITICAL: Clear problems and therapeutics - user must fill fresh each day
    // These are NOT carried forward and should never be pre-populated
    return {
      ...savedData,
      problems: '',
      therapeutics: '',
    };
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

  const matchDropdownValue = (pastedValue: string, validOptions: readonly string[]): string => {
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

  /**
   * Apply smart matching for a field value.
   * For dropdown fields, matches to valid options.
   * For text fields, returns trimmed value.
   */
  const applySmartMatching = (field: string, value: string): string => {
    const trimmedValue = value.trim();
    if (!trimmedValue) return '';

    switch (field) {
      case 'location':
        return matchDropdownValue(trimmedValue, DROPDOWN_OPTIONS.location);
      case 'icuCriteria':
        return matchDropdownValue(trimmedValue, DROPDOWN_OPTIONS.icuCriteria);
      case 'code':
        return matchDropdownValue(trimmedValue, DROPDOWN_OPTIONS.code);
      case 'ivc':
        return matchDropdownValue(trimmedValue, DROPDOWN_OPTIONS.ivc);
      case 'fluids':
        return matchDropdownValue(trimmedValue, DROPDOWN_OPTIONS.fluids);
      case 'cri':
        return matchDropdownValue(trimmedValue, DROPDOWN_OPTIONS.cri);
      default:
        return trimmedValue;
    }
  };

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
        // Inside quotes - preserve newlines for multi-line medication lists
        currentValue += char;
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

  /**
   * Parse TSV data into rows, respecting quoted fields that may contain newlines.
   * Google Sheets wraps cells containing newlines in double quotes.
   *
   * Example input: 'Toby\tICU\t"Med1\nMed2"\nJane\tIP\tMed3'
   * Returns: ['Toby\tICU\t"Med1\nMed2"', 'Jane\tIP\tMed3']
   */
  const parseTSVRows = (text: string): string[] => {
    const rows: string[] = [];
    let currentRow = '';
    let inQuotes = false;
    let i = 0;

    const normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

    while (i < normalized.length) {
      const char = normalized[i];

      if (char === '"') {
        // Check for escaped quote (double quote "")
        if (inQuotes && i + 1 < normalized.length && normalized[i + 1] === '"') {
          // Escaped quote - add both and skip
          currentRow += '""';
          i += 2;
          continue;
        }
        // Toggle quote state
        inQuotes = !inQuotes;
        currentRow += char;
        i++;
      } else if (char === '\n' && !inQuotes) {
        // End of row (only when not inside quotes)
        if (currentRow.trim()) {
          rows.push(currentRow);
        }
        currentRow = '';
        i++;
      } else {
        currentRow += char;
        i++;
      }
    }

    // Don't forget the last row
    if (currentRow.trim()) {
      rows.push(currentRow);
    }

    return rows;
  };

  // Multi-row paste: parses multiple lines and shows preview modal
  // Must be defined BEFORE handleRowPaste since it's referenced there
  const handleMultiRowPaste = useCallback((
    pasteData: string,
    startPatientId: number,
    startField: keyof RoundingData
  ) => {
    // Use parseTSVRows to respect quoted fields with internal newlines (like medications)
    const rows = parseTSVRows(pasteData);

    // If only one row, use existing single-row paste
    if (rows.length === 1) {
      return false; // Let single-row paste handle it
    }

    const fieldOrder = ROUNDING_FIELD_ORDER;

    // Cast to string for indexOf since field might be dayCount/lastUpdated which aren't in order
    const startFieldIndex = fieldOrder.indexOf(startField as typeof fieldOrder[number]);
    if (startFieldIndex === -1) return false;

    // Find the index of the starting patient in active patients list
    const activePatientsList = patients.filter(p => p.status !== 'Discharged');
    const startPatientIdx = activePatientsList.findIndex(p => p.id === startPatientId);
    if (startPatientIdx === -1) return false;

    // Parse all rows and create preview data
    const previewData = rows.map((row, rowIdx) => {
      // Use parseTSVRow to properly handle quoted fields with tabs/newlines
      const values = parseTSVRow(row);
      const patientIdx = startPatientIdx + rowIdx;
      const patient = activePatientsList[patientIdx];

      const fields: { [key: string]: string } = {};

      values.forEach((value, valueIdx) => {
        const fieldIdx = startFieldIndex + valueIdx;
        if (fieldIdx < fieldOrder.length) {
          const field = fieldOrder[fieldIdx];
          // Apply smart matching for dropdown fields
          fields[field] = applySmartMatching(field, value);
        }
      });

      return {
        patientId: patient?.id || 0,
        patientName: patient ? getPatientName(patient) : '',
        fields,
        rowIndex: rowIdx
      };
    });

    // Show preview modal
    setPendingPasteData(previewData);
    setShowPastePreview(true);

    return true; // Multi-row paste handled
  }, [patients]);

  // Row-level paste handler - distributes pasted values across fields
  // Works for ALL fields including dropdowns (which can't capture paste events directly)
  const handleRowPaste = useCallback((e: React.ClipboardEvent, patientId: number) => {
    const pasteData = e.clipboardData.getData('text');
    if (!pasteData.trim()) return;

    // Check for multi-row paste using parseTSVRows (respects quoted fields with newlines)
    const lines = parseTSVRows(pasteData);
    if (lines.length > 1) {
      // Multi-row paste - show preview modal
      e.preventDefault();
      e.stopPropagation();

      const startField = focusedField?.field || 'signalment';
      if (handleMultiRowPaste(pasteData, patientId, startField)) {
        return; // Multi-row paste handled
      }
    }

    // Single row paste - determine starting field from focused field
    const startField = focusedField?.patientId === patientId ? focusedField.field : 'signalment';

    e.preventDefault();
    e.stopPropagation();

    // Parse TSV row
    const values = parseTSVRow(pasteData);
    const fieldOrder = ROUNDING_FIELD_ORDER;
    // Cast to fieldOrder element type since startField might include dayCount/lastUpdated
    const startIndex = fieldOrder.indexOf(startField as typeof fieldOrder[number]);
    if (startIndex === -1) return;

    let finalValues = values;

    // Smart detection: skip patient name column if needed
    if (startField === 'signalment' && finalValues.length >= fieldOrder.length) {
      const firstVal = finalValues[0]?.trim().toLowerCase() || '';
      const secondVal = finalValues[1]?.trim().toLowerCase() || '';
      const signalmentPattern = /\d+\s*(y|yo|yr|m|mo)?\s*(m|f|fs|mn|cm|sf|intact)/i;
      const firstLooksLikeSignalment = signalmentPattern.test(firstVal);
      const secondLooksLikeSignalment = signalmentPattern.test(secondVal);

      if (finalValues.length > fieldOrder.length || (!firstLooksLikeSignalment && secondLooksLikeSignalment)) {
        finalValues = finalValues.slice(1);
      }
    }

    const updates: Partial<RoundingData> = {};

    finalValues.forEach((value, index) => {
      const fieldIndex = startIndex + index;
      if (fieldIndex < fieldOrder.length) {
        const field = fieldOrder[fieldIndex];
        const trimmedValue = value.trim();

        // Smart matching for dropdown fields
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
          (updates as Record<string, string>)[field] = trimmedValue;
        }
      }
    });

    // Apply updates
    setEditingData(prev => {
      const patient = patients.find(p => p.id === patientId);
      const savedData = (patient as any)?.roundingData || patient?.rounding_data || {};
      const existingEdits = prev[patientId] || {};
      return {
        ...prev,
        [patientId]: mergePatientRoundingData(savedData, existingEdits, updates),
      };
    });

    const fieldCount = Object.keys(updates).length;
    toast({
      title: 'Pasted',
      description: `Filled ${fieldCount} field${fieldCount > 1 ? 's' : ''} starting from ${startField}`
    });
  }, [patients, toast, focusedField, handleMultiRowPaste]);

  // Field-level paste for text inputs (still needed for single-field paste)
  const handleFieldPaste = useCallback((e: React.ClipboardEvent, patientId: number, field: keyof RoundingData) => {
    const pasteData = e.clipboardData.getData('text');

    // If paste contains tabs, let row-level handler distribute it
    if (pasteData.includes('\t')) {
      // Update focused field so row handler knows where to start
      setFocusedField({ patientId, field });
      // Don't prevent default - let it bubble to row handler
      return;
    }

    // Single value paste - apply directly to this field
    e.preventDefault();
    e.stopPropagation();

    const trimmedValue = pasteData.replace(/[\r\n]+/g, ' ').trim();

    // For dropdown fields, use smart matching
    let finalValue = trimmedValue;
    if (field === 'location') {
      finalValue = matchDropdownValue(trimmedValue, DROPDOWN_OPTIONS.location);
    } else if (field === 'icuCriteria') {
      finalValue = matchDropdownValue(trimmedValue, DROPDOWN_OPTIONS.icuCriteria);
    } else if (field === 'code') {
      finalValue = matchDropdownValue(trimmedValue, DROPDOWN_OPTIONS.code);
    } else if (field === 'ivc') {
      finalValue = matchDropdownValue(trimmedValue, DROPDOWN_OPTIONS.ivc);
    } else if (field === 'fluids') {
      finalValue = matchDropdownValue(trimmedValue, DROPDOWN_OPTIONS.fluids);
    } else if (field === 'cri') {
      finalValue = matchDropdownValue(trimmedValue, DROPDOWN_OPTIONS.cri);
    }

    handleFieldChange(patientId, field, finalValue);
  }, [handleFieldChange]);

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

  // Check if patient has existing rounding data worth preserving
  const hasExistingData = useCallback((patientId: number): boolean => {
    const data = editingData[patientId];
    if (!data) return false;
    // Check if any clinical fields have content
    return !!(data.problems || data.therapeutics || data.diagnosticFindings ||
              data.concerns || data.comments || data.overnightDx);
  }, [editingData]);

  // Apply a rounding template to a patient - replaces all fields
  const applyTemplate = useCallback((patientId: number, template: RoundingTemplate) => {
    const patient = patients.find(p => p.id === patientId);
    const patientName = patient ? getPatientName(patient) : 'patient';

    // Confirm if patient has existing data
    if (hasExistingData(patientId)) {
      const confirmed = window.confirm(
        `This will replace all existing data for ${patientName}. Continue?`
      );
      if (!confirmed) return;
    }

    // Apply template data to patient's editing data (replaces all fields)
    setEditingData(prev => ({
      ...prev,
      [patientId]: {
        ...template.data,
        // Keep signalment if it exists (patient-specific)
        signalment: prev[patientId]?.signalment || '',
      },
    }));

    toast({
      title: 'Template Applied',
      description: `"${template.name}" applied to ${patientName}`,
    });
  }, [patients, toast, hasExistingData]);

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

      // DON'T clear editingData - keep user's changes visible for Copy Row to work correctly
      // The data is saved to the server but we keep it locally for accurate copy operations
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

  // Helper to convert problems field to plain text for Google Sheets
  // Problems are stored as comma-separated (e.g., "IVDD, Seizures") but we export as pipe-separated
  // to ensure Google Sheets treats it as pure plain text (not dropdown/list data)
  const escapeProblemsForExport = (value: string | undefined | null): string => {
    if (!value) return '';

    // Split by comma+space and rejoin with " | " for unambiguous plain text
    const problems = String(value)
      .split(/,\s*/)
      .map(p => p.trim())
      .filter(Boolean);

    return problems.join(' | ');
  };

  const exportToTSV = () => {
    const headers = ROUNDING_TSV_HEADERS;

    const rows = activePatients.map(patient => {
      const data = getPatientData(patient.id);
      const patientName = getPatientName(patient);

      return [
        escapeTSVValue(patientName),
        escapeTSVValue(data.signalment),
        escapeTSVValue(data.location),
        escapeTSVValue(data.icuCriteria),
        escapeTSVValue(data.code),
        escapeProblemsForExport(data.problems),
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
    const patientName = getPatientName(patient);

    // Build row with all 14 columns - each value MUST be escaped to prevent multi-line pastes
    const row = [
      escapeTSVValue(patientName),
      escapeTSVValue(data.signalment),
      escapeTSVValue(data.location),
      escapeTSVValue(data.icuCriteria),
      escapeTSVValue(data.code),
      escapeProblemsForExport(data.problems),
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
  const { BORDER: NEO_BORDER, SHADOW: NEO_SHADOW, COLORS } = NEO_POP_STYLES;

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
          <Link
            href="/slash-commands"
            className="px-3 py-2 rounded-xl font-bold text-gray-900 transition hover:-translate-y-0.5 flex items-center gap-1.5 text-sm"
            style={{ backgroundColor: '#FEF3C7', border: NEO_BORDER, boxShadow: '3px 3px 0 #000' }}
          >
            <span>/</span>
            Shortcuts
          </Link>
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

      {/* Mobile Card View */}
      {isMobile && activePatients.length > 0 && (
        <div className="space-y-3">
          {activePatients.map(patient => {
            const data = getPatientData(patient.id);
            const carryForward = carryForwardResults[patient.id];
            const patientName = getPatientName(patient);
            const isExpanded = expandedCards.has(patient.id);
            const hasChanges = !!editingData[patient.id];
            const status = saveStatus.get(patient.id);

            // Get code color for card header
            const codeColors: Record<string, string> = {
              Green: '#22C55E',
              Yellow: '#FBBF24',
              Orange: '#F97316',
              Red: '#EF4444',
            };
            const codeColor = codeColors[data.code || ''] || '#E5E7EB';

            return (
              <div
                key={patient.id}
                className="rounded-2xl overflow-hidden"
                style={{ border: NEO_BORDER, boxShadow: NEO_SHADOW, backgroundColor: 'white' }}
              >
                {/* Card Header - Always Visible */}
                <div
                  className="w-full p-4 flex items-center justify-between text-left"
                  style={{ backgroundColor: COLORS.mint, borderBottom: NEO_BORDER }}
                >
                  <div className="flex items-center gap-3">
                    <TemplateSelector
                      patientName={patientName}
                      onSelect={(template) => applyTemplate(patient.id, template)}
                    />
                    <button
                      onClick={() => toggleCardExpanded(patient.id)}
                      className="flex items-center gap-3 flex-1"
                    >
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: codeColor, border: '1px solid #000' }}
                        title={`Code: ${data.code || 'None'}`}
                      />
                      <div>
                        <div className="font-bold text-gray-900">{patientName}</div>
                        <div className="text-xs text-gray-600">{data.signalment || 'No signalment'}</div>
                      </div>
                    </button>
                  </div>
                  <button
                    onClick={() => toggleCardExpanded(patient.id)}
                    className="flex items-center gap-2"
                  >
                    {status === 'saving' && (
                      <span className="text-xs text-blue-600 font-medium">Saving...</span>
                    )}
                    {status === 'saved' && (
                      <span className="text-xs text-green-600 font-medium">✓ Saved</span>
                    )}
                    {hasChanges && !status && (
                      <span className="text-xs text-amber-600 font-medium">Unsaved</span>
                    )}
                    <ChevronRight
                      size={20}
                      className={`transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                    />
                  </button>
                </div>

                {/* Expanded Content */}
                {isExpanded && (
                  <div className="p-4 space-y-4">
                    {/* Quick Info Row */}
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="text-[10px] font-bold text-gray-500 uppercase">Location</label>
                        <select
                          value={data.location || ''}
                          onChange={(e) => handleFieldChange(patient.id, 'location', e.target.value)}
                          className="w-full px-2 py-1.5 rounded text-sm border border-gray-300 bg-gray-50"
                          aria-label={`Location for ${patientName}`}
                        >
                          <option value="">-</option>
                          {ROUNDING_DROPDOWN_OPTIONS.location.map(opt => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-gray-500 uppercase">ICU</label>
                        <select
                          value={data.icuCriteria || ''}
                          onChange={(e) => handleFieldChange(patient.id, 'icuCriteria', e.target.value)}
                          className="w-full px-2 py-1.5 rounded text-sm border border-gray-300 bg-gray-50"
                          aria-label={`ICU criteria for ${patientName}`}
                        >
                          <option value="">-</option>
                          {ROUNDING_DROPDOWN_OPTIONS.icuCriteria.map(opt => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-gray-500 uppercase">Code</label>
                        <select
                          value={data.code || ''}
                          onChange={(e) => handleFieldChange(patient.id, 'code', e.target.value)}
                          className="w-full px-2 py-1.5 rounded text-sm border border-gray-300"
                          style={{ backgroundColor: codeColor }}
                          aria-label={`Code for ${patientName}`}
                        >
                          <option value="">-</option>
                          {ROUNDING_DROPDOWN_OPTIONS.code.map(opt => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Problems */}
                    <div>
                      <label className="text-[10px] font-bold text-gray-500 uppercase">Problems</label>
                      <ProblemsMultiSelect
                        value={data.problems || ''}
                        onChange={(val) => handleFieldChange(patient.id, 'problems', val)}
                        aria-label={`Problems for ${patientName}`}
                      />
                    </div>

                    {/* Dx Findings */}
                    <div>
                      <label className="text-[10px] font-bold text-gray-500 uppercase">Diagnostic Findings</label>
                      <FieldMultiSelect
                        value={data.diagnosticFindings || ''}
                        onChange={(val) => handleFieldChange(patient.id, 'diagnosticFindings', val)}
                        options={ROUNDING_MULTISELECT_OPTIONS.diagnosticFindings}
                        placeholder="Select diagnostics..."
                        aria-label={`Diagnostic findings for ${patientName}`}
                      />
                    </div>

                    {/* Therapeutics */}
                    <div>
                      <label className="text-[10px] font-bold text-gray-500 uppercase">Therapeutics</label>
                      <FieldMultiSelect
                        value={data.therapeutics || ''}
                        onChange={(val) => handleFieldChange(patient.id, 'therapeutics', val)}
                        options={ROUNDING_MULTISELECT_OPTIONS.therapeutics}
                        placeholder="Select therapeutics..."
                        aria-label={`Therapeutics for ${patientName}`}
                      />
                    </div>

                    {/* IVC/Fluids/CRI Row */}
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="text-[10px] font-bold text-gray-500 uppercase">IVC</label>
                        <select
                          value={data.ivc || ''}
                          onChange={(e) => handleFieldChange(patient.id, 'ivc', e.target.value)}
                          className="w-full px-2 py-1.5 rounded text-sm border border-gray-300 bg-gray-50"
                          aria-label={`IVC for ${patientName}`}
                        >
                          <option value="">-</option>
                          <option value="Yes">Y</option>
                          <option value="No">N</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-gray-500 uppercase">Fluids</label>
                        <select
                          value={data.fluids || ''}
                          onChange={(e) => handleFieldChange(patient.id, 'fluids', e.target.value)}
                          className="w-full px-2 py-1.5 rounded text-sm border border-gray-300 bg-gray-50"
                          aria-label={`Fluids for ${patientName}`}
                        >
                          <option value="">-</option>
                          <option value="Yes">Y</option>
                          <option value="No">N</option>
                          <option value="n/a">n/a</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-gray-500 uppercase">CRI</label>
                        <select
                          value={data.cri || ''}
                          onChange={(e) => handleFieldChange(patient.id, 'cri', e.target.value)}
                          className="w-full px-2 py-1.5 rounded text-sm border border-gray-300 bg-gray-50"
                          aria-label={`CRI for ${patientName}`}
                        >
                          <option value="">-</option>
                          <option value="Yes">Y</option>
                          <option value="No">N</option>
                        </select>
                      </div>
                    </div>

                    {/* Overnight Diagnostics */}
                    <div>
                      <label className="text-[10px] font-bold text-gray-500 uppercase">Overnight Diagnostics</label>
                      <FieldMultiSelect
                        value={data.overnightDx || ''}
                        onChange={(val) => handleFieldChange(patient.id, 'overnightDx', val)}
                        options={ROUNDING_MULTISELECT_OPTIONS.overnightDx}
                        placeholder="O/N diagnostics..."
                        aria-label={`Overnight diagnostics for ${patientName}`}
                      />
                    </div>

                    {/* Overnight Concerns */}
                    <div>
                      <label className="text-[10px] font-bold text-gray-500 uppercase">Overnight Concerns</label>
                      <FieldMultiSelect
                        value={data.concerns || ''}
                        onChange={(val) => handleFieldChange(patient.id, 'concerns', val)}
                        options={ROUNDING_MULTISELECT_OPTIONS.concerns}
                        placeholder={carryForward?.carriedForward ? "Today's concerns..." : "Select concerns..."}
                        aria-label={`Concerns for ${patientName}`}
                      />
                    </div>

                    {/* Extra Notes */}
                    <div>
                      <label className="text-[10px] font-bold text-gray-500 uppercase">Extra Notes</label>
                      <FieldMultiSelect
                        value={data.comments || ''}
                        onChange={(val) => handleFieldChange(patient.id, 'comments', val)}
                        options={ROUNDING_MULTISELECT_OPTIONS.comments}
                        placeholder="Extra notes..."
                        aria-label={`Comments for ${patientName}`}
                      />
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2 pt-2">
                      <button
                        onClick={() => copyPatientRow(patient.id)}
                        className="flex-1 px-4 py-3 rounded-xl font-bold transition hover:-translate-y-0.5 text-gray-900 flex items-center justify-center gap-2"
                        style={{ backgroundColor: COLORS.lavender, border: NEO_BORDER }}
                      >
                        <Copy size={16} />
                        Copy
                      </button>
                      <button
                        onClick={() => handleSave(patient.id)}
                        disabled={!hasChanges || isSaving}
                        className="flex-1 px-4 py-3 rounded-xl font-bold transition hover:-translate-y-0.5 disabled:opacity-50 text-gray-900 flex items-center justify-center gap-2"
                        style={{ backgroundColor: COLORS.mint, border: NEO_BORDER }}
                      >
                        <Save size={16} />
                        Save
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Desktop Rounding Sheet Table */}
      {!isMobile && (
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
              const patientName = getPatientName(patient);

              // Alternating row colors for neo-pop
              const rowBg = hasChanges ? COLORS.mint + '40' : 'white';

              return (
                <tr
                  key={patient.id}
                  style={{ backgroundColor: rowBg }}
                  onPaste={(e) => handleRowPaste(e, patient.id)}
                >
                  <td className="p-1 sticky left-0 z-10" style={{ backgroundColor: rowBg, borderRight: NEO_BORDER, borderBottom: '1px solid #000' }}>
                    <div className="flex items-center gap-1">
                      <TemplateSelector
                        patientName={patientName}
                        onSelect={(template) => applyTemplate(patient.id, template)}
                      />
                      <Link
                        href={`/?patient=${patient.id}`}
                        className="group flex flex-col hover:text-[#6BB89D] transition flex-1 min-w-0"
                      >
                        <div className="font-bold text-xs text-gray-900 group-hover:text-[#6BB89D] truncate">{patientName}</div>
                        <div className="text-[10px] text-gray-500 truncate">
                          {(patient as any)?.demographics?.age} {(patient as any)?.demographics?.breed}
                        </div>
                      </Link>
                    </div>
                  </td>
                  <td className="p-0.5" style={{ borderRight: '1px solid #ccc', borderBottom: '1px solid #ccc' }}>
                    <input
                      type="text"
                      value={data.signalment || ''}
                      onChange={(e) => handleFieldChange(patient.id, 'signalment', e.target.value)}
                      onFocus={() => setFocusedField({ patientId: patient.id, field: 'signalment' })}
                      onPaste={(e) => handleFieldPaste(e, patient.id, 'signalment')}
                      aria-label={`Signalment for ${patientName}`}
                      className="w-full px-1 py-0.5 rounded text-gray-900 text-xs focus:outline-none focus:ring-1 focus:ring-[#6BB89D] bg-gray-50"
                      style={{ border: '1px solid #ccc' }}
                    />
                  </td>
                  <td className="p-0.5" style={{ borderRight: '1px solid #ccc', borderBottom: '1px solid #ccc' }}>
                    <select
                      value={data.location || ''}
                      onChange={(e) => handleFieldChange(patient.id, 'location', e.target.value)}
                      onFocus={() => setFocusedField({ patientId: patient.id, field: 'location' })}
                      aria-label={`Location for ${patientName}`}
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
                      onFocus={() => setFocusedField({ patientId: patient.id, field: 'icuCriteria' })}
                      aria-label={`ICU Criteria for ${patientName}`}
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
                      onFocus={() => setFocusedField({ patientId: patient.id, field: 'code' })}
                      aria-label={`Code status for ${patientName}`}
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
                      aria-label={`Problems for ${patientName}`}
                    />
                  </td>
                  <td className="p-0.5 relative" style={{ borderRight: '1px solid #ccc', borderBottom: '1px solid #ccc' }}>
                    <FieldMultiSelect
                      value={data.diagnosticFindings || ''}
                      onChange={(val) => handleFieldChange(patient.id, 'diagnosticFindings', val)}
                      options={ROUNDING_MULTISELECT_OPTIONS.diagnosticFindings}
                      placeholder="Select diagnostics..."
                      aria-label={`Diagnostic findings for ${patientName}`}
                    />
                  </td>
                  <td className="p-0.5 relative" style={{ borderRight: '1px solid #ccc', borderBottom: '1px solid #ccc' }}>
                    <FieldMultiSelect
                      value={data.therapeutics || ''}
                      onChange={(val) => handleFieldChange(patient.id, 'therapeutics', val)}
                      options={ROUNDING_MULTISELECT_OPTIONS.therapeutics}
                      placeholder="Select therapeutics..."
                      aria-label={`Therapeutics for ${patientName}`}
                    />
                  </td>
                  <td className="p-0.5" style={{ borderRight: '1px solid #ccc', borderBottom: '1px solid #ccc' }}>
                    <select
                      value={data.ivc || ''}
                      onChange={(e) => handleFieldChange(patient.id, 'ivc', e.target.value)}
                      onFocus={() => setFocusedField({ patientId: patient.id, field: 'ivc' })}
                      aria-label={`IVC for ${patientName}`}
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
                      onFocus={() => setFocusedField({ patientId: patient.id, field: 'fluids' })}
                      aria-label={`Fluids for ${patientName}`}
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
                      onFocus={() => setFocusedField({ patientId: patient.id, field: 'cri' })}
                      aria-label={`CRI for ${patientName}`}
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
                  <td className="p-0.5 relative" style={{ borderRight: '1px solid #ccc', borderBottom: '1px solid #ccc' }}>
                    <FieldMultiSelect
                      value={data.overnightDx || ''}
                      onChange={(val) => handleFieldChange(patient.id, 'overnightDx', val)}
                      options={ROUNDING_MULTISELECT_OPTIONS.overnightDx}
                      placeholder="O/N diagnostics..."
                      aria-label={`Overnight diagnostics for ${patientName}`}
                    />
                  </td>
                  <td className="p-0.5 relative" style={{ borderRight: '1px solid #ccc', borderBottom: '1px solid #ccc' }}>
                    <FieldMultiSelect
                      value={data.concerns || ''}
                      onChange={(val) => handleFieldChange(patient.id, 'concerns', val)}
                      options={ROUNDING_MULTISELECT_OPTIONS.concerns}
                      placeholder={carryForward?.carriedForward ? "Today's concerns..." : "O/N concerns..."}
                      aria-label={`Concerns for ${patientName}`}
                    />
                  </td>
                  <td className="p-0.5 relative" style={{ borderRight: '1px solid #ccc', borderBottom: '1px solid #ccc' }}>
                    <FieldMultiSelect
                      value={data.comments || ''}
                      onChange={(val) => handleFieldChange(patient.id, 'comments', val)}
                      options={ROUNDING_MULTISELECT_OPTIONS.comments}
                      placeholder="Extra notes..."
                      aria-label={`Comments for ${patientName}`}
                    />
                  </td>
                  <td className="p-1 text-center sticky right-0 z-10" style={{ backgroundColor: rowBg, borderLeft: NEO_BORDER, borderBottom: '1px solid #000' }}>
                    <div className="flex flex-col gap-1 md:gap-0.5">
                      <button
                        onClick={() => copyPatientRow(patient.id)}
                        className="min-w-[44px] min-h-[36px] md:min-w-0 md:min-h-0 px-2 py-1.5 md:px-1.5 md:py-0.5 rounded text-xs md:text-[10px] font-bold transition hover:-translate-y-0.5 text-gray-900 flex items-center justify-center"
                        style={{ backgroundColor: COLORS.lavender, border: '1px solid #000' }}
                        title="Copy row"
                        aria-label={`Copy row for ${patientName}`}
                      >
                        <Copy size={14} className="md:hidden" />
                        <Copy size={10} className="hidden md:inline" />
                      </button>
                      <button
                        onClick={() => handleSave(patient.id)}
                        disabled={!hasChanges || isSaving}
                        className="min-w-[44px] min-h-[36px] md:min-w-0 md:min-h-0 px-2 py-1.5 md:px-1.5 md:py-0.5 rounded text-xs md:text-[10px] font-bold transition hover:-translate-y-0.5 disabled:opacity-50 text-gray-900 flex items-center justify-center"
                        style={{ backgroundColor: COLORS.mint, border: '1px solid #000' }}
                        aria-label={`Save row for ${patientName}`}
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
      )}

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

      {/* Multi-row paste preview modal */}
      <PastePreviewModal
        isOpen={showPastePreview}
        onClose={() => {
          setShowPastePreview(false);
          setPendingPasteData([]);
        }}
        onConfirm={applyMultiRowPaste}
        previewData={pendingPasteData}
        fieldNames={ROUNDING_FIELD_ORDER}
      />
    </div>
  );
}
