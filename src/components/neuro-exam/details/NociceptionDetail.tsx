'use client';

import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { ToggleChip } from '../ToggleChip';
import { type SectionData } from '../types';

interface Props {
  section: SectionData;
  updateData: (field: string, value: any) => void;
}

export function NociceptionDetail({ section, updateData }: Props) {
  return (
    <div className="space-y-4">
      <div className="p-3 bg-red-50 border-2 border-red-300 rounded-xl flex items-start gap-2">
        <AlertTriangle className="text-red-600 flex-shrink-0 mt-0.5" size={18} />
        <p className="text-xs font-semibold text-red-800">
          Absence of nociception indicates severe spinal cord injury and poor prognosis.
        </p>
      </div>

      <div>
        <label className="block text-xs font-bold text-gray-700 mb-2">Absent Deep Pain (select affected)</label>
        <div className="flex flex-wrap gap-2">
          {[
            { id: 'lf', label: 'LF' },
            { id: 'rf', label: 'RF' },
            { id: 'lh', label: 'LH' },
            { id: 'rh', label: 'RH' },
            { id: 'tail', label: 'Tail' },
            { id: 'perineum', label: 'Perineum' },
          ].map(item => (
            <ToggleChip
              key={item.id}
              label={item.label}
              active={!!section.data[item.id]}
              onToggle={() => updateData(item.id, !section.data[item.id])}
              variant="danger"
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
