# VetHub 2.0 Style Guide

## Visual Design Standards

### Color System

#### Brand Colors
```
Primary Blue:     #3B82F6
Primary Hover:    #2563EB
Primary Active:   #1D4ED8
```

#### Semantic Colors
```
Success:          #10B981 (Emerald-500)
Success Light:    #D1FAE5 (Emerald-100)
Warning:          #F59E0B (Amber-500)
Warning Light:    #FEF3C7 (Amber-100)
Error:            #EF4444 (Red-500)
Error Light:      #FEE2E2 (Red-100)
Info:             #3B82F6 (Blue-500)
Info Light:       #DBEAFE (Blue-100)
```

#### Neutral Scale
```
Gray 50:          #F9FAFB
Gray 100:         #F3F4F6
Gray 200:         #E5E7EB
Gray 300:         #D1D5DB
Gray 400:         #9CA3AF
Gray 500:         #6B7280
Gray 600:         #4B5563
Gray 700:         #374151
Gray 800:         #1F2937
Gray 900:         #111827
```

#### Patient Status Colors
```
Critical:         #DC2626 (Red-600)
Monitoring:       #F59E0B (Amber-500)
Stable:           #10B981 (Emerald-500)
Discharged:       #6B7280 (Gray-500)
```

### Typography

#### Font Families
```css
Primary: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif
Monospace: 'JetBrains Mono', 'Courier New', monospace (for medical IDs, codes)
```

#### Font Sizes & Weights
```
Heading 1:        32px / 2rem, Font Weight: 700 (Bold)
Heading 2:        24px / 1.5rem, Font Weight: 600 (Semibold)
Heading 3:        20px / 1.25rem, Font Weight: 600 (Semibold)
Heading 4:        18px / 1.125rem, Font Weight: 600 (Semibold)
Body Large:       16px / 1rem, Font Weight: 400 (Regular)
Body Default:     14px / 0.875rem, Font Weight: 400 (Regular)
Body Small:       13px / 0.8125rem, Font Weight: 400 (Regular)
Caption:          12px / 0.75rem, Font Weight: 400 (Regular)
```

#### Line Heights
```
Tight:    1.25 (Headings)
Normal:   1.5 (Body text)
Relaxed:  1.75 (Long-form content)
```

### Spacing Scale
```
xs:   4px / 0.25rem
sm:   8px / 0.5rem
md:   12px / 0.75rem
lg:   16px / 1rem
xl:   24px / 1.5rem
2xl:  32px / 2rem
3xl:  48px / 3rem
4xl:  64px / 4rem
```

### Border Radius
```
sm:   4px / 0.25rem (Small inputs, badges)
md:   6px / 0.375rem (Buttons, inputs)
lg:   8px / 0.5rem (Cards)
xl:   12px / 0.75rem (Modals, large cards)
full: 9999px (Pills, avatars)
```

### Shadows
```css
/* Small - Buttons, inputs */
shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);

/* Medium - Cards */
shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);

/* Large - Modals, dropdowns */
shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);

/* Focus rings */
focus-ring: 0 0 0 3px rgba(59, 130, 246, 0.5);
```

## Component Specifications

### Buttons

#### Primary Button
```
Background: Primary Blue (#3B82F6)
Text: White
Padding: 8px 16px (sm) | 10px 20px (md) | 12px 24px (lg)
Border Radius: 6px
Font Weight: 500 (Medium)
Hover: Darken background to #2563EB
Active: Darken to #1D4ED8
Focus: Add focus ring
Disabled: Opacity 0.5, cursor not-allowed
```

#### Secondary Button
```
Background: White
Text: Gray 700
Border: 1px solid Gray 300
Padding: Same as primary
Border Radius: 6px
Hover: Background Gray 50
Active: Background Gray 100
```

#### Destructive Button
```
Background: Error Red (#EF4444)
Text: White
Same padding/radius as primary
Hover: Darken to #DC2626
```

### Input Fields

#### Text Input
```
Height: 38px (md) | 42px (lg)
Padding: 8px 12px
Border: 1px solid Gray 300
Border Radius: 6px
Background: White
Font Size: 14px
Focus: Border Primary Blue, add focus ring
Error: Border Error Red, show error message below
Disabled: Background Gray 50, text Gray 400
```

#### Select Dropdown
```
Same as text input
Include dropdown icon (chevron-down)
Options: White background, hover Gray 50
```

### Cards

#### Patient Card
```
Background: White
Border: 1px solid Gray 200
Border Radius: 8px
Padding: 16px
Shadow: shadow-sm
Hover: shadow-md, slight lift transform

Layout:
- Header: Patient name (H3), Status badge (right-aligned)
- Body: Key vitals in 2-column grid
- Footer: Action buttons or timestamp
```

