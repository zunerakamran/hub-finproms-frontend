import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import RequiredMark from '../components/RequiredMark'
import { useHub } from '../context/HubContext'
import { filterAvailableTaxTargets } from '../utils/taxonomyAddRequests'

export default function TaxonomyAddRequestSubmit() {
  const { can, loading: hubLoading, isControlPlane } = useHub()
  const navigate = useNavigate()

  const [targets, setTargets] = useState([])
  const [optionsLoading, setOptionsLoading] = useState(true)
  const [target, setTarget] = useState('')
  const [proposedName, setProposedName] = useState('')
  const [remarks, setRemarks] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const canRequest = can('taxonomy_request_add')

  const availableTargets = useMemo(
    () => filterAvailableTaxTargets(targets, { isControlPlane, can }),
    [targets, isControlPlane, can]
  )

  useEffect(() => {
    if (hubLoading || !canRequest) {
      setOptionsLoading(false)
      return
    }
    let cancelled = false
    setOptionsLoading(true)
    api
      .taxonomyAddRequestsOptions()
      .then((data) => {
        if (cancelled) return
        setTargets(data.targets || [])
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || 'Failed to load options.')
      })
      .finally(() => {
        if (!cancelled) setOptionsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [hubLoading, canRequest])

  useEffect(() => {
    if (!target) return
    if (!availableTargets.some((item) => item.key === target)) {
      setTarget('')
    }
  }, [availableTargets, target])

  const submit = async (event) => {
    event.preventDefault()
    if (!target) {
      setError('Select what you want to add.')
      return
    }
    if (!proposedName.trim()) {
      setError('A proposed name is required.')
      return
    }
    if (!remarks.trim()) {
      setError('Please add remarks explaining why this option is needed.')
      return
    }
    setSaving(true)
    setError('')
    try {
      const data = await api.taxonomyAddRequestsSubmit({
        target,
        proposed_name: proposedName.trim(),
        remarks: remarks.trim(),
      })
      navigate(`/my-dashboard/taxonomy-add-requests/${data.data.id}`, {
        state: { from: 'submit' },
      })
    } catch (err) {
      setError(err.message || 'Submit failed.')
    } finally {
      setSaving(false)
    }
  }

  if (!hubLoading && !canRequest) {
    return (
      <section>
        <div className="page-head">
          <div>
            <p className="eyebrow">Taxonomy requests</p>
            <h1>New request</h1>
            <p className="muted">You do not have permission to request new taxonomy options.</p>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section>
      <div className="page-head">
        <div>
          <p className="eyebrow">Taxonomy requests</p>
          <h1>Request a new option</h1>
          <p className="muted">
            Request an SM Templates Library category or tag, a Generic Compliance content type, or a
            firm document category. Reviewers create the option manually, then mark the request
            Approved — or reject.
          </p>
        </div>
        <Link to="/my-dashboard/taxonomy-add-requests" className="btn ghost">
          My requests
        </Link>
      </div>

      {error && <div className="alert">{error}</div>}

      <form className="admin-form" onSubmit={submit}>
        <label>
          <RequiredMark>What do you want to add?</RequiredMark>
          <select
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            required
            disabled={optionsLoading}
          >
            <option value="">
              {optionsLoading ? 'Loading options…' : 'Select taxonomy type…'}
            </option>
            {availableTargets.map((item) => (
              <option key={item.key} value={item.key}>
                {item.label}
                {item.central_only ? ' (Central)' : ''}
              </option>
            ))}
          </select>
        </label>

        {!optionsLoading && availableTargets.length === 0 && (
          <p className="muted">
            No requestable taxonomy options are available on this hub right now. Enable Generic
            Compliance and/or Firm documents if you need those request types.
          </p>
        )}

        <label>
          <RequiredMark>Proposed name</RequiredMark>
          <input
            type="text"
            value={proposedName}
            onChange={(e) => setProposedName(e.target.value)}
            placeholder="e.g. Retirement Planning"
            required
            maxLength={100}
          />
        </label>

        <label>
          <RequiredMark>Remarks</RequiredMark>
          <textarea
            rows={5}
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            placeholder="Why is this needed? Where will it be used?"
            required
            maxLength={5000}
          />
        </label>

        <div className="actions">
          <button
            className="btn primary"
            disabled={saving || optionsLoading || availableTargets.length === 0}
          >
            {saving ? 'Submitting…' : 'Submit request'}
          </button>
        </div>
      </form>
    </section>
  )
}
