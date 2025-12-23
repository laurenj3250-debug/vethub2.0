'use client';

import { PatientProvider } from '@/contexts/PatientContext';
import { Toaster } from './ui/toaster';
import { PillCalculator } from './PillCalculator';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <PatientProvider>
      {children}
      <Toaster />
      <PillCalculator />
    </PatientProvider>
  );
}
