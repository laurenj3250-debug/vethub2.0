# Enhanced Rounding Sheet - User Guide

## Overview
The Enhanced Rounding Sheet is designed to dramatically reduce documentation time for neurology residents during morning rounds. Target time: **2-3 minutes per patient** (down from 10-15 minutes).

---

## 🚀 NEW FEATURES

### 1. Auto-Population from SOAP Notes
**Time Saved: 4-6 minutes per patient**

When you complete a SOAP note for a patient, their rounding sheet data can be automatically populated.

**How to use:**
- In the rounding sheet, look for the sparkle icon (✨) next to patients with SOAP data
- Click the **"Quick"** button in the Actions column
- Select **"Auto-fill from SOAP Note"** at the top of the menu
- Problems, diagnostics, therapeutics, and concerns are instantly filled

**Auto-population modes:**
- **Off**: No automatic filling (manual entry only)
- **Suggest**: Shows sparkle icons for patients with SOAP data (recommended)
- **Auto**: Automatically fills when opening rounding sheet

**What gets auto-filled:**
- **Problems**: Neurolocalization + DDx from SOAP
- **Diagnostics**: "Diagnostics Today" section from SOAP
- **Therapeutics**: Treatments + Medications from SOAP
- **Concerns**: Progression notes from SOAP

---

### 2. Neurology Protocol Templates
**Time Saved: 2-3 minutes per patient**

One-click templates for common neurology scenarios with evidence-based protocols.

**How to use:**
1. Click **"Quick"** button in Actions column for any patient
2. Browse templates by category:
   - **Post-Op**: Post-MRI monitoring (stable or critical)
   - **Medical**: IVDD management, seizure protocols, vestibular disease
   - **Monitoring**: Stable patients, ongoing care
   - **Discharge Prep**: Pre-discharge planning

**Available Templates:**

#### Post-MRI Monitoring
- **Post-MRI Standard**: Stable anesthesia recovery
- **Post-MRI Critical**: Non-ambulatory/aspiration risk patients

#### IVDD Protocols
- **IVDD Day 1 Ambulatory**: Painful but walking
- **IVDD Day 1 Non-Ambulatory (Deep Pain +)**: Critical care, high nursing needs
- **IVDD Deep Pain Negative**: ⚠️ SURGICAL EMERGENCY template with red flags
- **IVDD Day 3+ Stable**: Continuing medical management
- **Cervical IVDD**: C1-C5 lesions with respiratory considerations

#### Seizure Management
- **Cluster Seizures**: Active seizure monitoring with emergency protocols
- **Seizure Loading (Stable)**: Anticonvulsant loading without active events

#### Vestibular Disease
- **Peripheral Vestibular Acute**: Severe signs, nausea management
- **Peripheral Vestibular Day 3+**: Improving, discharge planning

#### Other Protocols
- **Discospondylitis**: Culture workup, empiric antibiotics
- **CNS Inflammation**: GME/SRMA with immunosuppression
- **Stable - Continue Current**: Quick one-click for stable patients
- **Discharge Planning**: Pre-discharge checklist

**What templates include:**
- Pre-filled Problems, Diagnostics, Therapeutics
- ICU criteria
- Code status (Green/Yellow/Orange/Red based on acuity)
- Overnight plan with monitoring parameters
- Specific concerns and safety considerations
- Fluids/IVC/CRI status

---

### 3. Batch Operations
**Time Saved: 3-5 minutes when updating multiple patients**

Apply the same value to multiple patients at once.

**How to use:**
1. Check the boxes next to patients you want to update (in Actions column)
2. Click **"Batch (X)"** button at the top (X = number selected)
3. Select which field to update (Overnight Dx, Concerns, Code, etc.)
4. Enter the value (e.g., "Continue current plan, recheck AM")
5. Click **"Apply to X patients"**

**Common batch scenarios:**
- Overnight Dx: "Continue current meds, recheck AM"
- Concerns: "None, stable overnight"
- Code Status: Switch multiple patients to "Green" for discharge
- Comments: "Owner updated by phone"

---

### 4. Keyboard Shortcuts
**Time Saved: 1-2 minutes per sheet**

Navigate faster without reaching for the mouse.

**Available shortcuts:**
- **Tab**: Move to next field (natural flow through all columns)
- **Ctrl+Enter**: Copy current row to clipboard
- **Ctrl+P**: Open Quick Fill menu for current patient

**Pro tip:** Keep hands on keyboard and use Tab to fly through fields. Only use mouse for Quick Fill templates.

---

### 5. Smart Field Updates
**Time Saved: Prevents errors, saves re-entry time**

All fields auto-save as you type. No need to click "Save" buttons.

**Features:**
- Debounced updates (saves after you stop typing)
- Visual feedback on hover/focus with color-coded borders
- Dropdowns for standardized fields (Code, IVC, Fluids, CRI)

---

## 📋 CLINICAL ACCURACY FEATURES

### Safety Checks in Templates

**Deep Pain Negative Protocol:**
- Labeled with ⚠️ warnings in Problems, Diagnostics, and Overnight Dx
- RED code status automatically set
- Emergency surgical notation impossible to miss
- Includes prognosis timeline (>24-48hrs = poor prognosis)

