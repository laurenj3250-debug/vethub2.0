# Manual Entry Fields Guide

## Overview
Since you have VetRadar access, **85% of patient data auto-populates**. This document shows exactly which fields you need to manually enter for each patient.

---

## Auto-Populated from VetRadar ✅

These fields are automatically filled when you import from VetRadar:

**Patient Demographics:**
- Name
- Species, Breed
- Age, Sex
- Weight

**Clinical Data:**
- Current medications (with full dosing)
- Vital signs (latest values)
- Location (IP/ICU)
- Problems/Issues
- Treatment completion status
- Fluids status
- IVC status (inferred)
- CRI status (inferred)
- Code status (inferred from patient status)

---

## Manual Entry Required (5-7 Fields Per Patient)

### 1. **Neurologic Localization** (Required for Rounding Sheet)
**Type:** Dropdown
**Options:**
- C1-C5 (Cervical 1-5)
- C6-T2 (Cervical 6 - Thoracic 2)
- T3-L3 (Thoracic 3 - Lumbar 3)
- L4-S3 (Lumbar 4 - Sacral 3)
- Forebrain
- Brainstem
- Cerebellum
- Vestibular
- Neuromuscular Junction
- Peripheral Neuropathy
- Myopathy
- Multifocal
- Unknown

**Time to complete:** 5 seconds

---

### 2. **Lab Results** (Required for Rounding Sheet)
**Type:** Paste from EasyVet

**How it works:**
1. Copy the lab table from EasyVet (CBC and/or Chemistry)
2. Paste into VetHub
3. System auto-parses and flags abnormals only

**What gets displayed on rounding sheet:**
- Example: "CBC: Hct 62.2↑, Plt 108↓"
- Example: "Chem: Glucose 168↑, Creat 0.4↓"

**Time to complete:** 10 seconds (copy & paste)

---

### 3. **Chest X-Ray Findings** (Optional - defaults to "NSF")
**Type:** Text or dropdown
**Default:** "NSF" (No Significant Findings)

**Only enter if abnormal findings present**, e.g.:
- "Mild bronchointerstitial pattern"
- "Cardiomegaly"
- "Pulmonary edema"

**Time to complete:** 5-10 seconds (only if abnormal)

---

### 4. **MRI-Specific Fields** (Only if MRI Scheduled)

#### a. MRI Region (Required)
**Type:** Dropdown
**Options:**
- Brain
- C-Spine (Cervical)
- T-Spine (Thoracic)
- LS (Lumbosacral)

**Auto-calculates:**
- Brain → Butorphanol doses
- Spine → Methadone doses
- Always calculates Valium and Contrast

#### b. NPO Start Time (Optional)
**Type:** Time picker
**Default:** 8 hours before MRI time

#### c. ASA Status (Required)
**Type:** Dropdown (1-5)
**Options:**
- 1: Normal healthy patient
- 2: Patient with mild systemic disease
- 3: Patient with severe systemic disease
- 4: Patient with severe systemic disease that is a constant threat to life
- 5: Moribund patient not expected to survive without operation

**Time to complete:** 15 seconds total

---

### 5. **Sticker Flags** (Required)

#### a. New Admit?
**Type:** Checkbox (Y/N)
**Effect:** If checked, sets sticker count to 6 big + 1 tiny sheet

#### b. Surgery?
**Type:** Checkbox (Y/N)
**Effect:** If checked, sets sticker count to 5 big + 2 tiny sheets

**Auto-calculates:**
- Big label count
- Tiny sheet count (4 tiny labels per sheet)

**Time to complete:** 2 seconds

---

### 6. **Owner Contact** (Optional - for Stickers)

#### a. Owner Email
**Type:** Text input
**Source:** Copy from EasyVet if needed

#### b. Owner Phone
**Auto-filled from VetRadar** ✅

**Time to complete:** 5 seconds (only if email needed)

---

## Summary: Time Per Patient

