'use client';

import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { AlertTriangle, ShieldAlert, RotateCcw } from 'lucide-react';
import { type LocId, type LocExamState } from './types';
import { LOC_NAMES, LOC_NAV, getDdx } from './constants';
import { LocToggle } from './LocToggle';
import { LocCheckButton } from './LocCheckButton';
import { LocSideSelector } from './LocSideSelector';
import { LocButton } from './LocButton';
import { SectionDivider } from './SectionDivider';
import { ReportPanel } from './ReportPanel';

// ─── Format Helpers ──────────────────────────────────────────────────────────

function fmtReflex(status: string, side: string): string {
  return (status === 'Normal' || status === 'Normal/Increased') ? status : `${status} (${side})`;
}

function fmtSide(side: string): string {
  return side === 'Bilateral' ? 'bilaterally' : `on the ${side.toLowerCase()}`;
}

function fmtSideAdj(side: string): string {
  return side === 'Bilateral' ? 'bilateral' : `${side.toLowerCase()}`;
}

function fmtMentation(mentation: string, agent: string): string {
  if (mentation === 'BAR') return 'BAR';
  if (mentation === 'QAR') return 'Quiet, alert, responsive';
  if (mentation === 'Sedated') return agent ? `Sedated (${agent}), unable to fully assess mentation` : 'Sedated, unable to fully assess mentation';
  return mentation;
}

function fmtLimb(type: string, side: string): string {
  return side === 'Bilateral' ? `${type} limbs` : `${type} limb`;
}

// ─── Props ───────────────────────────────────────────────────────────────────

