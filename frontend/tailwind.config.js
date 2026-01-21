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
      }
    },
  },
  plugins: [],
}
