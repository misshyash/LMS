import React, { useState } from 'react';
import { Logo } from '../shared/Logo';
import { useAuth } from '../../context/AuthProvider';
import { DEMO_MODE } from '../../firebase';

export const LoginScreen: React.FC = () => {
  const { signInWithGoogle, demoSignIn } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGoogle = async () => {
    setBusy(true);
    setError(null);
    try {
      await signInWithGoogle();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Sign-in failed. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const handleDemo = async (role: 'candidate' | 'admin') => {
    setBusy(true);
    setError(null);
    try {
      await demoSignIn(role);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Sign-in failed.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6 bg-gradient-to-br from-white via-slate-50 to-trainito-teal/5 dark:from-slate-950 dark:via-slate-950 dark:to-trainito-teal/10">
      <div className="w-full max-w-md">
        <div className="glass rounded-[2.5rem] p-10 shadow-2xl border border-white/30 flex flex-col items-center">
          <Logo />

          <div className="w-full mt-10 space-y-3">
            <button
              onClick={handleGoogle}
              disabled={busy || DEMO_MODE}
              className="w-full flex items-center justify-center gap-3 p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold text-sm shadow-sm hover:shadow-md transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <svg width="18" height="18" viewBox="0 0 48 48">
                <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.6-6 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 8 3l6-6C34.1 5.1 29.3 3 24 3 12.4 3 3 12.4 3 24s9.4 21 21 21 21-9.4 21-21c0-1.4-.1-2.5-.4-3.5z" />
                <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 15.9 18.9 13 24 13c3.1 0 5.8 1.1 8 3l6-6C34.1 5.1 29.3 3 24 3 16.1 3 9.2 7.4 6.3 14.7z" />
                <path fill="#4CAF50" d="M24 45c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 36.2 26.7 37 24 37c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.1 40.5 16 45 24 45z" />
                <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.2 4.2-4.1 5.6l6.2 5.2C40.9 36 44 30.5 44 24c0-1.4-.1-2.5-.4-3.5z" />
              </svg>
              Continue with Google
            </button>

            {DEMO_MODE && (
              <>
                <div className="flex items-center gap-3 py-2">
                  <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
                  <span className="text-[9px] font-black uppercase tracking-widest text-amber-600">Demo Mode</span>
                  <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
                </div>
                <button
                  onClick={() => handleDemo('candidate')}
                  disabled={busy}
                  className="w-full p-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-lg active:scale-95 transition-all disabled:opacity-50"
                >
                  Sign in as Demo Candidate
                </button>
                <button
                  onClick={() => handleDemo('admin')}
                  disabled={busy}
                  className="w-full p-4 bg-trainito-coral text-white rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-lg active:scale-95 transition-all disabled:opacity-50"
                >
                  Sign in as Demo Admin
                </button>
                <p className="text-[9px] text-slate-400 text-center leading-relaxed pt-1">
                  No Firebase project is connected yet, so Google Sign-In is disabled. Configure
                  <code className="mx-1 px-1 bg-slate-100 dark:bg-slate-800 rounded">.env</code>
                  (see SETUP.md) to enable real accounts.
                </p>
              </>
            )}
          </div>

          {error && (
            <p className="mt-4 text-xs font-bold text-rose-600 bg-rose-50 dark:bg-rose-950/30 px-4 py-2 rounded-xl w-full text-center">
              {error}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
