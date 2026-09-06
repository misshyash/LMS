import React, { useEffect, useState } from 'react';
import { backend } from '../../services';
import type { Attempt, QuestionReview } from '../../types';
import { TOTAL_QUESTIONS } from '../../types';

interface Props {
  attemptId: string;
  onBackToDashboard: () => void;
}

export const ResultsScreen: React.FC<Props> = ({ attemptId, onBackToDashboard }) => {
  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const [review, setReview] = useState<QuestionReview[]>([]);
  const [showReview, setShowReview] = useState(false);

  useEffect(() => backend.subscribeAttempt(attemptId, setAttempt), [attemptId]);
  useEffect(() => {
    backend.fetchReview(attemptId).then(setReview);
  }, [attemptId]);

  if (!attempt || attempt.status !== 'submitted') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-sm font-black uppercase tracking-widest text-slate-400 animate-pulse">Grading your assessment…</p>
      </div>
    );
  }

  const passed = attempt.result === 'PASS';

  return (
    <div className="max-w-3xl mx-auto px-6 py-10 space-y-8">
      <div
        className={`glass rounded-[2.5rem] p-12 text-center shadow-2xl border-t-8 ${
          passed ? 'border-emerald-500' : 'border-rose-500'
        }`}
      >
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mb-4">Attempt {attempt.attemptNumber} Result</p>
        <div className="text-7xl font-black text-slate-900 dark:text-white tabular-nums tracking-tighter leading-none mb-4">
          {attempt.score} <span className="text-3xl text-slate-300">/ {TOTAL_QUESTIONS}</span>
        </div>
        <p className="text-lg font-black text-slate-500 mb-6">{attempt.percentage}%</p>
        <div
          className={`inline-block px-6 py-2 rounded-full font-black uppercase tracking-widest text-sm ${
            passed ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
          }`}
        >
          {passed ? 'PASSED ✓' : 'NOT PASSED'}
        </div>
      </div>

      <div className="flex gap-3">
        <button
          onClick={() => setShowReview((v) => !v)}
          className="flex-1 py-4 bg-white dark:bg-slate-800 rounded-xl font-black uppercase tracking-widest text-[10px] border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300"
        >
          {showReview ? 'Hide Question Review' : 'View Question Review'}
        </button>
        <button
          onClick={onBackToDashboard}
          className="flex-1 py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl font-black uppercase tracking-widest text-[10px]"
        >
          Back to Dashboard
        </button>
      </div>

      {showReview && (
        <div className="space-y-4">
          {review.map((r) => (
            <div
              key={r.qid}
              className={`glass p-6 rounded-3xl border-l-4 ${r.isCorrect ? 'border-emerald-500' : 'border-rose-500'}`}
            >
              <div className="flex justify-between items-start mb-2">
                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                  Q{r.order} &middot; {r.moduleTitle}
                </span>
                <span className={`text-[9px] font-black uppercase tracking-widest ${r.isCorrect ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {r.isCorrect ? 'Correct' : 'Incorrect'}
                </span>
              </div>
              <p className="font-bold text-sm text-slate-800 dark:text-white mb-3">{r.text}</p>
              <div className="space-y-1.5 text-xs font-bold">
                {r.options.map((opt, i) => {
                  const isCorrectOpt = i === r.correct;
                  const isSelected = i === r.selected;
                  let cls = 'text-slate-400';
                  if (isCorrectOpt) cls = 'text-emerald-600';
                  else if (isSelected) cls = 'text-rose-600 line-through';
                  return (
                    <div key={i} className={cls}>
                      {String.fromCharCode(65 + i)}. {opt} {isCorrectOpt ? '✓' : isSelected ? '✗' : ''}
                    </div>
                  );
                })}
              </div>
              <p className="mt-3 text-[11px] italic text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800 pt-3">
                {r.rationale}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
