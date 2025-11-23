# Design Brief: VetHub Dashboard Refresh

## Problem Statement
The current dashboard has three main issues:
1. **Navigation is confusing** - Hard to find things, too much on one page
2. **Looks dated** - Functional but needs visual refresh
3. **Performance is slow** - 60K token monolithic file causes lag

## User's Core Workflow
**Task management is #1** - Checking and completing tasks is the primary activity

## Design Direction

### Visual Style
**NEO-POP / Vibrant & Fun**
- LIGHT MODE with warm cream background
- Bold color blocking (pink, yellow, lavender, coral, lime)
- Organic blob shapes, wavy dividers
- Very rounded corners (16-24px)
- Playful illustrations/icons
- Fun typography
- Like "Uncle Stinky" + "Super Hello" energy
- NOT clinical, NOT corporate, NOT muted

### Layout
**Keep current structure:**
- Tasks on TOP (cards with patient chips)
- Patients on BOTTOM (list view)
- Quick actions in header

### What Stays on Dashboard
- Task cards with patient chips (prettier version)
- Patient list
- Quick actions (Add Patient, Print, etc.)
- Search and filters

### What Moves to Separate Pages
- SOAP Builder → `/soap`
- MRI Schedule → `/mri-schedule`
- Reference data → `/reference`
- Other tools → `/tools`

## Specific Improvements Needed

### Task Cards
- More spacing between chips
- Better chip styling (more rounded, clearer text)
- Cleaner progress indicators
- Subtle hover states

### Patient List
- More breathing room
- Clearer visual hierarchy
- Better status badges
- Smoother interactions

### Header/Navigation
- Cleaner nav buttons
- Better visual grouping
- Quick actions more prominent

### Performance
- Split page.tsx into smaller components
- Lazy load non-critical features
- Move heavy features to separate routes

## Success Criteria
- [ ] Page loads noticeably faster
- [ ] Can find any feature in < 2 clicks
- [ ] Looks modern and polished
- [ ] Tasks are scannable at a glance
- [ ] Feels friendly, not clinical
