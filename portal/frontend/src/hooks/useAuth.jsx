import { createContext, useContext, useState, useEffect } from 'react';
import { api, setToken } from '../lib/api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]     = useState(null);
  const [token, setTkn]     = useState(null);
  const [loading, setLoading] = useState(true);

  // Восстановление сессии из sessionStorage (работает в отличие от localStorage)
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem('auth_token');
      if (saved) {
        setToken(saved);
        setTkn(saved);
        api.auth.me()
          .then((r) => setUser(r.user || r))
          .catch(() => { sessionStorage.removeItem('auth_token'); setToken(null); setTkn(null); })
          .finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    } catch {
      // sessionStorage недоступен (iframe sandbox) — работаем без персистенции
      setLoading(false);
    }
  }, []);

  const login = async (email, password) => {
    const r = await api.auth.login({ email, password });
    // Бэкенд возвращает { token, user }
    const t = r.token;
    const u = r.user;
    setToken(t);
    setTkn(t);
    setUser(u);
    try { sessionStorage.setItem('auth_token', t); } catch {}
    return u;
  };

  const logout = () => {
    api.auth.logout().catch(() => {});
    setToken(null);
    setTkn(null);
    setUser(null);
    try { sessionStorage.removeItem('auth_token'); } catch {}
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
