import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { api } from '../api/client'
import { hubBootQueryKey, hubQueryKey, queryClient } from '../queryClient'
import { useAuth } from './AuthContext'
import { roleLabel as resolveRoleLabel, roleLabelsMap } from '../utils/roleLabels'
import {
  complianceStatusLabel as resolveComplianceStatusLabel,
  complianceStatusLabelsMap,
} from '../utils/complianceStatusLabels'

const HubContext = createContext(null)

const HUB_ADMIN_ROLES = ['finproms_admin', 'client_admin', 'manager', 'admin']

function isDashboardCapabilityKey(key) {
  return (
    String(key).startsWith('dashboard_') ||
    String(key).startsWith('smc_') ||
    String(key).startsWith('gc_') ||
    String(key).startsWith('st_') ||
    String(key).startsWith('wc_') ||
    String(key).startsWith('firm_documents_') ||
    String(key).startsWith('taxonomy_') ||
    key === 'taxonomy_request_add' ||
    key === 'advisor_excel_import' ||
    key === 'advisor_discontinue'
  )
}

const GENERAL_DASHBOARD_KEYS = [
  'general_show_subscription',
  'general_show_credits',
  'general_show_invoices',
  'general_show_purchases',
]

function sameHub(a, b) {
  if (a === b) return true
  if (!a || !b) return false
  return (
    a.id === b.id &&
    a.viewer_role === b.viewer_role &&
    JSON.stringify(a.checklist) === JSON.stringify(b.checklist) &&
    JSON.stringify(a.acting_checklist) === JSON.stringify(b.acting_checklist) &&
    JSON.stringify(a.effective_capabilities) === JSON.stringify(b.effective_capabilities) &&
    JSON.stringify(a.firm_document_rights) === JSON.stringify(b.firm_document_rights) &&
    JSON.stringify(a.branding) === JSON.stringify(b.branding) &&
    JSON.stringify(a.page_content) === JSON.stringify(b.page_content) &&
    JSON.stringify(a.dashboard_nav) === JSON.stringify(b.dashboard_nav) &&
    JSON.stringify(a.auth) === JSON.stringify(b.auth) &&
    JSON.stringify(a.hub_switcher) === JSON.stringify(b.hub_switcher) &&
    JSON.stringify(a.acting_hub) === JSON.stringify(b.acting_hub) &&
    JSON.stringify(a.acting_advisor_switcher) === JSON.stringify(b.acting_advisor_switcher) &&
    a.effective_role === b.effective_role &&
    JSON.stringify(a.role_labels) === JSON.stringify(b.role_labels) &&
    JSON.stringify(a.compliance_status_labels) === JSON.stringify(b.compliance_status_labels)
  )
}

