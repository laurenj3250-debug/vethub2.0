'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { apiClient } from '@/lib/api-client';

// ============================================================================
// UNIFIED PATIENT DATA MODEL
// ============================================================================
// This eliminates the 3+ separate patient structures that were causing re-entry

export interface UnifiedPatient {
  // Core identification
  id: number;
  mrn?: string; // Medical Record Number (from practice management system)
  status: 'Active' | 'Discharged' | 'MRI' | 'Surgery';

  // Demographics (shared across ALL features)
  demographics: {
    name: string;
    age?: string;
    sex?: string;
    breed?: string;
    species?: string;
    weight?: string;
    ownerName?: string;
    ownerPhone?: string;
    ownerEmail?: string;      // NEW - for stickers/communication
    ownerAddress?: string;    // NEW - for stickers
    microchip?: string;
    colorMarkings?: string;   // NEW - for stickers ("Beige/black/white")
    dateOfBirth?: string;     // NEW - for stickers
  };

  // Medical history (shared baseline)
  medicalHistory: {
    allergies?: string;
    chronicConditions?: string;
    previousSurgeries?: string;
    vaccinationStatus?: string;
  };

  // Current hospitalization
  currentStay?: {
    admitDate: Date;
    location?: string; // Cage/kennel number
    icuCriteria?: string;
    codeStatus?: string;
    attending?: string;
  };

  // SOAP notes (array - one per visit/update)
  soapNotes: SOAPNote[];

  // Rounding sheet data
  roundingData?: RoundingData;

  // MRI-specific data
  mriData?: MRIData;

  // Tasks assigned to this patient
  tasks: PatientTask[];

  // Sticker generation data (NEW)
  stickerData?: StickerData;

  // Appointment info (if from appointment schedule)
  appointmentInfo?: {
    scheduledTime?: string;
    visitType: 'new' | 'recheck' | 'mri-dropoff';
    reasonForVisit?: string;
    prepNotes?: string;
  };

  // Metadata
  createdAt: Date;
  updatedAt: Date;
  lastAccessedBy?: string;
}

export interface SOAPNote {
  id: string;
  createdAt: Date;
  createdBy?: string;
  visitType: 'recheck' | 'initial';

  // Subjective
  currentHistory?: string;
  lastVisit?: string;
  medications?: string;
  csvd?: string;
  pupd?: string;
  appetite?: string;

  // Objective - Physical Exam
  physicalExam?: {
    ent?: string;
    oral?: string;
    pln?: string;
    cv?: string;
    resp?: string;
    abd?: string;
    rectal?: string;
    ms?: string;
    integ?: string;
  };

  // Objective - Neuro Exam
  neuroExam?: {
    mentalStatus?: string;
    gait?: string;
    cranialNerves?: string;
    posturalReactions?: string;
    spinalReflexes?: string;
    tone?: string;
    muscleMass?: string;
    nociception?: string;
    examBy?: string;
  };

  // Assessment
  progression?: string;
  neurolocalization?: string;
  ddx?: string;

  // Plan
  diagnosticsToday?: string;
  treatments?: string;
  discussionChanges?: string;
}

// ============================================================================
// LAB RESULTS INTERFACES
// ============================================================================

export interface LabValue {
  parameter: string;        // e.g., "WBC", "HCT", "ALT"
  value: number | string;
  unit: string;
  referenceRange: string;   // e.g., "5.0-16.0"
  referenceLow?: number;
  referenceHigh?: number;
  isAbnormal: boolean;
  flag?: 'High' | 'Low' | 'Critical High' | 'Critical Low';
}

export interface LabPanel {
  values: LabValue[];
  performedDate?: Date;
  labName?: string;
}

// ============================================================================
// ROUNDING DATA INTERFACE (Enhanced)
// ============================================================================

export interface RoundingData {
  signalment?: string;
  location?: string;
  icuCriteria?: string;
  codeStatus?: string;
  neurolocalization?: string;
  problems?: string;
  diagnosticFindings?: string;
  therapeutics?: string;
  ivc?: string;
  fluids?: string;
  cri?: string;
  overnightDx?: string;
  concerns?: string;
  comments?: string;
  lastUpdated?: Date;

  // Lab Results (NEW)
  labResults?: {
    cbc?: LabPanel;
    chemistry?: LabPanel;
    lastUpdated?: Date;
  };

