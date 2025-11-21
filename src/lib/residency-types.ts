/**
 * TypeScript types for Residency Tracking System
 */

// Case Log Types
export type SurgeryRole = 'Primary Surgeon' | 'Assistant' | 'Observer';

export type ProcedureCategory =
  | 'Craniotomy'
  | 'Spinal Surgery'
  | 'Diagnostic'
  | 'Emergency'
  | 'Other';

export interface SurgeryCase {
  id: string;
  date: string; // ISO date string
  procedure: string;
  category: ProcedureCategory;
  caseId: string; // Hospital case ID
  role: SurgeryRole;
  hours: number; // In 0.25 increments
  notes?: string;
  createdAt: number;
  // Patient reference (optional - for linking to VetHub patients)
  patientId?: string; // VetHub patient database ID
  patientName?: string; // Patient name for display
  patientSpecies?: string; // Canine/Feline
  patientBreed?: string; // Breed
  patientAge?: string; // Age
  patientSex?: string; // Sex
  patientWeight?: string; // Weight
}

// Journal Club Types
export interface JournalClubEntry {
  id: string;
  date: string; // ISO date string
  articles: string[]; // Array of article titles/citations
  supervisors: string[];
  hours: number; // In 0.5 increments
  notes?: string;
  createdAt: number;
}

// Weekly Schedule Types
export type ActivityType =
  | 'Surgery'
  | 'Diagnostic Imaging'
  | 'Clinical Rounds'
  | 'Consultation'
  | 'Research'
  | 'Teaching'
  | 'Journal Club'
  | 'Conferences'
  | 'Administrative';

export interface WeeklyActivity {
  type: ActivityType;
  hours: number;
}

export interface WeeklySchedule {
  id: string;
  weekStartDate: string; // ISO date string (Monday of the week)
  weekEndDate: string; // ISO date string (Sunday of the week)
  activities: WeeklyActivity[];
  totalHours: number;
  notes?: string;
  createdAt: number;
}

// Progress Tracking
export interface ResidencyProgress {
  totalCaseHours: number;
  totalJournalClubHours: number;
  totalWeeklyHours: number;
  casesByCategory: Record<ProcedureCategory, number>;
  casesByRole: Record<SurgeryRole, number>;
  totalCases: number;
  totalJournalClubSessions: number;
  totalWeeks: number;
  yearInProgram: number; // 1, 2, or 3
}

// Achievement Badges
export type BadgeType =
  | 'first_case'
  | 'first_primary'
  | 'ten_cases'
  | 'fifty_cases'
  | 'hundred_hours'
  | 'journal_club_champion'
  | 'consistent_logger';

export interface Achievement {
  id: BadgeType;
  name: string;
  description: string;
  icon: string;
  earned: boolean;
  earnedDate?: string;
}

// Export Format
export interface ACVIMExport {
  residentName: string;
  programYear: number;
  exportDate: string;
  cases: SurgeryCase[];
  journalClub: JournalClubEntry[];
  weeklySchedules: WeeklySchedule[];
  summary: ResidencyProgress;
}