export function HubProvider({ children }) {
  const { user, loading: authLoading } = useAuth()
  const [hub, setHubState] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actingHubSwitching, setActingHubSwitching] = useState(false)
  // Shown while reloading hub context after Functionalities / Modules / Capabilities
  // saves so the dashboard navbar can update against fresh checklist + caps.
  const [hubRefreshing, setHubRefreshing] = useState(false)
  const hubRef = useRef(null)
  const lastIdentityRef = useRef(null)

  const setHub = useCallback((next) => {
    setHubState((prev) => {
      const resolved = typeof next === 'function' ? next(prev) : next
      const stable = sameHub(prev, resolved) ? prev : resolved
      hubRef.current = stable
      return stable
    })
  }, [])

  const refreshHub = useCallback(async ({ silent = false, withLoader = false, force = false } = {}) => {
    // Keep existing UI mounted during background refreshes.
    if (withLoader) {
      setHubRefreshing(true)
    } else if (!silent && !hubRef.current) {
      setLoading(true)
    }
    try {
      const key = hubQueryKey(user?.id ?? 'guest')

      // After hub switch / checklist save, always hit the network.
      // Never reuse boot prefetch here — stale boot was overwriting the acting hub
      // and then /hub-content/* returned 422 ("select a hub" / credentials).
      let hubData
      if (force) {
        queryClient.removeQueries({ queryKey: hubBootQueryKey })
        queryClient.removeQueries({ queryKey: key })
        hubData = await api.currentHub()
        queryClient.setQueryData(hubBootQueryKey, hubData)
        queryClient.setQueryData(key, hubData)
      } else {
        hubData = await queryClient.fetchQuery({
          queryKey: key,
          queryFn: async () => {
            return queryClient.ensureQueryData({
              queryKey: hubBootQueryKey,
              queryFn: () => api.currentHub(),
              staleTime: 60_000,
            })
          },
          staleTime: 60_000,
        })
        queryClient.setQueryData(hubBootQueryKey, hubData)
      }

      const nextHub = hubData.hub
      setHub(nextHub)
      setError('')

      // Firm-document rights must not block first paint / AppBootGate.
      if (user) {
        void api
          .firmDocumentsMyRights()
          .then((mine) => {
            if (!mine?.rights) return
            const rights = { ...mine.rights }
            const sharedFirms = (mine.accessible_firms || []).some(
              (f) => f?.source === 'shared' || f?.is_central
            )
            // Key-icon / firm grants must unlock the menu for Advisor & Approver.
            if (sharedFirms) rights.can_view = true
            setHub((prev) => {
              if (!prev) return prev
              const caps = { ...(prev.effective_capabilities || {}) }
              // Unlock nav / upload only. Delete, archive, and Document access
              // control stay matrix- or document-scoped (viewer_rights / library).
              if (rights.is_firm_head || rights.can_view || sharedFirms) {
                caps.firm_documents_view = true
              }
              const merged = {
                ...prev,
                firm_document_rights: rights,
                effective_capabilities: caps,
              }
              queryClient.setQueryData(key, { hub: merged })
              queryClient.setQueryData(hubBootQueryKey, { hub: merged })
              return merged
            })
          })
          .catch(() => {
            // Hub payload alone is enough when my-rights is unavailable.
          })
      }

      return nextHub
    } catch (err) {
      setError(err.message || 'Failed to load hub')
      return null
    } finally {
      setLoading(false)
      if (withLoader) {
        setHubRefreshing(false)
      }
    }
  }, [setHub, user])

  useEffect(() => {
    const maybeAuthed = typeof sessionStorage !== 'undefined'
      ? sessionStorage.getItem('hub_auth_session') === '1'
      : false

    // With a cookie session hint, start hub load immediately (parallel with /auth/me).
    if (authLoading && !maybeAuthed) return

    if (maybeAuthed && authLoading && !user) {
      if (lastIdentityRef.current === 'pending' && hubRef.current) return
      lastIdentityRef.current = 'pending'
      refreshHub({ silent: Boolean(hubRef.current) })
      return
    }

    if (authLoading) return

    const identity = `${user?.id ?? 'guest'}:${user?.role ?? ''}`
    // Skip duplicate fetches for the same signed-in identity (avoids remount flashes).
    if (lastIdentityRef.current === identity && hubRef.current) {
      return
    }

    const previous = lastIdentityRef.current
    lastIdentityRef.current = identity

    // Guest/pending hub payloads have no effective_capabilities — force a fresh
    // /hub after login so dashboard nav options appear without a hard refresh.
    const becameAuthed = Boolean(
      user &&
        (previous === 'pending' ||
          previous == null ||
          String(previous).startsWith('guest') ||
          String(previous).split(':')[0] !== String(user.id))
    )

    refreshHub({ silent: Boolean(hubRef.current), force: becameAuthed })
  }, [refreshHub, authLoading, user?.id, user?.role, user])

  // Apply hub branding (colour scheme from Settings) across the whole app.
  useEffect(() => {
    const root = document.documentElement
    const primary = hub?.branding?.primary_color || hub?.branding?.color_scheme?.primary
    const secondary = hub?.branding?.secondary_color || hub?.branding?.color_scheme?.secondary
    const accent = hub?.branding?.accent_color || hub?.branding?.color_scheme?.accent

    if (primary) {
      root.style.setProperty('--brand', primary)
      root.style.setProperty('--brand-soft', `color-mix(in srgb, ${primary} 14%, white)`)
      root.style.setProperty('--brand-softer', `color-mix(in srgb, ${primary} 7%, white)`)
      root.style.setProperty('--brand-tint', `color-mix(in srgb, ${primary} 18%, transparent)`)
      root.style.setProperty('--brand-glow', `color-mix(in srgb, ${primary} 22%, transparent)`)
    } else {
      root.style.removeProperty('--brand')
      root.style.removeProperty('--brand-soft')
      root.style.removeProperty('--brand-softer')
      root.style.removeProperty('--brand-tint')
      root.style.removeProperty('--brand-glow')
    }

    if (secondary) {
      root.style.setProperty('--brand-dark', secondary)
      root.style.setProperty('--sidebar-bg', `color-mix(in srgb, ${secondary} 82%, #0b1220)`)
      root.style.setProperty('--sidebar-bg-alt', `color-mix(in srgb, ${secondary} 70%, #111827)`)
    } else if (primary) {
      root.style.setProperty('--brand-dark', `color-mix(in srgb, ${primary} 72%, #0a0f0d)`)
      root.style.setProperty('--sidebar-bg', `color-mix(in srgb, ${primary} 55%, #0b1220)`)
      root.style.setProperty('--sidebar-bg-alt', `color-mix(in srgb, ${primary} 45%, #111827)`)
    } else {
      root.style.removeProperty('--brand-dark')
      root.style.removeProperty('--sidebar-bg')
      root.style.removeProperty('--sidebar-bg-alt')
    }

    if (accent) {
      root.style.setProperty('--brand-accent', accent)
      root.style.setProperty('--brand-accent-soft', `color-mix(in srgb, ${accent} 14%, white)`)
      root.style.setProperty('--brand-accent-glow', `color-mix(in srgb, ${accent} 22%, transparent)`)
    } else {
      root.style.removeProperty('--brand-accent')
      root.style.removeProperty('--brand-accent-soft')
      root.style.removeProperty('--brand-accent-glow')
    }

    const brandName = hub?.branding?.application_name || hub?.name
    if (brandName) {
      document.title = brandName
    }

    // Always apply a favicon (hub custom or default) so login/register tabs
    // never stay on a blank/missing icon.
    const faviconHref = hub?.branding?.favicon_url || '/vite.svg'
    const lower = String(faviconHref).split('?')[0].toLowerCase()
    let faviconType = 'image/png'
    if (lower.endsWith('.svg')) faviconType = 'image/svg+xml'
    else if (lower.endsWith('.ico')) faviconType = 'image/x-icon'
    else if (lower.endsWith('.gif')) faviconType = 'image/gif'
    else if (lower.endsWith('.webp')) faviconType = 'image/webp'
    else if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) faviconType = 'image/jpeg'

    document.querySelectorAll("link[rel='icon'], link[rel='shortcut icon']").forEach((el) => el.remove())
    const link = document.createElement('link')
    link.setAttribute('rel', 'icon')
    link.setAttribute('type', faviconType)
    link.setAttribute('href', faviconHref)
    document.head.appendChild(link)
  }, [hub?.branding, hub?.name])

  const can = useCallback(
    (flag) => {
      const firmDocRight = (key) => {
        const fdr = hub?.firm_document_rights
        if (!fdr) return false
        // Head unlocks view/add for the Firm documents menu only — never
        // manage_firm_access, delete, or archive (those are scoped elsewhere).
        if (key === 'firm_documents_view') return Boolean(fdr.is_firm_head || fdr.can_view)
        // Upload is Head of Firm only — not grantable via matrix / key icon.
        if (key === 'firm_documents_add') return Boolean(fdr.is_firm_head || fdr.can_add)
        if (key === 'firm_documents_delete') return Boolean(fdr.can_delete)
        if (key === 'firm_documents_archive') return Boolean(fdr.can_archive)
        if (key === 'firm_documents_manage_firm_access') {
          return Boolean(fdr.can_manage_firm_access)
        }
        if (key === 'firm_documents_manage_access_rights') {
          return Boolean(fdr.is_firm_head || fdr.can_manage_member_rights)
        }
        return false
      }

      // Authenticated viewers must use role-resolved caps — never the hub-wide
      // OR checklist (that would show tools unchecked for this role).
      if (hub?.effective_capabilities) {
        if (Object.prototype.hasOwnProperty.call(hub.effective_capabilities, flag)) {
          if (Boolean(hub.effective_capabilities[flag])) return true
          // Matrix cell off: still unlock via Head of Firm / member grants.
          if (String(flag).startsWith('firm_documents_')) {
            return firmDocRight(flag)
          }
          return false
        }
        // Unknown capability key while logged in → deny dashboard/member tools.
        if (
          String(flag).startsWith('dashboard_') ||
          String(flag).startsWith('member_') ||
          String(flag).startsWith('general_') ||
          String(flag).startsWith('smc_') ||
          String(flag).startsWith('gc_') ||
          String(flag).startsWith('st_') ||
          String(flag).startsWith('wc_') ||
          String(flag).startsWith('firm_documents_') ||
          String(flag).startsWith('taxonomy_') ||
          String(flag).startsWith('module_') ||
          flag === 'taxonomy_request_add' ||
          flag === 'advisor_excel_import' ||
          flag === 'advisor_discontinue'
        ) {
          if (String(flag).startsWith('firm_documents_')) {
            return firmDocRight(flag)
          }
          return false
        }
      } else if (String(flag).startsWith('firm_documents_')) {
        return firmDocRight(flag)
      }
      return Boolean(hub?.checklist?.[flag])
    },
    [hub]
  )

  // Prefer explicit auth payload from API; fall back to checklist exclusivity.
  // While acting on a remote content hub (Shared or White-label), use that hub's checklist.
  const actingRemotelyForChecklist = Boolean(
    hub?.hub_switcher?.is_acting_remotely ||
      (hub?.acting_hub?.id != null &&
        hub?.id != null &&
        String(hub.acting_hub.id) !== String(hub.id) &&
        (hub?.acting_hub?.is_content_hub ||
          hub?.acting_hub?.is_white_label ||
          hub?.acting_hub?.is_shared ||
          hub?.acting_hub?.type === 'shared' ||
          hub?.acting_hub?.type === 'white_label'))
  )

  const actingChecklist = useMemo(() => {
    if (hub?.acting_checklist && actingRemotelyForChecklist) {
      return hub.acting_checklist
    }
    return hub?.checklist || {}
  }, [hub, actingRemotelyForChecklist])

  const registrationEnabled = useMemo(() => {
    if (
      !actingRemotelyForChecklist &&
      hub?.auth &&
      typeof hub.auth.registration_enabled === 'boolean'
    ) {
      return hub.auth.registration_enabled
    }
    return Boolean(actingChecklist.public_subscribe) && !Boolean(actingChecklist.private_invite_only)
  }, [hub, actingChecklist, actingRemotelyForChecklist])

  const inviteOnly = useMemo(() => {
    if (
      !actingRemotelyForChecklist &&
      hub?.auth &&
      typeof hub.auth.invite_only === 'boolean'
    ) {
      return hub.auth.invite_only
    }
    return Boolean(actingChecklist.private_invite_only)
  }, [hub, actingChecklist, actingRemotelyForChecklist])

  /** Advisor billing is on for this hub — not a capabilities-matrix flag. */
  const advisorBillingEnabled = useMemo(() => {
    return Boolean(
      actingChecklist.advisor_subscriber_billing || actingChecklist.private_invite_only
    )
  }, [actingChecklist])

  /**
   * Payment-card is the client-admin payer tool only on white-labelled hubs
   * (matches backend AdvisorPaymentCardController). Power / FinProms staff
   * complete import checkout against the client admin card — they do not
   * manage Payment card settings.
   */
  const canManagePaymentCard = useMemo(() => {
    if (!user || !advisorBillingEnabled) return false
    return user.role === 'client_admin' || user.role === 'admin'
  }, [user, advisorBillingEnabled])

  /** Staff always; remaining roles only when a dashboard capability is on. */
  const hasHubDashboardAccess = useMemo(() => {
    if (!user) return false
    if (HUB_ADMIN_ROLES.includes(user.role)) return true
    // Head of Firm (any role) needs the dashboard shell for Firm documents.
    if (hub?.firm_document_rights?.is_firm_head) {
      return true
    }
    // Advisor / Approver / User with key-icon or matrix firm-doc rights.
    if (
      hub?.firm_document_rights?.can_view ||
      hub?.firm_document_rights?.can_add ||
      hub?.firm_document_rights?.can_delete ||
      hub?.firm_document_rights?.can_archive ||
      hub?.effective_capabilities?.firm_documents_view ||
      hub?.effective_capabilities?.firm_documents_add
    ) {
      return true
    }
    const caps = hub?.effective_capabilities
    if (!caps) return false
    return Object.entries(caps).some(
      ([key, enabled]) => Boolean(enabled) && isDashboardCapabilityKey(key)
    )
  }, [user, hub])

  /** Member personal dashboard (General options). */
  const hasGeneralDashboardAccess = useMemo(() => {
    if (!user) return false
    return GENERAL_DASHBOARD_KEYS.some((key) => can(key))
  }, [user, can])

  /** Any tool that belongs in the universal /my-dashboard shell. */
  const hasDashboardAccess = useMemo(() => {
    if (!user) return false
    if (user.role === 'power_admin') return true
    if (hasHubDashboardAccess || hasGeneralDashboardAccess) return true
    return false
  }, [user, hasHubDashboardAccess, hasGeneralDashboardAccess])

  const setActingHub = useCallback(
    async (hubId, { asPowerAdmin = false, persistSwitching = false } = {}) => {
      setActingHubSwitching(true)
      try {
        const data = await api.setActingHub(hubId, { asPowerAdmin })
        const switcher = data?.hub_switcher
        if (switcher) {
          // Apply switcher payload directly — avoids a second heavy GET /hub.
          setHub((prev) => {
            if (!prev) return prev
            return {
              ...prev,
              hub_switcher: switcher,
              effective_capabilities: switcher.effective_capabilities,
              acting_hub: switcher.acting_hub,
              role_labels: switcher.role_labels ?? prev.role_labels,
              compliance_status_labels:
                switcher.compliance_status_labels ?? prev.compliance_status_labels,
            }
          })
          // Reload so firm_document_rights / Head unlock track the selected hub.
          await refreshHub({ silent: true, force: true })
        } else {
          await refreshHub({ silent: true, force: true })
        }
        return data
      } catch (err) {
        setActingHubSwitching(false)
        throw err
      } finally {
        // Keep the full-screen loader up when the caller will hard-reload next.
        if (!persistSwitching) {
          setActingHubSwitching(false)
        }
      }
    },
    [refreshHub, setHub]
  )

  const value = useMemo(
    () => {
      const switcher = hub?.hub_switcher || null
      const actingHub = hub?.acting_hub || switcher?.acting_hub || null
      const isActingOnWhiteLabel = Boolean(
        switcher?.is_acting_on_white_label ?? actingHub?.is_white_label
      )
      const isActingRemotely = Boolean(
        switcher?.is_acting_remotely ??
          (actingHub?.id != null && hub?.id != null && String(actingHub.id) !== String(hub.id))
      )
      const isControlPlane = Boolean(
        hub?.is_control_plane || hub?.is_central || hub?.type === 'central'
      )
      const actingAdvisorSwitcher = hub?.acting_advisor_switcher || null
      const actingAdvisor = actingAdvisorSwitcher?.acting_advisor || null
      const isAdvisorUser = user?.role === 'advisor' || Boolean(user?.is_advisor)
      const effectiveAdvisorId = actingAdvisor?.id
        ? Number(actingAdvisor.id)
        : isAdvisorUser && user?.id
          ? Number(user.id)
          : null

      // Public/member website chrome follows THIS deploy's member_view_site_pages
      // (control-plane matrix while on Central — not the selected remote hub).
      const canViewSitePages = can('member_view_site_pages')

      return {
        hub,
        // Only block the tree on the first hub fetch — not background refreshes.
        loading: (loading && !hub) || authLoading,
        error,
        refreshHub,
        can,
        canViewSitePages,
        roleLabels: roleLabelsMap(hub),
        roleLabel: (key) => resolveRoleLabel(hub, key),
        complianceStatusLabels: complianceStatusLabelsMap(hub),
        complianceStatusLabel: (status) => resolveComplianceStatusLabel(hub, status),
        advisorBillingEnabled,
        canManagePaymentCard,
        registrationEnabled,
        inviteOnly,
        hasHubDashboardAccess,
        hasGeneralDashboardAccess,
        hasDashboardAccess,
        checklist: hub?.checklist || {},
        branding: hub?.branding || {},
        pageContent: hub?.page_content || {},
        hubSwitcher: switcher,
        actingHub,
        actingHubId: actingHub?.id ?? null,
        isActingOnWhiteLabel,
        isActingRemotely,
        isControlPlane,
        isCentral: Boolean(hub?.is_central || hub?.type === 'central'),
        actingHubSwitching,
        // True while switching hubs OR refreshing context after checklist saves.
        hubRefreshing: actingHubSwitching || hubRefreshing,
        canControlWhiteLabelHubs: Boolean(
          switcher?.enabled || can('dashboard_control_white_label_hubs')
        ),
        setActingHub,
        actingAdvisorSwitcher,
        actingAdvisor,
        effectiveAdvisorId,
        isActingAsAdvisor: Boolean(actingAdvisor),
        effectiveRole:
          hub?.effective_role || actingAdvisorSwitcher?.effective_role || user?.role || null,
        setActingAdvisor: async (advisorId) => {
          const data = await api.setActingAdvisor(advisorId)
          await refreshHub({ silent: true, force: true })
          return data
        },
      }
    },
    [
      hub,
      loading,
      authLoading,
      error,
      refreshHub,
      can,
      advisorBillingEnabled,
      canManagePaymentCard,
      registrationEnabled,
      inviteOnly,
      hasHubDashboardAccess,
      hasGeneralDashboardAccess,
      hasDashboardAccess,
      user,
      actingHubSwitching,
      hubRefreshing,
      setActingHub,
    ]
  )

  return <HubContext.Provider value={value}>{children}</HubContext.Provider>
}

export function useHub() {
  const ctx = useContext(HubContext)
  if (!ctx) throw new Error('useHub must be used within HubProvider')
  return ctx
}
