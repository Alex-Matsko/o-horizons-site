import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth.jsx';
import { useEffect } from 'react';

import Layout from './components/Layout.jsx';
import AdminLayout from './components/AdminLayout.jsx';

import LoginPage from './pages/LoginPage.jsx';
import RegisterPage from './pages/RegisterPage.jsx';
import VerifyEmailPage from './pages/VerifyEmailPage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import DatabasesPage from './pages/DatabasesPage.jsx';
import RequestDatabasePage from './pages/RequestDatabasePage.jsx';
import BackupsPage from './pages/BackupsPage.jsx';
import ProfilePage from './pages/ProfilePage.jsx';
import TariffsPage from './pages/TariffsPage.jsx';
import DatabaseUsersPage from './pages/DatabaseUsersPage.jsx';

import AdminDashboardPage from './pages/AdminDashboardPage.jsx';
import AdminRequestsPage from './pages/admin/AdminRequestsPage.jsx';
import AdminTenantsPage from './pages/admin/AdminTenantsPage.jsx';
import AdminDatabasesPage from './pages/admin/AdminDatabasesPage.jsx';

function PrivateRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="flex items-center justify-center h-screen bg-[#0f0e0d]">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-teal-500" />
    </div>
  );
  return user ? children : <Navigate to="/login" replace />;
}

function AdminRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  return user?.role === 'admin' ? children : <Navigate to="/dashboard" replace />;
}

function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center h-screen bg-[#0f0e0d] text-center px-4">
      <div className="text-5xl font-bold text-white mb-2">404</div>
      <div className="text-gray-400 mb-6">Страница не найдена</div>
      <a href="/dashboard" className="text-teal-400 hover:text-teal-300 text-sm font-medium transition-colors">
        ← Вернуться на главную
      </a>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/verify-email" element={<VerifyEmailPage />} />
      <Route path="/" element={<Navigate to="/dashboard" replace />} />

      {/* Client area */}
      <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="databases" element={<DatabasesPage />} />
        <Route path="databases/request" element={<RequestDatabasePage />} />
        <Route path="databases/:id/users" element={<DatabaseUsersPage />} />
        <Route path="backups" element={<BackupsPage />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="tariffs" element={<TariffsPage />} />
      </Route>

      {/* Admin area */}
      <Route path="/admin" element={<AdminRoute><AdminLayout /></AdminRoute>}>
        <Route index element={<AdminDashboardPage />} />
        <Route path="requests" element={<AdminRequestsPage />} />
        <Route path="tenants" element={<AdminTenantsPage />} />
        <Route path="databases" element={<AdminDatabasesPage />} />
      </Route>

      {/* 404 */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
