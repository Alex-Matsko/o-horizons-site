import { useEffect, useState } from 'react';
import { api } from '../lib/api.js';

export default function ProfilePage() {
  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState({ full_name: '', company_name: '' });
  const [pwForm, setPwForm] = useState({ current_password: '', new_password: '', confirm: '' });
  const [msg, setMsg] = useState('');
  const [pwMsg, setPwMsg] = useState('');

  useEffect(() => {
    api.me.get().then(r => {
      setProfile(r.profile);
      setForm({ full_name: r.profile.full_name || '', company_name: r.profile.company_name || '' });
    });
  }, []);

  async function saveProfile(e) {
    e.preventDefault();
    try { await api.me.update(form); setMsg('Сохранено ✓'); setTimeout(() => setMsg(''), 3000); }
    catch (e) { setMsg('Ошибка: ' + e.message); }
  }

  async function changePassword(e) {
    e.preventDefault();
    if (pwForm.new_password !== pwForm.confirm) { setPwMsg('Пароли не совпадают'); return; }
    try { await api.me.changePassword(pwForm); setPwMsg('Пароль изменён ✓'); setPwForm({ current_password: '', new_password: '', confirm: '' }); setTimeout(() => setPwMsg(''), 3000); }
    catch (e) { setPwMsg('Ошибка: ' + e.message); }
  }

  if (!profile) return <div className="p-8 text-gray-400">Загрузка...</div>;

  return (
    <div className="max-w-lg space-y-6">
      <h1 className="text-xl font-bold text-gray-900">Профиль</h1>

      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="text-xs text-gray-400 mb-1">Email</div>
        <div className="font-medium text-gray-800">{profile.email}</div>
        <div className="text-xs mt-1">{profile.email_verified ? <span className="text-green-600">✓ Подтверждён</span> : <span className="text-yellow-600">⚠ Не подтверждён</span>}</div>
      </div>

      <form onSubmit={saveProfile} className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
        <h3 className="font-semibold text-gray-800">Основная информация</h3>
        {msg && <div className="text-sm text-green-700">{msg}</div>}
        {[['full_name','Имя и фамилия'],['company_name','Компания']].map(([k,l]) => (
          <div key={k}>
            <label className="block text-sm font-medium text-gray-700 mb-1">{l}</label>
            <input type="text" value={form[k]} onChange={e => setForm(f => ({...f,[k]:e.target.value}))}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
          </div>
        ))}
        <button type="submit" className="bg-teal-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-teal-700 transition-colors">Сохранить</button>
      </form>

      <form onSubmit={changePassword} className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
        <h3 className="font-semibold text-gray-800">Изменить пароль</h3>
        {pwMsg && <div className="text-sm text-green-700">{pwMsg}</div>}
        {[['current_password','Текущий пароль'],['new_password','Новый пароль'],['confirm','Повторите пароль']].map(([k,l]) => (
          <div key={k}>
            <label className="block text-sm font-medium text-gray-700 mb-1">{l}</label>
            <input type="password" required value={pwForm[k]} onChange={e => setPwForm(f => ({...f,[k]:e.target.value}))}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
          </div>
        ))}
        <button type="submit" className="bg-gray-800 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-900 transition-colors">Изменить пароль</button>
      </form>
    </div>
  );
}
