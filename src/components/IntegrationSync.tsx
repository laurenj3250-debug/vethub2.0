'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { usePatientContext } from '@/contexts/PatientContext';
import { Loader2, RefreshCw, CheckCircle2, XCircle, Download } from 'lucide-react';

interface Patient {
  id: string;
  name: string;
  demographics: {
    species: string;
    breed: string;
    age: string;
    weight: number;
  };
}

export function IntegrationSync() {
  const [syncing, setSyncing] = useState(false);
  const [testing, setTesting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [vetRadarPatients, setVetRadarPatients] = useState<any[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<{
    ezyvet?: boolean;
    vetradar?: boolean;
  }>({});
  const { toast } = useToast();
  const { importPatientsFromVetRadar } = usePatientContext();

  const testEzyVetConnection = async () => {
    setTesting(true);
    try {
      const response = await fetch('/api/integrations/ezyvet/test');
      const data = await response.json();

      setConnectionStatus(prev => ({ ...prev, ezyvet: data.success }));

      toast({
        title: data.success ? 'EzyVet Connected' : 'EzyVet Connection Failed',
        description: data.message,
        variant: data.success ? 'default' : 'destructive',
      });
    } catch (error) {
      setConnectionStatus(prev => ({ ...prev, ezyvet: false }));
      toast({
        title: 'Connection Error',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setTesting(false);
    }
  };

  const syncFromEzyVet = async () => {
    setSyncing(true);
    try {
      const response = await fetch('/api/integrations/ezyvet/patients');
      const data = await response.json();

      if (data.success) {
        setPatients(data.data);
        toast({
          title: 'Sync Complete',
          description: `Imported ${data.count} patients from EzyVet`,
        });
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      toast({
        title: 'Sync Failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setSyncing(false);
    }
  };

  const syncFromVetRadar = async () => {
    setSyncing(true);
    try {
      const response = await fetch('/api/integrations/vetradar/patients');
      const data = await response.json();

      if (data.success) {
        setVetRadarPatients(data.patients || []);
        toast({
          title: 'VetRadar Sync Complete',
          description: `Found ${data.count} active patients. Click "Import to VetHub" to add them.`,
        });
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      toast({
        title: 'VetRadar Sync Failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setSyncing(false);
    }
  };

  const importVetRadarPatients = async () => {
    if (vetRadarPatients.length === 0) {
      toast({
        title: 'No Patients to Import',
        description: 'Please sync from VetRadar first.',
        variant: 'destructive',
      });
      return;
    }

    setImporting(true);
    try {
      const results = await importPatientsFromVetRadar(vetRadarPatients);

      toast({
        title: 'Import Complete',
        description: `Imported ${results.imported} patients. Skipped ${results.skipped} duplicates.${results.errors.length > 0 ? ` ${results.errors.length} errors.` : ''}`,
        variant: results.errors.length > 0 ? 'destructive' : 'default',
      });

      // Clear VetRadar patients after import
      if (results.imported > 0) {
        setVetRadarPatients([]);
      }
    } catch (error) {
      toast({
        title: 'Import Failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Connection Status */}
      <Card className="p-6 bg-slate-800 border-slate-700">
        <h3 className="text-xl font-semibold mb-4 text-white">Integration Status</h3>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-base text-gray-300">EzyVet</span>
              {connectionStatus.ezyvet !== undefined && (
                connectionStatus.ezyvet ? (
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-500" />
                )
              )}
            </div>
            <Button
              onClick={testEzyVetConnection}
              disabled={testing}
              variant="outline"
              size="sm"
              className="border-slate-600 text-slate-300 hover:bg-slate-700"
            >
              {testing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Testing...
                </>
              ) : (
                'Test Connection'
              )}
            </Button>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-base text-gray-300">VetRadar</span>
              {connectionStatus.vetradar !== undefined && (
                connectionStatus.vetradar ? (
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-500" />
                )
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* EzyVet Sync */}
      <Card className="p-6 bg-slate-800 border-slate-700">
        <h3 className="text-xl font-semibold mb-4 text-white">EzyVet Integration</h3>

        <p className="text-sm text-gray-400 mb-4">
          Sync active patients from EzyVet practice management system
        </p>

        <Button
          onClick={syncFromEzyVet}
          disabled={syncing}
          className="bg-emerald-600 hover:bg-emerald-700 text-white mb-4"
        >
          {syncing ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Syncing...
            </>
          ) : (
            <>
              <RefreshCw className="w-4 h-4 mr-2" />
              Sync Patients from EzyVet
            </>
          )}
        </Button>

        {patients.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm text-gray-400">
              Found {patients.length} active patients
            </p>

            <div className="max-h-96 overflow-y-auto space-y-2">
              {patients.map(patient => (
                <div
                  key={patient.id}
                  className="p-3 border border-slate-700 rounded bg-slate-900"
                >
                  <p className="font-medium text-white">{patient.demographics?.name || patient.name || 'Unnamed'}</p>
                  <p className="text-sm text-gray-400">
                    {patient.demographics?.species || patient.patient_info?.species || ''} - {patient.demographics?.breed || patient.patient_info?.breed || ''}
                  </p>
                  <p className="text-xs text-gray-500">
                    {patient.demographics?.age || patient.patient_info?.age || ''}, {patient.demographics?.weight || patient.patient_info?.weight || ''}kg
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>

      {/* VetRadar Sync */}
      <Card className="p-6 bg-slate-800 border-slate-700">
        <h3 className="text-xl font-semibold mb-4 text-white">VetRadar Integration</h3>

        <p className="text-sm text-gray-400 mb-4">
          Fetch active Neurology/Neurosurgery patients and import to VetHub
        </p>

        <div className="flex gap-3 mb-4">
          <Button
            onClick={syncFromVetRadar}
            disabled={syncing || importing}
            className="bg-purple-600 hover:bg-purple-700 text-white"
          >
            {syncing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Syncing...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4 mr-2" />
                Sync from VetRadar
              </>
            )}
          </Button>

          {vetRadarPatients.length > 0 && (
            <Button
              onClick={importVetRadarPatients}
              disabled={importing || syncing}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {importing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  Import {vetRadarPatients.length} to VetHub
                </>
              )}
            </Button>
          )}
        </div>

        {vetRadarPatients.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm text-gray-400">
              Ready to import {vetRadarPatients.length} patients from VetRadar
            </p>

            <div className="max-h-96 overflow-y-auto space-y-2">
              {vetRadarPatients.map((patient, idx) => (
                <div
                  key={idx}
                  className="p-3 border border-slate-700 rounded bg-slate-900"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="font-medium text-white">{patient.demographics?.name || patient.name || 'Unnamed'}</p>
                      <p className="text-sm text-gray-400">
                        {patient.demographics?.species || patient.species || ''} • {patient.demographics?.breed || patient.breed || 'Unknown breed'}
                      </p>
                      <p className="text-xs text-gray-500">
                        {patient.demographics?.age || patient.age || ''} | {patient.demographics?.sex || patient.sex || ''} | {patient.demographics?.weight || patient.weight || ''}kg
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Location: {patient.location}
                      </p>
                      {patient.medications && patient.medications.length > 0 && (
                        <p className="text-xs text-emerald-400 mt-1">
                          {patient.medications.length} medications
                        </p>
                      )}
                      {patient.issues && patient.issues.length > 0 && (
                        <p className="text-xs text-amber-400">
                          {patient.issues.length} clinical issues
                        </p>
                      )}
                    </div>
                    <div className="flex-shrink-0">
                      {patient.status && (
                        <span className={`px-2 py-1 text-xs rounded ${
                          patient.status.toLowerCase().includes('critical') || patient.status.toLowerCase().includes('caution')
                            ? 'bg-red-900/30 text-red-300'
                            : 'bg-green-900/30 text-green-300'
                        }`}>
                          {patient.status}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>

      {/* Setup Instructions */}
      <Card className="p-6 bg-slate-800 border-slate-700">
        <h3 className="text-xl font-semibold mb-4 text-white">Setup Instructions</h3>

        <div className="space-y-4 text-sm text-gray-300">
          <div>
            <h4 className="font-semibold text-white mb-2">1. EzyVet Setup</h4>
            <ol className="list-decimal list-inside space-y-1 text-gray-400">
              <li>Log in to your EzyVet account</li>
              <li>Go to Settings → API Access</li>
              <li>Generate an API key and note your Partner ID</li>
              <li>Add to .env.local: EZYVET_API_KEY and EZYVET_PARTNER_ID</li>
            </ol>
          </div>

          <div>
            <h4 className="font-semibold text-white mb-2">2. VetRadar Setup</h4>
            <ol className="list-decimal list-inside space-y-1 text-gray-400">
              <li>Get your VetRadar login credentials</li>
              <li>Add to .env.local: VETRADAR_USERNAME and VETRADAR_PASSWORD</li>
              <li>Restart the development server</li>
            </ol>
          </div>

          <div className="bg-slate-900 p-3 rounded border border-slate-700">
            <p className="text-xs text-gray-500 mb-2">Example .env.local:</p>
            <pre className="text-xs text-gray-400 font-mono">
{`EZYVET_API_KEY=your_api_key_here
EZYVET_PARTNER_ID=your_partner_id
VETRADAR_USERNAME=your_username
VETRADAR_PASSWORD=your_password`}
            </pre>
          </div>
        </div>
      </Card>
    </div>
  );
}
