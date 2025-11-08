'use client';

export type AnalyzeBloodWorkInput = { bloodWorkText: string; species?: string };
export type AnalyzeBloodWorkOutput = { abnormalValues: string[] };

// NOTE: The reference ranges below are now only used as a fallback if the
// lab report text itself does not contain reference ranges. The primary
// logic now parses ranges directly from the text.
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

/**
 * Robustly parses bloodwork text, especially formats from IDEXX labs
 * that present data in a tabular format.
 */
export function analyzeBloodWorkLocal(input: AnalyzeBloodWorkInput): AnalyzeBloodWorkOutput {
  const text = input.bloodWorkText || '';
  const lines = text.split('\n').map(line => line.trim());
  const abnormalValues: string[] = [];

  // Regex to identify a line with a test result and its reference range.
  // It looks for a label, a result, an optional unit, and then the low/high range.
  // It handles numbers with commas.
  const tableRowRegex = /^(?:\*\s*)?([\w\s.\-%/]+?)\s+([\d,.]+(?:\s?K\/µL)?)\s+[\w/µLdL%]+\s+([\d,.]*)\s+([\d,.]*)/;
  // A simpler regex for lines that just have `TEST  VALUE`
  const simpleValueRegex = /^\s*([a-zA-Z\s]+)\s+([\d,.]+)\s*$/;

  for (const line of lines) {
    const match = line.match(tableRowRegex);
    if (match) {
      try {
        const testName = match[1].trim().replace(/\*/g, '').trim();
        const resultStr = match[2].split(' ')[0].replace(/,/g, '');
        const lowStr = match[3].replace(/,/g, '');
        const highStr = match[4].replace(/,/g, '');

        // Skip if we don't have a valid result and range
        if (!resultStr || !lowStr || !highStr) {
          continue;
        }

        const result = parseFloat(resultStr);
        const low = parseFloat(lowStr);
        const high = parseFloat(highStr);

        if (isNaN(result) || isNaN(low) || isNaN(high)) {
          continue;
        }

        if (result < low || result > high) {
          const direction = result < low ? '↓' : '↑';
          // Use a concise name, up to the first two words
          const conciseName = testName.split(/\s+/).slice(0, 2).join(' ');
          abnormalValues.push(`${conciseName} ${result} ${direction}`);
        }
      } catch (e) {
        // Ignore parsing errors on a line and continue
        console.warn(`Could not parse bloodwork line: "${line}"`, e);
      }
    }
  }

  // If the table parser found nothing, fall back to the old regex method
  if (abnormalValues.length === 0) {
    console.warn("Table parser found no abnormal values, falling back to simple regex matching.");
    const RANGES = CANINE_RANGES; // Default to canine for fallback
    const ALIAS_INDEX = Object.entries(RANGES).reduce((acc, [k, v]) => {
        v.aliases.forEach(a => acc[a.toLowerCase()] = k);
        return acc;
    }, {} as Record<string, string>);
    const VALUE_RE = new RegExp(`\\b(${Object.values(RANGES).flatMap(r => r.aliases).map(s => s.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\$&')).join('|')})\\s*[:=\\-–]?\\s*([<>]?-?\\d+(?:\\.\\d+)?)`, 'gi');

    const latest: Record<string, number> = {};
    let m: RegExpExecArray | null;

    while ((m = VALUE_RE.exec(text)) !== null) {
        const label = ALIAS_INDEX[m[1].toLowerCase()];
        if (!label) continue;
        const num = Number(m[2].replace(/[<>,]/g, ''));
        if (!Number.isFinite(num)) continue;
        latest[label] = num;
    }

    for (const [key, val] of Object.entries(latest)) {
        const r = RANGES[key];
        if (!r) continue;
        if (val < r.min || val > r.max) {
            const direction = val < r.min ? '↓' : '↑';
            abnormalValues.push(`${key} ${val} ${direction}`);
        }
    }
  }


  return { abnormalValues };
}
