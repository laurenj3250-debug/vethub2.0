# VetHub 2.0 Optimization Implementation Plan
**Date:** 2025-01-17
**Goal:** Transform VetHub from creating busywork into actually saving time

## Overview
This plan implements a comprehensive optimization of VetHub 2.0 focusing on:
1. Unified patient workflow (enter data once, generate all outputs)
2. Minimal essential tasks only
3. Smart auto-complete from user's past notes
4. AI-powered rounding sheet with carry-forward logic
5. Quick patient navigation
6. Clean, minimal UI

## Critical Constraints
⚠️ **MUST NOT BREAK EXISTING FUNCTIONALITY**
- AI parsing must continue to work
- Rounding sheet must remain functional
- Task system must work correctly
- All current features must be preserved

## Implementation Phases

### Phase 1: Refactor Task Templates (Minimal Auto-Tasks)
**Goal:** Remove busywork tasks, keep only essential auto-generated tasks

**Current State:**
- MRI: 5 auto-tasks (anesthesia, premed, scan, recovery, results review)
- Surgery: 6 auto-tasks (consent, bloodwork, prep, procedure, recovery, owner update)
- Medical: 7 auto-tasks (morning exam, morning meds, SOAP, rounding, owner update, evening exam, evening meds)
- Discharge: 4 auto-tasks (exam, meds, instructions, followup)

**Target State:**
- MRI: 3 tasks (anesthesia sheet, stickers, drug sheet)
- Surgery: 3 tasks (surgery sheet, stickers, write on board)
- Medical: 3 tasks (morning meds, evening meds, update rounding sheet)
- Discharge: Keep existing (actually useful)

**Files to Modify:**
- `src/lib/task-engine.ts` - Update TASK_TEMPLATES_BY_PATIENT_TYPE
- `src/app/page.tsx` - Ensure task creation uses updated templates

**Testing:**
- Create MRI patient → verify only 3 tasks created
- Create Surgery patient → verify only 3 tasks created
- Create Medical patient → verify only 3 tasks created
- Verify task completion still works
- Verify discharge tasks still trigger

---

### Phase 2: Smart Auto-Complete System
**Goal:** AI learns user's phrases and offers auto-complete in rounding/SOAP

**Implementation:**
1. Create CommonPhrases model in Prisma schema
   - Track: field (problems/diagnostics/therapeutics/concerns), phrase, usage_count
2. Build phrase capture service
   - Monitor rounding sheet saves
   - Extract phrases from problems, diagnostics, therapeutics, concerns
   - Store in CommonPhrases table with frequency tracking
3. Build auto-complete API endpoint
   - GET /api/autocomplete?field=problems&query=para
   - Returns top 5 matching phrases sorted by usage frequency
4. Add auto-complete UI component
   - Dropdown appears as user types
   - Shows user's past phrases + patient's history
   - Keyboard navigation (arrow keys, Enter to select)
5. Integrate into rounding sheet and SOAP builder

**Files to Create/Modify:**
- `prisma/schema.prisma` - Add CommonPhrase model
- `src/app/api/autocomplete/route.ts` - New API endpoint
- `src/components/AutoCompleteInput.tsx` - New component
- `src/components/rounding/EnhancedRoundingSheet.tsx` - Integrate auto-complete
- `src/components/SOAPBuilder.tsx` - Integrate auto-complete

**Testing:**
- Enter phrases in rounding sheet → verify captured in DB
- Type partial phrase → verify suggestions appear
- Select suggestion → verify it populates field
- Test with problems, diagnostics, therapeutics, concerns

---

### Phase 3: AI Rounding Sheet Carry-Forward
**Goal:** Pre-fill today's rounding data from yesterday's data

**Implementation:**
1. Store rounding sheet data in database (currently might be in Patient.roundingData JSON)
2. When opening rounding sheet, check for yesterday's data
3. Pre-populate fields with yesterday's values
4. Add "Last updated: Yesterday" indicators
5. Only require user to update what changed

**Logic:**
```typescript
// Pseudo-code
const loadRoundingData = async (patientId) => {
  const patient = await getPatient(patientId);
  const yesterdayData = patient.roundingData; // From yesterday

  // Pre-fill form with yesterday's data
  return {
    problems: yesterdayData.problems,
    diagnostics: yesterdayData.diagnostics,
    therapeutics: yesterdayData.therapeutics,
    fluids: yesterdayData.fluids,
    concerns: '', // Always blank - user fills today's concerns
    dayCount: yesterdayData.dayCount + 1, // Auto-increment
  };
};
```

**Files to Modify:**
- `src/components/rounding/EnhancedRoundingSheet.tsx` - Add carry-forward logic
- `src/app/rounding/page.tsx` - Update data loading

**Testing:**
- Save rounding data for patient on Day 1
- Open rounding sheet next day → verify data pre-filled
- Verify day count incremented
- Verify concerns field is blank
- Update and save → verify new data stored

---

### Phase 4: Unified Patient Hub
**Goal:** Single entry point to fill patient data once, generate all outputs

**Implementation:**
1. Create new "Patient Hub" page/modal
2. Smart form with sections:
   - AI Input (paste/voice/VetRadar import)
   - Demographics (auto-filled by AI)
   - Clinical Data (auto-filled by AI)
   - Review & Edit
3. Live preview panel showing generated outputs:
   - Rounding sheet preview
   - SOAP note preview
   - Treatment sheets preview
   - Stickers preview
4. One-click actions:
   - Print all sheets
   - Download stickers
   - Save to database
