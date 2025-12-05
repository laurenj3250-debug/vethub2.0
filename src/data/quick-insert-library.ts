/**
 * VetHub Quick-Insert Library
 * Condition-based medication and protocol quick-insert buttons
 * Organized by clinical condition for rapid data entry during rounds
 */

export interface QuickInsertItem {
  id: string;
  trigger: string;
  label: string;
  text: string;
  category: 'surgery' | 'seizures' | 'other';
  field: 'therapeutics' | 'diagnostics' | 'concerns' | 'problems';
  frequency?: number;
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
    trigger: 'fam',
    label: 'Famotidine',
    text: 'Famotidine PO',
    category: 'surgery',
    field: 'therapeutics',
  },
  {
    id: 'ondansetron',
    trigger: 'on',
    label: 'Ondansetron',
    text: 'Ondansetron PO/IV',
    category: 'surgery',
    field: 'therapeutics',
  },
  {
    id: 'maropitant',
    trigger: 'March',
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
    trigger: 'C1',
    label: 'Cervical Myelopathy',
    text: 'Cervical myelopathy',
    category: 'surgery',
    field: 'problems',
  },
  {
    id: 'tl-pain',
    trigger: 'TL',
    label: 'TL Myelopathy',
    text: 'TL Myelopathy',
    category: 'surgery',
    field: 'problems',
  },
  {
    id: 'ls-pain',
    trigger: 'LS',
    label: 'LS Myelopathy',
    text: 'LS Myelopathy',
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
    id: 'cbc-chem-pending',
    trigger: 'pend',
    label: 'Labs + CXR Pending',
    text: 'CBC/CHEM & CXR: pending',
    category: 'surgery',
    field: 'diagnostics',
  },
  {
    id: 'bladder-palp',
    trigger: 'Exp',
    label: 'Bladder expression',
    text: 'Bladder expression q6-8h',
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
    trigger: 'inc',
    label: 'Can Increase Gaba/Tram',
    text: 'can increase gaba tram prn',
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
    label: 'Phenobarbital',
    text: 'Phenobarbital q12',
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
    trigger: 'Load',
    label: 'New Seizures',
    text: 'If has a seizure, start loading on Phenobarbital IV',
    category: 'seizures',
    field: 'concerns',
  },
  {
    id: 'deterioration',
    trigger: 'deter',
    label: 'Deterioration',
    text: 'If mentally deteriorates, give Mannitol IV',
    category: 'seizures',
    field: 'concerns',
  },

  // ==========================================
  // OTHER - Therapeutics
  // ==========================================
  {
    id: 'cerenia',
    trigger: 'cer',
    label: 'Cerenia',
    text: 'Maropitant (Cerenia) SQ',
    category: 'other',
    field: 'therapeutics',
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
