/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{html,ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Poppins', 'sans-serif'],
        mono: ['Roboto Mono', 'monospace'],
        serif: ['Georgia', 'Cambria', 'Times New Roman', 'Times', 'serif'],
      },
      colors: {
        // Candyland Light Mode
        background: 'oklch(0.9809 0.0025 228.7836)',
        foreground: 'oklch(0.3211 0 0)',
        primary: {
          DEFAULT: 'oklch(0.8677 0.0735 7.0855)',
          foreground: 'oklch(0.3211 0 0)',
        },
        secondary: {
          DEFAULT: 'oklch(0.8148 0.0819 225.7537)',
          foreground: 'oklch(0.3211 0 0)',
        },
        accent: {
          DEFAULT: 'oklch(0.9680 0.2110 109.7692)',
          foreground: 'oklch(0.3211 0 0)',
        },
        card: {
          DEFAULT: 'oklch(1.0000 0 0)',
          foreground: 'oklch(0.3211 0 0)',
        },
        muted: {
          DEFAULT: 'oklch(0.8828 0.0285 98.1033)',
          foreground: 'oklch(0.5 0 0)',
        },
        destructive: {
          DEFAULT: 'oklch(0.6368 0.2078 25.3313)',
          foreground: 'oklch(1.0000 0 0)',
        },
        border: 'oklch(0.8699 0 0)',
        ring: 'oklch(0.8677 0.0735 7.0855)',
      },
      borderRadius: {
        DEFAULT: '0.5rem',
        lg: '0.5rem',
        md: '0.375rem',
        sm: '0.25rem',
      },
      boxShadow: {
        '2xs': '0 1px 3px 0px hsl(0 0% 0% / 0.05)',
        xs: '0 1px 3px 0px hsl(0 0% 0% / 0.05)',
        sm: '0 1px 3px 0px hsl(0 0% 0% / 0.10), 0 1px 2px -1px hsl(0 0% 0% / 0.10)',
        DEFAULT: '0 1px 3px 0px hsl(0 0% 0% / 0.10), 0 1px 2px -1px hsl(0 0% 0% / 0.10)',
        md: '0 1px 3px 0px hsl(0 0% 0% / 0.10), 0 2px 4px -1px hsl(0 0% 0% / 0.10)',
        lg: '0 1px 3px 0px hsl(0 0% 0% / 0.10), 0 4px 6px -1px hsl(0 0% 0% / 0.10)',
        xl: '0 1px 3px 0px hsl(0 0% 0% / 0.10), 0 8px 10px -1px hsl(0 0% 0% / 0.10)',
        '2xl': '0 1px 3px 0px hsl(0 0% 0% / 0.25)',
      },
    },
  },
  plugins: [],
};

