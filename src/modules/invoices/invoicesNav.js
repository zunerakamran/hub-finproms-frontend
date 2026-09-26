export const INVOICE_FOLDERS = [
  { id: 'all', label: 'All invoices', types: null },
  { id: 'subscription', label: 'Subscriptions', types: ['subscription'] },
  { id: 'post_purchase', label: 'Post purchases', types: ['post_purchase'] },
  { id: 'bundle_purchase', label: 'Bundle purchases', types: ['bundle_purchase'] },
]

export function filterInvoicesByFolder(items, folderId) {
  const folder = INVOICE_FOLDERS.find((f) => f.id === folderId) || INVOICE_FOLDERS[0]
  if (!folder.types) return items
  return items.filter((item) => folder.types.includes(item.type))
}

export function typeLabel(type) {
  switch (type) {
    case 'subscription':
      return 'Subscription'
    case 'post_purchase':
      return 'Post purchase'
    case 'bundle_purchase':
      return 'Bundle purchase'
    case 'advisor_billing':
      return 'Advisor billing'
    default:
      return type || 'Invoice'
  }
}

export function formatMoney(amount, currency = 'gbp') {
  try {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: String(currency || 'gbp').toUpperCase(),
    }).format(Number(amount || 0))
  } catch {
    return `£${Number(amount || 0).toFixed(2)}`
  }
}

/** Keeps folder query when linking into an invoice from the list. */
export function invoiceDetailPath(invoiceId, folder) {
  const base = `/my-dashboard/invoices/${invoiceId}`
  if (!folder || folder === 'all') return base
  return `${base}?folder=${encodeURIComponent(folder)}`
}
