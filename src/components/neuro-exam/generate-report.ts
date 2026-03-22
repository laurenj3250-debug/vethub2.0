import { type LocId, type NeuroExamData } from './types';
import { LOC_NAMES, getDdx } from './constants';

// ─── Format Helpers ──────────────────────────────────────────────────────────

export function fmtReflex(status: string, side: string): string {
  return (status === 'Normal' || status === 'Normal/Increased') ? status : `${status} (${side})`;
}

export function fmtSide(side: string): string {
  return side === 'Bilateral' ? 'bilaterally' : `on the ${side.toLowerCase()}`;
}

export function fmtSideAdj(side: string): string {
  return side === 'Bilateral' ? 'bilateral' : `${side.toLowerCase()}`;
}

export function fmtMentation(mentation: string, agent: string): string {
  if (mentation === 'BAR') return 'BAR';
  if (mentation === 'QAR') return 'Quiet, alert, responsive';
  if (mentation === 'Sedated') return agent ? `Sedated (${agent}), unable to fully assess mentation` : 'Sedated, unable to fully assess mentation';
  return mentation;
}

export function fmtLimb(type: string, side: string): string {
  return side === 'Bilateral' ? `${type} limbs` : `${type} limb`;
}

// ─── Types ───────────────────────────────────────────────────────────────────

export interface NeuroReport {
  text: string;
  problems: string[];
  locLabel: string;
}

export interface ReportSections {
  mental: string;
  gait: string;
  cn: string;
  postural: string;
  reflexes: string;
  tone: string;
  mass: string;
  nociception: string;
}

// ─── Per-Localization Generators ─────────────────────────────────────────────

function generateT3L3(data: NeuroExamData, s: ReportSections, prob: string[]): void {
  if (data.t3l3_gait === 'Normal') {
    s.gait = 'Normal ambulation, no ataxia';
  } else if (data.t3l3_gait === 'Ambulatory') {
    const ataxStr = data.t3l3_ataxia !== 'None' ? ` with ${data.t3l3_ataxia.toLowerCase()} ataxia pelvic limbs` : '';
    s.gait = `Ambulatory paraparesis${ataxStr}. Normal thoracic limb gait`;
    prob.push('Ambulatory paraparesis pelvic limbs');
    if (data.t3l3_ataxia !== 'None') prob.push(`${data.t3l3_ataxia} ataxia pelvic limbs`);
  } else if (data.t3l3_gait === 'Non-Ambulatory') {
    const ataxStr = data.t3l3_ataxia !== 'None' ? ` with ${data.t3l3_ataxia.toLowerCase()} ataxia` : '';
    s.gait = `Non-ambulatory paraparesis${ataxStr}. Normal thoracic limb gait`;
    prob.push('Non-ambulatory paraparesis pelvic limbs');
    if (data.t3l3_ataxia !== 'None') prob.push(`${data.t3l3_ataxia} ataxia pelvic limbs`);
  } else if (data.t3l3_gait === 'Paraplegic') {
    s.gait = 'Paraplegic. No voluntary motor pelvic limbs. Normal thoracic limb gait';
    prob.push('Paraplegia');
    if (data.t3l3_schiff) { s.gait += '. Schiff-Sherrington posture present'; prob.push('Schiff-Sherrington posture'); }
  }

  if (data.t3l3_gait === 'Normal') {
    s.postural = 'Normal all four limbs';
    s.reflexes = 'Normal all four limbs';
    s.tone = 'Normal all four limbs';
    s.mass = 'Normal, symmetric';
  } else {
    if (data.t3l3_postural_tl === 'Normal' && data.t3l3_postural_pl === 'Normal') {
      s.postural = 'Normal all four limbs';
    } else {
      const postPL = data.t3l3_postural_pl === 'Normal' ? 'normal pelvic limbs' : `${data.t3l3_postural_pl.toLowerCase()} ${fmtLimb('pelvic', data.t3l3_postural_pl_side)} (${fmtSideAdj(data.t3l3_postural_pl_side)})`;
      s.postural = `Normal thoracic limbs, ${postPL}`;
      if (data.t3l3_postural_pl !== 'Normal') prob.push(`Postural reaction ${data.t3l3_postural_pl.toLowerCase()} ${fmtLimb('pelvic', data.t3l3_postural_pl_side)} (${fmtSideAdj(data.t3l3_postural_pl_side)})`);
    }

    // Reflexes - gated
    if (data.t3l3_reflexes_gate === 'Normal') {
      s.reflexes = 'Normal to increased pelvic limbs (UMN). Thoracic limb reflexes normal';
    } else {
      const reflexParts = [
        `Patellar: ${fmtReflex(data.t3l3_patellar, data.t3l3_patellar_side)}`,
        `Withdrawal pelvic: ${fmtReflex(data.t3l3_withdrawal_pl, data.t3l3_withdrawal_pl_side)}`,
      ];
      reflexParts.push('Thoracic limb reflexes normal');
      s.reflexes = reflexParts.join('. ');
      if (data.t3l3_patellar !== 'Normal') prob.push(`${data.t3l3_patellar} patellar reflex (${data.t3l3_patellar_side.toLowerCase()})`);
      if (data.t3l3_withdrawal_pl !== 'Normal') prob.push(`${data.t3l3_withdrawal_pl} withdrawal reflex pelvic (${data.t3l3_withdrawal_pl_side.toLowerCase()})`);
    }
    // Perineal -- myelomalacia monitoring (paraplegic only)
    if (data.t3l3_gait === 'Paraplegic') {
      s.reflexes += `. Perineal reflex: ${data.t3l3_perineal.toLowerCase()}`;
      if (data.t3l3_perineal !== 'Normal') prob.push(`${data.t3l3_perineal} perineal reflex (ascending myelomalacia)`);
    }

    s.tone = `Normal thoracic limbs. Pelvic limbs: ${data.t3l3_tone_pl === 'Normal/Increased' ? 'normal to increased (UMN)' : data.t3l3_tone_pl === 'Increased' ? 'increased (UMN)' : 'normal'}`;
    if (data.t3l3_bladder !== 'Normal') {
      s.tone += `. Bladder: large and firm, difficult to express (UMN pattern)`;
      prob.push('UMN bladder dysfunction');
    }

    s.mass = data.t3l3_mass === 'Normal' ? 'Normal, symmetric' : data.t3l3_mass;
    if (data.t3l3_mass !== 'Normal') prob.push(data.t3l3_mass);
  }

  const nocParts: string[] = [];
  if (data.t3l3_gait === 'Paraplegic') {
    nocParts.push(`Deep pain perception ${data.t3l3_dpp === 'Present' ? 'PRESENT' : 'ABSENT'} pelvic limbs`);
    if (data.t3l3_dpp === 'Absent') prob.push('ABSENT deep pain perception pelvic limbs');
  }
  const palpFindings: string[] = [];
  if (data.t3l3_pain) { palpFindings.push('Hyperpathia on palpation of thoracolumbar spine'); prob.push('Thoracolumbar spinal hyperpathia'); }
  if (data.t3l3_kyphosis) { palpFindings.push('Kyphosis noted'); prob.push('Kyphosis'); }
  nocParts.push(palpFindings.length > 0 ? palpFindings.join('. ') : 'No spinal hyperpathia');
  if (data.t3l3_cutoff === 'Cutoff') { nocParts.push(`Cutaneous trunci cutoff at ${data.t3l3_cutoffLevel}`); prob.push(`Cutaneous trunci cutoff at ${data.t3l3_cutoffLevel}`); }
  s.nociception = nocParts.join('. ');
}

