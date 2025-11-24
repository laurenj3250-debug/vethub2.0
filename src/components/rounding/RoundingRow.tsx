'use client';

import React, { useRef } from 'react';
import Link from 'next/link';
import { Save, Copy, ExternalLink } from 'lucide-react';
import { RoundingCell } from './RoundingCell';
import { QuickInsertPanel } from '@/components/QuickInsertPanel';
import { useClickOutside, useEscapeKey } from '@/hooks/useClickOutside';
import { ROUNDING_FIELDS } from '@/config/rounding-fields';
import { NEO_BORDER, NEO_COLORS, getRowBackground } from '@/config/neo-pop';
import type { Patient, RoundingData, RoundingFieldKey, SaveStatus, QuickInsertState } from '@/types/rounding';

interface RoundingRowProps {
  patient: Patient;
  data: RoundingData;
  hasChanges: boolean;
  saveStatus?: SaveStatus;
  isSaving: boolean;
  autoFilledFields?: Set<string>;
  quickInsert: QuickInsertState | null;
  onFieldChange: (field: RoundingFieldKey, value: string) => void;
  onPaste: (field: RoundingFieldKey, e: React.ClipboardEvent) => void;
  onSave: () => void;
  onCopy: () => void;
  onQuickInsertOpen: (field: QuickInsertState['field']) => void;
  onQuickInsertClose: () => void;
  onQuickInsert: (text: string) => void;
}

/**
 * Single patient row in the rounding table
 */
export function RoundingRow({
  patient,
  data,
  hasChanges,
  saveStatus,
  isSaving,
  autoFilledFields,
  quickInsert,
  onFieldChange,
  onPaste,
  onSave,
  onCopy,
  onQuickInsertOpen,
  onQuickInsertClose,
  onQuickInsert,
}: RoundingRowProps) {
  const quickInsertRef = useRef<HTMLDivElement>(null);
  const rowBg = getRowBackground(hasChanges);

  // Close quick insert on outside click or escape
  useClickOutside(quickInsertRef, onQuickInsertClose, quickInsert !== null);
  useEscapeKey(onQuickInsertClose, quickInsert !== null);

  // Get patient display name
  const patientName =
    patient.demographics?.name ||
    patient.name ||
    patient.patient_info?.name ||
    `Patient ${patient.id}`;

  return (
    <tr style={{ backgroundColor: rowBg }}>
      {/* Patient Name (sticky) */}
      <td
        className="p-2 sticky left-0 z-10"
        style={{ backgroundColor: rowBg, borderRight: NEO_BORDER, borderBottom: '1px solid #000' }}
      >
        <Link
          href={`/?patient=${patient.id}`}
          className="group flex flex-col gap-1 hover:text-[#6BB89D] transition"
        >
          <div className="flex items-center gap-2">
            <div className="font-bold text-gray-900 group-hover:text-[#6BB89D]">
              {patientName}
            </div>
            <ExternalLink
              size={12}
              className="opacity-0 group-hover:opacity-100 text-[#6BB89D]"
            />
          </div>
          <div className="text-xs text-gray-500 font-medium">
            {patient.demographics?.age} {patient.demographics?.breed}
          </div>
        </Link>
      </td>

      {/* Data fields */}
      {ROUNDING_FIELDS.map((field) => {
        const isQuickInsertField = field.supportsQuickInsert;
        const isQuickInsertOpen =
          quickInsert?.patientId === patient.id && quickInsert?.field === field.key;

        return (
          <React.Fragment key={field.key}>
            <RoundingCell
              field={field}
              value={(data[field.key] as string) || ''}
              patientName={patientName}
              onChange={(value) => onFieldChange(field.key, value)}
              onPaste={(e) => onPaste(field.key, e)}
              onFocus={
                isQuickInsertField
                  ? () => onQuickInsertOpen(field.key as QuickInsertState['field'])
                  : undefined
              }
              isAutoFilled={autoFilledFields?.has(field.key)}
              saveStatus={saveStatus}
            />
            {/* Quick Insert Popup */}
            {isQuickInsertOpen && field.quickInsertField && (
              <div
                ref={quickInsertRef}
                className="absolute top-full left-0 mt-1 z-30 min-w-[600px]"
                style={{ position: 'absolute' }}
              >
                <QuickInsertPanel
                  field={field.quickInsertField}
                  onInsert={onQuickInsert}
                />
              </div>
            )}
          </React.Fragment>
        );
      })}

      {/* Actions (sticky) */}
      <td
        className="p-2 text-center sticky right-0 z-10"
        style={{ backgroundColor: rowBg, borderLeft: NEO_BORDER, borderBottom: '1px solid #000' }}
      >
        <div className="flex flex-col gap-1">
          <button
            onClick={onCopy}
            className="px-3 py-1 rounded-lg text-xs font-bold transition hover:-translate-y-0.5 flex items-center justify-center gap-1 text-gray-900"
            style={{ backgroundColor: NEO_COLORS.lavender, border: '1.5px solid #000' }}
            title="Copy this patient's row"
            aria-label={`Copy ${patientName}'s row`}
          >
            <Copy size={12} />
            Copy
          </button>
          <button
            onClick={onSave}
            disabled={!hasChanges || isSaving}
            className="px-3 py-1 rounded-lg text-xs font-bold transition hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed text-gray-900"
            style={{ backgroundColor: NEO_COLORS.mint, border: '1.5px solid #000' }}
            aria-label={`Save ${patientName}'s data`}
          >
            {saveStatus === 'saving' ? '...' : saveStatus === 'saved' ? '✓' : 'Save'}
          </button>
        </div>
      </td>
    </tr>
  );
}
