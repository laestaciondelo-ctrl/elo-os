/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        elo: {
          bg: '#FAF7F2',
          surface: '#F5F0E8',
          card: '#FFFFFF',
          border: '#E8E0D0',
          'border-dark': '#D4C9B5',
          accent: '#B8860B',
          'accent-dim': '#9A7009',
          'accent-light': '#FDF3DC',
          text: '#2C2416',
          secondary: '#6B5B3E',
          muted: '#A0927A',
          danger: '#C0392B',
          'danger-light': '#FDECEA',
          success: '#2E7D32',
          'success-light': '#EDF7EE',
          warning: '#E65100',
          'warning-light': '#FFF3E0',
        }
      },
      fontFamily: {
        display: ['"Playfair Display"', 'serif'],
        body: ['"DM Sans"', 'sans-serif'],
        mono: ['"DM Mono"', 'monospace'],
      },
      boxShadow: {
        'card': '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)',
        'modal': '0 20px 60px rgba(0,0,0,0.15)',
      }
    }
  },
  plugins: []
}
