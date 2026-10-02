import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import ActingAdvisorBanner from '../components/ActingAdvisorBanner'
import RequiredMark from '../components/RequiredMark'
import RichTextEditor, { isRichTextEmpty } from '../components/RichTextEditor'
import { useHub } from '../context/HubContext'
import SupportingFilesPicker from '../components/SupportingFilesPicker'
import {
  appendComplianceAttachments,
  appendSupportingFiles,
} from '../utils/complianceSupportingFiles'

export default function GeneralComplianceSubmit() {
  const { can, loading: hubLoading } = useHub()
  const navigate = useNavigate()

  const [description, setDescription] = useState('')
  const [contentType, setContentType] = useState('')
  const [types, setTypes] = useState([])
  const [typesLoading, setTypesLoading] = useState(true)
  const [attachments, setAttachments] = useState([])
  const [supportingFiles, setSupportingFiles] = useState([])
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
    setSaving(true)
    setError('')
    try {
      const form = new FormData()
      form.append('content_type', contentType)
      form.append('description', description)
      appendComplianceAttachments(form, attachments)
      appendSupportingFiles(form, supportingFiles)
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
            Choose a content type and describe the material. Attachments are the content under
            review; supporting files are optional evidence.
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
              {typesLoading ? 'Loading types…' : 'Select content type…'}
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

        <div className="admin-field">
          <span className="field-label-text">
            <RequiredMark>Description</RequiredMark>
          </span>
          <RichTextEditor
            rows={6}
            value={description}
            onChange={setDescription}
            placeholder="Describe the material for general compliance review…"
            required
          />
        </div>

        <SupportingFilesPicker
          id="gc-submit-attachments"
          label="Attachments (optional)"
          files={attachments}
          onChange={setAttachments}
        />

        <SupportingFilesPicker
          id="gc-submit-supporting-files"
          files={supportingFiles}
          onChange={setSupportingFiles}
        />

        <div className="actions">
          <button className="btn primary" disabled={saving || !types.length}>
            {saving ? 'Submitting…' : 'Submit request'}
          </button>
        </div>
      </form>
    </section>
  )
}
