import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom'
import ClientAdminLayout from './components/ClientAdminLayout'
import Layout from './components/Layout'
import PowerAdminLayout from './components/PowerAdminLayout'
import { ProtectedRoute } from './components/ProtectedRoute'
import { AuthProvider, useAuth } from './context/AuthContext'
import AdminBankTransfers from './pages/AdminBankTransfers'
import AdminCategories from './pages/AdminCategories'
import AdminDashboard from './pages/AdminDashboard'
import AdminLogin from './pages/AdminLogin'
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
import PowerAdminDashboard from './pages/PowerAdminDashboard'
import PowerAdminPlaceholder from './pages/PowerAdminPlaceholder'
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
      <BrowserRouter>
        <Routes>
          {/* Member application */}
          <Route element={<Layout />}>
            <Route index element={<Posts />} />
            <Route path="posts/:id" element={<PostDetail />} />
            <Route path="subscriptions" element={<Subscriptions />} />
            <Route path="register" element={<Register />} />
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
            <Route path="login" element={<Login />} />
          </Route>

          {/* Client Admin — separate shell */}
          <Route path="client-admin/login" element={<AdminLogin portal="client" />} />
          <Route element={<ClientAdminRoute />}>
            <Route path="client-admin" element={<ClientAdminLayout />}>
              <Route index element={<AdminDashboard />} />
              <Route path="posts" element={<AdminPosts />} />
              <Route path="types" element={<AdminTypes />} />
              <Route path="categories" element={<AdminCategories />} />
              <Route path="tags" element={<AdminTags />} />
              <Route path="plans" element={<AdminPlans />} />
              <Route path="settings" element={<AdminSettings />} />
              <Route path="bank-transfers" element={<AdminBankTransfers />} />
            </Route>
          </Route>

          {/* Power Admin — separate shell */}
          <Route path="power-admin/login" element={<AdminLogin portal="power" />} />
          <Route element={<PowerAdminRoute />}>
            <Route path="power-admin" element={<PowerAdminLayout />}>
              <Route index element={<PowerAdminDashboard />} />
              <Route
                path="hubs"
                element={
                  <PowerAdminPlaceholder
                    title="White-label hubs"
                    description="Register and manage white-labelled hubs from the shared platform."
                  />
                }
              />
              <Route
                path="checklist"
                element={
                  <PowerAdminPlaceholder
                    title="Rights checklist"
                    description="Configure permissions and feature behaviour per white-labelled hub."
                  />
                }
              />
            </Route>
          </Route>

          <Route path="admin/*" element={<Navigate to="/client-admin" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
