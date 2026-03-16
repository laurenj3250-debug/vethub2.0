# Rounds Sheet Cleanup Plan

## Overview
Three remaining issues from the audit: sticker memory leaks, inline styles, and broken mobile layout.

---

## Step 1: Fix Sticker Event Listener Leaks
**Files:** `src/components/rounds-sheet/RoundsSheet.tsx`
**Lines:** 150-300 (createStickerEl), 295-297 (clearStickers), 282-293 (undoStickers)

**Problem:** Each sticker attaches 3-4 event listeners (click, mousedown, wheel, deselect). When `clearStickers()` runs `innerHTML = ''`, DOM elements are removed but listeners stay in memory. 30 scattered stickers = 30+ orphaned listeners per clear cycle.

**Fix:**
1. Store cleanup functions on each sticker element via a `__cleanup` property
2. In `createStickerEl`: wrap each addEventListener with a tracked reference
3. In `clearStickers`: iterate stickers and call `__cleanup()` before clearing innerHTML
4. In `undoStickers`: call `__cleanup()` on each removed element
5. Also clean up the deselect document-level listener when sticker is deleted via toolbar

**Estimated scope:** ~40 lines changed in RoundsSheet.tsx

---

## Step 2: Extract Inline Styles to CSS Classes
**Files:** `src/components/rounds-sheet/RoundsSheet.tsx`, `src/app/(rounds)/rounds-sheet/rounds-sheet.css`

**Problem:** 45+ inline style blocks scattered through the component. Panel, sticker dock, toolbar buttons, theme picker — all inline. Can't use media queries, hover states, or CSS cascade.

**Fix — extract in this order:**
1. **Sticker toolbar** (created in JS via `document.createElement`): Move `tb.style.cssText` to `.sticker-toolbar` class, button styles to `.sticker-toolbar-btn`
2. **Control panel sections**: Extract panel header, section headers, section content containers to CSS classes
3. **Sticker dock**: Extract category tabs, emoji palette, size toggle, opacity slider container styles
4. **Saved sessions cards** (empty state): Extract to `.saved-session-card` class with proper `:hover` state
5. **Toolbar save button**: Extract to CSS class with disabled state

**What stays inline:** Anything truly dynamic (computed positions, conditional transforms, theme-dependent colors that change at runtime).

**Estimated scope:** ~200 lines moved from TSX to CSS, ~100 new CSS lines

---

## Step 3: Add Mobile Responsive Layout
**Files:** `src/app/(rounds)/rounds-sheet/rounds-sheet.css`, minor changes to `RoundsSheet.tsx`
**Depends on:** Step 2 (need CSS classes to target with media queries)

**Problem:** Panel is 300px fixed-right. On 375px viewport, content gets 59px. Sticker dock pushed off-screen. No `@media` queries exist.

**Fix — add two breakpoints:**

### Tablet (max-width: 768px)
- Panel becomes bottom sheet (full-width, max-height 50vh, slides up from bottom)
- Content padding-right resets to 16px, adds padding-bottom for panel space
- Sticker dock sits above the panel
- Table font sizes reduce slightly
- Header legend wraps
- Toolbar actions wrap to second line if needed

### Phone (max-width: 480px)
- Panel auto-closes on load (start with `panelOpen: false`)
- Table columns compress: hide less-critical columns or allow horizontal scroll
- Title font size reduces
- Toolbar becomes more compact
- Cell editor becomes full-width modal instead of positioned at cell

**TSX changes needed:**
- Panel: Move `width: 300` and `transform` to CSS class, use data attribute for open/closed state
- Content wrap: Move `paddingRight` logic to CSS using `.content-wrap[data-panel-open="true"]`
- Sticker dock: Move `right: panelOpen ? 300 : 0` to CSS

**Estimated scope:** ~80 new CSS lines, ~20 lines changed in TSX

---

## Execution Order

```
Step 1 (Sticker leaks)     — independent, quick win
    ↓
Step 2 (Extract styles)    — independent but enables Step 3
    ↓
Step 3 (Mobile responsive) — depends on Step 2 for CSS classes
```

Each step is a separate commit. Steps 1 and 2 can be parallelized if needed.
