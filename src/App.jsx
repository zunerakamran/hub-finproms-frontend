import { BrowserRouter, Navigate, Outlet, Route, Routes, useLocation, useParams } from 'react-router-dom'
import HubCapabilityRoute from './components/HubCapabilityRoute'
import Layout from './components/Layout'
import MyDashboardLayout from './components/MyDashboardLayout'
import PowerCapabilityRoute from './components/PowerCapabilityRoute'
import { ProtectedRoute } from './components/ProtectedRoute'
import { AuthProvider } from './context/AuthContext'
import { HubProvider } from './context/HubContext'
import AppBootGate from './components/AppBootGate'
import AdminBankTransfers from './pages/AdminBankTransfers'
import AdminAdvisors from './pages/AdminAdvisors'
import AdminActivityLogs from './pages/AdminActivityLogs'
import AdminAdvisorInvoices from './pages/AdminAdvisorInvoices'
import AdminAdvisorPricing from './pages/AdminAdvisorPricing'
import AdminAdvisorRenewal from './pages/AdminAdvisorRenewal'
import AdminSubscriberCredits from './pages/AdminSubscriberCredits'
import AdminBundles from './pages/AdminBundles'
import AdminCategories from './pages/AdminCategories'
import AdminPaymentCard from './pages/AdminPaymentCard'
import AdminPaymentCardSuccess from './pages/AdminPaymentCardSuccess'
import AdminPlans from './pages/AdminPlans'
import AdminPosts from './pages/AdminPosts'
import AdminSettings from './pages/AdminSettings'
import AdminTags from './pages/AdminTags'
import AdminTypes from './pages/AdminTypes'
import AdvisorBillingSuccess from './pages/AdvisorBillingSuccess'
import BankTransferPending from './pages/BankTransferPending'
import BundleDetail from './pages/BundleDetail'
import Bundles from './pages/Bundles'
import ContentPurchaseSuccess from './pages/ContentPurchaseSuccess'
import SocialMediaComplianceMyRequests from './pages/SocialMediaComplianceMyRequests'
import SocialMediaComplianceQueue from './pages/SocialMediaComplianceQueue'
import SocialMediaComplianceReports from './pages/SocialMediaComplianceReports'
import SocialMediaComplianceRequestDetail from './pages/SocialMediaComplianceRequestDetail'
import SocialMediaComplianceSubmit from './pages/SocialMediaComplianceSubmit'
import GeneralComplianceMyRequests from './pages/GeneralComplianceMyRequests'
import GeneralComplianceQueue from './pages/GeneralComplianceQueue'
import GeneralComplianceReports from './pages/GeneralComplianceReports'
import GeneralComplianceRequestDetail from './pages/GeneralComplianceRequestDetail'
import GeneralComplianceSubmit from './pages/GeneralComplianceSubmit'
import WebsiteComplianceDeployments from './pages/WebsiteComplianceDeployments'
import WebsiteComplianceHome from './pages/WebsiteComplianceHome'
import WebsiteCompliancePublish from './pages/WebsiteCompliancePublish'
import WebsiteComplianceQueue from './pages/WebsiteComplianceQueue'
import WebsiteComplianceReports from './pages/WebsiteComplianceReports'
import WebsiteComplianceRequestSite from './pages/WebsiteComplianceRequestSite'
import WebsiteComplianceMySites from './pages/WebsiteComplianceMySites'
import WebsiteComplianceContentEditor from './pages/WebsiteComplianceContentEditor'
import WebsiteComplianceMyRequests from './pages/WebsiteComplianceMyRequests'
import WebsiteComplianceAssignRequests from './pages/WebsiteComplianceAssignRequests'
import WebsiteComplianceReviewQueue from './pages/WebsiteComplianceReviewQueue'
import WebsiteComplianceRequestHistory from './pages/WebsiteComplianceRequestHistory'
import InvoiceDetail from './pages/InvoiceDetail'
import Login from './pages/Login'
import MyCredits from './pages/MyCredits'
import MyDashboard from './pages/MyDashboard'
import MyInvoices from './pages/MyInvoices'
import MyPurchases from './pages/MyPurchases'
import MySubscription from './pages/MySubscription'
import PostDetail from './pages/PostDetail'
import Posts from './pages/Posts'
import PowerAdminCapabilities from './pages/PowerAdminCapabilities'
import PowerAdminChecklist from './pages/PowerAdminChecklist'
import PowerAdminModules from './pages/PowerAdminModules'
import PowerAdminHubDetail from './pages/PowerAdminHubDetail'
import PowerAdminHubs from './pages/PowerAdminHubs'
import PowerAdminPaymentMethods from './pages/PowerAdminPaymentMethods'
import PowerAdminUsers from './pages/PowerAdminUsers'
import Register from './pages/Register'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'
import SubscriptionDetail from './pages/SubscriptionDetail'
import SubscriptionSuccess from './pages/SubscriptionSuccess'
import Subscriptions from './pages/Subscriptions'
import './App.css'
import './shell.css'

