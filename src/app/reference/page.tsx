'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Search, ChevronDown, ChevronUp, TestTube, Pill, Stethoscope, Plus, Trash2, Edit2, Save, X, Copy, Check } from 'lucide-react';
import Link from 'next/link';
import { useUser, useAuth, useFirestore, useMemoFirebase, useCollection } from '@/firebase';
import {
  addDocumentNonBlocking,
  updateDocumentNonBlocking,
  deleteDocumentNonBlocking,
} from '@/firebase/non-blocking-updates';
import { collection, doc, query } from 'firebase/firestore';
import { getDischargeMedsByWeight, type DischargeMedGroup } from '@/lib/discharge-meds';


const DischargeCocktailCalculator = () => {
  const [weight, setWeight] = useState('');
  const [selectedMedGroup, setSelectedMedGroup] = useState<DischargeMedGroup | null>(null);
  const [copied, setCopied] = useState(false);

  const handleWeightChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newWeight = e.target.value;
    setWeight(newWeight);
    const weightNum = parseFloat(newWeight);
    if (!isNaN(weightNum) && weightNum > 0) {
      const group = getDischargeMedsByWeight(weightNum);
      setSelectedMedGroup(group || null);
    } else {
      setSelectedMedGroup(null);
    }
  };

  const generateCopyText = () => {
    if (!selectedMedGroup) return 'MEDICATIONS:\n\n';
    let text = `MEDICATIONS:\n\n`;
    selectedMedGroup.meds.forEach((med, index) => {
      text += `${index + 1}) ${med.name}: ${med.instructions}\n`;
      if (med.nextDose) {
        text += `${med.nextDose}\n`;
      }
      text += `\n`;
    });
    if (selectedMedGroup.recheckNote) {
      text += `${selectedMedGroup.recheckNote}\n`;
    }
    return text;
  };

  const handleCopy = () => {
    const textToCopy = generateCopyText();
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-4 mb-4 border-l-4 border-orange-400">
      <h2 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
        <Pill className="text-orange-500" />
        Discharge Cocktail Calculator
      </h2>
      <div className="flex items-center gap-2 mb-4">
        <label htmlFor="weight-input" className="text-sm font-semibold text-gray-700">
          Enter Weight (kg):
        </label>
        <input
          id="weight-input"
          type="number"
          value={weight}
          onChange={handleWeightChange}
          placeholder="e.g., 12.5"
          className="w-32 px-3 py-1.5 text-sm border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
        />
      </div>

      {selectedMedGroup ? (
        <div className="p-4 bg-orange-50/70 border border-orange-200 rounded-lg">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-orange-900">
              Meds for Weight Range: {selectedMedGroup.range}
            </h3>
            <button
              onClick={handleCopy}
              className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-2 text-xs transition-all duration-200 shadow-sm ${
                copied
                  ? 'bg-green-600 text-white'
                  : 'bg-orange-500 text-white hover:bg-orange-600'
              }`}
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
              {copied ? 'Copied!' : 'Copy Instructions'}
            </button>
          </div>
          <div className="space-y-3">
            {selectedMedGroup.meds.map((med, index) => (
              <div key={index} className="text-sm">
                <p className="font-semibold text-gray-800">{index + 1}) {med.name}</p>
                <p className="text-gray-700 pl-4">{med.instructions}</p>
                {med.nextDose && <p className="text-red-600 font-bold pl-4">{med.nextDose}</p>}
              </div>
            ))}
            {selectedMedGroup.recheckNote && (
              <p className="text-sm font-semibold text-blue-700 mt-4 pt-2 border-t border-orange-200">
                {selectedMedGroup.recheckNote}
              </p>
            )}
          </div>
        </div>
      ) : (
        weight && (
          <p className="text-sm text-red-600">
            No medication protocol found for the entered weight.
          </p>
        )
      )}
    </div>
  );
};


export default function VetReferenceGuide() {
  const auth = useAuth();
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();
  const dataInitialized = useRef(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingData, setEditingData] = useState<any>({});

  // Firestore queries
  const workupsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, `users/${user.uid}/workups`));
  }, [firestore, user]);
  const workupsRes = useCollection(workupsQuery);
  const workups = workupsRes?.data ?? [];

  const medicationsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, `users/${user.uid}/medicationCategories`));
  }, [firestore, user]);
  const medicationsRes = useCollection(medicationsQuery);
  const medicationCategories = medicationsRes?.data ?? [];

  const normalValuesQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, `users/${user.uid}/normalValues`));
  }, [firestore, user]);
  const normalValuesRes = useCollection(normalValuesQuery);
  const normalValues = normalValuesRes?.data ?? [];

  const quickTipsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, `users/${user.uid}/quickTips`));
  }, [firestore, user]);
  const quickTipsRes = useCollection(quickTipsQuery);
  const quickTips = quickTipsRes?.data ?? [];

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  // Initialize default data on first load
  useEffect(() => {
    if (dataInitialized.current || !firestore || !user) {
      return;
    }

    const allDataLoaded = !workupsRes.isLoading && !medicationsRes.isLoading && !normalValuesRes.isLoading && !quickTipsRes.isLoading;
    if (!allDataLoaded) {
      return;
    }

    dataInitialized.current = true; // Set flag to prevent re-running

    if (workups.length === 0) {
      const defaultWorkups = [
        {
          title: 'Stroke Workup',
          icon: '🧠',
          category: 'Neurology',
          tests: [
            'CBC/Chemistry',
            'Urinalysis with UPC',
            'Coagulation Panel (PT/PTT)',
            'Blood Pressure',
            'Tick Panel (4DX or PCR)',
            'Thyroid Panel (T4, fT4)',
            'ACTH Stim vs LDDST (if Cushingoid)',
            'Abdominal Ultrasound',
            'Chest X-rays (3 view)',
            'Echocardiogram',
            'MRI Brain (contrast)',
          ]
        },
        {
          title: 'Seizure Workup',
          icon: '⚡',
          category: 'Neurology',
          tests: [
            'CBC/Chemistry (fasted)',
            'Bile Acids (pre/post)',
            'Urinalysis',
            'Blood Pressure',
            'Toxin Screen (if indicated)',
            'Lead Level (if indicated)',
            'MRI Brain (if >6yo, focal seizures, or abnormal neuro exam)',
            'CSF Analysis (with MRI)',
          ]
        },
        {
          title: 'Vestibular Workup',
          icon: '🌀',
          category: 'Neurology',
          tests: [
            'CBC/Chemistry',
            'Urinalysis',
            'Blood Pressure',
            'Thyroid Panel',
            'Otoscopic Exam / Ear Cytology',
            'BAER Test (if chronic ear disease)',
            'CT or MRI (if central signs)',
            'CSF (if central)',
          ]
        },
        {
          title: 'IVDD Workup',
          icon: '🦴',
          category: 'Neurology',
          tests: [
            'Neurological Exam (localization)',
            'CBC/Chemistry (pre-anesthetic)',
            'Chest X-rays (if surgery planned)',
            'MRI Spine (T2, T1, +/- contrast)',
            'Consider CT Myelo if MRI unavailable',
          ]
        },
      ];

      defaultWorkups.forEach(w => {
        addDocumentNonBlocking(collection(firestore, `users/${user.uid}/workups`), w);
      });
    }

    if (medicationCategories.length === 0) {
      const defaultMeds = [
        {
          category: 'Anesthesia',
          drugs: [
            { name: 'Propofol', dose: '4-6 mg/kg IV (to effect)', notes: 'Respiratory depression' },
            { name: 'Alfaxalone', dose: '2-3 mg/kg IV', notes: 'Smoother than propofol' },
            { name: 'Ketamine', dose: '5-10 mg/kg IM or 2-5 mg/kg IV', notes: 'With sedative' },
            { name: 'Dexmedetomidine', dose: '5-10 mcg/kg IM', notes: 'Reversible with atipamezole' },
            { name: 'Butorphanol', dose: '0.2-0.4 mg/kg IM/IV', notes: 'Sedation + mild analgesia' },
          ]
        },
        {
          category: 'Emergency',
          drugs: [
            { name: 'Atropine', dose: '0.02-0.04 mg/kg IV/IM', notes: 'Bradycardia' },
            { name: 'Epinephrine', dose: '0.01 mg/kg (0.1 mL/kg of 1:10,000) IV', notes: 'Cardiac arrest' },
            { name: 'Naloxone', dose: '0.04 mg/kg IV', notes: 'Opioid reversal' },
            { name: 'Atipamezole', dose: 'Same volume as dex given IM', notes: 'Alpha-2 reversal' },
            { name: 'Mannitol', dose: '0.5-1 g/kg IV over 20 min', notes: 'Cerebral edema' },
            { name: 'Dexamethasone SP', dose: '0.25-1 mg/kg IV', notes: 'Spinal trauma (controversial)' },
          ]
        },
        {
          category: 'Anti-Seizure',
          drugs: [
            { name: 'Diazepam', dose: '0.5-1 mg/kg IV/rectal', notes: 'First-line acute seizure' },
            { name: 'Levetiracetam', dose: '20 mg/kg IV, then 20 mg/kg PO TID', notes: 'Loading dose' },
            { name: 'Phenobarbital', dose: '2-5 mg/kg PO BID', notes: 'Chronic control' },
            { name: 'CRI Diazepam', dose: '0.5-2 mg/kg/hr IV', notes: 'Status epilepticus' },
          ]
        },
        {
          category: 'Pain Management',
          drugs: [
            { name: 'Hydromorphone', dose: '0.05-0.2 mg/kg IV/IM q2-6h', notes: 'Strong opioid' },
            { name: 'Fentanyl CRI', dose: '2-10 mcg/kg/hr IV', notes: 'Severe pain' },
            { name: 'Gabapentin', dose: '5-20 mg/kg PO BID-TID', notes: 'Neuropathic pain' },
            { name: 'Carprofen', dose: '2.2 mg/kg PO BID or 4.4 mg/kg SID', notes: 'NSAID' },
            { name: 'Robenacoxib', dose: '1-2 mg/kg PO SID (cat), 1 mg/kg SID (dog)', notes: 'COX-2 selective' },
          ]
        },
        {
          category: 'GI',
          drugs: [
            { name: 'Maropitant', dose: '1 mg/kg SQ/IV SID', notes: 'Max 5 days injectable' },
            { name: 'Ondansetron', dose: '0.1-0.2 mg/kg IV/PO BID-TID', notes: 'Strong antiemetic' },
            { name: 'Metoclopramide', dose: '0.2-0.5 mg/kg PO/SQ TID-QID or 1-2 mg/kg/day CRI', notes: 'Prokinetic' },
            { name: 'Sucralfate', dose: '0.5-1 g PO TID', notes: 'Give 2hr away from other meds' },
            { name: 'Famotidine', dose: '0.5-1 mg/kg PO/IV BID', notes: 'H2 blocker' },
          ]
        },
      ];

      defaultMeds.forEach(m => {
        addDocumentNonBlocking(collection(firestore, `users/${user.uid}/medicationCategories`), m);
      });
    }

    if (normalValues.length === 0) {
      const defaultNormals = [
        {
          category: 'CBC - Canine',
          values: [
            { test: 'WBC', range: '5.5-16.9 K/μL' },
            { test: 'RBC', range: '5.65-8.87 M/μL' },
            { test: 'Hemoglobin', range: '13.1-20.5 g/dL' },
            { test: 'Hematocrit', range: '37.3-61.7%' },
            { test: 'Platelets', range: '148-484 K/μL' },
            { test: 'Neutrophils', range: '2.95-11.64 K/μL' },
            { test: 'Lymphocytes', range: '1.05-5.10 K/μL' },
          ]
        },
        {
          category: 'CBC - Feline',
          values: [
            { test: 'WBC', range: '5.5-19.5 K/μL' },
            { test: 'RBC', range: '5.92-9.93 M/μL' },
            { test: 'Hemoglobin', range: '9.8-15.4 g/dL' },
            { test: 'Hematocrit', range: '29.3-48.9%' },
            { test: 'Platelets', range: '151-600 K/μL' },
          ]
        },
        {
          category: 'Chemistry',
          values: [
            { test: 'BUN', range: '7-27 mg/dL (dog), 16-36 mg/dL (cat)' },
            { test: 'Creatinine', range: '0.5-1.8 mg/dL (dog), 0.8-2.4 mg/dL (cat)' },
            { test: 'Glucose', range: '74-143 mg/dL (dog), 71-148 mg/dL (cat)' },
            { test: 'Total Protein', range: '5.2-8.2 g/dL (dog), 5.4-7.8 g/dL (cat)' },
            { test: 'Albumin', range: '2.3-4.0 g/dL (dog), 2.5-3.9 g/dL (cat)' },
            { test: 'ALT', range: '10-125 U/L (dog), 6-83 U/L (cat)' },
            { test: 'ALP', range: '23-212 U/L (dog), 10-90 U/L (cat)' },
            { test: 'Total Bili', range: '0.0-0.9 mg/dL (dog), 0.0-0.4 mg/dL (cat)' },
          ]
        },
        {
          category: 'Electrolytes',
          values: [
            { test: 'Sodium', range: '144-160 mEq/L (dog), 150-165 mEq/L (cat)' },
            { test: 'Potassium', range: '3.5-5.8 mEq/L (dog), 3.5-5.8 mEq/L (cat)' },
            { test: 'Chloride', range: '109-122 mEq/L (dog), 117-123 mEq/L (cat)' },
            { test: 'Calcium', range: '7.9-12.0 mg/dL (dog), 6.2-10.2 mg/dL (cat)' },
            { test: 'Phosphorus', range: '2.5-6.8 mg/dL (dog), 3.4-8.5 mg/dL (cat)' },
          ]
        },
      ];

      defaultNormals.forEach(n => {
        addDocumentNonBlocking(collection(firestore, `users/${user.uid}/normalValues`), n);
      });
    }

    if (quickTips.length === 0) {
      const defaultTips = [
        {
          title: 'IVDD Grading',
          icon: '🔢',
          content: [
            'Grade 1: Pain only, ambulatory',
            'Grade 2: Ambulatory paraparesis/ataxia',
            'Grade 3: Non-ambulatory paraparesis',
            'Grade 4: Paraplegia, intact DPP',
            'Grade 5: Paraplegia, no DPP (emergency!)',
          ]
        },
        {
          title: 'Shock Fluid Doses',
          icon: '💉',
          content: [
            'Dog Shock Dose: 90 mL/kg/hr (give in 1/4 boluses)',
            'Cat Shock Dose: 45-60 mL/kg/hr',
            'Reassess after each bolus!',
            'Watch for volume overload (increased RR, crackles)',
          ]
        },
      ];

      defaultTips.forEach(t => {
        addDocumentNonBlocking(collection(firestore, `users/${user.uid}/quickTips`), t);
      });
    }
  }, [
    firestore, 
    user, 
    workups, 
    workupsRes.isLoading, 
    medicationCategories, 
    medicationsRes.isLoading, 
    normalValues, 
    normalValuesRes.isLoading, 
    quickTips, 
    quickTipsRes.isLoading
  ]);

  // CRUD Operations
  const startEdit = (id: string, data: any) => {
    setEditingId(id);
    setEditingData({ ...data });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditingData({});
  };

  const saveEdit = (collectionName: string, id: string) => {
    if (!firestore || !user) return;
    const ref = doc(firestore, `users/${user.uid}/${collectionName}`, id);
    updateDocumentNonBlocking(ref, editingData);
    setEditingId(null);
    setEditingData({});
  };

  const deleteItem = (collectionName: string, id: string) => {
    if (!firestore || !user) return;
    if (!confirm('Are you sure you want to delete this item?')) return;
    const ref = doc(firestore, `users/${user.uid}/${collectionName}`, id);
    deleteDocumentNonBlocking(ref);
  };

  const addNewWorkup = () => {
    if (!firestore || !user) return;
    const newWorkup = {
      title: 'New Workup',
      icon: '📋',
      category: 'Neurology',
      tests: ['Test 1', 'Test 2'],
    };
    addDocumentNonBlocking(collection(firestore, `users/${user.uid}/workups`), newWorkup);
  };

  const addNewMedCategory = () => {
    if (!firestore || !user) return;
    const newCategory = {
      category: 'New Category',
      drugs: [
        { name: 'Drug Name', dose: 'Dose here', notes: 'Notes here' }
      ],
    };
    addDocumentNonBlocking(collection(firestore, `users/${user.uid}/medicationCategories`), newCategory);
  };

  const addNewNormalValue = () => {
    if (!firestore || !user) return;
    const newValue = {
      category: 'New Test Category',
      values: [
        { test: 'Test Name', range: 'Range here' }
      ],
    };
    addDocumentNonBlocking(collection(firestore, `users/${user.uid}/normalValues`), newValue);
  };

  const addNewQuickTip = () => {
    if (!firestore || !user) return;
    const newTip = {
      title: 'New Tip',
      icon: '💡',
      content: ['Tip 1', 'Tip 2'],
    };
    addDocumentNonBlocking(collection(firestore, `users/${user.uid}/quickTips`), newTip);
  };

  const filterContent = (text: string) => {
    if (!searchQuery) return true;
    return text.toLowerCase().includes(searchQuery.toLowerCase());
  };

  const filteredWorkups = workups.filter((w: any) => 
    filterContent(w.title) || 
    filterContent(w.category) || 
    w.tests?.some((t: string) => filterContent(t))
  );

  if (isUserLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl">Loading... 🐾</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl">Please sign in to access reference guide</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-fuchsia-50/50 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white/80 backdrop-blur-sm rounded-lg shadow-md p-4 mb-4 border-t-2 border-purple-300">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-fuchsia-600 bg-clip-text text-transparent">
                📚 Veterinary Reference Guide
              </h1>
              <p className="text-xs text-gray-500">Quick lookup for diagnostic workups, meds, and normal values</p>
            </div>
            <Link
              href="/"
              className="px-3 py-1.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm"
            >
              ← Back to Tracker
            </Link>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search workups, medications, tests..."
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            )}
          </div>
        </div>

        {/* Discharge Cocktail Calculator */}
        <DischargeCocktailCalculator />

        {/* Quick Tips */}
        <div className="bg-white rounded-lg shadow-md p-4 mb-4 border-l-4 border-yellow-400">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold text-gray-800">💡 Quick Tips</h2>
            <button
              onClick={addNewQuickTip}
              className="px-2 py-1 text-xs bg-yellow-600 text-white rounded hover:bg-yellow-700 flex items-center gap-1"
            >
              <Plus size={14} />
              Add Tip
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {quickTips.map((tip: any) => (
              <div key={tip.id} className="bg-white rounded-lg shadow-sm border border-yellow-200 p-3 relative group">
                {editingId === tip.id ? (
                  <div className="space-y-2">
                    <input
                      value={editingData.icon || ''}
                      onChange={(e) => setEditingData({ ...editingData, icon: e.target.value })}
                      className="w-16 px-2 py-1 text-sm border rounded"
                      placeholder="Icon"
                    />
                    <input
                      value={editingData.title || ''}
                      onChange={(e) => setEditingData({ ...editingData, title: e.target.value })}
                      className="w-full px-2 py-1 text-sm border rounded"
                      placeholder="Title"
                    />
                    <textarea
                      value={(editingData.content || []).join('\\n')}
                      onChange={(e) => setEditingData({ ...editingData, content: e.target.value.split('\\n') })}
                      rows={4}
                      className="w-full px-2 py-1 text-xs border rounded"
                      placeholder="One item per line"
                    />
                    <div className="flex gap-1">
                      <button
                        onClick={() => saveEdit('quickTips', tip.id)}
                        className="flex-1 px-2 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700"
                      >
                        <Save size={12} className="inline mr-1" />
                        Save
                      </button>
                      <button
                        onClick={cancelEdit}
                        className="px-2 py-1 bg-gray-400 text-white text-xs rounded hover:bg-gray-500"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition flex gap-1">
                      <button
                        onClick={() => startEdit(tip.id, tip)}
                        className="p-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                      >
                        <Edit2 size={12} />
                      </button>
                      <button
                        onClick={() => deleteItem('quickTips', tip.id)}
                        className="p-1 bg-red-500 text-white rounded hover:bg-red-600"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                    <h3 className="text-sm font-bold text-yellow-800 mb-2 flex items-center gap-1">
                      <span className="text-lg">{tip.icon}</span>
                      {tip.title}
                    </h3>
                    <ul className="space-y-1">
                      {(tip.content || []).map((item: string, i: number) => (
                        <li key={i} className="text-xs text-gray-700 leading-relaxed">
                          {item}
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Diagnostic Workups */}
        <div className="bg-white rounded-lg shadow-md p-4 mb-4 border-l-4 border-blue-400">
          <div className="flex items-center justify-between mb-3">
            <button
              onClick={() => toggleSection('workups')}
              className="flex items-center gap-2 hover:bg-gray-50 p-2 rounded transition"
            >
              <TestTube className="text-blue-600" />
              <h2 className="text-lg font-bold text-gray-800">Diagnostic Workups</h2>
              {expandedSections['workups'] ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
            </button>
            <button
              onClick={addNewWorkup}
              className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-1"
            >
              <Plus size={14} />
              Add Workup
            </button>
          </div>
          
          {expandedSections['workups'] && (
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredWorkups.map((workup: any) => (
                <div key={workup.id} className="border border-gray-200 rounded-lg p-3 hover:shadow-md transition bg-gradient-to-br from-white to-blue-50/30 relative group">
                  {editingId === workup.id ? (
                    <div className="space-y-2">
                      <input
                        value={editingData.icon || ''}
                        onChange={(e) => setEditingData({ ...editingData, icon: e.target.value })}
                        className="w-16 px-2 py-1 text-sm border rounded"
                        placeholder="Icon"
                      />
                      <input
                        value={editingData.title || ''}
                        onChange={(e) => setEditingData({ ...editingData, title: e.target.value })}
                        className="w-full px-2 py-1 text-sm border rounded"
                        placeholder="Title"
                      />
                      <input
                        value={editingData.category || ''}
                        onChange={(e) => setEditingData({ ...editingData, category: e.target.value })}
                        className="w-full px-2 py-1 text-xs border rounded"
                        placeholder="Category"
                      />
                      <textarea
                        value={(editingData.tests || []).join('\\n')}
                        onChange={(e) => setEditingData({ ...editingData, tests: e.target.value.split('\\n') })}
                        rows={6}
                        className="w-full px-2 py-1 text-xs border rounded"
                        placeholder="One test per line"
                      />
                      <div className="flex gap-1">
                        <button
                          onClick={() => saveEdit('workups', workup.id)}
                          className="flex-1 px-2 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700"
                        >
                          <Save size={12} className="inline mr-1" />
                          Save
                        </button>
                        <button
                          onClick={cancelEdit}
                          className="px-2 py-1 bg-gray-400 text-white text-xs rounded hover:bg-gray-500"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition flex gap-1">
                        <button
                          onClick={() => startEdit(workup.id, workup)}
                          className="p-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                        >
                          <Edit2 size={12} />
                        </button>
                        <button
                          onClick={() => deleteItem('workups', workup.id)}
                          className="p-1 bg-red-500 text-white rounded hover:bg-red-600"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                      <h3 className="font-bold text-sm text-blue-900 mb-1 flex items-center gap-2">
                        <span className="text-xl">{workup.icon}</span>
                        {workup.title}
                      </h3>
                      <span className="text-xs text-gray-500 italic">{workup.category}</span>
                      <ul className="mt-2 space-y-1">
                        {(workup.tests || []).map((test: string, i: number) => (
                          <li key={i} className="text-xs text-gray-700 flex items-start gap-1">
                            <span className="text-blue-600 mt-0.5">•</span>
                            <span>{test}</span>
                          </li>
                        ))}
                      </ul>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Medications */}
        <div className="bg-white rounded-lg shadow-md p-4 mb-4 border-l-4 border-green-400">
          <div className="flex items-center justify-between mb-3">
            <button
              onClick={() => toggleSection('meds')}
              className="flex items-center gap-2 hover:bg-gray-50 p-2 rounded transition"
            >
              <Pill className="text-green-600" />
              <h2 className="text-lg font-bold text-gray-800">Common Medications</h2>
              {expandedSections['meds'] ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
            </button>
            <button
              onClick={addNewMedCategory}
              className="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 flex items-center gap-1"
            >
              <Plus size={14} />
              Add Category
            </button>
          </div>
          
          {expandedSections['meds'] && (
            <div className="mt-4 space-y-4">
              {medicationCategories.map((category: any) => (
                <div key={category.id} className="border border-gray-200 rounded-lg p-3 bg-gradient-to-br from-white to-green-50/30 relative group">
                  {editingId === category.id ? (
                    <div className="space-y-2">
                      <input
                        value={editingData.category || ''}
                        onChange={(e) => setEditingData({ ...editingData, category: e.target.value })}
                        className="w-full px-2 py-1 text-sm border rounded font-bold"
                        placeholder="Category Name"
                      />
                      <div className="space-y-2">
                        {(editingData.drugs || []).map((drug: any, idx: number) => (
                          <div key={idx} className="grid grid-cols-3 gap-2">
                            <input
                              value={drug.name || ''}
                              onChange={(e) => {
                                const newDrugs = [...editingData.drugs];
                                newDrugs[idx] = { ...drug, name: e.target.value };
                                setEditingData({ ...editingData, drugs: newDrugs });
                              }}
                              className="px-2 py-1 text-xs border rounded"
                              placeholder="Drug name"
                            />
                            <input
                              value={drug.dose || ''}
                              onChange={(e) => {
                                const newDrugs = [...editingData.drugs];
                                newDrugs[idx] = { ...drug, dose: e.target.value };
                                setEditingData({ ...editingData, drugs: newDrugs });
                              }}
                              className="px-2 py-1 text-xs border rounded"
                              placeholder="Dose"
                            />
                            <div className="flex gap-1">
                              <input
                                value={drug.notes || ''}
                                onChange={(e) => {
                                  const newDrugs = [...editingData.drugs];
                                  newDrugs[idx] = { ...drug, notes: e.target.value };
                                  setEditingData({ ...editingData, drugs: newDrugs });
                                }}
                                className="flex-1 px-2 py-1 text-xs border rounded"
                                placeholder="Notes"
                              />
                              <button
                                onClick={() => {
                                  const newDrugs = editingData.drugs.filter((_: any, i: number) => i !== idx);
                                  setEditingData({ ...editingData, drugs: newDrugs });
                                }}
                                className="px-1 bg-red-500 text-white text-xs rounded"
                              >
                                <Trash2 size={10} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                      <button
                        onClick={() => {
                          const newDrugs = [...(editingData.drugs || []), { name: '', dose: '', notes: '' }];
                          setEditingData({ ...editingData, drugs: newDrugs });
                        }}
                        className="px-2 py-1 text-xs bg-gray-200 rounded hover:bg-gray-300"
                      >
                        + Add Drug
                      </button>
                      <div className="flex gap-1">
                        <button
                          onClick={() => saveEdit('medicationCategories', category.id)}
                          className="flex-1 px-2 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700"
                        >
                          <Save size={12} className="inline mr-1" />
                          Save
                        </button>
                        <button
                          onClick={cancelEdit}
                          className="px-2 py-1 bg-gray-400 text-white text-xs rounded hover:bg-gray-500"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition flex gap-1">
                        <button
                          onClick={() => startEdit(category.id, category)}
                          className="p-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                        >
                          <Edit2 size={12} />
                        </button>
                        <button
                          onClick={() => deleteItem('medicationCategories', category.id)}
                          className="p-1 bg-red-500 text-white rounded hover:bg-red-600"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                      <h3 className="font-bold text-sm text-green-900 mb-2">{category.category}</h3>
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                          <thead className="bg-green-100">
                            <tr>
                              <th className="px-2 py-1 text-left font-semibold">Drug</th>
                              <th className="px-2 py-1 text-left font-semibold">Dose</th>
                              <th className="px-2 py-1 text-left font-semibold">Notes</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(category.drugs || []).map((drug: any, i: number) => (
                              <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                <td className="px-2 py-1 font-semibold text-gray-800">{drug.name}</td>
                                <td className="px-2 py-1 text-gray-700">{drug.dose}</td>
                                <td className="px-2 py-1 text-gray-600 italic">{drug.notes}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Normal Values */}
        <div className="bg-white rounded-lg shadow-md p-4 mb-4 border-l-4 border-purple-400">
          <div className="flex items-center justify-between mb-3">
            <button
              onClick={() => toggleSection('normals')}
              className="flex items-center gap-2 hover:bg-gray-50 p-2 rounded transition"
            >
              <Stethoscope className="text-purple-600" />
              <h2 className="text-lg font-bold text-gray-800">Normal Laboratory Values</h2>
              {expandedSections['normals'] ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
            </button>
            <button
              onClick={addNewNormalValue}
              className="px-2 py-1 text-xs bg-purple-600 text-white rounded hover:bg-purple-700 flex items-center gap-1"
            >
              <Plus size={14} />
              Add Category
            </button>
          </div>
          
          {expandedSections['normals'] && (
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
              {normalValues.map((category: any) => (
                <div key={category.id} className="border border-gray-200 rounded-lg p-3 bg-gradient-to-br from-white to-purple-50/30 relative group">
                  {editingId === category.id ? (
                    <div className="space-y-2">
                      <input
                        value={editingData.category || ''}
                        onChange={(e) => setEditingData({ ...editingData, category: e.target.value })}
                        className="w-full px-2 py-1 text-sm border rounded font-bold"
                        placeholder="Category"
                      />
                      <div className="space-y-1">
                        {(editingData.values || []).map((val: any, idx: number) => (
                          <div key={idx} className="flex gap-1">
                            <input
                              value={val.test || ''}
                              onChange={(e) => {
                                const newVals = [...editingData.values];
                                newVals[idx] = { ...val, test: e.target.value };
                                setEditingData({ ...editingData, values: newVals });
                              }}
                              className="flex-1 px-2 py-1 text-xs border rounded"
                              placeholder="Test"
                            />
                            <input
                              value={val.range || ''}
                              onChange={(e) => {
                                const newVals = [...editingData.values];
                                newVals[idx] = { ...val, range: e.target.value };
                                setEditingData({ ...editingData, values: newVals });
                              }}
                              className="flex-1 px-2 py-1 text-xs border rounded"
                              placeholder="Range"
                            />
                            <button
                              onClick={() => {
                                const newVals = editingData.values.filter((_: any, i: number) => i !== idx);
                                setEditingData({ ...editingData, values: newVals });
                              }}
                              className="px-1 bg-red-500 text-white text-xs rounded"
                            >
                              <Trash2 size={10} />
                            </button>
                          </div>
                        ))}
                      </div>
                      <button
                        onClick={() => {
                          const newVals = [...(editingData.values || []), { test: '', range: '' }];
                          setEditingData({ ...editingData, values: newVals });
                        }}
                        className="px-2 py-1 text-xs bg-gray-200 rounded hover:bg-gray-300"
                      >
                        + Add Value
                      </button>
                      <div className="flex gap-1">
                        <button
                          onClick={() => saveEdit('normalValues', category.id)}
                          className="flex-1 px-2 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700"
                        >
                          <Save size={12} className="inline mr-1" />
                          Save
                        </button>
                        <button
                          onClick={cancelEdit}
                          className="px-2 py-1 bg-gray-400 text-white text-xs rounded hover:bg-gray-500"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition flex gap-1">
                        <button
                          onClick={() => startEdit(category.id, category)}
                          className="p-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                        >
                          <Edit2 size={12} />
                        </button>
                        <button
                          onClick={() => deleteItem('normalValues', category.id)}
                          className="p-1 bg-red-500 text-white rounded hover:bg-red-600"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                      <h3 className="font-bold text-sm text-purple-900 mb-2">{category.category}</h3>
                      <div className="space-y-1">
                        {(category.values || []).map((val: any, i: number) => (
                          <div key={i} className="flex justify-between items-center text-xs border-b border-gray-100 pb-1">
                            <span className="font-semibold text-gray-800">{val.test}</span>
                            <span className="text-gray-600">{val.range}</span>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="text-center text-xs text-gray-500 mt-8 pb-4">
          <p>🐾 Made with 💜 for veterinary professionals</p>
          <p className="mt-1 italic">Always verify doses and protocols with current literature and formularies</p>
        </div>
      </div>
    </div>
  );
}
