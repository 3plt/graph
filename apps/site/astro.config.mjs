import { defineConfig } from 'astro/config';
import fs from 'node:fs';
import path from 'node:path';
import react from '@astrojs/react';
import vue from '@astrojs/vue';

// https://astro.build/config
export default defineConfig({
  integrations: [
    react(),
    vue(),
  ],
  site: 'https://3plt.github.io',
  base: '/graph',
  vite: {
    plugins: [
      {
        name: 'truncate-cursor-debug-log-on-hmr',
        apply: 'serve',
        handleHotUpdate() {
          const logPath = '/workspaces/graph/.cursor/debug.log';
          try {
            // Truncate the file to zero bytes if it exists
            if (fs.existsSync(logPath)) {
              fs.truncateSync(logPath, 0);
              console.log('[vite] truncated', logPath);
            }
          } catch (e) {
            console.warn('[vite] failed to truncate debug log:', e?.message || e);
          }
        },
      },
    ],
    resolve: {
      conditions: ['source', 'import', 'module', 'default'],
      alias: {
        '@3plate/graph-core': path.resolve(path.dirname(new URL(import.meta.url).pathname), '../../packages/core/src/index.ts'),
        '@3plate/graph-react': path.resolve(path.dirname(new URL(import.meta.url).pathname), '../../packages/react/src/index.ts'),
      },
    },
  },
});
