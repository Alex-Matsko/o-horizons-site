import { useEffect, useState } from 'react';
import api from '../../lib/api';

export default function AdminTenantsPage() {
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    api.get('/admin/tenants')
      .then(({ data }) => setTenants(data))
      .catch(() => setError('Ошибка загрузки клиентов'))
      .finally(() => setLoading(false));
  }, []);

  const filtered = tenants.filter((t) =>
    t.name?.toLowerCase().includes(search.toLowerCase()) ||
    t.email?.toLowerCase().includes(search.toLowerCase())
  );

  const handleBlock = async (id, blocked) => {
    try {
      await api.patch(`/admin/tenants/${id}`, { blocked: !blocked });
      setTenants((prev) => prev.map((t) => t.id === id ? { ...t, blocked: !blocked } : t));
    } catch {
      alert('Ошибка обновления');
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-teal-500" />
    </div>
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Клиенты</h1>
        <span className="text-sm text-gray-500">{tenants.length} всего</span>
      </div>
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">{error}</div>
      )}
      <div className="mb-4">
        <input
          type="text"
          placeholder="Поиск по имени или email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-sm border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
        />
      </div>
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Клиент</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Email</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Тариф</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Баз</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Регистрация</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Статус</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-8 text-gray-400">Ничего не найдено</td></tr>
            ) : filtered.map((t) => (
              <tr key={t.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-900">{t.name}</td>
                <td className="px-4 py-3 text-gray-600">{t.email}</td>
                <td className="px-4 py-3">
                  <span className="text-xs bg-teal-50 text-teal-700 px-2 py-0.5 rounded-full font-medium">
                    {t.tariff || 'Starter'}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-600">{t.db_count ?? 0}</td>
                <td className="px-4 py-3 text-gray-500">
                  {t.created_at ? new Date(t.created_at).toLocaleDateString('ru-RU') : '—'}
                </td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    t.blocked ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                  }`}>
                    {t.blocked ? 'Заблокирован' : 'Активен'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => handleBlock(t.id, t.blocked)}
                    className={`text-xs px-3 py-1 rounded font-medium border ${
                      t.blocked
                        ? 'border-green-300 text-green-700 hover:bg-green-50'
                        : 'border-red-300 text-red-700 hover:bg-red-50'
                    }`}
                  >
                    {t.blocked ? 'Разблокировать' : 'Заблокировать'}
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
