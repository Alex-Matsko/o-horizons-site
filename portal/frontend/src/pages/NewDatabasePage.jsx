import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api.js';

const CONFIGS = ['Бухгалтерия предприятия (БП)', 'Управление торговлей (УТ)', 'Розница', 'Управление нашей фирмой (УНФ)', 'Зарплата и управление персоналом (ЗУП)'];
const VERSIONS = ['8.3.27', '8.5.1'];

export default function NewDatabasePage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ display_name: '', configuration: CONFIGS[0], version_1c: VERSIONS[0] });
  const [tariff, setTariff] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => { api.me.tariff().then(r => setTariff(r.tariff)); }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.databases.create(form);
      navigate('/dashboard', { state: { message: 'Заявка на создание базы отправлена. Ожидайте подтверждения администратора.' } });
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-lg">
      <h1 className="text-xl font-bold text-gray-900 mb-6">Заказать новую базу 1С</h1>
      {tariff && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 text-sm text-blue-700">
          Ваш тариф <strong>{tariff.name}</strong>: до {tariff.max_databases} баз, до {tariff.max_users} пользователей на базу.
        </div>
      )}
      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        {error && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-3">{error}</div>}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Название базы</label>
          <input type="text" required value={form.display_name}
            onChange={e => setForm(f => ({ ...f, display_name: e.target.value }))}
            placeholder="Например: Основная бухгалтерия"
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Конфигурация</label>
          <select value={form.configuration} onChange={e => setForm(f => ({ ...f, configuration: e.target.value }))}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500">
            {CONFIGS.map(c => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Версия 1С</label>
          <select value={form.version_1c} onChange={e => setForm(f => ({ ...f, version_1c: e.target.value }))}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500">
            {VERSIONS.map(v => <option key={v}>{v}</option>)}
          </select>
        </div>
        <div className="bg-yellow-50 border border-yellow-200 rounded p-3 text-xs text-yellow-700">
          ⚠️ После отправки заявки база будет создана после подтверждения администратором (обычно в течение 1 рабочего дня).
        </div>
        <div className="flex gap-3">
          <button type="button" onClick={() => navigate(-1)}
            className="flex-1 border border-gray-300 text-gray-700 rounded-lg py-2 text-sm hover:bg-gray-50 transition-colors">
            Отмена
          </button>
          <button type="submit" disabled={loading}
            className="flex-1 bg-teal-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-teal-700 disabled:opacity-50 transition-colors">
            {loading ? 'Отправка...' : 'Отправить заявку'}
          </button>
        </div>
      </form>
    </div>
  );
}
