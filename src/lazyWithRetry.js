import { lazy } from 'react'

/**
 * React.lazy wrapper that recovers from stale Vite chunks after deploy.
 * When the server returns index.html (text/html) for a missing hashed asset,
 * one hard reload picks up the new index + assets.
 */
export function lazyWithRetry(factory) {
  return lazy(async () => {
    try {
      return await factory()
    } catch (error) {
      const key = 'chunk_reload_' + (factory.toString().slice(0, 80) || 'lazy')
      const already = sessionStorage.getItem(key)
      if (!already) {
        sessionStorage.setItem(key, '1')
        window.location.reload()
        return new Promise(() => {})
      }
      sessionStorage.removeItem(key)
      throw error
    }
  })
}
