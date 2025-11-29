import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import vue from '@astrojs/vue';

// https://astro.build/config
export default defineConfig({
  integrations: [
    react(),
    vue(),
  ],
  site: 'https://3plates.github.io',
  base: '/steadyflow',
});
