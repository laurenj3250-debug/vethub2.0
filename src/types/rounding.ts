/**
 * VetHub Rounding Sheet Types
 * Centralized type definitions for rounding functionality
 */

// Patient data from API
export interface Patient {
  id: number;
  name: string;
  status: string;
  rounding_data?: RoundingData;
  roundingData?: RoundingData; // camelCase from API
  patient_info?: {
    name?: string;
  };
  demographics?: Demographics;
  currentStay?: CurrentStay;
}

export interface Demographics {
  name?: string;
  age?: string;
  sex?: string;
  breed?: string;
  species?: string;
  weight?: string;
}

export interface CurrentStay {
  location?: string;
  codeStatus?: string;
  icuCriteria?: string;
}

// Rounding data structure (form state)
export interface RoundingData {
  signalment?: string;
  location?: string;
  icuCriteria?: string;
  code?: string;
  problems?: string;
  diagnosticFindings?: string;
  therapeutics?: string;
  ivc?: string;
  fluids?: string;
  cri?: string;
  overnightDx?: string;
  concerns?: string;
  comments?: string;
  dayCount?: number;
  lastUpdated?: string; // ISO date string
}

// Field configuration for rendering
export interface RoundingFieldConfig {
  key: keyof RoundingData;
  label: string;
  type: 'input' | 'select' | 'textarea';
  width: string; // Tailwind min-width class
  options?: string[]; // For select fields
  supportsQuickInsert?: boolean;
  quickInsertField?: 'therapeutics' | 'diagnostics' | 'concerns' | 'problems';
  rows?: number; // For textarea
}

// Save status for individual patients
export type SaveStatus = 'saving' | 'saved' | 'error';

// QuickInsert state
export interface QuickInsertState {
  patientId: number;
  field: 'therapeutics' | 'diagnosticFindings' | 'concerns';
}

// Paste preview data
export interface PastePreviewData {
  patientId: number;
  patientName: string;
  fields: Record<string, string>;
  rowIndex: number;
}

// Props for main RoundingSheet component
export interface RoundingSheetProps {
  patients: Patient[];
  toast: (options: { title: string; description: string; variant?: string }) => void;
  onPatientUpdate?: () => void;
}

// Helper type for field keys
export type RoundingFieldKey = keyof RoundingData;
