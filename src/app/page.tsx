'use client';

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useAuth as useApiAuth, usePatients, useGeneralTasks, useCommonItems } from '@/hooks/use-api';
import { apiClient } from '@/lib/api-client';
import { parsePatientBlurb, analyzeBloodwork, analyzeRadiology, parseMedications, parseEzyVetBlock, determineScanType } from '@/lib/ai-parser';
import { Search, Plus, Loader2, LogOut, CheckCircle2, Circle, Trash2, Sparkles, Brain, Zap, ListTodo, FileSpreadsheet, BookOpen, FileText, Copy, ChevronDown, Camera, Upload, AlertTriangle, TableProperties, LayoutGrid, List as ListIcon, Award, Download, Tag, MoreHorizontal, RotateCcw, Sunrise } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { PatientListItem } from '@/components/PatientListItem';
import { TaskChecklist } from '@/components/TaskChecklist';
import { migrateAllTasksOnLoad } from '@/lib/task-migration';
import { downloadAllStickersPDF, downloadBigLabelsPDF, downloadTinyLabelsPDF, printConsolidatedBigLabels, printConsolidatedTinyLabels, printSinglePatientBigLabels, printSinglePatientTinyLabels } from '@/lib/pdf-generators/stickers';
import {
  MORNING_TASK_NAMES,
  EVENING_TASK_NAMES,
  DAILY_MORNING_TASK_NAMES,
  DAILY_EVENING_TASK_NAMES,
  getTaskTimeOfDay,
  getTaskIcon,
  getTimeColors,
  type TaskTimeOfDay,
} from '@/lib/task-config';
import { calculateStickerCounts } from '@/lib/sticker-calculator';