function generateC6T2(data: NeuroExamData, s: ReportSections, prob: string[]): void {
  if (data.c6t2_gait === 'Normal') {
    s.gait = 'Normal ambulation, no ataxia';
  } else {
    const gaitDesc = data.c6t2_gait === 'Two-Engine Gait'
      ? `${data.c6t2_amb} two-engine gait (short-strided thoracic, long-strided/ataxic pelvic)`
      : `${data.c6t2_amb} ${data.c6t2_gait.toLowerCase()}`;
    s.gait = gaitDesc;
    prob.push(`${data.c6t2_amb} ${data.c6t2_gait.toLowerCase()}`);
  }

  s.cn = data.c6t2_horner !== 'No' ? `Horner's syndrome (${data.c6t2_horner}). All other cranial nerves normal` : 'No deficits noted';
  if (data.c6t2_horner !== 'No') prob.push(`Horner's syndrome (${data.c6t2_horner})`);

  if (data.c6t2_gait === 'Normal') {
    s.postural = 'Normal all four limbs';
    s.reflexes = 'Normal all four limbs';
    s.tone = 'Normal all four limbs';
    s.mass = 'Normal, symmetric';
  } else {
    if (data.c6t2_postural_tl === 'Normal' && data.c6t2_postural_pl === 'Normal') {
      s.postural = 'Normal all four limbs';
    } else {
      const ptl = data.c6t2_postural_tl === 'Normal' ? 'Normal thoracic limbs' : `Deficits ${fmtLimb('thoracic', data.c6t2_postural_tl_side)} (${fmtSideAdj(data.c6t2_postural_tl_side)})`;
      const ppl = data.c6t2_postural_pl === 'Normal' ? 'normal pelvic limbs' : `deficits ${fmtLimb('pelvic', data.c6t2_postural_pl_side)} (${fmtSideAdj(data.c6t2_postural_pl_side)})`;
      s.postural = `${ptl}, ${ppl}`;
      if (data.c6t2_postural_tl === 'Deficits') prob.push(`Postural reaction deficits ${fmtLimb('thoracic', data.c6t2_postural_tl_side)} (${fmtSideAdj(data.c6t2_postural_tl_side)})`);
      if (data.c6t2_postural_pl === 'Deficits') prob.push(`Postural reaction deficits ${fmtLimb('pelvic', data.c6t2_postural_pl_side)} (${fmtSideAdj(data.c6t2_postural_pl_side)})`);
    }

    if (data.c6t2_reflexes_gate === 'Normal') {
      s.reflexes = 'Normal all four limbs';
    } else {
      s.reflexes = `Thoracic — Withdrawal: ${fmtReflex(data.c6t2_foreReflex, data.c6t2_fore_side)}, Biceps: ${fmtReflex(data.c6t2_biceps, data.c6t2_biceps_side)}, Triceps: ${fmtReflex(data.c6t2_triceps, data.c6t2_triceps_side)} (LMN). Pelvic — reflexes ${data.c6t2_hindReflex} (UMN)`;
      if (data.c6t2_foreReflex !== 'Normal') prob.push(`${data.c6t2_foreReflex} thoracic withdrawal (${data.c6t2_fore_side.toLowerCase()}) — LMN`);
    }

    s.tone = 'Reduced thoracic limb tone (LMN), normal to increased pelvic limb tone (UMN)';
    if (data.c6t2_bladder !== 'Normal') { s.tone += `. Bladder: ${data.c6t2_bladder}`; prob.push('Bladder dysfunction'); }

    s.mass = data.c6t2_atrophy ? `Neurogenic atrophy ${fmtLimb('thoracic', data.c6t2_atrophy_side)} (${fmtSideAdj(data.c6t2_atrophy_side)})` : 'Normal, symmetric';
    if (data.c6t2_atrophy) prob.push(`Neurogenic muscle atrophy ${fmtLimb('thoracic', data.c6t2_atrophy_side)} (${fmtSideAdj(data.c6t2_atrophy_side)})`);
  }
  s.nociception = data.c6t2_palpation === 'None' ? 'No spinal hyperpathia. Intact nociception all limbs' : `${data.c6t2_palpation}. Intact nociception all limbs`;
  if (data.c6t2_palpation !== 'None') prob.push(data.c6t2_palpation);
}

