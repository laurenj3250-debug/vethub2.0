# Red Bank Neurology: Daily Rounds Sheet — Spec v4

**This is the canonical spec.** Supersedes v1, v2, and v3 entirely. Build all future sheets from this document alone.

---

## 1. Naming & Identity

- **Page `<title>`:** `Neurology Rounds – [Date]`
- **Header H1:** `Neurology Rounds`
- **Header subtitle:** `Red Bank • [Day of Week], [Full Date]`
- **Mascot:** Theme-specific SVG or base64 image, positioned left of title, height ~85–100px, with `drop-shadow(2px 3px 4px rgba(0,0,0,0.12))`

---

## 2. Theming System

The rounds sheet separates **structure** (columns, data logic, rendering rules) from **theme** (colors, decorative elements, mascot). Lauren picks a daily theme; Claude implements it.

### 2.1 Theme Definition

Each theme provides:

| Token | Purpose |
|-------|---------|
| `page-bg` | Page background base color |
| `header-bg` | Header bar / table header |
| `primary` | All clinical text — Dx, patient names, lab labels |
| `secondary` | Owner names, section labels, visit dates |
| `accent` | Species, acct#, muted placeholders |
| `row-even` | Even row background |
| `row-odd` | Odd row background |
| `consult-row` | New consult row highlight |
| `lab-box` | Lab status box fill |
| `overdue` | Overdue labs, missing MRI alerts |
| `results-border` | Left border on results returned box |
| `needs-bg` | 4–5% warm wash on Today's Plan column |
| `imaging-text` | Imaging findings text color (must contrast with primary) |

### 2.2 Visit Type Colors (constant across themes)

| Type | Left Stripe | Badge BG | Badge Border | Label Color |
|------|-------------|----------|--------------|-------------|
| Med Mgmt | `#7B8FA1` slate blue | `rgba(90,120,150,0.07)` | `rgba(90,120,150,0.2)` | `#4A6178` |
| Post-Op | `#8FAD82` sage green | `rgba(107,127,94,0.10)` | `rgba(107,127,94,0.3)` | `#5E6B52` |
| New Consult | `#D4AA28` amber | `rgba(212,170,40,0.09)` | `rgba(212,170,40,0.3)` | `#8B6914` |

### 2.3 Decorative Elements

Each theme includes:
- **Background tile pattern** (SVG or base64) applied to `body` with a `linear-gradient` overlay. Tile size ~130–200px. Overlay opacity tuned per theme — aim for blossoms/motifs to be visible through both the background AND the semi-transparent table rows.
- **Mascot** — themed SVG in the header
- **Viewport-edge decorations** — `position: fixed`, `pointer-events: none`, scattered at edges. Generous opacity (0.20–0.32). Screen only (`no-print`).
- **Falling/scattered elements** — full-viewport SVG with themed motifs at 0.20–0.25 opacity
- **Footer scene** — bottom-edge decoration (waves, ground, etc.)

### 2.4 Transparency Rules

The table and rows must be semi-transparent so decorative elements show through:
- Table background: ~65% opacity
- Row backgrounds: ~62% opacity
- Header row: ~75% opacity
- Lab box: ~65% opacity

This creates a layered effect where the theme breathes through the clinical content. Text remains fully readable because font weights are heavy.

---

## 3. Typography

- **Patient names:** Playfair Display, 900 weight, 21px — serif stationery feel
- **All other clinical content:** Montserrat, sans-serif
- **Minimum font size:** 10px — nothing below this anywhere in the sheet
- **Table headers:** 11px, 800 weight, uppercase, 0.2em letter-spacing
- **Dx label:** 13px, 900 weight, uppercase
- **Visit date header:** 11px, 900 weight, uppercase, secondary color
- **History text:** 11.5px, 500 weight, 1.55 line-height
- **Imaging text:** 12.5px, 700 weight, distinct color from primary (e.g. navy `#2A4664`)
- **Imaging date labels:** 10px, 900 weight, uppercase, teal-blue
- **Med items:** 11px, 600 weight
- **Lab rows:** 10.5px (label 900 weight uppercase, value 700 weight)
- **Badge line 1:** 12.5px, 900 weight, uppercase
- **Badge line 2:** 11.5px, 600 weight, standard case
- **Owner name:** 11px, 800 weight, uppercase
- **Species:** 10px, 700 weight, uppercase
- **Account #:** 10px, 600 weight
- **Surgery detail:** 11px, 700 weight, italic, post-op color