#### Status Badge
```
Padding: 4px 8px
Border Radius: 9999px (full)
Font Size: 12px
Font Weight: 500

Critical: Red-600 text, Red-100 background
Monitoring: Amber-600 text, Amber-100 background
Stable: Emerald-600 text, Emerald-100 background
Discharged: Gray-600 text, Gray-100 background
```

### Forms

#### Form Layout
```
Label:
  - Font size: 14px
  - Font weight: 500 (Medium)
  - Color: Gray 700
  - Margin bottom: 6px
  - Required indicator: Red asterisk (*)

Input:
  - Full width or logical grouping
  - Margin bottom: 16px between fields

Helper Text:
  - Font size: 12px
  - Color: Gray 500
  - Margin top: 4px

Error Message:
  - Font size: 12px
  - Color: Error Red
  - Margin top: 4px
  - Include error icon
```

#### Form Sections
```
Section Header: H4, margin top 24px, margin bottom 16px
Divider: 1px solid Gray 200 between major sections
Grouped Fields: Light gray background (Gray 50), padding 12px, border radius 6px
```

### Tables

#### Data Table
```
Header Row:
  - Background: Gray 50
  - Border bottom: 2px solid Gray 200
  - Text: Gray 700, Font weight 600, uppercase, 12px

Data Rows:
  - Border bottom: 1px solid Gray 200
  - Hover: Background Gray 50
  - Padding: 12px 16px
  - Alternating rows: Optional zebra striping (Gray 25)

Cell Alignment:
  - Text: left-aligned
  - Numbers: right-aligned
  - Actions: right-aligned
```

### Navigation

#### Sidebar
```
Width: 240px (desktop), full width (mobile)
Background: Gray 900
Text: White
Active Item: Primary Blue background
Hover: Gray 800 background
Icon + Label layout
```

#### Top Bar
```
Height: 64px
Background: White
Border bottom: 1px solid Gray 200
Contains: Logo, Search, User Menu
Shadow: shadow-sm
```

## Interaction States

### Hover States
- Buttons: Background color shift
- Cards: Elevation increase (shadow)
- Links: Underline, color shift
- Table rows: Background highlight
- Navigation items: Background color change

### Focus States
- All interactive elements must have visible focus indicator
- Use outline or box-shadow
- Color: Primary Blue with opacity
- Never remove default focus without replacement

### Loading States
- Skeleton screens for page loads
- Spinners for button actions
- Progress bars for uploads
- Disabled state for buttons during submission

### Empty States
- Centered icon + message
- Helpful guidance text
- Primary action button if applicable
- Light gray background (Gray 50)

## Responsive Breakpoints

```
Mobile:       < 640px
Tablet:       640px - 1023px
Desktop:      1024px - 1279px
Large:        ≥ 1280px
```

### Responsive Patterns
- Mobile: Stack elements vertically, full-width buttons
- Tablet: 2-column layouts where appropriate
- Desktop: Multi-column layouts, sidebar visible
- Always test at 375px (mobile), 768px (tablet), 1440px (desktop)

## Icon System

**Icon Library:** Lucide React (already in dependencies)
**Sizes:**
- Small: 16px
- Medium: 20px
- Large: 24px
- XL: 32px

**Colors:** Match text color in context
**Stroke Width:** 2px (default)

## Animation Guidelines

### Timing
```
Fast:     150ms (hovers, small transitions)
Medium:   250ms (modals, dropdowns)
Slow:     350ms (page transitions)
```

### Easing
```
Standard: ease-in-out
Enter:    ease-out
Exit:     ease-in
```

### Respect Motion Preferences
```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

## Accessibility

### Color Contrast
- Normal text: 4.5:1 minimum
- Large text (18px+): 3:1 minimum
- UI components: 3:1 minimum

### Keyboard Navigation
- Logical tab order
- All interactive elements focusable
- Skip links for main content
- Escape key closes modals/dropdowns

### Screen Readers
- Semantic HTML (header, nav, main, section, article)
- ARIA labels where needed
- Alt text for all images
- Form labels properly associated

## Code Style

### CSS/Tailwind
- Use Tailwind utility classes
- Custom classes only for repeated patterns
- Prefix custom utilities with `vethub-`
- Group utilities logically: layout, spacing, typography, colors

### Component Structure
```tsx
// Imports
// Types/Interfaces
// Component
// Styles (if not inline Tailwind)
// Export
```

### Naming Conventions
- Components: PascalCase (PatientCard)
- Files: kebab-case (patient-card.tsx)
- CSS classes: kebab-case (patient-card-header)
- Tailwind custom: vethub-custom-class
