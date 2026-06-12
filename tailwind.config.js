/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        afus: {
          green:  '#0F5132',
          dark:   '#062416',
          gold:   '#D1A126',
          'gold-light': '#F3CD5F',
        },
      },
      fontFamily: {
        sans: ["'Segoe UI'", 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
