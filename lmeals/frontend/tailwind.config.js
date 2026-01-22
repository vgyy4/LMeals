/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    fontFamily: {
      sans: ['Outfit', 'sans-serif'],
    },
    colors: {
      'soft-rose': '#fecfca',
      'sage-green': '#b2d2a4',
      'periwinkle-blue': '#a2a2d0',
      'p-mint': '#E3F9E5',
      'p-coral': '#FF746C',
      'p-sky': '#E0F2FE',
      'p-lavender': '#F3E8FF',
      'p-peach': '#FFF3E0',
      'p-surface': '#FFFDF5',
      'p-sidebar': '#FEF9F2',
    },
    letterSpacing: {
      'tightest': '-.05em',
      'premium': '-.02em',
    }
  },
},
plugins: [],
}
