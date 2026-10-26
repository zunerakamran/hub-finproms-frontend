import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { useHub } from '../context/HubContext'

const emptySettings = {
  network_pays_all: true,
  firms_pay_own: false,
  users_pay_own: false,
  network_resells: false,
  reseller_invoice_text: '',
  reseller_invoice_format: 'standard',
  reseller_logo_url: null,
  reseller_logo_name: null,
  reseller_invoice_formats: ['standard', 'compact', 'detailed'],
  explanations: {},
}

export default function AdminModuleInvoiceSettings({ shell = 'client-admin' }) {
  const { isPowerAdmin } = useAuth()
  const { can, loading: hubLoading, actingHub, hub } = useHub()
  const [settings, setSettings] = useState(emptySettings)
  const [logoFile, setLogoFile] = useState(null)
  const [clearLogo, setClearLogo] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [targetHub, setTargetHub] = useState(null)

  const asPowerAdmin = shell === 'power-admin' || isPowerAdmin
  const enabled = can('dashboard_manage_module_invoice_settings')
  const apiOpts = { asPowerAdmin }

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const data = await api.moduleInvoiceSettings(apiOpts)
      setSettings({ ...emptySettings, ...(data.settings || {}) })
      setTargetHub(data.target_hub || null)
      setLogoFile(null)
      setClearLogo(false)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (hubLoading) return
    if (!enabled) {
      setLoading(false)
      return
    }
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hubLoading, enabled, asPowerAdmin, actingHub?.id])

  const setFlag = (key, checked) => {
    setSettings((prev) => {
      const next = { ...prev, [key]: checked }
      if (key === 'network_pays_all' && checked) {
        next.firms_pay_own = false
        next.users_pay_own = false
      }
      // Cannot leave the “who pays?” group empty — keep Network pays all on.
      if (key === 'network_pays_all' && !checked) {
        if (!next.firms_pay_own && !next.users_pay_own) {
          next.network_pays_all = true
        }
      }
      if (key === 'network_resells' && checked) {
        next.users_pay_own = false
      }
      if ((key === 'firms_pay_own' || key === 'users_pay_own') && checked) {
        next.network_pays_all = false
      }
      if ((key === 'firms_pay_own' || key === 'users_pay_own') && !checked) {
        if (!next.firms_pay_own && !next.users_pay_own) {
          next.network_pays_all = true
        }
      }
      return next
    })
  }

  const networkPaysAllLocked =
    !!settings.network_pays_all && !settings.firms_pay_own && !settings.users_pay_own

  const onSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    setMessage('')
    try {
      const body = new FormData()
      body.append('network_pays_all', settings.network_pays_all ? '1' : '0')
      body.append('firms_pay_own', settings.firms_pay_own ? '1' : '0')
      body.append('users_pay_own', settings.users_pay_own ? '1' : '0')
      body.append('network_resells', settings.network_resells ? '1' : '0')
      body.append('reseller_invoice_text', settings.reseller_invoice_text || '')
      body.append('reseller_invoice_format', settings.reseller_invoice_format || 'standard')
      if (clearLogo) body.append('clear_reseller_logo', '1')
      if (logoFile) body.append('reseller_logo', logoFile)

      const data = await api.updateModuleInvoiceSettings(body, apiOpts)
      setSettings({ ...emptySettings, ...(data.settings || {}) })
      setLogoFile(null)
      setClearLogo(false)
      const synced = Array.isArray(data.capabilities_synced) ? data.capabilities_synced : []
      let msg = data.message || 'Module invoice settings updated.'
      if (synced.length) {
        const summary = synced
          .slice(0, 8)
          .map((row) => `${row.role}: ${row.capability}`)
          .join('; ')
        msg += ` Enabled: ${summary}${synced.length > 8 ? '…' : ''}.`
      }
      setMessage(msg)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  if (!hubLoading && !enabled) {
    return (
      <section>
        <div className="page-head">
          <div>
            <p className="eyebrow">Modules</p>
            <h1>Module invoice settings</h1>
            <p className="muted">
              Enable &quot;Module invoice / payment settings&quot; for your role under Power Admin →
              Capabilities (Modules pricing group).
            </p>
          </div>
        </div>
      </section>
    )
  }

  const explanations = settings.explanations || {}

  return (
    <section>
      <div className="page-head">
        <div>
          <p className="eyebrow">Modules</p>
          <h1>Module invoice / payment settings</h1>
          <p className="muted">
            Who pays module invoices for{' '}
            <strong>{targetHub?.name || actingHub?.name || hub?.name || 'this hub'}</strong>. Card
            details are managed on <Link to="/my-dashboard/payment-card">Payment card</Link>. View
            invoices on <Link to="/my-dashboard/module-invoices">Module invoices</Link>.
          </p>
        </div>
      </div>

      {error && <div className="alert">{error}</div>}
      {message && <div className="alert success">{message}</div>}

      {loading ? (
        <div className="state">Loading...</div>
      ) : (
        <form className="admin-form" onSubmit={onSubmit}>
          <h2>Who pays?</h2>
          <p className="muted">
            Saving a payer mode also turns on matching Capabilities (payment card + who can see
            those invoices) for the usual roles. Power Admin can still change any cell in
            Capabilities. Caps are never auto-turned off.
          </p>

          <label className="checklist-item">
            <input
              type="checkbox"
              checked={!!settings.network_pays_all}
              disabled={networkPaysAllLocked}
              onChange={(e) => setFlag('network_pays_all', e.target.checked)}
            />
            <span>
              <strong>Network pays all invoices</strong>
              <small className="muted" style={{ display: 'block' }}>
                {explanations.network_pays_all ||
                  'Network pays every pricing unit (one-time and ongoing). Unchecks firm and user options.'}
                {networkPaysAllLocked
                  ? ' Select firm or user pays first if you want to turn this off.'
                  : ''}
              </small>
            </span>
          </label>

          <label className="checklist-item">
            <input
              type="checkbox"
              checked={!!settings.firms_pay_own}
              onChange={(e) => setFlag('firms_pay_own', e.target.checked)}
            />
            <span>
              <strong>Each firm pays its own invoice</strong>
              <small className="muted" style={{ display: 'block' }}>
                {explanations.firms_pay_own ||
                  'When the unit is per firm, one invoice is created per firm. Other units stay with the network.'}
              </small>
            </span>
          </label>

          <label className="checklist-item">
            <input
              type="checkbox"
              checked={!!settings.users_pay_own}
              disabled={!!settings.network_resells}
              onChange={(e) => setFlag('users_pay_own', e.target.checked)}
            />
            <span>
              <strong>Users pay their own invoice</strong>
              <small className="muted" style={{ display: 'block' }}>
                {explanations.users_pay_own ||
                  'When the unit is per user / per user (slots), one invoice is created per user. Other units stay with the network.'}
              </small>
            </span>
          </label>

          <hr style={{ margin: '1.25rem 0', border: 0, borderTop: '1px solid #e5e7eb' }} />

          <h2>Network reseller (optional)</h2>
          <p className="muted">
            Network pays the platform for all module invoices, then may re-charge users with its own
            pricing. Branded logo + text appear on invoices.
          </p>

          <label className="checklist-item">
            <input
              type="checkbox"
              checked={!!settings.network_resells}
              onChange={(e) => setFlag('network_resells', e.target.checked)}
            />
            <span>
              <strong>Network pays us, then charges users itself</strong>
              <small className="muted" style={{ display: 'block' }}>
                {explanations.network_resells ||
                  'Disables “users pay own”. Requires logo and invoice text.'}
              </small>
            </span>
          </label>

          {settings.network_resells && (
            <>
              <label>
                Invoice format
                <select
                  value={settings.reseller_invoice_format || 'standard'}
                  onChange={(e) =>
                    setSettings({ ...settings, reseller_invoice_format: e.target.value })
                  }
                  required
                >
                  {(settings.reseller_invoice_formats || ['standard', 'compact', 'detailed']).map(
                    (fmt) => (
                      <option key={fmt} value={fmt}>
                        {fmt}
                      </option>
                    )
                  )}
                </select>
              </label>
              <label>
                Text on invoice
                <textarea
                  rows={4}
                  maxLength={5000}
                  required={!!settings.network_resells}
                  value={settings.reseller_invoice_text || ''}
                  onChange={(e) =>
                    setSettings({ ...settings, reseller_invoice_text: e.target.value })
                  }
                  placeholder="Shown on branded invoices when the network re-charges users."
                />
              </label>
              <label>
                Logo on invoice
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    setLogoFile(e.target.files?.[0] || null)
                    setClearLogo(false)
                  }}
                />
              </label>
              {settings.reseller_logo_url && !clearLogo ? (
                <div className="muted" style={{ marginBottom: 8 }}>
                  Current logo: {settings.reseller_logo_name || 'uploaded'}{' '}
                  <a href={settings.reseller_logo_url} target="_blank" rel="noreferrer">
                    preview
                  </a>
                  {' · '}
                  <button
                    type="button"
                    className="btn ghost"
                    onClick={() => {
                      setClearLogo(true)
                      setLogoFile(null)
                    }}
                  >
                    Remove
                  </button>
                </div>
              ) : null}
              {clearLogo ? (
                <p className="muted">Logo will be removed on save (unless you upload a new one).</p>
              ) : null}
            </>
          )}

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
