import React, { useEffect, useMemo, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { backend } from '../../services';
import type { UserSummary, Attempt, QuestionReview } from '../../types';
import { TOTAL_QUESTIONS, MAX_ATTEMPTS } from '../../types';
import { formatDate } from '../../utils/time';

interface Props {
  uid: string;
  onClose: () => void;
}

export const CandidateDetailModal: React.FC<Props> = ({ uid, onClose }) => {
  const [summary, setSummary] = useState<UserSummary | null>(null);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [latestReview, setLatestReview] = useState<QuestionReview[]>([]);
  const [busy, setBusy] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  useEffect(() => backend.subscribeSummary(uid, setSummary), [uid]);
  useEffect(() => backend.subscribeUserAttempts(uid, setAttempts), [uid]);

  const latestSubmitted = useMemo(
    () => [...attempts].reverse().find((a) => a.status === 'submitted'),
    [attempts]
  );

  useEffect(() => {
    if (!latestSubmitted) {
      setLatestReview([]);
      return;
    }
    backend.fetchReview(latestSubmitted.id).then(setLatestReview);
  }, [latestSubmitted]);

  const moduleBreakdown = useMemo(() => {
    const tally = new Map<number, { correct: number; total: number; title: string }>();
    latestReview.forEach((r) => {
      const t = tally.get(r.module) ?? { correct: 0, total: 0, title: r.moduleTitle };
      t.total += 1;
      if (r.isCorrect) t.correct += 1;
      tally.set(r.module, t);
    });
    return Array.from(tally.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([mod, v]) => ({ name: `M${mod}`, fullName: v.title, percentage: Math.round((v.correct / v.total) * 1000) / 10 }));
  }, [latestReview]);

  if (!summary) return null;

  const handleReset = async () => {
    setBusy(true);
    try {
      await backend.resetAttempts(uid);
      setConfirmReset(false);
    } finally {
      setBusy(false);
    }
  };

  const handleToggleDisabled = async () => {
    setBusy(true);
    try {
      await backend.setCandidateDisabled(uid, !summary.disabled);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-slate-950/80 backdrop-blur-md px-4 py-8" onClick={onClose}>
      <div
        className="glass w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-[2.5rem] p-10 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-start mb-8">
          <div className="flex items-center gap-4">
            {summary.photoURL ? (
              <img src={summary.photoURL} className="w-16 h-16 rounded-2xl object-cover" />
            ) : (
              <div className="w-16 h-16 rounded-2xl bg-trainito-teal text-white flex items-center justify-center font-black text-2xl">
                {summary.name.charAt(0)}
              </div>
            )}
            <div>
              <h2 className="text-xl font-black text-slate-900 dark:text-white">{summary.name}</h2>
              <p className="text-xs text-slate-400 font-bold">{summary.email}</p>
              <p className="text-[9px] font-black uppercase tracking-widest text-trainito-teal mt-1">{summary.batch ?? '--'}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 font-black text-slate-400">
            ✕
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/30 text-center">
            <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">Best Score</p>
            <p className="text-lg font-black">{summary.bestScore !== null ? `${summary.bestScore}/${TOTAL_QUESTIONS}` : '--'}</p>
          </div>
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/30 text-center">
            <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">Latest Score</p>
            <p className="text-lg font-black">{summary.latestScore !== null ? `${summary.latestScore}/${TOTAL_QUESTIONS}` : '--'}</p>
          </div>
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/30 text-center">
            <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">Attempts</p>
            <p className="text-lg font-black">{summary.attemptsUsed}/{MAX_ATTEMPTS}</p>
          </div>
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/30 text-center">
            <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">Result</p>
            <p className={`text-lg font-black ${summary.passed ? 'text-emerald-500' : 'text-slate-500'}`}>
              {summary.passed ? 'PASSED' : summary.latestScore !== null ? 'FAILED' : '--'}
            </p>
          </div>
        </div>

        <h3 className="text-sm font-black uppercase tracking-widest text-slate-500 mb-3">Attempt History</h3>
        <div className="overflow-x-auto mb-8">
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
              {attempts.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-slate-400 font-bold">No attempts yet.</td>
                </tr>
              )}
              {attempts.map((a) => (
                <tr key={a.id} className="font-bold dark:text-slate-200">
                  <td className="py-3 pr-4">#{a.attemptNumber}</td>
                  <td className="py-3 pr-4">{a.status === 'submitted' ? formatDate(a.submittedAt) : 'In progress'}</td>
                  <td className="py-3 pr-4 tabular-nums">{a.score !== null ? `${a.score}/${TOTAL_QUESTIONS}` : '--'}</td>
                  <td className="py-3 pr-4 tabular-nums">{a.percentage !== null ? `${a.percentage}%` : '--'}</td>
                  <td className="py-3 pr-4">
                    {a.result ? (
                      <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest ${a.result === 'PASS' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                        {a.result}
                      </span>
                    ) : (
                      <span className="px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest bg-amber-50 text-amber-600">In Progress</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {moduleBreakdown.length > 0 && (
          <div className="mb-8">
            <h3 className="text-sm font-black uppercase tracking-widest text-slate-500 mb-3">Module Performance (Latest Attempt)</h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={moduleBreakdown}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fontWeight: 700 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: number) => `${v}%`} labelFormatter={(l, p) => p?.[0]?.payload?.fullName ?? l} />
                <Bar dataKey="percentage" fill="#66c2bd" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        <div className="flex gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
          <button
            onClick={() => setConfirmReset(true)}
            disabled={busy || summary.attemptsUsed === 0}
            className="flex-1 py-3 bg-amber-500 text-white rounded-xl font-black text-[10px] uppercase tracking-widest disabled:opacity-40"
          >
            Reset Attempts
          </button>
          <button
            onClick={handleToggleDisabled}
            disabled={busy}
            className={`flex-1 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest text-white ${summary.disabled ? 'bg-emerald-600' : 'bg-rose-600'}`}
          >
            {summary.disabled ? 'Enable Candidate' : 'Disable Candidate'}
          </button>
        </div>

        {confirmReset && (
          <div className="fixed inset-0 z-[310] flex items-center justify-center bg-slate-950/80 px-4" onClick={() => setConfirmReset(false)}>
            <div className="glass p-8 max-w-sm w-full rounded-3xl text-center" onClick={(e) => e.stopPropagation()}>
              <p className="font-black uppercase text-sm mb-2">Reset all attempts?</p>
              <p className="text-xs text-slate-400 mb-6">This clears {summary.name}'s attempt history and score, and is logged in the audit log.</p>
              <div className="flex gap-3">
                <button onClick={() => setConfirmReset(false)} className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 rounded-xl font-black text-[10px] uppercase">
                  Cancel
                </button>
                <button onClick={handleReset} disabled={busy} className="flex-1 py-3 bg-rose-600 text-white rounded-xl font-black text-[10px] uppercase">
                  {busy ? 'Resetting…' : 'Confirm Reset'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