---

## 4. Layout & Table Structure

- **Orientation:** Landscape print (`@page { size: landscape; margin: 0.3cm; }`)
- **Implementation:** Vanilla HTML + JS, no React, no build step. Google Fonts + inline SVG icons only.
- **6 columns:**

| Column | Width | Content |
|--------|-------|---------|
| **Time** | ~72px fixed | Checkbox (screen only) + time pill + **left color stripe** |
| **Patient** | ~110px fixed | Name + overdue dot + owner + species + acct# |
| **Case Profile** | flex (shared) | Dx → surgery (if surgical) → separator → visit date header → last visit summary |
| **Imaging** | flex (shared) | Magnet icon (clickable if link exists) + imaging findings (split by date if multiple) + results box (if any) |
| **Meds & Labs** | ~250px fixed | Meds stacked vertically + lab status box |
| **Today's Plan** | ~160px fixed | Visit type badge (2 lines) |

- Case Profile and Imaging share the remaining flex space equally
- **Semi-transparent rows:** even/odd/consult rows at ~62–65% opacity
- **Open slots:** time shown muted, `— Open Slot —` centered italic, `colspan="5"`
- **`page-break-inside: avoid`** on all patient rows
- **Cell padding:** 6px 8px (tight for density)

---

## 5. Header

```
[Mascot] [H1: Neurology Rounds]        [Legend] [Print button]
         [Subtitle: Red Bank • Date]
```

### Legend (screen only, `no-print`)
Right side of header, left of print button. Four items:

| Symbol | Color | Label |
|--------|-------|-------|
| 16×5px rounded bar | `#7B8FA1` | Med Mgmt |
| 16×5px rounded bar | `#8FAD82` | Post-Op |
| 16×5px rounded bar | `#D4AA28` | New Consult |
| 9×9px circle | overdue color | Overdue Labs |

Font: 10px, 700 weight, primary text color. Gap: 16px between items.

### Print Button
- Background: header-bg color, border-radius 9999px, 12px 700 weight
- Hidden on print (`.no-print`)

---

## 6. Time Cell

- **Left color stripe:** `border-left: 5px solid [visit type color]` — the single most important scannable element
- **Checkbox** (`no-print`): sits above the time pill; checking it fades entire row to 25% opacity with 0.2s ease transition. Accent color matches theme.
- **Time pill:** rounded box, shows time number (e.g. `9:00`) on one line, AM/PM on second line (10px, 700 weight, secondary color)

---

## 7. Patient Cell

```
[Patient Name]          [● overdue dot if applicable]
OWNER NAME
SPECIES
#ACCT
```

- **Overdue dot:** 9×9px coral-red `#D4644A` circle, 1px white border, glow `box-shadow: 0 0 0 2px rgba(212,100,74,0.25)`, `title="Overdue labs"` tooltip
- Name and dot in a flex row, space-between

### Overdue Lab Trigger Logic
```javascript
function hasOverdueLabs(p) {
  const dxLower = (p.dx || '').toLowerCase();
  const isSeizure = dxLower.includes('seizure') || dxLower.includes('epilepsy');
  if (!p.lastCBC && isSeizure) return true;
  if (p.lastCBC && daysSince(p.lastCBC) >= 365) return true;
  if (p.lastPhenoDate && daysSince(p.lastPhenoDate) >= 180) return true;
  if (p.lastKBrDate && daysSince(p.lastKBrDate) >= 180) return true;
  return false;
}
```

---

## 8. Case Profile Cell

**Structure (top to bottom):**

1. **Brain icon + Dx label** — 13px, 900 weight, uppercase
2. **Scissors icon + surgery detail** (only if surgical, indented 19px) — 11px, 700 weight, italic, post-op color
3. **Separator line** — 1px hairline, themed
4. **Visit date header** — extracted from lastVisit text, rendered as bold uppercase label: `LAST VISIT: 2/9` or `LAST VISIT: rDVM REFERRAL`
5. **Visit summary text** — remaining text after date extraction, with left border accent

### Visit Date Extraction Logic
```javascript
const vdMatch = visitText.match(/^(\d{1,2}\/\d{1,2}(?:\/\d{2,4})?|rDVM[^:]*):?\s*/);
if (vdMatch) {
  // Render vdMatch[1] as bold date header
  // Render remainder as history text
}
```

