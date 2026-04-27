import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth.jsx';

import Layout from './components/Layout.jsx';
import LoginPage from './pages/LoginPage.jsx';
import RegisterPage from './pages/RegisterPage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import DatabasesPage from './pages/DatabasesPage.jsx';
import RequestDatabasePage from './pages/RequestDatabasePage.jsx';
import BackupsPage from './pages/BackupsPage.jsx';
import ProfilePage from './pages/ProfilePage.jsx';
import AdminLayout from './components/AdminLayout.jsx';
import AdminDashboardPage from './pages/admin/AdminDashboardPage.jsx';
import AdminRequestsPage from './pages/admin/AdminRequestsPage.jsx';
import AdminTenantsPage from './pages/admin/AdminTenantsPage.jsx';
import AdminDatabasesPage from './pages/admin/AdminDatabasesPage.jsx';

function PrivateRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex items-center justify-center h-screen text-gray-400">...</div>;
  return user ? children : <Navigate to="/login" replace />;
}

function AdminRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  return user?.role === 'admin' ? children : <Navigate to="/dashboard" replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/" element={<Navigate to="/dashboard" replace />} />

      <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="databases" element={<DatabasesPage />} />
        <Route path="databases/request" element={<RequestDatabasePage />} />
        <Route path="backups" element={<BackupsPage />} />
        <Route path="profile" element={<ProfilePage />} />
      </Route>

      <Route path="/admin" element={<AdminRoute><AdminLayout /></AdminRoute>}>
        <Route index element={<AdminDashboardPage />} />
        <Route path="requests" element={<AdminRequestsPage />} />
        <Route path="tenants" element={<AdminTenantsPage />} />
        <Route path="databases" element={<AdminDatabasesPage />} />
      </Route>
    </Routes>
  );
}
