import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Vite configuration for the Smart Tuition Manager frontend.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    open: false,
  },
  preview: {
    port: 4173,
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.js',
    css: false,
  },
});
