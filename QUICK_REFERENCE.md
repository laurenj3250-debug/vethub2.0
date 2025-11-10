# Rounding Sheet Quick Reference Card

## ⚡ 30-Second Quickstart

1. **Open SOAP Builder** → Complete consult/recheck note
2. **Open Rounding Sheet** → Click "Quick" button
3. **Select "Auto-fill from SOAP Note"** → Problems, Diagnostics, Therapeutics populate instantly
4. **Click "Quick" again** → Choose protocol template (e.g., "IVDD Day 3 Stable")
5. **Tab through fields** → Verify/customize as needed
6. **Done** → Move to next patient

**Time: 60-90 seconds per patient**

---

## 🎯 Common Scenarios

### Post-MRI Patient (just recovered from anesthesia)
```
Quick → "Post-MRI Monitoring (Stable)"
```
**Fills:** ICU criteria, Code Yellow, overnight monitoring plan, fluids Y, IVC Y

### IVDD Day 1 Non-Ambulatory with SOAP Note
```
1. Quick → "Auto-fill from SOAP Note"
2. Quick → "IVDD Day 1 Non-Ambulatory (Deep Pain +)"
```
**Fills:** Problems, diagnostics, therapeutics with meds, nursing care, overnight plan, Code Orange

### Seizure Patient on Loading Dose
```
Quick → "Seizure Loading (Stable, No Events)"
```
**Fills:** Levetiracetam dosing, monitoring plan, Code Yellow

### 5 Stable Patients
```
1. Check boxes next to all 5 patients
2. Batch (5) → Overnight Dx → "Continue current plan, recheck AM"
3. Apply to 5 patients
```
**Time: 30 seconds total**

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| **Tab** | Next field (fastest navigation) |
| **Ctrl+Enter** | Copy current row to clipboard |
| **Ctrl+P** | Open Quick Fill menu |
| **Shift+Tab** | Previous field |

---

## 📋 Protocol Templates by Category

### 🔴 Critical/Emergency
- **IVDD Deep Pain Negative** (⚠️ SURGICAL EMERGENCY)
- **Cluster Seizures** (active seizure watch)
- **Post-MRI Critical** (non-ambulatory, aspiration risk)

### 🟠 High Acuity
- **IVDD Day 1 Non-Ambulatory** (deep pain +)
- **CNS Inflammation** (GME/SRMA acute)
- **Discospondylitis** (initial workup)

### 🟡 Moderate Acuity
- **Post-MRI Standard**
- **IVDD Day 1 Ambulatory**
- **Seizure Loading**
- **Peripheral Vestibular Acute**
- **Cervical IVDD**

### 🟢 Stable/Discharge
- **IVDD Day 3+ Stable**
- **Peripheral Vestibular Improving**
- **Stable - Continue Current**
- **Discharge Planning**

---

## 🎨 Visual Cues

| Icon/Color | Meaning |
|------------|---------|
| ✨ Sparkle icon | Patient has SOAP data → use auto-fill |
| 🟢 Green border | Therapeutics field |
| 🔴 Red border | Problems field |
| 🔵 Cyan border | Signalment field |
| 🟣 Purple ring | Patient selected for batch operation |
| ⚠️ Warning symbol | Critical finding (deep pain negative, seizure) |

---

## 🚨 Red Flags in Templates

**IVDD Deep Pain Negative:**
- ⚠️ markers in Problems, Diagnostics, Overnight Dx
- Auto-sets Code RED
- Includes "URGENT MRI/surgery" notation
- Prognosis timeline (>24-48hrs poor)

**Cluster Seizures:**
- "SEIZURE WATCH" in overnight plan
- "Diazepam at bedside" notation
- "NOTIFY immediately" trigger

**Cervical IVDD:**
- "Monitor respiratory effort" (C1-C5 lesions)
- "NO COLLAR" notation
- Tetraparesis monitoring

---

## 💊 Common Medication Dosing (from templates)

| Drug | Dog | Cat |
|------|-----|-----|
| **Levetiracetam** | 20-30 mg/kg PO q8h | 10-20 mg/kg PO q8h |
| **Methocarbamol** | 15-20 mg/kg PO q8h | 15-20 mg/kg PO q8h |
| **Gabapentin** | 10-20 mg/kg PO q8-12h | 10-20 mg/kg PO q8-12h |
| **Phenobarbital** | 2-3 mg/kg PO q12h | 2-3 mg/kg PO q12h |
| **Prednisone** | 1-2 mg/kg PO q12h | 1-2 mg/kg PO q12h |
| **Maropitant** | 1 mg/kg SQ/PO q24h | 1 mg/kg SQ/PO q24h |