export default function VetHub() {
  const { user, isLoading: authLoading, login, register, logout } = useApiAuth();
  const { patients, setPatients, isLoading: patientsLoading, refetch } = usePatients();
  const { tasks: generalTasks, setTasks: setGeneralTasks, refetch: refetchGeneralTasks } = useGeneralTasks();
  const { medications: commonMedications } = useCommonItems();
  const { toast } = useToast();

  // Auth state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [authError, setAuthError] = useState('');

  // Patient state
  const [patientBlurb, setPatientBlurb] = useState('');
  const [patientType, setPatientType] = useState<'MRI' | 'Surgery' | 'Medical'>('MRI');
  const [isAddingPatient, setIsAddingPatient] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [patientSortBy, setPatientSortBy] = useState<'name' | 'status' | 'type'>('name');
  const [expandedPatient, setExpandedPatient] = useState<number | null>(null);
  const [showTaskOverview, setShowTaskOverview] = useState(true); // Tasks visible by default
  const [taskViewMode, setTaskViewMode] = useState<'by-patient' | 'by-task' | 'general'>('by-patient');
  const [taskTimeFilter, setTaskTimeFilter] = useState<'day' | 'night' | 'all'>('all');
  const [quickTaskInput, setQuickTaskInput] = useState('');
  const [quickTaskPatient, setQuickTaskPatient] = useState<number | null>(null);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showMRISchedule, setShowMRISchedule] = useState(false);
  const [showAllTasksView, setShowAllTasksView] = useState(false);
  const [showAddPatientModal, setShowAddPatientModal] = useState(false);
  const [isAlreadyHospitalized, setIsAlreadyHospitalized] = useState(false);
  const [needsMRIPrep, setNeedsMRIPrep] = useState(false);
  const [needsSurgeryPrep, setNeedsSurgeryPrep] = useState(false);
  const [quickAddMenuPatient, setQuickAddMenuPatient] = useState<number | null>(null);
  const [customTaskName, setCustomTaskName] = useState('');
  const [roundingSheetPatient, setRoundingSheetPatient] = useState<number | null>(null);
  const [roundingFormData, setRoundingFormData] = useState<any>({});
  const [showMedicationSelector, setShowMedicationSelector] = useState<number | null>(null);
  const [newGeneralTaskName, setNewGeneralTaskName] = useState('');
  const [showAddGeneralTask, setShowAddGeneralTask] = useState(false);
  const [showAddPatientTaskFromOverview, setShowAddPatientTaskFromOverview] = useState(false);
  const [newPatientTaskName, setNewPatientTaskName] = useState('');
  const [selectedPatientForTask, setSelectedPatientForTask] = useState<number | null>(null);
  const [showQuickReference, setShowQuickReference] = useState(false);
  const [showPrintMenu, setShowPrintMenu] = useState(false);
  const [showToolsMenu, setShowToolsMenu] = useState(false);

  // Individual sticker picker state (for choosing big vs tiny when clicking sticker button)
  const [stickerPickerPatientId, setStickerPickerPatientId] = useState<number | null>(null);
  const [stickerPickerCount, setStickerPickerCount] = useState<number>(2);

  // Discharge instructions modal state
  const [showDischargeInstructions, setShowDischargeInstructions] = useState(false);
  const [dischargingPatientId, setDischargingPatientId] = useState<number | null>(null);

  // Batch operations state
  const [selectedPatientIds, setSelectedPatientIds] = useState<Set<number>>(new Set());
  const [showBatchActions, setShowBatchActions] = useState(false);
  const [referenceSearch, setReferenceSearch] = useState('');

  // Debounced input state for MRI Schedule
  const [mriInputValues, setMriInputValues] = useState<Record<string, string>>({});
  const [mriSaveStatus, setMriSaveStatus] = useState<Record<string, 'saving' | 'saved' | 'error'>>({});
  const mriTimeoutRefs = useRef<Record<string, NodeJS.Timeout>>({});

  // Hide completed tasks toggle - default to TRUE (auto-hide completed)
  const [hideCompletedTasks, setHideCompletedTasks] = useState(true);

  // Mounted state to prevent hydration mismatch
  const [mounted, setMounted] = useState(false);

  // Grid view removed - always use list view

  // Task view mode (kanban vs list)
  const [taskBoardView, setTaskBoardView] = useState<'kanban' | 'list'>('list');

  // Task refresh state
  const [isRefreshingTasks, setIsRefreshingTasks] = useState(false);

  // Active filters for quick filter chips
  const [activeFilters, setActiveFilters] = useState<{
    status?: string;
    type?: string;
    priority?: string;
  }>({});

  const [referenceData, setReferenceData] = useState<any>({
    medications: [
      { name: 'Gabapentin', dose: '10-20 mg/kg PO q8-12h', notes: 'Neuropathic pain, seizures' },
      { name: 'Metronidazole', dose: '15 mg/kg PO BID', notes: 'GI, anaerobic infections' },
      { name: 'Maropitant (Cerenia)', dose: '1 mg/kg SQ/PO SID', notes: 'Anti-emetic' },
      { name: 'Fentanyl CRI', dose: '3-5 mcg/kg/hr', notes: 'Severe pain management' },
      { name: 'Levetiracetam (Keppra)', dose: '20 mg/kg PO/IV TID', notes: 'Seizure control' },
    ],
    protocols: [
      { name: 'Status Epilepticus', content: '1. Diazepam 0.5-1mg/kg IV\n2. If continues: Levetiracetam 60mg/kg IV over 15min\n3. CRI: Levetiracetam 2-4mg/kg/hr + Propofol 0.1-0.6mg/kg/min' },
      { name: 'MRI Pre-op', content: '1. NPO 12 hours\n2. Pre-med: Acepromazine + Butorphanol\n3. Propofol induction\n4. Sevoflurane maintenance' },
      { name: 'IVDD Medical Management', content: '1. Strict cage rest 4-6 weeks\n2. NSAIDs (Carprofen 2.2mg/kg BID)\n3. Gabapentin 10mg/kg TID\n4. Consider steroids if acute' },
    ]
  });
  const [editingReference, setEditingReference] = useState<{type: 'medications' | 'protocols', index: number} | null>(null);
  const [newReferenceItem, setNewReferenceItem] = useState<any>({});
  const [cocktailWeight, setCocktailWeight] = useState('');

  // SOAP Builder state
  const [showSOAPBuilder, setShowSOAPBuilder] = useState(false);
  const [expandedSections, setExpandedSections] = useState<string[]>(['patient', 'history', 'neuro']);
  const [showPasteModal, setShowPasteModal] = useState(false);
  const [pastedText, setPastedText] = useState('');
  const [showScreenshotModal, setShowScreenshotModal] = useState(false);
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
  const [screenshotPreview, setScreenshotPreview] = useState<string>('');
  const [isParsingScreenshot, setIsParsingScreenshot] = useState(false);
  const [screenshotWarnings, setScreenshotWarnings] = useState<string[]>([]);
  const [soapData, setSOAPData] = useState<any>({
    // Patient info
    name: '',
    age: '',
    sex: '',
    breed: '',
    species: 'Canine',
    reasonForVisit: '',
    visitType: 'recheck', // 'recheck' or 'initial'
    // History sections
    lastVisit: '',
    currentHistory: '',
    csvd: 'none',
    pupd: 'none',
    appetite: 'normal',
    lastMRI: '',
    medications: '',
    prevDiagnostics: '',
    // For Initial Consultation only
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
    // Physical Exam fields
    peENT: '',
    peOral: '',
    pePLN: '',
    peCV: '',
    peResp: '',
    peAbd: '',
    peRectal: '',
    peMS: '',
    peInteg: '',
    // Neuro Exam
    mentalStatus: 'BAR',
    gait: '',
    cranialNerves: '',
    posturalReactions: '',
    spinalReflexes: '',
    tone: '',
    muscleMass: '',
    nociception: '',
    examBy: '',
    // A&P sections
    progression: '',
    neurolocalization: '',
    ddx: '',
    diagnosticsToday: '',
    treatments: '',
    discussionChanges: '',
  });

  // Helper function to create a clean base template (keeps patient info, clears history/exam/assessment)
  const getCleanTemplateBase = () => ({
    // Keep patient demographic info only
    name: soapData.name,
    age: soapData.age,
    sex: soapData.sex,
    breed: soapData.breed,
    species: soapData.species,
    reasonForVisit: soapData.reasonForVisit,
    visitType: soapData.visitType,
    // Clear all history fields
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
    // Clear all physical exam fields
    peENT: '',
    peOral: '',
    pePLN: '',
    peCV: '',
    peResp: '',
    peAbd: '',
    peRectal: '',
    peMS: '',
    peInteg: '',
    // Clear neuro exam (will be filled by template)
    mentalStatus: 'BAR',
    gait: '',
    cranialNerves: '',
    posturalReactions: '',
    spinalReflexes: '',
    tone: '',
    muscleMass: '',
    nociception: '',
    examBy: '',
    // Clear assessment/plan (will be filled by template)
    progression: '',
    neurolocalization: '',
    ddx: '',
    diagnosticsToday: '',
    treatments: '',
    discussionChanges: '',
  });

  // Helper function to get saved SOAP exams from memory
  const getSavedExams = () => {
    try {
      return JSON.parse(localStorage.getItem('soapMemory') || '{}');
    } catch {
      return {};
    }
  };

  // AI Parse function for SOAP Builder
  const handlePasteAndParse = async () => {
    if (!pastedText.trim()) {
      toast({ variant: 'destructive', title: 'Please paste some text first' });
      return;
    }

    try {
      toast({ title: '🤖 AI parsing your notes...' });

      const response = await fetch('/api/parse-soap-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: pastedText,
          currentData: soapData,
        }),
      });

      if (!response.ok) throw new Error('Parsing failed');

      const result = await response.json();

      // Merge AI-extracted data with existing soapData
      setSOAPData({ ...soapData, ...result.extractedData });
      toast({ title: '✅ Fields populated!', description: `Updated ${Object.keys(result.extractedData).length} fields` });
      setShowPasteModal(false);
      setPastedText('');
    } catch (error) {
      console.error('Parse error:', error);
      toast({ variant: 'destructive', title: 'Error parsing text', description: 'AI parsing failed. Please try again.' });
    }
  };

  // Screenshot Upload & Parse Handler
  const handleScreenshotUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({ variant: 'destructive', title: 'Invalid file', description: 'Please upload an image file (PNG, JPG, etc.)' });
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast({ variant: 'destructive', title: 'File too large', description: 'Please upload an image smaller than 10MB' });
      return;
    }

    setScreenshotFile(file);

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setScreenshotPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleParseScreenshot = async (parseType: 'treatment-sheet' | 'soap-note' | 'patient-info') => {
    if (!screenshotFile) {
      toast({ variant: 'destructive', title: 'No screenshot selected' });
      return;
    }

    setIsParsingScreenshot(true);
    setScreenshotWarnings([]);

    try {
      toast({ title: '🤖 AI reading screenshot...', description: 'Extracting medical data with vision AI' });

      const formData = new FormData();
      formData.append('image', screenshotFile);
      formData.append('parseType', parseType);
      formData.append('currentData', JSON.stringify(soapData));

      const response = await fetch('/api/parse-screenshot', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Parsing failed');
      }

      const result = await response.json();

      // Handle warnings (medication unclear, etc.)
      if (result.warnings && result.warnings.length > 0) {
        setScreenshotWarnings(result.warnings);
        toast({
          title: '⚠️ Review Required',
          description: `${result.warnings.length} warning(s) detected. Please verify extracted data.`,
          variant: 'destructive',
        });
      }

      // Merge extracted data with existing SOAP data
      if (parseType === 'treatment-sheet') {
        // Format medications from array to string
        let medicationsText = '';
        if (result.extractedData.medications && result.extractedData.medications.length > 0) {
          medicationsText = result.extractedData.medications
            .map((med: any) => {
              let line = `${med.name} ${med.dose} ${med.route} ${med.frequency}`;
              if (med.instructions) line += ` (${med.instructions})`;
              if (med.safetyFlag) line += ` ⚠️ ${med.safetyFlag}`;
              return line;
            })
            .join('\n');
        }

        // Merge treatment sheet data
        setSOAPData({
          ...soapData,
          name: result.extractedData.patientInfo?.name || soapData.name,
          species: result.extractedData.patientInfo?.species || soapData.species,
          age: result.extractedData.patientInfo?.age || soapData.age,
          sex: result.extractedData.patientInfo?.sex || soapData.sex,
          breed: result.extractedData.patientInfo?.breed || soapData.breed,
          medications: medicationsText || soapData.medications,
          diagnosticsToday: result.extractedData.diagnostics || soapData.diagnosticsToday,
          treatments: [
            result.extractedData.treatments,
            result.extractedData.ivFluids,
            result.extractedData.feedingInstructions
          ].filter(Boolean).join('\n\n') || soapData.treatments,
        });

        toast({
          title: '✅ Screenshot parsed!',
          description: `Extracted ${result.extractedData.medications?.length || 0} medications and treatment data`,
        });

      } else if (parseType === 'soap-note') {
        // Merge SOAP note data directly
        setSOAPData({ ...soapData, ...result.extractedData });
        toast({
          title: '✅ SOAP note extracted!',
          description: `Updated ${Object.keys(result.extractedData).length} fields`,
        });

      } else if (parseType === 'patient-info') {
        // Merge patient demographic data
        setSOAPData({
          ...soapData,
          name: result.extractedData.patientName || soapData.name,
          species: result.extractedData.species || soapData.species,
          age: result.extractedData.age || soapData.age,
          sex: result.extractedData.sex || soapData.sex,
          breed: result.extractedData.breed || soapData.breed,
          currentHistory: result.extractedData.activeProblems || soapData.currentHistory,
          medications: result.extractedData.currentMedications || soapData.medications,
          allergies: result.extractedData.allergies || soapData.allergies,
        });
        toast({ title: '✅ Patient info extracted!' });
      }

      // Close modal and reset
      setShowScreenshotModal(false);
      setScreenshotFile(null);
      setScreenshotPreview('');

    } catch (error: any) {
      console.error('Screenshot parse error:', error);
      toast({
        variant: 'destructive',
        title: 'Error parsing screenshot',
        description: error.message || 'Vision AI failed. Please try again or use Paste & Parse.',
      });
    } finally {
      setIsParsingScreenshot(false);
    }
  };

  // Calculate task stats (today only)
  const taskStats = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    let total = 0;
    let completed = 0;

    // Count patient tasks
    patients.forEach(patient => {
      const tasks = patient.tasks || [];
      const todayTasks = tasks; // No date filtering - tasks don't have date field
      total += todayTasks.length;
      completed += todayTasks.filter((t: any) => t.completed).length;
    });

    // Count general tasks
    const todayGeneralTasks = generalTasks; // No date filtering - tasks don't have date field
    total += todayGeneralTasks.length;
    completed += todayGeneralTasks.filter((t: any) => t.completed).length;

    return { total, completed, remaining: total - completed, allComplete: total > 0 && completed === total };
  }, [patients, generalTasks]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');

    try {
      if (isSignUp) {
        await register(email, password);
        toast({ title: '🎉 Account created!', description: 'Welcome to VetHub' });
      } else {
        await login(email, password);
        toast({ title: '👋 Welcome back!', description: 'Logged in successfully' });
      }
    } catch (error: any) {
      setAuthError(error.message || 'Authentication failed');
    }
  };

  const handleAddPatient = async () => {
    if (!patientBlurb.trim()) {
      toast({ variant: 'destructive', title: 'Error', description: 'Please paste patient information' });
      return;
    }

    setIsAddingPatient(true);
    try {
      // Use the same comprehensive parser as Magic Paste
      const response = await fetch('/api/parse-ezyvet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: patientBlurb }),
      });

      if (!response.ok) {
        throw new Error('Failed to parse patient data');
      }

      const result = await response.json();
      const parsed = result.data;

      // Extract patient name from demographics
      const patientName = parsed.demographics?.name?.replace(/^Patient\s/i, '') || 'Unnamed';

      // Extract owner last name correctly
      // Format can be "Iovino, Michael" or "Michael Iovino"
      let ownerLastName = '';
      if (parsed.demographics?.ownerName) {
        const ownerName = parsed.demographics.ownerName.trim();
        if (ownerName.includes(',')) {
          // Format: "Iovino, Michael" → take first part (before comma)
          ownerLastName = ownerName.split(',')[0].trim();
        } else {
          // Format: "Michael Iovino" → take last word
          ownerLastName = ownerName.split(' ').pop()?.trim() || '';
        }
      }

      const fullName = ownerLastName ? `${patientName} ${ownerLastName}` : patientName;

      // Get type-specific tasks from task-config (single source of truth)
      // Skip admission tasks if patient is already hospitalized (coming from weekend)
      // BUT include prep tasks if needsMRIPrep/needsSurgeryPrep is checked (case-by-case)
      const { getTypeSpecificTasks } = await import('@/lib/task-config');
      let typeTemplates: { name: string }[] = [];
      if (isAlreadyHospitalized) {
        if (needsMRIPrep && patientType === 'MRI') {
          typeTemplates = getTypeSpecificTasks('MRI');
        } else if (needsSurgeryPrep && patientType === 'Surgery') {
          typeTemplates = getTypeSpecificTasks('Surgery');
        }
      } else {
        typeTemplates = getTypeSpecificTasks(patientType);
      }
      const typeTasks = typeTemplates.map(t => t.name);

      // All tasks = type-specific tasks only (no more hardcoded morning/evening tasks)
      const allTasks = typeTasks;

      const patientData = {
        name: fullName,
        type: patientType,
        status: isAlreadyHospitalized ? 'Hospitalized' : 'New',
        added_time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        demographics: {
          name: fullName,  // Use full name (patient name + owner last name) for consistency
          patientId: parsed.demographics?.patientId || '',
          clientId: parsed.consultations?.[0]?.consultNumber || parsed.demographics?.clientId || '',
          ownerName: parsed.demographics?.ownerName || '',
          ownerPhone: parsed.demographics?.ownerPhone || '',
          ownerEmail: parsed.demographics?.ownerEmail || '',
          species: parsed.demographics?.species || '',
          breed: parsed.demographics?.breed || '',
          age: parsed.demographics?.age || '',
          sex: parsed.demographics?.sex || '',
          weight: parsed.demographics?.weight || '',
          dateOfBirth: parsed.demographics?.dateOfBirth || '',
          colorMarkings: parsed.demographics?.color || '',
          microchip: parsed.demographics?.microchip || '',
        },
        roundingData: {
          signalment: [parsed.demographics?.age, parsed.demographics?.sex, parsed.demographics?.species, parsed.demographics?.breed].filter(Boolean).join(' '),
          problems: parsed.consultations?.[0]?.chiefComplaint || '',
          diagnosticFindings: parsed.diagnostics?.radiographs || '',
          therapeutics: parsed.medications?.map((med: any) =>
            `${med.name} ${med.dose} ${med.route} ${med.frequency}`.trim()
          ).join('\n') || '',
          plan: parsed.consultations?.[0]?.plan || '',
        },
        // Auto-set sticker counts based on patient type
        stickerData: {
          isNewAdmit: !isAlreadyHospitalized,
          isSurgery: patientType === 'Surgery',
          bigLabelCount: patientType === 'MRI' ? 5 : patientType === 'Surgery' ? 4 : 2,
          tinySheetCount: patientType === 'MRI' ? 4 : patientType === 'Surgery' ? 8 : 0,
        },
        mriData: {},
      };

      const newPatient = await apiClient.createPatient(patientData);

      for (const taskName of allTasks) {
        await apiClient.createTask(newPatient.id, {
          title: taskName,
          completed: false,
          dueDate: new Date().toISOString().split('T')[0],
        });
      }

      toast({ title: '✨ Patient Added!', description: `${fullName} created with AI-parsed data` });
      setPatientBlurb('');
      refetch();
    } catch (error: any) {
      console.error('Add patient error:', error);
      toast({ variant: 'destructive', title: 'Failed to add patient', description: error.message || 'Try again' });
    } finally {
      setIsAddingPatient(false);
    }
  };

  const handleToggleTask = async (patientId: number, taskId: string, currentStatus: boolean) => {
    // Optimistic update: update local state immediately to prevent reordering
    const newStatus = !currentStatus;
    console.log('[TASK DEBUG] Toggle request:', { patientId, taskId, currentStatus, newStatus });

    setPatients(prev => prev.map(p =>
      p.id === patientId
        ? {
            ...p,
            tasks: (p.tasks || []).map((t: any) =>
              t.id === taskId ? { ...t, completed: newStatus } : t
            ),
          }
        : p
    ));

    try {
      const result = await apiClient.updateTask(String(patientId), String(taskId), { completed: newStatus });
      console.log('[TASK DEBUG] API response:', result);
      // Success - no refetch needed, local state is already updated
    } catch (error: any) {
      // Rollback optimistic update on error
      setPatients(prev => prev.map(p =>
        p.id === patientId
          ? {
              ...p,
              tasks: (p.tasks || []).map((t: any) =>
                t.id === taskId ? { ...t, completed: currentStatus } : t
              ),
            }
          : p
      ));

      // Find patient and task for detailed error message
      const patient = patients.find(p => p.id === patientId);
      const task = patient?.tasks?.find((t: any) => t.id === taskId);

      const patientName = patient?.demographics?.name || patient?.name || `Patient ${patientId}`;
      const taskTitle = task?.title || `Task ${taskId}`;

      console.error(`Task toggle error for ${patientName} - ${taskTitle}:`, error);

      toast({
        variant: 'destructive',
        title: 'Failed to update task',
        description: `Could not toggle "${taskTitle}" for ${patientName}. ${error.message || 'Check console for details.'}`
      });
    }
  };

  // Refresh all tasks - regenerate based on patient status
  const handleRefreshTasks = async () => {
    setIsRefreshingTasks(true);
    try {
      const response = await fetch('/api/tasks/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        throw new Error('Failed to refresh tasks');
      }

      const data = await response.json();

      toast({
        title: 'Tasks refreshed',
        description: data.message,
      });

      // Refetch all patient data to show updated tasks
      refetch();
      refetchGeneralTasks();
    } catch (error: any) {
      console.error('Task refresh error:', error);
      toast({
        variant: 'destructive',
        title: 'Failed to refresh tasks',
        description: error.message || 'Could not refresh tasks. Try again.',
      });
    } finally {
      setIsRefreshingTasks(false);
    }
  };

  const handleBulkCompleteTask = async (taskName: string, items: Array<{ patient: any; task: any }>) => {
    try {
      // Filter to only incomplete tasks
      const incompleteTasks = items.filter(({ task }) => !task.completed);

      if (incompleteTasks.length === 0) {
        toast({
          title: 'All tasks already completed',
          description: `"${taskName}" is already completed for all patients.`
        });
        return;
      }

      // Update all incomplete tasks in parallel
      await Promise.all(
        incompleteTasks.map(({ patient, task }) =>
          apiClient.updateTask(String(patient.id), String(task.id), { completed: true })
        )
      );

      toast({
        title: 'Tasks completed',
        description: `Marked "${taskName}" as complete for ${incompleteTasks.length} patient(s).`
      });

      refetch();
    } catch (error: any) {
      console.error(`Bulk complete error for ${taskName}:`, error);
      toast({
        variant: 'destructive',
        title: 'Failed to complete tasks',
        description: `Could not complete "${taskName}" for all patients. ${error.message || 'Try again.'}`
      });
    }
  };

  const handleDeleteTask = async (patientId: number, taskId: string) => {
    try {
      await apiClient.deleteTask(String(patientId), String(taskId));
      refetch();
    } catch (error: any) {
      // Find patient and task for detailed error message
      const patient = patients.find(p => p.id === patientId);
      const task = patient?.tasks?.find((t: any) => t.id === taskId);

      const patientName = patient?.demographics?.name || patient?.name || `Patient ${patientId}`;
      const taskTitle = task?.title || `Task ${taskId}`;

      console.error(`Task delete error for ${patientName} - ${taskTitle}:`, error);

      toast({
        variant: 'destructive',
        title: 'Failed to delete task',
        description: `Could not delete "${taskTitle}" for ${patientName}. ${error.message || 'Check console for details.'}`
      });
    }
  };

  const handleResetAllTasks = async () => {
    try {
      const activePatients = patients.filter(p => p.status !== 'Discharging');
      let taskCount = 0;

      for (const patient of activePatients) {
        const completedTasks = patient.tasks.filter((t: { completed: boolean }) => t.completed);
        for (const task of completedTasks) {
          await apiClient.updateTask(String(patient.id), String(task.id), { completed: false });
          taskCount++;
        }
      }

      refetch();
      toast({
        title: '✅ Tasks Reset',
        description: `Uncompleted ${taskCount} task${taskCount === 1 ? '' : 's'} for ${activePatients.length} patient${activePatients.length === 1 ? '' : 's'}`
      });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to reset tasks' });
    }
  };

  // Handle filter chip clicks
  const handleFilterClick = (filterType: string, value: string) => {
    setActiveFilters(prev => {
      // Toggle filter: if it's already active, remove it
      if (filterType === 'status' && prev.status === value) {
        const { status, ...rest } = prev;
        return rest;
      }
      if (filterType === 'type' && prev.type === value) {
        const { type, ...rest } = prev;
        return rest;
      }
      if (filterType === 'priority' && prev.priority === value) {
        const { priority, ...rest } = prev;
        return rest;
      }

      // Otherwise, set the new filter
      return {
        ...prev,
        [filterType]: value,
      };
    });
  };

  const handleQuickAddTask = async (patientId: number, taskName: string) => {
    try {
      await apiClient.createTask(String(patientId), {
        title: taskName,
        completed: false,
        dueDate: new Date().toISOString().split('T')[0],  // Fixed: use 'dueDate' not 'date'
      });
      toast({ title: `✅ Added: ${taskName}` });
      setQuickAddMenuPatient(null);
      setCustomTaskName('');
      refetch();
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to add task' });
    }
  };

  const handleDeletePatient = async (patientId: number) => {
    if (!confirm('Delete this patient?')) return;
    try {
      await apiClient.deletePatient(String(patientId));
      toast({ title: '🗑️ Patient deleted' });
      refetch();
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to delete patient' });
    }
  };

  const handleStatusChange = async (patientId: number, newStatus: string) => {
    try {
      await apiClient.updatePatient(String(patientId), { status: newStatus });
      toast({ title: `✅ Status updated to ${newStatus}` });

      // Auto-create tasks based on status changes
      const freshPatient = await apiClient.getPatient(String(patientId));
      const existingTasks = freshPatient?.tasks || [];

      // When MRI patient becomes Hospitalized, add "Look at MRI Sequences" task
      if (newStatus === 'Hospitalized' && freshPatient?.type === 'MRI') {
        const taskName = 'Look at MRI Sequences';
        const hasTask = existingTasks.some((t: any) => (t.title || t.name) === taskName);

        if (!hasTask) {
          await apiClient.createTask(String(patientId), {
            title: taskName,
            description: 'MRI Prep',
            category: 'MRI Prep',
            timeOfDay: 'morning',
            priority: 'high',
            completed: false,
          });
          toast({
            title: '📋 Added MRI task',
            description: taskName
          });
        }
      }

      // Auto-create discharge tasks when status changes to "Discharging"
      if (newStatus === 'Discharging') {
        // Get discharge task templates from task config
        const { getStatusTriggeredTasks } = await import('@/lib/task-config');
        const templates = getStatusTriggeredTasks('Discharging');

        let createdCount = 0;
        const taskNames: string[] = [];

        for (const template of templates) {
          // Check if task already exists (by template name)
          const hasTask = existingTasks.some((t: any) =>
            (t.title || t.name) === template.name
          );

          if (!hasTask) {
            await apiClient.createTask(String(patientId), {
              title: template.name,
              description: template.category,
              category: template.category,
              timeOfDay: template.timeOfDay || 'anytime',
              completed: false,
            });
            createdCount++;
            taskNames.push(template.name);
          }
        }

        if (createdCount > 0) {
          const taskList = taskNames.slice(0, 3).join(', ') + (taskNames.length > 3 ? `, +${taskNames.length - 3} more` : '');
          toast({
            title: `📋 Added ${createdCount} discharge task${createdCount === 1 ? '' : 's'}`,
            description: taskList
          });
        }

      }

      refetch();
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to update status' });
    }
  };

  const handleTypeChange = async (patientId: number, newType: string) => {
    try {
      console.log(`[handleTypeChange] Updating patient ${patientId} to type: ${newType}`);
      const result = await apiClient.updatePatient(String(patientId), { type: newType });
      console.log(`[handleTypeChange] API response:`, result);
      toast({ title: `✅ Type updated to ${newType}` });

      // Auto-create tasks for type changes
      // - New Admits: get all type-specific tasks
      // - Hospitalized patients switching to MRI/Surgery: get prep tasks (patient may have been waiting)
      const patient = patients.find(p => p.id === patientId);
      const isNewAdmit = patient?.status?.toLowerCase() === 'new admit';
      const isSwitchingToMRIOrSurgery = newType === 'MRI' || newType === 'Surgery';

      if ((isNewAdmit || isSwitchingToMRIOrSurgery) && ['MRI', 'Surgery', 'Medical', 'Discharge'].includes(newType)) {
        // Fetch fresh patient data to get accurate existing tasks (avoid stale state)
        const freshPatient = await apiClient.getPatient(String(patientId));
        const patientName = freshPatient?.demographics?.name || 'Unknown Patient';
        const existingTasks = freshPatient?.tasks || [];

        // Get task templates for this patient type
        const { getTypeSpecificTasks } = await import('@/lib/task-config');
        const templates = getTypeSpecificTasks(newType);

        let createdCount = 0;
        const taskNames: string[] = [];

        for (const template of templates) {
          // Check if task already exists (by template name)
          const hasTask = existingTasks.some((t: any) =>
            (t.title || t.name) === template.name
          );

          if (!hasTask) {
            await apiClient.createTask(String(patientId), {
              title: template.name,
              description: template.category,
              category: template.category,
              timeOfDay: template.timeOfDay || 'anytime',
              completed: false,
            });
            createdCount++;
            taskNames.push(template.name);
          }
        }

        if (createdCount > 0) {
          const taskList = taskNames.slice(0, 3).join(', ') + (taskNames.length > 3 ? `, +${taskNames.length - 3} more` : '');
          toast({
            title: `📋 Added ${createdCount} ${newType} tasks`,
            description: taskList
          });
        }
      }

      refetch();
    } catch (error) {
      console.error('[handleTypeChange] Error:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: `Failed to update type: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    }
  };

  const handleCompleteAllCategory = async (patientId: number, category: 'morning' | 'evening') => {
    try {
      const patient = patients.find(p => p.id === patientId);
      if (!patient) return;

      const tasks = patient.tasks || [];
      const categoryTasks = tasks.filter((t: any) => {
        const timeOfDay = getTaskTimeOfDay(t.title || t.name);
        return timeOfDay === category && !t.completed;
      });

      for (const task of categoryTasks) {
        await apiClient.updateTask(String(patientId), String(task.id), { completed: true });
      }

      toast({ title: `✅ Completed all ${category} tasks!` });
      refetch();
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: `Failed to complete ${category} tasks` });
    }
  };

  const handleAddAllCategoryTasks = async (patientId: number, category: 'morning' | 'evening') => {
    try {
      const patient = patients.find(p => p.id === patientId);
      if (!patient) return;

      // Use DAILY tasks only (not all morning/evening tasks from every source)
      const tasksToAdd = category === 'morning' ? DAILY_MORNING_TASK_NAMES : DAILY_EVENING_TASK_NAMES;
      const today = new Date().toISOString().split('T')[0];
      const existingTasks = patient.tasks || [];

      let addedCount = 0;
      for (const taskName of tasksToAdd) {
        // Check if task already exists for today
        const hasTask = existingTasks.some((t: any) =>
          (t.title || t.name) === taskName // No date check - tasks don't have date field
        );

        if (!hasTask) {
          await apiClient.createTask(String(patientId), {
            title: taskName,
            completed: false,
            date: today,
          });
          addedCount++;
        }
      }

      if (addedCount > 0) {
        toast({ title: `➕ Added ${addedCount} ${category} tasks!` });
      } else {
        toast({ title: `All ${category} tasks already exist for today` });
      }
      refetch();
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: `Failed to add ${category} tasks` });
    }
  };

  // Batch add tasks to ALL patients
  const handleBatchAddAllCategoryTasks = async (category: 'morning' | 'evening') => {
    try {
      const activePatients = patients.filter(p => p.status !== 'Discharging');
      // Use DAILY tasks only (not all morning/evening tasks from every source)
      const tasksToAdd = category === 'morning' ? DAILY_MORNING_TASK_NAMES : DAILY_EVENING_TASK_NAMES;
      const today = new Date().toISOString().split('T')[0];

      let totalAdded = 0;
      let totalSkipped = 0;

      for (const patient of activePatients) {
        const existingTasks = patient.tasks || [];

        for (const taskName of tasksToAdd) {
          // Check for existing task (including completed ones to avoid duplicates)
          const hasTask = existingTasks.some((t: any) =>
            (t.title || t.name) === taskName
          );

          if (!hasTask) {
            await apiClient.createTask(String(patient.id), {
              title: taskName,
              completed: false,
              date: today,
            });
            totalAdded++;
          } else {
            totalSkipped++;
          }
        }
      }

      if (totalAdded > 0 && totalSkipped > 0) {
        toast({
          title: `➕ Added ${totalAdded} ${category} tasks`,
          description: `Skipped ${totalSkipped} duplicates across ${activePatients.length} patients`
        });
      } else if (totalAdded > 0) {
        toast({ title: `➕ Added ${totalAdded} ${category} tasks to ${activePatients.length} patients!` });
      } else {
        toast({
          title: `No tasks added`,
          description: `All ${category} tasks already exist for all ${activePatients.length} patients`
        });
      }
      refetch();
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: `Failed to batch add ${category} tasks` });
    }
  };

  // Debounced update for MRI Schedule inputs (prevents slowness)
  // Fixed: Looks up fresh patient data inside timeout to avoid stale closures
  const debouncedMRIUpdate = useCallback((
    patientId: number,
    field: string,
    value: string,
    dataType: 'demographics' | 'mriData'
  ) => {
    const key = `${patientId}-${field}`;

    // Update local state immediately for responsive UI
    setMriInputValues(prev => ({ ...prev, [key]: value }));

    // Clear existing timeout
    if (mriTimeoutRefs.current[key]) {
      clearTimeout(mriTimeoutRefs.current[key]);
    }

    // Set new timeout to save after 800ms of no typing
    mriTimeoutRefs.current[key] = setTimeout(async () => {
      try {
        // Show saving indicator
        setMriSaveStatus(prev => ({ ...prev, [key]: 'saving' }));

        // Look up FRESH patient data at save time (not stale closure)
        const freshPatient = patients.find(p => p.id === patientId);
        const freshData = dataType === 'mriData'
          ? (freshPatient?.mriData || {})
          : (freshPatient?.demographics || {});

        const updated = { ...freshData, [field]: value };
        await apiClient.updatePatient(String(patientId), { [dataType]: updated });

        // Show saved indicator briefly
        setMriSaveStatus(prev => ({ ...prev, [key]: 'saved' }));
        setTimeout(() => {
          setMriSaveStatus(prev => {
            const next = { ...prev };
            delete next[key];
            return next;
          });
        }, 2000);
      } catch (error) {
        console.error('Failed to update:', error);
        setMriSaveStatus(prev => ({ ...prev, [key]: 'error' }));
        // Clear error after 3 seconds
        setTimeout(() => {
          setMriSaveStatus(prev => {
            const next = { ...prev };
            delete next[key];
            return next;
          });
        }, 3000);
      }
    }, 800);
  }, [patients]); // ← patients in deps to get fresh data

  const handleSaveRoundingData = async () => {
    if (!roundingSheetPatient) return;

    try {
      await apiClient.updatePatient(String(roundingSheetPatient), {
        roundingData: roundingFormData
      });
      toast({ title: '✅ Rounding data saved!' });
      setRoundingSheetPatient(null);
      refetch();
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to save rounding data' });
    }
  };

  const handleAddGeneralTask = async () => {
    if (!newGeneralTaskName.trim()) return;

    try {
      await apiClient.createGeneralTask({
        title: newGeneralTaskName,
        completed: false,
      });
      toast({ title: `✅ Added general task: ${newGeneralTaskName}` });
      setNewGeneralTaskName('');
      setShowAddGeneralTask(false);
      refetchGeneralTasks();
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to add general task' });
    }
  };

  // Unified add task handler for TaskChecklist component
  const handleAddTaskFromChecklist = async (patientId: number | null, taskName: string) => {
    try {
      if (patientId === null) {
        // Add as general task
        await apiClient.createGeneralTask({ title: taskName, completed: false });
        refetchGeneralTasks();
      } else {
        // Add as patient task
        await apiClient.createTask(String(patientId), { title: taskName, completed: false });
        refetch();
      }
      toast({ title: `✅ Added: ${taskName}` });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to add task' });
    }
  };

  // Batch Operations Functions
  const togglePatientSelection = (patientId: number) => {
    const newSelected = new Set(selectedPatientIds);
    if (newSelected.has(patientId)) {
      newSelected.delete(patientId);
    } else {
      newSelected.add(patientId);
    }
    setSelectedPatientIds(newSelected);
    setShowBatchActions(newSelected.size > 0);
  };

  const selectAllPatients = () => {
    const allIds = new Set(filteredPatients.map(p => p.id));
    setSelectedPatientIds(allIds);
    setShowBatchActions(true);
  };

  const clearSelection = () => {
    setSelectedPatientIds(new Set());
    setShowBatchActions(false);
  };

  const batchMarkAllTasksDone = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      for (const patientId of Array.from(selectedPatientIds)) {
        const patient = patients.find(p => p.id === patientId);
        if (!patient) continue;

        const tasks = patient.tasks || [];
        const todayTasks = tasks.filter((t: any) => !t.completed); // No date filtering - tasks don't have date field

        for (const task of todayTasks) {
          await apiClient.updateTask(String(patientId), String(task.id), { completed: true });
        }
      }

      toast({ title: `✅ Marked all tasks done for ${selectedPatientIds.size} patient(s)` });
      clearSelection();
      refetch();
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to mark tasks done' });
    }
  };

  const batchDischarge = async () => {
    if (!confirm(`Discharge ${selectedPatientIds.size} patient(s)?`)) return;

    try {
      for (const patientId of Array.from(selectedPatientIds)) {
        await apiClient.deletePatient(String(patientId));
      }

      toast({ title: `✅ Discharged ${selectedPatientIds.size} patient(s)` });
      clearSelection();
      refetch();
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to discharge patients' });
    }
  };

  const batchChangeType = async (newType: 'Medical' | 'MRI' | 'Surgery') => {
    try {
      for (const patientId of Array.from(selectedPatientIds)) {
        await apiClient.updatePatient(String(patientId), { type: newType });

        // Auto-create MRI tasks if changing to MRI
        if (newType === 'MRI') {
          const patient = patients.find(p => p.id === patientId);
          const today = new Date().toISOString().split('T')[0];
          const existingTasks = patient?.tasks || [];
          const mriTasks = ['MRI Anesthesia Sheet', 'Blood Work', 'Chest X-rays', 'MRI Meds Sheet'];

          for (const taskName of mriTasks) {
            const hasTask = existingTasks.some((t: any) =>
              (t.title || t.name) === taskName // No date check - tasks don't have date field
            );

            if (!hasTask) {
              await apiClient.createTask(String(patientId), {
                name: taskName,
                completed: false,
                date: today,
              });
            }
          }
        }
      }

      toast({ title: `✅ Changed ${selectedPatientIds.size} patient(s) to ${newType}` });
      clearSelection();
      refetch();
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to change patient type' });
    }
  };

  const batchChangeStatus = async (newStatus: 'New' | 'Hospitalized' | 'Discharging') => {
    try {
      for (const patientId of Array.from(selectedPatientIds)) {
        await handleStatusChange(patientId, newStatus);
      }

      toast({ title: `✅ Changed ${selectedPatientIds.size} patient(s) to ${newStatus}` });
      clearSelection();
      refetch();
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to change patient status' });
    }
  };

  const batchAddTask = async (taskName: string) => {
    if (!taskName.trim()) return;

    try {
      const today = new Date().toISOString().split('T')[0];

      for (const patientId of Array.from(selectedPatientIds)) {
        await apiClient.createTask(String(patientId), {
          title: taskName,
          completed: false,
          date: today,
        });
      }

      toast({ title: `✅ Added "${taskName}" to ${selectedPatientIds.size} patient(s)` });
      clearSelection();
      refetch();
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to add task' });
    }
  };

  const handleToggleGeneralTask = async (taskId: string, currentStatus: boolean) => {
    // Optimistic update: update local state immediately to prevent reordering
    const newStatus = !currentStatus;
    setGeneralTasks(prev => prev.map(t =>
      t.id === taskId ? { ...t, completed: newStatus } : t
    ));

    try {
      await apiClient.updateGeneralTask(String(taskId), { completed: newStatus });
      // Success - no refetch needed, local state is already updated
    } catch (error) {
      // Rollback optimistic update on error
      setGeneralTasks(prev => prev.map(t =>
        t.id === taskId ? { ...t, completed: currentStatus } : t
      ));
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to update task' });
    }
  };

  const handleDeleteGeneralTask = async (taskId: string) => {
    try {
      await apiClient.deleteGeneralTask(String(taskId));
      toast({ title: '🗑️ General task deleted' });
      refetchGeneralTasks();
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to delete task' });
    }
  };

  const handleDeleteAllTasks = async () => {
    try {
      const response = await fetch('/api/admin/clear-all-tasks', { method: 'POST' });
      const result = await response.json();
      if (result.success) {
        toast({ title: '🗑️ All tasks cleared', description: `Deleted ${result.deleted} tasks` });
        // Refresh both patient tasks and general tasks
        refetch();
        refetchGeneralTasks();
      } else {
        toast({ variant: 'destructive', title: 'Error', description: result.error || 'Failed to clear tasks' });
      }
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to clear tasks' });
    }
  };

  const handleAddPatientTaskFromOverview = async () => {
    if (!newPatientTaskName.trim() || !selectedPatientForTask) return;

    try {
      await apiClient.createTask(String(selectedPatientForTask), {
        title: newPatientTaskName,
        completed: false,
        dueDate: new Date().toISOString().split('T')[0],
      });
      const patient = patients.find(p => p.id === selectedPatientForTask);
      toast({ title: `✅ Added task to ${patient?.demographics?.name || patient?.name || 'patient'}: ${newPatientTaskName}` });
      setNewPatientTaskName('');
      setSelectedPatientForTask(null);
      setShowAddPatientTaskFromOverview(false);
      refetch();
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to add patient task' });
    }
  };

  const handleQuickAddTaskFromOverview = async () => {
    if (!quickTaskInput.trim()) return;

    try {
      if (quickTaskPatient) {
        // Add to specific patient
        await apiClient.createTask(String(quickTaskPatient), {
          title: quickTaskInput,
          completed: false,
          dueDate: new Date().toISOString().split('T')[0],
        });
        const patient = patients.find(p => p.id === quickTaskPatient);
        toast({ title: `✅ Added task to ${patient?.demographics?.name || patient?.name || 'patient'}: ${quickTaskInput}` });
        refetch();
      } else {
        // Add as general task
        await apiClient.createGeneralTask({
          name: quickTaskInput,
          completed: false,
          date: new Date().toISOString().split('T')[0],
        });
        toast({ title: `✅ Added general task: ${quickTaskInput}` });
        refetchGeneralTasks();
      }
      setQuickTaskInput('');
      setQuickTaskPatient(null);
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to add task' });
    }
  };

  const handleSmartPaste = async (field: 'bloodwork' | 'radiology' | 'medications') => {
    try {
      const text = await navigator.clipboard.readText();
      const patient = patients.find(p => p.id === roundingSheetPatient);
      const species = patient?.demographics?.species || 'canine';

      if (field === 'bloodwork') {
        toast({ title: '🤖 Analyzing bloodwork...', description: 'Extracting abnormals' });
        const abnormals = await analyzeBloodwork(text, species);
        setRoundingFormData({
          ...roundingFormData,
          diagnosticFindings: roundingFormData.diagnosticFindings
            ? `${roundingFormData.diagnosticFindings}\n${abnormals}`
            : abnormals
        });
        toast({ title: '✅ Bloodwork analyzed!' });
      } else if (field === 'radiology') {
        toast({ title: '🤖 Analyzing imaging...', description: 'Summarizing findings' });
        const summary = await analyzeRadiology(text);
        setRoundingFormData({
          ...roundingFormData,
          diagnosticFindings: roundingFormData.diagnosticFindings
            ? `${roundingFormData.diagnosticFindings}\n${summary}`
            : summary
        });
        toast({ title: '✅ Imaging analyzed!' });
      } else if (field === 'medications') {
        toast({ title: '🤖 Formatting meds...', description: 'Cleaning list' });
        const formatted = await parseMedications(text);
        setRoundingFormData({
          ...roundingFormData,
          therapeutics: formatted
        });
        toast({ title: '✅ Medications formatted!' });
      }
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to parse data' });
    }
  };

  const handleMagicPaste = async () => {
    try {
      const text = await navigator.clipboard.readText();

      toast({ title: '✨ Magic parsing...', description: 'Claude AI is extracting all fields including sticker data' });

      // Use AI-powered parser for better accuracy
      const response = await fetch('/api/parse-ezyvet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });

      if (!response.ok) {
        throw new Error('Failed to parse EzyVet data');
      }

      const result = await response.json();
      const parsed = result.data;

      // Update rounding form data
      setRoundingFormData({
        ...roundingFormData,
        signalment: parsed.demographics?.age && parsed.demographics?.sex ?
          `${parsed.demographics.age} ${parsed.demographics.sex} ${parsed.demographics.species} ${parsed.demographics.breed} ${parsed.demographics.weight}`.trim() :
          roundingFormData.signalment,
        problems: parsed.consultations?.[0]?.chiefComplaint || roundingFormData.problems,
        diagnosticFindings: parsed.diagnosticFindings || roundingFormData.diagnosticFindings,
        therapeutics: parsed.medications?.map((med: any) =>
          `${med.name} ${med.dose} ${med.route} ${med.frequency}`.trim()
        ).join('\n') || roundingFormData.therapeutics,
        concerns: roundingFormData.concerns,
        comments: roundingFormData.comments,
      });

      // Update patient demographics for stickers
      if (roundingSheetPatient) {
        const patient = patients.find(p => p.id === roundingSheetPatient);
        if (patient && parsed.demographics) {
          const updatedPatient = {
            ...patient,
            demographics: {
              ...patient.demographics,
              name: parsed.demographics.name || patient.demographics.name,
              ownerName: parsed.demographics.ownerName || patient.demographics.ownerName,
              ownerPhone: parsed.demographics.ownerPhone || patient.demographics.ownerPhone,
              patientId: parsed.demographics.patientId || patient.demographics.patientId,
              clientId: parsed.demographics.clientId || patient.demographics.clientId,
              dateOfBirth: parsed.demographics.dateOfBirth || patient.demographics.dateOfBirth,
              colorMarkings: parsed.demographics.color || patient.demographics.colorMarkings,
              species: parsed.demographics.species || patient.demographics.species,
              breed: parsed.demographics.breed || patient.demographics.breed,
              age: parsed.demographics.age || patient.demographics.age,
              sex: parsed.demographics.sex || patient.demographics.sex,
              weight: parsed.demographics.weight || patient.demographics.weight,
            },
          };

          // Save to database
          await apiClient.updatePatient(patient.id, updatedPatient);
          await refetch();
        }
      }

      toast({ title: '✅ All fields filled!', description: 'Rounding data + sticker demographics saved' });
    } catch (error) {
      console.error('Magic paste error:', error);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to parse data. Try using the individual icons.' });
    }
  };

  const handleExportMRISchedule = () => {
    try {
      // Debug: Log all patients
      console.log('[MRI Export] All patients:', patients.map(p => ({ name: p.demographics?.name || p.name, type: p.type, status: p.status })));

      // Filter MRI patients (exclude discharged)
      const allMRIPatients = patients.filter(p => p.type === 'MRI' && p.status !== 'Discharging');

      // ✅ Use selected patients if any are selected, otherwise use all MRI patients
      const mriPatients = selectedPatientIds.size > 0
        ? allMRIPatients.filter(p => selectedPatientIds.has(p.id))
        : allMRIPatients;

      console.log('[MRI Export] Filtered MRI patients:', mriPatients.map(p => ({ name: p.demographics?.name || p.name, type: p.type, status: p.status })));

      if (mriPatients.length === 0) {
        toast({ variant: 'destructive', title: 'No MRI patients', description: selectedPatientIds.size > 0 ? 'No selected MRI patients found' : 'No active MRI patients found. Check that patient type is set to "MRI"' });
        return;
      }

      // Build TSV data WITHOUT header (user doesn't want title row)
      const rows = mriPatients.map((patient) => {
        const name = patient.demographics?.name || patient.name || '';
        // Use local input values first (current edits), fall back to saved data
        const patientIdKey = `${patient.id}-patientId`;
        const weightKey = `${patient.id}-weight`;
        const scanTypeKey = `${patient.id}-scanType`;

        const patientId = mriInputValues[patientIdKey] ?? (patient.demographics?.patientId || '');
        const weight = (mriInputValues[weightKey] ?? (patient.demographics?.weight || '')).toString().replace(/[^\d.]/g, '');
        const scanType = mriInputValues[scanTypeKey] ?? (patient.mriData?.scanType || '');

        return `${name}\t${patientId}\t${weight}\t${scanType}`;
      });

      const tsvContent = rows.join('\n');

      // Copy to clipboard
      navigator.clipboard.writeText(tsvContent);

      toast({
        title: '✅ MRI Schedule Copied!',
        description: `${mriPatients.length} patients ready to paste into spreadsheet`
      });
    } catch (error) {
      console.error('MRI export error:', error);
      toast({ variant: 'destructive', title: 'Export failed', description: 'Could not generate MRI schedule' });
    }
  };

  const handleCopySingleMRILine = (patientId: number) => {
    try {
      const patient = patients.find(p => p.id === patientId);
      if (!patient) {
        toast({ variant: 'destructive', title: 'Patient not found' });
        return;
      }

      // Build single line TSV (no header)
      // Use local input values first (current edits), fall back to saved data
      const name = patient.demographics?.name || patient.name || '';
      const patientIdKey = `${patientId}-patientId`;
      const weightKey = `${patientId}-weight`;
      const scanTypeKey = `${patientId}-scanType`;

      const patientIdStr = mriInputValues[patientIdKey] ?? (patient.demographics?.patientId || '');
      const weight = (mriInputValues[weightKey] ?? (patient.demographics?.weight || '')).toString().replace(/[^\d.]/g, '');
      const scanType = mriInputValues[scanTypeKey] ?? (patient.mriData?.scanType || '');

      const tsvLine = `${name}\t${patientIdStr}\t${weight}\t${scanType}`;

      // Copy to clipboard
      navigator.clipboard.writeText(tsvLine);

      toast({
        title: '✅ MRI Line Copied!',
        description: `${name}'s data ready to paste`
      });
    } catch (error) {
      console.error('MRI line copy error:', error);
      toast({ variant: 'destructive', title: 'Copy failed', description: 'Could not copy MRI line' });
    }
  };

  // Handle paste for MRI schedule row - fills patientId, weight, scanType from TSV
  const handleMRIPaste = (e: React.ClipboardEvent, patientId: number) => {
    const pasteData = e.clipboardData.getData('text');
    if (!pasteData.trim()) return;

    // Check if it contains tabs (TSV format)
    if (!pasteData.includes('\t')) return; // Let normal paste happen for single values

    e.preventDefault();
    e.stopPropagation();

    // Parse TSV - expected format: Name\tPatientID\tWeight\tScanType
    // Or just: PatientID\tWeight\tScanType (if pasting without name)
    const values = pasteData.split('\t').map(v => v.trim());

    let patientIdVal = '';
    let weightVal = '';
    let scanTypeVal = '';

    if (values.length >= 4) {
      // Full row with name: Name\tPatientID\tWeight\tScanType
      patientIdVal = values[1];
      weightVal = values[2].replace(/[^\d.]/g, '');
      scanTypeVal = values[3];
    } else if (values.length === 3) {
      // Without name: PatientID\tWeight\tScanType
      patientIdVal = values[0];
      weightVal = values[1].replace(/[^\d.]/g, '');
      scanTypeVal = values[2];
    } else if (values.length === 2) {
      // Just Weight\tScanType
      weightVal = values[0].replace(/[^\d.]/g, '');
      scanTypeVal = values[1];
    }

    // Update local input state immediately
    if (patientIdVal) {
      setMriInputValues(prev => ({ ...prev, [`${patientId}-patientId`]: patientIdVal }));
      debouncedMRIUpdate(patientId, 'patientId', patientIdVal, 'demographics');
    }
    if (weightVal) {
      setMriInputValues(prev => ({ ...prev, [`${patientId}-weight`]: weightVal }));
      debouncedMRIUpdate(patientId, 'weight', weightVal, 'demographics');
    }
    if (scanTypeVal) {
      setMriInputValues(prev => ({ ...prev, [`${patientId}-scanType`]: scanTypeVal }));
      debouncedMRIUpdate(patientId, 'scanType', scanTypeVal, 'mriData');
    }

    const fieldsCount = [patientIdVal, weightVal, scanTypeVal].filter(Boolean).length;
    toast({
      title: '✅ Pasted!',
      description: `Filled ${fieldsCount} field${fieldsCount > 1 ? 's' : ''}`
    });
  };

  const handleCopySingleRoundingLine = (patientId: number) => {
    try {
      const patient = patients.find(p => p.id === patientId);
      if (!patient) return;

      const rounding = patient.roundingData || {};

      const line = [
        patient.demographics?.name || patient.name || '',
        rounding.signalment || '',
        rounding.location || '',
        rounding.icuCriteria || '',
        rounding.code || '',
        rounding.problems || '',
        rounding.diagnosticFindings || '',
        rounding.therapeutics || '',
        rounding.ivc || '',
        rounding.fluids || '',
        rounding.cri || '',
        rounding.overnightDx || '',
        rounding.concerns || '',
        rounding.comments || ''
      ].join('\t');

      navigator.clipboard.writeText(line);

      toast({
        title: '✅ Line Copied!',
        description: `${patient.demographics?.name || patient.name || 'Unnamed'}'s rounding sheet line copied to clipboard`
      });
    } catch (error) {
      console.error('Copy line error:', error);
      toast({ variant: 'destructive', title: 'Copy failed', description: 'Could not copy line' });
    }
  };

  const handleExportRoundingSheets = (format: 'tsv' | 'csv' | 'tsv-no-header' | 'csv-no-header' = 'tsv') => {
    try {
      // Filter active patients (exclude Discharged)
      const activePatients = patients.filter(p => p.status !== 'Discharging');

      if (activePatients.length === 0) {
        toast({ variant: 'destructive', title: 'No active patients', description: 'No patients to export' });
        return;
      }

      const delimiter = format.includes('csv') ? ',' : '\t';
      const includeHeader = !format.includes('no-header');
      const formatName = format.includes('csv') ? 'CSV' : 'TSV';

      // Build export with hospital format
      const header = ['Name', 'Signalment', 'Location', 'ICU Criteria', 'Code', 'Problems', 'Diagnostics', 'Therapeutics', 'IVC', 'Fluids', 'CRI', 'Overnight Dx', 'Concerns', 'Comments'].join(delimiter);

      const rows = activePatients.map(patient => {
        const rounding = patient.roundingData || {};

        const fields = [
          patient.demographics?.name || patient.name || '',
          rounding.signalment || '',
          rounding.location || '',
          rounding.icuCriteria || '',
          rounding.code || '',
          rounding.problems || '',
          rounding.diagnosticFindings || '',
          rounding.therapeutics || '',
          rounding.ivc || '',
          rounding.fluids || '',
          rounding.cri || '',
          rounding.overnightDx || '',
          rounding.concerns || '',
          rounding.comments || ''
        ];

        // Escape fields with commas or quotes for CSV
        if (format.includes('csv')) {
          return fields.map(field => {
            const needsQuotes = field.includes(',') || field.includes('"') || field.includes('\n');
            return needsQuotes ? `"${field.replace(/"/g, '""')}"` : field;
          }).join(delimiter);
        }

        return fields.join(delimiter);
      });

      const content = includeHeader ? [header, ...rows].join('\n') : rows.join('\n');

      // Copy to clipboard
      navigator.clipboard.writeText(content);

      toast({
        title: `✅ Rounding Sheets Copied (${formatName})!`,
        description: `${activePatients.length} patients ready to paste into ${format.includes('csv') ? 'Google Sheets or Excel' : 'hospital spreadsheet'}`
      });

      setShowExportMenu(false);
    } catch (error) {
      console.error('Rounding sheet export error:', error);
      toast({ variant: 'destructive', title: 'Export failed', description: 'Could not generate rounding sheets' });
    }
  };

  // Sticker Print Handlers
  const handlePrintBigLabels = async () => {
    try {
      const activePatients = patients.filter(p => p.status !== 'Discharging');

      if (activePatients.length === 0) {
        toast({ title: 'No active patients', description: 'Add patients to print big labels' });
        return;
      }

      // ✅ Use selected patients if any are selected, otherwise use all active patients
      const patientsToProcess = selectedPatientIds.size > 0
        ? activePatients.filter(p => selectedPatientIds.has(p.id))
        : activePatients;

      if (patientsToProcess.length === 0) {
        toast({ title: 'No patients selected', description: 'Select patients or clear selection to print all' });
        return;
      }

      // Check which patients have big label sticker data
      const patientsWithBigLabels = patientsToProcess.filter(p => (p.stickerData?.bigLabelCount ?? 0) > 0);

      if (patientsWithBigLabels.length === 0) {
        toast({
          title: 'No big label data',
          description: 'Configure big label counts in patient settings first'
        });
        return;
      }

      toast({
        title: 'Generating big labels...',
        description: `Creating labels for ${patientsWithBigLabels.length} patients`
      });

      await printConsolidatedBigLabels(patientsWithBigLabels as any);

      toast({
        title: '🏷️ Big Labels Ready',
        description: `Print dialog opened for ${patientsWithBigLabels.length} patients`
      });
    } catch (error) {
      console.error('Big label generation error:', error);
      toast({ variant: 'destructive', title: 'Failed to generate big labels', description: String(error) });
    }
  };

  const handlePrintTinyLabels = async () => {
    try {
      const activePatients = patients.filter(p => p.status !== 'Discharging');

      if (activePatients.length === 0) {
        toast({ title: 'No active patients', description: 'Add patients to print tiny labels' });
        return;
      }

      // ✅ Use selected patients if any are selected, otherwise use all active patients
      const patientsToProcess = selectedPatientIds.size > 0
        ? activePatients.filter(p => selectedPatientIds.has(p.id))
        : activePatients;

      if (patientsToProcess.length === 0) {
        toast({ title: 'No patients selected', description: 'Select patients or clear selection to print all' });
        return;
      }

      toast({
        title: 'Generating tiny labels...',
        description: `Creating 4 labels per patient for ${patientsToProcess.length} patients`
      });

      await printConsolidatedTinyLabels(patientsToProcess as any);

      toast({
        title: '🏷️ Tiny Labels Ready',
        description: `Print dialog opened for ${patientsToProcess.length} patients (4 labels each)`
      });
    } catch (error) {
      console.error('Tiny label generation error:', error);
      toast({ variant: 'destructive', title: 'Failed to generate tiny labels', description: String(error) });
    }
  };

  const handlePrintPatientStickers = (patientId: number) => {
    // Find patient to initialize count from their stickerData
    const patient = patients.find(p => p.id === patientId);
    const defaultCount = patient?.stickerData?.bigLabelCount ?? 2;
    setStickerPickerCount(defaultCount);
    setStickerPickerPatientId(patientId);
  };

  // Handlers for the sticker picker modal
  const handlePrintBigStickersSingle = async () => {
    if (!stickerPickerPatientId) return;
    const patient = patients.find(p => p.id === stickerPickerPatientId);
    if (!patient) return;

    // Capture count before closing modal
    const countToPrint = stickerPickerCount;
    const currentCount = patient.stickerData?.bigLabelCount ?? 2;

    // If user changed the count, save it with manual override
    if (countToPrint !== currentCount) {
      try {
        await apiClient.updatePatient(String(stickerPickerPatientId), {
          stickerData: {
            ...patient.stickerData,
            bigLabelCount: countToPrint,
            useManualCounts: true,
          }
        });
        refetch(); // Refresh patient data
      } catch (e) {
        console.error('Failed to save label count:', e);
      }
    }

    // Close modal first, then print after a brief delay to let UI update
    setStickerPickerPatientId(null);

    setTimeout(() => {
      try {
        // Pass the user-specified count to the print function
        printSinglePatientBigLabels(patient as any, countToPrint);
        toast({
          title: '🏷️ Big Labels Ready',
          description: `Printing ${countToPrint} labels for ${patient.demographics?.name || patient.name || 'Unnamed'}`
        });
      } catch (error) {
        console.error('Big label generation error:', error);
        toast({ variant: 'destructive', title: 'Failed to generate big labels', description: String(error) });
      }
    }, 100);
  };

  const handlePrintTinyStickersSingle = async () => {
    if (!stickerPickerPatientId) return;
    const patient = patients.find(p => p.id === stickerPickerPatientId);
    if (!patient) return;

    // Capture count before closing modal
    const countToPrint = stickerPickerCount;
    const currentCount = patient.stickerData?.tinySheetCount ?? 1;

    // If user changed the count, save it with manual override
    if (countToPrint !== currentCount) {
      try {
        await apiClient.updatePatient(String(stickerPickerPatientId), {
          stickerData: {
            ...patient.stickerData,
            tinySheetCount: countToPrint,
            useManualCounts: true,
          }
        });
        refetch(); // Refresh patient data
      } catch (e) {
        console.error('Failed to save tiny label count:', e);
      }
    }

    // Close modal first, then print after a brief delay to let UI update
    setStickerPickerPatientId(null);

    setTimeout(() => {
      try {
        // Pass the user-specified count to the print function
        printSinglePatientTinyLabels(patient as any, countToPrint);
        toast({
          title: '🏷️ Tiny Labels Ready',
          description: `Printing ${countToPrint} sheets for ${patient.demographics?.name || patient.name || 'Unnamed'}`
        });
      } catch (error) {
        console.error('Tiny label generation error:', error);
        toast({ variant: 'destructive', title: 'Failed to generate tiny labels', description: String(error) });
      }
    }, 100);
  };

  // Reset sticker count to auto-calculated value
  const handleResetStickerCountToAuto = async () => {
    if (!stickerPickerPatientId) return;
    const patient = patients.find(p => p.id === stickerPickerPatientId);
    if (!patient) return;

    const autoCounts = calculateStickerCounts(
      patient.stickerData?.isNewAdmit ?? false,
      patient.stickerData?.isSurgery ?? false
    );

    try {
      await apiClient.updatePatient(String(stickerPickerPatientId), {
        stickerData: {
          ...patient.stickerData,
          bigLabelCount: autoCounts.bigLabelCount,
          tinySheetCount: autoCounts.tinySheetCount,
          useManualCounts: false, // Clear manual override
        }
      });
      // Update local count state to reflect the auto value
      setStickerPickerCount(autoCounts.bigLabelCount);
      refetch();
      toast({ title: 'Reset to auto', description: `Count reset to ${autoCounts.bigLabelCount} labels` });
    } catch (e) {
      console.error('Failed to reset sticker count:', e);
      toast({ variant: 'destructive', title: 'Failed to reset', description: String(e) });
    }
  };

  // Load rounding data when modal opens
  useEffect(() => {
    if (roundingSheetPatient !== null) {
      const patient = patients.find(p => p.id === roundingSheetPatient);
      if (patient) {
        setRoundingFormData(patient.roundingData || {});
      }
    }
  }, [roundingSheetPatient, patients]);

  // Smart defaults when SOAP Builder opens
  useEffect(() => {
    if (showSOAPBuilder) {
      const savedExams = getSavedExams();
      const mostRecent = Object.entries(savedExams)
        .sort((a: any, b: any) => new Date(b[1].savedAt).getTime() - new Date(a[1].savedAt).getTime())[0];

      if (mostRecent && !soapData.neurolocalization) {
        // Suggest most recently used template (silently, no console output)
        const [neuroLoc] = mostRecent;
      }
    }
  }, [showSOAPBuilder]);

  // Initialize mounted and load hideCompletedTasks from localStorage
  useEffect(() => {
    setMounted(true);

    // Load hideCompletedTasks preference from localStorage (default: true)
    // Migration: If user has old 'false' value, reset to new default of 'true'
    const savedHideCompleted = localStorage.getItem('hideCompletedTasks');
    const migrated = localStorage.getItem('hideCompletedTasks_migrated');

    if (!migrated && savedHideCompleted === 'false') {
      // One-time migration: reset to new default
      setHideCompletedTasks(true);
      localStorage.setItem('hideCompletedTasks', 'true');
      localStorage.setItem('hideCompletedTasks_migrated', 'true');
    } else if (savedHideCompleted !== null) {
      setHideCompletedTasks(savedHideCompleted === 'true');
    } else {
      // No saved preference - use default of true (hide completed)
      setHideCompletedTasks(true);
      localStorage.setItem('hideCompletedTasks', 'true');
    }
  }, []);

  // Persist hideCompletedTasks preference to localStorage
  useEffect(() => {
    if (mounted) {
      localStorage.setItem('hideCompletedTasks', String(hideCompletedTasks));
    }
  }, [hideCompletedTasks, mounted]);

  // One-time task migration to add status fields
  useEffect(() => {
    const runTaskMigration = async () => {
      if (!mounted || !patients || !generalTasks) return;

      // Check if migration has already been run
      const migrationComplete = localStorage.getItem('taskKanbanMigration_v1');
      if (migrationComplete === 'true') return;

      try {
        console.log('Running task migration to add kanban status fields...');
        const result = await migrateAllTasksOnLoad(
          patients,
          generalTasks,
          apiClient.updateTask.bind(apiClient),
          apiClient.updateGeneralTask.bind(apiClient)
        );

        console.log(`Migration complete: ${result.patientTasksMigrated} patient tasks, ${result.generalTasksMigrated} general tasks migrated`);

        // Mark migration as complete
        localStorage.setItem('taskKanbanMigration_v1', 'true');

        // Refetch to get updated data
        if (result.patientTasksMigrated > 0 || result.generalTasksMigrated > 0) {
          refetch();
          refetchGeneralTasks();
          toast({
            title: 'Tasks Updated',
            description: `Migrated ${result.patientTasksMigrated + result.generalTasksMigrated} tasks to kanban board`,
          });
        }
      } catch (error) {
        console.error('Task migration failed:', error);
      }
    };

    runTaskMigration();
  }, [mounted, patients, generalTasks]);

  // Automatic daily reset - runs when app loads on a new day
  // Resets: sticker counts (to 2 big, 0 tiny) + daily tasks (Owner Called, etc.)
  const hasRunDailyReset = useRef(false);

  // Function to trigger daily reset (used by auto-reset and manual button)
  const triggerDailyReset = async (force: boolean = false) => {
    try {
      const response = await fetch('/api/daily-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ force }),
      });

      if (!response.ok) {
        throw new Error('Daily reset failed');
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Daily reset error:', error);
      throw error;
    }
  };

  useEffect(() => {
    const autoResetDaily = async () => {
      if (hasRunDailyReset.current) return; // Prevent duplicate runs in same session

      // Always call the API - it checks the DATABASE for last reset date
      // This ensures consistency across all browsers/devices
      // The API returns { skipped: true } if reset already ran today
      try {
        const result = await triggerDailyReset();
        hasRunDailyReset.current = true;

        // Only show notification and refetch if reset actually ran (not skipped)
        if (!result.skipped) {
          // Refetch to get updated data (both patients and general tasks)
          refetch();
          refetchGeneralTasks();

          // Show notification if anything was updated
          const { stats } = result;
          if (stats.stickersReset > 0 || stats.tasksDeleted > 0 || stats.tasksCreated > 0 || stats.generalTasksCreated > 0) {
            const messages = [];
            if (stats.stickersReset > 0) messages.push(`${stats.stickersReset} stickers reset`);
            if (stats.tasksDeleted > 0) messages.push(`${stats.tasksDeleted} completed tasks cleared`);
            if (stats.tasksCreated > 0) messages.push(`${stats.tasksCreated} patient tasks added`);
            if (stats.generalTasksCreated > 0) messages.push(`${stats.generalTasksCreated} general tasks added`);

            toast({
              title: `🌅 New Day!`,
              description: messages.join(' • '),
            });
          }
        }
      } catch (error) {
        console.error('Auto daily reset failed:', error);
        // Don't block the app if reset fails - user can manually trigger
        hasRunDailyReset.current = true;
      }
    };

    autoResetDaily();
  }, [mounted]); // Run on mount (general tasks don't need patients)

  // Manual daily reset handler (for Tools menu)
  const handleManualDailyReset = async () => {
    try {
      const result = await triggerDailyReset(true); // force=true
      refetch();
      refetchGeneralTasks();

      const { stats } = result;
      const messages = [];
      if (stats.tasksDeleted > 0) messages.push(`${stats.tasksDeleted} completed cleared`);
      if (stats.stickersReset > 0) messages.push(`${stats.stickersReset} stickers reset`);
      if (stats.tasksCreated > 0) messages.push(`${stats.tasksCreated} patient tasks`);
      if (stats.generalTasksCreated > 0) messages.push(`${stats.generalTasksCreated} general tasks`);

      toast({
        title: '🔄 Daily Reset Complete',
        description: messages.length > 0 ? messages.join(' • ') : 'All up to date',
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Reset Failed',
        description: 'Could not perform daily reset. Check console for details.',
      });
    }
  };

  const filteredPatients = patients
    .filter(p => {
      // Search filter - support both p.name (legacy) and p.demographics.name (UnifiedPatient)
      const patientName = p.demographics?.name || p.name || '';
      if (!patientName.toLowerCase().includes(searchQuery.toLowerCase())) return false;

      // Status filter
      if (activeFilters.status && p.status !== activeFilters.status) return false;

      // Type filter
      if (activeFilters.type && p.type !== activeFilters.type) return false;

      // Priority filter (needs attention = <50% completion)
      if (activeFilters.priority === 'needs-attention') {
        const today = new Date().toISOString().split('T')[0];
        const tasks = (p.tasks || []); // No date filtering - tasks don't have date field
        const completed = tasks.filter((t: any) => t.completed).length;
        const completionRate = tasks.length > 0 ? (completed / tasks.length) * 100 : 100;
        if (completionRate >= 50) return false;
      }

      return true;
    })
    .sort((a, b) => {
      if (patientSortBy === 'name') {
        const aName = a.demographics?.name || a.name || '';
        const bName = b.demographics?.name || b.name || '';
        return aName.localeCompare(bName);
      } else if (patientSortBy === 'status') {
        return (a.status || '').localeCompare(b.status || '');
      } else if (patientSortBy === 'type') {
        return (a.type || '').localeCompare(b.type || '');
      }
      return 0;
    });

  const getSpeciesEmoji = (species?: string) => {
    if (!species) return '🐾';
    const lower = species.toLowerCase();
    if (lower.includes('dog') || lower.includes('canine')) return '🐕';
    if (lower.includes('cat') || lower.includes('feline')) return '🐈';
    return '🐾';
  };

  const getTypeColor = (type: string) => {
    if (type === 'MRI') return 'from-cyan-500 to-emerald-600';
    if (type === 'Surgery') return 'from-orange-500 to-red-600';
    return 'from-emerald-500 to-pink-600';
  };

  // Note: getTaskTimeOfDay, getTaskIcon, and getTimeColors are imported from @/lib/task-definitions

  // Color palette for patient task cards
  const patientColorPalette = [
    { bg: 'bg-blue-900/40', border: 'border-blue-600/50', accent: 'bg-blue-600' },
    { bg: 'bg-purple-900/40', border: 'border-purple-600/50', accent: 'bg-purple-600' },
    { bg: 'bg-pink-900/40', border: 'border-pink-600/50', accent: 'bg-pink-600' },
    { bg: 'bg-cyan-900/40', border: 'border-cyan-600/50', accent: 'bg-cyan-600' },
    { bg: 'bg-indigo-900/40', border: 'border-indigo-600/50', accent: 'bg-indigo-600' },
    { bg: 'bg-violet-900/40', border: 'border-violet-600/50', accent: 'bg-violet-600' },
    { bg: 'bg-fuchsia-900/40', border: 'border-fuchsia-600/50', accent: 'bg-fuchsia-600' },
    { bg: 'bg-rose-900/40', border: 'border-rose-600/50', accent: 'bg-rose-600' },
    { bg: 'bg-teal-900/40', border: 'border-teal-600/50', accent: 'bg-teal-600' },
    { bg: 'bg-sky-900/40', border: 'border-sky-600/50', accent: 'bg-sky-600' },
  ];

  const getPatientColor = (patientId: string) => {
    // Get patient index to assign consistent colors
    const index = patients.findIndex(p => p.id === patientId);
    return patientColorPalette[index % patientColorPalette.length];
  };

  const filterTasksByTime = (tasks: any[]) => {
    if (taskTimeFilter === 'all') return tasks;
    if (taskTimeFilter === 'day') {
      return tasks.filter(t => {
        const timeOfDay = getTaskTimeOfDay(t.title || t.name);
        return timeOfDay === 'morning' || timeOfDay === 'anytime';
      });
    }
    if (taskTimeFilter === 'night') {
      return tasks.filter(t => {
        const timeOfDay = getTaskTimeOfDay(t.title || t.name);
        return timeOfDay === 'evening';
      });
    }
    return tasks;
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#FFF8F0' }}>
        <Loader2 className="w-12 h-12 animate-spin text-gray-600" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 relative" style={{ backgroundColor: '#FFF8F0' }}>
        {/* Paper texture background */}
        <div
          className="absolute inset-0 opacity-[0.04] pointer-events-none"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
          }}
        />

        {/* Scattered neuron dots */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none"
          xmlns="http://www.w3.org/2000/svg"
          preserveAspectRatio="xMidYMid slice"
          viewBox="0 0 1440 900"
        >
          <circle cx="95" cy="85" r="6" fill="#9B7FCF" opacity="0.12" />
          <circle cx="340" cy="180" r="4" fill="#6BB89D" opacity="0.08" />
          <circle cx="780" cy="45" r="5" fill="#E89999" opacity="0.1" />
          <circle cx="1120" cy="160" r="7" fill="#9B7FCF" opacity="0.11" />
          <circle cx="1380" cy="90" r="4" fill="#6BB89D" opacity="0.07" />
          <circle cx="55" cy="420" r="5" fill="#E89999" opacity="0.09" />
          <circle cx="420" cy="380" r="6" fill="#9B7FCF" opacity="0.1" />
          <circle cx="980" cy="320" r="4" fill="#6BB89D" opacity="0.08" />
          <circle cx="1300" cy="480" r="5" fill="#E89999" opacity="0.09" />
          <circle cx="180" cy="720" r="7" fill="#9B7FCF" opacity="0.11" />
          <circle cx="620" cy="650" r="4" fill="#6BB89D" opacity="0.08" />
          <circle cx="890" cy="780" r="6" fill="#E89999" opacity="0.1" />
        </svg>

        <div
          className="relative bg-white rounded-3xl p-8 w-full max-w-md"
          style={{ border: '2px solid #000', boxShadow: '8px 8px 0 #000' }}
        >
          <div className="text-center mb-8">
            <div
              className="w-20 h-20 rounded-2xl flex items-center justify-center text-4xl mx-auto mb-4"
              style={{ backgroundColor: '#DCC4F5', border: '2px solid #000' }}
            >
              🧠
            </div>
            <h1 className="text-5xl font-black text-gray-900">
              VetHub
            </h1>
            <p className="text-gray-500 mt-3 text-lg font-medium">AI-Powered Neuro Vet Portal</p>
          </div>

          <form onSubmit={handleAuth} className="space-y-4">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              required
              className="w-full px-4 py-3 rounded-2xl bg-white text-gray-900 placeholder-gray-400 focus:outline-none font-medium"
              style={{ border: '2px solid #000', boxShadow: '4px 4px 0 #000' }}
            />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              required
              minLength={6}
              className="w-full px-4 py-3 rounded-2xl bg-white text-gray-900 placeholder-gray-400 focus:outline-none font-medium"
              style={{ border: '2px solid #000', boxShadow: '4px 4px 0 #000' }}
            />

            {authError && (
              <p
                className="text-sm font-bold px-3 py-2 rounded-xl"
                style={{ backgroundColor: '#FFBDBD', border: '1.5px solid #000' }}
              >
                {authError}
              </p>
            )}

            <button
              type="submit"
              className="w-full py-3 rounded-2xl font-black hover:-translate-y-1 transition-transform text-gray-900"
              style={{ backgroundColor: '#B8E6D4', border: '2px solid #000', boxShadow: '4px 4px 0 #000' }}
            >
              {isSignUp ? 'Create Account' : 'Sign In'}
            </button>

            <button
              type="button"
              onClick={() => setIsSignUp(!isSignUp)}
              className="w-full text-sm text-gray-500 hover:text-gray-900 transition font-medium"
            >
              {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Neo-pop styling constants
  const NEO_SHADOW = '6px 6px 0 #000';
  const NEO_SHADOW_SM = '4px 4px 0 #000';
  const NEO_BORDER = '2px solid #000';
  const NEO_COLORS = {
    lavender: '#DCC4F5',
    mint: '#B8E6D4',
    pink: '#FFBDBD',
    cream: '#FFF8F0',
    teal: '#6BB89D', // Used for focus rings and accents
  };

  return (
    <div className="min-h-screen relative" style={{ backgroundColor: NEO_COLORS.cream }}>
      {/* Paper texture background */}
      <div
        className="fixed inset-0 opacity-[0.04] pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* Scattered neuron dots */}
      <svg
        className="fixed inset-0 w-full h-full pointer-events-none"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="xMidYMid slice"
        viewBox="0 0 1440 900"
      >
        <circle cx="95" cy="85" r="6" fill="#9B7FCF" opacity="0.12" />
        <circle cx="340" cy="180" r="4" fill="#6BB89D" opacity="0.08" />
        <circle cx="780" cy="45" r="5" fill="#E89999" opacity="0.1" />
        <circle cx="1120" cy="160" r="7" fill="#9B7FCF" opacity="0.11" />
        <circle cx="1380" cy="90" r="4" fill="#6BB89D" opacity="0.07" />
        <circle cx="55" cy="420" r="5" fill="#E89999" opacity="0.09" />
        <circle cx="420" cy="380" r="6" fill="#9B7FCF" opacity="0.1" />
        <circle cx="980" cy="320" r="4" fill="#6BB89D" opacity="0.08" />
        <circle cx="1300" cy="480" r="5" fill="#E89999" opacity="0.09" />
        <circle cx="180" cy="720" r="7" fill="#9B7FCF" opacity="0.11" />
        <circle cx="620" cy="650" r="4" fill="#6BB89D" opacity="0.08" />
        <circle cx="890" cy="780" r="6" fill="#E89999" opacity="0.1" />
      </svg>

      <header
        className="relative sticky top-0 z-40 bg-white"
        style={{ borderBottom: NEO_BORDER }}
      >
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl"
              style={{ backgroundColor: NEO_COLORS.lavender, border: NEO_BORDER }}
            >
              🧠
            </div>
            <h1 className="text-2xl font-black text-gray-900">
              VetHub
            </h1>
          </div>

          <div className="flex items-center gap-3">
            {/* Primary Actions */}
            <Link
              href="/rounding"
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-gray-900 hover:-translate-y-1 transition-transform"
              style={{ backgroundColor: NEO_COLORS.mint, border: NEO_BORDER, boxShadow: NEO_SHADOW_SM }}
            >
              <FileSpreadsheet size={18} />
              Rounds
            </Link>
            <Link
              href="/appointments"
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-gray-900 hover:-translate-y-1 transition-transform"
              style={{ backgroundColor: NEO_COLORS.lavender, border: NEO_BORDER, boxShadow: NEO_SHADOW_SM }}
            >
              <TableProperties size={18} />
              Schedule
            </Link>
            {/* Print Menu */}
            <div className="relative">
              <button
                onClick={() => setShowPrintMenu(!showPrintMenu)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-gray-900 hover:-translate-y-1 transition-transform bg-white"
                style={{ border: NEO_BORDER, boxShadow: NEO_SHADOW_SM }}
              >
                <Tag size={18} />
                Print
                <ChevronDown size={16} />
              </button>
              {showPrintMenu && (
                <div
                  className="absolute right-0 mt-2 w-48 bg-white rounded-2xl overflow-hidden z-[100]"
                  style={{ border: NEO_BORDER, boxShadow: NEO_SHADOW }}
                >
                  <button
                    onClick={() => { handlePrintBigLabels(); setShowPrintMenu(false); }}
                    className="w-full text-left px-4 py-3 hover:bg-gray-50 text-gray-900 font-medium flex items-center gap-2 transition"
                  >
                    <Tag size={16} />
                    Big Labels
                  </button>
                  <button
                    onClick={() => { handlePrintTinyLabels(); setShowPrintMenu(false); }}
                    className="w-full text-left px-4 py-3 hover:bg-gray-50 text-gray-900 font-medium flex items-center gap-2 transition"
                    style={{ borderTop: '1px solid #e5e7eb' }}
                  >
                    <Tag size={14} />
                    Tiny Labels
                  </button>
                </div>
              )}
            </div>

            {/* Tools Menu */}
            <div className="relative">
              <button
                onClick={() => setShowToolsMenu(!showToolsMenu)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-gray-900 hover:-translate-y-1 transition-transform bg-white"
                style={{ border: NEO_BORDER, boxShadow: NEO_SHADOW_SM }}
              >
                <MoreHorizontal size={18} />
                Tools
              </button>
              {showToolsMenu && (
                <div
                  className="absolute right-0 mt-2 w-56 bg-white rounded-2xl overflow-hidden z-[100]"
                  style={{ border: NEO_BORDER, boxShadow: NEO_SHADOW }}
                >
                  <button
                    onClick={() => { handleManualDailyReset(); setShowToolsMenu(false); }}
                    className="w-full text-left px-4 py-3 hover:bg-gray-50 text-gray-900 font-medium flex items-center gap-2 transition"
                    style={{ borderLeft: `4px solid ${NEO_COLORS.mint}` }}
                  >
                    <Sunrise size={16} style={{ color: '#6BB89D' }} />
                    New Day Reset
                  </button>
                  <button
                    onClick={() => { handleResetAllTasks(); setShowToolsMenu(false); }}
                    className="w-full text-left px-4 py-3 hover:bg-gray-50 text-gray-900 font-medium flex items-center gap-2 transition"
                    style={{ borderTop: '1px solid #e5e7eb', borderLeft: `4px solid ${NEO_COLORS.pink}` }}
                  >
                    <RotateCcw size={16} style={{ color: '#E89999' }} />
                    Reset All Tasks
                  </button>
                  <button
                    onClick={() => { setShowMRISchedule(!showMRISchedule); setShowToolsMenu(false); }}
                    className="w-full text-left px-4 py-3 hover:bg-gray-50 text-gray-900 font-medium flex items-center gap-2 transition"
                    style={{ borderTop: '1px solid #e5e7eb' }}
                  >
                    <Brain size={16} />
                    MRI Schedule
                  </button>
                  <Link
                    href="/soap"
                    className="w-full text-left px-4 py-3 hover:bg-gray-50 text-gray-900 font-medium flex items-center gap-2 transition block"
                    style={{ borderTop: '1px solid #e5e7eb' }}
                  >
                    <FileText size={16} />
                    SOAP Builder
                  </Link>
                  <Link
                    href="/mri-builder"
                    className="w-full text-left px-4 py-3 hover:bg-gray-50 text-gray-900 font-medium flex items-center gap-2 transition block"
                    style={{ borderTop: '1px solid #e5e7eb' }}
                  >
                    <Brain size={16} />
                    MRI Builder
                  </Link>
                  <Link
                    href="/neuro-exam"
                    className="w-full text-left px-4 py-3 hover:bg-gray-50 text-gray-900 font-medium flex items-center gap-2 transition block"
                    style={{ borderTop: '1px solid #e5e7eb', borderLeft: `4px solid ${NEO_COLORS.lavender}` }}
                  >
                    <Zap size={16} style={{ color: '#9B7FCF' }} />
                    Neuro Exam
                  </Link>
                  <button
                    onClick={() => { setShowQuickReference(!showQuickReference); setShowToolsMenu(false); }}
                    className="w-full text-left px-4 py-3 hover:bg-gray-50 text-gray-900 font-medium flex items-center gap-2 transition"
                    style={{ borderTop: '1px solid #e5e7eb' }}
                  >
                    <BookOpen size={16} />
                    Quick Reference
                  </button>
                  <Link
                    href="/residency"
                    className="w-full text-left px-4 py-3 hover:bg-gray-50 text-gray-900 font-medium flex items-center gap-2 transition block"
                    style={{ borderTop: '1px solid #e5e7eb' }}
                  >
                    <Award size={16} />
                    Residency Tracker
                  </Link>
                </div>
              )}
            </div>

            <button
              onClick={logout}
              className="w-10 h-10 rounded-xl flex items-center justify-center text-gray-600 hover:text-red-500 hover:-translate-y-1 transition-all bg-white"
              style={{ border: NEO_BORDER }}
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </header>

      <main className="relative max-w-7xl mx-auto px-4 py-8 space-y-6 scroll-mt-20">
        {/* Task Header with Refresh */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-black text-gray-900">Today's Tasks</h2>
            <span className="text-sm text-gray-500">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
            </span>
          </div>
          <button
            onClick={handleRefreshTasks}
            disabled={isRefreshingTasks}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition hover:-translate-y-0.5 disabled:opacity-50"
            style={{
              backgroundColor: '#DCC4F5',
              border: '2px solid #000',
              boxShadow: '4px 4px 0 #000',
            }}
          >
            <RotateCcw size={16} className={isRefreshingTasks ? 'animate-spin' : ''} />
            {isRefreshingTasks ? 'Refreshing...' : 'Refresh Tasks'}
          </button>
        </div>

        {/* Task Checklist - Always Visible */}
        <TaskChecklist
          patients={filteredPatients}
          generalTasks={generalTasks}
          onToggleTask={handleToggleTask}
          onToggleGeneralTask={handleToggleGeneralTask}
          onAddTask={handleAddTaskFromChecklist}
          onDeleteTask={handleDeleteTask}
          onDeleteGeneralTask={handleDeleteGeneralTask}
          onDeleteAllTasks={handleDeleteAllTasks}
        />

        {/* OLD Task Overview - DISABLED */}
        {false && showTaskOverview && (
          <div className="bg-slate-800/40 backdrop-blur-xl rounded-3xl shadow-2xl border border-slate-700/50 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                <ListTodo className="text-cyan-400" />
                Today's Tasks
              </h2>
              <div className="flex gap-2">
                <button
                  onClick={() => setTaskViewMode('by-patient')}
                  className={`px-3 py-1.5 rounded-lg font-bold text-sm transition ${
                    taskViewMode === 'by-patient'
                      ? 'bg-cyan-500 text-white'
                      : 'bg-slate-700/50 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  By Patient
                </button>
                <button
                  onClick={() => setTaskViewMode('by-task')}
                  className={`px-3 py-1.5 rounded-lg font-bold text-sm transition ${
                    taskViewMode === 'by-task'
                      ? 'bg-cyan-500 text-white'
                      : 'bg-slate-700/50 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  By Task
                </button>
              </div>
            </div>

            {/* Quick Add Task Input */}
            <div className="mb-4 bg-slate-900/50 rounded-xl p-4 border border-slate-700">
              <div className="flex gap-2">
                <select
                  value={quickTaskPatient || ''}
                  onChange={(e) => setQuickTaskPatient(e.target.value ? Number(e.target.value) : null)}
                  className="px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white text-sm focus:ring-2 focus:ring-cyan-500"
                >
                  <option value="">General/Hospital-Wide</option>
                  {filteredPatients.map(patient => (
                    <option key={patient.id} value={patient.id}>{patient.demographics?.name || patient.name || 'Unnamed'}</option>
                  ))}
                </select>
                <input
                  type="text"
                  value={quickTaskInput}
                  onChange={(e) => setQuickTaskInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && quickTaskInput.trim()) {
                      handleQuickAddTaskFromOverview();
                    }
                  }}
                  placeholder="Type task name and press Enter..."
                  className="flex-1 px-3 py-1 bg-slate-800 border border-slate-600 rounded-lg text-sm text-white placeholder-slate-500 text-sm focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition"
                />
                <button
                  onClick={handleQuickAddTaskFromOverview}
                  disabled={!quickTaskInput.trim()}
                  className="px-4 py-2 bg-gradient-to-r from-cyan-600 to-emerald-600 hover:from-cyan-500 hover:to-emerald-500 text-white rounded-lg font-bold text-sm transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                >
                  <Plus size={16} />
                  Add
                </button>
              </div>
            </div>

            {/* Day/Night Filter Tabs */}
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => setTaskTimeFilter('all')}
                className={`px-4 py-2 rounded-lg font-bold text-sm transition ${
                  taskTimeFilter === 'all'
                    ? 'bg-gradient-to-r from-cyan-500 to-emerald-500 text-white'
                    : 'bg-slate-700/50 text-slate-300 hover:bg-slate-700'
                }`}
              >
                All Tasks
              </button>
              <button
                onClick={() => setTaskTimeFilter('day')}
                className={`px-4 py-2 rounded-lg font-bold text-sm transition ${
                  taskTimeFilter === 'day'
                    ? 'bg-gradient-to-r from-yellow-500 to-orange-500 text-white'
                    : 'bg-slate-700/50 text-slate-300 hover:bg-slate-700'
                }`}
              >
                🌅 Day/Morning
              </button>
              <button
                onClick={() => setTaskTimeFilter('night')}
                className={`px-4 py-2 rounded-lg font-bold text-sm transition ${
                  taskTimeFilter === 'night'
                    ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white'
                    : 'bg-slate-700/50 text-slate-300 hover:bg-slate-700'
                }`}
              >
                🌙 Night/Evening
              </button>
            </div>

            {taskViewMode === 'by-patient' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {/* General/Hospital-wide Tasks */}
                {(() => {
                  const today = new Date().toISOString().split('T')[0];
                  const todayGeneralTasks = generalTasks; // No date filtering - tasks don't have date field
                  const filteredGeneralTasks = filterTasksByTime(todayGeneralTasks);
                  if (filteredGeneralTasks.length > 0) {
                    return (
                      <div className="bg-emerald-900/30 rounded-lg p-2 border border-emerald-700/50">
                        <h3 className="text-emerald-300 font-bold mb-1.5 text-sm">Hospital-Wide / General</h3>
                        <div className="space-y-1">
                          {filteredGeneralTasks.map((task: any) => (
                            <div
                              key={task.id}
                              className="flex items-center gap-1.5 text-xs group"
                            >
                              <button
                                onClick={() => handleToggleGeneralTask(task.id, task.completed)}
                                className="flex-shrink-0"
                              >
                                {task.completed ? (
                                  <CheckCircle2 className="text-green-400" size={14} />
                                ) : (
                                  <Circle className="text-slate-600 group-hover:text-emerald-400" size={14} />
                                )}
                              </button>
                              <span
                                className={`flex-1 cursor-pointer ${task.completed ? 'line-through text-slate-500' : 'text-slate-300'}`}
                                onClick={() => handleToggleGeneralTask(task.id, task.completed)}
                              >
                                {task.title || task.name}
                              </span>
                              <button
                                onClick={() => handleDeleteGeneralTask(task.id)}
                                className="flex-shrink-0 p-0.5 text-slate-600 hover:text-red-400 rounded transition opacity-0 group-hover:opacity-100"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  }
                  return null;
                })()}

                {/* Patient Tasks */}
                {filteredPatients.map(patient => {
                  const today = new Date().toISOString().split('T')[0];
                  const todayTasks = (patient.tasks || []); // No date filtering - tasks don't have date field
                  const tasks = filterTasksByTime(todayTasks);
                  if (tasks.length === 0) return null;
                  const colors = getPatientColor(patient.id);
                  return (
                    <div key={patient.id} className={`${colors.bg} rounded-lg p-2 border ${colors.border}`}>
                      <h3 className="text-white font-bold mb-1.5 text-sm">{patient.demographics?.name || patient.name || 'Unnamed'}</h3>
                      <div className="space-y-1">
                        {tasks.map((task: any) => {
                          const timeOfDay = getTaskTimeOfDay(task.title || task.name);
                          const icon = getTaskIcon(timeOfDay);
                          const timeColors = getTimeColors(timeOfDay);
                          return (
                            <div
                              key={task.id}
                              className={`flex items-center gap-1.5 text-xs group rounded-r px-1 py-0.5 border-l-2 ${timeColors.rowBorder} ${timeColors.rowBg}`}
                            >
                              <button
                                onClick={() => handleToggleTask(patient.id, task.id, task.completed)}
                                className="flex-shrink-0"
                              >
                                {task.completed ? (
                                  <CheckCircle2 className="text-green-400" size={14} />
                                ) : (
                                  <Circle className="text-slate-600 group-hover:text-cyan-400" size={14} />
                                )}
                              </button>
                              <span className="text-sm">{icon}</span>
                              <span
                                className={`flex-1 cursor-pointer ${task.completed ? 'line-through text-slate-500' : 'text-slate-300'}`}
                                onClick={() => handleToggleTask(patient.id, task.id, task.completed)}
                              >
                                {task.title || task.name}
                              </span>
                              <button
                                onClick={() => handleDeleteTask(patient.id, task.id)}
                                className="flex-shrink-0 p-0.5 text-slate-600 hover:text-red-400 rounded transition opacity-0 group-hover:opacity-100"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {(() => {
                  const today = new Date().toISOString().split('T')[0];
                  const taskGroups: { [key: string]: Array<{ patient: any; task: any }> } = {};

                  filteredPatients.forEach(patient => {
                    const todayTasks = (patient.tasks || []); // No date filtering - tasks don't have date field
                    const tasks = filterTasksByTime(todayTasks);
                    tasks.forEach((task: any) => {
                      const taskName = task.title || task.name;
                      if (!taskGroups[taskName]) {
                        taskGroups[taskName] = [];
                      }
                      taskGroups[taskName].push({ patient, task });
                    });
                  });

                  return Object.entries(taskGroups).map(([taskName, items]) => {
                    const timeOfDay = getTaskTimeOfDay(taskName);
                    const icon = getTaskIcon(timeOfDay);
                    const timeColors = getTimeColors(timeOfDay);
                    const allCompleted = items.every(item => item.task.completed);
                    const incompleteCount = items.filter(i => !i.task.completed).length;

                    return (
                      <div key={taskName} className={`${timeColors.cardBg} rounded-lg p-2 border ${timeColors.cardBorder}`}>
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="text-lg">{icon}</span>
                          <h3 className={`font-bold flex-1 text-sm ${timeColors.text}`}>{taskName}</h3>
                          <span className={`text-xs ${allCompleted ? 'text-green-400' : 'text-slate-400'}`}>
                            {items.filter(i => i.task.completed).length}/{items.length}
                          </span>
                          {!allCompleted && (
                            <button
                              onClick={() => handleBulkCompleteTask(taskName, items)}
                              className="px-2 py-0.5 text-xs font-bold rounded bg-green-500/20 text-green-300 hover:bg-green-500/30 border border-green-500/50 transition-colors flex items-center gap-1"
                              title={`Mark "${taskName}" as complete for all ${incompleteCount} patient(s)`}
                            >
                              <CheckCircle2 size={12} />
                              Complete All
                            </button>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {items.map(({ patient, task }) => {
                            const colors = getPatientColor(patient.id);
                            return (
                              <button
                                key={`${patient.id}-${task.id}`}
                                onClick={() => handleToggleTask(patient.id, task.id, task.completed)}
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs ${
                                  task.completed
                                    ? 'bg-green-500/20 text-green-300 line-through'
                                    : `${colors.bg} text-slate-200 hover:opacity-80 border ${colors.border}`
                                }`}
                              >
                                {task.completed ? (
                                  <CheckCircle2 size={12} />
                                ) : (
                                  <Circle size={12} />
                                )}
                                {patient.demographics?.name || patient.name || 'Unnamed'}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            )}
          </div>
        )}

        {/* OLD All Tasks View - DISABLED */}
        {false && showAllTasksView && (
          <div className="bg-gradient-to-br from-cyan-900/40 to-blue-900/40 backdrop-blur-xl rounded-3xl shadow-2xl border border-cyan-700/50 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                <CheckCircle2 className="text-cyan-400" size={28} />
                All Tasks
              </h2>
              <div className="flex gap-2">
                {/* View Toggle */}
                <div className="flex items-center gap-1 bg-slate-800/60 rounded-lg p-1">
                  <button
                    onClick={() => setTaskBoardView('list')}
                    className={`px-3 py-1.5 rounded-md text-sm font-bold transition flex items-center gap-1.5 ${
                      taskBoardView === 'list'
                        ? 'bg-cyan-500 text-white'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <ListIcon size={16} />
                    List
                  </button>
                  <button
                    onClick={() => setTaskBoardView('kanban')}
                    className={`px-3 py-1.5 rounded-md text-sm font-bold transition flex items-center gap-1.5 ${
                      taskBoardView === 'kanban'
                        ? 'bg-violet-500 text-white'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <LayoutGrid size={16} />
                    Kanban
                  </button>
                </div>
                {taskViewMode === 'general' && taskBoardView === 'list' && (
                  <button
                    onClick={() => setShowAddGeneralTask(true)}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-bold transition flex items-center gap-2 shadow-lg"
                  >
                    <Plus size={16} />
                    Add Hospital Task
                  </button>
                )}
              </div>
            </div>

            {/* Kanban Board View - REMOVED */}
            {taskBoardView === 'kanban' ? (
              <div className="text-slate-400 text-center p-8">Kanban removed</div>
            ) : (
              <>
                {/* Tab Navigation */}
                <div className="flex gap-2 mb-6 border-b border-slate-700/50 pb-0">
              <button
                onClick={() => setTaskViewMode('by-patient')}
                className={`px-6 py-3 font-bold text-sm transition-all border-b-2 ${
                  taskViewMode === 'by-patient'
                    ? 'border-cyan-500 text-cyan-400 bg-cyan-500/10'
                    : 'border-transparent text-slate-400 hover:text-slate-300 hover:bg-slate-800/30'
                }`}
              >
                By Patient
              </button>
              <button
                onClick={() => setTaskViewMode('by-task')}
                className={`px-6 py-3 font-bold text-sm transition-all border-b-2 ${
                  taskViewMode === 'by-task'
                    ? 'border-blue-500 text-blue-400 bg-blue-500/10'
                    : 'border-transparent text-slate-400 hover:text-slate-300 hover:bg-slate-800/30'
                }`}
              >
                By Task
              </button>
              <button
                onClick={() => setTaskViewMode('general')}
                className={`px-6 py-3 font-bold text-sm transition-all border-b-2 ${
                  taskViewMode === 'general'
                    ? 'border-emerald-500 text-emerald-400 bg-emerald-500/10'
                    : 'border-transparent text-slate-400 hover:text-slate-300 hover:bg-slate-800/30'
                }`}
              >
                Hospital Tasks
              </button>
            </div>

            {/* Tab Content */}
            {taskViewMode === 'by-patient' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {patients.filter(p => p.status !== 'Discharging' && (p.tasks?.length || 0) > 0).map(patient => {
                  const today = new Date().toISOString().split('T')[0];
                  const allTasks = patient.tasks || [];
                  // Only show today's tasks
                  const todayTasks = allTasks; // No date filtering - tasks don't have date field
                  // Apply hide completed filter
                  const tasks = todayTasks.filter((t: any) => !hideCompletedTasks || !t.completed);
                  const info = patient.demographics || patient.demographics || {};
                  const emoji = getSpeciesEmoji(info.species);
                  const completedCount = tasks.filter((t: any) => t.completed).length;
                  const totalCount = tasks.length;

                  if (tasks.length === 0) return null;

                  const colors = getPatientColor(patient.id);

                  return (
                    <div key={patient.id} className={`${colors.bg} border ${colors.border} rounded-lg p-1.5`}>
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="text-white font-bold flex items-center gap-1.5 text-xs">
                          <span className="text-sm">{emoji}</span>
                          {patient.demographics?.name || patient.name || 'Unnamed'}
                          <span className={`text-xs ${colors.accent} text-white px-1.5 py-0.5 rounded-full ml-1`}>
                            {completedCount}/{totalCount}
                          </span>
                        </h4>
                      </div>
                      <div className="space-y-0.5">
                        {tasks.map((task: any) => (
                          <div
                            key={task.id}
                            className="flex items-center gap-1.5 px-1.5 py-1 rounded bg-slate-800/50 border border-slate-700/30 hover:border-cyan-500/50 transition group"
                          >
                            <button
                              onClick={() => handleToggleTask(patient.id, task.id, task.completed)}
                              className="flex-shrink-0"
                            >
                              {task.completed ? (
                                <CheckCircle2 className="text-green-400" size={14} />
                              ) : (
                                <Circle className="text-slate-600 group-hover:text-cyan-400" size={14} />
                              )}
                            </button>
                            <span
                              className={`flex-1 text-xs cursor-pointer ${task.completed ? 'line-through text-slate-500' : 'text-slate-200'}`}
                              onClick={() => handleToggleTask(patient.id, task.id, task.completed)}
                            >
                              {task.title || task.name}
                            </span>
                            <button
                              onClick={() => handleDeleteTask(patient.id, task.id)}
                              className="flex-shrink-0 p-0.5 text-slate-600 hover:text-red-400 hover:bg-red-500/10 rounded transition opacity-0 group-hover:opacity-100"
                            >
                              <Trash2 size={10} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
                {patients.filter(p => p.status !== 'Discharging' && (p.tasks?.length || 0) > 0).length === 0 && (
                  <div className="text-center py-12 text-slate-400">
                    <div className="text-5xl mb-3">✨</div>
                    <p className="text-lg">No patient tasks found.</p>
                  </div>
                )}
              </div>
            )}

            {taskViewMode === 'by-task' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {(() => {
                  // Group tasks by task name
                  const taskGroups: Record<string, Array<{ task: any; patient: any }>> = {};
                  const today = new Date().toISOString().split('T')[0];

                  patients.filter(p => p.status !== 'Discharging').forEach(patient => {
                    (patient.tasks || []).forEach((task: any) => {
                      // Apply hide completed filter (no date filtering - tasks don't have date field)
                      if (!hideCompletedTasks || !task.completed) {
                        const taskName = task.title || task.name;
                        if (!taskGroups[taskName]) {
                          taskGroups[taskName] = [];
                        }
                        taskGroups[taskName].push({ task, patient });
                      }
                    });
                  });

                  const taskNames = Object.keys(taskGroups).sort();

                  if (taskNames.length === 0) {
                    return (
                      <div className="text-center py-12 text-slate-400">
                        <div className="text-5xl mb-3">✨</div>
                        <p className="text-lg">No tasks found.</p>
                      </div>
                    );
                  }

                  return taskNames.map(taskName => {
                    const items = taskGroups[taskName];
                    const completedCount = items.filter(({ task }) => task.completed).length;
                    const totalCount = items.length;

                    return (
                      <div key={taskName} className="bg-slate-900/60 border border-slate-700/50 rounded-lg p-1.5">
                        <div className="flex items-center justify-between mb-1">
                          <h4 className="text-white font-bold text-xs flex items-center gap-1.5">
                            {taskName}
                            <span className="text-xs bg-blue-600 text-white px-1.5 py-0.5 rounded-full">
                              {completedCount}/{totalCount}
                            </span>
                          </h4>
                        </div>
                        <div className="space-y-0.5">
                          {items.map(({ task, patient }) => {
                            const info = patient.demographics || patient.demographics || {};
                            const emoji = getSpeciesEmoji(info.species);
                            const colors = getPatientColor(patient.id);
                            return (
                              <div
                                key={`${patient.id}-${task.id}`}
                                className={`flex items-center gap-1.5 px-1.5 py-1 rounded ${colors.bg} border ${colors.border} hover:opacity-90 transition group`}
                              >
                                <button
                                  onClick={() => handleToggleTask(patient.id, task.id, task.completed)}
                                  className="flex-shrink-0"
                                >
                                  {task.completed ? (
                                    <CheckCircle2 className="text-green-400" size={14} />
                                  ) : (
                                    <Circle className="text-slate-600 group-hover:text-blue-400" size={14} />
                                  )}
                                </button>
                                <div className="flex-1 min-w-0">
                                  <div
                                    className={`text-xs cursor-pointer flex items-center gap-1 ${task.completed ? 'line-through text-slate-500' : 'text-slate-200'}`}
                                    onClick={() => handleToggleTask(patient.id, task.id, task.completed)}
                                  >
                                    <span className="text-sm">{emoji}</span>
                                    {patient.demographics?.name || patient.name || 'Unnamed'}
                                  </div>
                                </div>
                                <button
                                  onClick={() => handleDeleteTask(patient.id, task.id)}
                                  className="flex-shrink-0 p-0.5 text-slate-600 hover:text-red-400 hover:bg-red-500/10 rounded transition opacity-0 group-hover:opacity-100"
                                >
                                  <Trash2 size={10} />
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            )}

            {taskViewMode === 'general' && (
              <div>
                {(() => {
                  const today = new Date().toISOString().split('T')[0];
                  const todayGeneralTasks = generalTasks; // No date filtering - tasks don't have date field

                  if (todayGeneralTasks.length === 0) {
                    return (
                      <div className="text-center py-12 text-slate-400">
                        <div className="text-5xl mb-3">✨</div>
                        <p className="text-lg">No hospital tasks for today.</p>
                        <p className="text-sm mt-2">Click "Add Hospital Task" to create one.</p>
                      </div>
                    );
                  }

                  return (
                    <div>
                      <div className="text-xs text-emerald-400 mb-2 font-bold">
                        {todayGeneralTasks.filter((t: any) => !t.completed).length} tasks remaining
                      </div>
                      <div className="space-y-1">
                        {todayGeneralTasks.map((task: any) => (
                          <div
                            key={task.id}
                            className="flex items-center gap-2 p-1.5 rounded-lg bg-slate-900/60 border border-emerald-700/40 hover:border-emerald-500/60 transition group"
                          >
                            <button
                              onClick={() => handleToggleGeneralTask(task.id, task.completed)}
                              className="flex-shrink-0"
                            >
                              {task.completed ? (
                                <CheckCircle2 className="text-green-400" size={18} />
                              ) : (
                                <Circle className="text-slate-600 group-hover:text-emerald-400" size={18} />
                              )}
                            </button>
                            <span
                              className={`flex-1 cursor-pointer text-sm ${task.completed ? 'line-through text-slate-500' : 'text-slate-200 font-medium'}`}
                              onClick={() => handleToggleGeneralTask(task.id, task.completed)}
                            >
                              {task.title || task.name}
                            </span>
                            <button
                              onClick={() => handleDeleteGeneralTask(task.id)}
                              className="flex-shrink-0 p-1 text-slate-600 hover:text-red-400 hover:bg-red-500/10 rounded transition opacity-0 group-hover:opacity-100"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
              </>
            )}
          </div>
        )}

        {/* MRI Schedule View - Neo-pop styled */}
        {showMRISchedule && (
          <div
            className="rounded-2xl p-4"
            style={{ backgroundColor: 'white', border: NEO_BORDER, boxShadow: NEO_SHADOW }}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-black text-gray-900 flex items-center gap-2">
                <Brain style={{ color: NEO_COLORS.teal }} />
                MRI Schedule
              </h2>
              <button
                onClick={handleExportMRISchedule}
                className="px-4 py-2 rounded-xl font-bold text-gray-900 transition hover:-translate-y-0.5 flex items-center gap-2"
                style={{ backgroundColor: NEO_COLORS.lavender, border: NEO_BORDER, boxShadow: NEO_SHADOW_SM }}
              >
                <Copy size={16} />
                Copy to Clipboard
              </button>
            </div>
            <div className="overflow-x-auto max-h-[70vh] rounded-xl" style={{ border: NEO_BORDER }}>
              <table className="w-full text-sm">
                <thead className="sticky top-0 z-10" style={{ backgroundColor: NEO_COLORS.mint }}>
                  <tr style={{ borderBottom: NEO_BORDER }}>
                    <th className="text-left p-3 text-gray-900 font-bold">Name</th>
                    <th className="text-left p-3 text-gray-900 font-bold">Patient ID</th>
                    <th className="text-left p-3 text-gray-900 font-bold">Weight (kg)</th>
                    <th className="text-left p-3 text-gray-900 font-bold">Scan Type</th>
                    <th className="text-left p-3 text-gray-900 font-bold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {patients.filter(p => p.type === 'MRI' && (p.status === 'New' || p.status?.toLowerCase() === 'new admit')).map((patient, idx) => {
                    // Helper to render save status indicator
                    const renderSaveStatus = (field: string) => {
                      const status = mriSaveStatus[`${patient.id}-${field}`];
                      if (!status) return null;
                      return (
                        <span className={`ml-2 text-xs font-bold ${
                          status === 'saving' ? 'text-amber-500' :
                          status === 'saved' ? 'text-green-600' :
                          'text-red-500'
                        }`}>
                          {status === 'saving' ? '...' : status === 'saved' ? '✓' : '✗'}
                        </span>
                      );
                    };

                    return (
                      <tr
                        key={patient.id}
                        className={`hover:bg-[${NEO_COLORS.mint}]/30 transition`}
                        style={{
                          backgroundColor: idx % 2 === 0 ? 'white' : NEO_COLORS.cream,
                          borderBottom: '1px solid #e5e7eb'
                        }}
                        onPaste={(e) => handleMRIPaste(e, patient.id)}
                      >
                        <td className="p-3">
                          <button
                            onClick={() => setRoundingSheetPatient(patient.id)}
                            className="text-gray-900 font-bold transition cursor-pointer"
                            style={{ color: 'inherit' }}
                            onMouseOver={(e) => e.currentTarget.style.color = NEO_COLORS.teal}
                            onMouseOut={(e) => e.currentTarget.style.color = 'inherit'}
                          >
                            {patient.demographics?.name || patient.name || 'Unnamed'}
                          </button>
                        </td>
                        <td className="p-3">
                          <div className="flex items-center">
                            <input
                              type="text"
                              value={mriInputValues[`${patient.id}-patientId`] ?? (patient.demographics?.patientId || '')}
                              onChange={(e) => debouncedMRIUpdate(patient.id, 'patientId', e.target.value, 'demographics')}
                              className="w-full rounded-lg px-2 py-1.5 text-gray-900 text-sm focus:outline-none focus:ring-2"
                              style={{ border: '1px solid #000', backgroundColor: 'white', '--tw-ring-color': NEO_COLORS.teal } as any}
                            />
                            {renderSaveStatus('patientId')}
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="flex items-center">
                            <input
                              type="text"
                              value={mriInputValues[`${patient.id}-weight`] ?? ((patient.demographics?.weight || '').toString().replace(/[^\d.]/g, ''))}
                              onChange={(e) => debouncedMRIUpdate(patient.id, 'weight', e.target.value, 'demographics')}
                              className="w-full rounded-lg px-2 py-1.5 text-gray-900 text-sm focus:outline-none focus:ring-2"
                              style={{ border: '1px solid #000', backgroundColor: 'white', '--tw-ring-color': NEO_COLORS.teal } as any}
                              placeholder="kg"
                            />
                            {renderSaveStatus('weight')}
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="flex items-center">
                            <input
                              type="text"
                              value={mriInputValues[`${patient.id}-scanType`] ?? (patient.mriData?.scanType || '')}
                              onChange={(e) => debouncedMRIUpdate(patient.id, 'scanType', e.target.value, 'mriData')}
                              className="w-full rounded-lg px-2 py-1.5 text-gray-900 text-sm focus:outline-none focus:ring-2"
                              style={{ border: '1px solid #000', backgroundColor: 'white', '--tw-ring-color': NEO_COLORS.teal } as any}
                              placeholder="Brain, LS, C-Spine..."
                            />
                            {renderSaveStatus('scanType')}
                          </div>
                        </td>
                        <td className="p-3">
                          <button
                            onClick={() => handleCopySingleMRILine(patient.id)}
                            className="p-2 rounded-lg transition hover:-translate-y-0.5"
                            style={{ backgroundColor: NEO_COLORS.lavender, border: '1px solid #000' }}
                            title="Copy this patient's MRI line"
                          >
                            <Copy className="w-4 h-4 text-gray-900" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {patients.filter(p => p.type === 'MRI' && (p.status === 'New' || p.status?.toLowerCase() === 'new admit')).length === 0 && (
              <div
                className="text-center py-8 mt-4 rounded-xl"
                style={{ backgroundColor: NEO_COLORS.cream, border: NEO_BORDER }}
              >
                <div className="text-4xl mb-2">🧠</div>
                <p className="text-gray-500 font-bold">No MRI patients with New/New Admit status</p>
              </div>
            )}
          </div>
        )}

        {/* Floating Add Patient Button */}
        <button
          onClick={() => setShowAddPatientModal(true)}
          className="fixed bottom-8 right-8 z-20 px-5 py-4 text-gray-900 rounded-2xl hover:-translate-y-1 transition-transform flex items-center gap-2 font-black"
          style={{
            backgroundColor: '#B8E6D4',
            border: '2px solid #000',
            boxShadow: '6px 6px 0 #000',
          }}
        >
          <Plus size={24} />
          <span>Add Patient</span>
        </button>

        {/* Simple Date Line */}
        <p className="text-gray-500 text-sm font-medium">
          {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
        </p>

        {/* All Tasks Complete Celebration */}
        {taskStats.allComplete && (
          <div
            className="rounded-2xl p-6 text-center animate-in fade-in slide-in-from-top-4 duration-500"
            style={{ backgroundColor: '#B8E6D4', border: '2px solid #000', boxShadow: '6px 6px 0 #000' }}
          >
            <div className="text-6xl mb-3">🎉</div>
            <h3 className="text-gray-900 font-black text-2xl mb-2">All Tasks Complete!</h3>
            <p className="text-gray-700 text-base mb-1 font-medium">
              You've completed {taskStats.completed} {taskStats.completed === 1 ? 'task' : 'tasks'} today. Outstanding work!
            </p>
            <p className="text-gray-500 text-sm font-medium">Take a well-deserved break or add new tasks below.</p>
          </div>
        )}

        {/* Batch Add Tasks - Above Patient Cards */}
        {filteredPatients.length > 0 && !taskStats.allComplete && (
          <div className="flex gap-2 justify-end">
            <button
              onClick={() => handleBatchAddAllCategoryTasks('morning')}
              className="px-4 py-2 rounded-xl text-sm font-bold hover:-translate-y-0.5 transition-transform text-gray-900"
              style={{ backgroundColor: '#FFBDBD', border: '2px solid #000', boxShadow: '3px 3px 0 #000' }}
            >
              + Morning Tasks
            </button>
            <button
              onClick={() => handleBatchAddAllCategoryTasks('evening')}
              className="px-4 py-2 rounded-xl text-sm font-bold hover:-translate-y-0.5 transition-transform text-gray-900"
              style={{ backgroundColor: '#DCC4F5', border: '2px solid #000', boxShadow: '3px 3px 0 #000' }}
            >
              + Evening Tasks
            </button>
          </div>
        )}

        {/* Patients */}
        {!mounted || patientsLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-gray-600" />
          </div>
        ) : filteredPatients.length === 0 ? (
          <div
            className="rounded-3xl p-12 text-center"
            style={{ backgroundColor: 'white', border: '2px solid #000', boxShadow: '6px 6px 0 #000' }}
          >
            <div className="text-6xl mb-4">🐾</div>
            <p className="text-gray-600 text-lg font-medium">No patients yet. Add your first furry friend above!</p>
          </div>
        ) : (
          /* PATIENT LIST VIEW */
          <div className="space-y-2">
            {filteredPatients.map((patient) => (
              <PatientListItem
                key={patient.id}
                patient={patient}
                isExpanded={expandedPatient === patient.id}
                isSelected={selectedPatientIds.has(patient.id)}
                onToggleExpand={() => setExpandedPatient(expandedPatient === patient.id ? null : patient.id)}
                onToggleSelect={() => togglePatientSelection(patient.id)}
                onDelete={() => handleDeletePatient(patient.id)}
                onUpdatePatient={(field, value) => {
                  // Use handleStatusChange for status updates (includes discharge task creation)
                  if (field === 'status') {
                    handleStatusChange(patient.id, value);
                  } else if (field === 'type') {
                    handleTypeChange(patient.id, value);
                  } else {
                    // Handle other patient updates
                    apiClient.updatePatient(String(patient.id), { [field]: value }).then(() => refetch());
                  }
                }}
                onQuickAction={(action) => {
                  if (action === 'rounds') setRoundingSheetPatient(patient.id);
                }}
                onPrintStickers={() => handlePrintPatientStickers(patient.id)}
              />
            ))}
          </div>
        )}

        {/* Rounding Sheet Modal */}
        {roundingSheetPatient !== null && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
            <div className="w-full max-w-7xl my-8 rounded-3xl" style={{ backgroundColor: 'white', border: '2px solid #000', boxShadow: '6px 6px 0 #000' }}>
              <div className="p-6" style={{ borderBottom: '2px solid #000' }}>
                <div className="flex items-center justify-between">
                  <h3 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                    📋 Rounding Sheet
                    <span className="text-emerald-600">
                      {patients.find(p => p.id === roundingSheetPatient)?.name}
                    </span>
                    <button
                      onClick={() => handleCopySingleRoundingLine(roundingSheetPatient)}
                      className="px-3 py-1.5 text-gray-900 rounded-lg text-sm font-bold transition flex items-center gap-1 hover:-translate-y-0.5"
                      style={{ backgroundColor: '#B8E6D4', border: '1px solid #000', boxShadow: '2px 2px 0 #000' }}
                      title="Copy this patient's rounding line"
                    >
                      📋 Copy Line
                    </button>
                  </h3>
                  <button
                    onClick={() => setRoundingSheetPatient(null)}
                    className="p-2 text-gray-600 hover:text-gray-900 rounded-lg transition"
                    style={{ border: '1px solid #ccc' }}
                  >
                    ✕
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-4 max-h-[90vh] overflow-y-auto">
                {(() => {
                  const patient = patients.find(p => p.id === roundingSheetPatient);
                  if (!patient) return null;
                  const info = patient.demographics || {};
                  const rounding = patient.roundingData || {};

                  // Common dropdown options
                  const commonProblems = [
                    'seizures', 'IVDD', 'suspected aa lux', 'vestibular disease',
                    'meningitis', 'FCE', 'GME', 'brain tumor', 'post-op monitoring'
                  ];

                  const commonConcerns = [
                    'none', 'seizure watch', 'pain management', 'recumbent care',
                    'aspiration risk', 'dysphoria', 'not eating', 'vomiting'
                  ];

                  const commonComments = [
                    'CARE WITH NECK', 'STRICT CAGE REST', 'NPO FOR MRI',
                    'AMBULATING WELL', 'PAIN CONTROLLED', 'EATING WELL'
                  ];

                  return (
                    <>
                      {/* Magic Paste Button */}
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={handleMagicPaste}
                          className="flex-1 px-6 py-4 bg-gradient-to-r from-emerald-600 via-pink-600 to-red-600 text-white rounded-xl font-bold hover:scale-105 transition-transform shadow-lg shadow-emerald-500/50 flex items-center justify-center gap-2"
                        >
                          <Sparkles size={20} className="animate-pulse" />
                          ✨ Magic Paste from EzyVet/Vet Radar
                          <Sparkles size={20} className="animate-pulse" />
                        </button>
                      </div>

                      {/* Quick Fill Helper */}
                      <div className="bg-gradient-to-r from-cyan-500/10 to-emerald-500/10 border border-cyan-500/30 rounded-xl p-2">
                        <div className="flex items-center gap-2 text-xs text-cyan-300">
                          <span className="text-slate-400">
                            Or use: 🩸 bloodwork, 📷 imaging, 💊 meds for specific fields
                          </span>
                        </div>
                      </div>

                      {/* Row 1: Basic Info */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="text-xs text-slate-400 uppercase block mb-1">Signalment</label>
                          <input
                            type="text"
                            value={roundingFormData.signalment || ''}
                            onChange={(e) => setRoundingFormData({...roundingFormData, signalment: e.target.value})}
                            className="w-full px-3 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-white text-sm focus:ring-2 focus:ring-cyan-500"
                            placeholder="9 months Female Spayed Dachshund Mix"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-slate-400 uppercase block mb-1">Location</label>
                          <select
                            value={roundingFormData.location || 'IP'}
                            onChange={(e) => setRoundingFormData({...roundingFormData, location: e.target.value})}
                            className="w-full px-3 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-white text-sm focus:ring-2 focus:ring-cyan-500"
                          >
                            <option value="IP">IP</option>
                            <option value="ICU">ICU</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-xs text-slate-400 uppercase block mb-1">ICU</label>
                          <select
                            value={roundingFormData.icuCriteria || 'No'}
                            onChange={(e) => setRoundingFormData({...roundingFormData, icuCriteria: e.target.value})}
                            className="w-full px-3 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-white text-sm focus:ring-2 focus:ring-cyan-500"
                          >
                            <option value="No">No</option>
                            <option value="Yes">Yes</option>
                          </select>
                        </div>
                      </div>

                      {/* Row 2: Code & Problems */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="text-xs text-slate-400 uppercase block mb-1">Code</label>
                          <select
                            value={roundingFormData.code || 'Yellow'}
                            onChange={(e) => setRoundingFormData({...roundingFormData, code: e.target.value})}
                            className="w-full px-3 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-white text-sm focus:ring-2 focus:ring-cyan-500"
                          >
                            <option value="Green">Green</option>
                            <option value="Yellow">Yellow</option>
                            <option value="Orange">Orange</option>
                            <option value="Red">Red</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-xs text-slate-400 uppercase block mb-1">Problems</label>
                          <textarea
                            value={roundingFormData.problems || ''}
                            onChange={(e) => setRoundingFormData({...roundingFormData, problems: e.target.value})}
                            className="w-full px-3 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-white text-sm focus:ring-2 focus:ring-cyan-500 resize-y"
                            placeholder="Type problems here"
                            rows={6}
                          />
                        </div>
                      </div>

                      {/* Row 3: Diagnostics */}
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <label className="text-xs text-slate-400 uppercase">Diagnostics</label>
                          <div className="flex gap-1 text-xs text-slate-500">
                            <button
                              type="button"
                              onClick={() => handleSmartPaste('bloodwork')}
                              className="hover:text-pink-400 transition"
                              title="Paste bloodwork (extracts abnormals)"
                            >
                              🩸
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSmartPaste('radiology')}
                              className="hover:text-cyan-400 transition"
                              title="Paste imaging/CXR (summarizes)"
                            >
                              📷
                            </button>
                          </div>
                        </div>
                        <textarea
                          value={roundingFormData.diagnosticFindings || ''}
                          onChange={(e) => setRoundingFormData({...roundingFormData, diagnosticFindings: e.target.value})}
                          rows={8}
                          className="w-full px-3 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-white text-sm focus:ring-2 focus:ring-cyan-500 resize-y"
                          placeholder="Type or use 🩸/📷 icons to paste & parse"
                        />
                      </div>

                      {/* Row 4: Therapeutics */}
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <label className="text-xs text-slate-400 uppercase">Therapeutics (Medications)</label>
                          <button
                            type="button"
                            onClick={() => handleSmartPaste('medications')}
                            className="text-xs hover:text-green-400 transition"
                            title="Paste medications (formats nicely)"
                          >
                            💊
                          </button>
                        </div>
                        <textarea
                          value={roundingFormData.therapeutics || ''}
                          onChange={(e) => setRoundingFormData({...roundingFormData, therapeutics: e.target.value})}
                          rows={8}
                          className="w-full px-3 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-white text-sm focus:ring-2 focus:ring-cyan-500 resize-y"
                          placeholder="Type or use 💊 icon to paste & format"
                        />
                      </div>

                      {/* Row 5: IVC, Fluids, CRI */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="text-xs text-slate-400 uppercase block mb-1">IVC</label>
                          <select
                            value={roundingFormData.ivc || 'No'}
                            onChange={(e) => setRoundingFormData({...roundingFormData, ivc: e.target.value})}
                            className="w-full px-3 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-white text-sm focus:ring-2 focus:ring-cyan-500"
                          >
                            <option value="Yes">Yes</option>
                            <option value="No">No</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-xs text-slate-400 uppercase block mb-1">Fluids</label>
                          <input
                            type="text"
                            value={roundingFormData.fluids || ''}
                            onChange={(e) => setRoundingFormData({...roundingFormData, fluids: e.target.value})}
                            className="w-full px-3 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-white text-sm focus:ring-2 focus:ring-cyan-500"
                            placeholder="No or fluid rate"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-slate-400 uppercase block mb-1">CRI</label>
                          <input
                            type="text"
                            value={roundingFormData.cri || ''}
                            onChange={(e) => setRoundingFormData({...roundingFormData, cri: e.target.value})}
                            className="w-full px-3 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-white text-sm focus:ring-2 focus:ring-cyan-500"
                            placeholder="No or CRI details"
                          />
                        </div>
                      </div>

                      {/* Row 6: Overnight Dx */}
                      <div>
                        <label className="text-xs text-slate-400 uppercase block mb-1">Overnight Dx</label>
                        <textarea
                          value={roundingFormData.overnightDx || ''}
                          onChange={(e) => setRoundingFormData({...roundingFormData, overnightDx: e.target.value})}
                          className="w-full px-3 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-white text-sm focus:ring-2 focus:ring-cyan-500 resize-y"
                          placeholder="none"
                          rows={5}
                        />
                      </div>

                      {/* Row 7: Concerns */}
                      <div>
                        <label className="text-xs text-slate-400 uppercase block mb-1">Concerns</label>
                        <textarea
                          value={roundingFormData.concerns || ''}
                          onChange={(e) => setRoundingFormData({...roundingFormData, concerns: e.target.value})}
                          className="w-full px-3 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-white text-sm focus:ring-2 focus:ring-cyan-500 resize-y"
                          placeholder="Type concerns here"
                          rows={5}
                        />
                      </div>

                      {/* Row 8: Comments */}
                      <div>
                        <label className="text-xs text-slate-400 uppercase block mb-1">Comments</label>
                        <textarea
                          value={roundingFormData.comments || ''}
                          onChange={(e) => setRoundingFormData({...roundingFormData, comments: e.target.value})}
                          className="w-full px-3 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-white text-sm focus:ring-2 focus:ring-cyan-500 resize-y"
                          placeholder="Type comments here"
                          rows={5}
                        />
                      </div>

                      {/* Action Buttons */}
                      <div className="flex gap-3 pt-4 border-t border-slate-700/50">
                        <button
                          onClick={handleSaveRoundingData}
                          className="flex-1 px-6 py-3 bg-gradient-to-r from-cyan-500 to-emerald-500 text-white rounded-xl font-bold hover:scale-105 transition-transform"
                        >
                          💾 Save Changes
                        </button>
                        <button
                          onClick={() => setRoundingSheetPatient(null)}
                          className="px-6 py-3 bg-slate-700 text-white rounded-xl font-bold hover:bg-slate-600 transition"
                        >
                          Cancel
                        </button>
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>
          </div>
        )}

        {/* Add Patient Modal */}
        {showAddPatientModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div
              className="bg-white rounded-3xl w-full max-w-2xl overflow-hidden"
              style={{ border: '2px solid #000', boxShadow: '8px 8px 0 #000' }}
            >
              <div
                className="p-6"
                style={{ borderBottom: '2px solid #000', backgroundColor: '#FFF8F0' }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center"
                      style={{ backgroundColor: '#DCC4F5', border: '2px solid #000' }}
                    >
                      <Brain className="text-gray-900" size={24} />
                    </div>
                    <h3 className="text-2xl font-black text-gray-900">Add Patient</h3>
                    <span
                      className="px-3 py-1 rounded-full text-xs font-black text-gray-900"
                      style={{ backgroundColor: '#B8E6D4', border: '1.5px solid #000' }}
                    >
                      AI-POWERED
                    </span>
                  </div>
                  <button
                    onClick={() => { setShowAddPatientModal(false); setIsAlreadyHospitalized(false); setNeedsMRIPrep(false); setNeedsSurgeryPrep(false); }}
                    className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition font-bold"
                  >
                    ✕
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-4 bg-white">
                <div className="flex gap-2">
                  {(['MRI', 'Surgery', 'Medical'] as const).map((type) => {
                    const emojis = { MRI: '🧠', Surgery: '🔪', Medical: '💊' };
                    const colors = { MRI: '#DCC4F5', Surgery: '#FFBDBD', Medical: '#B8E6D4' };
                    return (
                      <button
                        key={type}
                        onClick={() => setPatientType(type)}
                        className={`px-4 py-2 rounded-xl font-bold transition-all text-sm text-gray-900 hover:-translate-y-0.5 ${
                          patientType === type ? '' : 'opacity-50'
                        }`}
                        style={{
                          backgroundColor: colors[type],
                          border: '2px solid #000',
                          boxShadow: patientType === type ? '3px 3px 0 #000' : 'none',
                        }}
                      >
                        {emojis[type]} {type}
                      </button>
                    );
                  })}
                </div>

                {/* Already Hospitalized checkbox - skips New Admit tasks */}
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isAlreadyHospitalized}
                    onChange={(e) => {
                      setIsAlreadyHospitalized(e.target.checked);
                      if (!e.target.checked) {
                        setNeedsMRIPrep(false);
                        setNeedsSurgeryPrep(false);
                      }
                    }}
                    className="w-5 h-5 rounded border-2 border-black accent-emerald-500"
                  />
                  <span className="text-gray-900 font-bold">Already hospitalized (skip admission tasks)</span>
                </label>

                {/* Conditional MRI Prep checkbox - only shows for MRI patients who are already hospitalized */}
                {patientType === 'MRI' && isAlreadyHospitalized && (
                  <label className="flex items-center gap-3 cursor-pointer ml-6 animate-in fade-in slide-in-from-top-2 duration-200">
                    <input
                      type="checkbox"
                      checked={needsMRIPrep}
                      onChange={(e) => setNeedsMRIPrep(e.target.checked)}
                      className="w-5 h-5 rounded border-2 border-black accent-violet-500"
                    />
                    <span className="text-gray-700 font-medium">Needs MRI prep tasks (anesthesia sheet, stickers, black book)</span>
                  </label>
                )}

                {/* Conditional Surgery Prep checkbox - only shows for Surgery patients who are already hospitalized */}
                {patientType === 'Surgery' && isAlreadyHospitalized && (
                  <label className="flex items-center gap-3 cursor-pointer ml-6 animate-in fade-in slide-in-from-top-2 duration-200">
                    <input
                      type="checkbox"
                      checked={needsSurgeryPrep}
                      onChange={(e) => setNeedsSurgeryPrep(e.target.checked)}
                      className="w-5 h-5 rounded border-2 border-black accent-rose-500"
                    />
                    <span className="text-gray-700 font-medium">Needs surgery prep tasks (slip, board, stickers)</span>
                  </label>
                )}

                <textarea
                  value={patientBlurb}
                  onChange={(e) => setPatientBlurb(e.target.value)}
                  placeholder="Paste patient info... Claude AI will extract everything!"
                  className="w-full px-4 py-3 rounded-2xl bg-white text-gray-900 placeholder-gray-400 focus:outline-none resize-none font-medium"
                  style={{ border: '2px solid #000', boxShadow: '4px 4px 0 #000' }}
                  rows={6}
                />

                <button
                  onClick={() => {
                    handleAddPatient();
                    setShowAddPatientModal(false);
                    setPatientBlurb('');
                    setIsAlreadyHospitalized(false);
                    setNeedsMRIPrep(false);
                    setNeedsSurgeryPrep(false);
                  }}
                  disabled={isAddingPatient || !patientBlurb.trim()}
                  className="w-full py-3 rounded-2xl font-black hover:-translate-y-1 transition-transform disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 flex items-center justify-center gap-2 text-gray-900"
                  style={{ backgroundColor: '#B8E6D4', border: '2px solid #000', boxShadow: '4px 4px 0 #000' }}
                >
                  {isAddingPatient ? (
                    <>
                      <Loader2 className="animate-spin" size={20} />
                      Claude is analyzing...
                    </>
                  ) : (
                    <>
                      <Zap size={20} />
                      Add Patient with Claude AI
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Sticker Size Picker Modal */}
        {stickerPickerPatientId !== null && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div
              className="bg-white rounded-2xl max-w-sm w-full overflow-hidden"
              style={{ border: '2px solid #000', boxShadow: '6px 6px 0 #000' }}
            >
              <div
                className="p-4"
                style={{ backgroundColor: '#FFBDBD', borderBottom: '2px solid #000' }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Tag className="text-gray-900" size={24} />
                    <span className="text-gray-900 font-black text-lg">Print Stickers</span>
                  </div>
                  <button
                    onClick={() => setStickerPickerPatientId(null)}
                    className="text-gray-600 hover:text-gray-900 transition font-bold"
                  >
                    ✕
                  </button>
                </div>
                <p className="text-gray-700 text-sm font-medium mt-1">
                  {patients.find(p => p.id === stickerPickerPatientId)?.demographics?.name || 'Patient'}
                </p>
              </div>
              <div className="p-4 space-y-3 bg-white">
                {/* Count input */}
                <div className="p-3 rounded-xl" style={{ backgroundColor: '#FFF8F0', border: '2px solid #000' }}>
                  <div className="flex items-center justify-between gap-3">
                    <label className="text-sm font-bold text-gray-900">How many?</label>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setStickerPickerCount(Math.max(1, stickerPickerCount - 1))}
                        className="w-8 h-8 rounded-lg font-black text-lg transition hover:-translate-y-0.5"
                        style={{ backgroundColor: '#E5E7EB', border: '2px solid #000' }}
                      >
                        −
                      </button>
                      <input
                        type="number"
                        value={stickerPickerCount}
                        onChange={(e) => setStickerPickerCount(Math.max(1, parseInt(e.target.value) || 1))}
                        className="w-12 h-8 text-center font-black text-lg rounded-lg focus:outline-none"
                        style={{ border: '2px solid #000' }}
                        min={1}
                        max={20}
                      />
                      <button
                        onClick={() => setStickerPickerCount(Math.min(20, stickerPickerCount + 1))}
                        className="w-8 h-8 rounded-lg font-black text-lg transition hover:-translate-y-0.5"
                        style={{ backgroundColor: '#E5E7EB', border: '2px solid #000' }}
                      >
                        +
                      </button>
                    </div>
                  </div>
                  {/* Reset to auto link - only show when patient has manual override */}
                  {(() => {
                    const patient = patients.find(p => p.id === stickerPickerPatientId);
                    if (patient?.stickerData?.useManualCounts) {
                      const autoCount = calculateStickerCounts(
                        patient.stickerData?.isNewAdmit ?? false,
                        patient.stickerData?.isSurgery ?? false
                      ).bigLabelCount;
                      return (
                        <button
                          onClick={handleResetStickerCountToAuto}
                          className="text-xs text-blue-600 hover:text-blue-800 underline mt-2"
                        >
                          Reset to auto ({autoCount})
                        </button>
                      );
                    }
                    return null;
                  })()}
                </div>

                <button
                  onClick={handlePrintBigStickersSingle}
                  className="w-full py-4 rounded-xl font-bold text-lg transition-all flex items-center justify-center gap-3 text-gray-900 hover:-translate-y-0.5"
                  style={{ backgroundColor: '#DCC4F5', border: '2px solid #000', boxShadow: '3px 3px 0 #000' }}
                >
                  <Tag size={24} />
                  <div className="text-left">
                    <div>Big Stickers ({stickerPickerCount})</div>
                    <div className="text-xs font-medium text-gray-600">70mm × 45mm - Patient files & cages</div>
                  </div>
                </button>
                <button
                  onClick={handlePrintTinyStickersSingle}
                  className="w-full py-4 rounded-xl font-bold text-lg transition-all flex items-center justify-center gap-3 text-gray-900 hover:-translate-y-0.5"
                  style={{ backgroundColor: '#B8E6D4', border: '2px solid #000', boxShadow: '3px 3px 0 #000' }}
                >
                  <Tag size={18} />
                  <div className="text-left">
                    <div>Little Stickers ({stickerPickerCount})</div>
                    <div className="text-xs font-medium text-gray-600">50mm × 35mm - Lab samples & diagnostics</div>
                  </div>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Add General Task Modal */}
        {showAddGeneralTask && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div
              className="bg-white rounded-2xl max-w-md w-full overflow-hidden"
              style={{ border: '2px solid #000', boxShadow: '6px 6px 0 #000' }}
            >
              <div
                className="p-4"
                style={{ backgroundColor: '#B8E6D4', borderBottom: '2px solid #000' }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ListTodo className="text-gray-900" size={24} />
                    <span className="text-gray-900 font-black text-lg">Add General Task</span>
                  </div>
                  <button
                    onClick={() => {
                      setShowAddGeneralTask(false);
                      setNewGeneralTaskName('');
                    }}
                    className="text-gray-600 hover:text-gray-900 transition font-bold"
                  >
                    ✕
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-4 bg-white">
                <input
                  type="text"
                  value={newGeneralTaskName}
                  onChange={(e) => setNewGeneralTaskName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && newGeneralTaskName.trim()) {
                      handleAddGeneralTask();
                    }
                  }}
                  placeholder="Enter task name..."
                  className="w-full px-4 py-3 rounded-2xl bg-white text-gray-900 placeholder-gray-400 focus:outline-none font-medium"
                  style={{ border: '2px solid #000', boxShadow: '4px 4px 0 #000' }}
                  autoFocus
                />

                <button
                  onClick={handleAddGeneralTask}
                  disabled={!newGeneralTaskName.trim()}
                  className="w-full py-3 rounded-2xl font-black hover:-translate-y-0.5 transition-transform disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 flex items-center justify-center gap-2 text-gray-900"
                  style={{ backgroundColor: '#B8E6D4', border: '2px solid #000', boxShadow: '3px 3px 0 #000' }}
                >
                  <Plus size={20} />
                  Add General Task
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Add Patient Task from Overview Modal */}
        {showAddPatientTaskFromOverview && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div
              className="bg-white rounded-2xl max-w-md w-full overflow-hidden"
              style={{ border: '2px solid #000', boxShadow: '6px 6px 0 #000' }}
            >
              <div
                className="p-4"
                style={{ backgroundColor: '#DCC4F5', borderBottom: '2px solid #000' }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ListTodo className="text-gray-900" size={24} />
                    <span className="text-gray-900 font-black text-lg">Add Patient Task</span>
                  </div>
                  <button
                    onClick={() => {
                      setShowAddPatientTaskFromOverview(false);
                      setNewPatientTaskName('');
                      setSelectedPatientForTask(null);
                    }}
                    className="text-gray-600 hover:text-gray-900 transition font-bold"
                  >
                    ✕
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-4 bg-white">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Select Patient</label>
                  <select
                    value={selectedPatientForTask || ''}
                    onChange={(e) => setSelectedPatientForTask(Number(e.target.value))}
                    className="w-full px-4 py-3 rounded-2xl bg-white text-gray-900 focus:outline-none font-medium"
                    style={{ border: '2px solid #000', boxShadow: '4px 4px 0 #000' }}
                  >
                    <option value="">Choose a patient...</option>
                    {filteredPatients.map(patient => (
                      <option key={patient.id} value={patient.id}>
                        {patient.demographics?.name || patient.name || 'Unnamed'}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Task Name</label>
                  <input
                    type="text"
                    value={newPatientTaskName}
                    onChange={(e) => setNewPatientTaskName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && newPatientTaskName.trim() && selectedPatientForTask) {
                        handleAddPatientTaskFromOverview();
                      }
                    }}
                    placeholder="Enter task name..."
                    className="w-full px-4 py-3 rounded-2xl bg-white text-gray-900 placeholder-gray-400 focus:outline-none font-medium"
                    style={{ border: '2px solid #000', boxShadow: '4px 4px 0 #000' }}
                  />
                </div>

                <button
                  onClick={handleAddPatientTaskFromOverview}
                  disabled={!newPatientTaskName.trim() || !selectedPatientForTask}
                  className="w-full py-3 rounded-2xl font-black hover:-translate-y-0.5 transition-transform disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 flex items-center justify-center gap-2 text-gray-900"
                  style={{ backgroundColor: '#DCC4F5', border: '2px solid #000', boxShadow: '3px 3px 0 #000' }}
                >
                  <Plus size={20} />
                  Add Task to Patient
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Quick Reference Modal */}
        {showQuickReference && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-slate-800/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-slate-700/50 w-full max-w-6xl my-8">
              <div className="p-6 border-b border-slate-700/50">
                <div className="flex items-center justify-between">
                  <h3 className="text-2xl font-bold text-white flex items-center gap-2">
                    <BookOpen className="text-pink-400" size={28} />
                    Quick Reference - Meds & Protocols
                  </h3>
                  <button
                    onClick={() => setShowQuickReference(false)}
                    className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition"
                  >
                    ✕
                  </button>
                </div>
                <div className="mt-4">
                  <input
                    type="text"
                    value={referenceSearch}
                    onChange={(e) => setReferenceSearch(e.target.value)}
                    placeholder="🔍 Search medications or protocols..."
                    className="w-full px-4 py-2 bg-slate-900/50 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:ring-2 focus:ring-pink-500 focus:border-transparent transition"
                  />
                </div>
              </div>

              <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
                {/* Medications Section */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-xl font-bold text-emerald-400 flex items-center gap-2">
                      💊 Common Medications
                    </h4>
                    <button
                      onClick={() => {
                        const newMeds = [...referenceData.medications, { name: '', dose: '', notes: '' }];
                        setReferenceData({ ...referenceData, medications: newMeds });
                        setEditingReference({ type: 'medications', index: newMeds.length - 1 });
                      }}
                      className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-bold transition"
                    >
                      + Add Medication
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {referenceData.medications
                      .filter((med: any) =>
                        !referenceSearch ||
                        med.name.toLowerCase().includes(referenceSearch.toLowerCase()) ||
                        med.dose.toLowerCase().includes(referenceSearch.toLowerCase()) ||
                        med.notes.toLowerCase().includes(referenceSearch.toLowerCase())
                      )
                      .map((med: any, idx: number) => (
                        <div
                          key={idx}
                          className="bg-slate-900/50 border border-slate-700 rounded-lg p-3 hover:border-emerald-500/50 transition"
                        >
                          {editingReference?.type === 'medications' && editingReference.index === idx ? (
                            <div className="space-y-2">
                              <input
                                type="text"
                                value={med.name}
                                onChange={(e) => {
                                  const updated = [...referenceData.medications];
                                  updated[idx].name = e.target.value;
                                  setReferenceData({ ...referenceData, medications: updated });
                                }}
                                placeholder="Medication name"
                                className="w-full px-2 py-1 bg-slate-800 border border-slate-600 rounded text-white text-sm focus:ring-2 focus:ring-emerald-500"
                              />
                              <input
                                type="text"
                                value={med.dose}
                                onChange={(e) => {
                                  const updated = [...referenceData.medications];
                                  updated[idx].dose = e.target.value;
                                  setReferenceData({ ...referenceData, medications: updated });
                                }}
                                placeholder="Dose (e.g., 10-20 mg/kg PO BID)"
                                className="w-full px-2 py-1 bg-slate-800 border border-slate-600 rounded text-white text-sm focus:ring-2 focus:ring-emerald-500"
                              />
                              <input
                                type="text"
                                value={med.notes}
                                onChange={(e) => {
                                  const updated = [...referenceData.medications];
                                  updated[idx].notes = e.target.value;
                                  setReferenceData({ ...referenceData, medications: updated });
                                }}
                                placeholder="Notes/indications"
                                className="w-full px-2 py-1 bg-slate-800 border border-slate-600 rounded text-white text-sm focus:ring-2 focus:ring-emerald-500"
                              />
                              <div className="flex gap-2">
                                <button
                                  onClick={() => setEditingReference(null)}
                                  className="flex-1 px-2 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-sm font-bold transition"
                                >
                                  Save
                                </button>
                                <button
                                  onClick={() => {
                                    const updated = referenceData.medications.filter((_: any, i: number) => i !== idx);
                                    setReferenceData({ ...referenceData, medications: updated });
                                    setEditingReference(null);
                                  }}
                                  className="px-2 py-1 bg-red-600 hover:bg-red-500 text-white rounded text-sm font-bold transition"
                                >
                                  Delete
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div
                              onClick={() => setEditingReference({ type: 'medications', index: idx })}
                              className="cursor-pointer"
                            >
                              <h5 className="font-bold text-white text-sm mb-1">{med.name}</h5>
                              <p className="text-emerald-300 text-xs mb-1">📏 {med.dose}</p>
                              <p className="text-slate-400 text-xs">{med.notes}</p>
                            </div>
                          )}
                        </div>
                      ))}
                  </div>
                </div>

                {/* Protocols Section */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-xl font-bold text-cyan-400 flex items-center gap-2">
                      📋 Protocols & Procedures
                    </h4>
                    <button
                      onClick={() => {
                        const newProtocols = [...referenceData.protocols, { name: '', content: '' }];
                        setReferenceData({ ...referenceData, protocols: newProtocols });
                        setEditingReference({ type: 'protocols', index: newProtocols.length - 1 });
                      }}
                      className="px-3 py-1 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-sm font-bold transition"
                    >
                      + Add Protocol
                    </button>
                  </div>
                  <div className="space-y-2">
                    {referenceData.protocols
                      .filter((protocol: any) =>
                        !referenceSearch ||
                        protocol.name.toLowerCase().includes(referenceSearch.toLowerCase()) ||
                        protocol.content.toLowerCase().includes(referenceSearch.toLowerCase())
                      )
                      .map((protocol: any, idx: number) => (
                        <div
                          key={idx}
                          className="bg-slate-900/50 border border-slate-700 rounded-lg p-4 hover:border-cyan-500/50 transition"
                        >
                          {editingReference?.type === 'protocols' && editingReference.index === idx ? (
                            <div className="space-y-2">
                              <input
                                type="text"
                                value={protocol.name}
                                onChange={(e) => {
                                  const updated = [...referenceData.protocols];
                                  updated[idx].name = e.target.value;
                                  setReferenceData({ ...referenceData, protocols: updated });
                                }}
                                placeholder="Protocol name"
                                className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded text-white text-sm focus:ring-2 focus:ring-cyan-500"
                              />
                              <textarea
                                value={protocol.content}
                                onChange={(e) => {
                                  const updated = [...referenceData.protocols];
                                  updated[idx].content = e.target.value;
                                  setReferenceData({ ...referenceData, protocols: updated });
                                }}
                                placeholder="Protocol steps/details..."
                                className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded text-white text-sm focus:ring-2 focus:ring-cyan-500 resize-y"
                                rows={6}
                              />
                              <div className="flex gap-2">
                                <button
                                  onClick={() => setEditingReference(null)}
                                  className="flex-1 px-3 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded text-sm font-bold transition"
                                >
                                  Save
                                </button>
                                <button
                                  onClick={() => {
                                    const updated = referenceData.protocols.filter((_: any, i: number) => i !== idx);
                                    setReferenceData({ ...referenceData, protocols: updated });
                                    setEditingReference(null);
                                  }}
                                  className="px-3 py-2 bg-red-600 hover:bg-red-500 text-white rounded text-sm font-bold transition"
                                >
                                  Delete
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div
                              onClick={() => setEditingReference({ type: 'protocols', index: idx })}
                              className="cursor-pointer"
                            >
                              <h5 className="font-bold text-white text-base mb-2">{protocol.name}</h5>
                              <pre className="text-slate-300 text-sm whitespace-pre-wrap font-sans">{protocol.content}</pre>
                            </div>
                          )}
                        </div>
                      ))}
                  </div>
                </div>

                {/* Cocktail Calculator Section */}
                <div>
                  <h4 className="text-xl font-bold text-pink-400 flex items-center gap-2 mb-3">
                    🧪 Discharge Cocktail Calculator
                  </h4>
                  <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-4">
                    <div className="mb-4">
                      <label className="block text-sm font-bold text-slate-300 mb-2">Patient Weight (kg)</label>
                      <input
                        type="number"
                        value={cocktailWeight}
                        onChange={(e) => setCocktailWeight(e.target.value)}
                        placeholder="Enter weight in kg..."
                        className="w-full px-3 py-1 bg-slate-800 border border-slate-600 rounded-lg text-sm text-white placeholder-slate-500 focus:ring-2 focus:ring-pink-500"
                        step="0.1"
                      />
                    </div>

                    {cocktailWeight && (() => {
                      const weight = parseFloat(cocktailWeight);
                      let protocol = '';

                      if (weight < 7) {
                        protocol = `<7kg DISCHARGE MEDICATIONS:

1) Prednisone 5mg tablets - Give 1/2 tablet by mouth every 12 hours for 7 days, then give 1/2 tablet by mouth every 24 hours for 7 days, then give 1/2 tablet by mouth every 48 hours for 7 doses. Today is the first day of this schedule.
   **Next dose due at 8pm tonight**

2) Famotidine 10mg tablets - Give 1/2 tablet by mouth every 24 hours while on prednisone.
   **Next dose due at 8am tomorrow morning**

3) Gabapentin 50mg tablets - Give 1 tablet by mouth every 8-12 hours for pain until otherwise advised. May cause sedation.
   **Next dose due at 4pm tonight**

4) Tramadol 50mg tablets - Give 1/4 tablet by mouth every 8-12 hours for pain until otherwise advised. May cause sedation.
   **Next dose due at 4pm tonight**

5) Hemp 3.8mg capsules - Give 2 capsules by mouth every 12 hours for 7 days, then give 1 capsule by mouth every 12 hours until otherwise advised. (Mobility)
   **Next dose due at 8pm tonight**

5) Hemp 3.8mg capsules - Give 3 capsules by mouth every 12 hours until otherwise advised. (Brain)
   **Next dose due at 8pm tonight**

5) Hemp complete oil - Give 0.1mL by mouth every 12 hours until otherwise advised.
   **Next dose due at 8pm tonight**

6) Clavamox 62.5mg tablets - Give 1 tablet by mouth every 12 hours until finished. Give with food.
   **Next dose due at 8pm tonight**

6) Clavamox 62.5mg tablets - Give 1.5 tablets by mouth every 12 hours until finished. Give with food.
   **Next dose due at 8pm tonight**

7) Fentanyl patch - Please remove this on ********* as per the instructions below.`;
                      } else if (weight >= 7 && weight <= 9) {
                        protocol = `7-9kg DISCHARGE MEDICATIONS:

1) Prednisone 5mg tablets - Give 1 tablet by mouth every 12 hours for 7 days, then give 1 tablet by mouth every 24 hours for 7 days, then give 1 tablet by mouth every 48 hours for 7 doses. Today is the first day of this schedule.
   **Next dose due at 8pm tonight**

2) Famotidine 10mg tablets - Give 1/2 tablet by mouth every 24 hours while on prednisone.
   **Next dose due at 8am tomorrow morning**

3) Gabapentin 50mg tablets - Give 1 tablet by mouth every 8-12 hours for pain until otherwise advised. May cause sedation.
   **Next dose due at 4pm tonight**

3) Gabapentin 100mg capsules - Give 1 capsule by mouth every 8-12 hours for pain until otherwise advised. May cause sedation.
   **Next dose due at 4pm tonight**

4) Tramadol 50mg tablets - Give 1/4 tablet by mouth every 8-12 hours for pain until otherwise advised. May cause sedation.
   **Next dose due at 4pm tonight**

5) Hemp 3.8mg capsules - Give 3 capsules by mouth every 12 hours for 7 days, then give 2 capsules by mouth every 12 hours until otherwise advised. (Mobility)
   **Next dose due at 8pm tonight**

5) Hemp 3.8mg capsules - Give 4 capsules by mouth every 12 hours until otherwise advised. (Brain)
   **Next dose due at 8pm tonight**

5) Hemp complete oil - Give 0.1mL by mouth every 12 hours until otherwise advised.
   **Next dose due at 8pm tonight**

6) Clavamox 250mg Tablets - Give 1/2 tablet every 12 hours until gone
   **Next dose due at 8pm tonight**

6) Clavamox 125mg Tablets - Give 1 tablet every 12 hours until gone
   **Next dose due at 8pm tonight**

7) Fentanyl patch - Please remove this on ********* as per the instructions below.`;
                      } else if (weight >= 10 && weight <= 12) {
                        protocol = `10-12kg DISCHARGE MEDICATIONS:

1) Prednisone 5mg tablets - Give 1 tablet by mouth every 12 hours for 7 days, then give 1 tablet by mouth every 24 hours for 7 days, then give 1 tablet by mouth every 48 hours for 7 doses. Today is the first day of this schedule.
   **Next dose due at 8pm tonight**

2) Famotidine 10mg tablets - Give 1 tablet by mouth every 24 hours while on prednisone.
   **Next dose due at 8am tomorrow morning**

3) Gabapentin 100mg capsules - Give 1 capsule by mouth every 8-12 hours for pain until otherwise advised. May cause sedation.
   **Next dose due at 4pm tonight**

4) Tramadol 50mg tablets - Give 1/2 tablet by mouth every 8-12 hours for pain until otherwise advised. May cause sedation.
   **Next dose due at 4pm tonight**

5) Hemp 11.3mg capsules - Give 2 capsules by mouth every 12 hours for 7 days, then give 1 capsule by mouth every 12 hours until otherwise advised. (Mobility)
   **Next dose due at 8pm tonight**

5) Hemp 11.3mg capsules - Give 3 capsules by mouth every 12 hours until otherwise advised. (Brain)
   **Next dose due at 8pm tonight**

5) Hemp complete oil - Give 0.1mL by mouth every 12 hours until otherwise advised.
   **Next dose due at 8pm tonight**

6) Cephalexin 250mg capsules - Give 1 capsule by mouth every 12 hours until finished. Give with food.
   **Next dose due at 8pm tonight**

7) Fentanyl patch - Please remove this on ********* as per the instructions below.

Please schedule a recheck appointment with the Neurology department to have staples removed in 10-14 days from now`;
                      } else if (weight >= 13 && weight <= 15) {
                        protocol = `13-15kg DISCHARGE MEDICATIONS:

1) Prednisone 5mg tablets - Give 1.5 tablets by mouth every 12 hours for 7 days, then give 1.5 tablets by mouth every 24 hours for 7 days, then give 1.5 tablets by mouth every 48 hours for 7 doses. Today is the first day of this schedule.
   **Next dose due at 8pm tonight**

2) Famotidine 10mg tablets - Give 1 tablet by mouth every 24 hours while on prednisone.
   **Next dose due at 8am tomorrow morning**

3) Gabapentin 100mg capsules - Give 1 capsule by mouth every 8-12 hours for pain until otherwise advised. May cause sedation.
   **Next dose due at 4pm tonight**

4) Tramadol 50mg tablets - Give 1/2 tablet by mouth every 8-12 hours for pain until otherwise advised. May cause sedation.
   **Next dose due at 4pm tonight**

