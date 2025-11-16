# VetHub 2.0 - Claude Code Configuration

## Project Overview
VetHub 2.0 is a comprehensive veterinary patient management system built with Next.js 15, designed for neurologists and veterinary professionals managing complex cases. The system supports:

- **Patient Management**: Track Surgery, MRI, and Medical patients with detailed demographics and medical history
- **Clinical Rounding**: Google Sheets-style data entry with 40+ neuro-specific protocols (IVDD, seizures, FCE, vestibular, GME)
- **SOAP Documentation**: Template-based clinical note builder with neuro-specific exam sections
- **Appointment Scheduling**: Drag-and-drop schedule with paste-from-spreadsheet support
- **Task Management**: Per-patient and general task tracking with completion indicators
- **MRI Calculations**: Automated anesthesia dosing based on weight and scan type

### Target Users
- Veterinary neurologists during patient rounds
- Clinical staff managing ICU/hospitalized patients
- Veterinary residents documenting cases
- Practice administrators scheduling procedures

## Visual Development

### Design Principles
- Comprehensive design checklist in `.claude/context/design-principles.md`
- Brand style guide in `.claude/context/style-guide.md`
- When making visual (front-end, UI/UX) changes, always refer to these files for guidance

### Quick Visual Check
IMMEDIATELY after implementing any front-end change:
1. **Identify what changed** - Review the modified components/pages
2. **Navigate to affected pages** - Use `mcp__playwright__browser_navigate` to visit each changed view
3. **Verify design compliance** - Compare against `.claude/context/design-principles.md` and `.claude/context/style-guide.md`
4. **Validate feature implementation** - Ensure the change fulfills the user's specific request
5. **Check acceptance criteria** - Review any provided context files or requirements
6. **Capture evidence** - Take full page screenshot at desktop viewport (1440px) of each changed view
7. **Check for errors** - Run `mcp__playwright__browser_console_messages`

This verification ensures changes meet design standards and user requirements.

### Comprehensive Design Review
Invoke the `@agent-design-review` subagent for thorough design validation when:
- Completing significant UI/UX features
- Before finalizing PRs with visual changes
- Needing comprehensive accessibility and responsiveness testing

## DEVELOPMENT WORKFLOW (MANDATORY)

**CRITICAL**: Before making ANY code changes, read `BEFORE-YOU-CODE.md` and follow `.claude-workflow.md`

### Before any code changes:
1. Read `BEFORE-YOU-CODE.md` checklist
2. Identify the EXACT error (not assumptions)
3. Find the ACTUAL code causing it
4. Verify the fix will work BEFORE writing it

### After any code changes:
1. Run `npm run dev` and check for errors
2. Test the specific endpoint that was broken
3. Run `./scripts/verify-api.sh` to verify API endpoints
4. Verify in browser that it actually works
5. THEN commit - not before

### When debugging:
1. Look at server logs FIRST
2. Check the actual API route code
3. Check what the frontend sends
4. Compare field names
5. Don't guess - verify

### VetHub Debug Skill
Use the `vethub-debug` skill when debugging any VetHub issue:
- Systematic pre-flight checklist before coding
- Post-change verification workflow
- API field mappings reference (`.claude/skills/vethub-debug/references/api-field-mappings.md`)
- Common issues and solutions (`.claude/skills/vethub-debug/references/common-issues.md`)
- Endpoint verification script (`.claude/skills/vethub-debug/scripts/verify-endpoints.sh`)

### API Verification Scripts
Two scripts available for testing:
1. `./scripts/verify-api.sh` - Comprehensive patient and task CRUD testing
2. `./.claude/skills/vethub-debug/scripts/verify-endpoints.sh` - Quick endpoint status check

## Tech Stack
- **Framework**: Next.js 15 with Turbopack
- **UI Library**: React 18 with Radix UI components
- **Styling**: Tailwind CSS
- **Forms**: React Hook Form with Zod validation
- **Testing**: Playwright for E2E testing
- **Icons**: Lucide React

## Deployment & Data Storage

**IMPORTANT: Production-Only Workflow**
- **Railway Project**: `empathetic-clarity`
- **Production URL**: https://empathetic-clarity-production.up.railway.app/
- **Database**: PostgreSQL on Railway
- **User Preference**: ⚠️ **ALWAYS use Railway production storage, NEVER local storage** ⚠️

**Railway PostgreSQL Connection Details:**
```
Internal URL (Railway services only):
postgresql://postgres:ncpDrcYGcGWwKSufirFOiHbOzLTZHbrq@postgres.railway.internal:5432/railway

Public URL (for local development):
postgresql://postgres:ncpDrcYGcGWwKSufirFOiHbOzLTZHbrq@shinkansen.proxy.rlwy.net:40506/railway?sslmode=require

Note: The public Railway proxy URL has TLS connection issues from local development.
For local dev, either accept database errors or set up a local PostgreSQL instance.
Railway production environment uses the internal URL and works perfectly.
```

This project uses Railway for hosting and PostgreSQL database. The user has **explicitly requested** that all data operations, patient imports, and testing be done on the **production Railway environment**, not on local development environment.

