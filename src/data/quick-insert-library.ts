/**
 * VetHub Quick-Insert Library
 * Condition-based medication and protocol quick-insert buttons
 * Organized by clinical condition for rapid data entry during rounds
 */

export interface QuickInsertItem {
  id: string;
  trigger: string; // Short slash command trigger (e.g., "g3" for /g3)
  label: string; // Button text
  text: string; // Text to insert into field
  category: 'surgery' | 'seizures' | 'other';
  field: 'therapeutics' | 'diagnostics' | 'concerns' | 'problems';
  frequency?: number; // Usage tracking (for learning)
}

export const quickInsertLibrary: QuickInsertItem[] = [
  // ==========================================
  // SURGERY/SPINAL - Therapeutics
  // ==========================================
  {
    id: 'gaba-100',
    trigger: 'g1',
    label: 'Gaba 100mg',
    text: 'Gabapentin 100mg PO',
    category: 'surgery',
    field: 'therapeutics',
  },
  {
    id: 'gaba-300',
    trigger: 'g3',
    label: 'Gaba 300mg',
    text: 'Gabapentin 300mg PO',
    category: 'surgery',
    field: 'therapeutics',
  },
  {
    id: 'tramadol-50',
    trigger: 'tram',
    label: 'Tramadol 50mg',
    text: 'Tramadol 50mg PO',
    category: 'surgery',
    field: 'therapeutics',
  },
  {
    id: 'trazodone',
    trigger: 'traz',
    label: 'Trazodone',
    text: 'Trazodone 50mg PO',
    category: 'surgery',
    field: 'therapeutics',
  },
  {
    id: 'pred',
    trigger: 'pred',
    label: 'Pred',
    text: 'Prednisone PO',
    category: 'surgery',
    field: 'therapeutics',
  },
  {
    id: 'famo-10',
    trigger: 'f10',
    label: 'Famo 10mg',
    text: 'Famotidine 10mg PO',
    category: 'surgery',
    field: 'therapeutics',
  },
  {
    id: 'famo-20',
    trigger: 'f20',
    label: 'Famo 20mg',
    text: 'Famotidine 20mg PO',
    category: 'surgery',
    field: 'therapeutics',
  },
  {
    id: 'ondansetron',
    trigger: 'ond',
    label: 'Ondansetron',
    text: 'Ondansetron 4mg PO/IV',
    category: 'surgery',
    field: 'therapeutics',
  },
  {
    id: 'maropitant',
    trigger: 'maro',
    label: 'Maropitant',
    text: 'Maropitant 1mg/kg SQ',
    category: 'surgery',
    field: 'therapeutics',
  },
  {
    id: 'methocarbamol',
    trigger: 'metho',
    label: 'Methocarbamol',
    text: 'Methocarbamol 500mg PO',
    category: 'surgery',
    field: 'therapeutics',
  },
  {
    id: 'amantadine',
    trigger: 'aman',
    label: 'Amantadine',
    text: 'Amantadine 100mg PO',
    category: 'surgery',
    field: 'therapeutics',
  },
  {
    id: 'fentanyl-cri',
    trigger: 'fent',
    label: 'Fentanyl CRI',
    text: 'Fentanyl CRI 2-5mcg/kg/hr',
    category: 'surgery',
    field: 'therapeutics',
  },
  {
    id: 'ketamine-cri',
    trigger: 'ket',
    label: 'Ketamine CRI',
    text: 'Ketamine CRI 0.1-0.5mg/kg/hr',
    category: 'surgery',
    field: 'therapeutics',
  },

  // SURGERY - Problems
  {
    id: 'cervical-myelopathy',
    trigger: 'cm',
    label: 'Cervical Myelopathy',
    text: 'Cervical myelopathy',
    category: 'surgery',
    field: 'problems',
  },
  {
    id: 'tl-pain',
    trigger: 'tlp',
    label: 'TL Pain',
    text: 'TL pain',
    category: 'surgery',
    field: 'problems',
  },
  {
    id: 'ls-pain',
    trigger: 'lsp',
    label: 'LS Pain',
    text: 'LS pain',
    category: 'surgery',
    field: 'problems',
  },
  {
    id: 'plegic',
    trigger: 'pleg',
    label: 'Plegic',
    text: 'Plegic',
    category: 'surgery',
    field: 'problems',
  },
  {
    id: 'vestibular',
    trigger: 'vest',
    label: 'Vestibular',
    text: 'Vestibular',
    category: 'surgery',
    field: 'problems',
  },
  {
    id: 'seizures-problem',
    trigger: 'sz',
    label: 'Seizures',
    text: 'Seizures',
    category: 'surgery',
    field: 'problems',
  },

  // SURGERY - Diagnostics
  {
    id: 'cbc-chem-nsf',
    trigger: 'nsf',
    label: 'CBC/CHEM NSF',
    text: 'CBC/CHEM- nsf\nCXR: nsf',
    category: 'surgery',
    field: 'diagnostics',
  },
  {
    id: 'cbc-chem-wnl',
    trigger: 'wnl',
    label: 'Labs WNL',
    text: 'CBC/CHEM- WNL',
    category: 'surgery',
    field: 'diagnostics',
  },
  {
    id: 'cbc-chem-pending',
    trigger: 'pend',
    label: 'Labs Pending',
    text: 'CBC/CHEM- pending',
    category: 'surgery',
    field: 'diagnostics',
  },
  {
    id: 'cxr-normal',
    trigger: 'cxrn',
    label: 'CXR: NORMAL',
    text: 'CXR: NORMAL',
    category: 'surgery',
    field: 'diagnostics',
  },
  {
    id: 'cxr-pending',
    trigger: 'cxrp',
    label: 'CXR: PENDING',
    text: 'CXR: PENDING',
    category: 'surgery',
    field: 'diagnostics',
  },
  {
    id: 'bladder-palp',
    trigger: 'blad',
    label: 'Bladder Palp',
    text: 'Bladder palpation q6-8h',
    category: 'surgery',
    field: 'diagnostics',
  },


  // SURGERY - Concerns
  {
    id: 'npo-8pm',
    trigger: 'npo',
    label: 'NPO 8pm',
    text: 'NPO from 8pm',
    category: 'surgery',
    field: 'concerns',
  },
  {
    id: 'increase-gaba-tram',
    trigger: 'incgt',
    label: 'Can ↑ Gaba/Tram',
    text: 'can increase gaba tram prn',
    category: 'surgery',
    field: 'concerns',
  },
  {
    id: 'pain-management',
    trigger: 'pain',
    label: 'Pain Mgmt',
    text: 'Monitor pain level, adjust analgesics PRN',
    category: 'surgery',
    field: 'concerns',
  },
  {
    id: 'bladder-express',
    trigger: 'bex',
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
    trigger: 'k5',
    label: 'Keppra 500mg',
    text: 'Levetiracetam 500mg PO q8h',
    category: 'seizures',
    field: 'therapeutics',
  },
  {
    id: 'keppra-750',
    trigger: 'k75',
    label: 'Keppra 750mg',
    text: 'Levetiracetam 750mg PO q8h',
    category: 'seizures',
    field: 'therapeutics',
  },
  {
    id: 'keppra-1000',
    trigger: 'k10',
    label: 'Keppra 1000mg',
    text: 'Levetiracetam 1000mg PO q8h',
    category: 'seizures',
    field: 'therapeutics',
  },
  {
    id: 'zonisamide-100',
    trigger: 'z1',
    label: 'Zoni 100mg',
    text: 'Zonisamide 100mg PO q12h',
    category: 'seizures',
    field: 'therapeutics',
  },
  {
    id: 'zonisamide-200',
    trigger: 'z2',
    label: 'Zoni 200mg',
    text: 'Zonisamide 200mg PO q12h',
    category: 'seizures',
    field: 'therapeutics',
  },
  {
    id: 'phenobarbital PO',
    trigger: 'ppo',
    label: 'Pheno PO',
    text: 'Phenobarbital PO',
    category: 'seizures',
    field: 'therapeutics',
  },
  {
    id: 'phenobarbital IV',
    trigger: 'piv',
    label: 'Pheno IV',
    text: 'Phenobarbital IV',
    category: 'seizures',
    field: 'therapeutics',
  },
  {
    id: 'kbr',
    trigger: 'kbr',
    label: 'KBr',
    text: 'Potassium Bromide 250mg PO q12-24h',
    category: 'seizures',
    field: 'therapeutics',
  },
  {
    id: 'diazepam IV',
    trigger: 'diaz',
    label: 'Diazepam',
    text: 'Diazepam 1-2mg/kg IV PRN for cluster seizures',
    category: 'seizures',
    field: 'therapeutics',
  },

  // SEIZURES - Concerns
  {
    id: 'seizure-protocol',
    trigger: 'szpro',
    label: 'Seizure Protocol',
    text: 'If seizures >3min give Diazepam 0.5mg/kg IV, if 3+ seizures start on diazepam CRI 0.3mg/kg/hr',
    category: 'seizures',
    field: 'concerns',
  },
  {
    id: 'New Seizuring Kiddo',
    trigger: 'newsz',
    label: 'New Seizures',
    text: 'If has a seizure, start loading on Phenobarbital 4mg/kg q4-6h IV',
    category: 'seizures',
    field: 'concerns',
  },
  {
    id: 'Detioration',
    trigger: 'det',
    label: 'Detioration',
    text: 'If mentally detiorates, give 1g/kg of Mannitol IV',
    category: 'seizures',
    field: 'concerns',
  },

  // ==========================================
  // OTHER - Therapeutics
  // ==========================================
  {
    id: 'dopamine-cri',
    trigger: 'dopa',
    label: 'Dopamine CRI',
    text: 'Dopamine 5mcg/kg/min CRI',
    category: 'other',
    field: 'therapeutics',
  },

  {
    id: 'cerenia',
    trigger: 'cer',
    label: 'Cerenia',
    text: 'Maropitant (Cerenia) 1mg/kg SQ q24h',
    category: 'other',
    field: 'therapeutics',
  },

  // OTHER - Diagnostics
  {
    id: 'pre-anesthetic',
    trigger: 'preanes',
    label: 'Pre-Anesthetic',
    text: 'Pre-anesthetic bloodwork pending',
    category: 'other',
    field: 'diagnostics',
  },
  {
    id: 'mri-scheduled',
    trigger: 'mri',
    label: 'MRI Scheduled',
    text: 'MRI scheduled - NPO protocol',
    category: 'other',
    field: 'diagnostics',
  },

  // OTHER - Concerns
  {
    id: 'npo-8pm-mri',
    trigger: 'npomri',
    label: 'NPO 8pm MRI',
    text: 'NPO after 8pm for MRI',
    category: 'other',
    field: 'concerns',
  },

  {
    id: 'vestibular-support',
    trigger: 'vsup',
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
  field: 'therapeutics' | 'diagnostics' | 'concerns' | 'problems'
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
