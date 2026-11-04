import React, { useEffect, useState } from 'react';
import { backend } from '../../services';
import type { CapstoneTeam, UserSummary } from '../../types';
import { computeFinal, fmt2, fmtCombined, theoryCorrectFor } from '../../utils/grading';

/**
 * Shows the candidate's combined CAIWP result (capstone 60 + theory 40) once
 * an admin has published their team's capstone score.
 */
export const FinalResultCard: React.FC<{ uid: string; summary: UserSummary }> = ({ uid, summary }) => {
  const [teams, setTeams] = useState<CapstoneTeam[]>([]);
  useEffect(() => backend.subscribeMyTeams(uid, setTeams), [uid]);

  const team = teams[0];
  if (!team) return null;

  const published = team.published && team.publishedRaw !== null;
  const final = computeFinal(published ? team.publishedRaw : null, theoryCorrectFor(summary));
  const pass = final.result === 'PASS';

  const Row: React.FC<{ label: string; value: string }> = ({ label, value }) => (
    <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800 text-xs font-bold text-slate-600 dark:text-slate-300">
      <span>{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  );

  return (
    <div className={`glass rounded-[2.5rem] p-8 shadow-lg border-l-[8px] ${final.result ? (pass ? 'border-emerald-500' : 'border-rose-500') : 'border-slate-300'}`}>
      <div className="flex flex-wrap justify-between gap-4 items-start mb-4">
        <div>
          <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Final CAIWP Result</p>
          <h3 className="text-lg font-black text-slate-900 dark:text-white">{team.name}</h3>
          <p className="text-xs font-bold text-slate-500">{team.project}</p>
        </div>
        <div className="text-right">
          <div className="text-4xl font-black tabular-nums text-slate-900 dark:text-white">
            {fmtCombined(final.combined)} <span className="text-base text-slate-400">/ 100</span>
          </div>
          {final.result ? (
            <span className={`inline-block mt-1 px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${pass ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
              {pass ? 'PASS' : 'FAIL'}
            </span>
          ) : (
            <span className="text-[10px] font-black uppercase tracking-widest text-amber-500">
              {!published ? 'Capstone result not yet released' : 'Complete the theory exam'}
            </span>
          )}
        </div>
      </div>
      <Row label="Group capstone (raw / 100)" value={published ? fmt2(final.capstoneRaw) : '--'} />
      <Row label="Capstone contribution (× 0.60)" value={`${fmt2(final.capstoneContribution)} / 60`} />
      <Row label="Theory exam correct answers" value={`${final.theoryCorrect ?? '--'} / 30`} />
      <Row label="Theory contribution (÷ 30 × 40)" value={`${fmt2(final.theoryContribution)} / 40`} />
      <p className="text-[10px] text-slate-400 font-bold mt-3">Pass requires a combined score of 75/100 or higher.</p>
    </div>
  );
};
