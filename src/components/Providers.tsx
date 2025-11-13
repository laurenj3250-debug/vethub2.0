'use client';

import { PatientProvider } from '@/contexts/PatientContext';
import { Toaster } from './ui/toaster';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <PatientProvider>
      {children}
      <Toaster />
    </PatientProvider>
  );
}
