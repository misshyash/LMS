import React, { useState } from 'react';
import { useAuth } from '../../context/AuthProvider';
import { backend } from '../../services';
import { BATCHES, PROGRAMMES, DEFAULT_ASSESSMENT_ID } from '../../types';

export const ProfileSetup: React.FC = () => {
  const { user } = useAuth();
  const [batch, setBatch] = useState('');
  const [programme, setProgramme] = useState<string>(PROGRAMMES[0]);
  const [busy, setBusy] = useState(false);

  if (!user) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!batch) return;
    setBusy(true);
    try {
      await backend.saveProfile(user.uid, { batch, programme, assessmentId: DEFAULT_ASSESSMENT_ID });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="w-full max-w-lg glass rounded-[2.5rem] p-10 shadow-xl border border-white/30">
        <div className="flex items-center gap-4 mb-8">
          {user.photoURL ? (
            <img src={user.photoURL} alt={user.name} className="w-14 h-14 rounded-2xl object-cover shadow-md" />
          ) : (
            <div className="w-14 h-14 rounded-2xl bg-trainito-teal text-white flex items-center justify-center font-black text-xl">
              {user.name.charAt(0)}
            </div>
          )}
          <div>
            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Welcome</p>
            <h2 className="text-xl font-black text-slate-900 dark:text-white">{user.name}</h2>
            <p className="text-xs text-slate-400 font-bold">{user.email}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-[8px] font-black uppercase tracking-widest text-slate-400 ml-4">Cohort / Batch</label>
            <select
              value={batch}
              onChange={(e) => setBatch(e.target.value)}
              required
              className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/30 border border-transparent focus:border-trainito-teal/30 transition-all text-sm outline-none font-bold"
            >
              <option value="">Select your batch</option>
              {BATCHES.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[8px] font-black uppercase tracking-widest text-slate-400 ml-4">Training Programme</label>
            <select
              value={programme}
              onChange={(e) => setProgramme(e.target.value)}
              className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/30 border border-transparent focus:border-trainito-teal/30 transition-all text-sm outline-none font-bold"
            >
              {PROGRAMMES.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[8px] font-black uppercase tracking-widest text-slate-400 ml-4">Assessment</label>
            <div className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/30 text-sm font-bold text-slate-500">
              CAIWP MQA Assessment &middot; 30 Questions
            </div>
          </div>

          <button
            type="submit"
            disabled={busy || !batch}
            className="btn-shimmer w-full p-5 text-white bg-slate-900 dark:bg-white dark:text-slate-900 rounded-2xl font-black uppercase tracking-[0.2em] shadow-lg text-[10px] active:scale-95 transition-all mt-2 disabled:opacity-50"
          >
            Continue to Dashboard
          </button>
        </form>
      </div>
    </div>
  );
};
