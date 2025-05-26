/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./public/index.html"
  ],
  theme: {
    extend: {
      colors: {
        // BP brand colors
        'bp-green': '#009b3a',
        'bp-green-dark': '#007029',
        'bp-yellow': '#ffe400',
        'bp-gray': '#54565a',
        'bp-light-gray': '#f5f5f5',
        'bp-blue': '#0066b3',
        'bp-navy': '#002f6c',
      },
      fontFamily: {
        'sans': ['Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'spin-slow': 'spin 3s linear infinite',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      }
    },
  },
  plugins: [],
}