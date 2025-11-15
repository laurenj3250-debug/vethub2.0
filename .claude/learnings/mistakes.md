# VetHub Mistakes & Learnings Log

This file documents mistakes made during VetHub development and how they were resolved. Claude Code references this to avoid repeating errors.

---

## 2025-11-14 - Initial Learning System Setup

**Context**: Setting up learning and mistake tracking system
**Goal**: Create a feedback loop so Claude Code learns from mistakes and improves over time
**Implementation**: Created `.claude/learnings/` directory with structured documentation

---

## Common Mistakes to Avoid

### Design System

#### ❌ Hardcoding Colors
**Problem**: Using literal color values like `bg-red-600` instead of design tokens
```tsx
// ❌ WRONG
<Badge className="bg-red-600">Critical</Badge>

// ✅ CORRECT
<Badge className="bg-patient-status-critical">Critical</Badge>
```
**Why**: Makes theme changes harder, creates inconsistency
**Reference**: `tailwind.config.ts` for all design tokens

#### ❌ Inconsistent Typography Sizes
**Problem**: Using arbitrary font sizes like `text-[24px]`
```tsx
// ❌ WRONG
<h2 className="text-[24px] font-bold">Patient Name</h2>

// ✅ CORRECT
<h2 className="text-3xl font-semibold">Patient Name</h2>
```
**Why**: Breaks design system, creates maintenance burden
**Reference**: `.claude/context/style-guide.md` for typography scale

#### ❌ Random Spacing Values
**Problem**: Using non-standard spacing like `space-y-[18px]`
```tsx
// ❌ WRONG
<div className="space-y-[18px]">

// ✅ CORRECT
<div className="space-y-4">  // 16px from design system
```
**Why**: Creates visual inconsistency
**Reference**: Use 4, 8, 12, 16, 24, 32, 48, 64px only

---

### Testing

#### ❌ Brittle Test Selectors
**Problem**: Using CSS classes that change frequently
```typescript
// ❌ WRONG - breaks when styling changes
await page.locator('.patient-card-wrapper-container').click();

// ✅ CORRECT - semantic selectors
await page.locator('[data-testid="patient-card"]').click();
await page.locator('button:has-text("Save Patient")').click();
```
**Why**: Tests break unnecessarily when CSS changes
**Prevention**: Use data-testid, aria-labels, or semantic text

#### ❌ Not Waiting for Network
**Problem**: Tests fail intermittently due to async operations
```typescript
// ❌ WRONG
await page.goto('/rounding');
await page.locator('input').first().fill('data');

// ✅ CORRECT
await page.goto('/rounding');
await page.waitForLoadState('networkidle');
await page.locator('input').first().fill('data');
```
**Why**: Data may not be loaded yet
**Prevention**: Always wait for 'networkidle' after navigation

#### ❌ Assuming Data Exists
**Problem**: Tests assume specific data is present
```typescript
// ❌ WRONG - breaks with empty database
const firstPatient = page.locator('[data-testid="patient-card"]').first();
await firstPatient.click();

// ✅ CORRECT - check existence first
const patients = page.locator('[data-testid="patient-card"]');
const count = await patients.count();
if (count > 0) {
  await patients.first().click();
}
```
**Why**: Tests fail in different environments
**Prevention**: Always check count or visibility first

---

### Accessibility

#### ❌ Missing Form Labels
**Problem**: Inputs without associated labels
```tsx
// ❌ WRONG
<Input placeholder="Patient Name" />

// ✅ CORRECT
<Label htmlFor="patient-name">Patient Name</Label>
<Input id="patient-name" aria-label="Patient Name" />
```
**Why**: Screen readers can't identify the field
**Prevention**: Every input needs a label or aria-label

#### ❌ Poor Focus Indicators
**Problem**: Focus states that don't meet contrast requirements
```tsx
// ❌ WRONG - barely visible focus
<Button className="focus:ring-1 focus:ring-blue-200">

// ✅ CORRECT - 3:1 contrast minimum
<Button className="focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
```
**Why**: Keyboard users can't see where they are
**Prevention**: Test focus states in browser, verify 3:1 contrast

#### ❌ Color as Only Indicator
**Problem**: Using only color to convey status
```tsx
// ❌ WRONG - color blind users can't distinguish
<div className="bg-red-500">Critical</div>

// ✅ CORRECT - icon + text + color
<div className="bg-patient-status-critical">
  <AlertTriangle className="w-4 h-4" />
  <span>Critical</span>
</div>
```
**Why**: Color blindness affects 8% of males
**Prevention**: Always combine color with icon/text

---

### Veterinary Domain

