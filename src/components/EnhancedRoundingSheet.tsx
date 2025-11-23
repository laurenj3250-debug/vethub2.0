'use client';

import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { Copy, ChevronDown, FileSpreadsheet, FileText, Zap, CheckCircle2, AlertCircle, Sparkles, Plus, Edit2, Trash2, Save, X, Brain, ExternalLink, Droplet } from 'lucide-react';
// TEMPORARILY COMMENTED OUT TO DEBUG - import { THERAPEUTIC_SNIPPETS, DIAGNOSTIC_SNIPPETS, CONCERN_SNIPPETS, type NeuroProtocol } from '@/lib/neuro-protocols';
import type { NeuroProtocol } from '@/lib/neuro-protocols';
import { apiClient } from '@/lib/api-client';
import { analyzeBloodWorkLocal } from '@/lib/bloodwork';
import { analyzeRadiology, parseMedications } from '@/lib/ai-parser';

// Helper to render markdown-style bold text (**text** -> <strong>text</strong>)
const renderMarkdown = (text: string | null) => {
  if (!text) return null;

  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, idx) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={idx} className="font-bold text-emerald-300">{part.slice(2, -2)}</strong>;
    }
    return part;
  });
};

interface Patient {
  id: number;
  name: string;
  status: string;
  roundingData?: any;
  demographics?: any;
  // SOAP data fields
  soapData?: {
    neurolocalization?: string;
    ddx?: string;
    treatments?: string;
    medications?: string;
    diagnosticsToday?: string;
    progression?: string;
    currentHistory?: string;
  };
}

interface EnhancedRoundingSheetProps {
  patients: Patient[];
  commonMedications: any[];
  toast: (options: any) => void;
  onPatientClick: (id: number) => void;
  onPatientUpdate?: () => void;
}

