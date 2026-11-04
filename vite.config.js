import { defineConfig } from 'vite';

export default defineConfig({
  server: { port: 5173, host: true },
  preview: { port: 4173, host: true },
  build: {
    outDir: 'dist', sourcemap: false, chunkSizeWarningLimit: 900,
    rollupOptions: { output: { manualChunks: { three: ['three'], charts: ['chart.js'] } } },
  },
  test: { environment: 'node', include: ['tests/unit/**/*.test.js'] },
});
