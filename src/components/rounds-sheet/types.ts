// Spec v4 §13 — exact schema match
export interface RoundsPatient {
  time: string;
  name: string;
  owner: string;
  species: string;
  acct?: string;
  dx: string;
  surgery: string;
  imaging: string;
  imagingLink?: string;
  lastVisit: string;
  meds: string;
  needsToday: string;
  lastCBC: string;
  lastChem?: string;
  lastThyroid?: string;
  lastPhenoDate?: string;
  lastPhenoVal?: string;
  lastKBrDate?: string;
  lastKBrVal?: string;
  bromideOnly?: boolean;
  onKBr?: boolean;
  isCytosar?: boolean;
  resultsBox?: ResultsBoxItem[];
  isYellow?: boolean;
  isBlank?: boolean;
  isStub?: boolean;
}

export interface ResultsBoxItem {
  label: string;
  val: string;
  flag?: string;
  isPending?: boolean;
}

export type VisitType = 'medmgmt' | 'postop' | 'consult';

export interface VisitTypeColors {
  stripe: string;
  bg: string;
  border: string;
  text: string;
}

export interface ThemePreset {
  name: string;
  hd: string;
  evL: string;
  evR: string;
  odL: string;
  odR: string;
  lb: string;
  cn: string;
  gradient: string;
}

export interface Sticker {
  id: string;
  emoji: string;
  x: number;
  y: number;
  size: number;
  opacity: number;
  rotation: number;
}
