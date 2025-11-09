'use client';

import { useState } from 'react';
import { Book, ChevronDown, ChevronUp, Search, Pill, TestTube, Lightbulb, Brain } from 'lucide-react';
import Link from 'next/link';

interface Drug {
  name: string;
  dose: string;
  notes: string;
}

interface MedicationCategory {
  id: string;
  category: string;
  drugs: Drug[];
}

interface Workup {
  id: string;
  title: string;
  specialty: string;
  items: string[];
}

interface QuickTip {
  id: string;
  title: string;
  content: string;
}

interface LabCategory {
  id: string;
  category: string;
  values: { parameter: string; canine?: string; feline?: string; combined?: string }[];
}

const QUICK_TIPS: QuickTip[] = [
  {
    id: '1',
    title: 'Shock Fluid Doses',
    content: `Dog Shock Dose: 90 mL/kg/hr (give in 1/4 boluses)
Cat Shock Dose: 45–60 mL/kg/hr
Reassess after each bolus!
Watch for volume overload (increased RR, crackles)`,
  },
  {
    id: '2',
    title: 'IVDD Grading',
    content: `Grade 1: Pain only, ambulatory
Grade 2: Ambulatory paraparesis/ataxia
Grade 3: Non-ambulatory paraparesis
Grade 4: Paraplegia, intact DPP
Grade 5: Paraplegia, no DPP (emergency!)`,
  },
];

const DIAGNOSTIC_WORKUPS: Workup[] = [
  {
    id: '1',
    title: 'IVDD Workup',
    specialty: 'Neurology',
    items: [
      'Neurological Exam (localization)',
      'CBC/Chemistry (pre-anesthetic)',
      'Chest X-rays (if surgery planned)',
      'MRI Spine (T2, T1, +/- contrast)',
      'Consider CT Myelo if MRI unavailable',
    ],
  },
  {
    id: '2',
    title: 'Stroke Workup',
    specialty: 'Neurology',
    items: [
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
    ],
  },
  {
    id: '3',
    title: 'Vestibular Workup',
    specialty: 'Neurology',
    items: [
      'CBC/Chemistry',
      'Urinalysis',
      'Blood Pressure',
      'Thyroid Panel',
      'Otoscopic Exam / Ear Cytology',
      'BAER Test (if chronic ear disease)',
      'CT or MRI (if central signs)',
      'CSF (if central)',
    ],
  },
  {
    id: '4',
    title: 'Seizure Workup',
    specialty: 'Neurology',
    items: [
      'CBC/Chemistry (fasted)',
      'Bile Acids (pre/post)',
      'Urinalysis',
      'Blood Pressure',
      'Toxin Screen (if indicated)',
      'Lead Level (if indicated)',
      'MRI Brain (if >6yo, focal seizures, or abnormal neuro exam)',
      'CSF Analysis (with MRI)',
    ],
  },
  {
    id: '5',
    title: 'Neuromuscular',
    specialty: 'Neurology',
    items: [
      'CBC/Chem/UA',
      '3 view CXR (r/o ME, asp. pneum, thymoma)',
      'Thyroid panel',
      'Ach R Ab',
      'Tension test',
      'Lead levels +/- AXR',
      'Neuro infectious disease titers (Toxo/Neospora)',
      '+/- ACTH stim',
      'Serum CPK',
      'Abd. U/S',
      'EMG/NCV',
      'Mm/Nn BX',
      'Tick bath',
    ],
  },
  {
    id: '6',
    title: 'Stroke Workup (detailed / in-house codes)',
    specialty: 'Neurology',
    items: [
      'CBC/Chemistry',
      'UA WITH UPC REFLEX IDX-2326',
      'DIC Coagulation Panel (Cornell)',
      'Blood Pressure',
      'DIAG1609 Canine Tick Panel Serology',
      'IDX 3016 THYROID COMP SCREEN FT4ED',
      'ACTH Stim vs LDDST (if Cushingoid)',
      'IMAG0143 - Ultrasound - 1 Cavity',
      'Chest X-rays (3 view)',
      'Echocardiogram - USSC19 - Echocardiogram Level 3, ECG 6 Lead, In House Consult',
      'MRI Brain (contrast)',
    ],
  },
];