### Surgery vs. Medical Management
```javascript
function isSurgical(surgery) {
  return surgery && !["Medical Management", "Medical Management Trial",
    "Initial Consultation", "Initial Evaluation"].includes(surgery);
}
```
Surgical cases show the scissors icon + date + procedure. Non-surgical cases show nothing (absence is the signal).

> **Important:** Historical surgeries (e.g. ventral slot from years ago) where the patient is now on medical management for a NEW issue should be classified as **Medical Management** for visit type purposes. Put the surgical history in the Dx field (e.g. "Cervical IVDD (Hx Ventral Slot 3/2022)") — not in the `surgery` field.

---

## 9. Imaging Cell

**Structure:**

1. **Magnet icon** — clickable `<a>` tag if `imagingLink` exists, plain icon otherwise. Linked icons get a blue tint and hover highlight.
2. **Imaging findings** — 12.5px, 700 weight, distinct color (navy/blue family)
3. **Multi-date splitting** (when applicable)
4. **Results box** (conditional)

### Multi-Date Imaging Logic

When imaging text contains multiple studies, split on ` Prior:`, ` Hx:`, or secondary date patterns (`. XX/XX:` after a period). Each block renders with:
- **Date label header** — 10px, 900 weight, uppercase, blue
- **Findings text** below
- **Hairline divider** between blocks

Single-date entries render as plain text, no splitting.

### Clickable Imaging Links

When `imagingLink` is set, the magnet icon becomes an `<a href>` opening in a new tab. Styling:
```css
.img-link { display: inline-flex; padding: 2px; border-radius: 4px; }
.img-link:hover { background: rgba(theme-accent, 0.3); }
.img-link svg { stroke: #4A6178; }
```

### Results Box
Shown when a patient has `resultsBox` data (returned diagnostic results).

- Background: `rgba(primary, 0.04)`
- Left border: 3px solid results-border color
- Border-radius: 4px, padding: 5px 7px, margin-top: 5px
- Header: `RESULTS RETURNED` — 10px 900wt uppercase
- Each line: label (65px min-width, 700wt, secondary) + value (600wt) + flag if abnormal (900wt, overdue color)
- Pending results: italic, amber color

### No Imaging
Display `NO MRI ON FILE` in overdue color, 900 weight.

### MRI Redundancy Rule
Never write "MRI" in the imaging text — the magnet icon is the label. Strip any `MRI:` prefix.

---

## 10. Meds & Labs Cell

### Medications

- Section label: `MEDICATIONS` — 10px, 900 weight uppercase, with pill icon
- Each medication on its own line — 11px, 600 weight
- Hairline divider between items
- **Never comma-separated in display.** Data is comma-separated; renderer splits into stacked lines.

### Medication Change Visibility

When anticonvulsants (phenobarbital, potassium bromide, pregabalin, gabapentin, zonisamide), steroids (prednisone, prednisolone, dexamethasone), or other key drugs are changed, the change must be **explicitly visible** in BOTH the history summary AND the medication line:

- **Increases:** `⬆ INC` in the med line, `⬆ DRUG INC TO [dose]` in history
- **Decreases:** `⬇ DEC` in the med line, `⬇ DRUG DEC TO [dose]` in history
- **Restarts:** `⬆ RESTARTED` in history
- **Discontinuations:** Document in history

The arrows (⬆/⬇) are Unicode characters that catch a scanning eye immediately.

### Lab Status Box

Background: lab-box color at ~65% opacity. Border-radius 5px, padding 6px 8px, margin-top 7px.

#### Standard Mode (most patients)
Single combined row:
- Label: `CBC/CHEM:` 10.5px 900wt uppercase
- Value: ISO date + bullet + status message

#### Cytosar Split Mode (when `lastChem` field exists)
Separate rows for CBC and Chem:
- `CBC:` row — shows lastCBC date + status (this is the frequent Cytosar pre-treatment draw)
- `CHEM:` row — shows lastChem date + status (the less frequent full chemistry)
- `CYTOSAR: CBC REQUIRED TODAY` — red warning row

This distinction matters because Cytosar patients get CBC-only draws monthly but full chem panels less often. A neurologist needs to see both dates.

#### Phenobarbital Row — shown when:
- Patient has `lastPhenoDate`, OR
- Dx contains "seizure" / "epilepsy" AND `bromideOnly` is NOT true

If no pheno on file for a seizure patient: `NOT ON FILE` muted.

