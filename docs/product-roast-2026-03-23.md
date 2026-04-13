# Product Roast + Vision Report: Neuro Exam Feature
Generated: 2026-03-23

## Executive Summary

You've built a clinically sophisticated neuro exam tool with ACVIM Diplomate-level knowledge baked in. The localization-first approach is genuinely innovative — no other vet neuro app thinks this way. But right now, it's a tool built by Lauren, for Lauren. To make it THE tool every neurology resident wants, you need to solve three fundamental gaps: (1) exams exist in a vacuum — no patient, no history, no serial comparison, (2) the workflow assumes you've already localized before you examine, which inverts how most residents actually think, and (3) there's no learning layer — this could teach neurolocalization while documenting it, but currently it just documents.

The app you have: a fast neuro exam form generator.
The app you could have: the tool that makes every resident better at neurolocalization.

---

## Part 1: The Roast

### Critical Issues 🔥🔥🔥

#### 1. Exams are orphaned — no patient identity
**What:** Exams aren't linked to any patient. You generate a report that says "NEUROLOGIC EXAM" but not WHO was examined. No patient name, no signalment, no date in the report header.
**Where:** Report output in `generate-report.ts`, patient linking absent in UI
**Why it matters:** Every clinical document needs: Patient name, species/breed/age/sex/weight, date, examiner. Without this, a resident copies the report into their EMR and has to manually add all context. That's 30 seconds of friction per exam that should be zero. More critically — you can't track serial exams on the same patient if you don't know which patient it is.
**Severity:** 🔥🔥🔥

#### 2. No serial exam comparison
**What:** Neurological monitoring requires comparing today's exam to yesterday's. "Improved from non-ambulatory to ambulatory paraparesis" is the most important clinical information in neuro ICU. The app has no way to view previous exams or compare findings over time.
**Where:** Missing feature entirely
**Why it matters:** This is the #1 job of a neuro resident on ICU rounds — documenting progression. Without it, the app only helps with the initial exam, not the daily monitoring that's 80% of the work.
**Severity:** 🔥🔥🔥

#### 3. No completed exam history
**What:** After clicking "Complete Exam," the exam vanishes from the user's perspective. The data is in the database, but there's no UI to view past exams. A resident who completed 5 exams today can't review any of them.
**Where:** No list/history view exists
**Why it matters:** Clinical documentation must be retrievable. "What did the neuro exam show on admission?" is a question asked 10 times a day on rounds. If the app can't answer it, residents won't trust it with their documentation.
**Severity:** 🔥🔥🔥

---

### Moderate Issues 🔥🔥

#### 4. Workflow assumes localization before examination
**What:** The app opens to T3-L3 selected. The workflow is: pick a localization → fill in findings. But in real clinical practice, many residents (especially junior ones) examine first, then localize. The current design inverts this for less experienced users.
**Where:** Page load defaults to `activeLoc: 't3l3'` in `INITIAL_LOC_STATE()`
**Why it matters:** A PGY-1 resident might not know the localization before examining. They need to enter findings and have the app HELP them localize — not assume they've already done it. This is the difference between a documentation tool and a clinical decision support tool.
**Severity:** 🔥🔥

#### 5. Default field values create false documentation risk
**What:** Many fields have clinically meaningful defaults. Prosencephalon defaults CP side to "Left." PV defaults head tilt to "Left." Brainstem defaults paresis to "Ambulatory Tetraparesis." If a resident doesn't change a default, the report will contain incorrect lateralization or finding severity.
**Where:** `getDefaultData()` in `constants.ts`, lines 284-350+
**Why it matters:** In clinical documentation, wrong lateralization is worse than no lateralization. If a resident hastily taps through and doesn't notice "Left" is selected when the deficit is on the right, the clinical record is wrong. Patient safety issue.
**Severity:** 🔥🔥

#### 6. DDx can't be reordered by likelihood
**What:** Differential diagnoses are listed in a fixed order with checkboxes to include/exclude. But clinical DDx lists are ordered by LIKELIHOOD for the specific patient — the most likely diagnosis first. There's no way to drag-reorder or rank them.
**Where:** DDx section in `ReportPanel.tsx` and `NeuroLocFilter.tsx`
**Why it matters:** An unordered DDx list is a study aid. An ordered DDx list is a clinical plan. Residents are expected to present DDx in order of likelihood on rounds. If the app can't do this, they'll still need to manually reorder in their notes.
**Severity:** 🔥🔥

#### 7. No free-text notes per section
**What:** Every toggle and checkbox maps to predefined findings. But real neuro exams frequently have observations that don't fit buttons: "inconsistent findings on repeated testing," "sedation wearing off during exam," "patient became fractious, exam limited." No way to add context.
**Where:** All localization sections in `NeuroLocFilter.tsx`
**Why it matters:** A neuro exam without clinical context is half an exam. The nuance is in the notes. Without free-text, the app forces a false precision that experienced clinicians will reject as too rigid.
**Severity:** 🔥🔥

