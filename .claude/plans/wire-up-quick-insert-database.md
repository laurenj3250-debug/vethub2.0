# Plan: Wire Up Quick Insert to Database Storage

## Context

### Investigation Summary
- **User Report**: Quick Reference items not storing when added
- **Root Cause**: Two disconnected systems exist:
  1. `useSlashCommands()` - uses **localStorage** (what's actually used in the app)
  2. `useQuickInsert()` - uses **database** (components exist but are orphaned)

### Related Project Context
- **Rounding Sheet Overhaul Plan** (`.claude/plans/rounding-sheet-overhaul.md`):
  - Phase 4 mentions revamping QuickInsertPanel to button-triggered
  - Does NOT address storage issue
- **Error Log** (`.claude/learnings/error-log.md`):
  - All field names must be camelCase (Error #1)
  - Use conditional spread for object merges (Error #5)
- **`vethub-debug` skill**: Referenced in CLAUDE.md but does not exist

---

## Current State Analysis

### Database Schema (`QuickInsertOption`)
```prisma
model QuickInsertOption {
  id        String   @id @default(cuid())
  label     String   // Button display text
  text      String   // Text inserted into field
  category  String   // 'surgery' | 'seizures' | 'other'
  field     String   // 'therapeutics' | 'diagnostics' | 'concerns' | 'problems'
  isDefault Boolean  @default(false)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

**MISSING**: `trigger` field (needed for `/gaba`, `/kep` slash commands)

### API Routes (working but incomplete)
| Route | Method | Status |
|-------|--------|--------|
| `/api/quick-options` | GET | ✅ Works |
| `/api/quick-options` | POST | ⚠️ No `trigger` field |
| `/api/quick-options/[id]` | PATCH | ⚠️ No `trigger` field |
| `/api/quick-options/[id]` | DELETE | ✅ Works |
| `/api/quick-options/seed` | POST | ⚠️ Doesn't seed triggers |

### Quick Insert Library (`src/data/quick-insert-library.ts`)
- 34 built-in items
- All have `trigger` property defined (e.g., `trigger: 'gaba'`)
- But triggers are NOT saved to database when seeding

### Components Status
| Component | Location | Status |
|-----------|----------|--------|
| `SlashCommandTextarea` | Used in RoundingSheet | ✅ Works |
| `SlashCommandMenu` | Used by above | ✅ Works |
| `SlashCommandManager` | `/slash-commands` page | ❌ Uses localStorage |
| `QuickInsertPanel` | Orphaned | ❌ Not imported anywhere |
| `QuickOptionsBrowser` | Orphaned | ❌ Not imported anywhere |

---

## Implementation Plan

### Step 1: Add `trigger` field to database schema

**File**: `prisma/schema.prisma`

**Change**:
```prisma
model QuickInsertOption {
  id        String   @id @default(cuid())
  trigger   String?  // Slash command trigger (e.g., 'gaba' for /gaba)
  label     String   // Button display text
  text      String   // Text inserted into field
  category  String   // 'surgery' | 'seizures' | 'other'
  field     String   // 'therapeutics' | 'diagnostics' | 'concerns' | 'problems'
  isDefault Boolean  @default(false)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([category])
  @@index([field])
  @@index([trigger])
}
```

**Then run**: `npx prisma db push` (Railway will apply on deploy)

---

### Step 2: Update API routes to handle `trigger` field

**File**: `src/app/api/quick-options/route.ts`

**Changes to POST**:
- Accept `trigger` in body
- Validate trigger uniqueness (optional but recommended)

**File**: `src/app/api/quick-options/[id]/route.ts`

**Changes to PATCH**:
- Accept `trigger` in body for updates

---

### Step 3: Update seed route to include triggers

**File**: `src/app/api/quick-options/seed/route.ts`

**Change**: Include `trigger` field when seeding from `quickInsertLibrary`:
```typescript
data: quickInsertLibrary.map((item) => ({
  trigger: item.trigger || null,  // ADD THIS
  label: item.label,
  text: item.text,
  category: item.category,
  field: item.field,
  isDefault: true,
})),
```

---

### Step 4: Rewrite `useSlashCommands` to use database API

**File**: `src/hooks/use-slash-commands.ts`

**Current** (localStorage):
```typescript
const STORAGE_KEY = 'vethub-slash-commands';
localStorage.setItem(STORAGE_KEY, JSON.stringify(commands));
```

**New** (database API):
```typescript
// Fetch from API instead of localStorage
const response = await fetch('/api/quick-options');
const data = await response.json();

// Filter to items with triggers for slash commands
const commands = data
  .filter((item) => item.trigger)
  .map((item) => ({
    id: item.id,
    trigger: item.trigger,
    label: item.label,
    text: item.text,
    field: mapFieldName(item.field),
    category: item.category,
    isCustom: !item.isDefault,
  }));
```

**Key changes**:
- Remove localStorage read/write
- Fetch from `/api/quick-options` on mount
- POST to API when adding commands
- PATCH to API when updating
- DELETE to API when removing
- Keep same interface for backward compatibility

---

### Step 5: One-time localStorage migration

**File**: `src/hooks/use-slash-commands.ts`

**On first load**:
1. Check if `vethub-slash-commands` exists in localStorage
2. If yes, POST each custom command to database
3. Set migration flag `vethub-slash-commands-migrated`
4. Clear old localStorage data

```typescript
async function migrateLocalStorage() {
  const migrated = localStorage.getItem('vethub-slash-commands-migrated');
  if (migrated === 'true') return;

  const stored = localStorage.getItem('vethub-slash-commands');
  if (stored) {
    const customCommands = JSON.parse(stored);
    for (const cmd of customCommands) {
      await fetch('/api/quick-options', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trigger: cmd.trigger,
          label: cmd.label,
          text: cmd.text,
          category: cmd.category || 'other',
          field: reverseMapFieldName(cmd.field),
          isDefault: false,
        }),
      });
    }
    localStorage.removeItem('vethub-slash-commands');
  }
  localStorage.setItem('vethub-slash-commands-migrated', 'true');
}
```

---

### Step 6: Update `SlashCommandManager` UI (minimal)

**File**: `src/components/SlashCommandManager.tsx`

**Changes**:
- The hook interface stays the same
- No UI changes required
- Will automatically use database storage via updated hook

---

## Files to Modify (6 files)

| File | Change Type | Lines Est. |
|------|-------------|------------|
| `prisma/schema.prisma` | Add `trigger` field + index | ~3 |
| `src/app/api/quick-options/route.ts` | Handle trigger in POST | ~5 |
| `src/app/api/quick-options/[id]/route.ts` | Handle trigger in PATCH | ~3 |
| `src/app/api/quick-options/seed/route.ts` | Include triggers when seeding | ~2 |
| `src/hooks/use-slash-commands.ts` | Replace localStorage with API | ~80 |
| `src/data/quick-insert-library.ts` | No changes (triggers already exist) | 0 |

**Total**: ~93 lines changed

---

## Files NOT Changing

- `SlashCommandTextarea.tsx` - works as-is
- `SlashCommandMenu.tsx` - works as-is
- `SlashCommandManager.tsx` - UI unchanged (hook swap invisible)
- `QuickInsertPanel.tsx` - remains for future use
- `QuickOptionsBrowser.tsx` - remains for future use
- `useQuickInsert.ts` - remains for Quick Insert button workflow

---

## Field Mapping Reference

Slash commands use different field names than database:

| Database Field | Slash Command Field |
|----------------|---------------------|
| `therapeutics` | `therapeutics` |
| `diagnostics` | `diagnosticFindings` |
| `concerns` | `comments` |
| `problems` | `problems` |

The hook must map between these when reading/writing.

---

## Testing Plan

1. **Database migration**
   - Run `npx prisma db push`
   - Verify `trigger` column exists

2. **API endpoints**
   - POST new option with trigger → verify saved
   - GET options → verify trigger returned
   - PATCH option trigger → verify updated

3. **Slash commands**
   - Add custom command via `/slash-commands` page
   - Refresh page → command persists
   - Open incognito → command still appears
   - Test on production Railway URL

4. **Migration**
   - Add command to localStorage manually
   - Load app → verify migrated to database
   - Check localStorage cleared

5. **Built-in commands**
   - Verify `/gaba`, `/kep`, etc. still work
   - Verify built-in commands appear in menu

---

## Rollback Plan

If issues occur:
1. Revert `use-slash-commands.ts` to localStorage version
2. Database changes are additive (new `trigger` field) - no data loss
3. Users would lose custom commands added during failed period

---

## Questions Resolved

1. **Trigger uniqueness**: Not enforced at DB level (allows same trigger in different fields)
2. **Page preference**: Keep `/slash-commands` page (minimal change approach)
3. **QuickInsertPanel**: Not wired up in this plan - separate enhancement

---

## Alignment with Existing Plans

This plan complements **Rounding Sheet Overhaul Phase 4**:
- Phase 4 makes QuickInsert button-triggered (UX change)
- This plan makes data persist to database (storage change)
- Both can be implemented independently

---

## Visual Consistency: Neo-Pop Design System

All UI must match VetHub's neo-pop design system:

### Required Styling Constants
```typescript
const NEO_BORDER = '2px solid #000';
const NEO_SHADOW = '4px 4px 0 #000';
const NEO_SHADOW_SM = '2px 2px 0 #000';

