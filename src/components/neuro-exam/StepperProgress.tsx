'use client';

import React from 'react';
import { SECTION_GROUPS } from './constants';
import { type Sections } from './types';

interface StepperProgressProps {
  currentStep: number;
  onStepClick: (step: number) => void;
  sections: Sections;
}

export function StepperProgress({ currentStep, onStepClick, sections }: StepperProgressProps) {
  return (
    <div className="flex gap-1.5">
      {SECTION_GROUPS.map((group, idx) => {
        const step = idx + 1;
        const allDone = group.sectionIds.every(id => sections[id]?.status !== null);
        const someDone = group.sectionIds.some(id => sections[id]?.status !== null);
        const hasAbnormal = group.sectionIds.some(id => sections[id]?.status === 'abnormal');
        const isCurrent = step === currentStep;

        let bg = 'bg-gray-200';
        if (allDone && hasAbnormal) bg = 'bg-[#DCC4F5]';
        else if (allDone) bg = 'bg-[#B8E6D4]';
        else if (someDone) bg = 'bg-[#B8E6D4]/50';

        return (
          <button
            key={group.id}
            onClick={() => onStepClick(step)}
            className={`flex-1 h-3 rounded-full border transition-all ${
              isCurrent ? 'border-black shadow-[1px_1px_0_#000] ring-2 ring-black/20' : 'border-gray-400'
            } ${bg}`}
            aria-label={`Step ${step}: ${group.label}`}
            aria-current={isCurrent ? 'step' : undefined}
          />
        );
      })}
    </div>
  );
}
