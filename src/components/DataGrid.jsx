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
 * Reusable data grid with per-column search and client-side pagination.
 *
 * columns: [{ key, label, render?, filterValue?, filterable?, className?, headerClassName? }]
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
  className = '',
}) {
  const allColumns = actions
    ? [
        ...columns,
        {
          key: 'actions',
          label: actionsLabel,
          filterable: false,
          render: (row) => actions(row),
          className: 'data-grid__actions',
        },
      ]
    : columns

  const grid = useClientDataGrid(rows, allColumns, { pageSize })

  if (loading) {
    return <div className="state">Loading...</div>
  }

  if (!rows?.length) {
    return <div className="empty-state"><p className="muted">{emptyMessage}</p></div>
  }

  return (
    <div className={`data-grid ${className}`.trim()}>
      <div className="table-wrap data-grid__wrap">
        <table className="data-table data-grid__table">
          <thead>
            <tr>
              {allColumns.map((col) => (
                <th key={col.key} className={col.headerClassName}>
                  {col.label}
                </th>
              ))}
            </tr>
            <tr className="data-grid__filters">
              {allColumns.map((col) => (
                <th key={`filter-${col.key}`}>
                  {col.filterable === false || col.key === 'actions' ? (
                    <span className="data-grid__filter-spacer" />
                  ) : (
                    <input
                      type="search"
                      className="data-grid__filter-input"
                      placeholder={`Search ${col.label.toLowerCase()}…`}
                      value={grid.filters[col.key] || ''}
                      onChange={(e) => grid.setFilter(col.key, e.target.value)}
                      aria-label={`Search ${col.label}`}
                    />
                  )}
                </th>
              ))}
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
                    {allColumns.map((col) => {
                      const content =
                        typeof col.render === 'function' ? col.render(row) : row?.[col.key] ?? '—'
                      const isActions = col.key === 'actions'
                      return (
                        <td key={col.key} className={col.className}>
                          {href && !isActions ? (
                            <Link
                              to={href}
                              state={
                                typeof rowLinkState === 'function'
                                  ? rowLinkState(row)
                                  : rowLinkState
                              }
                              className="data-grid__cell-link"
                            >
                              {content}
                            </Link>
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
