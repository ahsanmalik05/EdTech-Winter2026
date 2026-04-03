import { useState } from 'react';
import { Loader2, ArrowRight } from 'lucide-react';
import { cn } from '../lib/utils';
import { api } from '../api/api';

interface AuthScreenProps {
  onAuth: (user: { id: number; email: string; role: 'user' | 'admin' }) => void;
}

export function AuthScreen({ onAuth }: AuthScreenProps) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [showResend, setShowResend] = useState(false);

  const handleSubmit = async () => {
    if (!email.trim() || !password.trim()) return;
    setLoading(true);
    setError('');
    setNotice('');
    setShowResend(false);
    try {
      const endpoint = mode === 'login' ? '/api/auth/login' : '/api/auth/register';
      const res = await api.post(endpoint, { email: email.trim(), password });

      if (mode === 'register') {
        setNotice(
          res.data?.message ||
            'Registration successful. Please verify your email before signing in.'
        );
        setMode('login');
        return;
      }
      onAuth(res.data.user);
    } catch (err: any) {
      const verificationRequired = !!err.response?.data?.verificationRequired;
      setError(
        err.response?.data?.error ||
          (mode === 'login' ? 'Login failed' : 'Registration failed')
      );
      setShowResend(mode === 'login' && verificationRequired);
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    if (!email.trim() || resendLoading) return;

    setResendLoading(true);
    setError('');
    try {
      const res = await api.post('/api/auth/resend-verification', { email: email.trim() });
      setNotice(res.data?.message || 'Verification email sent. Please check your inbox.');
      setShowResend(false);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to resend verification email.');
    } finally {
      setResendLoading(false);
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

        {notice && (
          <div className="mb-4 bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-2.5">
            <p className="text-emerald-700 text-sm">{notice}</p>
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

          {showResend && (
            <div className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3">
              <p className="text-xs text-zinc-500 mb-2">Didn&apos;t receive the verification email?</p>
              <button
                onClick={handleResendVerification}
                disabled={!email.trim() || resendLoading}
                className="w-full flex items-center justify-center gap-2 rounded-md bg-white border border-zinc-200 text-zinc-700 hover:bg-zinc-100 disabled:text-zinc-300 disabled:border-zinc-200 disabled:bg-zinc-50 px-4 py-2 text-sm font-medium transition-colors"
              >
                {resendLoading ? <Loader2 className="size-4 animate-spin" /> : null}
                {resendLoading ? 'Sending verification...' : 'Resend verification email'}
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="absolute bottom-6 text-center">
        <p className="text-zinc-300 text-xs">METY Technology — CSC 392 / 492</p>
      </div>
    </div>
  );
}
