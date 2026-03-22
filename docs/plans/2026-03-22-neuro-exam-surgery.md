# Neuro Exam Surgery — Fix 4 CRITICALs from Roast

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix the 4 highest-risk issues (RPN 240-432) from the neuro exam roast: untyped data, render cascades, untestable report engine, and impossible-to-record-normal localizations.

**Architecture:** Extract report generation into a pure, typed, unit-tested function. Replace `Record<string, any>` with a flat typed interface. Fix the useEffect dependency to use stable references. Add "Normal" gates to Cerebellum and Peripheral Vestibular.

**Tech Stack:** TypeScript (strict), Vitest (new — for unit testing pure functions), React 18, Next.js 15

**Research Sources:**
- Existing TanStack Query patterns in `src/hooks/use-patients-query.ts` — optimistic updates, mutation protection
- Existing Zod patterns in `src/app/api/residency/daily-entry/route.ts` — input validation
- Playwright config at `playwright.config.ts` — E2E tests (13 existing specs)
- No unit test framework currently installed — Vitest will be added

**Production Checklist:**
- [x] Centralized config (constants.ts already centralizes all data)
- [ ] Type safety — replace `Record<string, any>` with typed interface
- [ ] Unit tests for report generation (7 documented test cases)
- [ ] Auto-save stability — no render cascades
- [ ] Clinical accuracy — all localizations can record normal findings

**Roast Issues Addressed:**

| # | Issue | RPN | Task |
|---|-------|-----|------|
| 1 | `Record<string, any>` for 120 clinical data keys | 432 | Task 1 |
| 2 | Auto-save render cascades (data ref changes every render) | 420 | Task 3 |
| 3 | Report generation untestable (500-line useEffect) | 288 | Tasks 2, 4 |
| 4 | Cerebellum/PV can't record normal findings | 240 | Task 5 |

---

## Task 1: Type LocData properly

**Why:** `Record<string, any>` means a typo in any of the 120 data keys silently produces `undefined` in clinical reports. TypeScript can't help.

**Approach:** Replace `Record<string, any>` with a flat `NeuroExamData` interface. Keep it flat (not discriminated union per loc) because the data object stores ALL localization findings simultaneously — switching tabs doesn't clear other tabs' data.

**Files:**
- Modify: `src/components/neuro-exam/types.ts`
- Modify: `src/components/neuro-exam/constants.ts` (return type of `getDefaultData`)
- Modify: `src/components/neuro-exam/NeuroLocFilter.tsx` (props type)
- Modify: `src/components/neuro-exam/useNeuroExamState.ts` (updateData signature)

### Step 1: Define the typed interface

Replace the contents of `src/components/neuro-exam/types.ts`:

```typescript
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
```

**Note:** Two NEW fields are added: `pv_gate` and `cb_gate`. These support the "Normal" gate for Cerebellum and Peripheral Vestibular (Task 5). They default to `'Abnormal'` to preserve backward compatibility with existing exams.

### Step 2: Update `getDefaultData` return type

In `src/components/neuro-exam/constants.ts`, change the function signature:

```typescript
// OLD
export function getDefaultData(): Record<string, any> {

// NEW
export function getDefaultData(): NeuroExamData {
```

Add the import at the top:
```typescript
import { type LocExamState, type NeuroExamData } from './types';
```

Remove the existing `LocExamState` import if present.

Add two new default fields inside `getDefaultData()`:

```typescript
    // ── Peripheral Vestibular ──
    pv_gate: 'Abnormal',   // NEW — defaults to Abnormal for backward compat
    pv_tilt: 'Left',
    // ... (rest unchanged)

    // ── Cerebellum ──
    cb_gate: 'Abnormal',   // NEW — defaults to Abnormal for backward compat
    cb_mentation: 'QAR',
    // ... (rest unchanged)
```

### Step 3: Update `updateData` in `useNeuroExamState.ts`

```typescript
// OLD
const updateData = useCallback((key: string, value: any) => {

// NEW
const updateData = useCallback((key: string, value: NeuroExamData[keyof NeuroExamData]) => {
```

Add the import:
```typescript
import { type LocId, type LocExamState, type LocTemplate, type NeuroExamData } from './types';
```