export function EnhancedRoundingSheet({
  patients,
  commonMedications,
  toast,
  onPatientClick,
  onPatientUpdate
}: EnhancedRoundingSheetProps) {
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showProtocolSelector, setShowProtocolSelector] = useState<number | null>(null);
  const [selectedProtocol, setSelectedProtocol] = useState<string>('');
  const [showQuickFillMenu, setShowQuickFillMenu] = useState<number | null>(null);
  const [selectedPatients, setSelectedPatients] = useState<Set<number>>(new Set());
  const [showBatchPanel, setShowBatchPanel] = useState(false);
  const [batchField, setBatchField] = useState<string>('');
  const [batchValue, setBatchValue] = useState<string>('');
  const [autoPopulateMode, setAutoPopulateMode] = useState<'off' | 'suggest' | 'auto'>('suggest');

  // Snippet manager state
  const [showSnippetManager, setShowSnippetManager] = useState(false);
  const [customSnippets, setCustomSnippets] = useState<any>({
    therapeutics: [],
    diagnostics: [],
    concerns: [],
  });

  // Text expansion state
  const [showTextExpansionManager, setShowTextExpansionManager] = useState(false);
  const [textExpansions, setTextExpansions] = useState<Record<string, string>>({});

  // Load custom snippets from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('custom_snippets');
    if (stored) {
      try {
        setCustomSnippets(JSON.parse(stored));
      } catch (e) {
        console.error('Failed to load custom snippets', e);
      }
    }
  }, []);

  // Load text expansions from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('text_expansions');
    if (stored) {
      try {
        setTextExpansions(JSON.parse(stored));
      } catch (e) {
        console.error('Failed to load text expansions', e);
      }
    }
  }, []);

  // Save custom snippets to localStorage
  const saveCustomSnippets = useCallback((snippets: any) => {
    setCustomSnippets(snippets);
    localStorage.setItem('custom_snippets', JSON.stringify(snippets));
  }, []);

  // Save text expansions to localStorage
  const saveTextExpansions = useCallback((expansions: Record<string, string>) => {
    setTextExpansions(expansions);
    localStorage.setItem('text_expansions', JSON.stringify(expansions));
  }, []);

  // Custom templates management
  const [customTemplates, setCustomTemplates] = useState<NeuroProtocol[]>([]);
  const [showTemplateEditor, setShowTemplateEditor] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<NeuroProtocol | null>(null);
  const [templateForm, setTemplateForm] = useState<NeuroProtocol>({
    id: '',
    name: '',
    category: 'medical',
    tags: [],
    autoFill: {}
  });

  const fieldRefs = useRef<Map<string, HTMLInputElement | HTMLTextAreaElement>>(new Map());
  const debounceTimers = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // Local state for editing - prevents parent re-renders on every keystroke
  const [localEdits, setLocalEdits] = useState<Record<string, any>>({});

  // Load custom templates from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('custom_rounding_templates');
    if (stored) {
      try {
        setCustomTemplates(JSON.parse(stored));
      } catch (e) {
        console.error('Failed to load custom templates:', e);
      }
    }
  }, []);

  // Show Tab navigation hint once per session
  useEffect(() => {
    const hasSeenHint = sessionStorage.getItem('rounding-tab-hint-seen');
    if (!hasSeenHint) {
      setTimeout(() => {
        toast({
          title: 'Tip: Tab Navigation',
          description: 'Use Tab to move between fields. Press Space or Enter for text expansion shortcuts.',
          duration: 5000,
        });
        sessionStorage.setItem('rounding-tab-hint-seen', 'true');
      }, 1000);
    }
  }, [toast]);

  // Save custom templates to localStorage
  const saveCustomTemplates = useCallback((templates: NeuroProtocol[]) => {
    setCustomTemplates(templates);
    localStorage.setItem('custom_rounding_templates', JSON.stringify(templates));
  }, []);

  // Use only custom templates (removed built-in NEURO_PROTOCOLS)
  const allProtocols = customTemplates;

  // Create new template
  const createTemplate = useCallback(() => {
    const newId = `custom-${Date.now()}`;
    const newTemplate: NeuroProtocol = {
      ...templateForm,
      id: newId
    };
    saveCustomTemplates([...customTemplates, newTemplate]);
    setShowTemplateEditor(false);
    setTemplateForm({ id: '', name: '', category: 'medical', tags: [], autoFill: {} });
    toast({ title: '✅ Template created!' });
  }, [templateForm, customTemplates, saveCustomTemplates, toast]);

  // Update existing template
  const updateTemplate = useCallback(() => {
    if (!editingTemplate) return;
    const updated = customTemplates.map(t => t.id === editingTemplate.id ? templateForm : t);
    saveCustomTemplates(updated);
    setShowTemplateEditor(false);
    setEditingTemplate(null);
    setTemplateForm({ id: '', name: '', category: 'medical', tags: [], autoFill: {} });
    toast({ title: '✅ Template updated!' });
  }, [templateForm, editingTemplate, customTemplates, saveCustomTemplates, toast]);

  // Delete template
  const deleteTemplate = useCallback((id: string) => {
    if (!confirm('Delete this template?')) return;
    const filtered = customTemplates.filter(t => t.id !== id);
    saveCustomTemplates(filtered);
    toast({ title: '🗑️ Template deleted' });
  }, [customTemplates, saveCustomTemplates, toast]);

  // Open editor for editing
  const startEditTemplate = useCallback((template: NeuroProtocol) => {
    setEditingTemplate(template);
    setTemplateForm(template);
    setShowTemplateEditor(true);
  }, []);

  // Open editor for creating
  const startCreateTemplate = useCallback(() => {
    setEditingTemplate(null);
    setTemplateForm({ id: '', name: '', category: 'medical', tags: [], autoFill: {} });
    setShowTemplateEditor(true);
  }, []);

  // Auto-populate from SOAP data when patient is added or SOAP is updated
  const autoPopulateFromSOAP = useCallback((patient: Patient) => {
    if (!patient.soapData || autoPopulateMode === 'off') return {};

    const soap = patient.soapData;
    const autoFilled: any = {};

    // Map SOAP data to rounding fields
    if (soap.neurolocalization) {
      autoFilled.problems = soap.neurolocalization;
      if (soap.ddx) {
        autoFilled.problems += `\n${soap.ddx}`;
      }
    }

    if (soap.diagnosticsToday) {
      autoFilled.diagnosticFindings = soap.diagnosticsToday;
    }

    if (soap.treatments || soap.medications) {
      const meds = [soap.treatments, soap.medications].filter(Boolean).join('\n');
      autoFilled.therapeutics = meds;
    }

    if (soap.progression) {
      autoFilled.concerns = soap.progression;
    }

    return autoFilled;
  }, [autoPopulateMode]);

  // Quick-fill with protocol
  const applyProtocol = useCallback(async (patientId: number, protocolId: string) => {
    const protocol = allProtocols.find(p => p.id === protocolId);
    if (!protocol) return;

    const patient = patients.find(p => p.id === patientId);
    if (!patient) return;

    const currentRounding = patient.roundingData || {};
    const updatedRounding = {
      ...currentRounding,
      ...protocol.autoFill
    };

    try {
      await apiClient.updatePatient(String(patientId), { roundingData: updatedRounding });
      onPatientUpdate?.();
      toast({
        title: '⚡ Protocol Applied!',
        description: `${protocol.name} template loaded for ${patient.demographics?.name || patient.name || ''}`
      });
      setShowProtocolSelector(null);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Failed to apply protocol',
        description: 'Please try again'
      });
    }
  }, [patients, allProtocols, toast, onPatientUpdate]);

  // Smart auto-populate button
  const smartAutoPopulate = useCallback(async (patientId: number) => {
    const patient = patients.find(p => p.id === patientId);
    if (!patient || !patient.soapData) {
      toast({
        title: 'No SOAP data found',
        description: 'Complete a SOAP note first to enable auto-population'
      });
      return;
    }

    const autoFilled = autoPopulateFromSOAP(patient);
    const currentRounding = patient.roundingData || {};
    const updatedRounding = {
      ...currentRounding,
      ...autoFilled
    };

    try {
      await apiClient.updatePatient(String(patientId), { roundingData: updatedRounding });
      onPatientUpdate?.();
      toast({
        title: '✨ Auto-populated from SOAP!',
        description: `Filled ${Object.keys(autoFilled).length} fields for ${patient.demographics?.name || patient.name || ''}`
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Auto-populate failed'
      });
    }
  }, [patients, autoPopulateFromSOAP, toast, onPatientUpdate]);

  // Batch operations
  const applyBatchUpdate = useCallback(async () => {
    if (!batchField || !batchValue || selectedPatients.size === 0) return;

    const updates = Array.from(selectedPatients).map(async (patientId) => {
      const patient = patients.find(p => p.id === patientId);
      if (!patient) return;

      const currentRounding = patient.roundingData || {};
      const updatedRounding = {
        ...currentRounding,
        [batchField]: batchValue
      };

      return apiClient.updatePatient(String(patientId), { roundingData: updatedRounding });
    });

    try {
      await Promise.all(updates);
      onPatientUpdate?.();
      toast({
        title: '✅ Batch update complete!',
        description: `Updated ${selectedPatients.size} patients`
      });
      setSelectedPatients(new Set());
      setShowBatchPanel(false);
      setBatchField('');
      setBatchValue('');
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Batch update failed'
      });
    }
  }, [batchField, batchValue, selectedPatients, patients, toast, onPatientUpdate]);

  // Copy individual row
  const copyRoundingSheetLine = useCallback(async (patientId: number) => {
    const patient = patients.find(p => p.id === patientId);
    if (!patient) return;

    try {
      const rounding = patient.roundingData || {};

      // Clean function to remove tabs and newlines from field values
      const cleanField = (value: string | null | undefined) => {
        if (!value) return '';
        // Replace tabs with spaces, replace newlines with spaces to prevent cell splitting
        return String(value).replace(/\t/g, ' ').replace(/\n/g, ' ');
      };

      const line = [
        cleanField(patient.demographics?.name || patient.name || ''),
        cleanField(rounding.signalment),
        cleanField(rounding.location),
        cleanField(rounding.icuCriteria),
        cleanField(rounding.code),
        cleanField(rounding.problems),
        cleanField(rounding.diagnosticFindings),
        cleanField(rounding.therapeutics),
        cleanField(rounding.ivc),
        cleanField(rounding.fluids),
        cleanField(rounding.cri),
        cleanField(rounding.overnightDx),
        cleanField(rounding.concerns),
        cleanField(rounding.comments)
      ].join('\t');

      navigator.clipboard.writeText(line);

      toast({
        title: '✅ Line Copied!',
        description: `${patient.demographics?.name || patient.name || ''}'s rounding sheet line copied to clipboard`
      });
    } catch (error) {
      console.error('Copy line error:', error);
      toast({ variant: 'destructive', title: 'Copy failed', description: 'Could not copy line' });
    }
  }, [patients, toast]);

  // Toggle patient selection for batch operations
  const togglePatientSelection = useCallback((patientId: number, checked: boolean) => {
    setSelectedPatients(prev => {
      const newSelected = new Set(prev);
      if (checked) {
        newSelected.add(patientId);
      } else {
        newSelected.delete(patientId);
      }
      return newSelected;
    });
  }, []);

  // Export handlers
  const handleExportRoundingSheets = useCallback((format: string) => {
    const activePatients = patients.filter(p => p.status !== 'Discharged');

    // Clean function to remove tabs, newlines, and commas from field values
    const cleanField = (value: string | null | undefined, separator: string) => {
      if (!value) return '';
      let cleaned = String(value);
      // Replace separator character with space to prevent cell splitting
      if (separator === ',') {
        cleaned = cleaned.replace(/,/g, ' ');
      }
      // Always replace tabs and newlines with spaces
      return cleaned.replace(/\t/g, ' ').replace(/\n/g, ' ');
    };

    const headers = [
      'Name', 'Signalment', 'Location', 'ICU', 'Code', 'Problems',
      'Diagnostics', 'Therapeutics', 'IVC', 'Fluids', 'CRI',
      'O/N Dx', 'Concerns', 'Comments'
    ];

    const separator = format.includes('csv') ? ',' : '\t';

    const rows = activePatients.map(patient => {
      const r = patient.roundingData || {};
      return [
        cleanField(patient.demographics?.name || patient.name || '', separator),
        cleanField(r.signalment, separator),
        cleanField(r.location, separator),
        cleanField(r.icuCriteria, separator),
        cleanField(r.code, separator),
        cleanField(r.problems, separator),
        cleanField(r.diagnosticFindings, separator),
        cleanField(r.therapeutics, separator),
        cleanField(r.ivc, separator),
        cleanField(r.fluids, separator),
        cleanField(r.cri, separator),
        cleanField(r.overnightDx, separator),
        cleanField(r.concerns, separator),
        cleanField(r.comments, separator)
      ];
    });

    const includeHeaders = !format.includes('no-header');

    let output = '';
    if (includeHeaders) {
      output = headers.join(separator) + '\n';
    }
    output += rows.map(row => row.join(separator)).join('\n');

    navigator.clipboard.writeText(output);
    toast({
      title: '📋 Exported!',
      description: `${activePatients.length} patients copied to clipboard`
    });
    setShowExportMenu(false);
  }, [patients, toast]);

  /**
   * Keyboard shortcuts:
   * - Space/Enter: Trigger text expansion for shortcuts (e.g., "q4t" → "Q4h turns, padded bedding")
   * - Tab: Natural cell navigation (browser default)
   * - Shift+Tab: Reverse navigation (browser default)
   * - Ctrl+Enter: Copy patient row to clipboard
   * - Ctrl+P: Open protocol quick-fill menu
   * - Ctrl+D: Duplicate current field to all selected patients
   */
  const handleKeyDown = useCallback((e: React.KeyboardEvent, patientId: number, field: string) => {
    const target = e.currentTarget as HTMLTextAreaElement | HTMLInputElement;
    const currentValue = target.value;

    // Text expansion (Space and Enter only - NOT Tab)
    if (e.key === ' ' || e.key === 'Enter') {
      const expandedValue = handleTextExpansion(patientId, field, currentValue, e);

      if (expandedValue !== currentValue) {
        e.preventDefault();
        target.value = expandedValue;
        updateFieldDebounced(patientId, field, expandedValue);

        // For Space and Enter, add the trigger character back
        if (e.key === ' ' || e.key === 'Enter') {
          setTimeout(() => {
            target.value = expandedValue + (e.key === ' ' ? ' ' : '\n');
            updateFieldDebounced(patientId, field, target.value);
            // Move cursor to end
            target.selectionStart = target.selectionEnd = target.value.length;
          }, 0);
        }
        return;
      }
    }

    // Tab key now handles natural navigation (no preventDefault)
    if (e.key === 'Tab') {
      // Let browser handle Tab navigation naturally
      return;
    }

    // Ctrl+Enter to copy row
    if (e.ctrlKey && e.key === 'Enter') {
      e.preventDefault();
      copyRoundingSheetLine(patientId);
    }

    // Ctrl+P for protocol menu
    if (e.ctrlKey && e.key === 'p') {
      e.preventDefault();
      setShowProtocolSelector(showProtocolSelector === patientId ? null : patientId);
    }

    // Ctrl+D to duplicate value down to selected patients
    if (e.ctrlKey && e.key === 'd') {
      e.preventDefault();
      if (selectedPatients.size === 0) {
        toast({ title: 'No patients selected', description: 'Select patients using checkboxes to duplicate field value' });
        return;
      }

      const target = e.currentTarget as HTMLTextAreaElement | HTMLInputElement;
      const value = target.value;

      if (!value) {
        toast({ variant: 'destructive', title: 'Field is empty', description: 'Cannot duplicate empty value' });
        return;
      }

      // Apply value to all selected patients
      selectedPatients.forEach((selectedId) => {
        if (selectedId !== patientId) { // Don't update the source patient
          updateFieldDebounced(selectedId, field, value);
        }
      });

      toast({
        title: '⚡ Duplicated!',
        description: `Applied "${value.substring(0, 30)}${value.length > 30 ? '...' : ''}" to ${selectedPatients.size} patients`,
      });
    }
  }, [showProtocolSelector, copyRoundingSheetLine, textExpansions, handleTextExpansion, updateFieldDebounced, selectedPatients, toast]);

  // Field order for paste operations - only textarea fields that support multi-cell paste
  // Full column order matching the spreadsheet layout (includes select fields)
  // This is the order columns appear in the UI: Problems → Diagnostics → Therapeutics → IVC → Fluids → CRI → O/N Dx → Concerns → Comments
  const ALL_FIELD_ORDER = [
    'problems', 'diagnosticFindings', 'therapeutics',
    'ivc', 'fluids', 'cri',
    'overnightDx', 'concerns', 'comments'
  ];

  // Select fields that only accept specific values
  const SELECT_FIELDS = new Set(['ivc', 'fluids', 'cri']);

  // Valid options for select fields (for smart paste matching)
  const SELECT_OPTIONS: Record<string, string[]> = {
    ivc: ['Y', 'N', 'Yes but...', 'Not but...'],
    fluids: ['Y', 'N', 'Yes but...', 'Not but...'],
    cri: ['Y', 'N', 'Yes but...', 'Not but...'],
  };

  // Map common variations to valid select values
  const matchSelectValue = (field: string, value: string): string | null => {
    const options = SELECT_OPTIONS[field];
    if (!options) return null;

    const normalized = value.toLowerCase().trim();

    // Exact match (case-insensitive)
    const exactMatch = options.find(opt => opt.toLowerCase() === normalized);
    if (exactMatch) return exactMatch;

    // Common variations
    if (normalized === 'yes' || normalized === 'y' || normalized === 'true' || normalized === '1') return 'Y';
    if (normalized === 'no' || normalized === 'n' || normalized === 'false' || normalized === '0') return 'N';

    return null; // No match found
  };

  // Update field with API call
  const updateField = useCallback(async (patientId: number, field: string, value: any) => {
    const patient = patients.find(p => p.id === patientId);
    if (!patient) return;

    const updatedRounding = {
      ...(patient.roundingData || {}),
      [field]: value
    };

    // Update local edit state first for immediate UI response (no parent re-render)
    const editKey = `${patientId}-${field}`;
    setLocalEdits(prev => ({ ...prev, [editKey]: value }));

    // Then sync to backend and update parent asynchronously
    try {
      await apiClient.updatePatient(String(patientId), { roundingData: updatedRounding });

      // Only update parent after successful save
      if (onPatientUpdate) {
        const updatedPatients = patients.map(p =>
          p.id === patientId
            ? { ...p, roundingData: updatedRounding }
            : p
        );
        onPatientUpdate(updatedPatients);
      }

      // Clear local edit after parent update
      setLocalEdits(prev => {
        const newEdits = { ...prev };
        delete newEdits[editKey];
        return newEdits;
      });
    } catch (error) {
      console.error('Update failed:', error);
      toast({
        title: 'Update failed',
        description: 'Could not save changes',
        variant: 'destructive'
      });
    }
  }, [patients, onPatientUpdate, toast]);

  // Magic paste: analyze bloodwork from clipboard and extract abnormals
  const handleMagicPaste = useCallback(async (patientId: number) => {
    try {
      const text = await navigator.clipboard.readText();
      if (!text.trim()) {
        toast({
          title: 'Clipboard empty',
          description: 'Copy bloodwork data first, then click 🩸',
        });
        return;
      }

      toast({ title: '🔬 Analyzing bloodwork...', description: 'Extracting abnormal values' });

      const result = analyzeBloodWorkLocal({ bloodWorkText: text });

      if (result.abnormalValues.length === 0) {
        toast({ title: 'No abnormals found', description: 'All values within normal range or format not recognized' });
        return;
      }

      // Format as "value1, value2, ..."
      const abnormalString = result.abnormalValues.join(', ');

      // Get current diagnostics and append
      const patient = patients.find(p => p.id === patientId);
      const currentDx = patient?.roundingData?.diagnosticFindings || '';
      const newDx = currentDx ? `${currentDx}\n${abnormalString}` : abnormalString;

      await updateField(patientId, 'diagnosticFindings', newDx);

      toast({
        title: '✅ Bloodwork analyzed!',
        description: `Found ${result.abnormalValues.length} abnormal values`,
      });
    } catch (error) {
      console.error('Magic paste failed:', error);
      toast({
        title: 'Paste failed',
        description: 'Could not read clipboard. Try Ctrl+V in the field instead.',
        variant: 'destructive',
      });
    }
  }, [patients, updateField, toast]);

  // Magic paste: analyze radiology/imaging from clipboard
  const handleMagicPasteRadiology = useCallback(async (patientId: number) => {
    try {
      const text = await navigator.clipboard.readText();
      if (!text.trim()) {
        toast({ title: 'Clipboard empty', description: 'Copy radiology report first, then click 📷' });
        return;
      }

      toast({ title: '📷 Summarizing imaging...', description: 'Extracting key findings' });

      const summary = await analyzeRadiology(text);

      if (!summary) {
        toast({ title: 'Could not parse', description: 'No findings extracted - pasting raw text' });
        // Fall back to raw text
        const patient = patients.find(p => p.id === patientId);
        const currentDx = patient?.roundingData?.diagnosticFindings || '';
        const newDx = currentDx ? `${currentDx}\nCXR/MRI: ${text.slice(0, 200)}...` : `CXR/MRI: ${text.slice(0, 200)}`;
        await updateField(patientId, 'diagnosticFindings', newDx);
        return;
      }

      const patient = patients.find(p => p.id === patientId);
      const currentDx = patient?.roundingData?.diagnosticFindings || '';
      const newDx = currentDx ? `${currentDx}\n${summary}` : summary;

      await updateField(patientId, 'diagnosticFindings', newDx);
      toast({ title: '✅ Imaging summarized!', description: summary.slice(0, 60) + '...' });
    } catch (error) {
      console.error('Radiology paste failed:', error);
      toast({ title: 'Paste failed', description: 'Could not read clipboard', variant: 'destructive' });
    }
  }, [patients, updateField, toast]);

  // Magic paste: format medications from clipboard
  const handleMagicPasteMeds = useCallback(async (patientId: number) => {
    try {
      const text = await navigator.clipboard.readText();
      if (!text.trim()) {
        toast({ title: 'Clipboard empty', description: 'Copy medication list first, then click 💊' });
        return;
      }

      const formatted = await parseMedications(text);

      if (!formatted) {
        toast({ title: 'Could not parse', description: 'Pasting raw text instead' });
        const patient = patients.find(p => p.id === patientId);
        const currentMeds = patient?.roundingData?.therapeutics || '';
        const newMeds = currentMeds ? `${currentMeds}\n${text}` : text;
        await updateField(patientId, 'therapeutics', newMeds);
        return;
      }

      const patient = patients.find(p => p.id === patientId);
      const currentMeds = patient?.roundingData?.therapeutics || '';
      const newMeds = currentMeds ? `${currentMeds}\n${formatted}` : formatted;

      await updateField(patientId, 'therapeutics', newMeds);

      const medCount = formatted.split('\n').length;
      toast({ title: '✅ Medications formatted!', description: `${medCount} medications added` });
    } catch (error) {
      console.error('Meds paste failed:', error);
      toast({ title: 'Paste failed', description: 'Could not read clipboard', variant: 'destructive' });
    }
  }, [patients, updateField, toast]);

  // Handle paste from spreadsheet (tab-separated values)
  const handlePaste = useCallback((e: React.ClipboardEvent, patientId: number, currentField: string) => {
    const pastedText = e.clipboardData.getData('text');

    // Only handle if pasting into a supported field
    const currentFieldIndex = ALL_FIELD_ORDER.indexOf(currentField);
    if (currentFieldIndex === -1) {
      return; // Let default paste happen for fields not in our list
    }

    // Check if pasted content contains tabs (multi-cell paste from spreadsheet)
    if (pastedText.includes('\t')) {
      e.preventDefault();

      // Handle first row only (ignore multi-row pastes for now)
      const firstRow = pastedText.split('\n')[0];
      const values = firstRow.split('\t');

      // Track updates and skipped values
      const updates: { field: string; value: string }[] = [];
      const skipped: { field: string; value: string; reason: string }[] = [];

      // Field display names for user-friendly messages
      const fieldNames: Record<string, string> = {
        problems: 'Problems',
        diagnosticFindings: 'Diagnostics',
        therapeutics: 'Therapeutics',
        ivc: 'IVC',
        fluids: 'Fluids',
        cri: 'CRI',
        overnightDx: 'O/N Dx',
        concerns: 'Concerns',
        comments: 'Comments',
      };

      for (let i = 0; i < values.length; i++) {
        const targetFieldIndex = currentFieldIndex + i;
        if (targetFieldIndex < ALL_FIELD_ORDER.length) {
          const targetField = ALL_FIELD_ORDER[targetFieldIndex];
          const value = values[i].trim();

          // Handle select fields with smart matching
          if (SELECT_FIELDS.has(targetField)) {
            if (!value) continue; // Skip empty values for select fields

            const matchedValue = matchSelectValue(targetField, value);
            if (matchedValue) {
              updates.push({ field: targetField, value: matchedValue });
            } else {
              skipped.push({
                field: targetField,
                value,
                reason: `"${value}" not valid (use Y/N)`,
              });
            }
            continue;
          }

          // Include even empty values for textarea fields to maintain alignment
          updates.push({ field: targetField, value });
        }
      }

      // Apply all updates
      updates.forEach(({ field, value }) => {
        updateField(patientId, field, value);
      });

      // Show detailed feedback
      if (updates.length > 0 || skipped.length > 0) {
        const appliedCount = updates.length;
        const skippedCount = skipped.length;

        let description = `Applied ${appliedCount} value${appliedCount !== 1 ? 's' : ''}`;
        if (skippedCount > 0) {
          const skippedDetails = skipped
            .map(s => `${fieldNames[s.field]}: ${s.reason}`)
            .join(', ');
          description += ` | Skipped ${skippedCount}: ${skippedDetails}`;
        }

        toast({
          title: skippedCount > 0 ? '📋 Pasted (some skipped)' : '📋 Pasted across columns',
          description,
          variant: skippedCount > 0 ? 'default' : undefined,
        });
      }
    }
    // If no tabs, let default paste behavior happen
  }, [updateField, toast]);

  // Handle text expansion
  const handleTextExpansion = useCallback((patientId: number, field: string, value: string, event?: React.KeyboardEvent) => {
    // Only trigger on space, tab, or enter
    if (event && !['Space', 'Tab', 'Enter'].includes(event.code)) {
      return value;
    }

    const trimmedValue = value.trim();
    const words = trimmedValue.split(/\s+/);

    // ENHANCEMENT: Check for multi-word phrases (up to 5 words)
    // Try longest phrases first, then shorter ones
    for (let phraseLength = Math.min(5, words.length); phraseLength >= 1; phraseLength--) {
      const phrase = words.slice(-phraseLength).join(' ').toLowerCase();

      // Check if this phrase matches any text expansion (case-insensitive)
      const matchingKey = Object.keys(textExpansions).find(
        key => key.toLowerCase() === phrase
      );

      if (matchingKey) {
        // Found a match! Replace the phrase with the expansion
        const beforePhrase = words.slice(0, -phraseLength).join(' ');
        const expandedValue = beforePhrase
          ? `${beforePhrase} ${textExpansions[matchingKey]}`
          : textExpansions[matchingKey];

        // Show toast with phrase that was expanded
        toast({
          title: `✨ Expanded: "${matchingKey}"`,
          description: textExpansions[matchingKey].substring(0, 50) + (textExpansions[matchingKey].length > 50 ? '...' : ''),
          duration: 2000
        });

        return expandedValue;
      }
    }

    // No match found
    return value;
  }, [textExpansions, toast]);

  // Debounced update for text inputs (waits 150ms after typing stops)
  const updateFieldDebounced = useCallback((patientId: number, field: string, value: any) => {
    const patient = patients.find(p => p.id === patientId);
    if (!patient) return;

    // Update local state immediately for instant typing (NO parent re-render)
    const editKey = `${patientId}-${field}`;
    setLocalEdits(prev => ({ ...prev, [editKey]: value }));

    // Clear existing timer for this field
    const timerKey = editKey;
    const existingTimer = debounceTimers.current.get(timerKey);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Set new timer - save to API and update parent after 150ms of no typing
    const newTimer = setTimeout(async () => {
      const updatedRounding = {
        ...(patient.roundingData || {}),
        [field]: value
      };

      try {
        // Save to API
        await apiClient.updatePatient(String(patientId), { roundingData: updatedRounding });

        // Only now update parent (after typing stopped and saved)
        if (onPatientUpdate) {
          const updatedPatients = patients.map(p =>
            p.id === patientId
              ? { ...p, roundingData: updatedRounding }
              : p
          );
          onPatientUpdate(updatedPatients);
        }

        // Clear local edit
        setLocalEdits(prev => {
          const newEdits = { ...prev };
          delete newEdits[editKey];
          return newEdits;
        });
      } catch (error) {
        console.error('Debounced update failed:', error);
      }
      debounceTimers.current.delete(timerKey);
    }, 150); // Reduced from 500ms for faster typing feel

    debounceTimers.current.set(timerKey, newTimer);
  }, [patients, onPatientUpdate]);

  // Helper to get field value (local edit takes priority)
  const getFieldValue = (patientId: number, field: string, defaultValue: any = '') => {
    const editKey = `${patientId}-${field}`;
    if (editKey in localEdits) {
      return localEdits[editKey];
    }
    const patient = patients.find(p => p.id === patientId);
    return patient?.roundingData?.[field] ?? defaultValue;
  };

  // Memoize activePatients to prevent filtering on every render
  const activePatients = useMemo(
    () => patients.filter(p => p.status !== 'Discharged'),
    [patients]
  );

  return (
    <div className="bg-slate-900/20 backdrop-blur-xl rounded-3xl shadow-2xl border border-slate-700/30 p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <FileSpreadsheet className="text-emerald-400" />
            All Rounding Sheets
          </h2>

          {/* Auto-populate mode toggle */}
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-400">Auto-fill from SOAP:</span>
            <select
              value={autoPopulateMode}
              onChange={(e) => setAutoPopulateMode(e.target.value as any)}
              className="bg-black/40 backdrop-blur-sm border border-slate-600 rounded px-2 py-1 text-white text-xs"
            >
              <option value="off">Off</option>
              <option value="suggest">Suggest</option>
              <option value="auto">Auto</option>
            </select>
          </div>
        </div>

        <div className="flex gap-2">
          {/* Batch operations toggle */}
          <button
            onClick={() => setShowBatchPanel(!showBatchPanel)}
            className={`px-3 py-2 rounded-lg font-bold text-sm flex items-center gap-2 transition-all ${
              showBatchPanel
                ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
                : 'bg-slate-700/50 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            Batch ({selectedPatients.size})
          </button>

          {/* Manage Text Expansions button */}
          <button
            onClick={() => setShowTextExpansionManager(true)}
            className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white rounded-lg font-bold hover:scale-105 transition-all text-sm flex items-center gap-2 shadow-lg"
          >
            <Zap className="w-4 h-4" />
            Text Shortcuts
          </button>

          {/* Manage Snippets button */}
          <button
            onClick={() => setShowSnippetManager(true)}
            className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-400 hover:to-pink-400 text-white rounded-lg font-bold hover:scale-105 transition-all text-sm flex items-center gap-2 shadow-lg"
          >
            <Edit2 className="w-4 h-4" />
            Manage Snippets
          </button>

          {/* Export menu */}
          <div className="relative">
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white rounded-lg font-bold hover:scale-105 transition-all text-sm flex items-center gap-2 shadow-lg"
            >
              📋 Export
              <ChevronDown className={`w-4 h-4 transition-transform ${showExportMenu ? 'rotate-180' : ''}`} />
            </button>
            {showExportMenu && (
              <div className="absolute right-0 mt-2 bg-slate-800 border border-slate-600 rounded-lg shadow-2xl p-2 min-w-[240px] z-50">
                <div className="text-xs text-slate-400 font-bold mb-2 px-2">Export Format:</div>
                {[
                  { format: 'tsv', label: 'TSV with Headers', desc: 'Tab-separated (hospital EMR)', icon: FileSpreadsheet, color: 'emerald' },
                  { format: 'csv', label: 'CSV with Headers', desc: 'For Google Sheets/Excel', icon: FileSpreadsheet, color: 'cyan' },
                  { format: 'tsv-no-header', label: 'TSV without Headers', desc: 'Data only (tab-separated)', icon: FileText, color: 'purple' },
                  { format: 'csv-no-header', label: 'CSV without Headers', desc: 'Data only (comma-separated)', icon: FileText, color: 'orange' },
                ].map(({ format, label, desc, icon: Icon, color }) => (
                  <button
                    key={format}
                    onClick={() => handleExportRoundingSheets(format)}
                    className={`w-full text-left px-3 py-2 text-sm text-white hover:bg-gradient-to-r hover:from-${color}-500/20 hover:to-${color}-500/20 rounded transition-all flex items-center gap-2`}
                  >
                    <Icon className={`w-4 h-4 text-${color}-400`} />
                    <div>
                      <div className="font-bold">{label}</div>
                      <div className="text-xs text-slate-400">{desc}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Batch operations panel */}
      {showBatchPanel && (
        <div className="mb-4 p-4 bg-purple-500/10 border border-purple-500/30 rounded-lg">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <label className="text-xs text-purple-300 font-bold mb-1 block">Apply to selected patients:</label>
              <div className="flex gap-2">
                <select
                  value={batchField}
                  onChange={(e) => setBatchField(e.target.value)}
                  className="bg-black/40 backdrop-blur-sm border border-purple-500 rounded px-2 py-1.5 text-white text-xs flex-1"
                >
                  <option value="">Select field...</option>
                  <optgroup label="Clinical Fields">
                    <option value="problems">Problems</option>
                    <option value="diagnosticFindings">Diagnostic Findings</option>
                    <option value="therapeutics">Therapeutics</option>
                  </optgroup>
                  <optgroup label="Other Fields">
                    <option value="overnightDx">Overnight Dx</option>
                    <option value="concerns">Concerns</option>
                    <option value="code">Code Status</option>
                    <option value="fluids">Fluids</option>
                    <option value="ivc">IVC</option>
                    <option value="cri">CRI</option>
                    <option value="comments">Comments</option>
                  </optgroup>
                </select>

                {['problems', 'diagnosticFindings', 'therapeutics'].includes(batchField) ? (
                  <textarea
                    value={batchValue}
                    onChange={(e) => setBatchValue(e.target.value)}
                    placeholder="Value to apply (multiple lines supported)..."
                    rows={3}
                    className="bg-black/40 backdrop-blur-sm border border-purple-500 rounded px-2 py-1.5 text-white text-xs flex-1 resize-none"
                  />
                ) : (
                  <input
                    type="text"
                    value={batchValue}
                    onChange={(e) => setBatchValue(e.target.value)}
                    placeholder="Value to apply..."
                    className="bg-black/40 backdrop-blur-sm border border-purple-500 rounded px-2 py-1.5 text-white text-xs flex-1"
                  />
                )}

                <button
                  onClick={applyBatchUpdate}
                  disabled={!batchField || !batchValue || selectedPatients.size === 0}
                  className="px-4 py-1.5 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-400 hover:to-pink-400 text-white rounded font-bold text-xs transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Apply to {selectedPatients.size} patients
                </button>
              </div>
            </div>

            <button
              onClick={() => {
                setSelectedPatients(new Set());
                setShowBatchPanel(false);
              }}
              className="text-xs text-slate-400 hover:text-white"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto max-h-[85vh] overflow-y-auto">
        <table className="w-full text-xs border-collapse">
          <thead className="sticky top-0 bg-slate-900 z-10 shadow-lg">
            <tr className="border-b-2 border-emerald-500">
              <th className="text-left p-2 text-white font-bold bg-slate-900/95 backdrop-blur-sm sticky left-0 z-20 shadow-[2px_0_4px_rgba(0,0,0,0.3)]">
                <div className="flex items-center gap-1">
                  <Copy className="w-3 h-3 text-emerald-400" />
                  <span className="text-emerald-400">Actions</span>
                </div>
              </th>
              <th className="text-left p-2 text-emerald-400 font-bold bg-slate-900/95 backdrop-blur-sm">Name</th>
              <th className="text-left p-2 text-cyan-400 font-bold bg-slate-900/95 backdrop-blur-sm">Signalment</th>
              <th className="text-left p-2 text-emerald-400 font-bold bg-slate-900/95 backdrop-blur-sm">Location</th>
              <th className="text-left p-2 text-pink-400 font-bold bg-slate-900/95 backdrop-blur-sm">ICU</th>
              <th className="text-left p-2 text-yellow-400 font-bold bg-slate-900/95 backdrop-blur-sm">Code</th>
              <th className="text-left p-2 text-red-400 font-bold bg-slate-900/95 backdrop-blur-sm">Problems</th>
              <th className="text-left p-2 text-emerald-400 font-bold bg-slate-900/95 backdrop-blur-sm">Diagnostics</th>
              <th className="text-left p-2 text-green-400 font-bold bg-slate-900/95 backdrop-blur-sm">Therapeutics</th>
              <th className="text-left p-2 text-orange-400 font-bold bg-slate-900/95 backdrop-blur-sm">IVC</th>
              <th className="text-left p-2 text-teal-400 font-bold bg-slate-900/95 backdrop-blur-sm">Fluids</th>
              <th className="text-left p-2 text-indigo-400 font-bold bg-slate-900/95 backdrop-blur-sm">CRI</th>
              <th className="text-left p-2 text-violet-400 font-bold bg-slate-900/95 backdrop-blur-sm">O/N Dx</th>
              <th className="text-left p-2 text-rose-400 font-bold bg-slate-900/95 backdrop-blur-sm">Concerns</th>
              <th className="text-left p-2 text-amber-400 font-bold bg-slate-900/95 backdrop-blur-sm">Comments</th>
            </tr>
          </thead>
          <tbody>
            {activePatients.map((patient, idx) => {
              const rounding = patient.roundingData || {};
              const hasSOAPData = patient.soapData && Object.keys(patient.soapData).length > 0;
              const isSelected = selectedPatients.has(patient.id);

              return (
                <tr
                  key={patient.id}
                  className={`border-b border-slate-700/50 hover:bg-gradient-to-r hover:from-emerald-500/10 hover:to-cyan-500/10 transition-all ${
                    idx % 2 === 0 ? 'bg-slate-900/40' : 'bg-slate-800/40'
                  } ${isSelected ? 'ring-2 ring-purple-500/50' : ''}`}
                >
                  {/* Actions column */}
                  <td className={`p-2 sticky left-0 bg-slate-900/95 backdrop-blur-sm shadow-[2px_0_4px_rgba(0,0,0,0.3)] ${showQuickFillMenu === patient.id ? 'z-[10000]' : 'z-10'}`}>
                    <div className="flex flex-col gap-1">
                      {/* Select checkbox */}
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => togglePatientSelection(patient.id, e.target.checked)}
                        className="w-4 h-4 rounded border-slate-600 text-purple-500 focus:ring-purple-500"
                      />

                      {/* Quick fill menu */}
                      <div className="relative">
                        <button
                          onClick={() => setShowQuickFillMenu(showQuickFillMenu === patient.id ? null : patient.id)}
                          className="px-2 py-1 bg-gradient-to-r from-violet-500 to-purple-500 hover:from-violet-400 hover:to-purple-400 text-white rounded font-bold text-xs transition-all hover:scale-105 flex items-center gap-1 shadow-lg w-full"
                          title="Quick fill templates (Ctrl+P)"
                        >
                          <Zap className="w-3 h-3" />
                          Quick
                        </button>

                        {showQuickFillMenu === patient.id && (
                          <div className="absolute left-0 top-full mt-1 bg-slate-800 border border-slate-600 rounded-lg shadow-2xl p-2 min-w-[280px] max-h-[400px] overflow-y-auto z-[9999]">
                            <div className="text-xs text-slate-300 font-bold mb-2 border-b border-slate-700 pb-2">
                              Quick Fill Templates:
                            </div>

                            {/* Auto-populate from SOAP */}
                            {hasSOAPData && (
                              <>
                                <button
                                  onClick={() => {
                                    smartAutoPopulate(patient.id);
                                    setShowQuickFillMenu(null);
                                  }}
                                  className="w-full text-left px-2 py-2 text-xs text-white hover:bg-gradient-to-r hover:from-cyan-500/20 hover:to-blue-500/20 rounded mb-2 flex items-center gap-2 border border-cyan-500/30"
                                >
                                  <Sparkles className="w-4 h-4 text-cyan-400" />
                                  <div>
                                    <div className="font-bold text-cyan-400">Auto-fill from SOAP Note</div>
                                    <div className="text-xs text-slate-400">Populate from existing SOAP data</div>
                                  </div>
                                </button>
                                <div className="border-b border-slate-700 mb-2"></div>
                              </>
                            )}

                            {/* Manage Templates Button */}
                            <button
                              onClick={() => {
                                startCreateTemplate();
                                setShowQuickFillMenu(null);
                              }}
                              className="w-full text-left px-2 py-2 text-xs text-emerald-400 hover:bg-emerald-500/10 rounded mb-2 flex items-center gap-2 border border-emerald-500/30"
                            >
                              <Plus className="w-4 h-4" />
                              <span className="font-bold">Create Custom Template</span>
                            </button>

                            {/* Custom Templates */}
                            {customTemplates.length > 0 && (
                              <>
                                <div className="border-b border-slate-700 mb-2"></div>
                                <div className="mb-3">
                                  <div className="text-xs text-emerald-400 font-bold mb-1 uppercase tracking-wide">
                                    My Templates
                                  </div>
                                  {customTemplates.map(protocol => (
                                    <div key={protocol.id} className="group flex items-center gap-1 mb-1">
                                      <button
                                        onClick={() => {
                                          applyProtocol(patient.id, protocol.id);
                                          setShowQuickFillMenu(null);
                                        }}
                                        className="flex-1 text-left px-2 py-1.5 text-xs text-white hover:bg-slate-700 rounded"
                                      >
                                        <div className="font-medium flex items-center gap-1">
                                          <Sparkles className="w-3 h-3 text-emerald-400" />
                                          {protocol.name}
                                        </div>
                                      </button>
                                      <button
                                        onClick={() => {
                                          startEditTemplate(protocol);
                                          setShowQuickFillMenu(null);
                                        }}
                                        className="p-1 text-slate-600 hover:text-blue-400 rounded opacity-0 group-hover:opacity-100 transition"
                                      >
                                        <Edit2 className="w-3 h-3" />
                                      </button>
                                      <button
                                        onClick={() => deleteTemplate(protocol.id)}
                                        className="p-1 text-slate-600 hover:text-red-400 rounded opacity-0 group-hover:opacity-100 transition"
                                      >
                                        <Trash2 className="w-3 h-3" />
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              </>
                            )}

                            {/* Empty state when no templates */}
                            {customTemplates.length === 0 && (
                              <div className="text-xs text-slate-400 text-center py-4">
                                No templates yet. Create your first template above.
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Copy row button */}
                      <button
                        onClick={() => copyRoundingSheetLine(patient.id)}
                        className="px-2 py-1 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white rounded font-bold text-xs transition-all hover:scale-105 flex items-center gap-1 shadow-lg"
                        title="Copy this row to clipboard (Ctrl+Enter)"
                      >
                        <Copy className="w-3 h-3" />
                        Copy
                      </button>
                    </div>
                  </td>

                  {/* Name */}
                  <td className="p-2">
                    <div className="flex items-center gap-2">
                      <span className="text-white font-medium text-xs select-text flex items-center gap-1">
                        {patient.demographics?.name || patient.name || ''}
                        {hasSOAPData && (
                          <span title="Has SOAP data">
                            <Sparkles className="w-3 h-3 text-cyan-400" />
                          </span>
                        )}
                      </span>
                      <button
                        onClick={() => onPatientClick(patient.id)}
                        className="text-cyan-400 hover:text-cyan-300 transition flex-shrink-0"
                        title="View patient details"
                      >
                        <ExternalLink className="w-3 h-3" />
                      </button>
                    </div>
                  </td>

                  {/* Signalment */}
                  <td className="p-2">
                    <input
                      type="text"
                      value={getFieldValue(patient.id, 'signalment')}
                      onChange={(e) => updateFieldDebounced(patient.id, 'signalment', e.target.value)}
                      onKeyDown={(e) => handleKeyDown(e, patient.id, 'signalment')}
                      placeholder="Age, breed, sex..."
                      className="w-full min-w-[140px] bg-black/40 backdrop-blur-sm border border-slate-600 hover:border-cyan-500 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 rounded px-2 py-1.5 text-white text-xs transition-all"
                    />
                  </td>

                  {/* Location */}
                  <td className="p-2">
                    <select
                      value={rounding.location || 'IP'}
                      onChange={(e) => updateField(patient.id, 'location', e.target.value)}
                      onKeyDown={(e) => handleKeyDown(e, patient.id, 'location')}
                      className="w-full min-w-[80px] bg-black/40 backdrop-blur-sm border border-slate-600 hover:border-emerald-500 focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 rounded px-2 py-1.5 text-white text-xs transition-all font-bold"
                    >
                      <option value="IP" className="bg-slate-900">IP</option>
                      <option value="ICU" className="bg-slate-900">ICU</option>
                    </select>
                  </td>

                  {/* ICU Criteria */}
                  <td className="p-2">
                    <select
                      value={rounding.icuCriteria || ''}
                      onChange={(e) => updateField(patient.id, 'icuCriteria', e.target.value)}
                      onKeyDown={(e) => handleKeyDown(e, patient.id, 'icuCriteria')}
                      className="w-full min-w-[70px] bg-black/40 backdrop-blur-sm border border-slate-600 hover:border-pink-500 focus:border-pink-400 focus:ring-1 focus:ring-pink-400 rounded px-2 py-1.5 text-white text-xs transition-all font-bold"
                    >
                      <option value="" className="bg-slate-900">-</option>
                      <option value="Y" className="bg-slate-900 text-green-400">Y</option>
                      <option value="N" className="bg-slate-900 text-red-400">N</option>
                    </select>
                  </td>

                  {/* Code */}
                  <td className="p-2">
                    <select
                      value={rounding.code || 'Yellow'}
                      onChange={(e) => updateField(patient.id, 'code', e.target.value)}
                      onKeyDown={(e) => handleKeyDown(e, patient.id, 'code')}
                      className="w-full min-w-[90px] bg-black/40 backdrop-blur-sm border border-slate-600 hover:border-yellow-500 focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400 rounded px-2 py-1.5 text-white text-xs transition-all font-bold"
                    >
                      <option className="bg-slate-800 text-green-400">Green</option>
                      <option className="bg-slate-800 text-yellow-400">Yellow</option>
                      <option className="bg-slate-800 text-orange-400">Orange</option>
                      <option className="bg-slate-800 text-red-400">Red</option>
                    </select>
                  </td>

                  {/* Problems */}
                  <td className="p-2">
                    <div className="flex flex-col gap-2">
                      {/* Neurolocalization Dropdown */}
                      <select
                        value={getFieldValue(patient.id, 'neurolocalization', '')}
                        onChange={(e) => updateField(patient.id, 'neurolocalization', e.target.value)}
                        onKeyDown={(e) => handleKeyDown(e, patient.id, 'neurolocalization')}
                        className="w-full bg-purple-600/20 backdrop-blur-sm border border-purple-500/50 hover:border-purple-400 focus:border-purple-400 focus:ring-1 focus:ring-purple-400 rounded px-2 py-1 text-white text-xs font-bold transition-all"
                      >
                        <option value="" className="bg-slate-900">Select Localization...</option>
                        <optgroup label="Brain" className="bg-slate-900">
                          <option value="Forebrain" className="bg-slate-900">Forebrain</option>
                          <option value="Brainstem" className="bg-slate-900">Brainstem</option>
                          <option value="Cerebellum" className="bg-slate-900">Cerebellum</option>
                          <option value="Vestibular" className="bg-slate-900">Vestibular</option>
                        </optgroup>
                        <optgroup label="Spinal Cord" className="bg-slate-900">
                          <option value="C1-C5" className="bg-slate-900">C1-C5</option>
                          <option value="C6-T2" className="bg-slate-900">C6-T2</option>
                          <option value="T3-L3" className="bg-slate-900">T3-L3</option>
                          <option value="L4-S3" className="bg-slate-900">L4-S3</option>
                          <option value="Sacral/Caudal" className="bg-slate-900">Sacral/Caudal</option>
                        </optgroup>
                        <optgroup label="Neuromuscular" className="bg-slate-900">
                          <option value="NMJ" className="bg-slate-900">NMJ</option>
                          <option value="Peripheral Neuropathy" className="bg-slate-900">Peripheral Neuropathy</option>
                          <option value="Myopathy" className="bg-slate-900">Myopathy</option>
                        </optgroup>
                        <optgroup label="Other" className="bg-slate-900">
                          <option value="Multifocal" className="bg-slate-900">Multifocal</option>
                          <option value="Unknown" className="bg-slate-900">Unknown</option>
                        </optgroup>
                      </select>

                      {/* Problems textarea */}
                      <textarea
                        value={getFieldValue(patient.id, 'problems')}
                        onChange={(e) => updateFieldDebounced(patient.id, 'problems', e.target.value)}
                        onKeyDown={(e) => handleKeyDown(e, patient.id, 'problems')}
                        onPaste={(e) => handlePaste(e, patient.id, 'problems')}
                        placeholder="List of problems..."
                        className="w-full min-w-[180px] bg-black/40 backdrop-blur-sm border border-slate-600 hover:border-red-500 focus:border-red-400 focus:ring-1 focus:ring-red-400 rounded px-2 py-1.5 text-white text-xs resize-y min-h-[60px] transition-all"
                        rows={3}
                      />
                    </div>
                  </td>

                  {/* Diagnostics */}
                  <td className="p-2">
                    <div className="relative">
                      <textarea
                        value={getFieldValue(patient.id, 'diagnosticFindings')}
                        onChange={(e) => updateFieldDebounced(patient.id, 'diagnosticFindings', e.target.value)}
                        onKeyDown={(e) => handleKeyDown(e, patient.id, 'diagnosticFindings')}
                        onPaste={(e) => handlePaste(e, patient.id, 'diagnosticFindings')}
                        placeholder="Diagnostic findings..."
                        className="w-full min-w-[200px] bg-black/40 backdrop-blur-sm border border-slate-600 hover:border-emerald-500 focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 rounded px-2 py-1.5 pr-8 text-white text-xs resize-y min-h-[90px] transition-all"
                        rows={5}
                      />
                      {/* Magic paste buttons for diagnostics */}
                      <div className="absolute top-1 right-1 flex gap-0.5">
                        <button
                          type="button"
                          onClick={() => handleMagicPaste(patient.id)}
                          className="p-1 text-red-400 hover:text-red-300 hover:bg-red-900/30 rounded transition-all"
                          title="🩸 Paste bloodwork - extracts abnormal values"
                        >
                          🩸
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMagicPasteRadiology(patient.id)}
                          className="p-1 text-cyan-400 hover:text-cyan-300 hover:bg-cyan-900/30 rounded transition-all"
                          title="📷 Paste imaging report - summarizes findings"
                        >
                          📷
                        </button>
                      </div>
                    </div>
                  </td>

                  {/* Therapeutics */}
                  <td className="p-2">
                    <div className="relative">
                      <textarea
                        value={getFieldValue(patient.id, 'therapeutics')}
                        onChange={(e) => updateFieldDebounced(patient.id, 'therapeutics', e.target.value)}
                        onKeyDown={(e) => handleKeyDown(e, patient.id, 'therapeutics')}
                        onPaste={(e) => handlePaste(e, patient.id, 'therapeutics')}
                        placeholder="Type shortcuts: lev, pheno, gaba, pred..."
                        className="w-full min-w-[200px] bg-black/40 backdrop-blur-sm border border-slate-600 hover:border-green-500 focus:border-green-400 focus:ring-1 focus:ring-green-400 rounded px-2 py-1.5 pr-8 text-white text-xs resize-y min-h-[90px] transition-all"
                        rows={5}
                        title="Shortcuts: lev=Levetiracetam, pheno=Phenobarbital, gaba=Gabapentin, pred=Prednisone, maro=Maropitant, meth=Methocarbamol"
                      />
                      {/* Magic paste button for medications */}
                      <button
                        type="button"
                        onClick={() => handleMagicPasteMeds(patient.id)}
                        className="absolute top-1 right-1 p-1 text-green-400 hover:text-green-300 hover:bg-green-900/30 rounded transition-all"
                        title="💊 Paste medication list - formats nicely"
                      >
                        💊
                      </button>
                    </div>
                  </td>

                  {/* IVC */}
                  <td className="p-2">
                    <select
                      value={rounding.ivc || ''}
                      onChange={(e) => updateField(patient.id, 'ivc', e.target.value)}
                      onKeyDown={(e) => handleKeyDown(e, patient.id, 'ivc')}
                      className="w-full min-w-[100px] bg-black/40 backdrop-blur-sm border border-slate-600 hover:border-orange-500 focus:border-orange-400 focus:ring-1 focus:ring-orange-400 rounded px-2 py-1.5 text-white text-xs font-bold transition-all"
                    >
                      <option value="" className="bg-slate-900">-</option>
                      <option value="Y" className="bg-slate-800 text-green-400">Y</option>
                      <option value="N" className="bg-slate-800 text-red-400">N</option>
                      <option value="Yes but..." className="bg-slate-900">Yes but...</option>
                      <option value="Not but..." className="bg-slate-900">Not but...</option>
                    </select>
                  </td>

                  {/* Fluids */}
                  <td className="p-2">
                    <select
                      value={rounding.fluids || ''}
                      onChange={(e) => updateField(patient.id, 'fluids', e.target.value)}
                      onKeyDown={(e) => handleKeyDown(e, patient.id, 'fluids')}
                      className="w-full min-w-[100px] bg-black/40 backdrop-blur-sm border border-slate-600 hover:border-teal-500 focus:border-teal-400 focus:ring-1 focus:ring-teal-400 rounded px-2 py-1.5 text-white text-xs font-bold transition-all"
                    >
                      <option value="" className="bg-slate-900">-</option>
                      <option value="Y" className="bg-slate-800 text-green-400">Y</option>
                      <option value="N" className="bg-slate-800 text-red-400">N</option>
                      <option value="Yes but..." className="bg-slate-900">Yes but...</option>
                      <option value="Not but..." className="bg-slate-900">Not but...</option>
                    </select>
                  </td>

                  {/* CRI */}
                  <td className="p-2">
                    <select
                      value={rounding.cri || ''}
                      onChange={(e) => updateField(patient.id, 'cri', e.target.value)}
                      onKeyDown={(e) => handleKeyDown(e, patient.id, 'cri')}
                      className="w-full min-w-[100px] bg-black/40 backdrop-blur-sm border border-slate-600 hover:border-indigo-500 focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 rounded px-2 py-1.5 text-white text-xs font-bold transition-all"
                    >
                      <option value="" className="bg-slate-900">-</option>
                      <option value="Y" className="bg-slate-800 text-green-400">Y</option>
                      <option value="N" className="bg-slate-800 text-red-400">N</option>
                      <option value="Yes but..." className="bg-slate-900">Yes but...</option>
                      <option value="Not but..." className="bg-slate-900">Not but...</option>
                    </select>
                  </td>

                  {/* Overnight Dx */}
                  <td className="p-2">
                    <textarea
                      value={getFieldValue(patient.id, 'overnightDx')}
                      onChange={(e) => updateFieldDebounced(patient.id, 'overnightDx', e.target.value)}
                      onKeyDown={(e) => handleKeyDown(e, patient.id, 'overnightDx')}
                      onPaste={(e) => handlePaste(e, patient.id, 'overnightDx')}
                      placeholder="Overnight plan..."
                      className="w-full min-w-[150px] bg-black/40 backdrop-blur-sm border border-slate-600 hover:border-violet-500 focus:border-violet-400 focus:ring-1 focus:ring-violet-400 rounded px-2 py-1.5 text-white text-xs resize-y min-h-[60px] transition-all"
                      rows={3}
                    />
                  </td>

                  {/* Concerns */}
                  <td className="p-2">
                    <textarea
                      value={getFieldValue(patient.id, 'concerns')}
                      onChange={(e) => updateFieldDebounced(patient.id, 'concerns', e.target.value)}
                      onKeyDown={(e) => handleKeyDown(e, patient.id, 'concerns')}
                      onPaste={(e) => handlePaste(e, patient.id, 'concerns')}
                      placeholder="Concerns..."
                      className="w-full min-w-[150px] bg-black/40 backdrop-blur-sm border border-slate-600 hover:border-rose-500 focus:border-rose-400 focus:ring-1 focus:ring-rose-400 rounded px-2 py-1.5 text-white text-xs resize-y min-h-[60px] transition-all"
                      rows={3}
                    />
                  </td>

                  {/* Comments */}
                  <td className="p-2">
                    <textarea
                      value={getFieldValue(patient.id, 'comments')}
                      onChange={(e) => updateFieldDebounced(patient.id, 'comments', e.target.value)}
                      onKeyDown={(e) => handleKeyDown(e, patient.id, 'comments')}
                      onPaste={(e) => handlePaste(e, patient.id, 'comments')}
                      placeholder="Additional comments..."
                      className="w-full min-w-[150px] bg-black/40 backdrop-blur-sm border border-slate-600 hover:border-amber-500 focus:border-amber-400 focus:ring-1 focus:ring-amber-400 rounded px-2 py-1.5 text-white text-xs resize-y min-h-[60px] transition-all"
                      rows={3}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Keyboard shortcuts help */}
      <div className="mt-3 text-xs text-slate-400 flex gap-4 border-t border-slate-700/50 pt-2 flex-wrap">
        <div><kbd className="px-1 py-0.5 bg-slate-700 rounded">Ctrl+V</kbd> Paste across columns</div>
        <div><kbd className="px-1 py-0.5 bg-slate-700 rounded">Ctrl+Enter</kbd> Copy row</div>
        <div><kbd className="px-1 py-0.5 bg-slate-700 rounded">Ctrl+D</kbd> Duplicate field to selected</div>
        <div><kbd className="px-1 py-0.5 bg-slate-700 rounded">Tab</kbd> Next field</div>
      </div>

      {/* Template Editor Modal */}
      {showTemplateEditor && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[200]" onClick={() => setShowTemplateEditor(false)}>
          <div className="bg-slate-800 border border-slate-600 rounded-xl shadow-2xl p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                {editingTemplate ? <Edit2 className="w-5 h-5 text-blue-400" /> : <Plus className="w-5 h-5 text-emerald-400" />}
                {editingTemplate ? 'Edit Template' : 'Create Custom Template'}
              </h3>
              <button onClick={() => setShowTemplateEditor(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Name */}
              <div>
                <label className="text-xs text-slate-400 font-bold mb-1 block">Template Name</label>
                <input
                  type="text"
                  value={templateForm.name}
                  onChange={(e) => setTemplateForm({ ...templateForm, name: e.target.value })}
                  className="w-full bg-slate-900/50 border border-slate-600 rounded px-3 py-2 text-white text-sm focus:ring-2 focus:ring-emerald-500"
                  placeholder="e.g., My Custom IVDD Protocol"
                />
              </div>

              {/* Category */}
              <div>
                <label className="text-xs text-slate-400 font-bold mb-1 block">Category</label>
                <select
                  value={templateForm.category}
                  onChange={(e) => setTemplateForm({ ...templateForm, category: e.target.value as any })}
                  className="w-full bg-slate-900/50 border border-slate-600 rounded px-3 py-2 text-white text-sm focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="post-op" className="bg-slate-900">Post-Op</option>
                  <option value="medical" className="bg-slate-900">Medical</option>
                  <option value="monitoring" className="bg-slate-900">Monitoring</option>
                  <option value="discharge-prep" className="bg-slate-900">Discharge Prep</option>
                </select>
              </div>

              {/* Location & Signalment Row */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-slate-400 font-bold mb-1 block">Location</label>
                  <select
                    value={templateForm.autoFill.location || ''}
                    onChange={(e) => setTemplateForm({ ...templateForm, autoFill: { ...templateForm.autoFill, location: e.target.value } })}
                    className="w-full bg-slate-900/50 border border-slate-600 rounded px-3 py-2 text-white text-sm focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="" className="bg-slate-900">-</option>
                    <option value="IP" className="bg-slate-900">IP</option>
                    <option value="ICU" className="bg-slate-900">ICU</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs text-slate-400 font-bold mb-1 block">Signalment</label>
                  <input
                    type="text"
                    value={templateForm.autoFill.signalment || ''}
                    onChange={(e) => setTemplateForm({ ...templateForm, autoFill: { ...templateForm.autoFill, signalment: e.target.value } })}
                    className="w-full bg-slate-900/50 border border-slate-600 rounded px-3 py-2 text-white text-sm focus:ring-2 focus:ring-emerald-500"
                    placeholder="e.g., 3 yo FS Lab"
                  />
                </div>
              </div>

              {/* Problems */}
              <div>
                <label className="text-xs text-slate-400 font-bold mb-1 block">Problems</label>
                <textarea
                  value={templateForm.autoFill.problems || ''}
                  onChange={(e) => setTemplateForm({ ...templateForm, autoFill: { ...templateForm.autoFill, problems: e.target.value } })}
                  className="w-full bg-slate-900/50 border border-slate-600 rounded px-3 py-2 text-white text-sm focus:ring-2 focus:ring-emerald-500 resize-y"
                  placeholder="e.g., T3-L3 myelopathy, IVDD"
                  rows={3}
                />
              </div>

              {/* MRI Location */}
              <div>
                <label className="text-xs text-slate-400 font-bold mb-1 block">MRI Location (select all that apply)</label>
                <div className="grid grid-cols-2 gap-2">
                  {['Brain', 'Cervical', 'TL (Thoracolumbar)', 'LS (Lumbosacral)'].map((location) => (
                    <label key={location} className="flex items-center gap-2 bg-slate-900/50 border border-slate-600 rounded px-3 py-2 cursor-pointer hover:border-emerald-500 transition">
                      <input
                        type="checkbox"
                        checked={(templateForm.autoFill.mriLocation || []).includes(location)}
                        onChange={(e) => {
                          const currentLocations = templateForm.autoFill.mriLocation || [];
                          const newLocations = e.target.checked
                            ? [...currentLocations, location]
                            : currentLocations.filter((l: string) => l !== location);
                          setTemplateForm({ ...templateForm, autoFill: { ...templateForm.autoFill, mriLocation: newLocations } });
                        }}
                        className="rounded border-slate-500 text-emerald-500 focus:ring-emerald-500"
                      />
                      <span className="text-sm text-white">{location}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Diagnostic Findings */}
              <div>
                <label className="text-xs text-slate-400 font-bold mb-1 block">Diagnostic Findings</label>
                <textarea
                  value={templateForm.autoFill.diagnosticFindings || ''}
                  onChange={(e) => setTemplateForm({ ...templateForm, autoFill: { ...templateForm.autoFill, diagnosticFindings: e.target.value } })}
                  className="w-full bg-slate-900/50 border border-slate-600 rounded px-3 py-2 text-white text-sm focus:ring-2 focus:ring-emerald-500 resize-y"
                  placeholder="e.g., MRI shows disc extrusion at T12-T13"
                  rows={3}
                />
              </div>

              {/* Therapeutics */}
              <div>
                <label className="text-xs text-slate-400 font-bold mb-1 block">Therapeutics</label>
                <textarea
                  value={templateForm.autoFill.therapeutics || ''}
                  onChange={(e) => setTemplateForm({ ...templateForm, autoFill: { ...templateForm.autoFill, therapeutics: e.target.value } })}
                  className="w-full bg-slate-900/50 border border-slate-600 rounded px-3 py-2 text-white text-sm focus:ring-2 focus:ring-emerald-500 resize-y"
                  placeholder="e.g., Methocarbamol 15-20mg/kg PO q8h&#10;Gabapentin 10-20mg/kg PO q8h"
                  rows={4}
                />
              </div>

              {/* Overnight Dx */}
              <div>
                <label className="text-xs text-slate-400 font-bold mb-1 block">Overnight Dx/Plan</label>
                <textarea
                  value={templateForm.autoFill.overnightDx || ''}
                  onChange={(e) => setTemplateForm({ ...templateForm, autoFill: { ...templateForm.autoFill, overnightDx: e.target.value } })}
                  className="w-full bg-slate-900/50 border border-slate-600 rounded px-3 py-2 text-white text-sm focus:ring-2 focus:ring-emerald-500 resize-y"
                  placeholder="e.g., Continue current meds, recheck AM"
                  rows={3}
                />
              </div>

              {/* Quick Fields Row */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-slate-400 font-bold mb-1 block">Code Status</label>
                  <select
                    value={templateForm.autoFill.code || ''}
                    onChange={(e) => setTemplateForm({ ...templateForm, autoFill: { ...templateForm.autoFill, code: e.target.value as any } })}
                    className="w-full bg-slate-900/50 border border-slate-600 rounded px-3 py-2 text-white text-sm focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="" className="bg-slate-900">-</option>
                    <option value="Green" className="bg-slate-900">Green</option>
                    <option value="Yellow" className="bg-slate-900">Yellow</option>
                    <option value="Orange" className="bg-slate-900">Orange</option>
                    <option value="Red" className="bg-slate-900">Red</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs text-slate-400 font-bold mb-1 block">ICU Criteria</label>
                  <input
                    type="text"
                    value={templateForm.autoFill.icuCriteria || ''}
                    onChange={(e) => setTemplateForm({ ...templateForm, autoFill: { ...templateForm.autoFill, icuCriteria: e.target.value } })}
                    className="w-full bg-slate-900/50 border border-slate-600 rounded px-3 py-2 text-white text-sm focus:ring-2 focus:ring-emerald-500"
                    placeholder="e.g., High nursing care"
                  />
                </div>
              </div>

              {/* Fluids/IVC/CRI Row */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-xs text-slate-400 font-bold mb-1 block">Fluids</label>
                  <select
                    value={templateForm.autoFill.fluids || ''}
                    onChange={(e) => setTemplateForm({ ...templateForm, autoFill: { ...templateForm.autoFill, fluids: e.target.value } })}
                    className="w-full bg-slate-900/50 border border-slate-600 rounded px-3 py-2 text-white text-sm focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="" className="bg-slate-900">-</option>
                    <option value="Y" className="bg-slate-900">Y</option>
                    <option value="N" className="bg-slate-900">N</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs text-slate-400 font-bold mb-1 block">IVC</label>
                  <select
                    value={templateForm.autoFill.ivc || ''}
                    onChange={(e) => setTemplateForm({ ...templateForm, autoFill: { ...templateForm.autoFill, ivc: e.target.value } })}
                    className="w-full bg-slate-900/50 border border-slate-600 rounded px-3 py-2 text-white text-sm focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="" className="bg-slate-900">-</option>
                    <option value="Y" className="bg-slate-900">Y</option>
                    <option value="N" className="bg-slate-900">N</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs text-slate-400 font-bold mb-1 block">CRI</label>
                  <select
                    value={templateForm.autoFill.cri || ''}
                    onChange={(e) => setTemplateForm({ ...templateForm, autoFill: { ...templateForm.autoFill, cri: e.target.value } })}
                    className="w-full bg-slate-900/50 border border-slate-600 rounded px-3 py-2 text-white text-sm focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="" className="bg-slate-900">-</option>
                    <option value="Y" className="bg-slate-900">Y</option>
                    <option value="N" className="bg-slate-900">N</option>
                  </select>
                </div>
              </div>

              {/* Concerns */}
              <div>
                <label className="text-xs text-slate-400 font-bold mb-1 block">Concerns</label>
                <textarea
                  value={templateForm.autoFill.concerns || ''}
                  onChange={(e) => setTemplateForm({ ...templateForm, autoFill: { ...templateForm.autoFill, concerns: e.target.value } })}
                  className="w-full bg-slate-900/50 border border-slate-600 rounded px-3 py-2 text-white text-sm focus:ring-2 focus:ring-emerald-500 resize-y"
                  placeholder="e.g., Monitor for progression"
                  rows={2}
                />
              </div>

              {/* Comments */}
              <div>
                <label className="text-xs text-slate-400 font-bold mb-1 block">Comments</label>
                <textarea
                  value={templateForm.autoFill.comments || ''}
                  onChange={(e) => setTemplateForm({ ...templateForm, autoFill: { ...templateForm.autoFill, comments: e.target.value } })}
                  className="w-full bg-slate-900/50 border border-slate-600 rounded px-3 py-2 text-white text-sm focus:ring-2 focus:ring-emerald-500 resize-y"
                  placeholder="e.g., Owner updated via phone"
                  rows={2}
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4 border-t border-slate-700">
                <button
                  onClick={() => setShowTemplateEditor(false)}
                  className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-bold transition flex items-center justify-center gap-2"
                >
                  <X className="w-4 h-4" />
                  Cancel
                </button>
                <button
                  onClick={() => editingTemplate ? updateTemplate() : createTemplate()}
                  disabled={!templateForm.name.trim()}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-white rounded-lg font-bold transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Save className="w-4 h-4" />
                  {editingTemplate ? 'Update Template' : 'Create Template'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Text Expansion Manager Modal */}
      {showTextExpansionManager && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[200]" onClick={() => setShowTextExpansionManager(false)}>
          <div className="bg-slate-800 border border-slate-600 rounded-xl shadow-2xl p-6 max-w-3xl w-full max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Zap className="w-5 h-5 text-cyan-400" />
                Text Shortcuts
              </h3>
              <button onClick={() => setShowTextExpansionManager(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-sm text-slate-400 mb-6">
              Create shortcuts that automatically expand when you type them and press Space, Tab, or Enter.
              <br />
              <span className="text-cyan-400 font-bold">Example:</span> Type "q4t" + Space → "Q4h turns, padded bedding"
            </div>

            {/* Add new text expansion */}
            <div className="mb-6 p-4 bg-cyan-500/10 border border-cyan-500/30 rounded-lg">
              <h4 className="text-sm font-bold text-cyan-300 mb-3">Add New Shortcut</h4>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Shortcut (what you type)</label>
                  <input
                    id="new-expansion-shortcut"
                    type="text"
                    placeholder="e.g., q4t, lev, stab..."
                    className="w-full bg-slate-900/50 border border-slate-600 rounded px-3 py-2 text-white text-sm focus:ring-2 focus:ring-cyan-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Expands to (the full text)</label>
                  <input
                    id="new-expansion-text"
                    type="text"
                    placeholder="e.g., Q4h turns, padded bedding"
                    className="w-full bg-slate-900/50 border border-slate-600 rounded px-3 py-2 text-white text-sm focus:ring-2 focus:ring-cyan-500"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        const shortcutInput = document.getElementById('new-expansion-shortcut') as HTMLInputElement;
                        const textInput = e.currentTarget;
                        const shortcut = shortcutInput.value.trim();
                        const text = textInput.value.trim();

                        if (shortcut && text) {
                          saveTextExpansions({
                            ...textExpansions,
                            [shortcut]: text
                          });
                          shortcutInput.value = '';
                          textInput.value = '';
                          toast({
                            title: '✅ Shortcut added!',
                            description: `${shortcut} → ${text.substring(0, 30)}...`
                          });
                        }
                      }
                    }}
                  />
                </div>
              </div>
              <button
                onClick={() => {
                  const shortcutInput = document.getElementById('new-expansion-shortcut') as HTMLInputElement;
                  const textInput = document.getElementById('new-expansion-text') as HTMLInputElement;
                  const shortcut = shortcutInput.value.trim();
                  const text = textInput.value.trim();

                  if (shortcut && text) {
                    saveTextExpansions({
                      ...textExpansions,
                      [shortcut]: text
                    });
                    shortcutInput.value = '';
                    textInput.value = '';
                    toast({
                      title: '✅ Shortcut added!',
                      description: `${shortcut} → ${text.substring(0, 30)}...`
                    });
                  } else {
                    toast({
                      title: 'Missing info',
                      description: 'Please fill in both shortcut and text',
                      variant: 'destructive'
                    });
                  }
                }}
                className="mt-3 w-full px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white rounded-lg font-bold transition flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Add Shortcut
              </button>
            </div>

            {/* List of existing text expansions */}
            <div>
              <h4 className="text-sm font-bold text-white mb-3">Your Shortcuts ({Object.keys(textExpansions).length})</h4>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {Object.entries(textExpansions).length === 0 ? (
                  <div className="text-center py-8 text-slate-500 italic">
                    No shortcuts yet. Add your first one above!
                  </div>
                ) : (
                  Object.entries(textExpansions).map(([shortcut, text]) => (
                    <div key={shortcut} className="flex items-center gap-3 p-3 bg-slate-900/50 rounded group">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <code className="px-2 py-1 bg-cyan-500/20 text-cyan-300 rounded text-xs font-bold">
                            {shortcut}
                          </code>
                          <span className="text-slate-500">→</span>
                        </div>
                        <div className="text-sm text-white">{text}</div>
                      </div>
                      <button
                        onClick={() => {
                          const newExpansions = { ...textExpansions };
                          delete newExpansions[shortcut];
                          saveTextExpansions(newExpansions);
                          toast({
                            title: '🗑️ Shortcut deleted',
                            description: shortcut
                          });
                        }}
                        className="p-2 text-slate-600 hover:text-red-400 rounded opacity-0 group-hover:opacity-100 transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-700">
              <button
                onClick={() => setShowTextExpansionManager(false)}
                className="w-full px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-bold transition flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Snippet Manager Modal */}
      {showSnippetManager && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[200]" onClick={() => setShowSnippetManager(false)}>
          <div className="bg-slate-800 border border-slate-600 rounded-xl shadow-2xl p-6 max-w-4xl w-full max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-purple-400" />
                Manage Snippets
              </h3>
              <button onClick={() => setShowSnippetManager(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-sm text-slate-400 mb-6">
              Add your own custom snippets for quick insertion into rounding sheets. Snippets are saved locally in your browser.
            </div>

            <div className="space-y-6">
              {/* Therapeutics Snippets */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-md font-bold text-green-400">Therapeutic Snippets</h4>
                  <button
                    onClick={() => {
                      const text = prompt('Enter new therapeutic snippet:');
                      if (text) {
                        saveCustomSnippets({
                          ...customSnippets,
                          therapeutics: [...customSnippets.therapeutics, text]
                        });
                      }
                    }}
                    className="px-3 py-1 bg-green-600/20 hover:bg-green-600/40 border border-green-500/50 rounded text-xs flex items-center gap-1 text-green-300"
                  >
                    <Plus className="w-3 h-3" />
                    Add
                  </button>
                </div>
                <div className="space-y-1">
                  {customSnippets.therapeutics.map((snippet: string, idx: number) => (
                    <div key={idx} className="flex items-center gap-2 p-2 bg-slate-900/50 rounded group">
                      <span className="flex-1 text-sm text-white">{snippet}</span>
                      <button
                        onClick={() => {
                          const updated = customSnippets.therapeutics.filter((_: any, i: number) => i !== idx);
                          saveCustomSnippets({ ...customSnippets, therapeutics: updated });
                        }}
                        className="p-1 text-slate-600 hover:text-red-400 rounded opacity-0 group-hover:opacity-100 transition"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                  {customSnippets.therapeutics.length === 0 && (
                    <div className="text-xs text-slate-500 italic p-2">No custom therapeutic snippets yet. Click "Add" to create one.</div>
                  )}
                </div>
              </div>

              {/* Diagnostic Snippets */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-md font-bold text-emerald-400">Diagnostic Snippets</h4>
                  <button
                    onClick={() => {
                      const text = prompt('Enter new diagnostic snippet:');
                      if (text) {
                        saveCustomSnippets({
                          ...customSnippets,
                          diagnostics: [...customSnippets.diagnostics, text]
                        });
                      }
                    }}
                    className="px-3 py-1 bg-emerald-600/20 hover:bg-emerald-600/40 border border-emerald-500/50 rounded text-xs flex items-center gap-1 text-emerald-300"
                  >
                    <Plus className="w-3 h-3" />
                    Add
                  </button>
                </div>
                <div className="space-y-1">
                  {customSnippets.diagnostics.map((snippet: string, idx: number) => (
                    <div key={idx} className="flex items-center gap-2 p-2 bg-slate-900/50 rounded group">
                      <span className="flex-1 text-sm text-white">{snippet}</span>
                      <button
                        onClick={() => {
                          const updated = customSnippets.diagnostics.filter((_: any, i: number) => i !== idx);
                          saveCustomSnippets({ ...customSnippets, diagnostics: updated });
                        }}
                        className="p-1 text-slate-600 hover:text-red-400 rounded opacity-0 group-hover:opacity-100 transition"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                  {customSnippets.diagnostics.length === 0 && (
                    <div className="text-xs text-slate-500 italic p-2">No custom diagnostic snippets yet. Click "Add" to create one.</div>
                  )}
                </div>
              </div>

              {/* Concern Snippets */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-md font-bold text-rose-400">Concern Snippets</h4>
                  <button
                    onClick={() => {
                      const text = prompt('Enter new concern snippet:');
                      if (text) {
                        saveCustomSnippets({
                          ...customSnippets,
                          concerns: [...customSnippets.concerns, text]
                        });
                      }
                    }}
                    className="px-3 py-1 bg-rose-600/20 hover:bg-rose-600/40 border border-rose-500/50 rounded text-xs flex items-center gap-1 text-rose-300"
                  >
                    <Plus className="w-3 h-3" />
                    Add
                  </button>
                </div>
                <div className="space-y-1">
                  {customSnippets.concerns.map((snippet: string, idx: number) => (
                    <div key={idx} className="flex items-center gap-2 p-2 bg-slate-900/50 rounded group">
                      <span className="flex-1 text-sm text-white">{snippet}</span>
                      <button
                        onClick={() => {
                          const updated = customSnippets.concerns.filter((_: any, i: number) => i !== idx);
                          saveCustomSnippets({ ...customSnippets, concerns: updated });
                        }}
                        className="p-1 text-slate-600 hover:text-red-400 rounded opacity-0 group-hover:opacity-100 transition"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                  {customSnippets.concerns.length === 0 && (
                    <div className="text-xs text-slate-500 italic p-2">No custom concern snippets yet. Click "Add" to create one.</div>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-700">
              <button
                onClick={() => setShowSnippetManager(false)}
                className="w-full px-4 py-2 bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-white rounded-lg font-bold transition flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
