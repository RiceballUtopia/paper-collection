/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        paper: {
          50: '#fbfaf7',
          100: '#f5f2eb',
          200: '#ebe4d5',
          300: '#ddd0b8',
          800: '#42372c',
          900: '#2b231c',
        }
      }
    },
  },
  plugins: [],
}
