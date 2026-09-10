import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Desktop / OneDrive / antivirus often touch file mtimes and force full page reloads.
    watch: {
      awaitWriteFinish: {
        stabilityThreshold: 500,
        pollInterval: 100,
      },
      ignored: [
        '**/node_modules/**',
        '**/.git/**',
        '**/dist/**',
        '**/*.log',
        '**/storage/**',
        '**/vendor/**',
      ],
    },
    hmr: {
      overlay: true,
    },
  },
})