#### 8. No standardized severity grading
**What:** No Modified Frankel Score (Grade 0-5 for myelopathy patients). No standard grading scale output. These are expected in every neuro medical record and are how clinicians communicate severity concisely.
**Where:** Missing from report output
**Why it matters:** "Grade 3/5 T3-L3 myelopathy" communicates more in 6 words than a paragraph of findings. Every neuro service uses grading. Without it, the report feels incomplete to an experienced neurologist reading it.
**Severity:** 🔥🔥

#### 9. No onboarding for first-time users
**What:** A new user opens the app and sees 9 localization buttons, a species toggle, and a "Reset to Normal" button. No explanation of workflow, no first-use guidance, no "how to use this" hint.
**Where:** `page.tsx` — no onboarding component
**Why it matters:** The localization-first paradigm is unique. No other neuro exam app works this way. Users need 30 seconds of context to understand WHY they're picking a localization first and WHAT the app will do with their input. Without this, the "aha moment" never happens.
**Severity:** 🔥🔥

#### 10. One active exam at a time
**What:** Single `neuro-exam-draft-id` in localStorage means only one draft exists. On a busy ICU day, a resident might need to start exams on 3 patients, get interrupted, come back. Currently impossible — starting a new exam saves and closes the previous one.
**Where:** `useNeuroExamState.ts` — single draft ID pattern
**Why it matters:** Clinical work is interrupt-driven. The app should match the clinician's reality, not force a linear workflow.
**Severity:** 🔥🔥

---

### Minor Issues 🔥

#### 11. No timestamp in report
**What:** Generated report doesn't include date/time of exam.
**Where:** `generate-report.ts` — report text assembly
**Why it matters:** All clinical documentation must be timestamped. Minor because residents will add it when pasting into EMR, but it should be automatic.

#### 12. Templates are limited and not user-creatable
**What:** 6 predefined templates. Can't save a custom exam as a template.
**Where:** `loc-templates.ts`
**Why it matters:** Different hospitals have different common presentations. A user who sees 5 discospondylitis cases a week should be able to save their typical findings as a template.

#### 13. Report format not customizable
**What:** All-caps section headers (MENTAL STATUS, GAIT & POSTURE). Some EMRs and services prefer different formats (bold headers, sentence case, with/without problem list). No format options.
**Where:** `generate-report.ts` — hardcoded format
**Why it matters:** Adoption barrier. If the output doesn't match your service's note style, you won't use it.

#### 14. No "examiner" field
**What:** No field for who performed the exam. `createdBy` exists in the DB model but is never populated from the UI.
**Where:** POST/PATCH API calls in `useNeuroExamState.ts`
**Why it matters:** Clinical records need examiner identification. Minor because most residents will add their name in the EMR.

#### 15. Mobile scroll position resets on state changes
**What:** When a user taps a toggle on mobile, the component re-renders and may shift scroll position. On long localization sections (brainstem with all CN groups expanded), this is disorienting.
**Where:** NeuroLocFilter.tsx — re-renders on every state change
**Why it matters:** Frustrating on mobile during a real exam, especially when you're trying to work quickly standing next to a patient.

---

### Statistics
- Critical: 3 issues
- Moderate: 7 issues
- Minor: 5 issues
- Total: 15 issues

### Top Pain Points
1. **Exams are disconnected from patients and time** — no identity, no history, no comparison
2. **No clinical decision support** — documents findings but doesn't help localize or grade
3. **Too rigid** — no free-text, no custom templates, no DDx ordering, no format options

---

## Part 2: The Vision

### Feature Area 1: Patient-Connected Exams

**Current State:** Exams exist as standalone documents with no patient identity.

**The Problem:** A neuro exam without context is like lab results without a patient name. The report is technically accurate but clinically useless in isolation. Residents can't track patients over time, can't compare exams, can't show progression on rounds.

**The Vision:** Opening the neuro exam presents a patient picker (search by name, species, or case number). Selecting a patient auto-populates signalment in the report header. Previous exams for that patient appear as a timeline sidebar. Tapping a previous exam shows a diff: "Since last exam: Improved from Non-Ambulatory to Ambulatory paraparesis. DPP now PRESENT (was ABSENT)." The report header includes: Patient name, species/breed, age, weight, date/time, examiner — zero manual entry.

**The Psychology:** IKEA Effect — residents build a clinical history over time. The more exams they've documented on a patient, the more valuable the app becomes. Switching cost increases with each documented exam.

