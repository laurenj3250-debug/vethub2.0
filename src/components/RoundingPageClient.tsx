'use client';

import { useEffect, useState } from 'react';
import { ArrowLeft, FileSpreadsheet } from 'lucide-react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { usePatientContext } from '@/contexts/PatientContext';
import { useCommonItems } from '@/hooks/use-api';
import { useToast } from '@/hooks/use-toast';

// Dynamically import the heavy component to avoid initialization issues
const EnhancedRoundingSheet = dynamic(() => import('@/components/EnhancedRoundingSheet').then(mod => ({ default: mod.EnhancedRoundingSheet })), {
  ssr: false,
  loading: () => <div className="text-white p-4">Loading rounding sheet...</div>
});

const GlobalKeyboardHandler = dynamic(() => import('@/components/GlobalKeyboardHandler').then(mod => ({ default: mod.GlobalKeyboardHandler })), {
  ssr: false
});

export function RoundingPageClient() {
  console.log('[RoundingPageClient] Component rendering...');
  const [mounted, setMounted] = useState(false);
  console.log('[RoundingPageClient] About to call usePatientContext...');
  const { patients, loadPatients } = usePatientContext();
  console.log('[RoundingPageClient] usePatientContext returned, patients:', patients.length);
  console.log('[RoundingPageClient] About to call useCommonItems...');
  const { medications: commonMedications } = useCommonItems();
  console.log('[RoundingPageClient] useCommonItems returned, medications:', commonMedications.length);
  const { toast } = useToast();

  useEffect(() => {
    console.log('[RoundingPageClient] useEffect mounting...');
    setMounted(true);
  }, []);

  console.log('[RoundingPageClient] Render state - mounted:', mounted, 'patients:', patients.length);

  if (!mounted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-emerald-900 to-slate-900 flex items-center justify-center">
        <div className="text-emerald-400 text-xl">Loading...</div>
      </div>
    );
  }

  // TEMPORARY: Minimal UI to test if the error is in EnhancedRoundingSheet
  return (
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
          <div className="w-32"></div>
        </div>
      </header>

      <main className="max-w-[98%] mx-auto px-4 py-8">
        <div className="text-white text-center p-8">
          <h2 className="text-2xl mb-4">DEBUG: Minimal Rounding Page</h2>
          <p className="mb-2">Patients loaded: {patients.length}</p>
          <p className="mb-2">Medications loaded: {commonMedications.length}</p>
          <p className="text-emerald-400">If you see this, the page loads successfully!</p>
          <p className="text-sm text-slate-400 mt-4">The error was in EnhancedRoundingSheet component</p>
        </div>
      </main>
    </div>
  );
}
