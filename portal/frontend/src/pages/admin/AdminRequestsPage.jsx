import { useEffect, useState } from 'react';
import { api } from '../../lib/api.js';

const STATUS_LABELS = {
  pending: 'Ожидает',      PENDING: 'Ожидает',
  approved: 'Одобрено',    APPROVED: 'Одобрено',
  rejected: 'Отклонено',   REJECTED: 'Отклонено',
  provisioning: 'Создаётся', PROVISIONING: 'Создаётся',
  active: 'Активна',       ACTIVE: 'Активна',
  error: 'Ошибка',         ERROR: 'Ошибка',
};

const STATUS_COLORS = {
  pending: 'bg-yellow-500/15 text-yellow-400', PENDING: 'bg-yellow-500/15 text-yellow-400',
  approved: 'bg-blue-500/15 text-blue-400',   APPROVED: 'bg-blue-500/15 text-blue-400',
  rejected: 'bg-red-500/15 text-red-400',     REJECTED: 'bg-red-500/15 text-red-400',
  provisioning: 'bg-purple-500/15 text-purple-400', PROVISIONING: 'bg-purple-500/15 text-purple-400',
  active: 'bg-green-500/15 text-green-400',   ACTIVE: 'bg-green-500/15 text-green-400',
  error: 'bg-red-500/20 text-red-400',        ERROR: 'bg-red-500/20 text-red-400',
};

export default function AdminRequestsPage() {
  const [requests,      setRequests]      = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [error,         setError]         = useState('');

  const load = async () => {
    setError('');
    try {
      const r = await api.admin.requests();
      setRequests(r.requests || r.databases || r.data || []);
    } catch {
      setError('Ошибка загрузки заявок');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleApprove = async (id) => {
    setActionLoading(id + '_approve');
    try { await api.admin.approveDb(id); await load(); }
    catch (e) { setError(e.message || 'Ошибка одобрения'); }
    finally { setActionLoading(null); }
  };

  const handleReject = async (id) => {
    const reason = prompt('Причина отклонения:');
    if (!reason) return;
    setActionLoading(id + '_reject');
    try { await api.admin.rejectDb(id, reason); await load(); }
    catch (e) { setError(e.message || 'Ошибка отклонения'); }
    finally { setActionLoading(null); }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500" />
    </div>
  );

  return (
    <div className="p-6 space-y-5">
      <h1 className="text-lg font-bold text-white">Заявки на базы</h1>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-red-400 text-sm">{error}</div>
      )}

      {requests.length === 0 ? (
        <div className="bg-[#1c1b19] border border-white/8 rounded-xl p-10 text-center text-gray-500">
          Нет ожидающих заявок
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map(req => {
            const st = req.status || '';
            const isPending = st.toLowerCase() === 'pending';
            return (
              <div key={req.id} className="bg-[#1c1b19] border border-white/8 rounded-xl p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-3">
                      <span className="font-semibold text-white">{req.display_name || req.db_name || req.name || '—'}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[st] || 'bg-gray-500/15 text-gray-400'}`}>
                        {STATUS_LABELS[st] || st}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-sm text-gray-400">
                      <span><span className="text-gray-500">Клиент:</span> {req.company_name || req.tenant_name || '—'}</span>
                      <span><span className="text-gray-500">Email:</span> {req.owner_email || req.tenant_email || '—'}</span>
                      <span><span className="text-gray-500">Конфигурация:</span> {req.configuration || req.config_type || '—'}</span>
                      <span><span className="text-gray-500">Дата:</span> {req.created_at ? new Date(req.created_at).toLocaleString('ru-RU') : '—'}</span>
                    </div>
                    {req.comment && (
                      <p className="text-xs text-gray-500">Комментарий: {req.comment}</p>
                    )}
                  </div>

                  {isPending && (
                    <div className="flex flex-col gap-2 min-w-[140px]">
                      <button
                        onClick={() => handleApprove(req.id)}
                        disabled={actionLoading === req.id + '_approve'}
                        className="bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white text-sm px-4 py-2 rounded-lg font-medium transition-colors"
                      >
                        {actionLoading === req.id + '_approve' ? 'Запуск...' : 'Одобрить'}
                      </button>
                      <button
                        onClick={() => handleReject(req.id)}
                        disabled={actionLoading === req.id + '_reject'}
                        className="bg-red-500/15 hover:bg-red-500/25 disabled:opacity-50 text-red-400 text-sm px-4 py-2 rounded-lg font-medium border border-red-500/20 transition-colors"
                      >
                        {actionLoading === req.id + '_reject' ? 'Отклонение...' : 'Отклонить'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
