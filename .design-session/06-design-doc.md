# Design Doc: VetHub Neo-Pop Dashboard

## Overview
Transform the VetHub dashboard from dark/clinical to vibrant neo-pop style while improving performance by splitting the monolithic page.tsx.

---

## Architecture Changes

### Split page.tsx into:
1. `page.tsx` - Main dashboard (tasks + patients only)
2. `/soap/page.tsx` - SOAP Builder (already exists)
3. `/mri-schedule/page.tsx` - MRI Schedule (move from main)
4. `/reference/page.tsx` - Reference data (move from main)
5. `/tools/page.tsx` - Other tools

### New Components to Create:
- `components/dashboard/TaskCard.tsx`
- `components/dashboard/PatientChip.tsx`
- `components/dashboard/PatientRow.tsx`
- `components/dashboard/DashboardHeader.tsx`
- `components/ui/blob-background.tsx`

---

## Tailwind Config Updates

### New Colors
```ts
// tailwind.config.ts
colors: {
  // Neo-pop palette
  'neo': {
    'cream': '#FFF8F0',
    'cream-light': '#FFFBF5',
    'coral': '#FFB4A2',
    'lavender': '#B8B5FF',
    'mint': '#A8E6CF',
    'yellow': '#FFE66D',
    'pink': '#FFD6E0',
    'sky': '#C9F0FF',
    'purple': '#957FEF',
    'orange': '#FF7F50',
    'teal': '#00C9A7',
  },
  'status': {
    'critical': '#FF6B6B',
    'monitoring': '#FFD93D',
    'stable': '#6BCB77',
    'discharged': '#C4C4C4',
  }
}
```

### Border Radius
```ts
borderRadius: {
  'neo': '24px',
  'neo-sm': '16px',
  'neo-lg': '32px',
  'pill': '50px',
}
```

---

## Component Specifications

### TaskCard
```tsx
interface TaskCardProps {
  name: string;
  count: { done: number; total: number };
  patients: Array<{ id: number; name: string; done: boolean }>;
  color: 'coral' | 'lavender' | 'mint' | 'yellow' | 'pink' | 'sky';
  onPatientClick: (patientId: number) => void;
}
```

**Styling:**
- Background: `bg-neo-{color}`
- Border radius: `rounded-neo`
- Shadow: `shadow-lg hover:shadow-xl`
- Hover: `hover:-translate-y-1 transition-all`
- Padding: `p-5`

### PatientChip
```tsx
interface PatientChipProps {
  name: string;
  species: 'dog' | 'cat';
  done: boolean;
  onClick: () => void;
}
```

**Styling:**
- Background: `bg-white/70 hover:bg-white`
- Border radius: `rounded-pill`
- Padding: `px-3.5 py-2`
- Font: `font-semibold text-sm`
- Hover: `hover:scale-105 transition-all`

### PatientRow
```tsx
interface PatientRowProps {
  patient: Patient;
  onExpand: () => void;
  onTag: () => void;
}
```

**Styling:**
- Background: `bg-neo-cream-light hover:bg-neo-cream`
- Border radius: `rounded-neo-sm`
- Padding: `p-4`
- Hover: `hover:translate-x-1 transition-all`

### DashboardHeader
**Styling:**
- Background: `bg-gradient-to-r from-neo-purple to-neo-lavender`
- Wavy bottom: CSS `::after` pseudo-element
- Nav buttons: `rounded-pill` with active/hover states

---

## Layout Structure

```
┌─────────────────────────────────────────────────┐
│ DashboardHeader                                 │
│ - Logo                                          │
│ - Nav (Tasks, Rounds, Schedule, Print, Tools)   │
│ - Wavy bottom edge                              │
├─────────────────────────────────────────────────┤
│ Main Content (bg-neo-cream)                     │
│                                                 │
│ ┌─ Tasks Section ─────────────────────────────┐ │
│ │ Title + Progress Pill                       │ │
│ │                                             │ │
│ │ Grid of TaskCards (auto-fill, min 280px)   │ │
│ │ [Coral] [Lavender] [Mint]                  │ │
│ │ [Yellow] [Pink] [Sky]                      │ │
│ └─────────────────────────────────────────────┘ │
│                                                 │
│ ┌─ Patients Section (white card) ─────────────┐ │
│ │ Title + Search + Add Button                 │ │
│ │                                             │ │
│ │ PatientRow                                  │ │
│ │ PatientRow                                  │ │
│ │ PatientRow                                  │ │
│ └─────────────────────────────────────────────┘ │
│                                                 │
│ (Blob decorations in background)                │
└─────────────────────────────────────────────────┘
```

---

## Animation Specifications

### Task Card Hover
```css
transition: all 0.2s ease;
transform: translateY(-4px);
box-shadow: 0 8px 30px rgba(0,0,0,0.12);
```

### Patient Chip Hover
```css
transition: all 0.2s ease;
transform: scale(1.05);
background: white;
```

### Patient Row Hover
```css
transition: all 0.2s ease;
transform: translateX(4px);
background: #FFF8F0;
```

### Checkmark Animation (when task completed)
```css
@keyframes checkmark {
  0% { transform: scale(0); }
  50% { transform: scale(1.2); }
  100% { transform: scale(1); }
}
```

---

## Migration Plan

### Phase 1: Setup (no visual changes yet)
1. Add neo-pop colors to tailwind.config.ts
2. Create new component files (empty shells)

### Phase 2: Build Components
1. Build TaskCard component
2. Build PatientChip component
3. Build PatientRow component
4. Build DashboardHeader component

### Phase 3: Refactor page.tsx
1. Extract task logic into TaskCard usage
2. Extract patient list into PatientRow usage
3. Remove SOAP Builder code (keep in /soap)
4. Remove MRI Schedule code (move to /mri-schedule)
5. Remove Reference data (move to /reference)

### Phase 4: Apply Styling
1. Switch background to neo-cream
2. Apply neo-pop styling to all components
3. Add blob background decorations
4. Add animations

### Phase 5: Polish
1. Test all interactions
2. Ensure responsive design
3. Check accessibility
4. Performance testing

---

## Files to Modify

| File | Action |
|------|--------|
| `tailwind.config.ts` | Add neo-pop colors |
| `src/app/page.tsx` | Refactor, remove heavy features |
| `src/app/globals.css` | Add wavy edge CSS |
| `src/components/dashboard/*` | Create new |
| `src/app/mri-schedule/page.tsx` | Create new |
| `src/app/reference/page.tsx` | Create new |

---

## Success Metrics
- [ ] Page load time < 2 seconds
- [ ] No more than 500 lines in page.tsx
- [ ] All hover animations smooth (60fps)
- [ ] Looks like the approved mockup
- [ ] All existing functionality preserved
