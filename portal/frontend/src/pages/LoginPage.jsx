import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.jsx';

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
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
    <div className="min-h-screen flex items-center justify-center bg-[#f7f6f2] px-4">
      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-3">
            <svg width="36" height="36" viewBox="0 0 36 36" fill="none" aria-label="O-Horizons" className="text-[#01696f]">
              <rect width="36" height="36" rx="8" fill="currentColor" />
              <path d="M10 18a8 8 0 1 1 16 0 8 8 0 0 1-16 0Z" stroke="white" strokeWidth="2.5" fill="none" />
              <path d="M18 10v16M10 18h16" stroke="white" strokeWidth="2" strokeLinecap="round" />
            </svg>
            <span className="text-xl font-bold text-[#28251d] tracking-tight">1С Облако</span>
          </div>
          <p className="text-sm text-[#7a7974]">O-Horizons Portal</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl border border-[#dcd9d5] shadow-sm p-8">
          <h2 className="text-lg font-semibold text-[#28251d] mb-6">Вход в систему</h2>

          {error && (
            <div className="mb-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-[#28251d] mb-1.5">Email</label>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                className="w-full border border-[#d4d1ca] rounded-lg px-3 py-2.5 text-sm bg-white text-[#28251d] placeholder-[#bab9b4] focus:outline-none focus:ring-2 focus:ring-[#01696f]/30 focus:border-[#01696f] transition-colors"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-[#28251d] mb-1.5">Пароль</label>
              <input
                id="password"
                type="password"
                required
                autoComplete="current-password"
                value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                className="w-full border border-[#d4d1ca] rounded-lg px-3 py-2.5 text-sm bg-white text-[#28251d] placeholder-[#bab9b4] focus:outline-none focus:ring-2 focus:ring-[#01696f]/30 focus:border-[#01696f] transition-colors"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#01696f] hover:bg-[#0c4e54] text-white rounded-lg py-2.5 text-sm font-medium transition-colors disabled:opacity-60 disabled:cursor-not-allowed mt-2"
            >
              {loading ? (
                <span className="inline-flex items-center gap-2 justify-center">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  Вход...
                </span>
              ) : 'Войти'}
            </button>
          </form>

          <div className="mt-5 text-center text-sm text-[#7a7974] space-y-1.5">
            <div>
              <Link to="/forgot-password" className="text-[#01696f] hover:text-[#0c4e54] hover:underline transition-colors">
                Забыли пароль?
              </Link>
            </div>
            <div>
              Нет аккаунта?{' '}
              <Link to="/register" className="text-[#01696f] hover:text-[#0c4e54] hover:underline transition-colors">
                Зарегистрироваться
              </Link>
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-[#bab9b4] mt-6">
          © {new Date().getFullYear()} O-Horizons. Все права защищены.
        </p>
      </div>
    </div>
  );
}