**Seizure Protocols:**
- Includes max dosing limits (e.g., "Diazepam max 3 doses in 24hr")
- Species-specific dosing (dog vs cat for levetiracetam)
- Emergency medications pre-listed

**IVDD Protocols:**
- Automatically includes nursing care (turns, bladder expression)
- Progression monitoring parameters
- Timeline-specific templates (Day 1 vs Day 3+)

---

## 🎯 TYPICAL WORKFLOW (2-3 minutes per patient)

### For Post-MRI Patient:
1. Open rounding sheet
2. Click patient name, verify signalment/location are correct (auto-filled from admit)
3. Click **"Quick"** → Select **"Post-MRI Monitoring (Stable)"** or **"Critical"**
4. All fields auto-populate with appropriate protocols
5. Tab through to verify/customize any fields
6. Done - move to next patient

**Total time: ~90 seconds**

### For IVDD Medical Management Patient with SOAP Note:
1. Open rounding sheet
2. See sparkle icon (✨) indicating SOAP data available
3. Click **"Quick"** → **"Auto-fill from SOAP Note"**
4. Problems, Diagnostics, Therapeutics auto-filled from SOAP
5. Click **"Quick"** → **"IVDD Day 3+ Stable"** to add standardized overnight plan
6. Tab to Concerns field, verify
7. Done

**Total time: ~60 seconds**

### For Multiple Stable Patients:
1. Check boxes next to 5 stable patients
2. Click **"Batch (5)"**
3. Select "Overnight Dx"
4. Enter "Continue current plan, recheck AM"
5. Apply to all 5
6. Individual quick review of each (15 seconds each)

**Total time: ~2 minutes for 5 patients = 24 seconds/patient**

---

## 💡 PRO TIPS

### Maximize Speed:
1. **Use SOAP Builder first**: Complete SOAP notes during consults, then auto-fill rounding sheets in 1 click
2. **Learn 3-5 common protocols**: Most neurology patients fit into standard categories
3. **Use batch operations**: Don't repeat yourself for stable patients
4. **Keyboard navigation**: Tab through fields, use Ctrl+Enter to copy rows

### Customize for Your Service:
- Common medications can be added via the **"+"** button in Therapeutics
- Create custom snippets by typing frequently-used text once, then copy/paste
- Use **"Stable - Continue Current"** template as a starting point, then customize

### Quality Control:
- Templates are guidelines - always verify appropriateness for individual patients
- Critical findings (deep pain negative, seizures) have visual flags - don't ignore them
- Code status (Green/Yellow/Orange/Red) auto-fills based on acuity but double-check

---

## 📊 EXPECTED TIME SAVINGS

**Old Workflow (per patient):**
- Re-type problems from SOAP: 1-2 min
- Re-type diagnostics: 1 min
- Type out therapeutic plan: 2-3 min
- Type overnight plan: 1-2 min
- Type concerns: 1 min
- Fill remaining fields: 1-2 min
- **Total: 10-15 minutes per patient**

**New Workflow (per patient with SOAP):**
- Auto-fill from SOAP: 10 sec
- Apply protocol template: 10 sec
- Quick verification/customization: 30-60 sec
- **Total: 2-3 minutes per patient**

**For 8-patient neurology service:**
- Old: 80-120 minutes
- New: 16-24 minutes
- **Savings: 1-1.5 hours per rounding session**

---

## 🔧 TROUBLESHOOTING

**"Auto-fill from SOAP" button not showing:**
- Patient must have a completed SOAP note first
- Check that Auto-populate mode is not set to "Off"
- Sparkle icon (✨) indicates SOAP data is available

**Batch operations not working:**
- Ensure you've checked at least one patient checkbox
- Select a field from the dropdown
- Enter a value before clicking Apply

**Fields not saving:**
- Check internet connection (updates save to server)
- Wait 1-2 seconds after typing for auto-save
- Refresh page if needed - data should persist

**Template doesn't fit my patient:**
- Use template as starting point, then customize fields
- Templates are guidelines, not rigid requirements
- You can mix-and-match (e.g., apply protocol, then auto-fill therapeutics from SOAP)

---

## 📞 FEATURE REQUESTS / BUG REPORTS

Missing a protocol you use frequently? Found a dosing error? Want a new template?

Document requests in the project repository or contact the development team.

---

## 🎓 TRAINING CHECKLIST

**Before first use:**
- [ ] Complete at least one SOAP note to enable auto-population
- [ ] Review available protocol templates (click "Quick" to browse)
- [ ] Practice keyboard shortcuts on a test patient
- [ ] Try batch operations on 2-3 patients

**Daily use:**
- [ ] Complete SOAP notes during consults/rechecks
- [ ] Use Quick Fill for standardized scenarios
- [ ] Batch update stable patients
- [ ] Export final rounding sheet to EMR

**Weekly review:**
- [ ] Are you completing rounding sheets in <3 min/patient?
- [ ] Any missing protocols to request?
- [ ] Review accuracy of auto-filled data

---

## VERSION HISTORY

**v2.0 (Current)**
- Auto-population from SOAP Builder
- 15+ neurology-specific protocol templates
- Batch operations for multi-patient updates
- Keyboard shortcuts
- Smart field updates

**v1.0**
- Basic inline editing table
- Manual medication selector
- Copy row to clipboard
- Export to TSV/CSV
