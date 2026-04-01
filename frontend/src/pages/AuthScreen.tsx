import { useState } from 'react';
import { Loader2, ArrowRight } from 'lucide-react';
import { cn } from '../lib/utils';
import { api } from '../api/api';

interface AuthScreenProps {
  onAuth: (user: { id: number; email: string }) => void;
}

export function AuthScreen({ onAuth }: AuthScreenProps) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!email.trim() || !password.trim()) return;
    setLoading(true);
    setError('');
    try {
      const endpoint = mode === 'login' ? '/api/auth/login' : '/api/auth/register';
      const res = await api.post(endpoint, { email: email.trim(), password });
      onAuth(res.data.user);
    } catch (err: any) {
      setError(
        err.response?.data?.error ||
          (mode === 'login' ? 'Login failed' : 'Registration failed')
      );
    } finally {
      setLoading(false);
    }
  };

  const canSubmit = email.trim() && password.trim() && !loading;

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-10">
          <h1 className="font-display text-6xl text-zinc-900 mb-2 text-balance">METY</h1>
          <p className="text-zinc-400 text-base text-pretty">
            Educational AI Platform
          </p>
        </div>

        <div className="flex bg-zinc-100 rounded-lg p-1 mb-6">
          <button
            onClick={() => {
              setMode('login');
              setError('');
            }}
            className={cn(
              'flex-1 py-2 text-sm font-medium rounded-md transition-colors',
              mode === 'login'
                ? 'bg-white text-zinc-900 shadow-sm'
                : 'text-zinc-400'
            )}
          >
            Sign In
          </button>
          <button
            onClick={() => {
              setMode('register');
              setError('');
            }}
            className={cn(
              'flex-1 py-2 text-sm font-medium rounded-md transition-colors',
              mode === 'register'
                ? 'bg-white text-zinc-900 shadow-sm'
                : 'text-zinc-400'
            )}
          >
            Create Account
          </button>
        </div>

        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 rounded-lg px-4 py-2.5">
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}

        <div className="space-y-3">
          <div>
            <label
              htmlFor="auth-email"
              className="block text-xs font-medium text-zinc-500 mb-1.5"
            >
              Email
            </label>
            <input
              id="auth-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && canSubmit && handleSubmit()}
              placeholder="you@example.com"
              className="w-full border border-zinc-200 rounded-lg px-4 py-2.5 text-zinc-900 text-sm placeholder:text-zinc-300 focus:outline-none focus:border-zinc-400 bg-white"
            />
          </div>
          <div>
            <label
              htmlFor="auth-password"
              className="block text-xs font-medium text-zinc-500 mb-1.5"
            >
              Password
            </label>
            <input
              id="auth-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && canSubmit && handleSubmit()}
              placeholder="••••••••"
              className="w-full border border-zinc-200 rounded-lg px-4 py-2.5 text-zinc-900 text-sm placeholder:text-zinc-300 focus:outline-none focus:border-zinc-400 bg-white"
            />
          </div>
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="w-full flex items-center justify-center gap-2 bg-zinc-900 hover:bg-zinc-800 disabled:bg-zinc-100 disabled:text-zinc-300 text-white font-medium rounded-lg px-6 py-2.5 text-sm transition-colors"
          >
            {loading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <>
                {mode === 'login' ? 'Sign In' : 'Create Account'}
                <ArrowRight className="size-4" />
              </>
            )}
          </button>
        </div>
      </div>

      <div className="absolute bottom-6 text-center">
        <p className="text-zinc-300 text-xs">METY Technology — CSC 392 / 492</p>
      </div>
    </div>
  );
}