5) Hemp 11.3mg capsules - Give 2 capsules by mouth every 12 hours for 7 days, then give 1 capsule by mouth every 12 hours until otherwise advised. (mobility)
   **Next dose due at 8pm tonight**

5) Hemp 11.3mg capsules - Give 3 capsules by mouth every 12 hours until otherwise advised. (Brain)
   **Next dose due at 8pm tonight**

5) Hemp complete oil - Give 0.4mL by mouth every 12 hours for 7 days, then give 0.2mL by mouth every 12 hours until otherwise advised.
   **Next dose due at 8pm tonight**

6) Cephalexin 250mg tablets - Give 1 tablet by mouth every 12 hours until finished. Give with food.
   **Next dose due at 8pm tonight**

7) Fentanyl patch - Please remove this on ********* as per the instructions below.`;
                      } else if (weight >= 16 && weight <= 20) {
                        protocol = `16-20kg DISCHARGE MEDICATIONS:

1) Prednisone 5mg tablets - Give 1.5 tablets by mouth every 12 hours for 7 days, then give 1.5 tablets by mouth every 24 hours for 7 days, then give 1.5 tablets by mouth every 48 hours for 7 doses. Today is the first day of this schedule.
   **Next dose due at 8pm tonight**

2) Famotidine 10mg tablets - Give 1 tablet by mouth every 24 hours while on prednisone.
   **Next dose due at 8am tonight**

