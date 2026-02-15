/**
 * Smart Template Matcher
 *
 * Analyzes patient data (medications, concerns, location, type) and
 * automatically detects which rounding template best matches.
 *
 * INGENIOUS INSIGHT: The patient data already tells us what protocol they need.
 * Instead of making the user pick a template, we detect it automatically.
 *
 * Result: User opens rounding sheet → already filled with correct protocol → just review.
 */

import { roundingTemplates, RoundingTemplate } from '@/data/rounding-templates';

// Use a generic rounding data interface that works with both type definitions
interface SmartRoundingData {
  signalment?: string;
  location?: string;
  icuCriteria?: string;
  code?: string;
  problems?: string;
  diagnosticFindings?: string;
  therapeutics?: string;
  ivc?: string;
  fluids?: string;
  cri?: string;
  overnightDx?: string;
  concerns?: string;
  comments?: string;
}

interface PatientSignals {
  // From VetRadar import
  medications?: string[];
  treatments?: string[];
  concerns?: string;
  location?: string;
  problems?: string;

  // From patient type inference
  type?: 'Surgery' | 'Medical' | 'MRI';

  // From status
  isPostOp?: boolean;
  daysSinceSurgery?: number;
}

/**
 * Patient Phase Detection
 *
 * CONTEXT: Rounding sheets are for OVERNIGHT doctors.
 * MRI happens in the morning, so "MRI tomorrow" on the evening sheet
 * means MRI is next morning.
 *
 * Phases:
 * - PRE_MRI: Admitted evening, MRI scheduled for tomorrow morning
 * - POST_MRI: MRI done this morning, awaiting results/surgery decision
 * - POST_OP_DAY1: Surgery done today, first overnight
 * - POST_OP_DAY2_PLUS: Day 2+ after surgery
 * - MEDICAL_STABLE: Medical patient, stable protocol
 * - DISCHARGING: Going home
 */
export type PatientPhase =
  | 'PRE_MRI'
  | 'POST_MRI'
  | 'POST_OP_DAY1'
  | 'POST_OP_DAY2_PLUS'
  | 'MEDICAL_STABLE'
  | 'DISCHARGING';

interface PhaseDetectionResult {
  phase: PatientPhase;
  confidence: number;
  reasons: string[];
  suggestedChanges?: Partial<SmartRoundingData>;
}

/**
 * Detect patient phase based on their type, previous rounding data, and day count
 */
