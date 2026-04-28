import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.jsx';

export default function LoginPage() {
  const navigate  = useNavigate();
  const { login } = useAuth();
  const [form,    setForm]    = useState({ email: '', password: '' });
  const [error,   setError]   = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await login(form.email, form.password);
      navigate(user.role === 'admin' ? '/admin' : '/dashboard', { replace: true });
    } catch (err) {
      setError(err.message || 'Неверный email или пароль');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0f0e0d] px-4">
      <div className="w-full max-w-sm">

        <div className="flex items-center justify-center gap-2.5 mb-8">
          <div className="w-9 h-9 rounded-xl bg-teal-500 flex items-center justify-center">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <circle cx="9" cy="9" r="6" stroke="white" strokeWidth="1.8"/>
              <path d="M9 3.5v11M3.5 9h11" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </div>
          <div>
            <div className="text-base font-bold text-white leading-none">O-Horizons</div>
            <div className="text-[11px] text-gray-500 uppercase tracking-widest">1С Портал</div>
          </div>
        </div>

        <div className="bg-[#1a1917] border border-white/10 rounded-2xl p-7 shadow-2xl">
          <h2 className="text-base font-semibold text-white mb-5">Вход в систему</h2>

          {error && (
            <div className="mb-4 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-xs font-medium text-gray-400 mb-1.5">Email</label>
              <input
                id="email" type="email" required autoComplete="email"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-teal-500/50 focus:border-teal-500/50 transition-colors"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-xs font-medium text-gray-400 mb-1.5">Пароль</label>
              <input
                id="password" type="password" required autoComplete="current-password"
                value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-teal-500/50 focus:border-teal-500/50 transition-colors"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit" disabled={loading}
              className="w-full bg-teal-600 hover:bg-teal-500 text-white rounded-lg py-2.5 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-1"
            >
              {loading ? (
                <span className="inline-flex items-center gap-2 justify-center">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                  </svg>
                  Вход...
                </span>
              ) : 'Войти'}
            </button>
          </form>

          <div className="mt-5 text-center text-xs text-gray-600 space-y-1.5">
            <div>
              <Link to="/forgot-password" className="text-teal-500 hover:text-teal-400 transition-colors">
                Забыли пароль?
              </Link>
            </div>
            <div>
              Нет аккаунта?{' '}
              <Link to="/register" className="text-teal-500 hover:text-teal-400 transition-colors">
                Зарегистрироваться
              </Link>
            </div>
          </div>
        </div>

        <p className="text-center text-[11px] text-gray-700 mt-5">
          © {new Date().getFullYear()} O-Horizons. Все права защищены.
        </p>
      </div>
    </div>
  );
}
