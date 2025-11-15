# Testing Guide - VetRadar Integration & Unified Patient System

## Overview

This guide walks you through testing the complete VetRadar integration and unified patient system, from import to PDF generation.

---

## Prerequisites

### 1. Environment Setup

Create `.env.local` in the root directory:

```bash
# VetRadar Credentials
VETRADAR_EMAIL=your-email@example.com
VETRADAR_PASSWORD=your-password

# Optional
VETRADAR_BASE_URL=https://app.vetradar.com
```

### 2. Install Dependencies

```bash
npm install
```

Dependencies already installed:
- ✅ jspdf
- ✅ jspdf-autotable
- ✅ tsx
- ✅ playwright

---

## Test 1: Command-Line Import Test

**Purpose**: Verify VetRadar login, patient import, and data mapping work correctly

**Time**: ~1-2 minutes

### Steps:

1. **Set environment variables**:
   ```bash
   export VETRADAR_EMAIL="your-email@example.com"
   export VETRADAR_PASSWORD="your-password"
   ```

2. **Run test script**:
   ```bash
   npm run test:vetradar
   ```

   Or directly:
   ```bash
   npx tsx scripts/test-vetradar-import.ts
   ```

3. **Expected output**:
   ```
   🚀 VetRadar Import Test Script

   Step 1: Logging in to VetRadar...
   ✅ Login successful!

   Step 2: Importing active Neurology/Neurosurgery patients...
   ✅ Import successful! Found 10 patients

   ═══════════════════════════════════════════════════════════
   ✅ Successfully imported 10 patients from VetRadar

   📊 Import Statistics:
     • Auto-populated: 85% of patient data
     • Manual entry required: 5-7 fields per patient
     • Total time estimate: ~3.0 minutes (avg 18s per patient)

   📝 Manual Entry Required:
     • Neurologic Localization (dropdown): 10 patients
     • Lab Results (paste from EasyVet): 10 patients
     • Sticker Flags (New Admit / Surgery checkboxes): 10 patients
   ═══════════════════════════════════════════════════════════

   📋 Patient 1: Albert Fasano
   ─────────────────────────────────────────────────────────
   Demographics:
     • Species: Canine
     • Breed: German Shepherd Dog
     • Age: 5y 2m
     • Sex: MN
     • Weight: 19.4kg

   Location & Status:
     • Location: ICU
     • Status: Active
     • Code Status: Yellow

   Medications:
     • Gabapentin 100mg PO TID
     • Methadone 0.2mg/kg IV q4h
     • ...

   ✅ Test Complete! ✅
   ```

4. **Verify**:
   - ✅ Login successful
   - ✅ Patients found (should be > 0)
   - ✅ Demographics populated
   - ✅ Medications listed
   - ✅ Manual entry requirements calculated
   - ✅ Screenshots saved in root directory

### Troubleshooting:

**❌ Login failed**:
- Check credentials in `.env.local`
- Verify VetRadar site is accessible
- Check console for specific error messages

**❌ No patients found**:
- Verify Neurology/Neurosurgery filter is working
- Check screenshots in root directory to see what page was loaded

**❌ Patient data incomplete**:
- Check VetRadar scraper selectors match current HTML structure
- Review screenshots to see if page layout changed

---

## Test 2: Web UI Import Test

**Purpose**: Test the full user interface workflow

**Time**: ~5 minutes

### Steps:

1. **Start development server**:
   ```bash
   npm run dev
   ```

2. **Open browser**:
   ```
   http://localhost:3000
   ```

3. **Navigate to Patient Import**:
   - Click "Import from VetRadar" button on homepage
   - Or go directly to: `http://localhost:3000/patient-import`

4. **Enter VetRadar credentials**:
   - Email: `your-email@example.com`
   - Password: `your-password`
   - Click "Import Patients from VetRadar"

5. **Wait for import** (~30 seconds):
   - Browser window will open (Playwright)
   - Watch automated login and data scraping
   - Browser will close automatically

