import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { api } from '../api/client'
import { useAuth } from '../context/AuthContext'

export default function ContentPurchaseSuccess() {
  const [params] = useSearchParams()
  const sessionId = params.get('session_id')
  const { setUser, refreshUser } = useAuth()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      if (!sessionId) {
        setError('Missing Stripe session.')
        setLoading(false)
        return
      }
      try {
        const data = await api.confirmContentPurchase(sessionId)
        if (cancelled) return
        setResult(data)
        if (data.user) setUser(data.user)
        else await refreshUser()
      } catch (err) {
        if (!cancelled) setError(err.message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    run()
    return () => {
      cancelled = true
    }
  }, [sessionId, setUser, refreshUser])

  if (loading) return <div className="state">Confirming payment...</div>
  if (error) {
    return (
      <section className="success-panel">
        <div className="alert">{error}</div>
        <Link to="/bundles" className="btn ghost">
          Back to bundles
        </Link>
      </section>
    )
  }

  const bundle = result?.bundle
  const post = result?.post
  const invoice = result?.invoice

  return (
    <section className="success-panel">
      <p className="eyebrow">Purchase complete</p>
      <h1>Content unlocked</h1>
      <p className="muted">{result?.message || 'Payment confirmed.'}</p>

      {bundle && (
        <p>
          Bundle: <strong>{bundle.title}</strong>
        </p>
      )}
      {post && (
        <p>
          Post: <strong>{post.title}</strong>
        </p>
      )}
      {invoice && (
        <p className="muted">
          Invoice <strong>{invoice.invoice_number}</strong> for £
          {Number(invoice.amount).toFixed(2)}
        </p>
      )}

      <div className="actions">
        {bundle ? (
          <Link to={`/bundles/${bundle.id}`} className="btn primary">
            Open bundle
          </Link>
        ) : post ? (
          <Link to={`/posts/${post.id}`} className="btn primary">
            Open post
          </Link>
        ) : (
          <Link to="/" className="btn primary">
            Browse posts
          </Link>
        )}
        {invoice && (
          <Link to={`/my-dashboard/invoices/${invoice.id}`} className="btn ghost">
            View invoice
          </Link>
        )}
      </div>
    </section>
  )
}
