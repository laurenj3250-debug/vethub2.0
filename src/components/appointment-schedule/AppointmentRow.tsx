'use client';

import React, { useState } from 'react';
import { GripVertical, Trash2, AlertTriangle } from 'lucide-react';
import { AppointmentPatient } from '@/lib/types/appointment-schedule';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface AppointmentRowProps {
  patient: AppointmentPatient;
  onUpdate: (id: string, field: string, value: any) => void;
  onDelete: (id: string) => void;
}

export function AppointmentRow({ patient, onUpdate, onDelete }: AppointmentRowProps) {
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

  const renderEditableCell = (value: string | null, fieldName: string, placeholder: string = '—') => {
    const isEditing = editingCell === fieldName;
    const isEmpty = !value;
    const lowConfidence = patient.confidence[fieldName] < 0.6;

    return (
      <td
        className={`px-2 py-3 text-xs border-r border-slate-700/30 ${
          isEmpty ? 'bg-slate-800/30' : ''
        } ${lowConfidence ? 'bg-yellow-900/10' : ''} relative group`}
        onClick={() => !isEditing && handleCellClick(fieldName)}
      >
        {isEditing ? (
          <input
            type="text"
            value={value || ''}
            onChange={(e) => onUpdate(patient.id, fieldName, e.target.value)}
            onBlur={handleCellBlur}
            autoFocus
            className="w-full bg-slate-800 border border-cyan-500 rounded px-1 py-0.5 text-white text-xs focus:outline-none"
          />
        ) : (
          <div className="flex items-center gap-1">
            <span className={`flex-1 ${isEmpty ? 'text-slate-600' : 'text-slate-200'}`}>
              {value || placeholder}
            </span>
            {lowConfidence && (
              <AlertTriangle size={12} className="text-yellow-500 flex-shrink-0" title="Low confidence AI extraction" />
            )}
          </div>
        )}
      </td>
    );
  };

  return (
    <tr
      ref={setNodeRef}
      style={style}
      className="border-b border-slate-700/30 hover:bg-slate-800/30 transition"
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

      {/* Appointment Time */}
      {renderEditableCell(patient.appointmentTime, 'appointmentTime', '—')}

      {/* Patient Name */}
      {renderEditableCell(patient.patientName, 'patientName', 'Unknown')}

      {/* Age */}
      {renderEditableCell(patient.age, 'age', '—')}

      {/* Why Here Today */}
      {renderEditableCell(patient.whyHereToday, 'whyHereToday', '—')}

      {/* Last Visit */}
      <td
        className={`px-2 py-3 text-xs border-r border-slate-700/30 ${
          !patient.lastVisit.date ? 'bg-slate-800/30' : ''
        }`}
      >
        <div className="text-slate-200">
          {patient.lastVisit.date && <div className="font-medium">{patient.lastVisit.date}</div>}
          {patient.lastVisit.reason && <div className="text-slate-400">{patient.lastVisit.reason}</div>}
          {!patient.lastVisit.date && !patient.lastVisit.reason && <span className="text-slate-600">—</span>}
        </div>
      </td>

      {/* MRI */}
      <td
        className={`px-2 py-3 text-xs border-r border-slate-700/30 ${
          !patient.mri.date ? 'bg-slate-800/30' : ''
        }`}
      >
        <div className="text-slate-200">
          {patient.mri.date && <div className="font-medium">{patient.mri.date}</div>}
          {patient.mri.findings && <div className="text-slate-400 text-xs">{patient.mri.findings}</div>}
          {!patient.mri.date && !patient.mri.findings && <span className="text-slate-600">—</span>}
        </div>
      </td>

      {/* Bloodwork */}
      <td
        className={`px-2 py-3 text-xs border-r border-slate-700/30 ${
          !patient.bloodwork.date ? 'bg-slate-800/30' : ''
        }`}
      >
        <div className="text-slate-200">
          {patient.bloodwork.date && <div className="font-medium">{patient.bloodwork.date}</div>}
          {patient.bloodwork.abnormalities && patient.bloodwork.abnormalities.length > 0 && (
            <div className="text-slate-400 text-xs">
              {patient.bloodwork.abnormalities.join(', ')}
            </div>
          )}
          {!patient.bloodwork.date && (!patient.bloodwork.abnormalities || patient.bloodwork.abnormalities.length === 0) && (
            <span className="text-slate-600">—</span>
          )}
        </div>
      </td>

      {/* Medications */}
      <td className="px-2 py-3 text-xs border-r border-slate-700/30">
        <div className="text-slate-200 space-y-0.5">
          {patient.medications && patient.medications.length > 0 ? (
            patient.medications.map((med, idx) => (
              <div key={idx} className="text-xs">
                <span className="font-medium">{med.name}</span>
                {' '}
                <span className="text-slate-400">
                  {med.dose} {med.route} {med.frequency}
                </span>
              </div>
            ))
          ) : (
            <span className="text-slate-600">—</span>
          )}
        </div>
      </td>

      {/* Changes Since Last Visit */}
      {renderEditableCell(patient.changesSinceLastVisit, 'changesSinceLastVisit', '—')}

      {/* Other/Misc */}
      {renderEditableCell(patient.otherNotes, 'otherNotes', '—')}

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
}
