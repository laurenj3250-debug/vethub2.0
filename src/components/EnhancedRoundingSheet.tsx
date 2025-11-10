'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Copy, ChevronDown, FileSpreadsheet, FileText, Zap, CheckCircle2, AlertCircle, Sparkles } from 'lucide-react';
import { NEURO_PROTOCOLS, THERAPEUTIC_SNIPPETS, DIAGNOSTIC_SNIPPETS, CONCERN_SNIPPETS } from '@/lib/neuro-protocols';
import { apiClient } from '@/lib/api-client';

interface Patient {
  id: number;
  name: string;
  status: string;
  rounding_data?: any;
  patient_info?: any;
  // SOAP data fields
  soap_data?: {
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
}

export function EnhancedRoundingSheet({
  patients,
  commonMedications,
  toast,
  onPatientClick
}: EnhancedRoundingSheetProps) {
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showMedicationSelector, setShowMedicationSelector] = useState<number | null>(null);
  const [showProtocolSelector, setShowProtocolSelector] = useState<number | null>(null);
  const [selectedProtocol, setSelectedProtocol] = useState<string>('');
  const [showQuickFillMenu, setShowQuickFillMenu] = useState<number | null>(null);
  const [selectedPatients, setSelectedPatients] = useState<Set<number>>(new Set());
  const [showBatchPanel, setShowBatchPanel] = useState(false);
  const [batchField, setBatchField] = useState<string>('');
  const [batchValue, setBatchValue] = useState<string>('');
  const [autoPopulateMode, setAutoPopulateMode] = useState<'off' | 'suggest' | 'auto'>('suggest');

  const fieldRefs = useRef<Map<string, HTMLInputElement | HTMLTextAreaElement>>(new Map());

