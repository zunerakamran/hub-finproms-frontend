import { FaChevronLeft, FaChevronRight } from 'react-icons/fa'

export default function Pagination({ currentPage, totalItems, pageSize, onPageChange, endLabel }) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize))

  if (totalItems === 0) return null

  const start = (currentPage - 1) * pageSize + 1
  const end = Math.min(currentPage * pageSize, totalItems)

  const getPageNumbers = () => {
    const pages = []
    const maxVisible = 5
    let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2))
    let endPage = Math.min(totalPages, startPage + maxVisible - 1)
    if (endPage - startPage + 1 < maxVisible) {
      startPage = Math.max(1, endPage - maxVisible + 1)
    }
    for (let i = startPage; i <= endPage; i++) pages.push(i)
    return pages
  }

  const btnBase =
    'inline-flex items-center justify-center h-8 rounded-lg text-xs font-bold transition disabled:opacity-40 disabled:cursor-not-allowed'

  return (
    <div className="px-5 py-3.5 bg-gray-50 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <span className="text-xs text-gray-500 font-medium">
          Showing {start}–{end} of {totalItems}
        </span>
        {endLabel && (
          <span className="text-xs text-[#C8102E] font-bold">{endLabel}</span>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className={`${btnBase} w-8 border border-gray-200 bg-white text-gray-600 hover:bg-gray-50`}
            aria-label="Previous page"
          >
            <FaChevronLeft className="w-3 h-3" />
          </button>

          {getPageNumbers().map(page => (
            <button
              key={page}
              type="button"
              onClick={() => onPageChange(page)}
              className={`${btnBase} min-w-8 px-2 ${
                page === currentPage
                  ? 'bg-[#0B1B3D] text-white'
                  : 'border border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              {page}
            </button>
          ))}

          <button
            type="button"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className={`${btnBase} w-8 border border-gray-200 bg-white text-gray-600 hover:bg-gray-50`}
            aria-label="Next page"
          >
            <FaChevronRight className="w-3 h-3" />
          </button>
        </div>
      )}
    </div>
  )
}
