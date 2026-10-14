import { useCallback, useEffect, useState } from 'react'
import { smcStatusClass } from '../utils/socialMediaCompliance'
import {
  downloadComplianceFile,
  loadFileForPreview,
  revokePreviewUrl,
} from '../utils/filePreviewActions'
import { useHub } from '../context/HubContext'
import AttachmentPreview from './AttachmentPreview'
import { StatusWithDate } from './DataGrid'
import ComplianceStatusText from './ComplianceStatusText'
import RichTextDisplay from './RichTextDisplay'
import { SupportingFilesList } from './GeneralComplianceUI'
import { resolveComplianceSupportingFiles } from '../utils/complianceSupportingFiles'

export default function SmcStatusBadge({ status, at }) {
  const { complianceStatusLabel } = useHub()
  const raw = status || 'Pending'
  const badge = (
    <span className={smcStatusClass(raw)}>
      <ComplianceStatusText status={raw} label={complianceStatusLabel(raw)} />
    </span>
  )
  if (!at) return badge
  return <StatusWithDate badge={badge} at={at} />
}

export function SmcBarChart({ labels = [], data = [], title }) {
  const max = Math.max(1, ...data.map((n) => Number(n) || 0))

  if (!labels.length) {
    return <p className="muted">No data for this chart yet.</p>
  }

  return (
    <div className="smc-chart">
      {title && <h3>{title}</h3>}
      <div className="smc-chart-bars">
        {labels.map((label, i) => {
          const value = Number(data[i]) || 0
          const pct = Math.round((value / max) * 100)
          return (
            <div key={`${label}-${i}`} className="smc-chart-row">
              <div className="smc-chart-label" title={label}>
                {label}
              </div>
              <div className="smc-chart-track">
                <div className="smc-chart-fill" style={{ width: `${pct}%` }} />
              </div>
              <div className="smc-chart-value">{value}</div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function SmcSupportingFilesBlock({ files = [] }) {
  return (
    <SupportingFilesList
      files={files}
      accessMode="public"
      downloadMode="always"
    />
  )
}

function smcMediaAsFile(version, mediaUrl, isVideo) {
  const ext = isVideo ? 'mp4' : 'jpg'
  return {
    id: `smc-media-${version.id || version.version_number}`,
    original_name: `version-${version.version_number || 'attachment'}.${ext}`,
    mime_type: isVideo ? 'video/mp4' : 'image/jpeg',
    file_url: mediaUrl,
    image_url: mediaUrl,
  }
}

export function SmcVersionCard({ version, isLatest }) {
  const mediaUrl = version.image_url
  const isVideo = mediaUrl && /\.(mp4|mov|webm)(\?|$)/i.test(mediaUrl)
  const [busy, setBusy] = useState(false)
  const [busyKind, setBusyKind] = useState('')
  const [error, setError] = useState('')
  const [preview, setPreview] = useState(null)

  const closePreview = useCallback(() => {
    setPreview((prev) => {
      revokePreviewUrl(prev)
      return null
    })
  }, [])

  useEffect(() => () => {
    revokePreviewUrl(preview)
  }, [preview])

  async function openMediaPreview() {
    if (!mediaUrl || busy) return
    const file = smcMediaAsFile(version, mediaUrl, isVideo)
    setError('')
    setBusy(true)
    setBusyKind('preview')
    try {
      const next = await loadFileForPreview(file, 'public')
      setPreview((prev) => {
        revokePreviewUrl(prev)
        return next
      })
    } catch (err) {
      setError(err?.message || 'Unable to preview attachment')
    } finally {
      setBusy(false)
      setBusyKind('')
    }
  }

  async function downloadMedia() {
    if (!mediaUrl || busy) return
    const file = smcMediaAsFile(version, mediaUrl, isVideo)
    setError('')
    setBusy(true)
    setBusyKind('download')
    try {
      await downloadComplianceFile(file, 'public')
    } catch (err) {
      setError(err?.message || 'Unable to download attachment')
    } finally {
      setBusy(false)
      setBusyKind('')
    }
  }

  return (
    <article className={`smc-version ${isLatest ? 'is-latest' : ''}`}>
      <header className="smc-version-head">
        <strong>
          Version {version.version_number}
          {isLatest ? <span className="smc-latest-pill">Latest</span> : null}
        </strong>
        <SmcStatusBadge status={version.status} at={version.reviewed_at || version.submitted_at} />
      </header>
      <div className="smc-version-body">
        <div>
          <p className="muted label">Description</p>
          <RichTextDisplay html={version.description} className="smc-pre" />
        </div>
        <div>
          <p className="muted label">Attachment</p>
          {mediaUrl ? (
            <div className="smc-attach-preview">
              <button
                type="button"
                className="smc-thumb-link"
                title="Preview attachment"
                onClick={openMediaPreview}
                disabled={busy}
              >
                {isVideo ? (
                  <video
                    src={mediaUrl}
                    className="smc-thumb"
                    muted
                    playsInline
                    preload="metadata"
                  />
                ) : (
                  <img
                    src={mediaUrl}
                    alt={`Version ${version.version_number}`}
                    className="smc-thumb"
                  />
                )}
              </button>
              {busy && busyKind === 'preview' ? (
                <p className="muted" style={{ marginTop: '0.35rem' }}>Opening…</p>
              ) : null}
              {error ? <p className="error">{error}</p> : null}
            </div>
          ) : (
            <p className="muted">No attachment</p>
          )}
        </div>
        {resolveComplianceSupportingFiles(version).length ? (
          <div>
            <p className="muted label">Supporting files</p>
            <SmcSupportingFilesBlock files={resolveComplianceSupportingFiles(version)} />
          </div>
        ) : null}
      </div>
      {version.reviewed_at && (
        <footer className="smc-version-foot">
          <SmcStatusBadge status={version.status} at={version.reviewed_at} />
          <span className="muted">
            by <strong>{version.reviewed_by || 'Reviewer'}</strong>
          </span>
          {version.feedback ? (
            <RichTextDisplay html={version.feedback} className="smc-feedback" />
          ) : null}
        </footer>
      )}

      <AttachmentPreview
        open={Boolean(preview)}
        onClose={closePreview}
        url={preview?.url}
        blob={preview?.blob}
        mime={preview?.mimeType}
        name={preview?.filename}
        title="Preview"
        forceUnavailable={preview ? preview.mode === 'unavailable' : false}
        canDownload
        onDownload={downloadMedia}
        downloading={busy && busyKind === 'download'}
      />
    </article>
  )
}
