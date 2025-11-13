'use client';

import React, { useState, useEffect } from 'react';
import {
  ChevronDown, ChevronUp, Copy, Save, Trash2,
  FileText, Sparkles, Upload, Zap, Plus, Check
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

// SOAP Templates for common neuro conditions
const SOAP_TEMPLATES = {
  ivdd: {
    name: 'IVDD (Intervertebral Disc Disease)',
    neurolocalization: 'T3-L3',
    gait: 'Paraparesis / Paraplegia, ambulatory / non-ambulatory',
    posturalReactions: 'Absent pelvic limbs, normal thoracic limbs',
    spinalReflexes: 'Normal to increased pelvic limbs, normal thoracic limbs',
    tone: 'Normal to increased pelvic limbs',
    nociception: 'Present / Absent (deep pain)',
    ddx: 'IVDD (Hansen Type I or II), FCE, spinal neoplasia, discospondylitis',
    diagnosticsToday: 'MRI T3-L3, +/- cerebrospinal fluid analysis',
    treatments: 'Medical management: strict cage rest, anti-inflammatories, analgesics, muscle relaxants\nSurgical management: hemilaminectomy/corpectomy if progressive or no deep pain',
  },
  seizures: {
    name: 'Seizures / Epilepsy',
    neurolocalization: 'Forebrain',
    mentalStatus: 'BAR between seizures',
    cranialNerves: 'II-XII normal',
    posturalReactions: 'Normal all four limbs',
    spinalReflexes: 'Normal all four limbs',
    ddx: 'Idiopathic epilepsy, structural epilepsy (brain tumor, inflammation, stroke), reactive seizures (toxin, metabolic)',
    diagnosticsToday: 'MRI brain, CSF analysis, bloodwork (CBC, chemistry, bile acids), toxin screen',
    treatments: 'Anti-epileptic drugs: Levetiracetam, Phenobarbital, Potassium Bromide, Zonisamide\nMonitor seizure frequency and duration',
  },
  fce: {
    name: 'FCE (Fibrocartilaginous Embolism)',
    neurolocalization: 'Variable (commonly T3-L3 or L4-S3)',
    gait: 'Acute onset, non-progressive, asymmetric paresis',
    posturalReactions: 'Absent or reduced affected limbs',
    spinalReflexes: 'Variable depending on lesion location',
    nociception: 'Typically present (non-painful condition)',
    ddx: 'FCE, ANNPE (acute non-compressive nucleus pulposus extrusion), spinal contusion, IVDD',
    diagnosticsToday: 'MRI spine (T2 hyperintensity without compression), +/- CSF (typically normal)',
    treatments: 'Supportive care, physical rehabilitation, nursing care\nPrognosis depends on severity and deep pain presence',
  },
  vestibular: {
    name: 'Vestibular Disease',
    neurolocalization: 'Peripheral or central vestibular system',
    mentalStatus: 'BAR (peripheral) or altered (central)',
    cranialNerves: 'Cranial nerve VII paresis (peripheral), cranial nerve V-XII deficits (central)',
    gait: 'Ataxia, circling, leaning/falling toward lesion side',
    posturalReactions: 'Normal (peripheral) or abnormal (central)',
    ddx: 'Idiopathic vestibular disease, otitis media/interna, brain tumor, inflammation (meningoencephalitis)',
    diagnostics Today: 'MRI brain/bullae, +/- CSF analysis, otoscopic exam, BAER',
    treatments: 'Supportive care (anti-nausea medication: maropitant, meclizine)\nTreat underlying cause if identified',
  },
  gmeDogs: {
    name: 'GME (Granulomatous Meningoencephalomyelitis) - Dogs',
    neurolocalization: 'Multifocal or focal (brain or spinal cord)',
    mentalStatus: 'Variable (BAR to obtunded)',
    cranialNerves: 'Variable deficits depending on lesion location',
    gait: 'Variable depending on lesion (ataxia, paresis, seizures)',
    ddx: 'GME, necrotizing meningoencephalitis (NME/NLE), infectious meningoencephalitis, neoplasia',
    diagnosticsToday: 'MRI brain/spine (multifocal T2/FLAIR hyperintensities), CSF (pleocytosis, elevated protein)',
    treatments: 'Immunosuppression: prednisone, cytarabine, cyclosporine, leflunomide\nAnti-convulsants if seizures present',
  },
};

interface SOAPData {
  // Patient info
  patientId?: number;
  name: string;
  age: string;
  sex: string;
  breed: string;
  species: string;
  reasonForVisit: string;
  visitType: 'recheck' | 'initial';
  // History
  lastVisit: string;
  currentHistory: string;
  csvd: string;
  pupd: string;
  appetite: string;
  lastMRI: string;
  medications: string;
  prevDiagnostics: string;
  // Initial consult fields
  whyHereToday: string;
  painfulVocalizing: string;
  diet: string;
  allergies: string;
  otherPets: string;
  indoorOutdoor: string;
  trauma: string;
  travel: string;
  heartwormPrev: string;
  fleaTick: string;
  vaccinesUTD: string;
  otherMedicalHistory: string;
  // Physical exam
  peENT: string;
  peOral: string;
  pePLN: string;
  peCV: string;
  peResp: string;
  peAbd: string;
  peRectal: string;
  peMS: string;
  peInteg: string;
  // Neuro exam
  mentalStatus: string;
  gait: string;
  cranialNerves: string;
  posturalReactions: string;
  spinalReflexes: string;
  tone: string;
  muscleMass: string;
  nociception: string;
  examBy: string;
  // Assessment & Plan
  progression: string;
  neurolocalization: string;
  ddx: string;
  diagnosticsToday: string;
  treatments: string;
  discussionChanges: string;
}

interface SOAPBuilderProps {
  patients: any[];
  onSave?: (data: SOAPData) => void;
  onPatientSelect?: (patientId: number) => void;
}

export function SOAPBuilder({ patients, onSave, onPatientSelect }: SOAPBuilderProps) {
  const { toast } = useToast();
  const [expandedSections, setExpandedSections] = useState<string[]>(['patient', 'history', 'neuro']);
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);
  const [showPasteModal, setShowPasteModal] = useState(false);
  const [pastedText, setPastedText] = useState('');
  const [isParsing, setIsParsing] = useState(false);

  const [soapData, setSOAPData] = useState<SOAPData>({
    name: '',
    age: '',
    sex: '',
    breed: '',
    species: 'Canine',
    reasonForVisit: '',
    visitType: 'recheck',
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
    peENT: '',
    peOral: '',
    pePLN: '',
    peCV: '',
    peResp: '',
    peAbd: '',
    peRectal: '',
    peMS: '',
    peInteg: '',
    mentalStatus: 'BAR',
    gait: '',
    cranialNerves: '',
    posturalReactions: '',
    spinalReflexes: '',
    tone: '',
    muscleMass: '',
    nociception: '',
    examBy: '',
    progression: '',
    neurolocalization: '',
    ddx: '',
    diagnosticsToday: '',
    treatments: '',
    discussionChanges: '',
  });

  const toggleSection = (section: string) => {
    setExpandedSections(prev =>
      prev.includes(section)
        ? prev.filter(s => s !== section)
        : [...prev, section]
    );
  };

  const updateField = (field: keyof SOAPData, value: string) => {
    setSOAPData(prev => ({ ...prev, [field]: value }));
  };

  const applyTemplate = (templateKey: keyof typeof SOAP_TEMPLATES) => {
    const template = SOAP_TEMPLATES[templateKey];
    setSOAPData(prev => ({
      ...prev,
      ...template,
      name: prev.name, // Keep patient demographics
      age: prev.age,
      sex: prev.sex,
      breed: prev.breed,
      species: prev.species,
    }));
    setShowTemplateSelector(false);
    toast({
      title: '✅ Template Applied',
      description: template.name,
    });
  };

  const loadFromPatient = (patient: any) => {
    const patientInfo = patient.patient_info || {};
    setSOAPData(prev => ({
      ...prev,
      patientId: patient.id,
      name: patient.name || '',
      age: patientInfo.age || '',
      sex: patientInfo.sex || '',
      breed: patientInfo.breed || '',
      species: patientInfo.species || 'Canine',
      medications: patientInfo.medications || '',
      // Load from previous SOAP if exists
      ...patient.soap_data,
    }));
    toast({
      title: '📋 Patient Loaded',
      description: `${patient.name}'s information populated`,
    });
  };

  // Load from appointment schedule
  const loadFromAppointment = () => {
    try {
      const saved = localStorage.getItem('appointmentSchedulePatients');
      if (!saved) {
        toast({ variant: 'destructive', title: 'No appointment schedule found' });
        return;
      }

      const appointmentPatients = JSON.parse(saved);
      if (appointmentPatients.length === 0) {
        toast({ variant: 'destructive', title: 'Appointment schedule is empty' });
        return;
      }

      // Show selector if multiple patients
      // For now, just load the first one
      const apt = appointmentPatients[0];
      setSOAPData(prev => ({
        ...prev,
        name: apt.patientName || '',
        age: apt.age || '',
        reasonForVisit: apt.whyHereToday || '',
        lastVisit: apt.lastVisit || '',
        medications: apt.medications || '',
        prevDiagnostics: apt.bloodwork ? `Bloodwork: ${apt.bloodwork}` : '',
        lastMRI: apt.mri || '',
        visitType: apt.status === 'new' ? 'initial' : 'recheck',
      }));

      toast({
        title: '📅 Loaded from Appointment',
        description: `${apt.patientName}'s appointment data imported`,
      });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Failed to load appointment data' });
    }
  };

  const handlePasteAndParse = async () => {
    if (!pastedText.trim()) {
      toast({ variant: 'destructive', title: 'Please paste some text first' });
      return;
    }

    setIsParsing(true);
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
      setSOAPData({ ...soapData, ...result.extractedData });
      toast({
        title: '✅ Fields populated!',
        description: `Updated ${Object.keys(result.extractedData).length} fields`
      });
      setShowPasteModal(false);
      setPastedText('');
    } catch (error) {
      console.error('Parse error:', error);
      toast({
        variant: 'destructive',
        title: 'Error parsing text',
        description: 'AI parsing failed. Please try again.'
      });
    } finally {
      setIsParsing(false);
    }
  };

  const handleSave = async () => {
    if (!soapData.name) {
      toast({ variant: 'destructive', title: 'Please enter patient name' });
      return;
    }

    try {
      // Save to database if patient is linked
      if (soapData.patientId) {
        await fetch(`/api/patients/${soapData.patientId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ soap_data: soapData }),
        });
      }

      // Save to localStorage for reference
      const savedExams = JSON.parse(localStorage.getItem('soapMemory') || '{}');
      savedExams[soapData.name] = { ...soapData, savedAt: new Date().toISOString() };
      localStorage.setItem('soapMemory', JSON.stringify(savedExams));

      onSave?.(soapData);

      toast({
        title: '💾 SOAP Saved',
        description: `${soapData.name}'s SOAP note saved successfully`,
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Save failed',
        description: 'Could not save SOAP note',
      });
    }
  };

  const handleExport = () => {
    const formatted = `
SOAP NOTE - ${soapData.name}
Generated: ${new Date().toLocaleString()}
-------------------------------------------------

PATIENT INFORMATION:
Name: ${soapData.name}
Age: ${soapData.age} | Sex: ${soapData.sex} | Breed: ${soapData.breed}
Species: ${soapData.species}
Reason for Visit: ${soapData.reasonForVisit}
Visit Type: ${soapData.visitType}

SUBJECTIVE (History):
Current History: ${soapData.currentHistory || 'N/A'}
Last Visit: ${soapData.lastVisit || 'N/A'}
Medications: ${soapData.medications || 'N/A'}
CSVD: ${soapData.csvd} | PUPD: ${soapData.pupd} | Appetite: ${soapData.appetite}

OBJECTIVE (Physical Exam):
ENT: ${soapData.peENT || 'WNL'}
Oral: ${soapData.peOral || 'WNL'}
PLN: ${soapData.pePLN || 'WNL'}
CV: ${soapData.peCV || 'WNL'}
Respiratory: ${soapData.peResp || 'WNL'}
Abdomen: ${soapData.peAbd || 'WNL'}

NEUROLOGICAL EXAM:
Mental Status: ${soapData.mentalStatus}
Gait: ${soapData.gait || 'Not documented'}
Cranial Nerves: ${soapData.cranialNerves || 'Not documented'}
Postural Reactions: ${soapData.posturalReactions || 'Not documented'}
Spinal Reflexes: ${soapData.spinalReflexes || 'Not documented'}
Tone: ${soapData.tone || 'Not documented'}
Nociception: ${soapData.nociception || 'Not documented'}
Examined by: ${soapData.examBy}

ASSESSMENT:
Progression: ${soapData.progression || 'N/A'}
Neurolocalization: ${soapData.neurolocalization || 'Not determined'}
Differential Diagnoses: ${soapData.ddx || 'N/A'}

PLAN:
Diagnostics Today: ${soapData.diagnosticsToday || 'N/A'}
Treatments: ${soapData.treatments || 'N/A'}
Discussion/Changes: ${soapData.discussionChanges || 'N/A'}
`.trim();

    navigator.clipboard.writeText(formatted);
    toast({
      title: '📋 SOAP Copied',
      description: 'Formatted SOAP note copied to clipboard',
    });
  };

  const handleClear = () => {
    if (confirm('Clear all fields? This cannot be undone.')) {
      setSOAPData({
        name: '',
        age: '',
        sex: '',
        breed: '',
        species: 'Canine',
        reasonForVisit: '',
        visitType: 'recheck',
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
        peENT: '',
        peOral: '',
        pePLN: '',
        peCV: '',
        peResp: '',
        peAbd: '',
        peRectal: '',
        peMS: '',
        peInteg: '',
        mentalStatus: 'BAR',
        gait: '',
        cranialNerves: '',
        posturalReactions: '',
        spinalReflexes: '',
        tone: '',
        muscleMass: '',
        nociception: '',
        examBy: '',
        progression: '',
        neurolocalization: '',
        ddx: '',
        diagnosticsToday: '',
        treatments: '',
        discussionChanges: '',
      });
      toast({ title: 'SOAP cleared' });
    }
  };

  return (
    <div className="space-y-4">
      {/* Header Actions */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          {/* Patient Selector */}
          {patients && patients.length > 0 && (
            <select
              value={soapData.patientId || ''}
              onChange={(e) => {
                const patient = patients.find(p => p.id === Number(e.target.value));
                if (patient) loadFromPatient(patient);
              }}
              className="bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm"
            >
              <option value="">Load from patient...</option>
              {patients.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          )}

          {/* Template Selector */}
          <div className="relative">
            <button
              onClick={() => setShowTemplateSelector(!showTemplateSelector)}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-violet-500 to-purple-500 hover:from-violet-400 hover:to-purple-400 text-white rounded-lg font-bold transition"
            >
              <Zap size={16} />
              Templates
            </button>
            {showTemplateSelector && (
              <div className="absolute top-full left-0 mt-2 w-80 bg-slate-800 border border-slate-600 rounded-lg shadow-xl z-50 max-h-96 overflow-y-auto">
                {Object.entries(SOAP_TEMPLATES).map(([key, template]) => (
                  <button
                    key={key}
                    onClick={() => applyTemplate(key as keyof typeof SOAP_TEMPLATES)}
                    className="w-full text-left px-4 py-3 hover:bg-slate-700 transition border-b border-slate-700 last:border-b-0"
                  >
                    <div className="text-white font-bold text-sm">{template.name}</div>
                    <div className="text-slate-400 text-xs mt-1">
                      {template.neurolocalization}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* AI Parse */}
          <button
            onClick={() => setShowPasteModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white rounded-lg font-bold transition"
          >
            <Sparkles size={16} />
            AI Parse
          </button>

          {/* Load from Appointment */}
          <button
            onClick={loadFromAppointment}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-400 hover:to-cyan-400 text-white rounded-lg font-bold transition"
          >
            📅 From Appointment
          </button>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-bold transition"
          >
            <Copy size={16} />
            Copy
          </button>
          <button
            onClick={handleSave}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white rounded-lg font-bold transition"
          >
            <Save size={16} />
            Save
          </button>
          <button
            onClick={handleClear}
            className="flex items-center gap-2 px-4 py-2 bg-red-900/20 hover:bg-red-900/30 text-red-400 rounded-lg font-bold transition"
          >
            <Trash2 size={16} />
            Clear
          </button>
        </div>
      </div>

      {/* SOAP Form */}
      <div className="space-y-3">
        {/* Patient Information Section */}
        <Section
          title="Patient Information"
          isExpanded={expandedSections.includes('patient')}
          onToggle={() => toggleSection('patient')}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Field label="Patient Name *" value={soapData.name} onChange={(v) => updateField('name', v)} />
            <Field label="Age" value={soapData.age} onChange={(v) => updateField('age', v)} placeholder="e.g., 5 years" />
            <Field label="Sex" value={soapData.sex} onChange={(v) => updateField('sex', v)} placeholder="e.g., FS, MN" />
            <Field label="Breed" value={soapData.breed} onChange={(v) => updateField('breed', v)} />
            <SelectField
              label="Species"
              value={soapData.species}
              onChange={(v) => updateField('species', v)}
              options={['Canine', 'Feline', 'Other']}
            />
            <SelectField
              label="Visit Type"
              value={soapData.visitType}
              onChange={(v) => updateField('visitType', v as 'recheck' | 'initial')}
              options={['recheck', 'initial']}
            />
          </div>
          <div className="mt-4">
            <Field
              label="Reason for Visit"
              value={soapData.reasonForVisit}
              onChange={(v) => updateField('reasonForVisit', v)}
              textarea
              placeholder="Chief complaint..."
            />
          </div>
        </Section>

        {/* History Section */}
        <Section
          title="Subjective (History)"
          isExpanded={expandedSections.includes('history')}
          onToggle={() => toggleSection('history')}
        >
          <div className="space-y-4">
            <Field
              label="Current History"
              value={soapData.currentHistory}
              onChange={(v) => updateField('currentHistory', v)}
              textarea
              rows={4}
              placeholder="Current symptoms, progression, owner observations..."
            />
            <Field
              label="Last Visit"
              value={soapData.lastVisit}
              onChange={(v) => updateField('lastVisit', v)}
              textarea
              rows={2}
              placeholder="Previous visit notes..."
            />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <SelectField
                label="CSVD (Coughing/Sneezing/Vomiting/Diarrhea)"
                value={soapData.csvd}
                onChange={(v) => updateField('csvd', v)}
                options={['none', 'coughing', 'sneezing', 'vomiting', 'diarrhea', 'multiple']}
              />
              <SelectField
                label="PUPD (Polyuria/Polydipsia)"
                value={soapData.pupd}
                onChange={(v) => updateField('pupd', v)}
                options={['none', 'PU', 'PD', 'PUPD']}
              />
              <SelectField
                label="Appetite"
                value={soapData.appetite}
                onChange={(v) => updateField('appetite', v)}
                options={['normal', 'increased', 'decreased', 'absent']}
              />
            </div>
            <Field
              label="Current Medications"
              value={soapData.medications}
              onChange={(v) => updateField('medications', v)}
              textarea
              rows={2}
              placeholder="List all current medications with doses..."
            />
            <Field
              label="Previous Diagnostics"
              value={soapData.prevDiagnostics}
              onChange={(v) => updateField('prevDiagnostics', v)}
              textarea
              rows={2}
              placeholder="Previous MRI, bloodwork, imaging results..."
            />
          </div>
        </Section>

        {/* Physical Exam Section */}
        <Section
          title="Objective (Physical Exam)"
          isExpanded={expandedSections.includes('physical')}
          onToggle={() => toggleSection('physical')}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="ENT" value={soapData.peENT} onChange={(v) => updateField('peENT', v)} placeholder="WNL" />
            <Field label="Oral" value={soapData.peOral} onChange={(v) => updateField('peOral', v)} placeholder="WNL" />
            <Field label="PLN (Peripheral Lymph Nodes)" value={soapData.pePLN} onChange={(v) => updateField('pePLN', v)} placeholder="WNL" />
            <Field label="Cardiovascular" value={soapData.peCV} onChange={(v) => updateField('peCV', v)} placeholder="WNL" />
            <Field label="Respiratory" value={soapData.peResp} onChange={(v) => updateField('peResp', v)} placeholder="WNL" />
            <Field label="Abdomen" value={soapData.peAbd} onChange={(v) => updateField('peAbd', v)} placeholder="WNL" />
            <Field label="Rectal" value={soapData.peRectal} onChange={(v) => updateField('peRectal', v)} placeholder="WNL" />
            <Field label="Musculoskeletal" value={soapData.peMS} onChange={(v) => updateField('peMS', v)} placeholder="WNL" />
          </div>
        </Section>

        {/* Neurological Exam Section */}
        <Section
          title="Neurological Exam"
          isExpanded={expandedSections.includes('neuro')}
          onToggle={() => toggleSection('neuro')}
          highlight
        >
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Mental Status" value={soapData.mentalStatus} onChange={(v) => updateField('mentalStatus', v)} placeholder="BAR, QAR, depressed..." />
              <Field label="Examined By" value={soapData.examBy} onChange={(v) => updateField('examBy', v)} placeholder="Veterinarian name" />
            </div>
            <Field
              label="Gait"
              value={soapData.gait}
              onChange={(v) => updateField('gait', v)}
              textarea
              rows={2}
              placeholder="Ambulatory/non-ambulatory, paresis/plegia, ataxia..."
            />
            <Field
              label="Cranial Nerves (II-XII)"
              value={soapData.cranialNerves}
              onChange={(v) => updateField('cranialNerves', v)}
              textarea
              rows={2}
              placeholder="II-XII normal, or specific deficits..."
            />
            <Field
              label="Postural Reactions"
              value={soapData.posturalReactions}
              onChange={(v) => updateField('posturalReactions', v)}
              textarea
              rows={2}
              placeholder="Proprioception, hopping, hemiwalking..."
            />
            <Field
              label="Spinal Reflexes"
              value={soapData.spinalReflexes}
              onChange={(v) => updateField('spinalReflexes', v)}
              textarea
              rows={2}
              placeholder="Patellar, withdrawal, etc..."
            />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Field label="Tone" value={soapData.tone} onChange={(v) => updateField('tone', v)} placeholder="Normal, increased, decreased" />
              <Field label="Muscle Mass" value={soapData.muscleMass} onChange={(v) => updateField('muscleMass', v)} placeholder="Normal, atrophy" />
              <Field label="Nociception (Deep Pain)" value={soapData.nociception} onChange={(v) => updateField('nociception', v)} placeholder="Present, absent" />
            </div>
          </div>
        </Section>

        {/* Assessment & Plan Section */}
        <Section
          title="Assessment & Plan"
          isExpanded={expandedSections.includes('assessment')}
          onToggle={() => toggleSection('assessment')}
          highlight
        >
          <div className="space-y-4">
            <Field
              label="Progression"
              value={soapData.progression}
              onChange={(v) => updateField('progression', v)}
              textarea
              rows={2}
              placeholder="Stable, improving, worsening..."
            />
            <Field
              label="Neurolocalization"
              value={soapData.neurolocalization}
              onChange={(v) => updateField('neurolocalization', v)}
              placeholder="Forebrain, C1-C5, T3-L3, etc..."
            />
            <Field
              label="Differential Diagnoses"
              value={soapData.ddx}
              onChange={(v) => updateField('ddx', v)}
              textarea
              rows={3}
              placeholder="List differential diagnoses..."
            />
            <Field
              label="Diagnostics Today"
              value={soapData.diagnosticsToday}
              onChange={(v) => updateField('diagnosticsToday', v)}
              textarea
              rows={3}
              placeholder="MRI, bloodwork, imaging planned or completed..."
            />
            <Field
              label="Treatments"
              value={soapData.treatments}
              onChange={(v) => updateField('treatments', v)}
              textarea
              rows={4}
              placeholder="Current treatment plan, medications, procedures..."
            />
            <Field
              label="Discussion / Changes"
              value={soapData.discussionChanges}
              onChange={(v) => updateField('discussionChanges', v)}
              textarea
              rows={3}
              placeholder="Owner discussion, plan changes, follow-up..."
            />
          </div>
        </Section>
      </div>

      {/* AI Parse Modal */}
      {showPasteModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-800 rounded-2xl shadow-2xl border border-slate-600 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-700 flex items-center justify-between">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <Sparkles className="text-cyan-400" />
                AI Parse SOAP Text
              </h3>
              <button
                onClick={() => setShowPasteModal(false)}
                className="text-slate-400 hover:text-white transition"
              >
                ✕
              </button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-slate-300 text-sm">
                Paste SOAP notes, EzyVet export, or any medical text. AI will extract relevant information.
              </p>
              <textarea
                value={pastedText}
                onChange={(e) => setPastedText(e.target.value)}
                placeholder="Paste your text here..."
                className="w-full h-64 bg-slate-900 border border-slate-600 rounded-lg p-4 text-white text-sm font-mono resize-none focus:outline-none focus:border-cyan-500"
              />
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setShowPasteModal(false)}
                  className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-bold transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handlePasteAndParse}
                  disabled={isParsing || !pastedText.trim()}
                  className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white rounded-lg font-bold transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isParsing ? 'Parsing...' : 'Parse with AI'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Helper Components
function Section({
  title,
  children,
  isExpanded,
  onToggle,
  highlight = false
}: {
  title: string;
  children: React.ReactNode;
  isExpanded: boolean;
  onToggle: () => void;
  highlight?: boolean;
}) {
  return (
    <div className={`bg-slate-900/60 border ${highlight ? 'border-purple-500/50' : 'border-slate-700/50'} rounded-xl overflow-hidden`}>
      <button
        onClick={onToggle}
        className={`w-full flex items-center justify-between p-4 ${highlight ? 'bg-purple-900/20' : 'bg-slate-800/40'} hover:bg-slate-700/40 transition`}
      >
        <h3 className="text-lg font-bold text-white">{title}</h3>
        {isExpanded ? <ChevronUp className="text-slate-400" /> : <ChevronDown className="text-slate-400" />}
      </button>
      {isExpanded && (
        <div className="p-4 border-t border-slate-700/50">
          {children}
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder = '',
  textarea = false,
  rows = 3,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  textarea?: boolean;
  rows?: number;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-300 mb-1">{label}</label>
      {textarea ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={rows}
          className="w-full bg-slate-800 border border-slate-600 rounded-lg p-2 text-white text-sm focus:outline-none focus:border-cyan-500 resize-none"
        />
      ) : (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full bg-slate-800 border border-slate-600 rounded-lg p-2 text-white text-sm focus:outline-none focus:border-cyan-500"
        />
      )}
    </div>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-300 mb-1">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-slate-800 border border-slate-600 rounded-lg p-2 text-white text-sm focus:outline-none focus:border-cyan-500"
      >
        {options.map(opt => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
    </div>
  );
}
