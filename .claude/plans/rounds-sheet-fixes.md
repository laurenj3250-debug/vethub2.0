# Rounds Sheet A+ Fix Plan

## Fix 1: XSS via dangerouslySetInnerHTML (SECURITY — Critical)
**File:** `renderer.ts`
**Problem:** Patient data (name, owner, species, dx, meds, imaging, etc.) is interpolated directly into HTML strings via template literals. If pasted JSON contains `<script>` or event handlers in any field, they render as live HTML.
**Fix:** Create an `escapeHtml()` utility in `clinical-logic.ts` that escapes `&`, `<`, `>`, `"`, `'`. Apply it to every patient field interpolation in `renderer.ts` — every `${p.name}`, `${p.owner}`, `${p.species}`, `${p.dx}`, `${p.meds}`, `${p.surgery}`, `${p.imaging}`, `${p.lastVisit}`, `${p.needsToday}`, `${p.time}`, `${r.label}`, `${r.val}`, `${r.flag}`.
**Audit:** Grep for all `${p.` and `${r.` in renderer.ts to confirm zero unescaped interpolations.

## Fix 2: Cmd+Z hijacks native undo in text fields (Bug — High)
**File:** `RoundsSheet.tsx` lines 174-185
**Problem:** The keydown listener calls `e.preventDefault()` on Cmd+Z unconditionally. Users cannot undo text in the cell editor, paste area, title input, or any other input.
**Fix:** Check `document.activeElement` — if it's an `INPUT`, `TEXTAREA`, or `contentEditable` element, return early without preventing default. Only call `undoStickers()` when no text field is focused.

## Fix 3: Duplicate emoji keys in sticker categories (Bug — Medium)
**File:** `stickers.ts`
**Problem:** Multiple categories have duplicate emojis (Dogs has 🐶 3x, 🐕 2x, etc.). React uses the emoji as the key prop, producing duplicate keys → rendering bugs and React warnings.
**Fix:** Deduplicate every category array. Use `[...new Set(arr)]` pattern. Replace duplicates with related but unique emojis where possible to maintain 20 per category.

## Fix 4: Sticker dock tabs overflow on mobile (Bug — Medium)
**File:** `rounds-sheet.css` lines 624-626
**Problem:** 20 category tabs at ~30px each = 600px minimum. On phones (375px), half are invisible with no scroll.
**Fix:** Add `overflow-x: auto` and `flex-wrap: nowrap` to `.sticker-tabs`. Add `-webkit-overflow-scrolling: touch` for iOS. Add `scrollbar-width: none` for clean appearance. At 480px breakpoint, reduce tab font-size to 12px and padding.

## Fix 5: Stale closure in Cmd+Z listener (Bug — Low)
**File:** `RoundsSheet.tsx` line 185
**Problem:** The `useEffect` dependency array is `[mounted]`, but the handler calls `undoStickers` which is defined inline. The `undoStickers` function itself accesses `stickerLayerRef` and `lastScatterCount` (both refs, stable) so this actually works correctly. However, the effect never re-registers if `undoStickers` identity changes. Since `undoStickers` is not in the dep array and reads from refs, this is technically fine but fragile.
**Fix:** Wrap `undoStickers` in `useCallback` (it already only reads refs) and add it to the dependency array for correctness.

## Fix 6: Session load settings inconsistent null checks (Bug — Medium)
**File:** `RoundsSheet.tsx` lines 131-151
**Problem:** Truthy checks on some settings (`if (s.customTitle)`) skip falsy values like empty string. `!== undefined` checks on others. Inconsistent.
**Fix:** Normalize all setting checks to use `s.prop !== undefined` pattern. This correctly handles empty strings, `0`, and `false` while only skipping truly absent properties.

## Fix 7: setTimeout(0) hack for theme application on load (Code Quality)
**File:** `RoundsSheet.tsx` line 149
**Problem:** `setTimeout(() => applyTheme(s.activeTheme, s.rowOpacity), 0)` to work around stale closures when loading a session.
**Fix:** Remove the setTimeout. Instead, after `setActiveTheme(s.activeTheme)`, also set `setRowOpacity(s.rowOpacity)`. The existing `useEffect` at line 234 already watches `[mounted, activeTheme, applyTheme]` and will re-apply the theme. If opacity needs to be passed, update `applyTheme` to read from a ref instead of state, or add `rowOpacity` to the effect's dependency array.

