import { useEffect, useState } from 'react'
import { api } from '../api/client'
import FileDropzone from '../components/FileDropzone'
import { useHub } from '../context/HubContext'
import { PAGE_CONTENT_FIELDS } from '../utils/pageContent'

function emptyPageContent() {
  const next = {}
  for (const section of Object.keys(PAGE_CONTENT_FIELDS)) {
    next[section] = {}
    for (const field of PAGE_CONTENT_FIELDS[section].fields) {
      next[section][field.key] = ''
    }
  }
  return next
}

export default function AdminPageContent() {
  const { refreshHub, actingHubId } = useHub()
  const [pageContent, setPageContent] = useState(emptyPageContent)
  const [pageSection, setPageSection] = useState('home')
  const [poweredByLogoFile, setPoweredByLogoFile] = useState(null)
  const [poweredByLogoPreview, setPoweredByLogoPreview] = useState('')
  const [removePoweredByLogo, setRemovePoweredByLogo] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [importSources, setImportSources] = useState([])
  const [sourceHubId, setSourceHubId] = useState('')
  const [importing, setImporting] = useState(false)

  const applyPageContent = (incoming) => {
    const next = emptyPageContent()
    const source = incoming || {}
    for (const section of Object.keys(next)) {
      for (const key of Object.keys(next[section])) {
        next[section][key] = source?.[section]?.[key] ?? ''
      }
    }
    setPageContent(next)
    setPoweredByLogoFile(null)
    setPoweredByLogoPreview('')
    setRemovePoweredByLogo(false)
  }

  const setPageField = (section, key, value) => {
    setPageContent((prev) => ({
      ...prev,
      [section]: {
        ...(prev[section] || {}),
        [key]: value,
      },
    }))
  }

  const load = async () => {
    setLoading(true)
    setError('')
    setMessage('')
    try {
      const [data, sourcesData] = await Promise.all([
        api.adminPageContent(),
        api.pageContentImportSources().catch(() => ({ sources: [] })),
      ])
      applyPageContent(data.page_content)
      const sources = Array.isArray(sourcesData?.sources) ? sourcesData.sources : []
      setImportSources(sources)
      setSourceHubId((prev) => {
        if (prev && sources.some((row) => String(row.id) === String(prev))) return prev
        return sources[0] ? String(sources[0].id) : ''
      })
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [actingHubId])

  useEffect(() => {
    if (!poweredByLogoFile) {
      setPoweredByLogoPreview('')
      return undefined
    }
    const url = URL.createObjectURL(poweredByLogoFile)
    setPoweredByLogoPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [poweredByLogoFile])

  const onRemovePoweredByLogo = () => {
    setPoweredByLogoFile(null)
    setPoweredByLogoPreview('')
    setRemovePoweredByLogo(true)
    setPageField('home', 'footer_powered_by_logo', '')
  }

  const displayedPoweredByLogo =
    poweredByLogoPreview ||
    (!removePoweredByLogo ? pageContent?.home?.footer_powered_by_logo || '' : '')

  const onSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    setMessage('')
    try {
      const fd = new FormData()
      fd.append('page_content', JSON.stringify(pageContent))
      if (poweredByLogoFile) {
        fd.append('footer_powered_by_logo', poweredByLogoFile)
      }
      if (removePoweredByLogo && !poweredByLogoFile) {
        fd.append('remove_footer_powered_by_logo', '1')
      }

      const data = await api.updatePageContent(fd)
      applyPageContent(data.page_content)
      await refreshHub({ silent: true })
      setMessage(data.message || 'Website content saved.')
    } catch (err) {
      const errors = err.data?.errors || {}
      setError(errors.footer_powered_by_logo?.[0] || errors.page_content?.[0] || err.message)
    } finally {
      setSaving(false)
    }
  }

  const onImport = async () => {
    if (!sourceHubId) return
    const source = importSources.find((row) => String(row.id) === String(sourceHubId))
    const sourceName = source?.name || 'the selected hub'
    if (
      !window.confirm(
        `Replace this hub’s website content with the copy from “${sourceName}”? Unsaved edits on this page will be lost.`
      )
    ) {
      return
    }

    setImporting(true)
    setError('')
    setMessage('')
    try {
      const data = await api.importPageContent(Number(sourceHubId))
      applyPageContent(data.page_content)
      await refreshHub({ silent: true })
      setMessage(data.message || `Website content imported from ${sourceName}.`)
    } catch (err) {
      setError(err.message)
    } finally {
      setImporting(false)
    }
  }

  return (
    <section>
      <div className="page-head">
        <div>
          <p className="eyebrow">Hub</p>
          <h1>Website content</h1>
          <p className="muted">
            Edit headings, paragraphs, and button labels for the public Home page, Posts/Reels
            catalog, and post detail.
          </p>
        </div>
      </div>

      {loading ? (
        <div
          className="dash-panel dash-panel--loading"
          role="status"
          aria-live="polite"
          aria-label="Loading website content"
        >
          <div className="page-loader__spinner" />
        </div>
      ) : (
        <form className="admin-form settings-form" onSubmit={onSubmit}>
          {error && <div className="alert">{error}</div>}
          {message && <div className="alert success">{message}</div>}

          {importSources.length > 0 ? (
            <div className="settings-block dash-nav-import">
              <h2>Import from another hub</h2>
              <p className="muted form-hint">
                Copy Home / catalog / post detail page copy from a hub you’ve already set up (for
                example another white-labelled hub). This replaces the website content on the hub
                you’re currently managing.
              </p>
              <div className="dash-nav-import__row">
                <label>
                  Source hub
                  <select
                    value={sourceHubId}
                    onChange={(e) => setSourceHubId(e.target.value)}
                    disabled={importing || saving}
                  >
                    {importSources.map((hub) => (
                      <option key={hub.id} value={hub.id}>
                        {hub.label || hub.name}
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  type="button"
                  className="btn primary"
                  disabled={importing || saving || !sourceHubId}
                  onClick={onImport}
                >
                  {importing ? 'Importing...' : 'Import content'}
                </button>
              </div>
            </div>
          ) : null}

          <div className="settings-block">
            <p className="muted form-hint">
              Use *italic* and **bold** in headings/leads. Placeholders like {'{credits}'},{' '}
              {'{date}'}, and {'{count}'} are filled automatically.
            </p>

            <div className="page-content-tabs" role="tablist" aria-label="Page content sections">
              {Object.entries(PAGE_CONTENT_FIELDS).map(([key, section]) => (
                <button
                  key={key}
                  type="button"
                  role="tab"
                  aria-selected={pageSection === key}
                  className={`page-content-tabs__btn${pageSection === key ? ' is-active' : ''}`}
                  onClick={() => setPageSection(key)}
                >
                  {section.label}
                </button>
              ))}
            </div>

            {PAGE_CONTENT_FIELDS[pageSection]?.hint ? (
              <p className="muted form-hint">{PAGE_CONTENT_FIELDS[pageSection].hint}</p>
            ) : null}

            <div className="page-content-fields">
              {(PAGE_CONTENT_FIELDS[pageSection]?.fields || []).map((field) => {
                if (field.type === 'image' && field.key === 'footer_powered_by_logo') {
                  return (
                    <div key={`${pageSection}-${field.key}`} className="page-content-image-field">
                      <FileDropzone
                        id="settings-powered-by-logo"
                        label={field.label}
                        accept="image/*"
                        hint={field.hint}
                        files={poweredByLogoFile ? [poweredByLogoFile] : []}
                        onChange={(next) => {
                          setPoweredByLogoFile(next[0] || null)
                          setRemovePoweredByLogo(false)
                        }}
                        disabled={saving}
                      />
                      {displayedPoweredByLogo ? (
                        <div className="settings-logo-preview">
                          <img src={displayedPoweredByLogo} alt="Powered by logo preview" />
                          <button
                            type="button"
                            className="btn ghost"
                            onClick={onRemovePoweredByLogo}
                          >
                            Remove logo
                          </button>
                        </div>
                      ) : (
                        <p className="muted">No Powered by logo set.</p>
                      )}
                    </div>
                  )
                }

                return (
                  <label key={`${pageSection}-${field.key}`}>
                    {field.label}
                    {field.multiline ? (
                      <textarea
                        rows={3}
                        value={pageContent?.[pageSection]?.[field.key] ?? ''}
                        onChange={(e) => setPageField(pageSection, field.key, e.target.value)}
                      />
                    ) : (
                      <input
                        value={pageContent?.[pageSection]?.[field.key] ?? ''}
                        onChange={(e) => setPageField(pageSection, field.key, e.target.value)}
                      />
                    )}
                    {field.hint ? <span className="muted form-hint">{field.hint}</span> : null}
                  </label>
                )
              })}
            </div>
          </div>

          <div className="actions sticky-actions">
            <button className="btn primary" disabled={saving}>
              {saving ? 'Saving...' : 'Save website content'}
            </button>
          </div>
        </form>
      )}
    </section>
  )
}
