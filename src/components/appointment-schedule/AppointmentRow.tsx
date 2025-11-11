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
      <td
        className={`px-2 py-3 text-xs border-r border-slate-700/30 ${
          !patient.lastVisit.date ? 'bg-slate-800/30' : ''
        } cursor-pointer group`}
        onClick={() => !editingCell && handleCellClick('lastVisit')}
      >
        {editingCell === 'lastVisit' ? (
          <div className="space-y-1">
            <input
              type="text"
              value={patient.lastVisit.date || ''}
              onChange={(e) => onUpdate(patient.id, 'lastVisit', { ...patient.lastVisit, date: e.target.value })}
              onBlur={handleCellBlur}
              autoFocus
              placeholder="Date (MM/DD/YYYY)"
              className="w-full bg-slate-800 border border-cyan-500 rounded px-1 py-0.5 text-white text-xs focus:outline-none"
            />
            <input
              type="text"
              value={patient.lastVisit.reason || ''}
              onChange={(e) => onUpdate(patient.id, 'lastVisit', { ...patient.lastVisit, reason: e.target.value })}
              onBlur={handleCellBlur}
              placeholder="Reason"
              className="w-full bg-slate-800 border border-cyan-500 rounded px-1 py-0.5 text-white text-xs focus:outline-none"
            />
          </div>
        ) : (
          <div className="text-slate-200">
            {patient.lastVisit.date && <div className="font-medium">{patient.lastVisit.date}</div>}
            {patient.lastVisit.reason && <div className="text-slate-400">{patient.lastVisit.reason}</div>}
            {!patient.lastVisit.date && !patient.lastVisit.reason && <span className="text-slate-600">—</span>}
          </div>
        )}
      </td>

      {/* MRI */}
      <td
        className={`px-2 py-3 text-xs border-r border-slate-700/30 ${
          !patient.mri.date ? 'bg-slate-800/30' : ''
        } cursor-pointer group`}
        onClick={() => !editingCell && handleCellClick('mri')}
      >
        {editingCell === 'mri' ? (
          <div className="space-y-1">
            <input
              type="text"
              value={patient.mri.date || ''}
              onChange={(e) => onUpdate(patient.id, 'mri', { ...patient.mri, date: e.target.value })}
              onBlur={handleCellBlur}
              autoFocus
              placeholder="Date (MM/DD/YYYY)"
              className="w-full bg-slate-800 border border-cyan-500 rounded px-1 py-0.5 text-white text-xs focus:outline-none"
            />
            <textarea
              value={patient.mri.findings || ''}
              onChange={(e) => onUpdate(patient.id, 'mri', { ...patient.mri, findings: e.target.value })}
              onBlur={handleCellBlur}
              placeholder="Findings"
              rows={2}
              className="w-full bg-slate-800 border border-cyan-500 rounded px-1 py-0.5 text-white text-xs focus:outline-none resize-none"
            />
          </div>
        ) : (
          <div className="text-slate-200">
            {patient.mri.date && <div className="font-medium">{patient.mri.date}</div>}
            {patient.mri.findings && <div className="text-slate-400 text-xs">{patient.mri.findings}</div>}
            {!patient.mri.date && !patient.mri.findings && <span className="text-slate-600">—</span>}
          </div>
        )}
      </td>

      {/* Bloodwork */}
      <td
        className={`px-2 py-3 text-xs border-r border-slate-700/30 ${
          !patient.bloodwork.date ? 'bg-slate-800/30' : ''
        } cursor-pointer group`}
        onClick={() => !editingCell && handleCellClick('bloodwork')}
      >
        {editingCell === 'bloodwork' ? (
          <div className="space-y-1">
            <input
              type="text"
              value={patient.bloodwork.date || ''}
              onChange={(e) => onUpdate(patient.id, 'bloodwork', { ...patient.bloodwork, date: e.target.value })}
              onBlur={handleCellBlur}
              autoFocus
              placeholder="Date (MM/DD/YYYY)"
              className="w-full bg-slate-800 border border-cyan-500 rounded px-1 py-0.5 text-white text-xs focus:outline-none"
            />
            <textarea
              value={patient.bloodwork.abnormalities?.join(', ') || ''}
              onChange={(e) => {
                const values = e.target.value ? e.target.value.split(',').map(v => v.trim()) : [];
                onUpdate(patient.id, 'bloodwork', { ...patient.bloodwork, abnormalities: values });
              }}
              onBlur={handleCellBlur}
              placeholder="Abnormalities (comma-separated)"
              rows={2}
              className="w-full bg-slate-800 border border-cyan-500 rounded px-1 py-0.5 text-white text-xs focus:outline-none resize-none"
            />
          </div>
        ) : (
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
        )}
      </td>

      {/* Medications */}
      <td
        className="px-2 py-3 text-xs border-r border-slate-700/30 cursor-pointer group"
        onClick={() => !editingCell && handleCellClick('medications')}
      >
        {editingCell === 'medications' ? (
          <textarea
            value={patient.medications?.map(m => `${m.name} ${m.dose} ${m.route} ${m.frequency}`).join('\n') || ''}
            onChange={(e) => {
              const lines = e.target.value.split('\n').filter(l => l.trim());
              const meds = lines.map(line => {
                const parts = line.trim().split(/\s+/);
                return {
                  name: parts[0] || '',
                  dose: parts[1] || '',
                  route: parts[2] || '',
                  frequency: parts[3] || ''
                };
              });
              onUpdate(patient.id, 'medications', meds);
            }}
            onBlur={handleCellBlur}
            autoFocus
            placeholder="One med per line: Name Dose Route Frequency"
            rows={3}
            className="w-full bg-slate-800 border border-cyan-500 rounded px-1 py-0.5 text-white text-xs focus:outline-none resize-none"
          />
        ) : (
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
        )}
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
