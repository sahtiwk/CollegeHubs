import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import gateway from './config/gateway.cjs';

export default defineConfig(({ mode }) => {
  const proxy = gateway.localProxy({ ...loadEnv(mode, process.cwd(), ''), ...process.env });
  return {
  plugins: [react()],
  // Nested apps keep their own dependencies and HTML entry points.
  optimizeDeps: { entries: ['index.html'] },
  build: { rollupOptions: { input: fileURLToPath(new URL('./index.html', import.meta.url)) } },
  server: {
    port: 5173,
    strictPort: true,
    proxy,
    watch: { ignored: ['**/AI-Interviewer-main/**', '**/MargaAI-master/**', '**/digital-arcade-main/**', '**/server/**'] },
  },
  preview: { proxy },
};
});

