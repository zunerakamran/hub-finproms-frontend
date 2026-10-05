import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { FaLayerGroup, FaRocket, FaThLarge } from 'react-icons/fa'
import { useHub } from '../context/HubContext'
import DeploymentRequestPanel from '../websiteCompliance/components/DeploymentRequestPanel'
import WebsiteComplianceTemplatesPanel from '../websiteCompliance/components/WebsiteComplianceTemplatesPanel'
import {
  websiteModuleOffMessage,
  websiteTemplateLibraryOn,
} from '../utils/websiteCompliance'

export default function WebsiteComplianceDeployments() {
  const { can, loading: hubLoading } = useHub()
  const templateModuleOn = websiteTemplateLibraryOn(can)
  const canAssign = can('wc_assign_website_templates')
  const canRequest = can('wc_request_deployments') || canAssign
  const canViewAll = can('wc_view_all_deployments')
  const canManageTemplates = can('wc_manage_templates')
  const canDeployWebsites = can('wc_deploy_websites')
  const canViewDeployHub =
    canDeployWebsites ||
    canViewAll ||
    can('wc_publish_live_content')
  const canBrowseTemplates = canManageTemplates || canRequest
  const canSeeSites = canRequest || canViewAll
  const canAccessPage =
    canViewAll ||
    canDeployWebsites ||
    canManageTemplates ||
    canAssign ||
    can('wc_request_deployments')

  const tabs = useMemo(
    () =>
      [
        canBrowseTemplates && {
          id: 'templates',
          label: 'Template library',
          hint: 'Browse and request showcase templates',
          icon: FaThLarge,
        },
        canSeeSites && {
          id: 'sites',
          label: 'Sites',
          hint: canAssign
            ? 'Requests you submitted or assigned to advisors'
            : 'Your deployment requests and live sites',
          icon: FaRocket,
        },
        canViewDeployHub && canDeployWebsites && {
          id: 'deploy-hub',
          label: 'Deploy hub',
          hint: 'Review and deploy pending requests to cPanel',
          icon: FaLayerGroup,
        },
      ].filter(Boolean),
    [canBrowseTemplates, canSeeSites, canViewDeployHub, canDeployWebsites, canAssign]
  )

  const defaultTab = tabs[0]?.id || 'templates'
  const [activeTab, setActiveTab] = useState(defaultTab)

  // Keep selection valid when capabilities change.
  const safeTab = tabs.some((t) => t.id === activeTab) ? activeTab : defaultTab

  if (!hubLoading && !templateModuleOn) {
    return (
      <section>
        <div className="page-head">
          <div>
            <p className="eyebrow">Website Template Library</p>
            <h1>Site operations</h1>
            <p className="muted">{websiteModuleOffMessage({ templateLibrary: true })}</p>
          </div>
        </div>
      </section>
    )
  }

  if (!hubLoading && !canAccessPage) {
    return (
      <section>
        <div className="page-head">
          <div>
            <p className="eyebrow">Website Template Library</p>
            <h1>Site operations</h1>
            <p className="muted">
              This page is for staff who manage templates and deployments. To request your own site, go
              to <Link to="/my-dashboard/website-compliance/request-site">Request a site</Link>.
            </p>
          </div>
        </div>
      </section>
    )
  }

  const activeMeta = tabs.find((t) => t.id === safeTab)

  return (
    <section>
      <div className="page-head">
        <div>
          <p className="eyebrow">Website Template Library</p>
          <h1>Site operations</h1>
          <p className="muted">
            {canAssign
              ? 'Browse the template library, request a site for an advisor, and track those sites here.'
              : 'Browse templates, track deployment requests, and deploy to cPanel when you have deploy rights.'}
          </p>
        </div>
      </div>

      {tabs.length > 0 ? (
        <div className="library-tabs mb-5" role="tablist" aria-label="Site operations sections">
          {tabs.map((tab) => {
            const Icon = tab.icon
            const selected = safeTab === tab.id
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => setActiveTab(tab.id)}
                className={`library-tabs__btn${selected ? ' is-active' : ''}`}
              >
                <Icon aria-hidden style={{ marginRight: 8, width: 14, height: 14 }} />
                {tab.label}
              </button>
            )
          })}
        </div>
      ) : null}

      {activeMeta?.hint ? (
        <p className="muted text-sm mb-4" style={{ marginTop: '-0.5rem' }}>
          {activeMeta.hint}
        </p>
      ) : null}

      {/* DataGrid / filters-row must stay OUTSIDE .wc-app — WC resets break .btn and icon actions. */}
      <div>
        {safeTab === 'templates' && canBrowseTemplates ? (
          <WebsiteComplianceTemplatesPanel
            includeRequestActions={canRequest}
            forcedTab="templates"
            onRequestCreated={() => setActiveTab('sites')}
          />
        ) : null}

        {safeTab === 'sites' && canSeeSites ? (
          <DeploymentRequestPanel />
        ) : null}

        {safeTab === 'deploy-hub' && canViewDeployHub ? (
          <WebsiteComplianceTemplatesPanel
            includeRequestActions={false}
            forcedTab="deployments"
          />
        ) : null}

        {!hubLoading && tabs.length === 0 ? (
          <p className="muted text-sm">
            You do not have site operations capabilities for Website Template Library.
          </p>
        ) : null}
      </div>
    </section>
  )
}
