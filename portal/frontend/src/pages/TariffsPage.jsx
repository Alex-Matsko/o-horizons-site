import { useEffect, useState } from 'react';
import { api } from '../lib/api.js';

export default function TariffsPage() {
  const [tariffs, setTariffs] = useState([]);
  const [current, setCurrent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [switching, setSwitching] = useState(null);

  useEffect(() => {
    Promise.all([api.tariffs.list(), api.me.tariff()])
      .then(([t, me]) => { setTariffs(t.tariffs || []); setCurrent(me.tariff); })
      .finally(() => setLoading(false));
  }, []);

  async function handleSwitch(id) {
    if (!confirm('Сменить тариф?')) return;
    setSwitching(id);
    try { const r = await api.me.switchTariff(id); setCurrent(r.tariff); alert('Тариф изменён'); }
    catch (e) { alert(e.message); }
    finally { setSwitching(null); }
  }

  if (loading) return <div className="p-8 text-gray-400">Загрузка...</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-gray-900">Тарифы</h1>
      {current && (
        <div className="bg-teal-50 border border-teal-200 rounded-lg px-4 py-3 text-sm text-teal-800">
          Текущий тариф: <strong>{current.name}</strong>
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {tariffs.map(t => (
          <div key={t.id} className={`bg-white rounded-xl border p-5 ${current?.id === t.id ? 'border-teal-400 ring-1 ring-teal-400' : 'border-gray-200'}`}>
            <h3 className="font-bold text-gray-900 mb-1">{t.name}</h3>
            <div className="text-2xl font-bold text-teal-600 mb-3">{t.price_rub ? `${t.price_rub} ₽/мес` : 'Бесплатно'}</div>
            <ul className="text-sm text-gray-600 space-y-1 mb-4">
              <li>✓ До {t.max_databases} баз</li>
              <li>✓ До {t.max_users} пользователей на базу</li>
              <li>✓ Хранение бэкапов {t.backup_retention_days} дней</li>
            </ul>
            {current?.id !== t.id ? (
              <button onClick={() => handleSwitch(t.id)} disabled={!!switching}
                className="w-full border border-teal-600 text-teal-600 rounded-lg py-1.5 text-sm font-medium hover:bg-teal-50 disabled:opacity-50 transition-colors">
                {switching === t.id ? 'Переключение...' : 'Перейти'}
              </button>
            ) : (
              <div className="w-full text-center text-teal-700 text-sm font-medium py-1.5">✓ Текущий тариф</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
