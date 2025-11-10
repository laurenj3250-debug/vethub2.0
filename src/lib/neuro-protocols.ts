/**
 * Neurology-Specific Rounding Sheet Templates and Protocols
 * Designed for maximum speed and clinical accuracy
 */

export type NeuroProtocol = {
  id: string;
  name: string;
  category: 'post-op' | 'medical' | 'monitoring' | 'discharge-prep';
  localization?: string;
  tags: string[];
  autoFill: {
    problems?: string;
    diagnosticFindings?: string;
    therapeutics?: string;
    icuCriteria?: string;
    code?: 'Green' | 'Yellow' | 'Orange' | 'Red';
    overnightDx?: string;
    concerns?: string;
    fluids?: string;
    ivc?: string;
    cri?: string;
  };
};

export const NEURO_PROTOCOLS: NeuroProtocol[] = [
  // POST-MRI MONITORING
  {
    id: 'post-mri-standard',
    name: 'Post-MRI Monitoring (Stable)',
    category: 'post-op',
    tags: ['mri', 'anesthesia', 'recovery'],
    autoFill: {
      problems: 'S/p MRI under anesthesia',
      diagnosticFindings: 'MRI pending final read',
      therapeutics: 'Monitor recovery from anesthesia\nReassess neuro status post-recovery',
      icuCriteria: 'Anesthesia recovery',
      code: 'Yellow',
      overnightDx: 'Monitor mentation, ambulation\nRecheck vitals q4h',
      concerns: 'Anesthesia recovery, monitor for adverse reactions',
      fluids: 'Y',
      ivc: 'Y',
    },
  },
  {
    id: 'post-mri-critical',
    name: 'Post-MRI (Critical/Non-Ambulatory)',
    category: 'post-op',
    tags: ['mri', 'critical', 'non-ambulatory'],
    autoFill: {
      problems: 'S/p MRI, non-ambulatory\nAt risk for aspiration/hypostatic pneumonia',
      diagnosticFindings: 'MRI pending final read\nNon-ambulatory pelvic limbs',
      therapeutics: 'Q4h turns\nBladder expression TID-QID\nPadded bedding\nMonitor for urine scald',
      icuCriteria: 'Non-ambulatory, aspiration risk, nursing care needs',
      code: 'Orange',
      overnightDx: 'Monitor mentation\nBladder expression overnight\nQ4h turns\nMonitor respiratory effort',
      concerns: 'Aspiration pneumonia risk, urine retention, decubital ulcers',
      fluids: 'Y',
      ivc: 'Y',
    },
  },

  // IVDD MEDICAL MANAGEMENT
  {
    id: 'ivdd-day1-ambulatory',
    name: 'IVDD Day 1 (Ambulatory/Painful)',
    category: 'medical',
    localization: 'T3-L3',
    tags: ['ivdd', 'spinal', 'pain'],
    autoFill: {
      problems: 'T3-L3 myelopathy, ambulatory\nSpinal pain',
      diagnosticFindings: 'Ambulatory paraparesis, pain on spinal palpation',
      therapeutics: `Methocarbamol 15-20 mg/kg PO q8h
Gabapentin 10-20 mg/kg PO q8-12h
± Trazodone 3-5 mg/kg PO q8-12h PRN anxiety
Strict cage rest (6-8 weeks)
Leash walks for elimination only`,
      icuCriteria: 'Pain management, strict rest',
      code: 'Yellow',
      overnightDx: 'Monitor ambulation\nReassess pain level\nMonitor for progression',
      concerns: 'Progression to non-ambulatory, adequate pain control',
      fluids: 'N',
      ivc: 'N',
    },
  },
  {
    id: 'ivdd-day1-nonambulatory',
    name: 'IVDD Day 1 (Non-Ambulatory, Deep Pain +)',
    category: 'medical',
    localization: 'T3-L3',
    tags: ['ivdd', 'spinal', 'non-ambulatory', 'critical'],
    autoFill: {
      problems: 'T3-L3 myelopathy, non-ambulatory\nDeep pain present\n? Surgical candidate',
      diagnosticFindings: 'Non-ambulatory paraparesis\nDeep pain PRESENT\nSpinal pain on palpation',
      therapeutics: `Methocarbamol 15-20 mg/kg PO/IV q8h
Gabapentin 10-20 mg/kg PO q8h
Trazodone 3-5 mg/kg PO q8-12h PRN
Q4h turns, padded bedding
Bladder expression TID-QID
Monitor for urine scald
Physical therapy consultation when stable`,
      icuCriteria: 'Non-ambulatory, high nursing care, ? surgical candidate',
      code: 'Orange',
      overnightDx: 'Monitor neuro status for deterioration\nBladder expression overnight\nQ4h turns\nRECHECK deep pain q6-8h',
      concerns: 'Progression to deep pain negative, aspiration pneumonia, urine retention, decubital ulcers',
      fluids: 'Y',
      ivc: 'Y',
    },
  },
  {
    id: 'ivdd-deep-pain-negative',
    name: 'IVDD (DEEP PAIN NEGATIVE - URGENT)',
    category: 'medical',
    localization: 'T3-L3',
    tags: ['ivdd', 'emergency', 'surgical', 'deep-pain-negative'],
    autoFill: {
      problems: 'T3-L3 myelopathy\n⚠️ DEEP PAIN NEGATIVE ⚠️\nURGENT surgical candidate',
      diagnosticFindings: '⚠️ ABSENT DEEP PAIN pelvic limbs\nNon-ambulatory paraparesis\nDuration: [SPECIFY HOURS]',
      therapeutics: `⚠️ URGENT MRI + surgery consult ⚠️
Methylprednisolone sodium succinate 30 mg/kg IV ONCE (if <8hrs)
Methocarbamol 15-20 mg/kg IV q8h
Gabapentin 10-20 mg/kg PO q8h
Trazodone 3-5 mg/kg PO q8-12h
Q2-4h turns
Bladder expression q6-8h
Monitor for urine scald`,
      icuCriteria: '⚠️ DEEP PAIN NEGATIVE - surgical emergency\nHigh nursing care needs',
      code: 'Red',
      overnightDx: '⚠️ RECHECK deep pain q4-6h\nBladder expression overnight\nQ2-4h turns\nMonitor respiratory effort\nNOTIFY if any decline',
      concerns: '⚠️ Poor prognosis if >24-48hrs\nAspiration pneumonia\nUrine retention/UTI\nDecubital ulcers\nMyelomalacia risk',
      fluids: 'Y',
      ivc: 'Y',
    },
  },
  {
    id: 'ivdd-day3-stable',
    name: 'IVDD Day 3+ (Stable Medical Management)',
    category: 'medical',
    localization: 'T3-L3',
    tags: ['ivdd', 'stable'],
    autoFill: {
      problems: 'T3-L3 myelopathy Day 3\nStable on medical management',
      diagnosticFindings: 'Neuro status stable/improved from admit\nAmbulation: [ambulatory/non-ambulatory]\nPain controlled',
      therapeutics: `Continue current medications:
Methocarbamol 15-20 mg/kg PO q8h
Gabapentin 10-20 mg/kg PO q8-12h
± Trazodone PRN
Cage rest continues
Bladder management as needed
PT/rehab as appropriate`,
      icuCriteria: 'Stable medical patient',
      code: 'Yellow',
      overnightDx: 'Continue current care\nMonitor for progression\nRecheck AM',
      concerns: 'Ensure compliance with cage rest, monitor for progression',
      fluids: 'N',
      ivc: 'N',
    },
  },

  // SEIZURE MONITORING
  {
    id: 'seizure-cluster-acute',
    name: 'Cluster Seizures (Acute Control Phase)',
    category: 'monitoring',
    localization: 'Prosencephalon',
    tags: ['seizure', 'emergency', 'critical'],
    autoFill: {
      problems: 'Cluster seizures\nStatus epilepticus risk',
      diagnosticFindings: 'Multiple seizures in 24hrs\nInterictal status: [BAR/obtunded]\nLast seizure: [TIME]',
      therapeutics: `Levetiracetam 60 mg/kg IV loading dose, then 20 mg/kg IV q8h
± Phenobarbital 2-4 mg/kg IV q12h (if inadequate control)
± Propofol CRI if breakthrough seizures
Diazepam 0.5-1 mg/kg IV PRN for active seizures (max 3 doses in 24hr)
Monitor mentation, ambulation
MRI + CSF when stable (if not done)`,
      icuCriteria: 'Active seizures/cluster, close monitoring required',
      code: 'Red',
      overnightDx: '⚠️ SEIZURE WATCH\nDiazepam 0.5-1mg/kg IV available at bedside\nNOTIFY immediately if seizure occurs\nMonitor mentation q2-4h\nRecord seizure time, duration, description',
      concerns: 'Status epilepticus, aspiration pneumonia, cerebral edema, refractory seizures',
      fluids: 'Y',
      ivc: 'Y',
      cri: 'Y',
    },
  },
  {
    id: 'seizure-loading-stable',
    name: 'Seizure Loading (Stable, No Events)',
    category: 'monitoring',
    localization: 'Prosencephalon',
    tags: ['seizure', 'loading'],
    autoFill: {
      problems: 'Seizure disorder\nAnticonvulsant loading',
      diagnosticFindings: 'No seizures since admit\nMentation BAR\nNeuro exam otherwise normal',
      therapeutics: `Levetiracetam 20-30 mg/kg PO q8h (dog) or 10-20 mg/kg PO q8h (cat)
± Phenobarbital 2-3 mg/kg PO q12h
Monitor for side effects: sedation, ataxia, GI upset
MRI + CSF recommended if not done`,
      icuCriteria: 'Seizure monitoring',
      code: 'Yellow',
      overnightDx: 'Monitor for seizure activity\nContinue current meds\nRecheck AM for sedation/ataxia',
      concerns: 'Breakthrough seizures, medication side effects',
      fluids: 'N',
      ivc: 'N',
    },
  },

  // VESTIBULAR DISEASE
  {
    id: 'vestibular-peripheral-acute',
    name: 'Peripheral Vestibular (Acute/Severe)',
    category: 'medical',
    localization: 'Peripheral Vestibular',
    tags: ['vestibular', 'nausea', 'supportive'],
    autoFill: {
      problems: 'Acute peripheral vestibular disease\nNausea/inappetence\nAtaxia/recumbency',
      diagnosticFindings: 'Head tilt [LEFT/RIGHT]\nNystagmus [horizontal/rotary]\nNo proprioceptive deficits\nNo cranial nerve deficits (except CN VIII)',
      therapeutics: `Maropitant 1 mg/kg SQ q24h
Meclizine 25 mg PO q24h (for dogs >20kg) or 12.5 mg q24h (<20kg)
± Ondansetron 0.5-1 mg/kg IV/PO q12h PRN nausea
Assisted feeding if inappetent
Padded area, prevent injury from rolling
IV fluids if not eating/drinking`,
      icuCriteria: 'Severe vestibular signs, nausea management',
      code: 'Yellow',
      overnightDx: 'Monitor hydration status\nMonitor appetite\nAssist with food/water as needed\nPrevent rolling injuries',
      concerns: 'Dehydration, aspiration if vomiting, worsening signs (central vestibular)',
      fluids: 'Y',
      ivc: 'Y',
    },
  },
  {
    id: 'vestibular-day3-improving',
    name: 'Peripheral Vestibular Day 3+ (Improving)',
    category: 'medical',
    localization: 'Peripheral Vestibular',
    tags: ['vestibular', 'stable'],
    autoFill: {
      problems: 'Peripheral vestibular disease\nImproving',
      diagnosticFindings: 'Head tilt improved\nAmbulating with wide-based stance\nEating/drinking on own',
      therapeutics: `Maropitant 1 mg/kg PO q24h (continue 3-5 days total)
Meclizine continue (taper over 7-14 days)
Encourage eating/drinking
Consider discharge if stable`,
      icuCriteria: 'Stable, supportive care',
      code: 'Green',
      overnightDx: 'Continue current care\nMonitor appetite, hydration\nRecheck AM for discharge planning',
      concerns: 'Owner compliance with home care, residual head tilt',
      fluids: 'N',
      ivc: 'N',
    },
  },

  // CERVICAL IVDD
  {
    id: 'cervical-ivdd-ambulatory',
    name: 'Cervical IVDD (Ambulatory/Neck Pain)',
    category: 'medical',
    localization: 'C1-C5',
    tags: ['ivdd', 'cervical', 'pain'],
    autoFill: {
      problems: 'C1-C5 myelopathy\nAmbulatory\nCervical pain',
      diagnosticFindings: 'Ambulatory tetraparesis or normal gait\nSevere neck pain on palpation\nAll four limbs ambulatory',
      therapeutics: `Methocarbamol 15-20 mg/kg PO q8h
Gabapentin 10-20 mg/kg PO q8-12h
± Trazodone 3-5 mg/kg PO q8-12h PRN
Strict cage rest
Harness for walks (NO COLLAR)
Elevated food/water bowls`,
      icuCriteria: 'Pain management, strict rest',
      code: 'Yellow',
      overnightDx: 'Monitor ambulation all four limbs\nReassess pain level\nMonitor for progression (especially pelvic limbs)',
      concerns: 'Progression to non-ambulatory, respiratory compromise (C1-C5 lesions), pain control',
      fluids: 'N',
      ivc: 'N',
    },
  },

  // DISCOSPONDYLITIS
  {
    id: 'disco-initial',
    name: 'Discospondylitis (Initial Workup)',
    category: 'medical',
    tags: ['infection', 'spinal', 'pain'],
    autoFill: {
      problems: 'Discospondylitis\nSpinal pain\n± Neurologic deficits',
      diagnosticFindings: 'MRI: discospondylitis at [LOCATION]\nNeuro exam: [ambulatory/non-ambulatory]\nSpinal pain on palpation',
      therapeutics: `Blood culture (before antibiotics if possible)
Urine culture
± CSF culture if done
Empiric antibiotics pending culture:
  - Cephalexin 22-30 mg/kg PO q12h OR
  - Clindamycin 11 mg/kg PO q12h
Pain management:
  - Methocarbamol 15-20 mg/kg PO q8h
  - Gabapentin 10-20 mg/kg PO q8-12h
Strict cage rest
Monitor for neuro progression`,
      icuCriteria: 'Infectious disease, pain management',
      code: 'Orange',
      overnightDx: 'Monitor neuro status\nMonitor for fever\nContinue current meds\nRecheck AM for culture results',
      concerns: 'Neuro progression, sepsis, antibiotic resistance, long treatment course (6-12+ weeks)',
      fluids: 'N',
      ivc: 'N',
    },
  },

  // MENINGITIS/GME
  {
    id: 'cns-inflammation-acute',
    name: 'CNS Inflammation (Acute Presentation)',
    category: 'medical',
    tags: ['inflammatory', 'meningitis', 'gme', 'critical'],
    autoFill: {
      problems: 'CNS inflammatory disease (GME/SRMA/meningoencephalitis)\nAcute neurologic signs',
      diagnosticFindings: `MRI: [findings]
CSF: [pleocytosis, protein elevation, cell type]
Neuro exam: [describe]
Localization: [multifocal/focal]`,
      therapeutics: `Prednisone 1-2 mg/kg PO q12h (or methylprednisolone 1-1.6mg/kg IV q12h if NPO)
± Cytarabine 50mg/m² SQ q12h x 2 days (if severe/GME suspected)
± Levetiracetam 20-30mg/kg PO q8h if seizures
Gastroprotection: omeprazole 1mg/kg PO q24h
Monitor mentation, ambulation closely
Consider cyclosporine/other immunosuppression once stable`,
      icuCriteria: 'Acute CNS inflammatory disease, high-dose immunosuppression',
      code: 'Red',
      overnightDx: 'Monitor neuro status closely (q4h)\nNOTIFY if worsening mentation/seizures\nContinue current medications\nMonitor for steroid side effects',
      concerns: 'Rapid progression, seizures, poor prognosis (esp GME), steroid side effects (PU/PD, GI ulceration)',
      fluids: 'Y',
      ivc: 'Y',
    },
  },

  // COMMON STABLE SCENARIOS
  {
    id: 'stable-continue-current',
    name: 'Stable - Continue Current Plan',
    category: 'monitoring',
    tags: ['stable', 'quick'],
    autoFill: {
      therapeutics: 'Continue current medications\nContinue current nursing care',
      overnightDx: 'Continue current plan\nRecheck AM',
      concerns: 'None, stable overnight',
      code: 'Green',
    },
  },
  {
    id: 'discharge-planning',
    name: 'Discharge Planning Today',
    category: 'discharge-prep',
    tags: ['discharge', 'stable'],
    autoFill: {
      overnightDx: 'Discharge planning AM\nPrepare discharge instructions\nOwner communication',
      concerns: 'Owner compliance, home care instructions, recheck scheduling',
      code: 'Green',
      fluids: 'N',
      ivc: 'N',
    },
  },
];

