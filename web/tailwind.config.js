/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'nofx-gold': {
          DEFAULT: '#2563EB', // Traditional Financial Royal Blue
          dim: 'rgba(37, 99, 235, 0.08)',
          glow: 'rgba(37, 99, 235, 0.2)',
          highlight: '#3B82F6',
        },
        'nofx-bg': {
          DEFAULT: '#F1F3F6', // Traditional Financial Silver Gray Canvas
          deeper: '#E2E8F0',  // Slate 200
          lighter: '#FFFFFF', // Crisp White Card / Surface
        },
        'nofx-accent': '#1D4ED8', // Institutional Deep Blue
        'nofx-text': {
          DEFAULT: '#0F172A', // Slate 900
          main: '#0F172A',
          muted: '#64748B',  // Slate 500
        },
        'nofx-success': '#16A34A',
        'nofx-danger': '#DC2626',
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'IBM Plex Mono', 'Menlo', 'Monaco', 'Courier New', 'monospace'],
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(circle at center, var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
        'grid-pattern': "linear-gradient(to right, rgba(0,0,0,0.04) 1px, transparent 1px), linear-gradient(to bottom, rgba(0,0,0,0.04) 1px, transparent 1px)",
      },
      animation: {
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'shimmer': 'shimmer 2s linear infinite',
      },
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      boxShadow: {
        'neon': '0 1px 3px 0 rgba(0, 0, 0, 0.08), 0 1px 2px 0 rgba(0, 0, 0, 0.04)',
        'neon-blue': '0 2px 4px 0 rgba(37, 99, 235, 0.15)',
      },
    },
  },
  plugins: [],
}
