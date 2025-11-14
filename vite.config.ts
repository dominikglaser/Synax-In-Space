import { defineConfig } from 'vite';
import { resolve } from 'path';

const isElectron = process.env.ELECTRON === 'true';

export default defineConfig({
  base: isElectron ? './' : '/',
  server: {
    port: 3000,
    open: !isElectron, // Don't open browser when running in Electron
    headers: {
      'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self' http://localhost:* https:; media-src 'self' blob:; worker-src 'self' blob:; frame-ancestors 'none'; base-uri 'self'; form-action 'self';",
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
    },
  },
  build: {
    target: 'esnext',
    outDir: 'dist',
    sourcemap: true,
    // Electron-specific build optimizations
    ...(isElectron && {
      rollupOptions: {
        output: {
          // Ensure proper path resolution for Electron
          format: 'es',
        },
      },
    }),
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
  publicDir: 'public',
});


