import { copyFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

function spaFallback() {
  return {
    name: 'spa-fallback',
    closeBundle() {
      copyFileSync(resolve('dist/index.html'), resolve('dist/404.html'))
    },
  }
}

// Relative asset paths, rooted by <base href="/"> so /kassidy still loads the seal and products.
// 404.html is the GitHub Pages fallback that keeps that short address in the bar.
export default defineConfig({
  plugins: [react(), spaFallback()],
  base: './',
})
