/**
 * Shared types for VetHub Rounding Sheet
 * Centralizes all rounding-related type definitions
 */

// Core rounding data stored per patient
export interface RoundingData {
  signalment?: string;
  location?: string;
  icuCriteria?: string;
  code?: 'Green' | 'Yellow' | 'Orange' | 'Red' | '';
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

// Patient demographics
export interface Demographics {
  name?: string;
  age?: string;
  sex?: string;
  breed?: string;
  species?: string;
  weight?: string;
}

// Current stay information
export interface CurrentStay {
  location?: string;
  codeStatus?: string;
  icuCriteria?: string;
}

// Patient as used in rounding sheet
// Compatible with both legacy Patient format and UnifiedPatient format
export interface RoundingPatient {
  id: number;
  name?: string; // Optional - UnifiedPatient uses demographics.name instead
  status: string;
  rounding_data?: RoundingData;
  roundingData?: RoundingData;
  patient_info?: {
    name?: string;
  };
  demographics?: Demographics;
  currentStay?: CurrentStay;
}

// Auto-fill result from patient data
export interface AutoFillResult {
  signalment?: string;
  location?: string;
  code?: string;
  icuCriteria?: string;
  autoFilledFields: string[];
  carriedForwardFields: string[];
}

// Carry-forward result from previous day's data
export interface CarryForwardResult {
  data: RoundingData;
  carriedForward: boolean;
  fieldsCarried: string[];
  message: string;
}

// Save status for individual patients
export type SaveStatus = 'saving' | 'saved' | 'error';

// Dropdown field options
export interface DropdownOptions {
  location: readonly string[];
  icuCriteria: readonly string[];
  code: readonly string[];
  ivc: readonly string[];
  fluids: readonly string[];
  cri: readonly string[];
}

// Quick-insert field types
export type QuickInsertField = 'therapeutics' | 'diagnosticFindings' | 'concerns';

// Focused field state for quick-insert
export interface FocusedField {
  patientId: number;
  field: QuickInsertField;
}

// Field order for paste operations
export type RoundingFieldKey = keyof RoundingData;
