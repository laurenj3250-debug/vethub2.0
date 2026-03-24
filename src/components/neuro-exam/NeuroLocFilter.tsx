'use client';

import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { AlertTriangle, ShieldAlert, RotateCcw } from 'lucide-react';
import { type LocId, type LocExamState, type NeuroExamData } from './types';
import { LOC_NAMES, LOC_NAV, getDdx } from './constants';
import { generateReport } from './generate-report';
import { LocToggle } from './LocToggle';
import { LocCheckButton } from './LocCheckButton';
import { LocSideSelector } from './LocSideSelector';
import { LocButton } from './LocButton';
import { SectionDivider } from './SectionDivider';
import { ReportPanel } from './ReportPanel';
import { CascadeSummary } from './CascadeSummary';

// ─── Props ───────────────────────────────────────────────────────────────────

interface NeuroLocFilterProps {
  examState: LocExamState;
  setActiveLoc: (loc: LocId) => void;
  setSpecies: (species: 'Dog' | 'Cat') => void;
  updateData: (key: string, value: NeuroExamData[keyof NeuroExamData]) => void;
  updateDataBatch: (updates: Record<string, NeuroExamData[keyof NeuroExamData]>) => void;
  updateCheckbox: (group: 'pros_behavior' | 'mf_areas', key: string) => void;
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
  updateDataBatch,
  updateCheckbox,
  setReportLocked,
  setReport,
  setDdxSelections,
  resetToNormal,
}: NeuroLocFilterProps) {
  const [copied, setCopied] = useState(false);
  const [cascadeExpanded, setCascadeExpanded] = useState<Record<string, boolean>>({});

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

  // Compute report from pure function
  const { text: computedReport, problems, locLabel } = useMemo(() => {
    if (examState.reportLocked) {
      return { text: examState.report, problems: [] as string[], locLabel: '' };
    }
    return generateReport(activeLoc, data, examState.ddxSelections, species);
  }, [activeLoc, data, examState.ddxSelections, species, examState.reportLocked, examState.report]);

  // Sync computed report to state (fires once per actual change, not per render)
  useEffect(() => {
    if (!examState.reportLocked && computedReport !== examState.report) {
      setReport(computedReport);
    }
  }, [computedReport, examState.reportLocked, examState.report, setReport]);

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

  // ─── Cascade Handlers ──────────────────────────────────────────────────

  const toggleCascade = useCallback((key: string) => {
    setCascadeExpanded(prev => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const handleT3L3GaitChange = useCallback((v: string) => {
    const updates: Record<string, NeuroExamData[keyof NeuroExamData]> = { t3l3_gait: v };
    if (v === 'Normal') {
      Object.assign(updates, {
        t3l3_postural_tl: 'Normal',
        t3l3_postural_pl: 'Normal',
        t3l3_reflexes_gate: 'Normal',
        t3l3_tone_pl: 'Normal/Increased',
        t3l3_mass: 'Normal',
      });
    } else if (v === 'Ambulatory') {
      Object.assign(updates, {
        t3l3_postural_pl: 'Deficits',
        t3l3_reflexes_gate: 'Normal',
        t3l3_tone_pl: 'Normal/Increased',
      });
    } else if (v === 'Non-Ambulatory') {
      Object.assign(updates, {
        t3l3_postural_pl: 'Absent',
        t3l3_reflexes_gate: 'Normal',
        t3l3_tone_pl: 'Normal/Increased',
      });
    } else if (v === 'Paraplegic') {
      Object.assign(updates, {
        t3l3_postural_pl: 'Absent',
        t3l3_reflexes_gate: 'Normal',
        t3l3_tone_pl: 'Normal/Increased',
      });
    }
    setCascadeExpanded(prev => ({ ...prev, t3l3: false }));
    updateDataBatch(updates);
  }, [updateDataBatch]);

  const handleC6T2GaitChange = useCallback((v: string) => {
    const updates: Record<string, NeuroExamData[keyof NeuroExamData]> = { c6t2_gait: v };
    if (v !== 'Normal') {
      Object.assign(updates, {
        c6t2_postural_tl: 'Deficits',
        c6t2_postural_pl: 'Deficits',
        c6t2_reflexes_gate: 'Normal',
      });
    } else {
      Object.assign(updates, {
        c6t2_postural_tl: 'Normal',
        c6t2_postural_pl: 'Normal',
        c6t2_reflexes_gate: 'Normal',
      });
    }
    setCascadeExpanded(prev => ({ ...prev, c6t2: false }));
    updateDataBatch(updates);
  }, [updateDataBatch]);

  const handleC1C5GaitChange = useCallback((v: string) => {
    const updates: Record<string, NeuroExamData[keyof NeuroExamData]> = { c1c5_gait: v };
    if (v === 'Normal') {
      Object.assign(updates, {
        c1c5_postural_tl: 'Normal',
        c1c5_postural_pl: 'Normal',
        c1c5_reflexes: 'Normal/Increased',
      });
    } else if (v === 'Ambulatory Tetraparesis') {
      Object.assign(updates, {
        c1c5_postural_tl: 'Deficits',
        c1c5_postural_pl: 'Deficits',
        c1c5_reflexes: 'Normal/Increased',
      });
    } else if (v === 'Non-Amb Tetraparesis') {
      Object.assign(updates, {
        c1c5_postural_tl: 'Deficits',
        c1c5_postural_pl: 'Deficits',
        c1c5_reflexes: 'Normal/Increased',
      });
    } else if (v === 'Tetraplegic') {
      Object.assign(updates, {
        c1c5_postural_tl: 'Deficits',
        c1c5_postural_pl: 'Deficits',
        c1c5_reflexes: 'Normal/Increased',
      });
    }
    setCascadeExpanded(prev => ({ ...prev, c1c5: false }));
    updateDataBatch(updates);
  }, [updateDataBatch]);

  const handleL4S3GaitChange = useCallback((v: string) => {
    const updates: Record<string, NeuroExamData[keyof NeuroExamData]> = { l4s3_gait: v };
    if (v === 'Normal') {
      Object.assign(updates, {
        l4s3_postural_pl: 'Normal',
        l4s3_reflexes_gate: 'Normal',
        l4s3_tone: 'Normal',
        l4s3_tail_tone: 'Normal',
        l4s3_bladder: 'Normal',
      });
    } else if (v === 'Paraparesis') {
      Object.assign(updates, {
        l4s3_postural_pl: 'Deficits',
        l4s3_reflexes_gate: 'Normal',
        l4s3_tone: 'Decreased',
      });
    } else if (v === 'Non-Ambulatory') {
      Object.assign(updates, {
        l4s3_postural_pl: 'Absent',
        l4s3_reflexes_gate: 'Normal',
        l4s3_tone: 'Decreased',
        l4s3_tail_tone: 'Decreased',
      });
    } else if (v === 'Paraplegic') {
      Object.assign(updates, {
        l4s3_postural_pl: 'Absent',
        l4s3_reflexes_gate: 'Normal',
        l4s3_tone: 'Flaccid',
        l4s3_tail_tone: 'Flaccid',
        l4s3_bladder: 'Large/Flaccid (LMN)',
      });
    }
    setCascadeExpanded(prev => ({ ...prev, l4s3: false }));
    updateDataBatch(updates);
  }, [updateDataBatch]);

  // ─── Cascade Summary Text Builders ──────────────────────────────────────

  const t3l3CascadeSummary = useMemo(() => {
    const parts: string[] = [];
    parts.push(`Postural: TL ${data.t3l3_postural_tl?.toString().toLowerCase() ?? 'normal'}, PL ${data.t3l3_postural_pl?.toString().toLowerCase() ?? 'normal'}`);
    parts.push(`Reflexes: ${data.t3l3_reflexes_gate === 'Normal' ? 'UMN (normal/increased)' : 'abnormal'}`);
    parts.push(`Tone: ${data.t3l3_tone_pl}`);
    return parts.join(' | ');
  }, [data.t3l3_postural_tl, data.t3l3_postural_pl, data.t3l3_reflexes_gate, data.t3l3_tone_pl]);

  const c6t2CascadeSummary = useMemo(() => {
    const parts: string[] = [];
    parts.push(`Postural: TL ${data.c6t2_postural_tl?.toString().toLowerCase() ?? 'normal'}, PL ${data.c6t2_postural_pl?.toString().toLowerCase() ?? 'normal'}`);
    parts.push(`Reflexes: ${data.c6t2_reflexes_gate === 'Normal' ? 'LMN TL / UMN PL' : 'abnormal'}`);
    return parts.join(' | ');
  }, [data.c6t2_postural_tl, data.c6t2_postural_pl, data.c6t2_reflexes_gate]);

  const c1c5CascadeSummary = useMemo(() => {
    const parts: string[] = [];
    parts.push(`Postural: TL ${data.c1c5_postural_tl?.toString().toLowerCase() ?? 'normal'}, PL ${data.c1c5_postural_pl?.toString().toLowerCase() ?? 'normal'}`);
    parts.push(`Reflexes: ${data.c1c5_reflexes}`);
    return parts.join(' | ');
  }, [data.c1c5_postural_tl, data.c1c5_postural_pl, data.c1c5_reflexes]);

  const l4s3CascadeSummary = useMemo(() => {
    const parts: string[] = [];
    parts.push(`Postural: PL ${data.l4s3_postural_pl?.toString().toLowerCase() ?? 'normal'}`);
    parts.push(`Reflexes: ${data.l4s3_reflexes_gate === 'Normal' ? 'LMN' : 'abnormal'}`);
    parts.push(`Tone: ${data.l4s3_tone}`);
    if (data.l4s3_tail_tone !== 'Normal') parts.push(`Tail: ${data.l4s3_tail_tone}`);
    if (data.l4s3_bladder !== 'Normal') parts.push(`Bladder: ${data.l4s3_bladder}`);
    return parts.join(' | ');
  }, [data.l4s3_postural_pl, data.l4s3_reflexes_gate, data.l4s3_tone, data.l4s3_tail_tone, data.l4s3_bladder]);

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
                <LocToggle label="Pelvic Gait Status" options={['Normal', 'Ambulatory', 'Non-Ambulatory', 'Paraplegic']} value={data.t3l3_gait} onChange={handleT3L3GaitChange} />
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

                {data.t3l3_gait !== 'Normal' && (
                  <CascadeSummary
                    label="UMN pattern"
                    summary={t3l3CascadeSummary}
                    expanded={!!cascadeExpanded.t3l3}
                    onToggle={() => toggleCascade('t3l3')}
                  >
                    <SectionDivider label="Postural Reactions" />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <LocToggle label="Thoracic Limbs" options={['Normal', 'Deficits']} value={data.t3l3_postural_tl} onChange={(v) => updateData('t3l3_postural_tl', v)} />
                      <div>
                        <LocToggle label="Pelvic Limbs" options={['Normal', 'Deficits', 'Absent']} value={data.t3l3_postural_pl} onChange={(v) => updateData('t3l3_postural_pl', v)} />
                      </div>
                    </div>

                    <SectionDivider label="Spinal Reflexes" />
                    <LocToggle label="Spinal Reflexes" options={['Normal', 'Abnormal']} value={data.t3l3_reflexes_gate} onChange={(v) => updateData('t3l3_reflexes_gate', v)} />
                    {data.t3l3_reflexes_gate === 'Abnormal' && (
                      <div className="pl-4 border-l-2 border-gray-200 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <LocToggle label="Patellar Reflex" options={['Normal', 'Increased', 'Reduced']} value={data.t3l3_patellar} onChange={(v) => updateData('t3l3_patellar', v)} />
                          </div>
                          <div>
                            <LocToggle label="Withdrawal (Pelvic)" options={['Normal', 'Increased', 'Reduced']} value={data.t3l3_withdrawal_pl} onChange={(v) => updateData('t3l3_withdrawal_pl', v)} />
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

                    <SectionDivider label="Tone" />
                    <LocToggle label="Pelvic Limb Tone" options={['Normal', 'Normal/Increased', 'Increased']} value={data.t3l3_tone_pl} onChange={(v) => updateData('t3l3_tone_pl', v)} />
                  </CascadeSummary>
                )}

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
                  <SectionDivider label="Bladder & Mass" />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <LocToggle label="Bladder" options={['Normal', 'Large/Firm (UMN)']} value={data.t3l3_bladder} onChange={(v) => updateData('t3l3_bladder', v)} />
                    <LocToggle label="Muscle Mass" options={['Normal', 'Disuse Atrophy', 'Neurogenic Atrophy']} value={data.t3l3_mass} onChange={(v) => updateData('t3l3_mass', v)} />
                  </div>
                </>)}
              </div>
            )}

            {/* ═══ C6-T2 ═══ */}
            {activeLoc === 'c6t2' && (
              <div className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <LocToggle label="Gait Pattern" options={['Normal', 'Two-Engine Gait', 'Tetraparesis', 'Hemiparesis']} value={data.c6t2_gait} onChange={handleC6T2GaitChange} />
                  {data.c6t2_gait !== 'Normal' && <LocToggle label="Ambulatory Status" options={['Ambulatory', 'Non-Ambulatory']} value={data.c6t2_amb} onChange={(v) => updateData('c6t2_amb', v)} />}
                </div>
                {data.c6t2_gait !== 'Normal' && (
                  <CascadeSummary
                    label="LMN thoracic / UMN pelvic pattern"
                    summary={c6t2CascadeSummary}
                    expanded={!!cascadeExpanded.c6t2}
                    onToggle={() => toggleCascade('c6t2')}
                  >
                    <SectionDivider label="Postural Reactions" />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <LocToggle label="Thoracic Limbs" options={['Normal', 'Deficits']} value={data.c6t2_postural_tl} onChange={(v) => updateData('c6t2_postural_tl', v)} />
                      </div>
                      <div>
                        <LocToggle label="Pelvic Limbs" options={['Normal', 'Deficits']} value={data.c6t2_postural_pl} onChange={(v) => updateData('c6t2_postural_pl', v)} />
                      </div>
                    </div>
                    <SectionDivider label="Spinal Reflexes" />
                    <LocToggle label="Spinal Reflexes" options={['Normal', 'Abnormal']} value={data.c6t2_reflexes_gate} onChange={(v) => updateData('c6t2_reflexes_gate', v)} />
                    {data.c6t2_reflexes_gate === 'Abnormal' && (
                      <div className="pl-4 border-l-2 border-gray-200 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <LocToggle label="Thoracic Withdrawal" options={['Normal', 'Reduced', 'Absent']} value={data.c6t2_foreReflex} onChange={(v) => updateData('c6t2_foreReflex', v)} />
                          </div>
                          <LocToggle label="Pelvic Reflexes" options={['Normal/Increased', 'Increased']} value={data.c6t2_hindReflex} onChange={(v) => updateData('c6t2_hindReflex', v)} />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <LocToggle label="Biceps Reflex" options={['Normal', 'Reduced', 'Absent']} value={data.c6t2_biceps} onChange={(v) => updateData('c6t2_biceps', v)} />
                          </div>
                          <div>
                            <LocToggle label="Triceps Reflex" options={['Normal', 'Reduced', 'Absent']} value={data.c6t2_triceps} onChange={(v) => updateData('c6t2_triceps', v)} />
                          </div>
                        </div>
                      </div>
                    )}
                  </CascadeSummary>
                )}
                {data.c6t2_gait !== 'Normal' && (<>
                  <div className="flex flex-wrap gap-3 items-center">
                    <LocCheckButton checked={data.c6t2_atrophy} onChange={() => updateData('c6t2_atrophy', !data.c6t2_atrophy)} label="Neurogenic Atrophy (TL)" color="amber" />
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
                <LocToggle label="Gait" options={['Normal', 'Ambulatory Tetraparesis', 'Non-Amb Tetraparesis', 'Tetraplegic']} value={data.c1c5_gait} onChange={handleC1C5GaitChange} />
                {(data.c1c5_gait === 'Ambulatory Tetraparesis' || data.c1c5_gait === 'Non-Amb Tetraparesis') && (
                  <LocToggle label="Ataxia Type" options={['Proprioceptive', 'Proprioceptive + Vestibular']} value={data.c1c5_ataxia} onChange={(v) => updateData('c1c5_ataxia', v)} />
                )}
                {data.c1c5_gait !== 'Normal' && (
                  <CascadeSummary
                    label="UMN pattern"
                    summary={c1c5CascadeSummary}
                    expanded={!!cascadeExpanded.c1c5}
                    onToggle={() => toggleCascade('c1c5')}
                  >
                    <SectionDivider label="Postural Reactions" />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <LocToggle label="Thoracic Limbs" options={['Normal', 'Deficits']} value={data.c1c5_postural_tl} onChange={(v) => updateData('c1c5_postural_tl', v)} />
                      </div>
                      <div>
                        <LocToggle label="Pelvic Limbs" options={['Normal', 'Deficits']} value={data.c1c5_postural_pl} onChange={(v) => updateData('c1c5_postural_pl', v)} />
                      </div>
                    </div>
                    <SectionDivider label="Reflexes" />
                    <LocToggle label="Reflexes (All Limbs)" options={['Normal/Increased', 'Increased']} value={data.c1c5_reflexes} onChange={(v) => updateData('c1c5_reflexes', v)} />
                  </CascadeSummary>
                )}
                <SectionDivider label="Palpation" />
                <LocToggle label="Cervical Palpation" options={['None', 'Cervical Pain', 'Guarding/Rigid', 'Ventroflexion']} value={data.c1c5_palpation} onChange={(v) => updateData('c1c5_palpation', v)} />
                <LocToggle label="Respiratory" options={['Normal', 'Dyspnea (Phrenic Nerve C5-7)', 'Irregular Pattern']} value={data.c1c5_respiratory} onChange={(v) => updateData('c1c5_respiratory', v)} />
              </div>
            )}

            {/* ═══ L4-S3 ═══ */}
            {activeLoc === 'l4s3' && (
              <div className="space-y-5">
                <LocToggle label="Pelvic Gait" options={['Normal', 'Paraparesis', 'Non-Ambulatory', 'Paraplegic']} value={data.l4s3_gait} onChange={handleL4S3GaitChange} />
                {data.l4s3_gait === 'Paraplegic' && (
                  <div className="bg-[#FFD6D6] border-2 border-black rounded-xl p-3 text-sm font-bold text-gray-900 flex items-center gap-2">
                    <ShieldAlert size={18} />
                    <span>Deep Pain Perception</span>
                  </div>
                )}
                {data.l4s3_gait === 'Paraplegic' && (
                  <LocToggle options={['Present', 'Absent']} value={data.l4s3_dpp} onChange={(v) => updateData('l4s3_dpp', v)} warning={data.l4s3_dpp === 'Absent'} />
                )}
                {data.l4s3_gait !== 'Normal' && (
                  <CascadeSummary
                    label="LMN pattern"
                    summary={l4s3CascadeSummary}
                    expanded={!!cascadeExpanded.l4s3}
                    onToggle={() => toggleCascade('l4s3')}
                  >
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
                            <LocToggle label="Patellar (Femoral L4-6)" options={['Absent', 'Decreased', 'Normal', 'Increased']} value={data.l4s3_patellar} onChange={(v) => updateData('l4s3_patellar', v)} />
                            {data.l4s3_patellar !== 'Normal' && <LocSideSelector value={data.l4s3_patellar_side} onChange={(v) => updateData('l4s3_patellar_side', v)} />}
                          </div>
                          <div>
                            <LocToggle label="Withdrawal (Sciatic L6-S2)" options={['Absent', 'Decreased', 'Normal']} value={data.l4s3_withdrawal} onChange={(v) => updateData('l4s3_withdrawal', v)} />
                            {data.l4s3_withdrawal !== 'Normal' && <LocSideSelector value={data.l4s3_withdrawal_side} onChange={(v) => updateData('l4s3_withdrawal_side', v)} />}
                          </div>
                        </div>
                        <LocToggle label="Perineal Reflex (S1-S3)" options={['Normal', 'Decreased', 'Absent']} value={data.l4s3_perineal} onChange={(v) => updateData('l4s3_perineal', v)} />
                      </div>
                    )}
                    <SectionDivider label="Tone" />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <LocToggle label="Pelvic Limb Tone" options={['Normal', 'Decreased', 'Flaccid']} value={data.l4s3_tone} onChange={(v) => updateData('l4s3_tone', v)} />
                      <LocToggle label="Tail/Anal Tone" options={['Normal', 'Decreased', 'Flaccid']} value={data.l4s3_tail_tone} onChange={(v) => updateData('l4s3_tail_tone', v)} />
                    </div>
                    <LocToggle label="Bladder" options={['Normal', 'Large/Flaccid (LMN)']} value={data.l4s3_bladder} onChange={(v) => updateData('l4s3_bladder', v)} />
                  </CascadeSummary>
                )}
                {data.l4s3_gait !== 'Normal' && (
                  <div className="flex flex-wrap gap-3 items-center">
                    <LocCheckButton checked={data.l4s3_atrophy} onChange={() => updateData('l4s3_atrophy', !data.l4s3_atrophy)} label="Neurogenic Atrophy (PL)" color="amber" />
                  </div>
                )}
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
                  <LocToggle label="Circling" options={['None', 'Left', 'Right', 'Both']} value={data.pros_circle} onChange={(v) => updateData('pros_circle', v)} />
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
                  <LocToggle label="Ataxia" options={['Vestibular', 'Proprioceptive', 'Vestibular + Proprioceptive', 'None']} value={data.bs_ataxia} onChange={(v) => updateData('bs_ataxia', v)} />
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
                <LocToggle
                  label="Vestibular Findings"
                  options={['Normal', 'Abnormal']}
                  value={data.pv_gate}
                  onChange={(v) => updateData('pv_gate', v)}
                />
                {data.pv_gate === 'Abnormal' && (
                  <>
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
                  </>
                )}
              </div>
            )}

            {/* ═══ CEREBELLUM ═══ */}
            {activeLoc === 'cerebellum' && (
              <div className="space-y-5">
                <LocToggle
                  label="Cerebellar Findings"
                  options={['Normal', 'Abnormal']}
                  value={data.cb_gate}
                  onChange={(v) => updateData('cb_gate', v)}
                />
                {data.cb_gate === 'Abnormal' && (
                  <>
                    <LocToggle label="Mentation" options={['BAR', 'QAR', 'Obtunded']} value={data.cb_mentation} onChange={(v) => updateData('cb_mentation', v)} />
                    {data.cb_mentation !== 'QAR' && data.cb_mentation !== 'BAR' && (
                      <div className="bg-[#FFF3CD] border-2 border-black rounded-xl p-3 text-sm font-semibold text-gray-900 flex items-center gap-2">
                        <AlertTriangle size={16} />
                        Consider brainstem involvement
                      </div>
                    )}
                    <div>
                      <LocToggle label="Gait" options={['Cerebellar Ataxia', 'Truncal Ataxia', 'Broad-Based Stance']} value={data.cb_gait} onChange={(v) => updateData('cb_gait', v)} />
                      <LocSideSelector value={data.cb_side} onChange={(v) => updateData('cb_side', v)} />
                    </div>
                    <SectionDivider label="Cranial Nerves" />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <LocToggle label="Menace Response" options={['Normal', 'Absent']} value={data.cb_menace} onChange={(v) => updateData('cb_menace', v)} />
                        {data.cb_menace === 'Absent' && <LocSideSelector value={data.cb_menace_side} onChange={(v) => updateData('cb_menace_side', v)} />}
                      </div>
                      <LocToggle label="Tremor" options={['None', 'Intention Tremor', 'Action Tremor']} value={data.cb_tremor} onChange={(v) => updateData('cb_tremor', v)} />
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <LocCheckButton checked={data.cb_anisocoria} onChange={() => updateData('cb_anisocoria', !data.cb_anisocoria)} label="Anisocoria" color="amber" />
                      <LocCheckButton checked={data.cb_vestibular} onChange={() => updateData('cb_vestibular', !data.cb_vestibular)} label="Paradoxical Vestibular Signs" color="amber" />
                    </div>
                    <SectionDivider label="Postural Reactions" />
                    <div>
                      <LocToggle label="Postural Reactions" options={['Normal', 'Delayed/Exaggerated', 'Absent']} value={data.cb_postural} onChange={(v) => updateData('cb_postural', v)} />
                      {data.cb_postural !== 'Normal' && <LocSideSelector value={data.cb_postural_side} onChange={(v) => updateData('cb_postural_side', v)} />}
                    </div>
                  </>
                )}
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

      {/* Mobile: floating jump-to-report button — small pill, avoids blocking form */}
      <button
        onClick={() => document.getElementById('report-panel')?.scrollIntoView({ behavior: 'smooth' })}
        className="fixed bottom-[5.5rem] right-3 z-10 lg:hidden bg-[#B8E6D4] border-2 border-black rounded-full px-3 py-2 shadow-[2px_2px_0_#000] text-[11px] font-black text-gray-900 active:scale-95 active:shadow-[1px_1px_0_#000] transition-all flex items-center gap-1 opacity-80 hover:opacity-100"
      >
        <span>↓</span> Report
      </button>
    </div>
  );
}