  // Auto-populate from SOAP data when patient is added or SOAP is updated
  const autoPopulateFromSOAP = useCallback((patient: Patient) => {
    if (!patient.soap_data || autoPopulateMode === 'off') return {};

    const soap = patient.soap_data;
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
    const protocol = NEURO_PROTOCOLS.find(p => p.id === protocolId);
    if (!protocol) return;

    const patient = patients.find(p => p.id === patientId);
    if (!patient) return;

    const currentRounding = patient.rounding_data || {};
    const updatedRounding = {
      ...currentRounding,
      ...protocol.autoFill
    };

    try {
      await apiClient.updatePatient(String(patientId), { rounding_data: updatedRounding });
      toast({
        title: '⚡ Protocol Applied!',
        description: `${protocol.name} template loaded for ${patient.name}`
      });
      setShowProtocolSelector(null);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Failed to apply protocol',
        description: 'Please try again'
      });
    }
  }, [patients, toast]);

  // Smart auto-populate button
  const smartAutoPopulate = useCallback(async (patientId: number) => {
    const patient = patients.find(p => p.id === patientId);
    if (!patient || !patient.soap_data) {
      toast({
        title: 'No SOAP data found',
        description: 'Complete a SOAP note first to enable auto-population'
      });
      return;
    }

    const autoFilled = autoPopulateFromSOAP(patient);
    const currentRounding = patient.rounding_data || {};
    const updatedRounding = {
      ...currentRounding,
      ...autoFilled
    };

    try {
      await apiClient.updatePatient(String(patientId), { rounding_data: updatedRounding });
      toast({
        title: '✨ Auto-populated from SOAP!',
        description: `Filled ${Object.keys(autoFilled).length} fields for ${patient.name}`
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Auto-populate failed'
      });
    }
  }, [patients, autoPopulateFromSOAP, toast]);

  // Batch operations
  const applyBatchUpdate = useCallback(async () => {
    if (!batchField || !batchValue || selectedPatients.size === 0) return;

    const updates = Array.from(selectedPatients).map(async (patientId) => {
      const patient = patients.find(p => p.id === patientId);
      if (!patient) return;

      const currentRounding = patient.rounding_data || {};
      const updatedRounding = {
        ...currentRounding,
        [batchField]: batchValue
      };

      return apiClient.updatePatient(String(patientId), { rounding_data: updatedRounding });
    });

    try {
      await Promise.all(updates);
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
  }, [batchField, batchValue, selectedPatients, patients, toast]);

  // Copy individual row
  const copyRoundingSheetLine = useCallback(async (patientId: number) => {
    const patient = patients.find(p => p.id === patientId);
    if (!patient) return;

    try {
      const rounding = patient.rounding_data || {};
      const line = [
        patient.name,
        rounding.signalment || '',
        rounding.location || '',
        rounding.icuCriteria || '',
        rounding.code || '',
        rounding.problems || '',
        rounding.diagnosticFindings || '',
        rounding.therapeutics || '',
        rounding.ivc || '',
        rounding.fluids || '',
        rounding.cri || '',
        rounding.overnightDx || '',
        rounding.concerns || '',
        rounding.comments || ''
      ].join('\t');

      navigator.clipboard.writeText(line);

      toast({
        title: '✅ Line Copied!',
        description: `${patient.name}'s rounding sheet line copied to clipboard`
      });
    } catch (error) {
      console.error('Copy line error:', error);
      toast({ variant: 'destructive', title: 'Copy failed', description: 'Could not copy line' });
    }
  }, [patients, toast]);

  // Export handlers
  const handleExportRoundingSheets = useCallback((format: string) => {
    const activePatients = patients.filter(p => p.status !== 'Discharged');

    const headers = [
      'Name', 'Signalment', 'Location', 'ICU', 'Code', 'Problems',
      'Diagnostics', 'Therapeutics', 'IVC', 'Fluids', 'CRI',
      'O/N Dx', 'Concerns', 'Comments'
    ];

    const rows = activePatients.map(patient => {
      const r = patient.rounding_data || {};
      return [
        patient.name,
        r.signalment || '',
        r.location || '',
        r.icuCriteria || '',
        r.code || '',
        r.problems || '',
        r.diagnosticFindings || '',
        r.therapeutics || '',
        r.ivc || '',
        r.fluids || '',
        r.cri || '',
        r.overnightDx || '',
        r.concerns || '',
        r.comments || ''
      ];
    });

    const separator = format.includes('csv') ? ',' : '\t';
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

  // Keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent, patientId: number, field: string) => {
    if (e.key === 'Tab' && !e.shiftKey) {
      // Smart tab navigation will be handled by natural DOM flow
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
  }, [showProtocolSelector, copyRoundingSheetLine]);

  // Update field with API call
  const updateField = useCallback(async (patientId: number, field: string, value: any) => {
    const patient = patients.find(p => p.id === patientId);
    if (!patient) return;

    const updatedRounding = {
      ...(patient.rounding_data || {}),
      [field]: value
    };

    try {
      await apiClient.updatePatient(String(patientId), { rounding_data: updatedRounding });
    } catch (error) {
      console.error('Update failed:', error);
    }
  }, [patients]);

  const activePatients = patients.filter(p => p.status !== 'Discharged');

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
                  <option value="overnightDx">Overnight Dx</option>
                  <option value="concerns">Concerns</option>
                  <option value="code">Code Status</option>
                  <option value="fluids">Fluids</option>
                  <option value="ivc">IVC</option>
                  <option value="cri">CRI</option>
                  <option value="comments">Comments</option>
                </select>

                <input
                  type="text"
                  value={batchValue}
                  onChange={(e) => setBatchValue(e.target.value)}
                  placeholder="Value to apply..."
                  className="bg-black/40 backdrop-blur-sm border border-purple-500 rounded px-2 py-1.5 text-white text-xs flex-1"
                />

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
              const rounding = patient.rounding_data || {};
              const hasSOAPData = patient.soap_data && Object.keys(patient.soap_data).length > 0;
              const isSelected = selectedPatients.has(patient.id);

              return (
                <tr
                  key={patient.id}
                  className={`border-b border-slate-700/50 hover:bg-gradient-to-r hover:from-emerald-500/10 hover:to-cyan-500/10 transition-all ${
                    idx % 2 === 0 ? 'bg-slate-900/40' : 'bg-slate-800/40'
                  } ${isSelected ? 'ring-2 ring-purple-500/50' : ''}`}
                >
                  {/* Actions column */}
                  <td className="p-2 sticky left-0 bg-slate-900/95 backdrop-blur-sm shadow-[2px_0_4px_rgba(0,0,0,0.3)] z-10">
                    <div className="flex flex-col gap-1">
                      {/* Select checkbox */}
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => {
                          const newSelected = new Set(selectedPatients);
                          if (e.target.checked) {
                            newSelected.add(patient.id);
                          } else {
                            newSelected.delete(patient.id);
                          }
                          setSelectedPatients(newSelected);
                        }}
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
                          <div className="absolute left-0 top-full mt-1 bg-slate-800 border border-slate-600 rounded-lg shadow-2xl p-2 min-w-[280px] max-h-[400px] overflow-y-auto z-50">
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

                            {/* Protocol categories */}
                            {['post-op', 'medical', 'monitoring', 'discharge-prep'].map(category => {
                              const protocols = NEURO_PROTOCOLS.filter(p => p.category === category);
                              if (protocols.length === 0) return null;

                              return (
                                <div key={category} className="mb-3">
                                  <div className="text-xs text-slate-400 font-bold mb-1 uppercase tracking-wide">
                                    {category.replace('-', ' ')}
                                  </div>
                                  {protocols.map(protocol => (
                                    <button
                                      key={protocol.id}
                                      onClick={() => {
                                        applyProtocol(patient.id, protocol.id);
                                        setShowQuickFillMenu(null);
                                      }}
                                      className="w-full text-left px-2 py-1.5 text-xs text-white hover:bg-slate-700 rounded mb-1"
                                    >
                                      <div className="font-medium">{protocol.name}</div>
                                      {protocol.tags.length > 0 && (
                                        <div className="flex gap-1 mt-0.5 flex-wrap">
                                          {protocol.tags.map(tag => (
                                            <span key={tag} className="text-xs text-slate-500">#{tag}</span>
                                          ))}
                                        </div>
                                      )}
                                    </button>
                                  ))}
                                </div>
                              );
                            })}
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
                    <button
                      onClick={() => onPatientClick(patient.id)}
                      className="text-white font-medium text-xs hover:text-cyan-400 transition cursor-pointer underline decoration-dotted flex items-center gap-1"
                    >
                      {patient.name}
                      {hasSOAPData && <Sparkles className="w-3 h-3 text-cyan-400" title="Has SOAP data" />}
                    </button>
                  </td>

                  {/* Signalment */}
                  <td className="p-2">
                    <input
                      type="text"
                      value={rounding.signalment || ''}
                      onChange={(e) => updateField(patient.id, 'signalment', e.target.value)}
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
                      className="w-full min-w-[80px] bg-slate-900/90 border border-slate-600 hover:border-emerald-500 focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 rounded px-2 py-1.5 text-white text-xs transition-all font-bold"
                    >
                      <option value="IP" className="bg-slate-800">IP</option>
                      <option value="ICU" className="bg-slate-800">ICU</option>
                    </select>
                  </td>

                  {/* ICU Criteria */}
                  <td className="p-2">
                    <select
                      value={rounding.icuCriteria || ''}
                      onChange={(e) => updateField(patient.id, 'icuCriteria', e.target.value)}
                      onKeyDown={(e) => handleKeyDown(e, patient.id, 'icuCriteria')}
                      className="w-full min-w-[70px] bg-slate-900/90 border border-slate-600 hover:border-pink-500 focus:border-pink-400 focus:ring-1 focus:ring-pink-400 rounded px-2 py-1.5 text-white text-xs transition-all font-bold"
                    >
                      <option value="" className="bg-slate-800">-</option>
                      <option value="Y" className="bg-slate-800 text-green-400">Y</option>
                      <option value="N" className="bg-slate-800 text-red-400">N</option>
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
                    <textarea
                      value={rounding.problems || ''}
                      onChange={(e) => updateField(patient.id, 'problems', e.target.value)}
                      onKeyDown={(e) => handleKeyDown(e, patient.id, 'problems')}
                      placeholder="List of problems..."
                      className="w-full min-w-[180px] bg-black/40 backdrop-blur-sm border border-slate-600 hover:border-red-500 focus:border-red-400 focus:ring-1 focus:ring-red-400 rounded px-2 py-1.5 text-white text-xs resize-y min-h-[70px] transition-all"
                      rows={4}
                    />
                  </td>

                  {/* Diagnostics */}
                  <td className="p-2">
                    <textarea
                      value={rounding.diagnosticFindings || ''}
                      onChange={(e) => updateField(patient.id, 'diagnosticFindings', e.target.value)}
                      onKeyDown={(e) => handleKeyDown(e, patient.id, 'diagnosticFindings')}
                      placeholder="Diagnostic findings..."
                      className="w-full min-w-[200px] bg-black/40 backdrop-blur-sm border border-slate-600 hover:border-emerald-500 focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 rounded px-2 py-1.5 text-white text-xs resize-y min-h-[90px] transition-all"
                      rows={5}
                    />
                  </td>

                  {/* Therapeutics */}
                  <td className="p-2 relative">
                    <div className="flex gap-2">
                      <textarea
                        value={rounding.therapeutics || ''}
                        onChange={(e) => updateField(patient.id, 'therapeutics', e.target.value)}
                        onKeyDown={(e) => handleKeyDown(e, patient.id, 'therapeutics')}
                        placeholder="Medications, treatments..."
                        className="flex-1 min-w-[200px] bg-black/40 backdrop-blur-sm border border-slate-600 hover:border-green-500 focus:border-green-400 focus:ring-1 focus:ring-green-400 rounded px-2 py-1.5 text-white text-xs resize-y min-h-[90px] transition-all"
                        rows={5}
                      />
                      <button
                        onClick={() => setShowMedicationSelector(showMedicationSelector === patient.id ? null : patient.id)}
                        className="px-2 py-1 bg-gradient-to-br from-emerald-500/30 to-green-500/30 hover:from-emerald-500/50 hover:to-green-500/50 border border-emerald-500/50 text-emerald-300 rounded text-sm h-fit font-bold transition-all hover:scale-105"
                        title="Add common medications"
                      >
                        +
                      </button>
                    </div>
                    {showMedicationSelector === patient.id && (
                      <div className="absolute z-20 mt-1 bg-slate-800 border border-slate-600 rounded-lg shadow-xl p-2 max-h-48 overflow-y-auto" style={{ minWidth: '200px' }}>
                        <div className="text-xs text-slate-300 font-bold mb-1">Common Medications:</div>
                        {commonMedications.map((med: any) => (
                          <button
                            key={med.id}
                            onClick={() => {
                              const currentMeds = rounding.therapeutics || '';
                              const newMeds = currentMeds ? `${currentMeds}\n${med.name}` : med.name;
                              updateField(patient.id, 'therapeutics', newMeds);
                            }}
                            className="block w-full text-left px-2 py-1 text-xs text-white hover:bg-slate-700 rounded"
                          >
                            {med.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </td>

                  {/* IVC */}
                  <td className="p-2">
                    <select
                      value={rounding.ivc || ''}
                      onChange={(e) => updateField(patient.id, 'ivc', e.target.value)}
                      onKeyDown={(e) => handleKeyDown(e, patient.id, 'ivc')}
                      className="w-full min-w-[100px] bg-black/40 backdrop-blur-sm border border-slate-600 hover:border-orange-500 focus:border-orange-400 focus:ring-1 focus:ring-orange-400 rounded px-2 py-1.5 text-white text-xs font-bold transition-all"
                    >
                      <option value="" className="bg-slate-800">-</option>
                      <option value="Y" className="bg-slate-800 text-green-400">Y</option>
                      <option value="N" className="bg-slate-800 text-red-400">N</option>
                      <option value="Yes but..." className="bg-slate-800">Yes but...</option>
                      <option value="Not but..." className="bg-slate-800">Not but...</option>
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
                      <option value="" className="bg-slate-800">-</option>
                      <option value="Y" className="bg-slate-800 text-green-400">Y</option>
                      <option value="N" className="bg-slate-800 text-red-400">N</option>
                      <option value="Yes but..." className="bg-slate-800">Yes but...</option>
                      <option value="Not but..." className="bg-slate-800">Not but...</option>
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
                      <option value="" className="bg-slate-800">-</option>
                      <option value="Y" className="bg-slate-800 text-green-400">Y</option>
                      <option value="N" className="bg-slate-800 text-red-400">N</option>
                      <option value="Yes but..." className="bg-slate-800">Yes but...</option>
                      <option value="Not but..." className="bg-slate-800">Not but...</option>
                    </select>
                  </td>

                  {/* Overnight Dx */}
                  <td className="p-2">
                    <textarea
                      value={rounding.overnightDx || ''}
                      onChange={(e) => updateField(patient.id, 'overnightDx', e.target.value)}
                      onKeyDown={(e) => handleKeyDown(e, patient.id, 'overnightDx')}
                      placeholder="Overnight plan..."
                      className="w-full min-w-[150px] bg-black/40 backdrop-blur-sm border border-slate-600 hover:border-violet-500 focus:border-violet-400 focus:ring-1 focus:ring-violet-400 rounded px-2 py-1.5 text-white text-xs resize-y min-h-[60px] transition-all"
                      rows={3}
                    />
                  </td>

                  {/* Concerns */}
                  <td className="p-2">
                    <textarea
                      value={rounding.concerns || ''}
                      onChange={(e) => updateField(patient.id, 'concerns', e.target.value)}
                      onKeyDown={(e) => handleKeyDown(e, patient.id, 'concerns')}
                      placeholder="Concerns..."
                      className="w-full min-w-[150px] bg-black/40 backdrop-blur-sm border border-slate-600 hover:border-rose-500 focus:border-rose-400 focus:ring-1 focus:ring-rose-400 rounded px-2 py-1.5 text-white text-xs resize-y min-h-[60px] transition-all"
                      rows={3}
                    />
                  </td>

                  {/* Comments */}
                  <td className="p-2">
                    <textarea
                      value={rounding.comments || ''}
                      onChange={(e) => updateField(patient.id, 'comments', e.target.value)}
                      onKeyDown={(e) => handleKeyDown(e, patient.id, 'comments')}
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
      <div className="mt-3 text-xs text-slate-400 flex gap-4 border-t border-slate-700/50 pt-2">
        <div><kbd className="px-1 py-0.5 bg-slate-700 rounded">Ctrl+Enter</kbd> Copy row</div>
        <div><kbd className="px-1 py-0.5 bg-slate-700 rounded">Ctrl+P</kbd> Quick fill menu</div>
        <div><kbd className="px-1 py-0.5 bg-slate-700 rounded">Tab</kbd> Next field</div>
      </div>
    </div>
  );
}
