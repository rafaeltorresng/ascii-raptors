import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';
export default defineConfig({
  base: './',
  build: {
    outDir: 'dist/demo',
    rollupOptions: {
      input: {
        collection: fileURLToPath(new URL('./index.html', import.meta.url)),
        study: fileURLToPath(new URL('./study.html', import.meta.url)),
      },
    },
  },
});
