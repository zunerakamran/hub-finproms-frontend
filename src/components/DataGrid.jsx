import { Link } from 'react-router-dom'
import useClientDataGrid from '../hooks/useClientDataGrid'

function DataGridPagination({ page, totalPages, totalItems, pageSize, onPageChange }) {
  if (totalItems === 0) return null

  const start = (page - 1) * pageSize + 1
  const end = Math.min(page * pageSize, totalItems)

  const pages = []
  const maxVisible = 5
  let startPage = Math.max(1, page - Math.floor(maxVisible / 2))
  let endPage = Math.min(totalPages, startPage + maxVisible - 1)
  if (endPage - startPage + 1 < maxVisible) {
    startPage = Math.max(1, endPage - maxVisible + 1)
  }
  for (let i = startPage; i <= endPage; i++) pages.push(i)

  return (
    <div className="data-grid__footer">
      <span className="muted data-grid__count">
        Showing {start}–{end} of {totalItems}
      </span>
      {totalPages > 1 ? (
        <div className="data-grid__pager">
          <button
            type="button"
            className="btn ghost"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
          >
            Previous
          </button>
          {pages.map((p) => (
            <button
              key={p}
              type="button"
              className={`btn ghost data-grid__page-btn${p === page ? ' is-active' : ''}`}
              onClick={() => onPageChange(p)}
            >
              {p}
            </button>
          ))}
          <button
            type="button"
            className="btn ghost"
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
          >
            Next
          </button>
        </div>
      ) : null}
    </div>
  )
}

/**
 * Resolve layout flags for a column.
 *
 * Column flags (optional overrides):
 * - narrow  — ID / # / Ver strip (~3rem)
 * - fit     — status / badges (~7rem)
 * - date    — compact two-line dates (~5.75rem)
 * - grow    — description / title; takes remaining space + truncates by default
 *
 * Auto rules:
 * - key `id` or label `#` / `Ver` / key `version` → narrow
 * - key `description`/`title`/`section`/… → grow (unless grow:false)
 * - key includes `date`, or is `submitted` / `issued` (and not grow) → date
 * - key `status` / `state` → fit
 * - key `actions` → actions
 */
export function resolveColumnLayout(col = {}) {
  const key = String(col.key ?? '').toLowerCase()
  const label = String(col.label ?? '').trim()
  const labelLower = label.toLowerCase()

  if (key === 'actions') {
    return {
      kind: 'actions',
      className: 'data-grid__col--actions',
      truncate: false,
    }
  }

  const isNarrow =
    col.narrow === true ||
    key === 'id' ||
    label === '#' ||
    key === 'version' ||
    labelLower === 'ver'

  const isGrow =
    col.grow === true ||
    (col.grow !== false &&
      ['description', 'title', 'section', 'details', 'message', 'subject', 'body'].includes(key))

  const isDate =
    !isGrow &&
    (col.date === true ||
      key.includes('date') ||
      key.endsWith('_at') ||
      key === 'submitted' ||
      key === 'issued' ||
      /(^|_)(submitted|issued)(_|$)/.test(key))

  const isFit =
    !isGrow &&
    !isNarrow &&
    !isDate &&
    (col.fit === true || key === 'status' || key === 'state')

  let kind = 'default'
  if (isNarrow) kind = 'narrow'
  else if (isGrow) kind = 'grow'
  else if (isDate) kind = 'date'
  else if (isFit) kind = 'fit'

  const truncate =
    col.truncate === true || (kind === 'grow' && col.truncate !== false)

  return {
    kind,
    className: kind !== 'default' ? `data-grid__col--${kind}` : '',
    truncate,
  }
}

/**
 * Inline styles for col/th/td. Percentage widths are ignored so fixed layout
 * can fit the container without forcing a horizontal scrollbar.
 */
function columnStyle(col, layout) {
  const style = {}
  const width = col.width != null ? String(col.width).trim() : ''
  if (width && !width.endsWith('%')) {
    style.width = width
  }

  if (layout?.kind === 'narrow') {
    style.minWidth = col.minWidth && !String(col.minWidth).endsWith('%')
      ? col.minWidth
      : '2.5rem'
  } else if (layout?.kind === 'actions') {
    if (col.minWidth && !String(col.minWidth).endsWith('%')) {
      style.minWidth = col.minWidth
    }
  }
  // Do not apply consumer minWidth/maxWidth that would force horizontal scroll.

  return Object.keys(style).length ? style : undefined
}