6. **Expected result**:
   - ✅ Success message: "Successfully imported X patients!"
   - ✅ Summary stats displayed:
     - Patients Imported: 10
     - Auto-Populated: 85%
     - Manual Fields: 5-7
     - Total Time: ~3.0 min
   - ✅ Patient list on left side
   - ✅ Patient entry form on right side

### Screenshots:

Take screenshots at each step:
- [ ] Homepage with navigation button
- [ ] Patient import page with credentials form
- [ ] Import in progress (Playwright browser open)
- [ ] Import complete with summary stats
- [ ] Patient list with all imported patients
- [ ] Patient entry form for first patient

---

## Test 3: Manual Entry Workflow

**Purpose**: Test the manual entry UI and auto-calculators

**Time**: ~1 minute per patient

### Steps:

1. **Select first patient** from list

2. **Complete manual entry** (~17-37 seconds):

   **a. Neurologic Localization** (5 sec):
   - Select from dropdown: "T3-L3"

   **b. Lab Results** (10 sec):
   - Copy sample CBC from EasyVet:
     ```
     WBC	12.5	x10^3/μL	5.0-16.0
     HCT	62.2	%	37.0-55.0
     PLT	108	x10^3/μL	150-400
     ```
   - Paste into "CBC Table" textarea
   - Verify: "✓ Parsed 3 values" appears

   **c. Sticker Flags** (2 sec):
   - Check "New Admit"
   - Verify: Auto-calculated sticker counts update to "6 big labels, 1 tiny sheet (4 labels)"

   **d. (Optional) MRI Fields** - if MRI scheduled (10 sec):
   - MRI Region: "Brain"
   - ASA Status: "3 - Severe systemic disease"
   - Verify: Auto-calculated doses appear:
     - Butorphanol: X.XXmg (X.XXXmL)
     - Valium: X.XXmg (X.XXXmL)
     - Contrast: X.XXmL

3. **Click "Generate All Outputs"**

4. **Expected result**:
   - ✅ Rounding sheet PDF downloads
   - ✅ MRI anesthesia sheet PDF downloads (if MRI scheduled)
   - ✅ Big patient labels PDF downloads
   - ✅ Tiny diagnostic labels PDF downloads
   - ✅ Success message: "All outputs generated successfully!"

### Verify PDF Contents:

**Rounding Sheet**:
- [ ] Patient name visible
- [ ] Signalment correct
- [ ] Location (IP/ICU)
- [ ] Problems listed
- [ ] Medications formatted correctly
- [ ] Lab results show only abnormals: "CBC: Hct 62.2↑, Plt 108↓"
- [ ] Fluids/IVC/CRI status correct

**MRI Anesthesia Sheet** (if applicable):
- [ ] Patient name in header
- [ ] Weight displayed in kg and lbs
- [ ] MRI region shown (Brain/C-Spine/etc.)
- [ ] ASA status displayed
- [ ] Drug table shows:
   - [ ] Opioid (Methadone or Butorphanol) with dose and volume
   - [ ] Valium with dose and volume
   - [ ] Contrast with volume
- [ ] NPO time calculated (8 hours before MRI)
- [ ] Sticker placement box visible

**Big Patient Labels**:
- [ ] Patient name bold and uppercase
- [ ] Owner name, phone
- [ ] Species/Breed
- [ ] Sex/Weight
- [ ] DOB/Age
- [ ] Correct quantity (2, 5, or 6 based on flags)

**Tiny Diagnostic Labels**:
- [ ] Date in header
- [ ] Patient name
- [ ] Owner name
- [ ] Species/Breed
- [ ] Blank ID line
- [ ] Correct quantity (0, 1, or 2 sheets = 0, 4, or 8 labels)

---

## Test 4: Auto-Calculator Tests

**Purpose**: Verify all auto-calculation logic works correctly

### Lab Parser Test:

**Input**:
```
WBC	12.5	x10^3/μL	5.0-16.0
HCT	62.2	%	37.0-55.0
PLT	108	x10^3/μL	150-400
RBC	5.5	x10^6/μL	5.5-8.5
```

