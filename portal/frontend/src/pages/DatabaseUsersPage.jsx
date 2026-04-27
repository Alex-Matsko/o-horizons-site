import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../lib/api.js';

export default function DatabaseUsersPage() {
  const { dbId } = useParams();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ username: '', fullname: '', password: '', roles: 'Пользователь' });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const load = () => api.users1c.list(dbId).then(r => setUsers(r.users || [])).finally(() => setLoading(false));
  useEffect(() => { load(); }, [dbId]);

  async function handleCreate(e) {
    e.preventDefault();
    setSaving(true); setError('');
    try {
      await api.users1c.create(dbId, { ...form, roles: [form.roles] });
      setShowForm(false);
      setForm({ username: '', fullname: '', password: '', roles: 'Пользователь' });
      load();
    } catch (e) { setError(e.message); }
    finally { setSaving(false); }
  }

  async function handleDelete(username) {
    if (!confirm(`Удалить пользователя ${username}?`)) return;
    await api.users1c.delete(dbId, username);
    load();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Пользователи 1С</h1>
        <button onClick={() => setShowForm(!showForm)}
          className="bg-teal-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-teal-700 transition-colors">
          + Добавить
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
          <h3 className="font-medium text-gray-800">Новый пользователь</h3>
          {error && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-2">{error}</div>}
          <div className="grid grid-cols-2 gap-3">
            {[['username','Логин'],['fullname','ФИО'],['password','Пароль'],['roles','Роль']].map(([k,l]) => (
              <div key={k}>
                <label className="block text-xs font-medium text-gray-600 mb-1">{l}</label>
                <input type={k==='password'?'password':'text'} required value={form[k]}
                  onChange={e => setForm(f => ({...f,[k]:e.target.value}))}
                  className="w-full border rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-1.5 border rounded text-sm hover:bg-gray-50">Отмена</button>
            <button type="submit" disabled={saving} className="px-4 py-1.5 bg-teal-600 text-white rounded text-sm hover:bg-teal-700 disabled:opacity-50">Сохранить</button>
          </div>
        </form>
      )}

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400">Загрузка...</div>
        ) : users.length === 0 ? (
          <div className="p-8 text-center text-gray-400">Нет пользователей</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>{['Логин','ФИО','Роли',''].map(h => <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.map(u => (
                <tr key={u.Name} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs">{u.Name}</td>
                  <td className="px-4 py-3 text-gray-700">{u.FullName}</td>
                  <td className="px-4 py-3 text-gray-500">{(u.Roles || []).join(', ')}</td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => handleDelete(u.Name)} className="text-red-500 hover:text-red-700 text-xs">Удалить</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
