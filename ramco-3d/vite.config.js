import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  server: { port: 5178, open: false },
  build: {
    target: 'es2022',
    assetsInlineLimit: 0,
    rollupOptions: {
      output: {
        manualChunks: { three: ['three'], motion: ['lenis'] },
      },
    },
  },
});