const MEDICATION_CATEGORIES: MedicationCategory[] = [
  {
    id: '1',
    category: 'GI',
    drugs: [
      { name: 'Maropitant', dose: '1 mg/kg SQ/IV SID', notes: 'Max 5 days injectable' },
      { name: 'Ondansetron', dose: '0.1–0.2 mg/kg IV/PO BID–TID', notes: 'Strong antiemetic' },
      { name: 'Metoclopramide', dose: '0.2–0.5 mg/kg PO/SQ TID–QID or 1–2 mg/kg/day CRI', notes: 'Prokinetic' },
      { name: 'Sucralfate', dose: '0.5–1 g PO TID', notes: 'Give 2 hr away from other meds' },
      { name: 'Famotidine', dose: '0.5–1 mg/kg PO/IV BID', notes: 'H2 blocker' },
    ],
  },
  {
    id: '2',
    category: 'Anti-Seizure',
    drugs: [
      { name: 'Diazepam', dose: '0.5–1 mg/kg IV/rectal', notes: 'First-line acute seizure' },
      { name: 'Levetiracetam', dose: '20 mg/kg IV, then 20 mg/kg PO TID', notes: 'Loading dose' },
      { name: 'Phenobarbital', dose: '2–5 mg/kg PO BID', notes: 'Chronic control' },
      { name: 'CRI Diazepam', dose: '0.5–2 mg/kg/hr IV', notes: 'Status epilepticus' },
    ],
  },
  {
    id: '3',
    category: 'Emergency',
    drugs: [
      { name: 'Atropine', dose: '0.02–0.04 mg/kg IV/IM', notes: 'Bradycardia' },
      { name: 'Epinephrine', dose: '0.01 mg/kg (0.1 mL/kg of 1:10,000) IV', notes: 'Cardiac arrest' },
      { name: 'Naloxone', dose: '0.04 mg/kg IV', notes: 'Opioid reversal' },
      { name: 'Atipamezole', dose: 'Same volume as dex given IM', notes: 'Alpha-2 reversal' },
      { name: 'Mannitol', dose: '0.5–1 g/kg IV over 20 min', notes: 'Cerebral edema' },
      { name: 'Dexamethasone SP', dose: '0.25–1 mg/kg IV', notes: 'Spinal trauma (controversial)' },
    ],
  },
  {
    id: '4',
    category: 'Pain Management',
    drugs: [
      { name: 'Hydromorphone', dose: '0.05–0.2 mg/kg IV/IM q2–6h', notes: 'Strong opioid' },
      { name: 'Fentanyl CRI', dose: '2–10 mcg/kg/hr IV', notes: 'Severe pain' },
      { name: 'Gabapentin', dose: '5–20 mg/kg PO BID–TID', notes: 'Neuropathic pain' },
      { name: 'Carprofen', dose: '2.2 mg/kg PO BID or 4.4 mg/kg SID', notes: 'NSAID' },
      { name: 'Robenacoxib', dose: '1–2 mg/kg PO SID (cat), 1 mg/kg SID (dog)', notes: 'COX-2 selective' },
    ],
  },
  {
    id: '5',
    category: 'NMJ',
    drugs: [
      { name: 'Mestinon', dose: '0.5–3 mg/kg PO BID–TID', notes: 'Small dogs 1/8–1/4 tablet PO, Medium 1/4–1/2 tablet, Large dogs 1/2 to 3/4 tablet' },
      { name: 'Tensilon (Edrophonium)', dose: '0.1–0.2 mg/kg IV (1–5 mg/dog)', notes: 'Can repeat 3 times • Monitor for SLUDDE' },
      { name: 'Neostigmine', dose: '0.01–0.04 mg/kg IM or SQ TID–QID', notes: '' },
    ],
  },
  {
    id: '6',
    category: 'Anesthesia',
    drugs: [
      { name: 'Propofol', dose: '4–6 mg/kg IV (to effect)', notes: 'Respiratory depression' },
      { name: 'Alfaxalone', dose: '2–3 mg/kg IV', notes: 'Smoother than propofol' },
      { name: 'Ketamine', dose: '5–10 mg/kg IM or 2–5 mg/kg IV', notes: 'With sedative' },
      { name: 'Dexmedetomidine', dose: '5–10 mcg/kg IM', notes: 'Reversible with atipamezole' },
      { name: 'Butorphanol', dose: '0.2–0.4 mg/kg IM/IV', notes: 'Sedation + mild analgesia' },
    ],
  },
  {
    id: '7',
    category: 'MUO',
    drugs: [
      { name: 'Cytarabine', dose: '250 mg/m² over 20–24 hours (20 mg/mL)', notes: 'm² not kgs, can go up to in theory 800 mg/m²' },
    ],
  },
];

