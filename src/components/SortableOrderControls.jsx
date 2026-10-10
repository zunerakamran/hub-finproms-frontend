import { useEffect, useState } from 'react'

/**
 * Drag handle + “Move to #” position field for reordering lists.
 * Use with sortableRowDropProps on the parent row.
 */
export function SortableOrderControls({
  index,
  total,
  onMoveRelative,
  onMoveToIndex,
  onDragStartIndex,
  onDragEnd,
  extraActions = null,
  disabled = false,
}) {
  const [positionDraft, setPositionDraft] = useState(String(index + 1))
  const [editing, setEditing] = useState(false)

  useEffect(() => {
    if (!editing) {
      setPositionDraft(String(index + 1))
    }
  }, [index, editing])

  const commitPosition = () => {
    setEditing(false)
    const parsed = Number.parseInt(positionDraft, 10)
    if (!Number.isFinite(parsed)) {
      setPositionDraft(String(index + 1))
      return
    }
    const clamped = Math.min(Math.max(parsed, 1), total) - 1
    if (clamped !== index) {
      onMoveToIndex(clamped)
    }
    setPositionDraft(String(clamped + 1))
  }

  return (
    <div className="dash-nav-order-row__actions">
      <button
        type="button"
        className="dash-nav-drag-handle"
        title="Drag to reorder"
        aria-label={`Drag to reorder, currently position ${index + 1}`}
        disabled={disabled}
        draggable={!disabled}
        onDragStart={(e) => {
          if (disabled) return
          onDragStartIndex?.(index)
          e.dataTransfer.effectAllowed = 'move'
          e.dataTransfer.setData('text/plain', String(index))
          const row = e.currentTarget.closest('.dash-nav-order-row, .dash-nav-item-row')
          if (row instanceof HTMLElement) {
            e.dataTransfer.setDragImage(row, 24, 24)
          }
        }}
        onDragEnd={() => onDragEnd?.()}
      >
        ⋮⋮
      </button>
      <label className="dash-nav-pos-field">
        <span className="sr-only">Position</span>
        <input
          type="number"
          min={1}
          max={total}
          value={positionDraft}
          disabled={disabled}
          onChange={(e) => {
            setEditing(true)
            setPositionDraft(e.target.value)
          }}
          onFocus={() => {
            setEditing(true)
            setPositionDraft(String(index + 1))
          }}
          onBlur={commitPosition}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              commitPosition()
              e.currentTarget.blur()
            }
          }}
          aria-label={`Position ${index + 1} of ${total}`}
          title="Type a number and press Enter to jump to that position"
        />
        <span className="dash-nav-pos-field__of">/ {total}</span>
      </label>
      <button
        type="button"
        className="btn ghost"
        disabled={disabled || index === 0}
        onClick={() => onMoveRelative(-1)}
        title="Move up one"
      >
        Up
      </button>
      <button
        type="button"
        className="btn ghost"
        disabled={disabled || index === total - 1}
        onClick={() => onMoveRelative(1)}
        title="Move down one"
      >
        Down
      </button>
      {extraActions}
    </div>
  )
}

/** Drop-target props for a sortable row (drag starts from the handle). */
export function sortableRowDropProps({ index, dragIndex, setDragIndex, onReorder, disabled = false }) {
  const classes = [
    dragIndex === index ? 'is-dragging' : '',
    dragIndex !== null && dragIndex !== index ? 'is-drop-target' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return {
    className: classes,
    onDragOver: (e) => {
      if (disabled || dragIndex === null || dragIndex === index) return
      e.preventDefault()
      e.dataTransfer.dropEffect = 'move'
    },
    onDrop: (e) => {
      e.preventDefault()
      if (disabled || dragIndex === null || dragIndex === index) {
        setDragIndex(null)
        return
      }
      onReorder(dragIndex, index)
      setDragIndex(null)
    },
  }
}
