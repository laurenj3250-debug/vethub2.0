'use client';

import React from 'react';

interface LimbSelectorProps {
  selected: string[];
  onToggle: (limb: string) => void;
  variant?: 'default' | 'danger';
}

export function LimbSelector({ selected, onToggle, variant = 'default' }: LimbSelectorProps) {
  const limbs = [
    { id: 'LF', label: 'LF', position: 'Left Front' },
    { id: 'RF', label: 'RF', position: 'Right Front' },
    { id: 'LH', label: 'LH', position: 'Left Hind' },
    { id: 'RH', label: 'RH', position: 'Right Hind' },
  ];

  const activeColor = variant === 'danger'
    ? 'bg-red-100 border-red-600 text-red-800'
    : 'bg-[#DCC4F5] border-black text-gray-900';

  return (
    <div className="grid grid-cols-2 gap-2 max-w-[200px]">
      {limbs.map(limb => {
        const isActive = selected.includes(limb.id);
        return (
          <button
            key={limb.id}
            type="button"
            onClick={() => onToggle(limb.id)}
            className={`min-h-[48px] rounded-lg border-2 text-sm font-bold transition-all active:scale-95 ${
              isActive
                ? `${activeColor} shadow-[2px_2px_0_#000]`
                : 'bg-white border-gray-300 text-gray-500 hover:border-gray-400'
            }`}
          >
            {limb.label}
          </button>
        );
      })}
    </div>
  );
}
