/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'op-red': '#E4002B',
        'op-gold': '#FFD700',
        'op-orange': '#F97316',
        'dark': {
          'bg': '#0d0d0d',
          'card': '#1a1a1a',
          'border': '#2a2a2a',
          'hover': '#252525',
        }
      }
    },
  },
  plugins: [],
}
