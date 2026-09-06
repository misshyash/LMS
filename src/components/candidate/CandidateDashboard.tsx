import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthProvider';
import { backend } from '../../services';
import type { Attempt } from '../../types';
import { TOTAL_QUESTIONS, MAX_ATTEMPTS, PASSING_PERCENTAGE } from '../../types';
import { formatDate } from '../../utils/time';

interface Props {
  onStarted: (attemptId: string) => void;
}

const StatCard: React.FC<{ label: string; value: React.ReactNode; accent?: string }> = ({ label, value, accent = 'border-trainito-teal' }) => (
  <div className={`glass rounded-3xl p-6 border-b-4 ${accent} shadow-sm`}>
    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</p>
    <p className="text-2xl font-black text-slate-900 dark:text-white tabular-nums">{value}</p>
  </div>
);

export const CandidateDashboard: React.FC<Props> = ({ onStarted }) => {
  const { user, profile, summary, signOutUser } = useAuth();
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    return backend.subscribeUserAttempts(user.uid, setAttempts);
  }, [user]);

  if (!user || !profile || !summary) return null;

  const inProgress = attempts.find((a) => a.status === 'in_progress');
  const locked = summary.disabled
    ? 'DISABLED'
    : summary.passed
    ? 'COMPLETED'
    : summary.attemptsUsed >= MAX_ATTEMPTS
    ? 'MAX_ATTEMPTS'
    : null;

  const handleStart = async () => {
    if (!profile.batch || !profile.assessmentId) return;
    setStarting(true);
    setError(null);
    try {
      const { attemptId } = await backend.startAttempt({
        assessmentId: profile.assessmentId,
        batch: profile.batch,
        programme: profile.programme || '',
      });
      onStarted(attemptId);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not start assessment.');
    } finally {
      setStarting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-6 py-10 space-y-8">
      <div className="glass rounded-[2.5rem] p-8 shadow-xl flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="flex items-center gap-6">
          {profile.photoURL ? (
            <img src={profile.photoURL} alt={profile.name} className="w-16 h-16 rounded-2xl object-cover shadow-lg" />
          ) : (
            <div className="w-16 h-16 rounded-2xl bg-trainito-teal flex items-center justify-center text-white font-black text-2xl shadow-lg">
              {profile.name.charAt(0)}
            </div>
          )}
          <div className="text-left">
            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Welcome</p>
            <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">{profile.name}</h2>
            <div className="flex flex-wrap items-center gap-2 mt-1">
              <span className="px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-full text-[8px] font-black uppercase tracking-widest text-slate-500">
                {profile.email}
              </span>
              {profile.batch && (
                <span className="px-3 py-1 bg-trainito-teal/10 text-trainito-teal rounded-full text-[8px] font-black uppercase tracking-widest">
                  {profile.batch}
                </span>
              )}
              <span className="px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-full text-[8px] font-black uppercase tracking-widest text-slate-500">
                Registered {formatDate(profile.registeredAt)}
              </span>
            </div>
          </div>
        </div>
        <button
          onClick={() => signOutUser()}
          className="px-6 py-3 bg-white dark:bg-slate-800 rounded-xl font-black text-[9px] uppercase tracking-[0.1em] border border-slate-200 dark:border-white/10 text-slate-400 hover:text-rose-500 transition-all shadow-sm"
        >
          Sign Out
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Attempts" value={`${summary.attemptsUsed} / ${MAX_ATTEMPTS}`} />
        <StatCard label="Best Score" value={summary.bestScore !== null ? `${summary.bestScore} / ${TOTAL_QUESTIONS}` : '--'} accent="border-trainito-coral" />
        <StatCard label="Latest Score" value={summary.latestScore !== null ? `${summary.latestScore} / ${TOTAL_QUESTIONS}` : '--'} accent="border-amber-500" />
        <StatCard
          label="Result"
          value={summary.passed ? 'PASSED ✓' : summary.latestScore !== null ? 'NOT PASSED' : '--'}
          accent={summary.passed ? 'border-emerald-500' : 'border-slate-300'}
        />
      </div>

      <div className="glass rounded-[2.5rem] p-8 shadow-lg border-l-[8px] border-trainito-teal">
        <h3 className="text-xl font-black mb-2 dark:text-white uppercase tracking-tight">CAIWP MQA Assessment</h3>
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">
          {TOTAL_QUESTIONS} Questions &middot; Passing Mark {PASSING_PERCENTAGE}% &middot; Maximum {MAX_ATTEMPTS} Attempts
        </p>

        {error && <p className="mb-4 text-xs font-bold text-rose-600 bg-rose-50 dark:bg-rose-950/30 px-4 py-3 rounded-xl">{error}</p>}

        {locked === 'DISABLED' && (
          <div className="p-6 bg-slate-100 dark:bg-slate-800/50 rounded-3xl text-center">
            <p className="font-black uppercase text-sm text-slate-500">Account Disabled</p>
            <p className="text-xs text-slate-400 mt-1">Please contact your training administrator.</p>
          </div>
        )}

        {locked === 'COMPLETED' && (
          <div className="p-6 bg-emerald-50 dark:bg-emerald-950/20 rounded-3xl text-center border border-emerald-200 dark:border-emerald-800">
            <p className="font-black uppercase text-sm text-emerald-600">Assessment Completed</p>
            <p className="text-xs text-emerald-700/70 dark:text-emerald-400/70 mt-1">
              You have passed with a best score of {summary.bestScore}/{TOTAL_QUESTIONS}. No further attempts are needed.
            </p>
          </div>
        )}

        {locked === 'MAX_ATTEMPTS' && (
          <div className="p-6 bg-rose-50 dark:bg-rose-950/20 rounded-3xl text-center border border-rose-200 dark:border-rose-800">
            <p className="font-black uppercase text-sm text-rose-600">Maximum Attempts Reached</p>
            <p className="text-xs text-rose-700/70 dark:text-rose-400/70 mt-1">
              You have used all {MAX_ATTEMPTS} attempts. An administrator can reset your attempts if authorized.
            </p>
          </div>
        )}

        {!locked && (
          <button
            onClick={handleStart}
            disabled={starting}
            className="btn-shimmer w-full md:w-auto px-10 py-5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl font-black uppercase tracking-[0.2em] shadow-lg text-[11px] active:scale-95 transition-all disabled:opacity-50"
          >
            {starting ? 'Starting…' : inProgress ? 'Continue Assessment' : 'Start Assessment'}
          </button>
        )}
      </div>

      {attempts.filter((a) => a.status === 'submitted').length > 0 && (
        <div className="glass rounded-[2.5rem] p-8 shadow-lg">
          <h3 className="text-sm font-black uppercase tracking-widest text-slate-500 mb-4">Attempt History</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="text-[8px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100 dark:border-slate-800">
                  <th className="py-2 pr-4">Attempt</th>
                  <th className="py-2 pr-4">Date</th>
                  <th className="py-2 pr-4">Score</th>
                  <th className="py-2 pr-4">Percentage</th>
                  <th className="py-2 pr-4">Result</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {attempts
                  .filter((a) => a.status === 'submitted')
                  .map((a) => (
                    <tr key={a.id} className="font-bold dark:text-slate-200">
                      <td className="py-3 pr-4">#{a.attemptNumber}</td>
                      <td className="py-3 pr-4">{formatDate(a.submittedAt)}</td>
                      <td className="py-3 pr-4 tabular-nums">{a.score}/{TOTAL_QUESTIONS}</td>
                      <td className="py-3 pr-4 tabular-nums">{a.percentage}%</td>
                      <td className="py-3 pr-4">
                        <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest ${a.result === 'PASS' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                          {a.result === 'PASS' ? 'Passed' : 'Not Passed'}
                        </span>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
