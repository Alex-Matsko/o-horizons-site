import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api.js';
import StatusBadge from '../components/StatusBadge.jsx';

// DatabasesPage — полный список баз (альтернативный вид с детальными ссылками на бэкапы)
export default function DatabasesPage() {
  const [databases, setDatabases] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState(null);

  useEffect(() => {
    api.databases.list()
      .then(data => setDatabases(data.databases || []))
      .catch(e  => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex justify-center items-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500" />
    </div>
  );

  if (error) return (
    <div className="p-6 text-red-500 bg-red-50 rounded-xl">Ошибка загрузки: {error}</div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">Мои базы 1С</h1>
        <Link
          to="/databases/new"
          className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-sm transition-colors"
        >
          + Заказать базу
        </Link>
      </div>

      {databases.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-dashed border-gray-300">
          <div className="text-5xl mb-4">🗄️</div>
          <p className="text-lg font-medium text-gray-700">Баз пока нет</p>
          <p className="text-sm text-gray-500 mt-1">Закажите первую базу 1С и мы развернём её для вас</p>
          <Link
            to="/databases/new"
            className="inline-block mt-4 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-sm transition-colors"
          >
            Заказать базу
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {databases.map(db => (
            <div
              key={db.id}
              className="bg-white border border-gray-200 rounded-xl p-5
                         flex flex-col sm:flex-row sm:items-center justify-between gap-4
                         hover:shadow-sm transition-shadow"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-3">
                  {/* name = db_alias из заявки */}
                  <span className="font-medium text-gray-900">{db.name}</span>
                  <StatusBadge status={db.status} />
                </div>
                <div className="text-sm text-gray-500">
                  <span className="mr-4">
                    Конфигурация: 
                    <span className="text-gray-700">{db.config_name || '—'}</span>
                  </span>
                </div>
                {/* url — полный Apache URL базы */}
                {db.url && (
                  <a
                    href={db.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-teal-600 hover:text-teal-700 transition-colors"
                  >
                    {db.url} ↗
                  </a>
                )}
              </div>

              <div className="flex gap-2 flex-shrink-0">
                <Link
                  to={`/databases/${db.id}/users`}
                  className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm transition-colors"
                >
                  Пользователи
                </Link>
                {/* Исправлено: было to="/backups" — баг */}
                <Link
                  to={`/databases/${db.id}/backups`}
                  className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm transition-colors"
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
