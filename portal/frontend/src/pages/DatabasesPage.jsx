import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.jsx';
import StatusBadge from '../components/StatusBadge.jsx';

const API = import.meta.env.VITE_API_URL || '';

export default function DatabasesPage() {
  const { token } = useAuth();
  const [databases, setDatabases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch(`${API}/api/databases`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        setDatabases(Array.isArray(data) ? data : data.databases || []);
        setLoading(false);
      })
      .catch((e) => { setError(e.message); setLoading(false); });
  }, [token]);

  if (loading) return (
    <div className="flex justify-center items-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500" />
    </div>
  );

  if (error) return (
    <div className="p-6 text-red-400">Ошибка загрузки: {error}</div>
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-white">Мои базы 1С</h1>
        <Link
          to="/databases/request"
          className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-lg text-sm transition-colors"
        >
          + Заказать базу
        </Link>
      </div>

      {databases.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <div className="text-5xl mb-4">🗄️</div>
          <p className="text-lg font-medium text-gray-300">Баз пока нет</p>
          <p className="text-sm mt-1">Закажите первую базу 1С и мы развернём её для вас</p>
          <Link
            to="/databases/request"
            className="inline-block mt-4 px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-lg text-sm transition-colors"
          >
            Заказать базу
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {databases.map((db) => (
            <div
              key={db.id}
              className="bg-gray-800 border border-gray-700 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-3">
                  <span className="font-medium text-white">{db.display_name || db.infobase_name}</span>
                  <StatusBadge status={db.status} />
                </div>
                <div className="text-sm text-gray-400">
                  <span className="mr-4">Конфигурация: <span className="text-gray-300">{db.config_name || '—'}</span></span>
                  <span>Версия 1С: <span className="text-gray-300">{db.onec_version || '—'}</span></span>
                </div>
                {db.web_url && (
                  <a
                    href={db.web_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-teal-400 hover:text-teal-300 transition-colors"
                  >
                    {db.web_url} ↗
                  </a>
                )}
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <Link
                  to={`/databases/${db.id}/users`}
                  className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg text-sm transition-colors"
                >
                  Пользователи
                </Link>
                <Link
                  to="/backups"
                  className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg text-sm transition-colors"
                >
                  Бэкапы
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
