import type {Config} from 'tailwindcss';

export default {
  darkMode: ['class'],
  content: [
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',  // Fixed: include ALL components, not just /ui
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'PT Sans', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
        body: ['Inter', 'PT Sans', 'sans-serif'],
        headline: ['Inter', 'PT Sans', 'sans-serif'],
        mono: ['JetBrains Mono', 'Courier New', 'monospace'],
        code: ['JetBrains Mono', 'monospace'],
      },
      fontSize: {
        'xs': ['0.75rem', { lineHeight: '1.5' }],      // 12px - Caption
        'sm': ['0.8125rem', { lineHeight: '1.5' }],    // 13px - Small
        'base': ['0.875rem', { lineHeight: '1.5' }],   // 14px - Body default
        'lg': ['1rem', { lineHeight: '1.5' }],         // 16px - Body large
        'xl': ['1.125rem', { lineHeight: '1.25' }],    // 18px - H4
        '2xl': ['1.25rem', { lineHeight: '1.25' }],    // 20px - H3
        '3xl': ['1.5rem', { lineHeight: '1.25' }],     // 24px - H2
        '4xl': ['2rem', { lineHeight: '1.25' }],       // 32px - H1
      },
      colors: {
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',

        // Neo-Pop Palette (NEW!)
        'neo': {
          'cream': '#FFF8F0',
          'cream-light': '#FFFBF5',
          'coral': '#FFB4A2',
          'lavender': '#B8B5FF',
          'mint': '#A8E6CF',
          'yellow': '#FFE66D',
          'pink': '#FFD6E0',
          'sky': '#C9F0FF',
          'purple': '#957FEF',
          'orange': '#FF7F50',
          'teal': '#00C9A7',
        },

        // Neo-Pop Status Colors
        'status': {
          'critical': '#FF6B6B',
          'monitoring': '#FFB07C',  // Soft peach/orange instead of harsh yellow
          'stable': '#6BCB77',
          'discharged': '#C4C4C4',
          'new': '#B8B5FF',
        },

        // Neo-Pop Text Colors
        'neo-text': {
          'dark': '#2D3436',
          'secondary': '#636E72',
        },

        // VetHub Brand Colors (legacy)
        'vethub-primary': {
          DEFAULT: '#3B82F6',  // Primary Blue
          hover: '#2563EB',
          active: '#1D4ED8',
        },

        // VetHub Patient Status Colors (legacy)
        'patient-status': {
          critical: '#DC2626',    // Red-600
          monitoring: '#F59E0B',  // Amber-500
          stable: '#10B981',      // Emerald-500
          discharged: '#6B7280',  // Gray-500
        },

        // VetHub Module Colors (for page backgrounds)
        'module': {
          rounding: '#059669',    // Emerald-600
          soap: '#7C3AED',        // Purple-600
          appointments: '#2563EB', // Blue-600
        },

        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        chart: {
          '1': 'hsl(var(--chart-1))',
          '2': 'hsl(var(--chart-2))',
          '3': 'hsl(var(--chart-3))',
          '4': 'hsl(var(--chart-4))',
          '5': 'hsl(var(--chart-5))',
        },
        sidebar: {
          DEFAULT: 'hsl(var(--sidebar-background))',
          foreground: 'hsl(var(--sidebar-foreground))',
          primary: 'hsl(var(--sidebar-primary))',
          'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
          accent: 'hsl(var(--sidebar-accent))',
          'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
          border: 'hsl(var(--sidebar-border))',
          ring: 'hsl(var(--sidebar-ring))',
        },
      },
      spacing: {
        '0': '0px',
        '0.5': '0.125rem',  // 2px
        '1': '0.25rem',     // 4px
        '2': '0.5rem',      // 8px
        '3': '0.75rem',     // 12px
        '4': '1rem',        // 16px
        '6': '1.5rem',      // 24px
        '8': '2rem',        // 32px
        '12': '3rem',       // 48px
        '16': '4rem',       // 64px
      },
      borderRadius: {
        'sm': '0.25rem',    // 4px
        'DEFAULT': '0.375rem', // 6px
        'md': '0.5rem',     // 8px
        'lg': '0.75rem',    // 12px
        'xl': '1rem',       // 16px
        '2xl': '1.5rem',    // 24px - Neo-pop cards
        '3xl': '2rem',      // 32px - Neo-pop sections
        'full': '9999px',
        'neo': '1.5rem',    // 24px - Neo-pop default
        'neo-sm': '1rem',   // 16px - Neo-pop small
        'neo-lg': '2rem',   // 32px - Neo-pop large
        'pill': '9999px',   // Pill shape
      },
      keyframes: {
        'accordion-down': {
          from: {
            height: '0',
          },
          to: {
            height: 'var(--radix-accordion-content-height)',
          },
        },
        'accordion-up': {
          from: {
            height: 'var(--radix-accordion-content-height)',
          },
          to: {
            height: '0',
          },
        },
        'bounce-once': {
          '0%, 100%': {
            transform: 'scale(1)',
          },
          '50%': {
            transform: 'scale(1.2)',
          },
        },
        'pop': {
          '0%': {
            transform: 'scale(0.95)',
            opacity: '0.8',
          },
          '50%': {
            transform: 'scale(1.05)',
          },
          '100%': {
            transform: 'scale(1)',
            opacity: '1',
          },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        'bounce-once': 'bounce-once 0.3s ease-out',
        'pop': 'pop 0.2s ease-out',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
} satisfies Config;
