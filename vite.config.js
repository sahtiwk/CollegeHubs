import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  plugins: [react()],
  // Nested apps keep their own dependencies and HTML entry points.
  optimizeDeps: { entries: ['index.html'] },
  build: { rollupOptions: { input: fileURLToPath(new URL('./index.html', import.meta.url)) } },
  server: {
    port: 5173,
    watch: { ignored: ['**/AI-Interviewer-main/**', '**/MargaAI-master/**', '**/digital-arcade-main/**', '**/server/**'] },
  },
});