> **Critical Rule:** Patients on bromide only (no phenobarbital) must have `bromideOnly: true`. Do NOT show a Pheno row for these patients. The absence of the row IS the signal. Never show "Pheno: NOT ON FILE" for a bromide-only patient.

#### Bromide Row — shown when:
- `lastKBrDate` is set, OR
- `onKBr: true` (recently started, no level yet) → shows `NOT ON FILE`

### Lab Alert Color Thresholds

| Condition | Color | Token |
|-----------|-------|-------|
| CBC > 365 days | overdue color | `lab-due` |
| Drug level > 180 days | `#B07030` amber | `lab-warn` |
| Current (within limit) | `#5A7D52` forest green | `lab-current` |
| No date on file | accent color | `lab-none` |

---

## 11. Today's Plan Cell (Visit Badge)

**Structure:**
```
┌─────────────────────────────────────────────────┐
│ 1WK RECHECK                   ← line 1, bold    │
│ Neuro Exam + Treatment Response ← line 2        │
└─────────────────────────────────────────────────┘
```

- Badge fills full column width
- Background + border from visit type color (see §2.2)
- Border-radius: 4px, padding: 4px 7px

**`needsToday` string format:** Use ` · ` (space-middot-space) as the delimiter.

```
"1wk Recheck · Neuro Exam + Treatment Response"
"4wk Recheck + Cytosar · CBC Required Before Treatment"
"Initial Consult · RHL Lameness/Pain Eval — MRI?"
"Recheck · VPS Follow-Up"
```

**Line 1** (everything before first ` · `): 12.5px, 900 weight, uppercase, visit type color
**Line 2** (everything after first ` · `): 11.5px, 600 weight, primary text color

---

## 12. Visit Type Classification

```javascript
function getVisitType(p) {
  if (isSurgical(p.surgery)) return 'postop';
  if (p.surgery === 'Initial Consultation' || p.surgery === 'Initial Evaluation') return 'consult';
  return 'medmgmt';
}
```

Drives: left stripe color, badge background/border/text color.

---

## 13. Data Schema

```javascript
{
  time:          string,    // "9:00 AM"
  name:          string,    // "Willow"
  owner:         string,    // "Johnson"
  species:       string,    // "K9 (Lab)", "Fel (DLH)"
  acct:          string?,   // "5908032"
  dx:            string,    // Primary diagnosis. Include historical surgical Hx here if relevant.
  surgery:       string,    // Current procedure OR "Medical Management" / "Initial Consultation" etc.
  imaging:       string,    // Findings with date, or "None." Use "Prior:" and "Hx:" prefixes for older studies.
  imagingLink:   string?,   // URL to PACS/VetRocket viewer. Makes magnet icon clickable.
  lastVisit:     string,    // "2/9: [summary]" — date prefix is auto-extracted as header
  meds:          string,    // Comma-separated — renderer splits into stacked lines. Use ⬆/⬇ for changes.
  needsToday:    string,    // "Line 1 · Line 2" format
  lastCBC:       string,    // ISO date ("2026-02-12") or empty string
  lastChem:      string?,   // ISO date — only set for Cytosar patients to split CBC/Chem display
  lastThyroid:   string?,   // ISO date (optional)
  lastPhenoDate: string?,   // ISO date (optional)
  lastPhenoVal:  string?,   // e.g. "15.1"
  lastKBrDate:   string?,   // ISO date (optional)
  lastKBrVal:    string?,   // e.g. "0.7"
  bromideOnly:   boolean?,  // true = on bromide but NOT phenobarbital; suppresses Pheno row entirely
  onKBr:         boolean?,  // true = recently started KBr, no level yet; shows "NOT ON FILE"
  isCytosar:     boolean?,  // flag for Cytosar patients (CBC required day-of)
  resultsBox:    array?,    // Array of { label, val, flag?, isPending? } for returned diagnostics
  isYellow:      boolean?,  // New consult row (amber highlight)
  isBlank:       boolean?,  // Open time slot
  isStub:        boolean?,  // Chart not yet received — renders at 55% opacity
}
```

### Stub Patients (chart not yet available)
```javascript
{
  time: "10:20 AM", name: "Nathan", owner: "Fernandes", species: "K9", acct: "5904491",
  isStub: true, surgery: "Medical Management",
  needsToday: "Med Mgmt Recheck"
}
```
Stubs render at 55% opacity with "Chart Pending" in the Case Profile cell and `---` in labs.