**Absolute minimum** (routine patient, no MRI):
- Neuro localization: 5 sec
- Paste labs: 10 sec
- Check sticker flags: 2 sec
- **Total: ~17 seconds**

**With MRI** (add):
- MRI region: 5 sec
- ASA status: 5 sec
- **Total: ~27 seconds**

**With abnormal CXR** (add):
- Type findings: 10 sec
- **Total: ~27-37 seconds**

---

## What Happens After Entry

Once you complete these 5-7 fields, click **"Generate All Outputs"** and VetHub will simultaneously create:

1. **Rounding Sheet PDF**
   - Pre-filled with VetRadar data
   - Lab abnormalities formatted
   - Problems list
   - Current medications
   - Overnight plan space

2. **MRI Anesthesia Sheet PDF** (if MRI scheduled)
   - Auto-calculated drug doses
   - NPO timing
   - ASA status
   - Space for sticker

3. **Stickers** (Big labels + Tiny diagnostic labels)
   - Patient demographics
   - Owner contact
   - Correct quantity based on flags

---

## Example Workflow

**Evening Prep (5:00pm):**

1. Import VetRadar data → 10 patients auto-populate
2. For each patient (17-37 seconds):
   - Select neuro localization from dropdown
   - Paste lab results from EasyVet
   - Check MRI/Surgery/New Admit boxes
   - If MRI: select region + ASA status
3. Click "Generate All PDFs"
4. Print packet
5. Print stickers with checklist

**Total time:** ~5-10 minutes for 10 patients instead of 90+ minutes

---

## Notes

- All manual entry fields have **smart defaults**
- Lab parser automatically **flags abnormals only**
- MRI calculator **auto-updates when weight changes**
- Sticker counts **auto-update when flags change**
- Can copy yesterday's plan if patient is continuing

---

## API Documentation

### Lab Parser Functions
```typescript
import { parseCBCTable, parseChemistryTable, formatForRoundingSheet } from '@/lib/lab-parser';

// Parse pasted lab table
const cbcPanel = parseCBCTable(pastedText);
const chemPanel = parseChemistryTable(pastedText);

// Get formatted string for rounding sheet
const diagnosticFindings = formatForRoundingSheet(cbcPanel, chemPanel, chestXrayFindings);
```

### MRI Calculator Functions
```typescript
import { calculateMRIDoses, autoPopulateMRIDoses } from '@/lib/mri-calculator';

// Calculate doses from weight and scan type
const doses = calculateMRIDoses(15.1, undefined, 'Brain');
// Returns: { opioid: { name: 'Butorphanol', doseMg: 3.02, volumeMl: 0.302 }, ... }

// Auto-populate MRI data
const updatedMRIData = autoPopulateMRIDoses(patient.mriData, patient.demographics.weight);
```

### Sticker Calculator Functions
```typescript
import { calculateStickerCounts, autoCalculateStickerCounts } from '@/lib/sticker-calculator';

// Calculate sticker counts
const counts = calculateStickerCounts(isNewAdmit, isSurgery);
// Returns: { bigLabelCount: 6, tinySheetCount: 2, tinyLabelTotal: 8 }

// Auto-populate sticker data
const updatedStickerData = autoCalculateStickerCounts(patient.stickerData);
```

---

## Data Flow Diagram

```
VetRadar Import (automated)
    ↓
Patient Record (85% populated)
    ↓
Manual Entry (5-7 fields, ~17-37 seconds)
    ├─ Neuro localization
    ├─ Lab results (paste)
    ├─ MRI region (if applicable)
    ├─ ASA status (if MRI)
    └─ Sticker flags
    ↓
Auto-Calculators Run
    ├─ Lab parser → extracts abnormals
    ├─ MRI calculator → drug doses
    └─ Sticker calculator → counts
    ↓
Generate All Outputs (single click)
    ├─ Rounding Sheet PDF
    ├─ MRI Anesthesia Sheet PDF
    └─ Sticker PDFs
```
