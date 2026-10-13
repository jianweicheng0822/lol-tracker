import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        // Core framework code changes rarely, so keep it in its own long-cached chunk.
        // Recharts is not listed: it is split out via the lazy-loaded PerformanceModal.
        manualChunks: {
          react: ['react', 'react-dom', 'react-dom/client', 'react-router-dom'],
        },
      },
    },
  },
})
