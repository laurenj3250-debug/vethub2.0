/**
 * VetHub Rounding Sheet Templates
 * Pre-configured templates for common neurological conditions
 * Applied to patient rows to quickly fill in standard protocols
 */

import type { RoundingData } from '@/types/rounding';
import { ROUNDING_DROPDOWN_OPTIONS } from '@/lib/constants';

// Use constants for dropdown values
const { location, icuCriteria, code, fluids, cri } = ROUNDING_DROPDOWN_OPTIONS;

export interface RoundingTemplate {
  id: string;
  name: string;
  category: 'pre-op' | 'post-op' | 'seizures';
  description?: string;
  data: RoundingData;
}

// Helper to create complete RoundingData with defaults
const createTemplateData = (data: Partial<RoundingData>): RoundingData => ({
  signalment: '',
  location: '',
  icuCriteria: '',
  code: '',
  problems: '',
  diagnosticFindings: '',
  therapeutics: '',
  ivc: '',
  fluids: '',
  cri: '',
  overnightDx: '',
  concerns: '',
  comments: '',
  ...data,
});

export const roundingTemplates: RoundingTemplate[] = [
  // ==========================================
  // PRE-OP / MRI WORKUP TEMPLATES
  // ==========================================
  {
    id: 'seizures',
    name: 'SEIZURES',
    category: 'seizures',
    description: 'Seizure patient awaiting MRI workup',
    data: createTemplateData({
      location: location[1], // ICU
      icuCriteria: icuCriteria[2], // n/a
      code: code[1], // Yellow
      problems: 'Seizures, MRI tomorrow',
      diagnosticFindings: '', // Leave empty - user will add image
      therapeutics: '',
      ivc: 'Yes',
      fluids: fluids[2], // n/a
      cri: cri[4], // n/a
      overnightDx: 'none',
      concerns: 'NPO from 8pm',
      comments: 'If has a seizure, give 0.2mL IV (straight) of diazepam. If has two, start a diazepam CRI at .5mg/kg/hr and load phenobarbital at 4mg/kg q4-6hr and load bromide at 100mg/kg qdh',
    }),
  },
  {
    id: 'tl-myelopathy',
    name: 'TL Myelopathy',
    category: 'pre-op',
    description: 'Thoracolumbar myelopathy, ambulatory, awaiting MRI',
    data: createTemplateData({
      location: location[0], // IP
      icuCriteria: icuCriteria[2], // n/a
      code: code[1], // Yellow
      problems: 'TL myelopathy, MRI tomorrow, Ambulatory',
      diagnosticFindings: '', // Leave empty - user will add image
      therapeutics: 'Gabapentin, Tramadol, Prednisone, Famotidine',
      ivc: 'Yes',
      fluids: fluids[2], // n/a
      cri: cri[4], // n/a
      overnightDx: '',
      concerns: 'NPO from 8pm',
      comments: 'gaba tram prn, traz prn, if severely painful can start fentanyl CRI',
    }),
  },
  {
    id: 'plegic',
    name: 'Plegic',
    category: 'pre-op',
    description: 'TL myelopathy, plegic, awaiting MRI',
    data: createTemplateData({
      location: location[0], // IP
      icuCriteria: icuCriteria[2], // n/a
      code: code[1], // Yellow
      problems: 'TL myelopathy, MRI tomorrow, Plegic',
      diagnosticFindings: '', // Leave empty - user will add image
      therapeutics: 'Gabapentin, Tramadol, Cerenia, Prednisone, Famotidine',
      ivc: 'Yes',
      fluids: fluids[2], // n/a
      cri: cri[4], // n/a
      overnightDx: '',
      concerns: 'NPO from 8pm',
      comments: 'gaba tram prn, traz prn, if severely painful can start fentanyl CRI',
    }),
  },
  {
    id: 'cervical-myelopathy',
    name: 'Cervical Myelopathy',
    category: 'pre-op',
    description: 'Cervical myelopathy awaiting MRI',
    data: createTemplateData({
      location: location[0], // IP
      icuCriteria: icuCriteria[2], // n/a
      code: code[1], // Yellow
      problems: 'Cervical myelopathy, MRI tomorrow, Plegic',
      diagnosticFindings: '', // Leave empty - user will add image
      therapeutics: 'Gabapentin, Tramadol, Prednisone, Famotidine',
      ivc: 'Yes',
      fluids: fluids[2], // n/a
      cri: cri[4], // n/a
      overnightDx: '',
      concerns: 'NPO from 8pm',
      comments: 'gaba tram prn, traz prn, if severely painful can start fentanyl CRI',
    }),
  },
  {
    id: 'cd-fossa',
    name: 'Cd Fossa',
    category: 'pre-op',
    description: 'Caudal fossa lesion awaiting MRI',
    data: createTemplateData({
      location: location[0], // IP
      icuCriteria: icuCriteria[2], // n/a
      code: code[1], // Yellow
      problems: 'Cd Fossa, MRI tomorrow',
      diagnosticFindings: '', // Leave empty - user will add image
      therapeutics: '',
      ivc: 'Yes',
      fluids: fluids[2], // n/a
      cri: cri[4], // n/a
      overnightDx: 'none',
      concerns: 'NPO from 8pm',
      comments: 'If decompensates, give 1g/kg of Mannitol and .2mg/kg of Dex SP and Call AS/LJ',
    }),
  },

  // ==========================================
  // POST-OP TEMPLATES
  // ==========================================
  {
    id: 'po-hemi-day1',
    name: 'PO HEMI DAY 1',
    category: 'post-op',
    description: 'Post-op hemilaminectomy day 1',
    data: createTemplateData({
      location: location[0], // IP
      icuCriteria: icuCriteria[1], // No
      code: code[1], // Yellow
      problems: 'Post OP Hemi',
      diagnosticFindings: 'NSF',
      therapeutics: 'Fentanyl CRI, Ketamine CRI, Gabapentin, Tramadol, Prednisone, Famotidine, Clavamox/Cephalexin',
      ivc: 'Yes',
      fluids: fluids[2], // n/a
      cri: cri[4], // n/a
      overnightDx: '',
      concerns: '',
      comments: 'fentanyl assess at midnight then PRN, ketamine d/c when finished',
    }),
  },
  {
    id: 'po-hemi-day2',
    name: 'PO HEMI DAY 2',
    category: 'post-op',
    description: 'Post-op hemilaminectomy day 2',
    data: createTemplateData({
      location: location[0], // IP
      icuCriteria: icuCriteria[1], // No
      code: code[1], // Yellow
      problems: 'Post OP Hemi',
      diagnosticFindings: 'NSF',
      therapeutics: 'Fentanyl CRI, Ketamine CRI, Gabapentin, Tramadol, Prednisone, Famotidine, Clavamox/Cephalexin',
      ivc: 'Yes',
      fluids: fluids[2], // n/a
      cri: cri[4], // n/a
      overnightDx: '',
      concerns: '',
      comments: 'fentanyl assess at midnight then PRN, ketamine d/c when finished',
    }),
  },
];

/**
 * Get templates by category
 */
export function getTemplatesByCategory(category: RoundingTemplate['category']): RoundingTemplate[] {
  return roundingTemplates.filter(t => t.category === category);
}

/**
 * Get template by ID
 */
export function getTemplateById(id: string): RoundingTemplate | undefined {
  return roundingTemplates.find(t => t.id === id);
}

/**
 * Get all template categories with their templates (only non-empty categories)
 */
export function getTemplateCategories(): { category: string; label: string; templates: RoundingTemplate[] }[] {
  return [
    { category: 'pre-op', label: 'Pre-Op / MRI Workup', templates: getTemplatesByCategory('pre-op') },
    { category: 'post-op', label: 'Post-Op', templates: getTemplatesByCategory('post-op') },
    { category: 'seizures', label: 'Seizures', templates: getTemplatesByCategory('seizures') },
  ];
}
