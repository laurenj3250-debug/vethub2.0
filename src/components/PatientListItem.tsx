'use client';

import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Trash2, Tag } from 'lucide-react';
import { FoodCalculatorPopover } from './FoodCalculatorPopover';
import { PatientFeedingSchedule } from './FeedingScheduleWidget';

// Neo-pop styling constants
const NEO_SHADOW = '6px 6px 0 #000';
const NEO_SHADOW_SM = '4px 4px 0 #000';
const NEO_BORDER = '2px solid #000';

const COLORS = {
  lavender: '#DCC4F5',
  mint: '#B8E6D4',
  pink: '#FFBDBD',
  cream: '#FFF8F0',
};

interface PatientListItemProps {
  patient: any;
  isExpanded: boolean;
  isSelected: boolean;
  onToggleExpand: () => void;
  onToggleSelect: () => void;
  onDelete: () => void;
  onUpdatePatient: (field: string, value: any) => void;
  onQuickAction: (action: string) => void;
  onPrintStickers?: () => void;
}

export function PatientListItem({
  patient,
  isExpanded,
  isSelected,
  onToggleExpand,
  onToggleSelect,
  onDelete,
  onUpdatePatient,
  onQuickAction,
  onPrintStickers,
}: PatientListItemProps) {
  const [showEditDemographics, setShowEditDemographics] = useState(false);

  // Priority indicator based on patient type
  const getPriorityColor = () => {
    if (patient.type === 'Surgery') return COLORS.pink;
    if (patient.type === 'MRI') return COLORS.lavender;
    return COLORS.mint;
  };

  // Species emoji - support both UnifiedPatient (demographics.species) and legacy (patient_info.species)
  const getSpeciesEmoji = () => {
    const species = (patient.demographics?.species || patient.patient_info?.species || '').toLowerCase();
    if (species.includes('dog') || species.includes('canine')) return '🐕';
    if (species.includes('cat') || species.includes('feline')) return '🐈';
    return '🐾';
  };

  // Type badge color - neo-pop style
  const getTypeBadgeStyle = () => {
    switch (patient.type) {
      case 'Surgery': return { backgroundColor: COLORS.pink, color: '#000' };
      case 'MRI': return { backgroundColor: COLORS.lavender, color: '#000' };
      case 'Medical': return { backgroundColor: COLORS.mint, color: '#000' };
      default: return { backgroundColor: '#E5E7EB', color: '#000' };
    }
  };

  // Status badge color - neo-pop style
  const getStatusBadgeStyle = () => {
    switch (patient.status) {
      case 'New': return { backgroundColor: COLORS.lavender, color: '#000' };
      case 'Hospitalized': return { backgroundColor: COLORS.mint, color: '#000' };
      case 'Discharging': return { backgroundColor: COLORS.pink, color: '#000' };
      default: return { backgroundColor: '#E5E7EB', color: '#000' };
    }
  };

  return (
    <div
      className={`rounded-2xl transition-all overflow-hidden ${patient.status === 'Discharging' ? 'opacity-60' : ''}`}
      style={{
        border: NEO_BORDER,
        boxShadow: isSelected ? `0 0 0 3px ${COLORS.mint}, ${NEO_SHADOW_SM}` : NEO_SHADOW_SM,
        backgroundColor: 'white',
      }}
    >
      {/* Compact one-line view */}
      <div
        className="pl-3 pr-4 py-3 flex items-center gap-3 cursor-pointer transition hover:-translate-y-0.5"
        onClick={onToggleExpand}
        style={{ backgroundColor: isSelected ? `${COLORS.mint}20` : 'white' }}
      >
        {/* Checkbox + Priority grouped together */}
        <div className="flex items-center gap-2 pr-2" style={{ borderRight: '1.5px solid #E5E7EB' }}>
          <input
            type="checkbox"
            checked={isSelected}
            onChange={onToggleSelect}
            onClick={(e) => e.stopPropagation()}
            className="w-4 h-4 rounded border-2 border-gray-900 accent-emerald-500"
            style={{ accentColor: COLORS.mint }}
          />
          {/* Priority indicator dot */}
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: getPriorityColor(), border: '1.5px solid #000' }}
          />
        </div>

        {/* Species + Name */}
        <div className="flex items-center gap-2 min-w-[180px]">
          <span className="text-xl">{getSpeciesEmoji()}</span>
          <span className="font-black text-gray-900 truncate text-base">{patient.demographics?.name || patient.name || 'Unnamed'}</span>
        </div>

        {/* Type dropdown */}
        <select
          value={patient.type || 'Medical'}
          onChange={(e) => {
            e.stopPropagation();
            onUpdatePatient('type', e.target.value);
          }}
          onClick={(e) => e.stopPropagation()}
          className="px-2 py-1 rounded-lg text-xs font-bold cursor-pointer hover:opacity-80 transition focus:outline-none"
          style={{ ...getTypeBadgeStyle(), border: '1.5px solid #000' }}
        >
          <option value="Surgery">Surgery</option>
          <option value="MRI">MRI</option>
          <option value="Medical">Medical</option>
        </select>

        {/* Status dropdown */}
        <select
          value={patient.status || 'New'}
          onChange={(e) => {
            e.stopPropagation();
            onUpdatePatient('status', e.target.value);
          }}
          onClick={(e) => e.stopPropagation()}
          className="px-2 py-1 rounded-lg text-xs font-bold cursor-pointer hover:opacity-80 transition focus:outline-none"
          style={{ ...getStatusBadgeStyle(), border: '1.5px solid #000' }}
        >
          <option value="New Admit">New Admit</option>
          <option value="Hospitalized">Hospitalized</option>
          <option value="Discharging">Discharging</option>
          <option value="Discharged">Discharged</option>
        </select>

        {/* Weight - support both UnifiedPatient (demographics.weight) and legacy (patient_info.weight) */}
        {(patient.demographics?.weight || patient.patient_info?.weight) && (
          <span
            className="text-xs font-bold min-w-[60px] px-2 py-1 rounded-lg"
            style={{ backgroundColor: COLORS.cream, border: '1.5px solid #E5E7EB' }}
          >
            {patient.demographics?.weight || patient.patient_info?.weight}
          </span>
        )}

        {/* Spacer for right alignment */}
        <div className="ml-auto" />

        {/* Expand/collapse icon */}
        <button
          className="text-gray-600 hover:text-gray-900 transition p-1 rounded-lg hover:bg-gray-100"
          onClick={(e) => {
            e.stopPropagation();
            onToggleExpand();
          }}
        >
          {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
        </button>

        {/* Print Stickers button */}
        {onPrintStickers && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onPrintStickers();
            }}
            className="p-1.5 rounded-lg transition hover:-translate-y-0.5"
            style={{ backgroundColor: COLORS.pink, border: '1.5px solid #000' }}
            title="Print Stickers"
          >
            <Tag size={16} className="text-gray-900" />
          </button>
        )}

        {/* Food Calculator (dogs only) */}
        <FoodCalculatorPopover
          weightKg={patient.demographics?.weight || patient.patient_info?.weight}
          species={patient.demographics?.species || patient.patient_info?.species}
          patientName={patient.demographics?.name || patient.name}
        />

        {/* Delete button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            const patientName = patient.demographics?.name || patient.name || 'this patient';
            if (confirm(`Delete ${patientName}?`)) onDelete();
          }}
          className="p-1.5 rounded-lg transition hover:-translate-y-0.5 opacity-50 hover:opacity-100"
          style={{ backgroundColor: '#FEE2E2', border: '1.5px solid #000' }}
        >
          <Trash2 size={14} className="text-gray-900" />
        </button>
      </div>

      {/* Expanded content (shows full card content when expanded) */}
      {isExpanded && (
        <div
          className="px-4 pb-4 pt-3"
          style={{ borderTop: '1.5px solid #E5E7EB', backgroundColor: COLORS.cream }}
        >
          {/* Patient info - support both UnifiedPatient (demographics) and legacy (patient_info) */}
          <div className="mb-3 text-xs text-gray-600 space-y-1">
            {/* Show signalment if available (from VetRadar imports) */}
            {patient.roundingData?.signalment && <div className="font-bold text-gray-900">{patient.roundingData.signalment}</div>}

            {/* Show individual fields if available */}
            <div className="flex flex-wrap gap-2">
              {(patient.demographics?.age || patient.patient_info?.age) && (
                <span className="px-2 py-0.5 rounded-lg font-medium" style={{ backgroundColor: 'white', border: '1px solid #E5E7EB' }}>
                  Age: {patient.demographics?.age || patient.patient_info?.age}
                </span>
              )}
              {(patient.demographics?.breed || patient.patient_info?.breed) && (
                <span className="px-2 py-0.5 rounded-lg font-medium" style={{ backgroundColor: 'white', border: '1px solid #E5E7EB' }}>
                  {patient.demographics?.breed || patient.patient_info?.breed}
                </span>
              )}
              {(patient.demographics?.weight || patient.patient_info?.weight) && (
                <span className="px-2 py-0.5 rounded-lg font-medium" style={{ backgroundColor: 'white', border: '1px solid #E5E7EB' }}>
                  {patient.demographics?.weight || patient.patient_info?.weight}
                </span>
              )}
              {patient.currentStay?.location && (
                <span className="px-2 py-0.5 rounded-lg font-medium" style={{ backgroundColor: COLORS.lavender, border: '1px solid #9B7FCF' }}>
                  📍 {patient.currentStay.location}
                </span>
              )}
            </div>
            {patient.id && <div className="text-gray-400 text-[10px] mt-1">ID: {patient.id}</div>}
          </div>

          {/* Quick action buttons */}
          <div className="flex gap-2 mb-3 flex-wrap">
            <button
              onClick={() => onQuickAction('rounds')}
              className="px-3 py-1.5 rounded-xl text-xs font-bold transition hover:-translate-y-0.5"
              style={{ backgroundColor: COLORS.mint, border: NEO_BORDER }}
            >
              📊 Rounds
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); setShowEditDemographics(!showEditDemographics); }}
              className="px-3 py-1.5 rounded-xl text-xs font-bold transition hover:-translate-y-0.5"
              style={{ backgroundColor: COLORS.lavender, border: NEO_BORDER }}
            >
              ✏️ Edit Info
            </button>
          </div>

          {/* Feeding Schedule (for hospitalized patients) */}
          {(patient.status === 'Hospitalized' || patient.status === 'New Admit') && patient.id && (
            <div className="mb-3">
              <PatientFeedingSchedule
                patientId={patient.id}
                patientName={patient.demographics?.name || patient.name}
                weightKg={parseFloat(String(patient.demographics?.weight || patient.patient_info?.weight || '0').replace(/[^\d.]/g, ''))}
                species={patient.demographics?.species || patient.patient_info?.species}
              />
            </div>
          )}

          {/* Edit Demographics Form */}
          {showEditDemographics && (
            <div
              className="rounded-2xl p-4 mb-3"
              style={{ backgroundColor: 'white', border: NEO_BORDER, boxShadow: NEO_SHADOW_SM }}
            >
              <h4 className="text-sm font-black text-gray-900 mb-3">Edit Patient Demographics</h4>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-gray-600 mb-1 block">Patient Name</label>
                  <input
                    type="text"
                    value={patient.demographics?.name || ''}
                    onChange={(e) => onUpdatePatient('demographics.name', e.target.value)}
                    className="w-full px-3 py-2 rounded-xl text-sm font-medium text-gray-900 bg-white focus:outline-none"
                    style={{ border: NEO_BORDER }}
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-600 mb-1 block">Owner Name</label>
                  <input
                    type="text"
                    value={patient.demographics?.ownerName || ''}
                    onChange={(e) => onUpdatePatient('demographics.ownerName', e.target.value)}
                    className="w-full px-3 py-2 rounded-xl text-sm font-medium text-gray-900 bg-white focus:outline-none"
                    style={{ border: NEO_BORDER }}
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-600 mb-1 block">Owner Phone</label>
                  <input
                    type="text"
                    value={patient.demographics?.ownerPhone || ''}
                    onChange={(e) => onUpdatePatient('demographics.ownerPhone', e.target.value)}
                    className="w-full px-3 py-2 rounded-xl text-sm font-medium text-gray-900 bg-white focus:outline-none"
                    style={{ border: NEO_BORDER }}
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-600 mb-1 block">Patient ID</label>
                  <input
                    type="text"
                    value={patient.demographics?.patientId || ''}
                    onChange={(e) => onUpdatePatient('demographics.patientId', e.target.value)}
                    className="w-full px-3 py-2 rounded-xl text-sm font-medium text-gray-900 bg-white focus:outline-none"
                    style={{ border: NEO_BORDER }}
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-600 mb-1 block">Client ID / Consult #</label>
                  <input
                    type="text"
                    value={patient.demographics?.clientId || ''}
                    onChange={(e) => onUpdatePatient('demographics.clientId', e.target.value)}
                    className="w-full px-3 py-2 rounded-xl text-sm font-medium text-gray-900 bg-white focus:outline-none"
                    style={{ border: NEO_BORDER }}
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-600 mb-1 block">Date of Birth</label>
                  <input
                    type="text"
                    value={patient.demographics?.dateOfBirth || ''}
                    onChange={(e) => onUpdatePatient('demographics.dateOfBirth', e.target.value)}
                    className="w-full px-3 py-2 rounded-xl text-sm font-medium text-gray-900 bg-white focus:outline-none"
                    style={{ border: NEO_BORDER }}
                    placeholder="MM-DD-YYYY"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-600 mb-1 block">Species</label>
                  <input
                    type="text"
                    value={patient.demographics?.species || ''}
                    onChange={(e) => onUpdatePatient('demographics.species', e.target.value)}
                    className="w-full px-3 py-2 rounded-xl text-sm font-medium text-gray-900 bg-white focus:outline-none"
                    style={{ border: NEO_BORDER }}
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-600 mb-1 block">Breed</label>
                  <input
                    type="text"
                    value={patient.demographics?.breed || ''}
                    onChange={(e) => onUpdatePatient('demographics.breed', e.target.value)}
                    className="w-full px-3 py-2 rounded-xl text-sm font-medium text-gray-900 bg-white focus:outline-none"
                    style={{ border: NEO_BORDER }}
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-600 mb-1 block">Age</label>
                  <input
                    type="text"
                    value={patient.demographics?.age || ''}
                    onChange={(e) => onUpdatePatient('demographics.age', e.target.value)}
                    className="w-full px-3 py-2 rounded-xl text-sm font-medium text-gray-900 bg-white focus:outline-none"
                    style={{ border: NEO_BORDER }}
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-600 mb-1 block">Sex</label>
                  <input
                    type="text"
                    value={patient.demographics?.sex || ''}
                    onChange={(e) => onUpdatePatient('demographics.sex', e.target.value)}
                    className="w-full px-3 py-2 rounded-xl text-sm font-medium text-gray-900 bg-white focus:outline-none"
                    style={{ border: NEO_BORDER }}
                    placeholder="MN, FS, etc"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-600 mb-1 block">Weight</label>
                  <input
                    type="text"
                    value={patient.demographics?.weight || ''}
                    onChange={(e) => onUpdatePatient('demographics.weight', e.target.value)}
                    className="w-full px-3 py-2 rounded-xl text-sm font-medium text-gray-900 bg-white focus:outline-none"
                    style={{ border: NEO_BORDER }}
                    placeholder="21.8kg"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-600 mb-1 block">Color/Markings</label>
                  <input
                    type="text"
                    value={patient.demographics?.colorMarkings || ''}
                    onChange={(e) => onUpdatePatient('demographics.colorMarkings', e.target.value)}
                    className="w-full px-3 py-2 rounded-xl text-sm font-medium text-gray-900 bg-white focus:outline-none"
                    style={{ border: NEO_BORDER }}
                  />
                </div>
              </div>
              <div className="mt-4 flex justify-end">
                <button
                  onClick={() => setShowEditDemographics(false)}
                  className="px-4 py-2 rounded-xl text-sm font-bold transition hover:-translate-y-0.5"
                  style={{ backgroundColor: COLORS.mint, border: NEO_BORDER }}
                >
                  Done
                </button>
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  );
}
