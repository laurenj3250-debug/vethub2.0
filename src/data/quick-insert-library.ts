/**
 * VetHub Quick-Insert Library
 * Condition-based medication and protocol quick-insert buttons
 * Organized by clinical condition for rapid data entry during rounds
 */

export interface QuickInsertItem {
  id: string;
  trigger: string; // Short slash command trigger (e.g., "gaba" for /gaba)
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
    id: 'gabapentin',
    trigger: 'gaba',
    label: 'Gabapentin',
    text: 'Gabapentin PO',
    category: 'surgery',
    field: 'therapeutics',
  },
  {
    id: 'tramadol',
    trigger: 'tram',
    label: 'Tramadol',
    text: 'Tramadol PO',
    category: 'surgery',
    field: 'therapeutics',
  },
  {
    id: 'trazodone',
    trigger: 'traz',
    label: 'Trazodone',
    text: 'Trazodone PO',
    category: 'surgery',
    field: 'therapeutics',
  },
  {
    id: 'pred',
    trigger: 'pred',
    label: 'Prednisone',
    text: 'Prednisone PO',
    category: 'surgery',
    field: 'therapeutics',
  },
  {
    id: 'famotidine',
    trigger: 'famo',
    label: 'Famotidine',
    text: 'Famotidine PO',
    category: 'surgery',
    field: 'therapeutics',
  },
  {
    id: 'ondansetron',
    trigger: 'ond',
    label: 'Ondansetron',
    text: 'Ondansetron PO/IV',
    category: 'surgery',
    field: 'therapeutics',
  },
  {
    id: 'maropitant',
    trigger: 'maro',
    label: 'Maropitant',
    text: 'Maropitant SQ',
    category: 'surgery',
    field: 'therapeutics',
  },
  {
    id: 'methocarbamol',
    trigger: 'metho',
    label: 'Methocarbamol',
    text: 'Methocarbamol PO',
    category: 'surgery',
    field: 'therapeutics',
  },
  {
    id: 'amantadine',
    trigger: 'aman',
    label: 'Amantadine',
    text: 'Amantadine PO',
    category: 'surgery',
    field: 'therapeutics',
  },
  {
    id: 'fentanyl-cri',
    trigger: 'fent',
    label: 'Fentanyl CRI',
    text: 'Fentanyl CRI',
    category: 'surgery',
    field: 'therapeutics',
  },
  {
    id: 'ketamine-cri',
    trigger: 'ket',
    label: 'Ketamine CRI',
    text: 'Ketamine CRI',
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
    label: 'CXR Normal',
    text: 'CXR: NORMAL',
    category: 'surgery',
    field: 'diagnostics',
  },
  {
    id: 'cxr-pending',
    trigger: 'cxrp',
    label: 'CXR Pending',
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
    label: 'Can Increase Gaba/Tram',
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
    id: 'keppra',
    trigger: 'kep',
    label: 'Keppra',
    text: 'Levetiracetam PO',
    category: 'seizures',
    field: 'therapeutics',
  },
  {
    id: 'zonisamide',
    trigger: 'zoni',
    label: 'Zonisamide',
    text: 'Zonisamide PO',
    category: 'seizures',
    field: 'therapeutics',
  },
  {
    id: 'phenobarbital-po',
    trigger: 'ppo',
    label: 'Pheno PO',
    text: 'Phenobarbital PO',
    category: 'seizures',
    field: 'therapeutics',
  },
  {
    id: 'phenobarbital-iv',
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
    text: 'Potassium Bromide PO',
    category: 'seizures',
    field: 'therapeutics',
  },
  {
    id: 'diazepam',
    trigger: 'diaz',
    label: 'Diazepam',
    text: 'Diazepam IV',
    category: 'seizures',
    field: 'therapeutics',
  },

  // SEIZURES - Concerns
  {
    id: 'seizure-protocol',
    trigger: 'szpro',
    label: 'Seizure Protocol',
    text: 'If seizures >3min give Diazepam IV, if 3+ seizures start on diazepam CRI',
    category: 'seizures',
    field: 'concerns',
  },
  {
    id: 'new-seizures',
    trigger: 'newsz',
    label: 'New Seizures',
    text: 'If has a seizure, start loading on Phenobarbital IV',
    category: 'seizures',
    field: 'concerns',
  },
  {
    id: 'deterioration',
    trigger: 'det',
    label: 'Deterioration',
    text: 'If mentally deteriorates, give Mannitol IV',
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
    text: 'Dopamine CRI',
    category: 'other',
    field: 'therapeutics',
  },
  {
    id: 'cerenia',
    trigger: 'cer',
    label: 'Cerenia',
    text: 'Maropitant (Cerenia) SQ',
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
