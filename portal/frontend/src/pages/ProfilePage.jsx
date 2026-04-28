import { useEffect, useState } from 'react';
import { api } from '../lib/api.js';

export default function ProfilePage() {
  const [profile, setProfile]   = useState(null);
  // Поля соответствуют бэкенд-схеме: org_name + phone
  const [form, setForm]         = useState({ org_name: '', phone: '' });
  const [pwForm, setPwForm]     = useState({ current_password: '', new_password: '', confirm: '' });
  const [msg, setMsg]           = useState('');
  const [pwMsg, setPwMsg]       = useState('');
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    api.me.get()
      .then(r => {
        setProfile(r);
        setForm({ org_name: r.org_name || '', phone: r.phone || '' });
      })
      .finally(() => setLoading(false));
  }, []);

  async function saveProfile(e) {
    e.preventDefault();
    try {
      await api.me.update(form);
      setMsg('Сохранено ✓');
      setTimeout(() => setMsg(''), 3000);
    } catch (err) {
      setMsg('Ошибка: ' + err.message);
    }
  }

  async function changePassword(e) {
    e.preventDefault();
    if (pwForm.new_password !== pwForm.confirm) {
      setPwMsg('Пароли не совпадают');
      return;
    }
    try {
      await api.me.changePassword({
        current_password: pwForm.current_password,
        new_password:     pwForm.new_password,
      });
      setPwMsg('Пароль изменён ✓');
      setPwForm({ current_password: '', new_password: '', confirm: '' });
      setTimeout(() => setPwMsg(''), 3000);
    } catch (err) {
      setPwMsg('Ошибка: ' + err.message);
    }
  }

  if (loading) {
    return <div className="p-8 text-gray-400 animate-pulse">Загрузка...</div>;
  }

  const fields = [
    { key: 'org_name', label: 'Название организации' },
    { key: 'phone',    label: 'Телефон' },
  ];

  const pwFields = [
    { key: 'current_password', label: 'Текущий пароль' },
    { key: 'new_password',     label: 'Новый пароль' },
    { key: 'confirm',          label: 'Повторите пароль' },
  ];

  return (
    <div className="max-w-lg space-y-6">
      <h1 className="text-xl font-bold text-gray-900">Профиль</h1>

      {/* Email + статус подтверждения */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-1">
        <div className="text-xs text-gray-400">Email</div>
        <div className="font-medium text-gray-800">{profile?.email}</div>
        <div className="text-xs mt-1">
          {profile?.email_verified
            ? <span className="text-green-600">✓ Подтверждён</span>
            : <span className="text-yellow-600">⚠ Не подтверждён</span>}
        </div>
      </div>

      {/* Тариф */}
      {profile?.tariff && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="text-xs text-gray-400 mb-1">Тарифный план</div>
          <div className="font-semibold text-teal-700">{profile.tariff.name}</div>
          <div className="text-xs text-gray-500 mt-1">
            Баз: {profile.tariff.max_bases} · Пользователь: {profile.tariff.max_users}
            {profile.tariff.price_rub > 0 && ` · ${profile.tariff.price_rub.toLocaleString('ru-RU')} ₽/мес`}
          </div>
        </div>
      )}

      {/* Основная информация */}
      <form onSubmit={saveProfile} className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
        <h3 className="font-semibold text-gray-800">Основная информация</h3>
        {msg && <div className="text-sm text-green-700 font-medium">{msg}</div>}
        {fields.map(({ key, label }) => (
          <div key={key}>
            <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
            <input
              type="text"
              value={form[key]}
              onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm
                         focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            />
          </div>
        ))}
        <button
          type="submit"
          className="bg-teal-600 text-white px-4 py-2 rounded-lg text-sm font-medium
                     hover:bg-teal-700 transition-colors"
        >
          Сохранить
        </button>
      </form>

      {/* Смена пароля */}
      <form onSubmit={changePassword} className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
        <h3 className="font-semibold text-gray-800">Изменить пароль</h3>
        {pwMsg && <div className="text-sm font-medium" style={{ color: pwMsg.includes('Ошиб') ? '#dc2626' : '#16a34a' }}>{pwMsg}</div>}
        {pwFields.map(({ key, label }) => (
          <div key={key}>
            <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
            <input
              type="password"
              required
              value={pwForm[key]}
              onChange={e => setPwForm(f => ({ ...f, [key]: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm
                         focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            />
          </div>
        ))}
        <button
          type="submit"
          className="bg-gray-800 text-white px-4 py-2 rounded-lg text-sm font-medium
                     hover:bg-gray-900 transition-colors"
        >
          Изменить пароль
        </button>
      </form>
    </div>
  );
}
