import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api.js';

const STATUS_LABELS = {
  pending: 'Ожидает',      PENDING: 'Ожидает',
  approved: 'Одобрено',    APPROVED: 'Одобрено',
  provisioning: 'Создаётся', PROVISIONING: 'Создаётся',
  active: 'Активна',       ACTIVE: 'Активна',
  suspended: 'Приостановлена', SUSPENDED: 'Приостановлена',
  error: 'Ошибка',         ERROR: 'Ошибка',
};

const STATUS_COLORS = {
  pending: 'bg-yellow-500/15 text-yellow-400', PENDING: 'bg-yellow-500/15 text-yellow-400',
  approved: 'bg-blue-500/15 text-blue-400',   APPROVED: 'bg-blue-500/15 text-blue-400',
  provisioning: 'bg-purple-500/15 text-purple-400', PROVISIONING: 'bg-purple-500/15 text-purple-400',
  active: 'bg-green-500/15 text-green-400',   ACTIVE: 'bg-green-500/15 text-green-400',
  suspended: 'bg-gray-500/15 text-gray-400',  SUSPENDED: 'bg-gray-500/15 text-gray-400',
  error: 'bg-red-500/15 text-red-400',        ERROR: 'bg-red-500/15 text-red-400',
};

export default function DatabasesPage() {
  const [databases, setDatabases] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState(null);

  useEffect(() => {
    api.databases.list()
      .then(r => setDatabases(r.databases || r.data || []))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex justify-center items-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500" />
    </div>
  );

  if (error) return (
    <div className="p-6">
      <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-red-400 text-sm">
        Ошибка загрузки: {error}
      </div>
    </div>
  );

  return (
    <div className="space-y-5 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-white">Мои базы 1С</h1>
        <Link
          to="/databases/request"
          className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-lg text-sm font-medium transition-colors"
        >
          + Заказать базу
        </Link>
      </div>

      {databases.length === 0 ? (
        <div className="bg-[#1c1b19] border border-dashed border-white/15 rounded-xl p-12 text-center">
          <div className="text-4xl mb-3">🗄️</div>
          <p className="text-base font-medium text-gray-300">Баз пока нет</p>
          <p className="text-sm text-gray-500 mt-1 mb-4">Закажите первую базу 1С и мы развернём её для вас</p>
          <Link
            to="/databases/request"
            className="inline-block px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-lg text-sm font-medium transition-colors"
          >
            Заказать базу
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {databases.map(db => {
            const st = db.status || '';
            return (
              <div
                key={db.id}
                className="bg-[#1c1b19] border border-white/8 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-white/12 transition-colors"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="font-medium text-white">{db.display_name || db.name || '—'}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[st] || 'bg-gray-500/15 text-gray-400'}`}>
                      {STATUS_LABELS[st] || st}
                    </span>
                  </div>
                  {(db.configuration || db.config_name) && (
                    <div className="text-sm text-gray-500">
                      Конфигурация: <span className="text-gray-300">{db.configuration || db.config_name}</span>
                    </div>
                  )}
                  {db.url && (
                    <a
                      href={db.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-teal-400 hover:text-teal-300 transition-colors"
                    >
                      {db.url} ↗
                    </a>
                  )}
                </div>

                <div className="flex gap-2 flex-shrink-0">
                  <Link
                    to={`/databases/${db.id}/users`}
                    className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-gray-300 rounded-lg text-sm transition-colors"
                  >
                    Пользователи
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
