/**
 * MRI Anesthesia Dose Calculator
 *
 * Auto-calculates drug doses for MRI anesthesia based on:
 * - Patient weight (kg and lbs)
 * - MRI scan region (Brain vs Spine)
 *
 * Protocol:
 * - Brain MRI: Butorphanol + Valium + Contrast
 * - Spine MRI (C-Spine, T-Spine, LS): Methadone + Valium + Contrast
 */

import { MRICalculatedDoses, MRIData } from '@/contexts/PatientContext';

/**
 * Drug protocol constants
 */
const MRI_PROTOCOLS = {
  methadone: {
    dose_mg_per_kg: 0.2,
    concentration_mg_per_ml: 10,
  },
  butorphanol: {
    dose_mg_per_kg: 0.2,
    concentration_mg_per_ml: 10,
  },
  valium: {
    dose_mg_per_kg: 0.25,
    concentration_mg_per_ml: 5,
  },
  contrast: {
    ml_per_lb: 0.1,
  },
};

/**
 * Convert kg to lbs
 */
export function kgToLbs(kg: number): number {
  return kg * 2.20462;
}

/**
 * Convert lbs to kg
 */
export function lbsToKg(lbs: number): number {
  return lbs / 2.20462;
}

/**
 * Calculate MRI anesthesia doses based on patient weight and scan type
 *
 * @param weightKg - Patient weight in kilograms
 * @param weightLbs - Patient weight in pounds (optional, will be calculated if not provided)
 * @param scanType - Type of MRI scan (Brain, C-Spine, T-Spine, LS)
 * @returns Calculated doses for opioid, valium, and contrast
 */
export function calculateMRIDoses(
  weightKg: number,
  weightLbs?: number,
  scanType?: MRIData['scanType']
): MRICalculatedDoses {
  // Calculate lbs if not provided
  const lbs = weightLbs ?? kgToLbs(weightKg);

  // Determine opioid based on scan type
  // Brain (or any scan including Brain) → Butorphanol
  // Spine only (C-Spine, T-Spine, LS without Brain) → Methadone
  const scanTypeLower = (scanType || '').toLowerCase();
  const useButorphanol = scanTypeLower.includes('brain');
  const opioidName = useButorphanol ? 'Butorphanol' : 'Methadone';
  const opioidProtocol = useButorphanol
    ? MRI_PROTOCOLS.butorphanol
    : MRI_PROTOCOLS.methadone;

  // Calculate opioid dose
  const opioidTotalMg = weightKg * opioidProtocol.dose_mg_per_kg;
  const opioidVolumeMl = opioidTotalMg / opioidProtocol.concentration_mg_per_ml;

  // Calculate Valium dose (always used)
  const valiumTotalMg = weightKg * MRI_PROTOCOLS.valium.dose_mg_per_kg;
  const valiumVolumeMl = valiumTotalMg / MRI_PROTOCOLS.valium.concentration_mg_per_ml;

  // Calculate Contrast volume (based on lbs)
  const contrastVolumeMl = lbs * MRI_PROTOCOLS.contrast.ml_per_lb;

  return {
    opioid: {
      name: opioidName,
      doseMg: parseFloat(opioidTotalMg.toFixed(2)),
      volumeMl: parseFloat(opioidVolumeMl.toFixed(3)),
    },
    valium: {
      doseMg: parseFloat(valiumTotalMg.toFixed(2)),
      volumeMl: parseFloat(valiumVolumeMl.toFixed(3)),
    },
    contrast: {
      volumeMl: parseFloat(contrastVolumeMl.toFixed(3)),
    },
  };
}

/**
 * Calculate MRI doses from a patient's demographics
 *
 * @param weight - Weight string (e.g., "15.1" or "15.1kg")
 * @param scanType - MRI scan type
 * @returns Calculated doses or null if weight cannot be parsed
 */
export function calculateMRIDosesFromWeight(
  weight: string | undefined,
  scanType?: MRIData['scanType']
): MRICalculatedDoses | null {
  if (!weight) return null;

  // Parse weight string (handle "15.1kg" or "15.1")
  const weightNum = parseFloat(weight.replace(/[^\d.]/g, ''));

  if (isNaN(weightNum) || weightNum <= 0) return null;

  return calculateMRIDoses(weightNum, undefined, scanType);
}

/**
 * Auto-populate MRI doses in MRIData object
 *
 * @param mriData - Current MRI data
 * @param patientWeight - Patient weight in kg
 * @returns Updated MRI data with calculated doses
 */
export function autoPopulateMRIDoses(
  mriData: MRIData | undefined,
  patientWeight: string | undefined
): MRIData | undefined {
  if (!mriData || !mriData.autoCalculate) return mriData;

  const calculatedDoses = calculateMRIDosesFromWeight(patientWeight, mriData.scanType);

  if (!calculatedDoses) return mriData;

  return {
    ...mriData,
    preMedDrug: calculatedDoses.opioid.name,
    preMedDose: `${calculatedDoses.opioid.doseMg}mg (${calculatedDoses.opioid.volumeMl}mL)`,
    valiumDose: `${calculatedDoses.valium.doseMg}mg (${calculatedDoses.valium.volumeMl}mL)`,
    contrastVolume: `${calculatedDoses.contrast.volumeMl}mL`,
    calculatedDoses,
  };
}

/**
 * Format MRI doses for display on anesthesia sheet
 */
export function formatMRIDosesForDisplay(doses: MRICalculatedDoses): {
  opioidDisplay: string;
  valiumDisplay: string;
  contrastDisplay: string;
} {
  return {
    opioidDisplay: `${doses.opioid.name}: ${doses.opioid.doseMg}mg (${doses.opioid.volumeMl}mL)`,
    valiumDisplay: `Valium: ${doses.valium.doseMg}mg (${doses.valium.volumeMl}mL)`,
    contrastDisplay: `Contrast: ${doses.contrast.volumeMl}mL`,
  };
}

/**
 * Get default NPO time (8 hours before MRI scheduled time)
 */
export function getDefaultNPOTime(mriScheduledTime?: Date): Date | undefined {
  if (!mriScheduledTime) return undefined;

  const npoTime = new Date(mriScheduledTime);
  npoTime.setHours(npoTime.getHours() - 8);
  return npoTime;
}
