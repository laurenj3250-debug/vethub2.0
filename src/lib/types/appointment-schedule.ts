export interface AppointmentPatient {
  id: string; // Unique identifier for table management
  sortOrder: number; // For custom ordering

  // Core Information
  appointmentTime: string | null; // "HH:MM" or null
  patientName: string;
  age: string | null; // "5y 3m" format
  status: 'new' | 'recheck' | 'mri-dropoff'; // Patient visit type

  // Clinical Data
  whyHereToday: string;
  lastVisit: {
    date: string | null;
    reason: string | null;
  };

  // Diagnostics
  mri: {
    date: string | null;
    findings: string | null;
  };
  bloodwork: {
    date: string | null;
    abnormalities: string[] | null;
  };

  // Treatment
  medications: Medication[];
  changesSinceLastVisit: string | null;
  otherNotes: string | null;

  // Metadata
  confidence: {
    [key: string]: number; // AI confidence scores per field
  };
  rawText?: string; // Original pasted text for reference
  lastUpdated: Date;
}

export interface Medication {
  name: string;
  dose: string;
  frequency: string;
  route: string;
}

export interface AppointmentScheduleState {
  patients: AppointmentPatient[];
  sortBy: 'time' | 'name' | 'custom';
  filterBy: 'all' | 'morning' | 'afternoon' | 'incomplete';
  selectedPatientIds: Set<string>;
  isProcessing: boolean;
}
