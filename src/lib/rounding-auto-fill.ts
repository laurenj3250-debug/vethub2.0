/**
 * VetHub Rounding Sheet Auto-Fill System
 * Automatically pre-populates rounding data from patient demographics and previous data
 * Reduces manual data entry by 80%+ during daily rounds
 */

interface Demographics {
  name?: string;
  age?: string;
  sex?: string;
  breed?: string;
  species?: string;
  weight?: string;
}

interface PatientData {
  demographics?: Demographics;
  currentStay?: {
    location?: string;
    codeStatus?: string;
    icuCriteria?: string;
  };
  roundingData?: {
    signalment?: string;
    location?: string;
    code?: string;
    icuCriteria?: string;
    problems?: string;
    therapeutics?: string;
    fluids?: string;
    cri?: string;
    ivc?: string;
    dayCount?: number;
    lastUpdated?: string;
  };
}

interface AutoFillResult {
  signalment?: string;
  location?: string;
  code?: string;
  icuCriteria?: string;
  autoFilledFields: string[];
  carriedForwardFields: string[];
}

/**
 * Generate compact signalment from patient demographics
 * Format: "{age} {sex} {breed_abbr}"
 * Examples: "5y FS Lab", "12y MN GSD", "3y F Border Collie"
 */
export function generateSignalment(demographics: Demographics): string {
  const parts: string[] = [];

  // Age (format: "5y" or "8m" or "2.5y")
  if (demographics.age) {
    let age = demographics.age.trim();

    // If age contains full words like "years", "months", "days", abbreviate them
    age = age
      .replace(/\s*years?/gi, 'y')
      .replace(/\s*months?/gi, 'm')
      .replace(/\s*days?/gi, 'd')
      .replace(/\s*weeks?/gi, 'w');

    // If already has abbreviated suffix 'y', 'm', 'd', 'w', use as-is, otherwise append 'y'
    parts.push(age.match(/[ymdw]$/i) ? age : `${age}y`);
  }

  // Sex (common abbreviations: FS, MN, F, M, MC, SF)
  if (demographics.sex) {
    const sex = demographics.sex.trim().toUpperCase();
    // Handle common formats
    const sexMap: Record<string, string> = {
      'FEMALE SPAYED': 'FS',
      'MALE NEUTERED': 'MN',
      'MALE CASTRATED': 'MC',
      'SPAYED FEMALE': 'FS',
      'NEUTERED MALE': 'MN',
      'FEMALE': 'F',
      'MALE': 'M',
      'FS': 'FS',
      'MN': 'MN',
      'MC': 'MC',
      'F': 'F',
      'M': 'M',
      'SF': 'FS',
      'NM': 'MN',
    };
    parts.push(sexMap[sex] || sex);
  }

  // Breed (abbreviate common breeds, otherwise use first 15 chars)
  if (demographics.breed) {
    const breed = demographics.breed.trim();
    const breedAbbr = abbreviateBreed(breed);
    parts.push(breedAbbr);
  }

  return parts.join(' ');
}

/**
 * Abbreviate common breed names for compact signalment
 */
function abbreviateBreed(breed: string): string {
  const normalized = breed.toLowerCase();

  // Common breed abbreviations (veterinary standard)
  const abbreviations: Record<string, string> = {
    'labrador retriever': 'Lab',
    'labrador': 'Lab',
    'golden retriever': 'Golden',
    'german shepherd': 'GSD',
    'german shepherd dog': 'GSD',
    'yorkshire terrier': 'Yorkie',
    'beagle': 'Beagle',
    'bulldog': 'Bulldog',
    'boxer': 'Boxer',
    'dachshund': 'Dachshund',
    'poodle': 'Poodle',
    'rottweiler': 'Rottweiler',
    'chihuahua': 'Chihuahua',
    'shih tzu': 'Shih Tzu',
    'pug': 'Pug',
    'pomeranian': 'Pomeranian',
    'french bulldog': 'Frenchie',
    'border collie': 'Border Collie',
    'australian shepherd': 'Aussie',
    'siberian husky': 'Husky',
    'great dane': 'Great Dane',
    'doberman pinscher': 'Doberman',
    'doberman': 'Doberman',
    'miniature schnauzer': 'Mini Schnauzer',
    'cocker spaniel': 'Cocker',
    'cavalier king charles spaniel': 'CKCS',
    'boston terrier': 'Boston',
    'english springer spaniel': 'Springer',
    'brittany spaniel': 'Brittany',
    'mixed breed': 'Mix',
    'domestic shorthair': 'DSH',
    'domestic longhair': 'DLH',
    'domestic medium hair': 'DMH',
  };

  // Check for exact match
  if (abbreviations[normalized]) {
    return abbreviations[normalized];
  }

  // Check for partial match
  for (const [full, abbr] of Object.entries(abbreviations)) {
    if (normalized.includes(full)) {
      return abbr;
    }
  }

  // No match - truncate long breed names
  if (breed.length > 15) {
    return breed.substring(0, 15);
  }

  // Return original if short enough
  return breed;
}

