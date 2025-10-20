'use client';

export type AnalyzeBloodWorkInput = { bloodWorkText: string };
export type AnalyzeBloodWorkOutput = { abnormalValues: string[] };

// Dog defaults; tweak if you need species switching later
const RANGES: Record<string, { min: number; max: number; aliases: string[] }> = {
  WBC: { min: 6, max: 17, aliases: ['WBC'] },
  RBC: { min: 5.5, max: 8.5, aliases: ['RBC'] },
  HGB: { min: 12, max: 18, aliases: ['HGB', 'Hgb', 'Hb'] },
  HCT: { min: 37, max: 55, aliases: ['HCT', 'PCV'] },
  PLT: { min: 200, max: 500, aliases: ['PLT', 'Platelets'] },
  NEUT: { min: 3, max: 12, aliases: ['NEUT', 'Neut', 'Neutrophils'] },
  LYMPH: { min: 1, max: 5, aliases: ['LYMPH', 'Lymph', 'Lymphocytes'] },
  MONO: { min: 0.2, max: 1.5, aliases: ['MONO', 'Mono', 'Monocytes'] },
  EOS: { min: 0, max: 1, aliases: ['EOS', 'Eos', 'Eosinophils'] },
  BUN: { min: 7, max: 27, aliases: ['BUN', 'Urea'] },
  CREAT: { min: 0.5, max: 1.8, aliases: ['CREAT', 'Creat', 'Creatinine'] },
  GLU: { min: 70, max: 143, aliases: ['GLU', 'Glucose'] },
  ALT: { min: 10, max: 125, aliases: ['ALT'] },
  AST: { min: 0, max: 50, aliases: ['AST'] },
  ALP: { min: 23, max: 212, aliases: ['ALP', 'Alk Phos', 'ALPase'] },
  TBIL: { min: 0, max: 0.9, aliases: ['TBIL', 'T. Bil', 'Total Bilirubin'] },
  ALB: { min: 2.3, max: 4, aliases: ['ALB', 'Albumin'] },
  TP: { min: 5.2, max: 8.2, aliases: ['TP', 'Total Protein', 'T. Prot'] },
  CA: { min: 9, max: 11.3, aliases: ['CA', 'Calcium'] },
  PHOS: { min: 2.5, max: 6.8, aliases: ['PHOS', 'Phosphorus', 'PO4'] },
  NA: { min: 144, max: 160, aliases: ['NA', 'Sodium'] },
  K: { min: 3.5, max: 5.8, aliases: ['K', 'Potassium'] },
  CL: { min: 109, max: 122, aliases: ['CL', 'Chloride'] },
};

const ALIAS_INDEX: Record<string, string> = Object.entries(RANGES).reduce((acc, [k, v]) => {
  v.aliases.forEach(a => acc[a.toLowerCase()] = k);
  return acc;
}, {} as Record<string, string>);

const VALUE_RE = new RegExp(
  `\\b(${Object.values(RANGES).flatMap(r => r.aliases).map(s => s.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\$&')).join('|')})\\s*[:=\\-–]?\\s*([<>]?-?\\d+(?:\\.\\d+)?)`,
  'gi'
);

export function analyzeBloodWorkLocal(input: AnalyzeBloodWorkInput): AnalyzeBloodWorkOutput {
  const text = input.bloodWorkText || '';
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
    if (val < r.min || val > r.max) abnormalValues.push(`${key} ${val}`);
  }

  return { abnormalValues };
}
