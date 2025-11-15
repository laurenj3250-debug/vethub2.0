/**
 * Lab Result Parser
 *
 * Parses EasyVet lab result tables into structured LabPanel data
 * Automatically flags abnormal values based on reference ranges
 */

import { LabValue, LabPanel } from '@/contexts/PatientContext';

/**
 * Reference ranges for canine CBC values
 * Source: IDEXX standard reference ranges
 */
const CBC_REFERENCE_RANGES: Record<string, { low: number; high: number; unit: string }> = {
  'RBC': { low: 5.65, high: 8.87, unit: 'M/µL' },
  'Hematocrit': { low: 37.3, high: 61.7, unit: '%' },
  'Hemoglobin': { low: 13.1, high: 20.5, unit: 'g/dL' },
  'MCV': { low: 61.6, high: 73.5, unit: 'fL' },
  'MCH': { low: 21.2, high: 25.9, unit: 'pg' },
  'MCHC': { low: 32, high: 37.9, unit: 'g/dL' },
  'RDW': { low: 13.6, high: 21.7, unit: '%' },
  'Reticulocytes': { low: 10, high: 110, unit: 'K/µL' },
  'Reticulocyte Hemoglobin': { low: 22.3, high: 29.6, unit: 'pg' },
  'WBC': { low: 5.05, high: 16.76, unit: 'K/µL' },
  'Neutrophils': { low: 2.95, high: 11.64, unit: 'K/µL' },
  'Lymphocytes': { low: 1.05, high: 5.1, unit: 'K/µL' },
  'Monocytes': { low: 0.16, high: 1.12, unit: 'K/µL' },
  'Eosinophils': { low: 0.06, high: 1.23, unit: 'K/µL' },
  'Basophils': { low: 0, high: 0.1, unit: 'K/µL' },
  'Platelets': { low: 148, high: 484, unit: 'K/µL' },
  'PDW': { low: 9.1, high: 19.4, unit: 'fL' },
  'MPV': { low: 8.7, high: 13.2, unit: 'fL' },
  'Plateletcrit': { low: 0.14, high: 0.46, unit: '%' },
};

/**
 * Reference ranges for canine Chemistry values
 * Source: IDEXX standard reference ranges
 */
const CHEM_REFERENCE_RANGES: Record<string, { low: number; high: number; unit: string }> = {
  'Glucose': { low: 74, high: 143, unit: 'mg/dL' },
  'Creatinine': { low: 0.5, high: 1.8, unit: 'mg/dL' },
  'BUN': { low: 7, high: 27, unit: 'mg/dL' },
  'Phosphorus': { low: 2.5, high: 6.8, unit: 'mg/dL' },
  'Calcium': { low: 7.9, high: 12, unit: 'mg/dL' },
  'Sodium': { low: 144, high: 160, unit: 'mmol/L' },
  'Potassium': { low: 3.5, high: 5.8, unit: 'mmol/L' },
  'Chloride': { low: 109, high: 122, unit: 'mmol/L' },
  'Total Protein': { low: 5.2, high: 8.2, unit: 'g/dL' },
  'Albumin': { low: 2.3, high: 4, unit: 'g/dL' },
  'Globulin': { low: 2.5, high: 4.5, unit: 'g/dL' },
  'ALT': { low: 10, high: 125, unit: 'U/L' },
  'ALP': { low: 23, high: 212, unit: 'U/L' },
  'GGT': { low: 0, high: 11, unit: 'U/L' },
  'Bilirubin - Total': { low: 0, high: 0.9, unit: 'mg/dL' },
  'Cholesterol': { low: 110, high: 320, unit: 'mg/dL' },
  'Amylase': { low: 500, high: 1500, unit: 'U/L' },
  'Lipase': { low: 200, high: 1800, unit: 'U/L' },
};

/**
 * Parse a single lab value row
 */
function parseLabValue(
  parameter: string,
  value: string | number,
  unit: string,
  referenceLow?: number,
  referenceHigh?: number
): LabValue {
  const numericValue = typeof value === 'string' ? parseFloat(value.replace(/[<>*]/g, '')) : value;

  // Determine if value is abnormal
  let isAbnormal = false;
  let flag: LabValue['flag'];

  if (referenceLow !== undefined && referenceHigh !== undefined && !isNaN(numericValue)) {
    if (numericValue < referenceLow) {
      isAbnormal = true;
      flag = 'Low';
    } else if (numericValue > referenceHigh) {
      isAbnormal = true;
      flag = 'High';
    }
  }

  return {
    parameter,
    value: numericValue,
    unit,
    referenceRange: referenceLow !== undefined && referenceHigh !== undefined
      ? `${referenceLow}-${referenceHigh}`
      : '',
    referenceLow,
    referenceHigh,
    isAbnormal,
    flag,
  };
}

