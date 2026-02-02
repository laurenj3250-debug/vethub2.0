'use client';

import React from 'react';
import { ToggleChip } from '../ToggleChip';
import { type SectionData } from '../types';

interface Props {
  sectionId: number;
  section: SectionData;
  updateData: (field: string, value: any) => void;
}

// Sections 4-11 cranial nerve detail forms
export function CranialNerveDetail({ sectionId, section, updateData }: Props) {
  switch (sectionId) {
    case 4: return <MenaceDetail section={section} updateData={updateData} />;
    case 5: return <PupilDetail section={section} updateData={updateData} />;
    case 6: return <EyePositionDetail section={section} updateData={updateData} />;
    case 7: return <SideSelector section={section} updateData={updateData} label="Affected Side" />;
    case 8: return <SideSelector section={section} updateData={updateData} label="Affected Side" />;
    case 9: return <JawFacialDetail section={section} updateData={updateData} />;
    case 10: return <TongueDetail section={section} updateData={updateData} />;
    case 11: return <GagDetail section={section} updateData={updateData} />;
    default: return null;
  }
}

function MenaceDetail({ section, updateData }: { section: SectionData; updateData: (f: string, v: any) => void }) {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-bold text-gray-700 mb-2">Affected Side</label>
        <div className="flex flex-wrap gap-2">
          {[
            { value: 'Left Eye', label: 'L Eye' },
            { value: 'Right Eye', label: 'R Eye' },
            { value: 'Both Eyes', label: 'Both' },
          ].map(side => (
            <button
              key={side.value}
              type="button"
              onClick={() => updateData('affectedSide', side.value)}
              className={`min-h-[44px] px-4 py-2 rounded-lg border-2 text-sm font-bold transition-all active:scale-95 ${
                section.data.affectedSide === side.value
                  ? 'bg-[#DCC4F5] border-black text-gray-900 shadow-[2px_2px_0_#000]'
                  : 'bg-white border-gray-300 text-gray-600'
              }`}
            >
              {side.label}
            </button>
          ))}
        </div>
      </div>
      <NotesField section={section} updateData={updateData} />
    </div>
  );
}

function PupilDetail({ section, updateData }: { section: SectionData; updateData: (f: string, v: any) => void }) {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-bold text-gray-700 mb-2">Pupil Findings</label>
        <div className="flex flex-wrap gap-2">
          {[
            { id: 'anisocoria', label: 'Anisocoria' },
            { id: 'mydriasisL', label: 'Mydriasis L' },
            { id: 'mydriasisR', label: 'Mydriasis R' },
            { id: 'miosisL', label: 'Miosis L' },
            { id: 'miosisR', label: 'Miosis R' },
            { id: 'poorPLRL', label: 'Poor PLR L' },
            { id: 'poorPLRR', label: 'Poor PLR R' },
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

function EyePositionDetail({ section, updateData }: { section: SectionData; updateData: (f: string, v: any) => void }) {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-bold text-gray-700 mb-2">Eye Position</label>
        <div className="flex flex-wrap gap-2">
          {[
            { id: 'strabismusL', label: 'Strabismus L' },
            { id: 'strabismusR', label: 'Strabismus R' },
            { id: 'ventrolateralL', label: 'Ventrolat L' },
            { id: 'ventrolateralR', label: 'Ventrolat R' },
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
        <label className="block text-xs font-bold text-gray-700 mb-2">Nystagmus</label>
        <div className="flex flex-wrap gap-2">
          {[
            { id: 'horizontalNystagmus', label: 'Horizontal' },
            { id: 'verticalNystagmus', label: 'Vertical' },
            { id: 'rotaryNystagmus', label: 'Rotary' },
            { id: 'positionalNystagmus', label: 'Positional' },
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

function SideSelector({ section, updateData, label }: { section: SectionData; updateData: (f: string, v: any) => void; label: string }) {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-bold text-gray-700 mb-2">{label}</label>
        <div className="flex flex-wrap gap-2">
          {['Left', 'Right', 'Both'].map(side => (
            <button
              key={side}
              type="button"
              onClick={() => updateData('affectedSide', side)}
              className={`min-h-[44px] px-4 py-2 rounded-lg border-2 text-sm font-bold transition-all active:scale-95 ${
                section.data.affectedSide === side
                  ? 'bg-[#DCC4F5] border-black text-gray-900 shadow-[2px_2px_0_#000]'
                  : 'bg-white border-gray-300 text-gray-600'
              }`}
            >
              {side}
            </button>
          ))}
        </div>
      </div>
      <NotesField section={section} updateData={updateData} />
    </div>
  );
}

function JawFacialDetail({ section, updateData }: { section: SectionData; updateData: (f: string, v: any) => void }) {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-bold text-gray-700 mb-2">Findings</label>
        <div className="flex flex-wrap gap-2">
          {[
            { id: 'droppedJaw', label: 'Dropped Jaw' },
            { id: 'reducedJawTone', label: 'Low Jaw Tone' },
            { id: 'facialParalysisL', label: 'Facial Paralysis L' },
            { id: 'facialParalysisR', label: 'Facial Paralysis R' },
            { id: 'lipDroopL', label: 'Lip Droop L' },
            { id: 'lipDroopR', label: 'Lip Droop R' },
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

function TongueDetail({ section, updateData }: { section: SectionData; updateData: (f: string, v: any) => void }) {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-bold text-gray-700 mb-2">Findings</label>
        <div className="flex flex-wrap gap-2">
          {[
            { id: 'deviationL', label: 'Deviation L' },
            { id: 'deviationR', label: 'Deviation R' },
            { id: 'atrophy', label: 'Atrophy' },
            { id: 'weakness', label: 'Weakness' },
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

function GagDetail({ section, updateData }: { section: SectionData; updateData: (f: string, v: any) => void }) {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-bold text-gray-700 mb-2">Response Level</label>
        <div className="flex flex-wrap gap-2">
          {['Absent', 'Decreased', 'Hyperactive'].map(level => (
            <button
              key={level}
              type="button"
              onClick={() => updateData('responseLevel', level)}
              className={`min-h-[44px] px-4 py-2 rounded-lg border-2 text-sm font-bold transition-all active:scale-95 ${
                section.data.responseLevel === level
                  ? 'bg-[#DCC4F5] border-black text-gray-900 shadow-[2px_2px_0_#000]'
                  : 'bg-white border-gray-300 text-gray-600'
              }`}
            >
              {level}
            </button>
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