/**
 * Common Therapeutic Snippets for Quick Insertion
 */
export const THERAPEUTIC_SNIPPETS = {
  medications: {
    anticonvulsants: [
      'Levetiracetam 20-30 mg/kg PO q8h (dog)',
      'Levetiracetam 10-20 mg/kg PO q8h (cat)',
      'Phenobarbital 2-3 mg/kg PO q12h',
      'Zonisamide 5-10 mg/kg PO q12h',
      'Diazepam 0.5-1 mg/kg IV PRN seizures (max 3 in 24hr)',
    ],
    analgesics: [
      'Methocarbamol 15-20 mg/kg PO q8h',
      'Gabapentin 10-20 mg/kg PO q8-12h',
      'Trazodone 3-5 mg/kg PO q8-12h PRN anxiety',
      'Amantadine 3-5 mg/kg PO q24h',
    ],
    antiemetics: [
      'Maropitant 1 mg/kg SQ/PO q24h',
      'Ondansetron 0.5-1 mg/kg IV/PO q12h',
      'Meclizine 25 mg PO q24h (>20kg dog) or 12.5 mg (<20kg)',
    ],
    immunosuppression: [
      'Prednisone 1-2 mg/kg PO q12h',
      'Methylprednisolone 1-1.6 mg/kg IV q12h',
      'Cytarabine 50 mg/m² SQ q12h x 2 days',
      'Cyclosporine 5 mg/kg PO q12h',
    ],
    antibiotics: [
      'Cephalexin 22-30 mg/kg PO q12h',
      'Clindamycin 11 mg/kg PO q12h',
      'Enrofloxacin 10-20 mg/kg PO q24h',
    ],
  },
  nursing: [
    'Q4h turns, padded bedding',
    'Bladder expression TID-QID',
    'Monitor for urine scald',
    'Assist feeding/hydration',
    'Physical therapy consultation',
    'Passive range of motion exercises',
  ],
  monitoring: [
    'Monitor mentation q4h',
    'Monitor ambulation',
    'Recheck neuro status AM',
    'Monitor for progression',
    'Monitor respiratory effort',
    'Monitor for seizure activity',
  ],
};

/**
 * Common Diagnostic Snippets
 */
export const DIAGNOSTIC_SNIPPETS = [
  'MRI brain pending final read',
  'MRI spine (TL) pending final read',
  'MRI spine (CS) pending final read',
  'CSF analysis pending',
  'Blood culture pending',
  'Urine culture pending',
  'Recheck neurologic exam',
  'Bloodwork (CBC/Chem) pending',
  'Phenobarbital trough level (due in 2 weeks)',
];

/**
 * Common Concerns by Category
 */
export const CONCERN_SNIPPETS = {
  surgical: [
    'Aspiration pneumonia risk',
    'Decubital ulcers',
    'Urine retention/UTI',
    'Progression of neurologic signs',
    'Pain control',
  ],
  seizure: [
    'Breakthrough seizures',
    'Status epilepticus',
    'Medication side effects (sedation)',
    'Aspiration pneumonia',
  ],
  general: [
    'Owner compliance',
    'Cost of care',
    'Recheck scheduling',
    'Home nursing care',
  ],
};
