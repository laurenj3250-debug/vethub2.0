'use client';

import React from 'react';
import { Check } from 'lucide-react';

interface LocCheckButtonProps {
  checked: boolean;
  onChange: () => void;
  label: string;
  color?: 'mint' | 'amber' | 'sky' | 'red';
}

const COLOR_MAP = {
  mint: { bg: 'bg-[#B8E6D4]', dot: 'bg-emerald-600' },
  amber: { bg: 'bg-[#FFF3CD]', dot: 'bg-amber-500' },
  sky: { bg: 'bg-[#D1E9FF]', dot: 'bg-sky-500' },
  red: { bg: 'bg-[#FFD6D6]', dot: 'bg-red-500' },
} as const;

export function LocCheckButton({ checked, onChange, label, color = 'mint' }: LocCheckButtonProps) {
  const colors = COLOR_MAP[color];

  return (
    <button
      type="button"
      onClick={onChange}
      className={`min-h-[44px] px-4 rounded-xl border-2 text-sm flex items-center gap-2.5 transition-all active:scale-95 focus-visible:outline-2 focus-visible:outline-black focus-visible:outline-offset-2 ${
        checked
          ? `${colors.bg} border-black text-gray-900 font-bold shadow-[2px_2px_0_#000]`
          : 'bg-white border-gray-200 text-gray-400 font-semibold hover:border-gray-400'
      }`}
    >
      {/* Checkbox indicator */}
      <span
        className={`w-4 h-4 rounded-md border-2 flex items-center justify-center flex-shrink-0 ${
          checked ? `${colors.dot} border-transparent` : 'border-gray-300 bg-white'
        }`}
      >
        {checked && <Check size={12} strokeWidth={3} className="text-white" />}
      </span>
      {label}
    </button>
  );
}