function generateC1C5(data: NeuroExamData, s: ReportSections, prob: string[]): void {
  if (data.c1c5_gait === 'Normal') {
    s.gait = 'Normal ambulation, no ataxia';
  } else if (data.c1c5_gait === 'Ambulatory Tetraparesis') {
    s.gait = `Ambulatory tetraparesis with ${data.c1c5_ataxia.toLowerCase()} ataxia all four limbs`;
    prob.push('Ambulatory tetraparesis', `${data.c1c5_ataxia} ataxia all four limbs`);
  } else if (data.c1c5_gait === 'Non-Amb Tetraparesis') {
    s.gait = `Non-ambulatory tetraparesis with ${data.c1c5_ataxia.toLowerCase()} ataxia`;
    prob.push('Non-ambulatory tetraparesis', `${data.c1c5_ataxia} ataxia all four limbs`);
  } else {
    s.gait = 'Tetraplegic. No voluntary motor all four limbs'; prob.push('Tetraplegia');
  }

  if (data.c1c5_gait === 'Normal') {
    s.postural = 'Normal all four limbs';
    s.reflexes = 'Normal all four limbs';
    s.tone = 'Normal all four limbs';
  } else {
    if (data.c1c5_postural_tl === 'Normal' && data.c1c5_postural_pl === 'Normal') {
      s.postural = 'Normal all four limbs';
    } else {
      const ptlC = data.c1c5_postural_tl === 'Normal' ? 'Normal thoracic limbs' : `Deficits ${fmtLimb('thoracic', data.c1c5_postural_tl_side)} (${fmtSideAdj(data.c1c5_postural_tl_side)})`;
      const pplC = data.c1c5_postural_pl === 'Normal' ? 'normal pelvic limbs' : `deficits ${fmtLimb('pelvic', data.c1c5_postural_pl_side)} (${fmtSideAdj(data.c1c5_postural_pl_side)})`;
      s.postural = `${ptlC}, ${pplC}`;
      if (data.c1c5_postural_tl === 'Deficits') prob.push(`Postural reaction deficits ${fmtLimb('thoracic', data.c1c5_postural_tl_side)} (${fmtSideAdj(data.c1c5_postural_tl_side)})`);
      if (data.c1c5_postural_pl === 'Deficits') prob.push(`Postural reaction deficits ${fmtLimb('pelvic', data.c1c5_postural_pl_side)} (${fmtSideAdj(data.c1c5_postural_pl_side)})`);
    }
    s.reflexes = `${data.c1c5_reflexes} all four limbs (UMN)`;
    s.tone = 'Normal to increased all four limbs (UMN)';
  }
  s.mass = 'Normal, symmetric';

  const nocC: string[] = [];
  if (data.c1c5_palpation !== 'None') { nocC.push(data.c1c5_palpation); prob.push(data.c1c5_palpation); }
  else nocC.push('No cervical hyperpathia');
  if (data.c1c5_respiratory !== 'Normal') { nocC.push(data.c1c5_respiratory); prob.push(data.c1c5_respiratory); }
  s.nociception = nocC.join('. ');
}

