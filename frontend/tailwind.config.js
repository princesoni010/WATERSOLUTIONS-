/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'Manrope', 'system-ui', '-apple-system', 'sans-serif'],
      },
      colors: {
        brand: {
          dark: '#073B3A',
          teal: '#0F766E',
          aqua: '#14B8A6',
          mist: '#F7FBFA',
          ink: '#142522',
          muted: '#60736F',
          border: '#D8E8E4',
        },
        aqua: {
          50:  '#F0FDFA',
          100: '#CCFBF1',
          200: '#99F6E4',
          300: '#5EEAD4',
          400: '#2DD4BF',
          500: '#14B8A6',
          600: '#0F766E',
          700: '#0D5E57',
          800: '#073B3A',
          900: '#052B2A',
        },
      },
      borderRadius: {
        card: '14px',
      },
      boxShadow: {
        card: '0 2px 10px -2px rgba(7, 59, 58, 0.06), 0 1px 3px 0 rgba(7, 59, 58, 0.04)',
      },
    },
  },
  plugins: [],
}
