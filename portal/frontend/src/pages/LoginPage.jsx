import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../lib/api.js';

export default function LoginPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { token, user } = await api.auth.login(form);
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      navigate(user.role === 'admin' ? '/admin' : '/dashboard');
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900">1С Облако</h1>
          <p className="text-gray-500 mt-1">O-Horizons Portal</p>
        </div>
        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow p-8 space-y-4">
          <h2 className="text-lg font-semibold text-gray-800">Вход в систему</h2>
          {error && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-3">{error}</div>}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email" required value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Пароль</label>
            <input
              type="password" required value={form.password}
              onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
          <button
            type="submit" disabled={loading}
            className="w-full bg-teal-600 text-white rounded-lg py-2 font-medium hover:bg-teal-700 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Вход...' : 'Войти'}
          </button>
          <div className="text-center text-sm text-gray-500 space-y-1">
            <div><Link to="/forgot-password" className="text-teal-600 hover:underline">Забыли пароль?</Link></div>
            <div>Нет аккаунта? <Link to="/register" className="text-teal-600 hover:underline">Зарегистрироваться</Link></div>
          </div>
        </form>
      </div>
    </div>
  );
}