const COLORS = {
  lavender: '#DCC4F5',  // Category tabs, selected states
  mint: '#B8E6D4',      // Success, add buttons
  pink: '#FFBDBD',      // Warnings, errors
  cream: '#FFF8F0',     // Background, forms
};
```

### UI Components Must Include
- **Cards/Modals**: `border: NEO_BORDER`, `boxShadow: NEO_SHADOW`
- **Buttons**: `border: NEO_BORDER`, hover effect `-translate-y-0.5`
- **Inputs**: `border: NEO_BORDER`, focus ring `focus:ring-[#6BB89D]`
- **Interactive elements**: Shadow offset `2px 2px 0 #000` or `3px 3px 0 #000`

### SlashCommandManager Already Compliant
Current `/slash-commands` page uses neo-pop styling correctly:
- `src/components/SlashCommandManager.tsx` lines 19-20, 152, 165, etc.

### No Visual Changes Required
This plan only changes data storage (localStorage → database).
The existing UI components already match the system theme.

---

## Success Criteria

- [ ] Custom slash commands persist across page refreshes
- [ ] Custom slash commands persist across browser sessions
- [ ] Custom slash commands persist across devices
- [ ] Built-in commands (`/gaba`, `/kep`, etc.) still work
- [ ] Existing localStorage commands migrated
- [ ] No console errors
- [ ] Railway production deployment works
- [ ] UI unchanged (already matches neo-pop design system)