/**
 * Increment day count in problems text
 * "Day 2 seizures" → "Day 3 seizures"
 * "Post-op Day 1 IVDD" → "Post-op Day 2 IVDD"
 */
export function incrementDayCount(text: string): string {
  if (!text) return text;

  // Pattern: "Day X" where X is a number
  const dayPattern = /Day (\d+)/gi;

  return text.replace(dayPattern, (match, dayNum) => {
    const newDay = parseInt(dayNum) + 1;
    return `Day ${newDay}`;
  });
}

/**
 * Auto-fill rounding data from patient demographics and previous data
 * Returns data with auto-filled fields and indicators of what was filled
 */
export function autoFillRoundingData(patient: PatientData): AutoFillResult {
  const autoFilledFields: string[] = [];
  const carriedForwardFields: string[] = [];
  const result: Partial<AutoFillResult> = {};

  // 1. AUTO-FILL SIGNALMENT from demographics
  if (patient.demographics) {
    const generatedSignalment = generateSignalment(patient.demographics);
    if (generatedSignalment) {
      result.signalment = generatedSignalment;
      autoFilledFields.push('signalment');
    }
  }

  // 2. AUTO-FILL LOCATION from current stay or previous data
  if (patient.currentStay?.location) {
    result.location = patient.currentStay.location;
    autoFilledFields.push('location');
  } else if (patient.roundingData?.location) {
    result.location = patient.roundingData.location;
    carriedForwardFields.push('location');
  }

  // 3. AUTO-FILL CODE STATUS from current stay or previous data
  if (patient.currentStay?.codeStatus) {
    result.code = patient.currentStay.codeStatus;
    autoFilledFields.push('code');
  } else if (patient.roundingData?.code) {
    result.code = patient.roundingData.code;
    carriedForwardFields.push('code');
  }

  // 4. AUTO-FILL ICU CRITERIA from current stay or previous data
  if (patient.currentStay?.icuCriteria) {
    result.icuCriteria = patient.currentStay.icuCriteria;
    autoFilledFields.push('icuCriteria');
  } else if (patient.roundingData?.icuCriteria) {
    result.icuCriteria = patient.roundingData.icuCriteria;
    carriedForwardFields.push('icuCriteria');
  }

  return {
    ...result,
    autoFilledFields,
    carriedForwardFields,
  };
}

/**
 * Check if rounding data was updated today
 */
export function isUpdatedToday(lastUpdated?: string): boolean {
  if (!lastUpdated) return false;

  const today = new Date().toISOString().split('T')[0];
  const updatedDate = new Date(lastUpdated).toISOString().split('T')[0];

  return today === updatedDate;
}

/**
 * Get days since last update
 */
export function getDaysSinceUpdate(lastUpdated?: string): number {
  if (!lastUpdated) return 0;

  const now = new Date();
  const updated = new Date(lastUpdated);
  const diffMs = now.getTime() - updated.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  return diffDays;
}

/**
 * Determine if data is stale (>48 hours old)
 */
export function isStaleData(lastUpdated?: string): boolean {
  return getDaysSinceUpdate(lastUpdated) > 2;
}

/**
 * Format auto-fill summary message
 */
export function formatAutoFillMessage(result: AutoFillResult): string {
  const autoCount = result.autoFilledFields.length;
  const carryCount = result.carriedForwardFields.length;
  const total = autoCount + carryCount;

  if (total === 0) {
    return 'No data auto-filled';
  }

  const parts: string[] = [];

  if (autoCount > 0) {
    parts.push(`${autoCount} field${autoCount > 1 ? 's' : ''} auto-filled`);
  }

  if (carryCount > 0) {
    parts.push(`${carryCount} carried forward`);
  }

  return parts.join(', ');
}