function generateL4S3(data: NeuroExamData, s: ReportSections, prob: string[]): void {
  if (data.l4s3_gait === 'Normal') {
    s.gait = 'Normal ambulation, no ataxia';
  } else if (data.l4s3_gait === 'Paraparesis') {
    s.gait = 'Ambulatory paraparesis pelvic limbs with short-strided gait. Normal thoracic limb gait';
    prob.push('Ambulatory paraparesis pelvic limbs (LMN)');
  } else if (data.l4s3_gait === 'Non-Ambulatory') {
    s.gait = 'Non-ambulatory paraparesis. Normal thoracic limb gait';
    prob.push('Non-ambulatory paraparesis pelvic limbs');
  } else {
    s.gait = 'Paraplegic. No voluntary motor pelvic limbs. Normal thoracic limb gait';
    prob.push('Paraplegia');
  }

  if (data.l4s3_gait === 'Normal') {
    s.postural = 'Normal all four limbs';
    s.reflexes = 'Normal all four limbs';
    s.tone = 'Normal all four limbs';
    s.mass = 'Normal, symmetric';
  } else {
    if (data.l4s3_postural_pl === 'Normal') {
      s.postural = 'Normal all four limbs';
    } else {
      const pplL = data.l4s3_postural_pl === 'Deficits' ? `deficits ${fmtLimb('pelvic', data.l4s3_postural_pl_side)} (${fmtSideAdj(data.l4s3_postural_pl_side)})` : 'absent pelvic limbs';
      s.postural = `Normal thoracic limbs, ${pplL}`;
      prob.push(`Postural reaction ${data.l4s3_postural_pl.toLowerCase()} ${fmtLimb('pelvic', data.l4s3_postural_pl_side)}`);
    }

    if (data.l4s3_reflexes_gate === 'Normal') {
      s.reflexes = 'Normal all four limbs';
    } else {
      const refParts = [
        `Patellar: ${fmtReflex(data.l4s3_patellar, data.l4s3_patellar_side)}`,
        `Withdrawal: ${fmtReflex(data.l4s3_withdrawal, data.l4s3_withdrawal_side)}`,
        `Perineal: ${data.l4s3_perineal}`,
      ];
      refParts.push('Thoracic limb reflexes normal');
      s.reflexes = refParts.join('. ');
      if (data.l4s3_patellar !== 'Normal') prob.push(`${data.l4s3_patellar} patellar reflex (${data.l4s3_patellar_side.toLowerCase()})`);
      if (data.l4s3_withdrawal !== 'Normal') prob.push(`${data.l4s3_withdrawal} withdrawal reflex (${data.l4s3_withdrawal_side.toLowerCase()})`);
      if (data.l4s3_perineal !== 'Normal') prob.push(`${data.l4s3_perineal} perineal reflex`);
    }

    let toneStr = `Pelvic limbs: ${data.l4s3_tone} (LMN). Tail/anal tone: ${data.l4s3_tail_tone}`;
    if (data.l4s3_bladder !== 'Normal') { toneStr += `. Bladder: large, flaccid, easily expressed (LMN pattern)`; prob.push('LMN bladder dysfunction'); }
    if (data.l4s3_tail_tone !== 'Normal') prob.push(`${data.l4s3_tail_tone} tail/anal tone`);
    s.tone = `Normal thoracic limbs. ${toneStr}`;

    s.mass = data.l4s3_atrophy ? `Neurogenic atrophy ${fmtLimb('pelvic', data.l4s3_atrophy_side)} (${fmtSideAdj(data.l4s3_atrophy_side)})` : (data.l4s3_mass === 'Normal' ? 'Normal, symmetric' : data.l4s3_mass);
    if (data.l4s3_atrophy) prob.push(`Neurogenic muscle atrophy ${fmtLimb('pelvic', data.l4s3_atrophy_side)} (${fmtSideAdj(data.l4s3_atrophy_side)})`);
  }
  const nocL: string[] = [];
  if (data.l4s3_gait === 'Paraplegic') {
    nocL.push(`Deep pain perception ${data.l4s3_dpp === 'Present' ? 'PRESENT' : 'ABSENT'} pelvic limbs`);
    if (data.l4s3_dpp === 'Absent') prob.push('ABSENT deep pain perception pelvic limbs');
  }
  if (data.l4s3_pain !== 'None') { nocL.push(data.l4s3_pain === 'LS Pain' ? 'Lumbosacral hyperpathia on palpation/tail jack' : data.l4s3_pain); prob.push('Lumbosacral hyperpathia'); }
  else nocL.push('No spinal hyperpathia');
  s.nociception = nocL.join('. ');
}