### Step 4: Update `NeuroLocFilterProps` in `NeuroLocFilter.tsx`

```typescript
// OLD
updateData: (key: string, value: any) => void;

// NEW
updateData: (key: string, value: NeuroExamData[keyof NeuroExamData]) => void;
```

Add import:
```typescript
import { type LocId, type LocExamState, type NeuroExamData } from './types';
```

### Step 5: Run typecheck

```bash
cd /Users/laurenjohnston/Documents/vethub2.0 && npm run typecheck
```

Expected: PASS (or type errors that reveal real bugs — fix them).

### Step 6: Commit

```bash
git add src/components/neuro-exam/types.ts src/components/neuro-exam/constants.ts \
  src/components/neuro-exam/useNeuroExamState.ts src/components/neuro-exam/NeuroLocFilter.tsx
git commit -m "refactor(neuro-exam): replace Record<string, any> with typed NeuroExamData interface

Adds compile-time safety to all 120+ neuro exam data keys.
Typos in data keys now cause TypeScript errors instead of silent 'undefined' in clinical reports.
Adds pv_gate and cb_gate fields for Task 5 (normal findings support)."
```

---

## Task 2: Extract report generation into a pure function

**Why:** 500 lines of clinical logic inside a `useEffect` can't be unit tested. The 7 test cases in `NEURO-EXAM-OUTPUT-TEST.md` exist only as prose.

**Approach:** Extract into `src/components/neuro-exam/generate-report.ts` — a pure function with zero React dependencies. Returns a `NeuroReport` object (report text, problems array, localization label).

**Files:**
- Create: `src/components/neuro-exam/generate-report.ts`
- Modify: `src/components/neuro-exam/NeuroLocFilter.tsx` (replace inline logic with function call)

### Step 1: Create the report generator module

Create `src/components/neuro-exam/generate-report.ts`:

```typescript
import { type LocId, type NeuroExamData } from './types';
import { LOC_NAMES, getDdx } from './constants';

// ─── Output Types ────────────────────────────────────────────────────────────

export interface NeuroReport {
  /** Full clinical report text (copy-paste ready) */
  text: string;
  /** Problem list extracted from findings */
  problems: string[];
  /** Computed neurolocalization label */
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

// ─── Per-Localization Report Generators ──────────────────────────────────────
// (Each returns { sections, problems, locLabel })

// ... [IMPLEMENTATION NOTE FOR ENGINEER]:
// Move the ENTIRE body of each `if (activeLoc === 'xxx')` block
// from NeuroLocFilter.tsx lines 114-588 into individual functions here.
// The functions are:
//   generateT3L3(data: NeuroExamData): { s: ReportSections, prob: string[], locLabel: string }
//   generateC6T2(data: NeuroExamData): ...
//   generateC1C5(data: NeuroExamData): ...
//   generateL4S3(data: NeuroExamData): ...
//   generateProsencephalon(data: NeuroExamData): ...
//   generateBrainstem(data: NeuroExamData): ...
//   generatePeriphVest(data: NeuroExamData): ...
//   generateCerebellum(data: NeuroExamData): ...
//   generateMultifocal(data: NeuroExamData): ...
//
// Each function:
// 1. Takes data (NeuroExamData) as input
// 2. Starts with the default sections object (see DEFAULTS below)
// 3. Mutates `s` and `prob` exactly as the current useEffect does
// 4. Returns { s, prob, locLabel }
//
// The logic is a DIRECT COPY from NeuroLocFilter.tsx — do not change
// any clinical logic. Only restructure into separate functions.

const DEFAULT_SECTIONS: ReportSections = {
  mental: 'Quiet, alert, responsive',
  gait: 'Normal ambulation, no ataxia',
  cn: 'No deficits noted',
  postural: 'Normal all four limbs',
  reflexes: 'Normal all four limbs',
  tone: 'Normal all four limbs',
  mass: 'Normal, symmetric',
  nociception: 'No spinal hyperpathia. Intact nociception all limbs',
};

// [Each generate function goes here — copy the logic verbatim from
//  NeuroLocFilter.tsx lines 114-588. The exact code is in the current
//  file; move it, don't rewrite it.]

// ─── Main Entry Point ────────────────────────────────────────────────────────

export function generateReport(
  activeLoc: LocId,
  data: NeuroExamData,
  ddxSelections: Record<string, boolean>,
  species: 'Dog' | 'Cat',
): NeuroReport {
  const s: ReportSections = { ...DEFAULT_SECTIONS };
  let prob: string[] = [];
  let locLabel = LOC_NAMES[activeLoc] || activeLoc;

  // Dispatch to per-localization generator
  const generators: Record<LocId, () => void> = {
    t3l3: () => { /* call generateT3L3 */ },
    c6t2: () => { /* call generateC6T2 */ },
    c1c5: () => { /* call generateC1C5 */ },
    l4s3: () => { /* call generateL4S3 */ },
    prosencephalon: () => { /* call generateProsencephalon */ },
    brainstem: () => { /* call generateBrainstem */ },
    periph_vest: () => { /* call generatePeriphVest */ },
    cerebellum: () => { /* call generateCerebellum */ },
    multifocal: () => { /* call generateMultifocal */ },
  };
  generators[activeLoc]();

  const uniqueProb = [...new Set(prob)];
  const ddxList = getDdx(activeLoc, species);
  const chosenDdx = ddxList.filter((d) => ddxSelections[d]);

  const text =
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
    `\n\nNEUROLOCALIZATION: ${locLabel}` +
    (chosenDdx.length > 0 ? `\n\nDIFFERENTIAL DIAGNOSES:\n` + chosenDdx.map((d, i) => `${i + 1}. ${d}`).join('\n') : '');

  return { text, problems: uniqueProb, locLabel };
}
```

