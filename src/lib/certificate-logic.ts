/**
 * Certificate Logic — Neurosurgery Certificate of Training
 *
 * Pure functions for computing certificate progress from tagged case data.
 * Categories are explicitly tagged at write-time (ACVS CERT pattern),
 * with regex matchers as auto-suggest helpers only.
 */

// ==========================================
// Certificate Category Constants
// ==========================================

export const CERT_CATEGORIES = {
  // Bread & butter (requirement 3)
  hemilaminectomy: 'TL Hemilaminectomy',
  ventral_slot: 'Ventral Slot',

  // Special procedures (requirement 4) — 12 total
  transfrontal_craniotomy: 'Transfrontal Craniotomy',
  lateral_craniotomy: 'Lateral Craniotomy / Craniectomy',
  foramen_magnum_decompression: 'Foramen Magnum Decompression',
  shunt_placement: 'Shunt Placement (Hydrocephalus)',
  atlantoaxial_stabilization: 'Atlantoaxial Stabilization',
  dorsal_cervical_decompression: 'Dorsal Cervical Decompression',
  cervical_distraction_stabilization: 'Cervical Distraction / Stabilization',
  dorsal_laminectomy_TL: 'Dorsal Laminectomy (TL Region)',
  vertebral_fracture_luxation: 'Vertebral Fracture / Luxation Repair',
  spinal_tumor_approach: 'Spinal Tumor Approach',
  lumbosacral_decompression: 'Lumbosacral Decompression',
  muscle_nerve_biopsy: 'Muscle / Nerve Biopsy',
} as const;

export type CertCategory = keyof typeof CERT_CATEGORIES;

/** Sentinel value for cases explicitly dismissed from certificate tracking */
export const CERT_DISMISSED = '_dismissed';

export const BREAD_AND_BUTTER_CATEGORIES: CertCategory[] = ['hemilaminectomy', 'ventral_slot'];

export const SPECIAL_PROCEDURE_CATEGORIES: CertCategory[] = [
  'transfrontal_craniotomy',
  'lateral_craniotomy',
  'foramen_magnum_decompression',
  'shunt_placement',
  'atlantoaxial_stabilization',
  'dorsal_cervical_decompression',
  'cervical_distraction_stabilization',
  'dorsal_laminectomy_TL',
  'vertebral_fracture_luxation',
  'spinal_tumor_approach',
  'lumbosacral_decompression',
  'muscle_nerve_biopsy',
];

// ==========================================
// Auto-Suggest Logic (suggestion only, not source of truth)
// ==========================================

/** Maps procedure dropdown values to certificate categories.
 *  Dropdown names now match CERT_CATEGORIES display names exactly,
 *  so most map 1:1. This also handles legacy names for backward compat. */
const CERT_CATEGORY_SUGGESTIONS: Record<string, CertCategory[]> = {
  // Canonical names (match COMMON_PROCEDURES and CERT_CATEGORIES display names)
  'TL Hemilaminectomy': ['hemilaminectomy'],
  'Ventral Slot': ['ventral_slot'],
  'Transfrontal Craniotomy': ['transfrontal_craniotomy'],
  'Lateral Craniotomy / Craniectomy': ['lateral_craniotomy'],
  'Foramen Magnum Decompression': ['foramen_magnum_decompression'],
  'Shunt Placement (Hydrocephalus)': ['shunt_placement'],
  'Atlantoaxial Stabilization': ['atlantoaxial_stabilization'],
  'Dorsal Cervical Decompression': ['dorsal_cervical_decompression'],
  'Cervical Distraction / Stabilization': ['cervical_distraction_stabilization'],
  'Dorsal Laminectomy (TL Region)': ['dorsal_laminectomy_TL'],
  'Vertebral Fracture / Luxation Repair': ['vertebral_fracture_luxation'],
  'Spinal Tumor Approach': ['spinal_tumor_approach', 'dorsal_laminectomy_TL'],
  'Lumbosacral Decompression': ['lumbosacral_decompression'],
  'Muscle / Nerve Biopsy': ['muscle_nerve_biopsy'],
  'Lateral Corpectomy': [], // not a certificate category
  // Legacy names (backward compat for previously logged cases)
  'Hemilaminectomy': ['hemilaminectomy'],
  'VP Shunt': ['shunt_placement'],
  'Dorsal Cervical Laminectomy': ['dorsal_cervical_decompression'],
  'Cervical Distraction-Stabilization': ['cervical_distraction_stabilization'],
  'Dorsal Laminectomy (TL)': ['dorsal_laminectomy_TL'],
  'Vertebral Fracture-Luxation Repair': ['vertebral_fracture_luxation'],
  'Lumbosacral Dorsal Laminectomy': ['lumbosacral_decompression'],
  'Lateral Craniotomy': ['lateral_craniotomy'],
  'Lateral Craniectomy': ['lateral_craniotomy'],
  'Muscle Biopsy': ['muscle_nerve_biopsy'],
  'Nerve Biopsy': ['muscle_nerve_biopsy'],
  'Peripheral Nerve Biopsy': ['muscle_nerve_biopsy'],
  'Craniotomy': [], // ambiguous — user should pick transfrontal or lateral
};

