# Neurology Rounds Sheet Generator — Design Document

**Date:** 2026-03-13
**Status:** Approved — moving to implementation

---

## Overview

Build a Neurology Rounds Sheet renderer into VetHub 2.0 at `/rounds-sheet`. This replaces the old appointments module (deleted) and brings Lauren's daily Claude.ai rounds sheet workflow into the website as an interactive, themeable, print-ready tool.

## Architecture Decision

**"B-lite" — Claude extracts, VetHub renders**

- **Claude.ai** remains the extraction engine: Lauren pastes chart PDFs/text into Claude, which extracts structured patient data with clinical accuracy (catching gaps, flagging missing labs, etc.)
- **VetHub** is the renderer + decorator: receives JSON, renders the spec v4 6-column table, provides theme picker, sticker system, inline editing, and print output
- **Handoff format:** JSON array matching the spec v4 schema (§13). Zero ambiguity, exact field match.
- **No database persistence.** Ephemeral: paste → render → theme → print → done. Matches current workflow.

## Data Flow

```
Claude.ai Project                    VetHub /rounds-sheet
─────────────────                    ────────────────────
Lauren pastes charts    →  Claude extracts  →  JSON array
                                                  │
                                           Lauren pastes JSON
                                                  │
                                           Renderer builds table
                                                  │
                                           Theme/sticker/edit
                                                  │
                                           Print landscape
```

## Input Format

JSON array of patient objects per spec v4 §13:

```typescript
interface RoundsPatient {
  time: string;           // "9:00 AM"
  name: string;           // "Piper"
  owner: string;          // "Martire"
  species: string;        // "K9 (French Bulldog)"
  acct?: string;          // "5895552"
  dx: string;             // Primary diagnosis
  surgery: string;        // Procedure OR "Medical Management" etc.
  imaging: string;        // Findings or "None."
  imagingLink?: string;   // PACS URL
  lastVisit: string;      // "2/9: [summary]"
  meds: string;           // Comma-separated
  needsToday: string;     // "Line 1 · Line 2"
  lastCBC: string;        // ISO date or ""
  lastChem?: string;      // Cytosar patients only
  lastThyroid?: string;
  lastPhenoDate?: string;
  lastPhenoVal?: string;
  lastKBrDate?: string;
  lastKBrVal?: string;
  bromideOnly?: boolean;
  onKBr?: boolean;
  isCytosar?: boolean;
  resultsBox?: Array<{label: string; val: string; flag?: string; isPending?: boolean}>;
  isYellow?: boolean;     // New consult
  isBlank?: boolean;      // Open slot
  isStub?: boolean;       // Chart pending
}
```

## Page Layout

### Three layers:

1. **The Sheet** — Full-width, landscape-oriented rounds table. All spec v4 rendering rules. This is what prints.

2. **Toolbar** — Slim top bar (screen only):
   - Title + date
   - Action buttons: Import JSON, Print, Export
   - Mode toggle icons: Theme, Stickers, Edit, Settings

3. **Drawers** — Right slide-out panels (screen only). One at a time. Spacious, beautiful, not cramped:
   - **Theme Drawer** — Big visual preset cards + customization sections
   - **Sticker Drawer** — Category picker + emoji palette + scatter
   - **Edit Drawer** — Inline editing toggle
   - **Settings Drawer** — Opacity, overlay, gradient fine-tuning

## Clinical Rendering (per spec v4)

All logic from RBVH-appointments-spec-v4.md implemented in React:

- 6-column table: Time | Patient | Case Profile | Imaging | Meds & Labs | Today's Plan
- Visit type classification → left stripe + badge colors
- Lab overdue logic (CBC 365d, drug levels 180d)
- bromideOnly suppression
- Cytosar split mode (CBC/Chem separate rows)
- Med change arrows (⬆/⬇)
- Visit date extraction from lastVisit
- Multi-date imaging splitting
- Stub patients at 55% opacity
- Clickable imaging links
- Results box rendering
- MRI redundancy stripping

## Theme System

- 12+ preset themes (from current HTML: Mermaid Cove, Lavender Witch, etc.)
- Custom color pickers: header, lab box, consult row, even/odd row gradients
- Background image upload (base64)
- Background gradient (2 colors, angle, opacity)
- Row opacity control
- Save/load custom themes (localStorage)
- CSS custom properties for live switching

## Sticker System

- 8 emoji categories (Ocean, Floral, Animals, Sparkle, Hearts, Medical, Cottage, Tropical)
- Click-to-place, drag-to-move, scroll-to-resize, right-click-to-delete
- Scatter button (flood page with random stickers from category)
- Opacity, rotation, size controls
- Undo/clear all
- Ctrl+Z support

## Typography

- Playfair Display 700/900 — patient names
- Montserrat 400-900 — everything else
- All sizes per spec v4 §3

## Print

- `@page { size: landscape; margin: 0.3cm; }`
- `print-color-adjust: exact` on all elements
- Toolbar, drawers, sticker controls hidden on print
- Stickers print with the sheet
- Background layers print (position: absolute in print)

## Tech Stack

- Next.js page at `/rounds-sheet`
- React components (no vanilla HTML)
- Tailwind + inline styles for spec-precise sizing
- Google Fonts (Playfair Display, Montserrat)
- No database, no API routes needed
- All state in React (useState/useReducer)
- localStorage for saved themes only

## File Structure

```
src/app/rounds-sheet/
  page.tsx                    — Page component
src/components/rounds-sheet/
  RoundsSheet.tsx             — Main orchestrator
  RoundsTable.tsx             — 6-column table renderer
  RoundsRow.tsx               — Individual patient row
  RoundsHeader.tsx            — Header with title, legend
  Toolbar.tsx                 — Top action bar
  ThemeDrawer.tsx             — Theme picker + customization
  StickerDrawer.tsx           — Sticker palette + controls
  EditDrawer.tsx              — Inline editing toggle
  SettingsDrawer.tsx          — Fine-tuning controls
  ImportModal.tsx             — JSON paste modal
  StickerLayer.tsx            — Draggable sticker overlay
  BackgroundLayer.tsx         — BG image/gradient/overlay
  types.ts                    — TypeScript interfaces
  themes.ts                   — Theme presets
  stickers.ts                 — Emoji categories
  clinical-logic.ts           — Lab status, overdue, visit type
  icons.tsx                   — Inline SVG icons (brain, scissors, magnet, pill)
```

## Implementation Priority

1. Clinical renderer (table + all logic) — this is the hard part
2. JSON import modal
3. Theme presets + live switching
4. Background system (image, gradient, overlay)
5. Sticker system
6. Inline editing
7. Print CSS
8. Custom theme builder + save/load