**CRITICAL IMPLEMENTATION NOTE:** The engineer MUST copy the clinical logic line-for-line from `NeuroLocFilter.tsx` lines 114-588. Do NOT rewrite, simplify, or "improve" the clinical text generation. Every string, every conditional, every edge case must be preserved exactly. Clinical accuracy > code elegance.

### Step 2: Replace the useEffect in NeuroLocFilter.tsx

Delete the entire report-generation `useEffect` (lines ~97-613) and replace with:

```typescript
import { generateReport } from './generate-report';

// Inside the component, replace the useEffect with useMemo:
const { report, problems: computedProblems, locLabel: computedLocLabel } = useMemo(() => {
  if (examState.reportLocked) {
    return { report: examState.report, problems: [], locLabel: '' };
  }
  const result = generateReport(activeLoc, data, examState.ddxSelections, species);
  return { report: result.text, problems: result.problems, locLabel: result.locLabel };
}, [activeLoc, data, examState.ddxSelections, species, examState.reportLocked, examState.report]);

// Sync report to state (only when it changes)
useEffect(() => {
  if (!examState.reportLocked && report !== examState.report) {
    setReport(report);
  }
}, [report, examState.reportLocked, examState.report, setReport]);
```

Remove the `problems` and `locLabel` useState hooks — use `computedProblems` and `computedLocLabel` directly.

Remove the format helper functions at the top of the file (`fmtReflex`, `fmtSide`, `fmtSideAdj`, `fmtMentation`, `fmtLimb`) — they now live in `generate-report.ts`.

### Step 3: Run typecheck

```bash
npm run typecheck
```

### Step 4: Manual smoke test

```bash
npm run dev
```

Open `http://localhost:3000/neuro-exam`. Verify:
- T3-L3 with ambulatory paraparesis generates same report as before
- Switching localizations updates the report
- Copy to clipboard works
- Report lock/unlock works

### Step 5: Commit

```bash
git add src/components/neuro-exam/generate-report.ts src/components/neuro-exam/NeuroLocFilter.tsx
git commit -m "refactor(neuro-exam): extract report generation into pure function

Moves 500 lines of clinical logic from useEffect into generate-report.ts.
Zero clinical logic changes — exact same output for all inputs.
Now unit-testable without React."
```

---

## Task 3: Fix auto-save render cascades

**Why:** Every state update creates a new `data` object reference → `useEffect` fires → `setReport()` → another state update → auto-save triggers. 2+ renders per click, unnecessary API calls.

**Approach:** Three fixes:
1. The report generation is now a `useMemo` (Task 2), not a `useEffect` that calls `setReport()` on every render
2. Debounce localStorage writes alongside API saves
3. Use a ref for the report sync to avoid triggering auto-save cycles

