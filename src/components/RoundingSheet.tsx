'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Save, Copy, ExternalLink } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import Link from 'next/link';
import { carryForwardRoundingData, formatCarryForwardMessage, type CarryForwardResult } from '@/lib/rounding-carry-forward';
import { autoFillRoundingData, generateSignalment, isStaleData } from '@/lib/rounding-auto-fill';
import { PastePreviewModal } from './PastePreviewModal';
import { QuickInsertPanel } from '@/components/QuickInsertPanel';

interface Patient {
  id: number;
  name: string;
  status: string;
  rounding_data?: RoundingData;
  patient_info?: any;
  demographics?: {
    name?: string;
    age?: string;
    sex?: string;
    breed?: string;
    species?: string;
    weight?: string;
  };
  currentStay?: {
    location?: string;
    codeStatus?: string;
    icuCriteria?: string;
  };
}

interface RoundingData {
  signalment?: string;
  location?: string;
  icuCriteria?: string;
  code?: string;  // matches modal field name
  problems?: string;
  diagnosticFindings?: string;
  therapeutics?: string;
  ivc?: string;  // matches modal field name
  fluids?: string;  // matches modal field name
  cri?: string;  // matches modal field name
  overnightDx?: string;
  concerns?: string;  // matches modal field name
  comments?: string;
  dayCount?: number;  // AI carry-forward: track day count
  lastUpdated?: string;  // AI carry-forward: ISO date string
}

