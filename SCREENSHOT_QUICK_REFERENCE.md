# Screenshot Quick Reference - VetRadar & EzyVet

## Quick Decision Tree

**What do you want to extract?**

📋 **Medications & treatments** → Screenshot VetRadar treatment sheet → Choose "Treatment Sheet"

📝 **Clinical notes & exam** → Screenshot SOAP/consult note → Choose "SOAP Note"

👤 **Patient demographics** → Screenshot patient info page → Choose "Patient Demographics"

---

## VetRadar Treatment Sheet

### What to Capture

```
┌─────────────────────────────────────────────┐
│ Patient: Buddy Smith                        │  ← Include patient name
│ 12kg, 5yo MN Dachshund                     │  ← Include weight & signalment
├─────────────────────────────────────────────┤
│ MEDICATIONS                                 │
│ ┌────────────────────────────────────────┐ │
│ │ Gabapentin  10mg/kg PO  q8h   Started  │ │  ← FULL medication table
│ │ Tramadol    3mg/kg PO   q12h  09:00    │ │
│ │ Omeprazole  1mg/kg PO   SID   09:00    │ │
│ └────────────────────────────────────────┘ │
│                                             │
│ MONITORING                                  │
│ □ Neuro checks q4h                         │  ← Include monitoring
│ □ Pain score TID                           │
│ □ Record urination/defecation              │
│                                             │
│ IV FLUIDS                                   │  ← Include IV orders
│ LRS @ 45 mL/hr                             │
│                                             │
│ DIAGNOSTICS                                 │  ← Include diagnostic orders
│ □ Recheck CBC in AM                        │
└─────────────────────────────────────────────┘
```

### What to EXCLUDE

❌ Top menu bar with "File, Edit, View" etc.
❌ Irrelevant browser tabs
❌ Billing/invoice sections
❌ Empty treatment rows
❌ Scheduling/appointment widgets

### Keyboard Shortcuts

**Windows**: `Win + Shift + S` (Snipping Tool)
**Mac**: `Cmd + Shift + 4` (Screenshot selection)
**Full Screen**: `Print Screen` (Windows) or `Cmd + Shift + 3` (Mac)

---

## EzyVet Consult Notes

### What to Capture

```
┌─────────────────────────────────────────────┐
│ CONSULTATION - Dr. Johnston                 │
│ Patient: Buddy Smith (12345)               │  ← Patient name & ID
│ 5yo MN Dachshund, 12kg                     │  ← Signalment
│                                             │
│ HISTORY:                                    │
│ Presented for acute onset paraparesis,     │  ← Clinical history
│ non-ambulatory since yesterday. Owner      │
│ reports yelping when picked up.            │
│                                             │
│ CURRENT MEDICATIONS:                        │
│ - Carprofen 2.2mg/kg PO BID               │  ← Current meds
│ - Gabapentin 10mg/kg PO TID               │
│                                             │
│ PHYSICAL EXAM:                              │
│ BAR, HR 90, RR 24, T 38.5C                │  ← Vitals & exam
│ MS: Bright, alert, responsive              │
│ Gait: Non-ambulatory paraparesis           │
│ CN: Normal                                  │
│ Postural reactions: Absent pelvic limbs    │
│                                             │
│ ASSESSMENT:                                 │
│ T3-L3 myelopathy - IVDD vs FCE            │  ← Neurolocalization & DDx
│                                             │
│ PLAN:                                       │
│ - MRI tomorrow AM                          │  ← Diagnostics & plan
│ - Continue current medications             │
│ - Strict cage rest                         │
└─────────────────────────────────────────────┘
```

### What to EXCLUDE

❌ Navigation sidebar
❌ Patient financial summary
❌ Upcoming appointment reminders
❌ Unrelated medical history from years ago
❌ Staff notes not relevant to clinical case

---

## EzyVet Patient Demographics

### What to Capture

