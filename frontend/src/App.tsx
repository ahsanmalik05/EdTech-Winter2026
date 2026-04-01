import { useState, useEffect } from 'react';
import {
  Routes,
  Route,
  NavLink,
  Navigate,
  Outlet,
} from 'react-router-dom';
import { KeyRound, Loader2 } from 'lucide-react';
import { api } from './api/api';
import { AppSidebar } from './components/AppSidebar';
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
    <div className="flex h-dvh w-full">
      <AppSidebar userEmail={user.email} apiKey={apiKey} onLogout={onLogout} />

      <main className="ml-[3.05rem] flex flex-1 flex-col overflow-auto">
        <div className="mx-auto w-full max-w-5xl flex-1 px-8 py-10 pb-24">
          <Outlet />
        </div>

        <footer className="border-t border-zinc-100 py-6">
          <div className="mx-auto max-w-5xl px-8 flex items-center justify-between">
            <p className="text-zinc-300 text-xs">METY Technology — CSC 392 / 492</p>
            <p className="text-zinc-300 text-xs font-display italic">METY</p>
          </div>
        </footer>
      </main>
    </div>
  );
}

export function App() {
  const [user, setUser] = useState<AppUser | null>(null);
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('api_key') || '');
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    api
      .get('/api/auth/me')
      .then((res) => setUser(res.data.user))
      .catch(() => {
        localStorage.removeItem('api_key');
        setApiKey('');
      })
      .finally(() => setCheckingAuth(false));
  }, []);

  const handleAuth = (userData: AppUser) => {
    setUser(userData);
  };

  const handleLogout = async () => {
    try { await api.post('/api/auth/logout'); } catch {}
    localStorage.removeItem('api_key');
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

  const isAuthed = !!user;

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
