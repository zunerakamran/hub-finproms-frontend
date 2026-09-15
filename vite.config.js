import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { copyFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'

// Vite skips dotfiles in /public; copy .htaccess into dist for cPanel/Apache deploys.
function copyHtaccess() {
  return {
    name: 'copy-htaccess',
    closeBundle() {
      const src = resolve(__dirname, 'public/.htaccess')
      const dest = resolve(__dirname, 'dist/.htaccess')
      if (existsSync(src)) {
        copyFileSync(src, dest)
      }
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), copyHtaccess()],
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