**Expected Output**:
- Parsed: 4 values
- Abnormals flagged:
  - HCT: 62.2↑ (High)
  - PLT: 108↓ (Low)
- Formatted for rounding sheet: "CBC: Hct 62.2↑, Plt 108↓"

**Verify**: ✅ Only abnormals appear, not WBC or RBC

### MRI Calculator Test:

**Input**:
- Weight: 15.1 kg
- Scan Type: Brain

**Expected Output**:
- Opioid: Butorphanol
- Butorphanol dose: 3.02mg (0.302mL)
- Valium dose: 3.78mg (0.756mL)
- Contrast: 3.33mL

**Verify**: ✅ Doses match expected calculations

**Input**:
- Weight: 15.1 kg
- Scan Type: C-Spine

**Expected Output**:
- Opioid: Methadone
- Methadone dose: 3.02mg (0.302mL)
- Valium dose: 3.78mg (0.756mL)
- Contrast: 3.33mL

**Verify**: ✅ Brain uses Butorphanol, Spine uses Methadone

### Sticker Calculator Test:

| isNewAdmit | isSurgery | Big Labels | Tiny Sheets | Tiny Labels |
|------------|-----------|------------|-------------|-------------|
| false      | false     | 2          | 0           | 0           |
| true       | false     | 6          | 1           | 4           |
| false      | true      | 5          | 2           | 8           |
| true       | true      | 6          | 2           | 8           |

**Verify**: ✅ All combinations calculate correctly

---

## Test 5: End-to-End Workflow

**Purpose**: Test the complete workflow from import to PDF generation

**Time**: ~5-10 minutes for 10 patients

### Workflow:

```
1. Import from VetRadar (~30 sec)
   ↓
2. For each patient (~17-37 sec each):
   ├─ Select patient from list
   ├─ Enter neurologic localization
   ├─ Paste lab results
   ├─ Set MRI fields (if applicable)
   ├─ Set sticker flags
   └─ Click "Generate All Outputs"
   ↓
3. Review all generated PDFs
   ↓
4. Print and distribute
```

### Checklist:

**Import Phase**:
- [ ] VetRadar login successful
- [ ] All Neurology/Neurosurgery patients imported
- [ ] Demographics populated correctly
- [ ] Medications imported with full dosing
- [ ] Problems/issues imported
- [ ] Location inferred (IP vs ICU)
- [ ] Code status inferred from VetRadar status

**Manual Entry Phase** (per patient):
- [ ] Neurologic localization dropdown works
- [ ] Lab paste and parse works
- [ ] Abnormals flagged correctly
- [ ] MRI dose calculation automatic
- [ ] Sticker count calculation automatic
- [ ] Time per patient: 17-37 seconds

**PDF Generation Phase**:
- [ ] Rounding sheet generated
- [ ] MRI sheet generated (if applicable)
- [ ] Stickers generated with correct counts
- [ ] All PDFs download successfully
- [ ] PDF content accurate and formatted correctly

**Time Metrics**:
- [ ] Import time: ~30 seconds
- [ ] Manual entry per patient: ~18 seconds average
- [ ] Total manual entry (10 patients): ~180 seconds (~3 minutes)
- [ ] PDF generation: ~10 seconds
- [ ] **Total time: ~3.7 minutes for 10 patients**
- [ ] **Time saved vs. manual: ~60 minutes**

---

## Test 6: Error Handling

**Purpose**: Verify error handling works correctly

### Test Cases:

**1. Invalid VetRadar Credentials**:
- Input: Wrong email/password
- Expected: Error message "Login failed"
- Verify: ✅ User-friendly error message displayed

**2. No Patients Found**:
- Input: Filter results in 0 patients
- Expected: Warning "No patients found"
- Verify: ✅ Helpful error message suggests checking filter

**3. Missing Manual Entry Fields**:
- Input: Generate PDF without completing required fields
- Expected: Validation errors listed
- Verify: ✅ Specific errors shown for each missing field