/** Fuzzy fallback for free-text entries */
function fuzzyMatchCategories(procedureName: string): CertCategory[] {
  const lower = procedureName.toLowerCase();
  const suggestions: CertCategory[] = [];

  if (/hemi/i.test(lower) && !/cervical/i.test(lower)) suggestions.push('hemilaminectomy');
  if (/ventral\s*slot/i.test(lower)) suggestions.push('ventral_slot');
  if (/transfrontal/i.test(lower)) suggestions.push('transfrontal_craniotomy');
  if (/lateral\s*(craniotomy|craniectomy)/i.test(lower)) suggestions.push('lateral_craniotomy');
  if (/foramen\s*magnum|fmd/i.test(lower)) suggestions.push('foramen_magnum_decompression');
  if (/shunt/i.test(lower)) suggestions.push('shunt_placement');
  if (/atlanto\s*axial|aa\s*stab/i.test(lower)) suggestions.push('atlantoaxial_stabilization');
  if (/dorsal\s*cervical/i.test(lower)) suggestions.push('dorsal_cervical_decompression');
  if (/cervical\s*(distraction|stabilization)/i.test(lower)) suggestions.push('cervical_distraction_stabilization');
  if (/dorsal\s*laminectomy/i.test(lower) && !/cervical/i.test(lower)) suggestions.push('dorsal_laminectomy_TL');
  if (/vertebral.*fracture|fracture.*luxation/i.test(lower)) suggestions.push('vertebral_fracture_luxation');
  if (/spinal\s*tumor/i.test(lower)) suggestions.push('spinal_tumor_approach');
  if (/lumbosacral|ls\s*decompression/i.test(lower)) suggestions.push('lumbosacral_decompression');
  if (/biopsy/i.test(lower) && /(muscle|nerve)/i.test(lower)) suggestions.push('muscle_nerve_biopsy');

  return suggestions;
}

/** Get suggested certificate categories for a procedure name */
export function suggestCertCategories(procedureName: string): CertCategory[] {
  // Exact match from dropdown first
  if (CERT_CATEGORY_SUGGESTIONS[procedureName] !== undefined) {
    return CERT_CATEGORY_SUGGESTIONS[procedureName];
  }
  // Fuzzy fallback for free-text
  return fuzzyMatchCategories(procedureName);
}

// ==========================================
// 5-Year Window Logic
// ==========================================

export function isWithin5Years(dateCompleted: string): boolean {
  const caseDate = new Date(dateCompleted);
  const fiveYearsAgo = new Date();
  fiveYearsAgo.setFullYear(fiveYearsAgo.getFullYear() - 5);
  return caseDate >= fiveYearsAgo;
}

export function getExpiryDate(dateCompleted: string): Date {
  const d = new Date(dateCompleted);
  d.setFullYear(d.getFullYear() + 5);
  return d;
}

export type ExpiryStatus = 'valid' | 'expiring_soon' | 'expired';

export function getExpiryStatus(dateCompleted: string): ExpiryStatus {
  const expiry = getExpiryDate(dateCompleted);
  const now = new Date();
  const msUntilExpiry = expiry.getTime() - now.getTime();
  const monthsUntilExpiry = msUntilExpiry / (1000 * 60 * 60 * 24 * 30);
  if (monthsUntilExpiry <= 0) return 'expired';
  if (monthsUntilExpiry <= 6) return 'expiring_soon';
  return 'valid';
}

export function formatExpiryDate(dateCompleted: string): string {
  const expiry = getExpiryDate(dateCompleted);
  return expiry.toISOString().split('T')[0];
}

// ==========================================
// Progress Computation
// ==========================================

export interface CaseForCert {
  id: string;
  procedureName: string;
  dateCompleted: string;
  caseIdNumber: string;
  role: string;
  patientName?: string | null;
  certificateCategories: string[];
}

export interface CertStatusData {
  boardCertified: boolean;
  boardCertDate?: string | null;
  courseCompleted: boolean;
  courseDate?: string | null;
  courseType?: string | null;
  rotationWeeksCompleted: number;
  rotationSupervisor?: string | null;
  rotationSupervisorType?: string | null;
  rotationDeclarationSigned: boolean;
  targetApplicationDate?: string | null;
  applicationSubmitted: boolean;
}

