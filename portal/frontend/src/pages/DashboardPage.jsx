import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api.js';
import StatusBadge from '../components/StatusBadge.jsx';

export default function DashboardPage() {
  const [databases, setDatabases] = useState([]);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.databases.list(), api.me.get()])
      .then(([dbs, me]) => { setDatabases(dbs.databases || []); setProfile(me.profile); })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-8 text-gray-500">Загрузка...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Мои базы 1С</h1>
          <p className="text-sm text-gray-500 mt-0.5">Тариф: <strong>{profile?.tariff_name || 'Не выбран'}</strong> · Баз: {databases.length}</p>
        </div>
        <Link to="/databases/new"
          className="bg-teal-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-teal-700 transition-colors">
          + Заказать базу
        </Link>
      </div>

      {databases.length === 0 ? (
        <div className="bg-white rounded-xl border border-dashed border-gray-300 p-12 text-center">
          <div className="text-4xl mb-3">🗄️</div>
          <h3 className="font-medium text-gray-700 mb-1">Нет баз данных</h3>
          <p className="text-sm text-gray-500 mb-4">Закажите первую базу 1С для начала работы</p>
          <Link to="/databases/new" className="text-teal-600 hover:underline text-sm font-medium">Заказать базу →</Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {databases.map(db => (
            <div key={db.id} className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-gray-900 text-sm">{db.display_name}</h3>
                  <p className="text-xs text-gray-400 mt-0.5">{db.configuration} · {db.version_1c}</p>
                </div>
                <StatusBadge status={db.status} />
              </div>
              {db.status === 'active' && (
                <a href={`/1c/${db.db_name}/`} target="_blank" rel="noopener noreferrer"
                  className="block w-full text-center bg-teal-50 text-teal-700 rounded-lg py-1.5 text-sm font-medium hover:bg-teal-100 transition-colors mb-3">
                  Открыть в браузере →
                </a>
              )}
              <div className="flex gap-2 text-xs">
                <Link to={`/databases/${db.id}/users`} className="text-gray-500 hover:text-teal-600">Пользователи</Link>
                <span className="text-gray-300">·</span>
                <Link to={`/databases/${db.id}/backups`} className="text-gray-500 hover:text-teal-600">Резервные копии</Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
