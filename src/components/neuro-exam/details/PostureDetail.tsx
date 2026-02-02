'use client';

import React from 'react';
import { ToggleChip } from '../ToggleChip';
import { type SectionData } from '../types';

interface Props {
  section: SectionData;
  updateData: (field: string, value: any) => void;
}

export function PostureDetail({ section, updateData }: Props) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-bold text-gray-700 mb-2">Head Tilt</label>
          <div className="flex gap-2">
            {['L', 'R'].map(side => (
              <button
                key={side}
                type="button"
                onClick={() => updateData('headTilt', section.data.headTilt === side ? null : side)}
                className={`min-h-[44px] flex-1 rounded-lg border-2 text-sm font-bold transition-all active:scale-95 ${
                  section.data.headTilt === side
                    ? 'bg-[#DCC4F5] border-black text-gray-900 shadow-[2px_2px_0_#000]'
                    : 'bg-white border-gray-300 text-gray-600'
                }`}
              >
                {side === 'L' ? 'Left' : 'Right'}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-700 mb-2">Head Turn</label>
          <div className="flex gap-2">
            {['L', 'R'].map(side => (
              <button
                key={side}
                type="button"
                onClick={() => updateData('headTurn', section.data.headTurn === side ? null : side)}
                className={`min-h-[44px] flex-1 rounded-lg border-2 text-sm font-bold transition-all active:scale-95 ${
                  section.data.headTurn === side
                    ? 'bg-[#DCC4F5] border-black text-gray-900 shadow-[2px_2px_0_#000]'
                    : 'bg-white border-gray-300 text-gray-600'
                }`}
              >
                {side === 'L' ? 'Left' : 'Right'}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div>
        <label className="block text-xs font-bold text-gray-700 mb-2">Other Findings</label>
        <div className="flex flex-wrap gap-2">
          {[
            { id: 'ventroflexion', label: 'Ventroflexion' },
            { id: 'wideExcursionTremor', label: 'Wide Head Tremor' },
            { id: 'fineIntentionTremor', label: 'Intention Tremor' },
            { id: 'facialAsymmetryL', label: 'Facial Asym L' },
            { id: 'facialAsymmetryR', label: 'Facial Asym R' },
            { id: 'earAbnormalL', label: 'Ear Abnl L' },
            { id: 'earAbnormalR', label: 'Ear Abnl R' },
          ].map(item => (
            <ToggleChip
              key={item.id}
              label={item.label}
              active={!!section.data[item.id]}
              onToggle={() => updateData(item.id, !section.data[item.id])}
            />
          ))}
        </div>
      </div>

      <div>
        <label className="block text-xs font-bold text-gray-700 mb-2">Notes</label>
        <textarea
          value={section.data.notes || ''}
          onChange={(e) => updateData('notes', e.target.value)}
          className="w-full p-3 bg-white border-2 border-black rounded-xl text-[16px] text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-[#DCC4F5] focus:outline-none shadow-[2px_2px_0_#000]"
          rows={2}
          placeholder="Additional observations..."
        />
      </div>
    </div>
  );
}