5. AI parsing integration for quick input

**Files to Create/Modify:**
- `src/app/patient-hub/page.tsx` - New unified hub page
- `src/components/patient-hub/UnifiedPatientForm.tsx` - Smart form component
- `src/components/patient-hub/OutputPreview.tsx` - Live preview panel
- `src/lib/output-generator.ts` - Generate sheets/stickers from form data

**Testing:**
- Paste patient data → verify AI parses correctly
- Fill form → verify live preview updates
- Save → verify data goes to rounding, SOAP, tasks
- Print → verify sheets generate correctly

---

### Phase 5: Quick Patient Navigation
**Goal:** Persistent patient context + one-click module jumping

**Implementation:**
1. Create persistent patient selector in top-right corner
2. Dropdown shows:
   - Current patient info (status, day count, owner contact)
   - Quick jump links (Rounding, SOAP, Tasks, MRI, etc.)
3. Add keyboard shortcut (Cmd+K) for patient switcher
4. Maintain patient context across page navigation

**Files to Create/Modify:**
- `src/components/layout/PatientQuickSwitcher.tsx` - New component
- `src/app/layout.tsx` - Add to global layout
- `src/contexts/PatientContext.tsx` - Global patient context

**Testing:**
- Select patient → verify appears in top-right
- Click quick jump link → verify navigates to correct page
- Use Cmd+K → verify patient switcher opens
- Switch patients → verify context updates globally

---

### Phase 6: Clean UI - Remove Visual Clutter
**Goal:** Minimal interface, less noise

**Implementation:**
1. Remove unnecessary status indicators
2. Simplify patient cards (fewer buttons, cleaner layout)
3. Reduce toast notifications (only show on errors)
4. Increase white space
5. Simplify color palette (less aggressive status colors)

**Files to Modify:**
- `src/components/PatientListItem.tsx` - Simplify patient cards
- `src/components/ui/toast.tsx` - Reduce notification frequency
- `src/app/page.tsx` - Clean up dashboard layout
- `tailwind.config.ts` - Simplify color palette

**Testing:**
- Visual review of all pages
- Verify cleaner, less cluttered interface
- Ensure important info still visible

---

### Phase 7: Integration & Verification
**Goal:** Ensure all features work together, nothing broken

**Verification Checklist:**
- [ ] AI parsing still works (VetRadar import, paste, manual entry)
- [ ] Rounding sheet saves and loads correctly
- [ ] Task creation works for all patient types
- [ ] Task completion works
- [ ] Discharge instructions modal appears
- [ ] SOAP builder works
- [ ] MRI builder works
- [ ] Appointment schedule works
- [ ] Auto-complete suggestions appear
- [ ] Carry-forward rounding data works
- [ ] Patient navigation works
- [ ] All database operations successful
- [ ] No console errors
- [ ] No TypeScript errors

**Testing Process:**
1. Create new MRI patient → verify 3 tasks, no extras
2. Fill rounding sheet → verify auto-complete works
3. Save rounding data → open next day → verify carry-forward
4. Use patient hub → verify all outputs generate
5. Navigate between modules → verify patient context maintained
6. Complete full patient workflow → verify no errors

---

## Implementation Order

### Sprint 1: Foundation (Days 1-2)
1. ✅ Refactor task templates (Phase 1)
2. ✅ Verify task system still works
3. ✅ Test with all patient types

### Sprint 2: Intelligence (Days 3-5)
4. ✅ Build auto-complete system (Phase 2)
5. ✅ Integrate into rounding sheet
6. ✅ Implement carry-forward logic (Phase 3)

### Sprint 3: Unification (Days 6-8)
7. ✅ Build unified patient hub (Phase 4)
8. ✅ Add output generation
9. ✅ Add patient navigation (Phase 5)

### Sprint 4: Polish (Days 9-10)
10. ✅ Clean UI (Phase 6)
11. ✅ Full integration testing (Phase 7)
12. ✅ Deploy to Railway

---

## Risk Mitigation

### Risk: Breaking Existing Functionality
**Mitigation:**
- Incremental changes with testing after each phase
- Keep existing code paths intact while adding new features
- Full regression testing before deployment

### Risk: AI Parsing Breaks
**Mitigation:**
- Don't modify AI parsing logic unless absolutely necessary
- If changes needed, test extensively with real data
- Keep backup of current parsing implementation

### Risk: Database Schema Changes Break Production
**Mitigation:**
- Test migrations locally first
- Use Railway staging environment
- Add new fields as optional/nullable first

### Risk: Performance Degradation
**Mitigation:**
- Monitor auto-complete query performance
- Add database indexes for phrase lookups
- Limit auto-complete results to top 5

---

## Success Metrics

**Time Savings:**
- Rounding sheet: 10 min/patient → 30 sec/patient (95% reduction)
- Data entry: 50% reduction through auto-complete
- Navigation: 75% reduction in clicks

**Quality Improvements:**
- Zero unnecessary auto-tasks
- No parsing errors requiring manual fixes
- Data sync working 100% of time

**User Experience:**
- Cleaner interface with less visual noise
- Faster navigation between modules
- Less double-checking required

---

## Rollback Plan

If critical issues emerge:
1. Git revert to last working commit
2. Railway will auto-deploy previous version
3. Document issues in GitHub
4. Fix in development branch before re-deploying

---

## Next Steps

1. Review this plan
2. Get user approval
3. Create git branch: `feature/vethub-optimization`
4. Begin Phase 1 implementation
5. Test thoroughly after each phase
6. Deploy to Railway when complete
