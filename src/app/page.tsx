'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Trash2, Clock, X, ChevronDown, ChevronUp } from 'lucide-react';
import {
  useFirebase,
  useCollection,
  useMemoFirebase,
  addDocumentNonBlocking,
  updateDocumentNonBlocking,
  deleteDocumentNonBlocking,
  initiateAnonymousSignIn,
} from '@/firebase';
import { collection, doc, query } from 'firebase/firestore';
import { GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { parseSignalment } from '@/lib/parseSignalment';

/* ----------------------------- Small Utilities ---------------------------- */

// Short signalment like "4yo MN Frenchie" (years only, no months/days)
function buildShortSignalment(parsed: Partial<Record<string, string>>) {
  // Age → years only
  let years = '';
  const ageText = parsed.age || '';
  // try "10 years 6 months 7 days" or "1 year" or "10y" variants
  const yMatch =
    /\b(\d+)\s*(?:years?|yrs?|y)\b/i.exec(ageText) ||
    /\b(\d+)\s*-\s*\d+\.\d+\s*kg/i.exec(ageText); // fallback when age line like "1 year - 4.90kg" (years in first num)
  if (yMatch) years = `${yMatch[1]}yo`;

  // Sex → normalize (M/F/MN/FS/u)
  const sexRaw = (parsed.sex || '').toLowerCase();
  let sex = '';
  if (/mn|neut|castr|m neut|mc\b/.test(sexRaw) || /\bmn\b/.test(sexRaw)) sex = 'MN';
  else if (/fs|spay|f neut|ovh\b/.test(sexRaw) || /\bfs\b/.test(sexRaw)) sex = 'FS';
  else if (/\bmale\b|^m$/.test(sexRaw)) sex = 'M';
  else if (/\bfemale\b|^f$/.test(sexRaw)) sex = 'F';

  // Breed → keep as written, prefer shorter “Frenchie” mapping for common ones
  let breed = (parsed.breed || '').trim();
  if (/french/i.test(breed)) breed = 'Frenchie';
  if (/chihuahua/i.test(breed) && /mix/i.test(breed)) breed = 'Chihuahua mix';

  const parts = [years, sex, breed].filter(Boolean);
  return parts.join(' ');
}

// Extract only abnormal tokens from bloodwork text (no reference ranges)
function parseBloodworkAbnormals(raw: string) {
  // Accept patterns like "WBC 18.2", "K: 6.0 H", "ALT=300 ↑"
  // We’ll capture NAME + VALUE + trailing H/L/↑/↓ if present, and strip ranges.
  const lines = raw.split(/\n+/);
  const abns: string[] = [];
  const tok = /([A-Za-z]{2,5})\s*[:=]?\s*(-?\d+(?:\.\d+)?)(?:\s*(?:H|L|↑|↓))?/g;

  for (const line of lines) {
    // skip obvious range lines
    if (/(\d+\s*-\s*\d+)/.test(line)) continue;
    // collect tokens
    let m: RegExpExecArray | null;
    const found: string[] = [];
    while ((m = tok.exec(line)) !== null) {
      const name = m[1].toUpperCase();
      const val = m[2];
      // keep only common analytes (quick guard)
      if (/^(WBC|RBC|HGB|HCT|PLT|NEUT|LYMPH|MONO|EOS|BASO|BUN|CREA?T|GLU|ALT|AST|ALP|TBIL|ALB|TP|CA|PHOS|NA|K|CL|GLOB|PCV|TS)$/.test(name)) {
        found.push(`${name} ${val}`);
      }
    }
    if (found.length) abns.push(...found);
  }
  // de-dupe
  return Array.from(new Set(abns));
}

// Compute RER (Dog/Cat same formula, just labeled)
function computeRER(weightStr: string) {
  if (!weightStr) return '';
  let kg = 0;
  const m = weightStr.match(/(\d+(?:\.\d+)?)/);
  if (m) kg = parseFloat(m[1]);
  if (/lb/.test(weightStr.toLowerCase())) kg = kg / 2.20462;
  if (!kg || !isFinite(kg)) return '';
  const rer = Math.round(70 * Math.pow(kg, 0.75));
  return `${rer} kcal/day`;
}

// TSV for Sheets: no header, separate columns
function buildRoundingTSVRows(patients: any[]) {
  const rows: string[] = [];
  (patients || []).forEach((patient) => {
    const r = patient.roundingData || {};
    const cols = [
      patient.name || '',
      r.signalment || '',
      r.location || '',
      r.icuCriteria || '',
      r.codeStatus || 'Yellow',
      (r.problems || '').replace(/\n/g, '; '),
      (r.diagnosticFindings || '').replace(/\n/g, '; '),
      (r.therapeutics || '').replace(/\n/g, '; '),
      r.replaceIVC || '',
      r.replaceFluids || '',
      r.replaceCRI || '',
      r.overnightDiagnostics || '',
      (r.overnightConcerns || '').replace(/\n/g, '; '),
      (r.additionalComments || '').replace(/\n/g, '; ')
    ];
    rows.push(cols.join('\t'));
  });
  return rows;
}

async function copyRoundingTSVToClipboard(patients: any[]) {
  const rows = buildRoundingTSVRows(patients);
  const tsv = rows.join('\n');
  await navigator.clipboard.writeText(tsv);
  return rows.length;
}

/* ---------------------------------- App ---------------------------------- */

export default function VetPatientTracker() {
  const { firestore, auth, user, isUserLoading } = useFirebase();

  const patientsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, `users/${user.uid}/patients`));
  }, [firestore, user]);
  const { data: patients = [], isLoading: isLoadingPatients } = useCollection(patientsQuery);

  const generalTasksQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, `users/${user.uid}/generalTasks`));
  }, [firestore, user]);
  const { data: generalTasks = [], isLoading: isLoadingGeneralTasks } = useCollection(generalTasksQuery);

  const commonProblemsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, `users/${user.uid}/commonProblems`));
  }, [firestore, user]);
  const { data: commonProblems = [], isLoading: isLoadingCommonProblems } = useCollection(commonProblemsQuery);

  const commonCommentsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, `users/${user.uid}/commonComments`));
  }, [firestore, user]);
  const { data: commonComments = [], isLoading: isLoadingCommonComments } = useCollection(commonCommentsQuery);

  const commonMedicationsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, `users/${user.uid}/commonMedications`));
  }, [firestore, user]);
  const { data: commonMedications = [], isLoading: isLoadingCommonMedications } = useCollection(commonMedicationsQuery);

  // UI state
  const [newPatient, setNewPatient] = useState({ name: '', type: 'Surgery' });
  const [expandedPatients, setExpandedPatients] = useState<Record<string, boolean>>({});
  const [showMorningOverview, setShowMorningOverview] = useState(false);
  const [newGeneralTask, setNewGeneralTask] = useState('');

  // Per-patient selected medication (for dose helper) — outside of map (fixes hooks error)
  const [selectedMedByPatient, setSelectedMedByPatient] = useState<Record<string, string>>({});

  const procedureTypes = ['Surgery', 'MRI', 'Medical', 'Other'];

  const commonGeneralTasksTemplates = ['Check Comms', 'Check Emails', 'Draw Up Contrast', 'Rounding'];

  const admitTasks: Record<string, string[]> = {
    Surgery: ['Surgery Slip', 'Written on Board', 'Print 4 Large Stickers', 'Print 2 Sheets Small Stickers', 'Print Surgery Sheet'],
    MRI: ['Blood Work', 'Chest X-rays', 'MRI Anesthesia Sheet', 'NPO', 'Black Book', 'Print 5 Stickers', 'Print 1 Sheet Small Stickers'],
    Medical: ['Admission SOAP', 'Treatment Sheet Created', 'Owner Admission Call'],
    Other: ['Admission SOAP', 'Owner Admission Call'],
  };

  const morningTasks = [
    'Owner Called',
    'Daily SOAP Done',
    'Vet Radar Sheet Checked',
    'MRI Findings Inputted (if needed)',
    'Read up on appointments', // new main morning task
  ];

  const eveningTasks = [
    // removed phone call per previous request
    'Vet Radar Done',
    'Rounding Sheet Done',
    'Sticker on Daily Sheet',
    'Owner Update Call', // if you want it gone from evening, delete this line
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
    'Pain Assessment',
  ];

  // Auth UI
  const [authBusy, setAuthBusy] = useState(false);
  const provider = useMemo(() => new GoogleAuthProvider(), []);

  const handleGoogleSignIn = async () => {
    if (!auth) return;
    try {
      setAuthBusy(true);
      await signInWithPopup(auth, provider);
    } catch (e) {
      console.error('Google sign-in failed:', e);
      alert('Sign-in failed. Please try again.');
    } finally {
      setAuthBusy(false);
    }
  };

  const handleGuest = async () => {
    if (!auth) return;
    try {
      setAuthBusy(true);
      await initiateAnonymousSignIn(auth);
    } catch (e) {
      console.error('Anonymous sign-in failed:', e);
      alert('Guest sign-in failed. Please try again.');
    } finally {
      setAuthBusy(false);
    }
  };

  const handleSignOut = async () => {
    if (!auth) return;
    try {
      await signOut(auth);
    } catch (e) {
      console.error('Sign-out failed:', e);
    }
  };

  // If not signed in, show sign-in card
  if (!user && !isUserLoading) {
    return (
      <div className="min-h-screen grid place-items-center bg-gradient-to-br from-blue-50 to-indigo-50 p-6">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-6 space-y-4">
          <h1 className="text-2xl font-bold text-gray-800">RBVH Patient Task Manager</h1>
          <p className="text-gray-600">Sign in to sync your patients, tasks, and lists across devices.</p>

          <button
            disabled={authBusy}
            onClick={handleGoogleSignIn}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 transition"
          >
            {authBusy ? 'Signing in…' : 'Sign in with Google'}
          </button>

          <div className="flex items-center gap-2">
            <div className="h-px bg-gray-200 flex-1" />
            <span className="text-xs text-gray-400">or</span>
            <div className="h-px bg-gray-200 flex-1" />
          </div>

          <button
            disabled={authBusy}
            onClick={handleGuest}
            className="w-full px-4 py-2 rounded-lg border-2 border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition"
          >
            {authBusy ? 'Preparing guest…' : 'Continue as guest'}
          </button>

          <p className="text-xs text-gray-500">You can start as a guest and link your account later.</p>
        </div>
      </div>
    );
  }

  /* ------------------------------- Firestore helpers ------------------------------ */

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
    const taskRef = doc(firestore, `users/${user.uid}/generalTasks`, taskId);
    updateDocumentNonBlocking(taskRef, { completed: !completed });
  };

  const removeGeneralTask = (taskId: string) => {
    if (!firestore || !user) return;
    const taskRef = doc(firestore, `users/${user.uid}/generalTasks`, taskId);
    deleteDocumentNonBlocking(taskRef);
  };

  const addCommonProblem = (newProblem: string) => {
    if (!newProblem.trim() || !firestore || !user) return;
    if (!commonProblems.some(p => p.name === newProblem.trim())) {
      addDocumentNonBlocking(collection(firestore, `users/${user.uid}/commonProblems`), { name: newProblem.trim() });
    }
  };
  const removeCommonProblem = (id: string) => {
    if (!firestore || !user) return;
    const ref = doc(firestore, `users/${user.uid}/commonProblems`, id);
    deleteDocumentNonBlocking(ref);
  };

  const addCommonComment = (newComment: string) => {
    if (!newComment.trim() || !firestore || !user) return;
    if (!commonComments.some(c => c.name === newComment.trim())) {
      addDocumentNonBlocking(collection(firestore, `users/${user.uid}/commonComments`), { name: newComment.trim() });
    }
  };
  const removeCommonComment = (id: string) => {
    if (!firestore || !user) return;
    const ref = doc(firestore, `users/${user.uid}/commonComments`, id);
    deleteDocumentNonBlocking(ref);
  };

  const addCommonMedication = (newMedication: string) => {
    if (!newMedication.trim() || !firestore || !user) return;
    if (!commonMedications.some(m => m.name === newMedication.trim())) {
      addDocumentNonBlocking(collection(firestore, `users/${user.uid}/commonMedications`), { name: newMedication.trim() });
    }
  };
  const removeCommonMedication = (id: string) => {
    if (!firestore || !user) return;
    const ref = doc(firestore, `users/${user.uid}/commonMedications`, id);
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
          scanType: 'Brain',
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

  const toggleExpanded = (patientId: string) => {
    setExpandedPatients(prev => ({ ...prev, [patientId]: !prev[patientId] }));
  };

  const updateStatus = (patientId: string, newStatus: string) => {
    updatePatientField(patientId, 'status', newStatus);
  };

  const updatePatientType = (patientId: string, newType: string) => {
    const patient = patients.find(p => p.id === patientId);
    if (!patient) return;

    const updateData: any = { type: newType };
    if (newType === 'MRI' && !patient.mriData) {
      updateData.mriData = { weight: '', weightUnit: 'kg', scanType: 'Brain', calculated: false, copyableString: '' };
    }
    if (newType !== 'MRI' && patient.mriData) {
      updateData.mriData = null;
    }
    updatePatientData(patientId, updateData);
  };

  const updateRoundingData = (patientId: string, field: string, value: any) => {
    const patient = patients.find(p => p.id === patientId);
    if (!patient) return;
    const newRoundingData = { ...patient.roundingData, [field]: value };
    updatePatientField(patientId, 'roundingData', newRoundingData);
  };

  const addTaskToPatient = (patientId: string, taskName: string) => {
    const patient = patients.find(p => p.id === patientId);
    if (!patient) return;
    const exists = (patient.tasks || []).some((t: any) => t.name === taskName);
    if (!exists) {
      const newTasks = [...(patient.tasks || []), { name: taskName, completed: false, id: Date.now() + Math.random() }];
      updatePatientField(patientId, 'tasks', newTasks);
    }
  };

  const removeTask = (patientId: string, taskId: number) => {
    const patient = patients.find(p => p.id === patientId);
    if (!patient) return;
    const newTasks = (patient.tasks || []).filter((t: any) => t.id !== taskId);
    updatePatientField(patientId, 'tasks', newTasks);
  };

  const toggleTask = (patientId: string, taskId: number) => {
    const patient = patients.find(p => p.id === patientId);
    if (!patient) return;
    const newTasks = (patient.tasks || []).map((t: any) => (t.id === taskId ? { ...t, completed: !t.completed } : t));
    updatePatientField(patientId, 'tasks', newTasks);
  };

  const addMorningTasks = (patientId: string) => {
    const patient = patients.find(p => p.id === patientId);
    if (!patient) return;
    const newTasks = [...(patient.tasks || [])];
    morningTasks.forEach(task => {
      if (!(patient.tasks || []).some((t: any) => t.name === task)) {
        newTasks.push({ name: task, completed: false, id: Date.now() + Math.random() });
      }
    });
    updatePatientField(patientId, 'tasks', newTasks);
  };

  const addEveningTasks = (patientId: string) => {
    const patient = patients.find(p => p.id === patientId);
    if (!patient) return;
    const newTasks = [...(patient.tasks || [])];
    eveningTasks.forEach(task => {
      if (!(patient.tasks || []).some((t: any) => t.name === task)) {
        newTasks.push({ name: task, completed: false, id: Date.now() + Math.random() });
      }
    });
    updatePatientField(patientId, 'tasks', newTasks);
  };

  const addMorningTasksToAll = () => {
    patients.forEach(p => addMorningTasks(p.id));
  };

  const resetDailyTasks = (patientId: string) => {
    const patient = patients.find(p => p.id === patientId);
    if (!patient) return;
    const allDaily = [...morningTasks, ...eveningTasks];
    const filtered = (patient.tasks || []).filter((t: any) => !allDaily.includes(t.name));
    updatePatientField(patientId, 'tasks', filtered);
  };

  const getCompletionStatus = (patient: any) => {
    const total = (patient.tasks || []).length;
    const completed = (patient.tasks || []).filter((t: any) => t.completed).length;
    return { completed, total, percentage: total > 0 ? (completed / total) * 100 : 0 };
  };

  const getStatusColor = (status: string) => {
    const colors: any = {
      'New Admit': 'bg-yellow-100 text-yellow-800 border-yellow-300',
      'Pre-procedure': 'bg-blue-100 text-blue-800 border-blue-300',
      'In Procedure': 'bg-purple-100 text-purple-800 border-purple-300',
      'Recovery': 'bg-orange-100 text-orange-800 border-orange-300',
      'Monitoring': 'bg-indigo-100 text-indigo-800 border-indigo-300',
      'Ready for Discharge': 'bg-green-100 text-green-800 border-green-300',
      'Discharged': 'bg-gray-100 text-gray-800 border-gray-300',
    };
    return colors[status] || 'bg-gray-100 text-gray-800 border-gray-300';
  };

  const toggleAll = (expand: boolean) => {
    const n: Record<string, boolean> = {};
    patients.forEach(p => (n[p.id] = expand));
    setExpandedPatients(n);
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey) {
        switch (e.key) {
          case 'n':
            e.preventDefault();
            const el = document.getElementById('new-patient-input') as HTMLInputElement | null;
            el?.focus();
            break;
          case 'e':
            e.preventDefault();
            toggleAll(!Object.values(expandedPatients).some(v => v));
            break;
          case 'm':
            e.preventDefault();
            addMorningTasksToAll();
            break;
        }
      }
    };
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expandedPatients, patients]);

  // Bloodwork parse (no AI)
  const parseBloodWork = (patientId: string, bwText: string) => {
    const patient = patients.find(p => p.id === patientId);
    if (!patient || !bwText.trim()) {
      alert('Please paste blood work results first');
      return;
    }
    const abnormals = parseBloodworkAbnormals(bwText);
    const currentDx = patient.roundingData?.diagnosticFindings || '';
    const bwLine = abnormals.length > 0 ? 'CBC/CHEM: ' + abnormals.join(', ') : 'CBC/CHEM: NAD';
    const newDx = currentDx ? currentDx + '\n' + bwLine : bwLine;
    updateRoundingData(patientId, 'diagnosticFindings', newDx);
    updatePatientField(patientId, 'bwInput', '');
  };

  // Quick import patient details (no AI)
  const handleParsePatientDetails = (patientId: string, detailsText: string) => {
    const patient = patients.find(p => p.id === patientId);
    if (!patient || !detailsText.trim()) {
      alert('Please paste patient details first');
      return;
    }
    try {
      const { data: parsed } = parseSignalment(detailsText);

      const newPatientInfo = { ...patient.patientInfo };
      if (parsed.patientId) newPatientInfo.patientId = parsed.patientId;
      if (parsed.ownerName) newPatientInfo.ownerName = parsed.ownerName;
      if (parsed.ownerPhone) newPatientInfo.ownerPhone = parsed.ownerPhone;
      if (parsed.species) newPatientInfo.species = parsed.species;
      if (parsed.breed) newPatientInfo.breed = parsed.breed;
      if (parsed.sex) newPatientInfo.sex = parsed.sex;
      if (parsed.weight) newPatientInfo.weight = parsed.weight;
      if (parsed.dob) newPatientInfo.dob = parsed.dob;
      if (parsed.age) newPatientInfo.age = parsed.age;
      
      const signalment = buildShortSignalment({ age: parsed.age, sex: parsed.sex, breed: parsed.breed });

      const payload: any = {
        patientInfo: newPatientInfo,
        roundingData: { ...patient.roundingData, signalment },
        detailsInput: '',
      };

      // If MRI and weight found, set mri weight/unit
      if (patient.type === 'MRI' && patient.mriData && parsed.weight) {
        const m = parsed.weight.match(/(\d+(?:\.\d+)?)\s*(kg|lbs)/i);
        if (m) {
          payload.mriData = {
            ...patient.mriData,
            weight: m[1],
            weightUnit: m[2].toLowerCase(),
            calculated: false,
            copyableString: '',
          };
        }
      }

      updatePatientData(patientId, payload);
    } catch (e) {
      console.error('Parsing error:', e);
      alert('Parsing of patient details failed. Please enter the information manually.');
    }
  };

  // MRI calculator (rounded kg + patient ID in line)
  const updateMRIData = (patientId: string, field: string, value: any) => {
    const patient = patients.find(p => p.id === patientId);
    if (!patient || !patient.mriData) return;
    const newMri = { ...patient.mriData, [field]: value, calculated: false, copyableString: '' };
    updatePatientField(patientId, 'mriData', newMri);
  };

  const calculateMRIDrugs = (patientId: string) => {
    const patient = patients.find(p => p.id === patientId);
    if (!patient || !patient.mriData || !patient.mriData.weight) return;
  
    let weightKg = parseFloat(patient.mriData.weight);
    if (patient.mriData.weightUnit === 'lbs') {
      weightKg = weightKg / 2.20462;
    }
  
    const kgRounded = Math.round(weightKg);
    const lbs = (kgRounded * 2.20462).toFixed(1);
  
    const isBrain = patient.mriData.scanType === 'Brain';
    const preMedDose = kgRounded * 0.2;
    const preMedVolume = preMedDose / 10;
    const valiumDose = kgRounded * 0.25;
    const valiumVolume = valiumDose / 5;
    const contrastVolume = kgRounded * 0.22;
    const preMedDrug = isBrain ? 'Butorphanol' : 'Methadone';
  
    const line1 = `${patient.name}\t${patient.patientInfo?.patientId || ''}\t${kgRounded}\t\t${patient.mriData.scanType}`;
    const line2 = `(Name)\t(ID)\t(kg)\t(lbs)\t(Area)\n${preMedDrug} dose (mg) @ 0.2mg/kg\t${preMedDose.toFixed(2)}\tValium dose (mg) @ 0.25mg/kg\t${valiumDose.toFixed(2)}\tContrast volume (ml) @ 0.22ml/kg\t${contrastVolume.toFixed(1)}\n${preMedDrug} volume (ml) @ 10mg/ml\t${preMedVolume.toFixed(2)}\tValium volume (ml) @ 5mg/ml\t${valiumVolume.toFixed(2)}`;
  
    const newMriData = {
      ...patient.mriData,
      weightKg: String(kgRounded),
      preMedDrug,
      preMedDose: preMedDose.toFixed(2),
      preMedVolume: preMedVolume.toFixed(2),
      valiumDose: valiumDose.toFixed(2),
      valiumVolume: valiumVolume.toFixed(2),
      contrastVolume: contrastVolume.toFixed(1),
      calculated: true,
      copyableString: `${line1}\n${line2}`,
    };
    updatePatientField(patientId, 'mriData', newMriData);
  };
  

  // RER text based on current weight/species
  const getRERText = (patient: any) => {
    const w = patient?.patientInfo?.weight || '';
    if (!w) return '';
    const rer = computeRER(w);
    if (!rer) return '';
    const sp = (patient?.patientInfo?.species || '').toLowerCase().includes('feline') ? 'Cat' : 'Dog';
    return `${sp} RER: ${rer}`;
  };

  /* ---------------------------------- Render ---------------------------------- */

  if (
    isUserLoading ||
    isLoadingPatients ||
    isLoadingGeneralTasks ||
    isLoadingCommonProblems ||
    isLoadingCommonComments ||
    isLoadingCommonMedications
  ) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50">
        <div className="text-center">
          <p className="text-xl font-semibold text-gray-700">Loading your VetCare Hub...</p>
          <p className="text-gray-500">Please wait a moment.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex justify-between items-center mb-4 gap-3">
            <div>
              <h1 className="text-3xl font-bold text-gray-800 mb-2">RBVH Patient Task Manager</h1>
              <p className="text-gray-600">Track tasks and prepare rounding sheets</p>
            </div>

            <div className="flex items-center gap-2">
              {/* User chip + sign out/link */}
              {user?.isAnonymous ? (
                <span className="px-3 py-1 rounded-full text-xs bg-yellow-100 text-yellow-800 border border-yellow-300">
                  Guest session
                </span>
              ) : (
                <span className="px-3 py-1 rounded-full text-xs bg-green-100 text-green-800 border border-green-300">
                  {user?.email || 'Signed in'}
                </span>
              )}
              {user?.isAnonymous ? (
                <button
                  onClick={handleGoogleSignIn}
                  className="px-3 py-1 rounded-lg text-sm font-semibold bg-blue-100 text-blue-800 hover:bg-blue-200 transition"
                  title="Link to Google account"
                >
                  Link account
                </button>
              ) : (
                <button
                  onClick={handleSignOut}
                  className="px-3 py-1 rounded-lg text-sm font-semibold bg-gray-100 text-gray-700 hover:bg-gray-200 transition"
                  title="Sign out"
                >
                  Sign out
                </button>
              )}

              {(patients || []).length > 0 && (
                <>
                  <button
                    onClick={() => toggleAll(false)}
                    className="px-4 py-2 rounded-lg font-semibold bg-gray-200 text-gray-800 hover:bg-gray-300 transition"
                  >
                    Collapse All
                  </button>
                  <button
                    onClick={() => toggleAll(true)}
                    className="px-4 py-2 rounded-lg font-semibold bg-gray-200 text-gray-800 hover:bg-gray-300 transition"
                  >
                    Expand All
                  </button>
                  <button
                    onClick={() => setShowMorningOverview(!showMorningOverview)}
                    className={'px-4 py-2 rounded-lg font-semibold transition ' + (showMorningOverview ? 'bg-orange-600 text-white' : 'bg-orange-100 text-orange-800 hover:bg-orange-200')}
                  >
                    {showMorningOverview ? 'Hide' : 'Show'} Morning Overview
                  </button>
                  <button
                    onClick={async () => {
                      const count = await copyRoundingTSVToClipboard(patients || []);
                      alert(`Copied ${count} row(s) to clipboard.\nPaste directly into Google Sheets.`);
                    }}
                    className="px-4 py-2 rounded-lg font-semibold bg-green-600 text-white hover:bg-green-700 transition"
                  >
                    Copy Rounding Rows (TSV)
                  </button>
                </>
              )}
            </div>
          </div>

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
              {procedureTypes.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
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
              {generalTasks.map((task: any) => (
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
                  <button
                    onClick={() => removeGeneralTask(task.id)}
                    className="text-gray-400 hover:text-red-600 transition"
                  >
                    <X size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* No patients */}
        {(patients || []).length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <p className="text-gray-500 text-lg">No patients added yet. Add your first patient above!</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {/* Morning overview */}
            {showMorningOverview && (
              <div className="bg-gradient-to-r from-orange-50 to-yellow-50 rounded-lg shadow-lg p-6 mb-2 border-2 border-orange-300">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-2xl font-bold text-orange-900">Complete Task Overview</h2>
                  <button
                    onClick={addMorningTasksToAll}
                    className="px-4 py-2 bg-orange-600 text-white font-semibold rounded-lg hover:bg-orange-700 transition"
                  >
                    Add Morning Tasks to All Patients
                  </button>
                </div>

                {/* General Tasks */}
                {generalTasks.length > 0 && (
                  <div className="mb-4 p-4 bg-indigo-50 border-2 border-indigo-300 rounded-lg">
                    <h3 className="font-bold text-indigo-900 mb-3 text-lg">General Tasks</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {generalTasks.map((task: any) => (
                        <label
                          key={task.id}
                          className={'flex items-center gap-2 p-2 rounded text-sm cursor-pointer ' + (task.completed ? 'bg-green-100 text-green-800' : 'bg-white text-indigo-900 border border-indigo-200')}
                        >
                          <input
                            type="checkbox"
                            checked={task.completed}
                            onChange={() => toggleGeneralTask(task.id, task.completed)}
                            className="w-4 h-4"
                          />
                          <span className={task.completed ? 'line-through' : ''}>
                            {task.name}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Patient cards */}
            {patients.map((patient: any) => {
              const { completed, total, percentage } = getCompletionStatus(patient);
              const isExpanded = !!expandedPatients[patient.id];

              // sort tasks: incomplete first, then completed
              const sortedTasks = [...(patient.tasks || [])].sort((a: any, b: any) => Number(a.completed) - Number(b.completed));

              return (
                <div key={patient.id} className="bg-white rounded-lg shadow-md">
                  <div className="flex justify-between items-start p-5 border-b">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <button
                          onClick={() => toggleExpanded(patient.id)}
                          className="text-gray-600 hover:text-gray-800 p-1"
                        >
                          {isExpanded ? <ChevronUp size={24} /> : <ChevronDown size={24} />}
                        </button>
                        <h3 className="text-xl font-bold text-gray-800">{patient.name}</h3>
                        <span className="px-3 py-1 rounded-full text-sm font-semibold bg-blue-600 text-white">
                          {patient.type}
                        </span>
                        <span className="flex items-center gap-1 text-sm text-gray-500">
                          <Clock size={14} />
                          {patient.addedTime}
                        </span>
                      </div>

                      <div className="flex items-center gap-4 mb-2 text-sm text-gray-600 ml-9">
                        {patient.roundingData?.signalment && <span className="font-medium">📋 {patient.roundingData.signalment}</span>}
                        {patient.patientInfo?.weight && <span className="font-medium">⚖️ {patient.patientInfo.weight}</span>}
                        {patient.patientInfo?.patientId && <span className="font-medium">🆔 ID: {patient.patientInfo.patientId}</span>}
                        {getRERText(patient) && <span className="font-medium">🔥 {getRERText(patient)}</span>}
                      </div>

                      <div className="flex items-center gap-3 mb-3 ml-9">
                        <span className="text-sm font-medium text-gray-600">Type:</span>
                        <select
                          value={patient.type}
                          onChange={(e) => updatePatientType(patient.id, e.target.value)}
                          className="px-3 py-1 rounded-lg border-2 text-sm font-semibold bg-blue-100 text-blue-800 border-blue-300"
                        >
                          {procedureTypes.map(type => (
                            <option key={type} value={type}>{type}</option>
                          ))}
                        </select>

                        <span className="text-sm font-medium text-gray-600 ml-3">Status:</span>
                        <select
                          value={patient.status}
                          onChange={(e) => updateStatus(patient.id, e.target.value)}
                          className={'px-3 py-1 rounded-lg border-2 text-sm font-semibold ' + getStatusColor(patient.status)}
                        >
                          {['New Admit','Pre-procedure','In Procedure','Recovery','Monitoring','Ready for Discharge','Discharged'].map(status => (
                            <option key={status} value={status}>{status}</option>
                          ))}
                        </select>
                      </div>

                      {total > 0 && (
                        <div className="flex items-center gap-3 ml-9">
                          <span className="text-sm text-gray-600">{completed} of {total} tasks</span>
                          <div className="flex-1 bg-gray-200 rounded-full h-2 max-w-xs">
                            <div
                              className="bg-blue-600 h-2 rounded-full transition-all"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                          <span className="text-sm font-semibold text-gray-700">{Math.round(percentage)}%</span>
                        </div>
                      )}
                    </div>

                    <button
                      onClick={() => removePatient(patient.id)}
                      className="text-red-500 hover:text-red-700 p-2"
                      title="Remove patient"
                    >
                      <Trash2 size={20} />
                    </button>
                  </div>

                  {isExpanded && (
                    <div className="p-5">
                      <div className="grid md:grid-cols-2 gap-6">
                        <div>
                          {/* New Admit Tasks – NOT auto-added */}
                          {patient.status === 'New Admit' && (
                            <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                              <h4 className="text-sm font-semibold text-amber-900 mb-2">
                                New Admit Tasks - {patient.type}
                              </h4>
                              <div className="flex flex-wrap gap-2 mb-2">
                                {(admitTasks[patient.type] || []).map(task => (
                                  <button
                                    key={task}
                                    onClick={() => addTaskToPatient(patient.id, task)}
                                    className="px-3 py-1 text-sm bg-amber-100 text-amber-800 rounded-lg hover:bg-amber-200 transition font-medium"
                                  >
                                    + {task}
                                  </button>
                                ))}
                              </div>
                              {patient.type === 'MRI' && (
                                <button
                                  onClick={() => {
                                    const toRemove = new Set(admitTasks.MRI);
                                    const newTasks = (patient.tasks || []).filter((t: any) => !toRemove.has(t.name));
                                    updatePatientField(patient.id, 'tasks', newTasks);
                                  }}
                                  className="px-3 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"
                                >
                                  Remove MRI Admit Tasks
                                </button>
                              )}
                              <p className="text-xs text-amber-700 mt-2 italic">Nothing is auto-added; click to add. You can clear MRI tasks.</p>
                            </div>
                          )}

                          {/* Daily Tasks */}
                          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                            <h4 className="text-sm font-semibold text-blue-900 mb-3">Daily Tasks</h4>
                            <div className="grid grid-cols-2 gap-2 mb-2">
                              <button
                                onClick={() => addMorningTasks(patient.id)}
                                className="px-3 py-2 text-sm bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition font-medium"
                              >
                                Add Morning Tasks
                              </button>
                              <button
                                onClick={() => addEveningTasks(patient.id)}
                                className="px-3 py-2 text-sm bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition font-medium"
                              >
                                Add Evening Tasks
                              </button>
                            </div>
                            <button
                              onClick={() => resetDailyTasks(patient.id)}
                              className="w-full px-3 py-1 text-xs bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition font-medium"
                            >
                              Clear All Daily Tasks
                            </button>
                          </div>

                          {/* Additional Tasks quick-add */}
                          <div className="mb-3">
                            <h4 className="text-sm font-semibold text-gray-700 mb-2">Additional Tasks:</h4>
                            <div className="flex flex-wrap gap-2 mb-2">
                              {commonTasks.map(task => (
                                <button
                                  key={task}
                                  onClick={() => addTaskToPatient(patient.id, task)}
                                  className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
                                >
                                  + {task}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Custom Task */}
                          <div className="flex gap-2 mb-3">
                            <input
                              type="text"
                              value={patient.customTask || ''}
                              onChange={(e) => updatePatientField(patient.id, 'customTask', e.target.value)}
                              onKeyDown={(e) => e.key === 'Enter' && patient.customTask?.trim() && addTaskToPatient(patient.id, patient.customTask.trim())}
                              placeholder="Add custom task..."
                              className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg"
                            />
                            <button
                              onClick={() => patient.customTask?.trim() && addTaskToPatient(patient.id, patient.customTask.trim())}
                              className="px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition"
                            >
                              Add
                            </button>
                          </div>

                          {/* Tasks lists */}
                          {(sortedTasks || []).length === 0 ? (
                            <p className="text-gray-400 text-sm italic py-4">No tasks yet</p>
                          ) : (
                            <div className="space-y-3">
                              {/* Morning */}
                              <div>
                                <h4 className="text-xs font-bold text-orange-600 mb-1">☀️ Morning Tasks</h4>
                                <div className="space-y-2">
                                  {sortedTasks.filter((t: any) => morningTasks.includes(t.name)).map((task: any) => (
                                    <div
                                      key={task.id}
                                      className={'flex items-center gap-2 p-2 rounded-lg border-2 transition ' + (task.completed ? 'bg-green-50 border-green-500' : 'bg-orange-50 border-orange-300')}
                                    >
                                      <input
                                        type="checkbox"
                                        checked={task.completed}
                                        onChange={() => toggleTask(patient.id, task.id)}
                                        className="w-4 h-4 text-blue-600 rounded"
                                      />
                                      <span className={'flex-1 text-sm font-medium ' + (task.completed ? 'text-green-800 line-through' : 'text-orange-800')}>
                                        {task.name}
                                      </span>
                                      <button
                                        onClick={() => removeTask(patient.id, task.id)}
                                        className="text-gray-400 hover:text-red-600 transition"
                                      >
                                        <X size={16} />
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              </div>
                              {/* Evening */}
                              <div>
                                <h4 className="text-xs font-bold text-indigo-600 mb-1">🌙 Evening Tasks</h4>
                                <div className="space-y-2">
                                  {sortedTasks.filter((t: any) => eveningTasks.includes(t.name)).map((task: any) => (
                                    <div
                                      key={task.id}
                                      className={'flex items-center gap-2 p-2 rounded-lg border-2 transition ' + (task.completed ? 'bg-green-50 border-green-500' : 'bg-indigo-50 border-indigo-300')}
                                    >
                                      <input
                                        type="checkbox"
                                        checked={task.completed}
                                        onChange={() => toggleTask(patient.id, task.id)}
                                        className="w-4 h-4 text-blue-600 rounded"
                                      />
                                      <span className={'flex-1 text-sm font-medium ' + (task.completed ? 'text-green-800 line-through' : 'text-indigo-800')}>
                                        {task.name}
                                      </span>
                                      <button
                                        onClick={() => removeTask(patient.id, task.id)}
                                        className="text-gray-400 hover:text-red-600 transition"
                                      >
                                        <X size={16} />
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              </div>
                              {/* Others */}
                              <div>
                                <h4 className="text-xs font-bold text-gray-600 mb-1">Other Tasks</h4>
                                <div className="space-y-2">
                                  {sortedTasks.filter((t: any) => !morningTasks.includes(t.name) && !eveningTasks.includes(t.name)).map((task: any) => (
                                    <div
                                      key={task.id}
                                      className={'flex items-center gap-2 p-2 rounded-lg border-2 transition ' + (task.completed ? 'bg-green-50 border-green-500' : 'bg-gray-50 border-gray-300')}
                                    >
                                      <input
                                        type="checkbox"
                                        checked={task.completed}
                                        onChange={() => toggleTask(patient.id, task.id)}
                                        className="w-4 h-4 text-blue-600 rounded"
                                      />
                                      <span className={'flex-1 text-sm font-medium ' + (task.completed ? 'text-green-800 line-through' : 'text-gray-700')}>
                                        {task.name}
                                      </span>
                                      <button
                                        onClick={() => removeTask(patient.id, task.id)}
                                        className="text-gray-400 hover:text-red-600 transition"
                                      >
                                        <X size={16} />
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Right column */}
                        <div>
                          {/* MRI Calculator */}
                          {patient.type === 'MRI' && patient.mriData && (
                            <div className="mb-4 p-4 bg-purple-50 border-2 border-purple-300 rounded-lg">
                              <h4 className="text-sm font-bold text-purple-900 mb-3">MRI Anesthesia Calculator</h4>

                              <div className="grid grid-cols-2 gap-3 mb-3">
                                <div>
                                  <label className="block text-xs font-semibold text-gray-700 mb-1">Weight</label>
                                  <div className="flex gap-2">
                                    <input
                                      type="number"
                                      step="0.1"
                                      value={patient.mriData.weight}
                                      onChange={(e) => updateMRIData(patient.id, 'weight', e.target.value)}
                                      placeholder="Enter weight"
                                      className="flex-1 px-3 py-2 text-sm border border-purple-300 rounded-lg"
                                    />
                                    <select
                                      value={patient.mriData.weightUnit}
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
                                    value={patient.mriData.scanType}
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
                                disabled={!patient.mriData.weight}
                                className="w-full px-4 py-2 bg-purple-600 text-white font-semibold rounded-lg hover:bg-purple-700 disabled:bg-gray-400 transition mb-3"
                              >
                                Calculate Doses
                              </button>

                              {patient.mriData.calculated && (
                                <>
                                  <div className="bg-white p-3 rounded-lg border border-purple-200">
                                    <div className="grid grid-cols-2 gap-3 text-sm">
                                      <div className="col-span-2 bg-purple-100 p-2 rounded font-semibold text-purple-900">
                                        Pre-med: {patient.mriData.preMedDrug} {patient.mriData.scanType === 'Brain' ? '(Brain)' : ''}
                                      </div>
                                      <div>
                                        <span className="text-gray-600">Weight (kg):</span>
                                        <span className="font-bold ml-2">{patient.mriData.weightKg} kg</span>
                                      </div>
                                      <div>
                                        <span className="text-gray-600">{patient.mriData.preMedDrug}:</span>
                                        <span className="font-bold ml-2">{patient.mriData.preMedDose} mg ({patient.mriData.preMedVolume} mL)</span>
                                      </div>
                                      <div>
                                        <span className="text-gray-600">Valium:</span>
                                        <span className="font-bold ml-2">{patient.mriData.valiumDose} mg ({patient.mriData.valiumVolume} mL)</span>
                                      </div>
                                      <div>
                                        <span className="text-gray-600">Contrast:</span>
                                        <span className="font-bold ml-2">{patient.mriData.contrastVolume} mL</span>
                                      </div>
                                    </div>
                                  </div>
                                  {patient.mriData.copyableString && (
                                    <div className="mt-3">
                                      <label className="block text-xs font-semibold text-gray-700 mb-1">Copy to MRI Sheet</label>
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

                          {/* Rounding Sheet Info */}
                          <div className="mb-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">
                            <h4 className="text-sm font-bold text-gray-900 mb-3">Rounding Sheet Info</h4>

                            {/* Quick Import */}
                            <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                              <label className="block text-xs font-semibold text-gray-700 mb-1">Quick Import - Paste Patient Details</label>
                              <textarea
                                value={patient.detailsInput || ''}
                                onChange={(e) => updatePatientField(patient.id, 'detailsInput', e.target.value)}
                                placeholder="Paste patient info from eVetPractice, Easy Vet, etc..."
                                rows={4}
                                className="w-full px-3 py-2 text-sm border rounded-lg mb-2"
                              />
                              <button
                                onClick={() => handleParsePatientDetails(patient.id, patient.detailsInput || '')}
                                className="px-3 py-1 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700"
                              >
                                Extract Patient Info
                              </button>
                              <p className="text-xs text-gray-600 mt-1 italic">Auto-fills signalment, weight, owner/phone, patient ID, species/breed/sex.</p>
                            </div>

                            {/* Signalment & Location */}
                            <div className="grid grid-cols-2 gap-3">
                              <input
                                type="text"
                                value={patient.roundingData?.signalment || ''}
                                onChange={(e) => updateRoundingData(patient.id, 'signalment', e.target.value)}
                                placeholder="Signalment"
                                className="col-span-2 px-3 py-2 text-sm border rounded-lg"
                              />
                              <input
                                type="text"
                                value={patient.roundingData?.location || ''}
                                onChange={(e) => updateRoundingData(patient.id, 'location', e.target.value)}
                                placeholder="Location"
                                className="px-3 py-2 text-sm border rounded-lg"
                              />
                              <input
                                type="text"
                                value={patient.roundingData?.icuCriteria || ''}
                                onChange={(e) => updateRoundingData(patient.id, 'icuCriteria', e.target.value)}
                                placeholder="ICU Criteria"
                                className="px-3 py-2 text-sm border rounded-lg"
                              />
                              <select
                                value={patient.roundingData?.codeStatus || 'Yellow'}
                                onChange={(e) => updateRoundingData(patient.id, 'codeStatus', e.target.value)}
                                className="px-3 py-2 text-sm border rounded-lg"
                              >
                                <option>Yellow</option>
                                <option>Red</option>
                              </select>

                              {/* Problems (with chip selector + delete) */}
                              <div className="col-span-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                                <h5 className="text-sm font-bold text-yellow-900 mb-2">Problems</h5>

                                <div className="mb-2">
                                  <label className="block text-xs font-semibold text-gray-700 mb-1">Quick Add Common Problems</label>
                                  <div className="flex flex-wrap gap-1 mb-2">
                                    {commonProblems.slice(0, 8).map((p: any) => (
                                      <div key={p.id} className="relative group">
                                        <button
                                          onClick={() => {
                                            const current = patient.roundingData?.problems || '';
                                            const next = current ? current + '\n' + p.name : p.name;
                                            updateRoundingData(patient.id, 'problems', next);
                                          }}
                                          className="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded hover:bg-yellow-200 transition"
                                        >
                                          + {p.name}
                                        </button>
                                        <button
                                          onClick={() => removeCommonProblem(p.id)}
                                          className="absolute -top-2 -right-2 w-4 h-4 bg-red-500 text-white rounded-full text-[10px] opacity-0 group-hover:opacity-100"
                                          title="Remove from saved problems"
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
                                          const current = patient.roundingData?.problems || '';
                                          const next = current ? current + '\n' + e.target.value : e.target.value;
                                          updateRoundingData(patient.id, 'problems', next);
                                          e.currentTarget.value = '';
                                        }
                                      }}
                                      className="flex-1 px-2 py-1 text-xs border border-yellow-300 rounded-lg"
                                    >
                                      <option value="">Select from all problems...</option>
                                      {commonProblems.map((p: any) => (
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
                                        if (e.key === 'Enter') {
                                          const v = (e.target as HTMLInputElement).value.trim();
                                          if (v) { addCommonProblem(v); (e.target as HTMLInputElement).value = ''; }
                                        }
                                      }}
                                    />
                                    <button
                                      onClick={(e) => {
                                        const input = (e.currentTarget.previousElementSibling as HTMLInputElement);
                                        const v = input?.value?.trim();
                                        if (v) { addCommonProblem(v); input.value = ''; }
                                      }}
                                      className="px-2 py-1 bg-yellow-600 text-white text-xs rounded hover:bg-yellow-700"
                                    >
                                      Save to List
                                    </button>
                                  </div>
                                </div>

                                <textarea
                                  value={patient.roundingData?.problems || ''}
                                  onChange={(e) => updateRoundingData(patient.id, 'problems', e.target.value)}
                                  placeholder="Problems (can also type directly here)"
                                  rows={3}
                                  className="w-full px-3 py-2 text-sm border border-yellow-300 rounded-lg"
                                />
                              </div>

                              {/* Diagnostics */}
                              <div className="col-span-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                                <h5 className="text-sm font-bold text-green-900 mb-2">Quick Add Diagnostics</h5>

                                <div className="mb-3">
                                  <label className="block text-xs font-semibold text-gray-700 mb-1">Blood Work (paste results)</label>
                                  <textarea
                                    value={patient.bwInput || ''}
                                    onChange={(e) => updatePatientField(patient.id, 'bwInput', e.target.value)}
                                    placeholder="Paste full blood work results here..."
                                    rows={3}
                                    className="w-full px-3 py-2 text-sm border rounded-lg mb-2"
                                  />
                                  <button
                                    onClick={() => parseBloodWork(patient.id, patient.bwInput || '')}
                                    className="px-3 py-1 bg-green-600 text-white text-xs rounded-lg hover:bg-green-700"
                                  >
                                    Extract Abnormals to Findings (no ref ranges)
                                  </button>
                                </div>

                                <div>
                                  <label className="block text-xs font-semibold text-gray-700 mb-1">Chest X-ray</label>
                                  <div className="flex gap-2 mb-2">
                                    <select
                                      value={patient.xrayStatus || 'NSF'}
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
                                        value={patient.xrayOther || ''}
                                        onChange={(e) => updatePatientField(patient.id, 'xrayOther', e.target.value)}
                                        placeholder="Describe findings..."
                                        className="flex-1 px-3 py-2 text-sm border rounded-lg"
                                      />
                                    )}
                                  </div>
                                  <button
                                    onClick={() => {
                                      let line = 'CXR: ';
                                      if (patient.xrayStatus === 'NSF') line += 'NSF';
                                      else if (patient.xrayStatus === 'Pending') line += 'pending';
                                      else if (patient.xrayStatus === 'Other') {
                                        if (!(patient.xrayOther || '').trim()) { alert('Please describe the X-ray findings'); return; }
                                        line += patient.xrayOther;
                                      }
                                      const currentDx = patient.roundingData?.diagnosticFindings || '';
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

                              <textarea
                                value={patient.roundingData?.diagnosticFindings || ''}
                                onChange={(e) => updateRoundingData(patient.id, 'diagnosticFindings', e.target.value)}
                                placeholder="Diagnostic Findings"
                                rows={3}
                                className="col-span-2 px-3 py-2 text-sm border rounded-lg"
                              />

                              {/* Therapeutics with chip selector + delete */}
                              <div className="col-span-2 p-3 bg-cyan-50 border border-cyan-200 rounded-lg">
                                <h5 className="text-sm font-bold text-cyan-900 mb-2">Current Therapeutics</h5>

                                <div className="mb-2">
                                  <label className="block text-xs font-semibold text-gray-700 mb-1">Quick Add Medications</label>
                                  <div className="flex flex-wrap gap-1 mb-2">
                                    {commonMedications.slice(0, 8).map((m: any) => (
                                      <div key={m.id} className="relative group">
                                        <button
                                          onClick={() => {
                                            const current = patient.roundingData?.therapeutics || '';
                                            const next = current ? current + '\n' + m.name : m.name;
                                            updateRoundingData(patient.id, 'therapeutics', next);
                                          }}
                                          className="px-2 py-1 text-xs bg-cyan-100 text-cyan-800 rounded hover:bg-cyan-200 transition"
                                        >
                                          + {m.name}
                                        </button>
                                        <button
                                          onClick={() => removeCommonMedication(m.id)}
                                          className="absolute -top-2 -right-2 w-4 h-4 bg-red-500 text-white rounded-full text-[10px] opacity-0 group-hover:opacity-100"
                                          title="Remove from saved medications"
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
                                          const current = patient.roundingData?.therapeutics || '';
                                          const next = current ? current + '\n' + e.target.value : e.target.value;
                                          updateRoundingData(patient.id, 'therapeutics', next);
                                          e.currentTarget.value = '';
                                        }
                                      }}
                                      className="flex-1 px-2 py-1 text-xs border border-cyan-300 rounded-lg"
                                    >
                                      <option value="">Select from all medications...</option>
                                      {commonMedications.map((m: any) => (
                                        <option key={m.id} value={m.name}>{m.name}</option>
                                      ))}
                                    </select>
                                  </div>

                                  <div className="flex gap-2">
                                    <input
                                      type="text"
                                      placeholder="Add new medication to list..."
                                      className="flex-1 px-2 py-1 text-xs border border-cyan-300 rounded-lg"
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                          const v = (e.target as HTMLInputElement).value.trim();
                                          if (v) { addCommonMedication(v); (e.target as HTMLInputElement).value = ''; }
                                        }
                                      }}
                                    />
                                    <button
                                      onClick={(e) => {
                                        const input = (e.currentTarget.previousElementSibling as HTMLInputElement);
                                        const v = input?.value?.trim();
                                        if (v) { addCommonMedication(v); input.value = ''; }
                                      }}
                                      className="px-2 py-1 bg-cyan-600 text-white text-xs rounded hover:bg-cyan-700"
                                    >
                                      Save to List
                                    </button>
                                  </div>
                                  <p className="text-xs text-cyan-700 mt-1 italic">New medications are saved for all patients</p>
                                </div>

                                <textarea
                                  value={patient.roundingData?.therapeutics || ''}
                                  onChange={(e) => updateRoundingData(patient.id, 'therapeutics', e.target.value)}
                                  placeholder="Current Therapeutics (can also type directly here)"
                                  rows={3}
                                  className="w-full px-3 py-2 text-sm border border-cyan-300 rounded-lg"
                                />
                              </div>

                              {/* Replace IVC/Fluids/CRI with select options */}
                              <select
                                value={patient.roundingData?.replaceIVC || ''}
                                onChange={(e) => updateRoundingData(patient.id, 'replaceIVC', e.target.value)}
                                className="px-3 py-2 text-sm border rounded-lg"
                              >
                                <option value="">Replace IVC…</option>
                                <option>Yes</option>
                                <option>No</option>
                                <option>N/A</option>
                                <option>Yes but…</option>
                                <option>No but…</option>
                              </select>
                              <select
                                value={patient.roundingData?.replaceFluids || ''}
                                onChange={(e) => updateRoundingData(patient.id, 'replaceFluids', e.target.value)}
                                className="px-3 py-2 text-sm border rounded-lg"
                              >
                                <option value="">Replace Fluids…</option>
                                <option>Yes</option>
                                <option>No</option>
                                <option>N/A</option>
                                <option>Yes but…</option>
                                <option>No but…</option>
                              </select>
                              <select
                                value={patient.roundingData?.replaceCRI || ''}
                                onChange={(e) => updateRoundingData(patient.id, 'replaceCRI', e.target.value)}
                                className="px-3 py-2 text-sm border rounded-lg"
                              >
                                <option value="">Replace CRI…</option>
                                <option>Yes</option>
                                <option>No</option>
                                <option>N/A</option>
                                <option>Yes but…</option>
                                <option>No but…</option>
                              </select>

                              <input
                                type="text"
                                value={patient.roundingData?.overnightDiagnostics || ''}
                                onChange={(e) => updateRoundingData(patient.id, 'overnightDiagnostics', e.target.value)}
                                placeholder="Overnight Diagnostics"
                                className="px-3 py-2 text-sm border rounded-lg"
                              />
                              <textarea
                                value={patient.roundingData?.overnightConcerns || ''}
                                onChange={(e) => updateRoundingData(patient.id, 'overnightConcerns', e.target.value)}
                                placeholder="Overnight Concerns/Alerts"
                                rows={2}
                                className="col-span-2 px-3 py-2 text-sm border rounded-lg"
                              />

                              {/* Additional Comments with chip selector + delete */}
                              <div className="col-span-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                <h5 className="text-sm font-bold text-blue-900 mb-2">Additional Comments</h5>

                                <div className="mb-2">
                                  <label className="block text-xs font-semibold text-gray-700 mb-1">Quick Add Common Comments</label>
                                  <div className="flex flex-wrap gap-1 mb-2">
                                    {commonComments.slice(0, 8).map((c: any) => (
                                      <div key={c.id} className="relative group">
                                        <button
                                          onClick={() => {
                                            const current = patient.roundingData?.additionalComments || '';
                                            const next = current ? current + '\n' + c.name : c.name;
                                            updateRoundingData(patient.id, 'additionalComments', next);
                                          }}
                                          className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded hover:bg-blue-200 transition"
                                        >
                                          + {c.name.length > 40 ? c.name.substring(0, 40) + '…' : c.name}
                                        </button>
                                        <button
                                          onClick={() => removeCommonComment(c.id)}
                                          className="absolute -top-2 -right-2 w-4 h-4 bg-red-500 text-white rounded-full text-[10px] opacity-0 group-hover:opacity-100"
                                          title="Remove from saved comments"
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
                                          const current = patient.roundingData?.additionalComments || '';
                                          const next = current ? current + '\n' + e.target.value : e.target.value;
                                          updateRoundingData(patient.id, 'additionalComments', next);
                                          e.currentTarget.value = '';
                                        }
                                      }}
                                      className="flex-1 px-2 py-1 text-xs border border-blue-300 rounded-lg"
                                    >
                                      <option value="">Select from all comments...</option>
                                      {commonComments.map((c: any) => (
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
                                        if (e.key === 'Enter') {
                                          const v = (e.target as HTMLInputElement).value.trim();
                                          if (v) { addCommonComment(v); (e.target as HTMLInputElement).value = ''; }
                                        }
                                      }}
                                    />
                                    <button
                                      onClick={(e) => {
                                        const input = (e.currentTarget.previousElementSibling as HTMLInputElement);
                                        const v = input?.value?.trim();
                                        if (v) { addCommonComment(v); input.value = ''; }
                                      }}
                                      className="px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
                                    >
                                      Save to List
                                    </button>
                                  </div>
                                  <p className="text-xs text-blue-700 mt-1 italic">New comments are saved for all patients</p>
                                </div>

                                <textarea
                                  value={patient.roundingData?.additionalComments || ''}
                                  onChange={(e) => updateRoundingData(patient.id, 'additionalComments', e.target.value)}
                                  placeholder="Additional Comments (can also type directly here)"
                                  rows={3}
                                  className="w-full px-3 py-2 text-sm border border-blue-300 rounded-lg"
                                />
                              </div>
                            </div>
                          </div>

                          {/* Patient Info + selected oral med dose helper */}
                          <div className="mb-4 p-4 bg-white border border-gray-200 rounded-lg">
                            <h4 className="text-sm font-bold text-gray-900 mb-3">Patient Info</h4>
                            <div className="grid grid-cols-2 gap-3">
                              <input
                                type="text"
                                value={patient.patientInfo?.patientId || ''}
                                onChange={(e) => updatePatientField(patient.id, 'patientInfo', { ...patient.patientInfo, patientId: e.target.value })}
                                placeholder="Patient ID"
                                className="px-3 py-2 text-sm border rounded-lg"
                              />
                              <input
                                type="text"
                                value={patient.patientInfo?.ownerName || ''}
                                onChange={(e) => updatePatientField(patient.id, 'patientInfo', { ...patient.patientInfo, ownerName: e.target.value })}
                                placeholder="Owner Name"
                                className="px-3 py-2 text-sm border rounded-lg"
                              />
                              <input
                                type="text"
                                value={patient.patientInfo?.ownerPhone || ''}
                                onChange={(e) => updatePatientField(patient.id, 'patientInfo', { ...patient.patientInfo, ownerPhone: e.target.value })}
                                placeholder="Owner Phone"
                                className="px-3 py-2 text-sm border rounded-lg"
                              />
                              <select
                                value={patient.patientInfo?.species || 'Canine'}
                                onChange={(e) => updatePatientField(patient.id, 'patientInfo', { ...patient.patientInfo, species: e.target.value })}
                                className="px-3 py-2 text-sm border rounded-lg"
                              >
                                <option>Canine</option>
                                <option>Feline</option>
                              </select>
                              <input
                                type="text"
                                value={patient.patientInfo?.breed || ''}
                                onChange={(e) => updatePatientField(patient.id, 'patientInfo', { ...patient.patientInfo, breed: e.target.value })}
                                placeholder="Breed"
                                className="px-3 py-2 text-sm border rounded-lg"
                              />
                              <input
                                type="text"
                                value={patient.patientInfo?.sex || ''}
                                onChange={(e) => updatePatientField(patient.id, 'patientInfo', { ...patient.patientInfo, sex: e.target.value })}
                                placeholder="Sex"
                                className="px-3 py-2 text-sm border rounded-lg"
                              />
                              <input
                                type="text"
                                value={patient.patientInfo?.weight || ''}
                                onChange={(e) => updatePatientField(patient.id, 'patientInfo', { ...patient.patientInfo, weight: e.target.value })}
                                placeholder="Weight (e.g., 4.9 kg)"
                                className="px-3 py-2 text-sm border rounded-lg"
                              />
                            </div>

                            {/* Oral medication dose helper */}
                            <div className="mt-4 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                              <h5 className="text-sm font-semibold text-gray-800 mb-2">Oral Meds Dose Helper</h5>
                              <div className="flex items-center gap-2">
                                <select
                                  value={selectedMedByPatient[patient.id] || ''}
                                  onChange={(e) => setSelectedMedByPatient(prev => ({ ...prev, [patient.id]: e.target.value }))}
                                  className="px-3 py-2 text-sm border rounded-lg"
                                >
                                  <option value="">Select a medication…</option>
                                  <option value="Omeprazole">Omeprazole — 1 mg/kg SID</option>
                                  <option value="Metronidazole">Metronidazole — 10 mg/kg BID (DO NOT EXCEED 15)</option>
                                  <option value="Clavamox">Clavamox — 13.75 mg/kg BID</option>
                                  <option value="Cephalexin">Cephalexin — 20–30 mg/kg BID</option>
                                  <option value="Doxycycline">Doxycycline — 5 mg/kg BID, 10 mg/kg SID</option>
                                  <option value="Clindamycin">Clindamycin — 12–15 mg/kg BID</option>
                                  <option value="Enrofloxacin">Enrofloxacin — 5–10 mg/kg SID</option>
                                  <option value="Amantadine">Amantadine — 3–5 mg/kg BID</option>
                                </select>
                                <button
                                  onClick={() => {
                                    const med = selectedMedByPatient[patient.id];
                                    if (!med) return;
                                    const w = patient?.patientInfo?.weight || '';
                                    const m = w.match(/(\d+(?:\.\d+)?)\s*(kg|lbs)/i);
                                    if (!m) { alert('Set patient weight (kg or lbs) first.'); return; }
                                    let kg = parseFloat(m[1]);
                                    if (m[2].toLowerCase() === 'lbs') kg = kg / 2.20462;

                                    // Simple dose strings (no tablet rounding here, just show mg/kg guidance)
                                    let info = '';
                                    switch (med) {
                                      case 'Omeprazole': info = `Omeprazole: 1 mg/kg SID → ~${(kg*1).toFixed(0)} mg SID`; break;
                                      case 'Metronidazole': info = `Metronidazole: 10 mg/kg BID (max 15 mg/kg) → ~${(kg*10).toFixed(0)} mg BID`; break;
                                      case 'Clavamox': info = `Clavamox: 13.75 mg/kg BID → ~${(kg*13.75).toFixed(0)} mg BID`; break;
                                      case 'Cephalexin': info = `Cephalexin: 20–30 mg/kg BID → ~${(kg*20).toFixed(0)}–${(kg*30).toFixed(0)} mg BID`; break;
                                      case 'Doxycycline': info = `Doxycycline: 5 mg/kg BID or 10 mg/kg SID → ~${(kg*5).toFixed(0)} mg BID / ${(kg*10).toFixed(0)} mg SID`; break;
                                      case 'Clindamycin': info = `Clindamycin: 12–15 mg/kg BID → ~${(kg*12).toFixed(0)}–${(kg*15).toFixed(0)} mg BID`; break;
                                      case 'Enrofloxacin': info = `Enrofloxacin: 5–10 mg/kg SID → ~${(kg*5).toFixed(0)}–${(kg*10).toFixed(0)} mg SID`; break;
                                      case 'Amantadine': info = `Amantadine: 3–5 mg/kg BID → ~${(kg*3).toFixed(0)}–${(kg*5).toFixed(0)} mg BID`; break;
                                    }
                                    alert(info);
                                  }}
                                  className="px-3 py-2 text-sm bg-gray-800 text-white rounded-lg hover:bg-black"
                                >
                                  Calculate
                                </button>
                              </div>
                              <p className="text-xs text-gray-500 mt-1">Displays mg targets; adjust to nearest practical tablet size per label.</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