3) Gabapentin 100mg capsules - Give 1 capsule by mouth every 8-12 hours for pain until otherwise advised. May cause sedation.
   **Next dose due at 4pm tonight**

4) Tramadol 50mg tablets - Give 1/2 tablet by mouth every 8-12 hours for pain until otherwise advised. May cause sedation.
   **Next dose due at 4pm tonight**

5) Hemp 11.3mg capsules - Give 3 capsules by mouth every 12 hours for 7 days, then give 2 capsules by mouth every 12 hours until otherwise advised. (Mobility)
   **Next dose due at 8pm tonight**

5) Hemp 11.3mg capsules - Give 4 capsules by mouth every 12 hours until otherwise advised. (Brain)
   **Next dose due at 8pm tonight**

5) Hemp complete oil - Give 0.4mL by mouth every 12 hours for 7 days, then give 0.2mL by mouth every 12 hours until otherwise advised.
   **Next dose due at 8pm tonight**

6) Cephalexin 250mg capsule - Give 1 capsule by mouth every 12 hours until finished. Give with food.
   **Next dose due at 8pm tonight**

7) Fentanyl patch - Please remove this on ********* as per the instructions below.`;
                      } else if (weight >= 21 && weight <= 26) {
                        protocol = `21-26kg DISCHARGE MEDICATIONS:

