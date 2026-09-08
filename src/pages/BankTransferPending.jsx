import { Link, useLocation, Navigate } from 'react-router-dom'
import { useEffect } from 'react'
import { useAuth } from '../context/AuthContext'

export default function BankTransferPending() {
  const { state } = useLocation()
  const { setUser, refreshUser } = useAuth()

  useEffect(() => {
    if (state?.user) {
      setUser(state.user)
      return
    }
    if (state?.auto_confirmed) {
      refreshUser()
    }
  }, [state, setUser, refreshUser])

  if (!state?.payment_reference) {
    return <Navigate to="/subscriptions" replace />
  }

  const {
    subscription,
    invoice,
    bank_details: bank,
    payment_reference,
    amount,
    message,
    auto_confirmed: autoConfirmed,
  } = state

  return (
    <section className="success-panel">
      <p className="eyebrow">Bank transfer (test)</p>
      <h1>{autoConfirmed ? 'Payment simulated' : 'Complete your transfer'}</h1>
      <p className={autoConfirmed ? 'muted' : 'muted'}>
        {message ||
          (autoConfirmed
            ? 'Test bank transfer completed. Credits have been added.'
            : 'Use the dummy details below for testing.')}
      </p>

      {autoConfirmed && subscription && (
        <p>
          Plan: <strong>{subscription.plan?.name}</strong> · Credits added:{' '}
          <strong>{subscription.credits_granted}</strong>
        </p>
      )}

      {invoice && (
        <p className="muted">
          Invoice <strong>{invoice.invoice_number}</strong> for £
          {Number(invoice.amount).toFixed(2)} has been created.
        </p>
      )}

      <div className="bank-details">
        <div className="bank-row">
          <span>Amount</span>
          <strong>${Number(amount ?? subscription?.amount_paid).toFixed(2)}</strong>
        </div>
        <div className="bank-row highlight">
          <span>Payment reference</span>
          <strong>{payment_reference}</strong>
        </div>
        {subscription?.plan?.name && (
          <div className="bank-row">
            <span>Plan</span>
            <strong>
              {subscription.plan.name} ({subscription.credits_granted} credits)
            </strong>
          </div>
        )}
        {bank?.account_name && (
          <div className="bank-row">
            <span>Account name</span>
            <strong>{bank.account_name}</strong>
          </div>
        )}
        {bank?.bank_name && (
          <div className="bank-row">
            <span>Bank</span>
            <strong>{bank.bank_name}</strong>
          </div>
        )}
        {bank?.account_number && (
          <div className="bank-row">
            <span>Account number</span>
            <strong>{bank.account_number}</strong>
          </div>
        )}
        {bank?.sort_code && (
          <div className="bank-row">
            <span>Sort code</span>
            <strong>{bank.sort_code}</strong>
          </div>
        )}
        {bank?.iban && (
          <div className="bank-row">
            <span>IBAN</span>
            <strong>{bank.iban}</strong>
          </div>
        )}
        {bank?.swift && (
          <div className="bank-row">
            <span>SWIFT/BIC</span>
            <strong>{bank.swift}</strong>
          </div>
        )}
      </div>

      {bank?.instructions && <p className="muted">{bank.instructions}</p>}

      <div className="actions">
        <Link to="/" className="btn primary">
          Browse posts
        </Link>
        {invoice ? (
          <Link to={`/invoices/${invoice.id}`} className="btn ghost">
            View invoice
          </Link>
        ) : (
          <Link to="/subscriptions" className="btn ghost">
            Back to plans
          </Link>
        )}
      </div>
    </section>
  )
}
