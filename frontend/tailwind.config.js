/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f0f7ff',
          100: '#e0effe',
          200: '#bae2fd',
          300: '#7ccbfd',
          400: '#38b2fc',
          500: '#0ea5e9', // Sky blue primary
          600: '#0285c7',
          700: '#036aa1',
          800: '#075a87',
          900: '#0c4b70',
          950: '#08304a',
        },
        accent: {
          50: '#f0fdf4',
          100: '#dcfce7',
          500: '#10b981', // Emerald/Teal accent
          600: '#059669',
        },
        dark: {
          50: '#f8fafc',
          100: '#f1f5f9',
          800: '#1e293b',
          900: '#0f172a',
          950: '#030712',
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        display: ['Outfit', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
