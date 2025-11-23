'use client';

import React from 'react';

type PatientStatus = 'critical' | 'monitoring' | 'stable' | 'discharged' | 'new';
type PatientType = 'Medical' | 'MRI' | 'Surgery';

interface PatientRowProps {
  id: number;
  name: string;
  species: 'dog' | 'cat';
  breed?: string;
  age?: string;
  weight?: number;
  type: PatientType;
  status: PatientStatus;
  onExpand: () => void;
  onTag: () => void;
}

const speciesEmoji: Record<string, string> = {
  dog: '🐕',
  cat: '🐱',
};

const speciesColors: Record<string, string> = {
  dog: 'bg-neo-yellow',
  cat: 'bg-neo-pink',
};

const statusClasses: Record<PatientStatus, string> = {
  critical: 'bg-status-critical text-white',
  monitoring: 'bg-status-monitoring text-white',  // White text on soft peach
  stable: 'bg-status-stable text-white',
  discharged: 'bg-status-discharged text-white',
  new: 'bg-status-new text-white',
};

const statusLabels: Record<PatientStatus, string> = {
  critical: 'Critical',
  monitoring: 'Hospitalized',
  stable: 'Stable',
  discharged: 'Discharged',
  new: 'New Admit',
};

export function PatientRow({
  name,
  species,
  breed,
  age,
  weight,
  type,
  status,
  onExpand,
  onTag,
}: PatientRowProps) {
  return (
    <div
      className="
        flex items-center gap-4
        p-4 bg-neo-cream-light rounded-neo-sm
        hover:bg-neo-cream hover:translate-x-1
        transition-all duration-200
        cursor-pointer
      "
      onClick={onExpand}
    >
      {/* Avatar */}
      <div
        className={`
          w-12 h-12 rounded-neo-sm
          flex items-center justify-center
          text-2xl
          ${speciesColors[species]}
        `}
      >
        {speciesEmoji[species]}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="font-bold text-base text-neo-text-dark truncate">
          {name}
        </div>
        <div className="text-sm text-neo-text-secondary truncate">
          {breed && `${breed}`}
          {breed && age && ' • '}
          {age && `${age}`}
        </div>
      </div>

      {/* Type Badge */}
      <span className="px-3.5 py-1.5 rounded-pill text-xs font-bold bg-gray-100 text-neo-text-secondary">
        {type}
      </span>

      {/* Status Badge */}
      <span className={`px-3.5 py-1.5 rounded-pill text-xs font-bold ${statusClasses[status]}`}>
        {statusLabels[status]}
      </span>

      {/* Weight */}
      {weight && (
        <span className="text-sm text-neo-text-secondary font-semibold w-16 text-right">
          {weight}kg
        </span>
      )}

      {/* Actions */}
      <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={onTag}
          className="
            w-9 h-9 rounded-xl
            bg-gray-100 hover:bg-neo-purple hover:text-white
            flex items-center justify-center
            transition-all duration-200
          "
        >
          🏷️
        </button>
        <button
          onClick={onExpand}
          className="
            w-9 h-9 rounded-xl
            bg-gray-100 hover:bg-neo-purple hover:text-white
            flex items-center justify-center
            transition-all duration-200
          "
        >
          →
        </button>
      </div>
    </div>
  );
}