export function detectPatientPhase(
  patientType: 'Surgery' | 'Medical' | 'MRI' | undefined,
  previousRoundingData: Partial<SmartRoundingData> | undefined,
  dayCount: number = 1
): PhaseDetectionResult {
  const reasons: string[] = [];
  let phase: PatientPhase = 'MEDICAL_STABLE';
  let confidence = 50;
  let suggestedChanges: Partial<SmartRoundingData> = {};

  const prevProblems = (previousRoundingData?.problems || '').toLowerCase();
  const prevConcerns = (previousRoundingData?.concerns || '').toLowerCase();

  // Check for "MRI tomorrow" in yesterday's data → Today is MRI day
  const hadMRITomorrow = prevProblems.includes('mri tomorrow') ||
                         prevConcerns.includes('mri tomorrow');

  // Check for post-op indicators
  const isPostOp = prevProblems.includes('post op') ||
                   prevProblems.includes('post-op') ||
                   prevProblems.includes('postop') ||
                   prevProblems.includes('po hemi');

  // Phase detection logic
  //
  // IMPORTANT: Rounding sheets are for OVERNIGHT doctors.
  // "MRI tomorrow" means MRI happens next morning.
  // After MRI, patient is either:
  //   - Going to surgery → will become POST_OP
  //   - Getting results → may discharge or stay for medical management
  //
  // So if yesterday said "MRI tomorrow", today they're POST-MRI (awaiting surgery/results)
  if (hadMRITomorrow) {
    // Yesterday said "MRI tomorrow" → MRI happened this morning
    // Now waiting for surgery or results
    phase = 'POST_MRI';
    confidence = 90;
    reasons.push('MRI was this morning (yesterday said "MRI tomorrow")');

    // Clear the "MRI tomorrow" - it's done now
    // Don't auto-fill post-op yet - wait for user to confirm surgery happened
    suggestedChanges = {
      problems: prevProblems
        .replace(/,?\s*mri tomorrow/gi, '')
        .replace(/mri tomorrow,?\s*/gi, '')
        .trim() + ', MRI done - awaiting results/surgery',
      concerns: 'Post-MRI monitoring, awaiting plan',
      overnightDx: '', // Fresh slate post-MRI
    };
  } else if (isPostOp && dayCount === 1) {
    phase = 'POST_OP_DAY1';
    confidence = 90;
    reasons.push('Post-op patient, Day 1');
  } else if (isPostOp && dayCount >= 2) {
    phase = 'POST_OP_DAY2_PLUS';
    confidence = 90;
    reasons.push(`Post-op patient, Day ${dayCount}`);

    // Suggest reducing pain meds on day 2+
    suggestedChanges = {
      comments: 'Reassess pain management, consider weaning CRIs',
    };
  } else if (patientType === 'MRI') {
    // MRI patient but no "MRI tomorrow" yet
    if (dayCount === 1) {
      phase = 'PRE_MRI';
      confidence = 85;
      reasons.push('MRI patient, Day 1 (pre-MRI workup)');
    } else {
      // Day 2+ and MRI type but didn't have "MRI tomorrow" - maybe post-MRI?
      phase = 'POST_MRI';
      confidence = 70;
      reasons.push('MRI patient, Day 2+ (likely post-MRI)');
    }
  } else if (patientType === 'Surgery') {
    if (dayCount === 1) {
      phase = 'PRE_MRI'; // Surgery patients often get MRI first
      confidence = 75;
      reasons.push('Surgery patient, Day 1 (pre-op workup)');
    } else {
      phase = 'POST_OP_DAY1';
      confidence = 70;
      reasons.push('Surgery patient, Day 2+ (likely post-op)');
    }
  } else {
    phase = 'MEDICAL_STABLE';
    confidence = 60;
    reasons.push('Medical patient, stable protocol');
  }

  return { phase, confidence, reasons, suggestedChanges };
}

interface TemplateMatch {
  template: RoundingTemplate;
  confidence: number; // 0-100
  reasons: string[];
}

/**
 * Medication patterns that indicate specific templates
 */
const MEDICATION_SIGNALS: Record<string, { templateIds: string[]; weight: number }> = {
  // Seizure meds → SEIZURES template
  'diazepam': { templateIds: ['seizures'], weight: 40 },
  'phenobarbital': { templateIds: ['seizures'], weight: 40 },
  'bromide': { templateIds: ['seizures'], weight: 35 },
  'keppra': { templateIds: ['seizures'], weight: 35 },
  'levetiracetam': { templateIds: ['seizures'], weight: 35 },
  'zonisamide': { templateIds: ['seizures'], weight: 30 },

  // Post-op pain meds → PO HEMI templates
  'fentanyl': { templateIds: ['po-hemi-day1', 'po-hemi-day2'], weight: 35 },
  'ketamine': { templateIds: ['po-hemi-day1', 'po-hemi-day2'], weight: 30 },

  // Pre-op / myelopathy meds → TL or Cervical templates
  'gabapentin': { templateIds: ['tl-myelopathy', 'plegic', 'cervical-myelopathy'], weight: 20 },
  'tramadol': { templateIds: ['tl-myelopathy', 'plegic', 'cervical-myelopathy'], weight: 20 },
  'prednisone': { templateIds: ['tl-myelopathy', 'plegic', 'cervical-myelopathy', 'cd-fossa'], weight: 15 },
  'famotidine': { templateIds: ['tl-myelopathy', 'plegic', 'cervical-myelopathy'], weight: 10 },

  // Antibiotics post-surgery
  'clavamox': { templateIds: ['po-hemi-day1', 'po-hemi-day2'], weight: 15 },
  'cephalexin': { templateIds: ['po-hemi-day1', 'po-hemi-day2'], weight: 15 },

  // Mannitol for increased ICP
  'mannitol': { templateIds: ['cd-fossa'], weight: 30 },
};

/**
 * Keyword patterns in concerns/problems that indicate templates
 */
