'use client';

import React, { useState } from 'react';
import { GripVertical, Trash2 } from 'lucide-react';
import { AppointmentPatient } from '@/lib/types/appointment-schedule';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface AppointmentRowProps {
  patient: AppointmentPatient;
  onUpdate: (id: string, field: string, value: any) => void;
  onDelete: (id: string) => void;
}

const AppointmentRowComponent = ({ patient, onUpdate, onDelete }: AppointmentRowProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: patient.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const [editingCell, setEditingCell] = useState<string | null>(null);

  const handleCellClick = (fieldName: string) => {
    setEditingCell(fieldName);
  };

  const handleCellBlur = () => {
    setEditingCell(null);
  };

  const renderEditableCell = (value: string | null, fieldName: string, placeholder: string = '—', multiline: boolean = false) => {
    const isEditing = editingCell === fieldName;
    const isEmpty = !value;

    return (
      <td
        className={`px-2 py-3 text-xs border-r border-slate-700/30 ${
          isEmpty ? 'bg-slate-800/30' : ''
        } cursor-pointer hover:bg-slate-700/20 relative group`}
        onClick={() => !isEditing && handleCellClick(fieldName)}
      >
        {isEditing ? (
          multiline ? (
            <textarea
              value={value || ''}
              onChange={(e) => onUpdate(patient.id, fieldName, e.target.value)}
              onBlur={handleCellBlur}
              autoFocus
              rows={3}
              className="w-full bg-slate-800 border border-cyan-500 rounded px-1 py-0.5 text-white text-xs focus:outline-none resize-none"
            />
          ) : (
            <input
              type="text"
              value={value || ''}
              onChange={(e) => onUpdate(patient.id, fieldName, e.target.value)}
              onBlur={handleCellBlur}
              autoFocus
              className="w-full bg-slate-800 border border-cyan-500 rounded px-1 py-0.5 text-white text-xs focus:outline-none"
            />
          )
        ) : (
          <div className="flex items-center gap-1">
            <span className={`flex-1 ${isEmpty ? 'text-slate-600' : 'text-slate-200'} whitespace-pre-wrap`}>
              {value || placeholder}
            </span>
          </div>
        )}
      </td>
    );
  };

  // Color coding based on status
  const statusColors =
    patient.status === 'new'
      ? 'bg-emerald-500/5 border-l-4 border-emerald-500/50'
      : patient.status === 'mri-dropoff'
      ? 'bg-purple-500/5 border-l-4 border-purple-500/50'
      : 'bg-blue-500/5 border-l-4 border-blue-500/50';

  return (
    <tr
      ref={setNodeRef}
      style={style}
      className={`border-b border-slate-700/30 hover:bg-slate-800/30 transition ${statusColors}`}
    >
      {/* Drag Handle */}
      <td className="px-2 py-3 border-r border-slate-700/30">
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing text-slate-600 hover:text-slate-400"
        >
          <GripVertical size={16} />
        </div>
      </td>

      {/* Patient Name with Status Badge */}
      <td
        className={`px-2 py-3 text-xs border-r border-slate-700/30 ${
          !patient.patientName ? 'bg-slate-800/30' : ''
        } relative group`}
        onClick={() => !editingCell && handleCellClick('patientName')}
      >
        {editingCell === 'patientName' ? (
          <input
            type="text"
            value={patient.patientName || ''}
            onChange={(e) => onUpdate(patient.id, 'patientName', e.target.value)}
            onBlur={handleCellBlur}
            autoFocus
            className="w-full bg-slate-800 border border-cyan-500 rounded px-1 py-0.5 text-white text-xs focus:outline-none"
          />
        ) : (
          <div className="flex items-center gap-2">
            <span className={`flex-1 ${!patient.patientName ? 'text-slate-600' : 'text-slate-200'}`}>
              {patient.patientName || 'Unknown'}
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                // Cycle through: new -> recheck -> mri-dropoff -> new
                const nextStatus =
                  patient.status === 'new'
                    ? 'recheck'
                    : patient.status === 'recheck'
                    ? 'mri-dropoff'
                    : 'new';
                onUpdate(patient.id, 'status', nextStatus);
              }}
              className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide transition-colors ${
                patient.status === 'new'
                  ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30'
                  : patient.status === 'mri-dropoff'
                  ? 'bg-purple-500/20 text-purple-400 hover:bg-purple-500/30'
                  : 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30'
              }`}
              title="Click to cycle: New → Recheck → MRI Drop Off"
            >
              {patient.status === 'new' ? 'NEW' : patient.status === 'mri-dropoff' ? 'MRI' : 'RECHECK'}
            </button>
          </div>
        )}
      </td>

      {/* Age */}
      {renderEditableCell(patient.age, 'age', '—')}

      {/* Why Here Today */}
      {renderEditableCell(patient.whyHereToday, 'whyHereToday', '—')}

      {/* Last Visit */}
      {renderEditableCell(patient.lastVisit, 'lastVisit', '—', true)}

      {/* MRI */}
      {renderEditableCell(patient.mri, 'mri', '—', true)}

      {/* Bloodwork */}
      {renderEditableCell(patient.bloodwork, 'bloodwork', '—', true)}

      {/* Medications */}
      {renderEditableCell(patient.medications, 'medications', '—', true)}

      {/* Changes Since Last Visit */}
      {renderEditableCell(patient.changesSinceLastVisit, 'changesSinceLastVisit', '—', true)}

      {/* Other/Misc */}
      {renderEditableCell(patient.otherNotes, 'otherNotes', '—', true)}

      {/* Actions */}
      <td className="px-2 py-3 border-r border-slate-700/30">
        <button
          onClick={() => onDelete(patient.id)}
          className="p-1 text-slate-600 hover:text-red-400 hover:bg-red-500/10 rounded transition"
        >
          <Trash2 size={14} />
        </button>
      </td>
    </tr>
  );
};

// Memoize to prevent re-renders when other rows change
export const AppointmentRow = React.memo(AppointmentRowComponent);
