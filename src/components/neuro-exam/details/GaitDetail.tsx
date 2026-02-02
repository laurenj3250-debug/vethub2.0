'use client';

import React from 'react';
import { ToggleChip } from '../ToggleChip';
import { LimbSelector } from '../LimbSelector';
import { type SectionData } from '../types';

interface Props {
  section: SectionData;
  updateData: (field: string, value: any) => void;
}

export function GaitDetail({ section, updateData }: Props) {
  const toggleParesis = (limb: string) => {
    const paresis = section.data.paresis || [];
    const newParesis = paresis.includes(limb)
      ? paresis.filter((l: string) => l !== limb)
      : [...paresis, limb];
    updateData('paresis', newParesis);
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-bold text-gray-700 mb-2">Ambulatory Status</label>
        <div className="flex flex-wrap gap-2">
          {[
            { value: 'Ambulatory', label: 'Ambulatory' },
            { value: 'Non-ambulatory paraparesis', label: 'Non-amb Para' },
            { value: 'Non-ambulatory tetraparesis', label: 'Non-amb Tetra' },
            { value: 'Paraplegia', label: 'Paraplegia' },
            { value: 'Tetraplegia', label: 'Tetraplegia' },
          ].map(status => (
            <button
              key={status.value}
              type="button"
              onClick={() => updateData('ambulatoryStatus', status.value)}
              className={`min-h-[44px] px-3 py-2 rounded-lg border-2 text-sm font-semibold transition-all active:scale-95 ${
                section.data.ambulatoryStatus === status.value
                  ? 'bg-[#DCC4F5] border-black text-gray-900 shadow-[2px_2px_0_#000]'
                  : 'bg-white border-gray-300 text-gray-600 hover:border-gray-400'
              }`}
            >
              {status.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-xs font-bold text-gray-700 mb-2">Paresis (select limbs)</label>
        <LimbSelector selected={section.data.paresis || []} onToggle={toggleParesis} />
      </div>

      <div>
        <label className="block text-xs font-bold text-gray-700 mb-2">Ataxia Type</label>
        <div className="flex flex-wrap gap-2">
          {['Proprioceptive', 'Vestibular', 'Cerebellar', 'General'].map(type => (
            <button
              key={type}
              type="button"
              onClick={() => updateData('ataxiaType', type)}
              className={`min-h-[44px] px-3 py-2 rounded-lg border-2 text-sm font-semibold transition-all active:scale-95 ${
                section.data.ataxiaType === type
                  ? 'bg-[#DCC4F5] border-black text-gray-900 shadow-[2px_2px_0_#000]'
                  : 'bg-white border-gray-300 text-gray-600 hover:border-gray-400'
              }`}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-xs font-bold text-gray-700 mb-2">Other Abnormalities</label>
        <div className="flex flex-wrap gap-2">
          {[
            { id: 'hypermetria', label: 'Hypermetria' },
            { id: 'hypometria', label: 'Hypometria' },
            { id: 'circlingL', label: 'Circling L' },
            { id: 'circlingR', label: 'Circling R' },
            { id: 'wideBasedStance', label: 'Wide Stance' },
            { id: 'bunnyHopping', label: 'Bunny Hop' },
            { id: 'dysmetria', label: 'Dysmetria' },
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
