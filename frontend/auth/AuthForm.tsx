import React, { useMemo, useState } from 'react';
import { Logo, Spinner } from '../constants';

type Props = {
  mode: 'login' | 'register';
  onSubmit: (email: string, password: string) => Promise<void>;
  loading: boolean;
  error: string | null;
  onSwitchMode: () => void;
};

export const AuthForm: React.FC<Props> = ({ mode, onSubmit, loading, error, onSwitchMode }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const title = useMemo(() => (mode === 'login' ? 'Welcome back' : 'Create your account'), [mode]);
  const subtitle = useMemo(
    () => (mode === 'login' ? 'Sign in to continue to Gendoc Assistant' : 'Sign up to start translating and summarizing documents'),
    [mode]
  );

  return (
    <div className="min-h-screen bg-base-bg text-white/90">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(1100px_circle_at_15%_10%,rgba(56,189,248,0.18),transparent_55%),radial-gradient(900px_circle_at_85%_20%,rgba(34,197,94,0.12),transparent_55%),radial-gradient(800px_circle_at_50%_85%,rgba(245,158,11,0.10),transparent_50%)]" />
      <div className="relative flex min-h-screen items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-xl shadow-soft">
            <div className="p-6 sm:p-8">
              <div className="flex items-center gap-3 mb-7">
                <div className="grid h-11 w-11 place-items-center rounded-2xl bg-white/5 ring-1 ring-white/10">
                  <Logo className="h-6 w-6 text-accent-primary" />
                </div>
                <div className="min-w-0">
                  <h1 className="text-xl font-semibold tracking-tight text-white">{title}</h1>
                  <p className="mt-1 text-sm text-white/55">{subtitle}</p>
                </div>
              </div>

              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  await onSubmit(email.trim(), password);
                }}
                className="space-y-4"
              >
                <div>
                  <label className="block text-sm font-medium text-white/70 mb-1">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white/80 placeholder:text-white/40 outline-none focus:ring-2 focus:ring-[rgba(56,189,248,0.25)]"
                    placeholder="you@example.com"
                    disabled={loading}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-white/70 mb-1">Password</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 pr-24 text-sm text-white/80 placeholder:text-white/40 outline-none focus:ring-2 focus:ring-[rgba(56,189,248,0.25)]"
                      placeholder="Min 6 characters"
                      disabled={loading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((s) => !s)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-white/70 transition-colors hover:bg-white/10"
                      disabled={loading}
                    >
                      {showPassword ? 'Hide' : 'Show'}
                    </button>
                  </div>
                </div>

                {error ? (
                  <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</div>
                ) : null}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full inline-flex items-center justify-center rounded-xl bg-accent-primary px-4 py-2.5 text-sm font-semibold text-slate-900 transition-all hover:shadow-[0_0_0_3px_rgba(56,189,248,0.16)] disabled:opacity-60"
                >
                  {loading ? <Spinner className="w-5 h-5" /> : mode === 'login' ? 'Sign In' : 'Create Account'}
                </button>
              </form>

              <div className="mt-6 text-sm text-white/55">
                {mode === 'login' ? (
                  <div className="flex items-center justify-between">
                    <span>Don’t have an account?</span>
                    <button onClick={onSwitchMode} className="text-accent-primary hover:opacity-90 font-semibold" disabled={loading}>
                      Sign up
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <span>Already have an account?</span>
                    <button onClick={onSwitchMode} className="text-accent-primary hover:opacity-90 font-semibold" disabled={loading}>
                      Sign in
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="px-6 sm:px-8 py-4 border-t border-white/10 bg-white/[0.02] text-xs text-white/40">
              Tip: start MongoDB and backend API first.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
