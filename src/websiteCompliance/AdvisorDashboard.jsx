import { useState, useEffect, useRef, useMemo } from 'react'
import { createPortal } from 'react-dom'
import api from './wcApi'
import { useAuth } from '../context/AuthContext'
import { useHub } from '../context/HubContext'
import SectionIframePreview from './components/SectionIframePreview'
import TemplateScrollPreview from './components/TemplateScrollPreview'
import ImageFieldPicker from './components/ImageFieldPicker'
import { parseJson } from './utils/parseJson'
import { sectionDisplayName, sectionTemplateKey } from './utils/sectionDisplay'
import {
  absoluteAssetUrl,
  isUploadedAsset,
} from './utils/imageAssets'
import { hubDomainPlaceholder, resolveHubPreviewBase } from './utils/assetUrl'
import {
  FaBriefcase,
  FaBuilding,
  FaChartLine,
  FaChartPie,
  FaComments,
  FaHandHoldingUsd,
  FaLandmark,
  FaLightbulb,
  FaUserTie,
  FaAward,
  FaRocket,
  FaLock,
  FaUnlock,
  FaCheckCircle,
  FaClock,
  FaTimes,
  FaEdit,
  FaEye,
  FaServer,
  FaLayerGroup,
  FaFileAlt,
  FaPalette,
  FaImages,
  FaPaperPlane,
  FaGlobeAmericas,
  FaExclamationTriangle,
  FaTimesCircle,
  FaPlus,
  FaChevronDown,
  FaSearch,
  FaThLarge,
  FaArrowLeft,
  FaTasks,
  FaCoins,
  FaSeedling,
  FaHandshake,
  FaUsers,
  FaShieldAlt,
  FaFileInvoiceDollar,
  FaPercentage,
  FaGlobe,
  FaBalanceScale,
  FaStar,
  FaCommentDots,
  FaRedo,
  FaUpload,
  FaImage,
} from 'react-icons/fa'

const SERVICE_ICON_OPTIONS = [
  { value: 'chart-pie', label: 'Chart pie', Icon: FaChartPie },
  { value: 'tasks', label: 'Tasks', Icon: FaTasks },
  { value: 'landmark', label: 'Landmark', Icon: FaLandmark },
  { value: 'coins', label: 'Coins', Icon: FaCoins },
  { value: 'holding', label: 'Holding', Icon: FaHandHoldingUsd },
  { value: 'seedling', label: 'Seedling', Icon: FaSeedling },
  { value: 'briefcase', label: 'Briefcase', Icon: FaBriefcase },
  { value: 'chart-line', label: 'Chart line', Icon: FaChartLine },
  { value: 'handshake', label: 'Handshake', Icon: FaHandshake },
  { value: 'building', label: 'Building', Icon: FaBuilding },
  { value: 'users', label: 'Users', Icon: FaUsers },
  { value: 'shield-alt', label: 'Shield', Icon: FaShieldAlt },
  { value: 'lightbulb', label: 'Lightbulb', Icon: FaLightbulb },
  { value: 'file-invoice-dollar', label: 'Invoice', Icon: FaFileInvoiceDollar },
  { value: 'percentage', label: 'Percentage', Icon: FaPercentage },
  { value: 'globe', label: 'Globe', Icon: FaGlobe },
  { value: 'comments', label: 'Comments', Icon: FaComments },
  { value: 'balance-scale', label: 'Balance', Icon: FaBalanceScale },
]

const STAT_ICON_OPTIONS = [
  { value: 'users', label: 'Users', Icon: FaUsers },
  { value: 'star', label: 'Star', Icon: FaStar },
  { value: 'user-tie', label: 'User tie', Icon: FaUserTie },
  { value: 'award', label: 'Award', Icon: FaAward },
  ...SERVICE_ICON_OPTIONS.filter((opt) => opt.value !== 'users'),
]

const LOCAL_TEMPLATE_IMAGES = [
  { label: 'banner1', value: 'banner1' },
  { label: 'bg-slider-01', value: 'bg-slider-01' },
  { label: 'bg-slider2', value: 'bg-slider2' },
  { label: 'bg-slider3', value: 'bg-slider3' },
  { label: 'business-01-368x290', value: 'business-01-368x290' },
  { label: 'business-02-368x290', value: 'business-02-368x290' },
  { label: 'business-03-368x290', value: 'business-03-368x290' },
  { label: 'gallery-1', value: 'gallery-1' },
  { label: 'gallery-2', value: 'gallery-2' },
  { label: 'gallery-3', value: 'gallery-3' },
  { label: 'gallery-4', value: 'gallery-4' },
  { label: 'gallery-5', value: 'gallery-5' },
  { label: 'gallery-6', value: 'gallery-6' },
  { label: 'intime-01', value: 'intime-01' },
  { label: 'intime-02', value: 'intime-02' },
  { label: 'intime-03', value: 'intime-03' },
  { label: 'intime-04', value: 'intime-04' },
  { label: 'intime-05', value: 'intime-05' },
  { label: 'intime-06', value: 'intime-06' },
  { label: 'intime-07', value: 'intime-07' },
  { label: 'intime-08', value: 'intime-08' },
  { label: 'intime-09', value: 'intime-09' },
  { label: 'intime-10', value: 'intime-10' },
  { label: 'intime-11', value: 'intime-11' },
  { label: 'intime-12', value: 'intime-12' },
  { label: 'intime-14', value: 'intime-14' },
  { label: 'intime-15', value: 'intime-15' },
  { label: 'intime-17', value: 'intime-17' },
  { label: 'logo-dark', value: 'logo-dark' },
  { label: 'logo-light', value: 'logo-light' },
  { label: 'logo-mobile', value: 'logo-mobile' },
  { label: 'maps-point', value: 'maps-point' },
  { label: 'placeholder', value: 'placeholder' },
  { label: 'team-01', value: 'team-01' },
  { label: 'team-02', value: 'team-02' },
  { label: 'team-03', value: 'team-03' },
  { label: 'team-04', value: 'team-04' },
  { label: 'team-05', value: 'team-05' },
  { label: 'team-06', value: 'team-06' },
  { label: 'team-07', value: 'team-07' },
  { label: 'team-08', value: 'team-08' },
  { label: 'team-09', value: 'team-09' },
  { label: 'team-10', value: 'team-10' },
  { label: 'team-11', value: 'team-11' },
  { label: 'team-12', value: 'team-12' },
  { label: 'testimonial-01', value: 'testimonial-01' },
  { label: 'testimonial-02', value: 'testimonial-02' },
  { label: 'testimonial-03', value: 'testimonial-03' },
  { label: 'testimonial-04', value: 'testimonial-04' },
]

const PNG_STEMS = new Set(['logo-dark', 'logo-light', 'logo-mobile', 'maps-point', 'placeholder'])

LOCAL_TEMPLATE_IMAGES.forEach((item) => {
  item.file = `${item.value}.${PNG_STEMS.has(item.value) ? 'png' : 'jpg'}`
})

function storedUploadPath(data) {
  const path = data?.relative_url || data?.url || ''
  if (!path || /^data:/i.test(path)) return ''
  const name = String(path).split('/').pop().split('?')[0]
  if (!name) return ''
  if (
    path.includes('/website-compliance/uploaded-images') ||
    path.includes('/uploaded-images') ||
    path.includes('/uploads/')
  ) {
    return `/website-compliance/uploaded-images/${name}`
  }
  return path.startsWith('/') ? path : `/website-compliance/uploaded-images/${name}`
}

function stripDataImageUrls(value) {
  if (typeof value === 'string') {
    return /^data:/i.test(value) ? '' : value
  }
  if (Array.isArray(value)) return value.map(stripDataImageUrls)
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, nested]) => [key, stripDataImageUrls(nested)]))
  }
  return value
}

function stripPreviewKeys(value) {
  if (Array.isArray(value)) return value.map(stripPreviewKeys)
  if (value && typeof value === 'object') {
    const next = {}
    for (const [key, nested] of Object.entries(value)) {
      if (key === 'preview_slide' || key === 'image_preview' || key === 'preview_url' || key === 'preview_image') continue
      next[key] = stripPreviewKeys(nested)
    }
    return next
  }
  return value
}

function sanitizeSectionContent(content) {
  if (!content || typeof content !== 'object') return content || {}
  return stripDataImageUrls(stripPreviewKeys(content))
}

function isHeroSection(name) {
  const key = (name || '').toLowerCase().replace(/[^a-z0-9]/g, '')
  return key === 'heroslider' || key === 'hero' || key === 'herosection' || key.includes('heroslider')
}

function isWhatWeDoSection(name) {
  const key = (name || '').toLowerCase().replace(/[^a-z0-9]/g, '')
  return key === 'whatwedo' || key === 'featurescarousel' || key === 'features'
}

function isAboutSection(name) {
  const key = (name || '').toLowerCase().replace(/[^a-z0-9]/g, '')
  return key.includes('about')
}

function isCompanyHistorySection(name) {
  const key = (name || '').toLowerCase().replace(/[^a-z0-9]/g, '')
  return key === 'companyhistory' || key === 'history' || key.includes('history')
}

function isFeaturedServicesSection(name) {
  const key = (name || '').toLowerCase().replace(/[^a-z0-9]/g, '')
  return key === 'featuredservices' || key === 'services'
}

function isAnnualProgressionSection(name) {
  const key = (name || '').toLowerCase().replace(/[^a-z0-9]/g, '')
  return key === 'annualprogression' || key === 'progression' || key.includes('annual')
}

function isPortfolioSection(name) {
  const key = (name || '').toLowerCase().replace(/[^a-z0-9]/g, '')
  return key === 'portfoliosection' || key === 'portfolio' || key.includes('portfolio')
}

function isBranchesSection(name) {
  const key = (name || '').toLowerCase().replace(/[^a-z0-9]/g, '')
  return key === 'branchesandappointment' || key.includes('branch') || key.includes('appointment')
}

function isCounterStatsSection(name) {
  const key = (name || '').toLowerCase().replace(/[^a-z0-9]/g, '')
  return key === 'counterstats' || key === 'stats' || key.includes('counter')
}

function isTestimonialsSection(name) {
  const key = (name || '').toLowerCase().replace(/[^a-z0-9]/g, '')
  return key === 'testimonialscarousel' || key === 'testimonials' || key.includes('testimonial')
}

function isLatestNewsSection(name) {
  const key = (name || '').toLowerCase().replace(/[^a-z0-9]/g, '')
  return key === 'latestnews' || key === 'news' || key.includes('latestnews')
}

function isClientLogosSection(name) {
  const key = (name || '').toLowerCase().replace(/[^a-z0-9]/g, '')
  return key === 'clientlogos' || key.includes('clientlogo')
}

function isCtaBannerSection(name) {
  const key = (name || '').toLowerCase().replace(/[^a-z0-9]/g, '')
  return key === 'ctabanner' || key === 'cta' || key.includes('ctabanner')
}

function isAdvisorVisibleSection(name) {
  return isHeroSection(name) || isWhatWeDoSection(name) || isAboutSection(name) || isCompanyHistorySection(name) || isFeaturedServicesSection(name) || isAnnualProgressionSection(name) || isPortfolioSection(name) || isBranchesSection(name) || isCounterStatsSection(name) || isTestimonialsSection(name) || isLatestNewsSection(name) || isClientLogosSection(name) || isCtaBannerSection(name)
}

function advisorSectionOrder(name) {
  if (isHeroSection(name)) return 0
  if (isWhatWeDoSection(name)) return 1
  if (isAboutSection(name)) return 2
  if (isCompanyHistorySection(name)) return 3
  if (isFeaturedServicesSection(name)) return 4
  if (isAnnualProgressionSection(name)) return 5
  if (isPortfolioSection(name)) return 6
  if (isBranchesSection(name)) return 7
  if (isCounterStatsSection(name)) return 8
  if (isTestimonialsSection(name)) return 9
  if (isLatestNewsSection(name)) return 10
  if (isClientLogosSection(name)) return 11
  if (isCtaBannerSection(name)) return 12
  return 99
}

function sectionIcon(name) {
  if (isHeroSection(name)) return FaImages
  if (isWhatWeDoSection(name)) return FaLightbulb
  if (isAboutSection(name)) return FaUserTie
  if (isCompanyHistorySection(name)) return FaLandmark
  if (isFeaturedServicesSection(name)) return FaBriefcase
  if (isAnnualProgressionSection(name)) return FaChartLine
  if (isPortfolioSection(name)) return FaLayerGroup
  if (isBranchesSection(name)) return FaBuilding
  if (isCounterStatsSection(name)) return FaChartPie
  if (isTestimonialsSection(name)) return FaComments
  if (isLatestNewsSection(name)) return FaFileAlt
  if (isClientLogosSection(name)) return FaAward
  if (isCtaBannerSection(name)) return FaHandHoldingUsd
  return FaLayerGroup
}

const REQUEST_STATUS_CONFIG = {
  deployed: {
    label: 'Deployed',
    icon: FaCheckCircle,
    className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    dot: 'bg-emerald-500',
    cardClass: 'border-emerald-200 bg-gradient-to-br from-emerald-50/80 to-white',
  },
  pending: {
    label: 'Pending',
    icon: FaClock,
    className: 'bg-amber-50 text-amber-700 border-amber-200',
    dot: 'bg-amber-500',
    cardClass: 'border-amber-200 bg-gradient-to-br from-amber-50/60 to-white',
  },
  rejected: {
    label: 'Rejected',
    icon: FaTimesCircle,
    className: 'bg-rose-50 text-rose-700 border-rose-200',
    dot: 'bg-rose-500',
    cardClass: 'border-rose-200 bg-gradient-to-br from-rose-50/50 to-white',
  },
}

function RequestStatusBadge({ status }) {
  const config = REQUEST_STATUS_CONFIG[status]
  if (!config) return null
  const Icon = config.icon
  return (
    <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-full border uppercase tracking-wide ${config.className}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
      <Icon className="w-3 h-3" />
      {config.label}
    </span>
  )
}

function DeploymentSummaryBadge({ deployed, pending, rejected }) {
  if (!deployed && !pending && !rejected) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full border bg-slate-50 text-slate-600 border-slate-200">
        No deployments yet
      </span>
    )
  }
  return (
    <div className="flex flex-wrap gap-2 justify-end">
      {deployed > 0 && (
        <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
          <FaCheckCircle className="w-3 h-3" />
          {deployed} live
        </span>
      )}
      {pending > 0 && (
        <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
          <FaClock className="w-3 h-3" />
          {pending} pending
        </span>
      )}
      {rejected > 0 && (
        <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
          <FaTimesCircle className="w-3 h-3" />
          {rejected} rejected
        </span>
      )}
    </div>
  )
}

function DeploymentRequestCard({ request, isActive, onSelect }) {
  const getRoleLabel = (k) => ({ power_admin: 'Power Admin', advisor: 'Advisor', approver: 'Approver', manager: 'Manager', client_admin: 'Client Admin' }[k] || k)
  const powerAdminLabel = getRoleLabel('power_admin')
  const config = REQUEST_STATUS_CONFIG[request.status] || REQUEST_STATUS_CONFIG.pending
  const isDeployed = request.status === 'deployed'

  return (
    <div
      className={`rounded-xl border p-4 transition-all ${config.cardClass} ${
        isActive ? 'ring-2 ring-[var(--brand)] ring-offset-1 shadow-md' : 'shadow-sm hover:shadow-md'
      }`}
    >
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <div className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${
            isDeployed ? 'bg-emerald-100 text-emerald-600' : request.status === 'pending' ? 'bg-amber-100 text-amber-600' : 'bg-rose-100 text-rose-600'
          }`}>
            {isDeployed ? <FaGlobeAmericas className="w-4 h-4" /> : request.status === 'pending' ? <FaClock className="w-4 h-4" /> : <FaTimesCircle className="w-4 h-4" />}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center flex-wrap gap-2">
              <h3 className="font-extrabold text-sm text-[var(--brand-dark)] truncate">{request.domain_name}</h3>
              <RequestStatusBadge status={request.status} />
              {isActive && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[var(--brand)] text-white uppercase tracking-wide">
                  Editing
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Template: <span className="font-semibold text-gray-700">{request.template_name || 'template4'}</span>
              {isDeployed && request.cpanel_domain && (
                <> · cPanel: <code className="font-mono text-[11px] bg-white/80 px-1.5 py-0.5 rounded border border-gray-200">{request.cpanel_domain}</code></>
              )}
            </p>
            {request.status === 'rejected' && request.rejection_reason && (
              <p className="text-xs text-rose-700 mt-2 bg-white/70 border border-rose-100 rounded-lg px-2.5 py-2">
                {request.rejection_reason}
              </p>
            )}
            {request.status === 'pending' && (
              <p className="text-xs text-amber-700 mt-2">
                Awaiting {powerAdminLabel} review and cPanel deployment.
              </p>
            )}
            <div className="flex items-center flex-wrap gap-2 mt-2">
              <span className="w-4 h-4 rounded-full border border-white shadow-sm ring-1 ring-gray-200" style={{ backgroundColor: request.primary_color || '#0f5c45' }} title="Primary" />
              <span className="w-4 h-4 rounded-full border border-white shadow-sm ring-1 ring-gray-200" style={{ backgroundColor: request.secondary_color || '#0a3f30' }} title="Secondary" />
              {request.logo_url && (
                <span className="text-[10px] text-gray-500 font-medium">Logo attached</span>
              )}
              {request.favicon_url && (
                <span className="text-[10px] text-gray-500 font-medium">Favicon attached</span>
              )}
            </div>
          </div>
        </div>
        {isDeployed && onSelect && (
          <button
            type="button"
            onClick={onSelect}
            className={`shrink-0 text-xs font-bold px-3 py-2 rounded-lg transition ${
              isActive
                ? 'bg-[var(--brand)] text-white shadow-sm'
                : 'bg-white text-[var(--brand-dark)] border border-gray-200 hover:border-[color-mix(in_srgb,var(--brand)_40%,transparent)] hover:bg-gray-50'
            }`}
          >
            {isActive ? 'Selected' : 'Edit Content'}
          </button>
        )}
        {isDeployed && (
          <span className="shrink-0 inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-white border border-emerald-200 px-2 py-1 rounded-lg">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Live
          </span>
        )}
      </div>
    </div>
  )
}

function AlertBanner({ type, message, onDismiss }) {
  const isSuccess = type === 'success'
  return (
    <div
      className={`${
        isSuccess ? 'bg-emerald-50 border-emerald-500 text-emerald-800' : 'bg-rose-50 border-rose-500 text-rose-800'
      } border-l-4 p-4 mb-6 rounded-xl shadow-sm flex items-start justify-between gap-3 text-sm font-medium`}
      role="alert"
    >
      <span className="flex items-start gap-2 flex-1">
        {isSuccess ? <FaCheckCircle className="w-4 h-4 mt-0.5 shrink-0" /> : <FaExclamationTriangle className="w-4 h-4 mt-0.5 shrink-0" />}
        {message}
      </span>
      <button type="button" onClick={onDismiss} className="shrink-0 p-1 rounded-lg hover:bg-black/5 transition" aria-label="Dismiss">
        <FaTimes className="w-4 h-4" />
      </button>
    </div>
  )
}

function ModalShell({ title, subtitle, onClose, children, maxWidth = 'max-w-lg' }) {
  return createPortal(
    <div className="wc-app wc-portal-root">
      <div className="fixed inset-0 bg-[color-mix(in_srgb,var(--brand-dark)_60%,transparent)] backdrop-blur-sm flex items-center justify-center p-4 z-[80]">
        <div
          className={`bg-white rounded-2xl ${maxWidth} w-full shadow-2xl border border-gray-200 max-h-[90vh] overflow-y-auto`}
          role="dialog"
          aria-modal="true"
        >
          <div className="sticky top-0 bg-white z-10 flex items-start justify-between gap-4 p-6 border-b border-gray-100">
            <div>
              <h3 className="text-lg font-bold text-[var(--brand-dark)]">{title}</h3>
              {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
            </div>
            <button type="button" onClick={onClose} className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition" aria-label="Close">
              <FaTimes className="w-4 h-4" />
            </button>
          </div>
          <div className="p-6">{children}</div>
        </div>
      </div>
    </div>,
    document.body
  )
}

function StepCard({ step, title, description, badge, children, className = '', defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div className={`bg-white rounded-2xl shadow-sm border border-gray-200/80 overflow-hidden mb-8 ${className}`}>
      <div className="flex items-start justify-between gap-4 px-6 py-5 border-b border-gray-100 bg-gradient-to-r from-white to-gray-50/80">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex items-start gap-4 min-w-0 flex-1 text-left group"
        >
          <div className="shrink-0 w-10 h-10 rounded-xl bg-[var(--brand-dark)] text-white flex items-center justify-center text-sm font-extrabold shadow-md shadow-[color-mix(in_srgb,var(--brand-dark)_20%,transparent)]">
            {step}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-extrabold text-[var(--brand-dark)] group-hover:text-[var(--brand)] transition-colors">{title}</h2>
              <FaChevronDown
                className={`w-3.5 h-3.5 text-gray-400 shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
              />
            </div>
            {description && <p className="text-sm text-gray-500 mt-0.5">{description}</p>}
          </div>
        </button>
        {badge && <div className="shrink-0">{badge}</div>}
      </div>
      {open && <div className="p-6">{children}</div>}
    </div>
  )
}

