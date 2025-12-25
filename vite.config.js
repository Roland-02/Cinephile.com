import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

export default defineConfig({
  plugins: [react()],
  root: './',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  publicDir: 'public',
  server: {
    port: 3000,
    proxy: {
      '/api': {
        // Local dev proxy; production uses VITE_API_BASE_URL in the client.
        target: process.env.VITE_API_BASE_URL,
        changeOrigin: true,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './client'),
    },
  },
  define: {
    'import.meta.env.VITE_PAGE_SIZE': JSON.stringify(process.env.PAGE_SIZE),
    'import.meta.env.VITE_API_TOKEN': JSON.stringify(process.env.API_TOKEN),
    'import.meta.env.VITE_API_BASE_URL': JSON.stringify(process.env.VITE_API_BASE_URL),
  },
});

