/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f9f6f0',
          100: '#f1eadb',
          200: '#e4d7be',
          300: '#d6c19e',
          400: '#c8ab7e',
          500: '#bb9460',
          600: '#ae9773', // The brand gold color
          700: '#8e795d',
          800: '#6e5c47',
          900: '#4e4031',
          950: '#2e2318',
        },
      },
    },
  },
  plugins: [
    require('tailwindcss-animate'),
  ],
} 