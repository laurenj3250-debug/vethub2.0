'use client';
import React, { useState } from 'react';
import { Plus, Trash2, Clock, X, ChevronDown, ChevronUp } from 'lucide-react';

export default function VetPatientTracker() {
  const [patients, setPatients] = useState([]);
  const [newPatient, setNewPatient] = useState({ name: '', type: 'Surgery' });
  const [expandedPatients, setExpandedPatients] = useState({});
  const [showMorningOverview, setShowMorningOverview] = useState(false);
  const [generalTasks, setGeneralTasks] = useState([]);
  const [newGeneralTask, setNewGeneralTask] = useState('');
  const [commonProblems, setCommonProblems] = useState([
    'HBC - C2 fracture',
    'T13-L1 disc herniation',
    'Post-op hemilaminectomy',
    'Vestibular disease',
    'Cervical IVDD',
    'Thoracolumbar IVDD',
    'Seizures',
    'FCE',
    'Meningoencephalitis',
    'Status epilepticus',
    'Head trauma',
    'Spinal trauma',
    'Wobbler syndrome',
    'GME',
    'Brain tumor',
    'Spinal tumor'
  ]);
  const [commonComments, setCommonComments] = useState([
    'can increase gaba tram prn, traz prn',
    'let ketamine run out when finished',
    'assess fentanyl at 12am, can continue if painful otherwise d/c',
    'if has a seizure give 0.5mg/kg of diazepam IV. If has >3 seizures start a diazepam CRI at 0.3mg/kg/hr',
    'watch for apnea or respiratory distress',
    'do not skip trazodone unless ZONKED',
    'goal is to keep relatively calm',
    'fentanyl CRI can be changed if needed',
    'CARE WITH NECK',
    'try to replace bandage if falls off',
    'can have methadone if painful'
  ]);

  const procedureTypes = ['Surgery', 'MRI', 'Medical', 'Other'];

  const commonGeneralTasks = [
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
    if (!taskName.trim()) return;
    setGeneralTasks([...generalTasks, { id: Date.now(), name: taskName, completed: false }]);
    setNewGeneralTask('');
  };

  const toggleGeneralTask = (taskId) => {
    setGeneralTasks(generalTasks.map(t => 
      t.id === taskId ? { ...t, completed: !t.completed } : t
    ));
  };

  const removeGeneralTask = (taskId) => {
    setGeneralTasks(generalTasks.filter(t => t.id !== taskId));
  };

  const addCommonProblem = (newProblem) => {
    if (newProblem.trim() && !commonProblems.includes(newProblem.trim())) {
      setCommonProblems([...commonProblems, newProblem.trim()]);
    }
  };

  const addCommonComment = (newComment) => {
    if (newComment.trim() && !commonComments.includes(newComment.trim())) {
      setCommonComments([...commonComments, newComment.trim()]);
    }
  };

  const exportToCSV = () => {
    let csv = 'Text/call BOTH Neuro Residents for any transfers (group text!) Sheen: 908-907-7259, Johnston: 848-303-4277 (if they don\'t answer you, text/call again)\n';
    csv += 'Vocera during the day/on call Sunday: Lauren Johnston Monday: Lauren Johnston Tuesday: Ashley & Lauren Wednesday: Ashley & Lauren Thursday: Ashley & Lauren Friday: Ashley Sheen Saturday: Ashley Sheen\n';
    csv += 'NOTIFY IF THERE IS A PROBLEM OR DEATH IN ANY OF OUR PATIENTS\n\n';
    
    const headers = [
      'Signalment',
      'Location',
      'If in ICU does patient meet criteria?',
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
    
    patients.forEach(patient => {
      const r = patient.roundingData || {};
      csv += '"' + (r.signalment || '') + '",';
      csv += '"' + (r.location || '') + '",';
      csv += '"' + (r.icuCriteria || '') + '",';
      csv += '"' + (r.codeStatus || 'Yellow') + '",';
      csv += '"' + (r.problems || '') + '",';
      csv += '"' + (r.diagnosticFindings || '') + '",';
      csv += '"' + (r.therapeutics || '') + '",';
      csv += '"' + (r.replaceIVC || '') + '",';
      csv += '"' + (r.replaceFluids || '') + '",';
      csv += '"' + (r.replaceCRI || '') + '",';
      csv += '"' + (r.overnightDiagnostics || '') + '",';
      csv += '"' + (r.overnightConcerns || '') + '",';
      csv += '"' + (r.additionalComments || '') + '"\n';
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'rounding-sheet.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const addPatient = () => {
    if (newPatient.name.trim()) {
      const patient = {
        id: Date.now(),
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
      setPatients([...patients, patient]);
      setExpandedPatients({...expandedPatients, [patient.id]: true});
      setNewPatient({ name: '', type: 'Surgery' });
    }
  };

  const removePatient = (id) => {
    setPatients(patients.filter(p => p.id !== id));
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

  const updateStatus = (patientId, newStatus) => {
    setPatients(patients.map(p => 
      p.id === patientId ? { ...p, status: newStatus } : p
    ));
  };

  const updatePatientType = (patientId, newType) => {
    setPatients(patients.map(p => {
      if (p.id === patientId) {
        const updatedPatient = { ...p, type: newType };
        // If changing to MRI and no MRI data exists, add it
        if (newType === 'MRI' && !p.mriData) {
          updatedPatient.mriData = {
            weight: '',
            weightUnit: 'kg',
            scanType: 'Brain',
            calculated: false,
            copyableString: ''
          };
        }
        return updatedPatient;
      }
      return p;
    }));
  };

  const updateRoundingData = (patientId, field, value) => {
    setPatients(patients.map(p => 
      p.id === patientId 
        ? { ...p, roundingData: { ...p.roundingData, [field]: value } }
        : p
    ));
  };

  const parseBloodWork = (patientId, bwText) => {
    if (!bwText.trim()) {
      alert('Please paste blood work results first');
      return;
    }
    
    const abnormals = [];
    const lines = bwText.split('\n');
    
    const ranges = {
      'WBC': [6, 17],
      'RBC': [5.5, 8.5],
      'HGB': [12, 18],
      'HCT': [37, 55],
      'PLT': [200, 500],
      'NEUT': [3, 12],
      'LYMPH': [1, 5],
      'MONO': [0.2, 1.5],
      'EOS': [0, 1],
      'BUN': [7, 27],
      'CREAT': [0.5, 1.8],
      'GLU': [70, 143],
      'ALT': [10, 125],
      'AST': [0, 50],
      'ALP': [23, 212],
      'TBIL': [0, 0.9],
      'ALB': [2.3, 4.0],
      'TP': [5.2, 8.2],
      'CA': [9, 11.3],
      'PHOS': [2.5, 6.8],
      'NA': [144, 160],
      'K': [3.5, 5.8],
      'CL': [109, 122]
    };
    
    lines.forEach(line => {
      Object.keys(ranges).forEach(param => {
        const regex = new RegExp(param, 'i');
        if (regex.test(line)) {
          const numbers = line.match(/[\d.]+/g);
          if (numbers && numbers.length > 0) {
            const value = parseFloat(numbers[0]);
            const [low, high] = ranges[param];
            if (value < low || value > high) {
              abnormals.push(param + ' ' + value);
            }
          }
        }
      });
    });
    
    setPatients(currentPatients => currentPatients.map(p => {
      if (p.id === patientId) {
        const currentDx = p.roundingData.diagnosticFindings || '';
        const bwLine = abnormals.length > 0 
          ? 'CBC/CHEM: ' + abnormals.join(', ')
          : 'CBC/CHEM: NAD';
        const newDx = currentDx ? currentDx + '\n' + bwLine : bwLine;
        return {
          ...p,
          roundingData: { ...p.roundingData, diagnosticFindings: newDx },
          bwInput: ''
        };
      }
      return p;
    }));
  };

  const parsePatientDetails = (patientId, detailsText) => {
    if (!detailsText.trim()) {
      alert('Please paste patient details first');
      return;
    }
    
    const text = detailsText;
    const extractedInfo = {};
    
    // Try multiple patterns for Patient ID - now accepts letters, numbers, underscores, hyphens
    let patientIdMatch = text.match(/Patient\s*ID[:\s]+([A-Z0-9_-]+)/i);
    if (!patientIdMatch) patientIdMatch = text.match(/PatientID[:\s]+([A-Z0-9_-]+)/i);
    if (!patientIdMatch) patientIdMatch = text.match(/Patient[:\s]+([A-Z0-9_-]+)/i);
    if (!patientIdMatch) patientIdMatch = text.match(/ID[:\s]+([A-Z0-9_-]+)/i);
    if (patientIdMatch) extractedInfo.patientId = patientIdMatch[1];
    
    // Try multiple patterns for Client ID - now accepts letters, numbers, underscores, hyphens
    let clientIdMatch = text.match(/Client\s*ID[:\s]+([A-Z0-9_-]+)/i);
    if (!clientIdMatch) clientIdMatch = text.match(/ClientID[:\s]+([A-Z0-9_-]+)/i);
    if (!clientIdMatch) clientIdMatch = text.match(/Client[:\s]+([A-Z0-9_-]+)/i);
    if (clientIdMatch) extractedInfo.clientId = clientIdMatch[1];
    
    const weightMatch = text.match(/([\d.]+)\s*(kg|lb|lbs)/i);
    if (weightMatch) {
      extractedInfo.weight = weightMatch[1] + weightMatch[2].toUpperCase();
    }
    
    const dobMatch = text.match(/Date\s+of\s+Birth[:\s]+([\d-\/]+)/i);
    if (dobMatch) extractedInfo.dob = dobMatch[1];
    
    const ageMatch = text.match(/(\d+\s+years?(?:\s+\d+\s+months?)?(?:\s+\d+\s+days?)?)/i);
    if (ageMatch) extractedInfo.age = ageMatch[1];
    
    const speciesBreedMatch = text.match(/(Canine|Feline)\s*-\s*([^\n\r]+)/i);
    if (speciesBreedMatch) {
      extractedInfo.species = speciesBreedMatch[1];
      extractedInfo.breed = speciesBreedMatch[2].trim();
    }
    
    let sex = '';
    if (text.match(/\(M\)/i) || text.match(/\bMN\b/i) || text.match(/\bMale\b/i)) {
      sex = text.match(/\bMN\b/i) ? 'MN' : 'M';
    } else if (text.match(/\(F\)/i) || text.match(/\bFS\b/i) || text.match(/\bFemale\b/i)) {
      sex = text.match(/\bFS\b/i) ? 'FS' : 'F';
    }
    if (sex) extractedInfo.sex = sex;
    
    const ownerMatch = text.match(/Owner[:\s]+([^\n]+)/i);
    if (ownerMatch) {
      extractedInfo.ownerName = ownerMatch[1].trim();
    }
    
    const phoneMatches = text.match(/Ph[:\s]+(\d{3}[-.\s]?\d{3}[-.\s]?\d{4}(?:\s*#?\d+)?)/gi);
    if (phoneMatches && phoneMatches.length > 0) {
      const phones = phoneMatches.map(p => p.replace(/Ph[:\s]+/i, '').trim());
      extractedInfo.ownerPhone = phones.slice(0, 3).join(', ');
    }
    
    let signalment = '';
    if (ageMatch) signalment += ageMatch[1].replace(/\s+years?.*/, 'yo');
    if (sex) signalment += ' ' + sex;
    if (speciesBreedMatch) {
      signalment += ' ' + speciesBreedMatch[2].trim();
    }
    
    const treatments = [];
    
    const treatmentsMatch = text.match(/TREATMENTS:[:\s]*\n([^\n]+(?:\n(?![\n])[^\n]+)*)/i);
    if (treatmentsMatch) {
      const treatmentLines = treatmentsMatch[1].split('\n').filter(l => l.trim());
      treatments.push(...treatmentLines.map(l => l.trim()));
    }
    
    const medicationsMatch = text.match(/Medications:[:\s]*\n([^\n]+(?:\n(?![A-Z][a-z]+:)[^\n]+)*)/i);
    if (medicationsMatch) {
      const medLines = medicationsMatch[1].split('\n').filter(l => l.trim() && !l.match(/^\d+[-\/]/));
      treatments.push(...medLines.map(l => l.trim()));
    }
    
    const currentMedsMatch = text.match(/Current\s+Medications[:\s]*\n([^\n]+(?:\n(?![A-Z][a-z]+:)[^\n]+)*)/i);
    if (currentMedsMatch) {
      const medLines = currentMedsMatch[1].split('\n').filter(l => l.trim());
      treatments.push(...medLines.map(l => l.trim()));
    }
    
    const fluidsMatch = text.match(/Fluids:[:\s]*\n([^\n]+)/i);
    if (fluidsMatch) {
      treatments.push(fluidsMatch[1].trim());
    }
    
    const therapeutics = treatments.filter(t => t && t.length > 2).join('\n');
    
    setPatients(currentPatients => currentPatients.map(p => {
      if (p.id === patientId) {
        return {
          ...p,
          patientInfo: {
            ...p.patientInfo,
            ...extractedInfo
          },
          roundingData: {
            ...p.roundingData,
            signalment: signalment.trim(),
            therapeutics: therapeutics || p.roundingData.therapeutics
          },
          detailsInput: ''
        };
      }
      return p;
    }));
  };

  const addChestXray = (patientId, xrayStatus, otherText) => {
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
    
    setPatients(currentPatients => currentPatients.map(p => {
      if (p.id === patientId) {
        const currentDx = p.roundingData.diagnosticFindings || '';
        const newDx = currentDx ? currentDx + '\n' + xrayLine : xrayLine;
        return {
          ...p,
          roundingData: { ...p.roundingData, diagnosticFindings: newDx },
          xrayOther: ''
        };
      }
      return p;
    }));
  };

  const updatePatientInfo = (patientId, field, value) => {
    setPatients(patients.map(p => 
      p.id === patientId 
        ? { ...p, patientInfo: { ...p.patientInfo, [field]: value } }
        : p
    ));
  };

  const updateMRIData = (patientId, field, value) => {
    setPatients(patients.map(p => 
      p.id === patientId && p.mriData
        ? { ...p, mriData: { ...p.mriData, [field]: value, calculated: false, copyableString: '' } }
        : p
    ));
  };

  const calculateMRIDrugs = (patientId) => {
    const patient = patients.find(p => p.id === patientId);
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

    setPatients(patients.map(p => 
      p.id === patientId 
        ? { 
            ...p, 
            mriData: { 
              ...p.mriData, 
              weightKg: weightKg.toFixed(1),
              preMedDrug: preMedDrug,
              preMedDose: preMedDose.toFixed(2),
              preMedVolume: preMedVolume.toFixed(2),
              valiumDose: valiumDose.toFixed(2),
              valiumVolume: valiumVolume.toFixed(2),
              contrastVolume: contrastVolume.toFixed(1),
              calculated: true,
              copyableString: copyableString
            } 
          }
        : p
    ));
  };

  const addTaskToPatient = (patientId, taskName) => {
    setPatients(patients.map(p => {
      if (p.id === patientId) {
        const taskExists = p.tasks.some(t => t.name === taskName);
        if (!taskExists) {
          return {
            ...p,
            tasks: [...p.tasks, { name: taskName, completed: false, id: Date.now() + Math.random() }]
          };
        }
      }
      return p;
    }));
  };

  const addMorningTasks = (patientId) => {
    setPatients(patients.map(p => {
      if (p.id === patientId) {
        const newTasks = [...p.tasks];
        morningTasks.forEach(taskName => {
          const taskExists = p.tasks.some(t => t.name === taskName);
          if (!taskExists) {
            newTasks.push({ name: taskName, completed: false, id: Date.now() + Math.random() });
          }
        });
        return { ...p, tasks: newTasks };
      }
      return p;
    }));
  };

  const addEveningTasks = (patientId) => {
    setPatients(patients.map(p => {
      if (p.id === patientId) {
        const newTasks = [...p.tasks];
        eveningTasks.forEach(taskName => {
          const taskExists = p.tasks.some(t => t.name === taskName);
          if (!taskExists) {
            newTasks.push({ name: taskName, completed: false, id: Date.now() + Math.random() });
          }
        });
        return { ...p, tasks: newTasks };
      }
      return p;
    }));
  };

  const addMorningTasksToAll = () => {
    patients.forEach(p => addMorningTasks(p.id));
  };

  const resetDailyTasks = (patientId) => {
    setPatients(patients.map(p => {
      if (p.id === patientId) {
        const allDailyTasks = [...morningTasks, ...eveningTasks];
        const filteredTasks = p.tasks.filter(t => !allDailyTasks.includes(t.name));
        return { ...p, tasks: filteredTasks };
      }
      return p;
    }));
  };

  const addCustomTask = (patientId) => {
    const patient = patients.find(p => p.id === patientId);
    if (patient && patient.customTask.trim()) {
      addTaskToPatient(patientId, patient.customTask.trim());
      setPatients(patients.map(p => 
        p.id === patientId ? { ...p, customTask: '' } : p
      ));
    }
  };

  const removeTask = (patientId, taskId) => {
    setPatients(patients.map(p => {
      if (p.id === patientId) {
        return {
          ...p,
          tasks: p.tasks.filter(t => t.id !== taskId)
        };
      }
      return p;
    }));
  };

  const toggleTask = (patientId, taskId) => {
    setPatients(patients.map(p => {
      if (p.id === patientId) {
        return {
          ...p,
          tasks: p.tasks.map(t => 
            t.id === taskId ? { ...t, completed: !t.completed } : t
          )
        };
      }
      return p;
    }));
  };

  const getCompletionStatus = (patient) => {
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
    patients.forEach(p => {
      newExpandedState[p.id] = expand;
    });
    setExpandedPatients(newExpandedState);
  };

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
              {patients.length > 0 && (
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
            {commonGeneralTasks.map(task => (
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

          {generalTasks.length === 0 ? (
            <p className="text-gray-400 text-sm italic py-2">No general tasks yet. Click quick-add buttons or type a custom task.</p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {generalTasks.map(task => (
                <div
                  key={task.id}
                  className={'flex items-center gap-2 p-2 rounded-lg border-2 transition ' + (task.completed ? 'bg-green-50 border-green-500' : 'bg-gray-50 border-gray-300')}
                >
                  <input
                    type="checkbox"
                    checked={task.completed}
                    onChange={() => toggleGeneralTask(task.id)}
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

        {patients.length === 0 ? (
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
                {generalTasks.length > 0 && (
                  <div className="mb-4 p-4 bg-indigo-50 border-2 border-indigo-300 rounded-lg">
                    <h3 className="font-bold text-indigo-900 mb-3 text-lg">General Tasks</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {generalTasks.map(task => (
                        <label
                          key={task.id}
                          className={'flex items-center gap-2 p-2 rounded text-sm cursor-pointer ' + (task.completed ? 'bg-green-100 text-green-800' : 'bg-white text-indigo-900 border border-indigo-200')}
                        >
                          <input
                            type="checkbox"
                            checked={task.completed}
                            onChange={() => toggleGeneralTask(task.id)}
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
                  {patients.map(patient => {
                    const patientMorningTasks = patient.tasks.filter(t => morningTasks.includes(t.name));
                    const patientEveningTasks = patient.tasks.filter(t => eveningTasks.includes(t.name));
                    const otherTasks = patient.tasks.filter(t => !morningTasks.includes(t.name) && !eveningTasks.includes(t.name));
                    const allPatientTasks = patient.tasks;
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
              {patients.map(patient => {
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
                              onChange={(e) => setPatients(patients.map(p => 
                                p.id === patient.id ? { ...p, customTask: e.target.value } : p
                              ))}
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

                          {patient.tasks.length === 0 ? (
                            <p className="text-gray-400 text-sm italic py-4">No tasks yet</p>
                          ) : (
                            <div className="space-y-3">
                               <div>
                                <h4 className="text-xs font-bold text-orange-600 mb-1">☀️ Morning Tasks</h4>
                                <div className="space-y-2">
                                  {patient.tasks.filter(t => morningTasks.includes(t.name)).map(task => (
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
                                  {patient.tasks.filter(t => eveningTasks.includes(t.name)).map(task => (
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
                                  {patient.tasks.filter(t => !morningTasks.includes(t.name) && !eveningTasks.includes(t.name)).map(task => (
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
                                onChange={(e) => setPatients(patients.map(p => 
                                  p.id === patient.id ? { ...p, detailsInput: e.target.value } : p
                                ))}
                                placeholder="Paste patient info from eVetPractice, Easy Vet, etc..."
                                rows="4"
                                className="w-full px-3 py-2 text-sm border rounded-lg mb-2"
                              />
                              <button
                                onClick={() => parsePatientDetails(patient.id, patient.detailsInput)}
                                className="px-3 py-1 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700"
                              >
                                Extract Patient Info
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
                                  {commonProblems.slice(0, 8).map(problem => (
                                    <button
                                      key={problem}
                                      onClick={() => {
                                        const current = patient.roundingData.problems || '';
                                        const newValue = current ? current + '\n' + problem : problem;
                                        updateRoundingData(patient.id, 'problems', newValue);
                                      }}
                                      className="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded hover:bg-yellow-200 transition"
                                    >
                                      + {problem}
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
                                    {commonProblems.map(problem => (
                                      <option key={problem} value={problem}>{problem}</option>
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
                                  onChange={(e) => setPatients(patients.map(p => 
                                    p.id === patient.id ? { ...p, bwInput: e.target.value } : p
                                  ))}
                                  placeholder="Paste full blood work results here..."
                                  rows="3"
                                  className="w-full px-3 py-2 text-sm border rounded-lg mb-2"
                                />
                                <button
                                  onClick={() => parseBloodWork(patient.id, patient.bwInput)}
                                  className="px-3 py-1 bg-green-600 text-white text-xs rounded-lg hover:bg-green-700"
                                >
                                  Extract Abnormals to Findings
                                </button>
                              </div>
                              
                              <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1">Chest X-ray</label>
                                <div className="flex gap-2 mb-2">
                                  <select
                                    value={patient.xrayStatus}
                                    onChange={(e) => setPatients(patients.map(p => 
                                      p.id === patient.id ? { ...p, xrayStatus: e.target.value } : p
                                    ))}
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
                                      onChange={(e) => setPatients(patients.map(p => 
                                        p.id === patient.id ? { ...p, xrayOther: e.target.value } : p
                                      ))}
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
                                  {commonComments.slice(0, 6).map(comment => (
                                    <button
                                      key={comment}
                                      onClick={() => {
                                        const current = patient.roundingData.additionalComments || '';
                                        const newValue = current ? current + '\n' + comment : comment;
                                        updateRoundingData(patient.id, 'additionalComments', newValue);
                                      }}
                                      className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded hover:bg-blue-200 transition"
                                    >
                                      + {comment.length > 40 ? comment.substring(0, 40) + '...' : comment}
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
                                    {commonComments.map(comment => (
                                      <option key={comment} value={comment}>{comment}</option>
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