1) Prednisone 5mg tablets - Give 2 tablets by mouth every 12 hours for 7 days, then give 2 tablets by mouth every 24 hours for 7 days, then give 2 tablets by mouth every 48 hours for 7 doses. Today is the first day of this schedule.
   **Next dose due at 8pm tonight**

2) Famotidine 10mg tablets - Give 1 tablet by mouth every 24 hours while on prednisone.
   **Next dose due at 8am tomorrow morning**

3) Gabapentin 100mg capsules - Give 1-2 capsules by mouth every 8-12 hours for pain until otherwise advised. May cause sedation.
   **Next dose due at 4pm tonight**

4) Tramadol 50mg tablets - Give 1 tablet by mouth every 8-12 hours for pain until otherwise advised. May cause sedation.
   **Next dose due at 4pm tonight**

5) Hemp 11.3mg capsules - Give 3 capsules by mouth every 12 hours for 7 days, then give 2 capsules by mouth every 12 hours until otherwise advised. (Mobility)
   **Next dose due at 8pm tonight**

5) Hemp 11.3mg capsules - Give 4 capsules by mouth every 12 hours until otherwise advised. (Brain)
   **Next dose due at 8pm tonight**

6) Cephalexin 500mg capsule - Give 1 capsule by mouth every 12 hours until finished. Give with food.
   **Next dose due at 8pm tonight**

