import { defineConfig } from 'vite'

export default defineConfig({
  // Keep generated asset URLs relative so the build works from a GitHub Pages
  // project subpath as well as a custom domain.
  base: './',
})
