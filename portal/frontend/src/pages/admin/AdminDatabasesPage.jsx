import { useEffect, useState } from 'react';
import api from '../../lib/api';

const STATUS_COLORS = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  APPROVED: 'bg-blue-100 text-blue-800',
  REJECTED: 'bg-red-100 text-red-800',
  PROVISIONING: 'bg-purple-100 text-purple-800',
  ACTIVE: 'bg-green-100 text-green-800',
  ERROR: 'bg-red-200 text-red-900',
  SUSPENDED: 'bg-gray-100 text-gray-700',
};

const STATUS_LABELS = {
  PENDING: 'Ожидает',
  APPROVED: 'Одобрено',
  REJECTED: 'Отклонено',
  PROVISIONING: 'Создаётся',
  ACTIVE: 'Активна',
  ERROR: 'Ошибка',
  SUSPENDED: 'Приостановлена',
};

export default function AdminDatabasesPage() {
  const [databases, setDatabases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  useEffect(() => {
    api.get('/admin/databases')
      .then(({ data }) => setDatabases(data))
      .catch(() => setError('Ошибка загрузки баз данных'))
      .finally(() => setLoading(false));
  }, []);

  const filtered = databases.filter((db) => {
    const matchesSearch =
      db.name?.toLowerCase().includes(search.toLowerCase()) ||
      db.tenant_name?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || db.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleSuspend = async (id, suspended) => {
    try {
      await api.patch(`/admin/databases/${id}/suspend`, { suspend: !suspended });
      setDatabases((prev) => prev.map((db) =>
        db.id === id ? { ...db, status: suspended ? 'ACTIVE' : 'SUSPENDED' } : db
      ));
    } catch {
      alert('Ошибка обновления базы');
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
        <h1 className="text-2xl font-bold text-gray-900">Все базы</h1>
        <span className="text-sm text-gray-500">{databases.length} всего</span>
      </div>
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">{error}</div>
      )}
      <div className="flex gap-3 mb-4">
        <input
          type="text"
          placeholder="Поиск по имени базы или клиенту..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 max-w-sm border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
        >
          <option value="ALL">Все статусы</option>
          {Object.entries(STATUS_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
      </div>
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-600">База</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Клиент</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Конфигурация</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Статус</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">URL</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Создана</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-8 text-gray-400">Ничего не найдено</td></tr>
            ) : filtered.map((db) => (
              <tr key={db.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-900">{db.name}</td>
                <td className="px-4 py-3 text-gray-600">{db.tenant_name || '—'}</td>
                <td className="px-4 py-3 text-gray-600">{db.config_type || '—'}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[db.status] || 'bg-gray-100 text-gray-700'}`}>
                    {STATUS_LABELS[db.status] || db.status}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {db.url ? (
                    <a href={db.url} target="_blank" rel="noopener noreferrer"
                      className="text-teal-600 hover:underline text-xs truncate max-w-[160px] block">
                      {db.url}
                    </a>
                  ) : <span className="text-gray-400">—</span>}
                </td>
                <td className="px-4 py-3 text-gray-500">
                  {db.created_at ? new Date(db.created_at).toLocaleDateString('ru-RU') : '—'}
                </td>
                <td className="px-4 py-3">
                  {db.status === 'ACTIVE' || db.status === 'SUSPENDED' ? (
                    <button
                      onClick={() => handleSuspend(db.id, db.status === 'SUSPENDED')}
                      className={`text-xs px-3 py-1 rounded font-medium border ${
                        db.status === 'SUSPENDED'
                          ? 'border-green-300 text-green-700 hover:bg-green-50'
                          : 'border-orange-300 text-orange-700 hover:bg-orange-50'
                      }`}
                    >
                      {db.status === 'SUSPENDED' ? 'Включить' : 'Приостановить'}
                    </button>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
