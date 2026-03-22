// Localization IDs
export type LocId = 'prosencephalon' | 'brainstem' | 'cerebellum' | 'periph_vest' | 'c1c5' | 'c6t2' | 't3l3' | 'l4s3' | 'multifocal';

// The full data state for all localization findings
export type LocData = Record<string, any>;

// What gets persisted to the database (via the existing `sections` JSON field)
export interface LocExamState {
  version: 2;  // Distinguish from old 18-section format
  activeLoc: LocId;
  species: 'Dog' | 'Cat';
  data: LocData;
  reportLocked: boolean;
  report: string;
  ddxSelections: Record<string, boolean>;
}

// Template for quick-start
export interface LocTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  localization: LocId;
  species?: 'Dog' | 'Cat';
  data: Partial<LocData>;
}
