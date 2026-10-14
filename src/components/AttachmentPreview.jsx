import { useEffect } from 'react'
import { fileDisplayName } from '../utils/fileDisplay'

function isImage(mime, url) {
  const m = String(mime || '').toLowerCase()
  if (m.startsWith('image/')) return true
  return /\.(png|jpe?g|gif|webp|svg|bmp)(\?|$)/i.test(String(url || ''))
}

function isVideo(mime, url, post) {
  if (post?.is_video || post?.is_reel) return true
  const m = String(mime || '').toLowerCase()
  if (m.startsWith('video/')) return true
  return /\.(mp4|webm|mov|m4v|ogg)(\?|$)/i.test(String(url || ''))
}

/**
 * In-app preview for purchased posts / GC encrypted files.
 *
 * Prefer explicit url / mime / name. Legacy callers may pass `post` with
 * attachment_url / attachment_mime / attachment_name.
 */
export default function AttachmentPreview({
  open,
  onClose,
  post,
  url,
  mime,
  name: nameProp,
  title = 'Preview',
  canDownload = false,
  onDownload,
  downloading = false,
}) {
  useEffect(() => {
    if (!open) return undefined
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.()
    }
    window.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [open, onClose])

  const resolvedUrl = url || post?.attachment_url
  if (!open || !resolvedUrl) return null

  const mimeType = mime || post?.attachment_mime
  const rawName = nameProp || post?.attachment_name || title
  const name = fileDisplayName(rawName) || rawName
  const image = isImage(mimeType, resolvedUrl)
  const video = !image && isVideo(mimeType, resolvedUrl, post)
  const showDownload = Boolean(canDownload && typeof onDownload === 'function')

  return (
    <div className="attachment-preview" role="dialog" aria-modal="true" aria-label={title}>
      <button
        type="button"
        className="attachment-preview__backdrop"
        aria-label="Close preview"
        onClick={onClose}
      />
      <div className="attachment-preview__dialog">
        <div className="attachment-preview__head">
          <h2 title={rawName}>{name}</h2>
          <div className="attachment-preview__actions">
            {showDownload ? (
              <button
                type="button"
                className="btn primary"
                onClick={onDownload}
                disabled={downloading}
              >
                {downloading ? 'Downloading…' : 'Download'}
              </button>
            ) : null}
            <button type="button" className="btn ghost" onClick={onClose}>
              Close
            </button>
          </div>
        </div>
        <div className="attachment-preview__body">
          {image ? (
            <img src={resolvedUrl} alt={name} className="attachment-preview__media" />
          ) : video ? (
            <video
              src={resolvedUrl}
              className="attachment-preview__media"
              controls
              playsInline
              autoPlay
            />
          ) : (
            <iframe title={name} src={resolvedUrl} className="attachment-preview__frame" />
          )}
        </div>
      </div>
    </div>
  )
}
