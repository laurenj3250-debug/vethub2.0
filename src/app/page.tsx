'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Plus, Trash2, Clock, X, ChevronDown, ChevronUp, ChevronRight } from 'lucide-react';
import {
  useFirebase,
  useCollection,
  useMemoFirebase,
  addDocumentNonBlocking,
  updateDocumentNonBlocking,
  deleteDocumentNonBlocking,
  initiateAnonymousSignIn,
} from '@/firebase';
import { signInWithGoogle, signOutUser } from '@/firebase/auth';
import { collection, doc, query } from 'firebase/firestore';
import { parseSignalment } from '@/lib/parseSignalment';


/* -----------------------------------------------------------
   Helpers: safe guards and formatting
----------------------------------------------------------- */

const safeStr = (v?: any) => (v ?? '') as string;
const sanitizeCell = (v?: string) =>
  (v ?? '').replace(/\r?\n/g, ' · ').replace(/\t/g, ' ');

const getStatusColor = (status: string) => {
  const colors: Record<string, string> = {
    'New Admit': 'bg-yellow-100 text-yellow-800 border-yellow-300',
    'Pre-procedure': 'bg-blue-100 text-blue-800 border-blue-300',
    'In Procedure': 'bg-purple-100 text-purple-800 border-purple-300',
    'Recovery': 'bg-orange-100 text-orange-800 border-orange-300',
    'Monitoring': 'bg-indigo-100 text-indigo-800 border-indigo-300',
    'Ready for Discharge': 'bg-green-100 text-green-800 border-green-300',
    'Discharged': 'bg-gray-100 text-gray-800 border-gray-300'
  };
  return colors[status] || 'bg-gray-100 text-gray-800 border-gray-300';
};

const getPriorityColor = (patient: any) => {
  if (patient.status === 'In Procedure') return 'border-l-4 border-red-500';
  if (patient.status === 'Pre-procedure') return 'border-l-4 border-yellow-500';
  if (patient.status === 'Ready for Discharge') return 'border-l-4 border-green-500';
  return 'border-l-4 border-gray-300';
};

const roundKgToInt = (kg: number) => Math.round(kg);
const kgToLbs1 = (kg: number) => (kg * 2.20462);

/* -----------------------------------------------------------
   Regex Parsers (no AI)
----------------------------------------------------------- */

// Map long sex to short codes
const normalizeSex = (s: string) => {
  const t = s.toLowerCase();
  if (/male/.test(t) && /neut/.test(t)) return 'MN';
  if (/female/.test(t) && /spay|spayed/.test(t)) return 'FS';
  if (/male/.test(t)) return 'MI';
  if (/female/.test(t)) return 'FI';
  if (/mn\b|neutered male/i.test(s)) return 'MN';
  if (/fs\b|spayed female/i.test(s)) return 'FS';
  if (/mi\b|intact male/i.test(s)) return 'MI';
  if (/fi\b|intact female/i.test(s)) return 'FI';
  if (/^\(M\)$/.test(s.trim())) return 'MI';
  if (/^\(F\)$/.test(s.trim())) return 'FI';
  return '';
};

const speciesAliases: Record<string, string> = {
  canine: 'Canine',
  dog: 'Canine',
  feline: 'Feline',
  cat: 'Feline',
};

/* -----------------------------------------------------------
   Bloodwork parser (no AI): extract abnormals only
   Uses simple reference ranges (dog defaults). Only outputs "TEST value".
----------------------------------------------------------- */

type RefRange = { lo: number, hi: number };
const REF_RANGES: Record<string, RefRange> = {
  WBC: { lo: 6, hi: 17 },
  RBC: { lo: 5.5, hi: 8.5 },
  HGB: { lo: 12, hi: 18 },
  HCT: { lo: 37, hi: 55 },
  PLT: { lo: 200, hi: 500 },
  NEUT: { lo: 3, hi: 12 },
  LYMPH: { lo: 1, hi: 5 },
  MONO: { lo: 0.2, hi: 1.5 },
  EOS: { lo: 0, hi: 1 },
  BUN: { lo: 7, hi: 27 },
  CREAT: { lo: 0.5, hi: 1.8 },
  GLU: { lo: 70, hi: 143 },
  ALT: { lo: 10, hi: 125 },
  AST: { lo: 0, hi: 50 },
  ALP: { lo: 23, hi: 212 },
  TBIL: { lo: 0, hi: 0.9 },
  ALB: { lo: 2.3, hi: 4.0 },
  TP: { lo: 5.2, hi: 8.2 },
  CA: { lo: 9, hi: 11.3 },
  PHOS: { lo: 2.5, hi: 6.8 },
  NA: { lo: 144, hi: 160 },
  K: { lo: 3.5, hi: 5.8 },
  CL: { lo: 109, hi: 122 },
};

function parseBloodworkAbnormals(text: string): string[] {
  // capture tokens like "WBC 18.2", "ALP: 345", "K=6.2"
  const re = /\b([A-Za-z]{2,5})\s*[:=]?\s*(-?\d+(?:\.\d+)?)/g;
  const results: string[] = [];
  const seen = new Set<string>();
  let m;
  while ((m = re.exec(text)) !== null) {
    const rawKey = m[1].toUpperCase();
    const val = parseFloat(m[2]);
    const key = normalizeKey(rawKey);
    if (!REF_RANGES[key]) continue;
    const { lo, hi } = REF_RANGES[key];
    if (isNaN(val)) continue;
    if (val < lo || val > hi) {
      const label = `${key} ${val}`;
      if (!seen.has(label)) {
        results.push(label); // NO ranges in output per your request
        seen.add(label);
      }
    }
  }
  return results;
}

function normalizeKey(k: string): keyof typeof REF_RANGES {
  const map: Record<string, keyof typeof REF_RANGES> = {
    WBC: 'WBC', RBC: 'RBC', HGB: 'HGB', HCT: 'HCT', PLT: 'PLT',
    NEU: 'NEUT', NEUT: 'NEUT', LYMPH: 'LYMPH', MONO: 'MONO', EOS: 'EOS',
    BUN: 'BUN', CREA: 'CREAT', CREAT: 'CREAT', GLU: 'GLU', ALT: 'ALT',
    AST: 'AST', ALP: 'ALP', TBIL: 'TBIL', ALB: 'ALB', TP: 'TP',
    CA: 'CA', PHOS: 'PHOS', NA: 'NA', K: 'K', CL: 'CL'
  };
  return (map[k] || (k as any));
}

/* -----------------------------------------------------------
   Progress Ring (compact cards)
----------------------------------------------------------- */
const ProgressRing = ({ percentage, size = 60 }: { percentage: number; size?: number }) => {
  const strokeWidth = 4;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const pct = Math.max(0, Math.min(100, percentage));
  const offset = circumference - (pct / 100) * circumference;

  return (
    <svg width={size} height={size} className="transform -rotate-90 text-blue-600">
      <circle cx={size / 2} cy={size / 2} r={radius} stroke="currentColor" className="text-gray-200"
              strokeWidth={strokeWidth} fill="none" />
      <circle cx={size / 2} cy={size / 2} r={radius} stroke="currentColor" className="text-blue-600"
              strokeWidth={strokeWidth} strokeDasharray={circumference} strokeDashoffset={offset} fill="none" />
      <text x="50%" y="50%" className="transform rotate-90 origin-center text-[10px] font-semibold fill-gray-700"
            textAnchor="middle" dominantBaseline="middle">
        {Math.round(pct)}%
      </text>
    </svg>
  );
};

/* -----------------------------------------------------------
   Component
----------------------------------------------------------- */

