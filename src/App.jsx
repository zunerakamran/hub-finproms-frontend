import { Suspense } from 'react'
import { lazyWithRetry as lazy } from './lazyWithRetry'
import { BrowserRouter, Navigate, Outlet, Route, Routes, useLocation, useParams } from 'react-router-dom'
import HubCapabilityRoute from './components/HubCapabilityRoute'
import Layout from './components/Layout'
import MyDashboardLayout from './components/MyDashboardLayout'
import PowerCapabilityRoute from './components/PowerCapabilityRoute'
import { ProtectedRoute } from './components/ProtectedRoute'
import { AuthProvider } from './context/AuthContext'
import { HubProvider } from './context/HubContext'
import AppBootGate from './components/AppBootGate'
import TermsGate from './components/TermsGate'
import './App.css'
import './shell.css'
import PageLoader from './components/PageLoader'
import Login from './pages/Login'
import Register from './pages/Register'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'
import VerifyEmail from './pages/VerifyEmail'
import HomeRoute from './components/HomeRoute'

const AdminBankTransfers = lazy(() => import('./pages/AdminBankTransfers'))
const AdminAdvisors = lazy(() => import('./pages/AdminAdvisors'))
const AdminActivityLogs = lazy(() => import('./pages/AdminActivityLogs'))
const AdminActiveSessions = lazy(() => import('./pages/AdminActiveSessions'))
const AdminHubUsers = lazy(() => import('./pages/AdminHubUsers'))
const AdminComplianceAuditTrail = lazy(() => import('./pages/AdminComplianceAuditTrail'))
const AdminOneTimeInvoices = lazy(() => import('./pages/AdminOneTimeInvoices'))
const AdminAdvisorInvoices = lazy(() => import('./pages/AdminAdvisorInvoices'))
const AdminAdvisorRenewal = lazy(() => import('./pages/AdminAdvisorRenewal'))
const AdminModuleInvoices = lazy(() => import('./pages/AdminModuleInvoices'))
const AdminModulePricing = lazy(() => import('./pages/AdminModulePricing'))
const AdminSubscriberCredits = lazy(() => import('./pages/AdminSubscriberCredits'))
const AdminBundles = lazy(() => import('./pages/AdminBundles'))
const AdminCategories = lazy(() => import('./pages/AdminCategories'))
const AdminFirms = lazy(() => import('./pages/AdminFirms'))
const FirmDocuments = lazy(() => import('./pages/FirmDocuments'))
const FirmDocumentDetail = lazy(() => import('./pages/FirmDocumentDetail'))
const AdminFirmDocumentCategories = lazy(() => import('./pages/AdminFirmDocumentCategories'))
const AdminPaymentCard = lazy(() => import('./pages/AdminPaymentCard'))
const AdminPaymentCardSuccess = lazy(() => import('./pages/AdminPaymentCardSuccess'))
const AdminPlans = lazy(() => import('./pages/AdminPlans'))
const AdminPosts = lazy(() => import('./pages/AdminPosts'))
const CentralContentLibrary = lazy(() => import('./pages/CentralContentLibrary'))
const AdminSettings = lazy(() => import('./pages/AdminSettings'))
const AdminTerms = lazy(() => import('./pages/AdminTerms'))
const AdminRoleDisplayNames = lazy(() => import('./pages/AdminRoleDisplayNames'))
const AdminComplianceStatusDisplayNames = lazy(() => import('./pages/AdminComplianceStatusDisplayNames'))
const AdminEmailTemplates = lazy(() => import('./pages/AdminEmailTemplates'))
const AdminEmailTemplateEdit = lazy(() => import('./pages/AdminEmailTemplateEdit'))
const AdminTags = lazy(() => import('./pages/AdminTags'))
const AdminTypes = lazy(() => import('./pages/AdminTypes'))
const AdvisorBillingSuccess = lazy(() => import('./pages/AdvisorBillingSuccess'))
const BankTransferPending = lazy(() => import('./pages/BankTransferPending'))
const BundleDetail = lazy(() => import('./pages/BundleDetail'))
const Bundles = lazy(() => import('./pages/Bundles'))
const ContentPurchaseSuccess = lazy(() => import('./pages/ContentPurchaseSuccess'))
const SocialMediaComplianceMyRequests = lazy(() => import('./pages/SocialMediaComplianceMyRequests'))
const SocialMediaComplianceQueue = lazy(() => import('./pages/SocialMediaComplianceQueue'))
const SocialMediaComplianceReports = lazy(() => import('./pages/SocialMediaComplianceReports'))
const SocialMediaComplianceRequestDetail = lazy(() => import('./pages/SocialMediaComplianceRequestDetail'))
const SocialMediaComplianceSubmit = lazy(() => import('./pages/SocialMediaComplianceSubmit'))
const GeneralComplianceMyRequests = lazy(() => import('./pages/GeneralComplianceMyRequests'))
const GeneralComplianceQueue = lazy(() => import('./pages/GeneralComplianceQueue'))
const GeneralComplianceReports = lazy(() => import('./pages/GeneralComplianceReports'))
const GeneralComplianceRequestDetail = lazy(() => import('./pages/GeneralComplianceRequestDetail'))
const GeneralComplianceSubmit = lazy(() => import('./pages/GeneralComplianceSubmit'))
const AdminGcContentTypes = lazy(() => import('./pages/AdminGcContentTypes'))
const SupportTicketsMyTickets = lazy(() => import('./pages/SupportTicketsMyTickets'))
const SupportTicketSubmit = lazy(() => import('./pages/SupportTicketSubmit'))
const SupportTicketsQueue = lazy(() => import('./pages/SupportTicketsQueue'))
const SupportTicketDetail = lazy(() => import('./pages/SupportTicketDetail'))
const TaxonomyAddRequestsMy = lazy(() => import('./pages/TaxonomyAddRequestsMy'))
const TaxonomyAddRequestSubmit = lazy(() => import('./pages/TaxonomyAddRequestSubmit'))
const TaxonomyAddRequestsQueue = lazy(() => import('./pages/TaxonomyAddRequestsQueue'))
const TaxonomyAddRequestDetail = lazy(() => import('./pages/TaxonomyAddRequestDetail'))
const WebsiteComplianceDeployments = lazy(() => import('./pages/WebsiteComplianceDeployments'))
const WebsiteComplianceHome = lazy(() => import('./pages/WebsiteComplianceHome'))
const WebsiteCompliancePublish = lazy(() => import('./pages/WebsiteCompliancePublish'))
const WebsiteCompliancePublishLive = lazy(() => import('./pages/WebsiteCompliancePublishLive'))
const WebsiteComplianceQueue = lazy(() => import('./pages/WebsiteComplianceQueue'))
const WebsiteComplianceReports = lazy(() => import('./pages/WebsiteComplianceReports'))
const WebsiteComplianceRequestSite = lazy(() => import('./pages/WebsiteComplianceRequestSite'))
const WebsiteComplianceMySites = lazy(() => import('./pages/WebsiteComplianceMySites'))
const WebsiteComplianceGoLive = lazy(() => import('./pages/WebsiteComplianceGoLive'))
const WebsiteComplianceContentEditor = lazy(() => import('./pages/WebsiteComplianceContentEditor'))
const WebsiteComplianceMyRequests = lazy(() => import('./pages/WebsiteComplianceMyRequests'))
const WebsiteComplianceRequestDetail = lazy(() => import('./pages/WebsiteComplianceRequestDetail'))
const WebsiteComplianceAssignRequests = lazy(() => import('./pages/WebsiteComplianceAssignRequests'))
const WebsiteComplianceReviewQueue = lazy(() => import('./pages/WebsiteComplianceReviewQueue'))
const WebsiteComplianceRequestHistory = lazy(() => import('./pages/WebsiteComplianceRequestHistory'))
const InvoiceDetail = lazy(() => import('./pages/InvoiceDetail'))
const MyCredits = lazy(() => import('./pages/MyCredits'))
const MyDashboard = lazy(() => import('./pages/MyDashboard'))
const MyInvoices = lazy(() => import('./pages/MyInvoices'))
const MyPurchases = lazy(() => import('./pages/MyPurchases'))
const MySubscription = lazy(() => import('./pages/MySubscription'))
const Profile = lazy(() => import('./pages/Profile'))
const PostDetail = lazy(() => import('./pages/PostDetail'))
const Posts = lazy(() => import('./pages/Posts'))
const PowerAdminCapabilities = lazy(() => import('./pages/PowerAdminCapabilities'))
const PowerAdminChecklist = lazy(() => import('./pages/PowerAdminChecklist'))
const PowerAdminModules = lazy(() => import('./pages/PowerAdminModules'))
const PowerAdminHubDetail = lazy(() => import('./pages/PowerAdminHubDetail'))
const PowerAdminHubs = lazy(() => import('./pages/PowerAdminHubs'))
const PowerAdminPaymentMethods = lazy(() => import('./pages/PowerAdminPaymentMethods'))
const PowerAdminUsers = lazy(() => import('./pages/PowerAdminUsers'))
const SubscriptionDetail = lazy(() => import('./pages/SubscriptionDetail'))
const SubscriptionSuccess = lazy(() => import('./pages/SubscriptionSuccess'))
const Subscriptions = lazy(() => import('./pages/Subscriptions'))


