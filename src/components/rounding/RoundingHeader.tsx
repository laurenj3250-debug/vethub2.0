'use client';

import React from 'react';
import { Save, Copy } from 'lucide-react';
import { NEO_BORDER, NEO_SHADOW, NEO_COLORS } from '@/config/neo-pop';

interface RoundingHeaderProps {
  patientCount: number;
  pendingCount: number;
  isSaving: boolean;
  onExport: () => void;
  onSaveAll: () => void;
}

/**
 * Header actions bar for rounding sheet
 */
export function RoundingHeader({
  patientCount,
  pendingCount,
  isSaving,
  onExport,
  onSaveAll,
}: RoundingHeaderProps) {
  return (
    <div
      className="flex items-center justify-between rounded-2xl p-4"
      style={{ backgroundColor: 'white', border: NEO_BORDER, boxShadow: NEO_SHADOW }}
    >
      <div className="flex items-center gap-3">
        <button
          onClick={onExport}
          className="px-4 py-2 rounded-xl font-bold text-gray-900 transition hover:-translate-y-0.5 flex items-center gap-2"
          style={{
            backgroundColor: NEO_COLORS.lavender,
            border: NEO_BORDER,
            boxShadow: '3px 3px 0 #000',
          }}
          aria-label="Copy rounding sheet to clipboard"
        >
          <Copy size={16} />
          Copy to Clipboard
        </button>
        <div>
          <h2 className="text-xl font-black text-gray-900">Rounding Sheet</h2>
          <p className="text-sm font-medium text-gray-500">
            {patientCount} active patient{patientCount !== 1 ? 's' : ''}
          </p>
        </div>
      </div>
      <button
        onClick={onSaveAll}
        disabled={isSaving || pendingCount === 0}
        className="px-4 py-2 rounded-xl font-bold text-gray-900 transition hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        style={{
          backgroundColor: NEO_COLORS.mint,
          border: NEO_BORDER,
          boxShadow: '3px 3px 0 #000',
        }}
        aria-label={`Save all ${pendingCount} pending changes`}
      >
        <Save size={16} />
        Save All {pendingCount > 0 && `(${pendingCount})`}
      </button>
    </div>
  );
}
