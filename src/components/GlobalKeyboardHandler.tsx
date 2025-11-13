'use client';

import React, { useState, useEffect } from 'react';
import { QuickSwitcher } from './QuickSwitcher';
import { usePatientContext } from '@/contexts/PatientContext';

export function GlobalKeyboardHandler() {
  const [showQuickSwitcher, setShowQuickSwitcher] = useState(false);
  const { patients } = usePatientContext();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd+K (Mac) or Ctrl+K (Windows/Linux)
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setShowQuickSwitcher(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <QuickSwitcher
      isOpen={showQuickSwitcher}
      onClose={() => setShowQuickSwitcher(false)}
      patients={patients}
    />
  );
}