function headerClassName(col, layout, extra = []) {
  return [layout?.className, col.headerClassName, ...extra].filter(Boolean).join(' ')
}

function cellClassName(col, layout, { truncate, wrap, isActions }) {
  return [
    layout?.className,
    col.className,
    truncate ? 'data-grid__cell--truncate' : '',
    wrap ? 'data-grid__cell--wrap' : '',
    layout?.kind === 'fit' || (!truncate && !wrap && !isActions && layout?.kind !== 'grow')
      ? 'data-grid__cell--fit'
      : '',
  ]
    .filter(Boolean)
    .join(' ')
}

function SortButton({ active, direction, label, onClick }) {
  const stateClass = active ? ` is-${direction}` : ''
  return (
    <button
      type="button"
      className={`data-grid__sort-btn${stateClass}`}
      onClick={onClick}
      aria-label={`Sort by ${label}${active ? `, currently ${direction}ending` : ''}`}
      title={active ? `Sorted ${direction}ending — click to change` : `Sort by ${label}`}
    >
      <span className="data-grid__sort-icon" aria-hidden="true" />
    </button>
  )
}

/**
 * Compact two-line date for grid cells: day on top, time below (small text).
 */
export function DataGridDate({ value, withTime = true, secondary }) {
  if (!value) return <span className="data-grid__date data-grid__date--empty">—</span>

  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) {
    return <span className="data-grid__date data-grid__date--empty">—</span>
  }

  const day = date.toLocaleDateString(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
  const time = withTime
    ? date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
    : null

  return (
    <span className="data-grid__date" title={date.toLocaleString()}>
      <span className="data-grid__date-day">{day}</span>
      {time ? <span className="data-grid__date-time">{time}</span> : null}
      {secondary ? <span className="data-grid__date-secondary">{secondary}</span> : null}
    </span>
  )
}

/**
 * Compact icon action for data-grid rows.
 * Supports polymorphic `as` (e.g. `as={Link}` with `to=`).
 */
export function DataGridIconBtn({
  icon: Icon,
  label,
  onClick,
  disabled = false,
  variant = 'ghost',
  as: As = 'button',
  className = '',
  ...rest
}) {
  const classes = [
    'data-grid__icon-btn',
    `data-grid__icon-btn--${variant}`,
    className,
  ]
    .filter(Boolean)
    .join(' ')

  const shared = {
    className: classes,
    title: label,
    'aria-label': label,
    ...rest,
  }

  if (As === 'button') {
    return (
      <button type="button" onClick={onClick} disabled={disabled} {...shared}>
        {Icon ? <Icon aria-hidden="true" /> : null}
      </button>
    )
  }

  return (
    <As onClick={onClick} {...shared}>
      {Icon ? <Icon aria-hidden="true" /> : null}
    </As>
  )
}

/**
 * Reusable data grid with per-column search, sorting, and client-side pagination.
 */
