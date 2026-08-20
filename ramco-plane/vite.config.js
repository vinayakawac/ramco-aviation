import { resolve } from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  server: { port: 5179, open: false },
  build: {
    target: 'es2022',
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        plane: resolve(__dirname, 'plane.html'),
      },
    },
  },
});
