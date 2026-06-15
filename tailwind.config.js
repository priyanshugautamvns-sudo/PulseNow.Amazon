/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}'
  ],
  theme: {
    extend: {
      // Theme-aware colors via CSS variables. The same class works
      // in light and dark mode. Toggling html[data-theme] swaps them.
      colors: {
        canvas: 'rgb(var(--bg-canvas) / <alpha-value>)',
        surface: 'rgb(var(--bg-surface) / <alpha-value>)',
        elevated: 'rgb(var(--bg-elevated) / <alpha-value>)',
        muted: 'rgb(var(--bg-muted) / <alpha-value>)',
        line: 'rgb(var(--border-line) / <alpha-value>)',
        hairline: 'rgb(var(--border-hairline) / <alpha-value>)',

        // Text scale: ink-100 is primary in BOTH themes.
        // ink-900 is aliased to primary too so legacy code keeps working.
        ink: {
          50: 'rgb(var(--text-strong) / <alpha-value>)',
          100: 'rgb(var(--text-primary) / <alpha-value>)',
          200: 'rgb(var(--text-secondary) / <alpha-value>)',
          300: 'rgb(var(--text-tertiary) / <alpha-value>)',
          400: 'rgb(var(--text-muted) / <alpha-value>)',
          500: 'rgb(var(--text-muted) / <alpha-value>)',
          600: 'rgb(var(--text-subtle) / <alpha-value>)',
          700: 'rgb(var(--text-secondary) / <alpha-value>)',
          800: 'rgb(var(--text-primary) / <alpha-value>)',
          900: 'rgb(var(--text-primary) / <alpha-value>)'
        },

        brand: {
          orange: 'rgb(var(--brand-orange) / <alpha-value>)',
          amber: 'rgb(var(--brand-amber) / <alpha-value>)',
          gold: 'rgb(var(--brand-gold) / <alpha-value>)',
          deep: 'rgb(var(--brand-deep) / <alpha-value>)',
          navy: 'rgb(var(--brand-navy) / <alpha-value>)',
          glow: 'rgb(var(--brand-glow) / <alpha-value>)'
        },

        good: 'rgb(var(--good) / <alpha-value>)',
        warn: 'rgb(var(--warn) / <alpha-value>)',
        bad: 'rgb(var(--bad) / <alpha-value>)',
        info: 'rgb(var(--info) / <alpha-value>)'
      },
      boxShadow: {
        e1: '0 1px 2px rgb(var(--shadow) / 0.18)',
        e2: '0 6px 18px rgb(var(--shadow) / 0.18), 0 1px 2px rgb(var(--shadow) / 0.12)',
        e3: '0 14px 40px rgb(var(--shadow) / 0.22), 0 2px 4px rgb(var(--shadow) / 0.12)',
        glow: '0 0 0 1px rgb(var(--brand-orange) / 0.2), 0 8px 30px rgb(var(--brand-orange) / 0.18)',
        cta: 'inset 0 1px 0 rgba(255,255,255,0.18), 0 6px 20px rgb(var(--brand-orange) / 0.32)',
        ring: '0 0 0 4px rgb(var(--brand-orange) / 0.18)'
      },
      borderRadius: {
        xl: '14px',
        '2xl': '18px',
        '3xl': '24px'
      },
      fontFamily: {
        sans: [
          'Inter',
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          'Segoe UI',
          'Roboto',
          'Helvetica Neue',
          'Arial',
          'sans-serif'
        ]
      },
      animation: {
        'pulse-glow': 'pulseGlow 2.4s ease-in-out infinite',
        'shimmer': 'shimmer 2s linear infinite',
        'float': 'float 4s ease-in-out infinite'
      },
      keyframes: {
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 0 0 rgb(var(--brand-orange) / 0.45)' },
          '50%': { boxShadow: '0 0 0 14px rgb(var(--brand-orange) / 0)' }
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' }
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-4px)' }
        }
      }
    }
  },
  plugins: []
};
