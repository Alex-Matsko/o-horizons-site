import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api.js';
import { useAuth } from '../hooks/useAuth.jsx';

const CONFIGS = [
  'Бухгалтерия предприятия (БП)',
  'Управление торговлей (УТ)',
  'Розница',
  'Управление нашей фирмой (УНФ)',
  'Зарплата и управление персоналом (ЗУП)',
];
const VERSIONS = ['8.3.27', '8.5.1'];

export default function NewDatabasePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [form, setForm] = useState({
    display_name: '',
    configuration: CONFIGS[0],
    version_1c: VERSIONS[0],
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const tariff = user?.tariff;

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.databases.create(form);
      navigate('/dashboard', {
        state: { message: 'Заявка на создание базы отправлена. Ожидайте подтверждения администратора.' },
      });
    } catch (err) {
      setError(err.message || 'Ошибка отправки заявки');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-6">
      <div className="max-w-lg">
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => navigate(-1)}
            className="text-gray-500 hover:text-gray-300 transition-colors text-sm"
          >
            ← Назад
          </button>
          <h1 className="text-lg font-bold text-white">Заказать новую базу 1С</h1>
        </div>

        {tariff && (
          <div className="bg-teal-500/10 border border-teal-500/20 rounded-xl px-4 py-3 mb-5 text-sm text-teal-300">
            Ваш тариф <strong>{tariff.name || tariff}</strong>
            {tariff.max_databases && `: до ${tariff.max_databases} баз`}
            {tariff.max_users && `, до ${tariff.max_users} пользователей на базу`}.
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-[#1c1b19] border border-white/8 rounded-xl p-6 space-y-4">
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3 text-sm text-red-400">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">
              Название базы
            </label>
            <input
              type="text"
              required
              value={form.display_name}
              onChange={e => setForm(f => ({ ...f, display_name: e.target.value }))}
              placeholder="Например: Основная бухгалтерия"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-teal-500/50 transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">
              Конфигурация
            </label>
            <select
              value={form.configuration}
              onChange={e => setForm(f => ({ ...f, configuration: e.target.value }))}
              className="w-full bg-[#141413] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-teal-500/50 transition-colors"
            >
              {CONFIGS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">
              Версия 1С
            </label>
            <select
              value={form.version_1c}
              onChange={e => setForm(f => ({ ...f, version_1c: e.target.value }))}
              className="w-full bg-[#141413] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-teal-500/50 transition-colors"
            >
              {VERSIONS.map(v => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>

          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3 text-xs text-yellow-400">
            ⚠️ После отправки заявка будет рассмотрена администратором (обычно в течение 1 рабочего дня).
          </div>

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="flex-1 border border-white/10 text-gray-400 rounded-lg py-2 text-sm hover:bg-white/5 transition-colors"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white rounded-lg py-2 text-sm font-medium transition-colors"
            >
              {loading ? 'Отправка...' : 'Отправить заявку'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
