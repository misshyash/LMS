import React, { useEffect, useMemo, useRef, useState } from 'react';
import { backend } from '../../services';
import type { Attempt, QuestionPublic } from '../../types';

interface Props {
  attemptId: string;
  assessmentId: string;
  onSubmitted: (attemptId: string) => void;
}

export const AssessmentRunner: React.FC<Props> = ({ attemptId, assessmentId, onSubmitted }) => {
  const [questions, setQuestions] = useState<QuestionPublic[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [flagged, setFlagged] = useState<Set<number>>(new Set());
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const initialized = useRef(false);

  useEffect(() => {
    backend.fetchQuestions(assessmentId).then((qs) => {
      setQuestions(qs);
      setLoading(false);
    });
  }, [assessmentId]);

  useEffect(() => {
    return backend.subscribeAttempt(attemptId, (a: Attempt | null) => {
      if (!a || initialized.current) return;
      initialized.current = true;
      setCurrentIndex(a.currentQuestionIndex || 0);
      setAnswers(a.answers || {});
      setFlagged(new Set(a.flaggedQuestions || []));
    });
  }, [attemptId]);

  const total = questions.length;
  const current = questions[currentIndex];
  const answeredCount = useMemo(() => Object.keys(answers).length, [answers]);

  const persist = (patch: { currentQuestionIndex?: number; answers?: Record<string, number>; flaggedQuestions?: number[] }) => {
    backend.saveProgress(attemptId, {
      ...patch,
      ...(patch.answers ? { answeredCount: Object.keys(patch.answers).length } : {}),
    });
  };

  const selectAnswer = (optionIndex: number) => {
    if (!current) return;
    const next = { ...answers, [current.id]: optionIndex };
    setAnswers(next);
    persist({ answers: next });
    backend.logClientEvent({ eventType: 'ANSWER', details: `Question ${currentIndex + 1}`, attemptId });
  };

  const goTo = (idx: number) => {
    if (idx < 0 || idx >= total) return;
    setCurrentIndex(idx);
    persist({ currentQuestionIndex: idx });
    backend.logClientEvent({ eventType: 'QUESTION_CHANGED', details: `Now on Question ${idx + 1}`, attemptId });
  };

  const toggleFlag = () => {
    const next = new Set(flagged);
    if (next.has(currentIndex)) next.delete(currentIndex);
    else next.add(currentIndex);
    setFlagged(next);
    persist({ flaggedQuestions: Array.from(next) });
    backend.logClientEvent({ eventType: 'QUESTION_FLAGGED', details: `Question ${currentIndex + 1}`, attemptId });
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      await backend.submitAttempt(attemptId);
      onSubmitted(attemptId);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Submission failed. Please try again.');
      setSubmitting(false);
      setShowConfirm(false);
    }
  };

  if (loading || !current) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-sm font-black uppercase tracking-widest text-slate-400 animate-pulse">Loading assessment…</p>
      </div>
    );
  }

  const unansweredCount = total - answeredCount;

  return (
    <div className="max-w-3xl mx-auto px-6 py-10 space-y-6">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-black uppercase text-trainito-teal tracking-widest">CAIWP MQA Assessment</span>
        <span className="text-xl font-black dark:text-white tabular-nums">
          {currentIndex + 1} <span className="text-slate-300">/</span> {total}
        </span>
      </div>

      <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
        <div
          className="h-full bg-trainito-teal transition-all duration-300"
          style={{ width: `${((currentIndex + 1) / total) * 100}%` }}
        />
      </div>

      <div className="flex flex-wrap gap-1.5">
        {questions.map((q, i) => {
          const isAnswered = answers[q.id] !== undefined;
          const isFlagged = flagged.has(i);
          const isCurrent = i === currentIndex;
          return (
            <button
              key={q.id}
              onClick={() => goTo(i)}
              className={`w-7 h-7 rounded-lg text-[9px] font-black flex items-center justify-center transition-all relative
                ${isCurrent ? 'ring-2 ring-trainito-teal scale-110' : ''}
                ${isAnswered ? 'bg-trainito-teal text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}
            >
              {i + 1}
              {isFlagged && <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-amber-500 rounded-full border border-white dark:border-slate-950" />}
            </button>
          );
        })}
      </div>

      <div className="glass p-10 rounded-[2.5rem] shadow-2xl bg-white dark:bg-slate-900/80 border-0">
        <div className="flex justify-between items-start mb-6">
          <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">{current.moduleTitle}</span>
          <button
            onClick={toggleFlag}
            className={`text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full transition-all ${
              flagged.has(currentIndex) ? 'bg-amber-500 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
            }`}
          >
            {flagged.has(currentIndex) ? '🚩 Flagged' : '⚑ Flag for Review'}
          </button>
        </div>

        <p className="text-xl font-black text-slate-800 dark:text-white mb-8 leading-snug">{current.text}</p>

        <div className="space-y-3">
          {current.options.map((opt, i) => {
            const isSelected = answers[current.id] === i;
            return (
              <button
                key={i}
                onClick={() => selectAnswer(i)}
                className={`w-full p-5 rounded-2xl text-left font-bold text-sm border-2 transition-all flex items-center group ${
                  isSelected
                    ? 'border-trainito-teal ring-4 ring-trainito-teal/10 bg-trainito-teal/5'
                    : 'border-slate-100 dark:border-slate-800 hover:border-trainito-teal/30 bg-slate-50/50 dark:bg-slate-800/20'
                }`}
              >
                <span className="w-8 h-8 rounded-lg bg-white dark:bg-slate-700 flex items-center justify-center mr-4 text-[10px] font-black uppercase text-slate-400 group-hover:bg-trainito-teal group-hover:text-white transition-all">
                  {String.fromCharCode(65 + i)}
                </span>
                <span className="flex-1">{opt}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex justify-between items-center">
        <button
          onClick={() => goTo(currentIndex - 1)}
          disabled={currentIndex === 0}
          className="px-6 py-3 bg-white dark:bg-slate-800 rounded-xl font-black text-[9px] uppercase tracking-widest border border-slate-200 dark:border-white/10 text-slate-500 disabled:opacity-30 transition-all"
        >
          ← Previous
        </button>

        {currentIndex < total - 1 ? (
          <button
            onClick={() => goTo(currentIndex + 1)}
            className="px-6 py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl font-black text-[9px] uppercase tracking-widest shadow-md transition-all"
          >
            Next →
          </button>
        ) : (
          <button
            onClick={() => setShowConfirm(true)}
            className="px-8 py-3 bg-trainito-coral text-white rounded-xl font-black text-[9px] uppercase tracking-widest shadow-md transition-all"
          >
            Submit Assessment
          </button>
        )}
      </div>

      {showConfirm && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/80 backdrop-blur-md px-4">
          <div className="glass p-10 max-w-md w-full text-center border-t-8 border-trainito-coral shadow-2xl rounded-[2.5rem]">
            <h4 className="text-xl font-black text-slate-800 dark:text-white mb-3 uppercase">Submit Assessment?</h4>
            <p className="text-sm font-bold text-slate-500 mb-2">
              You have answered {answeredCount} of {total} questions.
            </p>
            {unansweredCount > 0 && (
              <p className="text-xs font-bold text-amber-600 mb-6">{unansweredCount} question(s) left unanswered.</p>
            )}
            {error && <p className="text-xs font-bold text-rose-600 mb-4">{error}</p>}
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 py-4 bg-slate-100 dark:bg-slate-800 rounded-xl font-black uppercase tracking-widest text-[10px]"
              >
                Keep Reviewing
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="flex-1 py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl font-black uppercase tracking-widest text-[10px] disabled:opacity-50"
              >
                {submitting ? 'Submitting…' : 'Confirm Submit'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
