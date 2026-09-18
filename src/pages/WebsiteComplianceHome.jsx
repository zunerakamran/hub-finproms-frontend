import { Link } from 'react-router-dom'
import { FaEdit, FaHistory, FaRocket, FaServer } from 'react-icons/fa'
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

const CARDS = [
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

export default function WebsiteComplianceHome() {
  const { can, loading: hubLoading } = useHub()
  const moduleOn = can('module_website_compliance')

  const visibleCards = CARDS.filter((card) => card.anyOf.some((cap) => can(cap)))
  const canStaffOps =
    can('wc_view_all_deployments') ||
    can('wc_deploy_websites') ||
    can('wc_manage_templates') ||
    can('wc_manage_deployment_sections') ||
    can('wc_assign_change_requests')
  const canQueue =
    can('wc_view_all_change_requests') ||
    can('wc_assign_change_requests') ||
    can('wc_review_change_requests')

  if (!hubLoading && !moduleOn) return <ModuleOff />

  if (!hubLoading && visibleCards.length === 0 && !canStaffOps && !canQueue) {
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

      <div className="wc-app wc-surface">
        {visibleCards.length > 0 && (
          <div className="grid sm:grid-cols-2 gap-4">
            {visibleCards.map((card) => {
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
        )}

        {(canStaffOps || canQueue) && (
          <div className={`${visibleCards.length ? 'mt-6 pt-5 border-t border-gray-200' : ''} space-y-2`}>
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
              {canQueue && (
                <Link
                  to="/my-dashboard/website-compliance/queue"
                  className="inline-flex items-center text-xs font-bold px-3 py-2 rounded-xl border border-gray-200 bg-white text-slate-700 hover:border-[var(--brand)]/40"
                >
                  Review queue
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
