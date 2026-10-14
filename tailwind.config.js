/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: {
          950: '#040a1c',
          900: '#071331',
          800: '#0c1d48',
          700: '#132a63',
          600: '#1d3a80',
        },
        gold: {
          300: '#fde68a',
          400: '#f8d24a',
          500: '#e9b322',
          600: '#c38f10',
        },
      },
      fontFamily: {
        // Offline-safe system fonts with good Devanagari coverage (no web-font download).
        sans: ['"Segoe UI"', '"Nirmala UI"', '"Noto Sans Devanagari"', 'Mangal', 'system-ui', 'Arial', 'sans-serif'],
        display: ['"Segoe UI Black"', '"Arial Black"', '"Nirmala UI"', 'system-ui', 'sans-serif'],
      },
      keyframes: {
        glow: {
          '0%, 100%': { opacity: '0.55' },
          '50%': { opacity: '1' },
        },
        pop: {
          '0%': { transform: 'scale(0.92)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        rise: {
          '0%': { transform: 'translateY(0)', opacity: '1' },
          '100%': { transform: 'translateY(-110vh)', opacity: '0' },
        },
      },
      animation: {
        glow: 'glow 3s ease-in-out infinite',
        pop: 'pop 280ms ease-out both',
        rise: 'rise 4s linear forwards',
      },
    },
  },
  plugins: [],
};
