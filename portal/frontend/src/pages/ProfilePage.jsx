import { useEffect, useState } from 'react';
import { api } from '../lib/api.js';

export default function ProfilePage() {
  const [profile, setProfile]   = useState(null);
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

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500" />
    </div>
  );

  const inputClass = "w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:border-teal-500/50 focus:bg-white/8 transition-colors";
  const cardClass  = "bg-[#1a1917] border border-white/8 rounded-xl p-5";

  return (
    <div className="max-w-lg space-y-6">
      <div>
        <div className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-1">АККАУНТ</div>
        <h1 className="text-xl font-bold text-white">Профиль</h1>
      </div>

      {/* Email + статус */}
      <div className={cardClass}>
        <div className="text-xs text-gray-400 mb-1">Email</div>
        <div className="font-medium text-gray-100">{profile?.email}</div>
        <div className="text-xs mt-2">
          {profile?.email_verified
            ? <span className="text-emerald-400">✓ Подтверждён</span>
            : <span className="text-amber-400">⚠ Не подтверждён</span>}
        </div>
      </div>

      {/* Тариф */}
      {profile?.tariff && (
        <div className={cardClass}>
          <div className="text-xs text-gray-400 mb-1">Тарифный план</div>
          <div className="font-semibold text-teal-400">{profile.tariff.name}</div>
          <div className="text-xs text-gray-400 mt-1">
            Баз: {profile.tariff.max_bases} · Пользователей: {profile.tariff.max_users}
            {profile.tariff.price_rub > 0 && ` · ${profile.tariff.price_rub.toLocaleString('ru-RU')} ₽/мес`}
          </div>
        </div>
      )}

      {/* Основная информация */}
      <form onSubmit={saveProfile} className={`${cardClass} space-y-4`}>
        <h3 className="font-semibold text-gray-100">Основная информация</h3>
        {msg && (
          <div className={`text-sm font-medium ${msg.includes('Ошиб') ? 'text-red-400' : 'text-emerald-400'}`}>
            {msg}
          </div>
        )}
        {[{ key: 'org_name', label: 'Название организации' }, { key: 'phone', label: 'Телефон' }].map(({ key, label }) => (
          <div key={key}>
            <label className="block text-xs font-medium text-gray-400 mb-1.5">{label}</label>
            <input
              type="text"
              value={form[key]}
              onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
              className={inputClass}
            />
          </div>
        ))}
        <button type="submit" className="bg-teal-600 hover:bg-teal-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
          Сохранить
        </button>
      </form>

      {/* Смена пароля */}
      <form onSubmit={changePassword} className={`${cardClass} space-y-4`}>
        <h3 className="font-semibold text-gray-100">Изменить пароль</h3>
        {pwMsg && (
          <div className={`text-sm font-medium ${pwMsg.includes('Ошиб') || pwMsg.includes('не совпад') ? 'text-red-400' : 'text-emerald-400'}`}>
            {pwMsg}
          </div>
        )}
        {[
          { key: 'current_password', label: 'Текущий пароль' },
          { key: 'new_password',     label: 'Новый пароль' },
          { key: 'confirm',          label: 'Повторите пароль' },
        ].map(({ key, label }) => (
          <div key={key}>
            <label className="block text-xs font-medium text-gray-400 mb-1.5">{label}</label>
            <input
              type="password"
              required
              value={pwForm[key]}
              onChange={e => setPwForm(f => ({ ...f, [key]: e.target.value }))}
              className={inputClass}
            />
          </div>
        ))}
        <button type="submit" className="bg-white/8 hover:bg-white/12 text-gray-100 px-4 py-2 rounded-lg text-sm font-medium transition-colors border border-white/10">
          Изменить пароль
        </button>
      </form>
    </div>
  );
}
