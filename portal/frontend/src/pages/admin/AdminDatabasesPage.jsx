import { useEffect, useState } from 'react';
import { api } from '../../lib/api.js';

const STATUS_LABELS = {
  pending:      'Ожидает',
  approved:     'Одобрено',
  rejected:     'Отклонено',
  provisioning: 'Создаётся',
  active:       'Активна',
  error:        'Ошибка',
  suspended:    'Приостановлена',
  PENDING:      'Ожидает',
  APPROVED:     'Одобрено',
  REJECTED:     'Отклонено',
  PROVISIONING: 'Создаётся',
  ACTIVE:       'Активна',
  ERROR:        'Ошибка',
  SUSPENDED:    'Приостановлена',
};

const STATUS_COLORS = {
  pending: 'bg-yellow-500/15 text-yellow-400', PENDING: 'bg-yellow-500/15 text-yellow-400',
  approved: 'bg-blue-500/15 text-blue-400',   APPROVED: 'bg-blue-500/15 text-blue-400',
  rejected: 'bg-red-500/15 text-red-400',     REJECTED: 'bg-red-500/15 text-red-400',
  provisioning: 'bg-purple-500/15 text-purple-400', PROVISIONING: 'bg-purple-500/15 text-purple-400',
  active: 'bg-green-500/15 text-green-400',   ACTIVE: 'bg-green-500/15 text-green-400',
  error: 'bg-red-500/20 text-red-400',        ERROR: 'bg-red-500/20 text-red-400',
  suspended: 'bg-gray-500/15 text-gray-400',  SUSPENDED: 'bg-gray-500/15 text-gray-400',
};

export default function AdminDatabasesPage() {
  const [databases,    setDatabases]    = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState('');
  const [search,       setSearch]       = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const load = () => {
    setError('');
    api.admin.databases()
      .then(r => setDatabases(r.databases || r.data || []))
      .catch(() => setError('Ошибка загрузки баз данных'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const filtered = databases.filter(db => {
    const s = search.toLowerCase();
    const matchSearch = (db.display_name || db.name || '').toLowerCase().includes(s) ||
                        (db.company_name || db.tenant_name || '').toLowerCase().includes(s);
    const st = (db.status || '').toUpperCase();
    const matchStatus = statusFilter === 'ALL' || st === statusFilter;
    return matchSearch && matchStatus;
  });

  const handleSuspend = async (id, isSuspended) => {
    try {
      await api.admin.updateDb(id, { status: isSuspended ? 'active' : 'suspended' });
      load();
    } catch { alert('Ошибка обновления'); }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500" />
    </div>
  );

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-white">Все базы</h1>
        <span className="text-sm text-gray-500">{databases.length} всего</span>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-red-400 text-sm">{error}</div>
      )}

      <div className="flex gap-3">
        <input
          type="text"
          placeholder="Поиск по базе или клиенту..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="flex-1 max-w-sm bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-teal-500/50 transition-colors"
        />
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-300 focus:outline-none focus:border-teal-500/50"
        >
          <option value="ALL">Все статусы</option>
          <option value="PENDING">Ожидает</option>
          <option value="ACTIVE">Активна</option>
          <option value="SUSPENDED">Приостановлена</option>
          <option value="ERROR">Ошибка</option>
        </select>
      </div>

      <div className="bg-[#1c1b19] rounded-xl border border-white/8 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b border-white/8">
            <tr>
              {['База', 'Клиент', 'Конфигурация', 'Статус', 'URL', 'Создана', ''].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {filtered.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-10 text-gray-500">Ничего не найдено</td></tr>
            ) : filtered.map(db => {
              const st = (db.status || '').toUpperCase();
              const isSuspended = st === 'SUSPENDED';
              return (
                <tr key={db.id} className="hover:bg-white/3">
                  <td className="px-4 py-3 font-medium text-white">{db.display_name || db.name || '—'}</td>
                  <td className="px-4 py-3 text-gray-400">{db.company_name || db.tenant_name || '—'}</td>
                  <td className="px-4 py-3 text-gray-500">{db.configuration || db.config_type || '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[db.status] || 'bg-gray-500/15 text-gray-400'}`}>
                      {STATUS_LABELS[db.status] || db.status || '—'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {db.url
                      ? <a href={db.url} target="_blank" rel="noopener noreferrer" className="text-teal-400 hover:text-teal-300 text-xs truncate max-w-[140px] block">{db.url}</a>
                      : <span className="text-gray-600">—</span>
                    }
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {db.created_at ? new Date(db.created_at).toLocaleDateString('ru-RU') : '—'}
                  </td>
                  <td className="px-4 py-3">
                    {(st === 'ACTIVE' || st === 'SUSPENDED') && (
                      <button
                        onClick={() => handleSuspend(db.id, isSuspended)}
                        className={`text-xs px-3 py-1 rounded-lg border transition-colors ${
                          isSuspended
                            ? 'border-green-500/30 text-green-400 hover:bg-green-500/10'
                            : 'border-orange-500/30 text-orange-400 hover:bg-orange-500/10'
                        }`}
                      >
                        {isSuspended ? 'Включить' : 'Приостановить'}
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