6) Clavamox 375mg tablet - Give 1 tablet by mouth every 12 hours until finished. Give with food.
   **Next dose due at 8pm tonight**

7) Fentanyl patch - Please remove this on ********* as per the instructions below.`;
                      } else if (weight >= 27 && weight <= 30) {
                        protocol = `27-30kg DISCHARGE MEDICATIONS:

1) Prednisone 5mg tablets - Give 2 tablets by mouth every 12 hours for 7 days, then give 2 tablets by mouth every 24 hours for 7 days, then give 2 tablets by mouth every 48 hours for 7 doses. Today is the first day of this schedule.
   **Next dose due at 8pm tonight**

2) Famotidine 20mg tablets - Give 1 tablet by mouth every 24 hours while on prednisone.
   **Next dose due at 8am tomorrow morning**

3) Gabapentin 100mg capsules - Give 1-2 capsules by mouth every 8-12 hours for pain until otherwise advised. May cause sedation.
   **Next dose due at 4pm tonight**

4) Tramadol 50mg tablets - Give 1 tablet by mouth every 8-12 hours for pain until otherwise advised. May cause sedation.
   **Next dose due at 4pm tonight**

5) Hemp 28mg capsules - Give 2 capsules by mouth every 12 hours for 7 days, then give 1 capsules by mouth every 12 hours until otherwise advised. (Mobility)
   **Next dose due at 8pm tonight**

