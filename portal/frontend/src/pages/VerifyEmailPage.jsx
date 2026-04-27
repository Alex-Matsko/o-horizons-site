import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { api } from '../lib/api.js';

export default function VerifyEmailPage() {
  const [params] = useSearchParams();
  const [status, setStatus] = useState('loading');

  useEffect(() => {
    const token = params.get('token');
    if (!token) { setStatus('error'); return; }
    api.auth.verify(token)
      .then(() => setStatus('ok'))
      .catch(() => setStatus('error'));
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="bg-white rounded-xl shadow p-8 max-w-md w-full text-center">
        {status === 'loading' && <div className="text-gray-500">Проверка...</div>}
        {status === 'ok' && (
          <>
            <div className="text-4xl mb-3">✅</div>
            <h2 className="text-xl font-semibold mb-2">Email подтверждён!</h2>
            <p className="text-gray-500 text-sm mb-4">Теперь вы можете войти в систему.</p>
            <Link to="/login" className="bg-teal-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-teal-700 inline-block">Войти</Link>
          </>
        )}
        {status === 'error' && (
          <>
            <div className="text-4xl mb-3">❌</div>
            <h2 className="text-xl font-semibold mb-2">Ошибка</h2>
            <p className="text-gray-500 text-sm mb-4">Ссылка недействительна или устарела.</p>
            <Link to="/login" className="text-teal-600 hover:underline text-sm">На страницу входа</Link>
          </>
        )}
      </div>
    </div>
  );
}