> **Never use placeholder text like "per chart", "details per chart", "on file", or "immunosuppressive protocol per chart".** If the full chart data is not available, render as a stub. Fake confidence is worse than an honest stub.

---

## 14. Print CSS

```css
@media print {
  @page { size: landscape; margin: 0.3cm; }
  * {
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }
  .no-print { display: none !important; }
}
```

The `*` selector with `!important` is required — without it, browsers strip row backgrounds, stripes, and lab box colors.

---

## 15. Inline SVG Icons

All icons are inline SVG strings (no external library). Stroke color matches the theme:

| Icon | Usage | Stroke |
|------|-------|--------|
| Brain | Dx label | primary color |
| Scissors | Surgery detail | post-op stripe color |
| Magnet | Imaging (clickable if linked) | secondary color |
| Pill | Medications label | secondary color |

Size: 13×13px for all icons. `flex-shrink: 0` to prevent compression.

---

## 16. Special Rules & Edge Cases

- **`bromideOnly: true`** — patient is on KBr but NOT phenobarbital. Do NOT render a Pheno row, even if Dx includes "epilepsy". Suppresses the "NOT ON FILE" pheno line entirely. The absence of the row is the signal.
- **`onKBr: true`** — patient recently started KBr with no level drawn yet. Show `Bromide: NOT ON FILE` in the lab box.
- **`isCytosar: true`** — adds red "CYTOSAR: CBC REQUIRED TODAY" row in the lab box. If `lastChem` is also set, CBC and Chem display as separate rows.
- **`imagingLink`** — makes the magnet icon a clickable link to the PACS viewer. Opens in new tab.
- **`resultsBox`** — structured diagnostic results display. Use when previously-pending diagnostics have returned.
- **Historical surgeries** — if a patient had surgery years ago but is presenting today for medical management of a new issue, set `surgery: "Medical Management"` and put the surgical history in the Dx field (e.g. "Cervical IVDD (Hx Ventral Slot 3/2022)"). This ensures correct visit-type classification.
- **Med change arrows** — use `⬆` for increases/restarts and `⬇` for decreases/tapers in both the meds string and the lastVisit string. These must be visually obvious at scanning speed.
- **Multi-date imaging** — when imaging text contains ` Prior:`, ` Hx:`, or secondary dates after periods, the renderer splits into separate visual blocks with date headers.
- **Visit date extraction** — the renderer auto-extracts a leading date or "rDVM" prefix from lastVisit and displays it as a bold header above the summary text.
- **MRI redundancy rule:** Never write "MRI" in the imaging text — the magnet icon is the label. Strip any `MRI:` prefix from data before rendering.
- **Dash convention:** Use `"—"` (em dash) for genuinely unknown data.

---

## 17. Daily Workflow

1. **Extract schedule** from RBVH scheduling system screenshots (see `RBVH-Schedule-Extraction.md`)
2. **Create stub entries** for all appointments: `time`, `name`, `owner`, `species`, `acct`, `surgery` (for visit type), `needsToday`
3. **Update the date** in the header subtitle AND in the `TODAY` constant used by `labStatus()` and `hasOverdueLabs()`
4. **Pick a daily theme** — Lauren chooses, Claude implements
5. **Populate clinical data** from chart documents as they become available, replacing stubs. **Never** use placeholder text like "per chart" — if the data isn't available, keep it as a stub.
6. **Add `imagingLink`** URLs as Lauren provides them
7. **Add `resultsBox`** for any patients whose pending diagnostics have returned
8. **Mark med changes** with ⬆/⬇ arrows in both meds and lastVisit strings
9. **Review for clinical accuracy** before finalizing:
   - Is the visit type correct? (Historical surgery ≠ current post-op)
   - Are all meds listed individually, not as "per chart"?
   - Are lab dates correct? (Cytosar patients: most recent CBC, not oldest)
   - Do seizure patients have the right Pheno/Bromide rows? (bromideOnly check)
   - Are med changes visible at scanning speed?
10. **Open in browser** → reference on-screen or print landscape

---

## 18. Past Themes

| Date | Theme |
|------|-------|
| — | Toucan Tropical |
| — | Frog Cottagecore |
| — | Mushroom Cottagecore |
| — | Polka Dot Lavender |
| — | Eras Tour |
| — | Cat Pattern |
| 2026-03-12 | Cherry Blossom / Sakura |