function WorkflowStepper({ isSiteDeployed, hasPage, hasSections, isComplete }) {
  const steps = [
    { label: 'Deploy', done: isSiteDeployed, active: !isSiteDeployed },
    { label: 'Select Page', done: hasPage, active: isSiteDeployed && !hasPage },
    { label: 'Lock Sections', done: hasSections, active: isSiteDeployed && hasPage && !hasSections },
    { label: 'Edit & Submit', done: isComplete, active: isSiteDeployed && hasSections && !isComplete },
  ]
  return (
    <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm p-5 mb-8">
      <div className="flex items-center justify-between gap-2 overflow-x-auto">
        {steps.map((s, i) => (
          <div key={s.label} className="flex items-center flex-1 min-w-0">
            <div className="flex flex-col items-center gap-1.5 flex-1 min-w-[72px]">
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-extrabold transition-all ${
                  s.done
                    ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/30'
                    : s.active
                      ? 'bg-[var(--brand)] text-white shadow-md shadow-[color-mix(in_srgb,var(--brand)_30%,transparent)] ring-4 ring-[color-mix(in_srgb,var(--brand)_15%,transparent)]'
                      : 'bg-gray-100 text-gray-400 border border-gray-200'
                }`}
              >
                {s.done ? <FaCheckCircle className="w-4 h-4" /> : i + 1}
              </div>
              <span className={`text-[10px] sm:text-xs font-bold text-center leading-tight ${s.done || s.active ? 'text-[var(--brand-dark)]' : 'text-gray-400'}`}>
                {s.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div className={`h-0.5 flex-1 mx-1 sm:mx-2 rounded-full min-w-[16px] ${s.done ? 'bg-emerald-400' : 'bg-gray-200'}`} />
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

const inputClass =
  'w-full text-sm p-2.5 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-[color-mix(in_srgb,var(--brand)_30%,transparent)] focus:border-[var(--brand)] transition bg-white'
const labelClass = 'block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1.5'

function itemTabKey(secId, group) {
  return `${secId}:${group}`
}

function ItemTabBar({ hint, count, labelPrefix, activeIndex, onSelect, hasContentAt }) {
  return (
    <div className="flex items-center justify-between flex-wrap gap-3">
      {hint ? <p className="text-xs text-gray-500">{hint}</p> : <span />}
      <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-xl overflow-x-auto max-w-full">
        {Array.from({ length: count }, (_, i) => i).map((index) => {
          const isActive = activeIndex === index
          const hasContent = hasContentAt ? hasContentAt(index) : false
          return (
            <button
              key={index}
              type="button"
              onClick={() => onSelect(index)}
              className={`relative inline-flex items-center gap-1.5 text-xs font-bold px-2.5 sm:px-3 py-1.5 rounded-lg transition whitespace-nowrap ${
                isActive ? 'bg-white text-[var(--brand-dark)] shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {labelPrefix} {index + 1}
              {hasContent && (
                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isActive ? 'bg-[var(--brand)]' : 'bg-emerald-400'}`} />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function ItemPanel({ index, title, children }) {
  return (
    <div className="border border-gray-200 rounded-xl p-4 bg-gray-50/50">
      <h5 className="text-sm font-bold text-[var(--brand-dark)] mb-4 flex items-center gap-2">
        <span className="w-6 h-6 rounded-full bg-[var(--brand)] text-white flex items-center justify-center text-xs">{index + 1}</span>
        {title}
      </h5>
      {children}
    </div>
  )
}

function defaultFeaturedServiceBoxes() {
  return [
    { icon: 'chart-pie', heading: 'Strategy & Planning', text: 'Collaborate Consulting exists to find the place where being seeming disparate interests meet.', button_text: 'Read more', button_url: '#service-strategy-planning' },
    { icon: 'tasks', heading: 'Program Manager', text: 'Collaborate Consulting exists to find the place where being seeming disparate interests meet.', button_text: 'Read more', button_url: '#service-program-manager' },
    { icon: 'landmark', heading: 'Tax Management', text: 'Collaborate Consulting exists to find the place where being seeming disparate interests meet.', button_text: 'Read more', button_url: '#service-tax-management' },
    { icon: 'coins', heading: 'Investment Policy', text: 'Collaborate Consulting exists to find the place where being seeming disparate interests meet.', button_text: 'Read more', button_url: '#service-investment-policy' },
    { icon: 'holding', heading: 'Financial Advices', text: 'Collaborate Consulting exists to find the place where being seeming disparate interests meet.', button_text: 'Read more', button_url: '#service-financial-advices' },
    { icon: 'seedling', heading: 'Business Growth Plan', text: 'Collaborate Consulting exists to find the place where being seeming disparate interests meet.', button_text: 'Read more', button_url: '#service-business-growth-plan' },
  ]
}

function normalizeFeaturedServicesEditorContent(content) {
  const c = content && typeof content === 'object' ? content : {}
  const defaults = defaultFeaturedServiceBoxes()
  const list = Array.isArray(c.boxes) && c.boxes.length
    ? c.boxes
    : (Array.isArray(c.items) ? c.items : [])
  return {
    subheading: c.subheading || 'FEATURED SERVICES',
    heading: c.heading || 'We help to get Solutions!',
    text: c.text || 'Provide users with appropriate view and access permissions to requests, problems, changes, contracts, assets, solutions',
    boxes: defaults.map((fallback, i) => {
      const item = list[i] && typeof list[i] === 'object' ? list[i] : {}
      return {
        icon: item.icon || fallback.icon,
        heading: item.heading || item.title || fallback.heading,
        text: item.text || item.desc || fallback.text,
        button_text: item.button_text || item.read_more || fallback.button_text,
        button_url: item.button_url || item.url || item.link || (item.slug ? `#service-${item.slug}` : fallback.button_url),
      }
    }),
  }
}

function parseProgressPct(value, fallback) {
  const n = parseInt(String(value ?? '').replace(/[^0-9]/g, ''), 10)
  if (Number.isNaN(n)) return fallback
  return Math.min(100, Math.max(0, n))
}

function defaultAnnualProgressionBars() {
  return [
    { label: 'Business growth', year: '2018', pct: 70 },
    { label: 'Investment growth', year: '2019', pct: 80 },
    { label: 'Financial growth', year: '2020', pct: 90 },
  ]
}

function defaultAnnualProgressionHighlights() {
  return [
    { icon: 'shield-alt', heading: 'Risk Free', text: 'We offer risk free business for tension free life.' },
    { icon: 'chart-line', heading: 'Business Growth', text: 'We ensure the business growth without conditions.' },
  ]
}

function normalizeAnnualProgressionEditorContent(content) {
  const c = content && typeof content === 'object' ? content : {}
  const legacy = Boolean(c.eyebrow && c.subheading && !c.text)
  const barDefaults = defaultAnnualProgressionBars()
  const highlightDefaults = defaultAnnualProgressionHighlights()
  const barList = Array.isArray(c.bars) && c.bars.length
    ? c.bars
    : (Array.isArray(c.progress) ? c.progress : [])
  const highlightList = Array.isArray(c.highlights) && c.highlights.length
    ? c.highlights
    : (Array.isArray(c.features) ? c.features : [])
  return {
    subheading: legacy ? (c.eyebrow || 'ANNUAL PROGRESSION') : (c.subheading || c.eyebrow || 'ANNUAL PROGRESSION'),
    heading: c.heading || 'Our Business Growth is Really Incredible!',
    text: legacy
      ? (c.subheading || '')
      : (c.text || 'We love what we do and we do it with passion. We value the experimentation, the reformation of the message, and the smart incentives.'),
    bars: barDefaults.map((fallback, i) => {
      const item = barList[i] && typeof barList[i] === 'object' ? barList[i] : {}
      return {
        label: item.label || item.heading || item.title || fallback.label,
        year: item.year || fallback.year,
        pct: parseProgressPct(item.pct ?? item.percent ?? item.value ?? item.percentage, fallback.pct),
      }
    }),
    highlights: highlightDefaults.map((fallback, i) => {
      const item = highlightList[i] && typeof highlightList[i] === 'object' ? highlightList[i] : {}
      return {
        icon: item.icon || fallback.icon,
        heading: item.heading || item.title || fallback.heading,
        text: item.text || item.desc || item.description || fallback.text,
      }
    }),
  }
}

function defaultPortfolioItems() {
  return [
    { heading: 'Market Expansion', category: 'Business Strategy', image_url: 'intime-12.jpg', button_text: 'Read more', button_url: '#portfolio' },
    { heading: 'Business Growth', category: 'Investment', image_url: 'intime-11.jpg', button_text: 'Read more', button_url: '#portfolio' },
    { heading: 'Tax Management', category: 'Tax Consulting', image_url: 'intime-08.jpg', button_text: 'Read more', button_url: '#portfolio' },
    { heading: 'Investment Policy', category: 'Business Strategy', image_url: 'intime-10.jpg', button_text: 'Read more', button_url: '#portfolio' },
    { heading: 'Manage Investment', category: 'Investment', image_url: 'intime-04.jpg', button_text: 'Read more', button_url: '#portfolio' },
    { heading: 'Financial Advices', category: 'Tax Consulting', image_url: 'intime-01.jpg', button_text: 'Read more', button_url: '#portfolio' },
  ]
}

function normalizePortfolioEditorContent(content) {
  const c = content && typeof content === 'object' ? content : {}
  const legacy = Boolean(c.eyebrow && c.subheading && !c.items)
  const defaults = defaultPortfolioItems()
  const list = Array.isArray(c.items) && c.items.length
    ? c.items
    : (Array.isArray(c.projects) && c.projects.length ? c.projects : (Array.isArray(c.boxes) ? c.boxes : []))
  return {
    subheading: legacy ? (c.eyebrow || 'COMPLETED PROJECTS') : (c.subheading || c.eyebrow || 'COMPLETED PROJECTS'),
    heading: c.heading || 'You can check our projects as inspirations.',
    items: defaults.map((fallback, i) => {
      const item = list[i] && typeof list[i] === 'object' ? list[i] : {}
      return {
        heading: item.heading || item.title || fallback.heading,
        category: item.category || item.cat || item.caption || fallback.category,
        image_url: item.image_url || item.image || item.img || fallback.image_url,
        image_preview: item.image_preview || '',
        button_text: item.button_text || item.read_more || fallback.button_text,
        button_url: item.button_url || item.url || item.link || fallback.button_url,
      }
    }),
  }
}

function portfolioPreviewPayload(values) {
  const normalized = normalizePortfolioEditorContent(values || {})
  return withAbsoluteUploadUrls({
    ...normalized,
    items: (normalized.items || []).map((item) => {
      const preview = item.image_preview || ''
      const image = preview || item.image_url || ''
      const absImage = /^data:|^blob:/i.test(image)
        ? image
        : (isUploadedAsset(image) ? absoluteAssetUrl(image) : image)
      return {
        ...item,
        image_preview: preview || undefined,
        image_url: absImage || image,
        image: absImage || image,
        img: absImage || image,
      }
    }),
  })
}

function defaultBranchItems() {
  return [
    { name: 'Sydney (Head Office)', address: '1 Epping Road, North Ryde, NSW 2113', phone: '+61 2 9870 7689', email: 'email@example.com' },
    { name: 'Brisbane', address: 'Level 28, 400 George Street, Brisbane, QLD 4000', phone: '+61 2 9870 7689', email: 'email@example.com' },
    { name: 'Hobart', address: '85 Macquarie Finoa Street, Hobart, TAS 7000', phone: '+61 2 9870 7689', email: 'email@example.com' },
    { name: 'Melbourne', address: 'Level 5, 4 Freshwater Place, Southbank, VIC 3006', phone: '+61 2 9870 7689', email: 'email@example.com' },
  ]
}

function normalizeBranchesEditorContent(content) {
  const c = content && typeof content === 'object' ? content : {}
  const legacyLabel = Boolean(c.eyebrow)
  const defaults = defaultBranchItems()
  const list = Array.isArray(c.items) && c.items.length
    ? c.items
    : (Array.isArray(c.branches) && c.branches.length ? c.branches : (Array.isArray(c.offices) ? c.offices : []))
  return {
    subheading: legacyLabel ? (c.eyebrow || 'GET IN TOUCH') : (c.subheading || 'GET IN TOUCH'),
    heading: c.heading || 'We are Connected All Time to Help Your Business!',
    text: legacyLabel
      ? (c.text || c.subheading || 'We understand the importance of approaching each work integrally and believe in the power of simple and easy communication.')
      : (c.text || 'We understand the importance of approaching each work integrally and believe in the power of simple and easy communication.'),
    form_heading: c.form_heading || 'Book an appionment',
    button_text: c.button_text || 'SEND YOUR MESSAGE',
    branches_label: c.branches_label || 'Main Branches:',
    stat_value: c.stat_value || '12+',
    stat_label: c.stat_label || 'Branches',
    map_image: c.map_image || c.image_url || c.image || c.img || 'maps-point.png',
    image_preview: c.image_preview || '',
    items: defaults.map((fallback, i) => {
      const item = list[i] && typeof list[i] === 'object' ? list[i] : {}
      return {
        name: item.name || item.heading || item.title || fallback.name,
        address: item.address || fallback.address,
        phone: item.phone || item.tel || fallback.phone,
        email: item.email || fallback.email,
      }
    }),
  }
}

function branchesPreviewPayload(values) {
  const normalized = normalizeBranchesEditorContent(values || {})
  const preview = normalized.image_preview || ''
  const image = preview || normalized.map_image || ''
  const absImage = /^data:|^blob:/i.test(image)
    ? image
    : (isUploadedAsset(image) ? absoluteAssetUrl(image) : image)
  return withAbsoluteUploadUrls({
    ...normalized,
    map_image: absImage || image,
    image_url: absImage || image,
    image: absImage || image,
    image_preview: preview || undefined,
  })
}

function defaultCounterStats() {
  return [
    { icon: 'users', value: '2,800+', label: 'Active Clients', sub: 'Empowering businesses globally with passion and proven expertise.' },
    { icon: 'star', value: '1,670+', label: '5-Star Reviews', sub: 'Top customer satisfaction and unmatched quality of service.' },
    { icon: 'user-tie', value: '106+', label: 'Team Members', sub: 'Dedicated specialists and leaders driving continuous innovation.' },
    { icon: 'award', value: '99.8%', label: 'Success Rate', sub: 'Consistently delivering top-tier performance and business growth.' },
  ]
}

function normalizeCounterStatsEditorContent(content) {
  const c = content && typeof content === 'object' ? content : {}
  const defaults = defaultCounterStats()
  const list = Array.isArray(c.stats) && c.stats.length
    ? c.stats
    : (Array.isArray(c.items) && c.items.length ? c.items : [])
  return {
    stats: defaults.map((fallback, i) => {
      const item = list[i] && typeof list[i] === 'object' ? list[i] : {}
      const n = i + 1
      return {
        icon: item.icon || c[`stat_${n}_icon`] || fallback.icon,
        value: item.value || item.number || c[`stat_${n}_value`] || fallback.value,
        label: item.label || item.title || item.heading || c[`stat_${n}_label`] || fallback.label,
        sub: item.sub || item.desc || item.description || item.text || c[`stat_${n}_sub`] || fallback.sub,
      }
    }),
  }
}

function defaultTestimonialItems() {
  return [
    { quote: 'Working with several word press themes and templates the last years, I only can say this is the best in every level. I use it for my company and the reviews that I have already are all excellent.', name: 'Alina Lora', role: 'Former Manager, Intime', image_url: 'testimonial-01.jpg' },
    { quote: 'This is one of the BEST THEMES I have ever worked with. The extra bells and whistles added to it are amazing. Elementor features add extra flavor. The customer support is very responsive.', name: 'Rohan Jho', role: 'Former Manager, Intime', image_url: 'testimonial-02.jpg' },
    { quote: 'Great theme, one of the best I have worked with in a while. Full featured and great support for the minor issues I had which were really my not being skilled/experienced enough.', name: 'Donald Frew', role: 'Former Manager, Intime', image_url: 'testimonial-03.jpg' },
  ]
}

function normalizeTestimonialsEditorContent(content) {
  const c = content && typeof content === 'object' ? content : {}
  const defaults = defaultTestimonialItems()
  const list = Array.isArray(c.items) && c.items.length
    ? c.items
    : (Array.isArray(c.testimonials) && c.testimonials.length ? c.testimonials : [])
  const legacyThin = Boolean(c.eyebrow && c.heading && !list.length)
  const reviewsLabel = c.reviews_label || c.label || (legacyThin && String(c.subheading || '').length > 40 ? 'Clients Reviews:' : (c.subheading || 'Clients Reviews:'))
  return {
    eyebrow: c.eyebrow || c.tagline || "CLIENT'S TESTIMONIALS",
    heading: c.heading || "We are Very Happy to Get Our Client's Reviews.",
    subheading: reviewsLabel,
    image_url: c.image_url || c.image || c.img || c.side_image || 'intime-17.jpg',
    image_preview: c.image_preview || '',
    items: defaults.map((fallback, i) => {
      const item = list[i] && typeof list[i] === 'object' ? list[i] : {}
      return {
        quote: item.quote || item.text || item.review || fallback.quote,
        name: item.name || item.title || item.author || fallback.name,
        role: item.role || item.position || item.job || item.desc || fallback.role,
        image_url: item.image_url || item.image || item.img || item.avatar || fallback.image_url,
        image_preview: item.image_preview || '',
      }
    }),
  }
}

function testimonialsPreviewPayload(values) {
  const normalized = normalizeTestimonialsEditorContent(values || {})
  const sidePreview = normalized.image_preview || ''
  const sideImage = sidePreview || normalized.image_url || ''
  const absSide = /^data:|^blob:/i.test(sideImage)
    ? sideImage
    : (isUploadedAsset(sideImage) ? absoluteAssetUrl(sideImage) : sideImage)
  return withAbsoluteUploadUrls({
    ...normalized,
    image_url: absSide || sideImage,
    image: absSide || sideImage,
    img: absSide || sideImage,
    image_preview: sidePreview || undefined,
    items: (normalized.items || []).map((item) => {
      const preview = item.image_preview || ''
      const image = preview || item.image_url || ''
      const absImage = /^data:|^blob:/i.test(image)
        ? image
        : (isUploadedAsset(image) ? absoluteAssetUrl(image) : image)
      return {
        ...item,
        image_preview: preview || undefined,
        image_url: absImage || image,
        image: absImage || image,
        img: absImage || image,
      }
    }),
  })
}

function defaultLatestNewsItems() {
  return [
    { date: '10', month: 'Nov, 20', author: 'John Doe', cat: 'Consulting', title: 'We would love to share a similar experience', excerpt: 'The theory was first published in 2008 a press released under the name of Cliff Arnall, who at the time was a tutor at the…', image_url: 'intime-03.jpg', button_text: 'Read more', button_url: '#news' },
    { date: '06', month: 'Nov, 20', author: 'John Doe', cat: 'HR Consulting', title: 'We glad to discuss your organisation situation.', excerpt: 'The theory was first published in 2008 a press released under the name of Cliff Arnall, who at the time was a tutor at the…', image_url: 'intime-02.jpg', button_text: 'Read more', button_url: '#news' },
    { date: '20', month: 'Oct, 20', author: 'John Doe', cat: 'Consulting', title: 'In this context our main approach was to build.', excerpt: 'The theory was first published in 2008 a press released under the name of Cliff Arnall, who at the time was a tutor at the…', image_url: 'intime-05.jpg', button_text: 'Read more', button_url: '#news' },
  ]
}

function normalizeLatestNewsEditorContent(content) {
  const c = content && typeof content === 'object' ? content : {}
  const defaults = defaultLatestNewsItems()
  const list = Array.isArray(c.items) && c.items.length
    ? c.items
    : (Array.isArray(c.posts) && c.posts.length ? c.posts : [])
  return {
    eyebrow: c.eyebrow || c.tagline || 'OUR LATEST NEWS',
    heading: c.heading || 'Learn about our latest news from blog.',
    items: defaults.map((fallback, i) => {
      const item = list[i] && typeof list[i] === 'object' ? list[i] : {}
      return {
        date: item.date || item.day || fallback.date,
        month: item.month || item.month_label || fallback.month,
        author: item.author || item.by || fallback.author,
        cat: item.cat || item.category || item.tag || fallback.cat,
        title: item.title || item.heading || fallback.title,
        excerpt: item.excerpt || item.text || item.desc || item.description || fallback.excerpt,
        image_url: item.image_url || item.image || item.img || fallback.image_url,
        image_preview: item.image_preview || '',
        button_text: item.button_text || item.read_more || fallback.button_text,
        button_url: item.button_url || item.url || item.link || fallback.button_url,
      }
    }),
  }
}

function latestNewsPreviewPayload(values) {
  const normalized = normalizeLatestNewsEditorContent(values || {})
  return withAbsoluteUploadUrls({
    ...normalized,
    items: (normalized.items || []).map((item) => {
      const preview = item.image_preview || ''
      const image = preview || item.image_url || ''
      const absImage = /^data:|^blob:/i.test(image)
        ? image
        : (isUploadedAsset(image) ? absoluteAssetUrl(image) : image)
      return {
        ...item,
        image_preview: preview || undefined,
        image_url: absImage || image,
        image: absImage || image,
        img: absImage || image,
      }
    }),
  })
}

function defaultClientLogoItems() {
  return [
    { name: 'slack', image_url: '' },
    { name: 'Google', image_url: '' },
    { name: 'envato', image_url: '' },
    { name: 'Sketch', image_url: '' },
    { name: 'Figma', image_url: '' },
  ]
}

function normalizeClientLogosEditorContent(content) {
  const c = content && typeof content === 'object' ? content : {}
  const defaults = defaultClientLogoItems()
  const list = Array.isArray(c.items) && c.items.length
    ? c.items
    : (Array.isArray(c.logos) && c.logos.length ? c.logos : [])
  return {
    items: defaults.map((fallback, i) => {
      const raw = list[i]
      const item = typeof raw === 'string' ? { name: raw } : (raw && typeof raw === 'object' ? raw : {})
      return {
        name: item.name || item.label || item.title || item.text || fallback.name,
        image_url: item.image_url || item.image || item.img || item.logo || fallback.image_url,
        image_preview: item.image_preview || '',
      }
    }),
  }
}

function clientLogosPreviewPayload(values) {
  const normalized = normalizeClientLogosEditorContent(values || {})
  return withAbsoluteUploadUrls({
    ...normalized,
    items: (normalized.items || []).map((item) => {
      const preview = item.image_preview || ''
      const image = preview || item.image_url || ''
      const absImage = /^data:|^blob:/i.test(image)
        ? image
        : (isUploadedAsset(image) ? absoluteAssetUrl(image) : image)
      return {
        ...item,
        image_preview: preview || undefined,
        image_url: absImage || image,
        image: absImage || image,
        img: absImage || image,
        logo: absImage || image,
      }
    }),
  })
}

function normalizeCtaBannerEditorContent(content) {
  const c = content && typeof content === 'object' ? content : {}
  return {
    heading: c.heading || c.title || 'Looking for the Best Business Consulting?',
    subheading: c.subheading || c.text || c.desc || c.description || 'As a web crawler expert, we will help to organize.',
    button_text: c.button_text || c.btn_text || c.button || 'GET A QUOTE',
    button_url: c.button_url || c.btn_url || c.url || c.link || '#appointment',
  }
}

function defaultAboutGauges() {
  return [
    { value: '50%', label: 'Business strategy growth' },
    { value: '75%', label: 'Finance valuable ideas' },
  ]
}

function normalizeAboutEditorContent(content) {
  const c = content && typeof content === 'object' ? { ...content } : {}
  const defaults = defaultAboutGauges()
  const list = Array.isArray(c.gauges) && c.gauges.length
    ? c.gauges
    : (Array.isArray(c.stats) ? c.stats : [])
  c.gauges = defaults.map((fallback, i) => {
    const item = list[i] && typeof list[i] === 'object' ? list[i] : {}
    const n = i + 1
    return {
      ...fallback,
      ...item,
      value: c[`percent_${n}`] || c[`percentage_${n}`] || item.value || item.percentage || item.pct || fallback.value,
      label: c[`percent_${n}_text`] || c[`percentage_${n}_text`] || item.label || item.text || item.heading || fallback.label,
    }
  })
  if (!c.eyebrow) c.eyebrow = 'ABOUT US'
  c.experience_years = c.experience_years || c.red_box_number || c.red_box || c.years || '10+'
  c.experience_label = c.experience_label || c.red_box_text || c.red_box_label || 'Years of Experience'
  c.red_box_number = c.experience_years
  c.red_box_text = c.experience_label
  if (!c.image_url) c.image_url = c.image || c.img || ''
  c.percent_1 = c.gauges[0].value
  c.percent_1_text = c.gauges[0].label
  c.percent_2 = c.gauges[1].value
  c.percent_2_text = c.gauges[1].label
  return c
}

function withAbsoluteUploadUrls(value) {
  if (typeof value === 'string') {
    return isUploadedAsset(value) ? absoluteAssetUrl(value) : value
  }
  if (Array.isArray(value)) return value.map(withAbsoluteUploadUrls)
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, withAbsoluteUploadUrls(v)]))
  }
  return value
}

function defaultCompanyHistoryYears() {
  return [
    { year: '2010', red_text: '2010 Milestone', grey_text: 'Company Founded', heading: 'Started Business', image_url: 'intime-06.jpg', text: "We partner with you to enable your technology so you focus on your organization's mission, leveraging our top-tier talent." },
    { year: '2012', red_text: '2012 Milestone', grey_text: '10+ Key Partners', heading: 'Resilience & Expansion', image_url: 'intime-07.jpg', text: 'A dedicated People Ops leader committed to the growth and continuous development of leaders across operations.' },
    { year: '2016', red_text: '2016 Milestone', grey_text: '24/7 Support Launched', heading: 'Crisis & Opportunity', image_url: 'intime-09.jpg', text: 'Our support works around the clock to ensure your business operations are secure, resilient, and monitored safely.' },
    { year: '2017', red_text: '2017 Milestone', grey_text: '50+ Nationwide Branches', heading: '50+ Branches Milestone', image_url: 'intime-01.jpg', text: 'We cross industries and provide services to almost every business either as a co-managed or supplemental asset.' },
    { year: '2019', red_text: '2019 Milestone', grey_text: 'Global Market Entry', heading: '100+ Global Branches', image_url: 'intime-04.jpg', text: 'Providing consulting expertise on vendor technology, IT budget strategy, and multi-cloud enterprise security.' },
    { year: '2021', red_text: '2021 Milestone', grey_text: 'Top Enterprise Award', heading: 'Industry Excellence Award', image_url: 'intime-10.jpg', text: 'Our team is held to the highest level of accountability to ensure exceptional satisfaction and proven results.' },
  ]
}

function normalizeCompanyHistoryEditorContent(content) {
  const c = content && typeof content === 'object' ? { ...content } : {}
  const defaults = defaultCompanyHistoryYears()
  const legacy = Boolean(c.eyebrow && c.subheading && !c.text && !c.years)
  const list = Array.isArray(c.years) && c.years.length
    ? c.years
    : (Array.isArray(c.items) && c.items.length ? c.items : (Array.isArray(c.milestones) ? c.milestones : []))
  const originalSubheading = c.subheading
  c.subheading = legacy ? (c.eyebrow || 'OUR JOURNEY') : (c.subheading || c.eyebrow || 'OUR JOURNEY')
  c.text = legacy ? (originalSubheading || '') : (c.text || 'A decade of growth, innovation, and unwavering commitment to client success.')
  if (!c.heading) c.heading = 'Our Company History'
  c.years = defaults.map((fallback, i) => {
    const item = list[i] && typeof list[i] === 'object' ? list[i] : {}
    const year = item.year || fallback.year
    return {
      ...fallback,
      ...item,
      year,
      red_text: item.red_text || item.milestone || item.badge || (year ? `${year} Milestone` : fallback.red_text),
      grey_text: item.grey_text || item.highlight || item.caption || fallback.grey_text,
      heading: item.heading || item.title || fallback.heading,
      image_url: item.image_url || item.image || item.img || fallback.image_url,
      text: item.text || item.desc || item.description || fallback.text,
    }
  })
  return c
}

function companyHistoryPreviewPayload(values) {
  const normalized = normalizeCompanyHistoryEditorContent(values || {})
  return withAbsoluteUploadUrls({
    ...normalized,
    years: (normalized.years || []).map((year) => {
      const preview = year.image_preview || ''
      const image = preview || year.image_url || ''
      const absImage = /^data:|^blob:/i.test(image)
        ? image
        : (isUploadedAsset(image) ? absoluteAssetUrl(image) : image)
      return {
        ...year,
        image_preview: preview || undefined,
        image_url: absImage || image,
        image: absImage || image,
        img: absImage || image,
      }
    }),
  })
}

function aboutPreviewPayload(values) {
  const normalized = normalizeAboutEditorContent(values || {})
  const preview = normalized.image_preview || ''
  const image = preview || normalized.image_url || ''
  const absImage = /^data:|^blob:/i.test(image)
    ? image
    : (isUploadedAsset(image) ? absoluteAssetUrl(image) : image)
  return withAbsoluteUploadUrls({
    ...normalized,
    image_preview: preview || undefined,
    image_url: absImage || image,
    image: absImage || image,
    img: absImage || image,
    experience_years: normalized.experience_years,
    experience_label: normalized.experience_label,
    red_box_number: normalized.experience_years,
    red_box_text: normalized.experience_label,
    percent_1: normalized.gauges[0].value,
    percent_1_text: normalized.gauges[0].label,
    percent_2: normalized.gauges[1].value,
    percent_2_text: normalized.gauges[1].label,
    gauges: normalized.gauges,
  })
}

