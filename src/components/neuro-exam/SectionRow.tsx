'use client';

import React from 'react';
import { Check, AlertCircle, ChevronDown } from 'lucide-react';
import { SECTION_TITLES } from './constants';
import { type SectionData } from './types';

interface SectionRowProps {
  sectionId: number;
  section: SectionData;
  onSetStatus: (status: 'normal' | 'abnormal') => void;
  onToggleExpand: () => void;
  children?: React.ReactNode;
}

export function SectionRow({ sectionId, section, onSetStatus, onToggleExpand, children }: SectionRowProps) {
  const title = SECTION_TITLES[sectionId] || `Section ${sectionId}`;

  return (
    <div
      className={`bg-white border-2 rounded-xl overflow-hidden transition-shadow ${
        section.status === 'normal' ? 'border-[#6BB89D]' :
        section.status === 'abnormal' ? 'border-[#DCC4F5]' :
        'border-black'
      } ${section.status ? 'shadow-[3px_3px_0_#000]' : 'shadow-[2px_2px_0_#000]'}`}
    >
      {/* Header row */}
      <div className="flex items-center gap-2 p-3">
        {/* Status icon */}
        <div className="w-6 flex-shrink-0">
          {section.status === 'normal' && <Check className="text-emerald-600" size={18} strokeWidth={3} />}
          {section.status === 'abnormal' && <AlertCircle className="text-purple-600" size={18} />}
          {!section.status && <div className="w-4 h-4 rounded-full border-2 border-gray-300" />}
        </div>

        {/* Title - tappable to expand */}
        <button
          onClick={onToggleExpand}
          className="flex-1 text-left min-h-[44px] flex items-center"
        >
          <span className="text-sm font-bold text-gray-900">
            {sectionId}. {title}
          </span>
        </button>

        {/* Normal / Abnl buttons */}
        <div className="flex gap-1.5">
          <button
            onClick={() => onSetStatus('normal')}
            className={`min-h-[44px] min-w-[52px] px-2.5 py-1.5 rounded-lg border-2 text-xs font-bold transition-all active:scale-95 ${
              section.status === 'normal'
                ? 'bg-[#B8E6D4] border-black text-gray-900 shadow-[2px_2px_0_#000]'
                : 'bg-white border-gray-300 text-gray-500 hover:border-gray-400'
            }`}
          >
            Nml
          </button>
          <button
            onClick={() => onSetStatus('abnormal')}
            className={`min-h-[44px] min-w-[52px] px-2.5 py-1.5 rounded-lg border-2 text-xs font-bold transition-all active:scale-95 ${
              section.status === 'abnormal'
                ? 'bg-[#DCC4F5] border-black text-gray-900 shadow-[2px_2px_0_#000]'
                : 'bg-white border-gray-300 text-gray-500 hover:border-gray-400'
            }`}
          >
            Abnl
          </button>
        </div>

        {/* Expand chevron */}
        <button onClick={onToggleExpand} className="p-1 min-h-[44px] min-w-[32px] flex items-center justify-center">
          <ChevronDown
            size={18}
            className={`text-gray-400 transition-transform ${section.expanded ? 'rotate-180' : ''}`}
          />
        </button>
      </div>

      {/* Expandable detail area */}
      {section.expanded && children && (
        <div className="px-3 pb-3 border-t-2 border-gray-100 pt-3">
          {children}
        </div>
      )}
    </div>
  );
}
