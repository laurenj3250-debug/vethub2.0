'use client';

import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { SECTION_GROUPS } from './constants';

interface StepperNavigationProps {
  currentStep: number;
  onPrev: () => void;
  onNext: () => void;
}

export function StepperNavigation({ currentStep, onPrev, onNext }: StepperNavigationProps) {
  const isFirst = currentStep === 1;
  const isLast = currentStep === SECTION_GROUPS.length;
  const prevLabel = isFirst ? '' : SECTION_GROUPS[currentStep - 2]?.label;
  const nextLabel = isLast ? '' : SECTION_GROUPS[currentStep]?.label;

  return (
    <div className="flex items-center justify-between gap-3 md:hidden">
      <button
        onClick={onPrev}
        disabled={isFirst}
        className={`flex-1 min-h-[48px] flex items-center justify-center gap-1 rounded-xl border-2 font-bold text-sm transition-all active:scale-95 ${
          isFirst
            ? 'border-gray-200 text-gray-300 cursor-not-allowed'
            : 'border-black bg-white text-gray-900 shadow-[3px_3px_0_#000] hover:shadow-[4px_4px_0_#000] hover:-translate-y-[1px]'
        }`}
      >
        <ChevronLeft size={18} />
        {prevLabel}
      </button>

      <button
        onClick={onNext}
        disabled={isLast}
        className={`flex-1 min-h-[48px] flex items-center justify-center gap-1 rounded-xl border-2 font-bold text-sm transition-all active:scale-95 ${
          isLast
            ? 'border-gray-200 text-gray-300 cursor-not-allowed'
            : 'border-black bg-[#B8E6D4] text-gray-900 shadow-[3px_3px_0_#000] hover:shadow-[4px_4px_0_#000] hover:-translate-y-[1px]'
        }`}
      >
        {nextLabel}
        <ChevronRight size={18} />
      </button>
    </div>
  );
}
