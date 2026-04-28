import { createContext, useContext, useState, useEffect } from 'react';
import { api, setToken } from '../lib/api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [token, setTkn]       = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem('auth_token');
      if (saved) {
        setToken(saved);
        setTkn(saved);
        api.auth.me()
          .then((r) => setUser(r.user || r))
          .catch(() => {
            sessionStorage.removeItem('auth_token');
            setToken(null);
            setTkn(null);
          })
          .finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    } catch {
      setLoading(false);
    }
  }, []);

  const login = async (email, password) => {
    const r = await api.auth.login({ email, password });
    const t = r.token;
    if (!t) throw new Error('Нет токена в ответе сервера');

    setToken(t);
    setTkn(t);
    try { sessionStorage.setItem('auth_token', t); } catch {}

    // Загружаем полный профиль
    const me = await api.auth.me();
    const u = me.user || me;
    setUser(u);
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
