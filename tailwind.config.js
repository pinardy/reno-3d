/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        panel: '#1b1e24',
        panel2: '#242830',
        edge: '#333844',
        accent: '#4f8cff',
      },
    },
  },
  plugins: [],
}