**Local Development Guidelines:**
- Local dev server (`npm run dev`) should **only** be used for testing UI changes and code development
- **DO NOT** save patient data locally - all patient operations should be done on Railway production
- Any data saved locally will NOT appear on the production site (separate databases)
- Railway auto-deploys from GitHub main branch - push changes to deploy
- **Known Issue**: Local dev may show database connection errors due to Railway proxy TLS issues - this is normal and doesn't affect Railway production

**VetRadar Import Workflow:**
1. Develop and test import code locally
2. Push changes to GitHub main
3. Railway auto-deploys the new code
4. User imports patients at https://empathetic-clarity-production.up.railway.app/patient-import
5. Patients are saved to Railway PostgreSQL database
6. Patients appear on production homepage

## Development Commands
- `npm run dev` - Start development server
- `npm run build` - Production build
- `npm run lint` - Run ESLint
- `npm run typecheck` - TypeScript type checking
- `npm test` - Run Playwright tests
- `npm run test:ui` - Run Playwright tests with UI
- `npm run test:headed` - Run Playwright tests in headed mode

## Key Directories
- `/src/app` - Next.js app directory with pages and routing
  - `page.tsx` - Homepage/Dashboard with patient management
  - `rounding/page.tsx` - Rounding sheets for daily patient rounds
  - `soap/page.tsx` - SOAP clinical note builder
  - `appointments/page.tsx` - Appointment schedule manager
  - `api/` - API routes for AI parsing and data processing
- `/src/components` - Reusable React components
  - Main feature components: SOAPBuilder, RoundingSheet, EnhancedRoundingSheet, AppointmentSchedule
  - UI primitives (35 shadcn/ui components based on Radix UI)
  - Utility components: ErrorBoundary, GlobalKeyboardHandler, QuickSwitcher
- `/src/contexts` - React context providers for state management
- `/src/lib` - Utility functions, API client, and shared logic
- `/src/data` - Clinical protocols and templates (40+ neuro-specific templates)
- `/tests` - Playwright E2E tests for critical workflows
- `/.claude` - Claude Code configuration
  - `/agents` - Custom agents (design-review, neuro-soap-ux-architect)
  - `/commands` - Custom slash commands (/design-review)
  - `/context` - Design principles and style guides

## Critical User Flows

### 1. Patient Admission & Management
**Path**: Homepage (/) → Add Patient → Configure Patient
**Components**: PatientListItem, DashboardStats
**Tests**: tests/patient-admission.spec.ts

**Steps**:
1. Click "Add Patient" button
2. Enter patient demographics (name, species, breed, weight, age, sex)
3. Select patient type (Surgery/MRI/Medical)
4. Set initial status (New Admit/Pre-procedure/etc.)
5. Add initial tasks
6. Patient appears in list with status badge and task indicators

**Design Considerations**:
- Use `patient-status` colors for status badges (critical, monitoring, stable, discharged)
- Ensure mobile-friendly patient cards
- Task completion percentage visually prominent
- Filter and search must be accessible

### 2. Daily Rounding Workflow
**Path**: /rounding
**Components**: RoundingSheet, EnhancedRoundingSheet
**Tests**: tests/rounding-workflow.spec.ts

**Steps**:
1. View all active (non-discharged) patients in table
2. Edit cells inline with click-to-edit or paste tab-separated values
3. Fill core fields: signalment → location → icuCriteria → code → problems → diagnosticFindings → therapeutics → fluids → concerns
4. Apply neuro-protocol templates for auto-fill (IVDD post-op, seizure management, etc.)
5. Save individual patient or "Save All"
6. Data persists across sessions

**Design Considerations**:
- Google Sheets-like UX with keyboard navigation (Tab, Enter)
- Code status color-coded (Green/Yellow/Orange/Red)
- Template quick-access menu
- Paste support for bulk data entry
- Auto-save indicators

### 3. SOAP Clinical Documentation
**Path**: /soap
**Components**: SOAPBuilder
**Tests**: tests/soap-workflow.spec.ts

**Steps**:
1. Select patient or create new
2. Choose condition template (IVDD, seizures, FCE, vestibular, GME)
3. Complete Subjective section (history, current medications)
4. Complete Objective section (physical exam, neuro exam with 8 subsections)
5. Complete Assessment (neuro localization, differential diagnoses)
6. Complete Plan (diagnostics, treatments, discussion)
7. Save SOAP note to patient record

**Design Considerations**:
- Collapsible sections to reduce cognitive load
- Template auto-fill with clinical content
- Clear section headers with progress indicators
- Neuro exam subsections: mental status, gait, cranial nerves, postural reactions, spinal reflexes, tone, muscle mass, nociception

### 4. Appointment Schedule Management
**Path**: /appointments
**Components**: AppointmentSchedule, AppointmentRow, PasteModal
**Tests**: tests/appointment-workflow.spec.ts

**Steps**:
1. Paste appointment data from spreadsheet (tab-separated)
2. AI parsing extracts: name, time, appointment type, history needed, MRI needed, bloodwork, medications
3. Drag-and-drop to reorder appointments
4. Inline edit individual fields
5. Data persists in localStorage
6. Export or sync with patient records

