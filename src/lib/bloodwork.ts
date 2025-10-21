'use client';

export type AnalyzeBloodWorkInput = { bloodWorkText: string; species?: string };
export type AnalyzeBloodWorkOutput = { abnormalValues: string[] };

// IDEXX Reference Ranges - Updated 2025
const CANINE_RANGES: Record<string, { min: number; max: number; aliases: string[] }> = {
  RBC: { min: 5.84, max: 8.95, aliases: ['RBC'] },
  HCT: { min: 41, max: 60, aliases: ['HCT', 'Hematocrit', 'PCV'] },
  HGB: { min: 14.6, max: 21.7, aliases: ['HGB', 'Hgb', 'Hemoglobin'] },
  WBC: { min: 5.8, max: 16.2, aliases: ['WBC'] },
  NEUT: { min: 3.004, max: 9.741, aliases: ['NEUT', 'Neutrophils'] },
  LYMPH: { min: 0.98, max: 4.2, aliases: ['LYMPH', 'Lymphocytes'] },
  MONO: { min: 0.145, max: 0.736, aliases: ['MONO', 'Monocytes'] },
  EOS: { min: 0.141, max: 1.927, aliases: ['EOS', 'Eosinophils'] },
  PLT: { min: 120, max: 412, aliases: ['PLT', 'Platelets'] },
  GLU: { min: 63, max: 114, aliases: ['GLU', 'Glucose'] },
  SDMA: { min: 0, max: 14, aliases: ['SDMA', 'IDEXX SDMA'] },
  CREAT: { min: 0.5, max: 1.5, aliases: ['CREAT', 'Creatinine'] },
  BUN: { min: 9, max: 31, aliases: ['BUN'] },
  PHOS: { min: 2.5, max: 6.1, aliases: ['PHOS', 'Phosphorus'] },
  CA: { min: 8.4, max: 11.8, aliases: ['CA', 'Calcium'] },
  NA: { min: 142, max: 152, aliases: ['NA', 'Sodium'] },
  K: { min: 4, max: 5.4, aliases: ['K', 'Potassium'] },
  CL: { min: 108, max: 119, aliases: ['CL', 'Chloride'] },
  TP: { min: 5.5, max: 7.5, aliases: ['TP', 'Total Protein'] },
  ALB: { min: 2.7, max: 3.9, aliases: ['ALB', 'Albumin'] },
  GLOB: { min: 2.4, max: 4, aliases: ['GLOB', 'Globulin'] },
  ALT: { min: 18, max: 121, aliases: ['ALT'] },
  AST: { min: 16, max: 55, aliases: ['AST'] },
  ALP: { min: 5, max: 160, aliases: ['ALP', 'Alk Phos'] },
  CHOL: { min: 131, max: 345, aliases: ['CHOL', 'Cholesterol'] },
};

const FELINE_RANGES: Record<string, { min: number; max: number; aliases: string[] }> = {
  RBC: { min: 6.5, max: 11.53, aliases: ['RBC'] },
  HCT: { min: 31, max: 51, aliases: ['HCT', 'Hematocrit', 'PCV'] },
  HGB: { min: 10.6, max: 16.7, aliases: ['HGB', 'Hgb', 'Hemoglobin'] },
  WBC: { min: 3.9, max: 19, aliases: ['WBC'] },
  NEUT: { min: 2.62, max: 15.17, aliases: ['NEUT', 'Neutrophils'] },
  LYMPH: { min: 0.65, max: 6.86, aliases: ['LYMPH', 'Lymphocytes'] },
  MONO: { min: 0.042, max: 0.467, aliases: ['MONO', 'Monocytes'] },
  EOS: { min: 0.209, max: 1.214, aliases: ['EOS', 'Eosinophils'] },
  PLT: { min: 100, max: 440, aliases: ['PLT', 'Platelets'] },
  GLU: { min: 72, max: 175, aliases: ['GLU', 'Glucose'] },
  SDMA: { min: 0, max: 14, aliases: ['SDMA', 'IDEXX SDMA'] },
  CREAT: { min: 0.9, max: 2.3, aliases: ['CREAT', 'Creatinine'] },
  BUN: { min: 16, max: 37, aliases: ['BUN'] },
  PHOS: { min: 2.9, max: 6.3, aliases: ['PHOS', 'Phosphorus'] },
  CA: { min: 8.2, max: 11.2, aliases: ['CA', 'Calcium'] },
  NA: { min: 147, max: 157, aliases: ['NA', 'Sodium'] },
  K: { min: 3.7, max: 5.2, aliases: ['K', 'Potassium'] },
  CL: { min: 114, max: 126, aliases: ['CL', 'Chloride'] },
  TP: { min: 6.3, max: 8.8, aliases: ['TP', 'Total Protein'] },
  ALB: { min: 2.6, max: 3.9, aliases: ['ALB', 'Albumin'] },
  GLOB: { min: 3, max: 5.9, aliases: ['GLOB', 'Globulin'] },
  ALT: { min: 27, max: 158, aliases: ['ALT'] },
  AST: { min: 16, max: 67, aliases: ['AST'] },
  ALP: { min: 12, max: 59, aliases: ['ALP', 'Alk Phos'] },
  CHOL: { min: 91, max: 305, aliases: ['CHOL', 'Cholesterol'] },
};

function buildAliasIndex(ranges: Record<string, { min: number; max: number; aliases: string[] }>) {
  return Object.entries(ranges).reduce((acc, [k, v]) => {
    v.aliases.forEach(a => acc[a.toLowerCase()] = k);
    return acc;
  }, {} as Record<string, string>);
}

function buildValueRegex(ranges: Record<string, { min: number; max: number; aliases: string[] }>) {
  return new RegExp(
    `\\b(${Object.values(ranges).flatMap(r => r.aliases).map(s => s.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\$&')).join('|')})\\s*[:=\\-–]?\\s*([<>]?-?\\d+(?:\\.\\d+)?)`,
    'gi'
  );
}

export function analyzeBloodWorkLocal(input: AnalyzeBloodWorkInput): AnalyzeBloodWorkOutput {
  const text = input.bloodWorkText || '';
  const species = (input.species || '').toLowerCase();

  // Determine which ranges to use based on species
  const isFeline = species.includes('feline') || species.includes('cat') || species.includes('fe');
  const RANGES = isFeline ? FELINE_RANGES : CANINE_RANGES;
  const ALIAS_INDEX = buildAliasIndex(RANGES);
  const VALUE_RE = buildValueRegex(RANGES);

  const latest: Record<string, number> = {};
  let m: RegExpExecArray | null;

  while ((m = VALUE_RE.exec(text)) !== null) {
    const label = ALIAS_INDEX[m[1].toLowerCase()];
    if (!label) continue;
    const num = Number(m[2].replace(/[<>]/g, ''));
    if (!Number.isFinite(num)) continue;
    latest[label] = num; // keep last instance
  }

  const abnormalValues: string[] = [];
  for (const [key, val] of Object.entries(latest)) {
    const r = RANGES[key];
    if (!r) continue;
    if (val < r.min || val > r.max) {
      const direction = val < r.min ? '↓' : '↑';
      abnormalValues.push(`${key} ${val} ${direction}`);
    }
  }

  return { abnormalValues };
}
