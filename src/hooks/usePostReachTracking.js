import { useEffect, useRef } from 'react'
import { api } from '../api/client'

/**
 * Track listing impressions: when a post tile scrolls into view, record reach
 * (unique per viewer). Does not fire on click — views are recorded on detail.
 *
 * @param {Array<{ id: number|string }>} posts
 * @param {(ids: number[]) => void} [onReached] - optional local UI bump
 */
export default function usePostReachTracking(posts, onReached) {
  const pendingRef = useRef(new Set())
  const sentRef = useRef(new Set())
  const flushTimerRef = useRef(null)
  const onReachedRef = useRef(onReached)
  onReachedRef.current = onReached

  useEffect(() => {
    sentRef.current = new Set()
    pendingRef.current = new Set()
  }, [posts])

  useEffect(() => {
    if (!posts?.length || typeof IntersectionObserver === 'undefined') {
      return undefined
    }

    const flush = () => {
      flushTimerRef.current = null
      const ids = [...pendingRef.current]
      pendingRef.current.clear()
      if (!ids.length) return

      ids.forEach((id) => sentRef.current.add(id))

      api
        .recordPostReach(ids)
        .then((data) => {
          const reached = Array.isArray(data?.reached_post_ids)
            ? data.reached_post_ids.map(Number)
            : ids
          if (reached.length && onReachedRef.current) {
            onReachedRef.current(reached)
          }
        })
        .catch(() => {
          // Allow retry on next intersection if the request failed.
          ids.forEach((id) => sentRef.current.delete(id))
        })
    }

    const scheduleFlush = () => {
      if (flushTimerRef.current) return
      flushTimerRef.current = window.setTimeout(flush, 400)
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting || entry.intersectionRatio < 0.45) continue
          const raw = entry.target.getAttribute('data-post-id')
          const id = Number(raw)
          if (!id || sentRef.current.has(id) || pendingRef.current.has(id)) continue
          pendingRef.current.add(id)
          scheduleFlush()
        }
      },
      {
        root: null,
        rootMargin: '0px',
        threshold: [0.45, 0.6, 0.8],
      }
    )

    const nodes = document.querySelectorAll('[data-post-id][data-track-reach="1"]')
    nodes.forEach((node) => observer.observe(node))

    return () => {
      observer.disconnect()
      if (flushTimerRef.current) {
        window.clearTimeout(flushTimerRef.current)
        flushTimerRef.current = null
      }
    }
  }, [posts])
}
