/**
 * Sticker Count Calculator
 *
 * Calculates how many stickers to print based on patient admission status
 *
 * Rules:
 * - Base: 2 big labels, 0 tiny sheets
 * - New Admit: 6 big labels, 1 tiny sheet (4 tiny labels)
 * - Surgery: 5 big labels, 2 tiny sheets (8 tiny labels)
 * - Both New Admit + Surgery: 6 big labels, 2 tiny sheets (max of both)
 */

import { StickerData } from '@/contexts/PatientContext';

/**
 * Sticker count constants
 */
const STICKER_RULES = {
  BASE: {
    bigLabels: 2,
    tinySheets: 0,
  },
  NEW_ADMIT: {
    bigLabels: 6,
    tinySheets: 1,
  },
  SURGERY: {
    bigLabels: 5,
    tinySheets: 2,
  },
  TINY_LABELS_PER_SHEET: 4,
};

/**
 * Calculate sticker counts based on admission flags
 *
 * @param isNewAdmit - Is this a new admission?
 * @param isSurgery - Is this a surgery patient?
 * @returns Calculated sticker counts
 */
export function calculateStickerCounts(
  isNewAdmit: boolean,
  isSurgery: boolean
): { bigLabelCount: number; tinySheetCount: number; tinyLabelTotal: number } {
  let bigLabelCount = STICKER_RULES.BASE.bigLabels;
  let tinySheetCount = STICKER_RULES.BASE.tinySheets;

  // Apply New Admit rules (max of base and new admit)
  if (isNewAdmit) {
    bigLabelCount = Math.max(bigLabelCount, STICKER_RULES.NEW_ADMIT.bigLabels);
    tinySheetCount = Math.max(tinySheetCount, STICKER_RULES.NEW_ADMIT.tinySheets);
  }

  // Apply Surgery rules (max of current and surgery)
  if (isSurgery) {
    bigLabelCount = Math.max(bigLabelCount, STICKER_RULES.SURGERY.bigLabels);
    tinySheetCount = Math.max(tinySheetCount, STICKER_RULES.SURGERY.tinySheets);
  }

  const tinyLabelTotal = tinySheetCount * STICKER_RULES.TINY_LABELS_PER_SHEET;

  return {
    bigLabelCount,
    tinySheetCount,
    tinyLabelTotal,
  };
}

/**
 * Auto-populate sticker counts in StickerData
 *
 * @param stickerData - Current sticker data
 * @returns Updated sticker data with calculated counts
 */
export function autoCalculateStickerCounts(
  stickerData: StickerData | undefined
): StickerData {
  if (!stickerData) {
    // Default to base counts
    return {
      isNewAdmit: false,
      isSurgery: false,
      bigLabelCount: STICKER_RULES.BASE.bigLabels,
      tinySheetCount: STICKER_RULES.BASE.tinySheets,
    };
  }

  const counts = calculateStickerCounts(stickerData.isNewAdmit, stickerData.isSurgery);

  return {
    ...stickerData,
    bigLabelCount: counts.bigLabelCount,
    tinySheetCount: counts.tinySheetCount,
  };
}

/**
 * Get sticker summary for display
 */
export function getStickerSummary(stickerData: StickerData | undefined): string {
  if (!stickerData) {
    return `${STICKER_RULES.BASE.bigLabels} big labels`;
  }

  const counts = calculateStickerCounts(stickerData.isNewAdmit, stickerData.isSurgery);

  const parts: string[] = [`${counts.bigLabelCount} big labels`];

  if (counts.tinySheetCount > 0) {
    parts.push(`${counts.tinySheetCount} tiny sheets (${counts.tinyLabelTotal} labels)`);
  }

  return parts.join(', ');
}

/**
 * Check if all stickers have been printed
 */
export function areAllStickersPrinted(stickerData: StickerData | undefined): boolean {
  if (!stickerData) return false;

  const hasTinyLabels = (stickerData.tinySheetCount ?? 0) > 0;

  if (hasTinyLabels) {
    return (stickerData.bigLabelsPrinted ?? false) && (stickerData.tinyLabelsPrinted ?? false);
  } else {
    return stickerData.bigLabelsPrinted ?? false;
  }
}

/**
 * Mark stickers as printed
 */
export function markStickersPrinted(
  stickerData: StickerData,
  type: 'big' | 'tiny' | 'all'
): StickerData {
  const now = new Date();

  switch (type) {
    case 'big':
      return {
        ...stickerData,
        bigLabelsPrinted: true,
        stickersPrintedAt: stickerData.tinyLabelsPrinted ? stickerData.stickersPrintedAt : now,
      };
    case 'tiny':
      return {
        ...stickerData,
        tinyLabelsPrinted: true,
        stickersPrintedAt: stickerData.bigLabelsPrinted ? stickerData.stickersPrintedAt : now,
      };
    case 'all':
      return {
        ...stickerData,
        bigLabelsPrinted: true,
        tinyLabelsPrinted: true,
        stickersPrintedAt: now,
      };
  }
}