function generateProsencephalon(data: NeuroExamData, s: ReportSections, prob: string[]): string | undefined {
  const effectiveAmb = (data.pros_mentation === 'Comatose' || data.pros_mentation === 'Stuporous') ? 'Non-Ambulatory' : data.pros_amb;
  const menStr = fmtMentation(data.pros_mentation, data.pros_sedation_agent);
  if (data.pros_mentation === 'Sedated') {
    s.mental = menStr;
  } else {
    const behaviors: string[] = [];
    if (data.pros_behavior.pressing) { behaviors.push('head pressing'); prob.push('Head pressing'); }
    if (data.pros_behavior.hemi) { behaviors.push('hemi-inattention'); prob.push('Hemi-inattention'); }
    if (data.pros_behavior.pacing) { behaviors.push('compulsive pacing'); prob.push('Compulsive pacing'); }
    s.mental = behaviors.length > 0 ? `${menStr}. ${behaviors.join(', ')}` : menStr;
    if (data.pros_mentation !== 'QAR' && data.pros_mentation !== 'BAR') prob.push(`${data.pros_mentation} mentation`);
  }

  if (effectiveAmb === 'Non-Ambulatory') {
    s.gait = 'Non-ambulatory, recumbent';
    prob.push('Non-ambulatory');
  } else {
    s.gait = data.pros_circle !== 'None' ? `Ambulatory, tends to circle to the ${data.pros_circle.toLowerCase()} in enclosure` : 'Ambulatory, no paresis or ataxia';
    if (data.pros_circle !== 'None') prob.push(`Circling to the ${data.pros_circle.toLowerCase()}`);
  }

  const cnFindings: string[] = [];
  if (data.pros_facial !== 'Normal') {
    cnFindings.push(`${data.pros_facial_side} ${data.pros_facial.toLowerCase()}`);
    prob.push(`${data.pros_facial_side} facial ${data.pros_facial.toLowerCase()}`);
  }
  if (data.pros_menace !== 'Normal') {
    cnFindings.push(`${data.pros_menace_side} ${data.pros_menace.toLowerCase()} menace`);
    prob.push(`${data.pros_menace_side} ${data.pros_menace.toLowerCase()} menace`);
  }
  if (data.pros_focal_sz !== 'None') {
    cnFindings.push(`${data.pros_focal_sz_side} ${data.pros_focal_sz} seizures`);
    prob.push(`${data.pros_focal_sz_side} ${data.pros_focal_sz} seizures`);
  }
  if (data.pros_plr !== 'Normal') {
    cnFindings.push(`${data.pros_plr_side} ${data.pros_plr.toLowerCase()} PLR`);
    prob.push(`${data.pros_plr_side} ${data.pros_plr.toLowerCase()} PLR`);
  }
  s.cn = cnFindings.length > 0 ? cnFindings.join(', ') : 'No deficits';

  if (effectiveAmb === 'Non-Ambulatory') {
    s.postural = 'Unable to assess (non-ambulatory)';
  } else if (data.pros_cp === 'Normal') {
    s.postural = 'Normal';
  } else {
    s.postural = `${data.pros_cp_side} decreased hopping`;
    prob.push(`${data.pros_cp_side} decreased hopping`);
  }

  s.reflexes = 'Normal';
  s.tone = 'Normal';
  s.mass = 'Normal';
  s.nociception = 'Intact, no reaction to palpation of the neck or back';

  // Lateralize -- contralateral to deficits, ipsilateral to circling
  const deficitSides: string[] = [];
  if (data.pros_cp === 'Decreased' && effectiveAmb === 'Ambulatory') deficitSides.push(data.pros_cp_side);
  if (data.pros_menace !== 'Normal') deficitSides.push(data.pros_menace_side);
  if (data.pros_facial !== 'Normal') deficitSides.push(data.pros_facial_side);
  if (data.pros_focal_sz !== 'None') deficitSides.push(data.pros_focal_sz_side);
  const uniqueDefSides = [...new Set(deficitSides)];
  if (uniqueDefSides.length > 1) {
    prob.push('Mixed lateralization (deficits on multiple sides) -- review');
  }
  if (uniqueDefSides.length === 1 && uniqueDefSides[0] !== 'Bilateral') {
    const contralateral = uniqueDefSides[0] === 'Left' ? 'Right' : 'Left';
    return `${contralateral} prosencephalon`;
  } else if (data.pros_circle !== 'None' && deficitSides.length === 0) {
    // Circling is ipsilateral to lesion
    return `${data.pros_circle} prosencephalon`;
  }
  return undefined;
}

