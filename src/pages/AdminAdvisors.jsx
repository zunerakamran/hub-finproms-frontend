import { useEffect, useState } from 'react'
import { api } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { useHub } from '../context/HubContext'

export default function AdminAdvisors({ shell = 'client-admin' }) {
  const { isPowerAdmin } = useAuth()
  const { can, loading: hubLoading } = useHub()
  const [advisors, setAdvisors] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [result, setResult] = useState(null)
  const [file, setFile] = useState(null)

  const asPowerAdmin = shell === 'power-admin' || isPowerAdmin
  const enabled = can('advisor_excel_import')
  const eyebrow = asPowerAdmin ? 'Power Admin' : 'Client Admin'
  const apiOpts = { asPowerAdmin }

  const load = async () => {
    if (!enabled) {
      setLoading(false)
      return
    }
    setLoading(true)
    setError('')
    try {
      const data = await api.advisors({}, apiOpts)
      setAdvisors(data.data || data.advisors || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (hubLoading) return
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hubLoading, enabled, asPowerAdmin])

  const downloadTemplate = async () => {
    setError('')
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(api.advisorTemplateUrl(apiOpts), {
        headers: {
          Accept: 'text/csv',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      })
      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.message || 'Could not download template.')
      }
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'advisor-import-template.csv'
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      setError(err.message)
    }
  }

  const onImport = async (e) => {
    e.preventDefault()
    if (!file) {
      setError('Choose a CSV file to import.')
      return
    }
    setUploading(true)
    setError('')
    setMessage('')
    setResult(null)
    try {
      const data = await api.importAdvisors(file, apiOpts)
      setMessage(data.message || 'Import finished.')
      setResult(data)
      setFile(null)
      await load()
    } catch (err) {
      setError(err.message)
    } finally {
      setUploading(false)
    }
  }

  if (!hubLoading && !enabled) {
    return (
      <section>
        <div className="page-head">
          <div>
            <p className="eyebrow">{eyebrow}</p>
            <h1>Advisor import</h1>
            <p className="muted">
              Advisor Excel/CSV import is disabled for your role on this hub. Enable
              &quot;Import advisors (Excel/CSV)&quot; for Power Admin under Capabilities.
            </p>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section>
      <div className="page-head">
        <div>
          <p className="eyebrow">{eyebrow}</p>
          <h1>Advisor import</h1>
          <p className="muted">
            Upload a CSV of advisors (export from Excel). Imported advisors are marked subscribed
            with unlimited credits.
          </p>
        </div>
        <button type="button" className="btn ghost" onClick={downloadTemplate}>
          Download CSV template
        </button>
      </div>

      {error && <div className="alert">{error}</div>}
      {message && <div className="alert success">{message}</div>}

      <form className="admin-form advisor-import-form" onSubmit={onImport}>
        <h2>Upload advisors</h2>
        <p className="muted">
          Columns: <code>name</code>, <code>email</code>, optional <code>password</code>. If
          password is blank, a temporary password is generated (shown once after import). From
          Excel: <strong>File → Save As → CSV</strong>.
        </p>
        <label>
          CSV file
          <input
            type="file"
            accept=".csv,text/csv"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
          />
        </label>
        <div className="actions">
          <button className="btn primary" disabled={uploading || !file}>
            {uploading ? 'Importing...' : 'Import advisors'}
          </button>
        </div>
      </form>

      {result && (
        <div className="import-result">
          <h2>Import result</h2>
          <p className="muted">
            Created {result.summary?.created ?? 0}, updated {result.summary?.updated ?? 0}, skipped{' '}
            {result.summary?.skipped ?? 0}
          </p>

          {(result.created || []).length > 0 && (
            <div className="import-block">
              <h3>New advisors (save temporary passwords now)</h3>
              <div className="table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Temporary password</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.created.map((row) => (
                      <tr key={row.email}>
                        <td>{row.name}</td>
                        <td>{row.email}</td>
                        <td>
                          <code>{row.temporary_password || '—'}</code>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {(result.skipped || []).length > 0 && (
            <div className="import-block">
              <h3>Skipped rows</h3>
              <ul className="muted">
                {result.skipped.map((row) => (
                  <li key={`${row.row}-${row.email || 'x'}`}>
                    Row {row.row}
                    {row.email ? ` (${row.email})` : ''}: {row.reason}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <div className="advisor-list-block">
        <h2>Current advisors</h2>
        {loading ? (
          <div className="state">Loading...</div>
        ) : advisors.length === 0 ? (
          <div className="empty-state">
            <p className="muted">No advisors imported yet.</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Credits</th>
                </tr>
              </thead>
              <tbody>
                {advisors.map((advisor) => (
                  <tr key={advisor.id}>
                    <td>{advisor.name}</td>
                    <td>{advisor.email}</td>
                    <td>{advisor.has_unlimited_credits ? 'Unlimited' : advisor.credits}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  )
}
