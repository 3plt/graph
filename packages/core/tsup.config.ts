/// <reference types="node" />
import fs from 'node:fs'
import path from 'path'
import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  dts: true,
  sourcemap: true,
  loader: {
    '.css': 'text',
  },
  onSuccess: async () => {
    // Add .js to jsx-dom import so Node ESM resolution works (consumers don't need vite.ssr.noExternal)
    const esmPath = path.join(process.cwd(), 'dist', 'index.js')
    const code = fs.readFileSync(esmPath, 'utf8')
    fs.writeFileSync(esmPath, code.replace(/from "jsx-dom\/jsx-runtime"/g, 'from "jsx-dom/jsx-runtime.js"'))
  },
  esbuildPlugins: [
    {
      name: 'css-raw-resolver',
      setup(build) {
        // Handle .css?raw imports by stripping the ?raw suffix and resolving to absolute path
        build.onResolve({ filter: /\.css\?raw$/ }, (args) => {
          const cssPath = args.path.replace('?raw', '')
          const absolutePath = path.resolve(args.resolveDir, cssPath)
          return {
            path: absolutePath,
            namespace: 'file',
          }
        })
      },
    },
  ],
})