/**
 * Parse EasyVet CBC table text into structured LabPanel
 *
 * Expected format:
 * Test    Results    Unit    Lowest Value    Highest Value    Qualifier
 * RBC     6.74       M/µL    5.65            8.87
 */
export function parseCBCTable(tableText: string): LabPanel {
  const lines = tableText.split('\n').filter(line => line.trim());
  const values: LabValue[] = [];

  // Skip header row
  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i].split(/\s{2,}|\t/).map(p => p.trim()).filter(Boolean);

    if (parts.length >= 5) {
      const parameter = parts[0];
      const result = parts[1];
      const unit = parts[2];
      const low = parseFloat(parts[3]);
      const high = parseFloat(parts[4]);

      // Use standard reference ranges if available
      const refRange = CBC_REFERENCE_RANGES[parameter];
      const labValue = parseLabValue(
        parameter,
        result,
        unit,
        refRange?.low ?? low,
        refRange?.high ?? high
      );

      values.push(labValue);
    }
  }

  return {
    values,
    performedDate: new Date(),
    labName: 'IDEXX',
  };
}

/**
 * Parse EasyVet Chemistry table text into structured LabPanel
 */
export function parseChemistryTable(tableText: string): LabPanel {
  const lines = tableText.split('\n').filter(line => line.trim());
  const values: LabValue[] = [];

  // Skip header row
  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i].split(/\s{2,}|\t/).map(p => p.trim()).filter(Boolean);

    if (parts.length >= 5) {
      const parameter = parts[0];
      const result = parts[1];
      const unit = parts[2];
      const low = parseFloat(parts[3]);
      const high = parseFloat(parts[4]);

      // Use standard reference ranges if available
      const refRange = CHEM_REFERENCE_RANGES[parameter];
      const labValue = parseLabValue(
        parameter,
        result,
        unit,
        refRange?.low ?? low,
        refRange?.high ?? high
      );

      values.push(labValue);
    }
  }

  return {
    values,
    performedDate: new Date(),
    labName: 'IDEXX',
  };
}

/**
 * Get only abnormal values from a LabPanel
 */
export function getAbnormalValues(panel: LabPanel): LabValue[] {
  return panel.values.filter(v => v.isAbnormal);
}

/**
 * Format abnormal values into short display string
 * e.g., "Hct 62.2↑, Glucose 168↑"
 */
export function formatAbnormalsShort(abnormals: LabValue[]): string {
  return abnormals
    .map(v => {
      const arrow = v.flag === 'High' ? '↑' : v.flag === 'Low' ? '↓' : '';
      // Use common abbreviations
      const abbrev = v.parameter.replace('Hematocrit', 'Hct')
        .replace('Platelets', 'Plt')
        .replace('Creatinine', 'Creat')
        .replace('Bilirubin - Total', 'Bili');
      return `${abbrev} ${v.value}${arrow}`;
    })
    .join(', ');
}

/**
 * Format lab results for rounding sheet diagnostic findings
 * Returns formatted string ready for display
 */
export function formatForRoundingSheet(
  cbc?: LabPanel,
  chemistry?: LabPanel,
  chestXray?: string
): string {
  const parts: string[] = [];

  if (cbc) {
    const abnormals = getAbnormalValues(cbc);
    if (abnormals.length > 0) {
      parts.push(`CBC: ${formatAbnormalsShort(abnormals)}`);
    }
  }

  if (chemistry) {
    const abnormals = getAbnormalValues(chemistry);
    if (abnormals.length > 0) {
      parts.push(`Chem: ${formatAbnormalsShort(abnormals)}`);
    }
  }

  if (chestXray && chestXray !== 'NSF' && chestXray.toLowerCase() !== 'no significant findings') {
    parts.push(`CXR: ${chestXray}`);
  }

  return parts.length > 0 ? parts.join('\n') : 'CBC/Chem: WNL';
}
