# VetHub 2.0 Development Workflow Guide

This guide describes the integrated development workflow for VetHub 2.0, incorporating Playwright testing, design review, and best practices for building veterinary-focused features.

## Table of Contents
1. [Quick Start](#quick-start)
2. [Development Cycle](#development-cycle)
3. [Making UI Changes](#making-ui-changes)
4. [Testing Workflow](#testing-workflow)
5. [Design Review Process](#design-review-process)
6. [Code Review Checklist](#code-review-checklist)
7. [Common Patterns](#common-patterns)
8. [Troubleshooting](#troubleshooting)

---

## Quick Start

### Initial Setup
```bash
# Clone and install
cd vethub2.0
npm install

# Install Playwright browsers (if not already done)
npx playwright install

# Start development server
npm run dev
```

### Run Tests
```bash
# Run all tests
npm test

# Run with UI (recommended for development)
npm run test:ui

# Run specific test file
npm test tests/rounding-workflow.spec.ts

# Run in headed mode (see browser)
npm run test:headed
```

### Quick Visual Check
After any UI change:
```bash
# 1. Start dev server
npm run dev

# 2. In Claude Code, run:
@agent-design-review
```

---

## Development Cycle

### 1. Planning Phase
**Before writing code:**

1. **Understand the clinical workflow**
   - What problem are veterinary staff solving?
   - What data do they need access to?
   - What's the urgency/criticality? (Rounds? Emergency? Documentation?)

2. **Check existing patterns**
   ```bash
   # Find similar components
   ls src/components/

   # Search for similar features
   grep -r "rounding" src/
   ```

3. **Review design principles**
   - Read `.claude/context/design-principles.md` for VetHub guidelines
   - Check `.claude/context/style-guide.md` for implementation details
   - Use design tokens from `tailwind.config.ts`

### 2. Implementation Phase

**Component Development:**

```tsx
// Example: New clinical feature component
// src/components/VitalSignsTracker.tsx

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';

export function VitalSignsTracker({ patientId }: { patientId: number }) {
  const [vitals, setVitals] = useState({
    temperature: '',
    heartRate: '',
    respiratoryRate: '',
  });

  return (
    <Card className="p-4 space-y-4">
      <h3 className="text-xl font-semibold text-gray-200">
        Vital Signs
      </h3>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="text-sm text-gray-400">
            Temperature (°F)
          </label>
          <Input
            type="number"
            value={vitals.temperature}
            onChange={(e) => setVitals({ ...vitals, temperature: e.target.value })}
            className="mt-1"
          />
        </div>

        {/* More vital fields... */}
      </div>

      <Button
        onClick={() => handleSave(vitals)}
        className="bg-vethub-primary hover:bg-vethub-primary-hover"
      >
        Save Vitals
      </Button>
    </Card>
  );
}
```

**Use Design Tokens:**
```tsx
// ✅ GOOD - Use design tokens
className="bg-patient-status-critical text-white"
className="text-3xl font-semibold"   // H2 size
className="space-y-4"                 // Standard spacing

// ❌ AVOID - Hardcoded values
className="bg-red-600 text-white"
className="text-[24px] font-bold"
className="space-y-[16px]"
```

### 3. Testing Phase

**Write Tests First (TDD approach) or Immediately After:**

```typescript
// tests/vital-signs.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Vital Signs Tracker', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/patient/123');  // Adjust to your route
    await page.waitForLoadState('networkidle');
  });

  test('should allow entering vital signs', async ({ page }) => {
    // Find temperature input
    const tempInput = page.locator('input[aria-label="Temperature"]');
    await tempInput.fill('101.5');

    // Fill heart rate
    const hrInput = page.locator('input[aria-label="Heart Rate"]');
    await hrInput.fill('120');

    // Save
    const saveButton = page.locator('button:has-text("Save Vitals")');
    await saveButton.click();

    // Verify save occurred (check for toast or success message)
    await expect(page.locator('text=Saved successfully')).toBeVisible();
  });

  test('should persist vital signs on page reload', async ({ page }) => {
    // Enter data
    await page.locator('input[aria-label="Temperature"]').fill('102.0');
    await page.locator('button:has-text("Save")').click();

    // Reload
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Verify data persisted
    await expect(page.locator('input[aria-label="Temperature"]')).toHaveValue('102.0');
  });
});
```

**Run Your Tests:**
```bash
# Run the new test file
npm run test:ui tests/vital-signs.spec.ts

# Or run all tests
npm test
```

### 4. Visual Verification Phase

**Immediate Visual Check (after implementing UI):**

1. **Start dev server** (if not running):
   ```bash
   npm run dev
   ```

2. **Navigate to your changes** in browser:
   ```
   http://localhost:3000/your-new-feature
   ```

3. **Run quick visual checklist**:
   - [ ] Component renders at 1440px (desktop)
   - [ ] Component adapts at 768px (tablet)
   - [ ] Component works at 375px (mobile)
   - [ ] Colors match design system (patient-status, module colors)
   - [ ] Typography uses correct scale (H1-H4, body sizes)
   - [ ] Spacing is consistent (4, 8, 12, 16, 24, 32px)
   - [ ] Interactive elements have hover/focus states
   - [ ] No console errors
   - [ ] Keyboard navigation works (Tab, Enter, Esc)

4. **In Claude Code, trigger design review**:
   ```
   @agent-design-review
   ```

   The agent will:
   - Navigate to your pages using Playwright
   - Test responsive viewports
   - Capture screenshots
   - Check accessibility
   - Validate against design principles
   - Provide categorized feedback

### 5. Code Review & Refinement

**Before Creating PR:**

1. **Run full test suite**:
   ```bash
   npm test
   npm run typecheck
   npm run lint
   ```

2. **Fix any design review issues**:
   - Address [Blocker] issues immediately
   - Fix [High-Priority] before merge
   - Create follow-up tasks for [Medium-Priority]

3. **Update documentation** if needed:
   - Add JSDoc comments to complex functions
   - Update CLAUDE.md if adding new patterns
   - Add examples to QUICK_REFERENCE.md

4. **Create comprehensive PR description**:
   ```markdown
   ## Changes
   - Added vital signs tracker to patient detail page

   ## Clinical Workflow
   - Veterinary staff can now enter temperature, HR, RR during rounds
   - Data auto-saves and persists across sessions

   ## Testing
   - Added Playwright tests for vital signs entry and persistence
   - Verified responsive design at mobile/tablet/desktop viewports
   - Design review passed with no blockers

   ## Screenshots
   [Include screenshots from design review]

   ## Checklist
   - [x] Tests passing
   - [x] Design review completed
   - [x] TypeScript types updated
   - [x] Responsive on mobile
   - [x] Keyboard accessible
   ```

---

## Making UI Changes

### Adding New Components

**1. Choose the Right Component Type:**

- **shadcn/ui primitive** - For standard UI (Button, Input, Dialog)
  ```bash
  # Add shadcn component if needed
  npx shadcn-ui@latest add dialog
  ```

- **Custom feature component** - For VetHub-specific features
  - Place in `src/components/`
  - Import shadcn primitives as building blocks

**2. Follow VetHub Design Patterns:**

```tsx
// Patient Status Badge (common pattern)
function PatientStatusBadge({ status }: { status: PatientStatus }) {
  const colorMap = {
    critical: 'bg-patient-status-critical',
    monitoring: 'bg-patient-status-monitoring',
    stable: 'bg-patient-status-stable',
    discharged: 'bg-patient-status-discharged',
  };

  return (
    <span className={`${colorMap[status]} text-white text-xs px-2 py-1 rounded-full`}>
      {status}
    </span>
  );
}

// Code Status Badge (color-coded by severity)
function CodeStatusBadge({ code }: { code: 'Green' | 'Yellow' | 'Orange' | 'Red' }) {
  const colors = {
    Green: 'bg-emerald-500',
    Yellow: 'bg-yellow-500',
    Orange: 'bg-orange-500',
    Red: 'bg-red-600',
  };

  return (
    <span className={`${colors[code]} text-white font-medium px-3 py-1 rounded`}>
      Code {code}
    </span>
  );
}

// Module Page Background (consistent gradient pattern)
function RoundingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-module-rounding to-slate-900">
      {/* Page content */}
    </div>
  );
}
```

**3. Use Collapsible Sections for Complex Forms:**

```tsx
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

function NeuroExamSection() {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger className="flex items-center justify-between w-full p-4 bg-slate-800 rounded">
        <h3 className="text-xl font-semibold">Neurological Exam</h3>
        <ChevronDown className={isOpen ? 'rotate-180' : ''} />
      </CollapsibleTrigger>

      <CollapsibleContent className="p-4 space-y-4">
        {/* Neuro exam fields */}
      </CollapsibleContent>
    </Collapsible>
  );
}
```

### Updating Existing Components

**Before Modifying:**

1. **Read the component** thoroughly
2. **Check for tests** in `/tests/`
3. **Understand current usage** with grep:
   ```bash
   grep -r "ComponentName" src/
   ```
4. **Review design principles** to ensure changes align

**After Modifying:**

1. **Update tests** to reflect changes
2. **Run tests** to ensure nothing broke
3. **Visual check** at multiple viewports
4. **Design review** for significant changes

---

## Testing Workflow

### Test Organization

```
tests/
├── example.spec.ts                # Basic responsive/accessibility tests
├── patient-admission.spec.ts      # Patient CRUD and dashboard
├── rounding-workflow.spec.ts      # Rounding sheet data entry
├── soap-workflow.spec.ts          # SOAP documentation
└── appointment-workflow.spec.ts   # Appointment scheduling
```

### Writing Effective Tests

**Test Structure:**
```typescript
test.describe('Feature Name', () => {
  test.beforeEach(async ({ page }) => {
    // Setup: navigate to page
    await page.goto('/your-page');
    await page.waitForLoadState('networkidle');
  });

  test('should do specific thing', async ({ page }) => {
    // Arrange: set up test conditions
    const button = page.locator('button:has-text("Save")');

    // Act: perform action
    await button.click();

    // Assert: verify outcome
    await expect(page.locator('text=Success')).toBeVisible();
  });
});
```

**Locator Strategies (in order of preference):**

1. **Test IDs** (best):
   ```tsx
   <Button data-testid="save-patient">Save</Button>
   ```
   ```ts
   page.locator('[data-testid="save-patient"]')
   ```

2. **Aria labels**:
   ```tsx
   <Input aria-label="Patient Name" />
   ```
   ```ts
   page.locator('input[aria-label="Patient Name"]')
   ```

3. **Text content**:
   ```ts
   page.locator('button:has-text("Save")')
   ```

4. **CSS selectors** (last resort):
   ```ts
   page.locator('.save-button')
   ```

### Testing Clinical Workflows

**Example: Rounding Data Entry**
```typescript
test('should support pasting rounding data from spreadsheet', async ({ page }) => {
  // Navigate to rounding sheet
  await page.goto('/rounding');

  // Click first editable cell
  const firstCell = page.locator('td input, td textarea').first();
  await firstCell.click();

  // Paste tab-separated values
  const roundingData = 'Golden Retriever, 5yo, 30kg\tICU 3\tAmbulatory Paraparesis\tYellow';
  await page.keyboard.insertText(roundingData);

  // Verify data populated multiple cells
  await expect(page.locator('text=Golden Retriever')).toBeVisible();
  await expect(page.locator('text=ICU 3')).toBeVisible();
});
```

### Running Tests in CI/CD

```yaml
# .github/workflows/test.yml
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npm run build
      - run: npm test
      - uses: actions/upload-artifact@v3
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
```

---

## Design Review Process

### When to Run Design Review

**Always run for:**
- New UI features
- Changes to existing components
- Before creating pull requests
- After implementing feedback

**Optional for:**
- Backend-only changes
- Test-only changes
- Documentation updates

### How to Run Design Review

**Option 1: Using Agent (Comprehensive)**
```
# In Claude Code
@agent-design-review
```

The agent will:
1. Analyze git diff
2. Navigate to changed pages using Playwright
3. Test responsive viewports (375px, 768px, 1440px)
4. Check keyboard navigation
5. Validate color contrast
6. Capture screenshots
7. Provide detailed report

**Option 2: Using Slash Command (Quick)**
```
# In Claude Code
/design-review
```

### Understanding Design Review Output

**Example Report:**
```markdown
### Design Review Summary
Overall, the vital signs tracker implements a clean interface with good use of design tokens. The responsive behavior is excellent, and keyboard navigation works well.

### Findings

#### Blockers
- [Critical] Temperature input allows invalid values (e.g., 500°F). Add validation to prevent impossible vitals.

#### High-Priority
- Input focus states are barely visible. The blue ring is only 1px and doesn't meet 3:1 contrast.
  [Screenshot showing focus state]
- Error messages don't have sufficient color contrast (2.8:1, need 4.5:1).

#### Medium-Priority / Suggestions
- Consider adding visual indicators for abnormal ranges (e.g., highlight temp >103°F in amber)
- Save button could provide more immediate feedback (add loading spinner)

#### Nitpicks
- Nit: Spacing between label and input is 6px, should be 4px or 8px per design system
- Nit: Consider using `text-sm` for labels instead of `text-xs` for better legibility
```

**Action Items by Priority:**

1. **[Blocker]** - Fix immediately, cannot merge
   - Add input validation
   - Fix critical accessibility issues
   - Resolve console errors

2. **[High-Priority]** - Fix before merge
   - Improve focus states
   - Fix color contrast issues
   - Address responsive layout problems

3. **[Medium-Priority]** - Create follow-up tasks
   - UX enhancements
   - Performance improvements
   - Nice-to-have features

4. **[Nitpick]** - Optional, low-impact
   - Minor spacing adjustments
   - Stylistic preferences

### Responding to Feedback

```typescript
// Before (from review feedback):
// "Input has no validation"
<Input
  value={temperature}
  onChange={(e) => setTemperature(e.target.value)}
/>

// After (fixed):
<Input
  type="number"
  min="95"
  max="108"
  step="0.1"
  value={temperature}
  onChange={(e) => {
    const val = parseFloat(e.target.value);
    if (val >= 95 && val <= 108) {
      setTemperature(e.target.value);
    }
  }}
  aria-invalid={temperature && (parseFloat(temperature) < 95 || parseFloat(temperature) > 108)}
  aria-describedby="temp-error"
/>
{error && <span id="temp-error" className="text-red-400 text-sm">{error}</span>}
```

---

## Code Review Checklist

Before requesting review on a PR, ensure:

### Functionality
- [ ] Feature works as expected in all scenarios
- [ ] Edge cases handled (empty states, errors, long text)
- [ ] Data validation implemented
- [ ] Error messages are user-friendly

### Design
- [ ] Uses design tokens from `tailwind.config.ts`
- [ ] Responsive at 375px, 768px, 1440px
- [ ] Follows VetHub design patterns
- [ ] Colors meet WCAG AA contrast ratios (4.5:1 text, 3:1 UI)

### Accessibility
- [ ] Keyboard navigation works (Tab, Enter, Esc)
- [ ] Focus states are visible
- [ ] Form labels properly associated
- [ ] ARIA labels on custom components
- [ ] Color is not the only indicator of state

### Testing
- [ ] Playwright tests cover critical paths
- [ ] Tests pass locally (`npm test`)
- [ ] No console errors in browser
- [ ] Design review completed

### Code Quality
- [ ] TypeScript types defined
- [ ] No `any` types (use proper types)
- [ ] Components are focused and composable
- [ ] Reuses existing utilities and components
- [ ] JSDoc comments on complex functions

### Performance
- [ ] No unnecessary re-renders
- [ ] Images optimized
- [ ] Large lists virtualized if needed
- [ ] Lazy loading for heavy components

---

## Common Patterns

### 1. Toast Notifications

```tsx
import { useToast } from '@/components/ui/use-toast';

function MyComponent() {
  const { toast } = useToast();

  const handleSave = async () => {
    try {
      await apiClient.saveData(data);
      toast({
        title: 'Success',
        description: 'Data saved successfully',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save data',
        variant: 'destructive',
      });
    }
  };
}
```

### 2. Confirmation Dialogs

```tsx
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

function DeletePatientButton({ patientId }: { patientId: number }) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="destructive">Delete Patient</Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently delete this patient and all associated data.
            This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={() => handleDelete(patientId)}>
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
```

### 3. Loading States

```tsx
function PatientList() {
  const [loading, setLoading] = useState(true);
  const [patients, setPatients] = useState<Patient[]>([]);

  useEffect(() => {
    loadPatients();
  }, []);

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    );
  }

  return <div>{/* Patient list */}</div>;
}
```

### 4. Form Handling

```tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  weight: z.number().min(0.1).max(200),
  species: z.enum(['Canine', 'Feline', 'Other']),
});

function PatientForm() {
  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      weight: 0,
      species: 'Canine',
    },
  });

  const onSubmit = (data: z.infer<typeof schema>) => {
    // Handle form submission
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Patient Name</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit">Submit</Button>
      </form>
    </Form>
  );
}
```

---

## Troubleshooting

### Tests Failing

**"Cannot find element"**
```bash
# Run in headed mode to see what's happening
npm run test:headed tests/your-test.spec.ts

# Or use UI mode to debug step-by-step
npm run test:ui tests/your-test.spec.ts
```

**"Timeout waiting for element"**
```ts
// Increase timeout for slow operations
await page.locator('button').click({ timeout: 10000 });

// Or wait for network to be idle
await page.waitForLoadState('networkidle');
```

### Design Review Issues

**"Cannot navigate to page"**
- Ensure dev server is running (`npm run dev`)
- Check URL is correct
- Verify page actually exists

**"Playwright MCP tools not available"**
- Install Playwright MCP server in Claude Code settings
- Restart Claude Code after installation

### Build Errors

**TypeScript errors**
```bash
# Check all type errors
npm run typecheck

# Fix common issues
# - Add missing types
# - Remove 'any' types
# - Import types properly
```

**Tailwind classes not applying**
```bash
# Verify class names are correct
# - Check tailwind.config.ts for custom classes
# - Ensure content paths include your files
# - Restart dev server if config changed
```

### Runtime Errors

**"Failed to fetch"**
- Check API endpoint is correct
- Verify backend is running
- Check network tab in browser DevTools

**React hydration errors**
- Ensure server and client render the same thing
- Check for `useEffect` that modifies DOM directly
- Verify no mismatched tags

---

## Resources

- **VetHub Docs**: See QUICK_REFERENCE.md for common tasks
- **Design System**: `.claude/context/design-principles.md` and `style-guide.md`
- **Playwright Docs**: https://playwright.dev
- **shadcn/ui**: https://ui.shadcn.com
- **Radix UI**: https://radix-ui.com
- **Tailwind CSS**: https://tailwindcss.com

## Getting Help

1. **Search existing code** for similar patterns
2. **Read test examples** in `/tests/` directory
3. **Run design review** for automated feedback
4. **Ask Claude Code** specific questions about implementation
5. **Check documentation** in related files

---

**Remember**: The goal is to build tools that help veterinary professionals provide the best possible care. Every feature should prioritize clinical clarity, efficiency, and accuracy.
