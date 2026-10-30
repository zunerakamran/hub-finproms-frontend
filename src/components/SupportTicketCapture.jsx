/* eslint-disable react/prop-types -- local capture controls; matches other ST helpers */
import { useEffect, useRef, useState } from 'react'
import { FaCheckCircle, FaFileVideo, FaTimes } from 'react-icons/fa'
import {
  ST_MAX_RECORD_SECONDS,
  captureScreenScreenshot,
  startScreenRecording,
} from '../utils/screenCapture'
import { formatStFileSize } from '../utils/supportTickets'

function fileKey(file) {
  return `${file.name}-${file.size}-${file.lastModified}`
}

function isVideoFile(file) {
  return String(file?.type || '').startsWith('video/') || /\.(mp4|webm|mov|m4v)$/i.test(file?.name || '')
}

function isImageFile(file) {
  return String(file?.type || '').startsWith('image/') || /\.(png|jpe?g|gif|webp)$/i.test(file?.name || '')
}

/**
 * In-app screen screenshot + short recording for support ticket attachments.
 * Shows a clear success notice + preview strip so newly captured files are obvious.
 */
export default function SupportTicketCapture({
  files = [],
  onAddFiles,
  onChangeFiles,
  maxFiles = 8,
  disabled = false,
}) {
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [recording, setRecording] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [previews, setPreviews] = useState({})
  const sessionRef = useRef(null)
  const tickRef = useRef(null)
  const noticeRef = useRef(null)
  const listRef = useRef(null)

  const selected = Array.isArray(files) ? files.filter(Boolean) : []
  const remainingSlots = Math.max(0, maxFiles - selected.length)
  const canCapture = !disabled && remainingSlots > 0 && !busy

  useEffect(() => {
    return () => {
      if (tickRef.current) clearInterval(tickRef.current)
      sessionRef.current?.cancel?.()
      sessionRef.current = null
    }
  }, [])

  // Object URLs for image/video thumbnails in the notice strip.
  useEffect(() => {
    const list = Array.isArray(files) ? files.filter(Boolean) : []
    const next = {}
    list.forEach((file) => {
      if (isImageFile(file) || isVideoFile(file)) {
        next[fileKey(file)] = URL.createObjectURL(file)
      }
    })
    setPreviews(next)
    return () => {
      Object.values(next).forEach((url) => URL.revokeObjectURL(url))
    }
  }, [files])

  const revealAdded = (message) => {
    setSuccess(message)
    setError('')
    // Wait a tick so the DOM paints the new strip, then scroll it into view.
    requestAnimationFrame(() => {
      noticeRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      listRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    })
  }

  const addFiles = (incoming) => {
    const list = (Array.isArray(incoming) ? incoming : [incoming]).filter(Boolean)
    if (!list.length) return
    const accepted = list.slice(0, remainingSlots)
    onAddFiles?.(accepted)
    const names = accepted.map((f) => f.name).join(', ')
    const kind = accepted.every(isVideoFile)
      ? 'Recording'
      : accepted.every(isImageFile)
        ? 'Screenshot'
        : 'File'
    revealAdded(
      accepted.length === 1
        ? `${kind} added: ${names}`
        : `${accepted.length} files added: ${names}`
    )
  }

  const removeAt = (index) => {
    if (disabled || !onChangeFiles) return
    onChangeFiles(selected.filter((_, i) => i !== index))
  }

  const takeScreenshot = async () => {
    setError('')
    setSuccess('')
    setBusy('screenshot')
    try {
      const file = await captureScreenScreenshot()
      addFiles(file)
    } catch (err) {
      if (err?.name === 'NotAllowedError') {
        setError('Screen capture permission was denied or cancelled.')
      } else {
        setError(err.message || 'Screenshot failed.')
      }
    } finally {
      setBusy('')
    }
  }

  const startRecording = async () => {
    setError('')
    setSuccess('')
    setBusy('record-start')
    try {
      const session = await startScreenRecording({ maxSeconds: ST_MAX_RECORD_SECONDS })
      sessionRef.current = session
      setRecording(true)
      setElapsed(0)
      setBusy('')
      tickRef.current = setInterval(() => {
        setElapsed((n) => n + 1)
      }, 1000)
    } catch (err) {
      if (err?.name === 'NotAllowedError') {
        setError('Screen recording permission was denied or cancelled.')
      } else {
        setError(err.message || 'Could not start screen recording.')
      }
      setBusy('')
    }
  }

  const stopRecording = async () => {
    if (!sessionRef.current) return
    setBusy('record-stop')
    if (tickRef.current) {
      clearInterval(tickRef.current)
      tickRef.current = null
    }
    try {
      const file = await sessionRef.current.stop()
      sessionRef.current = null
      setRecording(false)
      setElapsed(0)
      addFiles(file)
    } catch (err) {
      setError(err.message || 'Recording failed.')
      sessionRef.current = null
      setRecording(false)
      setElapsed(0)
    } finally {
      setBusy('')
    }
  }

  return (
    <div className="st-capture">
      <p className="st-capture__steps">
        <strong>Capture the page with the error</strong> — not this New Ticket form:
        <ol>
          <li>Open the broken page in another browser tab or window first.</li>
          <li>
            Click capture / record, then in the browser picker choose that{' '}
            <em>Entire screen</em>, <em>Window</em>, or <em>Chrome tab</em> (this form tab is
            excluded when the browser allows it).
          </li>
          <li>Reproduce the issue while recording, then stop.</li>
        </ol>
      </p>
      <div className="st-capture__actions">
        <button
          type="button"
          className="btn ghost"
          disabled={!canCapture || recording}
          onClick={takeScreenshot}
        >
          {busy === 'screenshot' ? 'Capturing…' : 'Capture other screen / tab'}
        </button>
        {!recording ? (
          <button
            type="button"
            className="btn ghost"
            disabled={!canCapture}
            onClick={startRecording}
          >
            {busy === 'record-start' ? 'Starting…' : 'Record other screen / tab'}
          </button>
        ) : (
          <button
            type="button"
            className="btn primary"
            disabled={busy === 'record-stop'}
            onClick={stopRecording}
          >
            {busy === 'record-stop'
              ? 'Saving…'
              : `Stop recording (${Math.min(elapsed, ST_MAX_RECORD_SECONDS)}s / ${ST_MAX_RECORD_SECONDS}s)`}
          </button>
        )}
      </div>
      <p className="muted st-capture__hint">
        Recordings stop automatically after {ST_MAX_RECORD_SECONDS} seconds. Works best on Chrome /
        Edge over HTTPS.
      </p>

      {error ? <div className="alert">{error}</div> : null}

      {success ? (
        <div
          ref={noticeRef}
          className="st-capture__success"
          role="status"
          aria-live="polite"
        >
          <FaCheckCircle aria-hidden />
          <span>{success}</span>
        </div>
      ) : null}

      {selected.length > 0 ? (
        <div ref={listRef} className="st-capture__attached">
          <div className="st-capture__attached-head">
            <strong>Attached for this ticket ({selected.length})</strong>
            <span className="muted">Shown here so you can confirm the capture was saved</span>
          </div>
          <ul className="st-capture__thumbs">
            {selected.map((file, index) => {
              const key = fileKey(file)
              const url = previews[key]
              const video = isVideoFile(file)
              const image = isImageFile(file)
              return (
                <li key={key} className="st-capture__thumb">
                  <div className="st-capture__thumb-media">
                    {image && url ? (
                      <img src={url} alt={file.name} />
                    ) : video && url ? (
                      <video src={url} muted playsInline preload="metadata" />
                    ) : (
                      <span className="st-capture__thumb-fallback">
                        <FaFileVideo aria-hidden />
                      </span>
                    )}
                  </div>
                  <div className="st-capture__thumb-meta">
                    <span className="st-capture__thumb-name" title={file.name}>
                      {file.name}
                    </span>
                    <span className="muted">{formatStFileSize(file.size)}</span>
                  </div>
                  {onChangeFiles ? (
                    <button
                      type="button"
                      className="st-capture__thumb-remove"
                      aria-label={`Remove ${file.name}`}
                      disabled={disabled}
                      onClick={() => removeAt(index)}
                    >
                      <FaTimes aria-hidden />
                    </button>
                  ) : null}
                </li>
              )
            })}
          </ul>
        </div>
      ) : null}
    </div>
  )
}
