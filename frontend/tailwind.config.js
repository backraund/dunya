/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        pastel: {
          blue: '#AEC6CF',
          pink: '#FFB7B2',
          green: '#77DD77',
          yellow: '#FDFD96',
          purple: '#CBAACB',
          orange: '#FFB347'
        }
      }
    },
  },
  plugins: [],
}
