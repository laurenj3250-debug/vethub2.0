'use client';

import React from 'react';
import { Check } from 'lucide-react';
import { type SectionGroupConfig, type Sections } from './types';

interface SectionGroupProps {
  group: SectionGroupConfig;
  sections: Sections;
  onBulkNormal: (sectionIds: number[]) => void;
  children: React.ReactNode;
}

export function SectionGroup({ group, sections, onBulkNormal, children }: SectionGroupProps) {
  const allDone = group.sectionIds.every(id => sections[id]?.status !== null);
  const doneCount = group.sectionIds.filter(id => sections[id]?.status !== null).length;

  return (
    <div className="space-y-3">
      {/* Group header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-black text-gray-900">{group.label}</h2>
          <span className="text-xs font-semibold text-gray-400">
            {doneCount}/{group.sectionIds.length}
          </span>
        </div>
        <button
          onClick={() => onBulkNormal(group.sectionIds)}
          disabled={allDone}
          className={`min-h-[44px] px-4 py-2 rounded-lg border-2 text-xs font-bold transition-all active:scale-95 ${
            allDone
              ? 'bg-[#B8E6D4] border-[#6BB89D] text-gray-600 cursor-default'
              : 'bg-[#B8E6D4] border-black text-gray-900 shadow-[2px_2px_0_#000] hover:shadow-[3px_3px_0_#000] hover:-translate-y-[1px]'
          }`}
        >
          <Check size={14} className="inline mr-1" />
          {group.bulkLabel}
        </button>
      </div>

      {/* Section rows */}
      <div className="space-y-2">
        {children}
      </div>
    </div>
  );
}
