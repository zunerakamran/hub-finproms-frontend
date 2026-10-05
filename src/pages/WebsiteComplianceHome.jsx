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
import { useAuth } from '../context/AuthContext'
import { useHub } from '../context/HubContext'
import {
  anyWebsiteModuleOn,
  websiteContentPreApprovalOn,
  websiteModuleOffMessage,
  websiteTemplateLibraryOn,
} from '../utils/websiteCompliance'

function ModuleOff() {
  return (
    <section>
      <div className="page-head">
        <div>
          <p className="eyebrow">Website modules</p>
          <h1>Website modules</h1>
          <p className="muted">{websiteModuleOffMessage()}</p>
        </div>
      </div>
    </section>
  )
}

const WTL_CARDS = [
  {
    to: '/my-dashboard/website-compliance/request-site',
    title: 'Request a site',
    description: 'Browse website templates and request one by filling the deployment form.',
    icon: FaRocket,
    anyOf: ['wc_request_deployments'],
    exceptCapabilities: ['wc_assign_website_templates'],
    exceptRoles: ['power_admin', 'finproms_admin'],
  },
  {
    to: '/my-dashboard/website-compliance/deployments',
    title: 'Site operations',
    description:
      'Browse showcase templates, request a deployment for an advisor, and track assignment requests.',
    icon: FaServer,
    anyOf: [
      'wc_assign_website_templates',
      'wc_view_all_deployments',
      'wc_deploy_websites',
      'wc_manage_templates',
    ],
  },
  {
    to: '/my-dashboard/website-compliance/my-sites',
    title: 'My sites',
    description: 'See pending and live template deployments you requested.',
    icon: FaServer,
    anyOf: [
      'wc_request_deployments',
      'wc_edit_sections',
      'wc_submit_change_requests',
    ],
    exceptCapabilities: ['wc_assign_website_templates'],
    exceptRoles: ['power_admin', 'finproms_admin'],
  },
  {
    to: '/my-dashboard/website-compliance/go-live',
    title: 'Request go-live',
    description: 'Submit a go-live request so Power Admin can deploy your staging site to the main URL.',
    icon: FaRocket,
    anyOf: ['wc_request_deployments', 'wc_assign_website_templates'],
    exceptRoles: ['power_admin', 'finproms_admin'],
  },
]

const WC_EDITOR_CARDS = [
  {
    to: '/my-dashboard/website-compliance/content-editor',
    title: 'Content editor',
    description: 'Edit website sections and submit changes for pre-approval review.',
    icon: FaEdit,
    anyOf: ['wc_edit_sections', 'wc_submit_change_requests'],
    exceptRoles: ['power_admin', 'finproms_admin'],
  },
  {
    to: '/my-dashboard/website-compliance/my-requests',
    title: 'My change requests',
    description: 'Track submissions, feedback, and version history.',
    icon: FaHistory,
    anyOf: ['wc_submit_change_requests', 'wc_edit_sections'],
    exceptRoles: ['power_admin', 'finproms_admin'],
  },
  {
    to: '/my-dashboard/website-compliance/publish-live',
    title: 'Publish content',
    description: 'Edit and publish staging or live site content without approver review.',
    icon: FaEdit,
    anyOf: ['wc_publish_live_content'],
  },
]