const KEYWORD_SIGNALS: Record<string, { templateIds: string[]; weight: number }> = {
  // Seizures
  'seizure': { templateIds: ['seizures'], weight: 50 },
  'epilep': { templateIds: ['seizures'], weight: 45 },
  'convuls': { templateIds: ['seizures'], weight: 45 },

  // Post-op
  'post-op': { templateIds: ['po-hemi-day1', 'po-hemi-day2'], weight: 50 },
  'postop': { templateIds: ['po-hemi-day1', 'po-hemi-day2'], weight: 50 },
  'post op': { templateIds: ['po-hemi-day1', 'po-hemi-day2'], weight: 50 },
  'hemilaminectomy': { templateIds: ['po-hemi-day1', 'po-hemi-day2'], weight: 60 },
  'laminectomy': { templateIds: ['po-hemi-day1', 'po-hemi-day2'], weight: 55 },
  'ventral slot': { templateIds: ['po-hemi-day1', 'po-hemi-day2'], weight: 55 },

  // Myelopathy locations
  'thoracolumbar': { templateIds: ['tl-myelopathy', 'plegic'], weight: 45 },
  'tl myelopathy': { templateIds: ['tl-myelopathy', 'plegic'], weight: 50 },
  't3-l3': { templateIds: ['tl-myelopathy', 'plegic'], weight: 45 },
  'l4-s3': { templateIds: ['tl-myelopathy', 'plegic'], weight: 40 },

  'cervical': { templateIds: ['cervical-myelopathy'], weight: 45 },
  'c1-c5': { templateIds: ['cervical-myelopathy'], weight: 50 },
  'c6-t2': { templateIds: ['cervical-myelopathy'], weight: 50 },

  // Neurological status
  'plegic': { templateIds: ['plegic'], weight: 40 },
  'paraplegic': { templateIds: ['plegic'], weight: 45 },
  'paralyz': { templateIds: ['plegic'], weight: 40 },
  'non-ambulatory': { templateIds: ['plegic'], weight: 35 },
  'nonambulatory': { templateIds: ['plegic'], weight: 35 },

  'ambulatory': { templateIds: ['tl-myelopathy', 'cervical-myelopathy'], weight: 20 },

  // Caudal fossa
  'caudal fossa': { templateIds: ['cd-fossa'], weight: 60 },
  'cd fossa': { templateIds: ['cd-fossa'], weight: 60 },
  'cerebellar': { templateIds: ['cd-fossa'], weight: 40 },
  'vestibular': { templateIds: ['cd-fossa'], weight: 35 },

  // IVDD
  'ivdd': { templateIds: ['tl-myelopathy', 'plegic', 'cervical-myelopathy'], weight: 40 },
  'disc': { templateIds: ['tl-myelopathy', 'plegic', 'cervical-myelopathy'], weight: 25 },
  'disk': { templateIds: ['tl-myelopathy', 'plegic', 'cervical-myelopathy'], weight: 25 },
};

/**
 * Analyze patient signals and find matching templates
 */
