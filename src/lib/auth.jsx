import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from './api';

const AuthContext = createContext();

const pick = (u) => ({
  email: u.email, fullName: u.fullName, role: u.role, roleName: u.roleName, customRole: u.customRole,
  permissions: u.permissions, routes: u.routes,
});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('ops_user')); } catch { return null; }
  });

  const save = (u) => {
    setUser(u);
    localStorage.setItem('ops_user', JSON.stringify(u));
  };

  const login = (userData, token) => {
    localStorage.setItem('ops_token', token);
    save(userData);
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('ops_user');
    localStorage.removeItem('ops_token');
  };

  /** Re-reads the role's permissions, so a change made under Roles & permissions applies without signing in again. */
  const refresh = useCallback(async () => {
    if (!localStorage.getItem('ops_token')) return;
    try {
      const r = await api.get('/admin/roles/me');
      const d = r.data?.data ?? r.data;
      if (!d || !Array.isArray(d.routes)) return;
      setUser(prev => {
        if (!prev) return prev;
        const next = { ...prev, roleName: d.roleName, permissions: d.permissions, routes: d.routes };
        localStorage.setItem('ops_user', JSON.stringify(next));
        return next;
      });
    } catch { /* older gateway: keep the built-in role map */ }
  }, []);

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 5 * 60 * 1000);
    return () => clearInterval(t);
  }, [refresh]);

  return (
    <AuthContext.Provider value={{ user, login, logout, refresh, pick, save }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
export const can = (user, permission) => !Array.isArray(user?.permissions) || user.permissions.includes(permission);