  // Imaging (NEW)
  chestXray?: {
    findings: string;  // Default: "NSF" (No Significant Findings)
    date?: Date;
    radiologist?: string;
  };
}

// ============================================================================
// MRI DATA INTERFACE (Enhanced)
// ============================================================================

export interface MRICalculatedDoses {
  opioid: {
    name: 'Methadone' | 'Butorphanol';
    doseMg: number;
    volumeMl: number;
  };
  valium: {
    doseMg: number;
    volumeMl: number;
  };
  contrast: {
    volumeMl: number;
  };
}

export interface MRIData {
  scanType?: 'Brain' | 'C-Spine' | 'T-Spine' | 'LS';
  scheduledTime?: Date;
  weight?: string;
  preMedDose?: string;
  valiumDose?: string;
  contrastVolume?: string;
  anesthesiaProtocol?: string;
  findings?: string;
  radiologistNotes?: string;
  completed?: boolean;
  completedAt?: Date;

  // Anesthesia-specific (NEW)
  npoTime?: Date;           // NPO start time
  asaStatus?: 1 | 2 | 3 | 4 | 5;  // ASA physical status classification
  preMedDrug?: 'Methadone' | 'Butorphanol';  // Auto-selected based on scanType

  // Auto-calculated doses (NEW)
  calculatedDoses?: MRICalculatedDoses;
  autoCalculate?: boolean;  // Enable auto-calculation from weight
}

export interface PatientTask {
  id: string;
  title: string;
  description?: string;
  category?: string;
  timeOfDay?: 'morning' | 'evening' | 'overnight' | 'anytime';
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  assignedTo?: string;
  completed: boolean;
  completedAt?: Date;
  createdAt: Date;
  dueDate?: Date;
}

// ============================================================================
// STICKER DATA INTERFACE
// ============================================================================

export interface StickerData {
  isNewAdmit: boolean;
  isSurgery: boolean;
  bigLabelCount?: number;    // Auto-calculated based on admission flags
  tinySheetCount?: number;   // Auto-calculated based on admission flags
  bigLabelsPrinted?: boolean;
  tinyLabelsPrinted?: boolean;
  stickersPrintedAt?: Date;
}

// ============================================================================
// CONTEXT DEFINITION
// ============================================================================

interface PatientContextValue {
  // State
  patients: UnifiedPatient[];
  selectedPatientId: number | null;
  isLoading: boolean;
  error: Error | null;

  // Actions
  loadPatients: () => Promise<void>;
  selectPatient: (id: number) => void;
  getPatient: (id: number) => UnifiedPatient | undefined;

  // Patient CRUD
  createPatient: (data: Partial<UnifiedPatient>) => Promise<UnifiedPatient>;
  updatePatient: (id: number, data: Partial<UnifiedPatient>) => Promise<void>;
  deletePatient: (id: number) => Promise<void>;

  // Specific updates (for efficiency)
  updateDemographics: (id: number, demographics: Partial<UnifiedPatient['demographics']>) => Promise<void>;
  addSOAPNote: (id: number, soap: Omit<SOAPNote, 'id' | 'createdAt'>) => Promise<void>;
  updateRoundingData: (id: number, rounding: Partial<RoundingData>) => Promise<void>;
  updateMRIData: (id: number, mri: Partial<MRIData>) => Promise<void>;
  addTask: (id: number, task: Omit<PatientTask, 'id' | 'createdAt'>) => Promise<void>;
  updateTask: (patientId: number, taskId: string, updates: Partial<PatientTask>) => Promise<void>;
  deleteTask: (patientId: number, taskId: string) => Promise<void>;

  // VetRadar Integration
  importPatientsFromVetRadar: (vetRadarPatients: any[]) => Promise<{
    imported: number;
    skipped: number;
    errors: string[];
  }>;
}

const PatientContext = createContext<PatientContextValue | undefined>(undefined);

// ============================================================================
// PROVIDER COMPONENT
// ============================================================================

