import { defineConfig } from 'vite'

export default defineConfig({
  base: './',
  server: {
    host: '0.0.0.0',
  },
  resolve: {
    conditions: ['source'],
  },
  esbuild: {
    jsx: 'automatic',
    jsxImportSource: 'jsx-dom',
  },
  optimizeDeps: {
    esbuildOptions: {
      jsx: 'automatic',
      jsxImportSource: 'jsx-dom',
    },
  },
})
