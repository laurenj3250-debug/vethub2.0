'use client';

import { Suspense, lazy, useEffect, useState } from 'react';
import { ErrorBoundary } from '@/components/ErrorBoundary';

// Lazy load the client component to avoid circular dependency
const SOAPPageClient = lazy(() => import('@/components/SOAPPageClient').then(mod => ({ default: mod.SOAPPageClient })));

export default function SOAPBuilderPage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-purple-400 text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <ErrorBoundary fallback={<SOAPErrorFallback />}>
      <Suspense fallback={
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
          <div className="text-purple-400 text-xl">Loading...</div>
        </div>
      }>
        <SOAPPageClient />
      </Suspense>
    </ErrorBoundary>
  );
}

function SOAPErrorFallback() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-8">
      <div className="bg-slate-800/50 backdrop-blur-xl border border-red-500 rounded-lg p-6 max-w-md text-center">
        <h3 className="text-red-400 font-bold mb-2">SOAP Builder Error</h3>
        <p className="text-slate-300 mb-4">
          Unable to load SOAP Builder. Please refresh the page or try again.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition"
        >
          Refresh Page
        </button>
      </div>
    </div>
  );
}

// Disable SSR and static generation completely
export const dynamic = 'force-dynamic';
