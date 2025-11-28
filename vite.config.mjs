import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  base: './',   // IMPORTANT for Electron
  logLevel: 'info',
  clearScreen: false,
  plugins: [
    react(),
    tailwindcss()
  ],

  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3001',
      '/uploads': 'http://localhost:3001'
    }
  },

  build: {
    outDir: 'dist',
  },

  // Prevent Vite from bundling Electron/Node modules
  optimizeDeps: {
    exclude: ['macaddress', 'os', 'electron']
  },
});
