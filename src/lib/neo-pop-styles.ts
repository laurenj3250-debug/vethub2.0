/**
 * Neo-Pop Design System
 * Centralized styling constants for consistent UI across VetHub
 */

export const NEO_POP = {
  // Borders
  border: '2px solid #000',
  borderThin: '1px solid #000',
  borderLight: '1px solid #ccc',

  // Box Shadows
  shadow: {
    sm: '2px 2px 0 #000',
    md: '4px 4px 0 #000',
    lg: '6px 6px 0 #000',
  },

  // Colors
  colors: {
    // Accent Colors
    lavender: '#DCC4F5',     // Evening/Purple actions
    mint: '#B8E6D4',         // Primary actions, success
    mintDark: '#6BB89D',     // Progress bars, accents
    pink: '#FFBDBD',         // Destructive/Cancel
    cream: '#FFF8F0',        // Card backgrounds
    yellow: '#FFF3B8',       // Morning/Warning

    // Neutrals
    white: '#FFFFFF',
    gray50: '#F9FAFB',
    gray100: '#F3F4F6',
    gray200: '#E5E7EB',
    gray300: '#D1D5DB',
    gray400: '#9CA3AF',
    gray500: '#6B7280',
    gray600: '#4B5563',
    gray700: '#374151',
    gray800: '#1F2937',
    gray900: '#111827',
  },

  // Text Colors
  text: {
    primary: '#111827',      // Gray 900
    secondary: '#4B5563',    // Gray 600
    muted: '#9CA3AF',        // Gray 400
    link: '#059669',         // Emerald 600
    linkHover: '#10B981',    // Emerald 500
  },

  // Patient Status Colors
  status: {
    critical: '#DC2626',     // Red-600
    monitoring: '#F59E0B',   // Amber-500
    stable: '#10B981',       // Emerald-500
    discharged: '#6B7280',   // Gray-500
  },
} as const;

// Pre-built style objects for common patterns
export const neoPopStyles = {
  // Card container
  card: {
    backgroundColor: NEO_POP.colors.white,
    border: NEO_POP.border,
    boxShadow: NEO_POP.shadow.md,
  },

  // Card with cream background
  cardCream: {
    backgroundColor: NEO_POP.colors.cream,
    border: NEO_POP.border,
  },

  // Modal container
  modal: {
    backgroundColor: NEO_POP.colors.white,
    border: NEO_POP.border,
    boxShadow: NEO_POP.shadow.lg,
  },

  // Primary button (mint)
  buttonPrimary: {
    backgroundColor: NEO_POP.colors.mint,
    border: NEO_POP.borderThin,
    boxShadow: NEO_POP.shadow.sm,
  },

  // Secondary button (gray)
  buttonSecondary: {
    backgroundColor: NEO_POP.colors.gray100,
    border: NEO_POP.borderThin,
    boxShadow: NEO_POP.shadow.sm,
  },

  // Morning button (yellow)
  buttonMorning: {
    backgroundColor: NEO_POP.colors.yellow,
    border: NEO_POP.borderThin,
    boxShadow: NEO_POP.shadow.sm,
  },

  // Evening button (lavender)
  buttonEvening: {
    backgroundColor: NEO_POP.colors.lavender,
    border: NEO_POP.borderThin,
    boxShadow: NEO_POP.shadow.sm,
  },

  // Destructive button (pink)
  buttonDestructive: {
    backgroundColor: NEO_POP.colors.pink,
    border: NEO_POP.borderThin,
    boxShadow: NEO_POP.shadow.sm,
  },

  // Input field
  input: {
    backgroundColor: NEO_POP.colors.white,
    border: NEO_POP.borderThin,
  },

  // Table row
  tableRow: {
    backgroundColor: NEO_POP.colors.white,
    borderBottom: NEO_POP.borderThin,
  },

  // Table header
  tableHeader: {
    backgroundColor: NEO_POP.colors.gray100,
    borderBottom: NEO_POP.border,
  },

  // Dropdown menu
  dropdown: {
    backgroundColor: NEO_POP.colors.white,
    border: NEO_POP.border,
    boxShadow: NEO_POP.shadow.md,
  },

  // Task item
  taskItem: {
    backgroundColor: NEO_POP.colors.white,
    border: NEO_POP.borderThin,
  },

  // Progress bar track
  progressTrack: {
    backgroundColor: NEO_POP.colors.gray200,
    border: NEO_POP.borderThin,
  },

  // Progress bar fill
  progressFill: {
    backgroundColor: NEO_POP.colors.mintDark,
  },
} as const;

// Tailwind class replacements guide
export const tailwindReplacements = {
  // Background replacements
  'bg-slate-800/40': 'bg-white',
  'bg-slate-900/50': 'bg-[#FFF8F0]',
  'bg-slate-900/30': 'bg-gray-50',
  'bg-slate-700/50': 'bg-gray-100',
  'bg-black/80': 'bg-black/50',

  // Border replacements
  'border-slate-700/50': 'border-black',
  'border-slate-700': 'border-black',
  'border-slate-600': 'border-gray-400',

  // Text replacements
  'text-white': 'text-gray-900',
  'text-slate-300': 'text-gray-700',
  'text-slate-400': 'text-gray-500',
  'text-slate-500': 'text-gray-400',
  'text-cyan-400': 'text-emerald-600',
  'text-cyan-300': 'text-emerald-500',
} as const;
