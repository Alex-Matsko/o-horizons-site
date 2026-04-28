import { useEffect, useState } from 'react';
import { api } from '../../lib/api.js';

export default function AdminTenantsPage() {
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');
  const [search,  setSearch]  = useState('');

  const load = () => {
    setError('');
    api.admin.tenants()
      .then(r => setTenants(r.tenants || r.data || []))
      .catch(() => setError('Ошибка загрузки клиентов'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const filtered = tenants.filter(t =>
    (t.company_name || t.org_name || '').toLowerCase().includes(search.toLowerCase()) ||
    (t.email || '').toLowerCase().includes(search.toLowerCase())
  );

  const handleBlock = async (id, isActive) => {
    try {
      await api.admin.updateTenant(id, { is_active: !isActive });
      setTenants(prev => prev.map(t => t.id === id ? { ...t, is_active: !isActive } : t));
    } catch { alert('Ошибка обновления'); }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500" />
    </div>
  );

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-white">Клиенты</h1>
        <span className="text-sm text-gray-500">{tenants.length} всего</span>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-red-400 text-sm">{error}</div>
      )}

      <input
        type="text"
        placeholder="Поиск по названию или email..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        className="w-full max-w-sm bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-teal-500/50 transition-colors"
      />

      <div className="bg-[#1c1b19] rounded-xl border border-white/8 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b border-white/8">
            <tr>
              {['Клиент', 'Email', 'Тариф', 'Баз', 'Регистрация', 'Статус', ''].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {filtered.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-10 text-gray-500">Ничего не найдено</td></tr>
            ) : filtered.map(t => (
              <tr key={t.id} className="hover:bg-white/3">
                <td className="px-4 py-3 font-medium text-white">{t.company_name || t.org_name || '—'}</td>
                <td className="px-4 py-3 text-gray-400">{t.email || '—'}</td>
                <td className="px-4 py-3">
                  <span className="text-xs bg-teal-500/15 text-teal-400 px-2 py-0.5 rounded-full">
                    {t.tariff_name || t.plan || '—'}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-400 tabular-nums">{t.db_count ?? '—'}</td>
                <td className="px-4 py-3 text-gray-500 text-xs">
                  {t.created_at ? new Date(t.created_at).toLocaleDateString('ru-RU') : '—'}
                </td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    t.is_active !== false ? 'bg-green-500/15 text-green-400' : 'bg-red-500/15 text-red-400'
                  }`}>
                    {t.is_active !== false ? 'Активен' : 'Заблокирован'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => handleBlock(t.id, t.is_active !== false)}
                    className={`text-xs px-3 py-1 rounded-lg border transition-colors ${
                      t.is_active !== false
                        ? 'border-red-500/30 text-red-400 hover:bg-red-500/10'
                        : 'border-green-500/30 text-green-400 hover:bg-green-500/10'
                    }`}
                  >
                    {t.is_active !== false ? 'Заблокировать' : 'Разблокировать'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
