'use client';

import React from 'react';

interface SectionDividerProps {
  label: string;
}

export function SectionDivider({ label }: SectionDividerProps) {
  return (
    <div className="flex items-center py-2 my-1">
      <div className="h-px flex-1 bg-gray-200" />
      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-3">
        {label}
      </span>
      <div className="h-px flex-1 bg-gray-200" />
    </div>
  );
}
