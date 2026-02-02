'use client';

import React from 'react';
import { ToggleChip } from '../ToggleChip';
import { LimbSelector } from '../LimbSelector';
import { type SectionData } from '../types';

interface Props {
  sectionId: number;
  section: SectionData;
  updateData: (field: string, value: any) => void;
}

export function TonePalpationDetail({ sectionId, section, updateData }: Props) {
  switch (sectionId) {
    case 15: return <PerinealDetail section={section} updateData={updateData} />;
    case 16: return <SpinePalpationDetail section={section} updateData={updateData} />;
    case 17: return <LimbPalpationDetail section={section} updateData={updateData} />;
    default: return null;
  }
}

function PerinealDetail({ section, updateData }: { section: SectionData; updateData: (f: string, v: any) => void }) {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-bold text-gray-700 mb-2">Findings</label>
        <div className="flex flex-wrap gap-2">
          {[
            { id: 'decreased', label: 'Decreased' },
            { id: 'absent', label: 'Absent' },
            { id: 'toneLoss', label: 'Loss of Tone' },
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
      <NotesField section={section} updateData={updateData} />
    </div>
  );
}

function SpinePalpationDetail({ section, updateData }: { section: SectionData; updateData: (f: string, v: any) => void }) {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-bold text-gray-700 mb-2">Pain Location</label>
        <div className="flex flex-wrap gap-2">
          {[
            { id: 'cervicalPain', label: 'Cervical' },
            { id: 'thoracicPain', label: 'Thoracic' },
            { id: 'lumbarPain', label: 'Lumbar' },
            { id: 'lumbosacralPain', label: 'Lumbosacral' },
            { id: 'paraspinalPain', label: 'Paraspinal' },
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
      <NotesField section={section} updateData={updateData} />
    </div>
  );
}

function LimbPalpationDetail({ section, updateData }: { section: SectionData; updateData: (f: string, v: any) => void }) {
  const toggleAtrophy = (limb: string) => {
    const atrophy = section.data.muscleAtrophy || [];
    const newAtrophy = atrophy.includes(limb)
      ? atrophy.filter((l: string) => l !== limb)
      : [...atrophy, limb];
    updateData('muscleAtrophy', newAtrophy);
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-bold text-gray-700 mb-2">Muscle Atrophy</label>
        <LimbSelector selected={section.data.muscleAtrophy || []} onToggle={toggleAtrophy} />
      </div>

      <div>
        <label className="block text-xs font-bold text-gray-700 mb-2">Other Findings</label>
        <div className="flex flex-wrap gap-2">
          {[
            { id: 'jointSwelling', label: 'Joint Swelling' },
            { id: 'painOnPalpation', label: 'Pain' },
            { id: 'decreasedROM', label: 'Decreased ROM' },
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

      <NotesField section={section} updateData={updateData} />
    </div>
  );
}

function NotesField({ section, updateData }: { section: SectionData; updateData: (f: string, v: any) => void }) {
  return (
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
  );
}