#### ❌ Incorrect Medical Units
**Problem**: Displaying medication doses without units
```tsx
// ❌ WRONG - ambiguous
<div>Dose: 5</div>

// ✅ CORRECT - explicit units
<div>Dose: 5 mg/kg</div>
```
**Why**: Critical for patient safety
**Prevention**: Always include units (mg/kg, mL, mg, etc.)

#### ❌ Not Validating Clinical Values
**Problem**: Allowing impossible vital signs
```tsx
// ❌ WRONG - allows temp of 500°F
<Input type="number" value={temperature} />

// ✅ CORRECT - validate range
<Input
  type="number"
  min="95"
  max="108"
  value={temperature}
  aria-invalid={temperature < 95 || temperature > 108}
/>
```
**Why**: Prevents data entry errors
**Prevention**: Add validation for all clinical values

#### ❌ Unclear Neuro Localization
**Problem**: Free text for standardized clinical terms
```tsx
// ❌ WRONG - inconsistent data
<Input placeholder="Localization" />

// ✅ CORRECT - standardized options with free text backup
<Select>
  <option>T3-L3 Myelopathy</option>
  <option>L4-S3 Myelopathy</option>
  <option>C1-C5 Myelopathy</option>
  <option>Other (specify)</option>
</Select>
```
**Why**: Enables data analysis, maintains consistency
**Prevention**: Use dropdowns for standardized terms, allow "Other" for exceptions

---

### Performance

#### ❌ Not Memoizing Expensive Calculations
**Problem**: Recalculating MRI dosing on every render
```tsx
// ❌ WRONG
const dose = calculateMriDosage(weight, scanType);

// ✅ CORRECT
const dose = useMemo(
  () => calculateMriDosage(weight, scanType),
  [weight, scanType]
);
```
**Why**: Causes unnecessary re-renders
**Prevention**: Use useMemo for calculations, useCallback for functions

#### ❌ Loading All Patients at Once
**Problem**: Fetching 500+ patient records on page load
```tsx
// ❌ WRONG
const { data: patients } = useQuery('patients', () =>
  apiClient.getPatients()
);

// ✅ CORRECT - pagination or infinite scroll
const { data: patients } = useQuery('patients', () =>
  apiClient.getPatients({ limit: 50, offset: 0 })
);
```
**Why**: Slow page load, poor UX
**Prevention**: Paginate lists, virtualize long lists

---

### Code Quality

#### ❌ Using 'any' Type
**Problem**: Bypassing TypeScript safety
```typescript
// ❌ WRONG
const handleSave = (data: any) => { ... }

// ✅ CORRECT
interface PatientData {
  name: string;
  weight: number;
  species: 'Canine' | 'Feline';
}
const handleSave = (data: PatientData) => { ... }
```
**Why**: Loses type safety, harder to maintain
**Prevention**: Always define proper types/interfaces

#### ❌ Not Handling Errors
**Problem**: Unhandled promise rejections
```typescript
// ❌ WRONG
apiClient.savePatient(data);

// ✅ CORRECT
try {
  await apiClient.savePatient(data);
  toast({ title: 'Success', description: 'Patient saved' });
} catch (error) {
  toast({
    title: 'Error',
    description: 'Failed to save patient',
    variant: 'destructive'
  });
}
```
**Why**: Silent failures, poor UX
**Prevention**: Wrap all async operations in try/catch

---

## Template for New Mistakes

```markdown
## [Date] - [Brief Description]

**Context**: What were you trying to do?
**Mistake**: What went wrong?
**Impact**: How did it affect users/system?
**Solution**: How was it fixed?
**Prevention**: How to avoid this?
**Code Example**:
```tsx
// ❌ WRONG
...

// ✅ CORRECT
...
```
**Reference**: Link to docs/PR/commit
```

---

## Learning from Design Reviews

### Pattern: Focus States
**Learned**: Focus states must have 3:1 contrast ratio minimum
**Implementation**: All interactive elements now use `focus:ring-2 focus:ring-offset-2`
**Validated**: Design review agent checks this automatically

### Pattern: Mobile-First Layout
**Learned**: Stack vertically on mobile, use grid on desktop
**Implementation**: Use `flex flex-col md:grid md:grid-cols-2` pattern
**Validated**: Responsive tests check 375px, 768px, 1440px

### Pattern: Loading States
**Learned**: Users need feedback during async operations
**Implementation**: Show skeleton screens for page loads, spinners for button actions
**Validated**: Tests check for loading indicators

---

## Continuous Improvement

This file grows as VetHub evolves. Every mistake is a learning opportunity. By documenting errors and solutions:

1. **Same mistakes aren't repeated** - Claude checks this file before making changes
2. **Patterns emerge** - Common issues become documented best practices
3. **Quality improves** - Fewer bugs, better UX, faster development
4. **Knowledge compounds** - Each learning builds on previous ones

**Last Updated**: November 14, 2025
**Next Review**: After first design review feedback
