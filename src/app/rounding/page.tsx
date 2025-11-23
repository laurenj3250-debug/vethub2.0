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
      <div className="min-h-screen bg-[#FFF8F0] flex items-center justify-center">
        <div
          className="px-6 py-3 rounded-xl font-bold text-gray-900"
          style={{ backgroundColor: '#B8E6D4', border: '2px solid #000', boxShadow: '4px 4px 0 #000' }}
        >
          Loading...
        </div>
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
