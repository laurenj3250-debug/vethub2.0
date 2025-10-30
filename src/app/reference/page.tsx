'use client';

import React, { useState } from 'react';
import { Search, ChevronDown, ChevronUp, BookOpen, Pill, TestTube, Heart, Brain, Droplets, Stethoscope, AlertCircle } from 'lucide-react';
import Link from 'next/link';

export default function VetReferenceGuide() {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  // Diagnostic Workups
  const workups = [
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
    {
      title: 'Acute Kidney Injury (AKI)',
      icon: '🫘',
      category: 'Internal Medicine',
      tests: [
        'CBC/Chemistry (q12-24h initially)',
        'Venous Blood Gas',
        'Urinalysis with Culture',
        'UPC Ratio',
        'Leptospirosis PCR & Titer (MAT)',
        'Abdominal Ultrasound',
        'SDMA',
        'Ethylene Glycol Test (if suspected)',
      ]
    },
    {
      title: 'Hypoadrenocorticism (Addison\'s)',
      icon: '💧',
      category: 'Internal Medicine',
      tests: [
        'CBC/Chemistry (Na:K ratio)',
        'Venous Blood Gas',
        'Urinalysis',
        'ACTH Stimulation Test (diagnostic)',
        'Pre-pill Cortisol (screening)',
        'Abdominal Ultrasound',
        'Chest X-rays',
      ]
    },
    {
      title: 'Diabetic Ketoacidosis (DKA)',
      icon: '🩸',
      category: 'Internal Medicine',
      tests: [
        'CBC/Chemistry',
        'Venous Blood Gas (pH, HCO3)',
        'Urinalysis with Culture',
        'Serum Fructosamine',
        'Lipase (check pancreatitis)',
        'Abdominal Ultrasound',
        'Chest X-rays',
        'Blood Glucose Curve (q1-2h)',
      ]
    },
    {
      title: 'Pancreatitis Workup',
      icon: '🥞',
      category: 'Internal Medicine',
      tests: [
        'CBC/Chemistry',
        'Spec cPL (Canine) or fPL (Feline)',
        'SNAP cPL/fPL',
        'Abdominal Ultrasound',
        'Chest X-rays',
        'Coagulation Panel (if severe)',
        'Ionized Calcium (if severe)',
      ]
    },
    {
      title: 'Congestive Heart Failure (CHF)',
      icon: '❤️',
      category: 'Cardiology',
      tests: [
        'CBC/Chemistry',
        'NT-proBNP',
        'Chest X-rays (3 view)',
        'Echocardiogram',
        'ECG / Holter (if arrhythmia)',
        'Blood Pressure',
        'Urinalysis',
      ]
    },
    {
      title: 'Pneumonia Workup',
      icon: '🫁',
      category: 'Internal Medicine',
      tests: [
        'CBC/Chemistry',
        'Venous Blood Gas',
        'Chest X-rays (3 view, repeat q24-48h)',
        'Tracheal Wash with Culture',
        'Coagulation Panel',
        'Tick Panel',
        'Consider CT Chest (if severe/not improving)',
      ]
    },
    {
      title: 'Immune-Mediated Hemolytic Anemia (IMHA)',
      icon: '🔴',
      category: 'Internal Medicine',
      tests: [
        'CBC with Blood Smear',
        'Chemistry',
        'Reticulocyte Count',
        'Saline Agglutination Test',
        'Coombs Test',
        'Bilirubin (total/direct)',
        'Coagulation Panel',
        'Urinalysis',
        'Tick Panel (4DX, PCR)',
        'Abdominal Ultrasound (check for underlying cause)',
        'Chest X-rays',
      ]
    },
    {
      title: 'Immune-Mediated Thrombocytopenia (ITP)',
      icon: '🩸',
      category: 'Internal Medicine',
      tests: [
        'CBC with Platelet Count',
        'Blood Smear (rule out clumping)',
        'Chemistry',
        'Coagulation Panel (PT/PTT normal in ITP)',
        'Tick Panel (4DX, PCR)',
        'Abdominal Ultrasound',
        'Chest X-rays',
        'Consider Bone Marrow Aspirate',
      ]
    },
  ];

  // Common Medications Reference
  const medications = [
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
      category: 'Cardiac',
      drugs: [
        { name: 'Furosemide', dose: '1-4 mg/kg IV/IM q1-12h', notes: 'CHF, pulmonary edema' },
        { name: 'Pimobendan', dose: '0.25-0.3 mg/kg PO BID', notes: 'Give 1hr before food' },
        { name: 'Enalapril', dose: '0.5 mg/kg PO BID', notes: 'ACE inhibitor' },
        { name: 'Diltiazem', dose: '0.5-1.5 mg/kg PO TID (dog), 1.75-2.4 mg/kg PO BID (cat)', notes: 'HCM in cats' },
        { name: 'Lidocaine CRI', dose: 'Dog: 50 mcg/kg/min; Cat: 10-20 mcg/kg/min', notes: 'VPCs' },
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
  ];

  // Normal Values
  const normalValues = [
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

  // Quick Reference Tips
  const quickTips = [
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
    {
      title: 'Transfusion Triggers',
      icon: '🩸',
      content: [
        'pRBCs: HCT <20% (dog), <15% (cat) with clinical signs',
        'FFP: Coagulopathy with active bleeding',
        'Platelet-rich plasma: Platelets <30K with bleeding',
        'Always crossmatch if prior transfusion or pregnancy',
      ]
    },
    {
      title: 'Addison\'s Classic Signs',
      icon: '⚠️',
      content: [
        'Waxing/waning GI signs',
        'PU/PD',
        'Weakness, lethargy',
        'Na:K ratio <27:1 (normal ~30:1)',
        'Hypoglycemia common',
        'Confirm with ACTH stim',
      ]
    },
  ];

  const filterContent = (text: string) => {
    if (!searchQuery) return true;
    return text.toLowerCase().includes(searchQuery.toLowerCase());
  };

  const filteredWorkups = workups.filter(w => 
    filterContent(w.title) || 
    filterContent(w.category) || 
    w.tests.some(t => filterContent(t))
  );

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

        {/* Quick Tips */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          {quickTips.map((tip, idx) => (
            <div key={idx} className="bg-white rounded-lg shadow-sm border border-purple-200 p-3">
              <h3 className="text-sm font-bold text-purple-800 mb-2 flex items-center gap-1">
                <span className="text-lg">{tip.icon}</span>
                {tip.title}
              </h3>
              <ul className="space-y-1">
                {tip.content.map((item, i) => (
                  <li key={i} className="text-xs text-gray-700 leading-relaxed">
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Diagnostic Workups */}
        <div className="bg-white rounded-lg shadow-md p-4 mb-4 border-l-4 border-blue-400">
          <button
            onClick={() => toggleSection('workups')}
            className="w-full flex items-center justify-between hover:bg-gray-50 p-2 rounded transition"
          >
            <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              <TestTube className="text-blue-600" />
              Diagnostic Workups
            </h2>
            {expandedSections['workups'] ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </button>
          
          {expandedSections['workups'] && (
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredWorkups.map((workup, idx) => (
                <div key={idx} className="border border-gray-200 rounded-lg p-3 hover:shadow-md transition bg-gradient-to-br from-white to-blue-50/30">
                  <h3 className="font-bold text-sm text-blue-900 mb-1 flex items-center gap-2">
                    <span className="text-xl">{workup.icon}</span>
                    {workup.title}
                  </h3>
                  <span className="text-xs text-gray-500 italic">{workup.category}</span>
                  <ul className="mt-2 space-y-1">
                    {workup.tests.map((test, i) => (
                      <li key={i} className="text-xs text-gray-700 flex items-start gap-1">
                        <span className="text-blue-600 mt-0.5">•</span>
                        <span>{test}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Medications */}
        <div className="bg-white rounded-lg shadow-md p-4 mb-4 border-l-4 border-green-400">
          <button
            onClick={() => toggleSection('meds')}
            className="w-full flex items-center justify-between hover:bg-gray-50 p-2 rounded transition"
          >
            <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              <Pill className="text-green-600" />
              Common Medications
            </h2>
            {expandedSections['meds'] ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </button>
          
          {expandedSections['meds'] && (
            <div className="mt-4 space-y-4">
              {medications.map((category, idx) => (
                <div key={idx} className="border border-gray-200 rounded-lg p-3 bg-gradient-to-br from-white to-green-50/30">
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
                        {category.drugs.map((drug, i) => (
                          <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                            <td className="px-2 py-1 font-semibold text-gray-800">{drug.name}</td>
                            <td className="px-2 py-1 text-gray-700">{drug.dose}</td>
                            <td className="px-2 py-1 text-gray-600 italic">{drug.notes}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Normal Values */}
        <div className="bg-white rounded-lg shadow-md p-4 mb-4 border-l-4 border-purple-400">
          <button
            onClick={() => toggleSection('normals')}
            className="w-full flex items-center justify-between hover:bg-gray-50 p-2 rounded transition"
          >
            <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              <Stethoscope className="text-purple-600" />
              Normal Laboratory Values
            </h2>
            {expandedSections['normals'] ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </button>
          
          {expandedSections['normals'] && (
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
              {normalValues.map((category, idx) => (
                <div key={idx} className="border border-gray-200 rounded-lg p-3 bg-gradient-to-br from-white to-purple-50/30">
                  <h3 className="font-bold text-sm text-purple-900 mb-2">{category.category}</h3>
                  <div className="space-y-1">
                    {category.values.map((val, i) => (
                      <div key={i} className="flex justify-between items-center text-xs border-b border-gray-100 pb-1">
                        <span className="font-semibold text-gray-800">{val.test}</span>
                        <span className="text-gray-600">{val.range}</span>
                      </div>
                    ))}
                  </div>
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
