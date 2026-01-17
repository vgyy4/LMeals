/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'soft-rose': '#fecfca',
        'sage-green': '#b2d2a4',
        'periwinkle-blue': '#a2a2d0',
      }
    },
  },
  plugins: [],
}
