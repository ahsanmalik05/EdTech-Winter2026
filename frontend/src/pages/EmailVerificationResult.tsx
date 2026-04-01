import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle2, XCircle } from 'lucide-react';

export function EmailVerificationResult() {
  const [searchParams] = useSearchParams();
  const status = searchParams.get('status');
  const message = searchParams.get('message');

  const isSuccess = status === 'success';
  const title = isSuccess ? 'You are verified' : 'Email verification failed';
  const description = isSuccess
    ? 'Your account has been verified successfully. You can close this tab and sign in.'
    : message || 'This verification link is invalid or expired. Please request a new verification email.';

  return (
    <div className="min-h-dvh flex items-center justify-center px-6 bg-zinc-50">
      <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm text-center">
        <div className="mb-4 flex justify-center">
          {isSuccess ? (
            <CheckCircle2 className="size-12 text-emerald-500" />
          ) : (
            <XCircle className="size-12 text-red-500" />
          )}
        </div>

        <h1 className="text-2xl font-semibold text-zinc-900 mb-2">{title}</h1>
        <p className="text-sm text-zinc-500 mb-7">{description}</p>

        <div className="flex gap-3 justify-center">
          <Link
            to="/login"
            className="inline-flex items-center justify-center rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 transition-colors"
          >
            Back to Login
          </Link>
          {!isSuccess && (
            <Link
              to="/login"
              className="inline-flex items-center justify-center rounded-lg border border-zinc-300 px-4 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 transition-colors"
            >
              Try Again
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
