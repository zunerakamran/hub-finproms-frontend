import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import ActingAdvisorBanner from '../components/ActingAdvisorBanner'
import RequiredMark from '../components/RequiredMark'
import RichTextEditor, { isRichTextEmpty } from '../components/RichTextEditor'
import { useHub } from '../context/HubContext'
import { GC_ACCEPT } from '../utils/generalCompliance'

export default function GeneralComplianceSubmit() {
  const { can, loading: hubLoading } = useHub()
  const navigate = useNavigate()

  const [description, setDescription] = useState('')
  const [contentType, setContentType] = useState('')
  const [types, setTypes] = useState([])
  const [typesLoading, setTypesLoading] = useState(true)
  const [files, setFiles] = useState([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const moduleOn = can('module_general_compliance')
  const canSubmit = can('gc_submit_request')

  useEffect(() => {
    if (hubLoading || !moduleOn || !canSubmit) {
      setTypesLoading(false)
      return
    }
    let cancelled = false
    setTypesLoading(true)
    api
      .generalComplianceContentTypes()
      .then((data) => {
        if (cancelled) return
        const list = data.types || []
        setTypes(list)
        if (list.length === 1) setContentType(list[0].name)
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || 'Failed to load content types.')
      })
      .finally(() => {
        if (!cancelled) setTypesLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [hubLoading, moduleOn, canSubmit])

  const onFiles = (list) => {
    const next = Array.from(list || []).slice(0, 10)
    setFiles(next)
  }

  const submit = async (event) => {
    event.preventDefault()
    if (!contentType) {
      setError('Select a content type.')
      return
    }
    if (isRichTextEmpty(description)) {
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
      form.append('content_type', contentType)
      form.append('description', description)
      files.forEach((file) => form.append('attachments[]', file))
      const data = await api.generalComplianceSubmit(form)
      navigate(`/my-dashboard/general-compliance/${data.data.id}`, {
        state: { from: 'submit' },
      })
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
                ? 'Generic Content Pre Approval module is off for this hub.'
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
            Choose a content type, describe the material, and attach supporting files (PDF, Office,
            images, ZIP — max 10 files, 10MB each).
          </p>
          <ActingAdvisorBanner action="submissions" />
        </div>
        <Link to="/my-dashboard/general-compliance" className="btn ghost">
          My requests
        </Link>
      </div>

      {error && <div className="alert">{error}</div>}

      <form className="admin-form" onSubmit={submit}>
        <label>
          <RequiredMark>Content type</RequiredMark>
          <select
            value={contentType}
            onChange={(e) => setContentType(e.target.value)}
            required
            disabled={typesLoading || !types.length}
          >
            <option value="">
              {typesLoading
                ? 'Loading…'
                : types.length
                  ? 'Select content type…'
                  : 'No content types configured'}
            </option>
            {types.map((type) => (
              <option key={type.id} value={type.name}>
                {type.name}
              </option>
            ))}
          </select>
        </label>
        {!typesLoading && !types.length && (
          <p className="muted">
            Ask a hub admin to add content types under General Compliance → Content types (capability:{' '}
            Manage general compliance content types).
          </p>
        )}

        <label>
          <RequiredMark>Description</RequiredMark>
          <RichTextEditor
            rows={6}
            value={description}
            onChange={setDescription}
            placeholder="Describe the material for general compliance review…"
            required
          />
        </label>

        <label>
          <RequiredMark after="(up to 10)">Attachments</RequiredMark>
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
          <button className="btn primary" disabled={saving || !types.length}>
            {saving ? 'Submitting…' : 'Submit request'}
          </button>
        </div>
      </form>
    </section>
  )
}
