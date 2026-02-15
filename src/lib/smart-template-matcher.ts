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