**Files:**
- Modify: `src/components/neuro-exam/useNeuroExamState.ts`

### Step 1: Stabilize localStorage writes with debounce

In `useNeuroExamState.ts`, replace the un-debounced localStorage backup effect (lines 108-114):

```typescript
// OLD (fires on EVERY render)
useEffect(() => {
  if (!currentExamId || isLoading) return;
  try {
    localStorage.setItem(`neuro-exam-backup-${currentExamId}`, JSON.stringify(examState));
  } catch {
    // localStorage full or unavailable — silently skip
  }
}, [examState, currentExamId, isLoading]);

// NEW (debounced — piggybacks on the auto-save timer)
// Remove this separate effect entirely. Instead, add localStorage write
// inside the existing auto-save effect:
```

Modify the auto-save effect (lines 118-142):

```typescript
useEffect(() => {
  if (!currentExamId || isLoading) return;

  // Immediate localStorage backup (cheap, synchronous)
  try {
    localStorage.setItem(`neuro-exam-backup-${currentExamId}`, JSON.stringify(examState));
  } catch {
    // localStorage full or unavailable
  }

  // Debounced DB save
  const timeoutId = setTimeout(async () => {
    setIsSaving(true);
    try {
      const response = await fetch(`/api/neuro-exams/${currentExamId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sections: examState }),
      });
      if (!response.ok) {
        throw new Error(`Auto-save returned ${response.status}`);
      }
    } catch (error) {
      console.error('Auto-save failed:', error);
      toast({ title: 'Auto-save failed', description: 'Changes may not be saved. Check your connection.', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  }, 1000);

  return () => clearTimeout(timeoutId);
}, [examState, currentExamId, isLoading, toast]);
```

### Step 2: Break the setReport → auto-save cycle

The key issue: Task 2's `useEffect` calls `setReport()` which updates `examState` which triggers auto-save. Fix by using a ref to track whether the report change came from auto-generation (skip auto-save) vs user edit (do auto-save).

Actually, since Task 2 moves report generation to `useMemo` and only syncs to state when the computed report differs, the cycle is already broken:
- `useMemo` computes report (no state update)
- `useEffect` syncs to state ONLY if `report !== examState.report`
- After sync, `examState.report` matches `report`, so the effect won't fire again

Verify this by checking that the report sync effect has a stable guard:

```typescript
useEffect(() => {
  if (!examState.reportLocked && report !== examState.report) {
    setReport(report);
  }
}, [report, examState.reportLocked, examState.report, setReport]);
```

This fires once per actual report change, not per render. The auto-save will fire once (from the setReport update), which is correct behavior.

### Step 3: Replace window.location.reload() in handleNewExam

```typescript
// OLD
const handleNewExam = useCallback(() => {
  if (!confirm('Start a new exam? Current exam will be saved.')) return;
  localStorage.removeItem('neuro-exam-draft-id');
  if (currentExamId) {
    localStorage.removeItem(`neuro-exam-backup-${currentExamId}`);
  }
  window.location.reload();
}, [currentExamId]);

