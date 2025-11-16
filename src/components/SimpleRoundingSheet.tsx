'use client';

import React, { useState } from 'react';
import { apiClient } from '@/lib/api-client';

interface Patient {
  id: number;
  name: string;
  status: string;
  rounding_data?: any;
  patient_info?: any;
}

interface SimpleRoundingSheetProps {
  patients: Patient[];
  commonMedications: any[];
  toast: (options: any) => void;
  onPatientClick: (id: number) => void;
  onPatientUpdate?: () => void;
}

export function SimpleRoundingSheet({
  patients,
  commonMedications,
  toast,
  onPatientClick,
  onPatientUpdate
}: SimpleRoundingSheetProps) {
  const [editingData, setEditingData] = useState<Record<number, any>>({});

  const activePatients = patients.filter(p => p.status !== 'Discharged');

  const handleFieldChange = (patientId: number, field: string, value: string) => {
    setEditingData(prev => ({
      ...prev,
      [patientId]: {
        ...prev[patientId],
        [field]: value
      }
    }));
  };

  const handleSave = async (patientId: number) => {
    try {
      const updates = editingData[patientId];
      if (!updates) return;

      await apiClient.updatePatient(String(patientId), {
        rounding_data: updates
      });

      toast({
        title: 'Saved',
        description: 'Rounding data updated successfully'
      });

      onPatientUpdate?.();
    } catch (error) {
      console.error('Failed to save:', error);
      toast({
        title: 'Error',
        description: 'Failed to save rounding data',
        variant: 'destructive'
      });
    }
  };

  return (
    <div className="space-y-4">
      <div className="text-white text-sm mb-4">
        <p>Showing {activePatients.length} active patients</p>
        <p className="text-xs text-slate-400">Simple rounding sheet (temporary simplified version)</p>
      </div>

      {activePatients.map(patient => {
        const data = editingData[patient.id] || patient.rounding_data || {};

        return (
          <div key={patient.id} className="bg-slate-800 rounded-lg p-4 border border-slate-700">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-xl font-bold text-white">{patient.demographics?.name || patient.name || 'Unnamed'}</h3>
                <p className="text-sm text-slate-400">
                  {patient.demographics?.age || patient.patient_info?.age || ''} {patient.demographics?.breed || patient.patient_info?.breed || ''} {patient.demographics?.species || patient.patient_info?.species || ''}
                </p>
              </div>
              <button
                onClick={() => handleSave(patient.id)}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition"
              >
                Save
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Problems</label>
                <textarea
                  value={data.problems || ''}
                  onChange={(e) => handleFieldChange(patient.id, 'problems', e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded text-white text-sm"
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Therapeutics</label>
                <textarea
                  value={data.therapeutics || ''}
                  onChange={(e) => handleFieldChange(patient.id, 'therapeutics', e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded text-white text-sm"
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Diagnostics</label>
                <textarea
                  value={data.diagnosticFindings || ''}
                  onChange={(e) => handleFieldChange(patient.id, 'diagnosticFindings', e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded text-white text-sm"
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Concerns</label>
                <textarea
                  value={data.concerns || ''}
                  onChange={(e) => handleFieldChange(patient.id, 'concerns', e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded text-white text-sm"
                  rows={3}
                />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
