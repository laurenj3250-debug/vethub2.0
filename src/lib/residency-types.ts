/**
 * TypeScript types for ACVIM Neurology Residency Tracking
 * Matches official ACVIM Credentials Committee forms exactly
 */

// Neurosurgery Case Log Types (matches ACVIM form columns)
export type CaseRole = 'Primary' | 'Assistant'; // Per ACVIM instructions

export interface NeurosurgeryCase {
  id: string;
  procedureName: string; // Free text: "hemilaminectomy", "ventral slot", etc.
  dateCompleted: string; // ISO date (YYYY-MM-DD)
  caseIdNumber: string; // Medical record / patient ID
  role: CaseRole;
  hours: number; // 0.25 increments (15-min blocks)
  residencyYear: number; // 1, 2, or 3
  notes?: string;
  // VetHub patient link (optional)
  patientId?: number;
  patientName?: string;
  patientInfo?: string; // Species/breed for reference
  createdAt: string;
  updatedAt: string;
}

// Journal Club Log Types (matches ACVIM form columns)
export interface JournalClubEntry {
  id: string;
  date: string; // ISO date (YYYY-MM-DD)
  articleTitles: string[]; // Can have multiple articles per session
  supervisingNeurologists: string[]; // Board-certified neurologists in attendance
  hours: number; // 0.5 increments (30-min blocks)
  residencyYear: number; // 1, 2, or 3
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// Weekly Schedule Types (matches ACVIM 10-column form)
export interface WeeklyScheduleEntry {
  id: string;
  residencyYear: number; // 1, 2, or 3
  monthNumber: number; // 1-12 (relative to residency start)
  weekNumber: number; // 1-5 (week within month)
  weekDateRange: string; // Display format: "7/14-7/18"
  weekStartDate: string; // ISO date for sorting

  // ACVIM columns exactly as specified
  clinicalNeurologyDirect?: number; // Weeks (0, 0.5, 1)
  clinicalNeurologyIndirect?: number; // Weeks (0, 0.5, 1)
  neurosurgeryHours?: number; // 0.25, 0.5, 0.75, 1, etc.
  radiologyHours?: number; // Whole hours only
  neuropathologyHours?: number; // Whole hours only
  clinicalPathologyHours?: number; // Whole hours only
  electrodiagnosticsHours?: number; // 0.25, 0.5, 0.75, 1, etc.
  journalClubHours?: number; // 0.5, 1, 1.5, etc.
  otherTime?: string; // Free text for weeks/days
  otherTimeDescription?: string; // e.g., "vacation", "research", "Brain Camp"

  supervisingDiplomateName?: string; // REQUIRED per ACVIM
  createdAt: string;
  updatedAt: string;
}

// ACVIM Profile (resident identity and settings)
export interface ACVIMProfile {
  id: string;
  residentName: string;
  acvimCandidateId?: string;
  trainingFacility?: string;
  programStartDate: string; // ISO date when residency started
  supervisingDiplomateNames: string[]; // Default diplomates for quick fill
  createdAt: string;
  updatedAt: string;
}

// Progress Summary (calculated from data)
export interface ACVIMProgressSummary {
  // Case Log Summary
  totalCases: number;
  totalCaseHours: number;
  casesByRole: Record<CaseRole, number>;
  casesByYear: Record<number, number>;

  // Journal Club Summary
  totalJournalClubSessions: number;
  totalJournalClubHours: number;

  // Weekly Schedule Summary (per year)
  totalWeeksLogged: number;
  clinicalNeurologyDirectWeeks: number;
  clinicalNeurologyIndirectWeeks: number;
  neurosurgeryTotalHours: number;
  radiologyTotalHours: number;
  neuropathologyTotalHours: number;
  clinicalPathologyTotalHours: number;
  electrodiagnosticsTotalHours: number;

  // Current year in program
  currentYear: number;
}

// Export format for Word document generation
export interface ACVIMExportData {
  profile: ACVIMProfile;
  cases: NeurosurgeryCase[];
  journalClub: JournalClubEntry[];
  weeklySchedule: WeeklyScheduleEntry[];
  summary: ACVIMProgressSummary;
  exportDate: string;
  exportYear: number; // Which year (1, 2, 3) to export
}

// Legacy types kept for backwards compatibility
export type SurgeryRole = 'Primary Surgeon' | 'Assistant' | 'Observer';
export type ProcedureCategory = 'Craniotomy' | 'Spinal Surgery' | 'Diagnostic' | 'Emergency' | 'Other';
export type ActivityType = 'Surgery' | 'Diagnostic Imaging' | 'Clinical Rounds' | 'Consultation' | 'Research' | 'Teaching' | 'Journal Club' | 'Conferences' | 'Administrative';

export interface SurgeryCase {
  id: string;
  date: string;
  procedure: string;
  category: ProcedureCategory;
  caseId: string;
  role: SurgeryRole;
  hours: number;
  notes?: string;
  createdAt: number;
  patientId?: string;
  patientName?: string;
  patientSpecies?: string;
  patientBreed?: string;
  patientAge?: string;
  patientSex?: string;
  patientWeight?: string;
}

export interface WeeklyActivity {
  type: ActivityType;
  hours: number;
}

export interface WeeklySchedule {
  id: string;
  weekStartDate: string;
  weekEndDate: string;
  activities: WeeklyActivity[];
  totalHours: number;
  notes?: string;
  createdAt: number;
}

export interface ResidencyProgress {
  totalCaseHours: number;
  totalJournalClubHours: number;
  totalWeeklyHours: number;
  casesByCategory: Record<ProcedureCategory, number>;
  casesByRole: Record<SurgeryRole, number>;
  totalCases: number;
  totalJournalClubSessions: number;
  totalWeeks: number;
  yearInProgram: number;
}
