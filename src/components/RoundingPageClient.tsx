'use client';

import { useEffect, useState, useCallback } from 'react';
import { ArrowLeft, FileSpreadsheet } from 'lucide-react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { usePatientContext } from '@/contexts/PatientContext';
import { useCommonItems } from '@/hooks/use-api';
import { useToast } from '@/hooks/use-toast';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { ROUNDING_STORAGE_KEYS } from '@/lib/constants';
import type { RoundingPatient } from '@/types/rounding';

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
  const { patients, loadPatients } = usePatientContext();
  const { medications: commonMedications } = useCommonItems();
  const { toast } = useToast();

  // Check for unsaved changes by looking at localStorage backup
  // This is the source of truth since RoundingSheet saves pending edits there
  const checkForUnsavedChanges = useCallback((): boolean => {
    if (typeof window === 'undefined') return false;
    try {
      const backup = localStorage.getItem(ROUNDING_STORAGE_KEYS.BACKUP);
      if (!backup) return false;
      const parsed = JSON.parse(backup);
      return Object.keys(parsed).length > 0;
    } catch {
      return false;
    }
  }, []);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Navigation Guard: Client-side routing blocker
  useEffect(() => {
    const handleRouteChange = (e: Event) => {
      if (checkForUnsavedChanges()) {
        const confirmed = confirm(
          'You have unsaved changes in the rounding sheet. Are you sure you want to leave?'
        );
        if (!confirmed) {
          e.preventDefault();
          e.stopPropagation();
        }
      }
    };

    window.addEventListener('popstate', handleRouteChange);
    return () => window.removeEventListener('popstate', handleRouteChange);
  }, [checkForUnsavedChanges]);

  // Neo-pop styling constants
  const NEO_BORDER = '2px solid #000';
  const NEO_SHADOW = '6px 6px 0 #000';
  const NEO_SHADOW_SM = '4px 4px 0 #000';
  const COLORS = {
    lavender: '#DCC4F5',
    mint: '#B8E6D4',
    pink: '#FFBDBD',
    cream: '#FFF8F0',
  };

  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: COLORS.cream }}>
        <div
          className="px-6 py-3 rounded-xl font-bold text-gray-900"
          style={{ backgroundColor: COLORS.mint, border: NEO_BORDER, boxShadow: NEO_SHADOW_SM }}
        >
          Loading...
        </div>
      </div>
    );
  }

  return (
    <>
      <GlobalKeyboardHandler />
      <div className="min-h-screen" style={{ backgroundColor: COLORS.cream }}>
        {/* Neo-pop Header */}
        <header
          className="sticky top-0 z-50"
          style={{ backgroundColor: 'white', borderBottom: NEO_BORDER }}
        >
          <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
            <Link
              href="/"
              onClick={(e) => {
                if (checkForUnsavedChanges()) {
                  const confirmed = confirm(
                    'You have unsaved changes. Are you sure you want to leave the rounding sheet?'
                  );
                  if (!confirmed) {
                    e.preventDefault();
                  }
                }
              }}
              className="flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-gray-900 transition hover:-translate-y-0.5"
              style={{ backgroundColor: COLORS.lavender, border: NEO_BORDER, boxShadow: '3px 3px 0 #000' }}
            >
              <ArrowLeft size={18} />
              Back
            </Link>

            <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
              <FileSpreadsheet size={24} style={{ color: '#6BB89D' }} />
              Rounding Sheet
            </h1>

            {/* Spacer to balance header */}
            <div className="w-[88px]"></div>
          </div>
        </header>

        <main className="max-w-[98%] mx-auto px-4 py-6">
          <ErrorBoundary fallback={<RoundingErrorFallback />}>
            <RoundingSheet
              patients={patients as RoundingPatient[]}
              toast={toast}
              onPatientUpdate={loadPatients}
            />
          </ErrorBoundary>
        </main>
      </div>
    </>
  );
}

function RoundingErrorFallback() {
  return (
    <div
      className="rounded-2xl p-6 text-center max-w-2xl mx-auto mt-8"
      style={{ backgroundColor: '#FFBDBD', border: '2px solid #000', boxShadow: '6px 6px 0 #000' }}
    >
      <h3 className="text-gray-900 font-black text-xl mb-2">Rounding Sheet Error</h3>
      <p className="text-gray-700 mb-4">
        Unable to load rounding sheet. This may be due to corrupt patient data or a temporary issue.
      </p>
      <button
        onClick={() => window.location.reload()}
        className="px-6 py-2 rounded-xl font-bold text-gray-900 transition hover:-translate-y-0.5"
        style={{ backgroundColor: 'white', border: '2px solid #000', boxShadow: '3px 3px 0 #000' }}
      >
        Refresh Page
      </button>
    </div>
  );
}
