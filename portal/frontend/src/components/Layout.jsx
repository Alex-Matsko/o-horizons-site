import { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.jsx';
import {
  LayoutDashboard, Database, Archive, User,
  LogOut, Settings, Bell, Menu, X
} from 'lucide-react';

const NAV = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Панель управления', group: 'ОБЗОР' },
  { to: '/databases',  icon: Database,        label: 'Мои базы',           group: null },
  { to: '/backups',    icon: Archive,          label: 'Резервные копии',    group: null },
  { to: '/profile',   icon: User,             label: 'Настройки',          group: 'АККАУНТ' },
  { to: '/tariffs',   icon: Settings,         label: 'Тариф и лимиты',     group: null },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const initials = (user?.email || 'U').slice(0, 2).toUpperCase();
  const orgName  = user?.org_name || user?.email || '';

  const handleLogout = async () => { await logout(); navigate('/login'); };

  const navClass = ({ isActive }) =>
    `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
      isActive
        ? 'bg-teal-500/15 text-teal-400'
        : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'
    }`;

  const SidebarContent = () => {
    let lastGroup = null;
    return (
      <>
        <div className="flex items-center gap-2.5 px-4 pb-5 border-b border-white/8">
          <div className="w-7 h-7 rounded-lg bg-teal-500 flex items-center justify-center shrink-0">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="8" r="5.5" stroke="white" strokeWidth="1.5"/>
              <path d="M8 3v10M3 8h10" stroke="white" strokeWidth="1.3" strokeLinecap="round"/>
            </svg>
          </div>
          <div>
            <div className="text-sm font-bold text-white leading-none">O-Horizons / 1С</div>
            <div className="text-[10px] text-gray-500 mt-0.5 uppercase tracking-wider">ПОРТАЛ</div>
          </div>
        </div>

        <div className="px-4 pt-4 pb-2">
          <div className="flex items-center gap-2 bg-white/5 rounded-lg px-3 py-2">
            <div className="w-6 h-6 rounded-md bg-teal-500/20 text-teal-400 text-[10px] font-bold flex items-center justify-center shrink-0">
              {initials}
            </div>
            <div className="min-w-0">
              <div className="text-xs font-medium text-gray-200 truncate">{orgName}</div>
              <div className="text-[10px] text-gray-500">Тариф: <span className="text-teal-400">{user?.tariff?.name || 'Не выбран'}</span></div>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-3 py-2 space-y-0.5 overflow-y-auto">
          {NAV.map(item => {
            const showGroup = item.group && item.group !== lastGroup;
            lastGroup = item.group || lastGroup;
            return (
              <div key={item.to}>
                {showGroup && (
                  <div className="text-[10px] font-semibold text-gray-600 uppercase tracking-widest px-3 pt-4 pb-1">
                    {item.group}
                  </div>
                )}
                <NavLink to={item.to} className={navClass} onClick={() => setMobileOpen(false)}>
                  <item.icon size={15} />
                  {item.label}
                </NavLink>
              </div>
            );
          })}
          {user?.role === 'admin' && (
            <NavLink to="/admin" className={navClass} onClick={() => setMobileOpen(false)}>
              <Settings size={15} />Администратор
            </NavLink>
          )}
        </nav>

        <div className="px-3 pb-4 border-t border-white/8 pt-3">
          <button
            onClick={handleLogout}
            className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
          >
            <LogOut size={14} />Выйти
          </button>
        </div>
      </>
    );
  };

  return (
    <div className="flex min-h-screen bg-[#0f0e0d]">
      <aside className="hidden lg:flex w-56 shrink-0 flex-col bg-[#141312] border-r border-white/8 py-5">
        <SidebarContent />
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setMobileOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-64 bg-[#141312] border-r border-white/8 py-5 flex flex-col z-50">
            <SidebarContent />
          </aside>
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0">
        <header className="flex items-center justify-between px-6 py-3 border-b border-white/8 bg-[#0f0e0d] shrink-0">
          <button
            className="lg:hidden text-gray-400 hover:text-white transition-colors"
            onClick={() => setMobileOpen(v => !v)}
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <div className="hidden lg:block" />
          <div className="flex items-center gap-3">
            <button className="text-gray-500 hover:text-gray-200 transition-colors">
              <Bell size={18} />
            </button>
            <NavLink to="/profile" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <div className="w-7 h-7 rounded-full bg-teal-500/20 text-teal-400 text-xs font-bold flex items-center justify-center">
                {initials}
              </div>
              <span className="hidden sm:block text-sm text-gray-300 max-w-[160px] truncate">{orgName}</span>
            </NavLink>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
