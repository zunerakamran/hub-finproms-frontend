import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom'
import ClientAdminLayout from './components/ClientAdminLayout'
import HubCapabilityRoute from './components/HubCapabilityRoute'
import Layout from './components/Layout'
import PowerAdminLayout from './components/PowerAdminLayout'
import { ProtectedRoute } from './components/ProtectedRoute'
import { AuthProvider } from './context/AuthContext'
import { HubProvider } from './context/HubContext'
import AdminBankTransfers from './pages/AdminBankTransfers'
import AdminAdvisors from './pages/AdminAdvisors'
import AdminCategories from './pages/AdminCategories'
import AdminDashboard from './pages/AdminDashboard'
import AdminPlans from './pages/AdminPlans'
import AdminPosts from './pages/AdminPosts'
import AdminSettings from './pages/AdminSettings'
import AdminTags from './pages/AdminTags'
import AdminTypes from './pages/AdminTypes'
import BankTransferPending from './pages/BankTransferPending'
import InvoiceDetail from './pages/InvoiceDetail'
import Login from './pages/Login'
import MyInvoices from './pages/MyInvoices'
import MyPurchases from './pages/MyPurchases'
import PostDetail from './pages/PostDetail'
import Posts from './pages/Posts'
import PowerAdminCapabilities from './pages/PowerAdminCapabilities'
import PowerAdminChecklist from './pages/PowerAdminChecklist'
import PowerAdminDashboard from './pages/PowerAdminDashboard'
import PowerAdminHubDetail from './pages/PowerAdminHubDetail'
import PowerAdminHubs from './pages/PowerAdminHubs'
import PowerAdminPaymentMethods from './pages/PowerAdminPaymentMethods'
import Register from './pages/Register'
import SubscriptionSuccess from './pages/SubscriptionSuccess'
import Subscriptions from './pages/Subscriptions'
import './App.css'

function ClientAdminRoute() {
  return (
    <ProtectedRoute clientAdminOnly>
      <Outlet />
    </ProtectedRoute>
  )
}

function PowerAdminRoute() {
  return (
    <ProtectedRoute powerAdminOnly>
      <Outlet />
    </ProtectedRoute>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <HubProvider>
        <BrowserRouter>
          <Routes>
            {/* Member application */}
            <Route element={<Layout />}>
              <Route index element={<Posts />} />
              <Route path="posts/:id" element={<PostDetail />} />
              <Route path="subscriptions" element={<Subscriptions />} />
              <Route
                path="subscriptions/success"
                element={
                  <ProtectedRoute>
                    <SubscriptionSuccess />
                  </ProtectedRoute>
                }
              />
              <Route
                path="subscriptions/bank-transfer"
                element={
                  <ProtectedRoute>
                    <BankTransferPending />
                  </ProtectedRoute>
                }
              />
              <Route
                path="my-purchases"
                element={
                  <ProtectedRoute>
                    <MyPurchases />
                  </ProtectedRoute>
                }
              />
              <Route
                path="my-invoices"
                element={
                  <ProtectedRoute>
                    <MyInvoices />
                  </ProtectedRoute>
                }
              />
              <Route
                path="invoices/:id"
                element={
                  <ProtectedRoute>
                    <InvoiceDetail />
                  </ProtectedRoute>
                }
              />
            </Route>

            {/* Shared auth */}
            <Route path="login" element={<Login />} />
            <Route path="register" element={<Register />} />
            <Route path="client-admin/login" element={<Navigate to="/login" replace />} />
            <Route path="power-admin/login" element={<Navigate to="/login" replace />} />

            {/* Client Admin — separate shell */}
            <Route element={<ClientAdminRoute />}>
              <Route path="client-admin" element={<ClientAdminLayout />}>
                <Route index element={<AdminDashboard />} />
                <Route
                  path="posts"
                  element={
                    <HubCapabilityRoute capability="dashboard_manage_posts">
                      <AdminPosts />
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
                    <HubCapabilityRoute capability="advisor_excel_import">
                      <AdminAdvisors />
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
              </Route>
            </Route>

            {/* Power Admin — separate shell */}
            <Route element={<PowerAdminRoute />}>
              <Route path="power-admin" element={<PowerAdminLayout />}>
                <Route index element={<PowerAdminDashboard />} />
                <Route path="payment-methods" element={<PowerAdminPaymentMethods />} />
                <Route path="hubs" element={<PowerAdminHubs />} />
                <Route path="hubs/:hubId" element={<PowerAdminHubDetail />} />
                <Route path="checklist" element={<PowerAdminChecklist />} />
                <Route path="capabilities" element={<PowerAdminCapabilities />} />
                <Route
                  path="advisors"
                  element={
                    <HubCapabilityRoute capability="advisor_excel_import" fallback="/power-admin">
                      <AdminAdvisors shell="power-admin" />
                    </HubCapabilityRoute>
                  }
                />
              </Route>
            </Route>

            <Route path="admin/*" element={<Navigate to="/client-admin" replace />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </HubProvider>
    </AuthProvider>
  )
}
