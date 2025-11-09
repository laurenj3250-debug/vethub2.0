'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useAuth as useApiAuth, usePatients, useGeneralTasks, useCommonItems } from '@/hooks/use-api';
import { apiClient } from '@/lib/api-client';
import { parsePatientBlurb, analyzeBloodwork, analyzeRadiology, parseMedications, parseEzyVetBlock, determineScanType } from '@/lib/ai-parser';
import { Search, Plus, Loader2, LogOut, CheckCircle2, Circle, Trash2, Sparkles, Brain, Zap, ListTodo, FileSpreadsheet, BookOpen, FileText, Copy } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

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
  const [expandedPatient, setExpandedPatient] = useState<number | null>(null);
  const [showTaskOverview, setShowTaskOverview] = useState(false);
  const [taskViewMode, setTaskViewMode] = useState<'by-patient' | 'by-task'>('by-patient');
  const [taskTimeFilter, setTaskTimeFilter] = useState<'day' | 'night' | 'all'>('all');
  const [quickTaskInput, setQuickTaskInput] = useState('');
  const [quickTaskPatient, setQuickTaskPatient] = useState<number | null>(null);
  const [showAllRoundingSheets, setShowAllRoundingSheets] = useState(false);
  const [showMRISchedule, setShowMRISchedule] = useState(false);
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

  // Calculate task stats (today only)
  const taskStats = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    let total = 0;
    let completed = 0;

    // Count patient tasks
    patients.forEach(patient => {
      const tasks = patient.tasks || [];
      const todayTasks = tasks.filter((t: any) => t.date === today);
      total += todayTasks.length;
      completed += todayTasks.filter((t: any) => t.completed).length;
    });

    // Count general tasks
    const todayGeneralTasks = generalTasks.filter((t: any) => t.date === today);
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
      let ownerLastName = '';

      if (parsed.ownerName) {
        const parts = parsed.ownerName.split(' ').filter(Boolean);
        ownerLastName = parts[parts.length - 1] || '';
      }

      const fullName = ownerLastName ? `${patientName} ${ownerLastName}` : patientName;

      const morningTasks = ['Owner Called', 'Daily SOAP Done', 'Overnight Notes Checked'];
      const eveningTasks = ['Vet Radar Done', 'Rounding Sheet Done', 'Sticker on Daily Sheet'];

      const typeTasks = patientType === 'MRI'
        ? ['Black Book', 'Blood Work', 'Chest X-rays', 'MRI Anesthesia Sheet', 'MRI Meds Sheet', 'NPO', 'Print 5 Stickers', 'Print 1 Sheet Small Stickers']
        : patientType === 'Surgery'
        ? ['Surgery Slip', 'Written on Board', 'Print 4 Large Stickers', 'Print 2 Sheets Small Stickers', 'Print Surgery Sheet', 'Clear Daily']
        : ['Admission SOAP', 'Treatment Sheet Created'];

      const allTasks = [...morningTasks, ...eveningTasks, ...typeTasks];

      const patientData = {
        name: fullName,
        type: patientType,
        status: 'New Admit',
        added_time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        patient_info: {
          patientId: parsed.patientId || '',
          ownerName: parsed.ownerName || '',
          ownerPhone: parsed.ownerPhone || '',
          species: parsed.species || '',
          breed: parsed.breed || '',
          age: parsed.age || '',
          sex: parsed.sex || '',
          weight: parsed.weight || '',
        },
        rounding_data: {
          signalment: [parsed.age, parsed.sex, parsed.breed].filter(Boolean).join(' '),
          problems: parsed.problem || '',
          diagnosticFindings: parsed.bloodwork ? `CBC/CHEM: ${parsed.bloodwork}` : '',
          therapeutics: parsed.medications?.join('\\n') || '',
          plan: parsed.plan || '',
        },
        mri_data: {},
      };

      const newPatient = await apiClient.createPatient(patientData);

      for (const taskName of allTasks) {
        await apiClient.createTask(newPatient.id, {
          name: taskName,
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

  const handleQuickAddTask = async (patientId: number, taskName: string) => {
    try {
      await apiClient.createTask(patientId, {
        name: taskName,
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
          t.name === 'Discharge Instructions' && t.date === today
        );

        if (!hasDischargeTask) {
          await apiClient.createTask(patientId, {
            name: 'Discharge Instructions',
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
      await apiClient.updatePatient(String(patientId), { type: newType });
      toast({ title: `✅ Type updated to ${newType}` });

      // Auto-create MRI tasks when type changes to "MRI"
      if (newType === 'MRI') {
        const patient = patients.find(p => p.id === patientId);
        const today = new Date().toISOString().split('T')[0];
        const existingTasks = patient?.tasks || [];

        const mriTasks = ['MRI Anesthesia Sheet', 'Blood Work', 'Chest X-rays', 'MRI Meds Sheet'];

        for (const taskName of mriTasks) {
          const hasTask = existingTasks.some((t: any) =>
            t.name === taskName && t.date === today
          );

          if (!hasTask) {
            await apiClient.createTask(patientId, {
              name: taskName,
              completed: false,
              date: today,
            });
          }
        }

        toast({ title: '📋 Added MRI tasks', description: 'MRI Anesthesia Sheet, Blood Work, Chest X-rays, MRI Meds Sheet' });
      }

      refetch();
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to update type' });
    }
  };

  const handleCompleteAllCategory = async (patientId: number, category: 'morning' | 'evening') => {
    try {
      const patient = patients.find(p => p.id === patientId);
      if (!patient) return;

      const tasks = patient.tasks || [];
      const categoryTasks = tasks.filter((t: any) => {
        const taskCategory = getTaskCategory(t.name);
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

  const handleSaveRoundingData = async () => {
    if (!roundingSheetPatient) return;

    try {
      await apiClient.updatePatient(String(roundingSheetPatient), {
        rounding_data: roundingFormData
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
        name: newGeneralTaskName,
        completed: false,
        date: new Date().toISOString().split('T')[0],
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
        const todayTasks = tasks.filter((t: any) => t.date === today && !t.completed);

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
              t.name === taskName && t.date === today
            );

            if (!hasTask) {
              await apiClient.createTask(patientId, {
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
        await apiClient.createTask(patientId, {
          name: taskName,
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
      await apiClient.createTask(selectedPatientForTask, {
        name: newPatientTaskName,
        completed: false,
        date: new Date().toISOString().split('T')[0],
      });
      const patient = patients.find(p => p.id === selectedPatientForTask);
      toast({ title: `✅ Added task to ${patient?.name}: ${newPatientTaskName}` });
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
        await apiClient.createTask(quickTaskPatient, {
          name: quickTaskInput,
          completed: false,
          date: new Date().toISOString().split('T')[0],
        });
        const patient = patients.find(p => p.id === quickTaskPatient);
        toast({ title: `✅ Added task to ${patient?.name}: ${quickTaskInput}` });
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
      const species = patient?.patient_info?.species || 'canine';

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
        const name = patient.name || '';
        const patientId = patient.patient_info?.patientId || '';
        const weight = (patient.patient_info?.weight || '').replace(/[^\d.]/g, '');
        const scanType = patient.mri_data?.scanType || '';

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

      const rounding = patient.rounding_data || {};

      const line = [
        patient.name || '',
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
        description: `${patient.name}'s rounding sheet line copied to clipboard`
      });
    } catch (error) {
      console.error('Copy line error:', error);
      toast({ variant: 'destructive', title: 'Copy failed', description: 'Could not copy line' });
    }
  };

  const handleExportRoundingSheets = () => {
    try {
      // Filter active patients (exclude Discharged)
      const activePatients = patients.filter(p => p.status !== 'Discharged');

      if (activePatients.length === 0) {
        toast({ variant: 'destructive', title: 'No active patients', description: 'No patients to export' });
        return;
      }

      // Build TSV with hospital format
      const header = 'Name\tSignalment\tLocation\tICU Criteria\tCode\tProblems\tDiagnostics\tTherapeutics\tIVC\tFluids\tCRI\tOvernight Dx\tConcerns\tComments';

      const rows = activePatients.map(patient => {
        const rounding = patient.rounding_data || {};

        return [
          patient.name || '',
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
      });

      const tsvContent = [header, ...rows].join('\n');

      // Copy to clipboard
      navigator.clipboard.writeText(tsvContent);

      toast({
        title: '✅ Rounding Sheets Copied!',
        description: `${activePatients.length} patients ready to paste into hospital spreadsheet`
      });
    } catch (error) {
      console.error('Rounding sheet export error:', error);
      toast({ variant: 'destructive', title: 'Export failed', description: 'Could not generate rounding sheets' });
    }
  };

  // Load rounding data when modal opens
  useEffect(() => {
    if (roundingSheetPatient !== null) {
      const patient = patients.find(p => p.id === roundingSheetPatient);
      if (patient) {
        setRoundingFormData(patient.rounding_data || {});
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
        // Suggest most recently used template
        const [neuroLoc] = mostRecent;
        console.log(`Hint: Your most recent template is ${neuroLoc}`);
      }
    }
  }, [showSOAPBuilder]);

  const filteredPatients = patients.filter(p =>
    p.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

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

  const filterTasksByTime = (tasks: any[]) => {
    if (taskTimeFilter === 'all') return tasks;
    if (taskTimeFilter === 'day') {
      return tasks.filter(t => {
        const category = getTaskCategory(t.name);
        return category === 'morning' || category === 'general';
      });
    }
    if (taskTimeFilter === 'night') {
      return tasks.filter(t => {
        const category = getTaskCategory(t.name);
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
              onClick={() => setShowTaskOverview(!showTaskOverview)}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-500 to-emerald-500 text-white rounded-lg font-bold hover:scale-105 transition-transform"
            >
              <ListTodo size={18} />
              Tasks: {taskStats.remaining}/{taskStats.total}
            </button>
            <button
              onClick={() => {
                setShowAllRoundingSheets(!showAllRoundingSheets);
                if (!showAllRoundingSheets) {
                  setShowTaskOverview(false);
                  setShowMRISchedule(false);
                }
              }}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-lg font-bold hover:scale-105 transition-transform"
            >
              <FileSpreadsheet size={18} />
              All Rounds
            </button>
            <button
              onClick={() => setShowMRISchedule(!showMRISchedule)}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-500 to-cyan-500 text-white rounded-lg font-bold hover:scale-105 transition-transform"
            >
              <Brain size={18} />
              MRI Schedule
            </button>
            <button
              onClick={() => setShowQuickReference(!showQuickReference)}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-lg font-bold hover:scale-105 transition-transform"
            >
              <BookOpen size={18} />
              Quick Reference
            </button>
            <button
              onClick={() => setShowSOAPBuilder(!showSOAPBuilder)}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-lg font-bold hover:scale-105 transition-transform"
            >
              <FileText size={18} />
              SOAP Builder
            </button>
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
                  {patients.map(patient => (
                    <option key={patient.id} value={patient.id}>{patient.name}</option>
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {/* General/Hospital-wide Tasks */}
                {(() => {
                  const today = new Date().toISOString().split('T')[0];
                  const todayGeneralTasks = generalTasks.filter((t: any) => t.date === today);
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
                                {task.name}
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
                {patients.map(patient => {
                  const today = new Date().toISOString().split('T')[0];
                  const todayTasks = (patient.tasks || []).filter((t: any) => t.date === today);
                  const tasks = filterTasksByTime(todayTasks);
                  if (tasks.length === 0) return null;
                  return (
                    <div key={patient.id} className="bg-slate-900/50 rounded-lg p-2 border border-slate-700/50">
                      <h3 className="text-white font-bold mb-1.5 text-sm">{patient.name}</h3>
                      <div className="space-y-1">
                        {tasks.map((task: any) => {
                          const category = getTaskCategory(task.name);
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
                                {task.name}
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
              <div className="space-y-2">
                {(() => {
                  const today = new Date().toISOString().split('T')[0];
                  const taskGroups: { [key: string]: Array<{ patient: any; task: any }> } = {};

                  patients.forEach(patient => {
                    const todayTasks = (patient.tasks || []).filter((t: any) => t.date === today);
                    const tasks = filterTasksByTime(todayTasks);
                    tasks.forEach((task: any) => {
                      if (!taskGroups[task.name]) {
                        taskGroups[task.name] = [];
                      }
                      taskGroups[task.name].push({ patient, task });
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
                          {items.map(({ patient, task }) => (
                            <button
                              key={`${patient.id}-${task.id}`}
                              onClick={() => handleToggleTask(patient.id, task.id, task.completed)}
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs ${
                                task.completed
                                  ? 'bg-green-500/20 text-green-300 line-through'
                                  : 'bg-slate-800/50 text-slate-300 hover:bg-slate-700/50'
                              }`}
                            >
                              {task.completed ? (
                                <CheckCircle2 size={12} />
                              ) : (
                                <Circle size={12} />
                              )}
                              {patient.name}
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            )}
          </div>
        )}

        {/* All Rounding Sheets View */}
        {showAllRoundingSheets && (
          <div className="bg-slate-800/40 backdrop-blur-xl rounded-3xl shadow-2xl border border-slate-700/50 p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <FileSpreadsheet className="text-emerald-400" />
                All Rounding Sheets
              </h2>
              <button
                onClick={handleExportRoundingSheets}
                className="px-3 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-lg font-bold hover:scale-105 transition-transform text-sm"
              >
                📋 Copy to Clipboard
              </button>
            </div>
            <div className="overflow-x-auto max-h-[85vh] overflow-y-auto">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-slate-800 z-10">
                  <tr className="border-b-2 border-emerald-500">
                    <th className="text-left p-1 text-emerald-400 font-bold">Name</th>
                    <th className="text-left p-1 text-cyan-400 font-bold">Signalment</th>
                    <th className="text-left p-1 text-emerald-400 font-bold">Location</th>
                    <th className="text-left p-1 text-pink-400 font-bold">ICU</th>
                    <th className="text-left p-1 text-yellow-400 font-bold">Code</th>
                    <th className="text-left p-1 text-red-400 font-bold">Problems</th>
                    <th className="text-left p-1 text-emerald-400 font-bold">Diagnostics</th>
                    <th className="text-left p-1 text-green-400 font-bold">Therapeutics</th>
                    <th className="text-left p-1 text-orange-400 font-bold">IVC</th>
                    <th className="text-left p-1 text-teal-400 font-bold">Fluids</th>
                    <th className="text-left p-1 text-indigo-400 font-bold">CRI</th>
                    <th className="text-left p-1 text-violet-400 font-bold">O/N Dx</th>
                    <th className="text-left p-1 text-rose-400 font-bold">Concerns</th>
                    <th className="text-left p-1 text-amber-400 font-bold">Comments</th>
                  </tr>
                </thead>
                <tbody>
                  {patients.filter(p => p.status !== 'Discharged').map((patient, idx) => {
                    const rounding = patient.rounding_data || {};
                    return (
                      <tr key={patient.id} className={`border-b border-slate-700/30 hover:bg-slate-700/50 ${idx % 2 === 0 ? 'bg-slate-900/30' : 'bg-slate-800/30'}`}>
                        <td className="p-1">
                          <button
                            onClick={() => {
                              setRoundingSheetPatient(patient.id);
                            }}
                            className="text-white font-medium text-xs hover:text-cyan-400 transition cursor-pointer underline decoration-dotted"
                          >
                            {patient.name}
                          </button>
                        </td>
                        <td className="p-1">
                          <input
                            type="text"
                            value={rounding.signalment || ''}
                            onChange={(e) => {
                              const updatedRounding = { ...rounding, signalment: e.target.value };
                              apiClient.updatePatient(String(patient.id), { rounding_data: updatedRounding });
                            }}
                            className="w-full bg-slate-900/50 border border-slate-700 rounded px-1.5 py-0.5 text-white text-xs"
                          />
                        </td>
                        <td className="p-1">
                          <input
                            type="text"
                            value={rounding.location || ''}
                            onChange={(e) => {
                              const updatedRounding = { ...rounding, location: e.target.value };
                              apiClient.updatePatient(String(patient.id), { rounding_data: updatedRounding });
                            }}
                            className="w-full bg-slate-900/50 border border-slate-700 rounded px-1.5 py-0.5 text-white text-xs"
                          />
                        </td>
                        <td className="p-1">
                          <input
                            type="text"
                            value={rounding.icuCriteria || ''}
                            onChange={(e) => {
                              const updatedRounding = { ...rounding, icuCriteria: e.target.value };
                              apiClient.updatePatient(String(patient.id), { rounding_data: updatedRounding });
                            }}
                            className="w-full bg-slate-900/50 border border-slate-700 rounded px-1.5 py-0.5 text-white text-xs"
                          />
                        </td>
                        <td className="p-1">
                          <select
                            value={rounding.code || 'Yellow'}
                            onChange={(e) => {
                              const updatedRounding = { ...rounding, code: e.target.value };
                              apiClient.updatePatient(String(patient.id), { rounding_data: updatedRounding });
                            }}
                            className="w-full bg-slate-900/50 border border-slate-700 rounded px-1.5 py-0.5 text-white text-xs"
                          >
                            <option>Green</option>
                            <option>Yellow</option>
                            <option>Orange</option>
                            <option>Red</option>
                          </select>
                        </td>
                        <td className="p-1">
                          <textarea
                            value={rounding.problems || ''}
                            onChange={(e) => {
                              const updatedRounding = { ...rounding, problems: e.target.value };
                              apiClient.updatePatient(String(patient.id), { rounding_data: updatedRounding });
                            }}
                            className="w-full bg-slate-900/50 border border-slate-700 rounded px-1.5 py-0.5 text-white text-xs resize-y min-h-[60px]"
                            rows={4}
                          />
                        </td>
                        <td className="p-1">
                          <textarea
                            value={rounding.diagnosticFindings || ''}
                            onChange={(e) => {
                              const updatedRounding = { ...rounding, diagnosticFindings: e.target.value };
                              apiClient.updatePatient(String(patient.id), { rounding_data: updatedRounding });
                            }}
                            className="w-full bg-slate-900/50 border border-slate-700 rounded px-1.5 py-0.5 text-white text-xs resize-y min-h-[80px]"
                            rows={5}
                          />
                        </td>
                        <td className="p-1 relative">
                          <div className="flex gap-1">
                            <textarea
                              value={rounding.therapeutics || ''}
                              onChange={(e) => {
                                const updatedRounding = { ...rounding, therapeutics: e.target.value };
                                apiClient.updatePatient(String(patient.id), { rounding_data: updatedRounding });
                              }}
                              className="flex-1 bg-slate-900/50 border border-slate-700 rounded px-1.5 py-0.5 text-white text-xs resize-y min-h-[80px]"
                              rows={5}
                            />
                            <button
                              onClick={() => setShowMedicationSelector(showMedicationSelector === patient.id ? null : patient.id)}
                              className="px-1.5 py-0.5 bg-emerald-500/20 hover:bg-emerald-500/40 text-emerald-300 rounded text-xs h-fit"
                              title="Add common medications"
                            >
                              +
                            </button>
                          </div>
                          {showMedicationSelector === patient.id && (
                            <div className="absolute z-20 mt-1 bg-slate-800 border border-slate-600 rounded-lg shadow-xl p-2 max-h-48 overflow-y-auto" style={{ minWidth: '200px' }}>
                              <div className="text-xs text-slate-300 font-bold mb-1">Common Medications:</div>
                              {commonMedications.map((med: any) => (
                                <button
                                  key={med.id}
                                  onClick={() => {
                                    const currentMeds = rounding.therapeutics || '';
                                    const newMeds = currentMeds ? `${currentMeds}\n${med.name}` : med.name;
                                    const updatedRounding = { ...rounding, therapeutics: newMeds };
                                    apiClient.updatePatient(String(patient.id), { rounding_data: updatedRounding });
                                  }}
                                  className="block w-full text-left px-2 py-1 text-xs text-white hover:bg-slate-700 rounded"
                                >
                                  {med.name}
                                </button>
                              ))}
                            </div>
                          )}
                        </td>
                        <td className="p-1">
                          <select
                            value={rounding.ivc || ''}
                            onChange={(e) => {
                              const updatedRounding = { ...rounding, ivc: e.target.value };
                              apiClient.updatePatient(String(patient.id), { rounding_data: updatedRounding });
                            }}
                            className="w-full bg-slate-900/50 border border-slate-700 rounded px-1 py-0.5 text-white text-xs"
                          >
                            <option value="">-</option>
                            <option value="Y">Y</option>
                            <option value="N">N</option>
                            <option value="Yes but...">Yes but...</option>
                            <option value="Not but...">Not but...</option>
                          </select>
                        </td>
                        <td className="p-1">
                          <select
                            value={rounding.fluids || ''}
                            onChange={(e) => {
                              const updatedRounding = { ...rounding, fluids: e.target.value };
                              apiClient.updatePatient(String(patient.id), { rounding_data: updatedRounding });
                            }}
                            className="w-full bg-slate-900/50 border border-slate-700 rounded px-1 py-0.5 text-white text-xs"
                          >
                            <option value="">-</option>
                            <option value="Y">Y</option>
                            <option value="N">N</option>
                            <option value="Yes but...">Yes but...</option>
                            <option value="Not but...">Not but...</option>
                          </select>
                        </td>
                        <td className="p-1">
                          <select
                            value={rounding.cri || ''}
                            onChange={(e) => {
                              const updatedRounding = { ...rounding, cri: e.target.value };
                              apiClient.updatePatient(String(patient.id), { rounding_data: updatedRounding });
                            }}
                            className="w-full bg-slate-900/50 border border-slate-700 rounded px-1 py-0.5 text-white text-xs"
                          >
                            <option value="">-</option>
                            <option value="Y">Y</option>
                            <option value="N">N</option>
                            <option value="Yes but...">Yes but...</option>
                            <option value="Not but...">Not but...</option>
                          </select>
                        </td>
                        <td className="p-1">
                          <textarea
                            value={rounding.overnightDx || ''}
                            onChange={(e) => {
                              const updatedRounding = { ...rounding, overnightDx: e.target.value };
                              apiClient.updatePatient(String(patient.id), { rounding_data: updatedRounding });
                            }}
                            className="w-full bg-slate-900/50 border border-slate-700 rounded px-1.5 py-0.5 text-white text-xs resize-y min-h-[50px]"
                            rows={3}
                          />
                        </td>
                        <td className="p-1">
                          <textarea
                            value={rounding.concerns || ''}
                            onChange={(e) => {
                              const updatedRounding = { ...rounding, concerns: e.target.value };
                              apiClient.updatePatient(String(patient.id), { rounding_data: updatedRounding });
                            }}
                            className="w-full bg-slate-900/50 border border-slate-700 rounded px-1.5 py-0.5 text-white text-xs resize-y min-h-[50px]"
                            rows={3}
                          />
                        </td>
                        <td className="p-1">
                          <textarea
                            value={rounding.comments || ''}
                            onChange={(e) => {
                              const updatedRounding = { ...rounding, comments: e.target.value };
                              apiClient.updatePatient(String(patient.id), { rounding_data: updatedRounding });
                            }}
                            className="w-full bg-slate-900/50 border border-slate-700 rounded px-1.5 py-0.5 text-white text-xs resize-y min-h-[50px]"
                            rows={3}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
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
                    const mriData = patient.mri_data || {};
                    return (
                      <tr key={patient.id} className={`border-b border-slate-700/30 hover:bg-slate-700/50 ${idx % 2 === 0 ? 'bg-slate-900/30' : 'bg-slate-800/30'}`}>
                        <td className="p-2">
                          <button
                            onClick={() => {
                              setRoundingSheetPatient(patient.id);
                            }}
                            className="text-white font-medium hover:text-cyan-400 transition cursor-pointer underline decoration-dotted"
                          >
                            {patient.name}
                          </button>
                        </td>
                        <td className="p-2">
                          <input
                            type="text"
                            value={patient.patient_info?.patientId || ''}
                            onChange={(e) => {
                              const updatedInfo = { ...patient.patient_info, patientId: e.target.value };
                              apiClient.updatePatient(String(patient.id), { patient_info: updatedInfo });
                            }}
                            className="w-full bg-slate-900/50 border border-slate-700 rounded px-2 py-1 text-white text-sm"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="text"
                            value={(patient.patient_info?.weight || '').replace(/[^\d.]/g, '')}
                            onChange={(e) => {
                              const updatedInfo = { ...patient.patient_info, weight: e.target.value };
                              apiClient.updatePatient(String(patient.id), { patient_info: updatedInfo });
                            }}
                            className="w-full bg-slate-900/50 border border-slate-700 rounded px-2 py-1 text-white text-sm"
                            placeholder="kg"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="text"
                            value={mriData.scanType || ''}
                            onChange={(e) => {
                              const updatedMRI = { ...mriData, scanType: e.target.value };
                              apiClient.updatePatient(String(patient.id), { mri_data: updatedMRI });
                              refetch();
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

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="🔍 Search patients..."
            className="w-full pl-12 pr-4 py-4 rounded-xl bg-slate-800/40 backdrop-blur-xl border border-slate-700/50 text-white placeholder-slate-500 focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition"
          />
        </div>

        {/* Hospital-Wide General Tasks */}
        {(() => {
          const today = new Date().toISOString().split('T')[0];
          const todayGeneralTasks = generalTasks.filter((t: any) => t.date === today);
          if (todayGeneralTasks.length > 0) {
            return (
              <div className="bg-gradient-to-r from-emerald-900/40 to-teal-900/40 backdrop-blur-xl rounded-2xl shadow-2xl border border-emerald-700/50 p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-bold text-emerald-300 flex items-center gap-2">
                    <ListTodo className="text-emerald-400" size={20} />
                    Hospital-Wide Tasks (Today)
                  </h3>
                  <button
                    onClick={() => setShowAddGeneralTask(true)}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition flex items-center gap-1"
                  >
                    <Plus size={14} />
                    Add
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                  {todayGeneralTasks.map((task: any) => (
                    <div
                      key={task.id}
                      className="flex items-center gap-2 p-2 rounded-lg bg-slate-900/50 border border-emerald-700/30 hover:border-emerald-500/50 transition group"
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
                        {task.name}
                      </span>
                      <button
                        onClick={() => handleDeleteGeneralTask(task.id)}
                        className="flex-shrink-0 p-1 text-slate-600 hover:text-red-400 hover:bg-red-500/10 rounded transition opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            );
          }
          return null;
        })()}

        {/* Patients */}
        {patientsLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
          </div>
        ) : filteredPatients.length === 0 ? (
          <div className="bg-slate-800/40 backdrop-blur-xl rounded-3xl shadow-2xl border border-slate-700/50 p-12 text-center">
            <div className="text-6xl mb-4">🐾</div>
            <p className="text-slate-400 text-lg">No patients yet. Add your first furry friend above!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredPatients.map((patient) => {
              const tasks = patient.tasks || [];
              const completedTasks = tasks.filter((t: any) => t.completed).length;
              const totalTasks = tasks.length;
              const progress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
              const isExpanded = expandedPatient === patient.id;
              const info = patient.patient_info || {};
              const rounding = patient.rounding_data || {};
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
                            {patient.name}
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
                      <div className="mt-4 p-4 bg-slate-900/50 rounded-xl border border-slate-700/50">
                        <h5 className="text-white font-bold mb-3">Quick Add Common Tasks:</h5>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-3">
                          {['Discharge Instructions', 'MRI Findings Inputted', 'Pre-op Bloodwork', 'Owner Update Call', 'Treatment Plan Updated', 'Recheck Scheduled'].map(taskName => (
                            <button
                              key={taskName}
                              onClick={() => handleQuickAddTask(patient.id, taskName)}
                              className="px-3 py-2 bg-slate-800/50 hover:bg-cyan-500/20 border border-slate-700 hover:border-cyan-500 rounded-lg text-slate-300 hover:text-cyan-300 text-sm transition"
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
                            className="flex-1 px-3 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-white placeholder-slate-500 text-sm focus:ring-2 focus:ring-cyan-500"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && customTaskName.trim()) {
                                handleQuickAddTask(patient.id, customTaskName);
                              }
                            }}
                          />
                          <button
                            onClick={() => customTaskName.trim() && handleQuickAddTask(patient.id, customTaskName)}
                            disabled={!customTaskName.trim()}
                            className="px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg font-bold text-sm disabled:opacity-50 disabled:cursor-not-allowed transition"
                          >
                            Add
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Tasks - Grouped by Category */}
                  {isExpanded && (
                    <div className="border-t border-slate-700/50 p-6 bg-slate-900/30">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="text-white font-bold flex items-center gap-2">
                          <ListTodo size={18} className="text-cyan-400" />
                          Tasks ({completedTasks}/{totalTasks})
                        </h4>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleCompleteAllCategory(patient.id, 'morning')}
                            className="px-3 py-1 bg-gradient-to-r from-yellow-500 to-orange-500 text-white rounded-lg text-xs font-bold hover:scale-105 transition-transform"
                          >
                            ✅ All Morning
                          </button>
                          <button
                            onClick={() => handleCompleteAllCategory(patient.id, 'evening')}
                            className="px-3 py-1 bg-gradient-to-r from-indigo-500 to-emerald-500 text-white rounded-lg text-xs font-bold hover:scale-105 transition-transform"
                          >
                            ✅ All Evening
                          </button>
                        </div>
                      </div>

                      {/* Morning Tasks */}
                      {tasks.filter((t: any) => getTaskCategory(t.name) === 'morning').length > 0 && (
                        <div className="mb-4">
                          <h5 className="text-sm font-bold text-yellow-400 mb-2 flex items-center gap-2">
                            🌅 Morning Tasks
                          </h5>
                          <div className="space-y-2">
                            {tasks.filter((t: any) => getTaskCategory(t.name) === 'morning').map((task: any) => (
                              <div
                                key={task.id}
                                className="flex items-center gap-2 p-2 rounded-lg bg-slate-800/50 border border-slate-700/50 hover:border-yellow-500/50 transition group"
                              >
                                <button
                                  onClick={() => handleToggleTask(patient.id, task.id, task.completed)}
                                  className="flex-shrink-0"
                                >
                                  {task.completed ? (
                                    <CheckCircle2 className="text-green-400" size={20} />
                                  ) : (
                                    <Circle className="text-slate-600 group-hover:text-yellow-400" size={20} />
                                  )}
                                </button>
                                <span
                                  className={`flex-1 cursor-pointer text-sm ${task.completed ? 'line-through text-slate-500' : 'text-slate-200 font-medium'}`}
                                  onClick={() => handleToggleTask(patient.id, task.id, task.completed)}
                                >
                                  {task.name}
                                </span>
                                <button
                                  onClick={() => handleDeleteTask(patient.id, task.id)}
                                  className="flex-shrink-0 p-1 text-slate-600 hover:text-red-400 hover:bg-red-500/10 rounded transition opacity-0 group-hover:opacity-100"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Evening Tasks */}
                      {tasks.filter((t: any) => getTaskCategory(t.name) === 'evening').length > 0 && (
                        <div className="mb-4">
                          <h5 className="text-sm font-bold text-indigo-400 mb-2 flex items-center gap-2">
                            🌙 Evening Tasks
                          </h5>
                          <div className="space-y-2">
                            {tasks.filter((t: any) => getTaskCategory(t.name) === 'evening').map((task: any) => (
                              <div
                                key={task.id}
                                className="flex items-center gap-2 p-2 rounded-lg bg-slate-800/50 border border-slate-700/50 hover:border-indigo-500/50 transition group"
                              >
                                <button
                                  onClick={() => handleToggleTask(patient.id, task.id, task.completed)}
                                  className="flex-shrink-0"
                                >
                                  {task.completed ? (
                                    <CheckCircle2 className="text-green-400" size={20} />
                                  ) : (
                                    <Circle className="text-slate-600 group-hover:text-indigo-400" size={20} />
                                  )}
                                </button>
                                <span
                                  className={`flex-1 cursor-pointer text-sm ${task.completed ? 'line-through text-slate-500' : 'text-slate-200 font-medium'}`}
                                  onClick={() => handleToggleTask(patient.id, task.id, task.completed)}
                                >
                                  {task.name}
                                </span>
                                <button
                                  onClick={() => handleDeleteTask(patient.id, task.id)}
                                  className="flex-shrink-0 p-1 text-slate-600 hover:text-red-400 hover:bg-red-500/10 rounded transition opacity-0 group-hover:opacity-100"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* General Tasks (MRI/Surgery/Conditional) */}
                      {tasks.filter((t: any) => getTaskCategory(t.name) === 'general').length > 0 && (
                        <div>
                          <h5 className="text-sm font-bold text-cyan-400 mb-2 flex items-center gap-2">
                            📋 {patient.type} Tasks & Other
                          </h5>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            {tasks.filter((t: any) => getTaskCategory(t.name) === 'general').map((task: any) => (
                              <div
                                key={task.id}
                                className="flex items-center gap-2 p-2 rounded-lg bg-slate-800/50 border border-slate-700/50 hover:border-cyan-500/50 transition group"
                              >
                                <button
                                  onClick={() => handleToggleTask(patient.id, task.id, task.completed)}
                                  className="flex-shrink-0"
                                >
                                  {task.completed ? (
                                    <CheckCircle2 className="text-green-400" size={20} />
                                  ) : (
                                    <Circle className="text-slate-600 group-hover:text-cyan-400" size={20} />
                                  )}
                                </button>
                                <span
                                  className={`flex-1 cursor-pointer text-sm ${task.completed ? 'line-through text-slate-500' : 'text-slate-200 font-medium'}`}
                                  onClick={() => handleToggleTask(patient.id, task.id, task.completed)}
                                >
                                  {task.name}
                                </span>
                                <button
                                  onClick={() => handleDeleteTask(patient.id, task.id)}
                                  className="flex-shrink-0 p-1 text-slate-600 hover:text-red-400 hover:bg-red-500/10 rounded transition opacity-0 group-hover:opacity-100"
                                >
                                  <Trash2 size={14} />
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
                  const info = patient.patient_info || {};
                  const rounding = patient.rounding_data || {};

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
                            list="common-problems"
                            value={roundingFormData.problems || ''}
                            onChange={(e) => setRoundingFormData({...roundingFormData, problems: e.target.value})}
                            className="w-full px-3 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-white text-sm focus:ring-2 focus:ring-cyan-500 resize-y"
                            placeholder="Type or select from dropdown"
                            rows={6}
                          />
                          <datalist id="common-problems">
                            {commonProblems.map(p => <option key={p} value={p} />)}
                          </datalist>
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
                          list="common-concerns"
                          value={roundingFormData.concerns || ''}
                          onChange={(e) => setRoundingFormData({...roundingFormData, concerns: e.target.value})}
                          className="w-full px-3 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-white text-sm focus:ring-2 focus:ring-cyan-500 resize-y"
                          placeholder="Type or select from dropdown"
                          rows={5}
                        />
                        <datalist id="common-concerns">
                          {commonConcerns.map(c => <option key={c} value={c} />)}
                        </datalist>
                      </div>

                      {/* Row 8: Comments */}
                      <div>
                        <label className="text-xs text-slate-400 uppercase block mb-1">Comments</label>
                        <textarea
                          list="common-comments"
                          value={roundingFormData.comments || ''}
                          onChange={(e) => setRoundingFormData({...roundingFormData, comments: e.target.value})}
                          className="w-full px-3 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-white text-sm focus:ring-2 focus:ring-cyan-500 resize-y"
                          placeholder="Type or select common comment"
                          rows={5}
                        />
                        <datalist id="common-comments">
                          {commonComments.map(c => <option key={c} value={c} />)}
                        </datalist>
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
                    {patients.map(patient => (
                      <option key={patient.id} value={patient.id}>
                        {patient.name}
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

        {/* SOAP Builder Modal */}
        {showSOAPBuilder && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-slate-800/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-700/50 w-full max-w-6xl max-h-[90vh] flex flex-col">
              <div className="p-3 border-b border-slate-700 flex-shrink-0">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent flex items-center gap-2">
                    <FileText size={24} />
                    SOAP Builder
                  </h2>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        const savedExams = getSavedExams();
                        const count = Object.keys(savedExams).length;

                        if (count === 0) {
                          alert('No saved exam templates yet. Complete and copy a SOAP note to save it!');
                          return;
                        }

                        const message = `You have ${count} saved exam template(s):\n\n` +
                          Object.entries(savedExams).map(([neuroLoc, data]: [string, any]) =>
                            `• ${neuroLoc} (${new Date(data.savedAt).toLocaleDateString()})`
                          ).join('\n') +
                          '\n\nClear all saved templates?';

                        if (confirm(message)) {
                          localStorage.removeItem('soapMemory');
                          toast({ title: 'All saved exam templates cleared!' });
                        }
                      }}
                      className="px-2 py-1 text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 rounded"
                    >
                      Manage Templates
                    </button>
                    <button
                      onClick={() => setShowPasteModal(true)}
                      className="px-3 py-1 text-xs font-bold rounded flex items-center gap-1 bg-blue-600 hover:bg-blue-500 text-white"
                    >
                      <Sparkles size={14} />
                      Paste & Parse
                    </button>
                    <button
                      onClick={() => {
                        if (confirm('Clear all fields in SOAP Builder?')) {
                          setSOAPData({
                            name: '', age: '', sex: '', breed: '', species: 'Canine', reasonForVisit: '', visitType: 'recheck',
                            lastVisit: '', currentHistory: '', csvd: 'none', pupd: 'none', appetite: 'normal', lastMRI: '', medications: '', prevDiagnostics: '',
                            whyHereToday: '', painfulVocalizing: 'None', diet: '', allergies: 'none', otherPets: '', indoorOutdoor: 'indoor', trauma: 'No', travel: 'No', heartwormPrev: 'Yes', fleaTick: 'Yes', vaccinesUTD: 'Yes', otherMedicalHistory: '',
                            peENT: '', peOral: '', pePLN: '', peCV: '', peResp: '', peAbd: '', peRectal: '', peMS: '', peInteg: '',
                            mentalStatus: 'BAR', gait: '', cranialNerves: '', posturalReactions: '', spinalReflexes: '', tone: '', muscleMass: '', nociception: '', examBy: '',
                            progression: '', neurolocalization: '', ddx: '', diagnosticsToday: '', treatments: '', discussionChanges: '',
                          });
                          toast({ title: '🗑️ SOAP Builder cleared!' });
                        }
                      }}
                      className="px-2 py-1 text-xs bg-red-600 hover:bg-red-500 text-white rounded font-bold"
                    >
                      Clear
                    </button>
                    <button
                      onClick={() => setShowSOAPBuilder(false)}
                      className="text-slate-400 hover:text-white transition text-xl"
                    >
                      ✕
                    </button>
                  </div>
                </div>

                {/* Visit Type and Neuro Localization on same line */}
                <div className="mt-2 grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">Visit Type:</label>
                    <div className="flex gap-3">
                      <label className="flex items-center gap-1 cursor-pointer">
                        <input
                          type="radio"
                          value="recheck"
                          checked={soapData.visitType === 'recheck'}
                          onChange={(e) => setSOAPData({ ...soapData, visitType: e.target.value })}
                          className="text-purple-500"
                        />
                        <span className="text-sm text-white">Recheck</span>
                      </label>
                      <label className="flex items-center gap-1 cursor-pointer">
                        <input
                          type="radio"
                          value="initial"
                          checked={soapData.visitType === 'initial'}
                          onChange={(e) => setSOAPData({ ...soapData, visitType: e.target.value })}
                          className="text-purple-500"
                        />
                        <span className="text-sm text-white">Initial Consultation</span>
                      </label>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">AI Autofill:</label>
                    <select
                      value={soapData.neurolocalization}
                      onChange={(e) => {
                        const value = e.target.value;
                        const savedExams = getSavedExams();

                        // Check if we have a saved exam for this condition
                        if (savedExams[value]) {
                          // Ask user if they want to use saved exam or default template
                          if (confirm(`Found previous ${value} exam from ${new Date(savedExams[value].savedAt).toLocaleDateString()}. Use saved exam findings?`)) {
                            // Load from memory
                            setSOAPData({
                              ...soapData,
                              ...savedExams[value],
                              // Keep current patient info, just load exam findings
                              name: soapData.name,
                              age: soapData.age,
                              sex: soapData.sex,
                              breed: soapData.breed,
                              species: soapData.species,
                              reasonForVisit: soapData.reasonForVisit,
                              visitType: soapData.visitType,
                            });
                            toast({ title: 'Loaded your previous exam template!' });
                            return;
                          }
                        }

                        // AI autofill based on selection (default templates)
                        if (value === 'T3-L3 myelopathy') {
                          setSOAPData({
                            ...soapData,
                            neurolocalization: value,
                            gait: 'Ambulatory with moderate pelvic limb UMN paresis and proprioceptive ataxia',
                            posturalReactions: 'delayed in pelvic limbs, normal thoracic limbs',
                            spinalReflexes: 'normal to increased pelvic limbs',
                            muscleMass: 'mild hind end muscle atrophy',
                            nociception: 'intact, no hyperpathia on spinal palpation',
                            ddx: 'IVDD vs FCE vs inflammatory vs neoplasia'
                          });
                        } else if (value === 'Peripheral vestibular disease') {
                          setSOAPData({
                            ...soapData,
                            neurolocalization: value,
                            gait: 'Ambulatory with vestibular quality ataxia',
                            cranialNerves: 'head tilt, absent palpebral reflex, positional nystagmus',
                            posturalReactions: 'normal',
                            spinalReflexes: 'normal',
                            nociception: 'intact, no hyperpathia',
                            ddx: 'OM/OI vs polycranial neuritis vs idiopathic vestibular disease'
                          });
                        } else if (value === 'Prosencephalon') {
                          setSOAPData({
                            ...soapData,
                            neurolocalization: value,
                            gait: 'Ambulatory without ataxia or paresis',
                            cranialNerves: 'intact',
                            posturalReactions: 'normal',
                            spinalReflexes: 'normal',
                            nociception: 'intact, no pain on palpation',
                            ddx: 'Idiopathic epilepsy vs structural disease (tumor, cyst, stroke) vs infectious vs metabolic'
                          });
                        } else if (value === 'C1-C5 myelopathy') {
                          setSOAPData({
                            ...soapData,
                            neurolocalization: value,
                            gait: 'Ambulatory with mild tetraparesis and UMN GP ataxia',
                            posturalReactions: 'delayed in all four limbs',
                            spinalReflexes: 'normal',
                            nociception: 'intact, mild to moderate cervical hyperpathia',
                            ddx: 'COMS vs IVDD vs inflammatory/infectious'
                          });
                        } else if (value === 'C6-T2 myelopathy') {
                          setSOAPData({
                            ...soapData,
                            neurolocalization: value,
                            gait: 'Ambulatory with tetraparesis and UMN GP ataxia',
                            posturalReactions: 'delayed in all four limbs',
                            spinalReflexes: 'normal',
                            nociception: 'intact',
                            ddx: 'IVDD vs FCE vs inflammatory vs neoplasia'
                          });
                        } else if (value === 'L4-S1 myelopathy') {
                          setSOAPData({
                            ...soapData,
                            neurolocalization: value,
                            gait: 'Ambulatory with LMN hind limb paresis',
                            posturalReactions: 'delayed in pelvic limbs',
                            spinalReflexes: 'decreased to absent pelvic limb reflexes',
                            tone: 'decreased to normal',
                            nociception: 'intact, hyperesthesia on lumbosacral palpation',
                            ddx: 'IVDD vs disc protrusion vs degenerative lumbosacral stenosis'
                          });
                        } else if (value === 'Discospondylitis') {
                          setSOAPData({
                            ...soapData,
                            neurolocalization: value,
                            gait: 'Short stride gait',
                            posturalReactions: 'normal',
                            spinalReflexes: 'normal',
                            nociception: 'intact, moderate to severe spinal hyperpathia',
                            ddx: 'Discospondylitis vs other infectious/inflammatory'
                          });
                        } else {
                          setSOAPData({ ...soapData, neurolocalization: value });
                        }
                      }}
                      className="w-full px-3 py-1.5 bg-slate-800 border border-slate-600 rounded-lg text-sm text-white"
                    >
                      <option value="">Select to autofill exam...</option>
                      {[
                        'T3-L3 myelopathy',
                        'C1-C5 myelopathy',
                        'C6-T2 myelopathy',
                        'L4-S1 myelopathy',
                        'Peripheral vestibular disease',
                        'Prosencephalon',
                        'Discospondylitis'
                      ].map(neuroLoc => {
                        const savedExams = getSavedExams();
                        const hasSaved = savedExams[neuroLoc];
                        return (
                          <option key={neuroLoc} value={neuroLoc}>
                            {neuroLoc === 'Prosencephalon' ? 'Prosencephalon (Seizures)' : neuroLoc} {hasSaved ? '' : ''}
                          </option>
                        );
                      })}
                    </select>

                    {/* Show info about saved exam */}
                    {soapData.neurolocalization && (() => {
                      const savedExams = getSavedExams();
                      const saved = savedExams[soapData.neurolocalization];
                      if (saved) {
                        return (
                          <div className="mt-1 text-xs text-emerald-400">
                            Last used: {new Date(saved.savedAt).toLocaleDateString()} at {new Date(saved.savedAt).toLocaleTimeString()}
                          </div>
                        );
                      }
                      return null;
                    })()}
                  </div>
                </div>
              </div>

              <div className="p-4 flex gap-4 flex-1 overflow-hidden">
                {/* Left Column - Form */}
                <div className="w-2/5 overflow-y-auto pr-2 space-y-2">
                  {/* Patient Info Section */}
                  <div className="bg-slate-900/50 border border-slate-700 rounded-lg overflow-hidden">
                    <button
                      onClick={() => {
                        if (expandedSections.includes('patient')) {
                          setExpandedSections(expandedSections.filter(s => s !== 'patient'));
                        } else {
                          setExpandedSections([...expandedSections, 'patient']);
                        }
                      }}
                      className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-slate-800/50 transition"
                    >
                      <h3 className="text-sm font-bold text-purple-400">Patient Information</h3>
                      <span className="text-xs">{expandedSections.includes('patient') ? '▼' : '▶'}</span>
                    </button>
                    {expandedSections.includes('patient') && (
                      <div className="p-2">
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            type="text"
                            placeholder="Patient Name"
                            value={soapData.name}
                            onChange={(e) => setSOAPData({ ...soapData, name: e.target.value })}
                            className="px-3 py-1.5 bg-slate-800 border border-slate-600 rounded-lg text-sm text-white placeholder-slate-500"
                          />
                          <input
                            type="text"
                            placeholder="Age (e.g., 5 y 3 m)"
                            value={soapData.age}
                            onChange={(e) => setSOAPData({ ...soapData, age: e.target.value })}
                            className="px-3 py-1.5 bg-slate-800 border border-slate-600 rounded-lg text-sm text-white placeholder-slate-500"
                          />
                          <select
                            value={soapData.sex}
                            onChange={(e) => setSOAPData({ ...soapData, sex: e.target.value })}
                            className="px-3 py-1.5 bg-slate-800 border border-slate-600 rounded-lg text-sm text-white"
                          >
                            <option value="">Sex</option>
                            <option value="MN">MN</option>
                            <option value="M">M</option>
                            <option value="FS">FS</option>
                            <option value="F">F</option>
                          </select>
                          <input
                            type="text"
                            placeholder="Breed"
                            value={soapData.breed}
                            onChange={(e) => setSOAPData({ ...soapData, breed: e.target.value })}
                            className="px-3 py-1.5 bg-slate-800 border border-slate-600 rounded-lg text-sm text-white placeholder-slate-500"
                          />
                        </div>
                        <textarea
                          placeholder="Reason for visit (e.g., recheck of medically managed thoracolumbar pain)"
                          value={soapData.reasonForVisit}
                          onChange={(e) => setSOAPData({ ...soapData, reasonForVisit: e.target.value })}
                          rows={2}
                          className="w-full mt-2 px-3 py-1.5 bg-slate-800 border border-slate-600 rounded-lg text-sm text-white placeholder-slate-500"
                        />
                      </div>
                    )}
                  </div>

                  {/* History Section - Collapsible */}
                  <div className="bg-slate-900/50 border border-slate-700 rounded-lg overflow-hidden">
                    <button
                      onClick={() => {
                        if (expandedSections.includes('history')) {
                          setExpandedSections(expandedSections.filter(s => s !== 'history'));
                        } else {
                          setExpandedSections([...expandedSections, 'history']);
                        }
                      }}
                      className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-slate-800/50 transition"
                    >
                      <h3 className="text-sm font-bold text-purple-400">History</h3>
                      <span className="text-xs">{expandedSections.includes('history') ? '▼' : '▶'}</span>
                    </button>
                    {expandedSections.includes('history') && (
                      <div className="p-2 space-y-2">
                        {soapData.visitType === 'initial' ? (
                          <>
                            <div>
                              <label className="block text-xs text-slate-400 mb-1">Past Pertinent History</label>
                              <textarea
                                placeholder="Brief summary of relevant past medical history..."
                                value={soapData.lastVisit}
                                onChange={(e) => setSOAPData({ ...soapData, lastVisit: e.target.value })}
                                rows={2}
                                className="w-full px-3 py-1.5 bg-slate-800 border border-slate-600 rounded-lg text-sm text-white placeholder-slate-500"
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-slate-400 mb-1">Why are you here today?</label>
                              <textarea
                                placeholder="Chief complaint and presenting concern..."
                                value={soapData.whyHereToday}
                                onChange={(e) => setSOAPData({ ...soapData, whyHereToday: e.target.value })}
                                rows={2}
                                className="w-full px-3 py-1.5 bg-slate-800 border border-slate-600 rounded-lg text-sm text-white placeholder-slate-500"
                              />
                            </div>
                          </>
                        ) : (
                          <>
                            <div>
                              <label className="block text-xs text-slate-400 mb-1">Last Visit</label>
                              <textarea
                                placeholder="Summary from last visit..."
                                value={soapData.lastVisit}
                                onChange={(e) => setSOAPData({ ...soapData, lastVisit: e.target.value })}
                                rows={2}
                                className="w-full px-3 py-1.5 bg-slate-800 border border-slate-600 rounded-lg text-sm text-white placeholder-slate-500"
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-slate-400 mb-1">Current History</label>
                              <textarea
                                placeholder="Owner's update since last visit..."
                                value={soapData.currentHistory}
                                onChange={(e) => setSOAPData({ ...soapData, currentHistory: e.target.value })}
                                rows={2}
                                className="w-full px-3 py-1.5 bg-slate-800 border border-slate-600 rounded-lg text-sm text-white placeholder-slate-500"
                              />
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Clinical Signs - Collapsible */}
                  <div className="bg-slate-900/50 border border-slate-700 rounded-lg overflow-hidden">
                    <button
                      onClick={() => {
                        if (expandedSections.includes('clinical')) {
                          setExpandedSections(expandedSections.filter(s => s !== 'clinical'));
                        } else {
                          setExpandedSections([...expandedSections, 'clinical']);
                        }
                      }}
                      className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-slate-800/50 transition"
                    >
                      <h3 className="text-sm font-bold text-purple-400">Clinical Signs</h3>
                      <span className="text-xs">{expandedSections.includes('clinical') ? '▼' : '▶'}</span>
                    </button>
                    {expandedSections.includes('clinical') && (
                      <div className="p-2">
                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <label className="block text-xs text-slate-400 mb-1">CSVD</label>
                            <select
                              value={soapData.csvd}
                              onChange={(e) => setSOAPData({ ...soapData, csvd: e.target.value })}
                              className="w-full px-3 py-1.5 bg-slate-800 border border-slate-600 rounded-lg text-sm text-white"
                            >
                              <option value="none">none</option>
                              <option value="vomiting">vomiting</option>
                              <option value="diarrhea">diarrhea</option>
                              <option value="both">both</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs text-slate-400 mb-1">PU/PD</label>
                            <select
                              value={soapData.pupd}
                              onChange={(e) => setSOAPData({ ...soapData, pupd: e.target.value })}
                              className="w-full px-3 py-1.5 bg-slate-800 border border-slate-600 rounded-lg text-sm text-white"
                            >
                              <option value="none">none</option>
                              <option value="PU">PU</option>
                              <option value="PD">PD</option>
                              <option value="PU/PD">PU/PD</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs text-slate-400 mb-1">Appetite</label>
                            <select
                              value={soapData.appetite}
                              onChange={(e) => setSOAPData({ ...soapData, appetite: e.target.value })}
                              className="w-full px-3 py-1.5 bg-slate-800 border border-slate-600 rounded-lg text-sm text-white"
                            >
                              <option value="normal">normal</option>
                              <option value="good">good</option>
                              <option value="decreased">decreased</option>
                              <option value="increased">increased</option>
                              <option value="poor">poor</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Extended History Section (Initial Consultation Only) */}
                  {soapData.visitType === 'initial' && (
                    <div className="bg-slate-900/50 border border-slate-700 rounded-lg overflow-hidden">
                      <button
                        onClick={() => {
                          if (expandedSections.includes('extended')) {
                            setExpandedSections(expandedSections.filter(s => s !== 'extended'));
                          } else {
                            setExpandedSections([...expandedSections, 'extended']);
                          }
                        }}
                        className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-slate-800/50 transition"
                      >
                        <h3 className="text-sm font-bold text-purple-400">Initial History Questions</h3>
                        <span className="text-xs">{expandedSections.includes('extended') ? '▼' : '▶'}</span>
                      </button>
                      {expandedSections.includes('extended') && (
                        <div className="p-2 space-y-2">
                          <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-xs text-slate-400 mb-1">Painful/vocalizing?</label>
                            <input type="text" placeholder="None" value={soapData.painfulVocalizing} onChange={(e) => setSOAPData({ ...soapData, painfulVocalizing: e.target.value })} className="w-full px-3 py-1.5 bg-slate-800 border border-slate-600 rounded-lg text-sm text-white placeholder-slate-500" />
                          </div>
                          <div>
                            <label className="block text-xs text-slate-400 mb-1">Diet</label>
                            <input type="text" placeholder="dry/wet/raw" value={soapData.diet} onChange={(e) => setSOAPData({ ...soapData, diet: e.target.value })} className="w-full px-3 py-1.5 bg-slate-800 border border-slate-600 rounded-lg text-sm text-white placeholder-slate-500" />
                          </div>
                          <div>
                            <label className="block text-xs text-slate-400 mb-1">Allergies/food sensitivities</label>
                            <input type="text" placeholder="none" value={soapData.allergies} onChange={(e) => setSOAPData({ ...soapData, allergies: e.target.value })} className="w-full px-3 py-1.5 bg-slate-800 border border-slate-600 rounded-lg text-sm text-white placeholder-slate-500" />
                          </div>
                          <div>
                            <label className="block text-xs text-slate-400 mb-1">Other pets</label>
                            <input type="text" placeholder="e.g., 1 dog, 2 cats" value={soapData.otherPets} onChange={(e) => setSOAPData({ ...soapData, otherPets: e.target.value })} className="w-full px-3 py-1.5 bg-slate-800 border border-slate-600 rounded-lg text-sm text-white placeholder-slate-500" />
                          </div>
                          <select value={soapData.indoorOutdoor} onChange={(e) => setSOAPData({ ...soapData, indoorOutdoor: e.target.value })} className="px-3 py-1.5 bg-slate-800 border border-slate-600 rounded-lg text-sm text-white">
                            <option value="indoor">Indoor</option>
                            <option value="outdoor">Outdoor</option>
                            <option value="both">Indoor/Outdoor</option>
                          </select>
                          <select value={soapData.trauma} onChange={(e) => setSOAPData({ ...soapData, trauma: e.target.value })} className="px-3 py-1.5 bg-slate-800 border border-slate-600 rounded-lg text-sm text-white">
                            <option value="No">Trauma: No</option>
                            <option value="Yes">Trauma: Yes</option>
                          </select>
                          <select value={soapData.travel} onChange={(e) => setSOAPData({ ...soapData, travel: e.target.value })} className="px-3 py-1.5 bg-slate-800 border border-slate-600 rounded-lg text-sm text-white">
                            <option value="No">Travel: No</option>
                            <option value="Yes">Travel: Yes</option>
                          </select>
                          <select value={soapData.heartwormPrev} onChange={(e) => setSOAPData({ ...soapData, heartwormPrev: e.target.value })} className="px-3 py-1.5 bg-slate-800 border border-slate-600 rounded-lg text-sm text-white">
                            <option value="Yes">Heartworm Prev: Yes</option>
                            <option value="No">Heartworm Prev: No</option>
                          </select>
                          <select value={soapData.fleaTick} onChange={(e) => setSOAPData({ ...soapData, fleaTick: e.target.value })} className="px-3 py-1.5 bg-slate-800 border border-slate-600 rounded-lg text-sm text-white">
                            <option value="Yes">Flea/Tick: Yes</option>
                            <option value="No">Flea/Tick: No</option>
                          </select>
                          <select value={soapData.vaccinesUTD} onChange={(e) => setSOAPData({ ...soapData, vaccinesUTD: e.target.value })} className="px-3 py-1.5 bg-slate-800 border border-slate-600 rounded-lg text-sm text-white">
                            <option value="Yes">Vaccines UTD: Yes</option>
                            <option value="No">Vaccines UTD: No</option>
                          </select>
                        </div>
                          <textarea
                            placeholder="Other medical history"
                            value={soapData.otherMedicalHistory}
                            onChange={(e) => setSOAPData({ ...soapData, otherMedicalHistory: e.target.value })}
                            rows={2}
                            className="w-full px-3 py-1.5 bg-slate-800 border border-slate-600 rounded-lg text-sm text-white placeholder-slate-500"
                          />
                        </div>
                      )}
                    </div>
                  )}

                  {/* Diagnostics/MRI/Medications - Collapsible */}
                  <div className="bg-slate-900/50 border border-slate-700 rounded-lg overflow-hidden">
                    <button
                      onClick={() => {
                        if (expandedSections.includes('diagnostics')) {
                          setExpandedSections(expandedSections.filter(s => s !== 'diagnostics'));
                        } else {
                          setExpandedSections([...expandedSections, 'diagnostics']);
                        }
                      }}
                      className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-slate-800/50 transition"
                    >
                      <h3 className="text-sm font-bold text-purple-400">Diagnostics & Meds</h3>
                      <span className="text-xs">{expandedSections.includes('diagnostics') ? '▼' : '▶'}</span>
                    </button>
                    {expandedSections.includes('diagnostics') && (
                      <div className="p-2 space-y-2">
                        <div>
                          <label className="block text-xs text-slate-400 mb-1">Previous Diagnostics</label>
                          <textarea
                            placeholder="List previous test results with dates..."
                            value={soapData.prevDiagnostics}
                            onChange={(e) => setSOAPData({ ...soapData, prevDiagnostics: e.target.value })}
                            rows={3}
                            className="w-full px-3 py-1.5 bg-slate-800 border border-slate-600 rounded-lg text-sm text-white placeholder-slate-500"
                          />
                        </div>
                        {soapData.visitType === 'recheck' && (
                          <>
                            <div>
                              <label className="block text-xs text-slate-400 mb-1">Last MRI</label>
                              <textarea
                                placeholder="e.g., 7/3/25 mild intraparenchymal changes..."
                                value={soapData.lastMRI}
                                onChange={(e) => setSOAPData({ ...soapData, lastMRI: e.target.value })}
                                rows={2}
                                className="w-full px-3 py-1.5 bg-slate-800 border border-slate-600 rounded-lg text-sm text-white placeholder-slate-500"
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-slate-400 mb-1">Medications</label>
                              <textarea
                                placeholder="List current medications with dosing..."
                                value={soapData.medications}
                                onChange={(e) => setSOAPData({ ...soapData, medications: e.target.value })}
                                rows={3}
                                className="w-full px-3 py-1.5 bg-slate-800 border border-slate-600 rounded-lg text-sm text-white placeholder-slate-500"
                              />
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Neuro Exam Section - Collapsible */}
                  <div className="bg-slate-900/50 border border-slate-700 rounded-lg overflow-hidden">
                    <button
                      onClick={() => {
                        if (expandedSections.includes('neuro')) {
                          setExpandedSections(expandedSections.filter(s => s !== 'neuro'));
                        } else {
                          setExpandedSections([...expandedSections, 'neuro']);
                        }
                      }}
                      className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-slate-800/50 transition"
                    >
                      <h3 className="text-sm font-bold text-purple-400">Neurologic Exam</h3>
                      <span className="text-xs">{expandedSections.includes('neuro') ? '▼' : '▶'}</span>
                    </button>
                    {expandedSections.includes('neuro') && (
                      <div className="p-2">
                        {/* Quick Fill Button */}
                        <div className="flex gap-2 mb-2">
                          <button
                            onClick={() => setSOAPData({
                              ...soapData,
                              mentalStatus: 'BAR',
                              gait: 'Ambulatory without ataxia or paresis',
                              cranialNerves: 'intact',
                              posturalReactions: 'normal',
                              spinalReflexes: 'normal',
                              tone: 'normal',
                              muscleMass: 'normal',
                              nociception: 'intact, no pain on palpation'
                            })}
                            className="px-2 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-bold"
                          >
                            Normal Neuro Exam
                          </button>
                        </div>

                        <div className="space-y-2">
                      <div>
                        <label className="block text-xs text-slate-400 mb-1">Mental Status</label>
                        <select
                          value={soapData.mentalStatus}
                          onChange={(e) => setSOAPData({ ...soapData, mentalStatus: e.target.value })}
                          className="w-full px-3 py-1.5 bg-slate-800 border border-slate-600 rounded-lg text-sm text-white"
                        >
                          <option value="BAR">BAR</option>
                          <option value="QAR">QAR</option>
                          <option value="Obtunded">Obtunded</option>
                          <option value="Stuporous">Stuporous</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs text-slate-400 mb-1">Gait & Posture</label>
                        <select
                          value={soapData.gait === 'Ambulatory without ataxia or paresis' ||
                                 soapData.gait === 'Ambulatory with mild pelvic limb UMN paresis and proprioceptive ataxia' ||
                                 soapData.gait === 'Ambulatory with moderate pelvic limb UMN paresis and proprioceptive ataxia' ||
                                 soapData.gait === 'Ambulatory with severe pelvic limb UMN paresis and proprioceptive ataxia' ||
                                 soapData.gait === 'Non-ambulatory, can support weight' ||
                                 soapData.gait === 'Non-ambulatory, cannot support weight' ||
                                 soapData.gait === 'Ambulatory with vestibular quality ataxia' ||
                                 soapData.gait === 'Ambulatory with mild tetraparesis and UMN GP ataxia' ||
                                 soapData.gait === 'Ambulatory with LMN hind limb paresis' ? soapData.gait : 'custom'}
                          onChange={(e) => {
                            if (e.target.value !== 'custom') {
                              setSOAPData({ ...soapData, gait: e.target.value });
                            } else {
                              setSOAPData({ ...soapData, gait: '' });
                            }
                          }}
                          className="w-full px-3 py-1.5 bg-slate-800 border border-slate-600 rounded-lg text-sm text-white"
                        >
                          <option value="">Select gait...</option>
                          <option value="Ambulatory without ataxia or paresis">Ambulatory without ataxia or paresis</option>
                          <option value="Ambulatory with mild pelvic limb UMN paresis and proprioceptive ataxia">Ambulatory with mild pelvic limb UMN paresis</option>
                          <option value="Ambulatory with moderate pelvic limb UMN paresis and proprioceptive ataxia">Ambulatory with moderate pelvic limb UMN paresis</option>
                          <option value="Ambulatory with severe pelvic limb UMN paresis and proprioceptive ataxia">Ambulatory with severe pelvic limb UMN paresis</option>
                          <option value="Non-ambulatory, can support weight">Non-ambulatory, can support weight</option>
                          <option value="Non-ambulatory, cannot support weight">Non-ambulatory, cannot support weight</option>
                          <option value="Ambulatory with vestibular quality ataxia">Ambulatory with vestibular quality ataxia</option>
                          <option value="Ambulatory with mild tetraparesis and UMN GP ataxia">Ambulatory with mild tetraparesis</option>
                          <option value="Ambulatory with LMN hind limb paresis">Ambulatory with LMN hind limb paresis</option>
                          <option value="custom">Custom (type below)...</option>
                        </select>
                        {(soapData.gait !== 'Ambulatory without ataxia or paresis' &&
                          soapData.gait !== 'Ambulatory with mild pelvic limb UMN paresis and proprioceptive ataxia' &&
                          soapData.gait !== 'Ambulatory with moderate pelvic limb UMN paresis and proprioceptive ataxia' &&
                          soapData.gait !== 'Ambulatory with severe pelvic limb UMN paresis and proprioceptive ataxia' &&
                          soapData.gait !== 'Non-ambulatory, can support weight' &&
                          soapData.gait !== 'Non-ambulatory, cannot support weight' &&
                          soapData.gait !== 'Ambulatory with vestibular quality ataxia' &&
                          soapData.gait !== 'Ambulatory with mild tetraparesis and UMN GP ataxia' &&
                          soapData.gait !== 'Ambulatory with LMN hind limb paresis' &&
                          soapData.gait !== '') && (
                          <input
                            type="text"
                            placeholder="Enter custom gait..."
                            value={soapData.gait}
                            onChange={(e) => setSOAPData({ ...soapData, gait: e.target.value })}
                            className="w-full mt-2 px-3 py-1.5 bg-slate-800 border border-slate-600 rounded-lg text-sm text-white"
                          />
                        )}
                      </div>
                      <div>
                        <label className="block text-xs text-slate-400 mb-1">Cranial Nerves</label>
                        <select
                          value={soapData.cranialNerves === 'intact' ||
                                 soapData.cranialNerves === 'head tilt, absent palpebral reflex' ||
                                 soapData.cranialNerves === 'head tilt, absent palpebral reflex, positional nystagmus' ||
                                 soapData.cranialNerves === 'decreased menace OU' ? soapData.cranialNerves : 'custom'}
                          onChange={(e) => {
                            if (e.target.value !== 'custom') {
                              setSOAPData({ ...soapData, cranialNerves: e.target.value });
                            } else {
                              setSOAPData({ ...soapData, cranialNerves: '' });
                            }
                          }}
                          className="w-full px-3 py-1.5 bg-slate-800 border border-slate-600 rounded-lg text-sm text-white"
                        >
                          <option value="intact">CN intact</option>
                          <option value="head tilt, absent palpebral reflex">Head tilt, absent palpebral reflex</option>
                          <option value="head tilt, absent palpebral reflex, positional nystagmus">Head tilt, absent palpebral, positional nystagmus</option>
                          <option value="decreased menace OU">Decreased menace OU</option>
                          <option value="custom">Custom...</option>
                        </select>
                        {(soapData.cranialNerves !== 'intact' &&
                          soapData.cranialNerves !== 'head tilt, absent palpebral reflex' &&
                          soapData.cranialNerves !== 'head tilt, absent palpebral reflex, positional nystagmus' &&
                          soapData.cranialNerves !== 'decreased menace OU' &&
                          soapData.cranialNerves !== '') && (
                          <input
                            type="text"
                            placeholder="Enter custom cranial nerve findings..."
                            value={soapData.cranialNerves}
                            onChange={(e) => setSOAPData({ ...soapData, cranialNerves: e.target.value })}
                            className="w-full mt-2 px-3 py-1.5 bg-slate-800 border border-slate-600 rounded-lg text-sm text-white"
                          />
                        )}
                      </div>
                      <div>
                        <label className="block text-xs text-slate-400 mb-1">Postural Reactions</label>
                        <select
                          value={soapData.posturalReactions === 'normal' ||
                                 soapData.posturalReactions === 'delayed in pelvic limbs, normal thoracic limbs' ||
                                 soapData.posturalReactions === 'delayed in all four limbs' ||
                                 soapData.posturalReactions === 'delayed in pelvic limbs' ||
                                 soapData.posturalReactions === 'absent in pelvic limbs' ? soapData.posturalReactions : 'custom'}
                          onChange={(e) => {
                            if (e.target.value !== 'custom') {
                              setSOAPData({ ...soapData, posturalReactions: e.target.value });
                            } else {
                              setSOAPData({ ...soapData, posturalReactions: '' });
                            }
                          }}
                          className="w-full px-3 py-1.5 bg-slate-800 border border-slate-600 rounded-lg text-sm text-white"
                        >
                          <option value="normal">Normal</option>
                          <option value="delayed in pelvic limbs, normal thoracic limbs">Delayed pelvic limbs, normal thoracic</option>
                          <option value="delayed in all four limbs">Delayed in all four limbs</option>
                          <option value="delayed in pelvic limbs">Delayed in pelvic limbs</option>
                          <option value="absent in pelvic limbs">Absent in pelvic limbs</option>
                          <option value="custom">Custom...</option>
                        </select>
                        {(soapData.posturalReactions !== 'normal' &&
                          soapData.posturalReactions !== 'delayed in pelvic limbs, normal thoracic limbs' &&
                          soapData.posturalReactions !== 'delayed in all four limbs' &&
                          soapData.posturalReactions !== 'delayed in pelvic limbs' &&
                          soapData.posturalReactions !== 'absent in pelvic limbs' &&
                          soapData.posturalReactions !== '') && (
                          <input
                            type="text"
                            placeholder="Enter custom postural reactions..."
                            value={soapData.posturalReactions}
                            onChange={(e) => setSOAPData({ ...soapData, posturalReactions: e.target.value })}
                            className="w-full mt-2 px-3 py-1.5 bg-slate-800 border border-slate-600 rounded-lg text-sm text-white"
                          />
                        )}
                      </div>
                      <div>
                        <label className="block text-xs text-slate-400 mb-1">Spinal Reflexes</label>
                        <select
                          value={soapData.spinalReflexes}
                          onChange={(e) => setSOAPData({ ...soapData, spinalReflexes: e.target.value })}
                          className="w-full px-3 py-1.5 bg-slate-800 border border-slate-600 rounded-lg text-sm text-white"
                        >
                          <option value="normal">Normal</option>
                          <option value="normal to increased pelvic limbs">Normal to increased pelvic limbs</option>
                          <option value="decreased to absent pelvic limb reflexes">Decreased to absent pelvic limb reflexes</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs text-slate-400 mb-1">Tone</label>
                        <select
                          value={soapData.tone}
                          onChange={(e) => setSOAPData({ ...soapData, tone: e.target.value })}
                          className="w-full px-3 py-1.5 bg-slate-800 border border-slate-600 rounded-lg text-sm text-white"
                        >
                          <option value="normal">Normal</option>
                          <option value="decreased to normal">Decreased to normal</option>
                          <option value="increased">Increased</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs text-slate-400 mb-1">Muscle Mass</label>
                        <select
                          value={soapData.muscleMass}
                          onChange={(e) => setSOAPData({ ...soapData, muscleMass: e.target.value })}
                          className="w-full px-3 py-1.5 bg-slate-800 border border-slate-600 rounded-lg text-sm text-white"
                        >
                          <option value="normal">Normal</option>
                          <option value="mild hind end muscle atrophy">Mild hind end muscle atrophy</option>
                          <option value="moderate hind end muscle atrophy">Moderate hind end muscle atrophy</option>
                          <option value="severe hind end muscle atrophy">Severe hind end muscle atrophy</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs text-slate-400 mb-1">Nociception</label>
                        <input
                          type="text"
                          placeholder="e.g., intact, no pain on thoracolumbar palpation"
                          value={soapData.nociception}
                          onChange={(e) => setSOAPData({ ...soapData, nociception: e.target.value })}
                          className="w-full px-3 py-1.5 bg-slate-800 border border-slate-600 rounded-lg text-sm text-white placeholder-slate-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-slate-400 mb-1">Exam By</label>
                        <input
                          type="text"
                          placeholder="e.g., RG"
                          value={soapData.examBy}
                          onChange={(e) => setSOAPData({ ...soapData, examBy: e.target.value })}
                          className="w-full px-3 py-1.5 bg-slate-800 border border-slate-600 rounded-lg text-sm text-white placeholder-slate-500"
                        />
                      </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Physical Exam Section (Initial Consultation Only) - Collapsible */}
                  {soapData.visitType === 'initial' && (
                    <div className="bg-slate-900/50 border border-slate-700 rounded-lg overflow-hidden">
                      <button
                        onClick={() => {
                          if (expandedSections.includes('physical')) {
                            setExpandedSections(expandedSections.filter(s => s !== 'physical'));
                          } else {
                            setExpandedSections([...expandedSections, 'physical']);
                          }
                        }}
                        className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-slate-800/50 transition"
                      >
                        <h3 className="text-sm font-bold text-purple-400">Physical Exam</h3>
                        <span className="text-xs">{expandedSections.includes('physical') ? '▼' : '▶'}</span>
                      </button>
                      {expandedSections.includes('physical') && (
                        <div className="p-2">
                          {/* Quick Fill Button */}
                          <div className="flex gap-2 mb-2">
                            <button
                              onClick={() => setSOAPData({
                                ...soapData,
                                peENT: 'clear OU/AU, no nasal discharge',
                                peOral: 'pink/moist mm, CRT<2, no oral masses or foreign bodies noted',
                                pePLN: 'wnl',
                                peCV: 'no heart murmur noted, regular rhythm, strong/synchronous pulses',
                                peResp: 'eupneic, clear bronchovesicular sounds',
                                peAbd: 'soft/non-painful, no masses noted',
                                peRectal: 'unremarkable',
                                peMS: 'ambulatory x4, no joint/long bone pain noted',
                                peInteg: 'coat wnl'
                              })}
                              className="px-2 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-bold"
                            >
                              Normal Physical Exam
                            </button>
                          </div>

                          <div className="space-y-2">
                        <input type="text" placeholder="EENT: e.g., clear OU/AU, no nasal discharge" value={soapData.peENT} onChange={(e) => setSOAPData({ ...soapData, peENT: e.target.value })} className="w-full px-3 py-1.5 bg-slate-800 border border-slate-600 rounded-lg text-sm text-white placeholder-slate-500" />
                        <input type="text" placeholder="Oral: e.g., pink/moist mm, CRT<2" value={soapData.peOral} onChange={(e) => setSOAPData({ ...soapData, peOral: e.target.value })} className="w-full px-3 py-1.5 bg-slate-800 border border-slate-600 rounded-lg text-sm text-white placeholder-slate-500" />
                        <input type="text" placeholder="PLN: e.g., wnl" value={soapData.pePLN} onChange={(e) => setSOAPData({ ...soapData, pePLN: e.target.value })} className="w-full px-3 py-1.5 bg-slate-800 border border-slate-600 rounded-lg text-sm text-white placeholder-slate-500" />
                        <input type="text" placeholder="CV: e.g., no heart murmur noted, regular rhythm" value={soapData.peCV} onChange={(e) => setSOAPData({ ...soapData, peCV: e.target.value })} className="w-full px-3 py-1.5 bg-slate-800 border border-slate-600 rounded-lg text-sm text-white placeholder-slate-500" />
                        <input type="text" placeholder="Resp: e.g., eupneic, clear bronchovesicular sounds" value={soapData.peResp} onChange={(e) => setSOAPData({ ...soapData, peResp: e.target.value })} className="w-full px-3 py-1.5 bg-slate-800 border border-slate-600 rounded-lg text-sm text-white placeholder-slate-500" />
                        <input type="text" placeholder="Abd: e.g., soft/non-painful, no masses noted" value={soapData.peAbd} onChange={(e) => setSOAPData({ ...soapData, peAbd: e.target.value })} className="w-full px-3 py-1.5 bg-slate-800 border border-slate-600 rounded-lg text-sm text-white placeholder-slate-500" />
                        <input type="text" placeholder="Rectal: e.g., unremarkable" value={soapData.peRectal} onChange={(e) => setSOAPData({ ...soapData, peRectal: e.target.value })} className="w-full px-3 py-1.5 bg-slate-800 border border-slate-600 rounded-lg text-sm text-white placeholder-slate-500" />
                        <input type="text" placeholder="MS: e.g., ambulatory x4, no joint/long bone pain noted" value={soapData.peMS} onChange={(e) => setSOAPData({ ...soapData, peMS: e.target.value })} className="w-full px-3 py-1.5 bg-slate-800 border border-slate-600 rounded-lg text-sm text-white placeholder-slate-500" />
                        <input type="text" placeholder="Integ: e.g., coat wnl" value={soapData.peInteg} onChange={(e) => setSOAPData({ ...soapData, peInteg: e.target.value })} className="w-full px-3 py-1.5 bg-slate-800 border border-slate-600 rounded-lg text-sm text-white placeholder-slate-500" />
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Assessment & Plan Section - Collapsible */}
                  <div className="bg-slate-900/50 border border-slate-700 rounded-lg overflow-hidden mb-2">
                    <button
                      onClick={() => {
                        if (expandedSections.includes('assessment')) {
                          setExpandedSections(expandedSections.filter(s => s !== 'assessment'));
                        } else {
                          setExpandedSections([...expandedSections, 'assessment']);
                        }
                      }}
                      className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-slate-800/50 transition"
                    >
                      <h3 className="text-sm font-bold text-purple-400 flex items-center gap-2">
                        Assessment & Plan
                        {(() => {
                          const savedExams = getSavedExams();
                          const count = Object.keys(savedExams).length;
                          if (count > 0) {
                            return <span className="text-xs text-emerald-400">({count} saved templates)</span>;
                          }
                          return null;
                        })()}
                      </h3>
                      <span className="text-xs">{expandedSections.includes('assessment') ? '▼' : '▶'}</span>
                    </button>
                    {expandedSections.includes('assessment') && (
                      <div className="p-2 space-y-2">
                        {/* Removed duplicate neurolocalization - it's in the header now */}
                        {soapData.visitType === 'recheck' && (
                          <div>
                            <label className="block text-xs text-slate-400 mb-1">Progression</label>
                            <select
                              value={soapData.progression}
                              onChange={(e) => setSOAPData({ ...soapData, progression: e.target.value })}
                              className="w-full px-3 py-1.5 bg-slate-800 border border-slate-600 rounded-lg text-sm text-white"
                            >
                              <option value="">Select progression...</option>
                              <option value="improving">Improving</option>
                              <option value="static">Static</option>
                              <option value="worsening">Worsening</option>
                              <option value="resolved">Resolved</option>
                            </select>
                          </div>
                        )}
                        <div>
                          <label className="block text-xs text-slate-400 mb-1">Differential Diagnoses</label>
                          <textarea
                            placeholder="DDx list..."
                            value={soapData.ddx}
                            onChange={(e) => setSOAPData({ ...soapData, ddx: e.target.value })}
                            rows={2}
                            className="w-full px-3 py-1.5 bg-slate-800 border border-slate-600 rounded-lg text-sm text-white placeholder-slate-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-slate-400 mb-1">Diagnostics Today</label>
                          <textarea
                            placeholder="Diagnostics performed or planned..."
                            value={soapData.diagnosticsToday}
                            onChange={(e) => setSOAPData({ ...soapData, diagnosticsToday: e.target.value })}
                            rows={2}
                            className="w-full px-3 py-1.5 bg-slate-800 border border-slate-600 rounded-lg text-sm text-white placeholder-slate-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-slate-400 mb-1">Treatments</label>
                          <textarea
                            placeholder="Treatment plan and recommendations..."
                            value={soapData.treatments}
                            onChange={(e) => setSOAPData({ ...soapData, treatments: e.target.value })}
                            rows={2}
                            className="w-full px-3 py-1.5 bg-slate-800 border border-slate-600 rounded-lg text-sm text-white placeholder-slate-500"
                          />
                        </div>
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label className="block text-xs text-slate-400">{soapData.visitType === 'recheck' ? 'Discussion/Changes' : 'Outcome'}</label>
                            {soapData.visitType === 'initial' && (
                              <button
                                onClick={() => {
                                  const patientName = soapData.name || '[patient name]';
                                  const template = `Discussed options with owners regarding ${patientName}'s condition.\n\nAdmit for MRI, with pre-anesthetic blood work and xrays, and to scan tomorrow AM\nSystemic Work Up\nTrial at home starting anticonvulsants\nHospitalize and monitor\nOwner opted for `;
                                  setSOAPData({ ...soapData, discussionChanges: template });
                                  toast({ title: '📋 Outcome template loaded!' });
                                }}
                                className="px-2 py-0.5 bg-purple-600 hover:bg-purple-500 text-white rounded text-xs font-bold transition"
                              >
                                Use Template
                              </button>
                            )}
                          </div>
                          <textarea
                            placeholder={soapData.visitType === 'recheck' ? 'Discussion with owner and plan changes...' : 'Discussion with owner and recommendations...'}
                            value={soapData.discussionChanges}
                            onChange={(e) => setSOAPData({ ...soapData, discussionChanges: e.target.value })}
                            rows={soapData.visitType === 'initial' ? 5 : 2}
                            className="w-full px-3 py-1.5 bg-slate-800 border border-slate-600 rounded-lg text-sm text-white placeholder-slate-500"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                </div>

                {/* Right Column - Preview with separate copyable boxes */}
                <div className="w-3/5 overflow-y-auto pr-2 space-y-3">

                  {/* History/Subjective Box */}
                  <div className="bg-slate-900/50 border border-blue-500/50 rounded-lg">
                    <div className="flex items-center justify-between p-2 border-b border-slate-700">
                      <h3 className="text-sm font-bold text-blue-400">📝 History (Subjective)</h3>
                      <button
onClick={() => {
                          let output = '';
                          if (soapData.visitType === 'initial') {
                            output = `**Presenting Problem:**
${soapData.name}, a ${soapData.age} ${soapData.sex} ${soapData.breed}, presented to the RBVH TF Neurology Service for ${soapData.reasonForVisit}
${soapData.lastVisit ? `\n**Past Pertinent History:** ${soapData.lastVisit}\n` : ''}
**Why are you here today:** ${soapData.whyHereToday}
**CSVD:** ${soapData.csvd}
**PU/PD:** ${soapData.pupd}
**Painful/vocalizing:** ${soapData.painfulVocalizing}
**Diet (dry/wet/raw):** ${soapData.diet}
**Allergies/food sensitivities:** ${soapData.allergies}
**Appetite:** ${soapData.appetite}
**Other pets:** ${soapData.otherPets}
**Indoor/outdoor:** ${soapData.indoorOutdoor}
**Trauma:** ${soapData.trauma}
**Travel (down south/Canada/California):** ${soapData.travel}
**Heartworm preventative:** ${soapData.heartwormPrev}
**Flea/Tick:** ${soapData.fleaTick}
**Vaccines up to date:** ${soapData.vaccinesUTD}
**Other medical history:** ${soapData.otherMedicalHistory}
${soapData.prevDiagnostics ? `\n**Previous Diagnostics**\n${soapData.prevDiagnostics}` : ''}`;
                          } else {
                            output = `**Presenting Problem:**
${soapData.name} is a ${soapData.age} ${soapData.sex} ${soapData.breed} who is presented for ${soapData.reasonForVisit}
${soapData.lastVisit ? `\n**Last visit**: ${soapData.lastVisit}\n` : ''}
**Current History:**
${soapData.currentHistory}

**CSVD:** ${soapData.csvd}
**PU/PD:** ${soapData.pupd}
**Appetite:** ${soapData.appetite}
${soapData.lastMRI ? `\n**Last MRI:** ${soapData.lastMRI}\n` : ''}${soapData.medications ? `\n**Medications:**\n${soapData.medications}\n` : ''}${soapData.prevDiagnostics ? `\n**Previous Diagnostics**\n${soapData.prevDiagnostics}` : ''}`;
                          }
                          navigator.clipboard.writeText(output);
                          toast({ title: '✅ History copied!' });
                        }}
                        className="px-2 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-bold flex items-center gap-1"
                      >
                        <Copy size={12} />
                        Copy
                      </button>
                    </div>
                    <pre className="text-slate-200 text-xs whitespace-pre-wrap font-sans leading-tight p-2 max-h-48 overflow-y-auto">
{soapData.visitType === 'initial' ? `**Presenting Problem:**
${soapData.name || '[Name]'}, a ${soapData.age || '[Age]'} ${soapData.sex || '[Sex]'} ${soapData.breed || '[Breed]'}, presented to the RBVH TF Neurology Service for ${soapData.reasonForVisit || '[reason]'}
${soapData.lastVisit ? `\n**Past Pertinent History:** ${soapData.lastVisit}\n` : ''}
**Why are you here today:** ${soapData.whyHereToday || '[reason]'}
**CSVD:** ${soapData.csvd}
**PU/PD:** ${soapData.pupd}
**Painful/vocalizing:** ${soapData.painfulVocalizing}
**Diet (dry/wet/raw):** ${soapData.diet || '[diet]'}
**Allergies/food sensitivities:** ${soapData.allergies}
**Appetite:** ${soapData.appetite}
**Other pets:** ${soapData.otherPets || '[other pets]'}
**Indoor/outdoor:** ${soapData.indoorOutdoor}
**Trauma:** ${soapData.trauma}
**Travel (down south/Canada/California):** ${soapData.travel}
**Heartworm preventative:** ${soapData.heartwormPrev}
**Flea/Tick:** ${soapData.fleaTick}
**Vaccines up to date:** ${soapData.vaccinesUTD}
**Other medical history:** ${soapData.otherMedicalHistory || '[other history]'}
${soapData.prevDiagnostics ? `\n**Previous Diagnostics**\n${soapData.prevDiagnostics}` : ''}` : `**Presenting Problem:**
${soapData.name || '[Name]'} is a ${soapData.age || '[Age]'} ${soapData.sex || '[Sex]'} ${soapData.breed || '[Breed]'} who is presented for ${soapData.reasonForVisit || '[reason]'}
${soapData.lastVisit ? `\n**Last visit**: ${soapData.lastVisit}\n` : ''}
**Current History:**
${soapData.currentHistory || '[Current history...]'}

**CSVD:** ${soapData.csvd}
**PU/PD:** ${soapData.pupd}
**Appetite:** ${soapData.appetite}
${soapData.lastMRI ? `\n**Last MRI:** ${soapData.lastMRI}\n` : ''}${soapData.medications ? `\n**Medications:**\n${soapData.medications}\n` : ''}${soapData.prevDiagnostics ? `\n**Previous Diagnostics**\n${soapData.prevDiagnostics}` : ''}`}
                    </pre>
                </div>

                  {/* Physical Exam Box */}
                  <div className="bg-slate-900/50 border border-green-500/50 rounded-lg">
                    <div className="flex items-center justify-between p-2 border-b border-slate-700">
                      <h3 className="text-sm font-bold text-green-400">🔬 Physical Exam (Objective)</h3>
                      <button
                        onClick={() => {
                          let output = `**NEUROLOGIC EXAM**
**Mental Status**: ${soapData.mentalStatus}
**Gait & posture**: ${soapData.gait}
**Cranial nerves**: ${soapData.cranialNerves}
**Postural reactions**: ${soapData.posturalReactions}

**Spinal reflexes** ${soapData.spinalReflexes}
**Tone**: ${soapData.tone}
**Muscle mass**: ${soapData.muscleMass}
**Nociception**: ${soapData.nociception}
${soapData.examBy ? `\nexam by ${soapData.examBy}` : ''}`;

                          if (soapData.visitType === 'initial') {
                            output += `\n\n**Physical Exam:**
**EENT:** ${soapData.peENT}
**Oral:** ${soapData.peOral}
**PLN:** ${soapData.pePLN}
**CV:** ${soapData.peCV}
**Resp:** ${soapData.peResp}
**Abd:** ${soapData.peAbd}
**Rectal:** ${soapData.peRectal}
**MS:** ${soapData.peMS}
**Integ:** ${soapData.peInteg}`;
                          }

                          navigator.clipboard.writeText(output);
                          toast({ title: '✅ Physical Exam copied!' });
                        }}
                        className="px-2 py-1 bg-green-600 hover:bg-green-500 text-white rounded text-xs font-bold flex items-center gap-1"
                      >
                        <Copy size={12} />
                        Copy
                      </button>
                    </div>
                    <pre className="text-slate-200 text-xs whitespace-pre-wrap font-sans leading-tight p-2 max-h-48 overflow-y-auto">
{`**NEUROLOGIC EXAM**
**Mental Status**: ${soapData.mentalStatus}
**Gait & posture**: ${soapData.gait || '[gait description]'}
**Cranial nerves**: ${soapData.cranialNerves || '[CN findings]'}
**Postural reactions**: ${soapData.posturalReactions || '[postural reactions]'}

**Spinal reflexes** ${soapData.spinalReflexes || '[spinal reflexes]'}
**Tone**: ${soapData.tone || '[tone]'}
**Muscle mass**: ${soapData.muscleMass || '[muscle mass]'}
**Nociception**: ${soapData.nociception || '[nociception]'}
${soapData.examBy ? `\nexam by ${soapData.examBy}` : ''}${soapData.visitType === 'initial' ? `\n\n**Physical Exam:**
**EENT:** ${soapData.peENT || '[EENT findings]'}
**Oral:** ${soapData.peOral || '[oral findings]'}
**PLN:** ${soapData.pePLN || '[PLN findings]'}
**CV:** ${soapData.peCV || '[CV findings]'}
**Resp:** ${soapData.peResp || '[resp findings]'}
**Abd:** ${soapData.peAbd || '[abd findings]'}
**Rectal:** ${soapData.peRectal || '[rectal findings]'}
**MS:** ${soapData.peMS || '[MS findings]'}
**Integ:** ${soapData.peInteg || '[integ findings]'}` : ''}`}
                    </pre>
                  </div>

                  {/* Assessment & Plan Box */}
                  <div className="bg-slate-900/50 border border-purple-500/50 rounded-lg">
                    <div className="flex items-center justify-between p-2 border-b border-slate-700">
                      <h3 className="text-sm font-bold text-purple-400">📊 Assessment & Plan</h3>
                      <button
                        onClick={() => {
                          let output = '';
                          if (soapData.neurolocalization) output += `Neurolocalization:\n${soapData.neurolocalization}\n\n`;
                          if (soapData.visitType === 'recheck' && soapData.progression) output += `PROGRESSION:\n${soapData.progression}\n\n`;
                          if (soapData.ddx) output += `DDx:\n${soapData.ddx}\n\n`;
                          if (soapData.diagnosticsToday) output += `Diagnostics:\n${soapData.diagnosticsToday}\n\n`;
                          if (soapData.treatments) output += `TREATMENTS:\n${soapData.treatments}\n\n`;
                          if (soapData.discussionChanges) {
                            const label = soapData.visitType === 'recheck' ? 'DISCUSSION/CHANGES' : 'OUTCOME';
                            output += `${label}:\n${soapData.discussionChanges}`;
                          }

                          navigator.clipboard.writeText(output.trim());
                          toast({ title: '✅ Assessment & Plan copied!' });

                          // Save to memory
                          if (soapData.neurolocalization) {
                            try {
                              const savedExams = getSavedExams();
                              savedExams[soapData.neurolocalization] = {
                                ...soapData,
                                savedAt: new Date().toISOString(),
                              };
                              localStorage.setItem('soapMemory', JSON.stringify(savedExams));
                              toast({ title: '💾 Exam saved to memory!' });
                            } catch (err) {
                              console.error('Failed to save exam:', err);
                            }
                          }
                        }}
                        className="px-2 py-1 bg-purple-600 hover:bg-purple-500 text-white rounded text-xs font-bold flex items-center gap-1"
                      >
                        <Copy size={12} />
                        Copy
                      </button>
                    </div>
                    <pre className="text-slate-200 text-xs whitespace-pre-wrap font-sans leading-tight p-2 max-h-48 overflow-y-auto">
{`${soapData.neurolocalization ? `Neurolocalization:\n${soapData.neurolocalization}\n\n` : ''}${soapData.visitType === 'recheck' && soapData.progression ? `PROGRESSION:\n${soapData.progression}\n\n` : ''}${soapData.ddx ? `DDx:\n${soapData.ddx || '[differential diagnoses]'}\n\n` : ''}${soapData.diagnosticsToday ? `Diagnostics:\n${soapData.diagnosticsToday || '[diagnostics]'}\n\n` : ''}${soapData.treatments ? `TREATMENTS:\n${soapData.treatments || '[treatments]'}\n\n` : ''}${soapData.discussionChanges ? `${soapData.visitType === 'recheck' ? 'DISCUSSION/CHANGES' : 'OUTCOME'}:\n${soapData.discussionChanges || '[outcome/discussion]'}` : ''}`}
                    </pre>
                  </div>

                </div>
              </div>
            </div>
          </div>
        )}

        {/* Paste & Parse Modal */}
        {showPasteModal && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-slate-800/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-700/50 w-full max-w-2xl">
              <div className="p-4 border-b border-slate-700">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent flex items-center gap-2">
                    <Sparkles size={24} />
                    Paste & Parse with AI
                  </h2>
                  <button
                    onClick={() => {
                      setShowPasteModal(false);
                      setPastedText('');
                    }}
                    className="text-slate-400 hover:text-white transition text-xl"
                  >
                    ✕
                  </button>
                </div>
                <p className="text-sm text-slate-400 mt-2">
                  Paste your transcribed notes below. AI will automatically fill in the SOAP fields.
                </p>
              </div>

              <div className="p-4">
                <textarea
                  value={pastedText}
                  onChange={(e) => setPastedText(e.target.value)}
                  placeholder="Paste your transcribed notes here...

Example:
'Mental status BAR, gait shows ambulatory tetraparesis with general proprioceptive ataxia, cranial nerves all normal, postural reactions delayed in all four limbs, neurolocalization is T3-L3 myelopathy, differentials include IVDD versus FCE'"
                  className="w-full h-64 px-4 py-3 bg-slate-900 border border-slate-600 rounded-lg text-white placeholder-slate-500 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                  autoFocus
                />

                <div className="flex items-center justify-between mt-4">
                  <button
                    onClick={() => {
                      setPastedText('');
                    }}
                    className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded font-bold transition"
                  >
                    Clear
                  </button>
                  <button
                    onClick={handlePasteAndParse}
                    disabled={!pastedText.trim()}
                    className="px-6 py-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white rounded font-bold transition flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Sparkles size={16} />
                    Parse with AI
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
