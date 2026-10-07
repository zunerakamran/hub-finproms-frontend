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
 * In-app preview for purchased attachments (replaces file download).
 */
export default function AttachmentPreview({ open, onClose, post, title = 'Preview' }) {
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

  if (!open || !post?.attachment_url) return null

  const url = post.attachment_url
  const mime = post.attachment_mime
  const rawName = post.attachment_name || title
  const name = fileDisplayName(rawName) || rawName
  const image = isImage(mime, url)
  const video = !image && isVideo(mime, url, post)

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
          <button type="button" className="btn ghost" onClick={onClose}>
            Close
          </button>
        </div>
        <div className="attachment-preview__body">
          {image ? (
            <img src={url} alt={name} className="attachment-preview__media" />
          ) : video ? (
            <video
              src={url}
              className="attachment-preview__media"
              controls
              playsInline
              autoPlay
            />
          ) : (
            <iframe title={name} src={url} className="attachment-preview__frame" />
          )}
        </div>
      </div>
    </div>
  )
}
