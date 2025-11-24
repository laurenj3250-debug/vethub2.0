'use client';

import React, { useState } from 'react';
import { GripVertical, Trash2 } from 'lucide-react';
import { AppointmentPatient } from '@/lib/types/appointment-schedule';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// Neo-pop styling constants
const NEO_BORDER = '2px solid #000';
const COLORS = {
  lavender: '#DCC4F5',
  mint: '#B8E6D4',
  pink: '#FFBDBD',
  cream: '#FFF8F0',
};

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

  // Parse smart time input
  const parseTimeInput = (input: string): string => {
    const cleaned = input.replace(/[^\d]/g, '');
    if (cleaned.length === 0) return '';

    let hours = 0;
    let minutes = 0;

    if (cleaned.length <= 2) {
      hours = parseInt(cleaned);
      minutes = 0;
    } else if (cleaned.length === 3) {
      hours = parseInt(cleaned.substring(0, 1));
      minutes = parseInt(cleaned.substring(1, 3));
    } else {
      hours = parseInt(cleaned.substring(0, cleaned.length - 2));
      minutes = parseInt(cleaned.substring(cleaned.length - 2));
    }

    if (hours > 23) hours = 23;
    if (minutes > 59) minutes = 59;

    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;

    return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
  };

  const generateTimeOptions = (): string[] => {
    const options: string[] = [];
    for (let hour = 7; hour <= 19; hour++) {
      for (let minute = 0; minute < 60; minute += 15) {
        const period = hour >= 12 ? 'PM' : 'AM';
        const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
        options.push(`${displayHour}:${minute.toString().padStart(2, '0')} ${period}`);
      }
    }
    return options;
  };

  const renderEditableCell = (value: string | null, fieldName: string, placeholder: string = '—', multiline: boolean = false) => {
    const isEditing = editingCell === fieldName;
    const isEmpty = !value;

    return (
      <td
        className={`px-2 py-3 text-xs cursor-pointer hover:bg-gray-50 relative group`}
        style={{ borderRight: '1px solid #ccc', borderBottom: '1px solid #ccc' }}
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
              className="w-full bg-white rounded-lg px-2 py-1 text-gray-900 text-xs focus:outline-none focus:ring-2 focus:ring-[#6BB89D] resize-none"
              style={{ border: '1px solid #000' }}
            />
          ) : (
            <input
              type="text"
              value={value || ''}
              onChange={(e) => onUpdate(patient.id, fieldName, e.target.value)}
              onBlur={handleCellBlur}
              autoFocus
              className="w-full bg-white rounded-lg px-2 py-1 text-gray-900 text-xs focus:outline-none focus:ring-2 focus:ring-[#6BB89D]"
              style={{ border: '1px solid #000' }}
            />
          )
        ) : (
          <div className="flex items-center gap-1">
            <span className={`flex-1 ${isEmpty ? 'text-gray-400' : 'text-gray-900'} whitespace-pre-wrap`}>
              {value || placeholder}
            </span>
          </div>
        )}
      </td>
    );
  };

  const renderTimeCell = () => {
    const isEditing = editingCell === 'appointmentTime';
    const isEmpty = !patient.appointmentTime;

    return (
      <td
        className={`px-2 py-3 text-xs cursor-pointer hover:bg-gray-50 relative group`}
        style={{ borderRight: '1px solid #ccc', borderBottom: '1px solid #ccc' }}
        onClick={() => !isEditing && handleCellClick('appointmentTime')}
      >
        {isEditing ? (
          <div className="relative">
            <input
              type="text"
              value={patient.appointmentTime || ''}
              onChange={(e) => onUpdate(patient.id, 'appointmentTime', e.target.value)}
              onBlur={(e) => {
                const parsed = parseTimeInput(e.target.value);
                if (parsed) {
                  onUpdate(patient.id, 'appointmentTime', parsed);
                }
                handleCellBlur();
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  const parsed = parseTimeInput(e.currentTarget.value);
                  if (parsed) {
                    onUpdate(patient.id, 'appointmentTime', parsed);
                  }
                  handleCellBlur();
                }
              }}
              autoFocus
              placeholder="9:30 AM"
              className="w-full bg-white rounded-lg px-2 py-1 text-gray-900 text-xs focus:outline-none focus:ring-2 focus:ring-[#6BB89D]"
              style={{ border: '1px solid #000' }}
              list={`time-options-${patient.id}`}
            />
            <datalist id={`time-options-${patient.id}`}>
              {generateTimeOptions().map((time) => (
                <option key={time} value={time} />
              ))}
            </datalist>
          </div>
        ) : (
          <div className="flex items-center gap-1">
            <span className={`flex-1 ${isEmpty ? 'text-gray-400' : 'text-gray-900 font-bold'}`}>
              {patient.appointmentTime || '—'}
            </span>
          </div>
        )}
      </td>
    );
  };

  const getStatusBadgeStyle = () => {
    if (patient.status === 'new') return { backgroundColor: COLORS.mint, color: '#000' };
    if (patient.status === 'mri-dropoff') return { backgroundColor: COLORS.lavender, color: '#000' };
    return { backgroundColor: '#E5E7EB', color: '#000' };
  };

  return (
    <tr
      ref={setNodeRef}
      style={{ ...style, backgroundColor: 'white' }}
      className="transition"
    >
      {/* Drag Handle */}
      <td
        className="px-2 py-3"
        style={{ borderRight: '1px solid #ccc', borderBottom: '1px solid #ccc' }}
      >
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600"
        >
          <GripVertical size={16} />
        </div>
      </td>

      {/* Appointment Time */}
      {renderTimeCell()}

      {/* Patient Name with Status Badge */}
      <td
        className={`px-2 py-3 text-xs relative group cursor-pointer hover:bg-gray-50`}
        style={{ borderRight: '1px solid #ccc', borderBottom: '1px solid #ccc' }}
        onClick={() => !editingCell && handleCellClick('patientName')}
      >
        {editingCell === 'patientName' ? (
          <input
            type="text"
            value={patient.patientName || ''}
            onChange={(e) => onUpdate(patient.id, 'patientName', e.target.value)}
            onBlur={handleCellBlur}
            autoFocus
            className="w-full bg-white rounded-lg px-2 py-1 text-gray-900 text-xs focus:outline-none focus:ring-2 focus:ring-[#6BB89D]"
            style={{ border: '1px solid #000' }}
          />
        ) : (
          <div className="flex items-center gap-2">
            <span className={`flex-1 ${!patient.patientName ? 'text-gray-400' : 'text-gray-900 font-bold'}`}>
              {patient.patientName || 'Unknown'}
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                const nextStatus =
                  patient.status === 'new'
                    ? 'recheck'
                    : patient.status === 'recheck'
                    ? 'mri-dropoff'
                    : 'new';
                onUpdate(patient.id, 'status', nextStatus);
              }}
              className="px-1.5 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wide transition-colors"
              style={{ ...getStatusBadgeStyle(), border: '1px solid #000' }}
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
      <td
        className="px-2 py-3"
        style={{ borderBottom: '1px solid #ccc' }}
      >
        <div className="flex items-center gap-1">
          <button
            onClick={() => onDelete(patient.id)}
            className="p-1.5 rounded-lg transition text-gray-500 hover:text-red-500 hover:bg-red-50"
            style={{ border: '1px solid #ccc' }}
          >
            <Trash2 size={14} />
          </button>
        </div>
      </td>
    </tr>
  );
};

export const AppointmentRow = React.memo(AppointmentRowComponent);
