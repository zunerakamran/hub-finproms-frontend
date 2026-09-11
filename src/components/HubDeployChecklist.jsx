import { useState } from 'react'

/**
 * Deploy readiness checklist + copyable env snippet for Power Admin hub detail.
 */
export default function HubDeployChecklist({ deploy, slug }) {
  const [copied, setCopied] = useState(false)
  const checklist = deploy?.checklist || []
  const snippet = deploy?.env_snippet || `HUB_SLUG=${slug || ''}`
  const ready = Boolean(deploy?.ready)
  const statusLabel = deploy?.status_label || (ready ? 'Deploy wiring ready' : 'Needs deploy wiring')

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(snippet)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }

  return (
    <div className="hub-deploy-checklist">
      <div className="hub-deploy-checklist-head">
        <h3>Deploy checklist</h3>
        <span className={`badge ${ready ? 'ok' : 'warn'}`}>{statusLabel}</span>
      </div>
      <p className="muted">
        Registry fields below can be verified here. Each white-label has its <strong>own
        database</strong>. <code>HUB_SLUG</code> and that hub&apos;s <code>DB_*</code> env are ops
        steps on the white-label server — use the env snippet when provisioning. Shared stores a
        copy of the DB credentials so it can push content later.
      </p>
      <ul className="hub-deploy-steps">
        {checklist.map((item) => (
          <li key={item.key} className={item.done ? 'done' : item.required ? 'missing' : 'optional'}>
            <span className="hub-deploy-mark" aria-hidden="true">
              {item.done ? '✓' : item.required ? '!' : '○'}
            </span>
            <span>
              {item.label}
              {!item.required && !item.done ? ' — optional' : ''}
            </span>
          </li>
        ))}
      </ul>
      <div className="hub-env-snippet">
        <div className="hub-env-snippet-head">
          <strong>Env snippet</strong>
          <button type="button" className="btn ghost" onClick={onCopy}>
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
        <pre>
          <code>{snippet}</code>
        </pre>
      </div>
    </div>
  )
}
