import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../lib/api.js';
import StatusBadge from '../components/StatusBadge.jsx';

export default function BackupsPage() {
  const { dbId } = useParams();
  const [backups, setBackups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  const load = () => api.backups.list(dbId).then(r => setBackups(r.backups || [])).finally(() => setLoading(false));
  useEffect(() => { load(); }, [dbId]);

  async function handleCreate() {
    setCreating(true);
    try { await api.backups.create(dbId); load(); }
    catch (e) { alert(e.message); }
    finally { setCreating(false); }
  }

  async function handleDelete(id) {
    if (!confirm('Удалить резервную копию?')) return;
    await api.backups.delete(dbId, id);
    load();
  }

  function formatBytes(bytes) {
    if (!bytes) return '—';
    const mb = bytes / 1024 / 1024;
    return mb > 1024 ? `${(mb/1024).toFixed(1)} GB` : `${mb.toFixed(1)} MB`;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Резервные копии</h1>
        <button onClick={handleCreate} disabled={creating}
          className="bg-teal-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-teal-700 disabled:opacity-50 transition-colors">
          {creating ? 'Создание...' : '+ Создать бэкап'}
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400">Загрузка...</div>
        ) : backups.length === 0 ? (
          <div className="p-8 text-center">
            <div className="text-3xl mb-2">💾</div>
            <p className="text-gray-500 text-sm">Резервных копий нет. Создайте первую.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>{['Дата создания','Размер','Статус',''].map(h => <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {backups.map(b => (
                <tr key={b.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-700">{new Date(b.created_at).toLocaleString('ru-RU')}</td>
                  <td className="px-4 py-3 text-gray-500">{formatBytes(b.file_size)}</td>
                  <td className="px-4 py-3"><StatusBadge status={b.status} /></td>
                  <td className="px-4 py-3 text-right flex gap-2 justify-end">
                    {b.status === 'done' && (
                      <button onClick={() => api.backups.download(dbId, b.id).then(r => window.open(r.download_url))}
                        className="text-teal-600 hover:text-teal-800 text-xs">Скачать</button>
                    )}
                    <button onClick={() => handleDelete(b.id)} className="text-red-500 hover:text-red-700 text-xs">Удалить</button>
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