const WC_APPROVER_CARDS = [
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
    description: 'Pick up unassigned requests, then open the detail page to decide.',
    icon: FaClipboardCheck,
    anyOf: ['wc_review_change_requests'],
  },
  {
    to: '/my-dashboard/website-compliance/history',
    title: 'Request history',
    description: 'Browse in-progress and completed website content reviews.',
    icon: FaInbox,
    anyOf: [
      'wc_assign_change_requests',
      'wc_review_change_requests',
      'wc_view_all_change_requests',
      'wc_change_request_status',
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

function filterCards(cards, role, can) {
  return cards.filter((card) => {
    if (Array.isArray(card.exceptRoles) && card.exceptRoles.includes(role)) return false
    if (
      Array.isArray(card.exceptCapabilities) &&
      card.exceptCapabilities.some((cap) => can(cap))
    ) {
      return false
    }
    return card.anyOf.some((cap) => can(cap))
  })
}

export default function WebsiteComplianceHome() {
  const { user } = useAuth()
  const { can, loading: hubLoading } = useHub()
  const moduleOn = anyWebsiteModuleOn(can)
  const wtlOn = websiteTemplateLibraryOn(can)
  const wcOn = websiteContentPreApprovalOn(can)
  const role = String(user?.role || '')

  const wtlCards = wtlOn ? filterCards(WTL_CARDS, role, can) : []
  const editorCards = wcOn ? filterCards(WC_EDITOR_CARDS, role, can) : []
  const approverCards = wcOn ? filterCards(WC_APPROVER_CARDS, role, can) : []
  const hasWorkspace = wtlCards.length > 0 || editorCards.length > 0 || approverCards.length > 0
  const canStaffOps =
    wtlOn &&
    (can('wc_view_all_deployments') ||
      can('wc_deploy_websites') ||
      can('wc_manage_templates') ||
      can('wc_assign_website_templates'))
  const canReports = wcOn && can('wc_view_platform_report')

  if (!hubLoading && !moduleOn) return <ModuleOff />

  // View-only / report-only / change-status roles: skip this hub landing and go to their real page.
  if (!hubLoading && !hasWorkspace) {
    if (can('wc_publish_live_content')) {
      return <Navigate to="/my-dashboard/website-compliance/publish-live" replace />
    }
    if (can('wc_change_request_status') || can('wc_view_all_change_requests')) {
      return <Navigate to="/my-dashboard/website-compliance/history" replace />
    }
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
            <p className="eyebrow">Website modules</p>
            <h1>Website modules</h1>
            <p className="muted">
              You do not have Website Template Library or Website Content Pre Approval capabilities on
              this hub.
            </p>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section>
      <div className="page-head">
        <div>
          <p className="eyebrow">Website modules</p>
          <h1>Website modules</h1>
          <p className="muted">
            Template Library covers templates, requests, and manual cPanel deploy. Content Pre Approval
            is the section-edit compliance workflow and depends on Template Library.
          </p>
        </div>
      </div>

      <div className="wc-app wc-surface space-y-8">
        {(wtlCards.length > 0 || canStaffOps) && (
          <div className="space-y-3">
            <p className="text-xs font-extrabold uppercase tracking-wider text-gray-500">
              Website Template Library
            </p>
            {wtlCards.length > 0 && <CardGrid cards={wtlCards} />}
            {canStaffOps && !wtlCards.some((c) => c.to.includes('/deployments')) && (
              <div className="flex flex-wrap gap-2">
                <Link
                  to="/my-dashboard/website-compliance/deployments"
                  className="inline-flex items-center text-xs font-bold px-3 py-2 rounded-xl border border-gray-200 bg-white text-slate-700 hover:border-[var(--brand)]/40"
                >
                  Site operations
                </Link>
              </div>
            )}
          </div>
        )}

        {editorCards.length > 0 && (
          <div className="space-y-3">
            <p className="text-xs font-extrabold uppercase tracking-wider text-gray-500">
              Website Content Pre Approval — editing
            </p>
            <CardGrid cards={editorCards} />
          </div>
        )}

        {approverCards.length > 0 && (
          <div className="space-y-3">
            <p className="text-xs font-extrabold uppercase tracking-wider text-gray-500">
              Website Content Pre Approval — review
            </p>
            <CardGrid cards={approverCards} />
          </div>
        )}

        {canReports && (
          <div className="space-y-2">
            <p className="text-xs font-extrabold uppercase tracking-wider text-gray-500">Reports</p>
            <div className="flex flex-wrap gap-2">
              <Link
                to="/my-dashboard/website-compliance/reports"
                className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl border border-gray-200 bg-white text-slate-700 hover:border-[var(--brand)]/40"
              >
                <FaChartBar className="w-3 h-3" />
                Reports
              </Link>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
