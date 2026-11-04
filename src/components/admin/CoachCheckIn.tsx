import React, { useState } from 'react';
import type { CoachSession, CoachTask } from '../../types';
import { BATCHES, COACH_TASKS } from '../../types';

interface Props {
  defaultName: string;
  email: string;
  /** Cohorts seen in the data, merged with the standard batch list. */
  knownCohorts: string[];
  initial?: CoachSession | null;
  onStart: (s: CoachSession) => void;
  onSignOut: () => void;
  onCancel?: () => void;
}

/** Shown after a coach/admin signs in: who is marking, which task, which cohort. */
export const CoachCheckIn: React.FC<Props> = ({ defaultName, email, knownCohorts, initial, onStart, onSignOut, onCancel }) => {
  const [coachName, setCoachName] = useState(initial?.coachName ?? defaultName);
  const [task, setTask] = useState<CoachTask>(initial?.task ?? 'capstone');
  const [cohort, setCohort] = useState(initial?.cohort ?? 'All');
  const [error, setError] = useState<string | null>(null);

  const cohorts = Array.from(new Set([...BATCHES, ...knownCohorts])).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!coachName.trim()) return setError('Enter your name so it appears on your score sheets.');
    onStart({ coachName: coachName.trim(), task, cohort, startedAt: Date.now() });
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-10">
      <form onSubmit={submit} className="w-full max-w-xl glass rounded-[2.5rem] p-8 md:p-10 shadow-2xl space-y-6">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.25em] text-trainito-teal">Coach check-in</p>
          <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white mt-1">What are you grading today?</h1>
          <p className="text-xs font-bold text-slate-400 mt-1">Signed in as {email}</p>
        </div>

        <div>
          <label htmlFor="coach-name" className="block text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1.5">
            Coach / assessor name
          </label>
          <input
            id="coach-name"
            value={coachName}
            onChange={(e) => setCoachName(e.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-slate-100 dark:bg-slate-800/50 text-sm font-bold outline-none focus:ring-2 focus:ring-trainito-teal/50 dark:text-white"
            placeholder="e.g. Coach Asha Mohd"
          />
          <p className="text-[10px] text-slate-400 font-bold mt-1">Printed on your score sheets as the assessor.</p>
        </div>

        <fieldset>
          <legend className="block text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2">Task</legend>
          <div className="space-y-2">
            {COACH_TASKS.map((t) => (
              <label
                key={t.id}
                className={`flex gap-3 items-start p-4 rounded-2xl cursor-pointer border-2 transition-all ${
                  task === t.id ? 'border-trainito-teal bg-trainito-teal/5' : 'border-transparent bg-slate-50 dark:bg-slate-800/40'
                }`}
              >
                <input type="radio" name="coach-task" value={t.id} checked={task === t.id} onChange={() => setTask(t.id)} className="mt-1 accent-teal-500" />
                <span>
                  <span className="block text-sm font-black text-slate-800 dark:text-white">{t.label}</span>
                  <span className="block text-[11px] font-bold text-slate-500">{t.description}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <div>
          <label htmlFor="coach-cohort" className="block text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1.5">
            Cohort
          </label>
          <select
            id="coach-cohort"
            value={cohort}
            onChange={(e) => setCohort(e.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-slate-100 dark:bg-slate-800/50 text-sm font-bold outline-none dark:text-white"
          >
            <option value="All">All cohorts</option>
            {cohorts.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        {error && <p className="text-xs font-bold text-rose-600">{error}</p>}

        <div className="flex flex-wrap gap-2 justify-between">
          <button type="button" onClick={onSignOut} className="px-5 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 font-black text-[10px] uppercase tracking-widest">
            Sign out
          </button>
          <div className="flex gap-2">
            {onCancel && (
              <button type="button" onClick={onCancel} className="px-5 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-black text-[10px] uppercase tracking-widest">
                Cancel
              </button>
            )}
            <button type="submit" className="px-6 py-3 rounded-xl bg-trainito-teal text-white font-black text-[10px] uppercase tracking-widest shadow">
              Start session →
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
