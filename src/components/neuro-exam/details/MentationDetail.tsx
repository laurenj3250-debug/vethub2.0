'use client';

import React from 'react';
import { ToggleChip } from '../ToggleChip';
import { type SectionData } from '../types';

interface Props {
  section: SectionData;
  updateData: (field: string, value: any) => void;
}

export function MentationDetail({ section, updateData }: Props) {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-bold text-gray-700 mb-2">Mentation Level</label>
        <div className="flex flex-wrap gap-2">
          {['Alert', 'Depressed', 'Obtunded', 'Stuporous', 'Comatose'].map(level => (
            <button
              key={level}
              type="button"
              onClick={() => updateData('mentation', level)}
              className={`min-h-[44px] px-3 py-2 rounded-lg border-2 text-sm font-semibold transition-all active:scale-95 ${
                section.data.mentation === level
                  ? 'bg-[#DCC4F5] border-black text-gray-900 shadow-[2px_2px_0_#000]'
                  : 'bg-white border-gray-300 text-gray-600 hover:border-gray-400'
              }`}
            >
              {level}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-xs font-bold text-gray-700 mb-2">Behavior Abnormalities</label>
        <div className="flex flex-wrap gap-2">
          {[
            { id: 'circlingL', label: 'Circling L' },
            { id: 'circlingR', label: 'Circling R' },
            { id: 'headPressing', label: 'Head Pressing' },
            { id: 'aggression', label: 'Aggression' },
            { id: 'disorientation', label: 'Disoriented' },
            { id: 'vocalization', label: 'Vocalization' },
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
