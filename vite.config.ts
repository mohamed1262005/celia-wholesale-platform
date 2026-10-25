import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  build: {
    target: 'esnext',
    minify: 'esbuild',
    cssCodeSplit: true,
    // ملحوظة: شلنا manualChunks لأنه كان بيعمل اعتماد دائري بين ملفات المكتبات
    // ويكسر الموقع بعد البناء (forwardRef of undefined)
    chunkSizeWarningLimit: 1500,
  },
});