const LAB_VALUES: LabCategory[] = [
  {
    id: '1',
    category: 'Electrolytes',
    values: [
      { parameter: 'Sodium', canine: '144–160 mEq/L', feline: '150–165 mEq/L' },
      { parameter: 'Potassium', canine: '3.5–5.8 mEq/L', feline: '3.5–5.8 mEq/L' },
      { parameter: 'Chloride', canine: '109–122 mEq/L', feline: '117–123 mEq/L' },
      { parameter: 'Calcium', canine: '7.9–12.0 mg/dL', feline: '6.2–10.2 mg/dL' },
      { parameter: 'Phosphorus', canine: '2.5–6.8 mg/dL', feline: '3.4–8.5 mg/dL' },
    ],
  },
  {
    id: '2',
    category: 'CBC – Canine',
    values: [
      { parameter: 'WBC', combined: '5.5–16.9 K/μL' },
      { parameter: 'RBC', combined: '5.65–8.87 M/μL' },
      { parameter: 'Hemoglobin', combined: '13.1–20.5 g/dL' },
      { parameter: 'Hematocrit', combined: '37.3–61.7%' },
      { parameter: 'Platelets', combined: '148–484 K/μL' },
      { parameter: 'Neutrophils', combined: '2.95–11.64 K/μL' },
      { parameter: 'Lymphocytes', combined: '1.05–5.10 K/μL' },
    ],
  },
  {
    id: '3',
    category: 'CBC – Feline',
    values: [
      { parameter: 'WBC', combined: '5.5–19.5 K/μL' },
      { parameter: 'RBC', combined: '5.92–9.93 M/μL' },
      { parameter: 'Hemoglobin', combined: '9.8–15.4 g/dL' },
      { parameter: 'Hematocrit', combined: '29.3–48.9%' },
      { parameter: 'Platelets', combined: '151–600 K/μL' },
    ],
  },
  {
    id: '4',
    category: 'Chemistry',
    values: [
      { parameter: 'BUN', canine: '7–27 mg/dL', feline: '16–36 mg/dL' },
      { parameter: 'Creatinine', canine: '0.5–1.8 mg/dL', feline: '0.8–2.4 mg/dL' },
      { parameter: 'Glucose', canine: '74–143 mg/dL', feline: '71–148 mg/dL' },
      { parameter: 'Total Protein', canine: '5.2–8.2 g/dL', feline: '5.4–7.8 g/dL' },
      { parameter: 'Albumin', canine: '2.3–4.0 g/dL', feline: '2.5–3.9 g/dL' },
      { parameter: 'ALT', canine: '10–125 U/L', feline: '6–83 U/L' },
      { parameter: 'ALP', canine: '23–212 U/L', feline: '10–90 U/L' },
      { parameter: 'Total Bili', canine: '0.0–0.9 mg/dL', feline: '0.0–0.4 mg/dL' },
    ],
  },
];

