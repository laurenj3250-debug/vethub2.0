# Red Bank Neurology: Daily Rounds Cheat Sheet

## Project Purpose

Generate a print-ready, landscape-oriented HTML cheat sheet for each day's neurology appointments at Red Bank Veterinary Hospital. The sheet is designed for rapid clinical reference during rounds — not a medical record, but a at-a-glance prep tool with case profiles, lab status, and today's needs per patient.

---

## 1. Visual Aesthetic ("Wedding Budget" Palette)

### Colors

| Token | Hex | Usage |
|---|---|---|
| Page Background | `#FAF9F6` | Bone / off-white base |
| Header Bar | `#DCC6C6` | Dusty rose — table header, print button |
| Primary Text | `#5D534A` | Warm espresso — diagnoses, patient names, labels |
| Secondary Text | `#8D7F71` | Taupe — owner names, species, med mgmt labels |
| Accent / Alert | `#C49A86` | Terracotta — overdue labs, missing MRI alerts |
| Row Even | `#FFFFFF` | White |
| Row Odd | `#F5F0F0` | Pale blush |
| Lab Box Fill | `#EFEBE9` | Light mocha — maintenance/lab section background |
| Surgical Text | `#A5A58D` | Sage — surgery details |
| Today's Needs BG | `rgba(212, 163, 115, 0.05)` | 5% warm wash behind the needs column |
| New Consult Row | `#FDF9F0` | Warm cream highlight for initial consults |

### Typography

- **Patient Names:** Playfair Display, 900 weight, ~20–24pt. Serif stationery feel.
- **Medical Data:** Montserrat, 500–700 weight. Clean sans-serif for clinical clarity.
- **Today's Needs:** Montserrat 600, standard case (no italics, no all-caps). Maximum legibility.
- **Owner / Species:** Montserrat 700–800, uppercase, 8–9px. Subdued taupe/rose.
- **Lab Labels:** Montserrat 900, uppercase, 8.5px.

---

## 2. Table Structure

### Columns (Left → Right)

| Column | Width | Content |
|---|---|---|
| **Time** | ~80px | Appointment time in a rounded pill badge (`DCC6C6/20` bg) |
| **Patient** | ~128px | Name (serif), owner (uppercase taupe), species (uppercase rose) |
| **Case Profile** | flex | Dx + surgery/mgmt status + imaging findings |
| **History** | flex | Last visit summary with left border accent |
| **Maintenance** | ~256px | Current meds + lab status box |
| **Today's Needs** | ~192px | What's happening this visit |

### Layout Rules

- **Orientation:** Strictly landscape for print (`@page { size: landscape; margin: 0.3cm; }`)
- **Time Slots:** Fixed 10-minute intervals (2:00, 2:10, 2:20…)
- **Zebra Striping:** Alternating white / pale blush rows
- **Open Slots:** Blank rows with time shown, "--- Open Slot ---" centered in muted italic
- **Page Breaks:** `page-break-inside: avoid` on patient rows
- **Print Button:** Hidden on print (`no-print` class)

---

## 3. Case Profile Logic

### Diagnosis (Dx)

- **Icon:** Brain
- **Style:** 12px, 900 weight, uppercase, espresso (`#5D534A`)
- Always the first element in the Case Profile cell

### Surgery vs. Medical Management

**Surgical cases:**
- **Icon:** Scissors
- **Style:** 9px, 700 weight, italic, sage (`#A5A58D`)
- **Required detail:** Specific disc site/level AND side (e.g., "Left L1-L2 Hemilaminectomy")
- Displayed indented below the Dx line

**Medical management:**
- No scissors icon — the absence of it IS the indicator
- Label values like "Medical Management", "Medical Management Trial", "Initial Consultation", "Initial Evaluation" are handled implicitly (no surgery line rendered)
- These are distinguished by lighter weight / secondary color naturally

### Imaging (MRI)

- **Icon:** Magnet (represents MRI — the icon does the labeling)
- **Redundancy Rule:** Never write "MRI" in the text if the magnet icon is present. Strip any leading "MRI:" prefix from the data.
- **Content:** Date + findings only
- **Missing MRI:** Display `NO MRI ON FILE` in terracotta (`#C49A86`), 800 weight
- Separated from Dx by a thin border-top divider (`DCC6C6/30`)

