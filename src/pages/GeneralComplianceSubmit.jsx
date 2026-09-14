import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import { useHub } from '../context/HubContext'
import { GC_ACCEPT } from '../utils/generalCompliance'

export default function GeneralComplianceSubmit() {
  const { can, loading: hubLoading } = useHub()
  const navigate = useNavigate()

  const [description, setDescription] = useState('')
  const [files, setFiles] = useState([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const moduleOn = can('module_general_compliance')
  const canSubmit = can('gc_submit_request')

  const onFiles = (list) => {
    const next = Array.from(list || []).slice(0, 10)
    setFiles(next)
  }

  const submit = async (event) => {
    event.preventDefault()
    if (!description.trim()) {
      setError('Description is required.')
      return
    }
    if (!files.length) {
      setError('Attach at least one file.')
      return
    }
    setSaving(true)
    setError('')
    try {
      const form = new FormData()
      form.append('description', description)
      files.forEach((file) => form.append('attachments[]', file))
      const data = await api.generalComplianceSubmit(form)
      navigate(`/my-dashboard/general-compliance/${data.data.id}`)
    } catch (err) {
      setError(err.message || 'Submit failed.')
    } finally {
      setSaving(false)
    }
  }

  if (!hubLoading && (!moduleOn || !canSubmit)) {
    return (
      <section>
        <div className="page-head">
          <div>
            <p className="eyebrow">General Compliance</p>
            <h1>New request</h1>
            <p className="muted">
              {!moduleOn
                ? 'General Compliance module is off for this hub.'
                : 'You do not have permission to submit general compliance requests.'}
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
          <p className="eyebrow">General Compliance</p>
          <h1>Submit for general compliance</h1>
          <p className="muted">
            Describe the material and attach supporting files (PDF, Office, images, ZIP — max 10
            files, 10MB each).
          </p>
        </div>
        <Link to="/my-dashboard/general-compliance" className="btn ghost">
          My requests
        </Link>
      </div>

      {error && <div className="alert">{error}</div>}

      <form className="admin-form" onSubmit={submit}>
        <label>
          Description
          <textarea
            rows={6}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe the material for general compliance review…"
            required
          />
        </label>

        <label>
          Attachments (required — up to 10)
          <input
            type="file"
            accept={GC_ACCEPT}
            multiple
            onChange={(e) => onFiles(e.target.files)}
          />
        </label>
        {files.length > 0 && (
          <ul className="gc-attach-list">
            {files.map((file) => (
              <li key={`${file.name}-${file.size}`}>
                {file.name}{' '}
                <span className="muted">({(file.size / (1024 * 1024)).toFixed(2)} MB)</span>
              </li>
            ))}
          </ul>
        )}

        <div className="actions">
          <button className="btn primary" disabled={saving}>
            {saving ? 'Submitting…' : 'Submit request'}
          </button>
        </div>
      </form>
    </section>
  )
}
