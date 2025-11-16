'use client';

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useAuth as useApiAuth, usePatients, useGeneralTasks, useCommonItems } from '@/hooks/use-api';
import { apiClient } from '@/lib/api-client';
import { parsePatientBlurb, analyzeBloodwork, analyzeRadiology, parseMedications, parseEzyVetBlock, determineScanType } from '@/lib/ai-parser';
import { Search, Plus, Loader2, LogOut, CheckCircle2, Circle, Trash2, Sparkles, Brain, Zap, ListTodo, FileSpreadsheet, BookOpen, FileText, Copy, ChevronDown, Camera, Upload, AlertTriangle, TableProperties, LayoutGrid, List as ListIcon, Award, Download, Tag } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { PatientListItem } from '@/components/PatientListItem';
import { DashboardStats } from '@/components/DashboardStats';
import { downloadAllStickersPDF, downloadBigLabelsPDF, downloadTinyLabelsPDF, printConsolidatedBigLabels, printConsolidatedTinyLabels } from '@/lib/pdf-generators/stickers';

export default function VetHub() {
  const { user, isLoading: authLoading, login, register, logout } = useApiAuth();
  const { patients, isLoading: patientsLoading, refetch } = usePatients();
  const { tasks: generalTasks, refetch: refetchGeneralTasks } = useGeneralTasks();
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
  const [showTaskOverview, setShowTaskOverview] = useState(false);
  const [taskViewMode, setTaskViewMode] = useState<'by-patient' | 'by-task' | 'general'>('by-patient');
  const [taskTimeFilter, setTaskTimeFilter] = useState<'day' | 'night' | 'all'>('all');
  const [quickTaskInput, setQuickTaskInput] = useState('');
  const [quickTaskPatient, setQuickTaskPatient] = useState<number | null>(null);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showMRISchedule, setShowMRISchedule] = useState(false);
  const [showAllTasksView, setShowAllTasksView] = useState(false);
  const [showAddPatientModal, setShowAddPatientModal] = useState(false);
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

  // Batch operations state
  const [selectedPatientIds, setSelectedPatientIds] = useState<Set<number>>(new Set());
  const [showBatchActions, setShowBatchActions] = useState(false);
  const [referenceSearch, setReferenceSearch] = useState('');

  // Debounced input state for MRI Schedule
  const [mriInputValues, setMriInputValues] = useState<Record<string, string>>({});
  const mriTimeoutRefs = useRef<Record<string, NodeJS.Timeout>>({});

  // Hide completed tasks toggle
  const [hideCompletedTasks, setHideCompletedTasks] = useState(false);

  // Mounted state to prevent hydration mismatch
  const [mounted, setMounted] = useState(false);

  // View mode (list vs grid) - persisted to localStorage
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

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

    return { total, completed, remaining: total - completed };
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
      const parsed = await parsePatientBlurb(patientBlurb);
      const patientName = parsed.patientName?.replace(/^Patient\s/i, '') || 'Unnamed';
      // AI now extracts owner last name directly, no need to split
      const ownerLastName = parsed.ownerName?.trim() || '';

      const fullName = ownerLastName ? `${patientName} ${ownerLastName}` : patientName;

      const morningTasks = ['Owner Called', 'Daily SOAP Done', 'Overnight Notes Checked'];
      const eveningTasks = ['Vet Radar Done', 'Rounding Sheet Done', 'Sticker on Daily Sheet'];

      const typeTasks = patientType === 'MRI'
        ? ['Black Book', 'Blood Work', 'Chest X-rays', 'MRI Anesthesia Sheet', 'MRI Meds Sheet', 'NPO', 'Print 5 Stickers', 'Print 1 Sheet Small Stickers']
        : patientType === 'Surgery'
        ? ['Surgery Slip', 'Written on Board', 'Print 4 Large Stickers', 'Print 2 Sheets Small Stickers', 'Print Surgery Sheet', 'Clear Daily']
        : ['Admission SOAP', 'Treatment Sheet Created'];

      // MRI patients don't get morning tasks
      const allTasks = patientType === 'MRI'
        ? [...eveningTasks, ...typeTasks]
        : [...morningTasks, ...eveningTasks, ...typeTasks];

      const patientData = {
        name: fullName,
        type: patientType,
        status: 'New Admit',
        added_time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        demographics: {
          name: parsed.patientName || fullName,
          patientId: parsed.patientId || '',        // Patient ID: 618383
          clientId: parsed.clientId || '',          // Consult # 5878668
          ownerName: parsed.ownerName || '',
          ownerPhone: parsed.ownerPhone || '',
          species: parsed.species || '',
          breed: parsed.breed || '',
          age: parsed.age || '',
          sex: parsed.sex || '',
          weight: parsed.weight || '',
          dateOfBirth: parsed.dateOfBirth || '',    // DOB
          colorMarkings: parsed.colorMarkings || '',
        },
        roundingData: {
          signalment: [parsed.age, parsed.sex, parsed.species, parsed.breed].filter(Boolean).join(' '),
          problems: parsed.problem || '',
          diagnosticFindings: parsed.bloodwork ? `CBC/CHEM: ${parsed.bloodwork}` : '',
          therapeutics: parsed.medications?.join('\n') || '',
          plan: parsed.plan || '',
        },
        mriData: {},
      };

      const newPatient = await apiClient.createPatient(patientData);

      for (const taskName of allTasks) {
        await apiClient.createTask(newPatient.id, {
          title: taskName,
          completed: false,
          date: new Date().toISOString().split('T')[0],
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

  const handleToggleTask = async (patientId: number, taskId: number, currentStatus: boolean) => {
    try {
      await apiClient.updateTask(String(patientId), String(taskId), { completed: !currentStatus });
      refetch();
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to update task' });
    }
  };

  const handleDeleteTask = async (patientId: number, taskId: number) => {
    try {
      await apiClient.deleteTask(String(patientId), String(taskId));
      refetch();
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to delete task' });
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
        date: new Date().toISOString().split('T')[0],
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

      // Auto-create discharge instruction task when status changes to "Discharging"
      if (newStatus === 'Discharging') {
        const patient = patients.find(p => p.id === patientId);
        const today = new Date().toISOString().split('T')[0];
        const existingTasks = patient?.tasks || [];
        const hasDischargeTask = existingTasks.some((t: any) =>
          (t.title || t.name) === 'Discharge Instructions' // No date check - tasks don't have date field
        );

        if (!hasDischargeTask) {
          await apiClient.createTask(String(patientId), {
            title: 'Discharge Instructions',
            completed: false,
            date: today,
          });
          toast({ title: '📋 Added: Discharge Instructions task' });
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

      // Auto-create tasks based on patient type using task engine templates
      if (['MRI', 'Surgery', 'Medical', 'Discharge'].includes(newType)) {
        const patient = patients.find(p => p.id === patientId);
        const patientName = patient?.demographics?.name || 'Unknown Patient';
        const existingTasks = patient?.tasks || [];

        // Get task templates for this patient type
        const { TASK_TEMPLATES_BY_PATIENT_TYPE } = await import('@/lib/task-engine');
        const templates = TASK_TEMPLATES_BY_PATIENT_TYPE[newType as 'MRI' | 'Surgery' | 'Medical' | 'Discharge'] || [];

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
              priority: template.priority,
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
        const taskCategory = getTaskCategory(t.title || t.name);
        return taskCategory === category && !t.completed;
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

      const morningTasks = ['Owner Called', 'Daily SOAP Done', 'Overnight Notes Checked'];
      const eveningTasks = ['Vet Radar Done', 'Rounding Sheet Done', 'Sticker on Daily Sheet'];

      const tasksToAdd = category === 'morning' ? morningTasks : eveningTasks;
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
      const activePatients = patients.filter(p => p.status !== 'Discharged');
      const morningTasks = ['Owner Called', 'Daily SOAP Done', 'Overnight Notes Checked'];
      const eveningTasks = ['Vet Radar Done', 'Rounding Sheet Done', 'Sticker on Daily Sheet'];
      const tasksToAdd = category === 'morning' ? morningTasks : eveningTasks;
      const today = new Date().toISOString().split('T')[0];

      let totalAdded = 0;

      for (const patient of activePatients) {
        const existingTasks = patient.tasks || [];

        for (const taskName of tasksToAdd) {
          const hasTask = existingTasks.some((t: any) =>
            (t.title || t.name) === taskName // No date check - tasks don't have date field
          );

          if (!hasTask) {
            await apiClient.createTask(String(patient.id), {
              title: taskName,
              completed: false,
              date: today,
            });
            totalAdded++;
          }
        }
      }

      if (totalAdded > 0) {
        toast({ title: `➕ Added ${totalAdded} ${category} tasks to ${activePatients.length} patients!` });
      } else {
        toast({ title: `All ${category} tasks already exist for today` });
      }
      refetch();
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: `Failed to batch add ${category} tasks` });
    }
  };

  // Debounced update for MRI Schedule inputs (prevents slowness)
  const debouncedMRIUpdate = useCallback((patientId: number, field: string, value: string, updateFn: () => Promise<void>) => {
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
        await updateFn();
      } catch (error) {
        console.error('Failed to update:', error);
      }
    }, 800);
  }, []);

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

  const handleToggleGeneralTask = async (taskId: number, currentStatus: boolean) => {
    try {
      await apiClient.updateGeneralTask(String(taskId), { completed: !currentStatus });
      refetchGeneralTasks();
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to update task' });
    }
  };

  const handleDeleteGeneralTask = async (taskId: number) => {
    try {
      await apiClient.deleteGeneralTask(String(taskId));
      toast({ title: '🗑️ General task deleted' });
      refetchGeneralTasks();
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to delete task' });
    }
  };

  const handleAddPatientTaskFromOverview = async () => {
    if (!newPatientTaskName.trim() || !selectedPatientForTask) return;

    try {
      await apiClient.createTask(String(selectedPatientForTask), {
        title: newPatientTaskName,
        completed: false,
        date: new Date().toISOString().split('T')[0],
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
          date: new Date().toISOString().split('T')[0],
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

      toast({ title: '✨ Magic parsing...', description: 'Claude is extracting all fields from EzyVet/Vet Radar' });
      const parsed = await parseEzyVetBlock(text);

      setRoundingFormData({
        ...roundingFormData,
        signalment: parsed.signalment || roundingFormData.signalment,
        problems: parsed.problems || roundingFormData.problems,
        diagnosticFindings: parsed.diagnosticFindings || roundingFormData.diagnosticFindings,
        therapeutics: parsed.therapeutics || roundingFormData.therapeutics,
        concerns: parsed.concerns || roundingFormData.concerns,
        comments: parsed.comments || roundingFormData.comments,
      });

      toast({ title: '✅ All fields filled!', description: 'Review and save when ready' });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to parse data. Try using the individual icons.' });
    }
  };

  const handleExportMRISchedule = () => {
    try {
      // Filter MRI patients with 'New Admit' status
      const mriPatients = patients.filter(p => p.type === 'MRI' && p.status === 'New Admit');

      if (mriPatients.length === 0) {
        toast({ variant: 'destructive', title: 'No MRI patients', description: 'No patients marked as MRI with New Admit status' });
        return;
      }

      // Build TSV data with header
      const header = 'Name\tPatient ID\tWeight (kg)\tScan Type';
      const rows = mriPatients.map((patient) => {
        const name = patient.demographics?.name || patient.name || '';
        const patientId = patient.demographics?.patientId || patient.demographics?.patientId || '';
        const weight = (patient.demographics?.weight || patient.demographics?.weight || '').replace(/[^\d.]/g, '');
        const scanType = patient.mriData?.scanType || '';

        return `${name}\t${patientId}\t${weight}\t${scanType}`;
      });

      const tsvContent = [header, ...rows].join('\n');

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
      const activePatients = patients.filter(p => p.status !== 'Discharged');

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
  const handlePrintAllStickers = async () => {
    try {
      const activePatients = patients.filter(p => p.status !== 'Discharged');

      if (activePatients.length === 0) {
        toast({ title: 'No active patients', description: 'Add patients to print stickers' });
        return;
      }

      // Check which patients have big label sticker data
      const patientsWithBigLabels = activePatients.filter(p => (p.stickerData?.bigLabelCount ?? 0) > 0);

      if (patientsWithBigLabels.length === 0 && activePatients.length === 0) {
        toast({
          title: 'No sticker data',
          description: 'Configure sticker counts in patient settings first'
        });
        return;
      }

      toast({
        title: 'Generating consolidated stickers...',
        description: `Creating PDFs for ${activePatients.length} patients`
      });

      // Generate and print consolidated big labels
      if (patientsWithBigLabels.length > 0) {
        await printConsolidatedBigLabels(patientsWithBigLabels as any);
        toast({
          title: '🏷️ Big Labels Ready',
          description: `Print dialog opened for ${patientsWithBigLabels.length} patients`
        });
      }

      // Small delay to avoid simultaneous print dialogs
      await new Promise(resolve => setTimeout(resolve, 500));

      // Generate and print consolidated tiny labels (4 per patient, always)
      if (activePatients.length > 0) {
        await printConsolidatedTinyLabels(activePatients as any);
        toast({
          title: '🏷️ Tiny Labels Ready',
          description: `Print dialog opened for ${activePatients.length} patients (4 labels each)`
        });
      }

    } catch (error) {
      console.error('Sticker generation error:', error);
      toast({ variant: 'destructive', title: 'Failed to generate stickers', description: String(error) });
    }
  };

  const handlePrintPatientStickers = async (patientId: number) => {
    try {
      const patient = patients.find(p => p.id === patientId);
      if (!patient) return;

      toast({ title: 'Generating stickers...', description: `Creating stickers for ${patient.demographics?.name || patient.name || 'Unnamed'}` });

      await downloadAllStickersPDF(patient as any);

      toast({
        title: '✅ Stickers Generated!',
        description: `Downloaded stickers for ${patient.demographics?.name || patient.name || 'Unnamed'}`
      });
    } catch (error) {
      console.error('Sticker generation error:', error);
      toast({ variant: 'destructive', title: 'Failed to generate stickers', description: String(error) });
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

  // Load and persist view mode from localStorage
  useEffect(() => {
    setMounted(true);
    const savedViewMode = localStorage.getItem('dashboardViewMode');
    if (savedViewMode === 'list' || savedViewMode === 'grid') {
      setViewMode(savedViewMode);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('dashboardViewMode', viewMode);
  }, [viewMode]);

  // Automatic daily task creation - runs when app loads on a new day
  const hasRunAutoCreation = useRef(false);

  useEffect(() => {
    const autoCreateDailyTasks = async () => {
      if (!patients || patients.length === 0) return;
      if (hasRunAutoCreation.current) return; // Prevent duplicate runs

      const today = new Date().toISOString().split('T')[0];
      const lastCheck = localStorage.getItem('lastDailyTaskCheck');

      // Only run if it's a new day
      if (lastCheck === today) {
        hasRunAutoCreation.current = true;
        return;
      }

      const activePatients = patients.filter(p => p.status !== 'Discharged');
      const morningTasks = ['Owner Called', 'Daily SOAP Done', 'Overnight Notes Checked'];
      const eveningTasks = ['Vet Radar Done', 'Rounding Sheet Done', 'Sticker on Daily Sheet'];
      const allDailyTasks = [...morningTasks, ...eveningTasks];

      let totalAdded = 0;

      for (const patient of activePatients) {
        const existingTasks = patient.tasks || [];

        for (const taskName of allDailyTasks) {
          const hasTask = existingTasks.some((t: any) =>
            (t.title || t.name) === taskName // No date check - tasks don't have date field
          );

          if (!hasTask) {
            try {
              await apiClient.createTask(String(patient.id), {
                name: taskName,
                completed: false,
                date: today,
              });
              totalAdded++;
            } catch (error) {
              console.error('Failed to create task:', error);
            }
          }
        }
      }

      // Mark today as checked
      localStorage.setItem('lastDailyTaskCheck', today);
      hasRunAutoCreation.current = true;

      if (totalAdded > 0) {
        refetch();
        toast({
          title: `🌅 Good Morning!`,
          description: `Auto-added ${totalAdded} tasks for ${activePatients.length} patients`
        });
      }
    };

    autoCreateDailyTasks();
  }, [patients.length]); // Run when patients are loaded

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

  const getTaskCategory = (taskName: string): 'morning' | 'evening' | 'general' => {
    const morningTasks = ['Owner Called', 'Daily SOAP Done', 'Overnight Notes Checked'];
    const eveningTasks = ['Vet Radar Done', 'Rounding Sheet Done', 'Sticker on Daily Sheet'];

    if (morningTasks.some(t => taskName.includes(t) || t.includes(taskName))) return 'morning';
    if (eveningTasks.some(t => taskName.includes(t) || t.includes(taskName))) return 'evening';
    return 'general';
  };

  const getTaskIcon = (category: string) => {
    if (category === 'morning') return '🌅';
    if (category === 'evening') return '🌙';
    return '📋';
  };

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
        const category = getTaskCategory(t.title || t.name);
        return category === 'morning' || category === 'general';
      });
    }
    if (taskTimeFilter === 'night') {
      return tasks.filter(t => {
        const category = getTaskCategory(t.title || t.name);
        return category === 'evening';
      });
    }
    return tasks;
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-emerald-900 to-slate-900 flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-cyan-400" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-emerald-900 to-slate-900 flex items-center justify-center p-4">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-1/2 -left-1/2 w-96 h-96 bg-cyan-500/20 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute -bottom-1/2 -right-1/2 w-96 h-96 bg-emerald-500/20 rounded-full blur-3xl animate-pulse"></div>
        </div>

        <div className="relative bg-slate-800/40 backdrop-blur-xl rounded-3xl shadow-2xl p-8 w-full max-w-md border border-slate-700/50">
          <div className="text-center mb-8">
            <div className="text-7xl mb-4 animate-bounce">🧠</div>
            <h1 className="text-5xl font-bold bg-gradient-to-r from-cyan-400 via-emerald-400 to-pink-400 bg-clip-text text-transparent">
              VetHub
            </h1>
            <p className="text-slate-400 mt-3 text-lg">AI-Powered Neuro Vet Portal 🐾</p>
          </div>

          <form onSubmit={handleAuth} className="space-y-4">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              required
              className="w-full px-4 py-3 rounded-xl bg-slate-900/50 border border-slate-600/50 text-white placeholder-slate-500 focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition"
            />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              required
              minLength={6}
              className="w-full px-4 py-3 rounded-xl bg-slate-900/50 border border-slate-600/50 text-white placeholder-slate-500 focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition"
            />

            {authError && <p className="text-red-400 text-sm">{authError}</p>}

            <button
              type="submit"
              className="w-full py-3 bg-gradient-to-r from-cyan-500 via-emerald-500 to-pink-500 text-white rounded-xl font-bold hover:scale-105 transition-transform shadow-lg shadow-emerald-500/50"
            >
              {isSignUp ? '✨ Create Account' : '🚀 Sign In'}
            </button>

            <button
              type="button"
              onClick={() => setIsSignUp(!isSignUp)}
              className="w-full text-sm text-slate-400 hover:text-cyan-400 transition"
            >
              {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-emerald-900 to-slate-900">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute top-1/2 right-1/3 w-72 h-72 bg-pink-500/10 rounded-full blur-3xl animate-pulse"></div>
      </div>

      <header className="relative bg-slate-800/40 backdrop-blur-xl border-b border-slate-700/50 sticky top-0 z-10 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="text-4xl animate-pulse">🧠</div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 via-emerald-400 to-pink-400 bg-clip-text text-transparent">
                VetHub
              </h1>
              <p className="text-xs text-slate-400">{user.email}</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => {
                setShowAllTasksView(!showAllTasksView);
                if (!showAllTasksView) {
                  setShowTaskOverview(false);
                  setShowMRISchedule(false);
                }
              }}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-lg font-bold hover:scale-105 transition-transform shadow-lg"
            >
              <CheckCircle2 size={18} />
              All Tasks
            </button>
            <Link
              href="/rounding"
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-lg font-bold hover:scale-105 transition-transform"
            >
              <FileSpreadsheet size={18} />
              All Rounds
            </Link>
            <Link
              href="/patient-import"
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-bold hover:scale-105 transition-transform"
            >
              <Download size={18} />
              Import from VetRadar
            </Link>
            <button
              onClick={() => setShowMRISchedule(!showMRISchedule)}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-500 to-cyan-500 text-white rounded-lg font-bold hover:scale-105 transition-transform"
            >
              <Brain size={18} />
              MRI Schedule
            </button>
            <button
              onClick={handlePrintAllStickers}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-lg font-bold hover:scale-105 transition-transform shadow-lg"
            >
              <Tag size={18} />
              Print All Stickers
            </button>
            <button
              onClick={() => setShowQuickReference(!showQuickReference)}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-lg font-bold hover:scale-105 transition-transform"
            >
              <BookOpen size={18} />
              Quick Reference
            </button>
            <Link
              href="/soap"
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-lg font-bold hover:scale-105 transition-transform"
            >
              <FileText size={18} />
              SOAP Builder
            </Link>
            <Link
              href="/appointments"
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-500 to-teal-500 text-white rounded-lg font-bold hover:scale-105 transition-transform"
            >
              <TableProperties size={18} />
              Appointment Schedule
            </Link>
            <Link
              href="/mri-builder"
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-lg font-bold hover:scale-105 transition-transform"
            >
              <Brain size={18} />
              MRI Builder
            </Link>
            <Link
              href="/residency"
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-pink-500 to-orange-500 text-white rounded-lg font-bold hover:scale-105 transition-transform"
            >
              <Award size={18} />
              Residency Tracker
            </Link>
            <button
              onClick={logout}
              className="flex items-center gap-2 px-4 py-2 text-slate-300 hover:text-red-400 transition rounded-lg hover:bg-red-500/10 border border-transparent hover:border-red-500/30"
            >
              <LogOut size={18} />
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="relative max-w-7xl mx-auto px-4 py-8 space-y-6">
        {/* Task Overview */}
        {showTaskOverview && (
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
                          const category = getTaskCategory(task.title || task.name);
                          const icon = getTaskIcon(category);
                          return (
                            <div
                              key={task.id}
                              className="flex items-center gap-1.5 text-xs group"
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
                    const category = getTaskCategory(taskName);
                    const icon = getTaskIcon(category);
                    const allCompleted = items.every(item => item.task.completed);

                    return (
                      <div key={taskName} className="bg-slate-900/50 rounded-lg p-2 border border-slate-700/50">
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="text-lg">{icon}</span>
                          <h3 className="text-white font-bold flex-1 text-sm">{taskName}</h3>
                          <span className={`text-xs ${allCompleted ? 'text-green-400' : 'text-slate-400'}`}>
                            {items.filter(i => i.task.completed).length}/{items.length}
                          </span>
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

        {/* All Tasks View - With Tabs */}
        {showAllTasksView && (
          <div className="bg-gradient-to-br from-cyan-900/40 to-blue-900/40 backdrop-blur-xl rounded-3xl shadow-2xl border border-cyan-700/50 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                <CheckCircle2 className="text-cyan-400" size={28} />
                All Tasks
              </h2>
              <div className="flex gap-2">
                {taskViewMode === 'general' && (
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
                {patients.filter(p => p.status !== 'Discharged' && (p.tasks?.length || 0) > 0).map(patient => {
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
                {patients.filter(p => p.status !== 'Discharged' && (p.tasks?.length || 0) > 0).length === 0 && (
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

                  patients.filter(p => p.status !== 'Discharged').forEach(patient => {
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
          </div>
        )}

        {/* MRI Schedule View */}
        {showMRISchedule && (
          <div className="bg-slate-800/40 backdrop-blur-xl rounded-3xl shadow-2xl border border-slate-700/50 p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Brain className="text-emerald-400" />
                MRI Schedule
              </h2>
              <button
                onClick={handleExportMRISchedule}
                className="px-3 py-2 bg-gradient-to-r from-emerald-500 to-cyan-500 text-white rounded-lg font-bold hover:scale-105 transition-transform text-sm"
              >
                📋 Copy to Clipboard
              </button>
            </div>
            <div className="overflow-x-auto max-h-[70vh]">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-slate-800 z-10">
                  <tr className="border-b-2 border-emerald-500">
                    <th className="text-left p-2 text-emerald-400 font-bold">Name</th>
                    <th className="text-left p-2 text-cyan-400 font-bold">Patient ID</th>
                    <th className="text-left p-2 text-emerald-400 font-bold">Weight (kg)</th>
                    <th className="text-left p-2 text-pink-400 font-bold">Scan Type</th>
                  </tr>
                </thead>
                <tbody>
                  {patients.filter(p => p.type === 'MRI' && p.status === 'New Admit').map((patient, idx) => {
                    const mriData = patient.mriData || {};
                    return (
                      <tr key={patient.id} className={`border-b border-slate-700/30 hover:bg-slate-700/50 ${idx % 2 === 0 ? 'bg-slate-900/30' : 'bg-slate-800/30'}`}>
                        <td className="p-2">
                          <button
                            onClick={() => {
                              setRoundingSheetPatient(patient.id);
                            }}
                            className="text-white font-medium hover:text-cyan-400 transition cursor-pointer underline decoration-dotted"
                          >
                            {patient.demographics?.name || patient.name || 'Unnamed'}
                          </button>
                        </td>
                        <td className="p-2">
                          <input
                            type="text"
                            value={mriInputValues[`${patient.id}-patientId`] ?? (patient.demographics?.patientId || patient.demographics?.patientId || '')}
                            onChange={(e) => {
                              debouncedMRIUpdate(patient.id, 'patientId', e.target.value, async () => {
                                const updatedInfo = { ...(patient.demographics || patient.demographics || {}), patientId: e.target.value };
                                await apiClient.updatePatient(String(patient.id), { demographics: updatedInfo });
                              });
                            }}
                            className="w-full bg-slate-900/50 border border-slate-700 rounded px-2 py-1 text-white text-sm"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="text"
                            value={mriInputValues[`${patient.id}-weight`] ?? ((patient.demographics?.weight || patient.demographics?.weight || '').toString().replace(/[^\d.]/g, ''))}
                            onChange={(e) => {
                              debouncedMRIUpdate(patient.id, 'weight', e.target.value, async () => {
                                const updatedInfo = { ...(patient.demographics || patient.demographics || {}), weight: e.target.value };
                                await apiClient.updatePatient(String(patient.id), { demographics: updatedInfo });
                              });
                            }}
                            className="w-full bg-slate-900/50 border border-slate-700 rounded px-2 py-1 text-white text-sm"
                            placeholder="kg"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="text"
                            value={mriInputValues[`${patient.id}-scanType`] ?? (mriData.scanType || '')}
                            onChange={(e) => {
                              debouncedMRIUpdate(patient.id, 'scanType', e.target.value, async () => {
                                const updatedMRI = { ...mriData, scanType: e.target.value };
                                await apiClient.updatePatient(String(patient.id), { mriData: updatedMRI });
                                refetch();
                              });
                            }}
                            className="w-full bg-slate-900/50 border border-slate-700 rounded px-2 py-1 text-white text-sm"
                            placeholder="Brain, LS, C-Spine..."
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {patients.filter(p => p.type === 'MRI' && p.status === 'New Admit').length === 0 && (
              <div className="text-center py-8 text-slate-400">
                No MRI patients with 'New Admit' status
              </div>
            )}
          </div>
        )}

        {/* Floating Add Patient Button */}
        <button
          onClick={() => setShowAddPatientModal(true)}
          className="fixed bottom-8 right-8 z-20 p-4 bg-gradient-to-r from-cyan-500 via-emerald-500 to-pink-500 text-white rounded-full shadow-2xl hover:scale-110 transition-transform flex items-center gap-2 font-bold"
        >
          <Plus size={24} />
          <span>Add Patient</span>
        </button>

        {/* Dashboard Stats Overview */}
        <DashboardStats patients={filteredPatients} onFilterClick={handleFilterClick} />

        {/* Search & Sort */}
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="🔍 Search patients..."
              className="w-full pl-12 pr-4 py-4 rounded-xl bg-slate-800/40 backdrop-blur-xl border border-slate-700/50 text-white placeholder-slate-500 focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-slate-400 text-sm whitespace-nowrap">Sort by:</span>
            <select
              value={patientSortBy}
              onChange={(e) => setPatientSortBy(e.target.value as 'name' | 'status' | 'type')}
              className="px-4 py-4 rounded-xl bg-slate-800/40 backdrop-blur-xl border border-slate-700/50 text-white focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition cursor-pointer"
            >
              <option value="name">Name</option>
              <option value="status">Status</option>
              <option value="type">Type</option>
            </select>
          </div>
          {/* View Mode Toggle */}
          <div className="flex items-center gap-2 bg-slate-800/40 backdrop-blur-xl border border-slate-700/50 rounded-xl p-1">
            <button
              onClick={() => setViewMode('list')}
              disabled={!mounted}
              className={`px-3 py-3 rounded-lg transition ${
                mounted && viewMode === 'list'
                  ? 'bg-cyan-500 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="List View"
            >
              <ListIcon size={20} />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              disabled={!mounted}
              className={`px-3 py-3 rounded-lg transition ${
                mounted && viewMode === 'grid'
                  ? 'bg-cyan-500 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Grid View"
            >
              <LayoutGrid size={20} />
            </button>
          </div>
        </div>

        {/* Today's Date Banner */}
        <div className="bg-gradient-to-r from-cyan-500/20 via-blue-500/20 to-purple-500/20 backdrop-blur-xl rounded-2xl shadow-xl border border-slate-700/50 p-3">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <span className="text-2xl">📅</span>
              <div>
                <h3 className="text-white font-bold text-lg">
                  {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </h3>
                <p className="text-slate-400 text-xs">Showing today's tasks only</p>
              </div>
            </div>
            <button
              onClick={() => setHideCompletedTasks(!hideCompletedTasks)}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                hideCompletedTasks
                  ? 'bg-green-600/80 text-white hover:bg-green-600'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              {hideCompletedTasks ? '✅ Show Completed' : '👁️ Hide Completed'}
            </button>
          </div>
        </div>

        {/* Batch Add Tasks - Above Patient Cards */}
        {filteredPatients.length > 0 && (
          <div className="bg-gradient-to-r from-yellow-500/20 via-orange-500/20 to-purple-500/20 backdrop-blur-xl rounded-2xl shadow-xl border border-slate-700/50 p-3">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <span className="text-lg">⚡</span>
                <div>
                  <h3 className="text-white font-bold text-sm">Batch Add Daily Tasks</h3>
                  <p className="text-slate-400 text-xs">Add tasks to all active patients at once</p>
                </div>
              </div>
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => handleBatchAddAllCategoryTasks('morning')}
                  className="px-3 py-1.5 bg-gradient-to-r from-yellow-600 to-orange-600 text-white rounded-lg text-xs font-bold hover:scale-105 transition-transform shadow-lg"
                >
                  ➕ Add Morning Tasks to All
                </button>
                <button
                  onClick={() => handleBatchAddAllCategoryTasks('evening')}
                  className="px-3 py-1.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg text-xs font-bold hover:scale-105 transition-transform shadow-lg"
                >
                  ➕ Add Evening Tasks to All
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Patients */}
        {!mounted || patientsLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
          </div>
        ) : filteredPatients.length === 0 ? (
          <div className="bg-slate-800/40 backdrop-blur-xl rounded-3xl shadow-2xl border border-slate-700/50 p-12 text-center">
            <div className="text-6xl mb-4">🐾</div>
            <p className="text-slate-400 text-lg">No patients yet. Add your first furry friend above!</p>
          </div>
        ) : viewMode === 'list' ? (
          /* LIST VIEW */
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
                  // Handle patient updates
                  apiClient.updatePatient(String(patient.id), { [field]: value }).then(() => refetch());
                }}
                onToggleTask={(taskId, completed) => handleToggleTask(patient.id, Number(taskId), completed)}
                onDeleteTask={(taskId) => handleDeleteTask(patient.id, Number(taskId))}
                onQuickAction={(action) => {
                  if (action === 'morning') handleCompleteAllCategory(patient.id, 'morning');
                  else if (action === 'evening') handleCompleteAllCategory(patient.id, 'evening');
                  else if (action === 'tasks') setQuickAddMenuPatient(patient.id);
                  else if (action === 'rounds') setRoundingSheetPatient(patient.id);
                }}
                onPrintStickers={() => handlePrintPatientStickers(patient.id)}
                getTaskCategory={getTaskCategory}
                hideCompletedTasks={hideCompletedTasks}
              />
            ))}
          </div>
        ) : (
          /* GRID VIEW */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredPatients.map((patient) => {
              const today = new Date().toISOString().split('T')[0];
              const allTasks = patient.tasks || [];
              const tasks = allTasks; // No date filtering - tasks don't have date field
              const completedTasks = tasks.filter((t: any) => t.completed).length;
              const totalTasks = tasks.length;
              const progress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
              const isExpanded = expandedPatient === patient.id;
              const info = patient.demographics || patient.demographics || {};
              const rounding = patient.roundingData || {};
              const emoji = getSpeciesEmoji(info.species);

              return (
                <div
                  key={patient.id}
                  id={`patient-${patient.id}`}
                  className="bg-slate-800/40 backdrop-blur-xl rounded-2xl shadow-xl border border-slate-700/50 overflow-hidden hover:shadow-cyan-500/20 hover:border-slate-600/50 transition-all"
                >
                  <div className="p-3">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          {/* Selection Checkbox */}
                          <input
                            type="checkbox"
                            checked={selectedPatientIds.has(patient.id)}
                            onChange={() => togglePatientSelection(patient.id)}
                            className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-cyan-500 focus:ring-cyan-500 focus:ring-2 cursor-pointer"
                          />
                          <span className="text-2xl">{emoji}</span>
                          <button
                            onClick={() => setExpandedPatient(isExpanded ? null : patient.id)}
                            className="text-lg font-bold text-white hover:text-cyan-400 transition cursor-pointer"
                          >
                            {patient.demographics?.name || patient.name || 'Unnamed'}
                          </button>
                          <select
                            value={patient.type || 'Medical'}
                            onChange={(e) => handleTypeChange(patient.id, e.target.value)}
                            className={`px-2 py-0.5 rounded-full text-xs font-bold bg-gradient-to-r ${getTypeColor(patient.type)} text-white shadow-lg border-0 cursor-pointer hover:opacity-90 transition`}
                          >
                            <option value="Medical">Medical</option>
                            <option value="MRI">MRI</option>
                            <option value="Surgery">Surgery</option>
                          </select>
                        </div>
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className="text-xs text-slate-500">Status:</span>
                          <select
                            value={patient.status || 'New Admit'}
                            onChange={(e) => handleStatusChange(patient.id, e.target.value)}
                            className="px-2 py-0.5 rounded text-xs font-bold bg-slate-700/50 border border-slate-600 text-white hover:bg-slate-700 transition cursor-pointer"
                          >
                            <option value="New Admit">New Admit</option>
                            <option value="Hospitalized">Hospitalized</option>
                            <option value="Discharging">Discharging</option>
                            <option value="Discharged">Discharged</option>
                          </select>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-slate-400">
                          {info.patientId && (
                            <span className="flex items-center gap-1">
                              <span className="text-slate-500">ID:</span>
                              <span className="text-slate-300 font-medium">{info.patientId}</span>
                            </span>
                          )}
                          {info.weight && (
                            <span className="flex items-center gap-1">
                              <span className="text-slate-500">Weight:</span>
                              <span className="text-slate-300 font-medium">{info.weight}</span>
                            </span>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeletePatient(patient.id)}
                        className="p-1 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>

                    {/* Progress */}
                    <div className="mb-2">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-slate-400">Tasks: {completedTasks}/{totalTasks}</span>
                        <span className="text-cyan-400 font-bold">{Math.round(progress)}%</span>
                      </div>
                      <div className="h-2 bg-slate-700/50 rounded-full overflow-hidden border border-slate-600/50">
                        <div
                          className={`h-full bg-gradient-to-r ${getTypeColor(patient.type)} transition-all duration-500`}
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>

                    {/* Quick Complete Morning/Evening Tasks */}
                    <div className="mb-2 flex gap-1.5 flex-wrap">
                      <button
                        onClick={() => handleCompleteAllCategory(patient.id, 'morning')}
                        className="px-2 py-1 bg-gradient-to-r from-yellow-500 to-orange-500 text-white rounded text-xs font-bold hover:scale-105 transition-transform"
                        title="Complete all morning tasks"
                      >
                        ✅ Morning
                      </button>
                      <button
                        onClick={() => handleCompleteAllCategory(patient.id, 'evening')}
                        className="px-2 py-1 bg-gradient-to-r from-indigo-500 to-emerald-500 text-white rounded text-xs font-bold hover:scale-105 transition-transform"
                        title="Complete all evening tasks"
                      >
                        ✅ Evening
                      </button>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <button
                        onClick={() => setExpandedPatient(isExpanded ? null : patient.id)}
                        className="text-cyan-400 text-xs font-bold hover:text-cyan-300 transition"
                      >
                        {isExpanded ? '🔼 Hide' : '🔽 Tasks'}
                      </button>
                      <button
                        onClick={() => setQuickAddMenuPatient(quickAddMenuPatient === patient.id ? null : patient.id)}
                        className="px-2 py-0.5 bg-gradient-to-r from-emerald-500 to-pink-500 text-white rounded text-xs font-bold hover:scale-105 transition-transform"
                      >
                        ➕ Task
                      </button>
                      <button
                        onClick={() => setRoundingSheetPatient(patient.id)}
                        className="px-2 py-0.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded text-xs font-bold hover:scale-105 transition-transform"
                      >
                        📋 Rounds
                      </button>
                    </div>

                    {/* Quick Add Task Menu */}
                    {quickAddMenuPatient === patient.id && (
                      <div className="mt-2 p-3 bg-slate-900/50 rounded-xl border border-slate-700/50">
                        <h5 className="text-white font-bold text-sm mb-2">Quick Add Common Tasks:</h5>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-1.5 mb-2">
                          {['Discharge Instructions', 'MRI Findings Inputted', 'Pre-op Bloodwork', 'Owner Update Call', 'Treatment Plan Updated', 'Recheck Scheduled', 'Consent Form', 'Estimate Approved', 'Referral Letter', 'Lab Results', 'Imaging Review', 'Progress Photos'].map(taskName => (
                            <button
                              key={taskName}
                              onClick={() => handleQuickAddTask(patient.id, taskName)}
                              className="px-2 py-1.5 bg-slate-800/50 hover:bg-cyan-500/20 border border-slate-700 hover:border-cyan-500 rounded text-slate-300 hover:text-cyan-300 text-xs transition"
                            >
                              {taskName}
                            </button>
                          ))}
                        </div>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={customTaskName}
                            onChange={(e) => setCustomTaskName(e.target.value)}
                            placeholder="Custom task name..."
                            className="flex-1 px-2 py-1.5 bg-slate-800/50 border border-slate-700 rounded text-white placeholder-slate-500 text-xs focus:ring-2 focus:ring-cyan-500"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && customTaskName.trim()) {
                                handleQuickAddTask(patient.id, customTaskName);
                              }
                            }}
                          />
                          <button
                            onClick={() => customTaskName.trim() && handleQuickAddTask(patient.id, customTaskName)}
                            disabled={!customTaskName.trim()}
                            className="px-3 py-1.5 bg-cyan-500 hover:bg-cyan-600 text-white rounded font-bold text-xs disabled:opacity-50 disabled:cursor-not-allowed transition"
                          >
                            Add
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Tasks - Grouped by Category */}
                  {isExpanded && (
                    <div className="border-t border-slate-700/50 p-3 bg-slate-900/30">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-white font-bold text-sm flex items-center gap-2">
                          <ListTodo size={16} className="text-cyan-400" />
                          Tasks ({completedTasks}/{totalTasks})
                        </h4>
                        <div className="flex gap-2 flex-wrap">
                          <button
                            onClick={() => handleCompleteAllCategory(patient.id, 'morning')}
                            className="px-3 py-1 bg-gradient-to-r from-yellow-500 to-orange-500 text-white rounded-lg text-xs font-bold hover:scale-105 transition-transform"
                            title="Complete all morning tasks"
                          >
                            ✅ Morning
                          </button>
                          <button
                            onClick={() => handleCompleteAllCategory(patient.id, 'evening')}
                            className="px-3 py-1 bg-gradient-to-r from-indigo-500 to-emerald-500 text-white rounded-lg text-xs font-bold hover:scale-105 transition-transform"
                            title="Complete all evening tasks"
                          >
                            ✅ Evening
                          </button>
                        </div>
                      </div>

                      {/* Morning Tasks */}
                      {tasks.filter((t: any) => getTaskCategory(t.title || t.name) === 'morning').filter((t: any) => !hideCompletedTasks || !t.completed).length > 0 && (
                        <div className="mb-3">
                          <h5 className="text-xs font-bold text-yellow-400 mb-1.5 flex items-center gap-2">
                            🌅 Morning Tasks
                          </h5>
                          <div className="space-y-1">
                            {tasks.filter((t: any) => getTaskCategory(t.title || t.name) === 'morning').filter((t: any) => !hideCompletedTasks || !t.completed).sort((a: any, b: any) => (a.title || a.name).localeCompare(b.title || b.name)).map((task: any) => (
                              <div
                                key={task.id}
                                className="flex items-center gap-2 px-2 py-1 rounded bg-slate-800/50 border border-slate-700/50 hover:border-yellow-500/50 transition group"
                              >
                                <button
                                  onClick={() => handleToggleTask(patient.id, task.id, task.completed)}
                                  className="flex-shrink-0"
                                >
                                  {task.completed ? (
                                    <CheckCircle2 className="text-green-400" size={16} />
                                  ) : (
                                    <Circle className="text-slate-600 group-hover:text-yellow-400" size={16} />
                                  )}
                                </button>
                                <span
                                  className={`flex-1 cursor-pointer text-xs ${task.completed ? 'line-through text-slate-500' : 'text-slate-200'}`}
                                  onClick={() => handleToggleTask(patient.id, task.id, task.completed)}
                                >
                                  {task.title || task.name}
                                </span>
                                <button
                                  onClick={() => handleDeleteTask(patient.id, task.id)}
                                  className="flex-shrink-0 p-0.5 text-slate-600 hover:text-red-400 hover:bg-red-500/10 rounded transition opacity-0 group-hover:opacity-100"
                                >
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Evening Tasks */}
                      {tasks.filter((t: any) => getTaskCategory(t.title || t.name) === 'evening').filter((t: any) => !hideCompletedTasks || !t.completed).length > 0 && (
                        <div className="mb-3">
                          <h5 className="text-xs font-bold text-indigo-400 mb-1.5 flex items-center gap-2">
                            🌙 Evening Tasks
                          </h5>
                          <div className="space-y-1">
                            {tasks.filter((t: any) => getTaskCategory(t.title || t.name) === 'evening').filter((t: any) => !hideCompletedTasks || !t.completed).sort((a: any, b: any) => (a.title || a.name).localeCompare(b.title || b.name)).map((task: any) => (
                              <div
                                key={task.id}
                                className="flex items-center gap-2 px-2 py-1 rounded bg-slate-800/50 border border-slate-700/50 hover:border-indigo-500/50 transition group"
                              >
                                <button
                                  onClick={() => handleToggleTask(patient.id, task.id, task.completed)}
                                  className="flex-shrink-0"
                                >
                                  {task.completed ? (
                                    <CheckCircle2 className="text-green-400" size={16} />
                                  ) : (
                                    <Circle className="text-slate-600 group-hover:text-indigo-400" size={16} />
                                  )}
                                </button>
                                <span
                                  className={`flex-1 cursor-pointer text-xs ${task.completed ? 'line-through text-slate-500' : 'text-slate-200'}`}
                                  onClick={() => handleToggleTask(patient.id, task.id, task.completed)}
                                >
                                  {task.title || task.name}
                                </span>
                                <button
                                  onClick={() => handleDeleteTask(patient.id, task.id)}
                                  className="flex-shrink-0 p-0.5 text-slate-600 hover:text-red-400 hover:bg-red-500/10 rounded transition opacity-0 group-hover:opacity-100"
                                >
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* General Tasks (MRI/Surgery/Conditional) */}
                      {tasks.filter((t: any) => getTaskCategory(t.title || t.name) === 'general').filter((t: any) => !hideCompletedTasks || !t.completed).length > 0 && (
                        <div>
                          <h5 className="text-xs font-bold text-cyan-400 mb-1.5 flex items-center gap-2">
                            📋 {patient.type} Tasks & Other
                          </h5>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-1">
                            {tasks.filter((t: any) => getTaskCategory(t.title || t.name) === 'general').filter((t: any) => !hideCompletedTasks || !t.completed).sort((a: any, b: any) => (a.title || a.name).localeCompare(b.title || b.name)).map((task: any) => (
                              <div
                                key={task.id}
                                className="flex items-center gap-2 px-2 py-1 rounded bg-slate-800/50 border border-slate-700/50 hover:border-cyan-500/50 transition group"
                              >
                                <button
                                  onClick={() => handleToggleTask(patient.id, task.id, task.completed)}
                                  className="flex-shrink-0"
                                >
                                  {task.completed ? (
                                    <CheckCircle2 className="text-green-400" size={16} />
                                  ) : (
                                    <Circle className="text-slate-600 group-hover:text-cyan-400" size={16} />
                                  )}
                                </button>
                                <span
                                  className={`flex-1 cursor-pointer text-xs ${task.completed ? 'line-through text-slate-500' : 'text-slate-200'}`}
                                  onClick={() => handleToggleTask(patient.id, task.id, task.completed)}
                                >
                                  {task.title || task.name}
                                </span>
                                <button
                                  onClick={() => handleDeleteTask(patient.id, task.id)}
                                  className="flex-shrink-0 p-0.5 text-slate-600 hover:text-red-400 hover:bg-red-500/10 rounded transition opacity-0 group-hover:opacity-100"
                                >
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Rounding Sheet Modal */}
        {roundingSheetPatient !== null && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-slate-800/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-slate-700/50 w-full max-w-7xl my-8">
              <div className="p-6 border-b border-slate-700/50">
                <div className="flex items-center justify-between">
                  <h3 className="text-2xl font-bold text-white flex items-center gap-2">
                    📋 Rounding Sheet
                    <span className="text-cyan-400">
                      {patients.find(p => p.id === roundingSheetPatient)?.name}
                    </span>
                    <button
                      onClick={() => handleCopySingleRoundingLine(roundingSheetPatient)}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-bold transition flex items-center gap-1"
                      title="Copy this patient's rounding line"
                    >
                      📋 Copy Line
                    </button>
                  </h3>
                  <button
                    onClick={() => setRoundingSheetPatient(null)}
                    className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition"
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
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-slate-800/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-slate-700/50 w-full max-w-2xl">
              <div className="p-6 border-b border-slate-700/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Brain className="text-cyan-400" size={28} />
                    <h3 className="text-2xl font-bold text-white">Add Patient</h3>
                    <Sparkles className="text-yellow-400 animate-pulse" size={20} />
                    <span className="px-2 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-cyan-500 to-emerald-500 text-white">
                      AI-POWERED
                    </span>
                  </div>
                  <button
                    onClick={() => setShowAddPatientModal(false)}
                    className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition"
                  >
                    ✕
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-4">
                <div className="flex gap-2">
                  {(['MRI', 'Surgery', 'Medical'] as const).map((type) => {
                    const emojis = { MRI: '🧠', Surgery: '🔪', Medical: '💊' };
                    return (
                      <button
                        key={type}
                        onClick={() => setPatientType(type)}
                        className={`px-4 py-2 rounded-lg font-bold transition-all text-sm ${
                          patientType === type
                            ? `bg-gradient-to-r ${getTypeColor(type)} text-white shadow-lg scale-105`
                            : 'bg-slate-700/50 text-slate-300 hover:bg-slate-700 border border-slate-600/50'
                        }`}
                      >
                        {emojis[type]} {type}
                      </button>
                    );
                  })}
                </div>

                <textarea
                  value={patientBlurb}
                  onChange={(e) => setPatientBlurb(e.target.value)}
                  placeholder="🐾 Paste patient info... Claude AI will extract everything! 🤖"
                  className="w-full px-4 py-3 rounded-xl bg-slate-900/50 border border-slate-600/50 text-white placeholder-slate-500 focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition resize-none"
                  rows={6}
                />

                <button
                  onClick={() => {
                    handleAddPatient();
                    setShowAddPatientModal(false);
                    setPatientBlurb('');
                  }}
                  disabled={isAddingPatient || !patientBlurb.trim()}
                  className="w-full py-3 bg-gradient-to-r from-cyan-500 via-emerald-500 to-pink-500 text-white rounded-xl font-bold hover:scale-105 transition-transform shadow-lg shadow-emerald-500/50 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-2"
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

        {/* Add General Task Modal */}
        {showAddGeneralTask && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-slate-800 rounded-2xl shadow-2xl border border-slate-700 max-w-md w-full">
              <div className="bg-gradient-to-r from-emerald-600 to-emerald-500 rounded-t-2xl p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ListTodo className="text-white" size={24} />
                    <span className="text-white font-bold text-lg">Add General Task</span>
                  </div>
                  <button
                    onClick={() => {
                      setShowAddGeneralTask(false);
                      setNewGeneralTaskName('');
                    }}
                    className="p-2 text-white hover:bg-emerald-700 rounded-lg transition"
                  >
                    ✕
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-4">
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
                  className="w-full px-4 py-3 rounded-xl bg-slate-900/50 border border-slate-600/50 text-white placeholder-slate-500 focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
                  autoFocus
                />

                <button
                  onClick={handleAddGeneralTask}
                  disabled={!newGeneralTaskName.trim()}
                  className="w-full py-3 bg-gradient-to-r from-emerald-600 to-emerald-500 text-white rounded-xl font-bold hover:scale-105 transition-transform shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-2"
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
            <div className="bg-slate-800 rounded-2xl shadow-2xl border border-slate-700 max-w-md w-full">
              <div className="bg-gradient-to-r from-cyan-600 to-cyan-500 rounded-t-2xl p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ListTodo className="text-white" size={24} />
                    <span className="text-white font-bold text-lg">Add Patient Task</span>
                  </div>
                  <button
                    onClick={() => {
                      setShowAddPatientTaskFromOverview(false);
                      setNewPatientTaskName('');
                      setSelectedPatientForTask(null);
                    }}
                    className="p-2 text-white hover:bg-cyan-700 rounded-lg transition"
                  >
                    ✕
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-bold text-slate-300 mb-2">Select Patient</label>
                  <select
                    value={selectedPatientForTask || ''}
                    onChange={(e) => setSelectedPatientForTask(Number(e.target.value))}
                    className="w-full px-4 py-3 rounded-xl bg-slate-900/50 border border-slate-600/50 text-white focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition"
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
                  <label className="block text-sm font-bold text-slate-300 mb-2">Task Name</label>
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
                    className="w-full px-4 py-3 rounded-xl bg-slate-900/50 border border-slate-600/50 text-white placeholder-slate-500 focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition"
                  />
                </div>

                <button
                  onClick={handleAddPatientTaskFromOverview}
                  disabled={!newPatientTaskName.trim() || !selectedPatientForTask}
                  className="w-full py-3 bg-gradient-to-r from-cyan-600 to-cyan-500 text-white rounded-xl font-bold hover:scale-105 transition-transform shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-2"
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


      </main>
    </div>
  );
}
