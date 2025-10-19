'use client';
import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Trash2, Clock, X, ChevronDown, ChevronUp } from 'lucide-react';
import { parsePatientInfoFromText } from '@/ai/flows/parse-patient-info-from-text';
import { analyzeBloodWork } from '@/ai/flows/analyze-blood-work-for-abnormalities';
import {
  useFirebase,
  useCollection,
  useMemoFirebase,
  addDocumentNonBlocking,
  updateDocumentNonBlocking,
  deleteDocumentNonBlocking,
  initiateAnonymousSignIn,
} from '@/firebase';
import { collection, doc, query, where } from 'firebase/firestore';

export default function VetPatientTracker() {
  const { firestore, auth, user, isUserLoading } = useFirebase();

  useEffect(() => {
    if (!user && !isUserLoading) {
      initiateAnonymousSignIn(auth);
    }
  }, [user, isUserLoading, auth]);

  const patientsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, `users/${user.uid}/patients`));
  }, [firestore, user]);
  const { data: patients, isLoading: isLoadingPatients } = useCollection(patientsQuery);

  const generalTasksQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, `users/${user.uid}/generalTasks`));
  }, [firestore, user]);
  const { data: generalTasks, isLoading: isLoadingGeneralTasks } = useCollection(generalTasksQuery);
  
  const commonProblemsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, `users/${user.uid}/commonProblems`));
  }, [firestore, user]);
  const { data: commonProblems, isLoading: isLoadingCommonProblems } = useCollection(commonProblemsQuery);

  const commonCommentsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, `users/${user.uid}/commonComments`));
  }, [firestore, user]);
  const { data: commonComments, isLoading: isLoadingCommonComments } = useCollection(commonCommentsQuery);

  const [newPatient, setNewPatient] = useState({ name: '', type: 'Surgery' });
  const [expandedPatients, setExpandedPatients] = useState({});
  const [showMorningOverview, setShowMorningOverview] = useState(false);
  const [newGeneralTask, setNewGeneralTask] = useState('');

  const procedureTypes = ['Surgery', 'MRI', 'Medical', 'Other'];

  const commonGeneralTasksTemplates = [
    'Check Comms',
    'Check Emails',
    'Draw Up Contrast',
    'Rounding'
  ];

  const admitTasks = {
    Surgery: [
      'Surgery Slip',
      'Written on Board',
      'Print 4 Large Stickers',
      'Print 2 Sheets Small Stickers',
      'Print Surgery Sheet'
    ],
    MRI: [
      'Blood Work',
      'Chest X-rays',
      'MRI Anesthesia Sheet',
      'NPO',
      'Black Book',
      'Print 5 Stickers',
      'Print 1 Sheet Small Stickers'
    ],
    Medical: [
      'Admission SOAP',
      'Treatment Sheet Created',
      'Owner Admission Call'
    ],
    Other: [
      'Admission SOAP',
      'Owner Admission Call'
    ]
  };

  const morningTasks = [
    'Owner Called',
    'Daily SOAP Done',
    'Vet Radar Sheet Checked',
    'MRI Findings Inputted (if needed)'
  ];

  const eveningTasks = [
    'Vet Radar Done',
    'Rounding Sheet Done',
    'Sticker on Daily Sheet',
    'Owner Update Call'
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

  const addGeneralTask = (taskName) => {
    if (!taskName.trim() || !firestore || !user) return;
    addDocumentNonBlocking(collection(firestore, `users/${user.uid}/generalTasks`), { name: taskName, completed: false });
    setNewGeneralTask('');
  };

  const toggleGeneralTask = (taskId, completed) => {
    if (!firestore || !user) return;
    const taskRef = doc(firestore, `users/${user.uid}/generalTasks`, taskId);
    updateDocumentNonBlocking(taskRef, { completed: !completed });
  };

  const removeGeneralTask = (taskId) => {
    if (!firestore || !user) return;
    const taskRef = doc(firestore, `users/${user.uid}/generalTasks`, taskId);
    deleteDocumentNonBlocking(taskRef);
  };
  
  const addCommonProblem = (newProblem) => {
    if (!newProblem.trim() || !firestore || !user) return;
    if (!(commonProblems || []).some(p => p.name === newProblem.trim())) {
      addDocumentNonBlocking(collection(firestore, `users/${user.uid}/commonProblems`), { name: newProblem.trim() });
    }
  };

  const addCommonComment = (newComment) => {
    if (!newComment.trim() || !firestore || !user) return;
    if (!(commonComments || []).some(c => c.name === newComment.trim())) {
      addDocumentNonBlocking(collection(firestore, `users/${user.uid}/commonComments`), { name: newComment.trim() });
    }
  };

  const exportToCSV = () => {
    let csv = '';
    
    const headers = [
      'Name',
      'It\'s A-> N',
      'Signalment',
      'Location',
      'If in ICU, does patient meet criteria?',
      'Code Status',
      'Problems',
      'Relevant diagnostic findings',
      'Current therapeutics',
      'Replace IVC (y/n)',
      'Replace fluids (y/n)',
      'Replace CRI (y/n)',
      'Overnight diagnostics',
      'Overnight concerns/alerts',
      'Additional Comments'
    ];
    
    csv += headers.join(',') + '\n';
    
    (patients || []).forEach(patient => {
      const r = patient.roundingData || {};
      const row = [
        patient.name,
        '', // Placeholder for 'It's A-> N'
        r.signalment || '',
        r.location || '',
        r.icuCriteria || '',
        r.codeStatus || 'Yellow',
        r.problems || '',
        r.diagnosticFindings || '',
        r.therapeutics || '',
        r.replaceIVC || '',
        r.replaceFluids || '',
        r.replaceCRI || '',
        r.overnightDiagnostics || '',
        r.overnightConcerns || '',
        r.additionalComments || ''
      ];
      csv += row.map(val => `"${(val || '').replace(/"/g, '""')}"`).join(',') + '\n';
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'rounding-sheet.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const addPatient = () => {
    if (newPatient.name.trim() && firestore && user) {
      const patientData = {
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
        if(docRef) setExpandedPatients({...expandedPatients, [docRef.id]: true});
      });
      
      setNewPatient({ name: '', type: 'Surgery' });
    }
  };
  
  const getPatientRef = (patientId) => {
    if (!firestore || !user) return null;
    return doc(firestore, `users/${user.uid}/patients`, patientId);
  }

  const removePatient = (id) => {
    const patientRef = getPatientRef(id);
    if (!patientRef) return;
    deleteDocumentNonBlocking(patientRef);

    const newExpanded = {...expandedPatients};
    delete newExpanded[id];
    setExpandedPatients(newExpanded);
  };

  const toggleExpanded = (patientId) => {
    setExpandedPatients({
      ...expandedPatients,
      [patientId]: !expandedPatients[patientId]
    });
  };

  const updatePatientField = (patientId, field, value) => {
    const patientRef = getPatientRef(patientId);
    if (!patientRef) return;
    updateDocumentNonBlocking(patientRef, { [field]: value });
  }

  const updatePatientData = (patientId, data) => {
    const patientRef = getPatientRef(patientId);
    if (!patientRef) return;
    updateDocumentNonBlocking(patientRef, data);
  }

  const updateStatus = (patientId, newStatus) => {
    updatePatientField(patientId, 'status', newStatus);
  };

  const updatePatientType = (patientId, newType) => {
    const patient = (patients || []).find(p => p.id === patientId);
    if (!patient) return;

    const updateData = { type: newType };
    if (newType === 'MRI' && !patient.mriData) {
      updateData.mriData = {
        weight: '',
        weightUnit: 'kg',
        scanType: 'Brain',
        calculated: false,
        copyableString: ''
      };
    }
    updatePatientData(patientId, updateData);
  };

  const updateRoundingData = (patientId, field, value) => {
    const patient = (patients || []).find(p => p.id === patientId);
    if(!patient) return;
    const newRoundingData = { ...patient.roundingData, [field]: value };
    updatePatientField(patientId, 'roundingData', newRoundingData);
  };

  const parseBloodWork = async (patientId, bwText) => {
    const patient = (patients || []).find(p => p.id === patientId);
    if (!patient || !bwText.trim()) {
      alert('Please paste blood work results first');
      return;
    }
    
    try {
      const result = await analyzeBloodWork({ bloodWorkText: bwText });
      const abnormals = result.abnormalValues;
      
      const currentDx = patient.roundingData.diagnosticFindings || '';
      const bwLine = abnormals.length > 0 
        ? 'CBC/CHEM: ' + abnormals.join(', ')
        : 'CBC/CHEM: NAD';
      const newDx = currentDx ? currentDx + '\n' + bwLine : bwLine;
      
      updateRoundingData(patientId, 'diagnosticFindings', newDx);
      updatePatientField(patientId, 'bwInput', '');

    } catch (error) {
      console.error("Error analyzing blood work:", error);
      alert("AI analysis of blood work failed. Please check the results manually.");
    }
  };

  const parsePatientDetails = async (patientId, detailsText) => {
     const patient = (patients || []).find(p => p.id === patientId);
    if (!patient || !detailsText.trim()) {
      alert('Please paste patient details first');
      return;
    }
    
    try {
      const result = await parsePatientInfoFromText({ text: detailsText });
      const { patientInfo, therapeutics } = result;

      let signalment = '';
      if (patientInfo.age) signalment += patientInfo.age.replace(/\s+years?.*/, 'yo');
      if (patientInfo.sex) signalment += ' ' + patientInfo.sex;
      if (patientInfo.breed) {
        signalment += ' ' + patientInfo.breed;
      }

      const newPatientInfo = { ...patient.patientInfo, ...patientInfo };
      const newRoundingData = { 
        ...patient.roundingData, 
        signalment: signalment.trim(),
        therapeutics: therapeutics || patient.roundingData.therapeutics
      };

      updatePatientData(patientId, {
        patientInfo: newPatientInfo,
        roundingData: newRoundingData,
        detailsInput: ''
      });

    } catch (error)      {
        console.error("Error parsing patient details:", error);
        alert("AI parsing of patient details failed. Please enter the information manually.");
    }
  };

  const addChestXray = (patientId, xrayStatus, otherText) => {
    const patient = (patients || []).find(p => p.id === patientId);
    if (!patient) return;
    
    let xrayLine = 'CXR: ';
    
    if (xrayStatus === 'NSF') {
      xrayLine += 'NSF';
    } else if (xrayStatus === 'Pending') {
      xrayLine += 'pending';
    } else if (xrayStatus === 'Other') {
      if (!otherText.trim()) {
        alert('Please describe the X-ray findings');
        return;
      }
      xrayLine += otherText;
    }
    
    const currentDx = patient.roundingData.diagnosticFindings || '';
    const newDx = currentDx ? currentDx + '\n' + xrayLine : xrayLine;

    updateRoundingData(patientId, 'diagnosticFindings', newDx);
    updatePatientField(patientId, 'xrayOther', '');
  };

  const updatePatientInfo = (patientId, field, value) => {
    const patient = (patients || []).find(p => p.id === patientId);
    if(!patient) return;
    const newPatientInfo = { ...patient.patientInfo, [field]: value };
    updatePatientField(patientId, 'patientInfo', newPatientInfo);
  };

  const updateMRIData = (patientId, field, value) => {
    const patient = (patients || []).find(p => p.id === patientId);
    if(!patient || !patient.mriData) return;
    const newMriData = { ...patient.mriData, [field]: value, calculated: false, copyableString: '' };
    updatePatientField(patientId, 'mriData', newMriData);
  };

  const calculateMRIDrugs = (patientId) => {
    const patient = (patients || []).find(p => p.id === patientId);
    if (!patient || !patient.mriData || !patient.mriData.weight) return;

    let weightKg = parseFloat(patient.mriData.weight);
    if (patient.mriData.weightUnit === 'lbs') {
      weightKg = weightKg / 2.20462;
    }
    const weightLbs = weightKg * 2.20462;

    const isBrain = patient.mriData.scanType === 'Brain';
    const preMedDose = weightKg * 0.2;
    const preMedVolume = preMedDose / 10;
    const valiumDose = weightKg * 0.25;
    const valiumVolume = valiumDose / 5;
    const contrastVolume = weightKg * 0.22;
    const preMedDrug = isBrain ? 'Butorphanol' : 'Methadone';
    
    const line1 = `${patient.name}\t${patient.patientInfo.clientId || ''}\t${weightKg.toFixed(1)}\t${weightLbs.toFixed(1)}\t${patient.mriData.scanType}`;
    const line2 = `Client, patient\tCID #\tkg\tlb\tLocation`;

    const copyableString = `${line1}\n${line2}`;

    const newMriData = { 
      ...patient.mriData, 
      weightKg: weightKg.toFixed(1),
      preMedDrug: preMedDrug,
      preMedDose: preMedDose.toFixed(2),
      preMedVolume: preMedVolume.toFixed(2),
      valiumDose: valiumDose.toFixed(2),
      valiumVolume: valiumVolume.toFixed(2),
      contrastVolume: contrastVolume.toFixed(1),
      calculated: true,
      copyableString: copyableString
    };
    updatePatientField(patientId, 'mriData', newMriData);
  };

  const addTaskToPatient = (patientId, taskName) => {
    const patient = (patients || []).find(p => p.id === patientId);
    if (!patient) return;
    const taskExists = patient.tasks.some(t => t.name === taskName);
    if (!taskExists) {
      const newTasks = [...patient.tasks, { name: taskName, completed: false, id: Date.now() + Math.random() }];
      updatePatientField(patientId, 'tasks', newTasks);
    }
  };

  const addMorningTasks = (patientId) => {
    const patient = (patients || []).find(p => p.id === patientId);
    if (!patient) return;
    const newTasks = [...patient.tasks];
    morningTasks.forEach(taskName => {
      if (!patient.tasks.some(t => t.name === taskName)) {
        newTasks.push({ name: taskName, completed: false, id: Date.now() + Math.random() });
      }
    });
    updatePatientField(patientId, 'tasks', newTasks);
  };

  const addEveningTasks = (patientId) => {
    const patient = (patients || []).find(p => p.id === patientId);
    if (!patient) return;
    const newTasks = [...patient.tasks];
    eveningTasks.forEach(taskName => {
      if (!patient.tasks.some(t => t.name === taskName)) {
        newTasks.push({ name: taskName, completed: false, id: Date.now() + Math.random() });
      }
    });
    updatePatientField(patientId, 'tasks', newTasks);
  };

  const addMorningTasksToAll = () => {
    (patients || []).forEach(p => addMorningTasks(p.id));
  };

  const resetDailyTasks = (patientId) => {
    const patient = (patients || []).find(p => p.id === patientId);
    if (!patient) return;
    const allDailyTasks = [...morningTasks, ...eveningTasks];
    const filteredTasks = patient.tasks.filter(t => !allDailyTasks.includes(t.name));
    updatePatientField(patientId, 'tasks', filteredTasks);
  };

  const addCustomTask = (patientId) => {
    const patient = (patients || []).find(p => p.id === patientId);
    if (patient && patient.customTask.trim()) {
      addTaskToPatient(patientId, patient.customTask.trim());
      updatePatientField(patientId, 'customTask', '');
    }
  };

  const removeTask = (patientId, taskId) => {
    const patient = (patients || []).find(p => p.id === patientId);
    if (!patient) return;
    const newTasks = patient.tasks.filter(t => t.id !== taskId);
    updatePatientField(patientId, 'tasks', newTasks);
  };

  const toggleTask = (patientId, taskId) => {
    const patient = (patients || []).find(p => p.id === patientId);
    if (!patient) return;
    const newTasks = patient.tasks.map(t => 
      t.id === taskId ? { ...t, completed: !t.completed } : t
    );
    updatePatientField(patientId, 'tasks', newTasks);
  };

  const getCompletionStatus = (patient) => {
    if (!patient || !patient.tasks) return { completed: 0, total: 0, percentage: 0 };
    const total = patient.tasks.length;
    const completed = patient.tasks.filter(t => t.completed).length;
    return { completed, total, percentage: total > 0 ? (completed / total) * 100 : 0 };
  };

  const getStatusColor = (status) => {
    const colors = {
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
  
  const toggleAll = (expand) => {
    const newExpandedState = {};
    (patients || []).forEach(p => {
      newExpandedState[p.id] = expand;
    });
    setExpandedPatients(newExpandedState);
  };

  if (isUserLoading || isLoadingPatients || isLoadingGeneralTasks || isLoadingCommonProblems || isLoadingCommonComments) {
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
          <div className="flex justify-between items-center mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-800 mb-2">RBVH Patient Task Manager</h1>
              <p className="text-gray-600">Track tasks and prepare rounding sheets</p>
            </div>
            <div className="flex gap-2">
              {(patients || []).length > 0 && (
                <>
                  <button
                    onClick={() => toggleAll(false)}
                    className="px-6 py-2 rounded-lg font-semibold bg-gray-200 text-gray-800 hover:bg-gray-300 transition"
                  >
                    Collapse All
                  </button>
                  <button
                    onClick={() => toggleAll(true)}
                    className="px-6 py-2 rounded-lg font-semibold bg-gray-200 text-gray-800 hover:bg-gray-300 transition"
                  >
                    Expand All
                  </button>
                  <button
                    onClick={() => setShowMorningOverview(!showMorningOverview)}
                    className={'px-6 py-2 rounded-lg font-semibold transition ' + (showMorningOverview ? 'bg-orange-600 text-white' : 'bg-orange-100 text-orange-800 hover:bg-orange-200')}
                  >
                    {showMorningOverview ? 'Hide' : 'Show'} Morning Overview
                  </button>
                  <button
                    onClick={exportToCSV}
                    className="px-6 py-2 rounded-lg font-semibold bg-green-600 text-white hover:bg-green-700 transition"
                  >
                    Export Rounding Sheet
                  </button>
                </>
              )}
            </div>
          </div>
          
          <div className="flex gap-2">
            <input
              type="text"
              value={newPatient.name}
              onChange={(e) => setNewPatient({ ...newPatient, name: e.target.value })}
              onKeyPress={(e) => e.key === 'Enter' && addPatient()}
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

        {/* General Tasks Section */}
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
              onKeyPress={(e) => e.key === 'Enter' && addGeneralTask(newGeneralTask)}
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
            <p className="text-gray-400 text-sm italic py-2">No general tasks yet. Click quick-add buttons or type a custom task.</p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {(generalTasks || []).map(task => (
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

        {(patients || []).length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <p className="text-gray-500 text-lg">No patients added yet. Add your first patient above!</p>
          </div>
        ) : (
          <>
            {showMorningOverview && (
              <div className="bg-gradient-to-r from-orange-50 to-yellow-50 rounded-lg shadow-lg p-6 mb-6 border-2 border-orange-300">
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
                {(generalTasks || []).length > 0 && (
                  <div className="mb-4 p-4 bg-indigo-50 border-2 border-indigo-300 rounded-lg">
                    <h3 className="font-bold text-indigo-900 mb-3 text-lg">General Tasks</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {(generalTasks || []).map(task => (
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
                
                {/* Patient Tasks */}
                <h3 className="font-bold text-orange-900 mb-3 text-lg">Patient Tasks</h3>
                <div className="space-y-3">
                  {(patients || []).map(patient => {
                    const patientMorningTasks = (patient.tasks || []).filter(t => morningTasks.includes(t.name));
                    const patientEveningTasks = (patient.tasks || []).filter(t => eveningTasks.includes(t.name));
                    const otherTasks = (patient.tasks || []).filter(t => !morningTasks.includes(t.name) && !eveningTasks.includes(t.name));
                    const allPatientTasks = patient.tasks || [];
                    const completedTasks = allPatientTasks.filter(t => t.completed).length;
                    const totalTasks = allPatientTasks.length;
                    
                    if (totalTasks === 0) return null;
                    
                    return (
                      <div key={patient.id} className="bg-white p-3 rounded-lg border-2 border-orange-200">
                        <div className="flex justify-between items-center mb-2">
                          <h3 className="font-bold text-gray-800">{patient.name}</h3>
                          <span className="text-sm font-semibold text-orange-700">
                            {completedTasks}/{totalTasks} tasks
                          </span>
                        </div>
                        
                        {patientMorningTasks.length > 0 && (
                          <div className="mb-3">
                            <h4 className="text-xs font-bold text-orange-600 mb-1">☀️ Morning Tasks</h4>
                            <div className="grid grid-cols-2 gap-2">
                              {patientMorningTasks.map(task => (
                                <label
                                  key={task.id}
                                  className={'flex items-center gap-2 p-2 rounded text-sm cursor-pointer ' + (task.completed ? 'bg-green-50 text-green-800' : 'bg-orange-50 text-orange-900')}
                                >
                                  <input
                                    type="checkbox"
                                    checked={task.completed}
                                    onChange={() => toggleTask(patient.id, task.id)}
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
                        
                        {patientEveningTasks.length > 0 && (
                          <div className="mb-3">
                            <h4 className="text-xs font-bold text-indigo-600 mb-1">🌙 Evening Tasks</h4>
                            <div className="grid grid-cols-2 gap-2">
                              {patientEveningTasks.map(task => (
                                <label
                                  key={task.id}
                                  className={'flex items-center gap-2 p-2 rounded text-sm cursor-pointer ' + (task.completed ? 'bg-green-50 text-green-800' : 'bg-indigo-50 text-indigo-900')}
                                >
                                  <input
                                    type="checkbox"
                                    checked={task.completed}
                                    onChange={() => toggleTask(patient.id, task.id)}
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
                        
                        {otherTasks.length > 0 && (
                          <div>
                            <h4 className="text-xs font-bold text-gray-600 mb-1">Other Tasks</h4>
                            <div className="grid grid-cols-2 gap-2">
                              {otherTasks.map(task => (
                                <label
                                  key={task.id}
                                  className={'flex items-center gap-2 p-2 rounded text-sm cursor-pointer ' + (task.completed ? 'bg-green-50 text-green-800' : 'bg-gray-50 text-gray-900')}
                                >
                                  <input
                                    type="checkbox"
                                    checked={task.completed}
                                    onChange={() => toggleTask(patient.id, task.id)}
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
                    );
                  })}
                </div>
              </div>
            )}

            <div className="grid gap-4">
              {(patients || []).map(patient => {
                const { completed, total, percentage } = getCompletionStatus(patient);
                const isExpanded = expandedPatients[patient.id];
                
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
                          {patient.roundingData.signalment && (
                            <span className="font-medium">
                              📋 {patient.roundingData.signalment}
                            </span>
                          )}
                          {patient.patientInfo.weight && (
                            <span className="font-medium">
                              ⚖️ {patient.patientInfo.weight}
                            </span>
                          )}
                          {patient.patientInfo.patientId && (
                            <span className="font-medium">
                              🆔 ID: {patient.patientInfo.patientId}
                            </span>
                          )}
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
                            {statusOptions.map(status => (
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
                                style={{ width: percentage + '%' }}
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
                          {patient.status === 'New Admit' && (
                            <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                              <h4 className="text-sm font-semibold text-amber-900 mb-2">
                                New Admit Tasks - {patient.type}
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
                              <p className="text-xs text-amber-700 mt-2 italic">Change status to hide these</p>
                            </div>
                          )}

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

                          <div className="flex gap-2 mb-3">
                            <input
                              type="text"
                              value={patient.customTask}
                              onChange={(e) => updatePatientField(patient.id, 'customTask', e.target.value)}
                              onKeyPress={(e) => e.key === 'Enter' && addCustomTask(patient.id)}
                              placeholder="Add custom task..."
                              className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg"
                            />
                            <button
                              onClick={() => addCustomTask(patient.id)}
                              className="px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition"
                            >
                              Add
                            </button>
                          </div>

                          {(patient.tasks || []).length === 0 ? (
                            <p className="text-gray-400 text-sm italic py-4">No tasks yet</p>
                          ) : (
                            <div className="space-y-3">
                               <div>
                                <h4 className="text-xs font-bold text-orange-600 mb-1">☀️ Morning Tasks</h4>
                                <div className="space-y-2">
                                  {(patient.tasks || []).filter(t => morningTasks.includes(t.name)).map(task => (
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
                              <div>
                                <h4 className="text-xs font-bold text-indigo-600 mb-1">🌙 Evening Tasks</h4>
                                <div className="space-y-2">
                                  {(patient.tasks || []).filter(t => eveningTasks.includes(t.name)).map(task => (
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
                               <div>
                                <h4 className="text-xs font-bold text-gray-600 mb-1">Other Tasks</h4>
                                <div className="space-y-2">
                                  {(patient.tasks || []).filter(t => !morningTasks.includes(t.name) && !eveningTasks.includes(t.name)).map(task => (
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
                        <div>

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
                                      rows="2"
                                      className="w-full px-3 py-2 text-sm font-mono border bg-gray-50 rounded-lg"
                                      onClick={(e) => e.target.select()}
                                    />
                                  </div>
                                )}
                                </>
                              )}
                            </div>
                          )}

                          <div className="mb-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">
                            <h4 className="text-sm font-bold text-gray-900 mb-3">Rounding Sheet Info</h4>
                            
                            <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                              <label className="block text-xs font-semibold text-gray-700 mb-1">Quick Import - Paste Patient Details</label>
                              <textarea
                                value={patient.detailsInput}
                                onChange={(e) => updatePatientField(patient.id, 'detailsInput', e.target.value)}
                                placeholder="Paste patient info from eVetPractice, Easy Vet, etc..."
                                rows="4"
                                className="w-full px-3 py-2 text-sm border rounded-lg mb-2"
                              />
                              <button
                                onClick={() => parsePatientDetails(patient.id, patient.detailsInput)}
                                className="px-3 py-1 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700"
                              >
                                Extract Patient Info with AI
                              </button>
                              <p className="text-xs text-gray-600 mt-1 italic">Will auto-fill fields below</p>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-3">
                            <input
                              type="text"
                              value={patient.roundingData.signalment}
                              onChange={(e) => updateRoundingData(patient.id, 'signalment', e.target.value)}
                              placeholder="Signalment"
                              className="col-span-2 px-3 py-2 text-sm border rounded-lg"
                            />
                            <input
                              type="text"
                              value={patient.roundingData.location}
                              onChange={(e) => updateRoundingData(patient.id, 'location', e.target.value)}
                              placeholder="Location"
                              className="px-3 py-2 text-sm border rounded-lg"
                            />
                            <input
                              type="text"
                              value={patient.roundingData.icuCriteria}
                              onChange={(e) => updateRoundingData(patient.id, 'icuCriteria', e.target.value)}
                              placeholder="ICU Criteria"
                              className="px-3 py-2 text-sm border rounded-lg"
                            />
                            <select
                              value={patient.roundingData.codeStatus}
                              onChange={(e) => updateRoundingData(patient.id, 'codeStatus', e.target.value)}
                              className="px-3 py-2 text-sm border rounded-lg"
                            >
                              <option>Yellow</option>
                              <option>Red</option>
                            </select>
                            
                            <div className="col-span-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                              <h5 className="text-sm font-bold text-yellow-900 mb-2">Problems</h5>
                              
                              <div className="mb-2">
                                <label className="block text-xs font-semibold text-gray-700 mb-1">Quick Add Common Problems</label>
                                <div className="flex flex-wrap gap-1 mb-2">
                                  {(commonProblems || []).slice(0, 8).map(problem => (
                                    <button
                                      key={problem.id}
                                      onClick={() => {
                                        const current = patient.roundingData.problems || '';
                                        const newValue = current ? current + '\n' + problem.name : problem.name;
                                        updateRoundingData(patient.id, 'problems', newValue);
                                      }}
                                      className="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded hover:bg-yellow-200 transition"
                                    >
                                      + {problem.name}
                                    </button>
                                  ))}
                                </div>
                                
                                <div className="flex gap-2 mb-2">
                                  <select
                                    onChange={(e) => {
                                      if (e.target.value) {
                                        const current = patient.roundingData.problems || '';
                                        const newValue = current ? current + '\n' + e.target.value : e.target.value;
                                        updateRoundingData(patient.id, 'problems', newValue);
                                        e.target.value = '';
                                      }
                                    }}
                                    className="flex-1 px-2 py-1 text-xs border border-yellow-300 rounded-lg"
                                  >
                                    <option value="">Select from all problems...</option>
                                    {(commonProblems || []).map(problem => (
                                      <option key={problem.id} value={problem.name}>{problem.name}</option>
                                    ))}
                                  </select>
                                </div>
                                
                                <div className="flex gap-2">
                                  <input
                                    type="text"
                                    placeholder="Add new problem to list..."
                                    className="flex-1 px-2 py-1 text-xs border border-yellow-300 rounded-lg"
                                    onKeyPress={(e) => {
                                      if (e.key === 'Enter' && e.target.value.trim()) {
                                        addCommonProblem(e.target.value);
                                        e.target.value = '';
                                      }
                                    }}
                                  />
                                  <button
                                    onClick={(e) => {
                                      const input = e.target.previousElementSibling;
                                      if (input.value.trim()) {
                                        addCommonProblem(input.value);
                                        input.value = '';
                                      }
                                    }}
                                    className="px-2 py-1 bg-yellow-600 text-white text-xs rounded hover:bg-yellow-700"
                                  >
                                    Save to List
                                  </button>
                                </div>
                                <p className="text-xs text-yellow-700 mt-1 italic">New problems are saved for all patients</p>
                              </div>
                              
                              <textarea
                                value={patient.roundingData.problems}
                                onChange={(e) => updateRoundingData(patient.id, 'problems', e.target.value)}
                                placeholder="Problems (can also type directly here)"
                                rows="3"
                                className="w-full px-3 py-2 text-sm border border-yellow-300 rounded-lg"
                              />
                            </div>
                            
                            <div className="col-span-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                              <h5 className="text-sm font-bold text-green-900 mb-2">Quick Add Diagnostics</h5>
                              
                              <div className="mb-3">
                                <label className="block text-xs font-semibold text-gray-700 mb-1">Blood Work (paste results)</label>
                                <textarea
                                  value={patient.bwInput}
                                  onChange={(e) => updatePatientField(patient.id, 'bwInput', e.target.value)}
                                  placeholder="Paste full blood work results here..."
                                  rows="3"
                                  className="w-full px-3 py-2 text-sm border rounded-lg mb-2"
                                />
                                <button
                                  onClick={() => parseBloodWork(patient.id, patient.bwInput)}
                                  className="px-3 py-1 bg-green-600 text-white text-xs rounded-lg hover:bg-green-700"
                                >
                                  Extract Abnormals to Findings with AI
                                </button>
                              </div>
                              
                              <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1">Chest X-ray</label>
                                <div className="flex gap-2 mb-2">
                                  <select
                                    value={patient.xrayStatus}
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
                                      value={patient.xrayOther}
                                      onChange={(e) => updatePatientField(patient.id, 'xrayOther', e.target.value)}
                                      placeholder="Describe findings..."
                                      className="flex-1 px-3 py-2 text-sm border rounded-lg"
                                    />
                                  )}
                                </div>
                                <button
                                  onClick={() => addChestXray(patient.id, patient.xrayStatus, patient.xrayOther)}
                                  className="px-3 py-1 bg-green-600 text-white text-xs rounded-lg hover:bg-green-700"
                                >
                                  Add CXR to Findings
                                </button>
                              </div>
                            </div>
                            
                            <textarea
                              value={patient.roundingData.diagnosticFindings}
                              onChange={(e) => updateRoundingData(patient.id, 'diagnosticFindings', e.target.value)}
                              placeholder="Diagnostic Findings"
                              rows="3"
                              className="col-span-2 px-3 py-2 text-sm border rounded-lg"
                            />
                            <textarea
                              value={patient.roundingData.therapeutics}
                              onChange={(e) => updateRoundingData(patient.id, 'therapeutics', e.target.value)}
                              placeholder="Current Therapeutics"
                              rows="2"
                              className="col-span-2 px-3 py-2 text-sm border rounded-lg"
                            />
                            <input
                              type="text"
                              value={patient.roundingData.replaceIVC}
                              onChange={(e) => updateRoundingData(patient.id, 'replaceIVC', e.target.value)}
                              placeholder="Replace IVC (y/n)"
                              className="px-3 py-2 text-sm border rounded-lg"
                            />
                            <input
                              type="text"
                              value={patient.roundingData.replaceFluids}
                              onChange={(e) => updateRoundingData(patient.id, 'replaceFluids', e.target.value)}
                              placeholder="Replace Fluids (y/n)"
                              className="px-3 py-2 text-sm border rounded-lg"
                            />
                            <input
                              type="text"
                              value={patient.roundingData.replaceCRI}
                              onChange={(e) => updateRoundingData(patient.id, 'replaceCRI', e.target.value)}
                              placeholder="Replace CRI (y/n)"
                              className="px-3 py-2 text-sm border rounded-lg"
                            />
                            <input
                              type="text"
                              value={patient.roundingData.overnightDiagnostics}
                              onChange={(e) => updateRoundingData(patient.id, 'overnightDiagnostics', e.target.value)}
                              placeholder="Overnight Diagnostics"
                              className="px-3 py-2 text-sm border rounded-lg"
                            />
                            <textarea
                              value={patient.roundingData.overnightConcerns}
                              onChange={(e) => updateRoundingData(patient.id, 'overnightConcerns', e.target.value)}
                              placeholder="Overnight Concerns/Alerts"
                              rows="2"
                              className="col-span-2 px-3 py-2 text-sm border rounded-lg"
                            />
                            
                            <div className="col-span-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                              <h5 className="text-sm font-bold text-blue-900 mb-2">Additional Comments</h5>
                              
                              <div className="mb-2">
                                <label className="block text-xs font-semibold text-gray-700 mb-1">Quick Add Common Comments</label>
                                <div className="flex flex-wrap gap-1 mb-2">
                                  {(commonComments || []).slice(0, 6).map(comment => (
                                    <button
                                      key={comment.id}
                                      onClick={() => {
                                        const current = patient.roundingData.additionalComments || '';
                                        const newValue = current ? current + '\n' + comment.name : comment.name;
                                        updateRoundingData(patient.id, 'additionalComments', newValue);
                                      }}
                                      className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded hover:bg-blue-200 transition"
                                    >
                                      + {comment.name.length > 40 ? comment.name.substring(0, 40) + '...' : comment.name}
                                    </button>
                                  ))}
                                </div>
                                
                                <div className="flex gap-2 mb-2">
                                  <select
                                    onChange={(e) => {
                                      if (e.target.value) {
                                        const current = patient.roundingData.additionalComments || '';
                                        const newValue = current ? current + '\n' + e.target.value : e.target.value;
                                        updateRoundingData(patient.id, 'additionalComments', newValue);
                                        e.target.value = '';
                                      }
                                    }}
                                    className="flex-1 px-2 py-1 text-xs border border-blue-300 rounded-lg"
                                  >
                                    <option value="">Select from all comments...</option>
                                    {(commonComments || []).map(comment => (
                                      <option key={comment.id} value={comment.name}>{comment.name}</option>
                                    ))}
                                  </select>
                                </div>
                                
                                <div className="flex gap-2">
                                  <input
                                    type="text"
                                    placeholder="Add new comment to list..."
                                    className="flex-1 px-2 py-1 text-xs border border-blue-300 rounded-lg"
                                    onKeyPress={(e) => {
                                      if (e.key === 'Enter' && e.target.value.trim()) {
                                        addCommonComment(e.target.value);
                                        e.target.value = '';
                                      }
                                    }}
                                  />
                                  <button
                                    onClick={(e) => {
                                      const input = e.target.previousElementSibling;
                                      if (input.value.trim()) {
                                        addCommonComment(input.value);
                                        input.value = '';
                                      }
                                    }}
                                    className="px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
                                  >
                                    Save to List
                                  </button>
                                </div>
                                <p className="text-xs text-blue-700 mt-1 italic">New comments are saved for all patients</p>
                              </div>
                              
                              <textarea
                                value={patient.roundingData.additionalComments}
                                onChange={(e) => updateRoundingData(patient.id, 'additionalComments', e.target.value)}
                                placeholder="Additional Comments (can also type directly here)"
                                rows="3"
                                className="w-full px-3 py-2 text-sm border border-blue-300 rounded-lg"
                              />
                            </div>
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
          </>
        )}
      </div>
    </div>
  );
}
