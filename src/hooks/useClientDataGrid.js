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

function getSortValue(row, column) {
  if (typeof column.sortValue === 'function') {
    return column.sortValue(row)
  }
  if (typeof column.filterValue === 'function') {
    return column.filterValue(row)
  }
  const value = row?.[column.key]
  if (value == null) return null
  if (typeof value === 'object') {
    return value.name || value.label || value.title || value.email || ''
  }
  return value
}

function compareSortValues(a, b) {
  if (a == null && b == null) return 0
  if (a == null) return 1
  if (b == null) return -1

  if (typeof a === 'number' && typeof b === 'number') {
    return a - b
  }

  const aTime = a instanceof Date ? a.getTime() : NaN
  const bTime = b instanceof Date ? b.getTime() : NaN
  if (!Number.isNaN(aTime) && !Number.isNaN(bTime)) {
    return aTime - bTime
  }

  const aNum = typeof a === 'string' && a.trim() !== '' && !Number.isNaN(Number(a)) ? Number(a) : null
  const bNum = typeof b === 'string' && b.trim() !== '' && !Number.isNaN(Number(b)) ? Number(b) : null
  if (aNum != null && bNum != null) {
    return aNum - bNum
  }

  return String(a).localeCompare(String(b), undefined, {
    numeric: true,
    sensitivity: 'base',
  })
}

/**
 * Client-side column filters, sorting, and pagination for DataGrid.
 */
export default function useClientDataGrid(rows, columns, { pageSize = 10 } = {}) {
  const filterableColumns = useMemo(
    () => (columns || []).filter((col) => col.filterable !== false && col.key !== 'actions'),
    [columns]
  )

  const [filters, setFilters] = useState({})
  const [sort, setSort] = useState({ key: null, direction: 'asc' })
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

  const toggleSort = (key) => {
    setSort((prev) => {
      if (prev.key !== key) return { key, direction: 'asc' }
      if (prev.direction === 'asc') return { key, direction: 'desc' }
      return { key: null, direction: 'asc' }
    })
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

  const sortedRows = useMemo(() => {
    if (!sort.key) return filteredRows

    const column = (columns || []).find((col) => col.key === sort.key)
    if (!column || column.sortable === false) return filteredRows

    const direction = sort.direction === 'desc' ? -1 : 1
    return [...filteredRows].sort(
      (a, b) => compareSortValues(getSortValue(a, column), getSortValue(b, column)) * direction
    )
  }, [filteredRows, sort, columns])

  const totalItems = sortedRows.length
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize) || 1)
  const currentPage = Math.min(page, totalPages)
  const start = totalItems === 0 ? 0 : (currentPage - 1) * pageSize
  const pageRows = sortedRows.slice(start, start + pageSize)

  return {
    filters,
    setFilter,
    clearFilters,
    filterableColumns,
    filteredRows: sortedRows,
    pageRows,
    page: currentPage,
    setPage,
    pageSize,
    totalItems,
    totalPages,
    hasActiveFilters: Object.keys(filters).some((key) => String(filters[key] || '').trim()),
    sortKey: sort.key,
    sortDirection: sort.direction,
    toggleSort,
  }
}
