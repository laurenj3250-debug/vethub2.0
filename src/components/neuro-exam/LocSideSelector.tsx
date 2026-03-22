'use client';

import React from 'react';
import { LocToggle } from './LocToggle';

interface LocSideSelectorProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
}

export function LocSideSelector({ value, onChange, label = 'Side' }: LocSideSelectorProps) {
  return (
    <div className="ml-4 pl-4 border-l-2 border-gray-200 mt-2">
      <LocToggle
        label={label}
        options={['Left', 'Right', 'Bilateral']}
        value={value}
        onChange={onChange}
        compact
      />
    </div>
  );
}