export function detectTemplateMatch(signals: PatientSignals): TemplateMatch | null {
  const scores: Map<string, { score: number; reasons: string[] }> = new Map();

  // Initialize scores for all templates
  roundingTemplates.forEach(t => {
    scores.set(t.id, { score: 0, reasons: [] });
  });

  // Score based on medications
  if (signals.medications?.length) {
    for (const med of signals.medications) {
      const medLower = med.toLowerCase();
      for (const [keyword, signal] of Object.entries(MEDICATION_SIGNALS)) {
        if (medLower.includes(keyword)) {
          for (const templateId of signal.templateIds) {
            const current = scores.get(templateId);
            if (current) {
              current.score += signal.weight;
              current.reasons.push(`Has ${keyword}`);
            }
          }
        }
      }
    }
  }

  // Score based on treatments
  if (signals.treatments?.length) {
    for (const treatment of signals.treatments) {
      const treatLower = treatment.toLowerCase();
      for (const [keyword, signal] of Object.entries(KEYWORD_SIGNALS)) {
        if (treatLower.includes(keyword)) {
          for (const templateId of signal.templateIds) {
            const current = scores.get(templateId);
            if (current) {
              current.score += signal.weight;
              current.reasons.push(`Treatment: ${keyword}`);
            }
          }
        }
      }
    }
  }

  // Score based on concerns text
  if (signals.concerns) {
    const concernsLower = signals.concerns.toLowerCase();
    for (const [keyword, signal] of Object.entries(KEYWORD_SIGNALS)) {
      if (concernsLower.includes(keyword)) {
        for (const templateId of signal.templateIds) {
          const current = scores.get(templateId);
          if (current) {
            current.score += signal.weight;
            current.reasons.push(`Concerns mention: ${keyword}`);
          }
        }
      }
    }
  }

  // Score based on problems text
  if (signals.problems) {
    const problemsLower = signals.problems.toLowerCase();
    for (const [keyword, signal] of Object.entries(KEYWORD_SIGNALS)) {
      if (problemsLower.includes(keyword)) {
        for (const templateId of signal.templateIds) {
          const current = scores.get(templateId);
          if (current) {
            current.score += signal.weight;
            current.reasons.push(`Problem: ${keyword}`);
          }
        }
      }
    }
  }

  // Boost post-op templates if explicitly post-op
  if (signals.isPostOp) {
    const day = signals.daysSinceSurgery || 1;
    const templateId = day <= 1 ? 'po-hemi-day1' : 'po-hemi-day2';
    const current = scores.get(templateId);
    if (current) {
      current.score += 60;
      current.reasons.push(`Post-op day ${day}`);
    }
  }

  // Boost seizures template if type is Medical and has seizure signals
  if (signals.type === 'Medical') {
    const seizureScore = scores.get('seizures');
    if (seizureScore && seizureScore.score > 0) {
      seizureScore.score += 20;
      seizureScore.reasons.push('Medical patient with seizure signals');
    }
  }

  // Find highest scoring template
  let bestMatch: { templateId: string; score: number; reasons: string[] } | null = null;

  for (const [templateId, data] of scores) {
    if (data.score > 0 && (!bestMatch || data.score > bestMatch.score)) {
      bestMatch = { templateId, ...data };
    }
  }

  // Require minimum confidence threshold
  const MIN_CONFIDENCE = 30;
  if (!bestMatch || bestMatch.score < MIN_CONFIDENCE) {
    return null;
  }

  const template = roundingTemplates.find(t => t.id === bestMatch!.templateId);
  if (!template) {
    return null;
  }

  // Normalize score to 0-100 confidence
  const confidence = Math.min(100, bestMatch.score);

  return {
    template,
    confidence,
    reasons: [...new Set(bestMatch.reasons)], // Dedupe reasons
  };
}

/**
 * Apply template to existing rounding data, preserving patient-specific fields
 */
export function applyTemplateToRoundingData(
  existingData: Partial<SmartRoundingData>,
  template: RoundingTemplate
): SmartRoundingData {
  return {
    // Start with template data
    ...template.data,

    // Preserve patient-specific fields that shouldn't be overwritten
    location: existingData.location || template.data.location,
    icuCriteria: existingData.icuCriteria || template.data.icuCriteria,
    code: existingData.code || template.data.code,
    ivc: existingData.ivc || template.data.ivc,
    fluids: existingData.fluids || template.data.fluids,
    cri: existingData.cri || template.data.cri,

    // Template provides the protocol-specific fields
    problems: template.data.problems,
    diagnosticFindings: existingData.diagnosticFindings || template.data.diagnosticFindings,
    therapeutics: template.data.therapeutics,
    overnightDx: template.data.overnightDx,
    concerns: template.data.concerns,
    comments: template.data.comments,
  };
}

/**
 * Extract patient signals from a VetRadar-imported patient
 */
