import { useEffect, useState } from 'react';
import { api } from '../lib/api.js';
import StatusBadge from '../components/StatusBadge.jsx';
import { Archive } from 'lucide-react';

export default function BackupsPage() {
  const [databases, setDatabases] = useState([]);
  const [selectedDb, setSelectedDb] = useState(null);
  const [backups, setBackups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    api.databases.list().then(r => {
      const dbs = r.databases || [];
      setDatabases(dbs);
      if (dbs.length > 0) setSelectedDb(dbs[0].id);
      else setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (!selectedDb) return;
    setLoading(true);
    api.backups.list(selectedDb)
      .then(r => setBackups(r.backups || []))
      .finally(() => setLoading(false));
  }, [selectedDb]);

  async function handleCreate() {
    setCreating(true);
    try {
      await api.backups.create(selectedDb);
      const r = await api.backups.list(selectedDb);
      setBackups(r.backups || []);
    } catch (e) {
      alert(e.message);
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(id) {
    if (!confirm('Удалить резервную копию?')) return;
    await api.backups.delete(selectedDb, id);
    const r = await api.backups.list(selectedDb);
    setBackups(r.backups || []);
  }

  function formatBytes(bytes) {
    if (!bytes) return '—';
    const mb = bytes / 1024 / 1024;
    return mb > 1024 ? `${(mb / 1024).toFixed(1)} ГБ` : `${mb.toFixed(1)} МБ`;
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-1">ХРАНИЛИЩЕ</div>
          <h1 className="text-xl font-bold text-white">Резервные копии</h1>
          <p className="text-sm text-gray-400 mt-0.5">Управляйте бэкапами ваших баз 1С</p>
        </div>
        <div className="flex items-center gap-3">
          {databases.length > 1 && (
            <select
              value={selectedDb || ''}
              onChange={e => setSelectedDb(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-teal-500/50 transition-colors"
            >
              {databases.map(db => (
                <option key={db.id} value={db.id} className="bg-[#1a1917]">{db.name}</option>
              ))}
            </select>
          )}
          {selectedDb && (
            <button
              onClick={handleCreate}
              disabled={creating}
              className="flex items-center gap-2 bg-teal-600 hover:bg-teal-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              {creating ? 'Создание...' : '+ Создать бэкап'}
            </button>
          )}
        </div>
      </div>

      <div className="bg-[#1a1917] border border-white/8 rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-8 flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500" />
          </div>
        ) : databases.length === 0 ? (
          <div className="p-12 text-center">
            <Archive size={32} className="mx-auto text-gray-600 mb-3" />
            <h3 className="text-sm font-medium text-gray-400 mb-1">Нет баз данных</h3>
            <p className="text-xs text-gray-500">Сначала создайте базу 1С</p>
          </div>
        ) : backups.length === 0 ? (
          <div className="p-12 text-center">
            <Archive size={32} className="mx-auto text-gray-600 mb-3" />
            <h3 className="text-sm font-medium text-gray-400 mb-1">Резервных копий нет</h3>
            <p className="text-xs text-gray-500 mb-4">Создайте первый бэкап для этой базы</p>
            <button onClick={handleCreate} disabled={creating}
              className="text-teal-500 hover:text-teal-400 text-xs font-medium transition-colors">
              Создать бэкап →
            </button>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-white/8">
              <tr>
                {['Дата создания', 'Размер', 'Статус', ''].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {backups.map(b => (
                <tr key={b.id} className="hover:bg-white/3 transition-colors">
                  <td className="px-4 py-3 text-gray-200">{new Date(b.created_at).toLocaleString('ru-RU')}</td>
                  <td className="px-4 py-3 text-gray-400">{formatBytes(b.file_size)}</td>
                  <td className="px-4 py-3"><StatusBadge status={b.status} /></td>
                  <td className="px-4 py-3">
                    <div className="flex gap-3 justify-end">
                      {b.status === 'done' && (
                        <button
                          onClick={() => window.open(api.backups.download(selectedDb, b.id))}
                          className="text-teal-400 hover:text-teal-300 text-xs font-medium transition-colors"
                        >
                          Скачать
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(b.id)}
                        className="text-red-400 hover:text-red-300 text-xs font-medium transition-colors"
                      >
                        Удалить
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
