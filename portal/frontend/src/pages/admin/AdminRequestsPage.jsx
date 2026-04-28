import { useEffect, useState } from 'react';
import api from '../../lib/api';

const STATUS_LABELS = {
  PENDING: 'Ожидает',
  APPROVED: 'Одобрено',
  REJECTED: 'Отклонено',
  PROVISIONING: 'Создаётся',
  ACTIVE: 'Активна',
  ERROR: 'Ошибка',
};

const STATUS_COLORS = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  APPROVED: 'bg-blue-100 text-blue-800',
  REJECTED: 'bg-red-100 text-red-800',
  PROVISIONING: 'bg-purple-100 text-purple-800',
  ACTIVE: 'bg-green-100 text-green-800',
  ERROR: 'bg-red-200 text-red-900',
};

export default function AdminRequestsPage() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [comment, setComment] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const [error, setError] = useState('');

  const fetchRequests = async () => {
    try {
      const { data } = await api.get('/admin/pending');
      setRequests(data);
    } catch (e) {
      setError('Ошибка загрузки заявок');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchRequests(); }, []);

  const handleApprove = async (id) => {
    setActionLoading(id + '_approve');
    try {
      await api.post(`/admin/databases/${id}/approve`, { comment });
      setComment('');
      setSelectedId(null);
      await fetchRequests();
    } catch (e) {
      setError(e.response?.data?.error || 'Ошибка одобрения');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (id) => {
    const reason = prompt('Причина отклонения:');
    if (!reason) return;
    setActionLoading(id + '_reject');
    try {
      await api.post(`/admin/databases/${id}/reject`, { reason });
      await fetchRequests();
    } catch (e) {
      setError(e.response?.data?.error || 'Ошибка отклонения');
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-teal-500" />
    </div>
  );

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Заявки на базы</h1>
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">{error}</div>
      )}
      {requests.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-lg">Нет ожидающих заявок</p>
        </div>
      ) : (
        <div className="space-y-4">
          {requests.map((req) => (
            <div key={req.id} className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="font-semibold text-gray-900 text-lg">{req.name}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[req.status] || 'bg-gray-100 text-gray-700'}`}>
                      {STATUS_LABELS[req.status] || req.status}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-sm text-gray-600">
                    <span><span className="font-medium">Клиент:</span> {req.tenant_name}</span>
                    <span><span className="font-medium">Email:</span> {req.tenant_email}</span>
                    <span><span className="font-medium">Конфигурация:</span> {req.config_type}</span>
                    <span><span className="font-medium">Пользователей:</span> {req.max_users}</span>
                    <span><span className="font-medium">Заявка:</span> {new Date(req.requested_at || req.created_at).toLocaleString('ru-RU')}</span>
                    {req.comment && <span><span className="font-medium">Комментарий:</span> {req.comment}</span>}
                  </div>
                </div>
                {req.status === 'PENDING' && (
                  <div className="flex flex-col gap-2 min-w-[160px]">
                    {selectedId === req.id ? (
                      <div className="flex flex-col gap-2">
                        <textarea
                          className="border border-gray-300 rounded px-2 py-1 text-sm resize-none"
                          rows={2}
                          placeholder="Комментарий (необязательно)"
                          value={comment}
                          onChange={(e) => setComment(e.target.value)}
                        />
                        <button
                          onClick={() => handleApprove(req.id)}
                          disabled={actionLoading === req.id + '_approve'}
                          className="bg-green-600 hover:bg-green-700 text-white text-sm px-4 py-2 rounded-lg font-medium disabled:opacity-50"
                        >
                          {actionLoading === req.id + '_approve' ? 'Запуск...' : '✓ Подтвердить'}
                        </button>
                        <button
                          onClick={() => { setSelectedId(null); setComment(''); }}
                          className="text-gray-500 hover:text-gray-700 text-sm px-4 py-1"
                        >
                          Отмена
                        </button>
                      </div>
                    ) : (
                      <>
                        <button
                          onClick={() => setSelectedId(req.id)}
                          className="bg-teal-600 hover:bg-teal-700 text-white text-sm px-4 py-2 rounded-lg font-medium"
                        >
                          Одобрить
                        </button>
                        <button
                          onClick={() => handleReject(req.id)}
                          disabled={actionLoading === req.id + '_reject'}
                          className="bg-red-50 hover:bg-red-100 text-red-700 text-sm px-4 py-2 rounded-lg font-medium border border-red-200 disabled:opacity-50"
                        >
                          {actionLoading === req.id + '_reject' ? 'Отклонение...' : 'Отклонить'}
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
