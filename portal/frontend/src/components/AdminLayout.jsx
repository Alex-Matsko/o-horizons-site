import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.jsx';
import { LayoutDashboard, Clock, Users, Database, LogOut } from 'lucide-react';

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const navClass = ({ isActive }) =>
    `flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
      isActive ? 'bg-primary text-white' : 'text-gray-600 hover:bg-gray-100'
    }`;

  return (
    <div className="flex min-h-screen">
      <aside className="w-60 bg-white border-r border-gray-100 flex flex-col py-6 px-4 shrink-0">
        <div className="mb-8 px-3">
          <span className="font-bold text-red-600 text-lg">Админпанель</span>
          <div className="text-xs text-gray-400">1С Портал</div>
        </div>
        <nav className="flex flex-col gap-1 flex-1">
          <NavLink to="/admin" end className={navClass}><LayoutDashboard size={16} />Дашборд</NavLink>
          <NavLink to="/admin/requests" className={navClass}><Clock size={16} />Заявки</NavLink>
          <NavLink to="/admin/tenants" className={navClass}><Users size={16} />Клиенты</NavLink>
          <NavLink to="/admin/databases" className={navClass}><Database size={16} />Базы</NavLink>
        </nav>
        <div className="border-t border-gray-100 pt-4 mt-4">
          <button onClick={() => navigate('/dashboard')} className="flex items-center gap-2 px-3 py-2 text-sm text-gray-500 hover:bg-gray-100 rounded-lg w-full">
            ← К порталу
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
