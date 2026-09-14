import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { api } from '../api/client'
import { useHub } from '../context/HubContext'

export default function SocialMediaComplianceSubmit() {
  const { can, loading: hubLoading } = useHub()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const initialPostId = searchParams.get('post_id') || ''

  const [purchases, setPurchases] = useState([])
  const [postId, setPostId] = useState(initialPostId)
  const [description, setDescription] = useState('')
  const [image, setImage] = useState(null)
  const [preview, setPreview] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [loadingPurchases, setLoadingPurchases] = useState(true)

  const moduleOn = can('module_social_media_compliance')
  const canSubmit = can('smc_submit_request')

  useEffect(() => {
    if (hubLoading || !canSubmit) {
      setLoadingPurchases(false)
      return
    }
    let cancelled = false
    setLoadingPurchases(true)
    api
      .myPurchases()
      .then((data) => {
        if (cancelled) return
        setPurchases(data.data || [])
      })
      .catch(() => {
        if (!cancelled) setPurchases([])
      })
      .finally(() => {
        if (!cancelled) setLoadingPurchases(false)
      })
    return () => {
      cancelled = true
    }
  }, [hubLoading, canSubmit])

  const onImage = (file) => {
    setImage(file || null)
    if (preview) URL.revokeObjectURL(preview)
    setPreview(file ? URL.createObjectURL(file) : '')
  }

  const submit = async (event) => {
    event.preventDefault()
    if (!postId) {
      setError('Select a purchased post.')
      return
    }
    setSaving(true)
    setError('')
    try {
      const form = new FormData()
      form.append('post_id', postId)
      form.append('description', description)
      if (image) form.append('image', image)
      const data = await api.socialMediaComplianceSubmit(form)
      navigate(`/my-dashboard/social-media-compliance/${data.data.id}`)
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
                ? 'Social Media Compliance module is off for this hub.'
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
            Send a purchased post for review. You can attach an updated image or use the post
            attachment.
          </p>
        </div>
        <Link to="/my-dashboard/social-media-compliance" className="btn ghost">
          My requests
        </Link>
      </div>

      {error && <div className="alert">{error}</div>}

      <form className="admin-form" onSubmit={submit}>
        <label>
          Purchased post
          <select
            value={postId}
            onChange={(e) => setPostId(e.target.value)}
            required
            disabled={loadingPurchases}
          >
            <option value="">Select a post…</option>
            {purchases.map((p) => {
              const id = p.post_id || p.post?.id
              const title = p.post?.title || `Post #${id}`
              return (
                <option key={id} value={id}>
                  {title}
                </option>
              )
            })}
          </select>
        </label>

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
          Image (optional — defaults to post attachment)
          <input
            type="file"
            accept="image/*"
            onChange={(e) => onImage(e.target.files?.[0])}
          />
        </label>
        {preview && (
          <div className="smc-thumb-wrap">
            <img src={preview} alt="Preview" className="smc-thumb" />
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
