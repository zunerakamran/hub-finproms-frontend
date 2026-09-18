import { Link, Navigate } from 'react-router-dom'
import {
  FaChartBar,
  FaClipboardCheck,
  FaEdit,
  FaHistory,
  FaInbox,
  FaRocket,
  FaServer,
  FaUserCheck,
} from 'react-icons/fa'
import { useHub } from '../context/HubContext'

function ModuleOff() {
  return (
    <section>
      <div className="page-head">
        <div>
          <p className="eyebrow">Website Compliance</p>
          <h1>Website Compliance</h1>
          <p className="muted">
            Website Compliance is not enabled for this hub. Ask Power Admin to enable Website Compliance
            under Modules.
          </p>
        </div>
      </div>
    </section>
  )
}

const EDITOR_CARDS = [
  {
    to: '/my-dashboard/website-compliance/request-site',
    title: 'Request a site',
    description: 'Browse templates and request a new showcase website deployment.',
    icon: FaRocket,
    anyOf: ['wc_request_deployments'],
  },
  {
    to: '/my-dashboard/website-compliance/my-sites',
    title: 'My sites',
    description: 'See pending and live sites you requested, then open one to edit.',
    icon: FaServer,
    anyOf: [
      'wc_edit_sections',
      'wc_submit_change_requests',
      'wc_request_deployments',
      'wc_publish_live_content',
    ],
  },
  {
    to: '/my-dashboard/website-compliance/content-editor',
    title: 'Content editor',
    description: 'Edit website sections and submit changes for compliance review.',
    icon: FaEdit,
    anyOf: ['wc_edit_sections', 'wc_submit_change_requests', 'wc_publish_live_content'],
  },
  {
    to: '/my-dashboard/website-compliance/my-requests',
    title: 'My change requests',
    description: 'Track every content change you submitted, including version history.',
    icon: FaHistory,
    anyOf: ['wc_submit_change_requests', 'wc_edit_sections', 'wc_publish_live_content'],
  },
]

const APPROVER_CARDS = [
  {
    to: '/my-dashboard/website-compliance/assign',
    title: 'Assign requests',
    description: 'Assign pending content changes to an approver for review.',
    icon: FaUserCheck,
    anyOf: ['wc_assign_change_requests'],
  },
  {
    to: '/my-dashboard/website-compliance/review',
    title: 'Review queue',
    description: 'Pick up requests and approve, reject, or approve with feedback.',
    icon: FaClipboardCheck,
    anyOf: ['wc_review_change_requests', 'wc_view_all_change_requests'],
  },
  {
    to: '/my-dashboard/website-compliance/history',
    title: 'Request history',
    description: 'Browse completed and in-progress website content reviews.',
    icon: FaInbox,
    anyOf: [
      'wc_assign_change_requests',
      'wc_review_change_requests',
      'wc_view_all_change_requests',
    ],
  },
]

function CardGrid({ cards }) {
  return (
    <div className="grid sm:grid-cols-2 gap-4">
      {cards.map((card) => {
        const Icon = card.icon
        return (
          <Link
            key={card.to}
            to={card.to}
            className="group rounded-2xl border border-gray-200 bg-white p-5 shadow-sm hover:border-[var(--brand)]/35 hover:shadow-md transition"
          >
            <div className="w-10 h-10 rounded-xl bg-[var(--brand)]/10 text-[var(--brand)] flex items-center justify-center mb-3 group-hover:bg-[var(--brand)] group-hover:text-white transition">
              <Icon className="w-4 h-4" />
            </div>
            <h2 className="text-base font-extrabold text-[var(--brand-dark)]">{card.title}</h2>
            <p className="text-sm text-gray-500 mt-1.5">{card.description}</p>
          </Link>
        )
      })}
    </div>
  )
}

export default function WebsiteComplianceHome() {
  const { can, loading: hubLoading } = useHub()
  const moduleOn = can('module_website_compliance')

  const editorCards = EDITOR_CARDS.filter((card) => card.anyOf.some((cap) => can(cap)))
  const approverCards = APPROVER_CARDS.filter((card) => card.anyOf.some((cap) => can(cap)))
  const hasWorkspace = editorCards.length > 0 || approverCards.length > 0
  const canStaffOps =
    can('wc_view_all_deployments') ||
    can('wc_deploy_websites') ||
    can('wc_manage_templates') ||
    can('wc_manage_deployment_sections') ||
    can('wc_assign_change_requests')
  const canReports = can('wc_view_platform_report')

  if (!hubLoading && !moduleOn) return <ModuleOff />

  // View-only / report-only roles: skip this hub landing and go to their real page.
  if (!hubLoading && !hasWorkspace) {
    if (canStaffOps) {
      return <Navigate to="/my-dashboard/website-compliance/deployments" replace />
    }
    if (canReports) {
      return <Navigate to="/my-dashboard/website-compliance/reports" replace />
    }
    return (
      <section>
        <div className="page-head">
          <div>
            <p className="eyebrow">Website Compliance</p>
            <h1>Website Compliance</h1>
            <p className="muted">You do not have Website Compliance capabilities on this hub.</p>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section>
      <div className="page-head">
        <div>
          <p className="eyebrow">Website Compliance</p>
          <h1>Website Compliance</h1>
          <p className="muted">Choose a workspace — each task has its own page.</p>
        </div>
      </div>

      <div className="wc-app wc-surface space-y-8">
        {editorCards.length > 0 && (
          <div className="space-y-3">
            {approverCards.length > 0 && (
              <p className="text-xs font-extrabold uppercase tracking-wider text-gray-500">
                Editing &amp; sites
              </p>
            )}
            <CardGrid cards={editorCards} />
          </div>
        )}

        {approverCards.length > 0 && (
          <div className="space-y-3">
            <p className="text-xs font-extrabold uppercase tracking-wider text-gray-500">
              Review &amp; assignment
            </p>
            <CardGrid cards={approverCards} />
          </div>
        )}

        {(canStaffOps || canReports) && (
          <div className="space-y-2">
            <p className="text-xs font-extrabold uppercase tracking-wider text-gray-500">Staff tools</p>
            <div className="flex flex-wrap gap-2">
              {canStaffOps && (
                <Link
                  to="/my-dashboard/website-compliance/deployments"
                  className="inline-flex items-center text-xs font-bold px-3 py-2 rounded-xl border border-gray-200 bg-white text-slate-700 hover:border-[var(--brand)]/40"
                >
                  Site operations
                </Link>
              )}
              {canReports && (
                <Link
                  to="/my-dashboard/website-compliance/reports"
                  className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl border border-gray-200 bg-white text-slate-700 hover:border-[var(--brand)]/40"
                >
                  <FaChartBar className="w-3 h-3" />
                  Reports
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