export function extractPatientSignals(patient: any): PatientSignals {
  const signals: PatientSignals = {};

  // Extract medications
  const meds: string[] = [];
  if (patient.medications?.length) {
    meds.push(...patient.medications.map((m: any) => m.medication || m.name || m));
  }
  if (patient.roundingData?.therapeutics) {
    // Parse therapeutics string
    meds.push(...patient.roundingData.therapeutics.split(/[,;]/).map((s: string) => s.trim()));
  }
  signals.medications = meds.filter(Boolean);

  // Extract treatments
  if (patient.treatments?.length) {
    signals.treatments = patient.treatments;
  }

  // Extract concerns
  signals.concerns = patient.concerns || patient.roundingData?.concerns || '';

  // Extract problems
  signals.problems = patient.roundingData?.problems || '';

  // Extract type
  signals.type = patient.type;

  // Detect post-op status
  const allText = [
    signals.concerns,
    signals.problems,
    ...(signals.treatments || []),
    ...(signals.medications || []),
  ].join(' ').toLowerCase();

  signals.isPostOp = allText.includes('post-op') ||
                     allText.includes('postop') ||
                     allText.includes('post op') ||
                     allText.includes('hemilaminectomy') ||
                     allText.includes('laminectomy');

  // Try to detect days since surgery
  const dayMatch = allText.match(/day\s*(\d+)/i);
  if (dayMatch) {
    signals.daysSinceSurgery = parseInt(dayMatch[1]);
  } else if (signals.isPostOp) {
    signals.daysSinceSurgery = 1; // Assume day 1 if post-op but no day specified
  }

  return signals;
}

/**
 * Main function: Auto-detect and apply best matching template
 * Returns the enhanced rounding data with template applied, or original if no match
 */
export function smartAutoFillRoundingData(
  patient: any,
  existingRoundingData?: Partial<SmartRoundingData>
): {
  roundingData: SmartRoundingData;
  templateApplied: RoundingTemplate | null;
  confidence: number;
  reasons: string[];
} {
  const signals = extractPatientSignals(patient);
  const match = detectTemplateMatch(signals);

  if (!match) {
    // No template match - return existing data with defaults
    return {
      roundingData: {
        location: existingRoundingData?.location || 'IP',
        icuCriteria: existingRoundingData?.icuCriteria || '',
        code: existingRoundingData?.code || 'Yellow',
        problems: existingRoundingData?.problems || '',
        diagnosticFindings: existingRoundingData?.diagnosticFindings || '',
        therapeutics: existingRoundingData?.therapeutics || '',
        ivc: existingRoundingData?.ivc || '',
        fluids: existingRoundingData?.fluids || '',
        cri: existingRoundingData?.cri || '',
        overnightDx: existingRoundingData?.overnightDx || '',
        concerns: existingRoundingData?.concerns || '',
        comments: existingRoundingData?.comments || '',
      },
      templateApplied: null,
      confidence: 0,
      reasons: [],
    };
  }

  // Apply template while preserving patient-specific data
  const roundingData = applyTemplateToRoundingData(
    existingRoundingData || {},
    match.template
  );

  return {
    roundingData,
    templateApplied: match.template,
    confidence: match.confidence,
    reasons: match.reasons,
  };
}

/**
 * CARRY-FORWARD ROUNDING
 *
 * INGENIOUS INSIGHT #2: Yesterday's rounding data IS today's template.
 * Instead of re-detecting template every day, carry forward what was there
 * and apply phase-aware adjustments.
 *
 * Day 1: Template detection fills initial data
 * Day 2+: Yesterday's data carries forward with smart phase transitions
 *
 * Phase Transitions:
 * - "MRI tomorrow" in yesterday → "MRI TODAY" + NPO protocol
 * - Post-op Day 1 → Day 2: Suggest weaning pain meds
 * - Discharge criteria met → Flag for discharge
 */
export interface CarryForwardResult {
  roundingData: SmartRoundingData;
  phase: PatientPhase;
  phaseConfidence: number;
  phaseReasons: string[];
  isCarryForward: boolean;
  changesApplied: string[];
}

