'use client';

import { useState, useRef } from 'react';

/**
 * Consolidated state management for the VetHub dashboard.
 * Extracts the 71 useState hooks from page.tsx into logical groups.
 */

// Auth-related state
export function useAuthState() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [authError, setAuthError] = useState('');

  return {
    email, setEmail,
    password, setPassword,
    isSignUp, setIsSignUp,
    authError, setAuthError,
  };
}

// Patient management state
export function usePatientState() {
  const [patientBlurb, setPatientBlurb] = useState('');
  const [patientType, setPatientType] = useState<'MRI' | 'Surgery' | 'Medical'>('MRI');
  const [isAddingPatient, setIsAddingPatient] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [patientSortBy, setPatientSortBy] = useState<'name' | 'status' | 'type'>('name');
  const [expandedPatient, setExpandedPatient] = useState<number | null>(null);
  const [showAddPatientModal, setShowAddPatientModal] = useState(false);
  const [isAlreadyHospitalized, setIsAlreadyHospitalized] = useState(false);
  const [needsMRIPrep, setNeedsMRIPrep] = useState(false);
  const [needsSurgeryPrep, setNeedsSurgeryPrep] = useState(false);
  const [roundingSheetPatient, setRoundingSheetPatient] = useState<number | null>(null);
  const [roundingFormData, setRoundingFormData] = useState<Record<string, unknown>>({});

  return {
    patientBlurb, setPatientBlurb,
    patientType, setPatientType,
    isAddingPatient, setIsAddingPatient,
    searchQuery, setSearchQuery,
    patientSortBy, setPatientSortBy,
    expandedPatient, setExpandedPatient,
    showAddPatientModal, setShowAddPatientModal,
    isAlreadyHospitalized, setIsAlreadyHospitalized,
    needsMRIPrep, setNeedsMRIPrep,
    needsSurgeryPrep, setNeedsSurgeryPrep,
    roundingSheetPatient, setRoundingSheetPatient,
    roundingFormData, setRoundingFormData,
  };
}

// Task management state
export function useTaskState() {
  const [showTaskOverview, setShowTaskOverview] = useState(true);
  const [taskViewMode, setTaskViewMode] = useState<'by-patient' | 'by-task' | 'general'>('by-patient');
  const [taskTimeFilter, setTaskTimeFilter] = useState<'day' | 'night' | 'all'>('all');
  const [quickTaskInput, setQuickTaskInput] = useState('');
  const [quickTaskPatient, setQuickTaskPatient] = useState<number | null>(null);
  const [showAllTasksView, setShowAllTasksView] = useState(false);
  const [quickAddMenuPatient, setQuickAddMenuPatient] = useState<number | null>(null);
  const [customTaskName, setCustomTaskName] = useState('');
  const [newGeneralTaskName, setNewGeneralTaskName] = useState('');
  const [showAddGeneralTask, setShowAddGeneralTask] = useState(false);
  const [showAddPatientTaskFromOverview, setShowAddPatientTaskFromOverview] = useState(false);
  const [newPatientTaskName, setNewPatientTaskName] = useState('');
  const [selectedPatientForTask, setSelectedPatientForTask] = useState<number | null>(null);
  const [hideCompletedTasks, setHideCompletedTasks] = useState(true);
  const [taskBoardView, setTaskBoardView] = useState<'kanban' | 'list'>('list');
  const [isRefreshingTasks, setIsRefreshingTasks] = useState(false);

  return {
    showTaskOverview, setShowTaskOverview,
    taskViewMode, setTaskViewMode,
    taskTimeFilter, setTaskTimeFilter,
    quickTaskInput, setQuickTaskInput,
    quickTaskPatient, setQuickTaskPatient,
    showAllTasksView, setShowAllTasksView,
    quickAddMenuPatient, setQuickAddMenuPatient,
    customTaskName, setCustomTaskName,
    newGeneralTaskName, setNewGeneralTaskName,
    showAddGeneralTask, setShowAddGeneralTask,
    showAddPatientTaskFromOverview, setShowAddPatientTaskFromOverview,
    newPatientTaskName, setNewPatientTaskName,
    selectedPatientForTask, setSelectedPatientForTask,
    hideCompletedTasks, setHideCompletedTasks,
    taskBoardView, setTaskBoardView,
    isRefreshingTasks, setIsRefreshingTasks,
  };
}

// Medication state
export function useMedicationState() {
  const [selectedDrugs, setSelectedDrugs] = useState<string[]>([]);
  const [customTherapeutics, setCustomTherapeutics] = useState('');
  const [fluidsHighlighted, setFluidsHighlighted] = useState(false);
  const [showMedicationSelector, setShowMedicationSelector] = useState<number | null>(null);

  return {
    selectedDrugs, setSelectedDrugs,
    customTherapeutics, setCustomTherapeutics,
    fluidsHighlighted, setFluidsHighlighted,
    showMedicationSelector, setShowMedicationSelector,
  };
}

// UI toggles and menus state
export function useUIState() {
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showMRISchedule, setShowMRISchedule] = useState(false);
  const [showPrintMenu, setShowPrintMenu] = useState(false);
  const [showToolsMenu, setShowToolsMenu] = useState(false);
  const [showQuickNoteInput, setShowQuickNoteInput] = useState(false);
  const [quickNoteContent, setQuickNoteContent] = useState('');
  const [showDischargeInstructions, setShowDischargeInstructions] = useState(false);
  const [dischargingPatientId, setDischargingPatientId] = useState<number | null>(null);
  const [mounted, setMounted] = useState(false);
  const [activeFilters, setActiveFilters] = useState<{
    status?: string;
    type?: string;
    priority?: string;
  }>({});

  return {
    showExportMenu, setShowExportMenu,
    showMRISchedule, setShowMRISchedule,
    showPrintMenu, setShowPrintMenu,
    showToolsMenu, setShowToolsMenu,
    showQuickNoteInput, setShowQuickNoteInput,
    quickNoteContent, setQuickNoteContent,
    showDischargeInstructions, setShowDischargeInstructions,
    dischargingPatientId, setDischargingPatientId,
    mounted, setMounted,
    activeFilters, setActiveFilters,
  };
}

