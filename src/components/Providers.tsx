'use client';

import { PatientProvider } from '@/contexts/PatientContext';
import { GlobalKeyboardHandler } from './GlobalKeyboardHandler';
import { Toaster } from './ui/toaster';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <PatientProvider>
      {children}
      <Toaster />
      <GlobalKeyboardHandler />
    </PatientProvider>
  );
}
