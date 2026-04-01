import { useState, useEffect } from 'react';
import {
  Routes,
  Route,
  NavLink,
  Navigate,
  Outlet,
} from 'react-router-dom';
import { Languages, Sparkles, KeyRound, Loader2, LogOut, BarChart3, ScrollText, Globe } from 'lucide-react';
import { cn } from './lib/utils';
import { api } from './api/api';
import { AuthScreen } from './pages/AuthScreen';
import { KeySetup } from './pages/KeySetup';
import { TranslationStudio } from './pages/TranslationStudio';
import { TemplateGenerator } from './pages/TemplateGenerator';
import { TranslationStats } from './pages/TranslationStats';
import { TranslationLog } from './pages/TranslationLog';
import { TemplateGenerationLog } from './pages/TemplateGenerationLog';
import { LanguageManager } from './pages/LanguageManager';

interface AppUser {
  id: number;
  email: string;
}

function NeedKeyPrompt() {
  return (
    <div className="flex flex-col items-center justify-center py-32">
      <div className="size-12 rounded-full bg-zinc-100 flex items-center justify-center mb-4">
        <KeyRound className="size-5 text-zinc-400" />
      </div>
      <h2 className="text-lg font-medium text-zinc-900 mb-1 text-balance">
        No API key active
      </h2>
      <p className="text-zinc-400 text-sm mb-6 text-pretty max-w-sm text-center">
        Create and activate an API key to start using this feature.
      </p>
      <NavLink
        to="/keys"
        className="flex items-center gap-2 bg-zinc-900 text-white hover:bg-zinc-800 rounded-lg px-5 py-2.5 text-sm font-medium transition-colors"
      >
        <KeyRound className="size-3.5" />
        Set Up API Key
      </NavLink>
    </div>
  );
}

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    'flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
    isActive ? 'bg-zinc-100 text-zinc-900' : 'text-zinc-400 hover:text-zinc-600'
  );

function AppLayout({
  user,
  apiKey,
  onLogout,
}: {
  user: AppUser;
  apiKey: string;
  onLogout: () => void;
}) {
  return (
    <div className="min-h-dvh flex flex-col">
      <header className="border-b border-zinc-100 sticky top-0 z-10 bg-white/80 backdrop-blur-sm">
        <div className="max-w-5xl mx-auto px-6 flex items-center justify-between h-14">
          <h1 className="font-display text-xl text-zinc-900 select-none">METY</h1>

          <nav className="flex items-center gap-1 p-1">
            <NavLink to="/translate" className={navLinkClass}>
              <Languages className="size-3.5" />
              Translate
            </NavLink>
            <NavLink to="/generate" className={navLinkClass}>
              <Sparkles className="size-3.5" />
              Generate
            </NavLink>
            <NavLink to="/logs" className={navLinkClass}>
              <ScrollText className="size-3.5" />
              Logs
            </NavLink>
            <NavLink to="/template-logs" className={navLinkClass}>
              <ScrollText className="size-3.5" />
              Template Logs
            </NavLink>
            <NavLink to="/stats" className={navLinkClass}>
              <BarChart3 className="size-3.5" />
              Stats
            </NavLink>
            <NavLink to="/languages" className={navLinkClass}>
              <Globe className="size-3.5" />
              Languages
            </NavLink>
            <NavLink to="/keys" className={navLinkClass}>
              <KeyRound className="size-3.5" />
              Keys
              {!apiKey && <span className="size-1.5 rounded-full bg-amber-400" />}
            </NavLink>
          </nav>

          <div className="flex items-center gap-2">
            <span className="text-xs text-zinc-400 hidden sm:inline">{user.email}</span>
            <button
              onClick={onLogout}
              className="text-zinc-300 hover:text-zinc-500 transition-colors p-1.5 rounded-md"
              aria-label="Log out"
            >
              <LogOut className="size-3.5" />
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-5xl mx-auto px-6 py-10 pb-24 w-full">
        <Outlet />
      </main>

      <footer className="border-t border-zinc-100 py-6">
        <div className="max-w-5xl mx-auto px-6 flex items-center justify-between">
          <p className="text-zinc-300 text-xs">METY Technology — CSC 392 / 492</p>
          <p className="text-zinc-300 text-xs font-display italic">METY</p>
        </div>
      </footer>
    </div>
  );
}

export function App() {
  const [token, setToken] = useState(() => localStorage.getItem('token') || '');
  const [user, setUser] = useState<AppUser | null>(null);
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('api_key') || '');
  const [checkingAuth, setCheckingAuth] = useState(() => !!localStorage.getItem('token'));

  useEffect(() => {
    if (!token) {
      setCheckingAuth(false);
      return;
    }
    api
      .get('/api/auth/me')
      .then((res) => setUser(res.data.user))
      .catch(() => {
        localStorage.removeItem('token');
        localStorage.removeItem('api_key');
        setToken('');
        setApiKey('');
      })
      .finally(() => setCheckingAuth(false));
  }, []);

  const handleAuth = (newToken: string, userData: AppUser) => {
    localStorage.setItem('token', newToken);
    setToken(newToken);
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('api_key');
    setToken('');
    setUser(null);
    setApiKey('');
  };

  const handleActivateKey = (key: string) => {
    localStorage.setItem('api_key', key);
    setApiKey(key);
  };

  const handleDeactivateKey = () => {
    localStorage.removeItem('api_key');
    setApiKey('');
  };

  if (checkingAuth) {
    return (
      <div className="min-h-dvh flex items-center justify-center">
        <Loader2 className="size-5 text-zinc-300 animate-spin" />
      </div>
    );
  }

  const isAuthed = !!token && !!user;

  return (
    <Routes>
      <Route
        path="/login"
        element={
          isAuthed ? (
            <Navigate to={apiKey ? '/translate' : '/keys'} replace />
          ) : (
            <AuthScreen onAuth={handleAuth} />
          )
        }
      />

      <Route
        element={
          isAuthed ? (
            <AppLayout user={user} apiKey={apiKey} onLogout={handleLogout} />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      >
        <Route
          path="/translate"
          element={apiKey ? <TranslationStudio /> : <NeedKeyPrompt />}
        />
        <Route
          path="/generate"
          element={apiKey ? <TemplateGenerator /> : <NeedKeyPrompt />}
        />
        <Route
          path="/logs"
          element={apiKey ? <TranslationLog /> : <NeedKeyPrompt />}
        />
        <Route
          path="/template-logs"
          element={apiKey ? <TemplateGenerationLog /> : <NeedKeyPrompt />}
        />
        <Route
          path="/stats"
          element={apiKey ? <TranslationStats /> : <NeedKeyPrompt />}
        />
        <Route
          path="/languages"
          element={apiKey ? <LanguageManager /> : <NeedKeyPrompt />}
        />
        <Route
          path="/keys"
          element={
            <KeySetup
              onActivateKey={handleActivateKey}
              activeKey={apiKey}
              onDeactivateKey={handleDeactivateKey}
            />
          }
        />
        <Route
          path="*"
          element={<Navigate to={apiKey ? '/translate' : '/keys'} replace />}
        />
      </Route>
    </Routes>
  );
}
