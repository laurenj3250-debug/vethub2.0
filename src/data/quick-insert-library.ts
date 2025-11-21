/**
 * VetHub Quick-Insert Library
 * Condition-based medication and protocol quick-insert buttons
 * Organized by clinical condition for rapid data entry during rounds
 */

export interface QuickInsertItem {
  id: string;
  label: string; // Button text
  text: string; // Text to insert into field
  category: 'surgery' | 'seizures' | 'other';
  field: 'therapeutics' | 'diagnostics' | 'concerns'; // Which field this inserts into
  frequency?: number; // Usage tracking (for learning)
}

export const quickInsertLibrary: QuickInsertItem[] = [
  // ==========================================
  // SURGERY/SPINAL - Therapeutics
  // ==========================================
  {
    id: 'gaba-100',
    label: 'Gaba 100mg',
    text: 'Gabapentin 100mg PO q8-12h',
    category: 'surgery',
    field: 'therapeutics',
  },
  {
    id: 'gaba-300',
    label: 'Gaba 300mg',
    text: 'Gabapentin 300mg PO q8-12h',
    category: 'surgery',
    field: 'therapeutics',
  },
  {
    id: 'tramadol-50',
    label: 'Tramadol 50mg',
    text: 'Tramadol 50mg PO q8-12h',
    category: 'surgery',
    field: 'therapeutics',
  },
  {
    id: 'trazodone',
    label: 'Trazodone',
    text: 'Trazodone 50mg PO q8-12h PRN',
    category: 'surgery',
    field: 'therapeutics',
  },
  {
    id: 'pred-5',
    label: 'Pred 5mg',
    text: 'Prednisone 5mg PO q12-24h',
    category: 'surgery',
    field: 'therapeutics',
  },
  {
    id: 'pred-10',
    label: 'Pred 10mg',
    text: 'Prednisone 10mg PO q12-24h',
    category: 'surgery',
    field: 'therapeutics',
  },
  {
    id: 'famo-10',
    label: 'Famo 10mg',
    text: 'Famotidine 10mg PO q12-24h',
    category: 'surgery',
    field: 'therapeutics',
  },
  {
    id: 'famo-20',
    label: 'Famo 20mg',
    text: 'Famotidine 20mg PO q12-24h',
    category: 'surgery',
    field: 'therapeutics',
  },
  {
    id: 'ondansetron',
    label: 'Ondansetron',
    text: 'Ondansetron 4mg PO/IV q8-12h PRN',
    category: 'surgery',
    field: 'therapeutics',
  },
  {
    id: 'maropitant',
    label: 'Maropitant',
    text: 'Maropitant 1mg/kg SQ q24h',
    category: 'surgery',
    field: 'therapeutics',
  },
  {
    id: 'methocarbamol',
    label: 'Methocarbamol',
    text: 'Methocarbamol 500mg PO q8h',
    category: 'surgery',
    field: 'therapeutics',
  },
  {
    id: 'amantadine',
    label: 'Amantadine',
    text: 'Amantadine 100mg PO q24h',
    category: 'surgery',
    field: 'therapeutics',
  },

  // SURGERY - Diagnostics
  {
    id: 'cbc-chem-nsf',
    label: 'CBC/CHEM NSF',
    text: 'CBC/CHEM- nsf\nCXR: nsf',
    category: 'surgery',
    field: 'diagnostics',
  },
  {
    id: 'cbc-chem-wnl',
    label: 'Labs WNL',
    text: 'CBC/CHEM- WNL',
    category: 'surgery',
    field: 'diagnostics',
  },
  {
    id: 'cbc-chem-pending',
    label: 'Labs Pending',
    text: 'CBC/CHEM- pending',
    category: 'surgery',
    field: 'diagnostics',
  },
  {
    id: 'bladder-palp',
    label: 'Bladder Palp',
    text: 'Bladder palpation q6-8h',
    category: 'surgery',
    field: 'diagnostics',
  },
  {
    id: 'ambulation',
    label: 'Ambulation',
    text: 'Ambulation assessment q12h',
    category: 'surgery',
    field: 'diagnostics',
  },

  // SURGERY - Concerns
  {
    id: 'npo-6pm',
    label: 'NPO 6pm',
    text: 'NPO from 6pm',
    category: 'surgery',
    field: 'concerns',
  },
  {
    id: 'increase-gaba-tram',
    label: 'Can ↑ Gaba/Tram',
    text: 'can increase gaba tram prn',
    category: 'surgery',
    field: 'concerns',
  },
  {
    id: 'pain-management',
    label: 'Pain Mgmt',
    text: 'Monitor pain level, adjust analgesics PRN',
    category: 'surgery',
    field: 'concerns',
  },
  {
    id: 'bladder-express',
    label: 'Bladder Express',
    text: 'Express bladder q6-8h if unable to void',
    category: 'surgery',
    field: 'concerns',
  },

  // ==========================================
  // SEIZURES - Therapeutics
  // ==========================================
  {
    id: 'keppra-500',
    label: 'Keppra 500mg',
    text: 'Levetiracetam 500mg PO q8h',
    category: 'seizures',
    field: 'therapeutics',
  },
  {
    id: 'keppra-750',
    label: 'Keppra 750mg',
    text: 'Levetiracetam 750mg PO q8h',
    category: 'seizures',
    field: 'therapeutics',
  },
  {
    id: 'keppra-1000',
    label: 'Keppra 1000mg',
    text: 'Levetiracetam 1000mg PO q8h',
    category: 'seizures',
    field: 'therapeutics',
  },
  {
    id: 'zonisamide-100',
    label: 'Zoni 100mg',
    text: 'Zonisamide 100mg PO q12h',
    category: 'seizures',
    field: 'therapeutics',
  },
  {
    id: 'zonisamide-200',
    label: 'Zoni 200mg',
    text: 'Zonisamide 200mg PO q12h',
    category: 'seizures',
    field: 'therapeutics',
  },
  {
    id: 'phenobarbital-30',
    label: 'Pheno 30mg',
    text: 'Phenobarbital 30mg PO q12h',
    category: 'seizures',
    field: 'therapeutics',
  },
  {
    id: 'phenobarbital-60',
    label: 'Pheno 60mg',
    text: 'Phenobarbital 60mg PO q12h',
    category: 'seizures',
    field: 'therapeutics',
  },
  {
    id: 'kbr',
    label: 'KBr',
    text: 'Potassium Bromide 250mg PO q12-24h',
    category: 'seizures',
    field: 'therapeutics',
  },
  {
    id: 'diazepam-rectal',
    label: 'Diazepam Rectal',
    text: 'Diazepam 1-2mg/kg PR PRN for cluster seizures',
    category: 'seizures',
    field: 'therapeutics',
  },

  // SEIZURES - Diagnostics
  {
    id: 'neuro-exam-q12',
    label: 'Neuro Exam q12h',
    text: 'Neuro exam q12h',
    category: 'seizures',
    field: 'diagnostics',
  },
  {
    id: 'seizure-log',
    label: 'Seizure Log',
    text: 'Seizure activity log - monitor frequency/duration',
    category: 'seizures',
    field: 'diagnostics',
  },

  // SEIZURES - Concerns
  {
    id: 'seizure-protocol',
    label: 'Seizure Protocol',
    text: 'If seizures >5min or cluster (>2 in 24h): Diazepam 0.5mg/kg IV, call neuro',
    category: 'seizures',
    field: 'concerns',
  },
  {
    id: 'dose-adjustment',
    label: 'Dose Adjustment',
    text: 'May need dose adjustment based on seizure control',
    category: 'seizures',
    field: 'concerns',
  },
  {
    id: 'breakthrough-seizures',
    label: 'Breakthrough SZ',
    text: 'Monitor for breakthrough seizures, notify if occurs',
    category: 'seizures',
    field: 'concerns',
  },

  // ==========================================
  // OTHER - Therapeutics
  // ==========================================
  {
    id: 'dopamine-cri',
    label: 'Dopamine CRI',
    text: 'Dopamine 5mcg/kg/min CRI',
    category: 'other',
    field: 'therapeutics',
  },
  {
    id: 'atipamezole',
    label: 'Atipamezole',
    text: 'Atipamezole 50mcg/kg IM',
    category: 'other',
    field: 'therapeutics',
  },
  {
    id: 'cerenia',
    label: 'Cerenia',
    text: 'Maropitant (Cerenia) 1mg/kg SQ q24h',
    category: 'other',
    field: 'therapeutics',
  },
  {
    id: 'meclizine',
    label: 'Meclizine',
    text: 'Meclizine 25mg PO q24h (vestibular)',
    category: 'other',
    field: 'therapeutics',
  },

  // OTHER - Diagnostics
  {
    id: 'pre-anesthetic',
    label: 'Pre-Anesthetic',
    text: 'Pre-anesthetic bloodwork pending',
    category: 'other',
    field: 'diagnostics',
  },
  {
    id: 'mri-scheduled',
    label: 'MRI Scheduled',
    text: 'MRI scheduled - NPO protocol',
    category: 'other',
    field: 'diagnostics',
  },

  // OTHER - Concerns
  {
    id: 'npo-midnight',
    label: 'NPO Midnight',
    text: 'NPO after midnight for MRI',
    category: 'other',
    field: 'concerns',
  },
  {
    id: 'icu-monitoring',
    label: 'ICU Monitoring',
    text: 'ICU-level monitoring: vitals q4h, CRI maintenance',
    category: 'other',
    field: 'concerns',
  },
  {
    id: 'vestibular-support',
    label: 'Vestibular Support',
    text: 'Support ambulation, monitor for nystagmus/head tilt progression',
    category: 'other',
    field: 'concerns',
  },
];

/**
 * Get quick-insert items by category and field
 */
export function getQuickInsertItems(
  category: 'surgery' | 'seizures' | 'other',
  field: 'therapeutics' | 'diagnostics' | 'concerns'
): QuickInsertItem[] {
  return quickInsertLibrary.filter(
    (item) => item.category === category && item.field === field
  );
}

/**
 * Get all categories
 */
export const quickInsertCategories = [
  { id: 'surgery', label: 'Surgery/Spinal', icon: '🔪' },
  { id: 'seizures', label: 'Seizures', icon: '⚡' },
  { id: 'other', label: 'Other', icon: '📋' },
] as const;
