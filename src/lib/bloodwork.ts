'use client';

export type AnalyzeBloodWorkInput = { bloodWorkText: string; species?: string };
export type AnalyzeBloodWorkOutput = { abnormalValues: string[] };

// NOTE: The reference ranges below are now only used as a fallback if the
// lab report text itself does not contain reference ranges. The primary
// logic now parses ranges directly from the text.
const CANINE_RANGES: Record<string, { min: number; max: number; aliases: string[] }> = {
  // Hematology
  RBC: { min: 5.65, max: 8.87, aliases: ['RBC'] },
  HCT: { min: 37.3, max: 61.7, aliases: ['HCT', 'Hematocrit', 'PCV'] },
  HGB: { min: 13.1, max: 20.5, aliases: ['HGB', 'Hgb', 'Hemoglobin'] },
  MCV: { min: 61.6, max: 73.5, aliases: ['MCV'] },
  MCH: { min: 21.2, max: 25.9, aliases: ['MCH'] },
  MCHC: { min: 32, max: 37.9, aliases: ['MCHC'] },
  RDW: { min: 13.6, max: 21.7, aliases: ['RDW'] },
  RETIC: { min: 10, max: 110, aliases: ['RETIC', 'Reticulocytes'] },
  RETIC_HGB: { min: 22.3, max: 29.6, aliases: ['Reticulocyte Hemoglobin', 'Retic Hgb'] },
  WBC: { min: 5.05, max: 16.76, aliases: ['WBC'] },
  NEUT: { min: 2.95, max: 11.64, aliases: ['NEUT', 'Neutrophils'] },
  LYMPH: { min: 1.05, max: 5.1, aliases: ['LYMPH', 'Lymphocytes'] },
  MONO: { min: 0.16, max: 1.12, aliases: ['MONO', 'Monocytes'] },
  EOS: { min: 0.06, max: 1.23, aliases: ['EOS', 'Eosinophils'] },
  BASO: { min: 0, max: 0.1, aliases: ['BASO', 'Basophils'] },
  PLT: { min: 148, max: 484, aliases: ['PLT', 'Platelets'] },
  PDW: { min: 9.1, max: 19.4, aliases: ['PDW'] },
  MPV: { min: 8.7, max: 13.2, aliases: ['MPV'] },
  PCT: { min: 0.14, max: 0.46, aliases: ['PCT', 'Plateletcrit'] },

  // Chemistry
  GLU: { min: 70, max: 143, aliases: ['GLU', 'Glucose'] },
  CREAT: { min: 0.5, max: 1.8, aliases: ['CREAT', 'Creatinine'] },
  BUN: { min: 7, max: 27, aliases: ['BUN'] },
  PHOS: { min: 2.5, max: 6.8, aliases: ['PHOS', 'Phosphorus'] },
  CA: { min: 7.9, max: 12, aliases: ['CA', 'Calcium'] },
  NA: { min: 144, max: 160, aliases: ['NA', 'Sodium'] },
  K: { min: 3.5, max: 5.8, aliases: ['K', 'Potassium'] },
  CL: { min: 109, max: 122, aliases: ['CL', 'Chloride'] },
  TP: { min: 5.2, max: 8.2, aliases: ['TP', 'Total Protein'] },
  ALB: { min: 2.2, max: 3.9, aliases: ['ALB', 'Albumin'] },
  GLOB: { min: 2.5, max: 4.5, aliases: ['GLOB', 'Globulin'] },
  ALT: { min: 10, max: 125, aliases: ['ALT'] },
  ALP: { min: 23, max: 212, aliases: ['ALP', 'Alk Phos'] },
  GGT: { min: 0, max: 11, aliases: ['GGT'] },
  TBIL: { min: 0, max: 0.9, aliases: ['TBIL', 'Bilirubin Total', 'Total Bilirubin'] },
  CHOL: { min: 110, max: 320, aliases: ['CHOL', 'Cholesterol'] },
  AMYL: { min: 500, max: 1500, aliases: ['AMYL', 'Amylase'] },
  LIPA: { min: 200, max: 1800, aliases: ['LIPA', 'Lipase'] },
};

/**
 * Robustly parses bloodwork text, especially formats from IDEXX labs
 * that present data in a tabular format.
 */
export function analyzeBloodWorkLocal(input: AnalyzeBloodWorkInput): AnalyzeBloodWorkOutput {
  const text = input.bloodWorkText || '';
  const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  const abnormalValues: string[] = [];

  console.log(`[Bloodwork] Parsing ${lines.length} lines`);

  // Multiple regex patterns to handle different lab formats
  // Pattern 1: Standard IDEXX table: "Test  Result  Unit  Low  High"
  const tableRowRegex = /^(?:\*\s*)?([\w\s.\-%/]+?)\s+([\d,.]+(?:\s?K\/µL)?)\s+[\w/µLdL%]+\s+([\d,.]*)\s+([\d,.]*)/;

  // Pattern 2: Tab-separated: "Test\tResult\tUnit\tLow\tHigh" or "Test\tResult\tLow-High"
  const tabSeparatedRegex = /^(?:\*\s*)?([\w\s.\-%/]+?)\t+([\d,.]+)\t+[\w/µLdL%]*\t*([\d,.]+)[\s\-–]+([\d,.]+)/;

  // Pattern 3: Result with range in parentheses: "HCT 45.2 % (37.3-61.7)"
  const parenRangeRegex = /^(?:\*\s*)?([\w\s.\-%/]+?)\s+([\d,.]+)\s*[\w/µLdL%]*\s*\(([\d,.]+)\s*[-–]\s*([\d,.]+)\)/;
  // Helper to try parsing a line with multiple patterns
  const tryParseLine = (line: string): { testName: string; result: number; low: number; high: number } | null => {
    // Try each pattern
    const patterns = [tableRowRegex, tabSeparatedRegex, parenRangeRegex];

    for (const pattern of patterns) {
      const match = line.match(pattern);
      if (match) {
        const testName = match[1].trim().replace(/\*/g, '').trim();
        const resultStr = match[2].split(' ')[0].replace(/,/g, '');
        const lowStr = match[3].replace(/,/g, '');
        const highStr = match[4].replace(/,/g, '');

        if (!resultStr || !lowStr || !highStr) continue;

        const result = parseFloat(resultStr);
        const low = parseFloat(lowStr);
        const high = parseFloat(highStr);

        if (isNaN(result) || isNaN(low) || isNaN(high)) continue;

        return { testName, result, low, high };
      }
    }
    return null;
  };

  for (const line of lines) {
    try {
      const parsed = tryParseLine(line);
      if (parsed) {
        const { testName, result, low, high } = parsed;

        if (result < low || result > high) {
          const direction = result < low ? '↓' : '↑';
          // Use a concise name, up to the first two words
          const conciseName = testName.split(/\s+/).slice(0, 2).join(' ');
          abnormalValues.push(`${conciseName} ${result} ${direction}`);
          console.log(`[Bloodwork] Found abnormal: ${conciseName} ${result} (range: ${low}-${high})`);
        }
      }
    } catch (e) {
      // Ignore parsing errors on a line and continue
      console.warn(`Could not parse bloodwork line: "${line}"`, e);
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