export interface BreadAndButterProgress {
  total: number;
  primary: number;
  target: number;
  primaryTarget: number;
  met: boolean;
  expiringSoon: number;
  expired: number;
}

export interface SpecialProcedureStatus {
  id: CertCategory;
  name: string;
  completed: boolean;
  caseDate?: string;
  caseId?: string;
  caseName?: string;
  role?: string;
  expiryStatus?: ExpiryStatus;
}

export interface CertificateProgress {
  requirementsMet: number;

  hemis: BreadAndButterProgress;
  ventralSlots: BreadAndButterProgress;

  specialProcedures: SpecialProcedureStatus[];
  specialProceduresMet: boolean;

  boardCertified: boolean;
  courseCompleted: boolean;
  rotationWeeks: number;
  rotationComplete: boolean;

  untaggedCount: number;
  untaggedCases: Array<{ id: string; procedureName: string; dateCompleted: string }>;

  nextDeadline: string;
}

function countBreadAndButter(
  cases: CaseForCert[],
  category: CertCategory,
  target: number,
  primaryTarget: number,
): BreadAndButterProgress {
  const validCases = cases.filter(
    (c) => c.certificateCategories.includes(category) && isWithin5Years(c.dateCompleted)
  );

  const total = validCases.length;
  const primary = validCases.filter((c) => c.role === 'Primary').length;
  const expiringSoon = validCases.filter((c) => getExpiryStatus(c.dateCompleted) === 'expiring_soon').length;
  const expired = cases.filter(
    (c) => c.certificateCategories.includes(category) && !isWithin5Years(c.dateCompleted)
  ).length;

  return {
    total,
    primary,
    target,
    primaryTarget,
    met: total >= target && primary >= primaryTarget,
    expiringSoon,
    expired,
  };
}

function getSpecialProcedureStatuses(cases: CaseForCert[]): SpecialProcedureStatus[] {
  return SPECIAL_PROCEDURE_CATEGORIES.map((category) => {
    // Find the most recent valid case tagged with this category
    const matchingCases = cases
      .filter((c) => c.certificateCategories.includes(category) && isWithin5Years(c.dateCompleted))
      .sort((a, b) => b.dateCompleted.localeCompare(a.dateCompleted));

    const bestCase = matchingCases[0];

    return {
      id: category,
      name: CERT_CATEGORIES[category],
      completed: !!bestCase,
      caseDate: bestCase?.dateCompleted,
      caseId: bestCase?.caseIdNumber,
      caseName: bestCase?.patientName || undefined,
      role: bestCase?.role,
      expiryStatus: bestCase ? getExpiryStatus(bestCase.dateCompleted) : undefined,
    };
  });
}

function getNextDeadline(): string {
  const now = new Date();
  const year = now.getFullYear();
  const march15 = new Date(year, 2, 15); // Month is 0-indexed
  const october15 = new Date(year, 9, 15);

  if (now < march15) return `March 15, ${year}`;
  if (now < october15) return `October 15, ${year}`;
  return `March 15, ${year + 1}`;
}

export function computeCertificateProgress(
  cases: CaseForCert[],
  certStatus: CertStatusData | null,
): CertificateProgress {
  const hemis = countBreadAndButter(cases, 'hemilaminectomy', 50, 25);
  const ventralSlots = countBreadAndButter(cases, 'ventral_slot', 20, 10);

  const specialProcedures = getSpecialProcedureStatuses(cases);
  const specialProceduresMet = specialProcedures.every((sp) => sp.completed);

  const boardCertified = certStatus?.boardCertified ?? false;
  const courseCompleted = certStatus?.courseCompleted ?? false;
  const rotationWeeks = certStatus?.rotationWeeksCompleted ?? 0;
  const rotationComplete = rotationWeeks >= 4 && (certStatus?.rotationDeclarationSigned ?? false);

  // Count requirements met (binary — no fractions)
  let requirementsMet = 0;
  if (hemis.met) requirementsMet++;
  if (ventralSlots.met) requirementsMet++;
  if (specialProceduresMet) requirementsMet++;
  if (boardCertified) requirementsMet++;
  if (courseCompleted) requirementsMet++;
  if (rotationComplete) requirementsMet++;

  // Untagged = empty array (never tagged). Dismissed = ['_dismissed'] (user said "not relevant").
  const untaggedCases = cases
    .filter((c) => c.certificateCategories.length === 0)
    .map((c) => ({
      id: c.id,
      procedureName: c.procedureName,
      dateCompleted: c.dateCompleted,
    }));

  return {
    requirementsMet,
    hemis,
    ventralSlots,
    specialProcedures,
    specialProceduresMet,
    boardCertified,
    courseCompleted,
    rotationWeeks,
    rotationComplete,
    untaggedCount: untaggedCases.length,
    untaggedCases,
    nextDeadline: getNextDeadline(),
  };
}
