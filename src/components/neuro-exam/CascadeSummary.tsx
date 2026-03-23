'use client';

import React from 'react';
import { ChevronDown, ChevronRight, Pencil } from 'lucide-react';

interface CascadeSummaryProps {
  label: string;
  summary: string;
  expanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

export function CascadeSummary({ label, summary, expanded, onToggle, children }: CascadeSummaryProps) {
  return (
    <div className="border-l-[3px] border-[#B8E6D4] rounded-xl bg-[#FAFDF9] overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center gap-2 px-3 py-2.5 text-left hover:bg-[#F0FAF5] transition-colors"
      >
        {expanded ? (
          <ChevronDown size={14} className="text-gray-400 flex-shrink-0" />
        ) : (
          <ChevronRight size={14} className="text-gray-400 flex-shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <span className="text-[11px] font-bold text-[#2D8B6F] uppercase tracking-wide">{label}</span>
          {!expanded && (
            <p className="text-xs text-gray-500 truncate mt-0.5">{summary}</p>
          )}
        </div>
        {!expanded && (
          <Pencil size={12} className="text-gray-400 flex-shrink-0" />
        )}
      </button>
      {expanded && (
        <div className="px-3 pb-3 space-y-4">
          {children}
        </div>
      )}
    </div>
  );
}
