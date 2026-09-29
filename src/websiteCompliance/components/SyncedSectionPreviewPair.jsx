import { useMemo, useState } from 'react'
import SectionIframePreview from './SectionIframePreview'
import { getPreviewSlideCount, withPreviewSlide } from '../utils/previewSlides'

/**
 * Side-by-side current vs proposed section previews with a shared slide switcher
 * for hero/carousel content (so both panes show the same slide index).
 */
export default function SyncedSectionPreviewPair({
  sectionName,
  currentData,
  proposedData,
  branding,
  templateSlug = 'template4',
  siteUrl = null,
  cpanelDomain = null,
  height = 480,
  currentLabel,
  proposedLabel,
}) {
  const slideCount = useMemo(
    () => Math.max(getPreviewSlideCount(currentData), getPreviewSlideCount(proposedData)),
    [currentData, proposedData]
  )
  const [slideIndex, setSlideIndex] = useState(0)
  const activeSlide = Math.max(0, Math.min(slideIndex, Math.max(0, slideCount - 1)))

  const curPayload = useMemo(
    () => withPreviewSlide(currentData, activeSlide),
    [currentData, activeSlide]
  )
  const propPayload = useMemo(
    () => withPreviewSlide(proposedData, activeSlide),
    [proposedData, activeSlide]
  )

  return (
    <div className="space-y-3">
      {slideCount > 1 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400">
            Preview slide
          </span>
          <div className="flex flex-wrap gap-1">
            {Array.from({ length: slideCount }, (_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setSlideIndex(i)}
                className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border transition ${
                  activeSlide === i
                    ? 'bg-[var(--brand-dark)] text-white border-[var(--brand-dark)]'
                    : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                }`}
              >
                Slide {i + 1}
              </button>
            ))}
          </div>
          <span className="text-[11px] text-gray-400">
            Both previews show the same slide
          </span>
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        <SectionIframePreview
          sectionName={sectionName}
          data={curPayload}
          branding={branding}
          templateSlug={templateSlug}
          siteUrl={siteUrl}
          cpanelDomain={cpanelDomain}
          height={height}
          label={currentLabel}
          borderColor="border-gray-300"
          previewSlide={slideCount > 1 ? activeSlide : null}
          showSlideControls={false}
        />
        <SectionIframePreview
          sectionName={sectionName}
          data={propPayload}
          branding={branding}
          templateSlug={templateSlug}
          siteUrl={siteUrl}
          cpanelDomain={cpanelDomain}
          height={height}
          label={proposedLabel}
          borderColor="border-emerald-500"
          previewSlide={slideCount > 1 ? activeSlide : null}
          showSlideControls={false}
        />
      </div>
    </div>
  )
}
