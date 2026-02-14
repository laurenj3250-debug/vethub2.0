// Neo-pop styling constants used across the dashboard
// Extracted from page.tsx to enable component splitting

export const NEO_SHADOW = '6px 6px 0 #000';
export const NEO_SHADOW_SM = '4px 4px 0 #000';
export const NEO_BORDER = '2px solid #000';

export const NEO_COLORS = {
  lavender: '#DCC4F5',
  mint: '#B8E6D4',
  pink: '#FFBDBD',
  cream: '#FFF8F0',
  teal: '#6BB89D', // Used for focus rings and accents
} as const;

export type NeoColor = keyof typeof NEO_COLORS;
