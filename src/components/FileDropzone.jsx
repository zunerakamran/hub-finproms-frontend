import { useCallback, useId, useRef, useState } from 'react'
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
import { formatGcFileSize } from '../utils/generalCompliance'
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

function fileKey(file) {
  return `${file.name}-${file.size}-${file.lastModified}`
}

function mergeFiles(existing, incoming, multiple, maxFiles) {
  const next = Array.from(incoming || []).filter(Boolean)
  if (!next.length) return existing

  if (!multiple) {
    return [next[0]]
  }

  const map = new Map(existing.map((file) => [fileKey(file), file]))
  next.forEach((file) => {
    if (!map.has(fileKey(file))) map.set(fileKey(file), file)
  })

  return Array.from(map.values()).slice(0, maxFiles)
}

/**
 * Drag-and-drop + click-to-browse file field.
 *
 * @param {object} props
 * @param {File[]} [props.files]
 * @param {(files: File[]) => void} props.onChange
 * @param {string} [props.accept]
 * @param {boolean} [props.multiple]
 * @param {number} [props.maxFiles]
 * @param {string} [props.label]
 * @param {string} [props.hint]
 * @param {boolean} [props.required]
 * @param {string} [props.id]
 * @param {string} [props.className]
 * @param {boolean} [props.disabled]
 */
export default function FileDropzone({
  files = [],
  onChange,
  accept,
  multiple = false,
  maxFiles = 10,
  label,
  hint,
  required = false,
  id,
  className = '',
  disabled = false,
}) {
  const generatedId = useId()
  const inputId = id || generatedId
  const inputRef = useRef(null)
  const [dragging, setDragging] = useState(false)
  const dragDepth = useRef(0)

  const selected = Array.isArray(files) ? files.filter(Boolean) : []

  const commit = useCallback(
    (incoming) => {
      if (disabled) return
      onChange(mergeFiles(selected, incoming, multiple, maxFiles))
    },
    [disabled, maxFiles, multiple, onChange, selected],
  )

  const clearDrag = () => {
    dragDepth.current = 0
    setDragging(false)
  }

  const onDragEnter = (event) => {
    event.preventDefault()
    event.stopPropagation()
    if (disabled) return
    dragDepth.current += 1
    setDragging(true)
  }

  const onDragOver = (event) => {
    event.preventDefault()
    event.stopPropagation()
    if (disabled) return
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy'
  }

  const onDragLeave = (event) => {
    event.preventDefault()
    event.stopPropagation()
    dragDepth.current = Math.max(0, dragDepth.current - 1)
    if (dragDepth.current === 0) setDragging(false)
  }

  const onDrop = (event) => {
    event.preventDefault()
    event.stopPropagation()
    clearDrag()
    if (disabled) return
    commit(event.dataTransfer?.files)
  }

  const onInputChange = (event) => {
    commit(event.target.files)
    // Allow selecting the same file again after remove.
    event.target.value = ''
  }

  const removeAt = (index) => {
    if (disabled) return
    onChange(selected.filter((_, i) => i !== index))
  }

  const clearAll = () => {
    if (disabled) return
    onChange([])
  }

  const openPicker = () => {
    if (disabled) return
    inputRef.current?.click()
  }

  const dropCopy = multiple
    ? 'Drag & drop files here'
    : 'Drag & drop a file here'

  return (
    <div className={`file-dropzone-field ${className}`.trim()}>
      {label ? <div className="file-dropzone-label">{label}</div> : null}
      {hint ? <span className="field-hint">{hint}</span> : null}

      <div
        className={[
          'file-dropzone',
          dragging ? 'is-dragging' : '',
          disabled ? 'is-disabled' : '',
          selected.length ? 'has-files' : '',
        ]
          .filter(Boolean)
          .join(' ')}
        onDragEnter={onDragEnter}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={openPicker}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            openPicker()
          }
        }}
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-disabled={disabled}
        aria-controls={inputId}
      >
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          className="file-dropzone-input"
          accept={accept}
          multiple={multiple}
          required={required && selected.length === 0}
          disabled={disabled}
          onChange={onInputChange}
          onClick={(event) => event.stopPropagation()}
        />

        <div className="file-dropzone-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="28" height="28" fill="none">
            <path
              d="M12 16V7m0 0 3.5 3.5M12 7 8.5 10.5"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M20 16.5v1.2A2.3 2.3 0 0 1 17.7 20H6.3A2.3 2.3 0 0 1 4 17.7v-1.2"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        <div className="file-dropzone-copy">
          <strong>{dragging ? 'Drop to upload' : dropCopy}</strong>
          <span>
            or <em>click to browse</em>
            {multiple ? ` · up to ${maxFiles} files` : ''}
          </span>
        </div>
      </div>

      {selected.length > 0 ? (
        <ul className="file-dropzone-list">
          {selected.map((file, index) => {
            const kind = fileKind(file.name, file.type)
            const Icon = KIND_ICONS[kind] || FaFile
            const label = fileDisplayName(file.name) || file.name || 'File'
            return (
              <li key={fileKey(file)} className="file-dropzone-chip">
                <span className="file-dropzone-chip-icon" aria-hidden="true">
                  <Icon />
                </span>
                <span className="file-dropzone-chip-meta">
                  <span className="file-dropzone-chip-name" title={file.name}>
                    {label}
                  </span>
                  <span className="muted">{formatGcFileSize(file.size)}</span>
                </span>
                <button
                  type="button"
                  className="file-dropzone-remove"
                  onClick={(event) => {
                    event.preventDefault()
                    event.stopPropagation()
                    removeAt(index)
                  }}
                  aria-label={`Remove ${file.name}`}
                  disabled={disabled}
                >
                  ×
                </button>
              </li>
            )
          })}
        </ul>
      ) : null}

      {selected.length > 1 ? (
        <button
          type="button"
          className="btn ghost file-dropzone-clear"
          onClick={(event) => {
            event.preventDefault()
            clearAll()
          }}
          disabled={disabled}
        >
          Clear all
        </button>
      ) : null}
    </div>
  )
}