**4. Invalid Lab Paste**:
- Input: Paste non-table text into lab field
- Expected: Parser fails gracefully
- Verify: ✅ No crash, error message or empty result

**5. Invalid Weight**:
- Input: Non-numeric weight value
- Expected: MRI calculator returns null
- Verify: ✅ No calculation shown, no crash

---

## Test 7: Performance & Load Testing

**Purpose**: Verify system performs well under load

### Metrics:

**Import Performance**:
- 10 patients: ~30 seconds
- 20 patients: ~50 seconds (1 sec per additional patient)
- 50 patients: ~2 minutes

**PDF Generation Performance**:
- Rounding sheet (10 patients): ~2 seconds
- MRI sheet (single patient): ~1 second
- Stickers (single patient): ~1 second

**Memory Usage**:
- Import: < 500 MB
- PDF generation: < 200 MB
- Total: < 1 GB

---

## Test 8: Browser Compatibility

**Purpose**: Verify UI works across browsers

### Browsers to Test:

- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)

### Verify:

- [ ] Patient import page loads
- [ ] VetRadar login works (Playwright uses Chromium)
- [ ] PDF downloads work in all browsers
- [ ] UI responsive on different screen sizes

---

## Test 9: Accessibility

**Purpose**: Verify UI is accessible

### Checklist:

- [ ] All form inputs have labels
- [ ] Buttons have descriptive text
- [ ] Error messages are clear and visible
- [ ] Tab navigation works
- [ ] Focus indicators visible
- [ ] Color contrast meets WCAG AA standards

---

## Test 10: Data Integrity

**Purpose**: Verify data is preserved correctly

### Tests:

**1. Sync Patient**:
- Import patient
- Complete manual entry
- Sync patient again
- Verify: Manual entries preserved, VetRadar data updated

**2. Refresh Page**:
- Import patients
- Refresh browser
- Verify: Data persists (or appropriate "data lost" warning)

**3. Multiple Imports**:
- Import patients
- Import same patients again
- Verify: No duplicates, data updated correctly

---

## Success Criteria

### Must Pass:

✅ **Test 1**: Command-line import works
✅ **Test 2**: Web UI import works
✅ **Test 3**: Manual entry and PDF generation work
✅ **Test 4**: All auto-calculators produce correct results
✅ **Test 5**: End-to-end workflow completes in ~3-5 minutes for 10 patients
✅ **Test 6**: Error handling works gracefully

### Should Pass:

✅ **Test 7**: Performance metrics met
✅ **Test 8**: Works in major browsers
✅ **Test 9**: Basic accessibility requirements met
✅ **Test 10**: Data integrity maintained

---

## Reporting Issues

### Information to Include:

1. **Test number** (e.g., Test 3: Manual Entry Workflow)
2. **Steps to reproduce**
3. **Expected result**
4. **Actual result**
5. **Screenshots** (if applicable)
6. **Console logs** (browser console or terminal output)
7. **Environment**:
   - OS: macOS/Windows/Linux
   - Browser: Chrome 120.0.6099.129
   - Node version: v20.x.x
   - npm version: 10.x.x

### Example:

```
Test 3: Manual Entry Workflow
Step: Paste lab results
Expected: Lab values parsed and abnormals flagged
Actual: Parser error "Cannot read property 'split' of undefined"

Console log:
TypeError: Cannot read property 'split' of undefined
  at parseCBCTable (lab-parser.ts:45)

Environment:
- OS: macOS 14.5
- Browser: Chrome 120.0.6099.129
- Node: v20.10.0
- npm: 10.2.3
```

---

## Next Steps After Testing

Once all tests pass:

1. ✅ Deploy to staging environment
2. ✅ Test with real clinical data
3. ✅ Train users on new workflow
4. ✅ Monitor performance in production
5. ✅ Gather user feedback
6. ✅ Iterate and improve

---

**Happy Testing! 🎉**