// NEW — reset state instead of full page reload
const handleNewExam = useCallback(async () => {
  if (!confirm('Start a new exam? Current exam will be saved.')) return;

  // Save current exam first (don't rely on auto-save)
  if (currentExamId) {
    try {
      await fetch(`/api/neuro-exams/${currentExamId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sections: examState }),
      });
    } catch {
      // Best effort — exam was already auto-saved recently
    }
    localStorage.removeItem(`neuro-exam-backup-${currentExamId}`);
  }

  // Create new exam
  try {
    const response = await fetch('/api/neuro-exams', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sections: INITIAL_LOC_STATE() }),
    });
    if (response.ok) {
      const exam = await response.json();
      setCurrentExamId(exam.id);
      localStorage.setItem('neuro-exam-draft-id', exam.id);
      setExamState(INITIAL_LOC_STATE());
      toast({ title: 'New exam started', description: 'Previous exam saved.' });
    }
  } catch {
    toast({ title: 'Error', description: 'Could not create new exam', variant: 'destructive' });
  }
}, [currentExamId, examState, toast]);
```

### Step 4: Fix handleComplete race condition

```typescript
// OLD — reload after 1.5s timeout, race with save
const handleComplete = useCallback(async () => {
  const proceed = confirm('Finalize and submit this exam?');
  if (!proceed) return;
  // ... save, then setTimeout reload 1.5s

// NEW — no reload, clean state transition
const handleComplete = useCallback(async () => {
  if (!confirm('Finalize and submit this exam?')) return;
  if (!currentExamId) {
    toast({ title: 'Error', description: 'No active exam to complete', variant: 'destructive' });
    return;
  }
  setIsSaving(true);
  try {
    const response = await fetch(`/api/neuro-exams/${currentExamId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sections: examState }),
    });
    if (!response.ok) throw new Error(`Save returned ${response.status}`);

    localStorage.removeItem('neuro-exam-draft-id');
    localStorage.removeItem(`neuro-exam-backup-${currentExamId}`);
    toast({ title: 'Exam completed!', description: 'Your neuro exam has been saved.' });

    // Create a fresh exam (same as handleNewExam but without confirm)
    const newResponse = await fetch('/api/neuro-exams', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sections: INITIAL_LOC_STATE() }),
    });
    if (newResponse.ok) {
      const newExam = await newResponse.json();
      setCurrentExamId(newExam.id);
      localStorage.setItem('neuro-exam-draft-id', newExam.id);
      setExamState(INITIAL_LOC_STATE());
    }
  } catch {
    toast({ title: 'Error', description: 'Failed to save exam', variant: 'destructive' });
  } finally {
    setIsSaving(false);
  }
}, [currentExamId, examState, toast]);
```

### Step 5: Run typecheck + manual smoke test

```bash
npm run typecheck
npm run dev
```

Verify: Click buttons rapidly, check that only 1 API call fires per change (open Network tab), no infinite loops.

### Step 6: Commit

```bash
git add src/components/neuro-exam/useNeuroExamState.ts
git commit -m "fix(neuro-exam): eliminate render cascades and race conditions