function generateBrainstem(data: NeuroExamData, s: ReportSections, prob: string[]): void {
  s.mental = fmtMentation(data.bs_mentation, '');
  if (data.bs_mentation !== 'QAR' && data.bs_mentation !== 'BAR') prob.push(`${data.bs_mentation} mentation`);

  // Gait
  if (data.bs_gait === 'Abnormal') {
    const gaitParts: string[] = [];
    if (data.bs_paresis !== 'None') {
      let parStr = data.bs_paresis;
      if (data.bs_paresis === 'Hemiparesis') parStr = `Hemiparesis (${fmtSideAdj(data.bs_paresis_side)})`;
      gaitParts.push(parStr);
      prob.push(parStr);
    }
    if (data.bs_ataxia !== 'None') {
      const atxStr = data.bs_ataxia === 'Vestibular + Proprioceptive' ? 'vestibular and proprioceptive ataxia' : `${data.bs_ataxia.toLowerCase()} ataxia`;
      gaitParts.push(atxStr);
      prob.push(data.bs_ataxia === 'Vestibular + Proprioceptive' ? 'Vestibular and proprioceptive ataxia' : `${data.bs_ataxia} ataxia`);
    }
    s.gait = gaitParts.length > 0 ? gaitParts.join(' with ') : 'Abnormal gait';
  }

  // CN - per-group sides
  const cnItems: string[] = [];
  if (data.bs_cn_eyes === 'Abnormal') {
    const eyeSide = fmtSideAdj(data.bs_cn_eyes_side);
    if (data.bs_cn_menace !== 'Normal') { cnItems.push(`Absent menace (${eyeSide})`); prob.push(`Absent menace (${eyeSide})`); }
    if (data.bs_cn_plr !== 'Normal') { cnItems.push(`Abnormal PLR (${eyeSide})`); prob.push(`Abnormal PLR (${eyeSide})`); }
    if (data.bs_cn_strabismus !== 'Normal') { cnItems.push(`${data.bs_cn_strabismus} strabismus (${eyeSide})`); prob.push(`Strabismus (${eyeSide})`); }
  }
  if (data.bs_cn_vest === 'Abnormal') {
    const vestSide = fmtSideAdj(data.bs_cn_vest_side);
    if (data.bs_cn_pathologic_nyst !== 'None') {
      const nystStr = data.bs_cn_pathologic_nyst === 'Positional'
        ? `Positional ${data.bs_cn_pathologic_nyst_type.toLowerCase()} nystagmus`
        : `Resting ${data.bs_cn_pathologic_nyst_type.toLowerCase()} nystagmus`;
      cnItems.push(nystStr); prob.push(nystStr);
    }
    if (data.bs_cn_physiologic_nyst !== 'Normal') { cnItems.push(`${data.bs_cn_physiologic_nyst} physiologic nystagmus (${vestSide})`); prob.push(`${data.bs_cn_physiologic_nyst} physiologic nystagmus`); }
    if (data.bs_cn_head_tilt !== 'None') { cnItems.push(`Head tilt to the ${data.bs_cn_head_tilt.toLowerCase()}`); prob.push(`Head tilt (${data.bs_cn_head_tilt.toLowerCase()})`); }
  }
  if (data.bs_cn_face === 'Abnormal') {
    const faceSide = fmtSideAdj(data.bs_cn_face_side);
    if (data.bs_cn_jaw !== 'Normal') { cnItems.push(`Reduced jaw tone (CN V motor, ${faceSide})`); prob.push('Reduced jaw tone (CN V motor)'); }
    if (data.bs_cn_facial_sensation !== 'Normal') { cnItems.push(`${data.bs_cn_facial_sensation} facial sensation (CN V sensory, ${faceSide})`); prob.push(`${data.bs_cn_facial_sensation} facial sensation (CN V sensory)`); }
    if (data.bs_cn_facial !== 'Normal') { cnItems.push(`Facial ${data.bs_cn_facial.toLowerCase()} (CN VII, ${faceSide})`); prob.push(`Facial ${data.bs_cn_facial.toLowerCase()} (CN VII)`); }
    if (data.bs_cn_gag !== 'Normal') { cnItems.push(`${data.bs_cn_gag} gag reflex (CN IX/X)`); prob.push(`${data.bs_cn_gag} gag reflex (CN IX/X)`); }
    if (data.bs_cn_tongue !== 'Normal') { cnItems.push(`Tongue ${data.bs_cn_tongue.toLowerCase()} (CN XII)`); prob.push(`Tongue ${data.bs_cn_tongue.toLowerCase()} (CN XII)`); }
  }
  s.cn = cnItems.length > 0 ? cnItems.join('. ') : 'No deficits noted';

  // Postural
  if (data.bs_postural_gate === 'Normal') {
    s.postural = 'Normal all four limbs';
  } else {
    const bsPTL = data.bs_postural_tl === 'Normal' ? 'Normal thoracic limbs' : `Deficits ${fmtLimb('thoracic', data.bs_postural_tl_side)} (${fmtSideAdj(data.bs_postural_tl_side)})`;
    const bsPPL = data.bs_postural_pl === 'Normal' ? 'normal pelvic limbs' : `deficits ${fmtLimb('pelvic', data.bs_postural_pl_side)} (${fmtSideAdj(data.bs_postural_pl_side)})`;
    s.postural = `${bsPTL}, ${bsPPL}`;
    if (data.bs_postural_tl === 'Deficits') prob.push(`Postural reaction deficits ${fmtLimb('thoracic', data.bs_postural_tl_side)} (${fmtSideAdj(data.bs_postural_tl_side)})`);
    if (data.bs_postural_pl === 'Deficits') prob.push(`Postural reaction deficits ${fmtLimb('pelvic', data.bs_postural_pl_side)} (${fmtSideAdj(data.bs_postural_pl_side)})`);
  }

  s.reflexes = 'Normal all four limbs';
  s.tone = 'Normal all four limbs';
  s.mass = 'Normal, symmetric';
  s.nociception = 'No spinal hyperpathia';
}

function generatePeriphVest(data: NeuroExamData, s: ReportSections, prob: string[]): void {
  s.mental = 'Quiet, alert, responsive';

  s.gait = `Vestibular ataxia. Falling/leaning to the ${data.pv_tilt.toLowerCase()}`;
  prob.push('Vestibular ataxia');

  const pvCN: string[] = [];
  pvCN.push(`Head tilt to the ${data.pv_tilt.toLowerCase()}`); prob.push(`Head tilt (${data.pv_tilt.toLowerCase()})`);
  let nystDesc = `${data.pv_nystagmusType} nystagmus (fast phase ${data.pv_nystagmusDir.toLowerCase()})`;
  if (data.pv_positional_nyst) nystDesc += ', positional';
  pvCN.push(nystDesc); prob.push(`${data.pv_nystagmusType} nystagmus`);
  if (data.pv_strabismus !== 'None') { pvCN.push('Positional ventral strabismus'); prob.push('Positional ventral strabismus'); }
  const sympSigns: string[] = [];
  if (data.pv_miosis) sympSigns.push('miosis');
  if (data.pv_enophthalmos) sympSigns.push('enophthalmos');
  if (data.pv_third_eyelid) sympSigns.push('third eyelid protrusion');
  if (sympSigns.length > 0) { pvCN.push(`Ipsilateral ${sympSigns.join(', ')} (sympathetic denervation)`); prob.push(`Sympathetic denervation (${sympSigns.join(', ')})`); }
  if (data.pv_facial !== 'Normal') { pvCN.push(`Facial ${data.pv_facial.toLowerCase()} (CN VII, ipsilateral)`); prob.push('Facial nerve deficit (CN VII)'); }
  s.cn = pvCN.join('. ');

  s.postural = data.pv_proprioception === 'Normal' ? 'Normal all four limbs (proprioception intact)' : 'Deficits noted -- consider central vestibular disease';
  if (data.pv_proprioception !== 'Normal') prob.push('Postural reaction deficits -- atypical for peripheral vestibular');

  s.reflexes = 'Normal all four limbs';
  s.tone = 'Normal all four limbs';
  s.mass = 'Normal, symmetric';
  s.nociception = 'No spinal hyperpathia';
}

