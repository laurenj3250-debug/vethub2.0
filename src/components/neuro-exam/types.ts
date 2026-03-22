// ─── Localization IDs ────────────────────────────────────────────────────────

export type LocId =
  | 'prosencephalon'
  | 'brainstem'
  | 'cerebellum'
  | 'periph_vest'
  | 'c1c5'
  | 'c6t2'
  | 't3l3'
  | 'l4s3'
  | 'multifocal';

// ─── Behavioral Signs (Prosencephalon) ───────────────────────────────────────

export interface ProsBehavior {
  pacing: boolean;
  pressing: boolean;
  hemi: boolean;
}

// ─── Multifocal Areas ────────────────────────────────────────────────────────

export interface MfAreas {
  prosencephalon: boolean;
  brainstem: boolean;
  cerebellum: boolean;
  vestibular: boolean;
  c1c5: boolean;
  c6t2: boolean;
  t3l3: boolean;
  l4s3: boolean;
}

// ─── Full Neuro Exam Data (flat — all localizations coexist) ─────────────────

export interface NeuroExamData {
  // ── T3-L3 ──
  t3l3_gait: string;
  t3l3_ataxia: string;
  t3l3_dpp: string;
  t3l3_reflexes_gate: string;
  t3l3_patellar: string;
  t3l3_patellar_side: string;
  t3l3_withdrawal_pl: string;
  t3l3_withdrawal_pl_side: string;
  t3l3_perineal: string;
  t3l3_cutoff: string;
  t3l3_cutoffLevel: string;
  t3l3_pain: boolean;
  t3l3_kyphosis: boolean;
  t3l3_schiff: boolean;
  t3l3_bladder: string;
  t3l3_tone_pl: string;
  t3l3_mass: string;
  t3l3_postural_tl: string;
  t3l3_postural_pl: string;
  t3l3_postural_pl_side: string;

  // ── C6-T2 ──
  c6t2_gait: string;
  c6t2_amb: string;
  c6t2_reflexes_gate: string;
  c6t2_foreReflex: string;
  c6t2_fore_side: string;
  c6t2_hindReflex: string;
  c6t2_hind_side: string;
  c6t2_biceps: string;
  c6t2_biceps_side: string;
  c6t2_triceps: string;
  c6t2_triceps_side: string;
  c6t2_horner: string;
  c6t2_palpation: string;
  c6t2_atrophy: boolean;
  c6t2_atrophy_side: string;
  c6t2_postural_tl: string;
  c6t2_postural_tl_side: string;
  c6t2_postural_pl: string;
  c6t2_postural_pl_side: string;
  c6t2_bladder: string;

  // ── C1-C5 ──
  c1c5_gait: string;
  c1c5_ataxia: string;
  c1c5_reflexes: string;
  c1c5_palpation: string;
  c1c5_respiratory: string;
  c1c5_postural_tl: string;
  c1c5_postural_tl_side: string;
  c1c5_postural_pl: string;
  c1c5_postural_pl_side: string;

  // ── L4-S3 ──
  l4s3_gait: string;
  l4s3_dpp: string;
  l4s3_reflexes_gate: string;
  l4s3_patellar: string;
  l4s3_patellar_side: string;
  l4s3_withdrawal: string;
  l4s3_withdrawal_side: string;
  l4s3_perineal: string;
  l4s3_tone: string;
  l4s3_tail_tone: string;
  l4s3_bladder: string;
  l4s3_pain: string;
  l4s3_atrophy: boolean;
  l4s3_atrophy_side: string;
  l4s3_mass: string;
  l4s3_postural_pl: string;
  l4s3_postural_pl_side: string;

  // ── Prosencephalon ──
  pros_mentation: string;
  pros_sedation_agent: string;
  pros_amb: string;
  pros_cp: string;
  pros_cp_side: string;
  pros_behavior: ProsBehavior;
  pros_circle: string;
  pros_menace: string;
  pros_menace_side: string;
  pros_facial: string;
  pros_facial_side: string;
  pros_focal_sz: string;
  pros_focal_sz_side: string;
  pros_plr: string;
  pros_plr_side: string;

  // ── Brainstem ──
  bs_mentation: string;
  bs_gait: string;
  bs_paresis: string;
  bs_paresis_side: string;
  bs_ataxia: string;
  bs_cn_eyes: string;
  bs_cn_eyes_side: string;
  bs_cn_menace: string;
  bs_cn_plr: string;
  bs_cn_strabismus: string;
  bs_cn_vest: string;
  bs_cn_vest_side: string;
  bs_cn_physiologic_nyst: string;
  bs_cn_pathologic_nyst: string;
  bs_cn_pathologic_nyst_type: string;
  bs_cn_head_tilt: string;
  bs_cn_face: string;
  bs_cn_face_side: string;
  bs_cn_jaw: string;
  bs_cn_facial_sensation: string;
  bs_cn_facial: string;
  bs_cn_gag: string;
  bs_cn_tongue: string;
  bs_postural_gate: string;
  bs_postural_tl: string;
  bs_postural_tl_side: string;
  bs_postural_pl: string;
  bs_postural_pl_side: string;

  // ── Peripheral Vestibular ──
  pv_gate: string;
  pv_tilt: string;
  pv_nystagmusType: string;
  pv_nystagmusDir: string;
  pv_positional_nyst: boolean;
  pv_strabismus: string;
  pv_miosis: boolean;
  pv_enophthalmos: boolean;
  pv_third_eyelid: boolean;
  pv_facial: string;
  pv_proprioception: string;

  // ── Cerebellum ──
  cb_gate: string;
  cb_mentation: string;
  cb_gait: string;
  cb_side: string;
  cb_tremor: string;
  cb_menace: string;
  cb_menace_side: string;
  cb_anisocoria: boolean;
  cb_postural: string;
  cb_vestibular: boolean;

  // ── Multifocal ──
  mf_areas: MfAreas;
  mf_mentation: string;
  mf_sedation_agent: string;
  mf_gait: string;
  mf_cn: string;
  mf_cn_detail: string;
  mf_cn_side: string;
  mf_cn_eyes: string;
  mf_cn_eyes_side: string;
  mf_cn_menace: string;
  mf_cn_plr: string;
  mf_cn_strabismus: string;
  mf_cn_vest: string;
  mf_cn_vest_side: string;
  mf_cn_physiologic_nyst: string;
  mf_cn_pathologic_nyst: string;
  mf_cn_pathologic_nyst_type: string;
  mf_cn_head_tilt: string;
  mf_cn_face: string;
  mf_cn_face_side: string;
  mf_cn_jaw: string;
  mf_cn_facial_sensation: string;
  mf_cn_facial: string;
  mf_cn_gag: string;
  mf_cn_tongue: string;
  mf_reflexes: string;
  mf_pain: string;
  mf_bladder: string;
  mf_mass: string;
}

// ─── Exam State (persisted to DB) ────────────────────────────────────────────

export interface LocExamState {
  version: 2;
  activeLoc: LocId;
  species: 'Dog' | 'Cat';
  data: NeuroExamData;
  reportLocked: boolean;
  report: string;
  ddxSelections: Record<string, boolean>;
}

// ─── Template ────────────────────────────────────────────────────────────────

export interface LocTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  localization: LocId;
  species?: 'Dog' | 'Cat';
  data: Partial<NeuroExamData>;
}
