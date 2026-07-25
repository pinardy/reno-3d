import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  // served from https://pinardy.github.io/reno-3d/ on GitHub Pages
  base: process.env.VITE_BASE ?? '/reno-3d/',
  plugins: [react()],
})
