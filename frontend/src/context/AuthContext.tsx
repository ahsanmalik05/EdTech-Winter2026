import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../api/api';

interface User {
  id: number;
  email: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (token: string, userData: User) => void;
  logout: () => void;
  setApiKey: (key: string) => void;
  apiKey: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [apiKey, setApiKeyState] = useState<string | null>(localStorage.getItem('api_key'));

  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const res = await api.get('/api/auth/me');
          setUser(res.data.user);
        } catch (err) {
          console.error('Auth check failed', err);
          localStorage.removeItem('token');
        }
      }
      setLoading(false);
    };
    initAuth();
  }, []);

  const login = (token: string, userData: User) => {
    localStorage.setItem('token', token);
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('token');
    Object.keys(localStorage)
      .filter(key => key.startsWith('token_'))
      .forEach(key => localStorage.removeItem(key));
    setUser(null);
  };

  const setApiKey = (key: keyof typeof localStorage extends string ? string : string) => {
    if (!key) {
      localStorage.removeItem('api_key');
      setApiKeyState(null);
    } else {
      localStorage.setItem('api_key', key);
      setApiKeyState(key);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, setApiKey, apiKey }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
