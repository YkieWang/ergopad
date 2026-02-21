import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // base: '/ergopad/', // Removed to allow root access in dev
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
