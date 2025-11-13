'use client';

import { ArrowLeft, FileSpreadsheet } from 'lucide-react';
import Link from 'next/link';
import { usePatientContext } from '@/contexts/PatientContext';
import { useCommonItems } from '@/hooks/use-api';
import { EnhancedRoundingSheet } from '@/components/EnhancedRoundingSheet';
import { useToast } from '@/hooks/use-toast';
import { GlobalKeyboardHandler } from '@/components/GlobalKeyboardHandler';

export function RoundingPageClient() {
  const { patients, loadPatients } = usePatientContext();
  const { medications: commonMedications } = useCommonItems();
  const { toast } = useToast();

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
          <div className="w-32"></div> {/* Spacer for centering */}
        </div>
      </header>

      <main className="max-w-[98%] mx-auto px-4 py-8">
        <EnhancedRoundingSheet
          patients={patients}
          commonMedications={commonMedications}
          toast={toast}
          onPatientClick={(id) => {
            // Could implement patient detail modal here if needed
            console.log('Patient clicked:', id);
          }}
          onPatientUpdate={loadPatients}
        />
      </main>
    </div>
    </>
  );
}