export function carryForwardRoundingData(
  patientType: 'Surgery' | 'Medical' | 'MRI' | undefined,
  previousRoundingData: Partial<SmartRoundingData> | undefined,
  dayCount: number = 1
): CarryForwardResult {
  const changesApplied: string[] = [];

  // If no previous data, this isn't a carry-forward scenario
  if (!previousRoundingData || Object.keys(previousRoundingData).length === 0) {
    return {
      roundingData: {
        location: 'IP',
        icuCriteria: '',
        code: 'Yellow',
        problems: '',
        diagnosticFindings: '',
        therapeutics: '',
        ivc: '',
        fluids: '',
        cri: '',
        overnightDx: '',
        concerns: '',
        comments: '',
      },
      phase: 'MEDICAL_STABLE',
      phaseConfidence: 0,
      phaseReasons: ['No previous data - fresh start'],
      isCarryForward: false,
      changesApplied: [],
    };
  }

  // Detect phase based on previous data
  const phaseResult = detectPatientPhase(patientType, previousRoundingData, dayCount);

  // Start with yesterday's data
  const roundingData: SmartRoundingData = {
    ...previousRoundingData,
  };

  // Apply phase-specific changes
  if (phaseResult.suggestedChanges) {
    Object.entries(phaseResult.suggestedChanges).forEach(([key, value]) => {
      if (value !== undefined) {
        (roundingData as any)[key] = value;
        changesApplied.push(`Updated ${key} for ${phaseResult.phase}`);
      }
    });
  }

  // Special handling for POST_MRI (MRI was this morning)
  if (phaseResult.phase === 'POST_MRI') {
    // Clear overnight Dx - fresh slate after MRI
    if (roundingData.overnightDx) {
      roundingData.overnightDx = '';
      changesApplied.push('Cleared overnight Dx (MRI done, awaiting plan)');
    }
  }

  // Special handling for PRE_MRI (MRI tomorrow morning)
  if (phaseResult.phase === 'PRE_MRI') {
    // Ensure NPO is in concerns for overnight
    if (!roundingData.concerns?.toLowerCase().includes('npo')) {
      const existingConcerns = roundingData.concerns || '';
      roundingData.concerns = existingConcerns
        ? `${existingConcerns}; NPO from 8pm`
        : 'NPO from 8pm';
      changesApplied.push('Added NPO for MRI tomorrow');
    }
  }

  // Day count increment in comments (optional)
  if (dayCount > 1) {
    const dayLabel = `Day ${dayCount}`;
    if (!roundingData.problems?.includes(dayLabel)) {
      // Don't modify problems directly, but log for awareness
      changesApplied.push(`Patient is on ${dayLabel}`);
    }
  }

  console.log(`[Carry-Forward] Phase: ${phaseResult.phase} (${phaseResult.confidence}% confidence)`);
  console.log(`[Carry-Forward] Reasons: ${phaseResult.reasons.join(', ')}`);
  console.log(`[Carry-Forward] Changes applied: ${changesApplied.join(', ') || 'none'}`);

  return {
    roundingData,
    phase: phaseResult.phase,
    phaseConfidence: phaseResult.confidence,
    phaseReasons: phaseResult.reasons,
    isCarryForward: true,
    changesApplied,
  };
}

/**
 * Smart Rounding: Combines template detection (Day 1) with carry-forward (Day 2+)
 *
 * This is the main entry point that decides:
 * - Day 1 / No previous data → Use template detection
 * - Day 2+ with previous data → Use carry-forward with phase detection
 */
export function smartRounding(
  patient: any,
  previousRoundingData?: Partial<SmartRoundingData>,
  dayCount: number = 1
): CarryForwardResult & { templateApplied: RoundingTemplate | null } {

  // If Day 2+ and we have previous data, use carry-forward
  if (dayCount > 1 && previousRoundingData && Object.keys(previousRoundingData).length > 0) {
    const carryForward = carryForwardRoundingData(
      patient.type,
      previousRoundingData,
      dayCount
    );

    return {
      ...carryForward,
      templateApplied: null, // No new template, just carried forward
    };
  }

  // Day 1 or no previous data: Use template detection
  const templateResult = smartAutoFillRoundingData(patient, previousRoundingData);

  // Detect phase for Day 1
  const phaseResult = detectPatientPhase(patient.type, templateResult.roundingData, dayCount);

  return {
    roundingData: templateResult.roundingData,
    phase: phaseResult.phase,
    phaseConfidence: phaseResult.confidence,
    phaseReasons: phaseResult.reasons,
    isCarryForward: false,
    changesApplied: templateResult.reasons,
    templateApplied: templateResult.templateApplied,
  };
}
