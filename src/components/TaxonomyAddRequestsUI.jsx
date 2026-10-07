import { taxStatusClass } from '../utils/taxonomyAddRequests'
import { StatusWithDate } from './DataGrid'

export default function TaxStatusBadge({ status, at }) {
  const raw = status || 'Pending'
  const badge = <span className={taxStatusClass(raw)}>{raw}</span>
  if (!at) return badge
  return <StatusWithDate badge={badge} at={at} />
}
