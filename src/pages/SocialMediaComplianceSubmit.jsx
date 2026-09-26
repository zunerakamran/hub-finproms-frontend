import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import ActingAdvisorBanner from '../components/ActingAdvisorBanner'
import { useHub } from '../context/HubContext'

function isVideoFile(file) {
  if (!file) return false
  if (file.type?.startsWith('video/')) return true
  return /\.(mp4|mov|webm)$/i.test(file.name || '')
}

export default function SocialMediaComplianceSubmit() {
  const { can, loading: hubLoading } = useHub()
  const navigate = useNavigate()

  const [description, setDescription] = useState('')
  const [attachment, setAttachment] = useState(null)
  const [preview, setPreview] = useState('')
  const [previewIsVideo, setPreviewIsVideo] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const moduleOn = can('module_social_media_compliance')
  const canSubmit = can('smc_submit_request')

  const onAttachment = (file) => {
    setAttachment(file || null)
    if (preview) URL.revokeObjectURL(preview)
    if (!file) {
      setPreview('')
      setPreviewIsVideo(false)
      return
    }
    setPreview(URL.createObjectURL(file))
    setPreviewIsVideo(isVideoFile(file))
  }

  const submit = async (event) => {
    event.preventDefault()
    if (!attachment) {
      setError('Please upload an image or video.')
      return
    }
    setSaving(true)
    setError('')
    try {
      const form = new FormData()
      form.append('description', description)
      form.append('attachment', attachment)
      const data = await api.socialMediaComplianceSubmit(form)
      navigate(`/my-dashboard/social-media-compliance/${data.data.id}`, {
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
            <p className="eyebrow">Social Media Compliance</p>
            <h1>New request</h1>
            <p className="muted">
              {!moduleOn
                ? 'Social Media Pre Approval module is off for this hub.'
                : 'You do not have permission to submit social media compliance requests.'}
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
          <p className="eyebrow">Social Media Compliance</p>
          <h1>Submit for social media compliance</h1>
          <p className="muted">
            Upload an image or video and describe the material for pre-approval review.
          </p>
          <ActingAdvisorBanner action="submissions" />
        </div>
        <Link to="/my-dashboard/social-media-compliance" className="btn ghost">
          My requests
        </Link>
      </div>

      {error && <div className="alert">{error}</div>}

      <form className="admin-form" onSubmit={submit}>
        <label>
          Description
          <textarea
            rows={5}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe the material for social media compliance review…"
            required
          />
        </label>

        <label>
          Attachment (image or video)
          <input
            type="file"
            accept="image/*,video/mp4,video/quicktime,video/webm,.mp4,.mov,.webm"
            required
            onChange={(e) => onAttachment(e.target.files?.[0])}
          />
        </label>
        {preview && (
          <div className="smc-thumb-wrap">
            {previewIsVideo ? (
              <video src={preview} className="smc-thumb" controls playsInline />
            ) : (
              <img src={preview} alt="Preview" className="smc-thumb" />
            )}
          </div>
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
