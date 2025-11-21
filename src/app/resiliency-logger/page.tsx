'use client';

import React, { useState, useEffect } from 'react';
import { ResiliencyLogger } from '@/components/ResiliencyLogger';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';

interface Patient {
  id: number;
  demographics: {
    name: string;
    species?: string;
  };
  status: string;
}

export default function ResiliencyLoggerPage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchPatients();
  }, []);

  const fetchPatients = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/patients');
      if (!response.ok) throw new Error('Failed to fetch patients');
      const data = await response.json();

      // Filter to active patients only
      const activePatients = data.filter((p: Patient) => p.status !== 'Discharged');
      setPatients(activePatients);

      // Auto-select first patient if available
      if (activePatients.length > 0) {
        setSelectedPatientId(activePatients[0].id);
      }
    } catch (error) {
      console.error('Error fetching patients:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const selectedPatient = patients.find(p => p.id === selectedPatientId);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-emerald-900/20 to-slate-900 p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Page Header */}
        <div className="space-y-2">
          <h1 className="text-4xl font-bold text-slate-100">Resiliency Logger</h1>
          <p className="text-slate-400">
            Track and document patient resilience observations across sessions
          </p>
        </div>

        {/* Patient Selector */}
        <Card className="bg-slate-800/50 border-slate-700 p-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300">Select Patient</label>
            {isLoading ? (
              <div className="text-slate-400">Loading patients...</div>
            ) : patients.length === 0 ? (
              <div className="text-slate-400">No active patients found</div>
            ) : (
              <Select
                value={selectedPatientId?.toString() || ''}
                onValueChange={(value) => setSelectedPatientId(parseInt(value))}
              >
                <SelectTrigger className="bg-slate-900/50 border-slate-600 text-slate-100">
                  <SelectValue placeholder="Choose a patient..." />
                </SelectTrigger>
                <SelectContent>
                  {patients.map(patient => (
                    <SelectItem key={patient.id} value={patient.id.toString()}>
                      {patient.demographics.name}
                      {patient.demographics.species && ` (${patient.demographics.species})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </Card>

        {/* Resiliency Logger Component */}
        {selectedPatientId && selectedPatient && (
          <ResiliencyLogger
            patientId={selectedPatientId}
            patientName={selectedPatient.demographics.name}
          />
        )}

        {!selectedPatientId && !isLoading && patients.length > 0 && (
          <Card className="bg-slate-800/50 border-slate-700 p-8">
            <p className="text-center text-slate-400">
              Select a patient above to view and manage resiliency entries
            </p>
          </Card>
        )}
      </div>
    </div>
  );
}
