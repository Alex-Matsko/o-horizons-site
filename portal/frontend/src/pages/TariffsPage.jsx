import { useEffect, useState } from 'react';
import { api } from '../lib/api.js';
import { useAuth } from '../hooks/useAuth.jsx';

export default function TariffsPage() {
  const { user } = useAuth();
  const [tariffs, setTariffs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.tariffs.list()
      .then(r => setTariffs(r.tariffs || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const currentTariffId = user?.tariff?.id || user?.tariff_id;

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500" />
    </div>
  );

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-lg font-bold text-white">Тарифы и лимиты</h1>

      {user?.tariff && (
        <div className="bg-teal-500/10 border border-teal-500/20 rounded-xl px-4 py-3 text-sm text-teal-300">
          Текущий тариф: <strong>{user.tariff.name || user.tariff}</strong>
        </div>
      )}

      {tariffs.length === 0 ? (
        <div className="bg-[#1c1b19] border border-white/8 rounded-xl p-10 text-center text-gray-500">
          Тарифы не найдены
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {tariffs.map(t => {
            const isCurrent = t.id === currentTariffId || t.code === user?.plan;
            return (
              <div
                key={t.id}
                className={`bg-[#1c1b19] rounded-xl border p-5 transition-all ${
                  isCurrent ? 'border-teal-500/40 ring-1 ring-teal-500/20' : 'border-white/8'
                }`}
              >
                <h3 className="font-bold text-white mb-1">{t.name}</h3>
                <div className="text-2xl font-bold text-teal-400 mb-3">
                  {t.price ? `${t.price.toLocaleString('ru-RU')} ₽/мес` : 'Бесплатно'}
                </div>
                <ul className="text-sm text-gray-400 space-y-1.5 mb-4">
                  <li className="flex items-center gap-2">
                    <span className="text-teal-500">✓</span>
                    До {t.max_bases ?? t.max_databases ?? '—'} баз
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-teal-500">✓</span>
                    До {t.max_users ?? '—'} пользователей на базу
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-teal-500">✓</span>
                    {t.max_disk_gb ?? t.max_storage_gb ?? '—'} ГБ хранилища
                  </li>
                </ul>
                {isCurrent ? (
                  <div className="w-full text-center text-teal-400 text-sm font-medium py-2">
                    ✓ Текущий тариф
                  </div>
                ) : (
                  <button
                    onClick={() => alert('Для смены тарифа свяжитесь с поддержкой')}
                    className="w-full border border-teal-500/30 text-teal-400 rounded-lg py-2 text-sm font-medium hover:bg-teal-500/10 transition-colors"
                  >
                    Перейти
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
