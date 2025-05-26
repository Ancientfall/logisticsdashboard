/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./public/index.html"
  ],
  theme: {
    extend: {
      colors: {
        // Primary BP Colors
        'bp-green': {
          DEFAULT: '#009b3a',
          50: '#e6f7ec',
          100: '#b3e5c6',
          200: '#80d3a0',
          300: '#4dc17a',
          400: '#26b55d',
          500: '#009b3a',
          600: '#008832',
          700: '#007029',
          800: '#005821',
          900: '#004018',
        },
        // Secondary Colors
        'bp-yellow': {
          DEFAULT: '#ffe400',
          light: '#fff7b3',
          dark: '#ccb600',
        },
        'bp-blue': {
          DEFAULT: '#0066b3',
          light: '#4d94d6',
          dark: '#002f6c',
        },
        // Neutral Colors
        'bp-gray': {
          50: '#fafafa',
          100: '#f5f5f5',
          200: '#eeeeee',
          300: '#e0e0e0',
          400: '#bdbdbd',
          500: '#9e9e9e',
          600: '#757575',
          700: '#616161',
          800: '#54565a',
          900: '#424242',
        },
        // Semantic Colors
        'bp-success': '#009b3a',
        'bp-warning': '#ffe400',
        'bp-danger': '#d32f2f',
        'bp-info': '#0066b3',
      },
      fontFamily: {
        'bp': ['Arial', 'Helvetica Neue', 'Helvetica', 'sans-serif'],
        'display': ['Helvetica Neue', 'Arial', 'sans-serif'],
        'mono': ['Consolas', 'Monaco', 'Courier New', 'monospace'],
      },
      fontSize: {
        'xxs': '0.625rem',
        'xs': '0.75rem',
        'sm': '0.875rem',
        'base': '1rem',
        'lg': '1.125rem',
        'xl': '1.25rem',
        '2xl': '1.5rem',
        '3xl': '1.875rem',
        '4xl': '2.25rem',
        '5xl': '3rem',
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '120': '30rem',
        '128': '32rem',
        '144': '36rem',
      },
      boxShadow: {
        'bp': '0 2px 8px rgba(0, 0, 0, 0.08)',
        'bp-md': '0 4px 16px rgba(0, 0, 0, 0.12)',
        'bp-lg': '0 8px 32px rgba(0, 0, 0, 0.16)',
        'bp-xl': '0 12px 48px rgba(0, 0, 0, 0.20)',
        'inner-lg': 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)',
      },
      animation: {
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
        'fade-in': 'fadeIn 0.3s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
        'pulse-soft': 'pulseSoft 2s ease-in-out infinite',
        'spin-slow': 'spin 3s linear infinite',
      },
      keyframes: {
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideDown: {
          '0%': { transform: 'translateY(-10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.5' },
        },
      },
      backgroundImage: {
        'bp-gradient': 'linear-gradient(135deg, #009b3a 0%, #007029 100%)',
        'bp-gradient-light': 'linear-gradient(135deg, #26b55d 0%, #009b3a 100%)',
        'bp-gradient-dark': 'linear-gradient(135deg, #007029 0%, #004018 100%)',
        'bp-gradient-radial': 'radial-gradient(circle at top right, #009b3a, #007029)',
        'bp-mesh': 'url("data:image/svg+xml,%3Csvg width="100" height="100" xmlns="http://www.w3.org/2000/svg"%3E%3Cdefs%3E%3Cpattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse"%3E%3Cpath d="M 10 0 L 0 0 0 10" fill="none" stroke="rgba(255,255,255,0.05)" stroke-width="1"/%3E%3C/pattern%3E%3C/defs%3E%3Crect width="100" height="100" fill="url(%23grid)"/%3E%3C/svg%3E")',
      },
      borderRadius: {
        'bp': '0.375rem',
        'bp-lg': '0.75rem',
      },
    },
  },
  plugins: [],
}