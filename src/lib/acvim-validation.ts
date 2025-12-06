/**
 * ACVIM Hour Increment Validation
 * Each field type has specific increment requirements per ACVIM forms
 */

export type ValidationResult = {
  valid: boolean;
  errors: string[];
};

// Validate that a number is a multiple of the given increment
function isValidIncrement(value: number | null | undefined, increment: number): boolean {
  if (value === null || value === undefined) return true;
  if (value < 0) return false;
  // Use epsilon comparison to handle floating point precision
  const remainder = Math.abs((value * 1000) % (increment * 1000));
  return remainder < 0.001 || remainder > increment * 1000 - 0.001;
}

// Case Log: Hours must be in 0.25 increments (15 min blocks)
export function validateCaseHours(hours: number): ValidationResult {
  const errors: string[] = [];

  if (hours <= 0) {
    errors.push('Hours must be greater than 0');
  }

  if (!isValidIncrement(hours, 0.25)) {
    errors.push('Hours must be in 0.25 increments (15 minute blocks)');
  }

  return { valid: errors.length === 0, errors };
}

// Journal Club: Hours must be in 0.5 increments (30 min blocks)
export function validateJournalClubHours(hours: number): ValidationResult {
  const errors: string[] = [];

  if (hours <= 0) {
    errors.push('Hours must be greater than 0');
  }

  if (!isValidIncrement(hours, 0.5)) {
    errors.push('Hours must be in 0.5 increments (30 minute blocks)');
  }

  return { valid: errors.length === 0, errors };
}

// Weekly Schedule: Multiple field types with different increments
export function validateWeeklyScheduleFields(data: {
  clinicalNeurologyDirect?: number | null;
  clinicalNeurologyIndirect?: number | null;
  neurosurgeryHours?: number | null;
  radiologyHours?: number | null;
  neuropathologyHours?: number | null;
  clinicalPathologyHours?: number | null;
  electrodiagnosticsHours?: number | null;
  journalClubHours?: number | null;
}): ValidationResult {
  const errors: string[] = [];

  // Clinical Neurology Direct/Indirect: 0, 0.5, or 1 weeks only
  if (data.clinicalNeurologyDirect !== null && data.clinicalNeurologyDirect !== undefined) {
    if (![0, 0.5, 1].includes(data.clinicalNeurologyDirect)) {
      errors.push('Clinical Neurology Direct must be 0, 0.5, or 1 weeks');
    }
  }

  if (data.clinicalNeurologyIndirect !== null && data.clinicalNeurologyIndirect !== undefined) {
    if (![0, 0.5, 1].includes(data.clinicalNeurologyIndirect)) {
      errors.push('Clinical Neurology Indirect must be 0, 0.5, or 1 weeks');
    }
  }

  // Neurosurgery: 0.25 hour increments
  if (!isValidIncrement(data.neurosurgeryHours, 0.25)) {
    errors.push('Neurosurgery hours must be in 0.25 increments');
  }

  // Radiology: Whole hours only
  if (data.radiologyHours !== null && data.radiologyHours !== undefined) {
    if (!Number.isInteger(data.radiologyHours)) {
      errors.push('Radiology hours must be whole numbers');
    }
  }

  // Neuropathology: Whole hours only
  if (data.neuropathologyHours !== null && data.neuropathologyHours !== undefined) {
    if (!Number.isInteger(data.neuropathologyHours)) {
      errors.push('Neuropathology hours must be whole numbers');
    }
  }

  // Clinical Pathology: Whole hours only
  if (data.clinicalPathologyHours !== null && data.clinicalPathologyHours !== undefined) {
    if (!Number.isInteger(data.clinicalPathologyHours)) {
      errors.push('Clinical Pathology hours must be whole numbers');
    }
  }

  // Electrodiagnostics: 0.25 hour increments
  if (!isValidIncrement(data.electrodiagnosticsHours, 0.25)) {
    errors.push('Electrodiagnostics hours must be in 0.25 increments');
  }

  // Journal Club: 0.5 hour increments
  if (!isValidIncrement(data.journalClubHours, 0.5)) {
    errors.push('Journal Club hours must be in 0.5 increments');
  }

  return { valid: errors.length === 0, errors };
}

// Round to nearest valid increment (for client-side correction)
export function roundToIncrement(value: number, increment: number): number {
  return Math.round(value / increment) * increment;
}
