'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { Save, Copy, ExternalLink, Sparkles, RotateCcw } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import Link from 'next/link';
import { carryForwardRoundingData, formatCarryForwardMessage, type CarryForwardResult } from '@/lib/rounding-carry-forward';
import { autoFillRoundingData, generateSignalment, isStaleData } from '@/lib/rounding-auto-fill';
import { AutoCompleteInput } from '@/components/AutoCompleteInput';
import { PastePreviewModal } from './PastePreviewModal';

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

export function RoundingSheet({ patients, toast, onPatientUpdate }: RoundingSheetProps) {
  const [editingData, setEditingData] = useState<Record<number, RoundingData>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [saveTimers, setSaveTimers] = useState<Map<number, NodeJS.Timeout>>(new Map());
  const [saveStatus, setSaveStatus] = useState<Map<number, 'saving' | 'saved' | 'error'>>(new Map());
  const autoSaveDelay = 2000; // 2 seconds
  const [carryForwardResults, setCarryForwardResults] = useState<Record<number, CarryForwardResult>>({});
  const [showPastePreview, setShowPastePreview] = useState(false);
  const [pendingPasteData, setPendingPasteData] = useState<any[]>([]);
  const [pasteStartPatientIndex, setPasteStartPatientIndex] = useState(0);
  const [autoFilledFields, setAutoFilledFields] = useState<Record<number, Set<string>>>({});

  useEffect(() => {
    return () => {
      // Clean up all timers on unmount
      saveTimers.forEach(timer => clearTimeout(timer));
    };
  }, [saveTimers]);

  console.log('[RoundingSheet] Received patients:', patients?.length, patients);

  const activePatients = patients.filter(p => p.status !== 'Discharged');

  console.log('[RoundingSheet] Active patients:', activePatients.length, activePatients);

  // Log the full structure of the first patient to see what fields are available
  if (activePatients.length > 0) {
    console.log('[RoundingSheet] First patient full structure:', JSON.stringify(activePatients[0], null, 2));
  }

  // Auto-Fill & Carry-Forward: Pre-fill rounding data from demographics and yesterday's data
  useEffect(() => {
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

    // Only update editing data if it's empty (first load)
    setEditingData((prev) => {
      if (Object.keys(prev).length === 0) {
        return newEditingData;
      }
      return prev;
    });
  }, [activePatients.map(p => p.id).join(',')]); // Re-run when patient list changes

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

  // Initialize editing data from patient rounding data
  const getPatientData = (patientId: number): RoundingData => {
    if (editingData[patientId]) return editingData[patientId];
    const patient = patients.find(p => p.id === patientId);
    // API returns roundingData (camelCase), not rounding_data (snake_case)
    return (patient as any)?.roundingData || patient?.rounding_data || {};
  };

  const handleFieldChange = (patientId: number, field: keyof RoundingData, value: string) => {
    // Update editing data immediately
    setEditingData(prev => ({
      ...prev,
      [patientId]: {
        ...getPatientData(patientId),
        [field]: value
      }
    }));

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

    // Clear existing timer for this patient
    const existingTimer = saveTimers.get(patientId);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Set new timer for auto-save
    const newTimer = setTimeout(() => {
      autoSave(patientId);
      setSaveTimers(prev => {
        const newMap = new Map(prev);
        newMap.delete(patientId);
        return newMap;
      });
    }, autoSaveDelay);

    setSaveTimers(prev => new Map(prev).set(patientId, newTimer));
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

  const handlePaste = useCallback((e: React.ClipboardEvent, patientId: number, startField: keyof RoundingData) => {
    e.preventDefault();
    const pasteData = e.clipboardData.getData('text');
    const rows = pasteData.split('\n');

    // Field order matching Google Sheets columns
    const fieldOrder: (keyof RoundingData)[] = [
      'signalment', 'location', 'icuCriteria', 'code', 'problems',
      'diagnosticFindings', 'therapeutics', 'ivc', 'fluids',
      'cri', 'overnightDx', 'concerns', 'comments'
    ];

    const startIndex = fieldOrder.indexOf(startField);
    if (startIndex === -1) return;

    // Parse first row (tab-separated values)
    const values = rows[0].split('\t');
    const updates: Partial<RoundingData> = {};

    values.forEach((value, index) => {
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
          updates[field] = trimmedValue;
        }
      }
    });

    setEditingData(prev => ({
      ...prev,
      [patientId]: {
        ...getPatientData(patientId),
        ...updates
      }
    }));

    const fieldCount = Object.keys(updates).length;
    const dropdownFields = ['location', 'icuCriteria', 'code', 'ivc', 'fluids', 'cri'];
    const pastedDropdowns = Object.keys(updates).filter(f => dropdownFields.includes(f)).length;

    toast({
      title: 'Pasted',
      description: `Pasted ${fieldCount} field${fieldCount > 1 ? 's' : ''}${pastedDropdowns > 0 ? ` (${pastedDropdowns} dropdown${pastedDropdowns > 1 ? 's' : ''} matched)` : ''}`
    });
  }, [toast]);

  const autoSave = useCallback(async (patientId: number) => {
    try {
      setIsSaving(true);
      setSaveStatus(prev => new Map(prev).set(patientId, 'saving'));

      const updates = editingData[patientId];
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

      // Clear editing data after successful save
      setEditingData(prev => {
        const newData = { ...prev };
        delete newData[patientId];
        return newData;
      });

      onPatientUpdate?.();
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
    } finally {
      setIsSaving(false);
    }
  }, [editingData, onPatientUpdate]);

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

      onPatientUpdate?.();
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

      onPatientUpdate?.();
      setEditingData({});
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

  return (
    <div className="space-y-4">
      {/* Header Actions */}
      <div className="flex items-center justify-between bg-slate-800 rounded-lg p-4 border border-slate-700">
        <div className="text-white">
          <h2 className="text-xl font-bold">Rounding Sheet</h2>
          <p className="text-sm text-slate-400">{activePatients.length} active patients</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={exportToTSV}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition flex items-center gap-2"
          >
            <Copy size={16} />
            Copy to Clipboard
          </button>
          <button
            onClick={handleSaveAll}
            disabled={isSaving || Object.keys(editingData).length === 0}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Save size={16} />
            Save All {Object.keys(editingData).length > 0 && `(${Object.keys(editingData).length})`}
          </button>
        </div>
      </div>

      {/* Rounding Sheet Table */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse bg-slate-800 rounded-lg overflow-hidden">
          <thead>
            <tr className="bg-slate-700 text-white text-xs">
              <th className="p-2 text-left border border-slate-600 sticky left-0 bg-slate-700 z-10 min-w-[120px]">Patient</th>
              <th className="p-2 text-left border border-slate-600 min-w-[150px]">Signalment</th>
              <th className="p-2 text-left border border-slate-600 min-w-[100px]">Location</th>
              <th className="p-2 text-left border border-slate-600 min-w-[100px]">ICU Criteria</th>
              <th className="p-2 text-left border border-slate-600 min-w-[100px]">Code Status</th>
              <th className="p-2 text-left border border-slate-600 min-w-[200px]">Problems</th>
              <th className="p-2 text-left border border-slate-600 min-w-[200px]">Diagnostic Findings</th>
              <th className="p-2 text-left border border-slate-600 min-w-[200px]">Therapeutics</th>
              <th className="p-2 text-left border border-slate-600 min-w-[80px]">IVC</th>
              <th className="p-2 text-left border border-slate-600 min-w-[100px]">Fluids</th>
              <th className="p-2 text-left border border-slate-600 min-w-[100px]">CRI</th>
              <th className="p-2 text-left border border-slate-600 min-w-[150px]">Overnight Dx</th>
              <th className="p-2 text-left border border-slate-600 min-w-[150px]">Concerns</th>
              <th className="p-2 text-left border border-slate-600 min-w-[200px]">Additional Comments</th>
              <th className="p-2 text-center border border-slate-600 sticky right-0 bg-slate-700 z-10 min-w-[80px]">Actions</th>
            </tr>
          </thead>
          <tbody>
            {activePatients.map(patient => {
              const data = getPatientData(patient.id);
              const hasChanges = editingData[patient.id] !== undefined;
              const carryForward = carryForwardResults[patient.id];

              console.log('[RoundingSheet] Rendering patient:', patient.id, patient.name, patient);

              // API returns demographics.name, not patient.name or patient_info.name
              const patientName = (patient as any)?.demographics?.name || patient.name || patient.patient_info?.name || `Patient ${patient.id}`;

              return (
                <tr key={patient.id} className={`border-b border-slate-700 ${hasChanges ? 'bg-emerald-900/20' : ''}`}>
                  <td className="p-2 border border-slate-600 sticky left-0 bg-slate-800 z-10">
                    <Link
                      href={`/?patient=${patient.id}`}
                      className="group flex flex-col gap-1 hover:text-emerald-400 transition"
                    >
                      <div className="flex items-center gap-2">
                        <div className="font-medium text-white group-hover:text-emerald-400">{patientName}</div>
                        <ExternalLink size={12} className="opacity-0 group-hover:opacity-100 text-emerald-400" />
                      </div>
                      <div className="text-xs text-slate-400">
                        {(patient as any)?.demographics?.age} {(patient as any)?.demographics?.breed}
                      </div>
                      {(carryForward?.carriedForward || (autoFilledFields[patient.id]?.size || 0) > 0) && (
                        <div className="flex items-center gap-1 text-xs text-blue-400">
                          <Sparkles size={10} />
                          {autoFilledFields[patient.id]?.size || 0} auto-filled
                          {data.dayCount && ` • Day ${data.dayCount}`}
                        </div>
                      )}
                    </Link>
                  </td>
                  <td className="p-1 border border-slate-600">
                    <div className="relative">
                      <input
                        type="text"
                        value={data.signalment || ''}
                        onChange={(e) => handleFieldChange(patient.id, 'signalment', e.target.value)}
                        onPaste={(e) => handlePaste(e, patient.id, 'signalment')}
                        className={`w-full px-2 py-1 border-none text-white text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 ${
                          autoFilledFields[patient.id]?.has('signalment')
                            ? 'bg-blue-900/30'
                            : 'bg-slate-900'
                        }`}
                        title={autoFilledFields[patient.id]?.has('signalment') ? 'Auto-filled from patient demographics - click to edit' : ''}
                      />
                      {autoFilledFields[patient.id]?.has('signalment') && (
                        <Sparkles size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-blue-400 pointer-events-none" />
                      )}
                    </div>
                  </td>
                  <td className="p-1 border border-slate-600">
                    <div className="relative">
                      <select
                        value={data.location || ''}
                        onChange={(e) => handleFieldChange(patient.id, 'location', e.target.value)}
                        onPaste={(e) => handlePaste(e, patient.id, 'location')}
                        className={`w-full px-2 py-1 border-none text-white text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 ${
                          autoFilledFields[patient.id]?.has('location')
                            ? 'bg-blue-900/30'
                            : 'bg-slate-900'
                        }`}
                        title={autoFilledFields[patient.id]?.has('location') ? 'Auto-filled from patient location - click to edit' : ''}
                      >
                        <option value=""></option>
                        <option value="IP">IP</option>
                        <option value="ICU">ICU</option>
                      </select>
                      {autoFilledFields[patient.id]?.has('location') && (
                        <RotateCcw size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-blue-400 pointer-events-none" />
                      )}
                    </div>
                  </td>
                  <td className="p-1 border border-slate-600">
                    <div className="relative">
                      <select
                        value={data.icuCriteria || ''}
                        onChange={(e) => handleFieldChange(patient.id, 'icuCriteria', e.target.value)}
                        onPaste={(e) => handlePaste(e, patient.id, 'icuCriteria')}
                        className={`w-full px-2 py-1 border-none text-white text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 ${
                          autoFilledFields[patient.id]?.has('icuCriteria')
                            ? 'bg-blue-900/30'
                            : 'bg-slate-900'
                        }`}
                        title={autoFilledFields[patient.id]?.has('icuCriteria') ? 'Auto-filled - click to edit' : ''}
                      >
                        <option value=""></option>
                        <option value="Yes">Yes</option>
                        <option value="No">No</option>
                        <option value="n/a">n/a</option>
                      </select>
                      {autoFilledFields[patient.id]?.has('icuCriteria') && (
                        <RotateCcw size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-blue-400 pointer-events-none" />
                      )}
                    </div>
                  </td>
                  <td className="p-1 border border-slate-600">
                    <div className="relative">
                      <select
                        value={data.code || ''}
                        onChange={(e) => handleFieldChange(patient.id, 'code', e.target.value)}
                        onPaste={(e) => handlePaste(e, patient.id, 'code')}
                        className={`w-full px-2 py-1 border-none text-white text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 ${
                          autoFilledFields[patient.id]?.has('code')
                            ? 'bg-blue-900/30'
                            : 'bg-slate-900'
                        }`}
                        title={autoFilledFields[patient.id]?.has('code') ? 'Auto-filled from code status - click to edit' : ''}
                      >
                        <option value="">Select...</option>
                        <option value="Green">Green</option>
                        <option value="Yellow">Yellow</option>
                        <option value="Orange">Orange</option>
                        <option value="Red">Red</option>
                      </select>
                      {autoFilledFields[patient.id]?.has('code') && (
                        <RotateCcw size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-blue-400 pointer-events-none" />
                      )}
                    </div>
                  </td>
                  <td className="p-1 border border-slate-600">
                    <div onPaste={(e) => handlePaste(e, patient.id, 'problems')}>
                      <AutoCompleteInput
                        field="problems"
                        value={data.problems || ''}
                        onChange={(value) => handleFieldChange(patient.id, 'problems', value)}
                        multiline={true}
                        rows={2}
                        className="w-full px-2 py-1 bg-slate-900 border-none text-white text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 resize-none"
                      />
                    </div>
                  </td>
                  <td className="p-1 border border-slate-600">
                    <div onPaste={(e) => handlePaste(e, patient.id, 'diagnosticFindings')}>
                      <AutoCompleteInput
                        field="diagnostics"
                        value={data.diagnosticFindings || ''}
                        onChange={(value) => handleFieldChange(patient.id, 'diagnosticFindings', value)}
                        multiline={true}
                        rows={2}
                        className="w-full px-2 py-1 bg-slate-900 border-none text-white text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 resize-none"
                      />
                    </div>
                  </td>
                  <td className="p-1 border border-slate-600">
                    <div onPaste={(e) => handlePaste(e, patient.id, 'therapeutics')}>
                      <AutoCompleteInput
                        field="therapeutics"
                        value={data.therapeutics || ''}
                        onChange={(value) => handleFieldChange(patient.id, 'therapeutics', value)}
                        multiline={true}
                        rows={2}
                        className="w-full px-2 py-1 bg-slate-900 border-none text-white text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 resize-none"
                      />
                    </div>
                  </td>
                  <td className="p-1 border border-slate-600">
                    <select
                      value={data.ivc || ''}
                      onChange={(e) => handleFieldChange(patient.id, 'ivc', e.target.value)}
                      onPaste={(e) => handlePaste(e, patient.id, 'ivc')}
                      className="w-full px-2 py-1 bg-slate-900 border-none text-white text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    >
                      <option value=""></option>
                      <option value="Yes">Yes</option>
                      <option value="No">No</option>
                    </select>
                  </td>
                  <td className="p-1 border border-slate-600">
                    <select
                      value={data.fluids || ''}
                      onChange={(e) => handleFieldChange(patient.id, 'fluids', e.target.value)}
                      onPaste={(e) => handlePaste(e, patient.id, 'fluids')}
                      className="w-full px-2 py-1 bg-slate-900 border-none text-white text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    >
                      <option value=""></option>
                      <option value="Yes">Yes</option>
                      <option value="No">No</option>
                      <option value="n/a">n/a</option>
                    </select>
                  </td>
                  <td className="p-1 border border-slate-600">
                    <select
                      value={data.cri || ''}
                      onChange={(e) => handleFieldChange(patient.id, 'cri', e.target.value)}
                      onPaste={(e) => handlePaste(e, patient.id, 'cri')}
                      className="w-full px-2 py-1 bg-slate-900 border-none text-white text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    >
                      <option value=""></option>
                      <option value="Yes">Yes</option>
                      <option value="No">No</option>
                      <option value="No but...">No but...</option>
                      <option value="Yet but...">Yet but...</option>
                    </select>
                  </td>
                  <td className="p-1 border border-slate-600">
                    <textarea
                      value={data.overnightDx || ''}
                      onChange={(e) => handleFieldChange(patient.id, 'overnightDx', e.target.value)}
                      onPaste={(e) => handlePaste(e, patient.id, 'overnightDx')}
                      rows={2}
                      className="w-full px-2 py-1 bg-slate-900 border-none text-white text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 resize-none"
                    />
                  </td>
                  <td className="p-1 border border-slate-600">
                    <div onPaste={(e) => handlePaste(e, patient.id, 'concerns')}>
                      <AutoCompleteInput
                        field="concerns"
                        value={data.concerns || ''}
                        onChange={(value) => handleFieldChange(patient.id, 'concerns', value)}
                        multiline={true}
                        rows={2}
                        placeholder={carryForward?.carriedForward ? "Enter today's concerns..." : ""}
                        className="w-full px-2 py-1 bg-slate-900 border-none text-white text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 resize-none"
                      />
                    </div>
                  </td>
                  <td className="p-1 border border-slate-600">
                    <textarea
                      value={data.comments || ''}
                      onChange={(e) => handleFieldChange(patient.id, 'comments', e.target.value)}
                      onPaste={(e) => handlePaste(e, patient.id, 'comments')}
                      rows={2}
                      className="w-full px-2 py-1 bg-slate-900 border-none text-white text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 resize-none"
                    />
                  </td>
                  <td className="p-2 border border-slate-600 text-center sticky right-0 bg-slate-800 z-10">
                    <div className="flex flex-col gap-1">
                      <button
                        onClick={() => copyPatientRow(patient.id)}
                        className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs transition flex items-center justify-center gap-1"
                        title="Copy this patient's row"
                      >
                        <Copy size={12} />
                        Copy
                      </button>
                      <button
                        onClick={() => handleSave(patient.id)}
                        disabled={!hasChanges || isSaving}
                        className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs transition disabled:opacity-50 disabled:cursor-not-allowed"
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
        <div className="text-center text-slate-400 py-8">
          No active patients to display
        </div>
      )}
    </div>
  );
}
