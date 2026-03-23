'use client';

import React from 'react';
import { LocToggle } from './LocToggle';

interface LocSideSelectorProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
}

export function LocSideSelector({ value, onChange, label = 'Side' }: LocSideSelectorProps) {
  const options = ['Left', 'Right', 'Bilateral'];

  return (
    <div className="ml-4 pl-4 border-l-2 border-gray-200 mt-2">
      {label && (
        <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-1.5">
          {label} <span className="text-gray-300 font-normal normal-case">(optional)</span>
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => {
          const isActive = value === opt;
          return (
            <button
              key={opt}
              type="button"
              onClick={() => onChange(isActive ? '' : opt)}
              className={`min-h-[44px] px-4 rounded-xl text-sm border-2 transition-all active:scale-95 focus-visible:outline-2 focus-visible:outline-black focus-visible:outline-offset-2 ${
                isActive
                  ? 'bg-[#B8E6D4] border-black text-gray-900 font-bold shadow-[2px_2px_0_#000]'
                  : 'bg-white border-gray-200 text-gray-500 font-semibold hover:border-gray-400'
              }`}
            >
              {opt}
            </button>
          );
        })}
      </div>
    </div>
  );
}
