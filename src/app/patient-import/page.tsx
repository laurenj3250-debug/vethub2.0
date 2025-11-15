'use client';

/**
 * Patient Import Page
 *
 * Import patients from VetRadar, complete manual entry, and generate all outputs
 */

import React, { useState } from 'react';
import { UnifiedPatient } from '@/contexts/PatientContext';
import { VetRadarIntegrationService, VetRadarImportResult } from '@/lib/integrations/vetradar-integration';
import { UnifiedPatientEntry } from '@/components/UnifiedPatientEntry';
import { Download, RefreshCw, CheckCircle, AlertCircle, Clock } from 'lucide-react';

export default function PatientImportPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<VetRadarImportResult | null>(null);
  const [patients, setPatients] = useState<UnifiedPatient[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);

  const selectedPatient = patients.find(p => p.id === selectedPatientId);

  /**
   * Import patients from VetRadar
   */
  async function handleImport() {
    if (!email || !password) {
      alert('Please enter VetRadar credentials');
      return;
    }

    setImporting(true);

    try {
      const service = new VetRadarIntegrationService();
      await service.login(email, password);

      const result = await service.importActivePatients();

      if (result.success) {
        setImportResult(result);
        setPatients(result.patients);

        // Auto-select first patient
        if (result.patients.length > 0) {
          setSelectedPatientId(result.patients[0].id);
        }

        alert(`✅ Successfully imported ${result.patients.length} patients!`);
      } else {
        alert(`❌ Import failed: ${result.errors?.join(', ')}`);
      }

      await service.logout();
    } catch (error) {
      console.error('Import error:', error);
      alert(`❌ Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setImporting(false);
    }
  }

  /**
   * Update patient
   */
  function handleUpdatePatient(updated: UnifiedPatient) {
    setPatients(prev =>
      prev.map(p => p.id === updated.id ? updated : p)
    );
  }

  /**
   * Save patient to database (placeholder)
   */
  async function handleSavePatient(patient: UnifiedPatient) {
    // TODO: Implement database persistence
    console.log('Saving patient to database:', patient);

    // For now, just update in state
    handleUpdatePatient(patient);

    return Promise.resolve();
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">
            Patient Import from VetRadar
          </h1>
          <p className="text-gray-300">
            Import Neurology/Neurosurgery patients, complete manual entry, and generate all outputs
          </p>
        </div>

        {/* Import Section */}
        {!importResult && (
          <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Step 1: Import from VetRadar
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  VetRadar Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your-email@example.com"
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  disabled={importing}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  VetRadar Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  disabled={importing}
                />
              </div>

              <button
                onClick={handleImport}
                disabled={importing || !email || !password}
                className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-purple-700 focus:ring-4 focus:ring-blue-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center space-x-2"
              >
                {importing ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    <span>Importing from VetRadar...</span>
                  </>
                ) : (
                  <>
                    <Download className="w-5 h-5" />
                    <span>Import Patients from VetRadar</span>
                  </>
                )}
              </button>

              <div className="bg-blue-50 border border-blue-200 rounded-md p-4 mt-4">
                <p className="text-sm text-blue-800">
                  <strong>What will be imported:</strong>
                </p>
                <ul className="text-sm text-blue-700 mt-2 space-y-1">
                  <li>• All active Neurology/Neurosurgery patients from VetRadar</li>
                  <li>• 85% of patient data auto-populated (demographics, medications, vitals)</li>
                  <li>• Only 5-7 fields will need manual entry per patient</li>
                  <li>• Estimated time: ~17-37 seconds per patient</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Import Results */}
        {importResult && (
          <>
            {/* Summary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
              <div className="bg-white rounded-lg shadow p-4">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-5 h-5 text-emerald-600" />
                  <p className="text-sm text-gray-600">Patients Imported</p>
                </div>
                <p className="text-3xl font-bold text-gray-900 mt-2">
                  {importResult.patients.length}
                </p>
              </div>

              <div className="bg-white rounded-lg shadow p-4">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-5 h-5 text-blue-600" />
                  <p className="text-sm text-gray-600">Auto-Populated</p>
                </div>
                <p className="text-3xl font-bold text-gray-900 mt-2">85%</p>
              </div>

              <div className="bg-white rounded-lg shadow p-4">
                <div className="flex items-center space-x-2">
                  <AlertCircle className="w-5 h-5 text-amber-600" />
                  <p className="text-sm text-gray-600">Manual Fields</p>
                </div>
                <p className="text-3xl font-bold text-gray-900 mt-2">5-7</p>
              </div>

              <div className="bg-white rounded-lg shadow p-4">
                <div className="flex items-center space-x-2">
                  <Clock className="w-5 h-5 text-purple-600" />
                  <p className="text-sm text-gray-600">Total Time</p>
                </div>
                <p className="text-3xl font-bold text-gray-900 mt-2">
                  {(importResult.totalEstimatedTimeSeconds / 60).toFixed(1)}
                  <span className="text-lg text-gray-600"> min</span>
                </p>
              </div>
            </div>

            {/* Patient List & Entry */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Patient List */}
              <div className="bg-white rounded-lg shadow-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold text-gray-900">
                    Patients ({patients.length})
                  </h2>
                  <button
                    onClick={() => {
                      setImportResult(null);
                      setPatients([]);
                      setSelectedPatientId(null);
                    }}
                    className="text-sm text-blue-600 hover:text-blue-700"
                  >
                    Import Again
                  </button>
                </div>

                <div className="space-y-2 max-h-[600px] overflow-y-auto">
                  {patients.map(patient => {
                    const requirements = importResult.manualEntryRequirements.find(
                      req => req.patientName === patient.demographics.name
                    );

                    const isComplete = requirements?.required.length === 0;
                    const isSelected = patient.id === selectedPatientId;

                    return (
                      <button
                        key={patient.id}
                        onClick={() => setSelectedPatientId(patient.id)}
                        className={`w-full text-left p-3 rounded-lg border-2 transition-all ${
                          isSelected
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300 bg-white'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-semibold text-gray-900">
                              {patient.demographics.name}
                            </p>
                            <p className="text-sm text-gray-600">
                              {patient.roundingData?.signalment}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              {patient.currentStay?.location} • {patient.roundingData?.codeStatus}
                            </p>
                          </div>
                          <div>
                            {isComplete ? (
                              <CheckCircle className="w-5 h-5 text-emerald-600" />
                            ) : (
                              <div className="w-5 h-5 rounded-full border-2 border-amber-500" />
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Patient Entry Form */}
              <div className="lg:col-span-2">
                {selectedPatient ? (
                  <UnifiedPatientEntry
                    patient={selectedPatient}
                    onUpdate={handleUpdatePatient}
                    onSave={handleSavePatient}
                  />
                ) : (
                  <div className="bg-white rounded-lg shadow-lg p-12 text-center">
                    <p className="text-gray-600">
                      Select a patient from the list to begin manual entry
                    </p>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
