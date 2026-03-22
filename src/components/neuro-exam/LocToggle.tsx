'use client';

import React from 'react';

interface LocToggleProps {
  label?: string;
  options: (string | { value: string; label: string })[];
  value: string;
  onChange: (value: string) => void;
  warning?: boolean;
  compact?: boolean;
}

export function LocToggle({ label, options, value, onChange, warning = false, compact = false }: LocToggleProps) {
  const normalizedOptions = options.map((opt) =>
    typeof opt === 'string' ? { value: opt, label: opt } : opt
  );

  return (
    <div className={compact ? 'mb-1' : 'mb-3'}>
      {label && (
        <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-1.5">
          {label}
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        {normalizedOptions.map((opt) => {
          const isActive = value === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange(opt.value)}
              className={`min-h-[44px] px-4 rounded-xl text-sm border-2 transition-all active:scale-95 focus-visible:outline-2 focus-visible:outline-black focus-visible:outline-offset-2 ${
                isActive
                  ? warning
                    ? 'bg-[#FFD6D6] border-black text-gray-900 font-bold shadow-[2px_2px_0_#000]'
                    : 'bg-[#B8E6D4] border-black text-gray-900 font-bold shadow-[2px_2px_0_#000]'
                  : 'bg-white border-gray-200 text-gray-500 font-semibold hover:border-gray-400'
              }`}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