```
┌─────────────────────────────────────────────┐
│ PATIENT INFORMATION                         │
│                                             │
│ Name: Buddy                                │  ← Patient name
│ ID: 12345                                  │  ← Patient ID
│ Species: Canine                            │  ← Species
│ Breed: Dachshund                           │  ← Breed
│ DOB: 2019-03-15 (5 years old)            │  ← Age/DOB
│ Sex: Male Neutered                         │  ← Sex
│ Weight: 12kg                               │  ← Weight
│ Color: Red                                 │  ← Color/markings
│                                             │
│ OWNER INFORMATION                           │
│ Name: Sarah Smith                          │  ← Owner name
│ Phone: (555) 123-4567                      │  ← Owner phone
│ Email: sarah@email.com                     │  ← Owner email
│ Address: 123 Main St, City, State 12345   │  ← Address
│                                             │
│ MEDICAL SUMMARY                             │
│ Allergies: None known                      │  ← Allergies
│ Current Medications:                        │  ← Current meds
│ - Gabapentin 10mg/kg PO TID               │
│ - Tramadol 3mg/kg PO BID                  │
│                                             │
│ Active Problems:                            │  ← Active diagnoses
│ - T3-L3 IVDD - Grade 4/5 paresis          │
│ - Chronic pancreatitis                     │
└─────────────────────────────────────────────┘
```

### What to EXCLUDE

❌ Invoice history
❌ Payment methods on file
❌ Rabies certificate attachments
❌ Old/resolved medical problems (unless relevant)

---

## Screenshot Quality Checklist

Before uploading, verify:

- [ ] Text is sharp and legible (not blurry)
- [ ] Patient name visible (for verification)
- [ ] Medication doses include units (mg/kg, mL, etc.)
- [ ] Frequency visible (q8h, BID, TID, etc.)
- [ ] No screen glare or reflections obscuring text
- [ ] File size under 10MB
- [ ] Entire relevant section captured (not cut off mid-sentence)

---

## Common Mistakes to Avoid

### 1. Incomplete Medication Data

❌ **Wrong**: Screenshot only shows "Gabapentin - 09:00"
✅ **Right**: Shows "Gabapentin 10mg/kg PO q8h - 09:00"

*Why*: AI needs dose, route, and frequency to populate correctly

### 2. Cut-Off Text

❌ **Wrong**: Screenshot cuts off at "Patient: Buddy Sm..."
✅ **Right**: Full patient name "Patient: Buddy Smith" visible

*Why*: Partial data leads to extraction errors

### 3. Low Resolution

❌ **Wrong**: Phone photo of computer screen (blurry, pixelated)
✅ **Right**: Native screenshot from computer (crisp, clear)

*Why*: AI vision needs legible text to extract accurately

### 4. Too Much Irrelevant Data

❌ **Wrong**: Screenshot includes full EzyVet dashboard with 10 unrelated panels
✅ **Right**: Cropped to just the consult note section

*Why*: Extra data slows processing and increases error risk

### 5. Wrong Parse Type Selected

❌ **Wrong**: Upload VetRadar treatment sheet → Select "SOAP Note"
✅ **Right**: Upload VetRadar treatment sheet → Select "Treatment Sheet"

*Why*: AI uses different extraction logic for each type

---

## Workflow Examples

### Example 1: Morning Rounds - Multiple Patients

**Scenario**: You have 5 patients to round on, each with VetRadar treatment sheet updates.

**Efficient Workflow**:
1. Open VetRadar → Select Patient 1
2. Screenshot treatment sheet → Save as "patient1.png"
3. Repeat for all 5 patients (5 screenshots total)
4. Open VetHub SOAP Builder
5. For each patient:
   - Upload screenshot → Choose "Treatment Sheet"
   - AI extracts meds in 5-10 seconds
   - Copy extracted data to "Current Medications"
   - Complete rest of SOAP note
6. **Time saved**: 15-20 minutes for 5 patients

### Example 2: Recheck Appointment

**Scenario**: Buddy Smith returning for 2-week IVDD recheck. You need previous visit details.