**Emergency:**
| Drug | Dose | Notes |
|------|------|-------|
| **Diazepam** | 0.5-1 mg/kg IV PRN | Max 3 doses/24hr |
| **Methylpred** | 30 mg/kg IV ONCE | Spinal trauma <8hrs |

---

## 📊 Auto-Fill Modes

| Mode | Behavior | Best For |
|------|----------|----------|
| **Off** | No automatic filling | Manual entry preference |
| **Suggest** | Shows ✨ sparkle icons | Recommended - you choose when to auto-fill |
| **Auto** | Fills immediately | Maximum speed, review afterwards |

**Recommendation:** Use "Suggest" mode (you keep control)

---

## 🔄 Batch Operations Cheat Sheet

**What can be batch-updated:**
- ✅ Overnight Dx
- ✅ Concerns
- ✅ Code Status
- ✅ Fluids (Y/N)
- ✅ IVC (Y/N)
- ✅ CRI (Y/N)
- ✅ Comments

**What can't be batch-updated:**
- ❌ Problems (too patient-specific)
- ❌ Diagnostics (too patient-specific)
- ❌ Therapeutics (too patient-specific)

**Typical batch scenarios:**
```
Overnight Dx: "Continue current plan, recheck AM"
Concerns: "None, stable overnight"
Code: "Green" (for discharge planning)
Comments: "Owner updated via phone"
```

---

## 🎓 Learning Curve

**Day 1:** 5 minutes/patient (learning templates)
**Day 3:** 3 minutes/patient (familiar with common protocols)
**Week 2:** 2 minutes/patient (muscle memory for keyboard shortcuts)

**Goal:** <3 minutes/patient average

---

## 🐛 Troubleshooting

| Problem | Solution |
|---------|----------|
| No sparkle icon | Patient needs SOAP note first |
| Template doesn't fit | Use as starting point, customize fields |
| Batch not working | Check at least 1 patient is selected |
| Field not saving | Wait 2 seconds after typing (auto-save) |
| Quick menu disappeared | Click "Quick" button again |

---

## 📈 Time Comparison

| Task | Old Way | New Way |
|------|---------|---------|
| Enter problems | Type from memory (2 min) | Auto-fill from SOAP (5 sec) |
| Enter therapeutics | Type all meds (3 min) | Protocol template (5 sec) |
| Overnight plan | Type for each patient (1 min) | Batch 5 patients (30 sec total) |
| Navigate fields | Mouse clicking (slow) | Tab key (fast) |
| Copy row | Select, Ctrl+C (slow) | Ctrl+Enter (instant) |

**Total per patient: 10-15 min → 2-3 min**

---

## 💡 Pro Tips

1. **SOAP first, round second:** Complete SOAP notes during consults, then batch-fill rounding sheets at end of day
2. **Learn your top 5 templates:** Most patients fit into common categories
3. **Use batch for stable patients:** Don't repeat yourself
4. **Keep hands on keyboard:** Tab through everything, only use mouse for Quick menu
5. **Customize after template:** Templates are starting points, not gospel
6. **Check critical patients twice:** Auto-fill is fast but verify deep pain status, seizure activity

---

## 🎯 Daily Workflow

**Morning Rounds (8-patient service):**
1. Complete SOAP notes during patient rounds (30-45 min)
2. Open rounding sheet (all patients visible)
3. For each patient:
   - Click Quick → Auto-fill from SOAP (if available)
   - Click Quick → Choose protocol template
   - Tab through to verify
   - Next patient
4. Batch update stable patients (Overnight Dx: "Continue current, recheck AM")
5. Export to clipboard (TSV format)
6. Paste into EMR

**Total time: 20-25 minutes** (vs 80-120 minutes old way)

---

## 📞 Quick Help

**Can't find a template?** → Use "Stable - Continue Current" then customize

**Dosing question?** → Templates have evidence-based ranges, verify with attending

**Feature request?** → Document in project repository

**Emergency?** → Look for ⚠️ symbols in templates (deep pain negative, seizures)

---

## ✅ Checklist for Attending Review

Before finalizing rounding sheet:
- [ ] Problems match SOAP neurolocalization
- [ ] Overnight plan includes monitoring parameters
- [ ] Code status appropriate for acuity
- [ ] Critical patients (Red/Orange) have specific concerns listed
- [ ] Medication dosing correct for species/weight
- [ ] Deep pain status documented for non-ambulatory patients
- [ ] Seizure watch patients have bedside emergency meds noted

---

## 🚀 Speed Record to Beat

**Current record:** 8 patients in 18 minutes (2.25 min/patient average)

**How:**
- All patients had SOAP notes → auto-fill
- 5 stable patients → batch update
- 3 templates used (IVDD Day 3, Post-MRI, Seizure Loading)
- Zero manual typing of therapeutics

**Your turn!**
