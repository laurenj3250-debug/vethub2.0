'use client';

import React, { useState, useCallback } from 'react';
import { Save, Copy, ExternalLink } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import Link from 'next/link';

interface Patient {
  id: number;
  name: string;
  status: string;
  rounding_data?: RoundingData;
  patient_info?: any;
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
}

interface RoundingSheetProps {
  patients: Patient[];
  toast: (options: any) => void;
  onPatientUpdate?: () => void;
}

export function RoundingSheet({ patients, toast, onPatientUpdate }: RoundingSheetProps) {
  const [editingData, setEditingData] = useState<Record<number, RoundingData>>({});
  const [isSaving, setIsSaving] = useState(false);

  console.log('[RoundingSheet] Received patients:', patients?.length, patients);

  const activePatients = patients.filter(p => p.status !== 'Discharged');

  console.log('[RoundingSheet] Active patients:', activePatients.length, activePatients);

  // Log the full structure of the first patient to see what fields are available
  if (activePatients.length > 0) {
    console.log('[RoundingSheet] First patient full structure:', JSON.stringify(activePatients[0], null, 2));
  }

  // Initialize editing data from patient rounding data
  const getPatientData = (patientId: number): RoundingData => {
    if (editingData[patientId]) return editingData[patientId];
    const patient = patients.find(p => p.id === patientId);
    // API returns roundingData (camelCase), not rounding_data (snake_case)
    return (patient as any)?.roundingData || patient?.rounding_data || {};
  };

  const handleFieldChange = (patientId: number, field: keyof RoundingData, value: string) => {
    setEditingData(prev => ({
      ...prev,
      [patientId]: {
        ...getPatientData(patientId),
        [field]: value
      }
    }));
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
        updates[field] = value.trim();
      }
    });

    setEditingData(prev => ({
      ...prev,
      [patientId]: {
        ...getPatientData(patientId),
        ...updates
      }
    }));

    toast({
      title: 'Pasted',
      description: `Pasted ${values.length} cells`
    });
  }, [toast]);

  const handleSave = async (patientId: number) => {
    try {
      setIsSaving(true);
      const updates = editingData[patientId];
      if (!updates) return;

      await apiClient.updatePatient(String(patientId), {
        rounding_data: updates
      });

      toast({
        title: 'Saved',
        description: 'Rounding data saved successfully'
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
      const promises = Object.entries(editingData).map(([patientId, data]) =>
        apiClient.updatePatient(patientId, { rounding_data: data })
      );

      await Promise.all(promises);

      toast({
        title: 'Saved All',
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

              console.log('[RoundingSheet] Rendering patient:', patient.id, patient.name, patient);

              // API returns demographics.name, not patient.name or patient_info.name
              const patientName = (patient as any)?.demographics?.name || patient.name || patient.patient_info?.name || `Patient ${patient.id}`;

              return (
                <tr key={patient.id} className={`border-b border-slate-700 ${hasChanges ? 'bg-emerald-900/20' : ''}`}>
                  <td className="p-2 border border-slate-600 sticky left-0 bg-slate-800 z-10">
                    <Link
                      href={`/?patient=${patient.id}`}
                      className="group flex items-center gap-2 hover:text-emerald-400 transition"
                    >
                      <div>
                        <div className="font-medium text-white group-hover:text-emerald-400">{patientName}</div>
                        <div className="text-xs text-slate-400">
                          {(patient as any)?.demographics?.age} {(patient as any)?.demographics?.breed}
                        </div>
                      </div>
                      <ExternalLink size={12} className="opacity-0 group-hover:opacity-100 text-emerald-400" />
                    </Link>
                  </td>
                  <td className="p-1 border border-slate-600">
                    <input
                      type="text"
                      value={data.signalment || ''}
                      onChange={(e) => handleFieldChange(patient.id, 'signalment', e.target.value)}
                      onPaste={(e) => handlePaste(e, patient.id, 'signalment')}
                      className="w-full px-2 py-1 bg-slate-900 border-none text-white text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </td>
                  <td className="p-1 border border-slate-600">
                    <select
                      value={data.location || ''}
                      onChange={(e) => handleFieldChange(patient.id, 'location', e.target.value)}
                      className="w-full px-2 py-1 bg-slate-900 border-none text-white text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    >
                      <option value=""></option>
                      <option value="IP">IP</option>
                      <option value="ICU">ICU</option>
                    </select>
                  </td>
                  <td className="p-1 border border-slate-600">
                    <select
                      value={data.icuCriteria || ''}
                      onChange={(e) => handleFieldChange(patient.id, 'icuCriteria', e.target.value)}
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
                      value={data.code || ''}
                      onChange={(e) => handleFieldChange(patient.id, 'code', e.target.value)}
                      className="w-full px-2 py-1 bg-slate-900 border-none text-white text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    >
                      <option value="">Select...</option>
                      <option value="Green">Green</option>
                      <option value="Yellow">Yellow</option>
                      <option value="Orange">Orange</option>
                      <option value="Red">Red</option>
                    </select>
                  </td>
                  <td className="p-1 border border-slate-600">
                    <textarea
                      value={data.problems || ''}
                      onChange={(e) => handleFieldChange(patient.id, 'problems', e.target.value)}
                      onPaste={(e) => handlePaste(e, patient.id, 'problems')}
                      rows={2}
                      className="w-full px-2 py-1 bg-slate-900 border-none text-white text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 resize-none"
                    />
                  </td>
                  <td className="p-1 border border-slate-600">
                    <textarea
                      value={data.diagnosticFindings || ''}
                      onChange={(e) => handleFieldChange(patient.id, 'diagnosticFindings', e.target.value)}
                      onPaste={(e) => handlePaste(e, patient.id, 'diagnosticFindings')}
                      rows={2}
                      className="w-full px-2 py-1 bg-slate-900 border-none text-white text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 resize-none"
                    />
                  </td>
                  <td className="p-1 border border-slate-600">
                    <textarea
                      value={data.therapeutics || ''}
                      onChange={(e) => handleFieldChange(patient.id, 'therapeutics', e.target.value)}
                      onPaste={(e) => handlePaste(e, patient.id, 'therapeutics')}
                      rows={2}
                      className="w-full px-2 py-1 bg-slate-900 border-none text-white text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 resize-none"
                    />
                  </td>
                  <td className="p-1 border border-slate-600">
                    <select
                      value={data.ivc || ''}
                      onChange={(e) => handleFieldChange(patient.id, 'ivc', e.target.value)}
                      className="w-full px-2 py-1 bg-slate-900 border-none text-white text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    >
                      <option value=""></option>
                      <option value="Yes">Yes</option>
                      <option value="No">No</option>
                    </select>
                  </td>
                  <td className="p-1 border border-slate-600">
                    <input
                      type="text"
                      value={data.fluids || ''}
                      onChange={(e) => handleFieldChange(patient.id, 'fluids', e.target.value)}
                      onPaste={(e) => handlePaste(e, patient.id, 'fluids')}
                      className="w-full px-2 py-1 bg-slate-900 border-none text-white text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      placeholder="No or rate"
                    />
                  </td>
                  <td className="p-1 border border-slate-600">
                    <input
                      type="text"
                      value={data.cri || ''}
                      onChange={(e) => handleFieldChange(patient.id, 'cri', e.target.value)}
                      onPaste={(e) => handlePaste(e, patient.id, 'cri')}
                      className="w-full px-2 py-1 bg-slate-900 border-none text-white text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      placeholder="No or details"
                    />
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
                    <textarea
                      value={data.concerns || ''}
                      onChange={(e) => handleFieldChange(patient.id, 'concerns', e.target.value)}
                      onPaste={(e) => handlePaste(e, patient.id, 'concerns')}
                      rows={2}
                      className="w-full px-2 py-1 bg-slate-900 border-none text-white text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 resize-none"
                    />
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
                    <button
                      onClick={() => handleSave(patient.id)}
                      disabled={!hasChanges || isSaving}
                      className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Save
                    </button>
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
