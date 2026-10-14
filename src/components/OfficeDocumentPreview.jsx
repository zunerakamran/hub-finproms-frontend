import { useEffect, useRef, useState } from 'react'
import { fileExtension } from '../utils/fileDisplay'

/**
 * Client-side preview for Word / Excel / PowerPoint blobs.
 * Sensitive GC files stay in-memory (authenticated fetch) — never uploaded to a public viewer.
 */
export default function OfficeDocumentPreview({ blob, kind, name }) {
  const hostRef = useRef(null)
  const pptxRef = useRef(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [sheetNames, setSheetNames] = useState([])
  const [activeSheet, setActiveSheet] = useState(0)
  const workbookRef = useRef(null)

  useEffect(() => {
    let cancelled = false
    const host = hostRef.current

    async function renderExcelSheet(wb, sheetIndex, XLSX) {
      if (!host || cancelled) return
      const names = wb.SheetNames || []
      const sheetName = names[sheetIndex] || names[0]
      if (!sheetName) {
        throw new Error('This spreadsheet has no sheets to preview.')
      }
      const sheet = wb.Sheets[sheetName]
      const html = XLSX.utils.sheet_to_html(sheet, { editable: false })
      host.innerHTML = `<div class="office-preview__sheet">${html}</div>`
    }

    async function run() {
      if (!blob || !host) return
      setLoading(true)
      setError('')
      setSheetNames([])
      setActiveSheet(0)
      workbookRef.current = null
      host.innerHTML = ''

      const ext = fileExtension(name)
      try {
        if (kind === 'word') {
          if (ext === 'doc' || ext === 'rtf' || ext === 'odt') {
            throw new Error(
              'Only .docx Word files can be previewed in the browser. Download to open this file.'
            )
          }
          const docx = await import('docx-preview')
          if (cancelled) return
          await docx.renderAsync(blob, host, undefined, {
            className: 'docx',
            inWrapper: true,
            ignoreWidth: false,
            breakPages: true,
            renderHeaders: true,
            renderFooters: true,
          })
        } else if (kind === 'excel') {
          const XLSX = await import('xlsx')
          if (cancelled) return
          const buffer = await blob.arrayBuffer()
          if (cancelled) return
          const wb = XLSX.read(buffer, { type: 'array' })
          workbookRef.current = { wb, XLSX }
          setSheetNames(wb.SheetNames || [])
          await renderExcelSheet(wb, 0, XLSX)
        } else if (kind === 'powerpoint') {
          if (ext === 'ppt' || ext === 'odp') {
            throw new Error(
              'Only .pptx PowerPoint files can be previewed in the browser. Download to open this file.'
            )
          }
          const { init } = await import('pptx-preview')
          if (cancelled) return
          const width = Math.max(480, Math.min(960, host.clientWidth || 800))
          const height = Math.round((width * 9) / 16)
          const viewer = init(host, { width, height })
          pptxRef.current = viewer
          const buffer = await blob.arrayBuffer()
          if (cancelled) return
          await viewer.preview(buffer)
        } else {
          throw new Error('This file type cannot be previewed in the browser.')
        }
      } catch (err) {
        if (!cancelled) {
          setError(err?.message || 'Unable to preview this document.')
          host.innerHTML = ''
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    run()

    return () => {
      cancelled = true
      try {
        pptxRef.current?.destroy?.()
      } catch {
        //
      }
      pptxRef.current = null
      if (host) host.innerHTML = ''
    }
  }, [blob, kind, name])

  async function selectSheet(index) {
    const pack = workbookRef.current
    const host = hostRef.current
    if (!pack || !host) return
    setActiveSheet(index)
    setError('')
    try {
      const names = pack.wb.SheetNames || []
      const sheetName = names[index]
      const sheet = pack.wb.Sheets[sheetName]
      const html = pack.XLSX.utils.sheet_to_html(sheet, { editable: false })
      host.innerHTML = `<div class="office-preview__sheet">${html}</div>`
    } catch (err) {
      setError(err?.message || 'Unable to open that sheet.')
    }
  }

  return (
    <div className="office-preview">
      {kind === 'excel' && sheetNames.length > 1 ? (
        <div className="office-preview__sheets" role="tablist" aria-label="Sheets">
          {sheetNames.map((sheetName, index) => (
            <button
              key={`${sheetName}-${index}`}
              type="button"
              role="tab"
              aria-selected={activeSheet === index}
              className={
                activeSheet === index
                  ? 'btn ghost office-preview__sheet-tab is-active'
                  : 'btn ghost office-preview__sheet-tab'
              }
              onClick={() => selectSheet(index)}
            >
              {sheetName}
            </button>
          ))}
        </div>
      ) : null}
      {loading ? <p className="muted office-preview__status">Preparing preview…</p> : null}
      {error ? (
        <div className="office-preview__error" role="alert">
          <p>{error}</p>
        </div>
      ) : null}
      <div
        ref={hostRef}
        className={`office-preview__host office-preview__host--${kind || 'file'}`}
        hidden={Boolean(error)}
      />
    </div>
  )
}