function LegacyInvoiceRedirect() {
  const { id } = useParams()
  return <Navigate to={`/my-dashboard/invoices/${id}`} replace />
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
          <BrowserRouter>
            <Routes>
            {/* Member catalog — login required */}
            <Route
              element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Posts />} />
              <Route path="posts/:id" element={<PostDetail />} />
              <Route path="bundles" element={<Bundles />} />
              <Route path="bundles/:id" element={<BundleDetail />} />
              <Route path="subscriptions" element={<Subscriptions />} />
              <Route path="subscriptions/success" element={<SubscriptionSuccess />} />
              <Route path="subscriptions/bank-transfer" element={<BankTransferPending />} />
              <Route
                path="purchases/success"
                element={
                  <ProtectedRoute>
                    <ContentPurchaseSuccess />
                  </ProtectedRoute>
                }
              />
              <Route path="subscriptions/:id" element={<SubscriptionDetail />} />
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
                  path="invoices"
                  element={
                    <HubCapabilityRoute capability="general_show_invoices">
                      <MyInvoices />
                    </HubCapabilityRoute>
                  }
                />
                <Route
                  path="invoices/:id"
                  element={
                    <HubCapabilityRoute
                      anyOf={['general_show_invoices', 'dashboard_view_advisor_invoices']}
                    >
                      <InvoiceDetail />
                    </HubCapabilityRoute>
                  }
                />

                <Route
                  path="posts"
                  element={
                    <HubCapabilityRoute capability="dashboard_manage_posts">
                      <AdminPosts />
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
                    <HubCapabilityRoute capability="dashboard_manage_types">
                      <AdminTypes />
                    </HubCapabilityRoute>
                  }
                />
                <Route
                  path="categories"
                  element={
                    <HubCapabilityRoute capability="dashboard_manage_categories">
                      <AdminCategories />
                    </HubCapabilityRoute>
                  }
                />
                <Route
                  path="tags"
                  element={
                    <HubCapabilityRoute capability="dashboard_manage_tags">
                      <AdminTags />
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
                    <HubCapabilityRoute anyOf={['advisor_excel_import', 'advisor_discontinue']}>
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
                  path="activity-logs"
                  element={
                    <HubCapabilityRoute capability="dashboard_view_activity_logs">
                      <AdminActivityLogs />
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
                      anyOf={['smc_view_all_requests', 'smc_assign_requests', 'smc_review_requests']}
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
                  path="general-compliance/queue"
                  element={
                    <HubCapabilityRoute
                      anyOf={['gc_view_all_requests', 'gc_assign_requests', 'gc_review_requests']}
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
                      ]}
                    >
                      <GeneralComplianceRequestDetail />
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
                        'wc_view_all_deployments',
                        'wc_publish_live_content',
                        'wc_deploy_websites',
                        'wc_manage_templates',
                        'wc_manage_deployment_sections',
                        'wc_assign_change_requests',
                        'wc_view_all_change_requests',
                        'wc_review_change_requests',
                      ]}
                    >
                      <WebsiteComplianceHome />
                    </HubCapabilityRoute>
                  }
                />
                <Route
                  path="website-compliance/request-site"
                  element={
                    <HubCapabilityRoute capability="wc_request_deployments">
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
                        'wc_publish_live_content',
                      ]}
                    >
                      <WebsiteComplianceMySites />
                    </HubCapabilityRoute>
                  }
                />
                <Route
                  path="website-compliance/content-editor"
                  element={
                    <HubCapabilityRoute
                      anyOf={['wc_edit_sections', 'wc_submit_change_requests', 'wc_publish_live_content']}
                    >
                      <WebsiteComplianceContentEditor />
                    </HubCapabilityRoute>
                  }
                />
                <Route
                  path="website-compliance/my-requests"
                  element={
                    <HubCapabilityRoute
                      anyOf={['wc_submit_change_requests', 'wc_edit_sections', 'wc_publish_live_content']}
                    >
                      <WebsiteComplianceMyRequests />
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
                        'wc_manage_deployment_sections',
                        'wc_assign_change_requests',
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
                    <HubCapabilityRoute
                      anyOf={['wc_review_change_requests', 'wc_view_all_change_requests']}
                    >
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
                  path="advisor-pricing"
                  element={
                    <HubCapabilityRoute capability="dashboard_manage_advisor_pricing">
                      <AdminAdvisorPricing />
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
            <Route path="my-invoices" element={<Navigate to="/my-dashboard/invoices" replace />} />
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
            <Route path="client-admin/login" element={<Navigate to="/login" replace />} />
            <Route path="power-admin/login" element={<Navigate to="/login" replace />} />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
        </AppBootGate>
      </HubProvider>
    </AuthProvider>
  )
}