- Merge localStorage backup into debounced auto-save effect
- Replace window.location.reload() with state reset in handleNewExam
- Fix handleComplete race condition (no more setTimeout reload)
- Report sync only fires once per actual change, not per render"
```

---

## Task 4: Add Vitest + unit tests for report generation

**Why:** 7 test cases documented in prose. 0 automated. The report generator is now a pure function (Task 2), so we can unit test it.

**Files:**
- Modify: `package.json` (add vitest)
- Create: `vitest.config.ts`
- Create: `src/components/neuro-exam/__tests__/generate-report.test.ts`

### Step 1: Install Vitest

```bash
cd /Users/laurenjohnston/Documents/vethub2.0
npm install -D vitest
```

### Step 2: Create vitest.config.ts

```typescript
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    include: ['src/**/__tests__/**/*.test.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

### Step 3: Add test script to package.json

```json
"test:unit": "vitest run",
"test:unit:watch": "vitest"
```

### Step 4: Write the tests

Create `src/components/neuro-exam/__tests__/generate-report.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { generateReport } from '../generate-report';
import { getDefaultData } from '../constants';

// Helper: all DDx selected for a given localization
function allDdxSelected(loc: string, species: 'Dog' | 'Cat' = 'Dog'): Record<string, boolean> {
  const { getDdx } = require('../constants');
  return Object.fromEntries(getDdx(loc, species).map((d: string) => [d, true]));
}

describe('generateReport', () => {
  // ─── Test Case 1: All Normal (T3-L3 default) ───────────────────────────
  it('generates normal T3-L3 report with default data', () => {
    const data = getDefaultData();
    data.t3l3_gait = 'Normal';
    const result = generateReport('t3l3', data, allDdxSelected('t3l3'), 'Dog');

    expect(result.text).toContain('MENTAL STATUS: Quiet, alert, responsive');
    expect(result.text).toContain('GAIT & POSTURE: Normal ambulation, no ataxia');
    expect(result.text).toContain('CRANIAL NERVES: No deficits noted');
    expect(result.text).toContain('POSTURAL REACTIONS: Normal all four limbs');
    expect(result.text).toContain('SPINAL REFLEXES: Normal all four limbs');
    expect(result.text).toContain('TONE: Normal all four limbs');
    expect(result.text).toContain('MUSCLE MASS: Normal, symmetric');
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

    expect(result.text).toContain('Non-ambulatory paraparesis with proprioceptive ataxia');
    expect(result.text).toContain('Normal thoracic limb gait');
    expect(result.text).toContain('Hyperpathia on palpation of thoracolumbar spine');
    expect(result.text).toContain('Kyphosis noted');
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

    expect(result.text).toContain('Paraplegic');
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

    expect(result.text).toContain('MENTAL STATUS: Obtunded');
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

    expect(result.text).toContain('GAIT & POSTURE: Normal ambulation, no ataxia');
    expect(result.problems).toHaveLength(0);
  });

  // ─── Test Case 7: Cerebellum Normal ────────────────────────────────────
  it('generates normal cerebellum report when gate is Normal', () => {
    const data = getDefaultData();
    data.cb_gate = 'Normal';
    const result = generateReport('cerebellum', data, allDdxSelected('cerebellum'), 'Dog');

    expect(result.text).toContain('GAIT & POSTURE: Normal ambulation, no ataxia');
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
});
```

### Step 5: Run tests — expect them to FAIL first

```bash
npm run test:unit
```

Expected: Tests fail because `generate-report.ts` has placeholder implementations. This is the RED phase.

### Step 6: Complete the implementation in generate-report.ts

Move the actual clinical logic from the old NeuroLocFilter.tsx useEffect (preserved in git history from Task 2) into the per-localization functions. Run tests after each localization until all pass.

```bash
npm run test:unit
```

Expected: All 10 tests PASS (GREEN phase).

### Step 7: Commit

```bash
git add vitest.config.ts package.json package-lock.json \
  src/components/neuro-exam/__tests__/generate-report.test.ts \
  src/components/neuro-exam/generate-report.ts
git commit -m "test(neuro-exam): add vitest + 10 unit tests for report generation

Tests cover: normal exams, paraparesis, absent DPP, prosencephalon
lateralization, peripheral vestibular (normal + abnormal), cerebellum
(normal + abnormal), cat-specific DDx, brainstem CN deficits.
All tests pass against extracted pure function."
```

---

## Task 5: Add "Normal" gate to Cerebellum and Peripheral Vestibular

**Why:** Cerebellum has 0/3 normal gait options. PV assumes head tilt and nystagmus are always present. You literally can't record a normal exam for these localizations.

**Approach:** Add a `cb_gate` and `pv_gate` toggle at the top of each section. When "Normal", show no sub-fields and generate a normal report. When "Abnormal", show current UI. Default to "Abnormal" for backward compatibility with existing exams.

**Files:**
- Modify: `src/components/neuro-exam/NeuroLocFilter.tsx` (UI)
- Modify: `src/components/neuro-exam/generate-report.ts` (report logic)
- Already done: `types.ts` (Task 1 added `pv_gate` and `cb_gate`)
- Already done: `constants.ts` (Task 1 added defaults)

### Step 1: Update Peripheral Vestibular UI

In `NeuroLocFilter.tsx`, find the `{activeLoc === 'periph_vest' && (` block (~line 1065). Wrap the existing content in a gate:

```tsx
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
        {/* EXISTING PV UI — keep everything from the warning banner
            through the proprioception toggle, unchanged */}
        <div className="bg-[#FFF3CD] border-2 border-black rounded-xl p-3 text-sm font-semibold text-gray-900 flex items-center gap-2">
          {/* ... existing warning banner ... */}
        </div>
        <LocToggle label="Head Tilt" ... />
        {/* ... rest of existing PV UI ... */}
      </>
    )}
  </div>
)}
```

### Step 2: Update Cerebellum UI

Find the `{activeLoc === 'cerebellum' && (` block (~line 1099). Add a gate:

```tsx
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
        {/* EXISTING CEREBELLUM UI — keep everything from mentation
            through postural reactions, unchanged */}
        <LocToggle label="Mentation" ... />
        {/* ... rest of existing cerebellum UI ... */}
      </>
    )}
  </div>
)}
```

### Step 3: Update report generation for Normal gates

In `generate-report.ts`, update the cerebellum and PV generators:

```typescript
// In the cerebellum generator:
if (data.cb_gate === 'Normal') {
  // Return all-normal sections, empty problems
  return;  // s and prob stay at defaults
}
// ... existing cerebellar logic ...

// In the periph_vest generator:
if (data.pv_gate === 'Normal') {
  // Return all-normal sections, empty problems
  return;  // s and prob stay at defaults
}
// ... existing PV logic ...
```

### Step 4: Update templates

In `src/components/neuro-exam/loc-templates.ts`, add the gate field to the Peripheral Vestibular template:

```typescript
// In the PV template data:
pv_gate: 'Abnormal',
// ... existing fields ...
```

### Step 5: Run unit tests

```bash
npm run test:unit
```

Expected: All tests pass, including the new Test Cases 6 and 7 from Task 4 that test the Normal gates.

### Step 6: Run typecheck + smoke test

```bash
npm run typecheck
npm run dev
```

Verify in browser:
- Go to Cerebellum tab → see "Cerebellar Findings: Normal / Abnormal" toggle
- When Normal → no sub-fields shown, report shows all normal
- When Abnormal → existing UI appears
- Same for Peripheral Vestibular

### Step 7: Commit

```bash
git add src/components/neuro-exam/NeuroLocFilter.tsx \
  src/components/neuro-exam/generate-report.ts \
  src/components/neuro-exam/loc-templates.ts
git commit -m "fix(neuro-exam): add Normal gate to Cerebellum and Peripheral Vestibular

Previously impossible to record normal findings for these localizations.
Cerebellum had 0/3 normal gait options. PV assumed pathology.
New gate toggle at top of each section: Normal hides sub-fields and
generates all-normal report. Defaults to Abnormal for backward compat."
```

---

## Task 6: Final verification

### Step 1: Full typecheck

```bash
npm run typecheck
```

Expected: 0 errors.

### Step 2: All unit tests

```bash
npm run test:unit
```

Expected: 10/10 pass.

### Step 3: Build

```bash
npm run build
```

Expected: Build succeeds.

### Step 4: E2E smoke test

```bash
npm run dev
```

Walk through each localization in the browser:
- [ ] T3-L3: Normal → Ambulatory → Non-Amb → Paraplegic (check DPP)
- [ ] C6-T2: Normal → Two-Engine → reflexes
- [ ] C1-C5: Normal → Tetraparesis
- [ ] L4-S3: Normal → Paraparesis → Paraplegic
- [ ] Prosencephalon: BAR → Obtunded, menace, circling, lateralization
- [ ] Brainstem: QAR → Abnormal gait, CN groups
- [ ] **Cerebellum: Normal → Abnormal → hypermetria, tremor**
- [ ] **Periph Vest: Normal → Abnormal → head tilt, nystagmus, sympathetic**
- [ ] Multifocal: Select areas, CN detail

For each: verify report text matches expectations. Copy to clipboard works.

### Step 5: Commit final state

```bash
git add -A
git commit -m "chore(neuro-exam): final verification — all 4 CRITICALs resolved

- NeuroExamData typed interface (RPN 432 → 0)
- Render cascades eliminated (RPN 420 → 0)
- Report generation unit-tested (RPN 288 → 0)
- Normal findings for Cerebellum/PV (RPN 240 → 0)"
```

---

## Self-Roast

| Question | Answer |
|----------|--------|
| What happens if this crashes? | Report generation is pure — worst case it throws, report stays blank. Auto-save still works independently. |
| What happens on slow network? | Same as before — debounced auto-save with localStorage backup. handleComplete now awaits the save instead of racing. |
| What happens on mobile? | No UI changes except new toggles (44px+ touch targets, same as existing). |
| Is this hardcoded anywhere else? | Default data keys are single-source in `getDefaultData()`. Types are single-source in `types.ts`. |
| Where are the tests? | 10 unit tests in `__tests__/generate-report.test.ts`. E2E via Playwright (existing). |
| Would a user know if this succeeded or failed? | Toast notifications on save/complete/error (unchanged). |

## What This Plan Does NOT Fix (MAJOR items from roast, future work)

- **No API authentication** (RPN 189) — needs project-wide auth strategy
- **No PATCH input validation** (RPN 150) — add Zod schema to API route
- **DDx resets on tab switch** (RPN 120) — store DDx per-localization
- **No patient linking in UI** (RPN 120) — needs patient selector component
- **No exam history view** (RPN 80) — needs list page
