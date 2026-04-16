import type { ProcedureType, PatientStatus } from './types';

export const procedureTypes: ProcedureType[] = ['Surgery', 'MRI', 'Medical', 'Other'];

export const statusOptions: PatientStatus[] = [
  'New',
  'Hospitalized',
  'Discharging',
];

export const statusColors: Record<PatientStatus, string> = {
  'New': 'bg-yellow-100 text-yellow-800 border-yellow-300',
  'Hospitalized': 'bg-blue-100 text-blue-800 border-blue-300',
  'Discharging': 'bg-green-100 text-green-800 border-green-300',
};

// ============================================================================
// MRI PATIENT DEFAULTS
// ============================================================================

/**
 * Default diagnosticFindings for new MRI admits
 * Used in patient creation and VetRadar imports
 * Do not import external diagnostic data - just use this pending checklist
 */
export const MRI_DEFAULT_DIAGNOSTICS = 'CXR: pending | CBC/Chem: pending';

// NOTE: Task definitions have been centralized in src/lib/task-definitions.ts
// Import COMMON_GENERAL_TASKS, DAILY_TASKS, MORNING_TASK_NAMES, etc. from there

// ============================================================================
// ROUNDING SHEET CONSTANTS
// ============================================================================

// Auto-save delay in milliseconds
export const ROUNDING_AUTO_SAVE_DELAY = 2000;

// Save status clear delays
export const ROUNDING_SAVE_SUCCESS_CLEAR_DELAY = 2000;
export const ROUNDING_SAVE_ERROR_CLEAR_DELAY = 5000;

// Unsaved changes check window (5 minutes)
export const ROUNDING_UNSAVED_CHECK_WINDOW_MS = 5 * 60 * 1000;

// LocalStorage keys for rounding sheet
export const ROUNDING_STORAGE_KEYS = {
  BACKUP: 'vethub-rounding-backup',
  CUSTOM_SNIPPETS: 'custom_snippets',
  TEXT_EXPANSIONS: 'text_expansions',
  CUSTOM_TEMPLATES: 'custom_rounding_templates',
  TAB_HINT_SEEN: 'rounding-tab-hint-seen',
} as const;

// Dropdown options for rounding fields
export const ROUNDING_DROPDOWN_OPTIONS = {
  location: ['IP', 'ICU'] as const,
  icuCriteria: ['Yes', 'No', 'n/a'] as const,
  code: ['Green', 'Yellow', 'Orange', 'Red'] as const,
  ivc: ['Yes', 'No'] as const,
  fluids: ['Yes', 'No', 'n/a'] as const,
  cri: ['Yes', 'No', 'No but...', 'Yes but...', 'n/a'] as const,
} as const;

// Multi-select dropdown options for clinical fields (allow multiple selections)
export const ROUNDING_MULTISELECT_OPTIONS = {
  // Common neuro problems/diagnoses
  problems: [
    'IVDD',
    'FCE',
    'Seizures',
    'Vestibular',
    'GME/MUO',
    'Diskospondylitis',
    'Neoplasia',
    'Head trauma',
    'Spinal trauma',
    'Myasthenia gravis',
    'Polyneuropathy',
    'Polyradiculoneuritis',
    'Megaesophagus',
    'Paresis',
    'Paralysis',
    'Ataxia',
  ] as const,

  // Common diagnostic tests
  diagnosticFindings: [
    'CBC: pending',
    'CBC: WNL',
    'Chem: pending',
    'Chem: WNL',
    'UA: pending',
    'UA: WNL',
    'CXR: pending',
    'CXR: NSF',
    'MRI: pending',
    'MRI: completed',
    'CT: pending',
    'CT: completed',
    'CSF: pending',
    'CSF: WNL',
    'EMG: pending',
    'EMG: completed',
  ] as const,

  // Extra notes — pulled from rounding-templates.ts so dropdown matches templates.
  comments: [
    'If has a seizure, give 0.2mL IV (straight) of diazepam. If has two, start a diazepam CRI at .5mg/kg/hr and load phenobarbital at 4mg/kg q4-6hr and load bromide at 100mg/kg qdh',
    'gaba tram prn, traz prn, if severely painful can start fentanyl CRI',
    'If decompensates, give 1g/kg of Mannitol and .2mg/kg of Dex SP and Call AS/LJ',
    'fentanyl assess at midnight then PRN, ketamine d/c when finished',
    'if frenchies, can dexmed',
    'if regurgitates give one bolus of metocopramide, if 2x can start CRI',
  ] as const,

  // Common therapeutics/medications
  therapeutics: [
    'Gabapentin',
    'Methocarbamol',
    'Tramadol',
    'Meloxicam',
    'Carprofen',
    'Prednisone',
    'Dexamethasone',
    'Phenobarbital',
    'Levetiracetam (Keppra)',
    'Zonisamide',
    'KBr',
    'Diazepam',
    'Omeprazole',
    'Sucralfate',
    'Maropitant',
    'Ondansetron',
    'Metoclopramide',
    'Famotidine',
    'Ampicillin',
    'Enrofloxacin',
    'Metronidazole',
    'Clindamycin',
    'Cefpodoxime',
    'Fentanyl CRI',
    'Lidocaine CRI',
    'Ketamine CRI',
    'MLK CRI',
  ] as const,

  // Overnight diagnostics
  overnightDx: [
    'Neuro checks q4h',
    'Neuro checks q2h',
    'Vitals q4h',
    'Vitals q2h',
    'Blood glucose q4h',
    'PCV/TS q6h',
    'Lactate q6h',
    'AM bloods',
    'Repeat CXR',
    'Call if changes',
  ] as const,

  // Overnight concerns — pulled from rounding-templates.ts so dropdown matches templates.
  concerns: [
    'NPO from 8pm',
  ] as const,
} as const;

// Field order for paste operations (matches Google Sheets columns)
export const ROUNDING_FIELD_ORDER = [
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
] as const;

// TSV export headers
export const ROUNDING_TSV_HEADERS = [
  'Patient',
  'Signalment',
  'Location',
  'ICU Criteria',
  'Code Status',
  'Problems',
  'Diagnostic Findings',
  'Therapeutics',
  'IVC',
  'Fluids',
  'CRI',
  'Overnight Diagnostics',
  'Overnight Concerns/Alerts',
  'Extra Notes',
] as const;

// Neo-pop styling constants
export const NEO_POP_STYLES = {
  BORDER: '2px solid #000',
  SHADOW: '6px 6px 0 #000',
  SHADOW_SM: '4px 4px 0 #000',
  COLORS: {
    lavender: '#DCC4F5',
    mint: '#B8E6D4',
    pink: '#FFBDBD',
    cream: '#FFF8F0',
  },
} as const;
