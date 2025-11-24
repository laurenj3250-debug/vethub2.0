/**
 * VetHub Rounding Fields Configuration
 * Centralized field definitions for rounding sheet
 */

import type { RoundingFieldConfig, RoundingFieldKey } from '@/types/rounding';

// Dropdown options for select fields
export const DROPDOWN_OPTIONS = {
  location: ['IP', 'ICU'],
  icuCriteria: ['Yes', 'No', 'n/a'],
  code: ['Green', 'Yellow', 'Orange', 'Red'],
  ivc: ['Yes', 'No'],
  fluids: ['Yes', 'No', 'n/a'],
  cri: ['Yes', 'No', 'No but...', 'Yet but...'],
} as const;

// Field order for paste handling (matches Google Sheets column order)
export const FIELD_ORDER: RoundingFieldKey[] = [
  'signalment',
  'location',
  'icuCriteria',
  'code',
  'problems',
  'diagnosticFindings',
  'therapeutics',
  'ivc',
  'fluids',
  'cri',
  'overnightDx',
  'concerns',
  'comments',
];

// Complete field configuration
export const ROUNDING_FIELDS: RoundingFieldConfig[] = [
  {
    key: 'signalment',
    label: 'Signalment',
    type: 'input',
    width: 'min-w-[150px]',
  },
  {
    key: 'location',
    label: 'Location',
    type: 'select',
    width: 'min-w-[100px]',
    options: DROPDOWN_OPTIONS.location,
  },
  {
    key: 'icuCriteria',
    label: 'ICU Criteria',
    type: 'select',
    width: 'min-w-[100px]',
    options: DROPDOWN_OPTIONS.icuCriteria,
  },
  {
    key: 'code',
    label: 'Code Status',
    type: 'select',
    width: 'min-w-[100px]',
    options: DROPDOWN_OPTIONS.code,
  },
  {
    key: 'problems',
    label: 'Problems',
    type: 'textarea',
    width: 'min-w-[200px]',
    rows: 2,
  },
  {
    key: 'diagnosticFindings',
    label: 'Diagnostic Findings',
    type: 'textarea',
    width: 'min-w-[200px]',
    rows: 2,
    supportsQuickInsert: true,
    quickInsertField: 'diagnostics',
  },
  {
    key: 'therapeutics',
    label: 'Therapeutics',
    type: 'textarea',
    width: 'min-w-[200px]',
    rows: 2,
    supportsQuickInsert: true,
    quickInsertField: 'therapeutics',
  },
  {
    key: 'ivc',
    label: 'IVC',
    type: 'select',
    width: 'min-w-[80px]',
    options: DROPDOWN_OPTIONS.ivc,
  },
  {
    key: 'fluids',
    label: 'Fluids',
    type: 'select',
    width: 'min-w-[100px]',
    options: DROPDOWN_OPTIONS.fluids,
  },
  {
    key: 'cri',
    label: 'CRI',
    type: 'select',
    width: 'min-w-[100px]',
    options: DROPDOWN_OPTIONS.cri,
  },
  {
    key: 'overnightDx',
    label: 'Overnight Dx',
    type: 'textarea',
    width: 'min-w-[150px]',
    rows: 2,
  },
  {
    key: 'concerns',
    label: 'Concerns',
    type: 'textarea',
    width: 'min-w-[150px]',
    rows: 2,
    supportsQuickInsert: true,
    quickInsertField: 'concerns',
  },
  {
    key: 'comments',
    label: 'Additional Comments',
    type: 'textarea',
    width: 'min-w-[200px]',
    rows: 2,
  },
];

// Helper to get field config by key
export function getFieldConfig(key: RoundingFieldKey): RoundingFieldConfig | undefined {
  return ROUNDING_FIELDS.find(f => f.key === key);
}

// Helper to check if a field is a dropdown
export function isDropdownField(key: RoundingFieldKey): boolean {
  return key in DROPDOWN_OPTIONS;
}

// Smart dropdown value matching (for paste handling)
export function matchDropdownValue(pastedValue: string, options: readonly string[]): string {
  if (!pastedValue || !pastedValue.trim()) return '';

  const normalized = pastedValue.trim().toLowerCase();

  // Exact match (case-insensitive)
  const exactMatch = options.find(opt => opt.toLowerCase() === normalized);
  if (exactMatch) return exactMatch;

  // Prefix match (e.g., "ic" matches "ICU")
  const prefixMatch = options.find(opt => opt.toLowerCase().startsWith(normalized));
  if (prefixMatch) return prefixMatch;

  // Contains match (e.g., "crit" matches "Critical")
  const containsMatch = options.find(opt => opt.toLowerCase().includes(normalized));
  if (containsMatch) return containsMatch;

  // No match - return original value
  return pastedValue;
}

// Get dropdown options for a field (type-safe)
export function getDropdownOptions(key: RoundingFieldKey): readonly string[] | undefined {
  return DROPDOWN_OPTIONS[key as keyof typeof DROPDOWN_OPTIONS];
}