**Design Considerations**:
- Drag handles visible and touch-friendly
- Paste modal with preview before import
- Time fields formatted consistently
- Status indicators for prep requirements (history, MRI, bloodwork)

## VetHub-Specific Design Tokens

### Patient Status Colors (defined in tailwind.config.ts)
```tsx
// Usage in components
className="bg-patient-status-critical"     // #DC2626 (Red-600)
className="bg-patient-status-monitoring"   // #F59E0B (Amber-500)
className="bg-patient-status-stable"       // #10B981 (Emerald-500)
className="bg-patient-status-discharged"   // #6B7280 (Gray-500)
```

### Module Colors (for page backgrounds)
```tsx
className="from-slate-900 via-module-rounding to-slate-900"    // #059669
className="from-slate-900 via-module-soap to-slate-900"        // #7C3AED
className="from-slate-900 via-module-appointments to-slate-900" // #2563EB
```

### Typography Scale
```tsx
className="text-4xl"  // 32px - H1 (Page titles)
className="text-3xl"  // 24px - H2 (Patient names, major sections)
className="text-2xl"  // 20px - H3 (Subsection headers)
className="text-xl"   // 18px - H4 (Card titles)
className="text-lg"   // 16px - Body Large (Important data points)
className="text-base" // 14px - Body Default (General content)
className="text-sm"   // 13px - Small (Metadata)
className="text-xs"   // 12px - Caption (Timestamps)
```

### Spacing Scale (VetHub standard)
```tsx
className="space-y-4"  // 16px vertical spacing (default)
className="gap-4"      // 16px grid gap
className="p-4"        // 16px padding (cards)
className="p-6"        // 24px padding (modals)
className="p-8"        // 32px padding (page containers)
```

## Permissions & Autonomous Operation

**Claude has full permissions** for VetHub development:
- ✅ Auto-approved: All file operations (Read, Write, Edit)
- ✅ Auto-approved: All testing operations (Playwright, npm scripts)
- ✅ Auto-approved: Git operations (add, commit, push)
- ✅ Auto-approved: Design review execution
- ✅ Auto-approved: Learning system updates

**No permission prompts needed** - Claude operates autonomously to maximize efficiency

## Mandatory Quality Validation

**Every code change MUST be validated:**

### 1. Automated Design Review (Required)
After ANY UI change, Claude MUST:
```
1. Run @agent-design-review
2. Validate responsive design (375px, 768px, 1440px)
3. Check accessibility (WCAG 2.1 AA)
4. Verify design system compliance
5. Document findings in .claude/learnings/
```

**Not optional** - All UI code must pass design review before completion

### 2. Playwright Testing (Required)
After implementing ANY feature, Claude MUST:
```
1. Write Playwright tests for new functionality
2. Run npm run test:ui to validate
3. Ensure tests pass at all viewports
4. Verify no console errors
5. Check accessibility in tests
```

**Not optional** - No feature is complete without passing tests

### 3. Learning Documentation (Required)
After encountering ANY issue, Claude MUST:
```
1. Document in .claude/learnings/mistakes.md
2. Update design-review-feedback.md with patterns
3. Add to veterinary-domain-knowledge.md if clinical
4. Update workflow if process improvement found
```

**Not optional** - Every mistake becomes a learning

## Learning System & Continuous Improvement

**Before making changes**, Claude Code automatically reviews:
- `.claude/learnings/mistakes.md` - Documented errors and solutions
- `.claude/learnings/design-review-feedback.md` - Accumulated design feedback
- `.claude/learnings/veterinary-domain-knowledge.md` - Clinical insights
- Past design reviews to avoid repeating mistakes

**Workflow Integration:**
- **On session start**: Learning summary is loaded automatically
- **After UI edits**: Automatic suggestion to run design review
- **During development**: Learnings are checked to prevent known mistakes
- **After design review**: Feedback is documented for future reference
- **Continuous**: Playwright tests validate all changes

**This creates a feedback loop**:
1. Mistake is made → 2. Documented in `.claude/learnings/` → 3. Claude learns → 4. Same mistake avoided → 5. Quality improves continuously

**Validation Checklist** (Claude self-checks):
- [ ] Design review run and passed
- [ ] Tests written and passing
- [ ] Learnings documented
- [ ] Design system tokens used
- [ ] Accessibility validated
- [ ] Responsive design confirmed
- [ ] No console errors
- [ ] Code follows VetHub patterns

## Testing Strategy
All UI changes should be validated with Playwright to ensure:
- Visual consistency across viewports (mobile, tablet, desktop)
- Accessibility compliance (WCAG 2.1 AA)
- Interactive elements work correctly
- Forms validate properly
- No console errors

**Automated Workflow**:
1. Edit UI file → Hook suggests design review
2. Run `@agent-design-review` → Get comprehensive feedback
3. Fix issues → Document learnings
4. Repeat → Quality improves continuously

## Code Style
- Use TypeScript for type safety
- Follow Tailwind utility-first approach
- Prefer functional components with hooks
- Use shadcn/ui patterns for consistency
- Keep components focused and composable
