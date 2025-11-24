'use client';

import React from 'react';
import { RoundingRow } from './RoundingRow';
import { ROUNDING_FIELDS } from '@/config/rounding-fields';
import { NEO_BORDER, NEO_SHADOW, NEO_COLORS } from '@/config/neo-pop';
import type { Patient, RoundingData, RoundingFieldKey, SaveStatus, QuickInsertState } from '@/types/rounding';

interface RoundingTableProps {
  patients: Patient[];
  getPatientData: (patientId: number) => RoundingData;
  hasChanges: (patientId: number) => boolean;
  saveStatus: Map<number, SaveStatus>;
  isSaving: boolean;
  autoFilledFields: Record<number, Set<string>>;
  quickInsert: QuickInsertState | null;
  onFieldChange: (patientId: number, field: RoundingFieldKey, value: string) => void;
  onPaste: (patientId: number, field: RoundingFieldKey, e: React.ClipboardEvent) => void;
  onSave: (patientId: number) => void;
  onCopy: (patientId: number) => void;
  onQuickInsertOpen: (patientId: number, field: QuickInsertState['field']) => void;
  onQuickInsertClose: () => void;
  onQuickInsert: (text: string) => void;
}

/**
 * Rounding table with header and patient rows
 */
export function RoundingTable({
  patients,
  getPatientData,
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
}: RoundingTableProps) {
  return (
    <div
      className="overflow-x-auto rounded-2xl"
      style={{ border: NEO_BORDER, boxShadow: NEO_SHADOW }}
    >
      <table className="w-full border-collapse bg-white overflow-hidden">
        <thead>
          <tr
            className="text-gray-900 text-xs font-bold"
            style={{ backgroundColor: NEO_COLORS.mint }}
          >
            {/* Patient column */}
            <th
              className="p-2 text-left sticky left-0 z-10 min-w-[120px]"
              style={{
                backgroundColor: NEO_COLORS.mint,
                borderRight: NEO_BORDER,
                borderBottom: NEO_BORDER,
              }}
            >
              Patient
            </th>

            {/* Data columns */}
            {ROUNDING_FIELDS.map((field) => (
              <th
                key={field.key}
                className={`p-2 text-left ${field.width}`}
                style={{ borderRight: '1px solid #000', borderBottom: NEO_BORDER }}
              >
                {field.label}
              </th>
            ))}

            {/* Actions column */}
            <th
              className="p-2 text-center sticky right-0 z-10 min-w-[80px]"
              style={{
                backgroundColor: NEO_COLORS.mint,
                borderLeft: NEO_BORDER,
                borderBottom: NEO_BORDER,
              }}
            >
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          {patients.map((patient) => (
            <RoundingRow
              key={patient.id}
              patient={patient}
              data={getPatientData(patient.id)}
              hasChanges={hasChanges(patient.id)}
              saveStatus={saveStatus.get(patient.id)}
              isSaving={isSaving}
              autoFilledFields={autoFilledFields[patient.id]}
              quickInsert={
                quickInsert?.patientId === patient.id ? quickInsert : null
              }
              onFieldChange={(field, value) => onFieldChange(patient.id, field, value)}
              onPaste={(field, e) => onPaste(patient.id, field, e)}
              onSave={() => onSave(patient.id)}
              onCopy={() => onCopy(patient.id)}
              onQuickInsertOpen={(field) => onQuickInsertOpen(patient.id, field)}
              onQuickInsertClose={onQuickInsertClose}
              onQuickInsert={onQuickInsert}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