function generateCerebellum(data: NeuroExamData, s: ReportSections, prob: string[]): void {
  const sideText = fmtSideAdj(data.cb_side);
  s.mental = fmtMentation(data.cb_mentation, '');
  if (data.cb_mentation !== 'QAR' && data.cb_mentation !== 'BAR') prob.push(`${data.cb_mentation} mentation -- consider brainstem involvement`);

  s.gait = `${data.cb_gait} (${sideText})`;
  prob.push(`${data.cb_gait} (${sideText})`);

  const cbCN: string[] = [];
  if (data.cb_menace === 'Absent') { cbCN.push(`Absent menace response (${fmtSide(data.cb_menace_side)}) with intact PLR and vision -- cerebellar`); prob.push(`Absent menace response (${fmtSide(data.cb_menace_side)})`); }
  if (data.cb_tremor !== 'None') { cbCN.push(`${data.cb_tremor} (${sideText})`); prob.push(`${data.cb_tremor} (${sideText})`); }
  if (data.cb_anisocoria) { cbCN.push('Anisocoria'); prob.push('Anisocoria'); }
  if (data.cb_vestibular) { cbCN.push('Paradoxical vestibular signs (head tilt away from lesion)'); prob.push('Paradoxical vestibular signs'); }
  s.cn = cbCN.length > 0 ? cbCN.join('. ') : 'No deficits noted. PLR intact';

  s.postural = `${data.cb_postural} (${sideText})`;
  if (data.cb_postural !== 'Normal') prob.push(`${data.cb_postural} postural reactions (${sideText})`);
  s.reflexes = 'Normal all four limbs';
  s.tone = 'Normal all four limbs';
  s.mass = 'Normal, symmetric';
  s.nociception = 'No spinal hyperpathia';
}

function generateMultifocal(data: NeuroExamData, s: ReportSections, prob: string[]): void {
  s.mental = fmtMentation(data.mf_mentation, data.mf_sedation_agent);
  if (data.mf_mentation !== 'QAR' && data.mf_mentation !== 'BAR' && data.mf_mentation !== 'Sedated') prob.push(`${data.mf_mentation} mentation`);
  s.gait = data.mf_gait;
  if (data.mf_gait !== 'Normal') prob.push(data.mf_gait);

  // Areas involved
  const areas = Object.entries(data.mf_areas).filter(([, v]) => v).map(([k]) => {
    const labels: Record<string, string> = { prosencephalon: 'Prosencephalon', brainstem: 'Brainstem', cerebellum: 'Cerebellum', vestibular: 'Vestibular', c1c5: 'C1-C5', c6t2: 'C6-T2', t3l3: 'T3-L3', l4s3: 'L4-S3' };
    return labels[k] || k;
  });
  if (areas.length > 0) prob.push(`Multifocal: ${areas.join(', ')}`);

  // CN -- structured when brainstem area selected
  if (data.mf_areas.brainstem) {
    const cnItems: string[] = [];
    if (data.mf_cn_eyes === 'Abnormal') {
      const eyeSide = fmtSideAdj(data.mf_cn_eyes_side);
      if (data.mf_cn_menace !== 'Normal') { cnItems.push(`Absent menace (${eyeSide})`); prob.push(`Absent menace (${eyeSide})`); }
      if (data.mf_cn_plr !== 'Normal') { cnItems.push(`Abnormal PLR (${eyeSide})`); prob.push(`Abnormal PLR (${eyeSide})`); }
      if (data.mf_cn_strabismus !== 'Normal') { cnItems.push(`${data.mf_cn_strabismus} strabismus (${eyeSide})`); prob.push(`Strabismus (${eyeSide})`); }
    }
    if (data.mf_cn_vest === 'Abnormal') {
      const vestSide = fmtSideAdj(data.mf_cn_vest_side);
      if (data.mf_cn_pathologic_nyst !== 'None') {
        const nystStr = data.mf_cn_pathologic_nyst === 'Positional'
          ? `Positional ${data.mf_cn_pathologic_nyst_type.toLowerCase()} nystagmus`
          : `Resting ${data.mf_cn_pathologic_nyst_type.toLowerCase()} nystagmus`;
        cnItems.push(nystStr); prob.push(nystStr);
      }
      if (data.mf_cn_physiologic_nyst !== 'Normal') { cnItems.push(`${data.mf_cn_physiologic_nyst} physiologic nystagmus (${vestSide})`); prob.push(`${data.mf_cn_physiologic_nyst} physiologic nystagmus`); }
      if (data.mf_cn_head_tilt !== 'None') { cnItems.push(`Head tilt to the ${data.mf_cn_head_tilt.toLowerCase()}`); prob.push(`Head tilt (${data.mf_cn_head_tilt.toLowerCase()})`); }
    }
    if (data.mf_cn_face === 'Abnormal') {
      const faceSide = fmtSideAdj(data.mf_cn_face_side);
      if (data.mf_cn_jaw !== 'Normal') { cnItems.push(`Reduced jaw tone (CN V motor, ${faceSide})`); prob.push('Reduced jaw tone (CN V motor)'); }
      if (data.mf_cn_facial_sensation !== 'Normal') { cnItems.push(`${data.mf_cn_facial_sensation} facial sensation (CN V sensory, ${faceSide})`); prob.push(`${data.mf_cn_facial_sensation} facial sensation (CN V sensory)`); }
      if (data.mf_cn_facial !== 'Normal') { cnItems.push(`Facial ${data.mf_cn_facial.toLowerCase()} (CN VII, ${faceSide})`); prob.push(`Facial ${data.mf_cn_facial.toLowerCase()} (CN VII)`); }
      if (data.mf_cn_gag !== 'Normal') { cnItems.push(`${data.mf_cn_gag} gag reflex (CN IX/X)`); prob.push(`${data.mf_cn_gag} gag reflex (CN IX/X)`); }
      if (data.mf_cn_tongue !== 'Normal') { cnItems.push(`Tongue ${data.mf_cn_tongue.toLowerCase()} (CN XII)`); prob.push(`Tongue ${data.mf_cn_tongue.toLowerCase()} (CN XII)`); }
    }
    if (data.mf_cn_detail) cnItems.push(data.mf_cn_detail);
    s.cn = cnItems.length > 0 ? cnItems.join('. ') : 'No deficits noted';
  } else {
    const mfSide = fmtSide(data.mf_cn_side);
    s.cn = data.mf_cn === 'Abnormal' ? `Cranial nerve abnormalities ${mfSide}${data.mf_cn_detail ? ': ' + data.mf_cn_detail : ''}` : 'No deficits noted';
    if (data.mf_cn === 'Abnormal') prob.push(`Cranial nerve deficits (${mfSide})`);
  }

  s.postural = 'Variable deficits -- pattern inconsistent with single lesion';
  s.reflexes = data.mf_reflexes;
  if (data.mf_reflexes !== 'Normal') prob.push(`${data.mf_reflexes} reflexes`);
  s.tone = 'Variable';
  s.mass = data.mf_mass === 'Normal' ? 'Normal, symmetric' : data.mf_mass;
  if (data.mf_mass !== 'Normal') prob.push(data.mf_mass);

  if (data.mf_pain !== 'None') { s.nociception = `${data.mf_pain} pain`; prob.push(`${data.mf_pain} pain/hyperpathia`); }
  else s.nociception = 'No spinal hyperpathia';
  if (data.mf_bladder !== 'Normal') { s.tone += `. Bladder: ${data.mf_bladder}`; prob.push('Bladder dysfunction'); }
}

