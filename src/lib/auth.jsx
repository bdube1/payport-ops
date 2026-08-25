import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('ops_user')); } catch { return null; }
  });

  const login = (userData, token) => {
    setUser(userData);
    localStorage.setItem('ops_user', JSON.stringify(userData));
    localStorage.setItem('ops_token', token);
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('ops_user');
    localStorage.removeItem('ops_token');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
