import { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

interface User {
  username: string;
  display_name: string;
  email: string;
  partner: string | null;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string, displayName: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>(null!);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('dunya_token'));
  // loading=true only if a token exists (need to verify it on mount)
  const [loading, setLoading] = useState<boolean>(!!localStorage.getItem('dunya_token'));

  useEffect(() => {
    if (token) {
      refreshUser();
    } else {
      setLoading(false);
    }
  }, []);

  const refreshUser = async () => {
    const t = localStorage.getItem('dunya_token');
    if (!t) { setLoading(false); return; }
    try {
      const res = await axios.get('/api/auth/me', {
        headers: { Authorization: `Bearer ${t}` },
      });
      setUser(res.data);
    } catch {
      // Token invalid or expired → logout cleanly
      localStorage.removeItem('dunya_token');
      setToken(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (username: string, password: string) => {
    const fd = new FormData();
    fd.append('username', username);
    fd.append('password', password);
    const res = await axios.post('/api/auth/login', fd);
    const { token: t, ...userData } = res.data;
    localStorage.setItem('dunya_token', t);
    setToken(t);
    setUser(userData as User);
  };

  const register = async (username: string, email: string, password: string, displayName: string) => {
    const fd = new FormData();
    fd.append('username', username);
    fd.append('email', email);
    fd.append('password', password);
    fd.append('display_name', displayName);
    const res = await axios.post('/api/auth/register', fd);
    const { token: t, ...userData } = res.data;
    localStorage.setItem('dunya_token', t);
    setToken(t);
    setUser(userData as User);
  };

  const logout = () => {
    localStorage.removeItem('dunya_token');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
