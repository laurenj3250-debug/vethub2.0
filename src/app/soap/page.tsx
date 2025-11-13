'use client';

import { Suspense, lazy, useEffect, useState } from 'react';

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
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-purple-400 text-xl">Loading...</div>
      </div>
    }>
      <SOAPPageClient />
    </Suspense>
  );
}

// Disable SSR and static generation completely
export const dynamic = 'force-dynamic';
