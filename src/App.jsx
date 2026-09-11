import { BrowserRouter, Navigate, Outlet, Route, Routes, useLocation, useParams } from 'react-router-dom'
import HubCapabilityRoute from './components/HubCapabilityRoute'
import Layout from './components/Layout'
import MyDashboardLayout from './components/MyDashboardLayout'
import PowerCapabilityRoute from './components/PowerCapabilityRoute'
import { ProtectedRoute } from './components/ProtectedRoute'
import { AuthProvider } from './context/AuthContext'
import { HubProvider } from './context/HubContext'
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
import AdminPushContent from './pages/AdminPushContent'
import AdminSettings from './pages/AdminSettings'
import AdminTags from './pages/AdminTags'
import AdminTypes from './pages/AdminTypes'
import AdvisorBillingSuccess from './pages/AdvisorBillingSuccess'
import BankTransferPending from './pages/BankTransferPending'
import BundleDetail from './pages/BundleDetail'
import Bundles from './pages/Bundles'
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
                    <HubCapabilityRoute capability="general_show_invoices">
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
                  path="push-content"
                  element={
                    <HubCapabilityRoute capability="dashboard_push_content">
                      <AdminPushContent />
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
                <Route path="payment-card" element={<AdminPaymentCard />} />
                <Route path="payment-card/success" element={<AdminPaymentCardSuccess />} />
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
      </HubProvider>
    </AuthProvider>
  )
}
