import { defineConfig } from 'tsup'
import path from 'path'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  dts: true,
  // Mark CSS imports as external so DTS build doesn't try to resolve them
  external: [/\.css\?raw$/],
  loader: {
    '.css': 'text',
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
