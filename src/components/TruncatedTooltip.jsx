import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

const SHOW_DELAY_MS = 280
const HIDE_DELAY_MS = 60
const VIEWPORT_PAD = 10
const MAX_TOOLTIP_WIDTH = 360

function isTruncated(el) {
  if (!el) return false
  return el.scrollWidth > el.clientWidth + 1 || el.scrollHeight > el.clientHeight + 1
}

function resolveText(el, text) {
  if (text != null && String(text).trim() !== '') return String(text).trim()
  return (el?.textContent || '').replace(/\s+/g, ' ').trim()
}

function placeTooltip(anchorRect, tipWidth, tipHeight) {
  const vw = window.innerWidth
  const vh = window.innerHeight
  let left = anchorRect.left + anchorRect.width / 2 - tipWidth / 2
  left = Math.max(VIEWPORT_PAD, Math.min(left, vw - tipWidth - VIEWPORT_PAD))

  const spaceAbove = anchorRect.top - VIEWPORT_PAD
  const spaceBelow = vh - anchorRect.bottom - VIEWPORT_PAD
  const preferAbove = spaceAbove >= tipHeight + 8 || spaceAbove >= spaceBelow

  let top
  let placement
  if (preferAbove) {
    top = anchorRect.top - tipHeight - 8
    placement = 'top'
    if (top < VIEWPORT_PAD) {
      top = anchorRect.bottom + 8
      placement = 'bottom'
    }
  } else {
    top = anchorRect.bottom + 8
    placement = 'bottom'
    if (top + tipHeight > vh - VIEWPORT_PAD) {
      top = Math.max(VIEWPORT_PAD, anchorRect.top - tipHeight - 8)
      placement = 'top'
    }
  }

  const arrowLeft = Math.max(
    14,
    Math.min(anchorRect.left + anchorRect.width / 2 - left, tipWidth - 14),
  )

  return { top, left, placement, arrowLeft }
}

/**
 * Renders children in a truncating wrapper. When the visible text is cropped,
 * hovering shows a polished portal tooltip with the full content.
 */
export default function TruncatedTooltip({
  children,
  text,
  className = '',
  as: As = 'span',
  disabled = false,
  ...rest
}) {
  const triggerRef = useRef(null)
  const tipRef = useRef(null)
  const showTimer = useRef(null)
  const hideTimer = useRef(null)
  const tipId = useId()
  const [open, setOpen] = useState(false)
  const [content, setContent] = useState('')
  const [coords, setCoords] = useState({
    top: 0,
    left: 0,
    placement: 'top',
    arrowLeft: 24,
    ready: false,
  })

  const clearTimers = useCallback(() => {
    if (showTimer.current) {
      clearTimeout(showTimer.current)
      showTimer.current = null
    }
    if (hideTimer.current) {
      clearTimeout(hideTimer.current)
      hideTimer.current = null
    }
  }, [])

  const close = useCallback(() => {
    clearTimers()
    setOpen(false)
    setCoords((prev) => ({ ...prev, ready: false }))
  }, [clearTimers])

  const openTip = useCallback(() => {
    const el = triggerRef.current
    if (!el || disabled) return
    if (!isTruncated(el)) return
    const next = resolveText(el, text)
    if (!next) return
    setContent(next)
    setOpen(true)
  }, [disabled, text])

  const scheduleOpen = useCallback(() => {
    clearTimers()
    showTimer.current = setTimeout(openTip, SHOW_DELAY_MS)
  }, [clearTimers, openTip])

  const scheduleClose = useCallback(() => {
    clearTimers()
    hideTimer.current = setTimeout(close, HIDE_DELAY_MS)
  }, [clearTimers, close])

  useLayoutEffect(() => {
    if (!open || !triggerRef.current || !tipRef.current) return undefined

    const update = () => {
      const anchor = triggerRef.current
      const tip = tipRef.current
      if (!anchor || !tip) return
      const width = Math.min(tip.offsetWidth || MAX_TOOLTIP_WIDTH, MAX_TOOLTIP_WIDTH)
      const height = tip.offsetHeight || 40
      const next = placeTooltip(anchor.getBoundingClientRect(), width, height)
      setCoords({ ...next, ready: true })
    }

    update()
    window.addEventListener('scroll', close, true)
    window.addEventListener('resize', close)
    return () => {
      window.removeEventListener('scroll', close, true)
      window.removeEventListener('resize', close)
    }
  }, [open, content, close])

  useEffect(() => () => clearTimers(), [clearTimers])

  const classes = ['truncated-tooltip', className].filter(Boolean).join(' ')

  return (
    <>
      <As
        ref={triggerRef}
        className={classes}
        onMouseEnter={scheduleOpen}
        onMouseLeave={scheduleClose}
        onFocus={scheduleOpen}
        onBlur={scheduleClose}
        aria-describedby={open ? tipId : undefined}
        {...rest}
      >
        {children}
      </As>

      {open && content
        ? createPortal(
            <div
              ref={tipRef}
              id={tipId}
              role="tooltip"
              className={`truncated-tooltip__bubble truncated-tooltip__bubble--${coords.placement}${
                coords.ready ? ' is-ready' : ''
              }`}
              style={{
                top: coords.top,
                left: coords.left,
                ['--tt-arrow-left']: `${coords.arrowLeft}px`,
              }}
            >
              <span className="truncated-tooltip__arrow" aria-hidden="true" />
              <span className="truncated-tooltip__body">{content}</span>
            </div>,
            document.body,
          )
        : null}
    </>
  )
}

/** Plain-text helper used when DataGrid cells hold string/number values. */
export function tooltipTextFromContent(content) {
  if (typeof content === 'string' || typeof content === 'number') {
    const value = String(content).trim()
    return value && value !== '-' ? value : undefined
  }
  return undefined
}
