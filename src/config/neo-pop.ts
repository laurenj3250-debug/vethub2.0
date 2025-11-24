/**
 * VetHub Neo-Pop Design System
 * Shared styling constants for the neo-pop visual style
 */

// Border styles
export const NEO_BORDER = '2px solid #000';
export const NEO_BORDER_LIGHT = '1px solid #000';
export const NEO_BORDER_SUBTLE = '1px solid #ccc';

// Shadow styles
export const NEO_SHADOW = '6px 6px 0 #000';
export const NEO_SHADOW_SM = '4px 4px 0 #000';
export const NEO_SHADOW_XS = '3px 3px 0 #000';
export const NEO_SHADOW_BUTTON = '2px 2px 0 #000';

// Brand colors
export const NEO_COLORS = {
  // Primary palette
  lavender: '#DCC4F5',
  mint: '#B8E6D4',
  pink: '#FFBDBD',
  cream: '#FFF8F0',
  teal: '#6BB89D',

  // Status colors
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',

  // Code status colors
  codeGreen: '#10B981',
  codeYellow: '#F59E0B',
  codeOrange: '#F97316',
  codeRed: '#EF4444',
} as const;

// Common style objects for inline styles
export const NEO_STYLES = {
  card: {
    backgroundColor: 'white',
    border: NEO_BORDER,
    boxShadow: NEO_SHADOW,
  },
  cardSmall: {
    backgroundColor: 'white',
    border: NEO_BORDER,
    boxShadow: NEO_SHADOW_SM,
  },
  button: {
    border: NEO_BORDER,
    boxShadow: NEO_SHADOW_XS,
  },
  buttonSmall: {
    border: NEO_BORDER_LIGHT,
    boxShadow: NEO_SHADOW_BUTTON,
  },
  input: {
    border: NEO_BORDER_SUBTLE,
  },
} as const;

// Helper to get code status color
export function getCodeStatusColor(code: string | undefined): string {
  switch (code) {
    case 'Green':
      return NEO_COLORS.codeGreen;
    case 'Yellow':
      return NEO_COLORS.codeYellow;
    case 'Orange':
      return NEO_COLORS.codeOrange;
    case 'Red':
      return NEO_COLORS.codeRed;
    default:
      return 'transparent';
  }
}

// Helper to get row background based on state
export function getRowBackground(hasChanges: boolean): string {
  return hasChanges ? `${NEO_COLORS.mint}40` : 'white';
}