export default function ProtocolsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedMedCategories, setExpandedMedCategories] = useState<Record<string, boolean>>({});
  const [expandedWorkups, setExpandedWorkups] = useState<Record<string, boolean>>({});
  const [expandedLabCategories, setExpandedLabCategories] = useState<Record<string, boolean>>({});
  const [expandedTips, setExpandedTips] = useState<Record<string, boolean>>({});
  const [activeTab, setActiveTab] = useState<'tips' | 'workups' | 'medications' | 'labs'>('medications');

  const toggleMedCategory = (id: string) => {
    setExpandedMedCategories(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleWorkup = (id: string) => {
    setExpandedWorkups(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleLabCategory = (id: string) => {
    setExpandedLabCategories(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleTip = (id: string) => {
    setExpandedTips(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const filteredMedications = MEDICATION_CATEGORIES.filter((cat) => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      cat.category.toLowerCase().includes(searchLower) ||
      cat.drugs.some((drug: Drug) =>
        drug.name.toLowerCase().includes(searchLower) ||
        drug.dose.toLowerCase().includes(searchLower) ||
        drug.notes.toLowerCase().includes(searchLower)
      )
    );
  });

  const filteredWorkups = DIAGNOSTIC_WORKUPS.filter((workup) => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      workup.title.toLowerCase().includes(searchLower) ||
      workup.specialty.toLowerCase().includes(searchLower) ||
      workup.items.some(item => item.toLowerCase().includes(searchLower))
    );
  });

  const filteredLabValues = LAB_VALUES.filter((cat) => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      cat.category.toLowerCase().includes(searchLower) ||
      cat.values.some(val =>
        val.parameter.toLowerCase().includes(searchLower) ||
        val.canine?.toLowerCase().includes(searchLower) ||
        val.feline?.toLowerCase().includes(searchLower) ||
        val.combined?.toLowerCase().includes(searchLower)
      )
    );
  });

  const filteredTips = QUICK_TIPS.filter((tip) => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      tip.title.toLowerCase().includes(searchLower) ||
      tip.content.toLowerCase().includes(searchLower)
    );
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 p-4">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-4 bg-white/20 backdrop-blur-lg rounded-2xl p-4 border border-white/30 shadow-xl">
          <div className="flex items-center gap-2">
            <Book size={28} className="text-white drop-shadow-lg" />
            <h1 className="text-2xl font-bold text-white drop-shadow-lg">Veterinary Reference Guide</h1>
          </div>
          <Link
            href="/"
            className="px-3 py-1.5 bg-white/30 backdrop-blur-md text-white rounded-lg hover:bg-white/40 transition text-sm font-semibold border border-white/40 shadow-lg"
          >
            Back to Patients
          </Link>
        </div>

        <p className="text-sm text-white/90 mb-4 px-1 drop-shadow-md">Quick lookup for diagnostic workups, meds, and normal values</p>

        {/* Search */}
        <div className="mb-4 relative">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/70" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search workups, medications, tests..."
            className="w-full pl-10 pr-4 py-2 bg-white/20 backdrop-blur-md border border-white/30 rounded-xl focus:ring-2 focus:ring-white/50 focus:outline-none text-white placeholder-white/60 shadow-lg"
          />
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-4 flex-wrap">
          <button
            onClick={() => setActiveTab('tips')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-semibold transition shadow-lg ${
              activeTab === 'tips'
                ? 'bg-white/40 backdrop-blur-md text-white border-2 border-white/60'
                : 'bg-white/10 backdrop-blur-sm text-white/80 hover:bg-white/20 border border-white/20'
            }`}
          >
            <Lightbulb size={18} />
            Quick Tips
          </button>
          <button
            onClick={() => setActiveTab('workups')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-semibold transition shadow-lg ${
              activeTab === 'workups'
                ? 'bg-white/40 backdrop-blur-md text-white border-2 border-white/60'
                : 'bg-white/10 backdrop-blur-sm text-white/80 hover:bg-white/20 border border-white/20'
            }`}
          >
            <Brain size={18} />
            Diagnostic Workups
          </button>
          <button
            onClick={() => setActiveTab('medications')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-semibold transition shadow-lg ${
              activeTab === 'medications'
                ? 'bg-white/40 backdrop-blur-md text-white border-2 border-white/60'
                : 'bg-white/10 backdrop-blur-sm text-white/80 hover:bg-white/20 border border-white/20'
            }`}
          >
            <Pill size={18} />
            Medications
          </button>
          <button
            onClick={() => setActiveTab('labs')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-semibold transition shadow-lg ${
              activeTab === 'labs'
                ? 'bg-white/40 backdrop-blur-md text-white border-2 border-white/60'
                : 'bg-white/10 backdrop-blur-sm text-white/80 hover:bg-white/20 border border-white/20'
            }`}
          >
            <TestTube size={18} />
            Lab Values
          </button>
        </div>

        {/* Quick Tips Tab */}
        {activeTab === 'tips' && (
          <div className="space-y-3">
            {filteredTips.map((tip) => (
              <div key={tip.id} className="bg-white/20 backdrop-blur-lg rounded-2xl shadow-2xl border border-white/30 overflow-hidden">
                <div
                  className="flex items-center justify-between p-3 bg-gradient-to-r from-yellow-400/30 to-amber-400/30 cursor-pointer hover:from-yellow-400/40 hover:to-amber-400/40 transition border-b border-white/20"
                  onClick={() => toggleTip(tip.id)}
                >
                  <div className="flex items-center gap-2">
                    <Lightbulb size={20} className="text-yellow-200 drop-shadow-lg" />
                    <h2 className="text-lg font-bold text-white drop-shadow-md">{tip.title}</h2>
                  </div>
                  <div className="flex items-center gap-2">
                    {expandedTips[tip.id] ? <ChevronUp size={20} className="text-white" /> : <ChevronDown size={20} className="text-white" />}
                  </div>
                </div>

                {expandedTips[tip.id] && (
                  <div className="p-4 bg-white/10 backdrop-blur-md">
                    <pre className="whitespace-pre-wrap text-sm text-white/95 font-sans drop-shadow-md">
                      {tip.content}
                    </pre>
                  </div>
                )}
              </div>
            ))}

            {filteredTips.length === 0 && (
              <div className="bg-white/20 backdrop-blur-lg rounded-2xl shadow-xl border border-white/30 p-10 text-center">
                <p className="text-white/80">No tips found matching your search.</p>
              </div>
            )}
          </div>
        )}

        {/* Diagnostic Workups Tab */}
        {activeTab === 'workups' && (
          <div className="space-y-3">
            {filteredWorkups.map((workup) => (
              <div key={workup.id} className="bg-white/20 backdrop-blur-lg rounded-2xl shadow-2xl border border-white/30 overflow-hidden">
                <div
                  className="flex items-center justify-between p-3 bg-gradient-to-r from-purple-400/30 to-pink-400/30 cursor-pointer hover:from-purple-400/40 hover:to-pink-400/40 transition border-b border-white/20"
                  onClick={() => toggleWorkup(workup.id)}
                >
                  <div className="flex items-center gap-2">
                    <Brain size={20} className="text-purple-200 drop-shadow-lg" />
                    <div>
                      <h2 className="text-lg font-bold text-white drop-shadow-md">{workup.title}</h2>
                      <p className="text-xs text-purple-100 italic drop-shadow-sm">{workup.specialty}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {expandedWorkups[workup.id] ? <ChevronUp size={20} className="text-white" /> : <ChevronDown size={20} className="text-white" />}
                  </div>
                </div>

                {expandedWorkups[workup.id] && (
                  <div className="p-4 bg-white/10 backdrop-blur-md">
                    <ul className="space-y-2">
                      {workup.items.map((item, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-sm text-white/95">
                          <span className="text-purple-200 font-bold drop-shadow-md">•</span>
                          <span className="drop-shadow-sm">{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}

            {filteredWorkups.length === 0 && (
              <div className="bg-white/20 backdrop-blur-lg rounded-2xl shadow-xl border border-white/30 p-10 text-center">
                <p className="text-white/80">No workups found matching your search.</p>
              </div>
            )}
          </div>
        )}

        {/* Medications Tab */}
        {activeTab === 'medications' && (
          <div className="space-y-3">
            {filteredMedications.map((cat) => (
              <div key={cat.id} className="bg-white/20 backdrop-blur-lg rounded-2xl shadow-2xl border border-white/30 overflow-hidden">
                <div
                  className="flex items-center justify-between p-3 bg-gradient-to-r from-indigo-400/30 to-blue-400/30 cursor-pointer hover:from-indigo-400/40 hover:to-blue-400/40 transition border-b border-white/20"
                  onClick={() => toggleMedCategory(cat.id)}
                >
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold text-white drop-shadow-md">{cat.category}</h2>
                    <span className="text-xs text-white/80 drop-shadow-sm">({cat.drugs.length} drugs)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {expandedMedCategories[cat.id] ? <ChevronUp size={20} className="text-white" /> : <ChevronDown size={20} className="text-white" />}
                  </div>
                </div>

                {expandedMedCategories[cat.id] && (
                  <div className="p-4 bg-white/10 backdrop-blur-md">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="border-b border-white/20">
                          <tr>
                            <th className="px-4 py-2 text-left font-semibold text-white/90">Drug</th>
                            <th className="px-4 py-2 text-left font-semibold text-white/90">Dose</th>
                            <th className="px-4 py-2 text-left font-semibold text-white/90">Notes</th>
                          </tr>
                        </thead>
                        <tbody>
                          {cat.drugs.map((drug, idx) => (
                            <tr key={idx} className={idx % 2 === 0 ? 'bg-white/5' : 'bg-white/10'}>
                              <td className="px-4 py-2 font-medium text-white">{drug.name}</td>
                              <td className="px-4 py-2 text-white/90 font-mono text-xs">{drug.dose}</td>
                              <td className="px-4 py-2 text-white/80 text-xs">{drug.notes}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            ))}

            {filteredMedications.length === 0 && (
              <div className="bg-white/20 backdrop-blur-lg rounded-2xl shadow-xl border border-white/30 p-10 text-center">
                <p className="text-white/80">No medications found matching your search.</p>
              </div>
            )}
          </div>
        )}

        {/* Lab Values Tab */}
        {activeTab === 'labs' && (
          <div className="space-y-3">
            {filteredLabValues.map((cat) => (
              <div key={cat.id} className="bg-white/20 backdrop-blur-lg rounded-2xl shadow-2xl border border-white/30 overflow-hidden">
                <div
                  className="flex items-center justify-between p-3 bg-gradient-to-r from-green-400/30 to-emerald-400/30 cursor-pointer hover:from-green-400/40 hover:to-emerald-400/40 transition border-b border-white/20"
                  onClick={() => toggleLabCategory(cat.id)}
                >
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold text-white drop-shadow-md">{cat.category}</h2>
                  </div>
                  <div className="flex items-center gap-2">
                    {expandedLabCategories[cat.id] ? <ChevronUp size={20} className="text-white" /> : <ChevronDown size={20} className="text-white" />}
                  </div>
                </div>

                {expandedLabCategories[cat.id] && (
                  <div className="p-4 bg-white/10 backdrop-blur-md">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="border-b border-white/20">
                          <tr>
                            <th className="px-4 py-2 text-left font-semibold text-white/90">Parameter</th>
                            {cat.values[0].canine && <th className="px-4 py-2 text-left font-semibold text-white/90">Canine</th>}
                            {cat.values[0].feline && <th className="px-4 py-2 text-left font-semibold text-white/90">Feline</th>}
                            {cat.values[0].combined && <th className="px-4 py-2 text-left font-semibold text-white/90">Normal Range</th>}
                          </tr>
                        </thead>
                        <tbody>
                          {cat.values.map((val, idx) => (
                            <tr key={idx} className={idx % 2 === 0 ? 'bg-white/5' : 'bg-white/10'}>
                              <td className="px-4 py-2 font-medium text-white">{val.parameter}</td>
                              {val.canine && <td className="px-4 py-2 text-white/90 font-mono text-xs">{val.canine}</td>}
                              {val.feline && <td className="px-4 py-2 text-white/90 font-mono text-xs">{val.feline}</td>}
                              {val.combined && <td className="px-4 py-2 text-white/90 font-mono text-xs">{val.combined}</td>}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            ))}

            {filteredLabValues.length === 0 && (
              <div className="bg-white/20 backdrop-blur-lg rounded-2xl shadow-xl border border-white/30 p-10 text-center">
                <p className="text-white/80">No lab values found matching your search.</p>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 text-center text-xs bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/20 shadow-lg">
          <p className="text-white/90 drop-shadow-md">🐾 Made with 💜 for veterinary professionals</p>
          <p className="mt-1 italic text-white/70 drop-shadow-sm">Always verify doses and protocols with current literature and formularies.</p>
        </div>
      </div>
    </div>
  );
}