interface RoundingSheetProps {
  patients: Patient[];
  toast: (options: any) => void;
  onPatientUpdate?: () => void;
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

const ROUNDING_BACKUP_KEY = 'vethub-rounding-backup';

export function RoundingSheet({ patients, toast, onPatientUpdate }: RoundingSheetProps) {
  const [editingData, setEditingData] = useState<Record<number, RoundingData>>(() => {
    // Restore from localStorage on mount if available
    if (typeof window !== 'undefined') {
      try {
        const backup = localStorage.getItem(ROUNDING_BACKUP_KEY);
        if (backup) {
          const parsed = JSON.parse(backup);
          if (Object.keys(parsed).length > 0) {
            console.log('[Rounding] Restored backup with', Object.keys(parsed).length, 'patients');
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
  const autoSaveDelay = 2000; // 2 seconds
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
          localStorage.setItem(ROUNDING_BACKUP_KEY, JSON.stringify(editingData));
        } else {
          localStorage.removeItem(ROUNDING_BACKUP_KEY);
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
    }, autoSaveDelay);

    setSaveTimers(prev => new Map(prev).set(patientId, newTimer));
  };

  // Quick-insert: Insert text into currently focused field
  const handleQuickInsert = (text: string) => {
    if (!focusedField) return;

    const { patientId, field } = focusedField;
    const currentData = getPatientData(patientId);
    const currentValue = currentData[field] || '';

    // Append text (with newline if field already has content)
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

  const DROPDOWN_OPTIONS = {
    location: ['IP', 'ICU'],
    icuCriteria: ['Yes', 'No', 'n/a'],
    code: ['Green', 'Yellow', 'Orange', 'Red'],
    ivc: ['Yes', 'No'],
    fluids: ['Yes', 'No', 'n/a'],
    cri: ['Yes', 'No', 'No but...', 'Yet but...'],
  };

  // Helper to parse TSV - splits by tab, converts newlines within cells to spaces
  const parseTSVRow = (text: string): string[] => {
    // First, normalize all newlines within the data to spaces
    // This handles cases where cell content has line breaks
    const normalized = text.replace(/\r\n/g, ' ').replace(/\r/g, ' ').replace(/\n/g, ' ');

    // Split by tab
    const values = normalized.split('\t');

    // Trim each value and remove quotes if present
    return values.map(v => {
      let trimmed = v.trim();
      // Remove surrounding quotes if present
      if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
        trimmed = trimmed.slice(1, -1).replace(/""/g, '"');
      }
      return trimmed;
    });
  };

  const handlePaste = useCallback((e: React.ClipboardEvent, patientId: number, startField: keyof RoundingData) => {
    e.preventDefault();
    e.stopPropagation();
    const pasteData = e.clipboardData.getData('text');

    // Parse TSV row (converts newlines to spaces, splits by tab)
    const values = parseTSVRow(pasteData);

    // Field order matching Google Sheets columns (EXCLUDING patient name column)
    // When pasting from Google Sheets export, first column is Patient name which we skip
    const fieldOrder: (keyof RoundingData)[] = [
      'signalment', 'location', 'icuCriteria', 'code', 'problems',
      'diagnosticFindings', 'therapeutics', 'ivc', 'fluids',
      'cri', 'overnightDx', 'concerns', 'comments'
    ];

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

    // DEBUG - show what updates will be applied
    console.log('Final updates to apply:', updates);
    console.log('Fields being updated:', Object.keys(updates));
    console.log('===================');

    // Merge with existing data - use prev state to avoid stale closure bug
    setEditingData(prev => {
      const patient = patients.find(p => p.id === patientId);
      const savedData = (patient as any)?.roundingData || patient?.rounding_data || {};
      const existingEdits = prev[patientId] || {};

      const merged = mergePatientRoundingData(savedData, existingEdits, updates);
      console.log('Merged result:', merged);

      return {
        ...prev,
        [patientId]: merged,
      };
    });

    const fieldCount = Object.keys(updates).length;
    const dropdownFields = ['location', 'icuCriteria', 'code', 'ivc', 'fluids', 'cri'];
    const pastedDropdowns = Object.keys(updates).filter(f => dropdownFields.includes(f)).length;

    toast({
      title: 'Pasted',
      description: `Pasted ${fieldCount} field${fieldCount > 1 ? 's' : ''}${pastedDropdowns > 0 ? ` (${pastedDropdowns} dropdown${pastedDropdowns > 1 ? 's' : ''} matched)` : ''}`
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

    const fieldOrder: (keyof RoundingData)[] = [
      'signalment', 'location', 'icuCriteria', 'code', 'problems',
      'diagnosticFindings', 'therapeutics', 'ivc', 'fluids',
      'cri', 'overnightDx', 'concerns', 'comments'
    ];

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

  const exportToTSV = () => {
    const headers = ['Patient', 'Signalment', 'Location', 'ICU Criteria', 'Code Status', 'Problems',
                    'Diagnostic Findings', 'Therapeutics', 'IVC', 'Fluids', 'CRI',
                    'Overnight Dx', 'Concerns', 'Additional Comments'];

    const rows = activePatients.map(patient => {
      const data = getPatientData(patient.id);
      const patientName = (patient as any)?.demographics?.name || patient.name || patient.patient_info?.name || `Patient ${patient.id}`;
      return [
        patientName,
        data.signalment || '',
        data.location || '',
        data.icuCriteria || '',
        data.code || '',
        data.problems || '',
        data.diagnosticFindings || '',
        data.therapeutics || '',
        data.ivc || '',
        data.fluids || '',
        data.cri || '',
        data.overnightDx || '',
        data.concerns || '',
        data.comments || ''
      ].join('\t');
    });

    const tsv = [headers.join('\t'), ...rows].join('\n');
    navigator.clipboard.writeText(tsv);

    toast({
      title: 'Copied to Clipboard',
      description: 'Rounding sheet copied as TSV (paste into Google Sheets)'
    });
  };

  const copyPatientRow = (patientId: number) => {
    const patient = activePatients.find(p => p.id === patientId);
    if (!patient) return;

    const data = getPatientData(patientId);
    const patientName = (patient as any)?.demographics?.name || patient.name || patient.patient_info?.name || `Patient ${patient.id}`;

    const row = [
      patientName,
      data.signalment || '',
      data.location || '',
      data.icuCriteria || '',
      data.code || '',
      data.problems || '',
      data.diagnosticFindings || '',
      data.therapeutics || '',
      data.ivc || '',
      data.fluids || '',
      data.cri || '',
      data.overnightDx || '',
      data.concerns || '',
      data.comments || ''
    ].join('\t');

    navigator.clipboard.writeText(row);

    toast({
      title: 'Patient Row Copied',
      description: `${patientName}'s data copied to clipboard`
    });
  };

  // Neo-pop styling constants
  const NEO_BORDER = '2px solid #000';
  const NEO_SHADOW = '6px 6px 0 #000';
  const NEO_SHADOW_SM = '4px 4px 0 #000';
  const COLORS = {
    lavender: '#DCC4F5',
    mint: '#B8E6D4',
    pink: '#FFBDBD',
    cream: '#FFF8F0',
  };

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
            <tr className="text-gray-900 text-xs font-bold" style={{ backgroundColor: COLORS.mint }}>
              <th className="p-2 text-left sticky left-0 z-10 min-w-[120px]" style={{ backgroundColor: COLORS.mint, borderRight: NEO_BORDER, borderBottom: NEO_BORDER }}>Patient</th>
              <th className="p-2 text-left min-w-[150px]" style={{ borderRight: '1px solid #000', borderBottom: NEO_BORDER }}>Signalment</th>
              <th className="p-2 text-left min-w-[100px]" style={{ borderRight: '1px solid #000', borderBottom: NEO_BORDER }}>Location</th>
              <th className="p-2 text-left min-w-[100px]" style={{ borderRight: '1px solid #000', borderBottom: NEO_BORDER }}>ICU Criteria</th>
              <th className="p-2 text-left min-w-[100px]" style={{ borderRight: '1px solid #000', borderBottom: NEO_BORDER }}>Code Status</th>
              <th className="p-2 text-left min-w-[200px]" style={{ borderRight: '1px solid #000', borderBottom: NEO_BORDER }}>Problems</th>
              <th className="p-2 text-left min-w-[200px]" style={{ borderRight: '1px solid #000', borderBottom: NEO_BORDER }}>Diagnostic Findings</th>
              <th className="p-2 text-left min-w-[200px]" style={{ borderRight: '1px solid #000', borderBottom: NEO_BORDER }}>Therapeutics</th>
              <th className="p-2 text-left min-w-[80px]" style={{ borderRight: '1px solid #000', borderBottom: NEO_BORDER }}>IVC</th>
              <th className="p-2 text-left min-w-[100px]" style={{ borderRight: '1px solid #000', borderBottom: NEO_BORDER }}>Fluids</th>
              <th className="p-2 text-left min-w-[100px]" style={{ borderRight: '1px solid #000', borderBottom: NEO_BORDER }}>CRI</th>
              <th className="p-2 text-left min-w-[150px]" style={{ borderRight: '1px solid #000', borderBottom: NEO_BORDER }}>Overnight Dx</th>
              <th className="p-2 text-left min-w-[150px]" style={{ borderRight: '1px solid #000', borderBottom: NEO_BORDER }}>Concerns</th>
              <th className="p-2 text-left min-w-[200px]" style={{ borderRight: '1px solid #000', borderBottom: NEO_BORDER }}>Additional Comments</th>
              <th className="p-2 text-center sticky right-0 z-10 min-w-[80px]" style={{ backgroundColor: COLORS.mint, borderLeft: NEO_BORDER, borderBottom: NEO_BORDER }}>Actions</th>
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
                  <td className="p-2 sticky left-0 z-10" style={{ backgroundColor: rowBg, borderRight: NEO_BORDER, borderBottom: '1px solid #000' }}>
                    <Link
                      href={`/?patient=${patient.id}`}
                      className="group flex flex-col gap-1 hover:text-[#6BB89D] transition"
                    >
                      <div className="flex items-center gap-2">
                        <div className="font-bold text-gray-900 group-hover:text-[#6BB89D]">{patientName}</div>
                        <ExternalLink size={12} className="opacity-0 group-hover:opacity-100 text-[#6BB89D]" />
                      </div>
                      <div className="text-xs text-gray-500 font-medium">
                        {(patient as any)?.demographics?.age} {(patient as any)?.demographics?.breed}
                      </div>
                    </Link>
                  </td>
                  <td className="p-1" style={{ borderRight: '1px solid #ccc', borderBottom: '1px solid #ccc' }}>
                    <input
                      type="text"
                      value={data.signalment || ''}
                      onChange={(e) => handleFieldChange(patient.id, 'signalment', e.target.value)}
                      onPaste={(e) => handlePaste(e, patient.id, 'signalment')}
                      className="w-full px-2 py-1 rounded-lg text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-[#6BB89D] bg-gray-50"
                      style={{ border: '1px solid #ccc' }}
                    />
                  </td>
                  <td className="p-1" style={{ borderRight: '1px solid #ccc', borderBottom: '1px solid #ccc' }}>
                    <select
                      value={data.location || ''}
                      onChange={(e) => handleFieldChange(patient.id, 'location', e.target.value)}
                      onPaste={(e) => handlePaste(e, patient.id, 'location')}
                      className="w-full px-2 py-1 rounded-lg text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-[#6BB89D] bg-gray-50"
                      style={{ border: '1px solid #ccc' }}
                    >
                      <option value=""></option>
                      <option value="IP">IP</option>
                      <option value="ICU">ICU</option>
                    </select>
                  </td>
                  <td className="p-1" style={{ borderRight: '1px solid #ccc', borderBottom: '1px solid #ccc' }}>
                    <select
                      value={data.icuCriteria || ''}
                      onChange={(e) => handleFieldChange(patient.id, 'icuCriteria', e.target.value)}
                      onPaste={(e) => handlePaste(e, patient.id, 'icuCriteria')}
                      className="w-full px-2 py-1 rounded-lg text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-[#6BB89D] bg-gray-50"
                      style={{ border: '1px solid #ccc' }}
                    >
                      <option value=""></option>
                      <option value="Yes">Yes</option>
                      <option value="No">No</option>
                      <option value="n/a">n/a</option>
                    </select>
                  </td>
                  <td className="p-1" style={{ borderRight: '1px solid #ccc', borderBottom: '1px solid #ccc' }}>
                    <select
                      value={data.code || ''}
                      onChange={(e) => handleFieldChange(patient.id, 'code', e.target.value)}
                      onPaste={(e) => handlePaste(e, patient.id, 'code')}
                      className="w-full px-2 py-1 rounded-lg text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-[#6BB89D] bg-gray-50"
                      style={{ border: '1px solid #ccc' }}
                    >
                      <option value="">Select...</option>
                      <option value="Green">Green</option>
                      <option value="Yellow">Yellow</option>
                      <option value="Orange">Orange</option>
                      <option value="Red">Red</option>
                    </select>
                  </td>
                  <td className="p-1" style={{ borderRight: '1px solid #ccc', borderBottom: '1px solid #ccc' }}>
                    <textarea
                      value={data.problems || ''}
                      onChange={(e) => handleFieldChange(patient.id, 'problems', e.target.value)}
                      onPaste={(e) => handlePaste(e, patient.id, 'problems')}
                      rows={2}
                      className="w-full px-2 py-1 rounded-lg text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-[#6BB89D] bg-gray-50 resize-none"
                      style={{ border: '1px solid #ccc' }}
                    />
                  </td>
                  <td className="p-1 relative" style={{ borderRight: '1px solid #ccc', borderBottom: '1px solid #ccc' }}>
                    <textarea
                      value={data.diagnosticFindings || ''}
                      onChange={(e) => handleFieldChange(patient.id, 'diagnosticFindings', e.target.value)}
                      onFocus={() => {
                        setFocusedField({ patientId: patient.id, field: 'diagnosticFindings' });
                        setShowQuickInsert(true);
                      }}
                      onPaste={(e) => handlePaste(e, patient.id, 'diagnosticFindings')}
                      rows={2}
                      className="w-full px-2 py-1 rounded-lg text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-[#6BB89D] bg-gray-50 resize-none"
                      style={{ border: '1px solid #ccc' }}
                    />
                    {/* Quick-Insert Popup */}
                    {showQuickInsert && focusedField?.patientId === patient.id && focusedField?.field === 'diagnosticFindings' && (
                      <div className="absolute top-full left-0 mt-1 z-30 min-w-[600px]">
                        <QuickInsertPanel
                          field="diagnostics"
                          onInsert={handleQuickInsert}
                        />
                      </div>
                    )}
                  </td>
                  <td className="p-1 relative" style={{ borderRight: '1px solid #ccc', borderBottom: '1px solid #ccc' }}>
                    <textarea
                      value={data.therapeutics || ''}
                      onChange={(e) => handleFieldChange(patient.id, 'therapeutics', e.target.value)}
                      onFocus={() => {
                        setFocusedField({ patientId: patient.id, field: 'therapeutics' });
                        setShowQuickInsert(true);
                      }}
                      onPaste={(e) => handlePaste(e, patient.id, 'therapeutics')}
                      rows={2}
                      className="w-full px-2 py-1 rounded-lg text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-[#6BB89D] bg-gray-50 resize-none"
                      style={{ border: '1px solid #ccc' }}
                    />
                    {/* Quick-Insert Popup */}
                    {showQuickInsert && focusedField?.patientId === patient.id && focusedField?.field === 'therapeutics' && (
                      <div className="absolute top-full left-0 mt-1 z-30 min-w-[600px]">
                        <QuickInsertPanel
                          field="therapeutics"
                          onInsert={handleQuickInsert}
                        />
                      </div>
                    )}
                  </td>
                  <td className="p-1" style={{ borderRight: '1px solid #ccc', borderBottom: '1px solid #ccc' }}>
                    <select
                      value={data.ivc || ''}
                      onChange={(e) => handleFieldChange(patient.id, 'ivc', e.target.value)}
                      onPaste={(e) => handlePaste(e, patient.id, 'ivc')}
                      className="w-full px-2 py-1 rounded-lg text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-[#6BB89D] bg-gray-50"
                      style={{ border: '1px solid #ccc' }}
                    >
                      <option value=""></option>
                      <option value="Yes">Yes</option>
                      <option value="No">No</option>
                    </select>
                  </td>
                  <td className="p-1" style={{ borderRight: '1px solid #ccc', borderBottom: '1px solid #ccc' }}>
                    <select
                      value={data.fluids || ''}
                      onChange={(e) => handleFieldChange(patient.id, 'fluids', e.target.value)}
                      onPaste={(e) => handlePaste(e, patient.id, 'fluids')}
                      className="w-full px-2 py-1 rounded-lg text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-[#6BB89D] bg-gray-50"
                      style={{ border: '1px solid #ccc' }}
                    >
                      <option value=""></option>
                      <option value="Yes">Yes</option>
                      <option value="No">No</option>
                      <option value="n/a">n/a</option>
                    </select>
                  </td>
                  <td className="p-1" style={{ borderRight: '1px solid #ccc', borderBottom: '1px solid #ccc' }}>
                    <select
                      value={data.cri || ''}
                      onChange={(e) => handleFieldChange(patient.id, 'cri', e.target.value)}
                      onPaste={(e) => handlePaste(e, patient.id, 'cri')}
                      className="w-full px-2 py-1 rounded-lg text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-[#6BB89D] bg-gray-50"
                      style={{ border: '1px solid #ccc' }}
                    >
                      <option value=""></option>
                      <option value="Yes">Yes</option>
                      <option value="No">No</option>
                      <option value="No but...">No but...</option>
                      <option value="Yet but...">Yet but...</option>
                    </select>
                  </td>
                  <td className="p-1" style={{ borderRight: '1px solid #ccc', borderBottom: '1px solid #ccc' }}>
                    <textarea
                      value={data.overnightDx || ''}
                      onChange={(e) => handleFieldChange(patient.id, 'overnightDx', e.target.value)}
                      onPaste={(e) => handlePaste(e, patient.id, 'overnightDx')}
                      rows={2}
                      className="w-full px-2 py-1 rounded-lg text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-[#6BB89D] bg-gray-50 resize-none"
                      style={{ border: '1px solid #ccc' }}
                    />
                  </td>
                  <td className="p-1 relative" style={{ borderRight: '1px solid #ccc', borderBottom: '1px solid #ccc' }}>
                    <textarea
                      value={data.concerns || ''}
                      onChange={(e) => handleFieldChange(patient.id, 'concerns', e.target.value)}
                      onFocus={() => {
                        setFocusedField({ patientId: patient.id, field: 'concerns' });
                        setShowQuickInsert(true);
                      }}
                      onPaste={(e) => handlePaste(e, patient.id, 'concerns')}
                      rows={2}
                      placeholder={carryForward?.carriedForward ? "Enter today's concerns..." : ""}
                      className="w-full px-2 py-1 rounded-lg text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-[#6BB89D] bg-gray-50 resize-none"
                      style={{ border: '1px solid #ccc' }}
                    />
                    {/* Quick-Insert Popup */}
                    {showQuickInsert && focusedField?.patientId === patient.id && focusedField?.field === 'concerns' && (
                      <div className="absolute top-full left-0 mt-1 z-30 min-w-[600px]">
                        <QuickInsertPanel
                          field="concerns"
                          onInsert={handleQuickInsert}
                        />
                      </div>
                    )}
                  </td>
                  <td className="p-1" style={{ borderRight: '1px solid #ccc', borderBottom: '1px solid #ccc' }}>
                    <textarea
                      value={data.comments || ''}
                      onChange={(e) => handleFieldChange(patient.id, 'comments', e.target.value)}
                      onPaste={(e) => handlePaste(e, patient.id, 'comments')}
                      rows={2}
                      className="w-full px-2 py-1 rounded-lg text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-[#6BB89D] bg-gray-50 resize-none"
                      style={{ border: '1px solid #ccc' }}
                    />
                  </td>
                  <td className="p-2 text-center sticky right-0 z-10" style={{ backgroundColor: rowBg, borderLeft: NEO_BORDER, borderBottom: '1px solid #000' }}>
                    <div className="flex flex-col gap-1">
                      <button
                        onClick={() => copyPatientRow(patient.id)}
                        className="px-3 py-1 rounded-lg text-xs font-bold transition hover:-translate-y-0.5 flex items-center justify-center gap-1 text-gray-900"
                        style={{ backgroundColor: COLORS.lavender, border: '1.5px solid #000' }}
                        title="Copy this patient's row"
                      >
                        <Copy size={12} />
                        Copy
                      </button>
                      <button
                        onClick={() => handleSave(patient.id)}
                        disabled={!hasChanges || isSaving}
                        className="px-3 py-1 rounded-lg text-xs font-bold transition hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed text-gray-900"
                        style={{ backgroundColor: COLORS.mint, border: '1.5px solid #000' }}
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
