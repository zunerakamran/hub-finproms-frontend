import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import { ProtectedRoute } from './components/ProtectedRoute'
import { AuthProvider } from './context/AuthContext'
import AdminBankTransfers from './pages/AdminBankTransfers'
import AdminCategories from './pages/AdminCategories'
import AdminDashboard from './pages/AdminDashboard'
import AdminPlans from './pages/AdminPlans'
import AdminPosts from './pages/AdminPosts'
import AdminSettings from './pages/AdminSettings'
import AdminTags from './pages/AdminTags'
import BankTransferPending from './pages/BankTransferPending'
import Login from './pages/Login'
import MyPurchases from './pages/MyPurchases'
import PostDetail from './pages/PostDetail'
import Posts from './pages/Posts'
import Register from './pages/Register'
import SubscriptionSuccess from './pages/SubscriptionSuccess'
import Subscriptions from './pages/Subscriptions'
import './App.css'

function ClientAdminRoute({ children }) {
  return <ProtectedRoute clientAdminOnly>{children}</ProtectedRoute>
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<Posts />} />
            <Route path="posts/:id" element={<PostDetail />} />
            <Route path="subscriptions" element={<Subscriptions />} />
            <Route path="login" element={<Login />} />
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
              path="client-admin"
              element={
                <ClientAdminRoute>
                  <AdminDashboard />
                </ClientAdminRoute>
              }
            />
            <Route
              path="client-admin/posts"
              element={
                <ClientAdminRoute>
                  <AdminPosts />
                </ClientAdminRoute>
              }
            />
            <Route
              path="client-admin/types"
              element={
                <ClientAdminRoute>
                  <AdminCategories />
                </ClientAdminRoute>
              }
            />
            <Route
              path="client-admin/categories"
              element={<Navigate to="/client-admin/types" replace />}
            />
            <Route
              path="client-admin/tags"
              element={
                <ClientAdminRoute>
                  <AdminTags />
                </ClientAdminRoute>
              }
            />
            <Route
              path="client-admin/plans"
              element={
                <ClientAdminRoute>
                  <AdminPlans />
                </ClientAdminRoute>
              }
            />
            <Route
              path="client-admin/settings"
              element={
                <ClientAdminRoute>
                  <AdminSettings />
                </ClientAdminRoute>
              }
            />
            <Route
              path="client-admin/bank-transfers"
              element={
                <ClientAdminRoute>
                  <AdminBankTransfers />
                </ClientAdminRoute>
              }
            />
            {/* Legacy /admin redirects */}
            <Route path="admin/*" element={<Navigate to="/client-admin" replace />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
