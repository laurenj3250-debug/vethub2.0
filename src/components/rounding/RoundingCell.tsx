'use client';

import React from 'react';
import type { RoundingFieldConfig, SaveStatus } from '@/types/rounding';
import { NEO_STYLES } from '@/config/neo-pop';

interface RoundingCellProps {
  field: RoundingFieldConfig;
  value: string;
  patientName: string;
  onChange: (value: string) => void;
  onPaste: (e: React.ClipboardEvent) => void;
  onFocus?: () => void;
  isAutoFilled?: boolean;
  saveStatus?: SaveStatus;
}

/**
 * Single cell in the rounding table
 * Renders input, select, or textarea based on field type
 */
export function RoundingCell({
  field,
  value,
  patientName,
  onChange,
  onPaste,
  onFocus,
  isAutoFilled,
  saveStatus,
}: RoundingCellProps) {
  const baseClassName = `w-full px-2 py-1 rounded-lg text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-[#6BB89D] resize-none ${
    isAutoFilled ? 'bg-amber-50' : 'bg-gray-50'
  }`;

  const ariaLabel = `${field.label} for ${patientName}`;

  // Save status indicator
  const StatusIndicator = () => {
    if (!saveStatus) return null;
    return (
      <span className="absolute top-0 right-0 text-xs px-1">
        {saveStatus === 'saving' && '...'}
        {saveStatus === 'saved' && '✓'}
        {saveStatus === 'error' && '✗'}
      </span>
    );
  };

  if (field.type === 'select') {
    return (
      <td
        className="p-1 relative"
        style={{ borderRight: '1px solid #ccc', borderBottom: '1px solid #ccc' }}
      >
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onPaste={onPaste}
          className={baseClassName}
          style={NEO_STYLES.input}
          aria-label={ariaLabel}
        >
          <option value="">{field.key === 'code' ? 'Select...' : ''}</option>
          {field.options?.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
        <StatusIndicator />
      </td>
    );
  }

  if (field.type === 'textarea') {
    return (
      <td
        className="p-1 relative"
        style={{ borderRight: '1px solid #ccc', borderBottom: '1px solid #ccc' }}
      >
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onPaste={onPaste}
          onFocus={onFocus}
          rows={field.rows || 2}
          className={baseClassName}
          style={NEO_STYLES.input}
          aria-label={ariaLabel}
        />
        <StatusIndicator />
      </td>
    );
  }

  // Default: input
  return (
    <td
      className="p-1 relative"
      style={{ borderRight: '1px solid #ccc', borderBottom: '1px solid #ccc' }}
    >
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onPaste={onPaste}
        onFocus={onFocus}
        className={baseClassName}
        style={NEO_STYLES.input}
        aria-label={ariaLabel}
      />
      <StatusIndicator />
    </td>
  );
}
