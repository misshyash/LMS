/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'media',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        trainito: { teal: '#66c2bd', coral: '#f04434' },
      },
    },
  },
  plugins: [],
};
