/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Deep space study palette
        void:    { DEFAULT: '#0d0d14', 50: '#1a1a2e', 100: '#16162a' },
        surface: { DEFAULT: '#1e1e30', 50: '#252540', 100: '#2a2a45' },
        panel:   { DEFAULT: '#252538', 50: '#2e2e48' },
        border:  { DEFAULT: '#333355', soft: '#2a2a44' },
        primary: { DEFAULT: '#7c6af7', light: '#9d8fff', dark: '#5b4bd4' },
        accent:  { DEFAULT: '#f472b6', glow: '#fb7185' },
        teal:    { DEFAULT: '#2dd4bf', dark: '#0d9488' },
        amber:   { DEFAULT: '#fbbf24', dark: '#d97706' },
        success: { DEFAULT: '#34d399' },
        danger:  { DEFAULT: '#f87171' },
        muted:   { DEFAULT: '#6b6b8a', light: '#9090b0' },
      },
      fontFamily: {
        sans:    ['"DM Sans"', 'system-ui', 'sans-serif'],
        display: ['"Syne"', 'sans-serif'],
        mono:    ['"JetBrains Mono"', 'monospace'],
      },
      boxShadow: {
        glow:    '0 0 20px rgba(124,106,247,0.35)',
        'glow-accent': '0 0 20px rgba(244,114,182,0.35)',
        panel:   '0 4px 24px rgba(0,0,0,0.4)',
        float:   '0 8px 40px rgba(0,0,0,0.5)',
      },
      animation: {
        'fade-in':   'fadeIn 0.3s ease',
        'slide-up':  'slideUp 0.3s ease',
        'pulse-dot': 'pulseDot 1.4s infinite',
        'bounce-in': 'bounceIn 0.4s cubic-bezier(0.175,0.885,0.32,1.275)',
        'glow-ring': 'glowRing 2s ease-in-out infinite',
        'float':     'float 3s ease-in-out infinite',
      },
      keyframes: {
        fadeIn:    { from: { opacity: 0 }, to: { opacity: 1 } },
        slideUp:   { from: { opacity: 0, transform: 'translateY(12px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
        pulseDot:  { '0%,80%,100%': { transform: 'scale(0)' }, '40%': { transform: 'scale(1)' } },
        bounceIn:  { from: { opacity: 0, transform: 'scale(0.85)' }, to: { opacity: 1, transform: 'scale(1)' } },
        glowRing:  { '0%,100%': { boxShadow: '0 0 10px rgba(124,106,247,0.3)' }, '50%': { boxShadow: '0 0 30px rgba(124,106,247,0.7)' } },
        float:     { '0%,100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-6px)' } },
      },
    },
  },
  plugins: [],
}
