/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        elo: {
          bg: '#0A0A0A',
          surface: '#141414',
          card: '#1C1C1C',
          border: '#2A2A2A',
          accent: '#E8B84B',
          'accent-dim': '#C49A35',
          text: '#F0EDE6',
          muted: '#888580',
          danger: '#E05555',
          success: '#4CAF7D',
          warning: '#E8A23A',
        }
      },
      fontFamily: {
        display: ['"Playfair Display"', 'serif'],
        body: ['"DM Sans"', 'sans-serif'],
        mono: ['"DM Mono"', 'monospace'],
      }
    }
  },
  plugins: []
}
