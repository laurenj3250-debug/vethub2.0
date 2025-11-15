# Veterinary Domain Knowledge & Clinical Insights

This file captures clinical workflow insights, veterinary-specific requirements, and domain knowledge learned from veterinarians using VetHub.

---

## Purpose

As veterinarians use VetHub, they provide insights about:
- Clinical workflows that need support
- Medical terminology and standards
- Data validation requirements
- Safety considerations
- Efficiency improvements

Document these learnings here so future features align with real veterinary practice.

---

## Clinical Workflow Insights

### Morning Rounds Workflow

**Reality**: Neurologists round on 5-10 ICU patients, need to document quickly
**Timing**: 7:00 AM - 9:00 AM, high-pressure time window
**Requirements**:
- Quick data entry (Google Sheets-like interface)
- Paste from other systems (VetRadar, EzyVet)
- Templates for common conditions (IVDD, seizures)
- Minimal clicks to save
- Offline support (hospital WiFi unreliable)

**Learning**: Speed is critical. Every saved click matters.
**Implementation**: Created `EnhancedRoundingSheet` with templates and paste support

---

### SOAP Note Documentation

**Reality**: Residents document detailed exams for complex neuro cases
**Timing**: Throughout day, 10-30 minutes per patient
**Requirements**:
- Structured templates (IVDD, seizures, FCE, vestibular, GME)
- Neuro exam sections (8 subsections: mental status, gait, cranial nerves, etc.)
- Auto-populate from previous notes
- Save in progress (don't lose work)

**Learning**: Clinical accuracy > speed. Templates reduce errors.
**Implementation**: `SOAPBuilder` with 40+ neuro-specific templates

---

### Appointment Scheduling

**Reality**: Front desk receives spreadsheet from referring vets
**Timing**: Day before procedures, often last-minute changes
**Requirements**:
- Paste appointment list from email
- Drag to reorder (anesthesia time-dependent)
- Track prep requirements (history, bloodwork, fasting)
- MRI protocol selection

**Learning**: Integration with existing workflows is key.
**Implementation**: `AppointmentSchedule` with paste parsing and drag-and-drop

---

## Medical Terminology Standards

### Neuro Localization
**Standard Terms**:
- `C1-C5` - Cervical spinal cord segments 1-5
- `C6-T2` - Cervical intumescence
- `T3-L3` - Thoracolumbar spinal cord
- `L4-S3` - Lumbosacral intumescence
- `Multifocal` - Multiple locations
- `Diffuse` - Widespread

**Usage**: Dropdown in SOAP builder, standardizes data for analysis
**Why Important**: Enables pattern recognition across cases

### Gait Assessment Terms
**Standard Terms**:
- `Ambulatory` - Can walk
- `Non-ambulatory` - Cannot walk
- `Paraparesis` - Rear limb weakness
- `Paraplegia` - Rear limb paralysis
- `Tetraparesis` - All four limb weakness
- `Tetraplegia` - All four limb paralysis
- `Ataxia` - Incoordination

**Usage**: SOAP builder neuro exam section
**Why Important**: Precise clinical communication

---

## Data Validation Requirements

### Temperature (Dogs and Cats)
**Normal Range**: 100.5°F - 102.5°F
**Alert Range**: 99.0°F - 104.0°F
**Critical Range**: < 95°F or > 106°F
**Validation**: Warn if outside alert range, block if outside 95-108°F

### Heart Rate
**Dogs**: 60-140 bpm (larger dogs lower, smaller dogs higher)
**Cats**: 140-220 bpm
**Validation**: Warn if outside species-specific range

### Respiratory Rate
**Dogs**: 10-30 breaths/min
**Cats**: 20-30 breaths/min
**Validation**: Alert if > 40 (potential distress)

### Weight
**Range**: 0.5 kg - 100 kg (most patients)
**Validation**: Confirm if > 80 kg or < 1 kg
**Units**: Support both kg and lbs, convert automatically

**Learning**: All vital signs need species-specific validation
**Implementation**: Add validation helpers to input components

---

## Medication Safety

### Dose Calculations
**Critical**: Must include units (mg/kg, mg, mL, etc.)
**Validation**: Flag doses outside typical ranges
**Examples**:
- Phenobarbital: 2-3 mg/kg PO q12h
- Levetiracetam: 20-30 mg/kg PO/IV q8h
- Methadone: 0.2-0.5 mg/kg IV/IM q4-6h

**Learning**: Never display dose without units
**Implementation**: Structured medication format in SOAP builder

### Drug Interactions
**Common Concerns**:
- Phenobarbital + many drugs (CYP450 inducer)
- NSAIDs + corticosteroids (avoid combination)
- Potassium bromide + chloride (avoid salt)

**Future**: Add drug interaction checking

---

## Clinical Protocols

### IVDD (Intervertebral Disc Disease) Management
**Grade 1-2** (Ambulatory with pain):
- Strict cage rest 4-6 weeks
- NSAIDs or gabapentin
- Monitor for progression

**Grade 3-4** (Non-ambulatory but deep pain intact):
- Emergency MRI
- Surgery within 24-48 hours if indicated
- Post-op supportive care (bladder expression, PT)

**Grade 5** (Deep pain negative):
- Ultra-emergency (< 24 hours)
- Guarded prognosis if > 48 hours
- Aggressive post-op care

**Learning**: Different protocols for different severities
**Implementation**: Templates include grade-specific recommendations

---

### Seizure Management Protocols
**Cluster Seizures** (>2 in 24h):
- Rectal diazepam at home
- IV levetiracetam if hospitalized
- Start maintenance AEDs

**Status Epilepticus** (>5 min or multiple without recovery):
- Emergency IV diazepam
- Propofol/phenobarbital if refractory
- ICU monitoring

**Learning**: Time-sensitive protocols need clear documentation
**Implementation**: Seizure template includes timing and medication protocols

---

## User Efficiency Insights

### Keyboard Shortcuts Needed
**Most Requested**:
- `Tab` to move between fields (✅ implemented in rounding sheet)
- `Cmd/Ctrl + S` to save (future)
- `Cmd/Ctrl + K` to quick search patients (future)
- `Esc` to close modals (✅ implemented)

**Learning**: Power users want keyboard-first interface
**Implementation**: `GlobalKeyboardHandler` component, expandable

---

### Copy-Paste Workflows
**Common Pattern**: Copy from referring vet email → Paste into VetHub
**Data Types**:
- Medication lists
- Lab values
- History/signalment
- Appointment schedules

**Learning**: Parsing pasted data saves 5-10 min per patient
**Implementation**: Screenshot parsing, paste-to-parse for appointments

---

## Data Analysis Needs

### Outcome Tracking
**Goal**: Track surgical outcomes for IVDD patients
**Data Needed**:
- Pre-op neuro grade
- Time to surgery
- Post-op neuro grade at discharge, 2 weeks, 6 weeks
- Complications

**Learning**: Structured data enables outcome analysis
**Implementation**: Track in SOAP notes, enable future analytics

---

### Case Load Analysis
**Goal**: Understand caseload patterns
**Data Needed**:
- Patients per day/week/month
- Case types (IVDD, seizures, FCE, etc.)
- MRI vs. non-MRI cases
- Average length of stay

**Learning**: Helps with staffing and resource planning
**Implementation**: Dashboard stats show case breakdown

---

## Safety Considerations

### Critical Data Never Auto-Delete
- Patient medications
- Vital signs
- Code status
- Allergy information

**Learning**: Clinical data has legal/medical implications
**Implementation**: Soft deletes only, full audit trail

### Confirmation Required For
- Deleting patients
- Changing code status to DNR
- Discharging critical patients
- Discontinuing seizure medications

**Learning**: Prevent accidental critical actions
**Implementation**: `AlertDialog` confirmations on destructive actions

---

## Future Clinical Features (User Requested)

### High Priority
1. **Drug Dose Calculator** - Weight-based dosing helper
2. **Medication Templates** - Common medication protocols
3. **Lab Value Tracker** - Trend CBC, chemistry over time
4. **Image Upload** - MRI/CT images attached to cases
5. **Discharge Instructions Generator** - Auto-generate from SOAP

### Medium Priority
6. **Client Communication Log** - Track phone calls, updates
7. **Anesthesia Monitoring** - Real-time vitals during MRI
8. **Treatment Reminders** - Push notifications for meds due
9. **Referral Letter Generator** - Send updates to referring vets
10. **Outcome Follow-up** - Automated 2-week, 6-week check-ins

---

## Clinical Terminology Reference

### Code Status (ICU Triage)
- **Green**: Stable, routine monitoring
- **Yellow**: Requires close monitoring, potential for deterioration
- **Orange**: Unstable, requires frequent assessment
- **Red**: Critical, requires constant monitoring

**Learning**: Color-coding aids rapid triage during rounds
**Implementation**: Code status dropdown with color-coded badges

---

## Continuous Learning

This file evolves as we learn from veterinarians. When users provide feedback:

1. **Document the insight** - What did we learn?
2. **Understand the why** - What's the clinical reasoning?
3. **Identify the pattern** - Is this a one-off or systematic need?
4. **Implement the solution** - How can VetHub better support this?
5. **Validate with users** - Does the solution work in practice?

**Last Updated**: November 14, 2025
**Contributors**: Neurologists, residents, ICU staff using VetHub
