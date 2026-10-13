import {
  FaFile,
  FaFileAlt,
  FaFileArchive,
  FaFileExcel,
  FaFileImage,
  FaFilePdf,
  FaFilePowerpoint,
  FaFileVideo,
  FaFileWord,
} from 'react-icons/fa'
import { fileDisplayName, fileKind } from '../utils/fileDisplay'

const KIND_ICONS = {
  image: FaFileImage,
  video: FaFileVideo,
  pdf: FaFilePdf,
  word: FaFileWord,
  excel: FaFileExcel,
  powerpoint: FaFilePowerpoint,
  archive: FaFileArchive,
  text: FaFileAlt,
  file: FaFile,
}

/**
 * Shows a file name without extension, plus a small type icon.
 *
 * @param {object} props
 * @param {string} [props.name]
 * @param {string} [props.mimeType]
 * @param {string} [props.href]
 * @param {(event: import('react').MouseEvent) => void} [props.onClick] — when set, renders a button (auth downloads)
 * @param {boolean} [props.disabled]
 * @param {string} [props.className]
 * @param {string} [props.iconClassName]
 * @param {string} [props.fallback]
 * @param {boolean} [props.showIcon]
 */
export default function FileNameLabel({
  name,
  mimeType,
  href,
  onClick,
  disabled = false,
  className = '',
  iconClassName = '',
  fallback = 'File',
  showIcon = true,
}) {
  const label = fileDisplayName(name) || fallback
  const kind = fileKind(name, mimeType)
  const Icon = KIND_ICONS[kind] || FaFile
  const title = name || label
  const iconClass = ['file-name-label__icon', iconClassName].filter(Boolean).join(' ')
  const rootClass = `file-name-label ${className}`.trim()

  const content = (
    <>
      {showIcon ? <Icon className={iconClass} aria-hidden="true" /> : null}
      <span className="file-name-label__text">{label}</span>
    </>
  )

  if (typeof onClick === 'function') {
    return (
      <button
        type="button"
        className={rootClass}
        title={title}
        onClick={onClick}
        disabled={disabled}
      >
        {content}
      </button>
    )
  }

  if (href) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        className={rootClass}
        title={title}
      >
        {content}
      </a>
    )
  }

  return (
    <span className={rootClass} title={title}>
      {content}
    </span>
  )
}