export function PatientProvider({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  const [patients, setPatients] = useState<UnifiedPatient[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Helper to save patients to localStorage
  const saveToLocalStorage = useCallback((patients: UnifiedPatient[]) => {
    localStorage.setItem('vethub_patients', JSON.stringify(patients));
  }, []);

  // Load patients from API and transform to unified model
  const loadPatients = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Try to load from API first (database)
      try {
        const rawPatients = await apiClient.getPatients();

        // If API returns UnifiedPatient format (from our new /api/patients endpoint)
        if (rawPatients.length > 0 && rawPatients[0].demographics) {
          setPatients(rawPatients);
          setIsLoading(false);
          return;
        }
      } catch (apiError) {
        console.warn('[PatientContext] API call failed, falling back to localStorage:', apiError);
      }

      // Fallback to localStorage if API is unavailable
      const localData = localStorage.getItem('vethub_patients');
      if (localData) {
        const localPatients = JSON.parse(localData);
        setPatients(localPatients.map((p: any) => ({
          ...p,
          createdAt: new Date(p.createdAt),
          updatedAt: new Date(p.updatedAt),
          currentStay: p.currentStay ? {
            ...p.currentStay,
            admitDate: new Date(p.currentStay.admitDate)
          } : undefined,
        })));
        setIsLoading(false);
        return;
      }

      // If no data available, start with empty array
      setPatients([]);
      setIsLoading(false);
    } catch (err) {
      console.error('Failed to load patients:', err);
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    setMounted(true);
    loadPatients();
  }, [loadPatients]);

  // Select patient
  const selectPatient = useCallback((id: number) => {
    setSelectedPatientId(id);
  }, []);

  // Get single patient
  const getPatient = useCallback((id: number) => {
    return patients.find(p => p.id === id);
  }, [patients]);

  // Create patient
  const createPatient = useCallback(async (data: Partial<UnifiedPatient>) => {
    try {
      // Try to create via API first
      const created = await apiClient.createPatient(data);

      // Update local state with API response
      const updated = [...patients, created];
      setPatients(updated);
      saveToLocalStorage(updated);

      return created;
    } catch (apiError) {
      console.warn('[PatientContext] API create failed, using localStorage only:', apiError);

      // Fallback to localStorage-only creation
      const newPatient: UnifiedPatient = {
        id: Date.now(),
        status: data.status || 'Active',
        demographics: data.demographics || { name: 'Unnamed Patient' },
        medicalHistory: data.medicalHistory || {},
        currentStay: data.currentStay,
        soapNotes: data.soapNotes || [],
        roundingData: data.roundingData,
        mriData: data.mriData,
        tasks: data.tasks || [],
        stickerData: data.stickerData,
        appointmentInfo: data.appointmentInfo,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const updated = [...patients, newPatient];
      setPatients(updated);
      saveToLocalStorage(updated);

      return newPatient;
    }
  }, [patients, saveToLocalStorage]);

  // Update patient
  const updatePatient = useCallback(async (id: number, data: Partial<UnifiedPatient>) => {
    const backendData: any = {};

    if (data.status) backendData.status = data.status;
    if (data.demographics) backendData.patient_info = data.demographics;
    if (data.currentStay) backendData.current_stay = data.currentStay;
    if (data.roundingData) backendData.rounding_data = data.roundingData;
    if (data.mriData) backendData.mri_data = data.mriData;
    if (data.soapNotes) backendData.soap_notes = data.soapNotes;
    if (data.tasks) backendData.tasks = data.tasks;

    await apiClient.updatePatient(String(id), backendData);
    await loadPatients();
  }, [loadPatients]);

  // Delete patient
  const deletePatient = useCallback(async (id: number) => {
    await apiClient.deletePatient(String(id));
    setPatients(prev => prev.filter(p => p.id !== id));
    if (selectedPatientId === id) setSelectedPatientId(null);
  }, [selectedPatientId]);

  // Update demographics only
  const updateDemographics = useCallback(async (id: number, demographics: Partial<UnifiedPatient['demographics']>) => {
    const patient = patients.find(p => p.id === id);
    if (!patient) return;

    const updated = {
      ...patient.demographics,
      ...demographics,
    };

    await apiClient.updatePatient(String(id), { patient_info: updated });

    // Optimistic update
    setPatients(prev => prev.map(p =>
      p.id === id
        ? { ...p, demographics: updated, updatedAt: new Date() }
        : p
    ));
  }, [patients]);

  // Add SOAP note
  const addSOAPNote = useCallback(async (id: number, soap: Omit<SOAPNote, 'id' | 'createdAt'>) => {
    const patient = patients.find(p => p.id === id);
    if (!patient) return;

    const newNote: SOAPNote = {
      ...soap,
      id: `soap-${Date.now()}`,
      createdAt: new Date(),
    };

    const updated = [...patient.soapNotes, newNote];

    await apiClient.updatePatient(String(id), { soap_notes: updated });

    setPatients(prev => prev.map(p =>
      p.id === id
        ? { ...p, soapNotes: updated, updatedAt: new Date() }
        : p
    ));
  }, [patients]);

  // Update rounding data
  const updateRoundingData = useCallback(async (id: number, rounding: Partial<RoundingData>) => {
    const patient = patients.find(p => p.id === id);
    if (!patient) return;

    const updated = {
      ...patient.roundingData,
      ...rounding,
      lastUpdated: new Date(),
    };

    await apiClient.updatePatient(String(id), { rounding_data: updated });

    setPatients(prev => prev.map(p =>
      p.id === id
        ? { ...p, roundingData: updated, updatedAt: new Date() }
        : p
    ));
  }, [patients]);

  // Update MRI data
  const updateMRIData = useCallback(async (id: number, mri: Partial<MRIData>) => {
    const patient = patients.find(p => p.id === id);
    if (!patient) return;

    const updated = {
      ...patient.mriData,
      ...mri,
    };

    await apiClient.updatePatient(String(id), { mri_data: updated });

    setPatients(prev => prev.map(p =>
      p.id === id
        ? { ...p, mriData: updated, updatedAt: new Date() }
        : p
    ));
  }, [patients]);

  // Add task
  const addTask = useCallback(async (id: number, task: Omit<PatientTask, 'id' | 'createdAt'>) => {
    const patient = patients.find(p => p.id === id);
    if (!patient) return;

    const newTask: PatientTask = {
      ...task,
      id: `task-${Date.now()}`,
      createdAt: new Date(),
    };

    await apiClient.createTask(String(id), newTask);

    setPatients(prev => prev.map(p =>
      p.id === id
        ? { ...p, tasks: [...p.tasks, newTask], updatedAt: new Date() }
        : p
    ));
  }, [patients]);

  // Update task
  const updateTask = useCallback(async (patientId: number, taskId: string, updates: Partial<PatientTask>) => {
    const patient = patients.find(p => p.id === patientId);
    if (!patient) return;

    await apiClient.updateTask(String(patientId), taskId, updates);

    setPatients(prev => prev.map(p =>
      p.id === patientId
        ? {
            ...p,
            tasks: p.tasks.map(t => t.id === taskId ? { ...t, ...updates } : t),
            updatedAt: new Date(),
          }
        : p
    ));
  }, [patients]);

  // Delete task
  const deleteTask = useCallback(async (patientId: number, taskId: string) => {
    await apiClient.deleteTask(String(patientId), taskId);

    setPatients(prev => prev.map(p =>
      p.id === patientId
        ? { ...p, tasks: p.tasks.filter(t => t.id !== taskId), updatedAt: new Date() }
        : p
    ));
  }, []);

  // Import patients from VetRadar
  // NOTE: This function has been deprecated in favor of the /patient-import page with API-based imports
  // Keeping for backward compatibility with /integrations page, but VetRadar scraper import is disabled
  const importPatientsFromVetRadar = useCallback(async (vetRadarPatients: any[]) => {
    const results = {
      imported: 0,
      skipped: 0,
      errors: ['This import method is deprecated. Please use /patient-import page instead.'] as string[],
    };

    console.warn('[VetRadar Import] This import method is deprecated. Use /patient-import page instead.');

    // Legacy function disabled to prevent client-side Playwright imports
    // Use /patient-import page which uses server-side API for VetRadar imports

    return results;
  }, []);

  const value: PatientContextValue = {
    patients,
    selectedPatientId,
    isLoading,
    error,
    loadPatients,
    selectPatient,
    getPatient,
    createPatient,
    updatePatient,
    deletePatient,
    updateDemographics,
    addSOAPNote,
    updateRoundingData,
    updateMRIData,
    addTask,
    updateTask,
    deleteTask,
    importPatientsFromVetRadar,
  };

  return (
    <PatientContext.Provider value={value}>
      {children}
    </PatientContext.Provider>
  );
}

// ============================================================================
// HOOK
// ============================================================================

export function usePatientContext() {
  const context = useContext(PatientContext);
  if (!context) {
    throw new Error('usePatientContext must be used within PatientProvider');
  }
  return context;
}
