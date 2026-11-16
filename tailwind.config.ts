import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./src/renderer/src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Netflix Cinematic Surfaces
        surface: {
          '50': '#f8f8f8',
          '100': '#e5e5e5',
          '200': '#cccccc',
          '300': '#a3a3a3',
          '400': '#737373',
          '500': '#525252',
          '600': '#363636',
          '700': '#262626',
          '800': '#1b1b1b',
          '900': '#141414', // Netflix signature canvas
          '950': '#0a0a0a', // Deep obsidian black
        },
        // Iconic Netflix Red Accent Palette
        accent: {
          DEFAULT: '#E50914',
          50: '#fff1f2',
          100: '#ffe4e6',
          200: '#fecdd3',
          300: '#fda4af',
          400: '#fb7185',
          500: '#E50914', // Iconic Netflix Crimson
          600: '#B81D24', // Netflix Dark Red hover
          700: '#8f1419',
          800: '#5c0d11',
          900: '#38080a',
          950: '#1e0405',
        },
        danger: {
          DEFAULT: '#E50914',
          400: '#f87171',
          500: '#E50914',
          600: '#b81d24',
        },
        warning: {
          DEFAULT: '#f59e0b',
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
        },
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'Segoe UI', 'system-ui', 'sans-serif'],
        display: ['"Bebas Neue"', '"Plus Jakarta Sans"', 'sans-serif'],
        mono: ['"Cascadia Code"', 'Consolas', 'monospace'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'netflix-zoom': 'netflixZoom 2.2s cubic-bezier(0.2, 0.8, 0.2, 1) forwards',
        'netflix-glow': 'netflixGlow 2s ease-in-out infinite alternate',
        'shimmer': 'shimmer 1.8s infinite linear',
      },
      keyframes: {
        shimmer: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        netflixZoom: {
          '0%': { transform: 'scale(0.85)', opacity: '0', filter: 'blur(10px)' },
          '20%': { transform: 'scale(1)', opacity: '1', filter: 'blur(0px)' },
          '80%': { transform: 'scale(1.05)', opacity: '1', filter: 'blur(0px)' },
          '100%': { transform: 'scale(1.15)', opacity: '0', filter: 'blur(8px)' }
        },
        netflixGlow: {
          '0%': { opacity: '0.4', transform: 'scale(0.95)' },
          '100%': { opacity: '0.85', transform: 'scale(1.05)' }
        }
      },
    },
  },
  plugins: [],
}

export default config
