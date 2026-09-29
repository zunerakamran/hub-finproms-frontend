/**
 * Hero / carousel slide helpers for compliance iframe previews.
 * Advisor templates read `preview_slide` from SECTION_PREVIEW postMessage payloads.
 */

export function getPreviewSlideCount(data) {
  if (!data || typeof data !== 'object') return 0
  const slides = data.slides
  if (!Array.isArray(slides)) return 0
  return slides.length
}

export function withPreviewSlide(data, slideIndex) {
  if (!data || typeof data !== 'object') return data
  const count = getPreviewSlideCount(data)
  if (count <= 0) return data
  const safe = Math.max(0, Math.min(Number(slideIndex) || 0, count - 1))
  return { ...data, preview_slide: safe }
}

export function isHeroLikeSection(sectionName) {
  const key = String(sectionName || '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
  return key === 'heroslider' || key === 'hero' || key === 'herosection' || key.includes('heroslider')
}
