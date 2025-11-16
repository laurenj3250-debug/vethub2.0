'use client';

/**
 * Unified Patient Entry Component
 *
 * Comprehensive patient data entry form with:
 * - VetRadar auto-populated data (85% of fields)
 * - Manual entry for 5-7 critical fields
 * - Auto-calculators for MRI doses, sticker counts, lab parsing
 * - Single-click generation of all outputs (Rounding Sheet, MRI Sheet, Stickers)
 *
 * Time per patient: 17-37 seconds manual entry
 */

import React, { useState, useEffect } from 'react';
import { UnifiedPatient, LabPanel, MRIData, StickerData } from '@/contexts/PatientContext';
import { parseCBCTable, parseChemistryTable } from '@/lib/lab-parser';
import { autoPopulateMRIDoses, getDefaultNPOTime } from '@/lib/mri-calculator';
import { autoCalculateStickerCounts, getStickerSummary } from '@/lib/sticker-calculator';
import { generateRoundingSheetPDF, downloadRoundingSheetPDF } from '@/lib/pdf-generators/rounding-sheet';
import { generateMRISheetPDF, downloadMRISheetPDF } from '@/lib/pdf-generators/mri-anesthesia-sheet';
import { downloadAllStickersPDF } from '@/lib/pdf-generators/stickers';

interface UnifiedPatientEntryProps {
  patient: UnifiedPatient;
  onUpdate: (patient: UnifiedPatient) => void;
  onSave?: (patient: UnifiedPatient) => Promise<void>;
}

