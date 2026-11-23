import { copyFileSync, mkdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

function spaFallback() {
  return {
    name: 'spa-fallback',
    closeBundle() {
      const index = resolve('dist/index.html')
      copyFileSync(index, resolve('dist/404.html'))
      // A real page, not the 404 fallback. Link previews skip images on a missing page.
      const party = resolve('dist/freshoffthepress')
      mkdirSync(party, { recursive: true })
      copyFileSync(index, resolve(party, 'index.html'))
    },
  }
}

// Relative asset paths, rooted by <base href="/"> so /kassidy still loads the seal and products.
// 404.html is the GitHub Pages fallback that keeps that short address in the bar.
export default defineConfig({
  plugins: [react(), spaFallback()],
  base: './',
})
