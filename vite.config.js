import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Relative base so GitHub Pages works for project or user sites
export default defineConfig({
  plugins: [react()],
  base: './',
})
