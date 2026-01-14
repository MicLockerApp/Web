/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./public/index.html"
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#FACC15',
          50: '#FEF9E7',
          100: '#FEF3CF',
          200: '#FDE89F',
          300: '#FCDC6F',
          400: '#FBD13F',
          500: '#FACC15',
          600: '#D4A90A',
          700: '#9E7D07',
          800: '#685205',
          900: '#322803'
        },
        dark: {
          DEFAULT: '#0A0A0A',
          50: '#525252',
          100: '#484848',
          200: '#333333',
          300: '#292929',
          400: '#1F1F1F',
          500: '#141414',
          600: '#0A0A0A',
          700: '#000000',
          800: '#000000',
          900: '#000000'
        }
      },
      animation: {
        'spin-slow': 'spin 1.791s linear infinite',
        'vinyl': 'vinyl-spin 1.791s linear infinite'
      },
      keyframes: {
        'vinyl-spin': {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' }
        }
      }
    },
  },
  plugins: [],
}
