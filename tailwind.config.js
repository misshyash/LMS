/** @type {import('tailwindcss').Config} */
// Strawberry Matcha (kawaii) theme.
//  • `slate` is re-mapped to strawberry-milk neutrals (pink-tinted cream → cocoa),
//    so every existing neutral in the app picks up the theme.
//  • `trainito.teal` (primary accent) → matcha green; `trainito.coral` → strawberry.
export default {
  darkMode: 'media',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        trainito: { teal: '#5c8a3f', coral: '#e8678e' },
        matcha: { 50: '#f3f8ee', 100: '#e4f0d9', 200: '#c9e1b4', 300: '#a6cb86', 400: '#86b35f', 500: '#6a9a45', 600: '#5c8a3f', 700: '#476b31', 800: '#37532a', 900: '#2b4123' },
        strawberry: { 50: '#fff1f5', 100: '#ffe2ea', 200: '#ffc6d6', 300: '#fca0b9', 400: '#f57a9b', 500: '#e8678e', 600: '#d14d76', 700: '#b03a61', 800: '#8e2f50', 900: '#712842' },
        slate: {
          50: '#fff6f8',
          100: '#fdecf0',
          200: '#f6dde3',
          300: '#e8c3cc',
          400: '#b6979f',
          500: '#8f727b',
          600: '#6e5560',
          700: '#553f49',
          800: '#3a2c33',
          900: '#2b1f25',
          950: '#1c1418',
        },
      },
      fontFamily: {
        sans: ['"M PLUS Rounded 1c"', '"Nunito"', 'ui-rounded', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
