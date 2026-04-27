import { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth.jsx';
import StatusBadge from '../../components/StatusBadge.jsx';

const API = import.meta.env.VITE_API_URL || '';

export default function AdminDatabasesPage() {
  const { token } = useAuth();
  const [databases, setDatabases] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    fetch(`${API}/api/admin/databases`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((d) => { setDatabases(Array.isArray(d) ? d : d.databases || []); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => { load(); }, [token]);

  const updateDb = async (id, body) => {
    await fetch(`${API}/api/admin/databases/${id}`, {
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
      <h1 className="text-xl font-semibold text-white">Все базы</h1>

      {databases.length === 0 ? (
        <p className="text-gray-400 py-8 text-center">Баз пока нет</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-400 border-b border-gray-700">
                <th className="pb-3 pr-4 font-medium">База</th>
                <th className="pb-3 pr-4 font-medium">Клиент</th>
                <th className="pb-3 pr-4 font-medium">Конфигурация</th>
                <th className="pb-3 pr-4 font-medium">Статус</th>
                <th className="pb-3 pr-4 font-medium">URL</th>
                <th className="pb-3 font-medium">Действия</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {databases.map((db) => (
                <tr key={db.id} className="text-gray-300">
                  <td className="py-3 pr-4 font-medium text-white">
                    {db.display_name || db.infobase_name}
                    <div className="text-xs text-gray-500 font-normal">{db.infobase_name}</div>
                  </td>
                  <td className="py-3 pr-4">{db.company_name || db.tenant_id}</td>
                  <td className="py-3 pr-4">{db.config_name || '—'}</td>
                  <td className="py-3 pr-4"><StatusBadge status={db.status} /></td>
                  <td className="py-3 pr-4">
                    {db.web_url ? (
                      <a href={db.web_url} target="_blank" rel="noopener noreferrer"
                        className="text-teal-400 hover:text-teal-300 text-xs"
                      >
                        Открыть ↗
                      </a>
                    ) : '—'}
                  </td>
                  <td className="py-3">
                    <div className="flex gap-2">
                      {db.status === 'active' ? (
                        <button
                          onClick={() => updateDb(db.id, { status: 'suspended' })}
                          className="px-2 py-1 bg-red-700/50 hover:bg-red-700 text-red-300 rounded text-xs transition-colors"
                        >
                          Выкл
                        </button>
                      ) : db.status === 'suspended' ? (
                        <button
                          onClick={() => updateDb(db.id, { status: 'active' })}
                          className="px-2 py-1 bg-teal-700/50 hover:bg-teal-700 text-teal-300 rounded text-xs transition-colors"
                        >
                          Вкл
                        </button>
                      ) : null}
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
