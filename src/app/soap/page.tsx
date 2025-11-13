'use client';

import { ArrowLeft, FileText } from 'lucide-react';
import Link from 'next/link';
import { usePatientContext } from '@/contexts/PatientContext';
import { SOAPBuilder } from '@/components/SOAPBuilder';
import { useToast } from '@/hooks/use-toast';

// Disable static generation to avoid build-time circular dependency
export const dynamic = 'force-dynamic';

export default function SOAPBuilderPage() {
  const { patients, loadPatients } = usePatientContext();
  const { toast } = useToast();

  const handleSave = async (data: any) => {
    // The SOAPBuilder component already handles saving via context
    // This callback is for additional actions if needed
    await loadPatients(); // Refresh from context
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <header className="bg-slate-800/50 backdrop-blur-xl border-b border-slate-700/50 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="flex items-center gap-2 px-4 py-2 text-slate-300 hover:text-purple-400 transition rounded-lg hover:bg-slate-700/50 border border-transparent hover:border-purple-500/30"
            >
              <ArrowLeft size={18} />
              Back to VetHub
            </Link>
          </div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent flex items-center gap-2">
            <FileText size={24} />
            SOAP Builder
          </h1>
          <div className="w-32"></div> {/* Spacer for centering */}
        </div>
      </header>

      <main className="max-w-[98%] mx-auto px-4 py-8">
        <SOAPBuilder
          patients={patients}
          onSave={handleSave}
        />
      </main>
    </div>
  );
}