**Efficient Workflow**:
1. Open EzyVet → Find Buddy's last consult note (2 weeks ago)
2. Screenshot entire SOAP note
3. Open VetHub SOAP Builder
4. Upload screenshot → Choose "SOAP Note"
5. AI populates: Last visit date, previous exam findings, current meds
6. Update only what changed: Today's history, current exam, progression
7. **Time saved**: 5-7 minutes

### Example 3: New Patient Intake

**Scenario**: New patient referred from rDVM. EzyVet has demographics but no neuro consult yet.

**Efficient Workflow**:
1. Open EzyVet patient page
2. Screenshot demographics section (name, signalment, owner contact)
3. Open VetHub SOAP Builder
4. Upload screenshot → Choose "Patient Demographics"
5. AI fills: Name, age, sex, breed, owner info, allergies
6. Complete initial consultation fields manually (history, exam, A&P)
7. **Time saved**: 2-3 minutes on data entry

---

## Pro Tips

### Multi-Monitor Setup
- Keep VetRadar/EzyVet on one screen
- Keep VetHub on second screen
- Screenshot → Alt+Tab → Upload (seamless workflow)

### Batch Screenshots
- Take all screenshots first
- Upload and process in batch during quieter moments
- Reduces context-switching during busy clinic

### Template Screenshots
- For common medication protocols (IVDD, status epilepticus, etc.)
- Screenshot reference treatment sheet once
- Upload to extract "standard protocol"
- Save as template in SOAP Builder

### Verify Before Administering
- **ALWAYS** double-check extracted medication doses
- Cross-reference with original screenshot
- If dose seems wrong, manually correct it
- Clinical judgment > AI extraction

---

## Medication Dose Extraction - What AI Looks For

AI is trained to extract in this format:

**Drug Name** | **Dose** | **Route** | **Frequency** | **Instructions**

Examples of correctly extracted data:

```
Gabapentin 10mg/kg PO q8h (with food)
Levetiracetam 20mg/kg IV q8h (slow IV push over 5 min)
Maropitant 1mg/kg SQ SID
Fentanyl CRI 3mcg/kg/hr IV
Prednisolone 0.5mg/kg PO BID (taper after 2 weeks)
```

If AI sees this in your screenshot:
```
Medication         Dose        Route   Freq    Time
Gabapentin        10mg/kg     PO      q8h     09:00
```

It will extract as:
```
Gabapentin 10mg/kg PO q8h
```

---

## Troubleshooting Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| "Unclear medication dose" warning | Dose partially visible or unusual formatting | Manually verify/correct dose from original screenshot |
| Patient name not extracted | Name cut off or in unusual location | Retake screenshot ensuring name is fully visible |
| Medications not separated properly | Table formatting unclear | Use "Paste & Parse" instead, copy meds as text |
| Empty extraction result | Screenshot too blurry or wrong parse type | Retake high-res screenshot, verify parse type selection |
| Owner phone number incorrect | Handwriting or special formatting | Manually enter phone number |

---

## Safety Reminders

🚨 **CRITICAL**: This tool is designed to **reduce typing**, NOT replace clinical judgment.

- Always verify medication doses against original screenshot
- Any flagged warnings require manual review
- Do not administer medications based solely on AI extraction
- If in doubt, manually enter data or ask attending

---

## Quick Access Checklist

Print and keep near your computer:

```
SCREENSHOT UPLOAD CHECKLIST
───────────────────────────────────────
BEFORE UPLOADING:
□ Text is legible and sharp
□ Patient name visible
□ Medication doses show units
□ No cut-off text
□ Correct data visible (meds, history, demographics)

AFTER AI EXTRACTION:
□ Verify medication doses match screenshot
□ Check for warning symbols (⚠️)
□ Review all extracted data for accuracy
□ Manually correct any errors
□ Cross-reference critical information

TIME SAVED PER PATIENT:
☑ Treatment sheet: 3-5 minutes
☑ SOAP note: 5-7 minutes
☑ Demographics: 2-3 minutes
───────────────────────────────────────
```

---

**Remember**: Speed is great, but accuracy is non-negotiable in veterinary medicine. Use this tool to work smarter, not riskier.
