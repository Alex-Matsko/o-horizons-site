import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.jsx';
import { LayoutDashboard, Clock, Users, Database, ArrowLeft, LogOut } from 'lucide-react';

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => { await logout(); navigate('/login'); };

  const navClass = ({ isActive }) =>
    `flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
      isActive
        ? 'bg-teal-500/15 text-teal-400'
        : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'
    }`;

  const initials = (user?.email || 'A').slice(0, 2).toUpperCase();

  return (
    <div className="flex min-h-screen bg-[#0f0e0d]">
      {/* Сайдбар */}
      <aside className="w-56 shrink-0 flex flex-col bg-[#141312] border-r border-white/8 py-5">
        {/* Логотип */}
        <div className="flex items-center gap-2.5 px-4 pb-5 border-b border-white/8">
          <div className="w-7 h-7 rounded-lg bg-red-500/20 flex items-center justify-center shrink-0">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M2 2h10v10H2z" stroke="#f87171" strokeWidth="1.5" strokeLinejoin="round"/>
              <path d="M5 7h4M7 5v4" stroke="#f87171" strokeWidth="1.3" strokeLinecap="round"/>
            </svg>
          </div>
          <div>
            <div className="text-sm font-bold text-white leading-none">Администратор</div>
            <div className="text-[10px] text-gray-500 mt-0.5 uppercase tracking-wider">O-Horizons</div>
          </div>
        </div>

        {/* Профиль */}
        <div className="px-4 pt-4 pb-2">
          <div className="flex items-center gap-2 bg-white/5 rounded-lg px-3 py-2">
            <div className="w-6 h-6 rounded-md bg-red-500/20 text-red-400 text-[10px] font-bold flex items-center justify-center shrink-0">
              {initials}
            </div>
            <div className="min-w-0">
              <div className="text-xs font-medium text-gray-200 truncate">{user?.org_name || user?.email || 'Admin'}</div>
              <div className="text-[10px] text-red-400">Администратор</div>
            </div>
          </div>
        </div>

        {/* Навигация */}
        <nav className="flex-1 px-3 py-2 space-y-0.5">
          <div className="text-[10px] font-semibold text-gray-600 uppercase tracking-widest px-3 pt-2 pb-1">ПАНЕЛЬ</div>
          <NavLink to="/admin" end className={navClass}><LayoutDashboard size={15} />Дашборд</NavLink>
          <NavLink to="/admin/requests" className={navClass}><Clock size={15} />Заявки</NavLink>
          <div className="text-[10px] font-semibold text-gray-600 uppercase tracking-widest px-3 pt-4 pb-1">ДАННЫЕ</div>
          <NavLink to="/admin/tenants" className={navClass}><Users size={15} />Клиенты</NavLink>
          <NavLink to="/admin/databases" className={navClass}><Database size={15} />Базы</NavLink>
        </nav>

        {/* Нижние кнопки */}
        <div className="px-3 pb-4 border-t border-white/8 pt-3 space-y-1">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-500 hover:text-gray-200 hover:bg-white/5 rounded-lg transition-colors"
          >
            <ArrowLeft size={14} />К порталу
          </button>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
          >
            <LogOut size={14} />Выйти
          </button>
        </div>
      </aside>

      {/* Контент */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="flex items-center justify-between px-6 py-3 border-b border-white/8 bg-[#0f0e0d] shrink-0">
          <span className="text-sm text-gray-500">Панель управления</span>
          <NavLink to="/dashboard" className="text-xs text-gray-500 hover:text-gray-300 transition-colors">← К порталу</NavLink>
        </header>
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
