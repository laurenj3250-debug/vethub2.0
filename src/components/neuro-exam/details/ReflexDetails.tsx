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

export function ReflexDetail({ sectionId, section, updateData }: Props) {
  switch (sectionId) {
    case 12: return <PosturalReactionsDetail section={section} updateData={updateData} />;
    case 13: return <ThoracicReflexDetail section={section} updateData={updateData} />;
    case 14: return <PelvicReflexDetail section={section} updateData={updateData} />;
    default: return null;
  }
}

function PosturalReactionsDetail({ section, updateData }: { section: SectionData; updateData: (f: string, v: any) => void }) {
  const toggleLimb = (limb: string) => {
    const affected = section.data.affectedLimbs || [];
    const newAffected = affected.includes(limb)
      ? affected.filter((l: string) => l !== limb)
      : [...affected, limb];
    updateData('affectedLimbs', newAffected);
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-bold text-gray-700 mb-2">Affected Limbs</label>
        <LimbSelector selected={section.data.affectedLimbs || []} onToggle={toggleLimb} />
      </div>

      <div>
        <label className="block text-xs font-bold text-gray-700 mb-2">Severity</label>
        <div className="flex flex-wrap gap-2">
          {[
            { value: 'Mild delay', label: 'Mild' },
            { value: 'Moderate delay', label: 'Moderate' },
            { value: 'Severe delay', label: 'Severe' },
            { value: 'Absent', label: 'Absent' },
          ].map(severity => (
            <button
              key={severity.value}
              type="button"
              onClick={() => updateData('severity', severity.value)}
              className={`min-h-[44px] px-4 py-2 rounded-lg border-2 text-sm font-bold transition-all active:scale-95 ${
                section.data.severity === severity.value
                  ? 'bg-[#DCC4F5] border-black text-gray-900 shadow-[2px_2px_0_#000]'
                  : 'bg-white border-gray-300 text-gray-600'
              }`}
            >
              {severity.label}
            </button>
          ))}
        </div>
      </div>

      <NotesField section={section} updateData={updateData} />
    </div>
  );
}

function ReflexLevelSelector({ label, name, section, updateData }: {
  label: string;
  name: string;
  section: SectionData;
  updateData: (f: string, v: any) => void;
}) {
  return (
    <div>
      <label className="block text-xs font-bold text-gray-700 mb-2">{label}</label>
      <div className="flex gap-2">
        {['Decreased', 'Normal', 'Increased'].map(level => (
          <button
            key={level}
            type="button"
            onClick={() => updateData(name, level)}
            className={`min-h-[44px] flex-1 rounded-lg border-2 text-xs font-bold transition-all active:scale-95 ${
              section.data[name] === level
                ? 'bg-[#DCC4F5] border-black text-gray-900 shadow-[2px_2px_0_#000]'
                : 'bg-white border-gray-300 text-gray-600'
            }`}
          >
            {level}
          </button>
        ))}
      </div>
    </div>
  );
}

function ThoracicReflexDetail({ section, updateData }: { section: SectionData; updateData: (f: string, v: any) => void }) {
  return (
    <div className="space-y-4">
      <ReflexLevelSelector label="Left Forelimb" name="leftForelimb" section={section} updateData={updateData} />
      <ReflexLevelSelector label="Right Forelimb" name="rightForelimb" section={section} updateData={updateData} />
      <NotesField section={section} updateData={updateData} />
    </div>
  );
}

function PelvicReflexDetail({ section, updateData }: { section: SectionData; updateData: (f: string, v: any) => void }) {
  return (
    <div className="space-y-4">
      <ReflexLevelSelector label="Left Hindlimb" name="leftHindlimb" section={section} updateData={updateData} />
      <ReflexLevelSelector label="Right Hindlimb" name="rightHindlimb" section={section} updateData={updateData} />
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