5) Hemp 28mg capsules - Give 3 capsules by mouth every 12 hours until otherwise advised. (Brain)
   **Next dose due at 8pm tonight**

6) Clavamox 375mg tablet - Give 1 tablet by mouth every 12 hours until finished. Give with food.
   **Next dose due at 8pm tonight**

7) Fentanyl patch - Please remove this on ********* as per the instructions below.`;
                      } else if (weight >= 31 && weight <= 39) {
                        protocol = `>30kg DISCHARGE MEDICATIONS:

1) Prednisone 5mg tablets - Give 2.5 tablets by mouth every 12 hours for 7 days, then give 2.5 tablets by mouth every 24 hours for 7 days, then give 2.5 tablets by mouth every 48 hours for 7 doses. Today is the first day of this schedule.
   **Next dose due at 8pm tonight**

2) Famotidine 20mg tablets - Give 1 tablet by mouth every 24 hours while on prednisone.
   **Next dose due at 8am tomorrow morning**

3) Gabapentin 100mg capsules - Give 1-2 capsules by mouth every 8-12 hours for pain until otherwise advised. May cause sedation.
   **Next dose due at 4pm tonight**

4) Tramadol 50mg tablets - Give 1.5-2 tablets by mouth every 8-12 hours for pain until otherwise advised. May cause sedation.
   **Next dose due at 4pm tonight**

