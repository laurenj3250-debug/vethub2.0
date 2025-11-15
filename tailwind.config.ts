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

        // VetHub Brand Colors
        'vethub-primary': {
          DEFAULT: '#3B82F6',  // Primary Blue
          hover: '#2563EB',
          active: '#1D4ED8',
        },

        // VetHub Patient Status Colors
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
        'full': '9999px',
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
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
} satisfies Config;