**Implementation Sketch:**
- Patient selector component (search existing VetHub patients)
- Exam history timeline sidebar
- Exam diff engine (compare two NeuroExamData objects, generate change summary)
- Report header template with patient metadata
- Effort: Large (3-5 days)

---

### Feature Area 2: "Examine First, Localize Second" Mode

**Current State:** User picks a localization, then enters findings specific to that location.

**The Problem:** This works brilliantly for experienced neurologists who localize in their head while examining. But for residents learning neurolocalization — the primary audience — the cognitive load is backwards. They need to enter what they SEE, then have the app help them figure out WHERE the lesion is.

**The Vision:** Two modes, toggled at the top:

**Localization Mode** (current): Pick a loc → enter findings → get report. For experienced users.

**Examination Mode** (new): Walk through the standard neuro exam in order (mentation → gait → cranial nerves → postural reactions → spinal reflexes → nociception). Enter findings as you examine. At the end, the app suggests the most likely neurolocalization based on the finding pattern, with a confidence explanation: "Your findings (UMN pelvic limbs, normal thoracic limbs, intact cranial nerves, T-L hyperpathia) are consistent with T3-L3 myelopathy." The resident can accept or modify the localization.

**The Psychology:**
- Competence (Self-Determination Theory): Residents feel they're learning and getting better at localization, not just filling in a form
- Recognition over Recall: Show the localization logic, don't require the resident to know it upfront
- Endowed Progress Effect: "You've already documented the findings — now let's localize"

**Implementation Sketch:**
- "Examination Mode" tab alongside current localization mode
- Step-through UI for standard exam sections (7-8 steps)
- Localization suggestion engine (rule-based from finding patterns)
- Educational explanations for suggested localization
- Effort: Large (5-7 days)

---

### Feature Area 3: Severity Grading

**Current State:** Report describes findings in narrative form. No standardized severity score.

**The Problem:** Every neurology service communicates severity via grading scales. "Grade 3" is universal shorthand. Without it, the report feels like it was written by someone who doesn't know the conventions.

**The Vision:** Auto-calculated Modified Frankel Score for myelopathy patients:
- Grade 5: Spinal hyperpathia only, normal neuro exam
- Grade 4: Ambulatory paraparesis/tetraparesis
- Grade 3: Non-ambulatory paraparesis/tetraparesis
- Grade 2: Non-ambulatory, intact deep pain perception
- Grade 1: Non-ambulatory, absent deep pain perception
- Grade 0: Absent deep pain >48 hours

The grade appears prominently in the report and in the exam header. For prosencephalon cases: Modified Glasgow Coma Scale. For peripheral vestibular: standardized vestibular disease severity score.

**The Psychology:** Competence — residents feel they're producing professional-grade documentation. Recognition over Recall — the app knows the grading scale so the resident doesn't have to remember it.

**Implementation Sketch:**
- Pure function: `calculateGrade(locId, data) → { scale: string, grade: number, label: string }`
- Add to report output after neurolocalization line
- Visual badge in the UI (Grade 3/5 — Non-Ambulatory Paraparesis)
- Unit tests for all grade boundaries
- Effort: Small (2-3 hours)

---

### Feature Area 4: Clinical Notes Layer

**Current State:** All findings are button/toggle-based. No free-text.

**The Problem:** Clinical reality doesn't fit in checkboxes. "Exam limited due to patient temperament." "Findings inconsistent — consider repeating under sedation." "Owner reports episodes at home consistent with seizure activity." These observations are often the most important part of the exam.

**The Vision:** Each section gets an optional "Clinical note" text input — collapsed by default, expanded with one tap. These notes appear in the report under the relevant section. Plus a global "Clinical Impression" text area at the bottom for the examiner's overall assessment — the part that isn't findings but IS critical: "Findings consistent with acute onset T3-L3 myelopathy. Given breed (Dachshund), signalment, and acute onset, IVDD Hansen Type I is most likely. Recommend advanced imaging."

**The Psychology:** Autonomy (Self-Determination Theory) — lets clinicians express their clinical judgment, not just data-enter findings. The app becomes a partner in documentation, not a constraint.

**Implementation Sketch:**
- Collapsible text input per section (component: `ClinicalNote`)
- Global "Clinical Impression" textarea above report panel
- Include in report output
- Effort: Medium (4-6 hours)

---

### Feature Area 5: Teaching Mode / Localization Explainer

**Current State:** App shows DDx per localization. No explanation of WHY findings map to localizations.

**The Problem:** This is the single biggest missed opportunity. The app has all the clinical knowledge embedded in its logic (UMN vs LMN patterns, specific CN nuclei locations, central vs peripheral vestibular differentiators). But it's invisible to the user. A resident using this learns nothing about neurolocalization — they just fill in forms.

