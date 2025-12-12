import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  dts: true,
  loader: {
    '.css': 'text',
  },
  esbuildPlugins: [
    {
      name: 'css-raw-resolver',
      setup(build) {
        // Handle .css?raw imports by stripping the ?raw suffix
        build.onResolve({ filter: /\.css\?raw$/ }, (args) => {
          return {
            path: args.path.replace('?raw', ''),
            pluginData: { raw: true },
            namespace: 'file',
          }
        })
      },
    },
  ],
})
