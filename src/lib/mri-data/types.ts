/**
 * TypeScript types for MRI Builder
 */

export type ConditionCategory = 'Brain' | 'Spine';

export type SignalIntensity = 'Hyperintense' | 'Hypointense' | 'Isointense' | 'Variable';

export type Severity = 'Mild' | 'Moderate' | 'Severe';

export type Laterality = 'Left' | 'Right' | 'Bilateral' | 'Midline';

export interface MRISequence {
  name: string;
  abbreviation: string;
  required: boolean;
}

export interface SignalCharacteristics {
  sequence: string;
  intensity: SignalIntensity;
  pattern?: string;
}

export interface FindingVariant {
  id: string;
  name: string;
  description: string;
  modifications: {
    primaryFindings?: string[];
    signalCharacteristics?: SignalCharacteristics[];
    secondaryFindings?: string[];
  };
}

export interface MRIFinding {
  location: string[];
  primaryFindings: string[];
  signalCharacteristics: SignalCharacteristics[];
  secondaryFindings: string[];
  measurements?: string;
  enhancement?: string;
  massEffect?: string;
}

export interface NeurologicalCondition {
  id: string;
  name: string;
  category: ConditionCategory;
  subcategory: string;
  commonBreeds?: string[];
  recommendedSequences: MRISequence[];
  finding: MRIFinding;
  variants?: FindingVariant[];
  differentials: string[];
  clinicalNotes: string;
  recommendations: string[];
}

export interface ReportCustomization {
  selectedCondition: NeurologicalCondition | null;
  selectedLocation: string;
  selectedSeverity: Severity;
  selectedLaterality: Laterality;
  selectedVariants: string[];
  clinicalHistory: string;
  additionalFindings: string;
  customImpression: string;
}

export interface GeneratedReport {
  clinicalHistory: string;
  technique: string;
  findings: string;
  impression: string;
  recommendations: string;
}
