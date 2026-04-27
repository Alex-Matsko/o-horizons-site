import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.jsx';
import { Database, LayoutDashboard, Archive, User, LogOut, Settings } from 'lucide-react';

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const navClass = ({ isActive }) =>
    `flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
      isActive ? 'bg-primary text-white' : 'text-gray-600 hover:bg-gray-100'
    }`;

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="w-60 bg-white border-r border-gray-100 flex flex-col py-6 px-4 shrink-0">
        <div className="mb-8 px-3">
          <span className="font-bold text-primary text-lg">1С Портал</span>
          <div className="text-xs text-gray-400 mt-0.5">O-Horizons</div>
        </div>
        <nav className="flex flex-col gap-1 flex-1">
          <NavLink to="/dashboard" className={navClass}><LayoutDashboard size={16} />Главная</NavLink>
          <NavLink to="/databases" className={navClass}><Database size={16} />Базы 1С</NavLink>
          <NavLink to="/backups" className={navClass}><Archive size={16} />Бекапы</NavLink>
          <NavLink to="/profile" className={navClass}><User size={16} />Профиль</NavLink>
          {user?.role === 'admin' && (
            <NavLink to="/admin" className={navClass}><Settings size={16} />Админ</NavLink>
          )}
        </nav>
        <div className="border-t border-gray-100 pt-4 mt-4">
          <div className="text-xs text-gray-500 px-3 mb-2 truncate">{user?.email}</div>
          <button onClick={handleLogout} className="flex items-center gap-2 px-3 py-2 text-sm text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg w-full transition-colors">
            <LogOut size={14} />Выйти
          </button>
        </div>
      </aside>
      {/* Main */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