export default function DataGrid({
  columns = [],
  rows = [],
  loading = false,
  emptyMessage = 'No records found.',
  pageSize = 10,
  getRowKey = (row) => row.id,
  rowLink,
  rowLinkState,
  actions,
  actionsLabel = 'Actions',
  actionsWidth,
  actionsMinWidth,
  className = '',
}) {
  const allColumns = actions
    ? [
        ...columns,
        {
          key: 'actions',
          label: actionsLabel,
          filterable: false,
          sortable: false,
          truncate: false,
          wrap: false,
          render: (row) => (
            <span className="data-grid__actions-inner">{actions(row)}</span>
          ),
          className: 'data-grid__actions',
          width: actionsWidth,
          minWidth: actionsMinWidth,
        },
      ]
    : columns

  const layouts = allColumns.map((col) => resolveColumnLayout(col))
  const grid = useClientDataGrid(rows, allColumns, { pageSize })

  if (loading) {
    return <div className="state">Loading...</div>
  }

  if (!rows?.length) {
    return (
      <div className="empty-state">
        <p className="muted">{emptyMessage}</p>
      </div>
    )
  }

  return (
    <div className={`data-grid ${className}`.trim()}>
      <div className="data-grid__wrap">
        <table className="data-table data-grid__table">
          <colgroup>
            {allColumns.map((col, i) => (
              <col
                key={col.key}
                className={layouts[i].className || undefined}
                style={columnStyle(col, layouts[i])}
              />
            ))}
          </colgroup>
          <thead>
            <tr>
              {allColumns.map((col, i) => {
                const layout = layouts[i]
                const canSort = col.sortable !== false && col.key !== 'actions'
                const isActive = grid.sortKey === col.key
                return (
                  <th
                    key={col.key}
                    className={headerClassName(col, layout, [
                      canSort ? 'data-grid__th--sortable' : '',
                      isActive ? 'is-sorted' : '',
                    ])}
                    style={columnStyle(col, layout)}
                    aria-sort={
                      isActive
                        ? grid.sortDirection === 'asc'
                          ? 'ascending'
                          : 'descending'
                        : canSort
                          ? 'none'
                          : undefined
                    }
                  >
                    <div className="data-grid__th-inner">
                      <span className="data-grid__th-label">{col.label}</span>
                      {canSort ? (
                        <SortButton
                          active={isActive}
                          direction={isActive ? grid.sortDirection : 'asc'}
                          label={col.label}
                          onClick={() => grid.toggleSort(col.key)}
                        />
                      ) : null}
                    </div>
                  </th>
                )
              })}
            </tr>
            <tr className="data-grid__filters">
              {allColumns.map((col, i) => {
                const layout = layouts[i]
                return (
                  <th
                    key={`filter-${col.key}`}
                    className={layout.className || undefined}
                    style={columnStyle(col, layout)}
                  >
                    {col.filterable === false || col.key === 'actions' ? (
                      <span className="data-grid__filter-spacer" />
                    ) : (
                      <input
                        type="search"
                        className="data-grid__filter-input"
                        placeholder="Search…"
                        value={grid.filters[col.key] || ''}
                        onChange={(e) => grid.setFilter(col.key, e.target.value)}
                        aria-label={`Search ${col.label}`}
                      />
                    )}
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {grid.pageRows.length === 0 ? (
              <tr>
                <td colSpan={allColumns.length} className="data-grid__empty-cell">
                  <span className="muted">No rows match the current column filters.</span>
                  {grid.hasActiveFilters ? (
                    <button type="button" className="btn ghost" onClick={grid.clearFilters}>
                      Clear filters
                    </button>
                  ) : null}
                </td>
              </tr>
            ) : (
              grid.pageRows.map((row) => {
                const key = getRowKey(row)
                const href = typeof rowLink === 'function' ? rowLink(row) : null

                return (
                  <tr
                    key={key}
                    className={`data-grid__row${href ? ' data-grid__row--link' : ''}`}
                  >
                    {allColumns.map((col, i) => {
                      const layout = layouts[i]
                      const content =
                        typeof col.render === 'function' ? col.render(row) : row?.[col.key] ?? '—'
                      const isActions = layout.kind === 'actions' || col.key === 'actions'
                      const truncate = layout.truncate && !isActions
                      const wrap = Boolean(col.wrap) && !isActions && !truncate
                      const cellClass = cellClassName(col, layout, { truncate, wrap, isActions })

                      return (
                        <td
                          key={col.key}
                          className={cellClass || undefined}
                          style={columnStyle(col, layout)}
                        >
                          {href && !isActions ? (
                            <Link
                              to={href}
                              state={
                                typeof rowLinkState === 'function'
                                  ? rowLinkState(row)
                                  : rowLinkState
                              }
                              className="data-grid__cell-link"
                              title={
                                typeof content === 'string' || typeof content === 'number'
                                  ? String(content)
                                  : undefined
                              }
                            >
                              <span className="data-grid__cell-text">{content}</span>
                            </Link>
                          ) : truncate || wrap ? (
                            <span
                              className="data-grid__cell-text"
                              title={
                                typeof content === 'string' || typeof content === 'number'
                                  ? String(content)
                                  : undefined
                              }
                            >
                              {content}
                            </span>
                          ) : (
                            content
                          )}
                        </td>
                      )
                    })}
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      <DataGridPagination
        page={grid.page}
        totalPages={grid.totalPages}
        totalItems={grid.totalItems}
        pageSize={grid.pageSize}
        onPageChange={grid.setPage}
      />
    </div>
  )
}