export default function AdvisorDashboard({ powerAdminDeploymentId = null, onExitPowerAdmin = null, embedded = false } = {}) {
  const { user } = useAuth()
  const getRoleLabel = (k) => ({ power_admin: 'Power Admin', advisor: 'Advisor', approver: 'Approver', manager: 'Manager', client_admin: 'Client Admin' }[k] || k); const getConsoleTitle = (r) => (r === 'advisor' ? 'Advisor console' : 'Console')
  const { can, hub, actingHub } = useHub()
  const previewBase = resolveHubPreviewBase({ hub, actingHub })
  const domainPlaceholder = hubDomainPlaceholder(previewBase)
  const canRequestDeployments = can('wc_request_deployments')
  const powerAdminLabel = getRoleLabel('power_admin')
  const advisorLabel = getRoleLabel('advisor')
  const isPowerAdminPublishMode = Boolean(powerAdminDeploymentId)
  // Advisor website branding defaults (not hub dashboard greens / showcase chrome)
  const sitePrimaryDefault = '#0B1B3D'
  const siteSecondaryDefault = '#C8102E'
  const [pages, setPages] = useState([])
  const [selectedPageId, setSelectedPageId] = useState('')
  const [sections, setSections] = useState([])
  const [checkedSectionIds, setCheckedSectionIds] = useState([])
  const [sectionEdits, setSectionEdits] = useState({})
  const [previewTab, setPreviewTab] = useState({})
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Template Request States
  const [templateRequests, setTemplateRequests] = useState([])
  const [availableTemplates, setAvailableTemplates] = useState([])
  const [templateSearch, setTemplateSearch] = useState('')
  const [activeTab, setActiveTab] = useState('templates')
  const [showTemplateModal, setShowTemplateModal] = useState(false)
  const [selectedTemplateName, setSelectedTemplateName] = useState('template4')
  const [domainName, setDomainName] = useState('')
  const [logoUrl, setLogoUrl] = useState('')
  const [faviconUrl, setFaviconUrl] = useState('')
  const [logoPreview, setLogoPreview] = useState('')
  const [faviconPreview, setFaviconPreview] = useState('')
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [uploadingFavicon, setUploadingFavicon] = useState(false)
  const [primaryColor, setPrimaryColor] = useState(sitePrimaryDefault)
  const [secondaryColor, setSecondaryColor] = useState(siteSecondaryDefault)
  const [isSubmittingTemplate, setIsSubmittingTemplate] = useState(false)
  const [selectedDeploymentId, setSelectedDeploymentId] = useState(null)
  const [uploadingState, setUploadingState] = useState({})
  const [localPreviewUrls, setLocalPreviewUrls] = useState({})
  const [localImages, setLocalImages] = useState(LOCAL_TEMPLATE_IMAGES)
  const [previewSlide, setPreviewSlide] = useState({})
  const [activeItemTab, setActiveItemTab] = useState({})
  const [expandedEditors, setExpandedEditors] = useState({})
  const [myChangeRequests, setMyChangeRequests] = useState([])
  const [crActionBusy, setCrActionBusy] = useState(null)

  useEffect(() => {
    const base = import.meta.env.BASE_URL || '/'
    fetch(`${base}assets/intime/index.json`)
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((list) => {
        if (Array.isArray(list) && list.length) setLocalImages(list)
      })
      .catch(() => {})
  }, [])

  const setLocalPreview = (key, file) => {
    setLocalPreviewUrls((prev) => {
      if (prev[key]) URL.revokeObjectURL(prev[key])
      return { ...prev, [key]: URL.createObjectURL(file) }
    })
  }

  const handleSlideImageUpload = async (secId, slideIndex, file) => {
    if (!file) return
    const uploadKey = `${secId}-${slideIndex}`
    setPreviewSlide((prev) => ({ ...prev, [secId]: slideIndex }))
    setLocalPreview(uploadKey, file)
    setUploadingState((prev) => ({ ...prev, [uploadKey]: true }))
    try {
      const formData = new FormData()
      formData.append('image', file)
      const res = await api.post('upload-image', formData)
      const uploadedUrl = storedUploadPath(res.data)
      if (uploadedUrl) {
        setSectionEdits((prev) => {
          const currentSlides = prev[secId]?.slides || [{}, {}, {}]
          const updatedSlides = [...currentSlides]
          updatedSlides[slideIndex] = { ...updatedSlides[slideIndex], bg: uploadedUrl, image_url: uploadedUrl, id: slideIndex + 1 }
          return { ...prev, [secId]: { ...(prev[secId] || {}), slides: updatedSlides } }
        })
        setMessage(`📸 Image uploaded successfully for Slide ${slideIndex + 1}!`)
      } else {
        setError('Upload succeeded but no image path was returned.')
      }
    } catch (err) {
      const fieldError = err.response?.data?.errors?.image?.[0]
      setError(fieldError || err.response?.data?.message || 'Failed to upload image.')
    } finally {
      setUploadingState((prev) => ({ ...prev, [uploadKey]: false }))
    }
  }

  const handleBoxImageUpload = async (secId, boxIndex, file) => {
    if (!file) return
    const uploadKey = `box-${secId}-${boxIndex}`
    setLocalPreview(uploadKey, file)
    setUploadingState((prev) => ({ ...prev, [uploadKey]: true }))
    try {
      const formData = new FormData()
      formData.append('image', file)
      const res = await api.post('upload-image', formData)
      const uploadedUrl = storedUploadPath(res.data)
      if (uploadedUrl) {
        setSectionEdits((prev) => {
          const currentBoxes = prev[secId]?.boxes || prev[secId]?.items || [{}, {}, {}]
          const updatedBoxes = [0, 1, 2].map((i) => ({ ...(currentBoxes[i] || {}) }))
          updatedBoxes[boxIndex] = { ...updatedBoxes[boxIndex], image_url: uploadedUrl }
          return { ...prev, [secId]: { ...(prev[secId] || {}), boxes: updatedBoxes } }
        })
        setMessage(`📸 Image uploaded successfully for Box ${boxIndex + 1}!`)
      } else {
        setError('Upload succeeded but no image path was returned.')
      }
    } catch (err) {
      const fieldError = err.response?.data?.errors?.image?.[0]
      setError(fieldError || err.response?.data?.message || 'Failed to upload image.')
    } finally {
      setUploadingState((prev) => ({ ...prev, [uploadKey]: false }))
    }
  }

  const handleYearImageUpload = async (secId, yearIndex, file) => {
    if (!file) return
    const uploadKey = `year-${secId}-${yearIndex}`
    setLocalPreview(uploadKey, file)
    setUploadingState((prev) => ({ ...prev, [uploadKey]: true }))
    const dataUrl = await new Promise((resolve) => {
      const reader = new FileReader()
      reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '')
      reader.onerror = () => resolve('')
      reader.readAsDataURL(file)
    })
    if (dataUrl) {
      setSectionEdits((prev) => {
        const source = prev[secId]?.years || prev[secId]?.items || defaultCompanyHistoryYears()
        const years = defaultCompanyHistoryYears().map((_, i) => ({ ...(source[i] || {}) }))
        years[yearIndex] = {
          ...years[yearIndex],
          image_url: dataUrl,
          image: dataUrl,
          img: dataUrl,
          image_preview: dataUrl,
        }
        return { ...prev, [secId]: { ...(prev[secId] || {}), years } }
      })
    }
    try {
      const formData = new FormData()
      formData.append('image', file)
      const res = await api.post('upload-image', formData)
      const uploadedUrl = storedUploadPath(res.data)
      if (uploadedUrl) {
        setSectionEdits((prev) => {
          const source = prev[secId]?.years || prev[secId]?.items || defaultCompanyHistoryYears()
          const years = defaultCompanyHistoryYears().map((_, i) => ({ ...(source[i] || {}) }))
          years[yearIndex] = {
            ...years[yearIndex],
            image_url: uploadedUrl,
            image: uploadedUrl,
            img: uploadedUrl,
            image_preview: dataUrl || years[yearIndex].image_preview,
          }
          return { ...prev, [secId]: { ...(prev[secId] || {}), years } }
        })
        setMessage(`📸 Image uploaded successfully for Year ${yearIndex + 1}!`)
      } else {
        setError('Upload succeeded but no image path was returned.')
      }
    } catch (err) {
      const fieldError = err.response?.data?.errors?.image?.[0]
      setError(fieldError || err.response?.data?.message || 'Failed to upload image.')
    } finally {
      setUploadingState((prev) => ({ ...prev, [uploadKey]: false }))
    }
  }

  const handlePortfolioItemImageUpload = async (secId, itemIndex, file) => {
    if (!file) return
    const uploadKey = `portfolio-${secId}-${itemIndex}`
    setLocalPreview(uploadKey, file)
    setUploadingState((prev) => ({ ...prev, [uploadKey]: true }))
    const dataUrl = await new Promise((resolve) => {
      const reader = new FileReader()
      reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '')
      reader.onerror = () => resolve('')
      reader.readAsDataURL(file)
    })
    if (dataUrl) {
      setSectionEdits((prev) => {
        const source = prev[secId]?.items || prev[secId]?.projects || defaultPortfolioItems()
        const items = defaultPortfolioItems().map((_, i) => ({ ...(source[i] || {}) }))
        items[itemIndex] = {
          ...items[itemIndex],
          image_url: dataUrl,
          image: dataUrl,
          img: dataUrl,
          image_preview: dataUrl,
        }
        return { ...prev, [secId]: { ...(prev[secId] || {}), items } }
      })
    }
    try {
      const formData = new FormData()
      formData.append('image', file)
      const res = await api.post('upload-image', formData)
      const uploadedUrl = storedUploadPath(res.data)
      if (uploadedUrl) {
        setSectionEdits((prev) => {
          const source = prev[secId]?.items || prev[secId]?.projects || defaultPortfolioItems()
          const items = defaultPortfolioItems().map((_, i) => ({ ...(source[i] || {}) }))
          items[itemIndex] = {
            ...items[itemIndex],
            image_url: uploadedUrl,
            image: uploadedUrl,
            img: uploadedUrl,
            image_preview: dataUrl || items[itemIndex].image_preview,
          }
          return { ...prev, [secId]: { ...(prev[secId] || {}), items } }
        })
        setMessage(`📸 Image uploaded successfully for Project ${itemIndex + 1}!`)
      } else {
        setError('Upload succeeded but no image path was returned.')
      }
    } catch (err) {
      const fieldError = err.response?.data?.errors?.image?.[0]
      setError(fieldError || err.response?.data?.message || 'Failed to upload image.')
    } finally {
      setUploadingState((prev) => ({ ...prev, [uploadKey]: false }))
    }
  }

  const handleTestimonialsSideImageUpload = async (secId, file) => {
    if (!file) return
    const uploadKey = `testimonials-side-${secId}`
    setLocalPreview(uploadKey, file)
    setUploadingState((prev) => ({ ...prev, [uploadKey]: true }))
    const dataUrl = await new Promise((resolve) => {
      const reader = new FileReader()
      reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '')
      reader.onerror = () => resolve('')
      reader.readAsDataURL(file)
    })
    if (dataUrl) {
      setSectionEdits((prev) => ({
        ...prev,
        [secId]: {
          ...(prev[secId] || {}),
          image_url: dataUrl,
          image: dataUrl,
          img: dataUrl,
          image_preview: dataUrl,
        },
      }))
    }
    try {
      const formData = new FormData()
      formData.append('image', file)
      const res = await api.post('upload-image', formData)
      const uploadedUrl = storedUploadPath(res.data)
      if (uploadedUrl) {
        setSectionEdits((prev) => ({
          ...prev,
          [secId]: {
            ...(prev[secId] || {}),
            image_url: uploadedUrl,
            image: uploadedUrl,
            img: uploadedUrl,
            image_preview: dataUrl || prev[secId]?.image_preview,
          },
        }))
        setMessage('📸 Side image uploaded successfully!')
      } else {
        setError('Upload succeeded but no image path was returned.')
      }
    } catch (err) {
      const fieldError = err.response?.data?.errors?.image?.[0]
      setError(fieldError || err.response?.data?.message || 'Failed to upload image.')
    } finally {
      setUploadingState((prev) => ({ ...prev, [uploadKey]: false }))
    }
  }

  const handleTestimonialItemImageUpload = async (secId, itemIndex, file) => {
    if (!file) return
    const uploadKey = `testimonial-${secId}-${itemIndex}`
    setLocalPreview(uploadKey, file)
    setUploadingState((prev) => ({ ...prev, [uploadKey]: true }))
    const dataUrl = await new Promise((resolve) => {
      const reader = new FileReader()
      reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '')
      reader.onerror = () => resolve('')
      reader.readAsDataURL(file)
    })
    if (dataUrl) {
      setSectionEdits((prev) => {
        const source = prev[secId]?.items || prev[secId]?.testimonials || defaultTestimonialItems()
        const items = defaultTestimonialItems().map((_, i) => ({ ...(source[i] || {}) }))
        items[itemIndex] = {
          ...items[itemIndex],
          image_url: dataUrl,
          image: dataUrl,
          img: dataUrl,
          image_preview: dataUrl,
        }
        return { ...prev, [secId]: { ...(prev[secId] || {}), items } }
      })
    }
    try {
      const formData = new FormData()
      formData.append('image', file)
      const res = await api.post('upload-image', formData)
      const uploadedUrl = storedUploadPath(res.data)
      if (uploadedUrl) {
        setSectionEdits((prev) => {
          const source = prev[secId]?.items || prev[secId]?.testimonials || defaultTestimonialItems()
          const items = defaultTestimonialItems().map((_, i) => ({ ...(source[i] || {}) }))
          items[itemIndex] = {
            ...items[itemIndex],
            image_url: uploadedUrl,
            image: uploadedUrl,
            img: uploadedUrl,
            image_preview: dataUrl || items[itemIndex].image_preview,
          }
          return { ...prev, [secId]: { ...(prev[secId] || {}), items } }
        })
        setMessage(`📸 Avatar uploaded successfully for Testimonial ${itemIndex + 1}!`)
      } else {
        setError('Upload succeeded but no image path was returned.')
      }
    } catch (err) {
      const fieldError = err.response?.data?.errors?.image?.[0]
      setError(fieldError || err.response?.data?.message || 'Failed to upload image.')
    } finally {
      setUploadingState((prev) => ({ ...prev, [uploadKey]: false }))
    }
  }

  const handleLatestNewsItemImageUpload = async (secId, itemIndex, file) => {
    if (!file) return
    const uploadKey = `latestnews-${secId}-${itemIndex}`
    setLocalPreview(uploadKey, file)
    setUploadingState((prev) => ({ ...prev, [uploadKey]: true }))
    const dataUrl = await new Promise((resolve) => {
      const reader = new FileReader()
      reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '')
      reader.onerror = () => resolve('')
      reader.readAsDataURL(file)
    })
    if (dataUrl) {
      setSectionEdits((prev) => {
        const source = prev[secId]?.items || prev[secId]?.posts || defaultLatestNewsItems()
        const items = defaultLatestNewsItems().map((_, i) => ({ ...(source[i] || {}) }))
        items[itemIndex] = {
          ...items[itemIndex],
          image_url: dataUrl,
          image: dataUrl,
          img: dataUrl,
          image_preview: dataUrl,
        }
        return { ...prev, [secId]: { ...(prev[secId] || {}), items } }
      })
    }
    try {
      const formData = new FormData()
      formData.append('image', file)
      const res = await api.post('upload-image', formData)
      const uploadedUrl = storedUploadPath(res.data)
      if (uploadedUrl) {
        setSectionEdits((prev) => {
          const source = prev[secId]?.items || prev[secId]?.posts || defaultLatestNewsItems()
          const items = defaultLatestNewsItems().map((_, i) => ({ ...(source[i] || {}) }))
          items[itemIndex] = {
            ...items[itemIndex],
            image_url: uploadedUrl,
            image: uploadedUrl,
            img: uploadedUrl,
            image_preview: dataUrl || items[itemIndex].image_preview,
          }
          return { ...prev, [secId]: { ...(prev[secId] || {}), items } }
        })
        setMessage(`📸 Image uploaded successfully for News Post ${itemIndex + 1}!`)
      } else {
        setError('Upload succeeded but no image path was returned.')
      }
    } catch (err) {
      const fieldError = err.response?.data?.errors?.image?.[0]
      setError(fieldError || err.response?.data?.message || 'Failed to upload image.')
    } finally {
      setUploadingState((prev) => ({ ...prev, [uploadKey]: false }))
    }
  }

  const handleClientLogoImageUpload = async (secId, itemIndex, file) => {
    if (!file) return
    const uploadKey = `clientlogo-${secId}-${itemIndex}`
    setLocalPreview(uploadKey, file)
    setUploadingState((prev) => ({ ...prev, [uploadKey]: true }))
    const dataUrl = await new Promise((resolve) => {
      const reader = new FileReader()
      reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '')
      reader.onerror = () => resolve('')
      reader.readAsDataURL(file)
    })
    if (dataUrl) {
      setSectionEdits((prev) => {
        const source = prev[secId]?.items || prev[secId]?.logos || defaultClientLogoItems()
        const items = defaultClientLogoItems().map((_, i) => ({ ...(source[i] || {}) }))
        items[itemIndex] = {
          ...items[itemIndex],
          image_url: dataUrl,
          image: dataUrl,
          img: dataUrl,
          logo: dataUrl,
          image_preview: dataUrl,
        }
        return { ...prev, [secId]: { ...(prev[secId] || {}), items } }
      })
    }
    try {
      const formData = new FormData()
      formData.append('image', file)
      const res = await api.post('upload-image', formData)
      const uploadedUrl = storedUploadPath(res.data)
      if (uploadedUrl) {
        setSectionEdits((prev) => {
          const source = prev[secId]?.items || prev[secId]?.logos || defaultClientLogoItems()
          const items = defaultClientLogoItems().map((_, i) => ({ ...(source[i] || {}) }))
          items[itemIndex] = {
            ...items[itemIndex],
            image_url: uploadedUrl,
            image: uploadedUrl,
            img: uploadedUrl,
            logo: uploadedUrl,
            image_preview: dataUrl || items[itemIndex].image_preview,
          }
          return { ...prev, [secId]: { ...(prev[secId] || {}), items } }
        })
        setMessage(`📸 Logo uploaded successfully for Logo ${itemIndex + 1}!`)
      } else {
        setError('Upload succeeded but no image path was returned.')
      }
    } catch (err) {
      const fieldError = err.response?.data?.errors?.image?.[0]
      setError(fieldError || err.response?.data?.message || 'Failed to upload image.')
    } finally {
      setUploadingState((prev) => ({ ...prev, [uploadKey]: false }))
    }
  }

  const handleAboutImageUpload = async (secId, file) => {
    if (!file) return
    const uploadKey = `about-${secId}`
    setLocalPreview(uploadKey, file)
    setUploadingState((prev) => ({ ...prev, [uploadKey]: true }))
    const dataUrl = await new Promise((resolve) => {
      const reader = new FileReader()
      reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '')
      reader.onerror = () => resolve('')
      reader.readAsDataURL(file)
    })
    if (dataUrl) {
      setSectionEdits((prev) => ({
        ...prev,
        [secId]: {
          ...(prev[secId] || {}),
          image_url: dataUrl,
          image: dataUrl,
          img: dataUrl,
          image_preview: dataUrl,
        },
      }))
    }
    try {
      const formData = new FormData()
      formData.append('image', file)
      const res = await api.post('upload-image', formData)
      const uploadedUrl = storedUploadPath(res.data)
      if (uploadedUrl) {
        setSectionEdits((prev) => ({
          ...prev,
          [secId]: {
            ...(prev[secId] || {}),
            image_url: uploadedUrl,
            image: uploadedUrl,
            img: uploadedUrl,
            image_preview: dataUrl || prev[secId]?.image_preview,
          },
        }))
        setMessage('📸 About image uploaded successfully!')
      } else {
        setError('Upload succeeded but no image path was returned.')
      }
    } catch (err) {
      const fieldError = err.response?.data?.errors?.image?.[0]
      setError(fieldError || err.response?.data?.message || 'Failed to upload image.')
    } finally {
      setUploadingState((prev) => ({ ...prev, [uploadKey]: false }))
    }
  }

  const handleSectionImageUpload = async (secId, file) => {
    if (!file) return
    const uploadKey = `section-${secId}`
    setLocalPreview(uploadKey, file)
    setUploadingState((prev) => ({ ...prev, [uploadKey]: true }))
    const dataUrl = await new Promise((resolve) => {
      const reader = new FileReader()
      reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '')
      reader.onerror = () => resolve('')
      reader.readAsDataURL(file)
    })
    if (dataUrl) {
      setSectionEdits((prev) => ({
        ...prev,
        [secId]: {
          ...(prev[secId] || {}),
          image_url: dataUrl,
          image: dataUrl,
          img: dataUrl,
          image_preview: dataUrl,
        },
      }))
    }
    try {
      const formData = new FormData()
      formData.append('image', file)
      const res = await api.post('upload-image', formData)
      const uploadedUrl = storedUploadPath(res.data)
      if (uploadedUrl) {
        setSectionEdits((prev) => ({
          ...prev,
          [secId]: {
            ...(prev[secId] || {}),
            image_url: uploadedUrl,
            image: uploadedUrl,
            img: uploadedUrl,
            image_preview: dataUrl || prev[secId]?.image_preview,
          },
        }))
        setMessage('📸 Image uploaded successfully!')
      } else {
        setError('Upload succeeded but no image path was returned.')
      }
    } catch (err) {
      const fieldError = err.response?.data?.errors?.image?.[0]
      setError(fieldError || err.response?.data?.message || 'Failed to upload image.')
    } finally {
      setUploadingState((prev) => ({ ...prev, [uploadKey]: false }))
    }
  }

  const handleBranchesMapUpload = async (secId, file) => {
    if (!file) return
    const uploadKey = `branches-map-${secId}`
    setLocalPreview(uploadKey, file)
    setUploadingState((prev) => ({ ...prev, [uploadKey]: true }))
    const dataUrl = await new Promise((resolve) => {
      const reader = new FileReader()
      reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '')
      reader.onerror = () => resolve('')
      reader.readAsDataURL(file)
    })
    if (dataUrl) {
      setSectionEdits((prev) => ({
        ...prev,
        [secId]: {
          ...(prev[secId] || {}),
          map_image: dataUrl,
          image_url: dataUrl,
          image: dataUrl,
          img: dataUrl,
          image_preview: dataUrl,
        },
      }))
    }
    try {
      const formData = new FormData()
      formData.append('image', file)
      const res = await api.post('upload-image', formData)
      const uploadedUrl = storedUploadPath(res.data)
      if (uploadedUrl) {
        setSectionEdits((prev) => ({
          ...prev,
          [secId]: {
            ...(prev[secId] || {}),
            map_image: uploadedUrl,
            image_url: uploadedUrl,
            image: uploadedUrl,
            img: uploadedUrl,
            image_preview: dataUrl || prev[secId]?.image_preview,
          },
        }))
        setMessage('📸 Map image uploaded successfully!')
      } else {
        setError('Upload succeeded but no image path was returned.')
      }
    } catch (err) {
      const fieldError = err.response?.data?.errors?.image?.[0]
      setError(fieldError || err.response?.data?.message || 'Failed to upload image.')
    } finally {
      setUploadingState((prev) => ({ ...prev, [uploadKey]: false }))
    }
  }

  const fetchTemplateRequests = () => {
    api.get('/template-requests')
      .then(res => setTemplateRequests(res.data))
      .catch(() => {})
  }

  const fetchMyChangeRequests = () => {
    if (isPowerAdminPublishMode) return
    api.get('/change-requests')
      .then((res) => {
        const list = Array.isArray(res.data) ? res.data : []
        setMyChangeRequests(list.filter((cr) => Number(cr.editor_id) === Number(user?.id)))
      })
      .catch(() => {})
  }

  const fetchAvailableTemplates = () => {
    api.get('/templates')
      .then(res => {
        setAvailableTemplates(res.data)
        if (res.data.length > 0 && !selectedTemplateName) {
          setSelectedTemplateName(res.data[0].slug)
        }
      })
      .catch(() => {})
  }

  useEffect(() => {
    fetchTemplateRequests()
    fetchMyChangeRequests()
    if (!isPowerAdminPublishMode) {
      fetchAvailableTemplates()
    }
  }, [isPowerAdminPublishMode, user?.id])

  useEffect(() => {
    if (!isPowerAdminPublishMode || !powerAdminDeploymentId) return
    setSelectedDeploymentId(powerAdminDeploymentId)
    setActiveTab('editor')
  }, [isPowerAdminPublishMode, powerAdminDeploymentId])

  const applyPages = (data) => {
    const list = Array.isArray(data) ? data : (data?.pages || [])
    setPages(list)
    if (list.length > 0) {
      handlePageSelect(list[0].id)
    } else {
      setSelectedPageId('')
      setSections([])
    }
  }

  // Keep a valid deployed site selected when requests change
  useEffect(() => {
    const deployed = templateRequests.filter(r => r.status === 'deployed')
    if (deployed.length === 0) {
      setSelectedDeploymentId(null)
      return
    }
    if (!selectedDeploymentId || !deployed.some(r => r.id === selectedDeploymentId)) {
      setSelectedDeploymentId(deployed[0].id)
    }
  }, [templateRequests, selectedDeploymentId])

  const handleDeploymentSelect = (deploymentId) => {
    if (deploymentId === selectedDeploymentId) return
    setSelectedDeploymentId(deploymentId)
    setSelectedPageId('')
    setSections([])
    setCheckedSectionIds([])
    setSectionEdits({})
    setPreviewTab({})
    setActiveItemTab({})
    setExpandedEditors({})
    setActiveTab('editor')
  }

  // Fetch pages for the selected deployed site
  useEffect(() => {
    const activeDeployment = templateRequests.find(
      r => r.status === 'deployed' && r.id === selectedDeploymentId
    ) || templateRequests.find(r => r.status === 'deployed')

    if (!activeDeployment) {
      setPages([])
      setSelectedPageId('')
      setSections([])
      return
    }

    const loadPages = async () => {
      const templateName = activeDeployment.template_name
      try {
        const res = await api.get('/pages', {
          params: templateName ? { template: templateName } : {},
        })
        const list = Array.isArray(res.data) ? res.data : (res.data?.pages || [])
        if (list.length > 0) {
          applyPages(list)
          return
        }
      } catch (_) {
        // Authenticated /pages can 500 if a stale backend still queries pages.advisor_id
      }

      try {
        const fallback = await api.get('/public/pages')
        applyPages(fallback.data)
      } catch (_) {
        setPages([])
        setSelectedPageId('')
        setSections([])
        setError('Could not load pages for the editor.')
      }
    }

    loadPages()
  }, [templateRequests, selectedDeploymentId])

  const openDeploymentModal = (templateSlug, switchToDeployments = false) => {
    if (templateSlug) setSelectedTemplateName(templateSlug)
    if (switchToDeployments) setActiveTab('deployments')
    setShowTemplateModal(true)
  }

  const filteredTemplates = useMemo(() => {
    const q = templateSearch.trim().toLowerCase()
    if (!q) return availableTemplates
    return availableTemplates.filter(
      tpl =>
        tpl.name?.toLowerCase().includes(q) ||
        tpl.slug?.toLowerCase().includes(q) ||
        tpl.description?.toLowerCase().includes(q)
    )
  }, [availableTemplates, templateSearch])

  const uploadBrandingAsset = async (file, kind) => {
    if (!file) return
    const setUploading = kind === 'logo' ? setUploadingLogo : setUploadingFavicon
    const setUrl = kind === 'logo' ? setLogoUrl : setFaviconUrl
    const setPreview = kind === 'logo' ? setLogoPreview : setFaviconPreview
    setUploading(true)
    setError('')
    setPreview(URL.createObjectURL(file))
    try {
      const formData = new FormData()
      formData.append('image', file)
      const res = await api.post('upload-image', formData)
      const uploadedUrl = storedUploadPath(res.data)
      if (!uploadedUrl) {
        setError('Upload succeeded but no image path was returned.')
        setPreview('')
        setUrl('')
        return
      }
      setUrl(uploadedUrl)
    } catch (err) {
      setPreview('')
      setUrl('')
      setError(err.response?.data?.message || `Failed to upload ${kind}.`)
    } finally {
      setUploading(false)
    }
  }

  const handleTemplateSubmit = async (e) => {
    e.preventDefault()
    if (!domainName) return
    setIsSubmittingTemplate(true)
    setError('')
    try {
      await api.post('/template-requests', {
        template_name: selectedTemplateName,
        domain_name: domainName,
        logo_url: logoUrl || undefined,
        favicon_url: faviconUrl || undefined,
        primary_color: primaryColor,
        secondary_color: secondaryColor,
        request_type: 'advisor_website'
      })
      setMessage(`Deployment request submitted! ${powerAdminLabel} will review it. You can request additional deployments anytime.`)
      setShowTemplateModal(false)
      setDomainName('')
      setLogoUrl('')
      setFaviconUrl('')
      setLogoPreview('')
      setFaviconPreview('')
      setActiveTab('deployments')
      fetchTemplateRequests()
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit template request.')
    } finally {
      setIsSubmittingTemplate(false)
    }
  }

  const fetchAdvisorSections = async (pageId, advisorIdOverride = null, templateRequestId = null) => {
    const advisorId = advisorIdOverride ?? (isPowerAdminPublishMode ? null : user?.id)
    const params = {}
    if (advisorId) params.advisor_id = advisorId
    if (templateRequestId) params.template_request_id = templateRequestId
    const res = await api.get(`/pages/${pageId}/sections`, { params })
    const list = Array.isArray(res.data) ? res.data : []
    if (!advisorId) return list
    return list.filter(s => String(s.advisor_id) === String(advisorId))
  }

  const fetchDeploymentSections = async (deploymentId) => {
    const res = await api.get(`/template-requests/${deploymentId}/sections`)
    return Array.isArray(res.data?.sections) ? res.data.sections : []
  }

  const handlePageSelect = async (pageId) => {
    setSelectedPageId(pageId)
    setCheckedSectionIds([])
    setSectionEdits({})
    setMessage('')
    setError('')

    if (!pageId) {
      setSections([])
      return
    }

    // Advisors and Power Admin both edit deployment-scoped sections
    // (template_request_id set) — never the NULL hub copies.
    const deployment = templateRequests.find(
      r => r.id === (powerAdminDeploymentId || selectedDeploymentId) && r.status === 'deployed'
    ) || templateRequests.find(r => r.status === 'deployed')
    const deploymentId = powerAdminDeploymentId || deployment?.id || null

    if (deploymentId) {
      try {
        const deploymentSections = await fetchDeploymentSections(deploymentId)
        setSections(deploymentSections)

        if (isPowerAdminPublishMode) {
          return
        }

        const lockedByMeIds = deploymentSections
          .filter(s => s.is_locked && s.locked_by === user?.id && isAdvisorVisibleSection(sectionTemplateKey(s)))
          .map(s => s.id)

        setCheckedSectionIds(lockedByMeIds)

        const initialEdits = {}
        deploymentSections.forEach(s => {
          if (lockedByMeIds.includes(s.id)) {
            const parsed = parseJson(s.content)
            initialEdits[s.id] = isAboutSection(sectionTemplateKey(s))
              ? normalizeAboutEditorContent(parsed)
              : isCompanyHistorySection(sectionTemplateKey(s))
                ? normalizeCompanyHistoryEditorContent(parsed)
                : isFeaturedServicesSection(sectionTemplateKey(s))
                  ? normalizeFeaturedServicesEditorContent(parsed)
                  : isAnnualProgressionSection(sectionTemplateKey(s))
                    ? normalizeAnnualProgressionEditorContent(parsed)
                    : isPortfolioSection(sectionTemplateKey(s))
                      ? normalizePortfolioEditorContent(parsed)
                      : isBranchesSection(sectionTemplateKey(s))
                        ? normalizeBranchesEditorContent(parsed)
                        : isCounterStatsSection(sectionTemplateKey(s))
                          ? normalizeCounterStatsEditorContent(parsed)
                          : isTestimonialsSection(sectionTemplateKey(s))
                            ? normalizeTestimonialsEditorContent(parsed)
                            : isLatestNewsSection(sectionTemplateKey(s))
                              ? normalizeLatestNewsEditorContent(parsed)
                              : isClientLogosSection(sectionTemplateKey(s))
                                ? normalizeClientLogosEditorContent(parsed)
                                : isCtaBannerSection(sectionTemplateKey(s))
                                  ? normalizeCtaBannerEditorContent(parsed)
                                  : parsed
          }
        })
        setSectionEdits(initialEdits)
      } catch (err) {
        setSections([])
        setError(err.response?.data?.message || 'Failed to load deployment sections.')
      }
      return
    }

    const targetAdvisorId = deployment?.assigned_advisor_id ?? deployment?.advisor_id ?? null
    const sectionsForAdvisor = await fetchAdvisorSections(pageId, targetAdvisorId, deployment?.id)
    setSections(sectionsForAdvisor)

    if (isPowerAdminPublishMode) {
      return
    }

    const lockedByMeIds = sectionsForAdvisor
      .filter(s => s.is_locked && s.locked_by === user?.id && isAdvisorVisibleSection(sectionTemplateKey(s)))
      .map(s => s.id)

    setCheckedSectionIds(lockedByMeIds)

    const initialEdits = {}
    sectionsForAdvisor.forEach(s => {
      if (lockedByMeIds.includes(s.id)) {
        const parsed = parseJson(s.content)
        initialEdits[s.id] = isAboutSection(sectionTemplateKey(s))
          ? normalizeAboutEditorContent(parsed)
          : isCompanyHistorySection(sectionTemplateKey(s))
            ? normalizeCompanyHistoryEditorContent(parsed)
            : isFeaturedServicesSection(sectionTemplateKey(s))
              ? normalizeFeaturedServicesEditorContent(parsed)
              : isAnnualProgressionSection(sectionTemplateKey(s))
                ? normalizeAnnualProgressionEditorContent(parsed)
                : isPortfolioSection(sectionTemplateKey(s))
                  ? normalizePortfolioEditorContent(parsed)
                  : isBranchesSection(sectionTemplateKey(s))
                    ? normalizeBranchesEditorContent(parsed)
                    : isCounterStatsSection(sectionTemplateKey(s))
                      ? normalizeCounterStatsEditorContent(parsed)
                      : isTestimonialsSection(sectionTemplateKey(s))
                        ? normalizeTestimonialsEditorContent(parsed)
                        : isLatestNewsSection(sectionTemplateKey(s))
                          ? normalizeLatestNewsEditorContent(parsed)
                          : isClientLogosSection(sectionTemplateKey(s))
                            ? normalizeClientLogosEditorContent(parsed)
                            : isCtaBannerSection(sectionTemplateKey(s))
                              ? normalizeCtaBannerEditorContent(parsed)
                              : parsed
      }
    })
    setSectionEdits(initialEdits)
  }

  const handleSectionCheckboxChange = async (section, isChecked) => {
    setMessage('')
    setError('')

    if (!isChecked) {
      if (isPowerAdminPublishMode) {
        setCheckedSectionIds(prev => prev.filter(id => id !== section.id))
        setSectionEdits(prev => {
          const next = { ...prev }
          delete next[section.id]
          return next
        })
        return
      }
      setError(`Cannot unlock section "${sectionDisplayName(section)}". Sections remain locked until submitted or reviewed by an approver.`)
      return
    }

    if (!isPowerAdminPublishMode && section.is_locked && section.locked_by !== user?.id) {
      const msg = section.locked_by
        ? `Section "${sectionDisplayName(section)}" is locked by ${section.locked_by_user?.name || 'another user'}.`
        : `Section "${sectionDisplayName(section)}" has a pending or scheduled change request and cannot be edited until it is reviewed.`
      setError(msg)
      return
    }

    const parsed = parseJson(section.content)
    const editorContent = isAboutSection(sectionTemplateKey(section))
      ? normalizeAboutEditorContent(parsed)
      : isCompanyHistorySection(sectionTemplateKey(section))
        ? normalizeCompanyHistoryEditorContent(parsed)
        : isFeaturedServicesSection(sectionTemplateKey(section))
          ? normalizeFeaturedServicesEditorContent(parsed)
          : isAnnualProgressionSection(sectionTemplateKey(section))
            ? normalizeAnnualProgressionEditorContent(parsed)
            : isPortfolioSection(sectionTemplateKey(section))
              ? normalizePortfolioEditorContent(parsed)
              : isBranchesSection(sectionTemplateKey(section))
                ? normalizeBranchesEditorContent(parsed)
                : isCounterStatsSection(sectionTemplateKey(section))
                  ? normalizeCounterStatsEditorContent(parsed)
                  : isTestimonialsSection(sectionTemplateKey(section))
                    ? normalizeTestimonialsEditorContent(parsed)
                    : isLatestNewsSection(sectionTemplateKey(section))
                      ? normalizeLatestNewsEditorContent(parsed)
                      : isClientLogosSection(sectionTemplateKey(section))
                        ? normalizeClientLogosEditorContent(parsed)
                        : isCtaBannerSection(sectionTemplateKey(section))
                          ? normalizeCtaBannerEditorContent(parsed)
                          : parsed

    if (isPowerAdminPublishMode) {
      setCheckedSectionIds(prev => [...new Set([...prev, section.id])])
      setSectionEdits(prev => ({ ...prev, [section.id]: editorContent }))
      setMessage(`Section "${sectionDisplayName(section)}" selected for editing. Changes publish directly to the live site.`)
      return
    }

    try {
      const lockRes = await api.post(`/sections/${section.id}/lock`)
      if (lockRes.data?.section) {
        setSections(prev => prev.map(s => s.id === section.id ? lockRes.data.section : s))
      }

      setCheckedSectionIds(prev => [...new Set([...prev, section.id])])
      setSectionEdits(prev => ({
        ...prev,
        [section.id]: editorContent,
      }))
      setMessage(`🔒 Section "${sectionDisplayName(section)}" locked for you. You can now edit its content.`)
    } catch (err) {
      setError(err.response?.data?.message || 'Could not lock section.')
    }
  }

  const handleFieldValueChange = (sectionId, fieldKey, value) => {
    setSectionEdits(prev => {
      const current = { ...(prev[sectionId] || {}), [fieldKey]: value }
      if (fieldKey === 'image_url') {
        current.image = value
        current.img = value
        if (!/^data:|^blob:/i.test(value || '')) current.image_preview = ''
      }
      if (fieldKey === 'map_image') {
        current.image_url = value
        current.image = value
        current.img = value
        if (!/^data:|^blob:/i.test(value || '')) current.image_preview = ''
      }
      if (fieldKey === 'experience_years') current.red_box_number = value
      if (fieldKey === 'experience_label') current.red_box_text = value
      if (fieldKey === 'red_box_number') current.experience_years = value
      if (fieldKey === 'red_box_text') current.experience_label = value
      return { ...prev, [sectionId]: current }
    })
  }

  const patchBox = (secId, boxIndex, patch) => {
    setSectionEdits((prev) => {
      const source = prev[secId]?.boxes || prev[secId]?.items || [{}, {}, {}]
      const boxes = [0, 1, 2].map((i) => ({ ...(source[i] || {}) }))
      boxes[boxIndex] = { ...boxes[boxIndex], ...patch }
      return { ...prev, [secId]: { ...(prev[secId] || {}), boxes } }
    })
  }

  const patchServiceBox = (secId, boxIndex, patch) => {
    setSectionEdits((prev) => {
      const source = prev[secId]?.boxes || prev[secId]?.items || defaultFeaturedServiceBoxes()
      const boxes = defaultFeaturedServiceBoxes().map((_, i) => ({ ...(source[i] || {}) }))
      boxes[boxIndex] = { ...boxes[boxIndex], ...patch }
      return { ...prev, [secId]: { ...(prev[secId] || {}), boxes } }
    })
  }

  const patchProgressBar = (secId, barIndex, patch) => {
    setSectionEdits((prev) => {
      const source = prev[secId]?.bars || prev[secId]?.progress || defaultAnnualProgressionBars()
      const bars = defaultAnnualProgressionBars().map((_, i) => ({ ...(source[i] || {}) }))
      bars[barIndex] = { ...bars[barIndex], ...patch }
      return { ...prev, [secId]: { ...(prev[secId] || {}), bars } }
    })
  }

  const patchProgressHighlight = (secId, highlightIndex, patch) => {
    setSectionEdits((prev) => {
      const source = prev[secId]?.highlights || prev[secId]?.features || defaultAnnualProgressionHighlights()
      const highlights = defaultAnnualProgressionHighlights().map((_, i) => ({ ...(source[i] || {}) }))
      highlights[highlightIndex] = { ...highlights[highlightIndex], ...patch }
      return { ...prev, [secId]: { ...(prev[secId] || {}), highlights } }
    })
  }

  const patchPortfolioItem = (secId, itemIndex, patch) => {
    setSectionEdits((prev) => {
      const source = prev[secId]?.items || prev[secId]?.projects || defaultPortfolioItems()
      const items = defaultPortfolioItems().map((_, i) => ({ ...(source[i] || {}) }))
      items[itemIndex] = { ...items[itemIndex], ...patch }
      if (patch.image_url && !/^data:|^blob:/i.test(patch.image_url)) {
        items[itemIndex].image_preview = ''
        items[itemIndex].image = patch.image_url
        items[itemIndex].img = patch.image_url
      }
      return { ...prev, [secId]: { ...(prev[secId] || {}), items } }
    })
  }

  const patchBranch = (secId, itemIndex, patch) => {
    setSectionEdits((prev) => {
      const source = prev[secId]?.items || prev[secId]?.branches || defaultBranchItems()
      const items = defaultBranchItems().map((_, i) => ({ ...(source[i] || {}) }))
      items[itemIndex] = { ...items[itemIndex], ...patch }
      return { ...prev, [secId]: { ...(prev[secId] || {}), items } }
    })
  }

  const patchCounterStat = (secId, statIndex, patch) => {
    setSectionEdits((prev) => {
      const source = prev[secId]?.stats || prev[secId]?.items || defaultCounterStats()
      const stats = defaultCounterStats().map((_, i) => ({ ...(source[i] || {}) }))
      stats[statIndex] = { ...stats[statIndex], ...patch }
      return { ...prev, [secId]: { ...(prev[secId] || {}), stats } }
    })
  }

  const patchTestimonialItem = (secId, itemIndex, patch) => {
    setSectionEdits((prev) => {
      const source = prev[secId]?.items || prev[secId]?.testimonials || defaultTestimonialItems()
      const items = defaultTestimonialItems().map((_, i) => ({ ...(source[i] || {}) }))
      items[itemIndex] = { ...items[itemIndex], ...patch }
      if (patch.image_url && !/^data:|^blob:/i.test(patch.image_url)) {
        items[itemIndex].image_preview = ''
        items[itemIndex].image = patch.image_url
        items[itemIndex].img = patch.image_url
      }
      return { ...prev, [secId]: { ...(prev[secId] || {}), items } }
    })
  }

  const patchNewsItem = (secId, itemIndex, patch) => {
    setSectionEdits((prev) => {
      const source = prev[secId]?.items || prev[secId]?.posts || defaultLatestNewsItems()
      const items = defaultLatestNewsItems().map((_, i) => ({ ...(source[i] || {}) }))
      items[itemIndex] = { ...items[itemIndex], ...patch }
      if (patch.image_url && !/^data:|^blob:/i.test(patch.image_url)) {
        items[itemIndex].image_preview = ''
        items[itemIndex].image = patch.image_url
        items[itemIndex].img = patch.image_url
      }
      return { ...prev, [secId]: { ...(prev[secId] || {}), items } }
    })
  }

  const patchClientLogo = (secId, itemIndex, patch) => {
    setSectionEdits((prev) => {
      const source = prev[secId]?.items || prev[secId]?.logos || defaultClientLogoItems()
      const items = defaultClientLogoItems().map((_, i) => ({ ...(source[i] || {}) }))
      items[itemIndex] = { ...items[itemIndex], ...patch }
      if (patch.image_url && !/^data:|^blob:/i.test(patch.image_url)) {
        items[itemIndex].image_preview = ''
        items[itemIndex].image = patch.image_url
        items[itemIndex].img = patch.image_url
        items[itemIndex].logo = patch.image_url
      }
      return { ...prev, [secId]: { ...(prev[secId] || {}), items } }
    })
  }

  const patchYear = (secId, yearIndex, patch) => {
    setSectionEdits((prev) => {
      const source = prev[secId]?.years || prev[secId]?.items || defaultCompanyHistoryYears()
      const years = defaultCompanyHistoryYears().map((_, i) => ({ ...(source[i] || {}) }))
      years[yearIndex] = { ...years[yearIndex], ...patch }
      if (patch.image_url && !/^data:|^blob:/i.test(patch.image_url)) {
        years[yearIndex].image_preview = ''
        years[yearIndex].image = patch.image_url
        years[yearIndex].img = patch.image_url
      }
      return { ...prev, [secId]: { ...(prev[secId] || {}), years } }
    })
  }

  const patchGauge = (secId, index, patch) => {
    setSectionEdits((prev) => {
      const source = prev[secId]?.gauges || defaultAboutGauges()
      const gauges = [0, 1].map((i) => ({ ...(source[i] || {}) }))
      gauges[index] = { ...gauges[index], ...patch }
      return {
        ...prev,
        [secId]: {
          ...(prev[secId] || {}),
          gauges,
          percent_1: gauges[0].value,
          percent_1_text: gauges[0].label,
          percent_2: gauges[1].value,
          percent_2_text: gauges[1].label,
          percentage_1: gauges[0].value,
          percentage_1_text: gauges[0].label,
          percentage_2: gauges[1].value,
          percentage_2_text: gauges[1].label,
        },
      }
    })
  }

  const buildBatchPayload = (forPublish = false) => checkedSectionIds.map(secId => {
    const section = sections.find(s => s.id === secId)
    const raw = sanitizeSectionContent(sectionEdits[secId] || {})
    const content = section && isFeaturedServicesSection(sectionTemplateKey(section))
      ? normalizeFeaturedServicesEditorContent(raw)
      : section && isAnnualProgressionSection(sectionTemplateKey(section))
        ? normalizeAnnualProgressionEditorContent(raw)
        : section && isPortfolioSection(sectionTemplateKey(section))
          ? normalizePortfolioEditorContent(raw)
          : section && isBranchesSection(sectionTemplateKey(section))
            ? normalizeBranchesEditorContent(raw)
            : section && isCounterStatsSection(sectionTemplateKey(section))
              ? normalizeCounterStatsEditorContent(raw)
              : section && isTestimonialsSection(sectionTemplateKey(section))
                ? normalizeTestimonialsEditorContent(raw)
                : section && isLatestNewsSection(sectionTemplateKey(section))
                  ? normalizeLatestNewsEditorContent(raw)
                  : section && isClientLogosSection(sectionTemplateKey(section))
                    ? normalizeClientLogosEditorContent(raw)
                    : section && isCtaBannerSection(sectionTemplateKey(section))
                      ? normalizeCtaBannerEditorContent(raw)
                      : raw
    if (forPublish) {
      return {
        section_id: secId,
        content: JSON.stringify(content, null, 2),
      }
    }
    return {
      section_id: secId,
      current_content: section?.content || '',
      proposed_content: JSON.stringify(content, null, 2),
    }
  })

  const getCrSectionIds = (cr) => {
    if (Array.isArray(cr.section_edits) && cr.section_edits.length) {
      return cr.section_edits.map((e) => Number(e.section_id)).filter(Boolean)
    }
    try {
      const parsed = JSON.parse(cr.proposed_content || '[]')
      if (Array.isArray(parsed)) {
        return parsed.map((e) => Number(e.section_id)).filter(Boolean)
      }
    } catch { /* ignore */ }
    return cr.section_id ? [Number(cr.section_id)] : []
  }

  const findOpenCrForCheckedSections = (statuses) => {
    const checked = new Set(checkedSectionIds.map(Number))
    return myChangeRequests.find((cr) => {
      if (!statuses.includes(cr.status)) return false
      const ids = getCrSectionIds(cr)
      return ids.some((id) => checked.has(id))
    }) || null
  }

  const refreshAfterCrAction = async () => {
    fetchMyChangeRequests()
    if (selectedPageId) {
      const deployment = templateRequests.find(
        r => r.id === (powerAdminDeploymentId || selectedDeploymentId) && r.status === 'deployed'
      ) || templateRequests.find(r => r.status === 'deployed')
      const deploymentId = powerAdminDeploymentId || deployment?.id || null
      if (deploymentId) {
        const refreshed = await fetchDeploymentSections(deploymentId)
        setSections(refreshed)
      } else {
        const targetAdvisorId = deployment?.assigned_advisor_id ?? deployment?.advisor_id ?? null
        const refreshed = await fetchAdvisorSections(selectedPageId, targetAdvisorId, deployment?.id)
        setSections(refreshed)
      }
    }
    setCheckedSectionIds([])
    setSectionEdits({})
  }

  const handleResubmitChangeRequest = async (crId) => {
    if (checkedSectionIds.length === 0) {
      setError('Select the section edits you want to resubmit, then click Resubmit.')
      return
    }
    setMessage('')
    setError('')
    setCrActionBusy(`resubmit-${crId}`)
    try {
      await api.post(`/change-requests/${crId}/resubmit`, { section_edits: buildBatchPayload(false) })
      setMessage('Change request resubmitted for review.')
      await refreshAfterCrAction()
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to resubmit change request.')
    } finally {
      setCrActionBusy(null)
    }
  }

  const handleConfirmChangeRequestFeedback = async (crId, withEdits) => {
    setMessage('')
    setError('')
    setCrActionBusy(`${withEdits ? 'update' : 'confirm'}-${crId}`)
    try {
      const body = withEdits
        ? { section_edits: buildBatchPayload(false) }
        : undefined
      if (withEdits && checkedSectionIds.length === 0) {
        setError('Select revised section edits before updating & publishing.')
        setCrActionBusy(null)
        return
      }
      await api.post(`/change-requests/${crId}/confirm-feedback`, body)
      setMessage(withEdits
        ? 'Revised content confirmed and published.'
        : 'Approved content confirmed and published.')
      await refreshAfterCrAction()
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to confirm feedback.')
    } finally {
      setCrActionBusy(null)
    }
  }

  const handleBatchSubmit = async () => {
    if (checkedSectionIds.length === 0) {
      setError('Please select at least one section to edit and submit.')
      return
    }

    if (Object.values(uploadingState).some(Boolean)) {
      setError('Please wait for the image upload to finish before submitting.')
      return
    }

    setMessage('')
    setError('')
    setIsSubmitting(true)

    const batchPayload = buildBatchPayload(isPowerAdminPublishMode)

    try {
      if (isPowerAdminPublishMode) {
        await api.post(`/template-requests/${powerAdminDeploymentId}/publish-content`, { section_edits: batchPayload })
        setMessage(`Published ${checkedSectionIds.length} section(s) directly to the live site.`)
      } else {
        const rejectedCr = findOpenCrForCheckedSections(['rejected'])
        const awfCr = findOpenCrForCheckedSections(['approved_with_feedback'])
        if (rejectedCr) {
          await api.post(`/change-requests/${rejectedCr.id}/resubmit`, { section_edits: batchPayload })
          setMessage(`Resubmitted change request #${rejectedCr.id} (v${(rejectedCr.current_version || 1) + 1}) for review.`)
        } else if (awfCr) {
          await api.post(`/change-requests/${awfCr.id}/confirm-feedback`, { section_edits: batchPayload })
          setMessage(`Submitted revised edits and published change request #${awfCr.id}.`)
        } else {
          await api.post('/change-requests', { section_edits: batchPayload })
          setMessage(`🎉 Successfully submitted a single request containing edits for ${checkedSectionIds.length} section(s).`)
        }
      }

      await refreshAfterCrAction()
    } catch (err) {
      setError(
        err.response?.data?.message
          || (isPowerAdminPublishMode ? 'Failed to publish content to the live site.' : 'Failed to submit change request.')
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  const selectedPage = pages.find(p => p.id === Number(selectedPageId))

  const deployedRequests = templateRequests.filter(r => r.status === 'deployed')
  const pendingRequests = templateRequests.filter(r => r.status === 'pending')
  const rejectedRequests = templateRequests.filter(r => r.status === 'rejected')
  const activeDeployment = isPowerAdminPublishMode
    ? deployedRequests.find(r => r.id === powerAdminDeploymentId) || null
    : deployedRequests.find(r => r.id === selectedDeploymentId) || deployedRequests[0] || null
  const hasDeployedSite = isPowerAdminPublishMode
    ? Boolean(activeDeployment)
    : deployedRequests.length > 0

  const getItemTab = (secId, group, fallback = 0) => activeItemTab[itemTabKey(secId, group)] ?? fallback
  const selectItemTab = (secId, group, index) => {
    setActiveItemTab((prev) => ({ ...prev, [itemTabKey(secId, group)]: index }))
  }

  const isEditorExpanded = (secId) => {
    const key = String(secId)
    if (key in expandedEditors) return expandedEditors[key]
    return checkedSectionIds.length <= 1
  }

  const toggleEditorExpanded = (secId) => {
    const key = String(secId)
    setExpandedEditors((prev) => ({
      ...prev,
      [key]: !(key in prev ? prev[key] : checkedSectionIds.length <= 1),
    }))
  }

  const setAllEditorsExpanded = (expanded) => {
    setExpandedEditors(
      Object.fromEntries(checkedSectionIds.map((id) => [String(id), expanded]))
    )
  }

  useEffect(() => {
    setExpandedEditors((prev) => {
      const next = { ...prev }
      let changed = false
      checkedSectionIds.forEach((id) => {
        const key = String(id)
        if (!(key in next)) {
          next[key] = checkedSectionIds.length <= 1
          changed = true
        }
      })
      Object.keys(next).forEach((key) => {
        const numId = Number(key)
        if (!checkedSectionIds.some((id) => String(id) === key || id === numId)) {
          delete next[key]
          changed = true
        }
      })
      return changed ? next : prev
    })
  }, [checkedSectionIds])

  const visibleSections = [...sections]
    .filter((s) => isAdvisorVisibleSection(sectionTemplateKey(s)))
    .sort((a, b) => advisorSectionOrder(sectionTemplateKey(a)) - advisorSectionOrder(sectionTemplateKey(b)))

  const actionChangeRequests = useMemo(
    () => myChangeRequests.filter((cr) => ['rejected', 'approved_with_feedback'].includes(cr.status)),
    [myChangeRequests]
  )

  const crStatusLabel = (status) => ({
    pending: 'Pending',
    under_review: 'Under Review',
    scheduled: 'Scheduled',
    approved: 'Approved',
    rejected: 'Rejected',
    approved_with_feedback: 'Approved with Feedback',
  }[status] || status)

  const tabs = isPowerAdminPublishMode
    ? [{ id: 'editor', label: 'Content Editor', icon: FaEdit, count: checkedSectionIds.length }]
    : [
        { id: 'templates', label: 'Template Catalog', icon: FaThLarge, count: availableTemplates.length },
        { id: 'deployments', label: 'Site Deployments', icon: FaRocket, count: templateRequests.length },
        { id: 'editor', label: 'Content Editor', icon: FaEdit, count: checkedSectionIds.length },
      ]

  const pageContent = (
    <>
      <div className={embedded ? 'w-full min-w-0' : 'max-w-7xl mx-auto px-4 sm:px-6 py-8'}>
        {/* Header — skip full page chrome when embedded in hub dashboard (hub page-head already shown) */}
        <div className={embedded ? 'mb-5' : 'mb-8'}>
          {!embedded && (
            <div className="flex items-start justify-between flex-wrap gap-4 mb-6">
              <div>
                <p className="text-xs font-extrabold text-[var(--brand)] uppercase tracking-widest mb-1">
                  {isPowerAdminPublishMode ? `${powerAdminLabel} — Direct Publish` : getConsoleTitle('advisor')}
                </p>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-[var(--brand-dark)] tracking-tight">
                  {isPowerAdminPublishMode ? 'Edit Deployment Content' : 'Content Management'}
                </h1>
                <p className="text-gray-500 text-sm mt-2 max-w-xl">
                  {isPowerAdminPublishMode
                    ? 'Edit section content for this deployed site. Changes are published directly to the live site without approver review.'
                    : 'Request multiple showcase sites, manage deployments, and edit content for each live site.'}
                </p>
                {isPowerAdminPublishMode && activeDeployment && (
                  <p className="text-xs text-gray-500 mt-2">
                    Editing: <strong className="text-[var(--brand-dark)]">{activeDeployment.advisor?.name || advisorLabel}</strong>
                    {' · '}
                    <span className="font-mono">{activeDeployment.domain_name || activeDeployment.cpanel_domain}</span>
                  </p>
                )}
              </div>
              {isPowerAdminPublishMode ? (
                <button
                  type="button"
                  onClick={() => onExitPowerAdmin?.()}
                  className="inline-flex items-center gap-2 bg-white border border-gray-200 text-gray-700 text-sm font-bold px-5 py-3 rounded-xl hover:bg-gray-50 transition shadow-sm"
                >
                  <FaArrowLeft className="w-4 h-4" />
                  Back to Deployments
                </button>
              ) : canRequestDeployments ? (
                <button
                  type="button"
                  onClick={() => openDeploymentModal(null, true)}
                  className="inline-flex items-center gap-2 bg-[var(--brand-dark)] text-white text-sm font-bold px-5 py-3 rounded-xl hover:bg-[color-mix(in_srgb,var(--brand-dark)_85%,black)] transition shadow-lg shadow-[color-mix(in_srgb,var(--brand-dark)_20%,transparent)]"
                >
                  <FaPlus className="w-4 h-4" />
                  New Deployment
                </button>
              ) : null}
            </div>
          )}

          {embedded && (
            <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
              {isPowerAdminPublishMode && activeDeployment ? (
                <p className="text-xs text-gray-500">
                  Editing: <strong className="text-[var(--brand-dark)]">{activeDeployment.advisor?.name || advisorLabel}</strong>
                  {' · '}
                  <span className="font-mono">{activeDeployment.domain_name || activeDeployment.cpanel_domain}</span>
                </p>
              ) : (
                <p className="text-xs text-gray-500">Templates, deployments, and section editing for your sites.</p>
              )}
              <div className="flex items-center gap-2">
                {isPowerAdminPublishMode ? (
                  <button
                    type="button"
                    onClick={() => onExitPowerAdmin?.()}
                    className="inline-flex items-center gap-2 bg-white border border-gray-200 text-gray-700 text-xs font-bold px-3.5 py-2 rounded-xl hover:bg-gray-50 transition shadow-sm"
                  >
                    <FaArrowLeft className="w-3.5 h-3.5" />
                    Back
                  </button>
                ) : canRequestDeployments ? (
                  <button
                    type="button"
                    onClick={() => openDeploymentModal(null, true)}
                    className="inline-flex items-center gap-2 bg-[var(--brand-dark)] text-white text-xs font-bold px-3.5 py-2 rounded-xl hover:bg-[color-mix(in_srgb,var(--brand-dark)_85%,black)] transition shadow-md"
                  >
                    <FaPlus className="w-3.5 h-3.5" />
                    New Deployment
                  </button>
                ) : null}
              </div>
            </div>
          )}

          {/* Quick stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="bg-white rounded-xl border border-gray-200/80 p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  deployedRequests.length > 0 ? 'bg-emerald-100 text-emerald-600' : pendingRequests.length > 0 ? 'bg-amber-100 text-amber-600' : 'bg-gray-100 text-gray-400'
                }`}>
                  <FaServer className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Deployments</p>
                  <p className="text-sm font-extrabold text-[var(--brand-dark)]">
                    {deployedRequests.length} live
                    {pendingRequests.length > 0 && <span className="text-amber-600 font-bold"> · {pendingRequests.length} pending</span>}
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-gray-200/80 p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center">
                  <FaFileAlt className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Pages</p>
                  <p className="text-sm font-extrabold text-[var(--brand-dark)]">{pages.length}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-gray-200/80 p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-violet-100 text-violet-600 flex items-center justify-center">
                  <FaLayerGroup className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Sections</p>
                  <p className="text-sm font-extrabold text-[var(--brand-dark)]">{visibleSections.length}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-gray-200/80 p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${checkedSectionIds.length > 0 ? 'bg-[var(--brand)]/10 text-[var(--brand)]' : 'bg-gray-100 text-gray-400'}`}>
                  <FaEdit className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Editing</p>
                  <p className="text-sm font-extrabold text-[var(--brand-dark)]">
                    {checkedSectionIds.length} {isPowerAdminPublishMode ? 'selected' : 'locked'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Workflow progress */}
        {!isPowerAdminPublishMode && (
        <WorkflowStepper
          isSiteDeployed={hasDeployedSite}
          hasPage={Boolean(selectedPageId)}
          hasSections={checkedSectionIds.length > 0}
          isComplete={false}
        />
        )}

        {/* Global Notifications */}
        {message && <AlertBanner type="success" message={message} onDismiss={() => setMessage('')} />}
        {error && <AlertBanner type="error" message={error} onDismiss={() => setError('')} />}

        {/* Tabs */}
        <div className="flex items-center gap-2 mb-6 flex-wrap">
          {tabs.map(tab => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition ${
                  activeTab === tab.id
                    ? 'bg-[var(--brand-dark)] text-white shadow-md'
                    : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                    activeTab === tab.id ? 'bg-white/20' : 'bg-gray-100 text-gray-500'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            )
          })}
        </div>

        {activeTab === 'templates' && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-6 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-[var(--brand-dark)]">Showcase Templates</h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Browse available website templates — hover to preview the full page, then request a deployment.
              </p>
            </div>
            <div className="wc-icon-field w-full sm:w-72">
              <FaSearch className="wc-icon-field__icon" aria-hidden="true" />
              <input
                type="search"
                placeholder="Search templates…"
                value={templateSearch}
                onChange={e => setTemplateSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-[color-mix(in_srgb,var(--brand)_30%,transparent)] focus:border-[var(--brand)]"
              />
            </div>
          </div>

          <div className="p-6">
            {filteredTemplates.length === 0 ? (
              <div className="py-12 text-center">
                <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-slate-100 flex items-center justify-center">
                  <FaThLarge className="w-6 h-6 text-slate-400" />
                </div>
                <h3 className="font-bold text-[var(--brand-dark)] mb-1">
                  {templateSearch ? 'No templates match your search' : 'No templates available yet'}
                </h3>
                <p className="text-sm text-gray-500">
                  {templateSearch
                    ? 'Try a different search term.'
                    : 'Contact your administrator to register showcase templates.'}
                </p>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-6">
                {filteredTemplates.map(tpl => {
                  const isInUse = templateRequests.some(req => req.template_name === tpl.slug)
                  return (
                    <article
                      key={tpl.id}
                      className="border border-gray-200 rounded-2xl overflow-hidden bg-white flex flex-col hover:border-[var(--brand-dark)]/20 hover:shadow-lg transition-all duration-300"
                    >
                      <TemplateScrollPreview
                          template={tpl}
                          className="h-40 w-full"
                          overlay={
                            <>
                              <div className="absolute top-3 left-3 bg-[color-mix(in_srgb,var(--brand-dark)_90%,transparent)] backdrop-blur-sm text-white font-mono text-[10px] font-bold px-2.5 py-1 rounded-md z-10">
                                {tpl.slug}
                              </div>
                              {isInUse && (
                                <div className="absolute top-3 right-3 z-10">
                                  <span className="inline-flex items-center gap-1 bg-indigo-500 text-white text-[10px] font-extrabold px-2.5 py-1 rounded-full uppercase tracking-wider">
                                    <FaCheckCircle className="w-2.5 h-2.5" />
                                    In Use
                                  </span>
                                </div>
                              )}
                            </>
                          }
                        />

                      <div className="p-4 flex-1 flex flex-col">
                        <h3 className="font-extrabold text-[var(--brand-dark)] text-base leading-tight">
                          {tpl.name}
                        </h3>
                        <p className="text-xs text-gray-500 mt-2 line-clamp-2 flex-1">
                          {tpl.description || 'No description provided.'}
                        </p>

                        <button
                          type="button"
                          onClick={() => openDeploymentModal(tpl.slug)}
                          className="mt-4 w-full inline-flex items-center justify-center gap-2 text-xs font-bold text-white bg-[var(--brand-dark)] hover:bg-[color-mix(in_srgb,var(--brand-dark)_85%,black)] px-3 py-2.5 rounded-xl transition"
                        >
                          <FaRocket className="w-3 h-3" />
                          Request Deployment
                        </button>
                      </div>
                    </article>
                  )
                })}
              </div>
            )}
          </div>
        </div>
        )}

        {activeTab === 'deployments' && (
        <StepCard
          step={1}
          title="Site Deployments"
          description="Request multiple showcase sites — each with its own domain and template. Select a live site to edit its content."
          defaultOpen={!hasDeployedSite}
          badge={
            <DeploymentSummaryBadge
              deployed={deployedRequests.length}
              pending={pendingRequests.length}
              rejected={rejectedRequests.length}
            />
          }
        >
          <div className="flex items-center justify-between flex-wrap gap-3 mb-5">
            <p className="text-sm text-gray-600">
              <span className="font-bold text-[var(--brand-dark)]">{templateRequests.length}</span>
              {' '}deployment request{templateRequests.length === 1 ? '' : 's'} total
            </p>
            <button
              type="button"
              onClick={() => openDeploymentModal()}
              className="inline-flex items-center gap-2 text-xs font-bold px-4 py-2 rounded-xl bg-[var(--brand-dark)] text-white hover:bg-[color-mix(in_srgb,var(--brand-dark)_85%,black)] transition shadow-sm"
            >
              <FaPlus className="w-3 h-3" />
              Request New Deployment
            </button>
          </div>

          {templateRequests.length === 0 ? (
            <div className="text-center py-10 px-4 border-2 border-dashed border-gray-200 rounded-xl bg-slate-50/50">
              <div className="w-14 h-14 rounded-2xl bg-white border border-gray-200 text-gray-400 flex items-center justify-center mx-auto mb-4 shadow-sm">
                <FaRocket className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-[var(--brand-dark)]">No deployments yet</h3>
              <p className="text-sm text-gray-500 mt-1 max-w-sm mx-auto">
                Submit your first deployment request. You can request additional sites anytime after that.
              </p>
              <button
                type="button"
                onClick={() => openDeploymentModal()}
                className="mt-5 inline-flex items-center gap-2 bg-[var(--brand)] text-white text-sm font-bold px-5 py-2.5 rounded-xl hover:bg-[color-mix(in_srgb,var(--brand)_85%,black)] transition shadow-md"
              >
                <FaPlus className="w-4 h-4" />
                Request First Deployment
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {templateRequests.map(req => (
                <DeploymentRequestCard
                  key={req.id}
                  request={req}
                  isActive={req.status === 'deployed' && req.id === activeDeployment?.id}
                  onSelect={req.status === 'deployed' ? () => handleDeploymentSelect(req.id) : undefined}
                />
              ))}
            </div>
          )}

          {hasDeployedSite && deployedRequests.length > 1 && (
            <p className="text-xs text-gray-500 mt-4 flex items-center gap-1.5">
              <FaGlobeAmericas className="w-3.5 h-3.5 text-[var(--brand)]" />
              Currently editing: <strong className="text-[var(--brand-dark)]">{activeDeployment?.domain_name}</strong>
            </p>
          )}
        </StepCard>
        )}

        {activeTab === 'editor' && (
        !hasDeployedSite ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200/80 p-12 text-center">
            <div className="w-16 h-16 rounded-2xl bg-gray-100 text-gray-400 flex items-center justify-center mx-auto mb-4">
              <FaLock className="w-7 h-7" />
            </div>
            <h3 className="text-lg font-bold text-[var(--brand-dark)]">
              {isPowerAdminPublishMode ? 'Deployment Not Available' : 'Section Editor Locked'}
            </h3>
            <p className="text-sm text-gray-500 mt-2 max-w-md mx-auto leading-relaxed">
              {isPowerAdminPublishMode
                ? 'This deployment was not found or is not live yet. Return to the deployment hub and try again.'
                : 'At least one deployment must be live before you can edit content. Request a deployment from the Site Deployments tab.'}
            </p>
            {isPowerAdminPublishMode ? (
              <button
                type="button"
                onClick={() => onExitPowerAdmin?.()}
                className="mt-5 inline-flex items-center gap-2 bg-[var(--brand-dark)] text-white text-sm font-bold px-5 py-2.5 rounded-xl hover:bg-[color-mix(in_srgb,var(--brand-dark)_85%,black)] transition shadow-md"
              >
                <FaArrowLeft className="w-3.5 h-3.5" />
                Back to Deployments
              </button>
            ) : pendingRequests.length > 0 ? (
              <div className="mt-5 inline-flex items-center gap-2 bg-amber-50 text-amber-800 border border-amber-200 text-xs font-bold px-4 py-2.5 rounded-xl">
                <FaClock className="w-3.5 h-3.5" />
                {pendingRequests.length} deployment{pendingRequests.length === 1 ? '' : 's'} pending review
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setActiveTab('deployments')
                  openDeploymentModal()
                }}
                className="mt-5 inline-flex items-center gap-2 bg-[var(--brand-dark)] text-white text-sm font-bold px-5 py-2.5 rounded-xl hover:bg-[color-mix(in_srgb,var(--brand-dark)_85%,black)] transition shadow-md"
              >
                <FaPlus className="w-3.5 h-3.5" />
                Request Deployment
              </button>
            )}
          </div>
        ) : (
          <div>
            {!isPowerAdminPublishMode && actionChangeRequests.length > 0 && (
              <div className="mb-5 space-y-3">
                <div className="flex items-center gap-2">
                  <FaExclamationTriangle className="w-4 h-4 text-amber-500" />
                  <h3 className="text-sm font-extrabold text-[var(--brand-dark)]">My change requests needing action</h3>
                </div>
                {actionChangeRequests.map((cr) => (
                  <div
                    key={cr.id}
                    className={`rounded-xl border p-4 ${
                      cr.status === 'rejected'
                        ? 'border-rose-200 bg-rose-50/70'
                        : 'border-violet-200 bg-violet-50/70'
                    }`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-[var(--brand-dark)]">
                          Request #{cr.id}
                          <span className="ml-2 text-xs font-bold text-slate-500">v{cr.current_version || 1}</span>
                          <span className="ml-2 text-xs font-bold text-slate-600">· {crStatusLabel(cr.status)}</span>
                        </p>
                        {cr.status === 'rejected' && cr.rejection_reason && (
                          <p className="text-xs text-rose-800 mt-1">
                            <span className="font-bold">Rejection:</span> {cr.rejection_reason}
                          </p>
                        )}
                        {cr.status === 'approved_with_feedback' && cr.feedback && (
                          <p className="text-xs text-violet-900 mt-1">
                            <span className="font-bold">Feedback:</span> {cr.feedback}
                          </p>
                        )}
                        <p className="text-[11px] text-slate-500 mt-1">
                          Select section drafts in the editor below, then use the actions here (or submit — rejected/AWF overlapping sections auto-route).
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2 shrink-0">
                        {cr.status === 'rejected' && (
                          <button
                            type="button"
                            onClick={() => handleResubmitChangeRequest(cr.id)}
                            disabled={!!crActionBusy || isSubmitting}
                            className="inline-flex items-center gap-1.5 bg-rose-600 text-white text-xs font-bold px-3 py-2 rounded-lg hover:bg-rose-700 disabled:opacity-60"
                          >
                            <FaRedo className="w-3 h-3" />
                            {crActionBusy === `resubmit-${cr.id}` ? 'Resubmitting…' : 'Resubmit checked edits'}
                          </button>
                        )}
                        {cr.status === 'approved_with_feedback' && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleConfirmChangeRequestFeedback(cr.id, false)}
                              disabled={!!crActionBusy || isSubmitting}
                              className="inline-flex items-center gap-1.5 bg-emerald-600 text-white text-xs font-bold px-3 py-2 rounded-lg hover:bg-emerald-700 disabled:opacity-60"
                            >
                              <FaCheckCircle className="w-3 h-3" />
                              {crActionBusy === `confirm-${cr.id}` ? 'Publishing…' : 'Confirm & publish'}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleConfirmChangeRequestFeedback(cr.id, true)}
                              disabled={!!crActionBusy || isSubmitting}
                              className="inline-flex items-center gap-1.5 bg-violet-600 text-white text-xs font-bold px-3 py-2 rounded-lg hover:bg-violet-700 disabled:opacity-60"
                            >
                              <FaCommentDots className="w-3 h-3" />
                              {crActionBusy === `update-${cr.id}` ? 'Publishing…' : 'Update & publish'}
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!isPowerAdminPublishMode && myChangeRequests.length > 0 && (
              <div className="mb-5 bg-white rounded-xl border border-gray-200 p-4">
                <p className="text-xs font-extrabold uppercase tracking-wider text-gray-500 mb-2">My change requests</p>
                <div className="flex flex-wrap gap-2">
                  {myChangeRequests.slice(0, 8).map((cr) => (
                    <span
                      key={cr.id}
                      className="inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full border border-slate-200 bg-slate-50 text-slate-700"
                    >
                      #{cr.id} · v{cr.current_version || 1} · {crStatusLabel(cr.status)}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {!isPowerAdminPublishMode && deployedRequests.length > 1 && (
              <StepCard
                step={2}
                title="Select Active Site"
                description="You have multiple live deployments. Choose which site you want to edit."
              >
                <div className="grid sm:grid-cols-2 gap-3">
                  {deployedRequests.map(req => {
                    const isSelected = req.id === activeDeployment?.id
                    return (
                      <button
                        key={req.id}
                        type="button"
                        onClick={() => handleDeploymentSelect(req.id)}
                        className={`text-left p-4 rounded-xl border transition-all ${
                          isSelected
                            ? 'border-[var(--brand)] bg-[var(--brand)]/5 ring-2 ring-[color-mix(in_srgb,var(--brand)_15%,transparent)] shadow-sm'
                            : 'border-gray-200 bg-white hover:border-[var(--brand)]/30 hover:shadow-md'
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <FaGlobeAmericas className={`w-4 h-4 ${isSelected ? 'text-[var(--brand)]' : 'text-gray-400'}`} />
                          <span className="font-bold text-sm text-[var(--brand-dark)] truncate">{req.domain_name}</span>
                          {isSelected && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[var(--brand)] text-white ml-auto">Active</span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500">{req.template_name || 'template4'}</p>
                      </button>
                    )
                  })}
                </div>
              </StepCard>
            )}

            <StepCard
              step={deployedRequests.length > 1 ? 3 : 2}
              title="Select Page"
              description={
                activeDeployment
                  ? `Choose a page to edit on ${activeDeployment.domain_name}.`
                  : 'Choose which page you want to edit sections on.'
              }
              defaultOpen={checkedSectionIds.length === 0}
            >
              <select
                value={selectedPageId}
                onChange={(e) => handlePageSelect(e.target.value)}
                className="w-full md:w-96 text-sm font-semibold p-3 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-[color-mix(in_srgb,var(--brand)_30%,transparent)] focus:border-[var(--brand)] outline-none transition"
              >
                <option value="">-- Choose a Page --</option>
                {pages.map(page => (
                  <option key={page.id} value={page.id}>
                    {page.title} ({page.slug})
                  </option>
                ))}
              </select>
            </StepCard>

            {selectedPage && (
              <div className="space-y-8">
                <StepCard
                  step={deployedRequests.length > 1 && !isPowerAdminPublishMode ? 4 : 3}
                  title={`Select Sections — ${selectedPage.title}`}
                  description={
                    isPowerAdminPublishMode
                      ? 'Check sections to edit them. Changes publish directly to the live site when you click Publish to Live.'
                      : 'Check sections to lock them for editing. Locked sections appear in the editor below.'
                  }
                  defaultOpen={checkedSectionIds.length === 0}
                  badge={
                    checkedSectionIds.length > 0 ? (
                      <span className="inline-flex items-center gap-1.5 text-xs bg-[var(--brand)]/10 text-[var(--brand)] font-bold px-3 py-1.5 rounded-full border border-[var(--brand)]/20">
                        {isPowerAdminPublishMode ? <FaEdit className="w-3 h-3" /> : <FaLock className="w-3 h-3" />}
                        {checkedSectionIds.length} {isPowerAdminPublishMode ? 'selected' : 'locked'}
                      </span>
                    ) : null
                  }
                >
                  <div className="grid sm:grid-cols-2 gap-3">
                    {visibleSections.map(section => {
                      const isChecked = checkedSectionIds.includes(section.id)
                      const isLockedByMe = !isPowerAdminPublishMode && section.is_locked && section.locked_by === user?.id
                      const isLockedByOther = !isPowerAdminPublishMode && section.is_locked && section.locked_by !== user?.id
                      const SecIcon = sectionIcon(sectionTemplateKey(section))

                      return (
                        <label
                          key={section.id}
                          className={`p-4 rounded-xl border flex items-start gap-3 transition-all ${
                            isLockedByOther
                              ? 'bg-gray-50 border-gray-200 cursor-not-allowed opacity-60'
                              : isChecked || isLockedByMe
                                ? 'bg-[var(--brand)]/5 border-[var(--brand)] ring-2 ring-[var(--brand)]/10 cursor-default shadow-sm'
                                : 'bg-white border-gray-200 hover:border-[var(--brand)]/30 hover:shadow-md cursor-pointer'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked || isLockedByMe}
                            disabled={isLockedByOther || (!isPowerAdminPublishMode && (isChecked || isLockedByMe))}
                            onChange={(e) => handleSectionCheckboxChange(section, e.target.checked)}
                            className="w-4 h-4 mt-1 text-[var(--brand)] rounded border-gray-300 focus:ring-[var(--brand)] shrink-0"
                          />
                          <div className="flex items-start gap-3 flex-1 min-w-0">
                            <div className={`shrink-0 w-9 h-9 rounded-lg flex items-center justify-center ${
                              isChecked || isLockedByMe ? 'bg-[var(--brand)] text-white' : 'bg-gray-100 text-gray-500'
                            }`}>
                              <SecIcon className="w-4 h-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-bold text-[var(--brand-dark)] text-sm flex items-center flex-wrap gap-2">
                                {sectionDisplayName(section)}
                                {section.is_visible === false && (
                                  <span className="text-[10px] bg-gray-200 text-gray-600 font-bold px-2 py-0.5 rounded-full">Hidden</span>
                                )}
                                {isLockedByOther && (
                                  <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                                    <FaLock className="w-2.5 h-2.5" />
                                    {section.locked_by
                                      ? (section.locked_by_user?.name || 'Another user')
                                      : 'Under review'}
                                  </span>
                                )}
                                {(isChecked || isLockedByMe) && (
                                  <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                                    <FaCheckCircle className="w-2.5 h-2.5" />
                                    Locked by you
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-gray-500 mt-1">
                                {isLockedByOther
                                  ? (section.locked_by
                                      ? `Locked by ${section.locked_by_user?.name || 'another user'}`
                                      : 'Pending or scheduled change request — locked until reviewed')
                                  : isChecked || isLockedByMe
                                    ? 'Ready to edit below'
                                    : 'Click to lock & edit'}
                              </p>
                            </div>
                          </div>
                        </label>
                      )
                    })}
                  </div>
                </StepCard>

                {checkedSectionIds.length > 0 ? (
                  <div className="space-y-4">
                    {checkedSectionIds.length > 1 && (
                      <div className="flex items-center justify-between flex-wrap gap-2 px-1">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setAllEditorsExpanded(true)}
                            className="text-xs font-bold px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-gray-600 hover:border-[var(--brand)]/30 hover:text-[var(--brand-dark)] transition"
                          >
                            Expand all
                          </button>
                          <button
                            type="button"
                            onClick={() => setAllEditorsExpanded(false)}
                            className="text-xs font-bold px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-gray-600 hover:border-[var(--brand)]/30 hover:text-[var(--brand-dark)] transition"
                          >
                            Collapse all
                          </button>
                        </div>
                      </div>
                    )}

                    {checkedSectionIds.map(secId => {
                      const section = visibleSections.find(s => s.id === secId)
                      if (!section) return null
                      const values = sectionEdits[secId] || {}
                      const isPreview = previewTab[secId]
                      const isExpanded = isEditorExpanded(secId)
                      const SecIcon = sectionIcon(sectionTemplateKey(section))

                      return (
                        <div key={secId} className="bg-white rounded-2xl shadow-sm border border-gray-200/80">
                          {!isExpanded ? (
                            <div className="px-6 py-3 flex items-center justify-between flex-wrap gap-3 bg-gray-50/80 hover:bg-gray-50 cursor-pointer rounded-2xl">
                              <button
                                type="button"
                                onClick={() => toggleEditorExpanded(secId)}
                                className="flex items-center gap-3 min-w-0 flex-1 text-left group"
                              >
                                <FaChevronDown className="w-3.5 h-3.5 text-gray-400 shrink-0 transition-transform duration-200 group-hover:text-[var(--brand)]" />
                                <div className="w-9 h-9 rounded-lg bg-[var(--brand)] text-white flex items-center justify-center shadow-sm shrink-0">
                                  <SecIcon className="w-4 h-4" />
                                </div>
                                <div className="min-w-0">
                                  <h3 className="text-base font-bold text-[var(--brand-dark)] truncate group-hover:text-[var(--brand)] transition-colors">
                                    {sectionDisplayName(section)}
                                  </h3>
                                  <p className="text-[11px] text-gray-400 mt-0.5">
                                    {isPreview ? 'Preview mode' : 'Fields mode'} · Click to expand
                                  </p>
                                </div>
                              </button>
                            </div>
                          ) : (
                            <div className={`sticky ${embedded ? 'top-0' : 'top-16'} z-20 px-6 py-2.5 flex items-center justify-between gap-3 bg-white/95 backdrop-blur-sm border-b border-gray-100 shadow-sm rounded-t-2xl`}>
                              <button
                                type="button"
                                onClick={() => toggleEditorExpanded(secId)}
                                className="flex items-center gap-2.5 min-w-0 flex-1 text-left group"
                              >
                                <FaChevronDown className="w-3.5 h-3.5 text-gray-400 shrink-0 transition-transform duration-200 rotate-180 group-hover:text-[var(--brand)]" />
                                <div className="w-8 h-8 rounded-lg bg-[var(--brand)] text-white flex items-center justify-center shadow-sm shrink-0">
                                  <SecIcon className="w-3.5 h-3.5" />
                                </div>
                                <h3 className="text-sm font-bold text-[var(--brand-dark)] truncate group-hover:text-[var(--brand)] transition-colors">
                                  {sectionDisplayName(section)}
                                </h3>
                              </button>
                              <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl shrink-0">
                                <button
                                  type="button"
                                  onClick={() => setPreviewTab(prev => ({ ...prev, [secId]: false }))}
                                  className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg transition ${!isPreview ? 'bg-white text-[var(--brand-dark)] shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                                >
                                  <FaEdit className="w-3 h-3" />
                                  Fields
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setPreviewTab(prev => ({ ...prev, [secId]: true }))}
                                  className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg transition ${isPreview ? 'bg-white text-[var(--brand-dark)] shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                                >
                                  <FaEye className="w-3 h-3" />
                                  Preview
                                </button>
                              </div>
                            </div>
                          )}

                          {isExpanded && (
                          !isPreview ? (
                            <div className="p-6">
                              {isHeroSection(sectionTemplateKey(section)) ? (
                                (() => {
                                  const activeSlideIndex = previewSlide[secId] ?? 0
                                  const slides = values.slides && Array.isArray(values.slides) ? values.slides : [{}, {}, {}]
                                  const slide = slides[activeSlideIndex] || {}
                                  const slideImage = slide.bg || slide.image_url || ''

                                  const updateSlide = (patch) => {
                                    const updatedSlides = [...slides]
                                    while (updatedSlides.length < 3) updatedSlides.push({})
                                    updatedSlides[activeSlideIndex] = {
                                      ...updatedSlides[activeSlideIndex],
                                      ...patch,
                                      id: activeSlideIndex + 1,
                                    }
                                    handleFieldValueChange(secId, 'slides', updatedSlides)
                                  }

                                  return (
                                    <div className="space-y-4">
                                      <div className="flex items-center justify-between flex-wrap gap-3">
                                        <p className="text-xs text-gray-500">Edit one slide at a time — switch tabs to update each hero slide.</p>
                                        <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-xl">
                                          {[0, 1, 2].map((slideIndex) => {
                                            const s = slides[slideIndex] || {}
                                            const isActive = activeSlideIndex === slideIndex
                                            const hasContent = Boolean(
                                              s.heading || s.eyebrow || s.bg || s.image_url || s.subheading || s.text
                                            )
                                            return (
                                              <button
                                                key={slideIndex}
                                                type="button"
                                                onClick={() => setPreviewSlide((prev) => ({ ...prev, [secId]: slideIndex }))}
                                                className={`relative inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg transition ${
                                                  isActive
                                                    ? 'bg-white text-[var(--brand-dark)] shadow-sm'
                                                    : 'text-gray-500 hover:text-gray-700'
                                                }`}
                                              >
                                                Slide {slideIndex + 1}
                                                {hasContent && (
                                                  <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-[var(--brand)]' : 'bg-emerald-400'}`} />
                                                )}
                                              </button>
                                            )
                                          })}
                                        </div>
                                      </div>

                                      <div className="border border-gray-200 rounded-xl p-4 bg-gray-50/50">
                                        <h5 className="text-sm font-bold text-[var(--brand-dark)] mb-4 flex items-center gap-2">
                                          <span className="w-6 h-6 rounded-full bg-[var(--brand)] text-white flex items-center justify-center text-xs">
                                            {activeSlideIndex + 1}
                                          </span>
                                          Slide {activeSlideIndex + 1}
                                        </h5>

                                        <div className="grid md:grid-cols-2 gap-4">
                                          <div className="md:col-span-2">
                                            <ImageFieldPicker
                                              label="Background Image"
                                              value={slideImage}
                                              onChange={(v) => {
                                                updateSlide({ bg: v, image_url: v })
                                                setPreviewSlide((prev) => ({ ...prev, [secId]: activeSlideIndex }))
                                              }}
                                              onUpload={(file) => handleSlideImageUpload(secId, activeSlideIndex, file)}
                                              uploading={uploadingState[`${secId}-${activeSlideIndex}`]}
                                              localImages={localImages}
                                              pathPlaceholder="e.g. intime-08 or /uploaded-images/image.jpg"
                                            />
                                          </div>

                                          <div className="md:col-span-2">
                                            <label className={labelClass}>Eyebrow / Tagline</label>
                                            <input
                                              type="text"
                                              value={slide.eyebrow || ''}
                                              onChange={(e) => updateSlide({ eyebrow: e.target.value })}
                                              placeholder="e.g. FINANCIAL CENTRE & WEALTH MANAGEMENT"
                                              className={inputClass}
                                            />
                                          </div>
                                          <div className="md:col-span-2">
                                            <label className={labelClass}>Heading / Title</label>
                                            <input
                                              type="text"
                                              value={slide.heading || ''}
                                              onChange={(e) => updateSlide({ heading: e.target.value })}
                                              placeholder="e.g. Strategic Advisory for Long-Term Growth"
                                              className={`${inputClass} font-semibold text-[var(--brand-dark)]`}
                                            />
                                          </div>
                                          <div className="md:col-span-2">
                                            <label className={labelClass}>Subheading</label>
                                            <textarea
                                              rows={2}
                                              value={slide.subheading || ''}
                                              onChange={(e) => updateSlide({ subheading: e.target.value })}
                                              placeholder="Summary or tagline..."
                                              className={inputClass}
                                            />
                                          </div>
                                          <div className="md:col-span-2">
                                            <label className={labelClass}>Body Text</label>
                                            <textarea
                                              rows={2}
                                              value={slide.text || ''}
                                              onChange={(e) => updateSlide({ text: e.target.value })}
                                              placeholder="Full slide text..."
                                              className={inputClass}
                                            />
                                          </div>
                                          {isPowerAdminPublishMode && (
                                            <>
                                              <div>
                                                <label className={labelClass}>Button Text</label>
                                                <input
                                                  type="text"
                                                  value={slide.button_text || ''}
                                                  onChange={(e) => updateSlide({ button_text: e.target.value })}
                                                  placeholder="GET IN TOUCH"
                                                  className={inputClass}
                                                />
                                              </div>
                                              <div>
                                                <label className={labelClass}>Button URL</label>
                                                <input
                                                  type="text"
                                                  value={slide.button_url || slide.url || slide.link || ''}
                                                  onChange={(e) => updateSlide({ button_url: e.target.value })}
                                                  placeholder="#contact or https://..."
                                                  className={inputClass}
                                                />
                                              </div>
                                              <div className="md:col-span-2">
                                                <label className={labelClass}>YouTube URL</label>
                                                <input
                                                  type="text"
                                                  value={slide.youtube_url || ''}
                                                  onChange={(e) => updateSlide({ youtube_url: e.target.value })}
                                                  placeholder="https://www.youtube.com/watch?v=..."
                                                  className={inputClass}
                                                />
                                              </div>
                                            </>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  )
                                })()
                              ) : isWhatWeDoSection(sectionTemplateKey(section)) ? (
                                (() => {
                                  const activeBoxIndex = getItemTab(secId, 'box', 0)
                                  const boxes = values.boxes && Array.isArray(values.boxes)
                                    ? values.boxes
                                    : (values.items && Array.isArray(values.items) ? values.items : [{}, {}, {}])
                                  const box = boxes[activeBoxIndex] || {}
                                  const boxImage = box.image_url || box.img || box.image || ''

                                  return (
                                    <div className="space-y-6">
                                      <div className="grid md:grid-cols-2 gap-4">
                                        <div className="md:col-span-2">
                                          <label className={labelClass}>Subheading</label>
                                          <input
                                            type="text"
                                            value={values.subheading || values.eyebrow || ''}
                                            onChange={(e) => handleFieldValueChange(secId, 'subheading', e.target.value)}
                                            placeholder="WHAT WE DO"
                                            className={inputClass}
                                          />
                                        </div>
                                        <div className="md:col-span-2">
                                          <label className={labelClass}>Main Heading</label>
                                          <input
                                            type="text"
                                            value={values.heading || ''}
                                            onChange={(e) => handleFieldValueChange(secId, 'heading', e.target.value)}
                                            placeholder="We are the best agency to improve your deals."
                                            className={`${inputClass} font-semibold text-[var(--brand-dark)]`}
                                          />
                                        </div>
                                        <div className="md:col-span-2">
                                          <label className={labelClass}>Text</label>
                                          <textarea
                                            rows={3}
                                            value={values.text || ''}
                                            onChange={(e) => handleFieldValueChange(secId, 'text', e.target.value)}
                                            placeholder="Section introduction..."
                                            className={inputClass}
                                          />
                                        </div>
                                      </div>

                                      <div className="space-y-4">
                                        <ItemTabBar
                                          hint="Edit one box at a time — switch tabs to update each feature box."
                                          count={3}
                                          labelPrefix="Box"
                                          activeIndex={activeBoxIndex}
                                          onSelect={(i) => selectItemTab(secId, 'box', i)}
                                          hasContentAt={(i) => {
                                            const b = boxes[i] || {}
                                            return Boolean(b.heading || b.title || b.text || b.image_url || b.img || b.image)
                                          }}
                                        />

                                        <ItemPanel index={activeBoxIndex} title={`Box ${activeBoxIndex + 1}`}>
                                          <div className="grid md:grid-cols-2 gap-4">
                                            <div className="md:col-span-2">
                                              <ImageFieldPicker
                                                label="Box Image"
                                                value={boxImage}
                                                onChange={(v) => patchBox(secId, activeBoxIndex, { image_url: v })}
                                                onUpload={(file) => handleBoxImageUpload(secId, activeBoxIndex, file)}
                                                uploading={uploadingState[`box-${secId}-${activeBoxIndex}`]}
                                                localImages={localImages}
                                              />
                                            </div>
                                            <div className="md:col-span-2">
                                              <label className={labelClass}>Heading</label>
                                              <input
                                                type="text"
                                                value={box.heading || box.title || ''}
                                                onChange={(e) => patchBox(secId, activeBoxIndex, { heading: e.target.value })}
                                                placeholder="Business & Strategy"
                                                className={`${inputClass} font-semibold text-[var(--brand-dark)]`}
                                              />
                                            </div>
                                            <div className="md:col-span-2">
                                              <label className={labelClass}>Text</label>
                                              <textarea
                                                rows={2}
                                                value={box.text || ''}
                                                onChange={(e) => patchBox(secId, activeBoxIndex, { text: e.target.value })}
                                                placeholder="Box description..."
                                                className={inputClass}
                                              />
                                            </div>
                                          </div>
                                        </ItemPanel>
                                      </div>
                                    </div>
                                  )
                                })()
                              ) : isAboutSection(sectionTemplateKey(section)) ? (
                                <div className="space-y-8">

                                  <div className="grid md:grid-cols-2 gap-4">
                                    <div className="md:col-span-2">
                                      <label className="block text-xs font-bold text-gray-700 mb-1">Subheading</label>
                                      <input
                                        type="text"
                                        value={values.eyebrow || ''}
                                        onChange={(e) => handleFieldValueChange(secId, 'eyebrow', e.target.value)}
                                        placeholder="ABOUT US"
                                        className="w-full text-sm p-2.5 border rounded-lg focus:ring-2 focus:ring-[var(--brand)] outline-none"
                                      />
                                    </div>
                                    <div className="md:col-span-2">
                                      <label className="block text-xs font-bold text-gray-700 mb-1">Main Heading</label>
                                      <input
                                        type="text"
                                        value={values.heading || ''}
                                        onChange={(e) => handleFieldValueChange(secId, 'heading', e.target.value)}
                                        placeholder="Why will you choose our?"
                                        className="w-full text-sm p-2.5 border rounded-lg focus:ring-2 focus:ring-[var(--brand)] outline-none font-semibold text-[var(--brand-dark)]"
                                      />
                                    </div>
                                    <div className="md:col-span-2">
                                      <label className="block text-xs font-bold text-gray-700 mb-1">Text (bold)</label>
                                      <textarea
                                        rows={2}
                                        value={values.subheading || ''}
                                        onChange={(e) => handleFieldValueChange(secId, 'subheading', e.target.value)}
                                        placeholder="Our agency can only be as strong as our people..."
                                        className="w-full text-sm p-2.5 border rounded-lg focus:ring-2 focus:ring-[var(--brand)] outline-none"
                                      />
                                    </div>
                                    <div className="md:col-span-2">
                                      <label className="block text-xs font-bold text-gray-700 mb-1">Text</label>
                                      <textarea
                                        rows={3}
                                        value={values.text || ''}
                                        onChange={(e) => handleFieldValueChange(secId, 'text', e.target.value)}
                                        placeholder="Section introduction..."
                                        className="w-full text-sm p-2.5 border rounded-lg focus:ring-2 focus:ring-[var(--brand)] outline-none"
                                      />
                                    </div>
                                  </div>

                                  <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                                    <ImageFieldPicker
                                      label="About Image"
                                      value={values.image_url || ''}
                                      onChange={(v) => handleFieldValueChange(secId, 'image_url', v)}
                                      onUpload={(file) => handleAboutImageUpload(secId, file)}
                                      uploading={uploadingState[`about-${secId}`]}
                                      localImages={localImages}
                                    />
                                  </div>

                                  {(() => {
                                    const gaugeIndex = getItemTab(secId, 'gauge', 0)
                                    const gauge = (values.gauges && values.gauges[gaugeIndex]) || {}
                                    return (
                                      <div className="space-y-4">
                                        <ItemTabBar
                                          hint="Edit one percentage gauge at a time."
                                          count={2}
                                          labelPrefix="Gauge"
                                          activeIndex={gaugeIndex}
                                          onSelect={(i) => selectItemTab(secId, 'gauge', i)}
                                          hasContentAt={(i) => {
                                            const g = values.gauges?.[i]
                                            return Boolean(g?.value || g?.label)
                                          }}
                                        />
                                        <ItemPanel index={gaugeIndex} title={`Percentage ${gaugeIndex + 1}`}>
                                          <div className="grid md:grid-cols-2 gap-4">
                                            <div>
                                              <label className={labelClass}>Percentage</label>
                                              <input
                                                type="text"
                                                value={gauge.value || ''}
                                                onChange={(e) => patchGauge(secId, gaugeIndex, { value: e.target.value })}
                                                placeholder={gaugeIndex === 0 ? '50%' : '75%'}
                                                className={inputClass}
                                              />
                                            </div>
                                            <div>
                                              <label className={labelClass}>Text</label>
                                              <input
                                                type="text"
                                                value={gauge.label || ''}
                                                onChange={(e) => patchGauge(secId, gaugeIndex, { label: e.target.value })}
                                                placeholder={gaugeIndex === 0 ? 'Business strategy growth' : 'Finance valuable ideas'}
                                                className={inputClass}
                                              />
                                            </div>
                                          </div>
                                        </ItemPanel>
                                      </div>
                                    )
                                  })()}

                                  <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                                    <h5 className="text-sm font-bold text-[var(--brand-dark)] mb-4">Highlight box</h5>
                                    <div className="grid md:grid-cols-2 gap-4">
                                      <div>
                                        <label className="block text-xs font-bold text-gray-700 mb-1">Highlight number</label>
                                        <input
                                          type="text"
                                          value={values.experience_years || ''}
                                          onChange={(e) => handleFieldValueChange(secId, 'experience_years', e.target.value)}
                                          placeholder="10+"
                                          className="w-full text-sm p-2.5 border rounded-lg focus:ring-2 focus:ring-[var(--brand)] outline-none"
                                        />
                                      </div>
                                      <div>
                                        <label className="block text-xs font-bold text-gray-700 mb-1">Highlight text</label>
                                        <input
                                          type="text"
                                          value={values.experience_label || ''}
                                          onChange={(e) => handleFieldValueChange(secId, 'experience_label', e.target.value)}
                                          placeholder="Years of Experience"
                                          className="w-full text-sm p-2.5 border rounded-lg focus:ring-2 focus:ring-[var(--brand)] outline-none"
                                        />
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              ) : isCompanyHistorySection(sectionTemplateKey(section)) ? (
                                <div className="space-y-8">
                                  <div className="grid md:grid-cols-2 gap-4">
                                    <div className="md:col-span-2">
                                      <label className="block text-xs font-bold text-gray-700 mb-1">Subheading</label>
                                      <input
                                        type="text"
                                        value={values.subheading || values.eyebrow || ''}
                                        onChange={(e) => handleFieldValueChange(secId, 'subheading', e.target.value)}
                                        placeholder="OUR JOURNEY"
                                        className="w-full text-sm p-2.5 border rounded-lg focus:ring-2 focus:ring-[var(--brand)] outline-none"
                                      />
                                    </div>
                                    <div className="md:col-span-2">
                                      <label className="block text-xs font-bold text-gray-700 mb-1">Heading</label>
                                      <input
                                        type="text"
                                        value={values.heading || ''}
                                        onChange={(e) => handleFieldValueChange(secId, 'heading', e.target.value)}
                                        placeholder="Our Company History"
                                        className="w-full text-sm p-2.5 border rounded-lg focus:ring-2 focus:ring-[var(--brand)] outline-none font-semibold text-[var(--brand-dark)]"
                                      />
                                    </div>
                                    <div className="md:col-span-2">
                                      <label className="block text-xs font-bold text-gray-700 mb-1">Text</label>
                                      <textarea
                                        rows={3}
                                        value={values.text || ''}
                                        onChange={(e) => handleFieldValueChange(secId, 'text', e.target.value)}
                                        placeholder="A decade of growth, innovation, and unwavering commitment to client success."
                                        className="w-full text-sm p-2.5 border rounded-lg focus:ring-2 focus:ring-[var(--brand)] outline-none"
                                      />
                                    </div>
                                  </div>

                                  {(() => {
                                    const yearIndex = getItemTab(secId, 'year', 0)
                                    const yearItem = (values.years && values.years[yearIndex]) || {}
                                    const yearImage = yearItem.image_url || yearItem.img || yearItem.image || ''
                                    return (
                                      <div className="space-y-4">
                                        <ItemTabBar
                                          hint="Edit one timeline year at a time."
                                          count={6}
                                          labelPrefix="Year"
                                          activeIndex={yearIndex}
                                          onSelect={(i) => selectItemTab(secId, 'year', i)}
                                          hasContentAt={(i) => {
                                            const y = values.years?.[i]
                                            return Boolean(y?.year || y?.heading || y?.title || y?.text || y?.image_url)
                                          }}
                                        />
                                        <ItemPanel index={yearIndex} title={`Year ${yearIndex + 1}`}>
                                          <div className="grid md:grid-cols-2 gap-4">
                                            <div>
                                              <label className={labelClass}>Year</label>
                                              <input
                                                type="text"
                                                value={yearItem.year || ''}
                                                onChange={(e) => patchYear(secId, yearIndex, { year: e.target.value })}
                                                placeholder="2020"
                                                className={inputClass}
                                              />
                                            </div>
                                            <div>
                                              <label className={labelClass}>Milestone badge</label>
                                              <input
                                                type="text"
                                                value={yearItem.red_text || ''}
                                                onChange={(e) => patchYear(secId, yearIndex, { red_text: e.target.value })}
                                                placeholder="2020 Milestone"
                                                className={inputClass}
                                              />
                                            </div>
                                            <div className="md:col-span-2">
                                              <label className={labelClass}>Grey text</label>
                                              <input
                                                type="text"
                                                value={yearItem.grey_text || ''}
                                                onChange={(e) => patchYear(secId, yearIndex, { grey_text: e.target.value })}
                                                placeholder="Company Founded"
                                                className={`${inputClass} text-gray-500`}
                                              />
                                            </div>
                                            <div className="md:col-span-2">
                                              <label className={labelClass}>Heading</label>
                                              <input
                                                type="text"
                                                value={yearItem.heading || yearItem.title || ''}
                                                onChange={(e) => patchYear(secId, yearIndex, { heading: e.target.value })}
                                                placeholder="Started Business"
                                                className={`${inputClass} font-semibold text-[var(--brand-dark)]`}
                                              />
                                            </div>
                                            <div className="md:col-span-2">
                                              <ImageFieldPicker
                                                label="Year Image"
                                                value={yearImage}
                                                onChange={(v) => patchYear(secId, yearIndex, { image_url: v })}
                                                onUpload={(file) => handleYearImageUpload(secId, yearIndex, file)}
                                                uploading={uploadingState[`year-${secId}-${yearIndex}`]}
                                                localImages={localImages}
                                              />
                                            </div>
                                            <div className="md:col-span-2">
                                              <label className={labelClass}>Text</label>
                                              <textarea
                                                rows={3}
                                                value={yearItem.text || ''}
                                                onChange={(e) => patchYear(secId, yearIndex, { text: e.target.value })}
                                                placeholder="Milestone description..."
                                                className={inputClass}
                                              />
                                            </div>
                                          </div>
                                        </ItemPanel>
                                      </div>
                                    )
                                  })()}
                                </div>
                              ) : isFeaturedServicesSection(sectionTemplateKey(section)) ? (
                                <div className="space-y-8">
                                  <div className="grid md:grid-cols-2 gap-4">
                                    <div className="md:col-span-2">
                                      <label className="block text-xs font-bold text-gray-700 mb-1">Subheading</label>
                                      <input
                                        type="text"
                                        value={values.subheading || ''}
                                        onChange={(e) => handleFieldValueChange(secId, 'subheading', e.target.value)}
                                        placeholder="FEATURED SERVICES"
                                        className="w-full text-sm p-2.5 border rounded-lg focus:ring-2 focus:ring-[var(--brand)] outline-none"
                                      />
                                    </div>
                                    <div className="md:col-span-2">
                                      <label className="block text-xs font-bold text-gray-700 mb-1">Heading</label>
                                      <input
                                        type="text"
                                        value={values.heading || ''}
                                        onChange={(e) => handleFieldValueChange(secId, 'heading', e.target.value)}
                                        placeholder="We help to get Solutions!"
                                        className="w-full text-sm p-2.5 border rounded-lg focus:ring-2 focus:ring-[var(--brand)] outline-none"
                                      />
                                    </div>
                                    <div className="md:col-span-2">
                                      <label className="block text-xs font-bold text-gray-700 mb-1">Text</label>
                                      <textarea
                                        rows={3}
                                        value={values.text || ''}
                                        onChange={(e) => handleFieldValueChange(secId, 'text', e.target.value)}
                                        placeholder="Provide users with appropriate view and access permissions..."
                                        className="w-full text-sm p-2.5 border rounded-lg focus:ring-2 focus:ring-[var(--brand)] outline-none"
                                      />
                                    </div>
                                  </div>

                                  {(() => {
                                    const boxIndex = getItemTab(secId, 'service', 0)
                                    const box = (values.boxes && values.boxes[boxIndex]) || {}
                                    return (
                                      <div className="space-y-4">
                                        <ItemTabBar
                                          hint="Edit one service box at a time."
                                          count={6}
                                          labelPrefix="Box"
                                          activeIndex={boxIndex}
                                          onSelect={(i) => selectItemTab(secId, 'service', i)}
                                          hasContentAt={(i) => {
                                            const b = values.boxes?.[i]
                                            return Boolean(b?.heading || b?.title || b?.text || b?.icon)
                                          }}
                                        />
                                        <ItemPanel index={boxIndex} title={`Box ${boxIndex + 1}`}>
                                          <div className="grid md:grid-cols-2 gap-4">
                                            {isPowerAdminPublishMode && (
                                              <div className="md:col-span-2">
                                                <label className={labelClass}>Icon</label>
                                                <div className="grid grid-cols-6 sm:grid-cols-9 gap-2">
                                                  {SERVICE_ICON_OPTIONS.map((opt) => {
                                                    const selected = (box.icon || '') === opt.value
                                                    const Icon = opt.Icon
                                                    return (
                                                      <button
                                                        key={opt.value}
                                                        type="button"
                                                        title={opt.label}
                                                        onClick={() => patchServiceBox(secId, boxIndex, { icon: opt.value })}
                                                        className={`h-10 rounded-lg border flex items-center justify-center transition ${
                                                          selected
                                                            ? 'border-[var(--brand-dark)] bg-[var(--brand-dark)] text-white'
                                                            : 'border-gray-200 bg-white text-[var(--brand-dark)] hover:border-gray-400'
                                                        }`}
                                                      >
                                                        <Icon size={16} />
                                                      </button>
                                                    )
                                                  })}
                                                </div>
                                              </div>
                                            )}
                                            <div className="md:col-span-2">
                                              <label className={labelClass}>Heading</label>
                                              <input
                                                type="text"
                                                value={box.heading || box.title || ''}
                                                onChange={(e) => patchServiceBox(secId, boxIndex, { heading: e.target.value })}
                                                placeholder="Strategy & Planning"
                                                className={inputClass}
                                              />
                                            </div>
                                            <div className="md:col-span-2">
                                              <label className={labelClass}>Text</label>
                                              <textarea
                                                rows={2}
                                                value={box.text || ''}
                                                onChange={(e) => patchServiceBox(secId, boxIndex, { text: e.target.value })}
                                                placeholder="Box description..."
                                                className={inputClass}
                                              />
                                            </div>
                                            {isPowerAdminPublishMode && (
                                              <>
                                                <div>
                                                  <label className={labelClass}>Button Text</label>
                                                  <input
                                                    type="text"
                                                    value={box.button_text || ''}
                                                    onChange={(e) => patchServiceBox(secId, boxIndex, { button_text: e.target.value })}
                                                    placeholder="Read more"
                                                    className={inputClass}
                                                  />
                                                </div>
                                                <div>
                                                  <label className={labelClass}>Button URL</label>
                                                  <input
                                                    type="text"
                                                    value={box.button_url || box.url || box.link || ''}
                                                    onChange={(e) => patchServiceBox(secId, boxIndex, { button_url: e.target.value })}
                                                    placeholder="#service or https://..."
                                                    className={inputClass}
                                                  />
                                                </div>
                                              </>
                                            )}
                                          </div>
                                        </ItemPanel>
                                      </div>
                                    )
                                  })()}
                                </div>
                              ) : isAnnualProgressionSection(sectionTemplateKey(section)) ? (
                                <div className="space-y-8">
                                  <div className="grid md:grid-cols-2 gap-4">
                                    <div className="md:col-span-2">
                                      <label className="block text-xs font-bold text-gray-700 mb-1">Subheading</label>
                                      <input
                                        type="text"
                                        value={values.subheading || ''}
                                        onChange={(e) => handleFieldValueChange(secId, 'subheading', e.target.value)}
                                        placeholder="ANNUAL PROGRESSION"
                                        className="w-full text-sm p-2.5 border rounded-lg focus:ring-2 focus:ring-[var(--brand)] outline-none"
                                      />
                                    </div>
                                    <div className="md:col-span-2">
                                      <label className="block text-xs font-bold text-gray-700 mb-1">Heading</label>
                                      <input
                                        type="text"
                                        value={values.heading || ''}
                                        onChange={(e) => handleFieldValueChange(secId, 'heading', e.target.value)}
                                        placeholder="Our Business Growth is Really Incredible!"
                                        className="w-full text-sm p-2.5 border rounded-lg focus:ring-2 focus:ring-[var(--brand)] outline-none"
                                      />
                                    </div>
                                    <div className="md:col-span-2">
                                      <label className="block text-xs font-bold text-gray-700 mb-1">Text</label>
                                      <textarea
                                        rows={3}
                                        value={values.text || ''}
                                        onChange={(e) => handleFieldValueChange(secId, 'text', e.target.value)}
                                        placeholder="We love what we do and we do it with passion..."
                                        className="w-full text-sm p-2.5 border rounded-lg focus:ring-2 focus:ring-[var(--brand)] outline-none"
                                      />
                                    </div>
                                  </div>

                                  {(() => {
                                    const barIndex = getItemTab(secId, 'bar', 0)
                                    const bar = (values.bars && values.bars[barIndex]) || {}
                                    return (
                                      <div className="space-y-4">
                                        <ItemTabBar
                                          hint="Edit one progress bar at a time."
                                          count={3}
                                          labelPrefix="Bar"
                                          activeIndex={barIndex}
                                          onSelect={(i) => selectItemTab(secId, 'bar', i)}
                                          hasContentAt={(i) => {
                                            const b = values.bars?.[i]
                                            return Boolean(b?.label || b?.year || b?.pct)
                                          }}
                                        />
                                        <ItemPanel index={barIndex} title={`Progress bar ${barIndex + 1}`}>
                                          <div className="grid md:grid-cols-3 gap-4">
                                            <div className="md:col-span-2">
                                              <label className={labelClass}>Label</label>
                                              <input
                                                type="text"
                                                value={bar.label || ''}
                                                onChange={(e) => patchProgressBar(secId, barIndex, { label: e.target.value })}
                                                placeholder="Business growth"
                                                className={inputClass}
                                              />
                                            </div>
                                            <div>
                                              <label className={labelClass}>Year</label>
                                              <input
                                                type="text"
                                                value={bar.year || ''}
                                                onChange={(e) => patchProgressBar(secId, barIndex, { year: e.target.value })}
                                                placeholder="2018"
                                                className={inputClass}
                                              />
                                            </div>
                                            <div>
                                              <label className={labelClass}>Percent</label>
                                              <input
                                                type="number"
                                                min="0"
                                                max="100"
                                                value={bar.pct ?? ''}
                                                onChange={(e) => patchProgressBar(secId, barIndex, { pct: parseProgressPct(e.target.value, 0) })}
                                                placeholder="70"
                                                className={inputClass}
                                              />
                                            </div>
                                          </div>
                                        </ItemPanel>
                                      </div>
                                    )
                                  })()}

                                  {(() => {
                                    const highlightIndex = getItemTab(secId, 'highlight', 0)
                                    const item = (values.highlights && values.highlights[highlightIndex]) || {}
                                    return (
                                      <div className="space-y-4">
                                        <ItemTabBar
                                          hint="Edit one highlight at a time."
                                          count={2}
                                          labelPrefix="Highlight"
                                          activeIndex={highlightIndex}
                                          onSelect={(i) => selectItemTab(secId, 'highlight', i)}
                                          hasContentAt={(i) => {
                                            const h = values.highlights?.[i]
                                            return Boolean(h?.heading || h?.title || h?.text || h?.icon)
                                          }}
                                        />
                                        <ItemPanel index={highlightIndex} title={`Highlight ${highlightIndex + 1}`}>
                                          <div className="grid md:grid-cols-2 gap-4">
                                            {isPowerAdminPublishMode && (
                                              <div className="md:col-span-2">
                                                <label className={labelClass}>Icon</label>
                                                <div className="grid grid-cols-6 sm:grid-cols-9 gap-2">
                                                  {SERVICE_ICON_OPTIONS.map((opt) => {
                                                    const selected = (item.icon || '') === opt.value
                                                    const Icon = opt.Icon
                                                    return (
                                                      <button
                                                        key={opt.value}
                                                        type="button"
                                                        title={opt.label}
                                                        onClick={() => patchProgressHighlight(secId, highlightIndex, { icon: opt.value })}
                                                        className={`h-10 rounded-lg border flex items-center justify-center transition ${
                                                          selected
                                                            ? 'border-[var(--brand-dark)] bg-[var(--brand-dark)] text-white'
                                                            : 'border-gray-200 bg-white text-[var(--brand-dark)] hover:border-gray-400'
                                                        }`}
                                                      >
                                                        <Icon size={16} />
                                                      </button>
                                                    )
                                                  })}
                                                </div>
                                              </div>
                                            )}
                                            <div className="md:col-span-2">
                                              <label className={labelClass}>Heading</label>
                                              <input
                                                type="text"
                                                value={item.heading || item.title || ''}
                                                onChange={(e) => patchProgressHighlight(secId, highlightIndex, { heading: e.target.value })}
                                                placeholder="Risk Free"
                                                className={inputClass}
                                              />
                                            </div>
                                            <div className="md:col-span-2">
                                              <label className={labelClass}>Text</label>
                                              <textarea
                                                rows={2}
                                                value={item.text || ''}
                                                onChange={(e) => patchProgressHighlight(secId, highlightIndex, { text: e.target.value })}
                                                placeholder="Highlight description..."
                                                className={inputClass}
                                              />
                                            </div>
                                          </div>
                                        </ItemPanel>
                                      </div>
                                    )
                                  })()}
                                </div>
                              ) : isPortfolioSection(sectionTemplateKey(section)) ? (
                                <div className="space-y-8">
                                  <div className="grid md:grid-cols-2 gap-4">
                                    <div className="md:col-span-2">
                                      <label className="block text-xs font-bold text-gray-700 mb-1">Subheading</label>
                                      <input
                                        type="text"
                                        value={values.subheading || ''}
                                        onChange={(e) => handleFieldValueChange(secId, 'subheading', e.target.value)}
                                        placeholder="COMPLETED PROJECTS"
                                        className="w-full text-sm p-2.5 border rounded-lg focus:ring-2 focus:ring-[var(--brand)] outline-none"
                                      />
                                    </div>
                                    <div className="md:col-span-2">
                                      <label className="block text-xs font-bold text-gray-700 mb-1">Heading</label>
                                      <input
                                        type="text"
                                        value={values.heading || ''}
                                        onChange={(e) => handleFieldValueChange(secId, 'heading', e.target.value)}
                                        placeholder="You can check our projects as inspirations."
                                        className="w-full text-sm p-2.5 border rounded-lg focus:ring-2 focus:ring-[var(--brand)] outline-none"
                                      />
                                    </div>
                                  </div>

                                  {(() => {
                                    const itemIndex = getItemTab(secId, 'portfolio', 0)
                                    const item = (values.items && values.items[itemIndex]) || {}
                                    const itemImage = item.image_url || item.img || item.image || ''
                                    return (
                                      <div className="space-y-4">
                                        <ItemTabBar
                                          hint="Edit one project at a time."
                                          count={6}
                                          labelPrefix="Project"
                                          activeIndex={itemIndex}
                                          onSelect={(i) => selectItemTab(secId, 'portfolio', i)}
                                          hasContentAt={(i) => {
                                            const p = values.items?.[i]
                                            return Boolean(p?.heading || p?.title || p?.category || p?.image_url)
                                          }}
                                        />
                                        <ItemPanel index={itemIndex} title={`Project ${itemIndex + 1}`}>
                                          <div className="grid md:grid-cols-2 gap-4">
                                            <div className="md:col-span-2">
                                              <ImageFieldPicker
                                                label="Project Image"
                                                value={itemImage}
                                                onChange={(v) => patchPortfolioItem(secId, itemIndex, { image_url: v })}
                                                onUpload={(file) => handlePortfolioItemImageUpload(secId, itemIndex, file)}
                                                uploading={uploadingState[`portfolio-${secId}-${itemIndex}`]}
                                                localImages={localImages}
                                              />
                                            </div>
                                            <div>
                                              <label className={labelClass}>Category</label>
                                              <input
                                                type="text"
                                                value={item.category || item.cat || ''}
                                                onChange={(e) => patchPortfolioItem(secId, itemIndex, { category: e.target.value })}
                                                placeholder="Business Strategy"
                                                className={inputClass}
                                              />
                                            </div>
                                            <div>
                                              <label className={labelClass}>Heading</label>
                                              <input
                                                type="text"
                                                value={item.heading || item.title || ''}
                                                onChange={(e) => patchPortfolioItem(secId, itemIndex, { heading: e.target.value })}
                                                placeholder="Market Expansion"
                                                className={inputClass}
                                              />
                                            </div>
                                            {isPowerAdminPublishMode && (
                                              <>
                                                <div>
                                                  <label className={labelClass}>Button Text</label>
                                                  <input
                                                    type="text"
                                                    value={item.button_text || ''}
                                                    onChange={(e) => patchPortfolioItem(secId, itemIndex, { button_text: e.target.value })}
                                                    placeholder="Read more"
                                                    className={inputClass}
                                                  />
                                                </div>
                                                <div>
                                                  <label className={labelClass}>Button URL</label>
                                                  <input
                                                    type="text"
                                                    value={item.button_url || item.url || item.link || ''}
                                                    onChange={(e) => patchPortfolioItem(secId, itemIndex, { button_url: e.target.value })}
                                                    placeholder="#portfolio or https://..."
                                                    className={inputClass}
                                                  />
                                                </div>
                                              </>
                                            )}
                                          </div>
                                        </ItemPanel>
                                      </div>
                                    )
                                  })()}
                                </div>
                              ) : isBranchesSection(sectionTemplateKey(section)) ? (
                                <div className="space-y-8">
                                  <div className="grid md:grid-cols-2 gap-4">
                                    <div className="md:col-span-2">
                                      <label className="block text-xs font-bold text-gray-700 mb-1">Subheading</label>
                                      <input
                                        type="text"
                                        value={values.subheading || ''}
                                        onChange={(e) => handleFieldValueChange(secId, 'subheading', e.target.value)}
                                        placeholder="GET IN TOUCH"
                                        className="w-full text-sm p-2.5 border rounded-lg focus:ring-2 focus:ring-[var(--brand)] outline-none"
                                      />
                                    </div>
                                    <div className="md:col-span-2">
                                      <label className="block text-xs font-bold text-gray-700 mb-1">Heading</label>
                                      <input
                                        type="text"
                                        value={values.heading || ''}
                                        onChange={(e) => handleFieldValueChange(secId, 'heading', e.target.value)}
                                        placeholder="We are Connected All Time to Help Your Business!"
                                        className="w-full text-sm p-2.5 border rounded-lg focus:ring-2 focus:ring-[var(--brand)] outline-none"
                                      />
                                    </div>
                                    <div className="md:col-span-2">
                                      <label className="block text-xs font-bold text-gray-700 mb-1">Text</label>
                                      <textarea
                                        rows={3}
                                        value={values.text || ''}
                                        onChange={(e) => handleFieldValueChange(secId, 'text', e.target.value)}
                                        placeholder="We understand the importance of approaching each work integrally..."
                                        className="w-full text-sm p-2.5 border rounded-lg focus:ring-2 focus:ring-[var(--brand)] outline-none"
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-xs font-bold text-gray-700 mb-1">Form heading</label>
                                      <input
                                        type="text"
                                        value={values.form_heading || ''}
                                        onChange={(e) => handleFieldValueChange(secId, 'form_heading', e.target.value)}
                                        placeholder="Book an appionment"
                                        className="w-full text-sm p-2.5 border rounded-lg focus:ring-2 focus:ring-[var(--brand)] outline-none"
                                      />
                                    </div>
                                    {isPowerAdminPublishMode && (
                                      <div>
                                        <label className="block text-xs font-bold text-gray-700 mb-1">Button Text</label>
                                        <input
                                          type="text"
                                          value={values.button_text || ''}
                                          onChange={(e) => handleFieldValueChange(secId, 'button_text', e.target.value)}
                                          placeholder="SEND YOUR MESSAGE"
                                          className="w-full text-sm p-2.5 border rounded-lg focus:ring-2 focus:ring-[var(--brand)] outline-none"
                                        />
                                      </div>
                                    )}
                                    <div>
                                      <label className="block text-xs font-bold text-gray-700 mb-1">Branches label</label>
                                      <input
                                        type="text"
                                        value={values.branches_label || ''}
                                        onChange={(e) => handleFieldValueChange(secId, 'branches_label', e.target.value)}
                                        placeholder="Main Branches:"
                                        className="w-full text-sm p-2.5 border rounded-lg focus:ring-2 focus:ring-[var(--brand)] outline-none"
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-xs font-bold text-gray-700 mb-1">Stat value</label>
                                      <input
                                        type="text"
                                        value={values.stat_value || ''}
                                        onChange={(e) => handleFieldValueChange(secId, 'stat_value', e.target.value)}
                                        placeholder="12+"
                                        className="w-full text-sm p-2.5 border rounded-lg focus:ring-2 focus:ring-[var(--brand)] outline-none"
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-xs font-bold text-gray-700 mb-1">Stat label</label>
                                      <input
                                        type="text"
                                        value={values.stat_label || ''}
                                        onChange={(e) => handleFieldValueChange(secId, 'stat_label', e.target.value)}
                                        placeholder="Branches"
                                        className="w-full text-sm p-2.5 border rounded-lg focus:ring-2 focus:ring-[var(--brand)] outline-none"
                                      />
                                    </div>
                                    <div className="md:col-span-2">
                                      <ImageFieldPicker
                                        label="Map Image"
                                        value={values.map_image || ''}
                                        onChange={(v) => handleFieldValueChange(secId, 'map_image', v)}
                                        onUpload={(file) => handleBranchesMapUpload(secId, file)}
                                        uploading={uploadingState[`branches-map-${secId}`]}
                                        localImages={localImages}
                                        pathPlaceholder="maps-point or /uploaded-images/image.jpg"
                                      />
                                    </div>
                                  </div>

                                  {(() => {
                                    const itemIndex = getItemTab(secId, 'branch', 0)
                                    const item = (values.items && values.items[itemIndex]) || {}
                                    return (
                                      <div className="space-y-4">
                                        <ItemTabBar
                                          hint="Edit one branch at a time."
                                          count={4}
                                          labelPrefix="Branch"
                                          activeIndex={itemIndex}
                                          onSelect={(i) => selectItemTab(secId, 'branch', i)}
                                          hasContentAt={(i) => {
                                            const b = values.items?.[i]
                                            return Boolean(b?.name || b?.heading || b?.address || b?.phone || b?.email)
                                          }}
                                        />
                                        <ItemPanel index={itemIndex} title={`Branch ${itemIndex + 1}`}>
                                          <div className="grid md:grid-cols-2 gap-4">
                                            <div className="md:col-span-2">
                                              <label className={labelClass}>Name</label>
                                              <input
                                                type="text"
                                                value={item.name || item.heading || ''}
                                                onChange={(e) => patchBranch(secId, itemIndex, { name: e.target.value })}
                                                placeholder="Sydney (Head Office)"
                                                className={inputClass}
                                              />
                                            </div>
                                            <div className="md:col-span-2">
                                              <label className={labelClass}>Address</label>
                                              <textarea
                                                rows={2}
                                                value={item.address || ''}
                                                onChange={(e) => patchBranch(secId, itemIndex, { address: e.target.value })}
                                                placeholder="1 Epping Road, North Ryde, NSW 2113"
                                                className={inputClass}
                                              />
                                            </div>
                                            <div>
                                              <label className={labelClass}>Phone</label>
                                              <input
                                                type="text"
                                                value={item.phone || ''}
                                                onChange={(e) => patchBranch(secId, itemIndex, { phone: e.target.value })}
                                                placeholder="+61 2 9870 7689"
                                                className={inputClass}
                                              />
                                            </div>
                                            <div>
                                              <label className={labelClass}>Email</label>
                                              <input
                                                type="text"
                                                value={item.email || ''}
                                                onChange={(e) => patchBranch(secId, itemIndex, { email: e.target.value })}
                                                placeholder="email@example.com"
                                                className={inputClass}
                                              />
                                            </div>
                                          </div>
                                        </ItemPanel>
                                      </div>
                                    )
                                  })()}
                                </div>
                              ) : isCounterStatsSection(sectionTemplateKey(section)) ? (
                                (() => {
                                  const statIndex = getItemTab(secId, 'stat', 0)
                                  const stat = (values.stats && values.stats[statIndex]) || {}
                                  return (
                                    <div className="space-y-4">
                                      <ItemTabBar
                                        hint="Edit one stat at a time."
                                        count={4}
                                        labelPrefix="Stat"
                                        activeIndex={statIndex}
                                        onSelect={(i) => selectItemTab(secId, 'stat', i)}
                                        hasContentAt={(i) => {
                                          const s = values.stats?.[i]
                                          return Boolean(s?.value || s?.number || s?.label || s?.title || s?.icon)
                                        }}
                                      />
                                      <ItemPanel index={statIndex} title={`Stat ${statIndex + 1}`}>
                                        <div className="grid md:grid-cols-2 gap-4">
                                          {isPowerAdminPublishMode && (
                                            <div className="md:col-span-2">
                                              <label className={labelClass}>Icon</label>
                                              <div className="grid grid-cols-6 sm:grid-cols-9 gap-2">
                                                {STAT_ICON_OPTIONS.map((opt) => {
                                                  const selected = (stat.icon || '') === opt.value
                                                  const Icon = opt.Icon
                                                  return (
                                                    <button
                                                      key={opt.value}
                                                      type="button"
                                                      title={opt.label}
                                                      onClick={() => patchCounterStat(secId, statIndex, { icon: opt.value })}
                                                      className={`h-10 rounded-lg border flex items-center justify-center transition ${
                                                        selected
                                                          ? 'border-[var(--brand-dark)] bg-[var(--brand-dark)] text-white'
                                                          : 'border-gray-200 bg-white text-[var(--brand-dark)] hover:border-gray-400'
                                                      }`}
                                                    >
                                                      <Icon size={16} />
                                                    </button>
                                                  )
                                                })}
                                              </div>
                                            </div>
                                          )}
                                          <div>
                                            <label className={labelClass}>Value</label>
                                            <input
                                              type="text"
                                              value={stat.value || stat.number || ''}
                                              onChange={(e) => patchCounterStat(secId, statIndex, { value: e.target.value })}
                                              placeholder="2,800+"
                                              className={inputClass}
                                            />
                                          </div>
                                          <div>
                                            <label className={labelClass}>Label</label>
                                            <input
                                              type="text"
                                              value={stat.label || stat.title || ''}
                                              onChange={(e) => patchCounterStat(secId, statIndex, { label: e.target.value })}
                                              placeholder="Active Clients"
                                              className={inputClass}
                                            />
                                          </div>
                                          <div className="md:col-span-2">
                                            <label className={labelClass}>Description</label>
                                            <textarea
                                              rows={2}
                                              value={stat.sub || stat.desc || ''}
                                              onChange={(e) => patchCounterStat(secId, statIndex, { sub: e.target.value })}
                                              placeholder="Empowering businesses globally with passion and proven expertise."
                                              className={inputClass}
                                            />
                                          </div>
                                        </div>
                                      </ItemPanel>
                                    </div>
                                  )
                                })()
                              ) : isTestimonialsSection(sectionTemplateKey(section)) ? (
                                <div className="space-y-8">
                                  <div className="grid md:grid-cols-2 gap-4">
                                    <div className="md:col-span-2">
                                      <label className="block text-xs font-bold text-gray-700 mb-1">Eyebrow</label>
                                      <input
                                        type="text"
                                        value={values.eyebrow || ''}
                                        onChange={(e) => handleFieldValueChange(secId, 'eyebrow', e.target.value)}
                                        placeholder="CLIENT'S TESTIMONIALS"
                                        className="w-full text-sm p-2.5 border rounded-lg focus:ring-2 focus:ring-[var(--brand)] outline-none"
                                      />
                                    </div>
                                    <div className="md:col-span-2">
                                      <label className="block text-xs font-bold text-gray-700 mb-1">Heading</label>
                                      <input
                                        type="text"
                                        value={values.heading || ''}
                                        onChange={(e) => handleFieldValueChange(secId, 'heading', e.target.value)}
                                        placeholder="We are Very Happy to Get Our Client's Reviews."
                                        className="w-full text-sm p-2.5 border rounded-lg focus:ring-2 focus:ring-[var(--brand)] outline-none"
                                      />
                                    </div>
                                    <div className="md:col-span-2">
                                      <label className="block text-xs font-bold text-gray-700 mb-1">Reviews label</label>
                                      <input
                                        type="text"
                                        value={values.subheading || ''}
                                        onChange={(e) => handleFieldValueChange(secId, 'subheading', e.target.value)}
                                        placeholder="Clients Reviews:"
                                        className="w-full text-sm p-2.5 border rounded-lg focus:ring-2 focus:ring-[var(--brand)] outline-none"
                                      />
                                    </div>
                                    <div className="md:col-span-2">
                                      <ImageFieldPicker
                                        label="Side Image (right column)"
                                        value={values.image_url || ''}
                                        onChange={(v) => handleFieldValueChange(secId, 'image_url', v)}
                                        onUpload={(file) => handleTestimonialsSideImageUpload(secId, file)}
                                        uploading={uploadingState[`testimonials-side-${secId}`]}
                                        localImages={localImages}
                                      />
                                    </div>
                                  </div>

                                  {(() => {
                                    const itemIndex = getItemTab(secId, 'testimonial', 0)
                                    const item = (values.items && values.items[itemIndex]) || {}
                                    return (
                                      <div className="space-y-4">
                                        <ItemTabBar
                                          hint="Edit one testimonial at a time."
                                          count={3}
                                          labelPrefix="Review"
                                          activeIndex={itemIndex}
                                          onSelect={(i) => selectItemTab(secId, 'testimonial', i)}
                                          hasContentAt={(i) => {
                                            const t = values.items?.[i]
                                            return Boolean(t?.quote || t?.text || t?.name || t?.title)
                                          }}
                                        />
                                        <ItemPanel index={itemIndex} title={`Testimonial ${itemIndex + 1}`}>
                                          <div className="grid md:grid-cols-2 gap-4">
                                            <div className="md:col-span-2">
                                              <label className={labelClass}>Quote</label>
                                              <textarea
                                                rows={3}
                                                value={item.quote || item.text || ''}
                                                onChange={(e) => patchTestimonialItem(secId, itemIndex, { quote: e.target.value })}
                                                placeholder="Working with several word press themes..."
                                                className={inputClass}
                                              />
                                            </div>
                                            <div>
                                              <label className={labelClass}>Name</label>
                                              <input
                                                type="text"
                                                value={item.name || item.title || ''}
                                                onChange={(e) => patchTestimonialItem(secId, itemIndex, { name: e.target.value })}
                                                placeholder="Alina Lora"
                                                className={inputClass}
                                              />
                                            </div>
                                            <div>
                                              <label className={labelClass}>Role</label>
                                              <input
                                                type="text"
                                                value={item.role || item.position || ''}
                                                onChange={(e) => patchTestimonialItem(secId, itemIndex, { role: e.target.value })}
                                                placeholder="Former Manager, Intime"
                                                className={inputClass}
                                              />
                                            </div>
                                            <div className="md:col-span-2">
                                              <ImageFieldPicker
                                                label="Avatar Image"
                                                value={item.image_url || ''}
                                                onChange={(v) => patchTestimonialItem(secId, itemIndex, { image_url: v })}
                                                onUpload={(file) => handleTestimonialItemImageUpload(secId, itemIndex, file)}
                                                uploading={uploadingState[`testimonial-${secId}-${itemIndex}`]}
                                                localImages={localImages}
                                                pathPlaceholder="testimonial-01 or /uploaded-images/image.jpg"
                                              />
                                            </div>
                                          </div>
                                        </ItemPanel>
                                      </div>
                                    )
                                  })()}
                                </div>
                              ) : isLatestNewsSection(sectionTemplateKey(section)) ? (
                                <div className="space-y-8">
                                  <div className="grid md:grid-cols-2 gap-4">
                                    <div className="md:col-span-2">
                                      <label className="block text-xs font-bold text-gray-700 mb-1">Eyebrow</label>
                                      <input
                                        type="text"
                                        value={values.eyebrow || ''}
                                        onChange={(e) => handleFieldValueChange(secId, 'eyebrow', e.target.value)}
                                        placeholder="OUR LATEST NEWS"
                                        className="w-full text-sm p-2.5 border rounded-lg focus:ring-2 focus:ring-[var(--brand)] outline-none"
                                      />
                                    </div>
                                    <div className="md:col-span-2">
                                      <label className="block text-xs font-bold text-gray-700 mb-1">Heading</label>
                                      <input
                                        type="text"
                                        value={values.heading || ''}
                                        onChange={(e) => handleFieldValueChange(secId, 'heading', e.target.value)}
                                        placeholder="Learn about our latest news from blog."
                                        className="w-full text-sm p-2.5 border rounded-lg focus:ring-2 focus:ring-[var(--brand)] outline-none"
                                      />
                                    </div>
                                  </div>

                                  {(() => {
                                    const itemIndex = getItemTab(secId, 'news', 0)
                                    const item = (values.items && values.items[itemIndex]) || {}
                                    return (
                                      <div className="space-y-4">
                                        <ItemTabBar
                                          hint="Edit one news post at a time."
                                          count={3}
                                          labelPrefix="Post"
                                          activeIndex={itemIndex}
                                          onSelect={(i) => selectItemTab(secId, 'news', i)}
                                          hasContentAt={(i) => {
                                            const n = values.items?.[i]
                                            return Boolean(n?.title || n?.heading || n?.excerpt || n?.text)
                                          }}
                                        />
                                        <ItemPanel index={itemIndex} title={`News Post ${itemIndex + 1}`}>
                                          <div className="grid md:grid-cols-2 gap-4">
                                            <div>
                                              <label className={labelClass}>Date (day)</label>
                                              <input
                                                type="text"
                                                value={item.date || item.day || ''}
                                                onChange={(e) => patchNewsItem(secId, itemIndex, { date: e.target.value })}
                                                placeholder="10"
                                                className={inputClass}
                                              />
                                            </div>
                                            <div>
                                              <label className={labelClass}>Month label</label>
                                              <input
                                                type="text"
                                                value={item.month || ''}
                                                onChange={(e) => patchNewsItem(secId, itemIndex, { month: e.target.value })}
                                                placeholder="Nov, 20"
                                                className={inputClass}
                                              />
                                            </div>
                                            <div>
                                              <label className={labelClass}>Author</label>
                                              <input
                                                type="text"
                                                value={item.author || ''}
                                                onChange={(e) => patchNewsItem(secId, itemIndex, { author: e.target.value })}
                                                placeholder="John Doe"
                                                className={inputClass}
                                              />
                                            </div>
                                            <div>
                                              <label className={labelClass}>Category</label>
                                              <input
                                                type="text"
                                                value={item.cat || item.category || ''}
                                                onChange={(e) => patchNewsItem(secId, itemIndex, { cat: e.target.value })}
                                                placeholder="Consulting"
                                                className={inputClass}
                                              />
                                            </div>
                                            <div className="md:col-span-2">
                                              <label className={labelClass}>Title</label>
                                              <input
                                                type="text"
                                                value={item.title || item.heading || ''}
                                                onChange={(e) => patchNewsItem(secId, itemIndex, { title: e.target.value })}
                                                placeholder="We would love to share a similar experience"
                                                className={inputClass}
                                              />
                                            </div>
                                            <div className="md:col-span-2">
                                              <label className={labelClass}>Excerpt</label>
                                              <textarea
                                                rows={3}
                                                value={item.excerpt || item.text || ''}
                                                onChange={(e) => patchNewsItem(secId, itemIndex, { excerpt: e.target.value })}
                                                placeholder="The theory was first published in 2008..."
                                                className={inputClass}
                                              />
                                            </div>
                                            <div className="md:col-span-2">
                                              <ImageFieldPicker
                                                label="Featured Image"
                                                value={item.image_url || ''}
                                                onChange={(v) => patchNewsItem(secId, itemIndex, { image_url: v })}
                                                onUpload={(file) => handleLatestNewsItemImageUpload(secId, itemIndex, file)}
                                                uploading={uploadingState[`latestnews-${secId}-${itemIndex}`]}
                                                localImages={localImages}
                                              />
                                            </div>
                                            {isPowerAdminPublishMode && (
                                              <>
                                                <div>
                                                  <label className={labelClass}>Button Text</label>
                                                  <input
                                                    type="text"
                                                    value={item.button_text || ''}
                                                    onChange={(e) => patchNewsItem(secId, itemIndex, { button_text: e.target.value })}
                                                    placeholder="Read more"
                                                    className={inputClass}
                                                  />
                                                </div>
                                                <div>
                                                  <label className={labelClass}>Button URL</label>
                                                  <input
                                                    type="text"
                                                    value={item.button_url || item.url || item.link || ''}
                                                    onChange={(e) => patchNewsItem(secId, itemIndex, { button_url: e.target.value })}
                                                    placeholder="#news or https://..."
                                                    className={inputClass}
                                                  />
                                                </div>
                                              </>
                                            )}
                                          </div>
                                        </ItemPanel>
                                      </div>
                                    )
                                  })()}
                                </div>
                              ) : isClientLogosSection(sectionTemplateKey(section)) ? (
                                (() => {
                                  const itemIndex = getItemTab(secId, 'logo', 0)
                                  const item = (values.items && values.items[itemIndex]) || {}
                                  return (
                                    <div className="space-y-4">
                                      <ItemTabBar
                                        hint="Edit one client logo at a time."
                                        count={5}
                                        labelPrefix="Logo"
                                        activeIndex={itemIndex}
                                        onSelect={(i) => selectItemTab(secId, 'logo', i)}
                                        hasContentAt={(i) => {
                                          const l = values.items?.[i]
                                          return Boolean(l?.name || l?.label || l?.image_url)
                                        }}
                                      />
                                      <ItemPanel index={itemIndex} title={`Logo ${itemIndex + 1}`}>
                                        <div className="grid md:grid-cols-2 gap-4">
                                          <div className="md:col-span-2">
                                            <label className={labelClass}>Text label (shown when no image)</label>
                                            <input
                                              type="text"
                                              value={item.name || item.label || ''}
                                              onChange={(e) => patchClientLogo(secId, itemIndex, { name: e.target.value })}
                                              placeholder="Google"
                                              className={inputClass}
                                            />
                                          </div>
                                          <div className="md:col-span-2">
                                            <ImageFieldPicker
                                              label="Logo Image (optional)"
                                              value={item.image_url || ''}
                                              onChange={(v) => patchClientLogo(secId, itemIndex, { image_url: v })}
                                              onUpload={(file) => handleClientLogoImageUpload(secId, itemIndex, file)}
                                              uploading={uploadingState[`clientlogo-${secId}-${itemIndex}`]}
                                              localImages={localImages}
                                              pathPlaceholder="logo-dark or /uploaded-images/image.jpg"
                                            />
                                          </div>
                                        </div>
                                      </ItemPanel>
                                    </div>
                                  )
                                })()
                              ) : isCtaBannerSection(sectionTemplateKey(section)) ? (
                                <div className="space-y-8">
                                  <div className="grid md:grid-cols-2 gap-4">
                                    <div className="md:col-span-2">
                                      <label className="block text-xs font-bold text-gray-700 mb-1">Heading</label>
                                      <input
                                        type="text"
                                        value={values.heading || ''}
                                        onChange={(e) => handleFieldValueChange(secId, 'heading', e.target.value)}
                                        placeholder="Looking for the Best Business Consulting?"
                                        className="w-full text-sm p-2.5 border rounded-lg focus:ring-2 focus:ring-[var(--brand)] outline-none font-semibold text-[var(--brand-dark)]"
                                      />
                                    </div>
                                    <div className="md:col-span-2">
                                      <label className="block text-xs font-bold text-gray-700 mb-1">Subheading</label>
                                      <textarea
                                        rows={2}
                                        value={values.subheading || ''}
                                        onChange={(e) => handleFieldValueChange(secId, 'subheading', e.target.value)}
                                        placeholder="As a web crawler expert, we will help to organize."
                                        className="w-full text-sm p-2.5 border rounded-lg focus:ring-2 focus:ring-[var(--brand)] outline-none"
                                      />
                                    </div>
                                    {isPowerAdminPublishMode && (
                                      <>
                                        <div>
                                          <label className="block text-xs font-bold text-gray-700 mb-1">Button Text</label>
                                          <input
                                            type="text"
                                            value={values.button_text || ''}
                                            onChange={(e) => handleFieldValueChange(secId, 'button_text', e.target.value)}
                                            placeholder="GET A QUOTE"
                                            className="w-full text-sm p-2.5 border rounded-lg focus:ring-2 focus:ring-[var(--brand)] outline-none"
                                          />
                                        </div>
                                        <div>
                                          <label className="block text-xs font-bold text-gray-700 mb-1">Button URL</label>
                                          <input
                                            type="text"
                                            value={values.button_url || values.url || values.link || ''}
                                            onChange={(e) => handleFieldValueChange(secId, 'button_url', e.target.value)}
                                            placeholder="#appointment or https://..."
                                            className="w-full text-sm p-2.5 border rounded-lg focus:ring-2 focus:ring-[var(--brand)] outline-none"
                                          />
                                        </div>
                                      </>
                                    )}
                                  </div>
                                </div>
                              ) : (
                                // Standard Section Editor
                                <div className="grid md:grid-cols-2 gap-4">
                                  <div className="md:col-span-2">
                                    <label className="block text-xs font-bold text-gray-700 mb-1">Eyebrow / Tagline</label>
                                    <input
                                      type="text"
                                      value={values.eyebrow || ''}
                                      onChange={(e) => handleFieldValueChange(secId, 'eyebrow', e.target.value)}
                                      placeholder="e.g. ABOUT US"
                                      className="w-full text-sm p-2.5 border rounded-lg focus:ring-2 focus:ring-[var(--brand)] outline-none"
                                    />
                                  </div>
                                  <div className="md:col-span-2">
                                    <label className="block text-xs font-bold text-gray-700 mb-1">Heading / Title</label>
                                    <input
                                      type="text"
                                      value={values.heading || ''}
                                      onChange={(e) => handleFieldValueChange(secId, 'heading', e.target.value)}
                                      placeholder="e.g. Section Title"
                                      className="w-full text-sm p-2.5 border rounded-lg focus:ring-2 focus:ring-[var(--brand)] outline-none font-semibold text-[var(--brand-dark)]"
                                    />
                                  </div>
                                  <div className="md:col-span-2">
                                    <label className="block text-xs font-bold text-gray-700 mb-1">Subheading</label>
                                    <textarea
                                      rows={2}
                                      value={values.subheading || ''}
                                      onChange={(e) => handleFieldValueChange(secId, 'subheading', e.target.value)}
                                      placeholder="Summary or tagline..."
                                      className="w-full text-sm p-2.5 border rounded-lg focus:ring-2 focus:ring-[var(--brand)] outline-none"
                                    />
                                  </div>
                                  <div className="md:col-span-2">
                                    <label className="block text-xs font-bold text-gray-700 mb-1">Body Text</label>
                                    <textarea
                                      rows={3}
                                      value={values.text || ''}
                                      onChange={(e) => handleFieldValueChange(secId, 'text', e.target.value)}
                                      placeholder="Full section text..."
                                      className="w-full text-sm p-2.5 border rounded-lg focus:ring-2 focus:ring-[var(--brand)] outline-none"
                                    />
                                  </div>
                                  {isPowerAdminPublishMode && (
                                    <>
                                      <div>
                                        <label className="block text-xs font-bold text-gray-700 mb-1">Button Text</label>
                                        <input
                                          type="text"
                                          value={values.button_text || ''}
                                          onChange={(e) => handleFieldValueChange(secId, 'button_text', e.target.value)}
                                          placeholder="Learn more"
                                          className="w-full text-sm p-2.5 border rounded-lg focus:ring-2 focus:ring-[var(--brand)] outline-none"
                                        />
                                      </div>
                                      <div>
                                        <label className="block text-xs font-bold text-gray-700 mb-1">Button URL</label>
                                        <input
                                          type="text"
                                          value={values.button_url || values.url || values.link || ''}
                                          onChange={(e) => handleFieldValueChange(secId, 'button_url', e.target.value)}
                                          placeholder="#section or https://..."
                                          className="w-full text-sm p-2.5 border rounded-lg focus:ring-2 focus:ring-[var(--brand)] outline-none"
                                        />
                                      </div>
                                    </>
                                  )}
                                  <div className="md:col-span-2">
                                    <ImageFieldPicker
                                      label="Section Image"
                                      value={values.image_url || ''}
                                      onChange={(v) => handleFieldValueChange(secId, 'image_url', v)}
                                      onUpload={(file) => handleSectionImageUpload(secId, file)}
                                      uploading={uploadingState[`section-${secId}`]}
                                      localImages={localImages}
                                    />
                                  </div>
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="p-4 bg-gradient-to-b from-slate-50 to-slate-100/50 space-y-3">
                              <div className="bg-white px-5 py-3 rounded-xl border border-gray-200/80 shadow-sm flex items-center justify-between">
                                <span className="text-xs font-extrabold text-[var(--brand-dark)] flex items-center gap-2">
                                  <FaEye className="w-3.5 h-3.5 text-[var(--brand)]" />
                                  Live Preview — reflects your edits
                                </span>
                                <span className="text-[11px] text-gray-400 font-mono bg-gray-50 px-2 py-0.5 rounded">
                                  {sectionDisplayName(section)}
                                </span>
                              </div>

                              {/* Real template4 component rendered inside an iframe via postMessage */}
                              <SectionIframePreview
                                sectionName={sectionTemplateKey(section)}
                                templateSlug={activeDeployment?.template_name || 'template4'}
                                siteUrl={activeDeployment?.cpanel_domain || activeDeployment?.domain_name || null}
                                cpanelDomain={activeDeployment?.cpanel_domain || null}
                                branding={{
                                  primary_color: activeDeployment?.primary_color || null,
                                  secondary_color: activeDeployment?.secondary_color || null,
                                  logo_url: activeDeployment?.logo_url || null,
                                  favicon_url: activeDeployment?.favicon_url || null,
                                  site_url: activeDeployment?.cpanel_domain || null,
                                  template_name: activeDeployment?.template_name || null,
                                }}
                                data={{
                                  ...(isAboutSection(sectionTemplateKey(section))
                                    ? aboutPreviewPayload(values)
                                    : isCompanyHistorySection(sectionTemplateKey(section))
                                      ? companyHistoryPreviewPayload(values)
                                      : isFeaturedServicesSection(sectionTemplateKey(section))
                                        ? normalizeFeaturedServicesEditorContent(values)
                                        : isAnnualProgressionSection(sectionTemplateKey(section))
                                          ? normalizeAnnualProgressionEditorContent(values)
                                          : isPortfolioSection(sectionTemplateKey(section))
                                            ? portfolioPreviewPayload(values)
                                            : isBranchesSection(sectionTemplateKey(section))
                                              ? branchesPreviewPayload(values)
                                              : isCounterStatsSection(sectionTemplateKey(section))
                                                ? normalizeCounterStatsEditorContent(values)
                                                : isTestimonialsSection(sectionTemplateKey(section))
                                                  ? testimonialsPreviewPayload(values)
                                                  : isLatestNewsSection(sectionTemplateKey(section))
                                                    ? latestNewsPreviewPayload(values)
                                                    : isClientLogosSection(sectionTemplateKey(section))
                                                      ? clientLogosPreviewPayload(values)
                                                      : isCtaBannerSection(sectionTemplateKey(section))
                                                        ? normalizeCtaBannerEditorContent(values)
                                                        : values),
                                  preview_slide: previewSlide[secId] ?? 0,
                                }}
                                height={isWhatWeDoSection(sectionTemplateKey(section)) || isAboutSection(sectionTemplateKey(section)) || isCompanyHistorySection(sectionTemplateKey(section)) || isFeaturedServicesSection(sectionTemplateKey(section)) || isAnnualProgressionSection(sectionTemplateKey(section)) || isPortfolioSection(sectionTemplateKey(section)) || isBranchesSection(sectionTemplateKey(section)) || isCounterStatsSection(sectionTemplateKey(section)) || isTestimonialsSection(sectionTemplateKey(section)) || isLatestNewsSection(sectionTemplateKey(section)) || isClientLogosSection(sectionTemplateKey(section)) || isCtaBannerSection(sectionTemplateKey(section)) ? 720 : 520}
                                borderColor="border-[var(--brand)]"
                              />
                            </div>
                          )
                          )}
                        </div>
                      )
                    })}

                    <div className="pt-2 flex justify-end">
                      <button
                        type="button"
                        onClick={handleBatchSubmit}
                        disabled={isSubmitting}
                        className="inline-flex items-center gap-2 bg-[var(--brand)] text-white text-base font-extrabold px-8 py-3.5 rounded-xl hover:bg-[color-mix(in_srgb,var(--brand)_85%,black)] shadow-lg shadow-[color-mix(in_srgb,var(--brand-dark)_25%,transparent)] transition disabled:opacity-50"
                      >
                        <FaPaperPlane className="w-4 h-4" />
                        {isSubmitting
                          ? (isPowerAdminPublishMode ? 'Publishing...' : 'Submitting...')
                          : (isPowerAdminPublishMode ? 'Publish to Live' : 'Submit All Section Edits')}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="bg-white rounded-2xl shadow-sm border border-gray-200/80 p-12 text-center">
                    <div className="w-16 h-16 rounded-2xl bg-indigo-50 text-indigo-400 flex items-center justify-center mx-auto mb-4">
                      <FaUnlock className="w-7 h-7" />
                    </div>
                    <h3 className="text-lg font-bold text-[var(--brand-dark)]">No Sections Selected</h3>
                    <p className="text-sm text-gray-500 mt-2 max-w-md mx-auto">
                      {isPowerAdminPublishMode
                        ? 'Select one or more sections above to start editing content.'
                        : 'Select one or more sections above to lock them and start editing content.'}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        )
        )}
      </div>

      {/* Template Deployment Request Modal */}
      {showTemplateModal && (
        <ModalShell
          title="Request New Deployment"
          subtitle="Submit another showcase site — each request can use a different domain and template"
          onClose={() => setShowTemplateModal(false)}
          maxWidth="max-w-xl"
        >
            <form onSubmit={handleTemplateSubmit} className="space-y-4">
              <div>
                <label className={labelClass}>Showcase Template</label>
                <select
                  value={selectedTemplateName}
                  onChange={e => setSelectedTemplateName(e.target.value)}
                  className={inputClass}
                >
                  {availableTemplates.map(tpl => (
                    <option key={tpl.id} value={tpl.slug}>
                      {tpl.name} ({tpl.slug})
                    </option>
                  ))}
                  {availableTemplates.length === 0 && (
                    <option value="template4">Template 4 - Corporate Financial Advisory (template4)</option>
                  )}
                </select>
              </div>

              <div>
                <label className={labelClass}>Target Domain Name *</label>
                <input
                  type="text"
                  required
                  placeholder={`e.g. ${domainPlaceholder}`}
                  value={domainName}
                  onChange={e => setDomainName(e.target.value)}
                  className={inputClass}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Site Logo <span className="text-gray-400 font-normal">(optional)</span></label>
                  <div className="flex items-start gap-3">
                    <div className="w-14 h-14 rounded-xl border border-gray-200 bg-gray-50 flex items-center justify-center overflow-hidden shrink-0">
                      {(logoPreview || logoUrl) ? (
                        <img
                          src={logoPreview || absoluteAssetUrl(logoUrl)}
                          alt=""
                          className="w-full h-full object-contain p-1"
                        />
                      ) : (
                        <FaImage className="w-5 h-5 text-gray-300" aria-hidden="true" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1 space-y-2">
                      <label className="inline-flex items-center gap-2 px-3 py-2 text-xs font-bold bg-white border border-gray-200 rounded-xl hover:bg-gray-50 cursor-pointer transition">
                        <FaUpload className="w-3 h-3 text-[var(--brand)]" />
                        {uploadingLogo ? 'Uploading…' : 'Upload logo'}
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/jpg,image/gif,image/webp,image/svg+xml"
                          className="hidden"
                          disabled={uploadingLogo}
                          onChange={(e) => {
                            const file = e.target.files?.[0]
                            if (file) uploadBrandingAsset(file, 'logo')
                            e.target.value = ''
                          }}
                        />
                      </label>
                      {logoUrl && (
                        <button
                          type="button"
                          onClick={() => { setLogoUrl(''); setLogoPreview('') }}
                          className="block text-[11px] font-semibold text-rose-600 hover:underline"
                        >
                          Remove
                        </button>
                      )}
                      <p className="text-[11px] text-gray-500">Used in the live site header/footer after cPanel deploy.</p>
                    </div>
                  </div>
                </div>

                <div>
                  <label className={labelClass}>Favicon <span className="text-gray-400 font-normal">(optional)</span></label>
                  <div className="flex items-start gap-3">
                    <div className="w-14 h-14 rounded-xl border border-gray-200 bg-gray-50 flex items-center justify-center overflow-hidden shrink-0">
                      {(faviconPreview || faviconUrl) ? (
                        <img
                          src={faviconPreview || absoluteAssetUrl(faviconUrl)}
                          alt=""
                          className="w-full h-full object-contain p-1"
                        />
                      ) : (
                        <FaImage className="w-5 h-5 text-gray-300" aria-hidden="true" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1 space-y-2">
                      <label className="inline-flex items-center gap-2 px-3 py-2 text-xs font-bold bg-white border border-gray-200 rounded-xl hover:bg-gray-50 cursor-pointer transition">
                        <FaUpload className="w-3 h-3 text-[var(--brand)]" />
                        {uploadingFavicon ? 'Uploading…' : 'Upload favicon'}
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/jpg,image/gif,image/webp,image/svg+xml,image/x-icon,.ico"
                          className="hidden"
                          disabled={uploadingFavicon}
                          onChange={(e) => {
                            const file = e.target.files?.[0]
                            if (file) uploadBrandingAsset(file, 'favicon')
                            e.target.value = ''
                          }}
                        />
                      </label>
                      {faviconUrl && (
                        <button
                          type="button"
                          onClick={() => { setFaviconUrl(''); setFaviconPreview('') }}
                          className="block text-[11px] font-semibold text-rose-600 hover:underline"
                        >
                          Remove
                        </button>
                      )}
                      <p className="text-[11px] text-gray-500">Browser tab icon on the advisor&apos;s live site.</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Primary Color</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={primaryColor}
                      onChange={e => setPrimaryColor(e.target.value)}
                      className="w-11 h-11 p-0 border border-gray-200 rounded-xl cursor-pointer shrink-0"
                    />
                    <input
                      type="text"
                      value={primaryColor}
                      onChange={e => setPrimaryColor(e.target.value)}
                      className="min-w-0 flex-1 w-auto text-xs p-2.5 border border-gray-200 rounded-xl font-mono focus:ring-2 focus:ring-[color-mix(in_srgb,var(--brand)_30%,transparent)] outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className={labelClass}>Secondary Color</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={secondaryColor}
                      onChange={e => setSecondaryColor(e.target.value)}
                      className="w-11 h-11 p-0 border border-gray-200 rounded-xl cursor-pointer shrink-0"
                    />
                    <input
                      type="text"
                      value={secondaryColor}
                      onChange={e => setSecondaryColor(e.target.value)}
                      className="min-w-0 flex-1 w-auto text-xs p-2.5 border border-gray-200 rounded-xl font-mono focus:ring-2 focus:ring-[color-mix(in_srgb,var(--brand)_30%,transparent)] outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowTemplateModal(false)}
                  className="px-4 py-2.5 text-sm font-bold text-gray-600 hover:bg-gray-100 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingTemplate || uploadingLogo || uploadingFavicon}
                  className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-bold bg-[var(--brand-dark)] text-white rounded-xl hover:bg-[color-mix(in_srgb,var(--brand-dark)_85%,black)] transition disabled:opacity-50 shadow-md"
                >
                  <FaRocket className="w-3.5 h-3.5" />
                  {isSubmittingTemplate ? 'Submitting...' : 'Submit Request'}
                </button>
              </div>
            </form>
        </ModalShell>
      )}
    </>
  )

  if (embedded) {
    return pageContent
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-gray-50 to-slate-100 font-sans text-gray-800">
      {pageContent}
    </div>
  )
}