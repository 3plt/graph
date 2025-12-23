import { defineConfig } from 'astro/config';
import fs from 'node:fs';
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
      conditions: ['source'],
    },
  },
});
