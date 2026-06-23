export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['DM Sans', 'Noto Sans Devanagari', 'sans-serif'],
        mono: ['DM Mono', 'Courier New', 'monospace'],
      },
      colors: {
        bg:      '#0b0d14',
        surface: '#151a27',
        card:    '#1c2234',
        border:  '#1e2538',
        accent:  '#f5a623',
        green:   '#00c47d',
        red:     '#ff4757',
        blue:    '#4d9fff',
        purple:  '#a78bfa',
        muted:   '#8892aa',
        dim:     '#4a5270',
      },
      keyframes: {
        fadeUp:   { from: { opacity: 0, transform: 'translateY(10px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
        pulseDot: { '0%,100%': { opacity: 0.3, transform: 'scale(0.75)' }, '50%': { opacity: 1, transform: 'scale(1)' } },
      },
      animation: {
        'fade-up':   'fadeUp 0.35s ease both',
        'pulse-dot': 'pulseDot 1s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
