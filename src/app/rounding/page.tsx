'use client';

import { useEffect, useState } from 'react';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { RoundingPageClient } from '@/components/RoundingPageClient';

export default function RoundingPage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-emerald-900 to-slate-900 flex items-center justify-center">
        <div className="text-emerald-400 text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <RoundingPageClient />
    </ErrorBoundary>
  );
}

// Disable SSR and static generation completely
export const dynamic = 'force-dynamic';