**The Vision:** A toggleable "Learn" overlay that, for each finding, shows a one-liner explanation:
- Patellar reflex increased → "UMN sign: lesion above L4 (femoral nerve origin)"
- Absent menace with intact PLR → "Cerebellar lesion: CN VII motor pathway intact but cerebellar modulation lost"
- Proprioceptive deficits with peripheral vestibular findings → "Red flag: suggests central vestibular disease, not peripheral"

These are the exact teaching points a diplomate makes on rounds. Baking them into the app turns documentation into education.

**The Psychology:** Competence — residents feel like they're learning while working. This is Duolingo's magic: the productive thing (documentation) IS the learning thing. Temptation Bundling — you want to document the exam quickly (want), you should learn the neuroanatomy (should), the app bundles both.

**Implementation Sketch:**
- `TEACHING_NOTES` constant: `Record<string, string>` mapping data keys to teaching one-liners
- Toggle in header: "Learn Mode" on/off
- When on, each toggle/button shows a subtle tooltip or inline hint
- Effort: Medium (4-6 hours for content, 2 hours for UI)

---

## Part 3: Prioritized Roadmap

### Quick Wins (This Week) — Impact >= 3, Effort <= 2

| # | Item | Impact | Effort | Details |
|---|------|--------|--------|---------|
| 1 | Add timestamp to report | 3 | 1 | Add `new Date().toLocaleString()` to report header |
| 2 | Add Modified Frankel Score | 5 | 2 | Pure function from existing gait/DPP data, add to report |
| 3 | Add "Clinical Impression" textarea | 4 | 2 | Global free-text at bottom, include in report |
| 4 | Fix dangerous defaults (lateralization) | 4 | 1 | Default side selectors to "Bilateral" not "Left" |
| 5 | Add examiner name field | 3 | 1 | Text input in header, persist in localStorage, include in report |
| 6 | Onboarding hint for first use | 3 | 2 | One-time dismissible banner explaining the workflow |
| 7 | Add "Notes" text input per section | 4 | 2 | Collapsible text input, include in report |

### Big Bets (Transform the App)

| # | Item | Impact | Effort | Why It Matters |
|---|------|--------|--------|---------------|
| 1 | **Patient-Connected Exams + History** | 5 | 4 | Turns isolated documents into a clinical timeline. This is the difference between "nice form" and "essential clinical tool." |
| 2 | **"Examine First" Mode with Localization Suggestion** | 5 | 5 | Makes this a LEARNING tool, not just a documentation tool. This is the feature that would make every neurology program want it. |
| 3 | **Teaching Mode / Localization Explainer** | 5 | 3 | The Duolingo-for-neurolocalization moment. Residents learn while they document. Zero extra effort for massive educational value. |
| 4 | **Serial Exam Comparison** | 5 | 4 | The "killer feature" for ICU neuro patients. "Improved from Grade 2 to Grade 4 over 72 hours" is the exact data rounds need. |
| 5 | **DDx Drag-to-Reorder** | 3 | 2 | Small effort, meaningful clinical value. Makes DDx presentation-ready. |

### Nice to Have (Backlog)

- User-creatable templates (save current exam as template)
- Report format options (sentence case, no problem list, custom headers)
- PDF export with hospital header
- Multi-draft support (multiple exams in progress)
- PWA installation for iPad home screen
- EMR integration (FHIR endpoints)
- Exam sharing (link to view exam without login)

---

## Part 4: The One-Paragraph Vision

Imagine: A neurology resident walks into the ICU, taps the neuro exam app on their iPad, selects "Buddy - Dachshund - Day 3 Post-Op." Yesterday's exam loads as a baseline. They walk through the exam — mentation, gait, cranial nerves, reflexes — tapping findings as they go. The app suggests "T3-L3 Myelopathy, Grade 4" and explains why. They tap "Clinical Impression," type "Improved from Grade 2. Continue conservative management." They hit Complete. The report — timestamped, patient-identified, graded, with comparison to yesterday — copies to clipboard in their service's preferred format. On the walk back to the computer, they think: "That used to take me 15 minutes. That took 90 seconds." They text the link to their co-resident.

That's the app. Everything in this roadmap moves toward it.

---

## Appendix: Psychology Principles Applied

| Feature | Principle | Mechanism |
|---------|-----------|-----------|
| Patient history + serial exams | IKEA Effect | Residents value the clinical timeline they've built |
| Examine-first mode | Competence (SDT) | Learning while documenting |
| Teaching mode tooltips | Temptation Bundling | Want: document quickly. Should: learn neuroanatomy. Bundle: both at once |
| Severity grading | Recognition over Recall | App knows the scale so you don't have to |
| Onboarding hint | Endowed Progress Effect | "You already know neuroanatomy — this app just makes it faster" |
| Custom templates | Autonomy (SDT) | Clinicians control their own workflow |
