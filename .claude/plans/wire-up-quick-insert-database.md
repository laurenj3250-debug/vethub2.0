# Plan: Wire Up Quick Insert to Database Storage

## Goal
Replace localStorage-based slash commands with the existing database-backed Quick Insert system so user-added items persist across devices and sessions.

---

## Current State

### What exists but is UNUSED:
- `useQuickInsert()` hook - fully functional, uses PostgreSQL via API
- `QuickInsertPanel.tsx` - UI for quick insert buttons
- `QuickOptionsBrowser.tsx` - full modal for browsing/editing all options
- API routes at `/api/quick-options/` - working CRUD operations
- Database model `QuickInsertOption` in Prisma schema

### What's currently used (localStorage-based):
- `useSlashCommands()` hook - stores in localStorage
- `SlashCommandManager.tsx` - UI at `/slash-commands` page
- `SlashCommandTextarea.tsx` - textarea with slash command support

---

## Implementation Plan

### Step 1: Update `useSlashCommands` to use database instead of localStorage

**File**: `src/hooks/use-slash-commands.ts`

**Changes**:
- Remove localStorage read/write logic
- Import and use the `/api/quick-options` API endpoints
- Map QuickInsertOption database format to SlashCommand format
- Keep the same interface (commands, addCommand, updateCommand, deleteCommand)
- Add `trigger` field to database items when creating slash commands

**Why**: This is the minimal change approach - existing SlashCommandTextarea and SlashCommandManager continue to work, but data flows to/from database.

---

### Step 2: Add `trigger` field to QuickInsertOption model

**File**: `prisma/schema.prisma`

**Changes**:
- Add optional `trigger` field to `QuickInsertOption` model
- Run `npx prisma db push` to update Railway database

**Why**: Slash commands need a trigger (e.g., "gaba" for `/gaba`). The current QuickInsertOption model doesn't have this field.

---

### Step 3: Update Quick Insert library to include triggers

**File**: `src/data/quick-insert-library.ts`

**Changes**:
- Ensure all built-in items have `trigger` field (most already do)
- Update seed route to include triggers when seeding

**Why**: Database-seeded defaults need triggers for slash command functionality.

---

### Step 4: Update API route to handle trigger field

**File**: `src/app/api/quick-options/route.ts`

**Changes**:
- Accept `trigger` in POST body
- Return `trigger` in GET response
- Validate trigger uniqueness (optional but recommended)

---

### Step 5: Update SlashCommandManager to use database hook

**File**: `src/components/SlashCommandManager.tsx`

**Changes**:
- Replace `useSlashCommands()` with modified version that uses database
- No UI changes needed - same form fields work

---

### Step 6: Migrate existing localStorage data (one-time)

**File**: `src/hooks/use-slash-commands.ts`

**Changes**:
- On first load, check for localStorage data
- If found, POST each custom command to database
- Clear localStorage after successful migration
- Set migration flag to prevent re-running

---

## Files to Modify

| File | Change Type |
|------|-------------|
| `prisma/schema.prisma` | Add `trigger` field |
| `src/hooks/use-slash-commands.ts` | Replace localStorage with API calls |
| `src/app/api/quick-options/route.ts` | Handle `trigger` field |
| `src/app/api/quick-options/[id]/route.ts` | Handle `trigger` in updates |
| `src/app/api/quick-options/seed/route.ts` | Seed triggers |
| `src/data/quick-insert-library.ts` | Verify all items have triggers |

---

## Files NOT Changing

- `SlashCommandTextarea.tsx` - works as-is
- `SlashCommandMenu.tsx` - works as-is
- `SlashCommandManager.tsx` - minimal changes (hook swap)
- `QuickInsertPanel.tsx` - remains available for future use
- `QuickOptionsBrowser.tsx` - remains available for future use

---

## Testing Plan

1. Add a custom slash command via `/slash-commands` page
2. Refresh page - command should persist
3. Open in incognito - command should still appear
4. Test on production Railway URL after deploy
5. Verify built-in commands still work
6. Verify `/gaba`, `/kep`, etc. triggers work in RoundingSheet

---

## Rollback Plan

If issues occur:
- Revert `use-slash-commands.ts` to localStorage version
- Database changes are additive (new field), no data loss

---

## Questions for User

1. Should custom triggers be validated for uniqueness?
2. Should there be a max length for triggers?
3. Do you want to keep the `/slash-commands` page or replace it with QuickOptionsBrowser modal?
