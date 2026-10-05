/**
 * CSS conic-gradient pie chart for compliance report summaries.
 * Re-renders from parent state so filter-driven report.summary updates the pie.
 */
const PIE_COLORS = [
  '#0f766e',
  '#2563eb',
  '#d97706',
  '#dc2626',
  '#7c3aed',
  '#0891b2',
  '#65a30d',
  '#db2777',
  '#475569',
]

export default function CompliancePieChart({
  title = '',
  segments = [],
  total: totalProp = null,
  emptyMessage = 'No data for this chart yet.',
}) {
  const cleaned = (Array.isArray(segments) ? segments : [])
    .map((segment, index) => ({
      key: segment.key || segment.label || String(index),
      label: segment.label || '—',
      value: Math.max(0, Number(segment.value) || 0),
      color: segment.color || PIE_COLORS[index % PIE_COLORS.length],
    }))
    .filter((segment) => segment.value > 0)

  const total =
    totalProp != null
      ? Math.max(0, Number(totalProp) || 0)
      : cleaned.reduce((sum, segment) => sum + segment.value, 0)

  if (total <= 0 || cleaned.length === 0) {
    return (
      <div className="compliance-pie">
        {title ? <h3 className="compliance-pie__title">{title}</h3> : null}
        <p className="muted">{emptyMessage}</p>
      </div>
    )
  }

  let cursor = 0
  const stops = cleaned.map((segment) => {
    const start = cursor
    const pct = (segment.value / total) * 100
    cursor += pct
    return `${segment.color} ${start}% ${cursor}%`
  })

  return (
    <div className="compliance-pie">
      {title ? <h3 className="compliance-pie__title">{title}</h3> : null}
      <div className="compliance-pie__body">
        <div
          className="compliance-pie__donut"
          style={{ background: `conic-gradient(${stops.join(', ')})` }}
          role="img"
          aria-label={title || 'Pie chart'}
        >
          <div className="compliance-pie__hole">
            <strong>{total}</strong>
            <span>total</span>
          </div>
        </div>
        <ul className="compliance-pie__legend">
          {cleaned.map((segment) => {
            const pct = Math.round((segment.value / total) * 100)
            return (
              <li key={segment.key} className="compliance-pie__legend-item">
                <span
                  className="compliance-pie__swatch"
                  style={{ background: segment.color }}
                  aria-hidden
                />
                <span className="compliance-pie__legend-label" title={segment.label}>
                  {segment.label}
                </span>
                <span className="compliance-pie__legend-value">
                  {segment.value}
                  <em>{pct}%</em>
                </span>
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}

/** Build pie segments from a by_status map using hub status labels. */
export function statusPieSegments(byStatus = {}, labelFor = (s) => s) {
  return Object.entries(byStatus || {}).map(([status, value]) => ({
    key: status,
    label: labelFor(status) || status,
    value,
  }))
}
