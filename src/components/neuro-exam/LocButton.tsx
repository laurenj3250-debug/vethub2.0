'use client';

import React from 'react';

interface LocButtonProps {
  id: string;
  label: string;
  sub: string;
  active: boolean;
  onClick: () => void;
}

export function LocButton({ id, label, sub, active, onClick }: LocButtonProps) {
  return (
    <button
      type="button"
      data-loc-id={id}
      onClick={onClick}
      className={`min-h-[52px] px-3 text-left rounded-xl border-2 transition-all active:scale-95 focus-visible:outline-2 focus-visible:outline-black focus-visible:outline-offset-2 ${
        active
          ? 'bg-[#B8E6D4] border-black text-gray-900 shadow-[3px_3px_0_#000]'
          : 'bg-white border-gray-200 text-gray-600 hover:border-gray-400'
      }`}
    >
      <div className="text-[13px] font-bold leading-tight">{label}</div>
      <div className={`text-[11px] leading-tight mt-0.5 ${active ? 'text-gray-700' : 'text-gray-400'}`}>
        {sub}
      </div>
    </button>
  );
}