## Fix 8: clearStickers doesn't call cleanup before innerHTML (Bug — Low)
**File:** `RoundsSheet.tsx` line 460
**Problem:** `clearStickers` already calls `cleanupStickerEl` on each `.sticker` before `innerHTML = ''`, so this is actually handled. However, `.sticker-toolbar` elements in the layer don't get cleanup. And the toolbar may have added document-level click listeners for deselect.
**Fix:** Before clearing, also remove any document-level deselect listeners by selecting and cleaning up toolbar-related state. Query `.sticker-toolbar` elements and remove them explicitly. Then clear the layer.

## Fix 9: Print — position:fixed backgrounds (Bug — Medium)
**File:** `rounds-sheet.css` lines 822-827
**Problem:** `position: fixed` elements don't reliably print across browsers. Chrome clips them to first page. Some browsers ignore them entirely.
**Fix:** In the `@media print` block, change `.bg-layer`, `.bg-gradient`, `.bg-overlay` to `position: absolute` and add `width: 100%; height: 100%;` with the parent `.content-wrap` set to `position: relative; overflow: visible`. Also add `min-height: 100vh` to ensure backgrounds cover the full print area.

## Fix 10: selectedEmojis Set causing unnecessary effect re-runs (Performance)
**File:** `RoundsSheet.tsx` line 416
**Problem:** `selectedEmojis` is a `Set` in the useEffect dependency array. Every toggle creates a new Set instance, causing the click-to-place effect to teardown and re-register on every emoji selection change.
**Fix:** This is actually correct behavior — when selected emojis change, the click handler needs the updated list. The current implementation works because the cleanup runs synchronously before the new effect. No change needed, but add a comment explaining why this is safe.

## Fix 11: PanelLabel component is unused (Dead code)
**File:** `RoundsSheet.tsx` line 1016-1018
**Problem:** `PanelLabel` is defined but never used in the JSX.
**Fix:** Remove the unused component.

## Fix 12: Sticker cross-category selection UX (UX — Low)
**File:** `RoundsSheet.tsx` lines 957-977
**Problem:** Selected emojis from one category aren't visible when viewing another category. User can't see their full selection.
**Fix:** Add a small indicator showing total selected count in the sticker dock header area. Already partially addressed by the "Clear (N)" button at line 973-977, which shows the count. This is acceptable UX — no change needed.

## Fix 13: `bi` unused variable in renderer (Lint)
**File:** `renderer.ts` line 113
**Problem:** `blocks.forEach((block, bi) => {` — `bi` is declared but never used.
**Fix:** Remove the `bi` parameter.

---

## Execution Order
1. Fix 1 (XSS) — highest priority, security vulnerability
2. Fix 2 (Cmd+Z) — user-facing bug that blocks text editing
3. Fix 3 (Duplicate keys) — React warnings + potential rendering bugs
4. Fix 4 (Mobile overflow) — broken UX on phones
5. Fix 6 (Session load) — data loss on settings with falsy values
6. Fix 7 (setTimeout hack) — cleaner architecture
7. Fix 5 (undoStickers dep) — correctness
8. Fix 8 (clearStickers) — listener leak edge case
9. Fix 9 (Print backgrounds) — cross-browser print fix
10. Fix 11 (Dead code) — cleanup
11. Fix 13 (Lint) — cleanup

## Post-Fix Audit
After all fixes, verify:
- [ ] `npm run build` passes with no errors
- [ ] Grep renderer.ts for any remaining unescaped `${p.` or `${r.` interpolations
- [ ] Grep for duplicate emoji entries in stickers.ts
- [ ] Verify Cmd+Z doesn't interfere with text inputs (manual check of the logic)
- [ ] Verify session load handles empty string settings correctly
- [ ] No unused variables or dead code remain
- [ ] Print styles use absolute positioning
- [ ] Sticker tabs have overflow-x: auto on mobile