function LegacyInvoiceRedirect() {
  const { id } = useParams()
  return <Navigate to={`/my-dashboard/my-invoices/${id}`} replace />
}

function LegacyHubRedirect() {
  const { hubId } = useParams()
  return <Navigate to={`/my-dashboard/hubs/${hubId}`} replace />
}

function LegacyShellRedirect({ toPrefix }) {
  const { '*': rest } = useParams()
  const location = useLocation()
  const path = rest ? `${toPrefix}/${rest}` : toPrefix
  return <Navigate to={`${path}${location.search}`} replace />
}

export default function App() {
  return (
    <AuthProvider>
      <HubProvider>
        <AppBootGate>
          <TermsGate>
          <BrowserRouter>
            <Suspense fallback={<PageLoader />}>
            <Routes>
            {/* Home — public on shared hubs; login required on white-labelled */}
            <Route element={<Layout />}>
              <Route index element={<HomeRoute />} />
            </Route>

            {/* Member catalog & plans — login + View website pages capability */}
            <Route
              element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }
            >
              <Route
                path="posts"
                element={
                  <HubCapabilityRoute capability="member_view_site_pages">
                    <Posts />
                  </HubCapabilityRoute>
                }
              />
              <Route
                path="posts/:id"
                element={
                  <HubCapabilityRoute capability="member_view_site_pages">
                    <PostDetail />
                  </HubCapabilityRoute>
                }
              />
              <Route
                path="bundles"
                element={
                  <HubCapabilityRoute capability="member_browse_bundles">
                    <Bundles />
                  </HubCapabilityRoute>
                }
              />
              <Route
                path="bundles/:id"
                element={
                  <HubCapabilityRoute capability="member_browse_bundles">
                    <BundleDetail />
                  </HubCapabilityRoute>
                }
              />
              <Route
                path="subscriptions"
                element={
                  <HubCapabilityRoute capability="member_view_site_pages">
                    <Subscriptions />
                  </HubCapabilityRoute>
                }
              />
              <Route
                path="subscriptions/success"
                element={
                  <HubCapabilityRoute capability="member_view_site_pages">
                    <SubscriptionSuccess />
                  </HubCapabilityRoute>
                }
              />
              <Route
                path="subscriptions/bank-transfer"
                element={
                  <HubCapabilityRoute capability="member_view_site_pages">
                    <BankTransferPending />
                  </HubCapabilityRoute>
                }
              />
              <Route
                path="purchases/success"
                element={
                  <HubCapabilityRoute capability="member_view_site_pages">
                    <ContentPurchaseSuccess />
                  </HubCapabilityRoute>
                }
              />
              <Route
                path="subscriptions/:id"
                element={
                  <HubCapabilityRoute capability="member_view_site_pages">
                    <SubscriptionDetail />
                  </HubCapabilityRoute>
                }
              />
            </Route>

            {/* Universal dashboard — tools from Capabilities matrix (+ Power Admin pa_* tools) */}
            <Route
              element={
                <ProtectedRoute dashboardOnly>
                  <Outlet />
                </ProtectedRoute>
              }
            >
              <Route path="my-dashboard" element={<MyDashboardLayout />}>
                <Route index element={<MyDashboard />} />
                <Route path="profile" element={<Profile />} />
                <Route
                  path="subscription"
                  element={
                    <HubCapabilityRoute capability="general_show_subscription">
                      <MySubscription />
                    </HubCapabilityRoute>
                  }
                />
                <Route
                  path="credits"
                  element={
                    <HubCapabilityRoute capability="general_show_credits">
                      <MyCredits />
                    </HubCapabilityRoute>
                  }
                />
                <Route
                  path="purchases"
                  element={
                    <HubCapabilityRoute capability="general_show_purchases">
                      <MyPurchases />
                    </HubCapabilityRoute>
                  }
                />
                <Route
                  path="my-invoices"
                  element={
                    <HubCapabilityRoute capability="general_show_invoices">
                      <MyInvoices />
                    </HubCapabilityRoute>
                  }
                />
                <Route
                  path="my-invoices/:id"
                  element={
                    <HubCapabilityRoute
                      anyOf={['general_show_invoices', 'dashboard_view_advisor_invoices']}
                    >
                      <InvoiceDetail />
                    </HubCapabilityRoute>
                  }
                />
                <Route
                  path="invoices"
                  element={<Navigate to="/my-dashboard/my-invoices" replace />}
                />
                <Route
                  path="invoices/:id"
                  element={<LegacyInvoiceRedirect />}
                />

                <Route
                  path="posts"
                  element={
                    <HubCapabilityRoute anyOf={['dashboard_manage_posts', 'dashboard_view_posts']}>
                      <AdminPosts />
                    </HubCapabilityRoute>
                  }
                />
                <Route
                  path="central-library"
                  element={
                    <HubCapabilityRoute capability="dashboard_central_content_library">
                      <CentralContentLibrary />
                    </HubCapabilityRoute>
                  }
                />
                <Route
                  path="bundles"
                  element={
                    <HubCapabilityRoute capability="dashboard_manage_bundles">
                      <AdminBundles />
                    </HubCapabilityRoute>
                  }
                />
                <Route
                  path="types"
                  element={
                    <HubCapabilityRoute anyOf={['dashboard_manage_types', 'dashboard_view_types']}>
                      <AdminTypes />
                    </HubCapabilityRoute>
                  }
                />
                <Route
                  path="categories"
                  element={
                    <HubCapabilityRoute anyOf={['dashboard_manage_categories', 'dashboard_view_categories']}>
                      <AdminCategories />
                    </HubCapabilityRoute>
                  }
                />
                <Route
                  path="tags"
                  element={
                    <HubCapabilityRoute anyOf={['dashboard_manage_tags', 'dashboard_view_tags']}>
                      <AdminTags />
                    </HubCapabilityRoute>
                  }
                />
                <Route
                  path="taxonomy-add-requests"
                  element={
                    <HubCapabilityRoute capability="taxonomy_request_add">
                      <TaxonomyAddRequestsMy />
                    </HubCapabilityRoute>
                  }
                />
                <Route
                  path="taxonomy-add-requests/new"
                  element={
                    <HubCapabilityRoute capability="taxonomy_request_add">
                      <TaxonomyAddRequestSubmit />
                    </HubCapabilityRoute>
                  }
                />
                <Route
                  path="taxonomy-add-requests/queue"
                  element={
                    <HubCapabilityRoute
                      anyOf={[
                        'dashboard_manage_types',
                        'dashboard_manage_categories',
                        'dashboard_manage_tags',
                        'gc_manage_content_types',
                        'firm_documents_manage_categories',
                      ]}
                    >
                      <TaxonomyAddRequestsQueue />
                    </HubCapabilityRoute>
                  }
                />
                <Route
                  path="taxonomy-add-requests/:id"
                  element={
                    <HubCapabilityRoute
                      anyOf={[
                        'taxonomy_request_add',
                        'dashboard_manage_types',
                        'dashboard_manage_categories',
                        'dashboard_manage_tags',
                        'gc_manage_content_types',
                        'firm_documents_manage_categories',
                      ]}
                    >
                      <TaxonomyAddRequestDetail />
                    </HubCapabilityRoute>
                  }
                />
                <Route
                  path="firms"
                  element={
                    <HubCapabilityRoute anyOf={['dashboard_manage_firms', 'dashboard_assign_firm_head']}>
                      <AdminFirms />
                    </HubCapabilityRoute>
                  }
                />
                <Route
                  path="firm-documents"
                  element={
                    <HubCapabilityRoute
                      anyOf={[
                        'firm_documents_view',
                        'firm_documents_add',
                        'firm_documents_delete',
                        'firm_documents_archive',
                      ]}
                    >
                      <FirmDocuments />
                    </HubCapabilityRoute>
                  }
                />
                <Route
                  path="firm-documents/categories"
                  element={
                    <HubCapabilityRoute capability="firm_documents_manage_categories">
                      <AdminFirmDocumentCategories />
                    </HubCapabilityRoute>
                  }
                />
                <Route
                  path="firm-documents/:id"
                  element={
                    <HubCapabilityRoute
                      anyOf={[
                        'firm_documents_view',
                        'firm_documents_add',
                        'firm_documents_delete',
                        'firm_documents_archive',
                      ]}
                    >
                      <FirmDocumentDetail />
                    </HubCapabilityRoute>
                  }
                />
                <Route
                  path="plans"
                  element={
                    <HubCapabilityRoute capability="dashboard_manage_plans">
                      <AdminPlans />
                    </HubCapabilityRoute>
                  }
                />
                <Route
                  path="advisors"
                  element={
                    <HubCapabilityRoute anyOf={['advisor_excel_import', 'advisor_excel_template', 'advisor_excel_submit']}>
                      <AdminAdvisors />
                    </HubCapabilityRoute>
                  }
                />
                <Route
                  path="payment-card"
                  element={
                    <HubCapabilityRoute billingPayer>
                      <AdminPaymentCard />
                    </HubCapabilityRoute>
                  }
                />
                <Route
                  path="payment-card/success"
                  element={
                    <HubCapabilityRoute billingPayer>
                      <AdminPaymentCardSuccess />
                    </HubCapabilityRoute>
                  }
                />
                <Route
                  path="advisor-invoices"
                  element={
                    <HubCapabilityRoute capability="dashboard_view_advisor_invoices">
                      <AdminAdvisorInvoices />
                    </HubCapabilityRoute>
                  }
                />
                <Route
                  path="advisor-invoices/:id"
                  element={
                    <HubCapabilityRoute capability="dashboard_view_advisor_invoices">
                      <InvoiceDetail />
                    </HubCapabilityRoute>
                  }
                />
                <Route
                  path="activity-logs"
                  element={
                    <HubCapabilityRoute capability="dashboard_view_activity_logs">
                      <AdminActivityLogs />
                    </HubCapabilityRoute>
                  }
                />
                <Route
                  path="active-sessions"
                  element={
                    <HubCapabilityRoute capability="dashboard_manage_active_sessions">
                      <AdminActiveSessions />
                    </HubCapabilityRoute>
                  }
                />
                <Route
                  path="hub-users"
                  element={
                    <HubCapabilityRoute capability="dashboard_view_hub_users">
                      <AdminHubUsers />
                    </HubCapabilityRoute>
                  }
                />
                <Route
                  path="compliance-audit-trail"
                  element={
                    <HubCapabilityRoute capability="dashboard_view_compliance_audit_trail">
                      <AdminComplianceAuditTrail />
                    </HubCapabilityRoute>
                  }
                />
                <Route
                  path="one-time-invoices"
                  element={
                    <HubCapabilityRoute capability="dashboard_view_one_time_invoices">
                      <AdminOneTimeInvoices />
                    </HubCapabilityRoute>
                  }
                />
                <Route
                  path="one-time-invoices/:id"
                  element={
                    <HubCapabilityRoute capability="dashboard_view_one_time_invoices">
                      <InvoiceDetail />
                    </HubCapabilityRoute>
                  }
                />
                <Route
                  path="social-media-compliance"
                  element={
                    <HubCapabilityRoute anyOf={['smc_view_own_requests', 'smc_submit_request']}>
                      <SocialMediaComplianceMyRequests />
                    </HubCapabilityRoute>
                  }
                />
                <Route
                  path="social-media-compliance/new"
                  element={
                    <HubCapabilityRoute capability="smc_submit_request">
                      <SocialMediaComplianceSubmit />
                    </HubCapabilityRoute>
                  }
                />
                <Route
                  path="social-media-compliance/queue"
                  element={
                    <HubCapabilityRoute
                      anyOf={['smc_view_all_requests', 'smc_assign_requests', 'smc_review_requests', 'smc_change_request_status']}
                    >
                      <SocialMediaComplianceQueue />
                    </HubCapabilityRoute>
                  }
                />
                <Route
                  path="social-media-compliance/reports"
                  element={
                    <HubCapabilityRoute capability="smc_view_reports">
                      <SocialMediaComplianceReports />
                    </HubCapabilityRoute>
                  }
                />
                <Route
                  path="social-media-compliance/:id"
                  element={
                    <HubCapabilityRoute
                      anyOf={[
                        'smc_view_own_requests',
                        'smc_submit_request',
                        'smc_view_all_requests',
                        'smc_assign_requests',
                        'smc_review_requests',
                        'smc_change_request_status',
                      ]}
                    >
                      <SocialMediaComplianceRequestDetail />
                    </HubCapabilityRoute>
                  }
                />
                <Route
                  path="general-compliance"
                  element={
                    <HubCapabilityRoute anyOf={['gc_view_own_requests', 'gc_submit_request']}>
                      <GeneralComplianceMyRequests />
                    </HubCapabilityRoute>
                  }
                />
                <Route
                  path="general-compliance/new"
                  element={
                    <HubCapabilityRoute capability="gc_submit_request">
                      <GeneralComplianceSubmit />
                    </HubCapabilityRoute>
                  }
                />
                <Route
                  path="general-compliance/content-types"
                  element={
                    <HubCapabilityRoute capability="gc_manage_content_types">
                      <AdminGcContentTypes />
                    </HubCapabilityRoute>
                  }
                />
                <Route
                  path="general-compliance/queue"
                  element={
                    <HubCapabilityRoute
                      anyOf={['gc_view_all_requests', 'gc_assign_requests', 'gc_review_requests', 'gc_change_request_status']}
                    >
                      <GeneralComplianceQueue />
                    </HubCapabilityRoute>
                  }
                />
                <Route
                  path="general-compliance/reports"
                  element={
                    <HubCapabilityRoute capability="gc_view_reports">
                      <GeneralComplianceReports />
                    </HubCapabilityRoute>
                  }
                />
                <Route
                  path="general-compliance/:id"
                  element={
                    <HubCapabilityRoute
                      anyOf={[
                        'gc_view_own_requests',
                        'gc_submit_request',
                        'gc_view_all_requests',
                        'gc_assign_requests',
                        'gc_review_requests',
                        'gc_change_request_status',
                      ]}
                    >
                      <GeneralComplianceRequestDetail />
                    </HubCapabilityRoute>
                  }
                />
                <Route
                  path="support-tickets"
                  element={
                    <HubCapabilityRoute anyOf={['st_view_own_tickets', 'st_submit_ticket']}>
                      <SupportTicketsMyTickets />
                    </HubCapabilityRoute>
                  }
                />
                <Route
                  path="support-tickets/new"
                  element={
                    <HubCapabilityRoute capability="st_submit_ticket">
                      <SupportTicketSubmit />
                    </HubCapabilityRoute>
                  }
                />
                <Route
                  path="support-tickets/queue"
                  element={
                    <HubCapabilityRoute anyOf={['st_view_all_tickets', 'st_change_ticket_status']}>
                      <SupportTicketsQueue />
                    </HubCapabilityRoute>
                  }
                />
                <Route
                  path="support-tickets/:id"
                  element={
                    <HubCapabilityRoute
                      anyOf={[
                        'st_view_own_tickets',
                        'st_submit_ticket',
                        'st_view_all_tickets',
                        'st_change_ticket_status',
                        'st_comment_on_tickets',
                      ]}
                    >
                      <SupportTicketDetail />
                    </HubCapabilityRoute>
                  }
                />
                <Route
                  path="website-compliance"
                  element={
                    <HubCapabilityRoute
                      anyOf={[
                        'wc_edit_sections',
                        'wc_submit_change_requests',
                        'wc_request_deployments',
                        'wc_publish_live_content',
                        'wc_assign_change_requests',
                        'wc_assign_website_templates',
                        'wc_view_all_change_requests',
                        'wc_review_change_requests',
                        // View-only / report roles may still hit this URL; Home redirects them.
                        'wc_view_all_deployments',
                        'wc_deploy_websites',
                        'wc_manage_templates',
                        'wc_manage_deployment_sections',
                        'wc_view_platform_report',
                        'wc_view_activity_logs',
                      ]}
                    >
                      <WebsiteComplianceHome />
                    </HubCapabilityRoute>
                  }
                />
                <Route
                  path="website-compliance/request-site"
                  element={
                    <HubCapabilityRoute
                      anyOf={['wc_request_deployments', 'wc_assign_website_templates']}
                    >
                      <WebsiteComplianceRequestSite />
                    </HubCapabilityRoute>
                  }
                />
                <Route
                  path="website-compliance/my-sites"
                  element={
                    <HubCapabilityRoute
                      anyOf={[
                        'wc_edit_sections',
                        'wc_submit_change_requests',
                        'wc_request_deployments',
                      ]}
                    >
                      <WebsiteComplianceMySites />
                    </HubCapabilityRoute>
                  }
                />
                <Route
                  path="website-compliance/go-live"
                  element={
                    <HubCapabilityRoute
                      anyOf={['wc_request_deployments', 'wc_assign_website_templates']}
                    >
                      <WebsiteComplianceGoLive />
                    </HubCapabilityRoute>
                  }
                />
                <Route
                  path="website-compliance/content-editor"
                  element={
                    <HubCapabilityRoute
                      anyOf={['wc_edit_sections', 'wc_submit_change_requests']}
                    >
                      <WebsiteComplianceContentEditor />
                    </HubCapabilityRoute>
                  }
                />
                <Route
                  path="website-compliance/my-requests"
                  element={
                    <HubCapabilityRoute
                      anyOf={['wc_submit_change_requests', 'wc_edit_sections']}
                    >
                      <WebsiteComplianceMyRequests />
                    </HubCapabilityRoute>
                  }
                />
                <Route
                  path="website-compliance/publish-live"
                  element={
                    <HubCapabilityRoute capability="wc_publish_live_content">
                      <WebsiteCompliancePublishLive />
                    </HubCapabilityRoute>
                  }
                />
                <Route
                  path="website-compliance/my-requests/:id"
                  element={
                    <HubCapabilityRoute
                      anyOf={[
                        'wc_submit_change_requests',
                        'wc_edit_sections',
                        'wc_publish_live_content',
                        'wc_view_all_change_requests',
                        'wc_review_change_requests',
                        'wc_change_request_status',
                        'wc_assign_change_requests',
                        'wc_view_platform_report',
                      ]}
                    >
                      <WebsiteComplianceRequestDetail />
                    </HubCapabilityRoute>
                  }
                />
                <Route
                  path="website-compliance/deployments"
                  element={
                    <HubCapabilityRoute
                      anyOf={[
                        'wc_view_all_deployments',
                        'wc_deploy_websites',
                        'wc_manage_templates',
                        'wc_assign_website_templates',
                      ]}
                    >
                      <WebsiteComplianceDeployments />
                    </HubCapabilityRoute>
                  }
                />
                <Route
                  path="website-compliance/assign"
                  element={
                    <HubCapabilityRoute
                      anyOf={['wc_assign_change_requests', 'wc_view_all_change_requests']}
                    >
                      <WebsiteComplianceAssignRequests />
                    </HubCapabilityRoute>
                  }
                />
                <Route
                  path="website-compliance/review"
                  element={
                    <HubCapabilityRoute capability="wc_review_change_requests">
                      <WebsiteComplianceReviewQueue />
                    </HubCapabilityRoute>
                  }
                />
                <Route
                  path="website-compliance/history"
                  element={
                    <HubCapabilityRoute
                      anyOf={[
                        'wc_assign_change_requests',
                        'wc_review_change_requests',
                        'wc_view_all_change_requests',
                        'wc_change_request_status',
                      ]}
                    >
                      <WebsiteComplianceRequestHistory />
                    </HubCapabilityRoute>
                  }
                />
                <Route
                  path="website-compliance/queue"
                  element={
                    <HubCapabilityRoute
                      anyOf={[
                        'wc_view_all_change_requests',
                        'wc_assign_change_requests',
                        'wc_review_change_requests',
                        'wc_change_request_status',
                      ]}
                    >
                      <WebsiteComplianceQueue />
                    </HubCapabilityRoute>
                  }
                />
                <Route
                  path="website-compliance/reports"
                  element={
                    <HubCapabilityRoute capability="wc_view_platform_report">
                      <WebsiteComplianceReports />
                    </HubCapabilityRoute>
                  }
                />
                <Route
                  path="website-compliance/publish/:deploymentId"
                  element={
                    <HubCapabilityRoute
                      anyOf={['wc_publish_live_content', 'wc_manage_deployment_sections']}
                    >
                      <WebsiteCompliancePublish />
                    </HubCapabilityRoute>
                  }
                />
                <Route
                  path="advisor-renewal"
                  element={
                    <HubCapabilityRoute capability="dashboard_manage_advisor_renewal">
                      <AdminAdvisorRenewal />
                    </HubCapabilityRoute>
                  }
                />
                <Route
                  path="subscriber-credits"
                  element={
                    <HubCapabilityRoute capability="dashboard_manage_subscriber_credits">
                      <AdminSubscriberCredits />
                    </HubCapabilityRoute>
                  }
                />
                <Route
                  path="advisor-billing/success"
                  element={
                    <HubCapabilityRoute capability="advisor_excel_import">
                      <AdvisorBillingSuccess />
                    </HubCapabilityRoute>
                  }
                />
                <Route
                  path="settings"
                  element={
                    <HubCapabilityRoute capability="dashboard_manage_settings">
                      <AdminSettings />
                    </HubCapabilityRoute>
                  }
                />
                <Route
                  path="terms"
                  element={
                    <HubCapabilityRoute capability="dashboard_manage_terms">
                      <AdminTerms />
                    </HubCapabilityRoute>
                  }
                />
                <Route
                  path="role-display-names"
                  element={
                    <HubCapabilityRoute capability="dashboard_manage_role_display_names">
                      <AdminRoleDisplayNames />
                    </HubCapabilityRoute>
                  }
                />
                <Route
                  path="compliance-status-display-names"
                  element={
                    <HubCapabilityRoute capability="dashboard_manage_compliance_status_display_names">
                      <AdminComplianceStatusDisplayNames />
                    </HubCapabilityRoute>
                  }
                />
                <Route
                  path="email-templates"
                  element={
                    <HubCapabilityRoute capability="dashboard_manage_email_templates">
                      <AdminEmailTemplates />
                    </HubCapabilityRoute>
                  }
                />
                <Route
                  path="email-templates/:event"
                  element={
                    <HubCapabilityRoute capability="dashboard_manage_email_templates">
                      <AdminEmailTemplateEdit />
                    </HubCapabilityRoute>
                  }
                />
                <Route
                  path="bank-transfers"
                  element={
                    <HubCapabilityRoute capability="dashboard_bank_transfers">
                      <AdminBankTransfers />
                    </HubCapabilityRoute>
                  }
                />

                <Route
                  path="payment-methods"
                  element={
                    <PowerCapabilityRoute capability="pa_manage_payment_methods">
                      <PowerAdminPaymentMethods />
                    </PowerCapabilityRoute>
                  }
                />
                <Route
                  path="users"
                  element={
                    <PowerCapabilityRoute capability="pa_manage_users_roles">
                      <PowerAdminUsers />
                    </PowerCapabilityRoute>
                  }
                />
                <Route
                  path="hubs"
                  element={
                    <PowerCapabilityRoute capability="pa_manage_hubs">
                      <PowerAdminHubs />
                    </PowerCapabilityRoute>
                  }
                />
                <Route
                  path="hubs/:hubId"
                  element={
                    <PowerCapabilityRoute capability="pa_manage_hubs">
                      <PowerAdminHubDetail />
                    </PowerCapabilityRoute>
                  }
                />
                <Route
                  path="checklist"
                  element={
                    <PowerCapabilityRoute capability="pa_manage_hub_checklists">
                      <PowerAdminChecklist />
                    </PowerCapabilityRoute>
                  }
                />
                <Route
                  path="modules"
                  element={
                    <HubCapabilityRoute capability="dashboard_manage_modules">
                      <PowerAdminModules />
                    </HubCapabilityRoute>
                  }
                />
                <Route
                  path="module-pricing"
                  element={
                    <HubCapabilityRoute capability="dashboard_manage_module_pricing">
                      <AdminModulePricing />
                    </HubCapabilityRoute>
                  }
                />
                <Route
                  path="module-invoices"
                  element={
                    <HubCapabilityRoute capability="dashboard_view_module_invoices">
                      <AdminModuleInvoices />
                    </HubCapabilityRoute>
                  }
                />
                <Route
                  path="module-invoices/:id"
                  element={
                    <HubCapabilityRoute capability="dashboard_view_module_invoices">
                      <InvoiceDetail />
                    </HubCapabilityRoute>
                  }
                />
                <Route
                  path="capabilities"
                  element={
                    <PowerCapabilityRoute capability="pa_manage_power_capabilities">
                      <PowerAdminCapabilities />
                    </PowerCapabilityRoute>
                  }
                />
              </Route>
            </Route>

            {/* Legacy URLs → universal dashboard */}
            <Route path="my-purchases" element={<Navigate to="/my-dashboard/purchases" replace />} />
            <Route path="my-invoices" element={<Navigate to="/my-dashboard/my-invoices" replace />} />
            <Route path="invoices/:id" element={<LegacyInvoiceRedirect />} />
            <Route path="client-admin" element={<Navigate to="/my-dashboard" replace />} />
            <Route
              path="client-admin/*"
              element={<LegacyShellRedirect toPrefix="/my-dashboard" />}
            />
            <Route path="power-admin" element={<Navigate to="/my-dashboard" replace />} />
            <Route path="power-admin/hubs/:hubId" element={<LegacyHubRedirect />} />
            <Route
              path="power-admin/*"
              element={<LegacyShellRedirect toPrefix="/my-dashboard" />}
            />
            <Route path="admin/*" element={<Navigate to="/my-dashboard" replace />} />

            {/* Shared auth */}
            <Route path="login" element={<Login />} />
            <Route path="register" element={<Register />} />
            <Route path="forgot-password" element={<ForgotPassword />} />
            <Route path="reset-password" element={<ResetPassword />} />
            <Route path="verify-email" element={<VerifyEmail />} />
            <Route path="client-admin/login" element={<Navigate to="/login" replace />} />
            <Route path="power-admin/login" element={<Navigate to="/login" replace />} />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
            </Suspense>
        </BrowserRouter>
        </TermsGate>
        </AppBootGate>
      </HubProvider>
    </AuthProvider>
  )
}