export function UnifiedPatientEntry({ patient, onUpdate, onSave }: UnifiedPatientEntryProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [cbcText, setCbcText] = useState('');
  const [chemText, setChemText] = useState('');
  const [chestXrayFindings, setChestXrayFindings] = useState('NSF');

  // Auto-calculate MRI doses when weight or scan type changes
  useEffect(() => {
    if (patient.mriData?.autoCalculate) {
      const updatedMRIData = autoPopulateMRIDoses(patient.mriData, patient.demographics.weight);
      if (updatedMRIData && JSON.stringify(updatedMRIData) !== JSON.stringify(patient.mriData)) {
        onUpdate({
          ...patient,
          mriData: updatedMRIData,
        });
      }
    }
  }, [patient.demographics.weight, patient.mriData?.scanType, patient.mriData?.autoCalculate]);

  // Auto-calculate sticker counts when flags change
  useEffect(() => {
    if (patient.stickerData) {
      const updatedStickerData = autoCalculateStickerCounts(patient.stickerData);
      if (JSON.stringify(updatedStickerData) !== JSON.stringify(patient.stickerData)) {
        onUpdate({
          ...patient,
          stickerData: updatedStickerData,
        });
      }
    }
  }, [patient.stickerData?.isNewAdmit, patient.stickerData?.isSurgery]);

  /**
   * Handle neurologic localization change
   */
  const handleLocalizationChange = (localization: string) => {
    onUpdate({
      ...patient,
      roundingData: {
        ...patient.roundingData,
        neurolocalization: localization,
      },
    });
  };

  /**
   * Handle lab paste and parse
   */
  const handleLabPaste = (type: 'cbc' | 'chemistry', text: string) => {
    if (type === 'cbc') {
      setCbcText(text);
      if (text.trim()) {
        const cbcPanel = parseCBCTable(text);
        onUpdate({
          ...patient,
          roundingData: {
            ...patient.roundingData,
            labResults: {
              ...patient.roundingData?.labResults,
              cbc: cbcPanel,
              lastUpdated: new Date(),
            },
          },
        });
      }
    } else {
      setChemText(text);
      if (text.trim()) {
        const chemPanel = parseChemistryTable(text);
        onUpdate({
          ...patient,
          roundingData: {
            ...patient.roundingData,
            labResults: {
              ...patient.roundingData?.labResults,
              chemistry: chemPanel,
              lastUpdated: new Date(),
            },
          },
        });
      }
    }
  };

  /**
   * Handle chest X-ray findings
   */
  const handleChestXrayChange = (findings: string) => {
    setChestXrayFindings(findings);
    onUpdate({
      ...patient,
      roundingData: {
        ...patient.roundingData,
        chestXray: {
          findings: findings || 'NSF',
          date: new Date(),
        },
      },
    });
  };

  /**
   * Handle MRI data changes
   */
  const handleMRIChange = (field: keyof MRIData, value: any) => {
    const updatedMRIData: MRIData = {
      ...patient.mriData,
      [field]: value,
      autoCalculate: true,
    };

    // Auto-calculate NPO time if scheduled time changes
    if (field === 'scheduledTime' && value) {
      updatedMRIData.npoTime = getDefaultNPOTime(value);
    }

    onUpdate({
      ...patient,
      mriData: updatedMRIData,
    });
  };

  /**
   * Handle sticker data changes
   */
  const handleStickerChange = (field: keyof StickerData, value: any) => {
    const updatedStickerData: StickerData = {
      ...patient.stickerData,
      [field]: value,
    } as StickerData;

    onUpdate({
      ...patient,
      stickerData: updatedStickerData,
    });
  };

  /**
   * Generate all outputs at once
   */
  const handleGenerateAllOutputs = async () => {
    setIsGenerating(true);
    try {
      // Save patient data first if onSave provided
      if (onSave) {
        await onSave(patient);
      }

      // Generate Rounding Sheet (for single patient)
      await downloadRoundingSheetPDF([patient], `${patient.demographics.name}-rounding-sheet.pdf`);

      // Generate MRI Anesthesia Sheet (if MRI scheduled)
      if (patient.mriData?.scanType) {
        await downloadMRISheetPDF(patient);
      }

      // Generate Stickers (if sticker data exists)
      if (patient.stickerData) {
        await downloadAllStickersPDF(patient);
      }

      alert('All outputs generated successfully!');
    } catch (error) {
      console.error('Error generating outputs:', error);
      alert('Error generating outputs. Please check console for details.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6 p-6 bg-white rounded-lg shadow-md">
      {/* Header */}
      <div className="border-b pb-4">
        <h2 className="text-2xl font-bold text-gray-900">{patient.demographics.name}</h2>
        <p className="text-sm text-gray-600">
          {patient.demographics.age} {patient.demographics.sex} {patient.demographics.breed} ({patient.demographics.weight})
        </p>
        {patient.demographics.ownerName && (
          <p className="text-sm text-gray-600">Owner: {patient.demographics.ownerName}</p>
        )}
      </div>

      {/* Auto-populated fields info */}
      <div className="bg-emerald-50 border border-emerald-200 rounded-md p-4">
        <h3 className="text-sm font-semibold text-emerald-800 mb-2">✅ Auto-Populated from VetRadar</h3>
        <ul className="text-xs text-emerald-700 space-y-1">
          <li>• Demographics (name, age, sex, breed, weight)</li>
          <li>• Current medications and dosing</li>
          <li>• Vital signs and location</li>
          <li>• Problems/issues from VetRadar</li>
          <li>• Code status and treatment completion</li>
        </ul>
      </div>

      {/* Manual Entry Section */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">Manual Entry (5-7 fields, ~17-37 seconds)</h3>

        {/* 1. Neurologic Localization */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            1. Neurologic Localization <span className="text-gray-400 text-xs">(Optional)</span>
          </label>
          <select
            value={patient.roundingData?.neurolocalization || ''}
            onChange={(e) => handleLocalizationChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Select localization...</option>
            <option value="C1-C5">C1-C5 (Cervical 1-5)</option>
            <option value="C6-T2">C6-T2 (Cervical 6 - Thoracic 2)</option>
            <option value="T3-L3">T3-L3 (Thoracic 3 - Lumbar 3)</option>
            <option value="L4-S3">L4-S3 (Lumbar 4 - Sacral 3)</option>
            <option value="Forebrain">Forebrain</option>
            <option value="Brainstem">Brainstem</option>
            <option value="Cerebellum">Cerebellum</option>
            <option value="Vestibular">Vestibular</option>
            <option value="Neuromuscular Junction">Neuromuscular Junction</option>
            <option value="Peripheral Neuropathy">Peripheral Neuropathy</option>
            <option value="Myopathy">Myopathy</option>
            <option value="Multifocal">Multifocal</option>
            <option value="Unknown">Unknown</option>
          </select>
        </div>

        {/* 2. Lab Results (Paste from EasyVet) */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            2. Lab Results (Paste from EasyVet) <span className="text-gray-400 text-xs">(Optional)</span>
          </label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-600 mb-1">CBC Table</label>
              <textarea
                value={cbcText}
                onChange={(e) => handleLabPaste('cbc', e.target.value)}
                placeholder="Paste CBC table from EasyVet..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-xs"
                rows={6}
              />
              {patient.roundingData?.labResults?.cbc && (
                <p className="text-xs text-emerald-600 mt-1">
                  ✓ Parsed {patient.roundingData.labResults.cbc.values.length} values
                </p>
              )}
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Chemistry Table</label>
              <textarea
                value={chemText}
                onChange={(e) => handleLabPaste('chemistry', e.target.value)}
                placeholder="Paste Chemistry table from EasyVet..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-xs"
                rows={6}
              />
              {patient.roundingData?.labResults?.chemistry && (
                <p className="text-xs text-emerald-600 mt-1">
                  ✓ Parsed {patient.roundingData.labResults.chemistry.values.length} values
                </p>
              )}
            </div>
          </div>
        </div>

        {/* 3. Chest X-ray Findings */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            3. Chest X-Ray Findings (Optional - defaults to "NSF")
          </label>
          <input
            type="text"
            value={chestXrayFindings}
            onChange={(e) => handleChestXrayChange(e.target.value)}
            placeholder="NSF (No Significant Findings)"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          <p className="text-xs text-gray-500">Only enter if abnormal findings present</p>
        </div>

        {/* 4. MRI-Specific Fields (only if MRI scheduled) */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            4. MRI-Specific Fields (Only if MRI Scheduled)
          </label>
          <div className="border border-gray-200 rounded-md p-4 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-600 mb-1">MRI Region <span className="text-gray-400 text-xs">(Optional)</span></label>
                <select
                  value={patient.mriData?.scanType || ''}
                  onChange={(e) => handleMRIChange('scanType', e.target.value as MRIData['scanType'])}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select region...</option>
                  <option value="Brain">Brain</option>
                  <option value="C-Spine">C-Spine (Cervical)</option>
                  <option value="T-Spine">T-Spine (Thoracic)</option>
                  <option value="LS">LS (Lumbosacral)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">ASA Status <span className="text-gray-400 text-xs">(Optional)</span></label>
                <select
                  value={patient.mriData?.asaStatus || ''}
                  onChange={(e) => handleMRIChange('asaStatus', parseInt(e.target.value) as MRIData['asaStatus'])}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select ASA...</option>
                  <option value="1">1 - Normal healthy patient</option>
                  <option value="2">2 - Mild systemic disease</option>
                  <option value="3">3 - Severe systemic disease</option>
                  <option value="4">4 - Severe disease, constant threat to life</option>
                  <option value="5">5 - Moribund patient</option>
                </select>
              </div>
            </div>

            {/* Auto-calculated doses display */}
            {patient.mriData?.calculatedDoses && (
              <div className="bg-blue-50 border border-blue-200 rounded-md p-3 mt-3">
                <p className="text-xs font-semibold text-blue-800 mb-2">Auto-Calculated Doses:</p>
                <ul className="text-xs text-blue-700 space-y-1">
                  <li>• {patient.mriData.calculatedDoses.opioid.name}: {patient.mriData.calculatedDoses.opioid.doseMg}mg ({patient.mriData.calculatedDoses.opioid.volumeMl}mL)</li>
                  <li>• Valium: {patient.mriData.calculatedDoses.valium.doseMg}mg ({patient.mriData.calculatedDoses.valium.volumeMl}mL)</li>
                  <li>• Contrast: {patient.mriData.calculatedDoses.contrast.volumeMl}mL</li>
                </ul>
              </div>
            )}
          </div>
        </div>

        {/* 5. Sticker Flags */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            5. Sticker Flags <span className="text-gray-400 text-xs">(Optional)</span>
          </label>
          <div className="border border-gray-200 rounded-md p-4 space-y-3">
            <div className="flex items-center space-x-6">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={patient.stickerData?.isNewAdmit || false}
                  onChange={(e) => handleStickerChange('isNewAdmit', e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">New Admit (6 big + 1 tiny sheet)</span>
              </label>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={patient.stickerData?.isSurgery || false}
                  onChange={(e) => handleStickerChange('isSurgery', e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Surgery (5 big + 2 tiny sheets)</span>
              </label>
            </div>

            {/* Auto-calculated sticker counts */}
            {patient.stickerData && (
              <div className="bg-purple-50 border border-purple-200 rounded-md p-3 mt-3">
                <p className="text-xs font-semibold text-purple-800">
                  Auto-Calculated: {getStickerSummary(patient.stickerData)}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Save Patient Button */}
      <div className="pt-6 border-t">
        <button
          onClick={async () => {
            if (onSave) {
              await onSave(patient);
            }
          }}
          disabled={isGenerating}
          className="w-full py-3 px-4 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 focus:ring-4 focus:ring-blue-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          Save Patient
        </button>

        <div className="mt-3 text-xs text-gray-600 text-center">
          <p>Fields can be edited later from the patient card or rounding sheets</p>
        </div>
      </div>
    </div>
  );
}
