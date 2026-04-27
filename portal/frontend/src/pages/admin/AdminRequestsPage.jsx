import { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth.jsx';

const API = import.meta.env.VITE_API_URL || '';

const STATUS_LABELS = {
  pending: { label: 'Ожидает', cls: 'bg-yellow-500/20 text-yellow-300' },
  approved: { label: 'Одобрено', cls: 'bg-teal-500/20 text-teal-300' },
  rejected: { label: 'Отклонено', cls: 'bg-red-500/20 text-red-300' },
  processing: { label: 'В работе', cls: 'bg-blue-500/20 text-blue-300' },
  done: { label: 'Готово', cls: 'bg-green-500/20 text-green-300' },
};

export default function AdminRequestsPage() {
  const { token } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    fetch(`${API}/api/admin/requests`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((d) => { setRequests(Array.isArray(d) ? d : d.requests || []); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => { load(); }, [token]);

  const updateStatus = async (id, status) => {
    await fetch(`${API}/api/admin/requests/${id}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
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
      <h1 className="text-xl font-semibold text-white">Заявки на базы</h1>

      {requests.length === 0 ? (
        <p className="text-gray-400 py-8 text-center">Заявок пока нет</p>
      ) : (
        <div className="space-y-3">
          {requests.map((r) => {
            const s = STATUS_LABELS[r.status] || { label: r.status, cls: 'bg-gray-700 text-gray-300' };
            return (
              <div key={r.id} className="bg-gray-800 border border-gray-700 rounded-xl p-5 space-y-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-0.5">
                    <p className="font-medium text-white">{r.display_name || r.config_name}</p>
                    <p className="text-sm text-gray-400">
                      Клиент: <span className="text-gray-300">{r.tenant_name || r.tenant_id}</span>
                      {' · '}{new Date(r.created_at).toLocaleDateString('ru-RU')}
                    </p>
                    {r.comment && <p className="text-sm text-gray-400 italic">"{r.comment}"</p>}
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${s.cls}`}>{s.label}</span>
                </div>
                {r.status === 'pending' && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => updateStatus(r.id, 'approved')}
                      className="px-3 py-1.5 bg-teal-600 hover:bg-teal-500 text-white rounded-lg text-sm transition-colors"
                    >
                      Одобрить
                    </button>
                    <button
                      onClick={() => updateStatus(r.id, 'rejected')}
                      className="px-3 py-1.5 bg-red-700 hover:bg-red-600 text-white rounded-lg text-sm transition-colors"
                    >
                      Отклонить
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
