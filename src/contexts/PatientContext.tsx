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
    microchip?: string;
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

  // Load patients from API and transform to unified model
  const loadPatients = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const rawPatients = await apiClient.getPatients();

      // Transform backend data to unified model
      const unified: UnifiedPatient[] = rawPatients.map((p: any) => ({
        id: p.id,
        status: p.status || 'Active',
        demographics: {
          name: p.name,
          age: p.patient_info?.age,
          sex: p.patient_info?.sex,
          breed: p.patient_info?.breed,
          species: p.patient_info?.species,
          weight: p.patient_info?.weight,
          ownerName: p.patient_info?.ownerName,
          ownerPhone: p.patient_info?.ownerPhone,
          microchip: p.patient_info?.microchip,
        },
        medicalHistory: {
          allergies: p.patient_info?.allergies,
          chronicConditions: p.patient_info?.chronicConditions,
          previousSurgeries: p.patient_info?.previousSurgeries,
          vaccinationStatus: p.patient_info?.vaccinationStatus,
        },
        currentStay: p.current_stay ? {
          admitDate: new Date(p.current_stay.admitDate),
          location: p.current_stay.location,
          icuCriteria: p.current_stay.icuCriteria,
          codeStatus: p.current_stay.codeStatus,
          attending: p.current_stay.attending,
        } : undefined,
        soapNotes: Array.isArray(p.soap_notes) ? p.soap_notes : (p.soap_data ? [{
          id: 'legacy',
          createdAt: new Date(),
          visitType: p.soap_data.visitType || 'recheck',
          currentHistory: p.soap_data.currentHistory,
          lastVisit: p.soap_data.lastVisit,
          medications: p.soap_data.medications,
          csvd: p.soap_data.csvd,
          pupd: p.soap_data.pupd,
          appetite: p.soap_data.appetite,
          physicalExam: {
            ent: p.soap_data.peENT,
            oral: p.soap_data.peOral,
            pln: p.soap_data.pePLN,
            cv: p.soap_data.peCV,
            resp: p.soap_data.peResp,
            abd: p.soap_data.peAbd,
            rectal: p.soap_data.peRectal,
            ms: p.soap_data.peMS,
            integ: p.soap_data.peInteg,
          },
          neuroExam: {
            mentalStatus: p.soap_data.mentalStatus,
            gait: p.soap_data.gait,
            cranialNerves: p.soap_data.cranialNerves,
            posturalReactions: p.soap_data.posturalReactions,
            spinalReflexes: p.soap_data.spinalReflexes,
            tone: p.soap_data.tone,
            muscleMass: p.soap_data.muscleMass,
            nociception: p.soap_data.nociception,
            examBy: p.soap_data.examBy,
          },
          progression: p.soap_data.progression,
          neurolocalization: p.soap_data.neurolocalization,
          ddx: p.soap_data.ddx,
          diagnosticsToday: p.soap_data.diagnosticsToday,
          treatments: p.soap_data.treatments,
          discussionChanges: p.soap_data.discussionChanges,
        }] : []),
        roundingData: p.rounding_data ? {
          ...p.rounding_data,
          lastUpdated: p.rounding_data.lastUpdated ? new Date(p.rounding_data.lastUpdated) : undefined,
        } : undefined,
        mriData: p.mri_data,
        tasks: Array.isArray(p.tasks) ? p.tasks.map((t: any) => ({
          ...t,
          createdAt: new Date(t.createdAt || t.created_at),
          completedAt: t.completedAt ? new Date(t.completedAt) : undefined,
          dueDate: t.dueDate ? new Date(t.dueDate) : undefined,
        })) : [],
        appointmentInfo: p.appointment_info,
        createdAt: new Date(p.created_at || Date.now()),
        updatedAt: new Date(p.updated_at || Date.now()),
        lastAccessedBy: p.last_accessed_by,
      }));

      setPatients(unified);
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
    const backendData = {
      name: data.demographics?.name || 'Unnamed Patient',
      status: data.status || 'Active',
      patient_info: data.demographics,
      current_stay: data.currentStay,
      soap_data: data.soapNotes?.[0],
      rounding_data: data.roundingData,
      mri_data: data.mriData,
      appointment_info: data.appointmentInfo,
    };

    const created = await apiClient.createPatient(backendData);
    await loadPatients(); // Reload to get unified format

    return patients.find(p => p.id === created.id)!;
  }, [loadPatients, patients]);

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
