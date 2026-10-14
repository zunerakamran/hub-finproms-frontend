import { useEffect } from 'react'
import {
  browserCanPreviewFile,
  fileDisplayName,
  fileKind,
  fileKindLabel,
  needsOfficeClientPreview,
} from '../utils/fileDisplay'
import OfficeDocumentPreview from './OfficeDocumentPreview'

function isImage(mime, url, name) {
  return fileKind(name || url, mime) === 'image'
}

function isVideo(mime, url, post, name) {
  if (post?.is_video || post?.is_reel) return true
  return fileKind(name || url, mime) === 'video'
}

/**
 * In-app preview for purchased posts / GC encrypted files.
 *
 * Prefer explicit url / mime / name. Legacy callers may pass `post` with
 * attachment_url / attachment_mime / attachment_name.
 *
 * Pass `blob` + Office kind for client-side Word / Excel / PowerPoint rendering
 * (never put those blobs in an iframe — browsers download them).
 */
export default function AttachmentPreview({
  open,
  onClose,
  post,
  url,
  blob,
  mime,
  name: nameProp,
  title = 'Preview',
  canDownload = false,
  onDownload,
  downloading = false,
  /** When true, skip media / Office embed and show the fallback panel. */
  forceUnavailable = false,
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
  const mimeType = mime || post?.attachment_mime
  const rawName = nameProp || post?.attachment_name || title
  const name = fileDisplayName(rawName) || rawName
  const kind = fileKind(rawName, mimeType)
  const kindLabel = fileKindLabel(rawName, mimeType)
  const office = !forceUnavailable && Boolean(blob) && needsOfficeClientPreview(rawName, mimeType)
  const native =
    !forceUnavailable &&
    !office &&
    Boolean(resolvedUrl) &&
    browserCanPreviewFile(rawName, mimeType)

  if (!open) return null
  if (!office && !native && !rawName && !resolvedUrl) return null

  const image = native && isImage(mimeType, resolvedUrl, rawName)
  const video = native && !image && isVideo(mimeType, resolvedUrl, post, rawName)
  const showDownload = Boolean(canDownload && typeof onDownload === 'function')
  const showContent = office || native

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
        <div
          className={
            showContent
              ? office
                ? 'attachment-preview__body attachment-preview__body--office'
                : 'attachment-preview__body'
              : 'attachment-preview__body attachment-preview__body--fallback'
          }
        >
          {office ? (
            <OfficeDocumentPreview blob={blob} kind={kind} name={rawName} />
          ) : image ? (
            <img src={resolvedUrl} alt={name} className="attachment-preview__media" />
          ) : video ? (
            <video
              src={resolvedUrl}
              className="attachment-preview__media"
              controls
              playsInline
              autoPlay
            />
          ) : native ? (
            <iframe title={name} src={resolvedUrl} className="attachment-preview__frame" />
          ) : (
            <div className="attachment-preview__unavailable">
              <p className="attachment-preview__unavailable-title">
                In-browser preview is not available for {kindLabel.toLowerCase()}s
              </p>
              <p className="muted">
                {showDownload
                  ? 'Use Download to save the file and open it in the desktop app.'
                  : 'Downloading is disabled for your role on this hub. Ask a hub admin to enable “Download general compliance attachments” if you need the file.'}
              </p>
              {rawName ? (
                <p className="attachment-preview__unavailable-name" title={rawName}>
                  {rawName}
                </p>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
