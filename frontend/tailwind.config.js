/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        luxury: {
          gold: {
            50: '#fff6f0',
            100: '#ffecd9',
            200: '#ffd0a8',
            300: '#ffa86b',
            400: '#f6914c',
            500: '#e77d2f',
            600: '#cd6218',
            700: '#a74912',
            800: '#853711',
            900: '#6e2d12',
            950: '#3b1406',
          },
          dark: {
            50: '#f5f5f6',
            100: '#e6e6e9',
            200: '#ccccd3',
            300: '#a3a4b0',
            400: '#7a7a8d',
            500: '#616174',
            600: '#4b4b5b',
            700: '#383845',
            800: '#22222a',
            900: '#141419', // Main panels
            950: '#0b0b0e', // Core layout background
          }
        }
      },
      fontFamily: {
        cairo: ['Cairo', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
