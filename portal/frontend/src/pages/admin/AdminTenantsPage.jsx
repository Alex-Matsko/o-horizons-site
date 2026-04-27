import { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth.jsx';
import StatusBadge from '../../components/StatusBadge.jsx';

const API = import.meta.env.VITE_API_URL || '';

const PLANS = ['starter', 'business', 'corporate', 'enterprise'];

export default function AdminTenantsPage() {
  const { token } = useAuth();
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    fetch(`${API}/api/admin/tenants`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((d) => { setTenants(Array.isArray(d) ? d : d.tenants || []); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => { load(); }, [token]);

  const updateTenant = async (id, body) => {
    await fetch(`${API}/api/admin/tenants/${id}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    load();
  };

  if (loading) return (
    <div className="flex justify-center items-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500" />
    </div>
  );

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-xl font-semibold text-white">Клиенты</h1>

      {tenants.length === 0 ? (
        <p className="text-gray-400 py-8 text-center">Клиентов пока нет</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-400 border-b border-gray-700">
                <th className="pb-3 pr-4 font-medium">Компания</th>
                <th className="pb-3 pr-4 font-medium">Email</th>
                <th className="pb-3 pr-4 font-medium">Тариф</th>
                <th className="pb-3 pr-4 font-medium">Статус</th>
                <th className="pb-3 pr-4 font-medium">Баз</th>
                <th className="pb-3 font-medium">Действия</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {tenants.map((t) => (
                <tr key={t.id} className="text-gray-300">
                  <td className="py-3 pr-4 font-medium text-white">{t.company_name}</td>
                  <td className="py-3 pr-4">{t.email || '—'}</td>
                  <td className="py-3 pr-4">
                    <select
                      value={t.plan}
                      onChange={(e) => updateTenant(t.id, { plan: e.target.value })}
                      className="bg-gray-700 text-gray-300 rounded px-2 py-1 text-xs border border-gray-600"
                    >
                      {PLANS.map((p) => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </td>
                  <td className="py-3 pr-4"><StatusBadge status={t.status} /></td>
                  <td className="py-3 pr-4">{t.db_count ?? '—'}</td>
                  <td className="py-3">
                    <div className="flex gap-2">
                      {t.status === 'active' ? (
                        <button
                          onClick={() => updateTenant(t.id, { status: 'suspended' })}
                          className="px-2 py-1 bg-red-700/50 hover:bg-red-700 text-red-300 rounded text-xs transition-colors"
                        >
                          Заблокировать
                        </button>
                      ) : (
                        <button
                          onClick={() => updateTenant(t.id, { status: 'active' })}
                          className="px-2 py-1 bg-teal-700/50 hover:bg-teal-700 text-teal-300 rounded text-xs transition-colors"
                        >
                          Разблокировать
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
