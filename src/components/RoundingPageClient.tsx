'use client';

import { useEffect, useState } from 'react';
import { ArrowLeft, FileSpreadsheet, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { usePatientContext } from '@/contexts/PatientContext';
import { useCommonItems } from '@/hooks/use-api';
import { useToast } from '@/hooks/use-toast';

// Use new RoundingSheet that matches Google Sheets layout
const RoundingSheet = dynamic(() => import('@/components/RoundingSheet').then(mod => ({ default: mod.RoundingSheet })), {
  ssr: false,
  loading: () => <div className="text-white p-4">Loading rounding sheet...</div>
});

const GlobalKeyboardHandler = dynamic(() => import('@/components/GlobalKeyboardHandler').then(mod => ({ default: mod.GlobalKeyboardHandler })), {
  ssr: false
});

export function RoundingPageClient() {
  const [mounted, setMounted] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const { patients, loadPatients } = usePatientContext();
  const { medications: commonMedications } = useCommonItems();
  const { toast } = useToast();

  console.log('[RoundingPageClient] Patients from context:', patients?.length, patients);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSyncFromVetRadar = async () => {
    setSyncing(true);
    try {
      const response = await fetch('/api/integrations/vetradar/patients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: process.env.NEXT_PUBLIC_VETRADAR_EMAIL,
          password: process.env.NEXT_PUBLIC_VETRADAR_PASSWORD,
        }),
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: "✅ Synced from VetRadar",
          description: `Updated ${result.patients.length} patient(s) with latest medications and treatments.`,
        });
        await loadPatients(); // Refresh patient list
      } else {
        toast({
          title: "❌ Sync Failed",
          description: result.errors?.join(', ') || 'Could not sync from VetRadar',
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "❌ Sync Error",
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: "destructive",
      });
    } finally {
      setSyncing(false);
    }
  };

  if (!mounted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-emerald-900 to-slate-900 flex items-center justify-center">
        <div className="text-emerald-400 text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <>
      <GlobalKeyboardHandler />
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-emerald-900 to-slate-900">
        <header className="bg-slate-800/50 backdrop-blur-xl border-b border-slate-700/50 sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/"
                className="flex items-center gap-2 px-4 py-2 text-slate-300 hover:text-emerald-400 transition rounded-lg hover:bg-slate-700/50 border border-transparent hover:border-emerald-500/30"
              >
                <ArrowLeft size={18} />
                Back to VetHub
              </Link>
            </div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent flex items-center gap-2">
              <FileSpreadsheet size={24} />
              Rounding Sheet
            </h1>
            <div className="flex items-center gap-2">
              <button
                onClick={handleSyncFromVetRadar}
                disabled={syncing}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-800 text-white rounded-lg transition border border-emerald-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Sync medications and treatments from VetRadar"
              >
                <RefreshCw size={18} className={syncing ? 'animate-spin' : ''} />
                {syncing ? 'Syncing...' : 'Sync VetRadar'}
              </button>
            </div>
          </div>
        </header>

        <main className="max-w-[98%] mx-auto px-4 py-8">
          <RoundingSheet
            patients={patients}
            toast={toast}
            onPatientUpdate={loadPatients}
          />
        </main>
      </div>
    </>
  );
}
