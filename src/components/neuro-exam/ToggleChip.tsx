'use client';

import React, { useRef } from 'react';

interface ToggleChipProps {
  label: string;
  active: boolean;
  onToggle: () => void;
  variant?: 'default' | 'danger';
}

export function ToggleChip({ label, active, onToggle, variant = 'default' }: ToggleChipProps) {
  const lastClickRef = useRef(0);

  const handleClick = () => {
    const now = Date.now();
    if (now - lastClickRef.current < 250) return;
    lastClickRef.current = now;
    onToggle();
  };

  const activeColors = variant === 'danger'
    ? 'bg-red-100 border-red-600 text-red-800'
    : 'bg-[#DCC4F5] border-black text-gray-900';

  const inactiveColors = 'bg-white border-gray-300 text-gray-600';

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`min-h-[44px] min-w-[44px] px-3 py-2 rounded-lg text-sm font-semibold border-2 transition-all active:scale-95 ${
        active
          ? `${activeColors} shadow-[2px_2px_0_#000]`
          : `${inactiveColors} hover:border-gray-400`
      }`}
    >
      {label}
    </button>
  );
}
