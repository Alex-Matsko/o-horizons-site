import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { api, setToken, clearToken, setUnauthorizedHandler } from '../lib/api.js';

const AuthContext = createContext(null);

// Access token живёт 15 мин — обновляем за 2 мин до истечения (= каждые 13 мин)
const REFRESH_INTERVAL_MS = 13 * 60 * 1000;

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true);
  const refreshTimer          = useRef(null);

  const stopRefresh = () => {
    if (refreshTimer.current) clearInterval(refreshTimer.current);
    refreshTimer.current = null;
  };

  const logout = useCallback(() => {
    stopRefresh();
    api.auth.logout().catch(() => {});
    clearToken();
    setUser(null);
    try { sessionStorage.removeItem('auth_token'); } catch {}
  }, []);

  // Тихий рефреш через httpOnly cookie refresh_token
  const doRefresh = useCallback(async () => {
    try {
      const r = await api.auth.refresh();
      const t = r?.access_token;
      if (!t) throw new Error('no token');
      setToken(t);
      try { sessionStorage.setItem('auth_token', t); } catch {}
    } catch {
      logout();
    }
  }, [logout]);

  const startRefresh = useCallback(() => {
    stopRefresh();
    refreshTimer.current = setInterval(doRefresh, REFRESH_INTERVAL_MS);
  }, [doRefresh]);

  // Глобальный обработчик 401: сначала побуем тихо обновить токен, если не вышло — logout
  useEffect(() => {
    setUnauthorizedHandler(async () => {
      try {
        await doRefresh();
      } catch {
        logout();
      }
    });
  }, [doRefresh, logout]);

  // Инициализация: если есть сохранённый токен — проверяем его, иначе пробуем refresh
  useEffect(() => {
    (async () => {
      try {
        const saved = sessionStorage.getItem('auth_token');
        if (saved) {
          setToken(saved);
          try {
            const me = await api.auth.me();
            setUser(me.user || me);
            startRefresh();
          } catch {
            // Токен просрочен — пробуем refresh через cookie
            clearToken();
            try { sessionStorage.removeItem('auth_token'); } catch {}
            try {
              const r = await api.auth.refresh();
              const t = r?.access_token;
              if (!t) throw new Error();
              setToken(t);
              try { sessionStorage.setItem('auth_token', t); } catch {}
              const me = await api.auth.me();
              setUser(me.user || me);
              startRefresh();
            } catch {
              // refresh тоже не работает — пустой логин
            }
          }
        } else {
          // Нет сохранённого токена — пробуем refresh через cookie (новая вкладка/F5)
          try {
            const r = await api.auth.refresh();
            const t = r?.access_token;
            if (t) {
              setToken(t);
              try { sessionStorage.setItem('auth_token', t); } catch {}
              const me = await api.auth.me();
              setUser(me.user || me);
              startRefresh();
            }
          } catch {
            // Нет сессии — показываем страницу логина
          }
        }
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    })();

    return stopRefresh;
  }, [startRefresh]);

  const login = async (email, password) => {
    const r = await api.auth.login({ email, password });
    const t = r.access_token || r.token;
    if (!t) throw new Error('Нет токена в ответе сервера');
    setToken(t);
    try { sessionStorage.setItem('auth_token', t); } catch {}
    const me = await api.auth.me();
    const u = me.user || me;
    setUser(u);
    startRefresh();
    return u;
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
