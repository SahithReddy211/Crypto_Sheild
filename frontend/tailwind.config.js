/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        cyber: {
          bg: '#090d16',
          card: 'rgba(15, 23, 42, 0.75)',
          border: 'rgba(56, 189, 248, 0.2)',
          accent: '#06b6d4',
          purple: '#a855f7',
          blue: '#3b82f6',
          green: '#10b981',
          danger: '#f43f5e',
          text: '#f8fafc',
          muted: '#94a3b8'
        }
      },
      boxShadow: {
        'neon-cyan': '0 0 20px rgba(6, 182, 212, 0.35)',
        'neon-purple': '0 0 20px rgba(168, 85, 247, 0.35)',
        'neon-blue': '0 0 20px rgba(59, 130, 246, 0.35)',
        'glass': '0 8px 32px 0 rgba(0, 0, 0, 0.37)'
      },
      animation: {
        'pulse-glow': 'pulseGlow 2.5s infinite ease-in-out',
        'scanline': 'scanline 4s linear infinite'
      },
      keyframes: {
        pulseGlow: {
          '0%, 100%': { opacity: '0.6', filter: 'drop-shadow(0 0 10px rgba(6, 182, 212, 0.5))' },
          '50%': { opacity: '1', filter: 'drop-shadow(0 0 22px rgba(168, 85, 247, 0.8))' }
        }
      }
    },
  },
  plugins: [],
}
