'use client';

import React from 'react';

interface PatientChipProps {
  name: string;
  species: 'dog' | 'cat';
  done: boolean;
  onClick: () => void;
}

const speciesEmoji: Record<string, string> = {
  dog: '🐕',
  cat: '🐱',
};

export function PatientChip({ name, species, done, onClick }: PatientChipProps) {
  return (
    <button
      onClick={onClick}
      className={`
        bg-white/70 hover:bg-white
        px-3.5 py-2 rounded-pill
        text-sm font-semibold text-neo-text-dark
        hover:scale-105
        transition-all duration-200
        flex items-center gap-1.5
        ${done ? 'line-through opacity-60' : ''}
      `}
    >
      <span>{done ? '✓' : speciesEmoji[species]}</span>
      <span>{name}</span>
    </button>
  );
}
