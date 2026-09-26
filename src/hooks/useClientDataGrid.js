import { useEffect, useMemo, useState } from 'react'

function getCellText(row, column) {
  if (typeof column.filterValue === 'function') {
    const value = column.filterValue(row)
    return value == null ? '' : String(value)
  }
  const value = row?.[column.key]
  if (value == null) return ''
  if (typeof value === 'object') {
    return String(value.name || value.label || value.title || value.email || '')
  }
  return String(value)
}

/**
 * Client-side column filters + pagination for DataGrid.
 */
export default function useClientDataGrid(rows, columns, { pageSize = 10 } = {}) {
  const filterableColumns = useMemo(
    () => (columns || []).filter((col) => col.filterable !== false && col.key !== 'actions'),
    [columns]
  )

  const [filters, setFilters] = useState({})
  const [page, setPage] = useState(1)

  useEffect(() => {
    setPage(1)
  }, [rows, pageSize])

  const setFilter = (key, value) => {
    setFilters((prev) => {
      const next = { ...prev, [key]: value }
      if (!value) delete next[key]
      return next
    })
    setPage(1)
  }

  const clearFilters = () => {
    setFilters({})
    setPage(1)
  }

  const filteredRows = useMemo(() => {
    const active = Object.entries(filters).filter(([, value]) => String(value || '').trim())
    if (!active.length) return rows || []

    return (rows || []).filter((row) =>
      active.every(([key, raw]) => {
        const needle = String(raw).trim().toLowerCase()
        const column = filterableColumns.find((col) => col.key === key)
        if (!column) return true
        return getCellText(row, column).toLowerCase().includes(needle)
      })
    )
  }, [rows, filters, filterableColumns])

  const totalItems = filteredRows.length
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize) || 1)
  const currentPage = Math.min(page, totalPages)
  const start = totalItems === 0 ? 0 : (currentPage - 1) * pageSize
  const pageRows = filteredRows.slice(start, start + pageSize)

  return {
    filters,
    setFilter,
    clearFilters,
    filterableColumns,
    filteredRows,
    pageRows,
    page: currentPage,
    setPage,
    pageSize,
    totalItems,
    totalPages,
    hasActiveFilters: Object.keys(filters).some((key) => String(filters[key] || '').trim()),
  }
}