---

## 4. History Column

- Left border accent: 2px solid `rgba(220, 198, 198, 0.4)`
- Padding-left: 12px
- Font: 11px, regular weight
- **No italics** in clinical history — rapid reading during rounds
- Content is the last visit summary (date + key findings + changes)

---

## 5. Maintenance Column

### Medications

- **Icon:** Pill
- **Style:** 9px, 700 weight
- Listed as comma-separated string (not a bulleted list)
- Positioned above the lab box

### Lab Status Box

- **Background:** Light mocha (`#EFEBE9`)
- **Border radius:** 8px
- **Padding:** 10px

#### CBC/Chemistry

- Label: `CBC/CHEM:` — 900 weight, uppercase, 8.5px
- Value: Date + status message (e.g., `2025-08-21 • 6mo ago`)
- **DUE threshold:** > 365 days → show `DUE (Xmo ago)` in terracotta/amber
- **No date on file:** Show `---`

#### Seizure Drug Levels (conditional)

Only render Pheno/KBr rows when:
- Patient has `lastPhenoDate` or `lastKBrDate` data, OR
- Dx contains "seizure" or "epilepsy" (case-insensitive)

**Phenobarbital:**
- Label: `PHENO:`
- Value: Date + level value in parens + status (e.g., `2025-08-09 (29.4) • 6mo — DUE`)
- **DUE threshold:** > 180 days
- If epilepsy patient but no pheno on file: `NOT ON FILE`

**Bromide:**
- Label: `BROMIDE:`
- Same format as pheno
- Only rendered if `lastKBrDate` exists

#### Lab Alert Color Logic

```
if (days >= 365)    → Terracotta (#C49A86)  — hard overdue
if (days >= 180)    → Amber (#A67C69)       — approaching/overdue (for 6mo drugs)
if (days < limit)   → Sage (#7E8C7A)        — current
```

---

## 6. Today's Needs Column

- **Background:** 5% warm wash (`rgba(212, 163, 115, 0.05)`)
- **Font:** 12px, Montserrat 600
- **Color:** Dark espresso (`#4A403A`)
- **No italics, no all-caps** — standard case for maximum speed-reading
- Content examples: "Recheck + Skin Eval + Med Refill", "Initial Consult (20 Min) — MRI?", "Seizure Recheck + Levels (Pheno/Br)"

---

## 7. Special Row States

### New Consult / Initial Evaluation

- Row background override: warm cream (`#FDF9F0`)
- Marked with `isYellow: true` in data

### Open Slot

- Time shown in muted rose
- "--- Open Slot ---" centered, italic, 10px, uppercase, 40% opacity
- No other columns rendered (colspan 5)

---

## 8. Data Schema (Per Patient)

```
{
  time:          string    // "2:00 PM"
  name:          string    // "Leo"
  owner:         string    // "McCarthy"
  species:       string    // "K9", "Fel (DSH)", "K9 (Dach)"
  dx:            string    // Primary diagnosis
  surgery:       string    // Procedure details OR "Medical Management" etc.
  imaging:       string    // MRI/CT findings with date, or "None."
  lastVisit:     string    // Last visit date + summary
  meds:          string    // Comma-separated current medications
  needsToday:    string    // Today's plan
  lastCBC:       string    // ISO date or empty string
  lastThyroid:   string?   // ISO date (optional)
  lastPhenoDate: string?   // ISO date (optional)
  lastPhenoVal:  string?   // Level value (optional)
  lastKBrDate:   string?   // ISO date (optional)
  lastKBrVal:    string?   // Level value (optional)
  isYellow:      boolean?  // New consult highlight (optional)
  isBlank:       boolean?  // Open slot (optional)
}
```

---

## 9. Technical Implementation

- **Self-contained HTML** — React 18 via CDN (no build step)
- **Fonts:** Google Fonts (Playfair Display + Montserrat)
- **Icons:** Inline SVGs (no external icon library dependency)
- **Print CSS:** Landscape, tight margins, `print-color-adjust: exact`
- **No external dependencies** beyond React CDN + Google Fonts

---

## 10. Daily Workflow

1. Update the `patients` array with today's schedule and case data
2. Update the date in the header and in the `getLabAlert` function's `today` constant
3. Open the HTML file in a browser
4. Print or reference on-screen during rounds
