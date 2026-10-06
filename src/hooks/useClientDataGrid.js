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

function toValidDate(value) {
  if (value == null || value === '') return null
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value
  }
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
    const date = new Date(value)
    return Number.isNaN(date.getTime()) ? null : date
  }
  if (typeof value === 'string' && value.trim()) {
    const date = new Date(value)
    return Number.isNaN(date.getTime()) ? null : date
  }
  return null
}

function getCellDate(row, column) {
  if (typeof column.sortValue === 'function') {
    const sorted = toValidDate(column.sortValue(row))
    if (sorted) return sorted
  }

  const direct = toValidDate(row?.[column.key])
  if (direct) return direct

  // Common alternate field names used by compliance / billing grids.
  const key = String(column.key || '')
  const fallbacks = [
    row?.submission_date,
    row?.submitted_at,
    row?.issued_at,
    row?.occurred_at,
    row?.last_updated,
    row?.go_live_requested_at,
    row?.created_at,
    row?.updated_at,
    row?.date,
  ]
  if (key === 'submitted' || key === 'issued' || key === 'when' || key.endsWith('_changed')) {
    for (const candidate of fallbacks) {
      const date = toValidDate(candidate)
      if (date) return date
    }
  }

  return null
}

function toLocalYmd(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

const SELECT_FILTER_KEYS = new Set([
  'role',
  'firm',
  'status',
  'state',
  'type',
  'types',
  'type_label',
  'content_type',
  'category',
  'categories',
  'priority',
  'advisor',
  'acting',
  'is_active',
  'active',
  'status_code',
  'payment_status',
  'billing_status',
  'direction',
  'creation_source',
  'library_status',
  'section',
])

/**
 * Decide filter control for a column.
 * - none: row/request #, version, actions
 * - select: role / firm / status / yes-no style enums
 * - date: calendar day match
 * - text: free search (default)
 *
 * Override with column.filterType or column.filterOptions.
 */
export function resolveFilterType(col = {}) {
  if (col.filterable === false || col.key === 'actions') return 'none'
  if (col.filterType) return col.filterType
  if (Array.isArray(col.filterOptions) && col.filterOptions.length) return 'select'

  const key = String(col.key ?? '').toLowerCase()
  const label = String(col.label ?? '').trim().toLowerCase()

  if (
    col.narrow === true ||
    key === 'id' ||
    key === 'version' ||
    label === '#' ||
    label === 'ver' ||
    label === 'no' ||
    label === 'no.'
  ) {
    return 'none'
  }

  const isDate =
    col.date === true ||
    key.endsWith('_at') ||
    key.endsWith('_changed') ||
    key === 'submitted' ||
    key === 'issued' ||
    key === 'when' ||
    (key.includes('date') && key !== 'date_label')

  if (isDate) return 'date'

  if (
    SELECT_FILTER_KEYS.has(key) ||
    key.endsWith('_status') ||
    key.startsWith('is_') ||
    label === 'role' ||
    label === 'firm' ||
    label === 'status' ||
    label === 'type' ||
    label === 'priority' ||
    label === 'category'
  ) {
    return 'select'
  }

  return 'text'
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

function rowMatchesFilter(row, column, raw, filterType) {
  const needle = String(raw ?? '').trim()
  if (!needle) return true

  if (filterType === 'date') {
    const date = getCellDate(row, column)
    if (!date) return false
    return toLocalYmd(date) === needle
  }

  const text = getCellText(row, column).trim().toLowerCase()
  if (filterType === 'select') {
    return text === needle.toLowerCase()
  }

  return text.includes(needle.toLowerCase())
}

/**
 * Client-side column filters, sorting, and pagination for DataGrid.
 */
export default function useClientDataGrid(rows, columns, { pageSize = 10 } = {}) {
  const columnsWithFilterType = useMemo(
    () =>
      (columns || []).map((col) => ({
        ...col,
        filterType: resolveFilterType(col),
      })),
    [columns]
  )

  const filterableColumns = useMemo(
    () => columnsWithFilterType.filter((col) => col.filterType !== 'none'),
    [columnsWithFilterType]
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

  const filterOptionsByKey = useMemo(() => {
    const map = {}
    for (const col of filterableColumns) {
      if (col.filterType !== 'select') continue
      if (Array.isArray(col.filterOptions) && col.filterOptions.length) {
        map[col.key] = col.filterOptions.map((opt) => String(opt))
        continue
      }
      const values = new Set()
      for (const row of rows || []) {
        const text = getCellText(row, col).trim()
        if (text) values.add(text)
      }
      map[col.key] = Array.from(values).sort((a, b) =>
        a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })
      )
    }
    return map
  }, [rows, filterableColumns])

  const filteredRows = useMemo(() => {
    const active = Object.entries(filters).filter(([, value]) => String(value || '').trim())
    if (!active.length) return rows || []

    return (rows || []).filter((row) =>
      active.every(([key, raw]) => {
        const column = filterableColumns.find((col) => col.key === key)
        if (!column) return true
        return rowMatchesFilter(row, column, raw, column.filterType)
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
    filterOptionsByKey,
    columnsWithFilterType,
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