// ─── Main Function ───────────────────────────────────────────────────────────

export function generateReport(
  activeLoc: LocId,
  data: NeuroExamData,
  ddxSelections: Record<string, boolean>,
  species: 'Dog' | 'Cat',
): NeuroReport {
  const s: ReportSections = {
    mental: 'Quiet, alert, responsive',
    gait: 'Normal ambulation, no ataxia',
    cn: 'No deficits noted',
    postural: 'Normal all four limbs',
    reflexes: 'Normal all four limbs',
    tone: 'Normal all four limbs',
    mass: 'Normal, symmetric',
    nociception: 'No spinal hyperpathia. Intact nociception all limbs',
  };
  const prob: string[] = [];
  let computedLocLabel = LOC_NAMES[activeLoc] || activeLoc;

  if (activeLoc === 't3l3') {
    generateT3L3(data, s, prob);
  } else if (activeLoc === 'c6t2') {
    generateC6T2(data, s, prob);
  } else if (activeLoc === 'c1c5') {
    generateC1C5(data, s, prob);
  } else if (activeLoc === 'l4s3') {
    generateL4S3(data, s, prob);
  } else if (activeLoc === 'prosencephalon') {
    const lateralizedLabel = generateProsencephalon(data, s, prob);
    if (lateralizedLabel) computedLocLabel = lateralizedLabel;
  } else if (activeLoc === 'brainstem') {
    generateBrainstem(data, s, prob);
  } else if (activeLoc === 'periph_vest') {
    if (data.pv_gate === 'Normal') {
      // Normal gate — keep default normal sections
    } else {
      generatePeriphVest(data, s, prob);
    }
  } else if (activeLoc === 'cerebellum') {
    if (data.cb_gate === 'Normal') {
      // Normal gate — keep default normal sections
    } else {
      generateCerebellum(data, s, prob);
    }
  } else if (activeLoc === 'multifocal') {
    generateMultifocal(data, s, prob);
  }

  const uniqueProb = [...new Set(prob)];

  const ddxList = getDdx(activeLoc, species);
  const chosenDdx = ddxList.filter((d: string) => ddxSelections[d]);

  const reportText =
    `NEUROLOGIC EXAM\n` +
    `MENTAL STATUS: ${s.mental}\n` +
    `GAIT & POSTURE: ${s.gait}\n` +
    `CRANIAL NERVES: ${s.cn}\n` +
    `POSTURAL REACTIONS: ${s.postural}\n` +
    `SPINAL REFLEXES: ${s.reflexes}\n` +
    `TONE: ${s.tone}\n` +
    `MUSCLE MASS: ${s.mass}\n` +
    `NOCICEPTION: ${s.nociception}\n` +
    `\nPROBLEM LIST\n` +
    uniqueProb.map((p, i) => `${i + 1}. ${p}`).join('\n') +
    `\n\nNEUROLOCALIZATION: ${computedLocLabel}` +
    (chosenDdx.length > 0 ? `\n\nDIFFERENTIAL DIAGNOSES:\n` + chosenDdx.map((d: string, i: number) => `${i + 1}. ${d}`).join('\n') : '');

  return {
    text: reportText,
    problems: uniqueProb,
    locLabel: computedLocLabel,
  };
}
