import { Link } from 'react-router-dom'
import useClientDataGrid, { resolveFilterType } from '../hooks/useClientDataGrid'
import { formatDate, formatDateTime, formatTime } from '../utils/dateFormat'

export { resolveFilterType }

function ColumnFilterControl({ col, filterType, value, options, onChange }) {
  if (filterType === 'none') {
    return <span className="data-grid__filter-spacer" />
  }

  if (filterType === 'select') {
    return (
      <select
        className="data-grid__filter-input data-grid__filter-select"
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        aria-label={`Filter ${col.label}`}
      >
        <option value="">All</option>
        {(options || []).map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    )
  }

  if (filterType === 'date') {
    return (
      <input
        type="date"
        className="data-grid__filter-input data-grid__filter-date"
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        aria-label={`Filter ${col.label} by date`}
      />
    )
  }

  return (
    <input
      type="search"
      className="data-grid__filter-input"
      placeholder="Search…"
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      aria-label={`Search ${col.label}`}
    />
  )
}

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

/** Shared pager used by DataGrid (client or server-driven). */
export function DataGridPager({
  page,
  totalItems,
  pageSize,
  onPageChange,
}) {
  const totalPages = Math.max(1, Math.ceil((totalItems || 0) / (pageSize || 1)))
  return (
    <DataGridPagination
      page={page}
      totalPages={totalPages}
      totalItems={totalItems}
      pageSize={pageSize}
      onPageChange={onPageChange}
    />
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
 * Compact two-line date for grid cells: day on top, smaller time below.
 */
export function DataGridDate({ value, withTime = true, secondary }) {
  if (!value) return <span className="data-grid__date data-grid__date--empty">—</span>

  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) {
    return <span className="data-grid__date data-grid__date--empty">—</span>
  }

  const day = formatDate(date, '')
  const time = withTime ? formatTime(date, '') : null
  const title = withTime ? formatDateTime(date, '') : day

  return (
    <span className="data-grid__date" title={title || undefined}>
      <span className="data-grid__date-day">{day || '—'}</span>
      {time ? <span className="data-grid__date-time">{time}</span> : null}
      {secondary ? <span className="data-grid__date-secondary">{secondary}</span> : null}
    </span>
  )
}

/**
 * Status badge + optional status-change datetime stacked underneath (for compliance grids).
 */
export function StatusWithDate({ badge, at, className = '' }) {
  return (
    <span className={`compliance-status-cell ${className}`.trim()}>
      {badge}
      {at ? <DataGridDate value={at} /> : null}
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
  children = null,
  ...rest
}) {
  const classes = [
    'data-grid__icon-btn',
    `data-grid__icon-btn--${variant}`,
    className,
  ]
    .filter(Boolean)
    .join(' ')

  const content = Icon ? <Icon aria-hidden="true" /> : children

  const shared = {
    className: classes,
    title: label,
    'aria-label': label,
    ...rest,
  }

  if (As === 'button') {
    return (
      <button type="button" onClick={onClick} disabled={disabled} {...shared}>
        {content}
      </button>
    )
  }

  return (
    <As onClick={onClick} {...shared}>
      {content}
    </As>
  )
}

/**
 * Reusable data grid with per-column search, sorting, and client-side pagination.
 * Pass `serverPagination` to keep the footer pager but drive pages from the API.
 */
export default function DataGrid({
  columns = [],
  rows = [],
  loading = false,
  emptyMessage = 'No records found.',
  pageSize = 10,
  /** When true, render all filtered rows and omit the client pager (use server paging outside). */
  hidePagination = false,
  /**
   * Server-driven pager rendered inside the grid footer.
   * When set, client-side paging is disabled and these values control the footer.
   * @type {{ page: number, totalItems: number, pageSize?: number, onPageChange: (page: number) => void } | null}
   */
  serverPagination = null,
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
  const useServerPager = Boolean(serverPagination)
  const grid = useClientDataGrid(rows, allColumns, {
    pageSize:
      hidePagination || useServerPager ? Math.max(rows?.length || 1, pageSize) : pageSize,
  })

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
                const filterType = resolveFilterType(col)
                return (
                  <th
                    key={`filter-${col.key}`}
                    className={layout.className || undefined}
                    style={columnStyle(col, layout)}
                  >
                    <ColumnFilterControl
                      col={col}
                      filterType={filterType}
                      value={grid.filters[col.key] || ''}
                      options={grid.filterOptionsByKey?.[col.key]}
                      onChange={(next) => grid.setFilter(col.key, next)}
                    />
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

      {!hidePagination && !useServerPager ? (
        <DataGridPagination
          page={grid.page}
          totalPages={grid.totalPages}
          totalItems={grid.totalItems}
          pageSize={grid.pageSize}
          onPageChange={grid.setPage}
        />
      ) : null}

      {useServerPager ? (
        <DataGridPager
          page={Number(serverPagination.page) || 1}
          totalItems={Number(serverPagination.totalItems) || 0}
          pageSize={serverPagination.pageSize || pageSize}
          onPageChange={serverPagination.onPageChange}
        />
      ) : null}
    </div>
  )
}
