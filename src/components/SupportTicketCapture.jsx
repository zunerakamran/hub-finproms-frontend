/* eslint-disable react/prop-types -- local capture controls; matches other ST helpers */
import { useEffect, useRef, useState } from 'react'
import {
  ST_MAX_RECORD_SECONDS,
  captureScreenScreenshot,
  startScreenRecording,
} from '../utils/screenCapture'

/**
 * In-app screen screenshot + short recording for support ticket attachments.
 */
export default function SupportTicketCapture({
  files = [],
  onAddFiles,
  maxFiles = 8,
  disabled = false,
}) {
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const [recording, setRecording] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const sessionRef = useRef(null)
  const tickRef = useRef(null)

  const remainingSlots = Math.max(0, maxFiles - (files?.length || 0))
  const canCapture = !disabled && remainingSlots > 0 && !busy

  useEffect(() => {
    return () => {
      if (tickRef.current) clearInterval(tickRef.current)
      sessionRef.current?.cancel?.()
      sessionRef.current = null
    }
  }, [])

  const addFiles = (incoming) => {
    const list = (Array.isArray(incoming) ? incoming : [incoming]).filter(Boolean)
    if (!list.length) return
    onAddFiles?.(list.slice(0, remainingSlots))
  }

  const takeScreenshot = async () => {
    setError('')
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
    </div>
  )
}