export default function VetPatientTracker() {
  const { firestore, auth, user, isUserLoading } = useFirebase();

  // Try to sign in anonymously only if truly not logged in yet.
  useEffect(() => {
    if (!user && !isUserLoading) {
      // Prefer Google sign-in; we still allow anon so the UI loads,
      // but your data is tied to account only when Google-signed-in.
      initiateAnonymousSignIn(auth);
    }
  }, [user, isUserLoading, auth]);

  // Firestore queries scoped to user
  const patientsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, `users/${user.uid}/patients`));
  }, [firestore, user]);
  const patientsRes = useCollection(patientsQuery);
  const patients = patientsRes?.data ?? [];
  const isLoadingPatients = patientsRes?.isLoading ?? false;

  const generalTasksQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, `users/${user.uid}/generalTasks`));
  }, [firestore, user]);
  const generalTasksRes = useCollection(generalTasksQuery);
  const generalTasks = generalTasksRes?.data ?? [];
  const isLoadingGeneralTasks = generalTasksRes?.isLoading ?? false;

  const commonProblemsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, `users/${user.uid}/commonProblems`));
  }, [firestore, user]);
  const commonProblemsRes = useCollection(commonProblemsQuery);
  const commonProblems = commonProblemsRes?.data ?? [];
  const isLoadingCommonProblems = commonProblemsRes?.isLoading ?? false;

  const commonCommentsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, `users/${user.uid}/commonComments`));
  }, [firestore, user]);
  const commonCommentsRes = useCollection(commonCommentsQuery);
  const commonComments = commonCommentsRes?.data ?? [];
  const isLoadingCommonComments = commonCommentsRes?.isLoading ?? false;

  const commonMedicationsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, `users/${user.uid}/commonMedications`));
  }, [firestore, user]);
  const commonMedicationsRes = useCollection(commonMedicationsQuery);
  const commonMedications = commonMedicationsRes?.data ?? [];
  const isLoadingCommonMedications = commonMedicationsRes?.isLoading ?? false;

  // UI State
  const [newPatient, setNewPatient] = useState({ name: '', type: 'Surgery' });
  const [expandedPatients, setExpandedPatients] = useState<Record<string, boolean>>({});
  const [showMorningOverview, setShowMorningOverview] = useState(false);
  const [newGeneralTask, setNewGeneralTask] = useState('');

  const [viewMode, setViewMode] = useState<'full'|'compact'>('full');
  const [activeTab, setActiveTab] = useState<Record<string, string>>({});
  const [expandedSections, setExpandedSections] = useState<Record<string, Record<string, boolean>>>({});
  const toggleSection = (patientId: string, section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [patientId]: { ...prev[patientId], [section]: !prev[patientId]?.[section] }
    }));
  };

  const toggleAll = (expand: boolean) => {
    const next: Record<string, boolean> = {};
    (patients || []).forEach(p => {
      next[p.id] = expand;
    });
    setExpandedPatients(next);
  };

  // Keyboard Shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey)) return;
      switch (e.key.toLowerCase()) {
        case 'n':
          e.preventDefault();
          const el = document.getElementById('new-patient-input') as HTMLInputElement | null;
          el?.focus();
          break;
        case 'e':
          e.preventDefault();
          // expand/collapse all
          const anyOpen = Object.values(expandedPatients).some(Boolean);
          toggleAll(!anyOpen);
          break;
        case 'm':
          e.preventDefault();
          addMorningTasksToAll();
          break;
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [expandedPatients, patients]);

  // Static lists
  const procedureTypes = ['Surgery', 'MRI', 'Medical', 'Other'];

  const commonGeneralTasksTemplates = [
    'Check Comms',
    'Check Emails',
    'Draw Up Contrast',
    'Rounding',
    'Read appointments for next day', // ONLY general task (per your spec)
  ];

  // Admit task menus (not auto-added)
  const admitTasks: Record<string, string[]> = {
    Surgery: ['Surgery Slip','Written on Board','Print 4 Large Stickers','Print 2 Sheets Small Stickers','Print Surgery Sheet'],
    MRI: ['Blood Work','Chest X-rays','MRI Anesthesia Sheet','NPO','Black Book','Print 5 Stickers','Print 1 Sheet Small Stickers'],
    Medical: ['Admission SOAP','Treatment Sheet Created','Owner Admission Call'],
    Other: ['Admission SOAP','Owner Admission Call']
  };

  const morningTasks = [
    'Owner Called',
    'Daily SOAP Done',
    'Vet Radar Sheet Checked',
    'MRI Findings Inputted (if needed)',
    // "Read appointments for next day" intentionally NOT included
  ];

  const eveningTasks = [
    'Vet Radar Done',
    'Rounding Sheet Done',
    'Sticker on Daily Sheet',
    // No phone call in evening (per your spec)
  ];

  const commonTasks = [
    'SOAP Note',
    'Call Owner',
    'Discharge',
    'Discharge Instructions',
    'Recheck Exam',
    'Lab Results Review',
    'Medication Dispensed',
    'Treatment Sheet Update',
    'Pain Assessment'
  ];

  const statusOptions = [
    'New Admit',
    'Pre-procedure',
    'In Procedure',
    'Recovery',
    'Monitoring',
    'Ready for Discharge',
    'Discharged'
  ];

  /* --------------------- Firestore helpers --------------------- */

  const getPatientRef = (patientId: string) => {
    if (!firestore || !user) return null;
    return doc(firestore, `users/${user.uid}/patients`, patientId);
  };

  const addGeneralTask = (taskName: string) => {
    if (!taskName.trim() || !firestore || !user) return;
    addDocumentNonBlocking(collection(firestore, `users/${user.uid}/generalTasks`), { name: taskName, completed: false });
    setNewGeneralTask('');
  };
  const toggleGeneralTask = (taskId: string, completed: boolean) => {
    if (!firestore || !user) return;
    const ref = doc(firestore, `users/${user.uid}/generalTasks`, taskId);
    updateDocumentNonBlocking(ref, { completed: !completed });
  };
  const removeGeneralTask = (taskId: string) => {
    if (!firestore || !user) return;
    const ref = doc(firestore, `users/${user.uid}/generalTasks`, taskId);
    deleteDocumentNonBlocking(ref);
  };

  const addCommonProblem = (name: string) => {
    if (!name.trim() || !firestore || !user) return;
    if (!commonProblems.some(p => p.name === name.trim())) {
      addDocumentNonBlocking(collection(firestore, `users/${user.uid}/commonProblems`), { name: name.trim() });
    }
  };
  const addCommonComment = (name: string) => {
    if (!name.trim() || !firestore || !user) return;
    if (!commonComments.some(c => c.name === name.trim())) {
      addDocumentNonBlocking(collection(firestore, `users/${user.uid}/commonComments`), { name: name.trim() });
    }
  };
  const addCommonMedication = (name: string) => {
    if (!name.trim() || !firestore || !user) return;
    if (!commonMedications.some(m => m.name === name.trim())) {
      addDocumentNonBlocking(collection(firestore, `users/${user.uid}/commonMedications`), { name: name.trim() });
    }
  };
  const deleteCommonItem = (col: 'commonProblems'|'commonComments'|'commonMedications', id: string) => {
    if (!firestore || !user) return;
    const ref = doc(firestore, `users/${user.uid}/${col}`, id);
    deleteDocumentNonBlocking(ref);
  };

  const addPatient = () => {
    if (newPatient.name.trim() && firestore && user) {
      const patientData: any = {
        name: newPatient.name,
        type: newPatient.type,
        status: 'New Admit',
        tasks: [],
        customTask: '',
        bwInput: '',
        xrayStatus: 'NSF',
        xrayOther: '',
        detailsInput: '',
        patientInfo: {
          patientId: '',
          clientId: '',
          ownerName: '',
          ownerPhone: '',
          species: 'Canine',
          breed: '',
          color: '',
          sex: '',
          weight: '',
          dob: '',
          age: ''
        },
        roundingData: {
          signalment: '',
          location: '',
          icuCriteria: '',
          codeStatus: 'Yellow',
          problems: '',
          diagnosticFindings: '',
          therapeutics: '',
          replaceIVC: '',
          replaceFluids: '',
          replaceCRI: '',
          overnightDiagnostics: '',
          overnightConcerns: '',
          additionalComments: ''
        },
        mriData: newPatient.type === 'MRI' ? {
          weight: '',
          weightUnit: 'kg',
          scanType: 'LS',
          calculated: false,
          copyableString: ''
        } : null,
        addedTime: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
      };
      addDocumentNonBlocking(collection(firestore, `users/${user.uid}/patients`), patientData).then(docRef => {
        if (docRef) setExpandedPatients(prev => ({ ...prev, [docRef.id]: true }));
      });
      setNewPatient({ name: '', type: 'Surgery' });
    }
  };

  const removePatient = (id: string) => {
    const ref = getPatientRef(id);
    if (!ref) return;
    deleteDocumentNonBlocking(ref);
    setExpandedPatients(prev => {
      const n = { ...prev };
      delete n[id];
      return n;
    });
  };

  const toggleExpanded = (patientId: string) =>
    setExpandedPatients(prev => ({ ...prev, [patientId]: !prev[patientId] }));

  const updatePatientField = (patientId: string, field: string, value: any) => {
    const ref = getPatientRef(patientId);
    if (!ref) return;
    updateDocumentNonBlocking(ref, { [field]: value });
  };
  const updatePatientData = (patientId: string, data: any) => {
    const ref = getPatientRef(patientId);
    if (!ref) return;
    updateDocumentNonBlocking(ref, data);
  };
  const updateStatus = (patientId: string, status: string) =>
    updatePatientField(patientId, 'status', status);

  const updatePatientType = (patientId: string, newType: string) => {
    const patient = patients.find(p => p.id === patientId);
    if (!patient) return;
    const updateData: any = { type: newType };
    if (newType === 'MRI' && !patient.mriData) {
      updateData.mriData = {
        weight: '',
        weightUnit: 'kg',
        scanType: 'LS',
        calculated: false,
        copyableString: ''
      };
    }
    updatePatientData(patientId, updateData);
  };

  const updateRoundingData = (patientId: string, field: string, value: any) => {
    const patient = patients.find(p => p.id === patientId);
    if (!patient) return;
    const newData = { ...(patient.roundingData || {}), [field]: value };
    updatePatientField(patientId, 'roundingData', newData);
  };

  const addTaskToPatient = (patientId: string, taskName: string) => {
    const patient = patients.find(p => p.id === patientId);
    if (!patient) return;
    if ((patient.tasks || []).some(t => t.name === taskName)) return;
    const newTasks = [...(patient.tasks || []), { name: taskName, completed: false, id: Date.now() + Math.random() }];
    updatePatientField(patientId, 'tasks', newTasks);
  };
  const addMorningTasks = (patientId: string) => {
    const patient = patients.find(p => p.id === patientId);
    if (!patient) return;
    const newTasks = [...(patient.tasks || [])];
    morningTasks.forEach(t => {
      if (!newTasks.some(x => x.name === t)) newTasks.push({ name: t, completed: false, id: Date.now() + Math.random() });
    });
    updatePatientField(patientId, 'tasks', newTasks);
  };
  const addEveningTasks = (patientId: string) => {
    const patient = patients.find(p => p.id === patientId);
    if (!patient) return;
    const newTasks = [...(patient.tasks || [])];
    eveningTasks.forEach(t => {
      if (!newTasks.some(x => x.name === t)) newTasks.push({ name: t, completed: false, id: Date.now() + Math.random() });
    });
    updatePatientField(patientId, 'tasks', newTasks);
  };
  const addMorningTasksToAll = () => (patients || []).forEach(p => addMorningTasks(p.id));

  const resetDailyTasks = (patientId: string) => {
    const patient = patients.find(p => p.id === patientId);
    if (!patient) return;
    const allDaily = [...morningTasks, ...eveningTasks];
    const filtered = (patient.tasks || []).filter(t => !allDaily.includes(t.name));
    updatePatientField(patientId, 'tasks', filtered);
  };

  const removeTask = (patientId: string, taskId: number) => {
    const patient = patients.find(p => p.id === patientId);
    if (!patient) return;
    const newTasks = (patient.tasks || []).filter(t => t.id !== taskId);
    updatePatientField(patientId, 'tasks', newTasks);
  };
  const toggleTask = (patientId: string, taskId: number) => {
    const patient = patients.find(p => p.id === patientId);
    if (!patient) return;
    const newTasks = (patient.tasks || []).map(t => (t.id === taskId ? { ...t, completed: !t.completed } : t));
    // Sort: incomplete first
    newTasks.sort((a, b) => Number(a.completed) - Number(b.completed));
    updatePatientField(patientId, 'tasks', newTasks);
  };

  const updatePatientInfo = (patientId: string, field: string, value: any) => {
    const patient = patients.find(p => p.id === patientId);
    if (!patient) return;
    const info = { ...(patient.patientInfo || {}), [field]: value };
    updatePatientField(patientId, 'patientInfo', info);
  };

  const updateMRIData = (patientId: string, field: string, value: any) => {
    const patient = patients.find(p => p.id === patientId);
    if (!patient || !patient.mriData) return;
    const data = { ...patient.mriData, [field]: value, calculated: false, copyableString: '' };
    updatePatientField(patientId, 'mriData', data);
  };

  const calculateMRIDrugs = (patientId: string) => {
    const patient = patients.find(p => p.id === patientId);
    if (!patient || !patient.mriData || !patient.mriData.weight) return;
  
    let weightKg = parseFloat(patient.mriData.weight);
    if (patient.mriData.weightUnit === 'lbs') weightKg = weightKg / 2.20462;
  
    const kgRounded = roundKgToInt(weightKg);
  
    const id = safeStr(patient.patientInfo?.patientId);
  
    // New format: FirstName Last name -> ID -> (kg) -> leave blank -> area scanned
    const line1 = `${patient.name}\t${id}\t${kgRounded}\t\t${patient.mriData.scanType}`;
    const line2 = `Pre-med: ${patient.mriData.scanType === 'Brain' ? 'Butorphanol' : 'Methadone'} ${weightKg * 0.2 / 10}mL, Valium ${weightKg * 0.25 / 5}mL, Contrast ${weightKg * 0.22}mL`;
    const copyableString = `${line1}\n${line2}`;
  
    const isBrain = patient.mriData.scanType === 'Brain';
    const preMedDrug = isBrain ? 'Butorphanol' : 'Methadone';
    const preMedDose = weightKg * 0.2;
    const preMedVolume = preMedDose / 10;
    const valiumDose = weightKg * 0.25;
    const valiumVolume = valiumDose / 5;
    const contrastVolume = weightKg * 0.22;
  
    const newMriData = {
      ...patient.mriData,
      weightKg: kgRounded.toString(),
      preMedDrug,
      preMedDose: preMedDose.toFixed(2),
      preMedVolume: preMedVolume.toFixed(2),
      valiumDose: valiumDose.toFixed(2),
      valiumVolume: valiumVolume.toFixed(2),
      contrastVolume: contrastVolume.toFixed(1),
      calculated: true,
      copyableString,
    };
    updatePatientField(patientId, 'mriData', newMriData);
  };

  const parsePatientDetails = (patientId: string, detailsText: string) => {
    const patient = patients.find(p => p.id === patientId);
    if (!patient || !detailsText.trim()) {
      alert('Please paste patient details first');
      return;
    }
    try {
      const result = parseSignalment(detailsText);
      const data = result.data;

      const newInfo: any = { ...(patient.patientInfo || {}) };
      if (data.patientId) newInfo.patientId = data.patientId;
      if (data.ownerName) newInfo.ownerName = data.ownerName;
      if (data.ownerPhone) newInfo.ownerPhone = data.ownerPhone;
      if (data.species) newInfo.species = data.species;
      if (data.breed) newInfo.breed = data.breed;
      if (data.sex) newInfo.sex = data.sex;
      if (data.weight) newInfo.weight = data.weight;
      if (data.age) newInfo.age = data.age;

      const newRounding = { ...(patient.roundingData || {}) };
      const parts: string[] = [];
      if (data.age) parts.push(data.age);
      if (data.sex) parts.push(data.sex);
      if (data.breed) parts.push(data.breed);
      newRounding.signalment = parts.join(' ');
      
      const updateData: any = {
        patientInfo: newInfo,
        roundingData: newRounding,
        detailsInput: '',
      };
  
      if (patient.type === 'MRI' && data.weight) {
        const weightMatch = data.weight.match(/(\d+(?:\.\d+)?)\s*(kg|lb)s?/i);
        if (weightMatch) {
          updateData.mriData = {
            ...(patient.mriData || {}),
            weight: weightMatch[1],
            weightUnit: weightMatch[2].toLowerCase() as 'kg' | 'lbs',
          };
        }
      }

      updatePatientData(patientId, updateData);

    } catch (err) {
      console.error(err);
      alert('Parsing of patient details failed. Please enter the information manually.');
    }
  };

  // Parse bloodwork (no AI)
  const parseBloodWork = (patientId: string, bwText: string) => {
    const patient = patients.find(p => p.id === patientId);
    if (!patient || !bwText.trim()) {
      alert('Please paste blood work results first');
      return;
    }
    try {
      const abnormals = parseBloodworkAbnormals(bwText);
      const currentDx = safeStr(patient.roundingData?.diagnosticFindings);
      const bwLine = abnormals.length > 0 ? 'CBC/CHEM: ' + abnormals.join(', ') : 'CBC/CHEM: NAD';
      const newDx = currentDx ? currentDx + '\n' + bwLine : bwLine;

      updateRoundingData(patientId, 'diagnosticFindings', newDx);
      updatePatientField(patientId, 'bwInput', '');
    } catch (e) {
      console.error(e);
      alert('Analysis failed. Please check the results manually.');
    }
  };

  // Completion
  const getCompletionStatus = (patient: any) => {
    const total = (patient?.tasks || []).length;
    const completed = (patient?.tasks || []).filter((t: any) => t.completed).length;
    return { completed, total, percentage: total > 0 ? (completed / total) * 100 : 0 };
  };

  // Tabs
  const getTabsForPatient = (p: any) => {
    const base = ['Tasks', 'Rounding Sheet', 'Patient Info'];
    if (p.type === 'MRI') base.splice(1, 0, 'MRI Calculator');
    return base;
  };

  // RER (dogs/cats same formula). Show based on species in patientInfo.
  const calcRER = (species: string, weightStr: string) => {
    const m = weightStr.match(/(\d+(?:\.\d+)?)\s*kg/i);
    const kg = m ? parseFloat(m[1]) : NaN;
    if (!kg || isNaN(kg)) return '';
    const rer = 70 * Math.pow(kg, 0.75);
    return `${Math.round(rer)} kcal/day`;
  };

  /* --------------------- TSV (no headers) --------------------- */
  const makeRoundingRow = (p: any): string[] => {
    const r = p.roundingData || {};
    return [
      p.name || '',                     // Name
      r.signalment || '',               // Signalment
      r.location || '',                 // Location
      r.icuCriteria || '',              // ICU Criteria
      r.codeStatus || 'Yellow',         // Code Status
      r.problems || '',                 // Problems
      r.diagnosticFindings || '',       // Diagnostics
      r.therapeutics || '',             // Therapeutics
      r.replaceIVC || '',               // Replace IVC
      r.replaceFluids || '',            // Replace Fluids
      r.replaceCRI || '',               // Replace CRI
      r.overnightDiagnostics || '',     // Overnight Diagnostics
      r.overnightConcerns || '',        // Overnight Concerns/Alerts
      r.additionalComments || ''        // Additional Comments
    ];
  };
  const roundingTSV = useMemo(() => {
    const rows = (patients || []).map(p => makeRoundingRow(p).map(sanitizeCell).join('\t'));
    return rows.join('\n');
  }, [patients]);

  /* --------------------- UI --------------------- */

  if (isUserLoading || isLoadingPatients || isLoadingGeneralTasks || isLoadingCommonProblems || isLoadingCommonComments || isLoadingCommonMedications) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50">
        <div className="text-center">
          <p className="text-xl font-semibold text-gray-700">Loading your VetCare Hub...</p>
          <p className="text-gray-500">One sec.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-4">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-800 mb-1">RBVH Patient Task Manager</h1>
              <p className="text-gray-600">Track tasks and prep rounding sheets</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <button onClick={() => toggleAll(true)} className="px-3 py-1 rounded-md bg-gray-200 hover:bg-gray-300 text-sm">Expand All</button>
                <button onClick={() => toggleAll(false)} className="px-3 py-1 rounded-md bg-gray-200 hover:bg-gray-300 text-sm">Collapse All</button>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">View:</span>
                <button
                  onClick={() => setViewMode('full')}
                  className={`px-3 py-1 rounded-md text-sm border ${viewMode === 'full' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300'}`}
                >
                  Full
                </button>
                <button
                  onClick={() => setViewMode('compact')}
                  className={`px-3 py-1 rounded-md text-sm border ${viewMode === 'compact' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300'}`}
                >
                  Compact
                </button>
              </div>

              {user && auth ? (
                <button onClick={() => signOutUser(auth)} className="px-3 py-1 rounded-md bg-gray-200 hover:bg-gray-300 text-sm">
                  Sign Out
                </button>
              ) : auth ? (
                <button onClick={() => signInWithGoogle(auth)} className="px-3 py-1 rounded-md bg-green-600 hover:bg-green-700 text-white text-sm">
                  Sign in with Google
                </button>
              ): null}
            </div>
          </div>

          {/* Add patient */}
          <div className="flex gap-2">
            <input
              id="new-patient-input"
              type="text"
              value={newPatient.name}
              onChange={(e) => setNewPatient({ ...newPatient, name: e.target.value })}
              onKeyDown={(e) => e.key === 'Enter' && addPatient()}
              placeholder="Patient name (e.g., Max - Golden Retriever)"
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <select
              value={newPatient.type}
              onChange={(e) => setNewPatient({ ...newPatient, type: e.target.value })}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {procedureTypes.map(type => <option key={type} value={type}>{type}</option>)}
            </select>
            <button
              onClick={addPatient}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2 transition"
            >
              <Plus size={20} />
              Add Patient
            </button>
          </div>
        </div>

        {/* TSV copy helper (no headers) */}
        {(patients || []).length > 0 && (
          <div className="w-full bg-white rounded-lg shadow p-3 mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-gray-700">Rounding sheet (TSV, no headers)</span>
              <div className="flex gap-2">
                <button
                  onClick={() => navigator.clipboard.writeText(roundingTSV)}
                  className="px-3 py-1 rounded-md text-sm font-semibold bg-green-600 text-white hover:bg-green-700"
                >
                  Copy to Clipboard
                </button>
                <button
                  onClick={() => {
                    const blob = new Blob([roundingTSV], { type: 'text/tab-separated-values;charset=utf-8;' });
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = 'rounding-sheet.tsv';
                    a.click();
                    window.URL.revokeObjectURL(url);
                  }}
                  className="px-3 py-1 rounded-md text-sm font-semibold bg-gray-200 text-gray-800 hover:bg-gray-300"
                >
                  Download .tsv
                </button>
              </div>
            </div>
            <textarea
              readOnly
              value={roundingTSV}
              rows={4}
              className="w-full font-mono text-xs p-2 border rounded-lg bg-gray-50"
              onClick={(e) => (e.target as HTMLTextAreaElement).select()}
            />
          </div>
        )}

        {/* General Tasks */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-800 mb-3">General Tasks (Not Patient-Specific)</h2>
          <div className="flex flex-wrap gap-2 mb-3">
            {commonGeneralTasksTemplates.map(task => (
              <button
                key={task}
                onClick={() => addGeneralTask(task)}
                className="px-3 py-1 text-sm bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200 transition"
              >
                + {task}
              </button>
            ))}
          </div>
          <div className="flex gap-2 mb-3">
            <input
              type="text"
              value={newGeneralTask}
              onChange={(e) => setNewGeneralTask(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addGeneralTask(newGeneralTask)}
              placeholder="Add custom general task..."
              className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg"
            />
            <button
              onClick={() => addGeneralTask(newGeneralTask)}
              className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 transition"
            >
              Add
            </button>
          </div>
          {(generalTasks || []).length === 0 ? (
            <p className="text-gray-400 text-sm italic py-2">No general tasks yet. Click quick-add or type a custom task.</p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {(generalTasks || []).map((task: any) => (
                <div
                  key={task.id}
                  className={'flex items-center gap-2 p-2 rounded-lg border-2 transition ' + (task.completed ? 'bg-green-50 border-green-500' : 'bg-gray-50 border-gray-300')}
                >
                  <input
                    type="checkbox"
                    checked={task.completed}
                    onChange={() => toggleGeneralTask(task.id, task.completed)}
                    className="w-4 h-4 text-indigo-600 rounded"
                  />
                  <span className={'flex-1 text-sm font-medium ' + (task.completed ? 'text-green-800 line-through' : 'text-gray-700')}>
                    {task.name}
                  </span>
                  <button onClick={() => removeGeneralTask(task.id)} className="text-gray-400 hover:text-red-600 transition">
                    <X size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Patients */}
        {(patients || []).length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <p className="text-gray-500 text-lg">No patients added yet. Add your first patient above!</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {(patients || []).map((patient: any) => {
              const { completed, total, percentage } = getCompletionStatus(patient);
              const isExpanded = !!expandedPatients[patient.id];

              // sort tasks: incomplete first
              const tasksSorted = [...(patient.tasks || [])].sort((a, b) => Number(a.completed) - Number(b.completed));
              const morningSet = new Set(morningTasks);
              const eveningSet = new Set(eveningTasks);
              const patientMorningTasks = tasksSorted.filter(t => morningSet.has(t.name));
              const patientEveningTasks = tasksSorted.filter(t => eveningSet.has(t.name));
              const otherTasks = tasksSorted.filter(t => !morningSet.has(t.name) && !eveningSet.has(t.name));

              const tabs = getTabsForPatient(patient);
              const curTab = activeTab[patient.id] ?? tabs[0];

              const rer = calcRER(safeStr(patient.patientInfo?.species), safeStr(patient.patientInfo?.weight));

              return (
                <div key={patient.id} className={`bg-white rounded-lg shadow-md border ${getPriorityColor(patient)} overflow-hidden`}>
                  {/* Header */}
                  <div className="flex justify-between items-center p-4 border-b">
                    <div className="flex items-center gap-3">
                      {viewMode === 'compact' ? (
                        <div className="w-12 h-12">
                          <ProgressRing percentage={Math.round(percentage)} size={48} />
                        </div>
                      ) : (
                        <button onClick={() => toggleExpanded(patient.id)} className="text-gray-600 hover:text-gray-800 p-1">
                          {isExpanded ? <ChevronUp size={22} /> : <ChevronDown size={22} />}
                        </button>
                      )}
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-lg font-bold text-gray-900">{patient.name}</h3>
                          <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-600 text-white">{patient.type}</span>
                          <span className="text-xs text-gray-500 flex items-center gap-1">
                            <Clock size={14} /> {patient.addedTime}
                          </span>
                        </div>
                        <div className="text-sm text-gray-600">
                          {patient.roundingData?.signalment && <span className="mr-3">📋 {patient.roundingData.signalment}</span>}
                          {patient.patientInfo?.weight && <span className="mr-3">⚖️ {patient.patientInfo.weight}</span>}
                          {patient.patientInfo?.patientId && <span className="mr-3">🆔 {patient.patientInfo.patientId}</span>}
                          {rer && <span className="mr-3">🔥 RER: {rer}</span>}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <select
                        value={patient.type}
                        onChange={(e) => updatePatientType(patient.id, e.target.value)}
                        className="px-2 py-1 rounded-lg border text-sm"
                      >
                        {procedureTypes.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                      <select
                        value={patient.status}
                        onChange={(e) => updateStatus(patient.id, e.target.value)}
                        className={'px-2 py-1 rounded-lg border text-sm ' + getStatusColor(patient.status)}
                      >
                        {statusOptions.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                      <button onClick={() => removePatient(patient.id)} className="text-red-500 hover:text-red-700 p-2" title="Remove patient">
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>

                  {viewMode === 'compact' && (
                    <div className="flex items-center justify-between px-4 py-3">
                      <div className="text-sm text-gray-600">{completed}/{total} tasks</div>
                      <button onClick={() => toggleExpanded(patient.id)} className="px-3 py-1 text-sm border rounded-md hover:bg-gray-50">
                        {isExpanded ? 'Hide' : 'Open'} <ChevronRight className="inline-block ml-1" size={16} />
                      </button>
                    </div>
                  )}

                  {/* Body */}
                  {isExpanded && (
                    <div className="p-4">
                      {/* Tabs */}
                      <div className="border-b mb-4">
                        <nav className="flex flex-wrap gap-2">
                          {tabs.map(tab => {
                            const isActive = curTab === tab;
                            return (
                              <button
                                key={tab}
                                onClick={() => setActiveTab(prev => ({ ...prev, [patient.id]: tab }))}
                                className={`py-1.5 px-3 border-b-2 text-sm ${isActive ? 'border-blue-600 text-blue-700' : 'border-transparent text-gray-600 hover:border-gray-300'}`}
                              >
                                {tab}
                              </button>
                            );
                          })}
                        </nav>
                      </div>

                      {/* Tab content */}
                      <div className="space-y-3">
                        {/* TASKS */}
                        {curTab === 'Tasks' && (
                          <div className="border rounded-lg">
                            <button onClick={() => toggleSection(patient.id, 'tasks')} className="w-full flex justify-between items-center p-3 hover:bg-gray-50">
                              <span className="font-semibold">Tasks ({completed}/{total})</span>
                              <ChevronDown className={expandedSections[patient.id]?.tasks ? 'rotate-180 transition-transform' : 'transition-transform'} />
                            </button>
                            {expandedSections[patient.id]?.tasks && (
                              <div className="p-3 border-t space-y-3">
                                {patient.status === 'New Admit' && (
                                  <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                                    <h4 className="text-sm font-semibold text-amber-900 mb-2">
                                      New Admit Quick-Add Tasks — {patient.type}
                                    </h4>
                                    <div className="flex flex-wrap gap-2">
                                      {admitTasks[patient.type].map(task => (
                                        <button
                                          key={task}
                                          onClick={() => addTaskToPatient(patient.id, task)}
                                          className="px-3 py-1 text-sm bg-amber-100 text-amber-800 rounded-lg hover:bg-amber-200 transition font-medium"
                                        >
                                          + {task}
                                        </button>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                <div className="grid grid-cols-2 gap-2">
                                  <button onClick={() => addMorningTasks(patient.id)} className="px-3 py-2 text-sm bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition font-medium">
                                    Add Morning Tasks
                                  </button>
                                  <button onClick={() => addEveningTasks(patient.id)} className="px-3 py-2 text-sm bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition font-medium">
                                    Add Evening Tasks
                                  </button>
                                </div>
                                <button onClick={() => resetDailyTasks(patient.id)} className="w-full px-3 py-1 text-xs bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition font-medium">
                                  Clear All Daily Tasks
                                </button>

                                {/* Render tasks — incomplete first (already sorted) */}
                                <div className="space-y-2">
                                  {tasksSorted.map((task: any) => (
                                    <div key={task.id} className={'flex items-center gap-2 p-2 rounded-lg border-2 transition ' + (task.completed ? 'bg-green-50 border-green-500' : 'bg-gray-50 border-gray-300')}>
                                      <input
                                        type="checkbox"
                                        checked={task.completed}
                                        onChange={() => toggleTask(patient.id, task.id)}
                                        className="w-4 h-4 text-blue-600 rounded"
                                      />
                                      <span className={'flex-1 text-sm font-medium ' + (task.completed ? 'text-green-800 line-through' : 'text-gray-700')}>
                                        {task.name}
                                      </span>
                                      <button onClick={() => removeTask(patient.id, task.id)} className="text-gray-400 hover:text-red-600 transition">
                                        <X size={16} />
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {/* MRI CALCULATOR */}
                        {curTab === 'MRI Calculator' && patient.type === 'MRI' && (
                          <div className="border rounded-lg">
                            <button onClick={() => toggleSection(patient.id, 'mri')} className="w-full flex justify-between items-center p-3 hover:bg-gray-50">
                              <span className="font-semibold">MRI Anesthesia Calculator</span>
                              <ChevronDown className={expandedSections[patient.id]?.mri ? 'rotate-180 transition-transform' : 'transition-transform'} />
                            </button>
                            {expandedSections[patient.id]?.mri && (
                              <div className="p-3 border-t space-y-3">
                                <div className="grid grid-cols-2 gap-3">
                                  <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">Weight</label>
                                    <div className="flex gap-2">
                                      <input
                                        type="number"
                                        step="0.1"
                                        value={safeStr(patient.mriData?.weight)}
                                        onChange={(e) => updateMRIData(patient.id, 'weight', e.target.value)}
                                        placeholder="Enter weight"
                                        className="flex-1 px-3 py-2 text-sm border border-purple-300 rounded-lg"
                                      />
                                      <select
                                        value={safeStr(patient.mriData?.weightUnit)}
                                        onChange={(e) => updateMRIData(patient.id, 'weightUnit', e.target.value)}
                                        className="px-3 py-2 text-sm border border-purple-300 rounded-lg"
                                      >
                                        <option value="kg">kg</option>
                                        <option value="lbs">lbs</option>
                                      </select>
                                    </div>
                                  </div>
                                  <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">Scan Type</label>
                                    <select
                                      value={safeStr(patient.mriData?.scanType)}
                                      onChange={(e) => updateMRIData(patient.id, 'scanType', e.target.value)}
                                      className="w-full px-3 py-2 text-sm border border-purple-300 rounded-lg"
                                    >
                                      <option>Brain</option>
                                      <option>TL</option>
                                      <option>LS</option>
                                      <option>Cervical</option>
                                      <option>Other</option>
                                    </select>
                                  </div>
                                </div>
                                <button
                                  onClick={() => calculateMRIDrugs(patient.id)}
                                  disabled={!safeStr(patient.mriData?.weight)}
                                  className="w-full px-4 py-2 bg-purple-600 text-white font-semibold rounded-lg hover:bg-purple-700 disabled:bg-gray-400 transition"
                                >
                                  Calculate & Copy Line
                                </button>

                                {patient.mriData?.calculated && (
                                  <>
                                    <div className="bg-white p-3 rounded-lg border border-purple-200">
                                      <div className="grid grid-cols-2 gap-3 text-sm">
                                        <div className="col-span-2 bg-purple-100 p-2 rounded font-semibold text-purple-900">
                                          Pre-med: {patient.mriData.preMedDrug} {patient.mriData.scanType === 'Brain' ? '(Brain)' : ''}
                                        </div>
                                        <div><span className="text-gray-600">Weight (kg, rounded):</span> <span className="font-bold ml-2">{safeStr(patient.mriData.weightKg)} kg</span></div>
                                        <div><span className="text-gray-600">Valium:</span> <span className="font-bold ml-2">{safeStr(patient.mriData.valiumDose)} mg ({safeStr(patient.mriData.valiumVolume)} mL)</span></div>
                                        <div><span className="text-gray-600">{safeStr(patient.mriData.preMedDrug)}:</span> <span className="font-bold ml-2">{safeStr(patient.mriData.preMedDose)} mg ({safeStr(patient.mriData.preMedVolume)} mL)</span></div>
                                        <div><span className="text-gray-600">Contrast:</span> <span className="font-bold ml-2">{safeStr(patient.mriData.contrastVolume)} mL</span></div>
                                      </div>
                                    </div>
                                    {patient.mriData.copyableString && (
                                      <div className="mt-3">
                                        <label className="block text-xs font-semibold text-gray-700 mb-1">Line for MRI Sheet</label>
                                        <textarea
                                          readOnly
                                          value={patient.mriData.copyableString}
                                          rows={2}
                                          className="w-full px-3 py-2 text-sm font-mono border bg-gray-50 rounded-lg"
                                          onClick={(e) => (e.target as HTMLTextAreaElement).select()}
                                        />
                                      </div>
                                    )}
                                  </>
                                )}
                              </div>
                            )}
                          </div>
                        )}

                        {/* ROUNDING SHEET */}
                        {curTab === 'Rounding Sheet' && (
                          <div className="border rounded-lg">
                            <button onClick={() => toggleSection(patient.id, 'rounding')} className="w-full flex justify-between items-center p-3 hover:bg-gray-50">
                              <span className="font-semibold">Rounding Sheet</span>
                              <ChevronDown className={expandedSections[patient.id]?.rounding ? 'rotate-180 transition-transform' : 'transition-transform'} />
                            </button>
                            {expandedSections[patient.id]?.rounding && (
                              <div className="p-3 border-t grid grid-cols-2 gap-3">
                                {/* Quick Import */}
                                <div className="col-span-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                  <label className="block text-xs font-semibold text-gray-700 mb-1">Quick Import — Paste Patient Details</label>
                                  <textarea
                                    value={safeStr(patient.detailsInput)}
                                    onChange={(e) => updatePatientField(patient.id, 'detailsInput', e.target.value)}
                                    placeholder="Paste patient info from eVetPractice, Easy Vet, etc..."
                                    rows={4}
                                    className="w-full px-3 py-2 text-sm border rounded-lg mb-2"
                                  />
                                  <button onClick={() => parsePatientDetails(patient.id, safeStr(patient.detailsInput))}
                                          className="px-3 py-1 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700">
                                    Extract Basics (Signalment, Weight, ID, Owner, Possible Meds)
                                  </button>
                                  <p className="text-xs text-gray-600 mt-1 italic">No AI — regex only.</p>
                                </div>

                                {/* Signalment / Location / ICU / Code */}
                                <input
                                  type="text"
                                  value={safeStr(patient.roundingData?.signalment)}
                                  onChange={(e) => updateRoundingData(patient.id, 'signalment', e.target.value)}
                                  placeholder="Signalment (e.g., 4yo MN Frenchie)"
                                  className="col-span-2 px-3 py-2 text-sm border rounded-lg"
                                />
                                <input
                                  type="text"
                                  value={safeStr(patient.roundingData?.location)}
                                  onChange={(e) => updateRoundingData(patient.id, 'location', e.target.value)}
                                  placeholder="Location"
                                  className="px-3 py-2 text-sm border rounded-lg"
                                />
                                <input
                                  type="text"
                                  value={safeStr(patient.roundingData?.icuCriteria)}
                                  onChange={(e) => updateRoundingData(patient.id, 'icuCriteria', e.target.value)}
                                  placeholder="ICU Criteria"
                                  className="px-3 py-2 text-sm border rounded-lg"
                                />
                                <select
                                  value={safeStr(patient.roundingData?.codeStatus) || 'Yellow'}
                                  onChange={(e) => updateRoundingData(patient.id, 'codeStatus', e.target.value)}
                                  className="px-3 py-2 text-sm border rounded-lg"
                                >
                                  <option>Yellow</option>
                                  <option>Red</option>
                                </select>

                                {/* Problems with chip selectors */}
                                <div className="col-span-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                                  <h5 className="text-sm font-bold text-yellow-900 mb-2">Problems</h5>
                                  <div className="flex flex-wrap gap-1 mb-2">
                                    {(commonProblems || []).slice(0, 12).map((pr: any) => (
                                      <div key={pr.id} className="group relative">
                                        <button
                                          onClick={() => {
                                            const current = safeStr(patient.roundingData?.problems);
                                            const newValue = current ? current + '\n' + pr.name : pr.name;
                                            updateRoundingData(patient.id, 'problems', newValue);
                                          }}
                                          className="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded-full hover:scale-105 transition"
                                        >
                                          {pr.name}
                                        </button>
                                        <button
                                          onClick={() => deleteCommonItem('commonProblems', pr.id)}
                                          className="absolute -top-2 -right-2 w-4 h-4 bg-red-500 text-white rounded-full text-[10px] opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                          ×
                                        </button>
                                      </div>
                                    ))}
                                  </div>
                                  <div className="flex gap-2 mb-2">
                                    <select
                                      onChange={(e) => {
                                        if (e.target.value) {
                                          const current = safeStr(patient.roundingData?.problems);
                                          const newValue = current ? current + '\n' + e.target.value : e.target.value;
                                          updateRoundingData(patient.id, 'problems', newValue);
                                          e.currentTarget.value = '';
                                        }
                                      }}
                                      className="flex-1 px-2 py-1 text-xs border border-yellow-300 rounded-lg"
                                    >
                                      <option value="">Select from all problems...</option>
                                      {(commonProblems || []).map((p: any) => (
                                        <option key={p.id} value={p.name}>{p.name}</option>
                                      ))}
                                    </select>
                                  </div>
                                  <div className="flex gap-2">
                                    <input
                                      type="text"
                                      placeholder="Add new problem to list..."
                                      className="flex-1 px-2 py-1 text-xs border border-yellow-300 rounded-lg"
                                      onKeyDown={(e) => {
                                        const val = (e.target as HTMLInputElement).value.trim();
                                        if (e.key === 'Enter' && val) {
                                          addCommonProblem(val);
                                          (e.target as HTMLInputElement).value = '';
                                        }
                                      }}
                                    />
                                    <button
                                      onClick={(e) => {
                                        const input = (e.currentTarget.previousElementSibling as HTMLInputElement);
                                        const val = input.value.trim();
                                        if (val) { addCommonProblem(val); input.value = ''; }
                                      }}
                                      className="px-2 py-1 bg-yellow-600 text-white text-xs rounded hover:bg-yellow-700"
                                    >
                                      Save
                                    </button>
                                  </div>
                                  <textarea
                                    value={safeStr(patient.roundingData?.problems)}
                                    onChange={(e) => updateRoundingData(patient.id, 'problems', e.target.value)}
                                    placeholder="Problems"
                                    rows={3}
                                    className="w-full px-3 py-2 text-sm border border-yellow-300 rounded-lg mt-2"
                                  />
                                </div>

                                {/* Bloodwork + CXR */}
                                <div className="col-span-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                                  <h5 className="text-sm font-bold text-green-900 mb-2">Quick Add Diagnostics</h5>
                                  <div className="mb-3">
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">Blood Work (paste full block)</label>
                                    <textarea
                                      value={safeStr(patient.bwInput)}
                                      onChange={(e) => updatePatientField(patient.id, 'bwInput', e.target.value)}
                                      placeholder="Paste blood work results..."
                                      rows={3}
                                      className="w-full px-3 py-2 text-sm border rounded-lg mb-2"
                                    />
                                    <button
                                      onClick={() => parseBloodWork(patient.id, safeStr(patient.bwInput))}
                                      className="px-3 py-1 bg-green-600 text-white text-xs rounded-lg hover:bg-green-700"
                                    >
                                      Extract Abnormals (no ref ranges in output)
                                    </button>
                                  </div>
                                  <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">Chest X-ray</label>
                                    <div className="flex gap-2 mb-2">
                                      <select
                                        value={safeStr(patient.xrayStatus) || 'NSF'}
                                        onChange={(e) => updatePatientField(patient.id, 'xrayStatus', e.target.value)}
                                        className="px-3 py-2 text-sm border rounded-lg"
                                      >
                                        <option>NSF</option>
                                        <option>Pending</option>
                                        <option>Other</option>
                                      </select>
                                      {patient.xrayStatus === 'Other' && (
                                        <input
                                          type="text"
                                          value={safeStr(patient.xrayOther)}
                                          onChange={(e) => updatePatientField(patient.id, 'xrayOther', e.target.value)}
                                          placeholder="Describe findings..."
                                          className="flex-1 px-3 py-2 text-sm border rounded-lg"
                                        />
                                      )}
                                    </div>
                                    <button
                                      onClick={() => {
                                        const status = safeStr(patient.xrayStatus);
                                        let line = 'CXR: ';
                                        if (status === 'NSF') line += 'NSF';
                                        else if (status === 'Pending') line += 'pending';
                                        else line += safeStr(patient.xrayOther);
                                        const currentDx = safeStr(patient.roundingData?.diagnosticFindings);
                                        const newDx = currentDx ? currentDx + '\n' + line : line;
                                        updateRoundingData(patient.id, 'diagnosticFindings', newDx);
                                        updatePatientField(patient.id, 'xrayOther', '');
                                      }}
                                      className="px-3 py-1 bg-green-600 text-white text-xs rounded-lg hover:bg-green-700"
                                    >
                                      Add CXR to Findings
                                    </button>
                                  </div>
                                </div>

                                {/* Diagnostics text */}
                                <textarea
                                  value={safeStr(patient.roundingData?.diagnosticFindings)}
                                  onChange={(e) => updateRoundingData(patient.id, 'diagnosticFindings', e.target.value)}
                                  placeholder="Diagnostic Findings"
                                  rows={3}
                                  className="col-span-2 px-3 py-2 text-sm border rounded-lg"
                                />

                                {/* Therapeutics chip system */}
                                <div className="col-span-2 p-3 bg-cyan-50 border border-cyan-200 rounded-lg">
                                  <h5 className="text-sm font-bold text-cyan-900 mb-2">Current Therapeutics</h5>
                                  <div className="flex flex-wrap gap-1 mb-2">
                                    {(commonMedications || []).slice(0, 12).map((med: any) => (
                                      <div key={med.id} className="group relative">
                                        <button
                                          onClick={() => {
                                            const current = safeStr(patient.roundingData?.therapeutics);
                                            const newValue = current ? current + '\n' + med.name : med.name;
                                            updateRoundingData(patient.id, 'therapeutics', newValue);
                                          }}
                                          className="px-2 py-1 text-xs bg-cyan-100 text-cyan-800 rounded-full hover:scale-105 transition"
                                        >
                                          + {med.name}
                                        </button>
                                        <button
                                          onClick={() => deleteCommonItem('commonMedications', med.id)}
                                          className="absolute -top-2 -right-2 w-4 h-4 bg-red-500 text-white rounded-full text-[10px] opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                          ×
                                        </button>
                                      </div>
                                    ))}
                                  </div>
                                  <div className="flex gap-2 mb-2">
                                    <select
                                      onChange={(e) => {
                                        if (e.target.value) {
                                          const current = safeStr(patient.roundingData?.therapeutics);
                                          const newValue = current ? current + '\n' + e.target.value : e.target.value;
                                          updateRoundingData(patient.id, 'therapeutics', newValue);
                                          e.currentTarget.value = '';
                                        }
                                      }}
                                      className="flex-1 px-2 py-1 text-xs border border-cyan-300 rounded-lg"
                                    >
                                      <option value="">Select from all medications...</option>
                                      {(commonMedications || []).map((med: any) => (
                                        <option key={med.id} value={med.name}>{med.name}</option>
                                      ))}
                                    </select>
                                  </div>
                                  <div className="flex gap-2">
                                    <input
                                      type="text"
                                      placeholder="Add new medication to list..."
                                      className="flex-1 px-2 py-1 text-xs border border-cyan-300 rounded-lg"
                                      onKeyDown={(e) => {
                                        const val = (e.target as HTMLInputElement).value.trim();
                                        if (e.key === 'Enter' && val) {
                                          addCommonMedication(val);
                                          (e.target as HTMLInputElement).value = '';
                                        }
                                      }}
                                    />
                                    <button
                                      onClick={(e) => {
                                        const input = (e.currentTarget.previousElementSibling as HTMLInputElement);
                                        const val = input.value.trim();
                                        if (val) { addCommonMedication(val); input.value = ''; }
                                      }}
                                      className="px-2 py-1 bg-cyan-600 text-white text-xs rounded hover:bg-cyan-700"
                                    >
                                      Save
                                    </button>
                                  </div>
                                  <textarea
                                    value={safeStr(patient.roundingData?.therapeutics)}
                                    onChange={(e) => updateRoundingData(patient.id, 'therapeutics', e.target.value)}
                                    placeholder="Current Therapeutics"
                                    rows={3}
                                    className="w-full px-3 py-2 text-sm border border-cyan-300 rounded-lg mt-2"
                                  />
                                </div>

                                {/* Replace IVC / Fluids / CRI with nuanced select */}
                                {['replaceIVC', 'replaceFluids', 'replaceCRI'].map((field) => {
                                  const value = safeStr(patient.roundingData?.[field]);
                                  const showNote = value.startsWith('Yes –') || value.startsWith('No –');
                                  return (
                                    <div key={field} className="col-span-2 md:col-span-1">
                                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                                        {field === 'replaceIVC' ? 'Replace IVC' : field === 'replaceFluids' ? 'Replace Fluids' : 'Replace CRI'}
                                      </label>
                                      <select
                                        value={value || ''}
                                        onChange={(e) => updateRoundingData(patient.id, field, e.target.value)}
                                        className="w-full px-3 py-2 text-sm border rounded-lg"
                                      >
                                        <option value="">Select…</option>
                                        <option>Yes</option>
                                        <option>No</option>
                                        <option>N/A</option>
                                        <option>Yes – but…</option>
                                        <option>No – but…</option>
                                      </select>
                                      {showNote && (
                                        <input
                                          type="text"
                                          placeholder="Add note…"
                                          className="mt-2 w-full px-3 py-2 text-sm border rounded-lg"
                                          onChange={(e) => updateRoundingData(patient.id, field, `${value} ${e.target.value}`.trim())}
                                        />
                                      )}
                                    </div>
                                  );
                                })}

                                {/* Overnight + Comments */}
                                <input
                                  type="text"
                                  value={safeStr(patient.roundingData?.overnightDiagnostics)}
                                  onChange={(e) => updateRoundingData(patient.id, 'overnightDiagnostics', e.target.value)}
                                  placeholder="Overnight Diagnostics"
                                  className="px-3 py-2 text-sm border rounded-lg"
                                />
                                <textarea
                                  value={safeStr(patient.roundingData?.overnightConcerns)}
                                  onChange={(e) => updateRoundingData(patient.id, 'overnightConcerns', e.target.value)}
                                  placeholder="Overnight Concerns/Alerts"
                                  rows={2}
                                  className="px-3 py-2 text-sm border rounded-lg"
                                />
                                <div className="col-span-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                  <h5 className="text-sm font-bold text-blue-900 mb-2">Additional Comments</h5>
                                  <div className="flex flex-wrap gap-1 mb-2">
                                    {(commonComments || []).slice(0, 10).map((c: any) => (
                                      <div key={c.id} className="group relative">
                                        <button
                                          onClick={() => {
                                            const current = safeStr(patient.roundingData?.additionalComments);
                                            const newValue = current ? current + '\n' + c.name : c.name;
                                            updateRoundingData(patient.id, 'additionalComments', newValue);
                                          }}
                                          className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full hover:scale-105 transition"
                                        >
                                          + {c.name.length > 40 ? c.name.substring(0, 40) + '…' : c.name}
                                        </button>
                                        <button
                                          onClick={() => deleteCommonItem('commonComments', c.id)}
                                          className="absolute -top-2 -right-2 w-4 h-4 bg-red-500 text-white rounded-full text-[10px] opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                          ×
                                        </button>
                                      </div>
                                    ))}
                                  </div>
                                  <div className="flex gap-2 mb-2">
                                    <select
                                      onChange={(e) => {
                                        if (e.target.value) {
                                          const current = safeStr(patient.roundingData?.additionalComments);
                                          const newValue = current ? current + '\n' + e.target.value : e.target.value;
                                          updateRoundingData(patient.id, 'additionalComments', newValue);
                                          e.currentTarget.value = '';
                                        }
                                      }}
                                      className="flex-1 px-2 py-1 text-xs border border-blue-300 rounded-lg"
                                    >
                                      <option value="">Select from all comments...</option>
                                      {(commonComments || []).map((c: any) => (
                                        <option key={c.id} value={c.name}>{c.name}</option>
                                      ))}
                                    </select>
                                  </div>
                                  <div className="flex gap-2">
                                    <input
                                      type="text"
                                      placeholder="Add new comment to list..."
                                      className="flex-1 px-2 py-1 text-xs border border-blue-300 rounded-lg"
                                      onKeyDown={(e) => {
                                        const val = (e.target as HTMLInputElement).value.trim();
                                        if (e.key === 'Enter' && val) {
                                          addCommonComment(val);
                                          (e.target as HTMLInputElement).value = '';
                                        }
                                      }}
                                    />
                                    <button
                                      onClick={(e) => {
                                        const input = (e.currentTarget.previousElementSibling as HTMLInputElement);
                                        const val = input.value.trim();
                                        if (val) { addCommonComment(val); input.value = ''; }
                                      }}
                                      className="px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
                                    >
                                      Save
                                    </button>
                                  </div>
                                  <textarea
                                    value={safeStr(patient.roundingData?.additionalComments)}
                                    onChange={(e) => updateRoundingData(patient.id, 'additionalComments', e.target.value)}
                                    placeholder="Additional Comments"
                                    rows={3}
                                    className="w-full px-3 py-2 text-sm border border-blue-300 rounded-lg mt-2"
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {/* PATIENT INFO */}
                        {curTab === 'Patient Info' && (
                          <div className="border rounded-lg">
                            <button onClick={() => toggleSection(patient.id, 'info')} className="w-full flex justify-between items-center p-3 hover:bg-gray-50">
                              <span className="font-semibold">Patient Info</span>
                              <ChevronDown className={expandedSections[patient.id]?.info ? 'rotate-180 transition-transform' : 'transition-transform'} />
                            </button>
                            {expandedSections[patient.id]?.info && (
                              <div className="p-3 border-t grid grid-cols-2 gap-3">
                                <input
                                  type="text"
                                  value={safeStr(patient.patientInfo?.patientId)}
                                  onChange={(e) => updatePatientInfo(patient.id, 'patientId', e.target.value)}
                                  placeholder="Patient ID"
                                  className="px-3 py-2 text-sm border rounded-lg"
                                />
                                <input
                                  type="text"
                                  value={safeStr(patient.patientInfo?.ownerName)}
                                  onChange={(e) => updatePatientInfo(patient.id, 'ownerName', e.target.value)}
                                  placeholder="Owner Name"
                                  className="px-3 py-2 text-sm border rounded-lg"
                                />
                                <input
                                  type="text"
                                  value={safeStr(patient.patientInfo?.ownerPhone)}
                                  onChange={(e) => updatePatientInfo(patient.id, 'ownerPhone', e.target.value)}
                                  placeholder="Owner Phone"
                                  className="px-3 py-2 text-sm border rounded-lg"
                                />
                                <select
                                  value={safeStr(patient.patientInfo?.species) || 'Canine'}
                                  onChange={(e) => updatePatientInfo(patient.id, 'species', e.target.value)}
                                  className="px-3 py-2 text-sm border rounded-lg"
                                >
                                  <option>Canine</option>
                                  <option>Feline</option>
                                </select>
                                <input
                                  type="text"
                                  value={safeStr(patient.patientInfo?.breed)}
                                  onChange={(e) => updatePatientInfo(patient.id, 'breed', e.target.value)}
                                  placeholder="Breed"
                                  className="px-3 py-2 text-sm border rounded-lg"
                                />
                                <input
                                  type="text"
                                  value={safeStr(patient.patientInfo?.sex)}
                                  onChange={(e) => updatePatientInfo(patient.id, 'sex', e.target.value)}
                                  placeholder="Sex (MN/FS/MI/FI)"
                                  className="px-3 py-2 text-sm border rounded-lg"
                                />
                                <input
                                  type="text"
                                  value={safeStr(patient.patientInfo?.weight)}
                                  onChange={(e) => updatePatientInfo(patient.id, 'weight', e.target.value)}
                                  placeholder="Weight (e.g., 4.9 kg)"
                                  className="px-3 py-2 text-sm border rounded-lg"
                                />
                                <input
                                  type="text"
                                  value={safeStr(patient.patientInfo?.age)}
                                  onChange={(e) => updatePatientInfo(patient.id, 'age', e.target.value)}
                                  placeholder="Age (e.g., 4yo)"
                                  className="px-3 py-2 text-sm border rounded-lg"
                                />
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Floating Quick Add */}
      <div className="fixed bottom-6 right-6 z-50">
        {/* Example: global quick actions */}
        <div className="flex flex-col items-end gap-2">
          <button
            onClick={() => addMorningTasksToAll()}
            className="px-3 py-2 bg-orange-600 text-white rounded-md shadow hover:bg-orange-700"
            title="Add Morning Tasks To All Patients"
          >
            + Morning to All
          </button>
        </div>
      </div>
    </div>
  );
}
