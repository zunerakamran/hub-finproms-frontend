import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { copyFileSync, existsSync, mkdirSync } from 'node:fs'
import { resolve } from 'node:path'

// Vite skips dotfiles in /public; copy .htaccess into the build outDir for cPanel/Apache deploys.
function copyHtaccess() {
  let outDir = 'dist'

  return {
    name: 'copy-htaccess',
    configResolved(config) {
      outDir = config.build.outDir
    },
    closeBundle() {
      const src = resolve(__dirname, 'public/.htaccess')
      if (!existsSync(src)) return

      const destDir = resolve(__dirname, outDir)
      if (!existsSync(destDir)) {
        mkdirSync(destDir, { recursive: true })
      }
      copyFileSync(src, resolve(destDir, '.htaccess'))
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
