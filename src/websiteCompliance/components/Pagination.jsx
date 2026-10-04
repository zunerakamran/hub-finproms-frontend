import { DataGridPager } from '../../components/DataGrid'

/**
 * Server-driven pager using the shared DataGrid footer styles
 * (works outside `.wc-app` — do not use Tailwind utilities here).
 */
export default function Pagination({ currentPage, totalItems, pageSize, onPageChange }) {
  return (
    <DataGridPager
      page={currentPage}
      totalItems={totalItems}
      pageSize={pageSize}
      onPageChange={onPageChange}
    />
  )
}