5) Hemp 28mg capsules - Give 2 capsules by mouth every 12 hours for 7 days, then give 1 capsules by mouth every 12 hours until otherwise advised. (Mobility)
   **Next dose due at 8pm tonight**

5) Hemp 28mg capsules - Give 3 capsules by mouth every 12 hours until otherwise advised. (Brain)
   **Next dose due at 8pm tonight**

6) Cephalexin 500mg capsule - Give 2 capsules by mouth every 12 hours until finished. Give with food.
   **Next dose due at 8pm tonight**

7) Fentanyl patch - Please remove this on ********* as per the instructions below.`;
                      } else if (weight >= 40 && weight <= 54) {
                        protocol = `40-54kg DISCHARGE MEDICATIONS:

5) Hemp 37.5mg capsules - Give 2 capsules by mouth every 12 hours for 7 days, then give 1 capsules by mouth every 12 hours until otherwise advised. (Mobility)
   **Next dose due at 8pm tonight**

5) Hemp 37.5mg capsules - Give 3 capsules by mouth every 12 hours until otherwise advised. (Brain)
   **Next dose due at 8pm tonight**`;
                      } else if (weight >= 55) {
                        protocol = `>55kg DISCHARGE MEDICATIONS:

5) Hemp 37.5mg capsules - Give 3 capsules by mouth every 12 hours for 7 days, then give 2 capsules by mouth every 12 hours until otherwise advised. (Mobility)
   **Next dose due at 8pm tonight**

5) Hemp 37.5mg capsules - Give 4 capsules by mouth every 12 hours until otherwise advised. (Brain)
   **Next dose due at 8pm tonight**`;
                      }

                      return (
                        <div className="bg-slate-800 border border-pink-500/30 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-2">
                            <h5 className="font-bold text-pink-300">Discharge Protocol for {weight}kg</h5>
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(protocol);
                                toast({ title: '✅ Protocol copied to clipboard!' });
                              }}
                              className="px-3 py-1 bg-pink-600 hover:bg-pink-500 text-white rounded text-sm font-bold transition"
                            >
                              📋 Copy
                            </button>
                          </div>
                          <pre className="text-slate-200 text-xs whitespace-pre-wrap font-sans overflow-y-auto max-h-96">{protocol}</pre>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Batch Actions Bar */}
        {showBatchActions && (
          <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-40 bg-gradient-to-r from-cyan-600 to-blue-600 rounded-2xl shadow-2xl border border-cyan-400/50 p-4 min-w-[600px]">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="text-white font-bold">{selectedPatientIds.size} Selected</span>
                <button
                  onClick={selectAllPatients}
                  className="px-3 py-1 bg-white/20 hover:bg-white/30 text-white rounded text-sm font-bold transition"
                >
                  Select All
                </button>
                <button
                  onClick={clearSelection}
                  className="px-3 py-1 bg-white/20 hover:bg-white/30 text-white rounded text-sm font-bold transition"
                >
                  Clear
                </button>
              </div>

              <div className="flex items-center gap-2">
                {/* Mark All Tasks Done */}
                <button
                  onClick={batchMarkAllTasksDone}
                  className="px-3 py-1.5 bg-green-600 hover:bg-green-500 text-white rounded font-bold text-sm transition flex items-center gap-1"
                >
                  <CheckCircle2 size={14} />
                  Mark All Done
                </button>

                {/* Change Type Dropdown */}
                <select
                  onChange={(e) => {
                    if (e.target.value) {
                      batchChangeType(e.target.value as 'Medical' | 'MRI' | 'Surgery');
                      e.target.value = '';
                    }
                  }}
                  className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded font-bold text-sm transition cursor-pointer"
                >
                  <option value="">Change Type...</option>
                  <option value="Medical">→ Medical</option>
                  <option value="MRI">→ MRI</option>
                  <option value="Surgery">→ Surgery</option>
                </select>

                {/* Change Status Dropdown */}
                <select
                  onChange={(e) => {
                    if (e.target.value) {
                      batchChangeStatus(e.target.value as 'New' | 'Hospitalized' | 'Discharging');
                      e.target.value = '';
                    }
                  }}
                  className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded font-bold text-sm transition cursor-pointer"
                >
                  <option value="">Change Status...</option>
                  <option value="New">→ New</option>
                  <option value="Hospitalized">→ Hospitalized</option>
                  <option value="Discharging">→ Discharging</option>
                </select>

                {/* Add Task */}
                <button
                  onClick={() => {
                    const taskName = prompt('Enter task name to add to all selected patients:');
                    if (taskName) batchAddTask(taskName);
                  }}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded font-bold text-sm transition flex items-center gap-1"
                >
                  <Plus size={14} />
                  Add Task
                </button>

                {/* Discharge */}
                <button
                  onClick={batchDischarge}
                  className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded font-bold text-sm transition flex items-center gap-1"
                >
                  <Trash2 size={14} />
                  Discharge
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Discharge Instructions Modal */}
        {showDischargeInstructions && dischargingPatientId && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-slate-800 border-2 border-green-500 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-auto">
              {/* Header */}
              <div className="bg-gradient-to-r from-green-600 to-emerald-600 p-6 rounded-t-xl">
                <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                  <CheckCircle2 className="text-white" size={28} />
                  Discharge Instructions
                </h2>
                <p className="text-green-100 text-sm mt-1">
                  Patient: {patients.find(p => p.id === dischargingPatientId)?.demographics?.name || 'Unknown'}
                </p>
              </div>

              {/* Content */}
              <div className="p-6 space-y-4">
                <div className="bg-slate-900/50 border border-slate-700 rounded-xl p-4">
                  <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
                    📋 Discharge Tasks
                  </h3>
                  <div className="space-y-2">
                    {patients.find(p => p.id === dischargingPatientId)?.tasks
                      ?.filter((t: any) =>
                        (t.category === 'Discharge' ||
                         ['Final Discharge Exam', 'Prepare Discharge Medications', 'Review Home Care Instructions with Owner', 'Schedule Follow-up Appointment'].includes(t.title || t.name))
                      )
                      .map((task: any) => (
                        <div
                          key={task.id}
                          className="flex items-center gap-3 p-3 bg-slate-800/50 rounded-lg border border-slate-700"
                        >
                          <button
                            onClick={() => handleToggleTask(dischargingPatientId, task.id, task.completed)}
                            className="flex-shrink-0"
                          >
                            {task.completed ? (
                              <CheckCircle2 className="text-green-400" size={20} />
                            ) : (
                              <Circle className="text-slate-600 hover:text-green-400" size={20} />
                            )}
                          </button>
                          <div className="flex-1">
                            <p className={`font-medium ${task.completed ? 'line-through text-slate-500' : 'text-white'}`}>
                              {task.title || task.name}
                            </p>
                            {task.description && (
                              <p className="text-xs text-slate-400 mt-1">{task.description}</p>
                            )}
                          </div>
                        </div>
                      ))}
                  </div>
                </div>

                <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
                  <h3 className="text-lg font-bold text-blue-400 mb-2">💡 Discharge Checklist</h3>
                  <ul className="text-sm text-slate-300 space-y-2">
                    <li className="flex items-start gap-2">
                      <span className="text-blue-400">•</span>
                      <span>Review all discharge medications with owner</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-blue-400">•</span>
                      <span>Provide written home care instructions</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-blue-400">•</span>
                      <span>Schedule follow-up appointment</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-blue-400">•</span>
                      <span>Ensure owner has emergency contact information</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-blue-400">•</span>
                      <span>Verify owner understands all instructions</span>
                    </li>
                  </ul>
                </div>

                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4">
                  <h3 className="text-lg font-bold text-yellow-400 mb-2">⚠️ Important Reminders</h3>
                  <ul className="text-sm text-slate-300 space-y-2">
                    <li className="flex items-start gap-2">
                      <span className="text-yellow-400">•</span>
                      <span>Document discharge exam findings</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-yellow-400">•</span>
                      <span>Update medical records before discharge</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-yellow-400">•</span>
                      <span>Complete discharge summary</span>
                    </li>
                  </ul>
                </div>
              </div>

              {/* Footer */}
              <div className="p-6 bg-slate-900/50 border-t border-slate-700 flex justify-between gap-3">
                <button
                  onClick={() => {
                    setShowDischargeInstructions(false);
                    setDischargingPatientId(null);
                  }}
                  className="px-6 py-2.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-bold transition"
                >
                  Close
                </button>
                <button
                  onClick={async () => {
                    // Mark patient as fully discharged
                    try {
                      await apiClient.updatePatient(String(dischargingPatientId), { status: 'Discharging' });
                      toast({ title: '✅ Patient marked as Discharged' });
                      setShowDischargeInstructions(false);
                      setDischargingPatientId(null);
                      refetch();
                    } catch (error) {
                      toast({ variant: 'destructive', title: 'Error', description: 'Failed to update status' });
                    }
                  }}
                  className="px-6 py-2.5 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white rounded-lg font-bold transition shadow-lg shadow-green-500/20"
                >
                  Mark as Discharged
                </button>
              </div>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
