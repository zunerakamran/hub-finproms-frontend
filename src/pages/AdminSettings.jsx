import { useEffect, useState } from 'react'
import AdminSubnav from '../components/AdminSubnav'
import { api } from '../api/client'

export default function AdminSettings() {
  const [newBannerDays, setNewBannerDays] = useState(7)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const data = await api.adminSettings()
      setNewBannerDays(data.settings?.new_banner_days ?? 7)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const onSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    setMessage('')
    try {
      const data = await api.updateSettings({
        new_banner_days: Number(newBannerDays),
      })
      setNewBannerDays(data.settings?.new_banner_days ?? Number(newBannerDays))
      setMessage(data.message || 'Settings saved.')
    } catch (err) {
      setError(err.data?.errors?.new_banner_days?.[0] || err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <section>
      <div className="page-head">
        <div>
          <p className="eyebrow">Client Admin</p>
          <h1>Settings</h1>
          <p className="muted">Hub options stored in the database (not hard-coded).</p>
        </div>
        <AdminSubnav />
      </div>

      {loading ? (
        <div className="state">Loading...</div>
      ) : (
        <form className="admin-form" onSubmit={onSubmit}>
          {error && <div className="alert">{error}</div>}
          {message && <div className="alert success">{message}</div>}
          <label>
            NEW banner duration (days)
            <input
              type="number"
              min="0"
              max="365"
              required
              value={newBannerDays}
              onChange={(e) => setNewBannerDays(e.target.value)}
            />
          </label>
          <p className="muted">
            Posts and reels newer than this many days show a NEW banner on the listing. Set to 0 to
            disable.
          </p>
          <div className="actions">
            <button className="btn primary" disabled={saving}>
              {saving ? 'Saving...' : 'Save settings'}
            </button>
          </div>
        </form>
      )}
    </section>
  )
}
