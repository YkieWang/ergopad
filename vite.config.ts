import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: './', // Use relative path for GitHub Pages deployment
  build: {
    outDir: 'build',
  },
  server: {
    open: true,
  },
  define: {
    global: 'window',
  },
});
