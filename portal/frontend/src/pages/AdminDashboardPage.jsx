import { useEffect, useState } from 'react';
import { api } from '../lib/api.js';

function StatCard({ label, value, accent }) {
  return (
    <div className="bg-[#1c1b19] rounded-xl border border-white/8 p-4">
      <div className={`text-2xl font-bold tabular-nums ${accent || 'text-white'}`}>{value ?? '—'}</div>
      <div className="text-xs text-gray-500 mt-0.5">{label}</div>
    </div>
  );
}

export default function AdminDashboardPage() {
  const [stats,   setStats]   = useState(null);
  const [pending, setPending] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  const load = async () => {
    setError(null);
    try {
      const [s, p, t] = await Promise.all([
        api.admin.stats().catch(() => ({})),
        api.admin.requests().catch(() => ({ requests: [] })),
        api.admin.tenants().catch(() => ({ tenants: [] })),
      ]);
      setStats(s.stats || s);
      // Бэкенд может вернуть { requests: [] } или { databases: [] } — работаем с обоими
      const allRequests = p.requests || p.databases || [];
      setPending(allRequests.filter(r => !r.status || r.status === 'PENDING'));
      setTenants(t.tenants || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleApprove = async (id) => {
    try { await api.admin.approveDb(id); load(); }
    catch (e) { alert('Ошибка: ' + e.message); }
  };

  const handleReject = async (id) => {
    const reason = prompt('Причина отказа:');
    if (reason === null) return;
    try { await api.admin.rejectDb(id, reason); load(); }
    catch (e) { alert('Ошибка: ' + e.message); }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500" />
    </div>
  );

  if (error) return (
    <div className="p-8">
      <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-red-400 text-sm">
        Ошибка загрузки: {error}
      </div>
    </div>
  );

  return (
    <div className="p-6 space-y-8">
      <h1 className="text-lg font-bold text-white">Панель администратора</h1>

      {/* Статистика */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <StatCard label="Клиентов"     value={stats.tenants} />
          <StatCard label="Активных баз" value={stats.active_databases} />
          <StatCard label="Ожидают"      value={stats.pending_databases} accent="text-yellow-400" />
          <StatCard label="Пользователей" value={stats.users} />
          <StatCard label="Бэкапов"      value={stats.backups} />
        </div>
      )}

      {/* Заявки */}
      {pending.length > 0 ? (
        <section>
          <h2 className="text-sm font-semibold text-gray-300 mb-3">⏳ Заявки на создание баз ({pending.length})</h2>
          <div className="bg-[#1c1b19] rounded-xl border border-white/8 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="border-b border-white/8">
                <tr>{['Клиент','Компания','База','Конфигурация','Дата',''].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500">{h}</th>
                ))}</tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {pending.map(d => (
                  <tr key={d.id} className="hover:bg-white/3">
                    <td className="px-4 py-3 text-gray-300">{d.owner_email || d.tenant_email || '—'}</td>
                    <td className="px-4 py-3 text-gray-400">{d.company_name || '—'}</td>
                    <td className="px-4 py-3 font-medium text-white">{d.display_name || d.db_name || '—'}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{d.configuration || '—'}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{new Date(d.created_at).toLocaleDateString('ru-RU')}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2 justify-end">
                        <button onClick={() => handleApprove(d.id)} className="bg-teal-600 text-white px-3 py-1 rounded-lg text-xs hover:bg-teal-500 transition-colors">Одобрить</button>
                        <button onClick={() => handleReject(d.id)}  className="bg-red-500/15 text-red-400 px-3 py-1 rounded-lg text-xs hover:bg-red-500/25 transition-colors">Отклонить</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : (
        <div className="bg-[#1c1b19] border border-white/8 rounded-xl p-6 text-center text-gray-500 text-sm">
          Нет ожидающих заявок
        </div>
      )}

      {/* Клиенты */}
      <section>
        <h2 className="text-sm font-semibold text-gray-300 mb-3">Клиенты ({tenants.length})</h2>
        {tenants.length === 0 ? (
          <div className="bg-[#1c1b19] border border-white/8 rounded-xl p-6 text-center text-gray-500 text-sm">Нет клиентов</div>
        ) : (
          <div className="bg-[#1c1b19] rounded-xl border border-white/8 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="border-b border-white/8">
                <tr>{['Компания','Email','Тариф','Баз','Дата'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500">{h}</th>
                ))}</tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {tenants.map(t => (
                  <tr key={t.id} className="hover:bg-white/3">
                    <td className="px-4 py-3 font-medium text-white">{t.company_name || t.org_name || '—'}</td>
                    <td className="px-4 py-3 text-gray-400">{t.email || t.owner_email || '—'}</td>
                    <td className="px-4 py-3">
                      <span className="bg-teal-500/15 text-teal-400 px-2 py-0.5 rounded-full text-xs">
                        {t.tariff_name || t.tariff?.name || t.plan || '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 tabular-nums">{t.db_count ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{new Date(t.created_at).toLocaleDateString('ru-RU')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
