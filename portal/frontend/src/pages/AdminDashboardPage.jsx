import { useEffect, useState } from 'react';
import { api } from '../lib/api.js';

export default function AdminDashboardPage() {
  const [stats, setStats] = useState(null);
  const [pending, setPending] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = () => Promise.all([
    api.admin.stats(),
    api.admin.pendingDbs(),
    api.admin.tenants({ limit: 20 }),
  ]).then(([s, p, t]) => {
    setStats(s.stats);
    setPending(p.databases || []);
    setTenants(t.tenants || []);
  }).finally(() => setLoading(false));

  useEffect(() => { load(); }, []);

  async function handleApprove(id) {
    await api.admin.approveDb(id);
    load();
  }

  async function handleReject(id) {
    const reason = prompt('Причина отказа:');
    if (reason === null) return;
    await api.admin.rejectDb(id, reason);
    load();
  }

  if (loading) return <div className="p-8 text-gray-400">Загрузка...</div>;

  return (
    <div className="space-y-8">
      <h1 className="text-xl font-bold text-gray-900">Панель администратора</h1>

      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {[['Клиентов',stats.tenants],['Активных баз',stats.active_databases],['Ожидают',stats.pending_databases,'text-yellow-600'],['Пользователей',stats.users],['Бэкапов',stats.backups]].map(([l,v,cls]) => (
            <div key={l} className="bg-white rounded-xl border border-gray-200 p-4">
              <div className={`text-2xl font-bold ${cls||'text-gray-900'}`}>{v}</div>
              <div className="text-xs text-gray-500 mt-0.5">{l}</div>
            </div>
          ))}
        </div>
      )}

      {pending.length > 0 && (
        <div>
          <h2 className="text-base font-semibold text-gray-800 mb-3">⏳ Заявки на создание баз ({pending.length})</h2>
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-yellow-50 border-b border-yellow-100">
                <tr>{['Клиент','Компания','База','Конфигурация','Дата',''].map(h => <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500">{h}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {pending.map(d => (
                  <tr key={d.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-700">{d.owner_email}</td>
                    <td className="px-4 py-3 text-gray-600">{d.company_name}</td>
                    <td className="px-4 py-3 font-medium">{d.display_name}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{d.configuration}</td>
                    <td className="px-4 py-3 text-gray-400 text-xs">{new Date(d.created_at).toLocaleDateString('ru-RU')}</td>
                    <td className="px-4 py-3 flex gap-2 justify-end">
                      <button onClick={() => handleApprove(d.id)} className="bg-green-600 text-white px-3 py-1 rounded text-xs hover:bg-green-700">Одобрить</button>
                      <button onClick={() => handleReject(d.id)} className="bg-red-100 text-red-600 px-3 py-1 rounded text-xs hover:bg-red-200">Отклонить</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div>
        <h2 className="text-base font-semibold text-gray-800 mb-3">Клиенты</h2>
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>{['Компания','Email','Тариф','Баз','Дата'].map(h => <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {tenants.map(t => (
                <tr key={t.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{t.company_name || '—'}</td>
                  <td className="px-4 py-3 text-gray-600">{t.owner_email}</td>
                  <td className="px-4 py-3"><span className="bg-teal-100 text-teal-700 px-2 py-0.5 rounded text-xs">{t.tariff_name}</span></td>
                  <td className="px-4 py-3 text-gray-500">{t.db_count}</td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{new Date(t.created_at).toLocaleDateString('ru-RU')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
