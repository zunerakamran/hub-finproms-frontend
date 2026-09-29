import { formatDate, formatTime } from '../utils/dateFormat'

/**
 * Inline datetime with a smaller time: 27/09/2026 20:25
 */
export default function DateTimeText({ value, className = '', fallback = '—' }) {
  const day = formatDate(value, '')
  if (!day) {
    return <span className={`datetime-text ${className}`.trim()}>{fallback}</span>
  }

  const time = formatTime(value, '')

  return (
    <span className={`datetime-text ${className}`.trim()}>
      <span className="datetime-text__day">{day}</span>
      {time ? (
        <>
          {' '}
          <span className="datetime-text__time">{time}</span>
        </>
      ) : null}
    </span>
  )
}
