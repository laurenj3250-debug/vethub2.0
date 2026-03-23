import { describe, it, expect } from 'vitest';
import { generateReport } from '../generate-report';
import { getDefaultData, getDdx } from '../constants';

// Helper: all DDx selected for a given localization
function allDdxSelected(loc: string, species: 'Dog' | 'Cat' = 'Dog'): Record<string, boolean> {
  return Object.fromEntries(getDdx(loc, species).map((d: string) => [d, true]));
}

describe('generateReport', () => {
  // ─── Test Case 1: All Normal (T3-L3 default) ───────────────────────────
  it('generates normal T3-L3 report with default data', () => {
    const data = getDefaultData();
    data.t3l3_gait = 'Normal';
    const result = generateReport('t3l3', data, allDdxSelected('t3l3'), 'Dog');

    expect(result.text).toContain('**Mental Status**: Quiet Alert and Responsive');
    expect(result.text).toContain('**Gait & posture**: Ambulatory x4, no ataxia');
    expect(result.text).toContain('**Cranial nerves**: No CN deficits');
    expect(result.text).toContain('**Postural reactions**: Normal x4');
    expect(result.text).toContain('**Spinal reflexes**: All reflexes normal, no deficits');
    expect(result.text).toContain('**Tone**: Normal tone in all 4 limbs');
    expect(result.text).toContain('**Muscle mass**: Normal mass, no atrophy or excessive hypertrophy');
    expect(result.problems).toHaveLength(0);
    expect(result.locLabel).toBe('T3–L3 Myelopathy');
  });

  // ─── Test Case 2: T3-L3 Non-Ambulatory Paraparesis ─────────────────────
  it('generates T3-L3 non-ambulatory paraparesis report', () => {
    const data = getDefaultData();
    data.t3l3_gait = 'Non-Ambulatory';
    data.t3l3_ataxia = 'Proprioceptive';
    data.t3l3_pain = true;
    data.t3l3_kyphosis = true;
    const result = generateReport('t3l3', data, allDdxSelected('t3l3'), 'Dog');

    expect(result.text).toContain('Non-ambulatory, UMN paraparesis, GP ataxia');
    expect(result.text).toContain('hyperpathia on palpation of thoracolumbar spine');
    expect(result.text).toContain('kyphosis noted');
    expect(result.problems).toContain('Non-ambulatory paraparesis pelvic limbs');
    expect(result.problems).toContain('Thoracolumbar spinal hyperpathia');
    expect(result.problems).toContain('Kyphosis');
  });

  // ─── Test Case 3: T3-L3 Paraplegic with Absent DPP ─────────────────────
  it('handles absent deep pain perception (critical finding)', () => {
    const data = getDefaultData();
    data.t3l3_gait = 'Paraplegic';
    data.t3l3_dpp = 'Absent';
    data.t3l3_schiff = true;
    const result = generateReport('t3l3', data, allDdxSelected('t3l3'), 'Dog');

    expect(result.text).toContain('Non-ambulatory, paraplegia');
    expect(result.text).toContain('Schiff-Sherrington posture present');
    expect(result.text).toContain('Deep pain perception ABSENT pelvic limbs');
    expect(result.problems).toContain('ABSENT deep pain perception pelvic limbs');
    expect(result.problems).toContain('Schiff-Sherrington posture');
  });

  // ─── Test Case 4: Prosencephalon with Lateralization ────────────────────
  it('lateralizes prosencephalon contralateral to deficits', () => {
    const data = getDefaultData();
    data.pros_mentation = 'Obtunded';
    data.pros_menace = 'Absent';
    data.pros_menace_side = 'Left';
    data.pros_cp = 'Decreased';
    data.pros_cp_side = 'Left';
    const result = generateReport('prosencephalon', data, allDdxSelected('prosencephalon'), 'Dog');

    expect(result.text).toContain('**Mental Status**: Obtunded');
    expect(result.locLabel).toBe('Right prosencephalon'); // Contralateral
    expect(result.problems).toContain('Obtunded mentation');
  });

  // ─── Test Case 5: Peripheral Vestibular ─────────────────────────────────
  it('generates peripheral vestibular report with sympathetic signs', () => {
    const data = getDefaultData();
    data.pv_gate = 'Abnormal';
    data.pv_tilt = 'Right';
    data.pv_nystagmusType = 'Horizontal';
    data.pv_nystagmusDir = 'Left';
    data.pv_miosis = true;
    data.pv_enophthalmos = true;
    const result = generateReport('periph_vest', data, allDdxSelected('periph_vest'), 'Dog');

    expect(result.text).toContain('Head tilt to the right');
    expect(result.text).toContain('Horizontal nystagmus (fast phase left)');
    expect(result.text).toContain('miosis, enophthalmos');
    expect(result.text).toContain('sympathetic denervation');
    expect(result.problems).toContain('Vestibular ataxia');
  });

  // ─── Test Case 6: Peripheral Vestibular Normal ─────────────────────────
  it('generates normal peripheral vestibular report when gate is Normal', () => {
    const data = getDefaultData();
    data.pv_gate = 'Normal';
    const result = generateReport('periph_vest', data, allDdxSelected('periph_vest'), 'Dog');

    expect(result.text).toContain('**Gait & posture**: Ambulatory x4, no ataxia');
    expect(result.problems).toHaveLength(0);
  });

  // ─── Test Case 7: Cerebellum Normal ────────────────────────────────────
  it('generates normal cerebellum report when gate is Normal', () => {
    const data = getDefaultData();
    data.cb_gate = 'Normal';
    const result = generateReport('cerebellum', data, allDdxSelected('cerebellum'), 'Dog');

    expect(result.text).toContain('**Gait & posture**: Ambulatory x4, no ataxia');
    expect(result.problems).toHaveLength(0);
  });

  // ─── Test Case 8: Cerebellum Abnormal ──────────────────────────────────
  it('generates cerebellar report with hypermetria and tremor', () => {
    const data = getDefaultData();
    data.cb_gate = 'Abnormal';
    data.cb_gait = 'Hypermetric Ataxia';
    data.cb_side = 'Bilateral';
    data.cb_tremor = 'Intention Tremor';
    data.cb_menace = 'Absent';
    data.cb_menace_side = 'Bilateral';
    const result = generateReport('cerebellum', data, allDdxSelected('cerebellum'), 'Dog');

    expect(result.text).toContain('Hypermetric Ataxia (bilateral)');
    expect(result.text).toContain('Intention Tremor');
    expect(result.text).toContain('Absent menace');
    expect(result.text).toContain('cerebellar');
  });

  // ─── Test Case 9: Cat-specific DDx ─────────────────────────────────────
  it('uses cat DDx when species is Cat', () => {
    const data = getDefaultData();
    const catDdx = allDdxSelected('prosencephalon', 'Cat');
    const result = generateReport('prosencephalon', data, catDdx, 'Cat');

    expect(result.text).toContain('FIP');
  });

  // ─── Test Case 10: Brainstem with multiple CN deficits ──────────────────
  it('generates brainstem report with CN deficits', () => {
    const data = getDefaultData();
    data.bs_mentation = 'Obtunded';
    data.bs_gait = 'Abnormal';
    data.bs_paresis = 'Hemiparesis';
    data.bs_paresis_side = 'Left';
    data.bs_cn_eyes = 'Abnormal';
    data.bs_cn_eyes_side = 'Left';
    data.bs_cn_menace = 'Absent';
    data.bs_cn_vest = 'Abnormal';
    data.bs_cn_vest_side = 'Left';
    data.bs_cn_pathologic_nyst = 'Resting';
    data.bs_cn_pathologic_nyst_type = 'Vertical';
    const result = generateReport('brainstem', data, allDdxSelected('brainstem'), 'Dog');

    expect(result.text).toContain('Obtunded');
    expect(result.text).toContain('Hemiparesis (left)');
    expect(result.text).toContain('Absent menace (left)');
    expect(result.text).toContain('Resting vertical nystagmus');
    expect(result.problems.length).toBeGreaterThan(3);
  });

  // ─── Test Case 11: Report format uses bold markdown headers ─────────────
  it('uses bold markdown header format', () => {
    const data = getDefaultData();
    data.t3l3_gait = 'Normal';
    const result = generateReport('t3l3', data, {}, 'Dog');

    expect(result.text).toContain('**NEUROLOGIC EXAM**');
    expect(result.text).toContain('**Mental Status**:');
    expect(result.text).toContain('**Gait & posture**:');
    expect(result.text).toContain('**Cranial nerves**:');
    expect(result.text).toContain('**Postural reactions**:');
    expect(result.text).toContain('**Spinal reflexes**:');
    expect(result.text).toContain('**Tone**:');
    expect(result.text).toContain('**Muscle mass**:');
    expect(result.text).toContain('**Nociception**:');
    // Should NOT have ALL CAPS format
    expect(result.text).not.toContain('MENTAL STATUS:');
    expect(result.text).not.toContain('GAIT & POSTURE:');
  });

  // ─── Test Case 12: BAR outputs full text ────────────────────────────────
  it('outputs Bright Alert and Responsive for BAR', () => {
    const data = getDefaultData();
    data.pros_mentation = 'BAR';
    const result = generateReport('prosencephalon', data, {}, 'Dog');

    expect(result.text).toContain('**Mental Status**: Bright Alert and Responsive');
  });

  // ─── Test Case 13: T3-L3 ambulatory uses GP ataxia shorthand ────────────
  it('uses GP ataxia shorthand for proprioceptive ataxia', () => {
    const data = getDefaultData();
    data.t3l3_gait = 'Ambulatory';
    data.t3l3_ataxia = 'Proprioceptive';
    const result = generateReport('t3l3', data, {}, 'Dog');

    expect(result.text).toContain('GP ataxia');
    expect(result.text).not.toContain('proprioceptive ataxia');
  });

  // ─── Test Case 14: Myelopathy postural without side info ────────────────
  it('does not include side info for myelopathy postural reactions', () => {
    const data = getDefaultData();
    data.t3l3_gait = 'Ambulatory';
    data.t3l3_ataxia = 'Proprioceptive';
    data.t3l3_postural_pl = 'Deficits';
    const result = generateReport('t3l3', data, {}, 'Dog');

    expect(result.text).toContain('Normal in thoracic limbs, deficits in pelvic limbs');
    expect(result.text).not.toContain('(left)');
    expect(result.text).not.toContain('(right)');
    expect(result.text).not.toContain('(bilateral)');
  });

  // ─── Test Case 15: x4 shorthand ────────────────────────────────────────
  it('uses x4 shorthand for normal all limbs', () => {
    const data = getDefaultData();
    data.t3l3_gait = 'Normal';
    const result = generateReport('t3l3', data, {}, 'Dog');

    expect(result.text).toContain('Normal x4');
    expect(result.text).not.toContain('Normal all four limbs');
  });

  // ─── Test Case 16: Prosencephalon findings without side specified ──────
  it('handles prosencephalon CN findings when side is not specified', () => {
    const data = getDefaultData();
    data.pros_mentation = 'Obtunded';
    data.pros_menace = 'Absent';
    // pros_menace_side defaults to '' (unspecified)
    const result = generateReport('prosencephalon', data, allDdxSelected('prosencephalon'), 'Dog');

    // CN finding without side prefix — just the finding
    expect(result.text).toMatch(/Cranial nerves\*\*: absent menace/);
    // Should NOT have "Left" or "Right" prefix on the finding
    expect(result.text).not.toContain('Left absent');
    expect(result.text).not.toContain('Right absent');
    expect(result.text).not.toContain('()');
    // No lateralization when side not specified
    expect(result.locLabel).not.toContain('Right prosencephalon');
    expect(result.locLabel).not.toContain('Left prosencephalon');
  });
});