// Sticker/label printing state
export function useStickerState() {
  const [stickerPickerPatientId, setStickerPickerPatientId] = useState<number | null>(null);
  const [stickerPickerCount, setStickerPickerCount] = useState<number>(2);

  return {
    stickerPickerPatientId, setStickerPickerPatientId,
    stickerPickerCount, setStickerPickerCount,
  };
}

// Batch operations state
export function useBatchState() {
  const [selectedPatientIds, setSelectedPatientIds] = useState<Set<number>>(new Set());
  const [showBatchActions, setShowBatchActions] = useState(false);

  return {
    selectedPatientIds, setSelectedPatientIds,
    showBatchActions, setShowBatchActions,
  };
}

// MRI Schedule input state
export function useMRIInputState() {
  const [mriInputValues, setMriInputValues] = useState<Record<string, string>>({});
  const [mriSaveStatus, setMriSaveStatus] = useState<Record<string, 'saving' | 'saved' | 'error'>>({});
  const mriTimeoutRefs = useRef<Record<string, NodeJS.Timeout>>({});

  return {
    mriInputValues, setMriInputValues,
    mriSaveStatus, setMriSaveStatus,
    mriTimeoutRefs,
  };
}

// Quick Reference (Blackbook) state
export function useQuickReferenceState() {
  const [showQuickReference, setShowQuickReference] = useState(false);
  const [referenceSearch, setReferenceSearch] = useState('');
  const [referenceData, setReferenceData] = useState<{
    medications: Array<{ id: string; name: string; dose: string; notes?: string }>;
    protocols: Array<{ id: string; name: string; content: string }>;
  }>({
    medications: [],
    protocols: [],
  });
  const [referenceLoading, setReferenceLoading] = useState(false);
  const [editingReference, setEditingReference] = useState<{type: 'medications' | 'protocols', id: string} | null>(null);
  const [editingReferenceData, setEditingReferenceData] = useState<Record<string, unknown> | null>(null);
  const [newReferenceItem, setNewReferenceItem] = useState<Record<string, unknown>>({});
  const [cocktailWeight, setCocktailWeight] = useState('');

  return {
    showQuickReference, setShowQuickReference,
    referenceSearch, setReferenceSearch,
    referenceData, setReferenceData,
    referenceLoading, setReferenceLoading,
    editingReference, setEditingReference,
    editingReferenceData, setEditingReferenceData,
    newReferenceItem, setNewReferenceItem,
    cocktailWeight, setCocktailWeight,
  };
}

// SOAP Builder state
export function useSOAPState() {
  const [showSOAPBuilder, setShowSOAPBuilder] = useState(false);
  const [expandedSections, setExpandedSections] = useState<string[]>(['patient', 'history', 'neuro']);
  const [showPasteModal, setShowPasteModal] = useState(false);
  const [pastedText, setPastedText] = useState('');
  const [showScreenshotModal, setShowScreenshotModal] = useState(false);
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
  const [screenshotPreview, setScreenshotPreview] = useState<string>('');
  const [isParsingScreenshot, setIsParsingScreenshot] = useState(false);
  const [screenshotWarnings, setScreenshotWarnings] = useState<string[]>([]);

  return {
    showSOAPBuilder, setShowSOAPBuilder,
    expandedSections, setExpandedSections,
    showPasteModal, setShowPasteModal,
    pastedText, setPastedText,
    showScreenshotModal, setShowScreenshotModal,
    screenshotFile, setScreenshotFile,
    screenshotPreview, setScreenshotPreview,
    isParsingScreenshot, setIsParsingScreenshot,
    screenshotWarnings, setScreenshotWarnings,
  };
}

// Default SOAP data structure
export const DEFAULT_SOAP_DATA = {
  // Patient info
  name: '',
  age: '',
  sex: '',
  breed: '',
  species: 'Canine',
  reasonForVisit: '',
  visitType: 'recheck' as const,
  // History sections
  lastVisit: '',
  currentHistory: '',
  csvd: 'none',
  pupd: 'none',
  appetite: 'normal',
  lastMRI: '',
  medications: '',
  prevDiagnostics: '',
  whyHereToday: '',
  painfulVocalizing: 'None',
  diet: '',
  allergies: 'none',
  otherPets: '',
  indoorOutdoor: 'indoor',
  trauma: 'No',
  travel: 'No',
  heartwormPrev: 'Yes',
  fleaTick: 'Yes',
  vaccinesUTD: 'Yes',
  otherMedicalHistory: '',
  // Physical exam
  peENT: '',
  peOral: '',
  pePLN: '',
  peCV: '',
  peResp: '',
  peAbd: '',
  peRectal: '',
  peMS: '',
  peInteg: '',
  // Neuro exam
  mentalStatus: 'BAR',
  gait: '',
  cranialNerves: '',
  posturalReactions: '',
  spinalReflexes: '',
  tone: '',
  muscleMass: '',
  nociception: '',
  examBy: '',
  // Assessment/Plan
  progression: '',
  neurolocalization: '',
  ddx: '',
  diagnosticsToday: '',
  treatments: '',
  discussionChanges: '',
};
