/**
 * Image picker for WC section editors.
 * Local /assets/intime/* catalog thumbs are not shipped in hub-finproms-frontend —
 * use Upload (websiteComplianceUploadImage) or paste a remote https URL.
 */
import { useMemo, useRef, useState } from 'react'
import { FaCloudUploadAlt, FaFolderOpen, FaSearch, FaTimes } from 'react-icons/fa'
import {
  displayImagePath,
  imageStem,
  isUploadedAsset,
  selectedLocalValue,
  templateThumbSrc,
} from '../utils/imageAssets'

export default function ImageFieldPicker({
  label = 'Image',
  value = '',
  onChange,
  onUpload,
  uploading = false,
  localImages = [],
  pathPlaceholder = 'intime-04 or /uploaded-images/image.jpg',
}) {
  const fileInputRef = useRef(null)
  const [search, setSearch] = useState('')
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [dragOver, setDragOver] = useState(false)

  const isTemplate = Boolean(selectedLocalValue(value, localImages))
  const isUploaded = isUploadedAsset(value)
  const [mode, setMode] = useState(() => (isTemplate ? 'library' : 'upload'))

  const displayName = selectedLocalValue(value, localImages) || imageStem(value) || 'No image selected'

  const filteredImages = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return localImages
    return localImages.filter(
      (item) =>
        item.label.toLowerCase().includes(q) ||
        item.value.toLowerCase().includes(q)
    )
  }, [localImages, search])

  const handleFile = (file) => {
    if (!file || !onUpload) return
    onUpload(file)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer?.files?.[0]
    handleFile(file)
  }

  const selectTemplate = (presetValue) => {
    onChange?.(presetValue)
    setMode('library')
  }

  const clearImage = () => {
    onChange?.('')
  }

  return (
    <div className="space-y-3 bg-white p-4 border border-gray-200 rounded-xl shadow-sm">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <label className="block text-xs font-extrabold text-[var(--brand-dark)]">{label}</label>
          {value ? (
            <p className="text-[11px] text-gray-500 mt-0.5 font-mono truncate max-w-xs">{displayName}</p>
          ) : (
            <p className="text-[11px] text-gray-400 mt-0.5">No image selected — use Preview tab to see result</p>
          )}
        </div>
        {value && (
          <button
            type="button"
            onClick={clearImage}
            className="inline-flex items-center gap-1 text-[11px] font-bold text-gray-500 hover:text-[var(--brand)] px-2 py-1 rounded-lg hover:bg-[var(--brand-soft)] transition"
          >
            <FaTimes className="w-2.5 h-2.5" />
            Clear
          </button>
        )}
      </div>

      <div className="space-y-3">
        <div className="inline-flex items-center gap-1 bg-gray-100 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => setMode('upload')}
            className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg transition ${
              mode === 'upload'
                ? 'bg-white text-[var(--brand-dark)] shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <FaCloudUploadAlt className="w-3 h-3" />
            Upload
          </button>
          <button
            type="button"
            onClick={() => setMode('library')}
            className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg transition ${
              mode === 'library'
                ? 'bg-white text-[var(--brand-dark)] shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <FaFolderOpen className="w-3 h-3" />
            Template library
          </button>
        </div>

        {mode === 'upload' ? (
          <div
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click()
            }}
            onClick={() => !uploading && fileInputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault()
              setDragOver(true)
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            className={`rounded-xl border-2 border-dashed p-4 text-center transition cursor-pointer ${
              uploading
                ? 'border-blue-200 bg-blue-50/50 cursor-wait'
                : dragOver
                  ? 'border-[var(--brand)] bg-[color-mix(in_srgb,var(--brand)_8%,white)]'
                  : 'border-gray-200 bg-gray-50/80 hover:border-[color-mix(in_srgb,var(--brand)_40%,transparent)] hover:bg-white'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              disabled={uploading}
              onChange={(e) => {
                handleFile(e.target.files?.[0])
                e.target.value = ''
              }}
            />
            <FaCloudUploadAlt className={`w-6 h-6 mx-auto mb-2 ${uploading ? 'text-blue-500 animate-pulse' : 'text-gray-400'}`} />
            {uploading ? (
              <p className="text-xs font-bold text-blue-600">Uploading to server…</p>
            ) : (
              <>
                <p className="text-xs font-bold text-[var(--brand-dark)]">Drop an image here or click to browse</p>
                <p className="text-[11px] text-gray-500 mt-1">PNG, JPG, WebP · saved to your server</p>
              </>
            )}
            {isUploaded && !uploading && (
              <p className="text-[10px] text-emerald-600 font-semibold mt-2">Using uploaded file</p>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            <div className="wc-icon-field">
              <FaSearch className="wc-icon-field__icon" aria-hidden="true" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search template images…"
                className="w-full text-xs pl-8 pr-3 py-2 border border-gray-200 rounded-lg bg-white outline-none focus:ring-2 focus:ring-[color-mix(in_srgb,var(--brand)_30%,transparent)] focus:border-[var(--brand)]"
              />
            </div>
            <div className="max-h-44 overflow-y-auto rounded-xl border border-gray-200 bg-gray-50/50 p-2">
              {filteredImages.length === 0 ? (
                <p className="text-xs text-gray-500 text-center py-6">No images match your search.</p>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                  {filteredImages.map((preset) => {
                    const selected = selectedLocalValue(value, localImages) === preset.value
                    return (
                      <button
                        key={preset.file || preset.value}
                        type="button"
                        onClick={() => selectTemplate(preset.value)}
                        title={preset.label}
                        className={`text-left rounded-lg border-2 px-2 py-2 transition focus:outline-none focus:ring-2 focus:ring-[color-mix(in_srgb,var(--brand)_40%,transparent)] ${
                          selected
                            ? 'border-[var(--brand)] bg-[var(--brand-soft)] ring-2 ring-[color-mix(in_srgb,var(--brand)_30%,transparent)]'
                            : 'border-gray-200 bg-white hover:border-[color-mix(in_srgb,var(--brand)_50%,transparent)] hover:bg-gray-50'
                        }`}
                      >
                        <span className="block text-[10px] font-bold text-[var(--brand-dark)] truncate">{preset.label}</span>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={() => setShowAdvanced((v) => !v)}
          className="text-[11px] font-bold text-gray-500 hover:text-[var(--brand-dark)] transition"
        >
          {showAdvanced ? '▾ Hide path' : '▸ Edit path manually'}
        </button>
        {showAdvanced && (
          <input
            type="text"
            value={displayImagePath(value)}
            onChange={(e) => onChange?.(e.target.value)}
            placeholder={pathPlaceholder}
            className="w-full text-xs p-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[color-mix(in_srgb,var(--brand)_30%,transparent)] focus:border-[var(--brand)] outline-none font-mono bg-white"
          />
        )}
      </div>
    </div>
  )
}
