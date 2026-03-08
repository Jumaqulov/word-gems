import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  build: {
    target: 'esnext',
    outDir: 'dist',
    assetsDir: 'assets',
    minify: 'terser',
    chunkSizeWarningLimit: 1600,
    terserOptions: {
      compress: { drop_console: true, drop_debugger: true },
      mangle: { toplevel: true }
    },
    rollupOptions: {
      output: { manualChunks: { phaser: ['phaser'] } }
    }
  },
  server: { host: true }
});