interface NeuroLocFilterProps {
  examState: LocExamState;
  setActiveLoc: (loc: LocId) => void;
  setSpecies: (species: 'Dog' | 'Cat') => void;
  updateData: (key: string, value: any) => void;
  updateCheckbox: (group: string, key: string) => void;
  setReportLocked: (locked: boolean) => void;
  setReport: (text: string) => void;
  setDdxSelections: (sel: Record<string, boolean>) => void;
  resetToNormal: () => void;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function NeuroLocFilter({
  examState,
  setActiveLoc,
  setSpecies,
  updateData,
  updateCheckbox,
  setReportLocked,
  setReport,
  setDdxSelections,
  resetToNormal,
}: NeuroLocFilterProps) {
  const [copied, setCopied] = useState(false);
  const [problems, setProblems] = useState<string[]>([]);
  const [locLabel, setLocLabel] = useState('');

  const data = examState.data;
  const activeLoc = examState.activeLoc;
  const species = examState.species;
  const effectiveAmb = (data.pros_mentation === 'Comatose' || data.pros_mentation === 'Stuporous') ? 'Non-Ambulatory' : data.pros_amb;

  // ─── DDx Management ──────────────────────────────────────────────────────

  const ddxList = useMemo(() => getDdx(activeLoc, species), [activeLoc, species]);

  const prevLocRef = useRef<{ loc: string; species: string } | null>(null);

  useEffect(() => {
    const prev = prevLocRef.current;
    const changed = !prev || prev.loc !== activeLoc || prev.species !== species;
    prevLocRef.current = { loc: activeLoc, species: species };

    if (changed) {
      // First mount with existing selections from DB — don't reset
      if (!prev && Object.keys(examState.ddxSelections).length > 0) {
        return;
      }
      setDdxSelections(Object.fromEntries(ddxList.map((d: string) => [d, true])));
    }
  }, [activeLoc, species, ddxList, setDdxSelections, examState.ddxSelections]);

  // ─── Report Generation ───────────────────────────────────────────────────

  useEffect(() => {
    if (examState.reportLocked) return;

    const s = {
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

    // ═══════════════════════ T3-L3 ═══════════════════════════════════════════
    if (activeLoc === 't3l3') {
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

    // ═══════════════════════ C6-T2 ═══════════════════════════════════════════
    } else if (activeLoc === 'c6t2') {
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

    // ═══════════════════════ C1-C5 ═══════════════════════════════════════════
    } else if (activeLoc === 'c1c5') {
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

    // ═══════════════════════ L4-S3 ═══════════════════════════════════════════
    } else if (activeLoc === 'l4s3') {
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

    // ═══════════════════════ PROSENCEPHALON ═══════════════════════════════════
    } else if (activeLoc === 'prosencephalon') {
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
        computedLocLabel = `${contralateral} prosencephalon`;
      } else if (data.pros_circle !== 'None' && deficitSides.length === 0) {
        // Circling is ipsilateral to lesion
        computedLocLabel = `${data.pros_circle} prosencephalon`;
      }

    // ═══════════════════════ BRAINSTEM ════════════════════════════════════════
    } else if (activeLoc === 'brainstem') {
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

    // ═══════════════════════ PERIPH VESTIBULAR ═══════════════════════════════
    } else if (activeLoc === 'periph_vest') {
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

    // ═══════════════════════ CEREBELLUM ═══════════════════════════════════════
    } else if (activeLoc === 'cerebellum') {
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

    // ═══════════════════════ MULTIFOCAL ═══════════════════════════════════════
    } else if (activeLoc === 'multifocal') {
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

    const uniqueProb = [...new Set(prob)];

    const chosenDdx = ddxList.filter((d: string) => examState.ddxSelections[d]);

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

    setReport(reportText);
    setProblems(uniqueProb);
    setLocLabel(computedLocLabel);
    setCopied(false);
  }, [data, activeLoc, examState.ddxSelections, ddxList, examState.reportLocked, setReport]);

  // ─── Copy to Clipboard ───────────────────────────────────────────────────

  const copyToClipboard = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(examState.report);
    } catch {
      const el = document.createElement('textarea');
      el.value = examState.report;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [examState.report]);

  // ─── DDx Toggle Handlers ─────────────────────────────────────────────────

  const handleDdxToggle = useCallback((ddx: string) => {
    setDdxSelections({
      ...examState.ddxSelections,
      [ddx]: !examState.ddxSelections[ddx],
    });
  }, [examState.ddxSelections, setDdxSelections]);

  const handleDdxToggleAll = useCallback(() => {
    const allSelected = ddxList.every((d: string) => examState.ddxSelections[d]);
    setDdxSelections(Object.fromEntries(ddxList.map((d: string) => [d, !allSelected])));
  }, [ddxList, examState.ddxSelections, setDdxSelections]);

  // ─── JSX ─────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-6xl mx-auto">
      {/* Localization Nav Buttons */}
      <div className="relative mb-4">
        <div className="flex gap-2 overflow-x-auto pb-2 scroll-smooth lg:grid lg:grid-cols-9 lg:overflow-visible lg:pb-0 snap-x snap-mandatory lg:snap-none">
          {LOC_NAV.map((loc) => (
            <div key={loc.id} className="snap-start">
              <LocButton
                id={loc.id}
                label={loc.label}
                sub={loc.sub}
                active={activeLoc === loc.id}
                onClick={() => setActiveLoc(loc.id)}
              />
            </div>
          ))}
        </div>
        {/* Scroll fade hint — mobile only */}
        <div className="absolute right-0 top-0 bottom-2 w-8 bg-gradient-to-l from-[#FFF8F0] to-transparent pointer-events-none lg:hidden" />
      </div>

      {/* Species + Reset Bar */}
      <div className="flex items-center gap-3 mb-6">
        <LocToggle
          label="Species"
          options={['Dog', 'Cat']}
          value={species}
          onChange={(v) => setSpecies(v as 'Dog' | 'Cat')}
          compact
        />
        <button
          type="button"
          onClick={resetToNormal}
          className="min-h-[44px] px-4 rounded-xl border-2 border-gray-200 text-sm font-semibold text-gray-500 hover:border-gray-400 transition-all active:scale-95 flex items-center gap-2"
        >
          <RotateCcw size={14} />
          Reset to Normal
        </button>
      </div>

      {/* Main Grid: Findings + Report */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Findings Panel (2 cols on desktop) */}
        <div className="lg:col-span-2">
          <div className="bg-white border-2 border-black rounded-xl shadow-[2px_2px_0_#000] p-6">
            <div className="flex items-center justify-between mb-4 pb-3 border-b-2 border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">{LOC_NAMES[activeLoc]}</h2>
            </div>

            {/* ═══ T3-L3 ═══ */}
            {activeLoc === 't3l3' && (
              <div className="space-y-5">
                <LocToggle label="Pelvic Gait Status" options={['Normal', 'Ambulatory', 'Non-Ambulatory', 'Paraplegic']} value={data.t3l3_gait} onChange={(v) => updateData('t3l3_gait', v)} />
                {(data.t3l3_gait === 'Ambulatory' || data.t3l3_gait === 'Non-Ambulatory') && (
                  <LocToggle label="Ataxia Type" options={['Proprioceptive', 'None']} value={data.t3l3_ataxia} onChange={(v) => updateData('t3l3_ataxia', v)} />
                )}

                {data.t3l3_gait === 'Paraplegic' && (
                  <div className="bg-[#FFD6D6] border-2 border-black rounded-xl p-3 text-sm font-bold text-gray-900 flex items-center gap-2">
                    <ShieldAlert size={18} />
                    <span>CRITICAL: Deep Pain Perception</span>
                  </div>
                )}
                {data.t3l3_gait === 'Paraplegic' && (
                  <LocToggle options={['Present', 'Absent']} value={data.t3l3_dpp} onChange={(v) => updateData('t3l3_dpp', v)} warning={data.t3l3_dpp === 'Absent'} />
                )}

                {data.t3l3_gait === 'Paraplegic' && (
                  <LocCheckButton checked={data.t3l3_schiff} onChange={() => updateData('t3l3_schiff', !data.t3l3_schiff)} label="Schiff-Sherrington Posture" />
                )}

                {data.t3l3_gait !== 'Normal' && (<>
                  <SectionDivider label="Postural Reactions" />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <LocToggle label="Thoracic Limbs" options={['Normal', 'Deficits']} value={data.t3l3_postural_tl} onChange={(v) => updateData('t3l3_postural_tl', v)} />
                    <div>
                      <LocToggle label="Pelvic Limbs" options={['Normal', 'Deficits', 'Absent']} value={data.t3l3_postural_pl} onChange={(v) => updateData('t3l3_postural_pl', v)} />
                      {data.t3l3_postural_pl !== 'Normal' && <LocSideSelector value={data.t3l3_postural_pl_side} onChange={(v) => updateData('t3l3_postural_pl_side', v)} />}
                    </div>
                  </div>

                  <SectionDivider label="Spinal Reflexes" />
                  <LocToggle label="Spinal Reflexes" options={['Normal', 'Abnormal']} value={data.t3l3_reflexes_gate} onChange={(v) => updateData('t3l3_reflexes_gate', v)} />
                  {data.t3l3_reflexes_gate === 'Abnormal' && (
                    <div className="pl-4 border-l-2 border-gray-200 space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <LocToggle label="Patellar Reflex" options={['Normal', 'Increased']} value={data.t3l3_patellar} onChange={(v) => updateData('t3l3_patellar', v)} />
                          {data.t3l3_patellar !== 'Normal' && <LocSideSelector value={data.t3l3_patellar_side} onChange={(v) => updateData('t3l3_patellar_side', v)} />}
                        </div>
                        <div>
                          <LocToggle label="Withdrawal (Pelvic)" options={['Normal', 'Increased']} value={data.t3l3_withdrawal_pl} onChange={(v) => updateData('t3l3_withdrawal_pl', v)} />
                          {data.t3l3_withdrawal_pl !== 'Normal' && <LocSideSelector value={data.t3l3_withdrawal_pl_side} onChange={(v) => updateData('t3l3_withdrawal_pl_side', v)} />}
                        </div>
                      </div>
                    </div>
                  )}
                  {data.t3l3_gait === 'Paraplegic' && (
                    <div className="pl-4 border-l-2 border-gray-200 space-y-2 mt-2">
                      <div className="bg-[#FFF3CD] border-2 border-black rounded-xl p-3 text-sm font-semibold text-gray-900 flex items-center gap-2">
                        <AlertTriangle size={16} />
                        Myelomalacia Monitoring
                      </div>
                      <LocToggle label="Perineal Reflex" options={['Normal', 'Reduced', 'Absent']} value={data.t3l3_perineal} onChange={(v) => updateData('t3l3_perineal', v)} />
                    </div>
                  )}
                </>)}

                <SectionDivider label="Nociception & Palpation" />
                {data.t3l3_gait !== 'Normal' && (
                  <div>
                    <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-1.5">Cutaneous Trunci</div>
                    <div className="flex items-center gap-3">
                      <LocToggle options={['Normal', 'Cutoff']} value={data.t3l3_cutoff} onChange={(v) => updateData('t3l3_cutoff', v)} compact />
                      {data.t3l3_cutoff === 'Cutoff' && (
                        <input
                          type="text"
                          className="w-20 p-2 rounded-xl text-sm border-2 border-gray-200 text-gray-900 bg-white"
                          value={data.t3l3_cutoffLevel}
                          onChange={(e) => updateData('t3l3_cutoffLevel', e.target.value)}
                        />
                      )}
                    </div>
                  </div>
                )}
                <div className="flex flex-wrap gap-2">
                  <LocCheckButton checked={data.t3l3_pain} onChange={() => updateData('t3l3_pain', !data.t3l3_pain)} label="Thoracolumbar Hyperpathia" />
                  <LocCheckButton checked={data.t3l3_kyphosis} onChange={() => updateData('t3l3_kyphosis', !data.t3l3_kyphosis)} label="Kyphosis" />
                </div>

                {data.t3l3_gait !== 'Normal' && (<>
                  <SectionDivider label="Tone & Bladder" />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <LocToggle label="Pelvic Limb Tone" options={['Normal', 'Normal/Increased', 'Increased']} value={data.t3l3_tone_pl} onChange={(v) => updateData('t3l3_tone_pl', v)} />
                    <LocToggle label="Bladder" options={['Normal', 'Large/Firm (UMN)']} value={data.t3l3_bladder} onChange={(v) => updateData('t3l3_bladder', v)} />
                  </div>
                  <LocToggle label="Muscle Mass" options={['Normal', 'Disuse Atrophy', 'Neurogenic Atrophy']} value={data.t3l3_mass} onChange={(v) => updateData('t3l3_mass', v)} />
                </>)}
              </div>
            )}

            {/* ═══ C6-T2 ═══ */}
            {activeLoc === 'c6t2' && (
              <div className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <LocToggle label="Gait Pattern" options={['Normal', 'Two-Engine Gait', 'Tetraparesis', 'Hemiparesis']} value={data.c6t2_gait} onChange={(v) => updateData('c6t2_gait', v)} />
                  {data.c6t2_gait !== 'Normal' && <LocToggle label="Ambulatory Status" options={['Ambulatory', 'Non-Ambulatory']} value={data.c6t2_amb} onChange={(v) => updateData('c6t2_amb', v)} />}
                </div>
                {data.c6t2_gait !== 'Normal' && (<>
                  <SectionDivider label="Postural Reactions" />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <LocToggle label="Thoracic Limbs" options={['Normal', 'Deficits']} value={data.c6t2_postural_tl} onChange={(v) => updateData('c6t2_postural_tl', v)} />
                      {data.c6t2_postural_tl === 'Deficits' && <LocSideSelector value={data.c6t2_postural_tl_side} onChange={(v) => updateData('c6t2_postural_tl_side', v)} />}
                    </div>
                    <div>
                      <LocToggle label="Pelvic Limbs" options={['Normal', 'Deficits']} value={data.c6t2_postural_pl} onChange={(v) => updateData('c6t2_postural_pl', v)} />
                      {data.c6t2_postural_pl === 'Deficits' && <LocSideSelector value={data.c6t2_postural_pl_side} onChange={(v) => updateData('c6t2_postural_pl_side', v)} />}
                    </div>
                  </div>
                  <SectionDivider label="Spinal Reflexes" />
                  <LocToggle label="Spinal Reflexes" options={['Normal', 'Abnormal']} value={data.c6t2_reflexes_gate} onChange={(v) => updateData('c6t2_reflexes_gate', v)} />
                  {data.c6t2_reflexes_gate === 'Abnormal' && (
                    <div className="pl-4 border-l-2 border-gray-200 space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <LocToggle label="Thoracic Withdrawal" options={['Normal', 'Reduced', 'Absent']} value={data.c6t2_foreReflex} onChange={(v) => updateData('c6t2_foreReflex', v)} />
                          {data.c6t2_foreReflex !== 'Normal' && <LocSideSelector value={data.c6t2_fore_side} onChange={(v) => updateData('c6t2_fore_side', v)} />}
                        </div>
                        <LocToggle label="Pelvic Reflexes" options={['Normal/Increased', 'Increased']} value={data.c6t2_hindReflex} onChange={(v) => updateData('c6t2_hindReflex', v)} />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <LocToggle label="Biceps Reflex" options={['Normal', 'Reduced', 'Absent']} value={data.c6t2_biceps} onChange={(v) => updateData('c6t2_biceps', v)} />
                          {data.c6t2_biceps !== 'Normal' && <LocSideSelector value={data.c6t2_biceps_side} onChange={(v) => updateData('c6t2_biceps_side', v)} />}
                        </div>
                        <div>
                          <LocToggle label="Triceps Reflex" options={['Normal', 'Reduced', 'Absent']} value={data.c6t2_triceps} onChange={(v) => updateData('c6t2_triceps', v)} />
                          {data.c6t2_triceps !== 'Normal' && <LocSideSelector value={data.c6t2_triceps_side} onChange={(v) => updateData('c6t2_triceps_side', v)} />}
                        </div>
                      </div>
                    </div>
                  )}
                  <div className="flex flex-wrap gap-3 items-center">
                    <LocCheckButton checked={data.c6t2_atrophy} onChange={() => updateData('c6t2_atrophy', !data.c6t2_atrophy)} label="Neurogenic Atrophy (TL)" color="amber" />
                    {data.c6t2_atrophy && <LocSideSelector value={data.c6t2_atrophy_side} onChange={(v) => updateData('c6t2_atrophy_side', v)} />}
                  </div>
                  <LocToggle label="Bladder" options={['Normal', 'Large/Firm (UMN)', 'Large/Flaccid (LMN)']} value={data.c6t2_bladder} onChange={(v) => updateData('c6t2_bladder', v)} />
                </>)}
                <SectionDivider label="Palpation & Cranial Nerves" />
                <LocToggle label="Horner's Syndrome" options={['No', 'Left', 'Right']} value={data.c6t2_horner} onChange={(v) => updateData('c6t2_horner', v)} />
                <LocToggle label="Neck Palpation" options={['None', 'Pain on Palpation', 'Pain on Extension', 'Root Signature Left', 'Root Signature Right']} value={data.c6t2_palpation} onChange={(v) => updateData('c6t2_palpation', v)} />
              </div>
            )}

            {/* ═══ C1-C5 ═══ */}
            {activeLoc === 'c1c5' && (
              <div className="space-y-5">
                <LocToggle label="Gait" options={['Normal', 'Ambulatory Tetraparesis', 'Non-Amb Tetraparesis', 'Tetraplegic']} value={data.c1c5_gait} onChange={(v) => updateData('c1c5_gait', v)} />
                {(data.c1c5_gait === 'Ambulatory Tetraparesis' || data.c1c5_gait === 'Non-Amb Tetraparesis') && (
                  <LocToggle label="Ataxia Type" options={['Proprioceptive', 'Proprioceptive + Vestibular']} value={data.c1c5_ataxia} onChange={(v) => updateData('c1c5_ataxia', v)} />
                )}
                {data.c1c5_gait !== 'Normal' && (<>
                  <SectionDivider label="Postural Reactions" />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <LocToggle label="Thoracic Limbs" options={['Normal', 'Deficits']} value={data.c1c5_postural_tl} onChange={(v) => updateData('c1c5_postural_tl', v)} />
                      {data.c1c5_postural_tl === 'Deficits' && <LocSideSelector value={data.c1c5_postural_tl_side} onChange={(v) => updateData('c1c5_postural_tl_side', v)} />}
                    </div>
                    <div>
                      <LocToggle label="Pelvic Limbs" options={['Normal', 'Deficits']} value={data.c1c5_postural_pl} onChange={(v) => updateData('c1c5_postural_pl', v)} />
                      {data.c1c5_postural_pl === 'Deficits' && <LocSideSelector value={data.c1c5_postural_pl_side} onChange={(v) => updateData('c1c5_postural_pl_side', v)} />}
                    </div>
                  </div>
                  <SectionDivider label="Reflexes" />
                  <LocToggle label="Reflexes (All Limbs)" options={['Normal/Increased', 'Increased']} value={data.c1c5_reflexes} onChange={(v) => updateData('c1c5_reflexes', v)} />
                </>)}
                <SectionDivider label="Palpation" />
                <LocToggle label="Cervical Palpation" options={['None', 'Cervical Pain', 'Guarding/Rigid', 'Ventroflexion']} value={data.c1c5_palpation} onChange={(v) => updateData('c1c5_palpation', v)} />
                <LocToggle label="Respiratory" options={['Normal', 'Dyspnea (Phrenic Nerve C5-7)', 'Irregular Pattern']} value={data.c1c5_respiratory} onChange={(v) => updateData('c1c5_respiratory', v)} />
              </div>
            )}

            {/* ═══ L4-S3 ═══ */}
            {activeLoc === 'l4s3' && (
              <div className="space-y-5">
                <LocToggle label="Pelvic Gait" options={['Normal', 'Paraparesis', 'Non-Ambulatory', 'Paraplegic']} value={data.l4s3_gait} onChange={(v) => updateData('l4s3_gait', v)} />
                {data.l4s3_gait === 'Paraplegic' && (
                  <div className="bg-[#FFD6D6] border-2 border-black rounded-xl p-3 text-sm font-bold text-gray-900 flex items-center gap-2">
                    <ShieldAlert size={18} />
                    <span>Deep Pain Perception</span>
                  </div>
                )}
                {data.l4s3_gait === 'Paraplegic' && (
                  <LocToggle options={['Present', 'Absent']} value={data.l4s3_dpp} onChange={(v) => updateData('l4s3_dpp', v)} warning={data.l4s3_dpp === 'Absent'} />
                )}
                {data.l4s3_gait !== 'Normal' && (<>
                  <SectionDivider label="Postural Reactions" />
                  <div>
                    <LocToggle label="Pelvic Limbs" options={['Normal', 'Deficits', 'Absent']} value={data.l4s3_postural_pl} onChange={(v) => updateData('l4s3_postural_pl', v)} />
                    {data.l4s3_postural_pl !== 'Normal' && <LocSideSelector value={data.l4s3_postural_pl_side} onChange={(v) => updateData('l4s3_postural_pl_side', v)} />}
                  </div>
                  <SectionDivider label="Spinal Reflexes" />
                  <LocToggle label="Spinal Reflexes" options={['Normal', 'Abnormal']} value={data.l4s3_reflexes_gate} onChange={(v) => updateData('l4s3_reflexes_gate', v)} />
                  {data.l4s3_reflexes_gate === 'Abnormal' && (
                    <div className="pl-4 border-l-2 border-gray-200 space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <LocToggle label="Patellar (Femoral L4-6)" options={['Absent', 'Reduced', 'Normal', 'Increased']} value={data.l4s3_patellar} onChange={(v) => updateData('l4s3_patellar', v)} />
                          {data.l4s3_patellar !== 'Normal' && <LocSideSelector value={data.l4s3_patellar_side} onChange={(v) => updateData('l4s3_patellar_side', v)} />}
                        </div>
                        <div>
                          <LocToggle label="Withdrawal (Sciatic L6-S2)" options={['Absent', 'Reduced', 'Normal']} value={data.l4s3_withdrawal} onChange={(v) => updateData('l4s3_withdrawal', v)} />
                          {data.l4s3_withdrawal !== 'Normal' && <LocSideSelector value={data.l4s3_withdrawal_side} onChange={(v) => updateData('l4s3_withdrawal_side', v)} />}
                        </div>
                      </div>
                      <LocToggle label="Perineal Reflex (S1-S3)" options={['Normal', 'Reduced', 'Absent']} value={data.l4s3_perineal} onChange={(v) => updateData('l4s3_perineal', v)} />
                    </div>
                  )}
                  <SectionDivider label="Tone & Bladder" />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <LocToggle label="Pelvic Limb Tone" options={['Normal', 'Reduced', 'Flaccid']} value={data.l4s3_tone} onChange={(v) => updateData('l4s3_tone', v)} />
                    <LocToggle label="Tail/Anal Tone" options={['Normal', 'Reduced', 'Flaccid']} value={data.l4s3_tail_tone} onChange={(v) => updateData('l4s3_tail_tone', v)} />
                  </div>
                  <LocToggle label="Bladder" options={['Normal', 'Large/Flaccid (LMN)']} value={data.l4s3_bladder} onChange={(v) => updateData('l4s3_bladder', v)} />
                  <div className="flex flex-wrap gap-3 items-center">
                    <LocCheckButton checked={data.l4s3_atrophy} onChange={() => updateData('l4s3_atrophy', !data.l4s3_atrophy)} label="Neurogenic Atrophy (PL)" color="amber" />
                    {data.l4s3_atrophy && <LocSideSelector value={data.l4s3_atrophy_side} onChange={(v) => updateData('l4s3_atrophy_side', v)} />}
                  </div>
                </>)}
                <SectionDivider label="Palpation" />
                <LocToggle label="Pain" options={['LS Pain', 'None']} value={data.l4s3_pain} onChange={(v) => updateData('l4s3_pain', v)} />
              </div>
            )}

            {/* ═══ PROSENCEPHALON ═══ */}
            {activeLoc === 'prosencephalon' && (
              <div className="space-y-5">
                <LocToggle label="Mentation" options={['BAR', 'QAR', 'Obtunded', 'Stuporous', 'Comatose', 'Sedated']} value={data.pros_mentation} onChange={(v) => updateData('pros_mentation', v)} />
                {data.pros_mentation === 'Sedated' && (
                  <div className="pl-4 border-l-2 border-gray-200">
                    <input
                      type="text"
                      className="w-full p-2 rounded-xl text-sm border-2 border-gray-200 text-gray-900 bg-white"
                      placeholder="Agent (e.g., diazepam, midazolam)"
                      value={data.pros_sedation_agent}
                      onChange={(e) => updateData('pros_sedation_agent', e.target.value)}
                    />
                  </div>
                )}
                {data.pros_mentation !== 'Sedated' && (
                  <div>
                    <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-1.5">Behavioral Signs (Select All)</div>
                    <div className="grid grid-cols-2 gap-2">
                      {([{ k: 'pressing', l: 'Head Pressing' }, { k: 'pacing', l: 'Compulsive Pacing' }, { k: 'hemi', l: 'Hemi-inattention' }] as const).map(({ k, l }) => (
                        <LocCheckButton key={k} checked={data.pros_behavior[k]} onChange={() => updateCheckbox('pros_behavior', k)} label={l} />
                      ))}
                    </div>
                  </div>
                )}
                <SectionDivider label="Gait & Posture" />
                <LocToggle
                  label="Ambulatory Status"
                  options={['Ambulatory', 'Non-Ambulatory']}
                  value={(data.pros_mentation === 'Comatose' || data.pros_mentation === 'Stuporous') ? 'Non-Ambulatory' : data.pros_amb}
                  onChange={(v) => updateData('pros_amb', v)}
                />
                {effectiveAmb === 'Ambulatory' && (
                  <LocToggle label="Circling" options={['None', 'Left', 'Right']} value={data.pros_circle} onChange={(v) => updateData('pros_circle', v)} />
                )}
                <SectionDivider label="Cranial Nerves" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <LocToggle label="Menace Response" options={['Normal', 'Decreased', 'Absent']} value={data.pros_menace} onChange={(v) => updateData('pros_menace', v)} />
                    {data.pros_menace !== 'Normal' && <LocSideSelector value={data.pros_menace_side} onChange={(v) => updateData('pros_menace_side', v)} />}
                  </div>
                  <div>
                    <LocToggle label="Facial Sensation" options={['Normal', 'Hypoalgesia', 'Absent']} value={data.pros_facial} onChange={(v) => updateData('pros_facial', v)} />
                    {data.pros_facial !== 'Normal' && <LocSideSelector value={data.pros_facial_side} onChange={(v) => updateData('pros_facial_side', v)} />}
                  </div>
                  <div>
                    <LocToggle label="PLR (CN II/III)" options={['Normal', 'Absent Direct', 'Absent Consensual', 'Absent Both']} value={data.pros_plr} onChange={(v) => updateData('pros_plr', v)} />
                    {data.pros_plr !== 'Normal' && <LocSideSelector value={data.pros_plr_side} onChange={(v) => updateData('pros_plr_side', v)} />}
                  </div>
                </div>
                <div>
                  <LocToggle label="Focal Seizures (observed)" options={['None', 'Jacksonian']} value={data.pros_focal_sz} onChange={(v) => updateData('pros_focal_sz', v)} />
                  {data.pros_focal_sz !== 'None' && <LocSideSelector value={data.pros_focal_sz_side} onChange={(v) => updateData('pros_focal_sz_side', v)} />}
                </div>
                {effectiveAmb === 'Ambulatory' && (<>
                  <SectionDivider label="Postural Reactions" />
                  <div>
                    <LocToggle label="Hopping" options={['Normal', 'Decreased']} value={data.pros_cp} onChange={(v) => updateData('pros_cp', v)} />
                    {data.pros_cp === 'Decreased' && <LocSideSelector value={data.pros_cp_side} onChange={(v) => updateData('pros_cp_side', v)} />}
                  </div>
                </>)}
              </div>
            )}

            {/* ═══ BRAINSTEM ═══ */}
            {activeLoc === 'brainstem' && (
              <div className="space-y-5">
                <LocToggle label="Mentation" options={['BAR', 'QAR', 'Obtunded', 'Stuporous', 'Comatose']} value={data.bs_mentation} onChange={(v) => updateData('bs_mentation', v)} />

                <SectionDivider label="Gait" />
                <LocToggle label="Gait Status" options={['Normal', 'Abnormal']} value={data.bs_gait} onChange={(v) => updateData('bs_gait', v)} />
                {data.bs_gait === 'Abnormal' && (<>
                  <LocToggle label="Paresis" options={['Ambulatory Tetraparesis', 'Non-Amb Tetraparesis', 'Hemiparesis', 'Tetraplegic', 'None']} value={data.bs_paresis} onChange={(v) => updateData('bs_paresis', v)} />
                  {data.bs_paresis === 'Hemiparesis' && <LocSideSelector value={data.bs_paresis_side} onChange={(v) => updateData('bs_paresis_side', v)} />}
                  <LocToggle label="Ataxia" options={['Vestibular', 'Proprioceptive', 'Dysmetria', 'Vestibular + Proprioceptive', 'None']} value={data.bs_ataxia} onChange={(v) => updateData('bs_ataxia', v)} />
                </>)}

                <SectionDivider label="Cranial Nerves" />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <LocToggle label="Eyes (CN II/III/IV/VI)" options={['Normal', 'Abnormal']} value={data.bs_cn_eyes} onChange={(v) => updateData('bs_cn_eyes', v)} />
                  <LocToggle label="Vestibular (CN VIII)" options={['Normal', 'Abnormal']} value={data.bs_cn_vest} onChange={(v) => updateData('bs_cn_vest', v)} />
                  <LocToggle label="Face & Bulbar (CN V/VII/IX-XII)" options={['Normal', 'Abnormal']} value={data.bs_cn_face} onChange={(v) => updateData('bs_cn_face', v)} />
                </div>

                {data.bs_cn_eyes === 'Abnormal' && (
                  <div className="pl-4 border-l-2 border-gray-200 space-y-3">
                    <LocSideSelector value={data.bs_cn_eyes_side} onChange={(v) => updateData('bs_cn_eyes_side', v)} />
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <LocToggle label="Menace (CN II/VII)" options={['Normal', 'Absent']} value={data.bs_cn_menace} onChange={(v) => updateData('bs_cn_menace', v)} />
                      <LocToggle label="PLR (CN III)" options={['Normal', 'Abnormal']} value={data.bs_cn_plr} onChange={(v) => updateData('bs_cn_plr', v)} />
                      <LocToggle label="Strabismus (CN III/IV/VI)" options={['Normal', 'Ventral', 'Lateral', 'Medial', 'Positional']} value={data.bs_cn_strabismus} onChange={(v) => updateData('bs_cn_strabismus', v)} />
                    </div>
                  </div>
                )}

                {data.bs_cn_vest === 'Abnormal' && (
                  <div className="pl-4 border-l-2 border-gray-200 space-y-3">
                    <LocSideSelector value={data.bs_cn_vest_side} onChange={(v) => updateData('bs_cn_vest_side', v)} />
                    <LocToggle label="Head Tilt" options={['None', 'Left', 'Right']} value={data.bs_cn_head_tilt} onChange={(v) => updateData('bs_cn_head_tilt', v)} />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <LocToggle label="Physiologic Nystagmus" options={['Normal', 'Absent', 'Reduced']} value={data.bs_cn_physiologic_nyst} onChange={(v) => updateData('bs_cn_physiologic_nyst', v)} />
                      <LocToggle label="Pathologic Nystagmus" options={['None', 'Resting', 'Positional']} value={data.bs_cn_pathologic_nyst} onChange={(v) => updateData('bs_cn_pathologic_nyst', v)} />
                    </div>
                    {data.bs_cn_pathologic_nyst !== 'None' && (
                      <LocToggle label="Nystagmus Direction" options={['Horizontal', 'Vertical', 'Rotary']} value={data.bs_cn_pathologic_nyst_type} onChange={(v) => updateData('bs_cn_pathologic_nyst_type', v)} />
                    )}
                  </div>
                )}

                {data.bs_cn_face === 'Abnormal' && (
                  <div className="pl-4 border-l-2 border-gray-200 space-y-3">
                    <LocSideSelector value={data.bs_cn_face_side} onChange={(v) => updateData('bs_cn_face_side', v)} />
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <LocToggle label="Jaw Tone (CN V motor)" options={['Normal', 'Reduced']} value={data.bs_cn_jaw} onChange={(v) => updateData('bs_cn_jaw', v)} />
                      <LocToggle label="Facial Sensation (CN V sens)" options={['Normal', 'Reduced', 'Absent']} value={data.bs_cn_facial_sensation} onChange={(v) => updateData('bs_cn_facial_sensation', v)} />
                      <LocToggle label="Facial Symmetry (CN VII)" options={['Normal', 'Paresis', 'Paralysis']} value={data.bs_cn_facial} onChange={(v) => updateData('bs_cn_facial', v)} />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <LocToggle label="Gag Reflex (CN IX/X)" options={['Normal', 'Reduced', 'Absent']} value={data.bs_cn_gag} onChange={(v) => updateData('bs_cn_gag', v)} />
                      <LocToggle label="Tongue (CN XII)" options={['Normal', 'Weakness', 'Atrophy']} value={data.bs_cn_tongue} onChange={(v) => updateData('bs_cn_tongue', v)} />
                    </div>
                  </div>
                )}

                <SectionDivider label="Postural Reactions" />
                <LocToggle label="Postural Reactions" options={['Normal', 'Abnormal']} value={data.bs_postural_gate} onChange={(v) => updateData('bs_postural_gate', v)} />
                {data.bs_postural_gate === 'Abnormal' && (
                  <div className="pl-4 border-l-2 border-gray-200 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <LocToggle label="Thoracic Limbs" options={['Normal', 'Deficits']} value={data.bs_postural_tl} onChange={(v) => updateData('bs_postural_tl', v)} />
                      {data.bs_postural_tl === 'Deficits' && <LocSideSelector value={data.bs_postural_tl_side} onChange={(v) => updateData('bs_postural_tl_side', v)} />}
                    </div>
                    <div>
                      <LocToggle label="Pelvic Limbs" options={['Normal', 'Deficits']} value={data.bs_postural_pl} onChange={(v) => updateData('bs_postural_pl', v)} />
                      {data.bs_postural_pl === 'Deficits' && <LocSideSelector value={data.bs_postural_pl_side} onChange={(v) => updateData('bs_postural_pl_side', v)} />}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ═══ PERIPHERAL VESTIBULAR ═══ */}
            {activeLoc === 'periph_vest' && (
              <div className="space-y-5">
                <div className="bg-[#FFF3CD] border-2 border-black rounded-xl p-3 text-sm font-semibold text-gray-900 flex items-center gap-2">
                  <AlertTriangle size={16} />
                  <strong>Key differentiators from central:</strong> Normal mentation, normal proprioception, no vertical nystagmus, no direction-changing nystagmus
                </div>
                <LocToggle label="Head Tilt" options={['Left', 'Right']} value={data.pv_tilt} onChange={(v) => updateData('pv_tilt', v)} />
                <SectionDivider label="Nystagmus" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <LocToggle label="Type" options={['Horizontal', 'Rotary']} value={data.pv_nystagmusType} onChange={(v) => updateData('pv_nystagmusType', v)} />
                  <LocToggle label="Fast Phase" options={['Left', 'Right']} value={data.pv_nystagmusDir} onChange={(v) => updateData('pv_nystagmusDir', v)} />
                </div>
                <LocCheckButton checked={data.pv_positional_nyst} onChange={() => updateData('pv_positional_nyst', !data.pv_positional_nyst)} label="Positional (only on certain head positions)" color="sky" />
                <SectionDivider label="Additional CN" />
                <LocToggle label="Strabismus" options={['None', 'Positional Ventral']} value={data.pv_strabismus} onChange={(v) => updateData('pv_strabismus', v)} />
                <LocToggle label="Facial Nerve (CN VII)" options={['Normal', 'Paresis', 'Paralysis']} value={data.pv_facial} onChange={(v) => updateData('pv_facial', v)} />
                <SectionDivider label="Sympathetic Signs (Middle Ear)" />
                <div className="flex flex-wrap gap-2">
                  <LocCheckButton checked={data.pv_miosis} onChange={() => updateData('pv_miosis', !data.pv_miosis)} label="Miosis (ipsilateral)" color="amber" />
                  <LocCheckButton checked={data.pv_enophthalmos} onChange={() => updateData('pv_enophthalmos', !data.pv_enophthalmos)} label="Enophthalmos" color="amber" />
                  <LocCheckButton checked={data.pv_third_eyelid} onChange={() => updateData('pv_third_eyelid', !data.pv_third_eyelid)} label="Third eyelid protrusion" color="amber" />
                </div>
                <SectionDivider label="Key Differentiators" />
                <LocToggle label="Proprioception" options={['Normal', 'Deficits']} value={data.pv_proprioception} onChange={(v) => updateData('pv_proprioception', v)} />
                {data.pv_proprioception !== 'Normal' && (
                  <div className="bg-[#FFF3CD] border-2 border-black rounded-xl p-3 text-sm font-semibold text-gray-900 flex items-center gap-2">
                    <AlertTriangle size={16} />
                    Proprioceptive deficits suggest central vestibular disease
                  </div>
                )}
              </div>
            )}

            {/* ═══ CEREBELLUM ═══ */}
            {activeLoc === 'cerebellum' && (
              <div className="space-y-5">
                <LocToggle label="Mentation" options={['BAR', 'QAR', 'Obtunded']} value={data.cb_mentation} onChange={(v) => updateData('cb_mentation', v)} />
                {data.cb_mentation !== 'QAR' && data.cb_mentation !== 'BAR' && (
                  <div className="bg-[#FFF3CD] border-2 border-black rounded-xl p-3 text-sm font-semibold text-gray-900 flex items-center gap-2">
                    <AlertTriangle size={16} />
                    Consider brainstem involvement
                  </div>
                )}
                <div>
                  <LocToggle label="Gait" options={['Hypermetric Ataxia', 'Truncal Ataxia', 'Broad-Based Stance']} value={data.cb_gait} onChange={(v) => updateData('cb_gait', v)} />
                  <LocSideSelector value={data.cb_side} onChange={(v) => updateData('cb_side', v)} />
                </div>
                <SectionDivider label="Cranial Nerves" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <LocToggle label="Menace Response" options={['Normal', 'Absent']} value={data.cb_menace} onChange={(v) => updateData('cb_menace', v)} />
                    {data.cb_menace === 'Absent' && <LocSideSelector value={data.cb_menace_side} onChange={(v) => updateData('cb_menace_side', v)} />}
                  </div>
                  <LocToggle label="Tremor" options={['None', 'Intention Tremor', 'Head Bobbing']} value={data.cb_tremor} onChange={(v) => updateData('cb_tremor', v)} />
                </div>
                <div className="flex flex-wrap gap-2">
                  <LocCheckButton checked={data.cb_anisocoria} onChange={() => updateData('cb_anisocoria', !data.cb_anisocoria)} label="Anisocoria" color="amber" />
                  <LocCheckButton checked={data.cb_vestibular} onChange={() => updateData('cb_vestibular', !data.cb_vestibular)} label="Paradoxical Vestibular Signs" color="amber" />
                </div>
                <SectionDivider label="Postural Reactions" />
                <LocToggle label="Postural Reactions" options={['Normal', 'Delayed/Exaggerated', 'Absent']} value={data.cb_postural} onChange={(v) => updateData('cb_postural', v)} />
              </div>
            )}

            {/* ═══ MULTIFOCAL ═══ */}
            {activeLoc === 'multifocal' && (
              <div className="space-y-5">
                <div>
                  <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-1.5">Suspected Areas Involved</div>
                  <div className="flex flex-wrap gap-2">
                    {([
                      { k: 'prosencephalon', l: 'Prosencephalon' },
                      { k: 'brainstem', l: 'Brainstem' },
                      { k: 'cerebellum', l: 'Cerebellum' },
                      { k: 'vestibular', l: 'Vestibular' },
                      { k: 'c1c5', l: 'C1-C5' },
                      { k: 'c6t2', l: 'C6-T2' },
                      { k: 't3l3', l: 'T3-L3' },
                      { k: 'l4s3', l: 'L4-S3' },
                    ] as const).map(({ k, l }) => (
                      <LocCheckButton key={k} checked={data.mf_areas[k]} onChange={() => updateCheckbox('mf_areas', k)} label={l} color="sky" />
                    ))}
                  </div>
                </div>
                <LocToggle label="Mental Status" options={['BAR', 'QAR', 'Obtunded', 'Stuporous', 'Sedated']} value={data.mf_mentation} onChange={(v) => updateData('mf_mentation', v)} />
                {data.mf_mentation === 'Sedated' && (
                  <div className="pl-4 border-l-2 border-gray-200">
                    <input
                      type="text"
                      className="w-full p-2 rounded-xl text-sm border-2 border-gray-200 text-gray-900 bg-white"
                      placeholder="Agent (e.g., diazepam, midazolam)"
                      value={data.mf_sedation_agent}
                      onChange={(e) => updateData('mf_sedation_agent', e.target.value)}
                    />
                  </div>
                )}
                <LocToggle label="Gait" options={['Normal', 'Ambulatory Paresis', 'Non-Ambulatory', 'Tetraplegic']} value={data.mf_gait} onChange={(v) => updateData('mf_gait', v)} />
                <SectionDivider label="Cranial Nerves" />
                {data.mf_areas.brainstem ? (<>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <LocToggle label="Eyes (CN II/III/IV/VI)" options={['Normal', 'Abnormal']} value={data.mf_cn_eyes} onChange={(v) => updateData('mf_cn_eyes', v)} />
                    <LocToggle label="Vestibular (CN VIII)" options={['Normal', 'Abnormal']} value={data.mf_cn_vest} onChange={(v) => updateData('mf_cn_vest', v)} />
                    <LocToggle label="Face & Bulbar (CN V/VII/IX-XII)" options={['Normal', 'Abnormal']} value={data.mf_cn_face} onChange={(v) => updateData('mf_cn_face', v)} />
                  </div>
                  {data.mf_cn_eyes === 'Abnormal' && (
                    <div className="pl-4 border-l-2 border-gray-200 space-y-3">
                      <LocSideSelector value={data.mf_cn_eyes_side} onChange={(v) => updateData('mf_cn_eyes_side', v)} />
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <LocToggle label="Menace (CN II/VII)" options={['Normal', 'Absent']} value={data.mf_cn_menace} onChange={(v) => updateData('mf_cn_menace', v)} />
                        <LocToggle label="PLR (CN III)" options={['Normal', 'Abnormal']} value={data.mf_cn_plr} onChange={(v) => updateData('mf_cn_plr', v)} />
                        <LocToggle label="Strabismus (CN III/IV/VI)" options={['Normal', 'Ventral', 'Lateral', 'Medial', 'Positional']} value={data.mf_cn_strabismus} onChange={(v) => updateData('mf_cn_strabismus', v)} />
                      </div>
                    </div>
                  )}
                  {data.mf_cn_vest === 'Abnormal' && (
                    <div className="pl-4 border-l-2 border-gray-200 space-y-3">
                      <LocSideSelector value={data.mf_cn_vest_side} onChange={(v) => updateData('mf_cn_vest_side', v)} />
                      <LocToggle label="Head Tilt" options={['None', 'Left', 'Right']} value={data.mf_cn_head_tilt} onChange={(v) => updateData('mf_cn_head_tilt', v)} />
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <LocToggle label="Physiologic Nystagmus" options={['Normal', 'Absent', 'Reduced']} value={data.mf_cn_physiologic_nyst} onChange={(v) => updateData('mf_cn_physiologic_nyst', v)} />
                        <LocToggle label="Pathologic Nystagmus" options={['None', 'Resting', 'Positional']} value={data.mf_cn_pathologic_nyst} onChange={(v) => updateData('mf_cn_pathologic_nyst', v)} />
                      </div>
                      {data.mf_cn_pathologic_nyst !== 'None' && (
                        <LocToggle label="Nystagmus Direction" options={['Horizontal', 'Vertical', 'Rotary']} value={data.mf_cn_pathologic_nyst_type} onChange={(v) => updateData('mf_cn_pathologic_nyst_type', v)} />
                      )}
                    </div>
                  )}
                  {data.mf_cn_face === 'Abnormal' && (
                    <div className="pl-4 border-l-2 border-gray-200 space-y-3">
                      <LocSideSelector value={data.mf_cn_face_side} onChange={(v) => updateData('mf_cn_face_side', v)} />
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <LocToggle label="Jaw Tone (CN V motor)" options={['Normal', 'Reduced']} value={data.mf_cn_jaw} onChange={(v) => updateData('mf_cn_jaw', v)} />
                        <LocToggle label="Facial Sensation (CN V sens)" options={['Normal', 'Reduced', 'Absent']} value={data.mf_cn_facial_sensation} onChange={(v) => updateData('mf_cn_facial_sensation', v)} />
                        <LocToggle label="Facial Symmetry (CN VII)" options={['Normal', 'Paresis', 'Paralysis']} value={data.mf_cn_facial} onChange={(v) => updateData('mf_cn_facial', v)} />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <LocToggle label="Gag Reflex (CN IX/X)" options={['Normal', 'Reduced', 'Absent']} value={data.mf_cn_gag} onChange={(v) => updateData('mf_cn_gag', v)} />
                        <LocToggle label="Tongue (CN XII)" options={['Normal', 'Weakness', 'Atrophy']} value={data.mf_cn_tongue} onChange={(v) => updateData('mf_cn_tongue', v)} />
                      </div>
                    </div>
                  )}
                  <input
                    type="text"
                    className="w-full p-2 rounded-xl text-sm border-2 border-gray-200 text-gray-900 bg-white"
                    placeholder="Additional CN detail (optional)"
                    value={data.mf_cn_detail}
                    onChange={(e) => updateData('mf_cn_detail', e.target.value)}
                  />
                </>) : (
                  <div>
                    <LocToggle label="Cranial Nerves" options={['Normal', 'Abnormal']} value={data.mf_cn} onChange={(v) => updateData('mf_cn', v)} />
                    {data.mf_cn === 'Abnormal' && (<>
                      <LocSideSelector value={data.mf_cn_side} onChange={(v) => updateData('mf_cn_side', v)} />
                      <div className="mt-2 pl-4 border-l-2 border-gray-200">
                        <input
                          type="text"
                          className="w-full p-2 rounded-xl text-sm border-2 border-gray-200 text-gray-900 bg-white"
                          placeholder="Detail (e.g., absent menace L, facial droop R)"
                          value={data.mf_cn_detail}
                          onChange={(e) => updateData('mf_cn_detail', e.target.value)}
                        />
                      </div>
                    </>)}
                  </div>
                )}
                <LocToggle label="Reflexes" options={['Normal', 'UMN', 'LMN', 'Mixed UMN/LMN']} value={data.mf_reflexes} onChange={(v) => updateData('mf_reflexes', v)} />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <LocToggle label="Pain" options={['None', 'Focal', 'Generalized', 'Cervical', 'Thoracolumbar', 'Lumbosacral']} value={data.mf_pain} onChange={(v) => updateData('mf_pain', v)} />
                  <LocToggle label="Bladder" options={['Normal', 'UMN', 'LMN']} value={data.mf_bladder} onChange={(v) => updateData('mf_bladder', v)} />
                </div>
                <LocToggle label="Muscle Mass" options={['Normal', 'Generalized Atrophy', 'Focal Atrophy']} value={data.mf_mass} onChange={(v) => updateData('mf_mass', v)} />
              </div>
            )}
          </div>
        </div>

        {/* Report Panel (1 col on desktop, sticky) */}
        <div className="lg:col-span-1" id="report-panel">
          <div className="lg:sticky lg:top-[72px]">
            <ReportPanel
              report={examState.report}
              reportLocked={examState.reportLocked}
              onReportChange={setReport}
              onReportLock={setReportLocked}
              onCopy={copyToClipboard}
              copied={copied}
              locLabel={locLabel}
              problemCount={problems.length}
              ddxList={ddxList}
              ddxSelections={examState.ddxSelections}
              onDdxToggle={handleDdxToggle}
              onDdxToggleAll={handleDdxToggleAll}
            />
          </div>
        </div>
      </div>

      {/* Mobile: floating jump-to-report button */}
      <button
        onClick={() => document.getElementById('report-panel')?.scrollIntoView({ behavior: 'smooth' })}
        className="fixed bottom-20 right-4 z-10 lg:hidden bg-[#B8E6D4] border-2 border-black rounded-full px-4 py-2.5 shadow-[3px_3px_0_#000] text-xs font-black text-gray-900 active:scale-95 active:shadow-[1px_1px_0_#000] transition-all flex items-center gap-1.5"
      >
        <span>↓</span> Report
      </button>
    </div>
  );
}
