'use client';

import React from 'react';
import { PatientChip } from './PatientChip';

export type TaskCardColor = 'coral' | 'lavender' | 'mint' | 'yellow' | 'pink' | 'sky';

interface PatientTask {
  id: number;
  name: string;
  species: 'dog' | 'cat';
  done: boolean;
}

interface TaskCardProps {
  name: string;
  count: { done: number; total: number };
  patients: PatientTask[];
  color: TaskCardColor;
  onPatientClick: (patientId: number) => void;
}

const colorClasses: Record<TaskCardColor, string> = {
  coral: 'bg-neo-coral',
  lavender: 'bg-neo-lavender',
  mint: 'bg-neo-mint',
  yellow: 'bg-neo-yellow',
  pink: 'bg-neo-pink',
  sky: 'bg-neo-sky',
};

export function TaskCard({ name, count, patients, color, onPatientClick }: TaskCardProps) {
  return (
    <div
      className={`
        ${colorClasses[color]}
        p-5 rounded-neo
        shadow-lg hover:shadow-xl
        hover:-translate-y-1
        transition-all duration-200
        cursor-default
      `}
    >
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-extrabold text-base text-neo-text-dark">
          {name}
        </h3>
        <span className="bg-white/60 px-3 py-1 rounded-pill text-sm font-bold text-neo-text-dark">
          {count.done}/{count.total}
        </span>
      </div>

      {/* Patient Chips */}
      <div className="flex flex-wrap gap-2">
        {patients.map((patient) => (
          <PatientChip
            key={patient.id}
            name={patient.name}
            species={patient.species}
            done={patient.done}
            onClick={() => onPatientClick(patient.id)}
          />
        ))}
      </div>
    </div>
  );
}
