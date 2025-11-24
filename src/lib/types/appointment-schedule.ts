export interface AppointmentPatient {
  id: string; // Unique identifier for table management
  sortOrder: number; // For custom ordering

  // Core Information
  patientName: string;
  appointmentTime?: string; // Appointment time (for sorting)
  age: string | null;
  status: 'new' | 'recheck' | 'mri-dropoff'; // Patient visit type

  // Clinical Data - all simple text fields
  whyHereToday: string | null;
  lastVisit: string | null; // Free text field
  mri: string | null; // Free text field
  bloodwork: string | null; // Free text field
  medications: string | null; // Free text field
  changesSinceLastVisit: string | null;
  otherNotes: string | null;

  // Metadata
  rawText?: string; // Original pasted text for reference
  lastUpdated: Date;
}

export interface AppointmentScheduleState {
  patients: AppointmentPatient[];
  sortBy: 'time' | 'name' | 'custom';
  filterBy: 'all' | 'morning' | 'afternoon' | 'incomplete';
  selectedPatientIds: Set<string>;
  isProcessing: boolean;
}
