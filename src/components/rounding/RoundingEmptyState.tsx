'use client';

import React from 'react';
import { NEO_BORDER, NEO_SHADOW, NEO_COLORS } from '@/config/neo-pop';

/**
 * Empty state display when no active patients
 */
export function RoundingEmptyState() {
  return (
    <div
      className="text-center py-8 rounded-2xl"
      style={{ backgroundColor: 'white', border: NEO_BORDER, boxShadow: NEO_SHADOW }}
    >
      <div
        className="w-16 h-16 rounded-full mx-auto mb-3 flex items-center justify-center text-2xl"
        style={{ backgroundColor: NEO_COLORS.lavender, border: NEO_BORDER }}
      >
        <span role="img" aria-label="clipboard">
          📋
        </span>
      </div>
      <p className="text-gray-500 font-bold">No active patients to display</p>
      <p className="text-sm text-gray-400 mt-1">
        Patients will appear here once admitted
      </p>
    </div>
  );
}
