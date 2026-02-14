'use client';

import React, { useRef, useCallback, useState } from 'react';
import { Brain, Copy, FileDown, Loader2, Sheet } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiClient } from '@/lib/api-client';
import { NEO_SHADOW, NEO_SHADOW_SM, NEO_BORDER, NEO_COLORS } from '@/lib/neo-styles';
import { downloadCombinedMRISheetPDF } from '@/lib/pdf-generators/mri-anesthesia-sheet';

interface Patient {
  id: number;
  name?: string;
  type: string;
  status?: string;
  demographics?: {
    name?: string;
    patientId?: string;
    weight?: string | number;
  };
  mriData?: {
    scanType?: string;
  };
}

interface MRIScheduleProps {
  patients: Patient[];
  selectedPatientIds: Set<number>;
  onOpenRoundingSheet: (patientId: number) => void;
}

export function MRISchedule({
  patients,
  selectedPatientIds,
  onOpenRoundingSheet,
}: MRIScheduleProps) {
  const { toast } = useToast();

  // Debounced input state for MRI Schedule
  const [mriInputValues, setMriInputValues] = React.useState<Record<string, string>>({});
  const [mriSaveStatus, setMriSaveStatus] = React.useState<Record<string, 'saving' | 'saved' | 'error'>>({});
  const mriTimeoutRefs = useRef<Record<string, NodeJS.Timeout>>({});

  // Debounced update for MRI Schedule inputs
  const debouncedMRIUpdate = useCallback((
    patientId: number,
    field: string,
    value: string,
    dataType: 'demographics' | 'mriData'
  ) => {
    const key = `${patientId}-${field}`;

    // Update local state immediately for responsive UI
    setMriInputValues(prev => ({ ...prev, [key]: value }));

    // Clear existing timeout
    if (mriTimeoutRefs.current[key]) {
      clearTimeout(mriTimeoutRefs.current[key]);
    }

    // Set new timeout to save after 800ms of no typing
    mriTimeoutRefs.current[key] = setTimeout(async () => {
      try {
        setMriSaveStatus(prev => ({ ...prev, [key]: 'saving' }));

        const freshPatient = patients.find(p => p.id === patientId);
        const freshData = dataType === 'mriData'
          ? (freshPatient?.mriData || {})
          : (freshPatient?.demographics || {});

        const updated = { ...freshData, [field]: value };
        await apiClient.updatePatient(String(patientId), { [dataType]: updated });

        setMriSaveStatus(prev => ({ ...prev, [key]: 'saved' }));
        setTimeout(() => {
          setMriSaveStatus(prev => {
            const next = { ...prev };
            delete next[key];
            return next;
          });
        }, 2000);
      } catch (error) {
        console.error('Failed to update:', error);
        setMriSaveStatus(prev => ({ ...prev, [key]: 'error' }));
        setTimeout(() => {
          setMriSaveStatus(prev => {
            const next = { ...prev };
            delete next[key];
            return next;
          });
        }, 3000);
      }
    }, 800);
  }, [patients]);

  const handleExportMRISchedule = () => {
    try {
      const allMRIPatients = patients.filter(p => p.type === 'MRI' && p.status !== 'Discharging');
      const mriPatients = selectedPatientIds.size > 0
        ? allMRIPatients.filter(p => selectedPatientIds.has(p.id))
        : allMRIPatients;

      if (mriPatients.length === 0) {
        toast({
          variant: 'destructive',
          title: 'No MRI patients',
          description: selectedPatientIds.size > 0 ? 'No selected MRI patients found' : 'No active MRI patients found'
        });
        return;
      }

      const rows = mriPatients.map((patient) => {
        const name = patient.demographics?.name || patient.name || '';
        const patientIdKey = `${patient.id}-patientId`;
        const weightKey = `${patient.id}-weight`;
        const scanTypeKey = `${patient.id}-scanType`;

        const patientId = mriInputValues[patientIdKey] ?? (patient.demographics?.patientId || '');
        const weight = (mriInputValues[weightKey] ?? (patient.demographics?.weight || '')).toString().replace(/[^\d.]/g, '');
        const scanType = mriInputValues[scanTypeKey] ?? (patient.mriData?.scanType || '');

        return `${name}\t${patientId}\t${weight}\t${scanType}`;
      });

      navigator.clipboard.writeText(rows.join('\n'));
      toast({
        title: '✅ MRI Schedule Copied!',
        description: `${mriPatients.length} patients ready to paste into spreadsheet`
      });
    } catch (error) {
      console.error('MRI export error:', error);
      toast({ variant: 'destructive', title: 'Export failed' });
    }
  };

  const handleCopySingleMRILine = (patientId: number) => {
    try {
      const patient = patients.find(p => p.id === patientId);
      if (!patient) {
        toast({ variant: 'destructive', title: 'Patient not found' });
        return;
      }

      const name = patient.demographics?.name || patient.name || '';
      const patientIdStr = mriInputValues[`${patientId}-patientId`] ?? (patient.demographics?.patientId || '');
      const weight = (mriInputValues[`${patientId}-weight`] ?? (patient.demographics?.weight || '')).toString().replace(/[^\d.]/g, '');
      const scanType = mriInputValues[`${patientId}-scanType`] ?? (patient.mriData?.scanType || '');

      navigator.clipboard.writeText(`${name}\t${patientIdStr}\t${weight}\t${scanType}`);
      toast({ title: '✅ MRI Line Copied!', description: `${name}'s data ready to paste` });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Copy failed' });
    }
  };

  const handleMRIPaste = (e: React.ClipboardEvent, patientId: number) => {
    const pasteData = e.clipboardData.getData('text');
    if (!pasteData.trim() || !pasteData.includes('\t')) return;

    e.preventDefault();
    e.stopPropagation();

    const values = pasteData.split('\t').map(v => v.trim());
    let patientIdVal = '';
    let weightVal = '';
    let scanTypeVal = '';

    if (values.length >= 4) {
      patientIdVal = values[1];
      weightVal = values[2].replace(/[^\d.]/g, '');
      scanTypeVal = values[3];
    } else if (values.length === 3) {
      patientIdVal = values[0];
      weightVal = values[1].replace(/[^\d.]/g, '');
      scanTypeVal = values[2];
    } else if (values.length === 2) {
      weightVal = values[0].replace(/[^\d.]/g, '');
      scanTypeVal = values[1];
    }

    if (patientIdVal) {
      setMriInputValues(prev => ({ ...prev, [`${patientId}-patientId`]: patientIdVal }));
      debouncedMRIUpdate(patientId, 'patientId', patientIdVal, 'demographics');
    }
    if (weightVal) {
      setMriInputValues(prev => ({ ...prev, [`${patientId}-weight`]: weightVal }));
      debouncedMRIUpdate(patientId, 'weight', weightVal, 'demographics');
    }
    if (scanTypeVal) {
      setMriInputValues(prev => ({ ...prev, [`${patientId}-scanType`]: scanTypeVal }));
      debouncedMRIUpdate(patientId, 'scanType', scanTypeVal, 'mriData');
    }

    const fieldsCount = [patientIdVal, weightVal, scanTypeVal].filter(Boolean).length;
    toast({ title: '✅ Pasted!', description: `Filled ${fieldsCount} field${fieldsCount > 1 ? 's' : ''}` });
  };

  // Helper to render save status indicator
  const renderSaveStatus = (patientId: number, field: string) => {
    const status = mriSaveStatus[`${patientId}-${field}`];
    if (!status) return null;
    return (
      <span className={`ml-2 text-xs font-bold ${
        status === 'saving' ? 'text-amber-500' :
        status === 'saved' ? 'text-green-600' :
        'text-red-500'
      }`}>
        {status === 'saving' ? '...' : status === 'saved' ? '✓' : '✗'}
      </span>
    );
  };

  const mriPatients = patients.filter(p => p.type === 'MRI' && (p.status === 'New' || p.status?.toLowerCase() === 'new admit'));

  // PDF download state
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  // Google Sheets sync state
  const [isSyncingSheets, setIsSyncingSheets] = useState(false);

  // Handle PDF download - generates MRI anesthesia sheet with calculated doses
  const handleDownloadMRIPDF = async () => {
    try {
      const allMRIPatients = patients.filter(p => p.type === 'MRI' && p.status !== 'Discharging');
      const patientsForPDF = selectedPatientIds.size > 0
        ? allMRIPatients.filter(p => selectedPatientIds.has(p.id))
        : allMRIPatients;

      if (patientsForPDF.length === 0) {
        toast({
          variant: 'destructive',
          title: 'No MRI patients',
          description: selectedPatientIds.size > 0 ? 'No selected MRI patients found' : 'No active MRI patients found'
        });
        return;
      }

      setIsGeneratingPDF(true);

      // Map to UnifiedPatient format expected by PDF generator
      const unifiedPatients = patientsForPDF.map(p => ({
        id: p.id,
        demographics: {
          name: p.demographics?.name || p.name || 'Unknown',
          weight: String(p.demographics?.weight || ''),
          patientId: p.demographics?.patientId,
        },
        mriData: {
          scanType: (mriInputValues[`${p.id}-scanType`] || p.mriData?.scanType || 'Brain') as 'Brain' | 'C-Spine' | 'T-Spine' | 'LS',
        },
        mrn: p.demographics?.patientId,
      }));

      await downloadCombinedMRISheetPDF(unifiedPatients as any);

      toast({
        title: '📄 MRI Anesthesia Sheet Ready!',
        description: `Generated PDF for ${patientsForPDF.length} patient${patientsForPDF.length > 1 ? 's' : ''} with calculated doses`
      });
    } catch (error) {
      console.error('PDF generation error:', error);
      toast({
        variant: 'destructive',
        title: 'PDF generation failed',
        description: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  // Handle Google Sheets sync - pushes MRI patients with calculated doses to spreadsheet
  const handleSyncToSheets = async () => {
    try {
      const allMRIPatients = patients.filter(p => p.type === 'MRI' && p.status !== 'Discharging');
      const patientsForSync = selectedPatientIds.size > 0
        ? allMRIPatients.filter(p => selectedPatientIds.has(p.id))
        : allMRIPatients;

      if (patientsForSync.length === 0) {
        toast({
          variant: 'destructive',
          title: 'No MRI patients',
          description: selectedPatientIds.size > 0 ? 'No selected MRI patients found' : 'No active MRI patients found'
        });
        return;
      }

      setIsSyncingSheets(true);

      // Map to format expected by sync API
      const syncData = patientsForSync.map(p => ({
        name: p.demographics?.name || p.name || 'Unknown',
        patientId: mriInputValues[`${p.id}-patientId`] || p.demographics?.patientId || '',
        weightKg: parseFloat(String(mriInputValues[`${p.id}-weight`] || p.demographics?.weight || '0').replace(/[^\d.]/g, '')) || 0,
        scanType: mriInputValues[`${p.id}-scanType`] || p.mriData?.scanType || 'Brain',
      }));

      const response = await fetch('/api/mri/sync-sheets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patients: syncData }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        toast({
          title: '📊 Synced to Google Sheets!',
          description: `${result.rowsWritten} patient${result.rowsWritten > 1 ? 's' : ''} with calculated doses`
        });
      } else {
        throw new Error(result.error || 'Sync failed');
      }
    } catch (error) {
      console.error('Sheets sync error:', error);
      toast({
        variant: 'destructive',
        title: 'Sync failed',
        description: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      setIsSyncingSheets(false);
    }
  };

  return (
    <div
      className="rounded-2xl p-4"
      style={{ backgroundColor: 'white', border: NEO_BORDER, boxShadow: NEO_SHADOW }}
    >
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-black text-gray-900 flex items-center gap-2">
          <Brain style={{ color: NEO_COLORS.teal }} />
          MRI Schedule
        </h2>
        <div className="flex gap-2">
          <button
            onClick={handleSyncToSheets}
            disabled={isSyncingSheets}
            className="px-4 py-2 rounded-xl font-bold text-white transition hover:-translate-y-0.5 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ backgroundColor: '#34A853', border: NEO_BORDER, boxShadow: NEO_SHADOW_SM }}
            title="Sync MRI patients to Google Sheets with auto-calculated drug doses"
          >
            {isSyncingSheets ? <Loader2 size={16} className="animate-spin" /> : <Sheet size={16} />}
            {isSyncingSheets ? 'Syncing...' : 'Sync to Sheets'}
          </button>
          <button
            onClick={handleDownloadMRIPDF}
            disabled={isGeneratingPDF}
            className="px-4 py-2 rounded-xl font-bold text-gray-900 transition hover:-translate-y-0.5 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ backgroundColor: NEO_COLORS.mint, border: NEO_BORDER, boxShadow: NEO_SHADOW_SM }}
            title="Generate MRI Anesthesia Sheet PDF with auto-calculated drug doses"
          >
            {isGeneratingPDF ? <Loader2 size={16} className="animate-spin" /> : <FileDown size={16} />}
            {isGeneratingPDF ? 'Generating...' : 'Download PDF'}
          </button>
          <button
            onClick={handleExportMRISchedule}
            className="px-4 py-2 rounded-xl font-bold text-gray-900 transition hover:-translate-y-0.5 flex items-center gap-2"
            style={{ backgroundColor: NEO_COLORS.lavender, border: NEO_BORDER, boxShadow: NEO_SHADOW_SM }}
            title="Copy tab-separated data to paste into spreadsheet"
          >
            <Copy size={16} />
            Copy to Clipboard
          </button>
        </div>
      </div>
      <div className="overflow-x-auto max-h-[70vh] rounded-xl" style={{ border: NEO_BORDER }}>
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10" style={{ backgroundColor: NEO_COLORS.mint }}>
            <tr style={{ borderBottom: NEO_BORDER }}>
              <th className="text-left p-3 text-gray-900 font-bold">Name</th>
              <th className="text-left p-3 text-gray-900 font-bold">Patient ID</th>
              <th className="text-left p-3 text-gray-900 font-bold">Weight (kg)</th>
              <th className="text-left p-3 text-gray-900 font-bold">Scan Type</th>
              <th className="text-left p-3 text-gray-900 font-bold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {mriPatients.map((patient, idx) => (
              <tr
                key={patient.id}
                className="hover:bg-[#B8E6D4]/30 transition"
                style={{
                  backgroundColor: idx % 2 === 0 ? 'white' : NEO_COLORS.cream,
                  borderBottom: '1px solid #e5e7eb'
                }}
                onPaste={(e) => handleMRIPaste(e, patient.id)}
              >
                <td className="p-3">
                  <button
                    onClick={() => onOpenRoundingSheet(patient.id)}
                    className="text-gray-900 font-bold transition cursor-pointer hover:text-[#6BB89D]"
                  >
                    {patient.demographics?.name || patient.name || 'Unnamed'}
                  </button>
                </td>
                <td className="p-3">
                  <div className="flex items-center">
                    <input
                      type="text"
                      value={mriInputValues[`${patient.id}-patientId`] ?? (patient.demographics?.patientId || '')}
                      onChange={(e) => debouncedMRIUpdate(patient.id, 'patientId', e.target.value, 'demographics')}
                      className="w-full rounded-lg px-2 py-1.5 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-[#6BB89D]"
                      style={{ border: '1px solid #000', backgroundColor: 'white' }}
                    />
                    {renderSaveStatus(patient.id, 'patientId')}
                  </div>
                </td>
                <td className="p-3">
                  <div className="flex items-center">
                    <input
                      type="text"
                      value={mriInputValues[`${patient.id}-weight`] ?? ((patient.demographics?.weight || '').toString().replace(/[^\d.]/g, ''))}
                      onChange={(e) => debouncedMRIUpdate(patient.id, 'weight', e.target.value, 'demographics')}
                      className="w-full rounded-lg px-2 py-1.5 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-[#6BB89D]"
                      style={{ border: '1px solid #000', backgroundColor: 'white' }}
                      placeholder="kg"
                    />
                    {renderSaveStatus(patient.id, 'weight')}
                  </div>
                </td>
                <td className="p-3">
                  <div className="flex items-center">
                    <input
                      type="text"
                      value={mriInputValues[`${patient.id}-scanType`] ?? (patient.mriData?.scanType || '')}
                      onChange={(e) => debouncedMRIUpdate(patient.id, 'scanType', e.target.value, 'mriData')}
                      className="w-full rounded-lg px-2 py-1.5 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-[#6BB89D]"
                      style={{ border: '1px solid #000', backgroundColor: 'white' }}
                      placeholder="Brain, LS, C-Spine..."
                    />
                    {renderSaveStatus(patient.id, 'scanType')}
                  </div>
                </td>
                <td className="p-3">
                  <button
                    onClick={() => handleCopySingleMRILine(patient.id)}
                    className="p-2 rounded-lg transition hover:-translate-y-0.5"
                    style={{ backgroundColor: NEO_COLORS.lavender, border: '1px solid #000' }}
                    title="Copy this patient's MRI line"
                  >
                    <Copy className="w-4 h-4 text-gray-900" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {mriPatients.length === 0 && (
        <div
          className="text-center py-8 mt-4 rounded-xl"
          style={{ backgroundColor: NEO_COLORS.cream, border: NEO_BORDER }}
        >
          <div className="text-4xl mb-2">🧠</div>
          <p className="text-gray-500 font-bold">No MRI patients with New/New Admit status</p>
        </div>
      )}
    </div>
  );
}
