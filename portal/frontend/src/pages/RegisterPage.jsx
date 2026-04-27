import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../lib/api.js';

export default function RegisterPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '', full_name: '', company_name: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.auth.register(form);
      setSuccess(true);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  if (success) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="bg-white rounded-xl shadow p-8 max-w-md w-full text-center">
        <div className="text-4xl mb-4">✉️</div>
        <h2 className="text-xl font-semibold mb-2">Подтвердите email</h2>
        <p className="text-gray-500 text-sm">Мы отправили письмо на <strong>{form.email}</strong>. Перейдите по ссылке в письме для активации аккаунта.</p>
        <Link to="/login" className="mt-6 inline-block text-teal-600 hover:underline text-sm">Перейти ко входу</Link>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900">1С Облако</h1>
          <p className="text-gray-500 mt-1">O-Horizons Portal</p>
        </div>
        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow p-8 space-y-4">
          <h2 className="text-lg font-semibold text-gray-800">Регистрация</h2>
          {error && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-3">{error}</div>}
          {[['full_name','Имя и фамилия','text'],['company_name','Компания','text'],['email','Email','email'],['password','Пароль','password']].map(([k,l,t]) => (
            <div key={k}>
              <label className="block text-sm font-medium text-gray-700 mb-1">{l}</label>
              <input type={t} required value={form[k]}
                onChange={e => setForm(f => ({ ...f, [k]: e.target.value }))}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
            </div>
          ))}
          <button type="submit" disabled={loading}
            className="w-full bg-teal-600 text-white rounded-lg py-2 font-medium hover:bg-teal-700 disabled:opacity-50 transition-colors">
            {loading ? 'Создание...' : 'Создать аккаунт'}
          </button>
          <div className="text-center text-sm text-gray-500">
            Уже есть аккаунт? <Link to="/login" className="text-teal-600 hover:underline">Войти</Link>
          </div>
        </form>
      </div>
    </div>
  );
}
