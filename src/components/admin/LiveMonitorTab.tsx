import React, { useEffect, useState } from 'react';
import type { Attempt } from '../../types';
import { computeLiveStatus, LIVE_STATUS_META } from '../../utils/status';
import { formatDuration, timeAgo } from '../../utils/time';

interface Props {
  attempts: Attempt[];
}

export const LiveMonitorTab: React.FC<Props> = ({ attempts }) => {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const sorted = [...attempts].sort((a, b) => {
    const rank = (a: Attempt) => (computeLiveStatus(a, now) === 'active' ? 0 : computeLiveStatus(a, now) === 'ready_to_submit' ? 1 : 2);
    return rank(a) - rank(b) || b.lastActivityAt - a.lastActivityAt;
  });

  return (
    <div className="glass rounded-[2.5rem] p-0 overflow-hidden shadow-lg">
      <div className="px-8 py-6 flex items-center justify-between border-b border-slate-100 dark:border-slate-800">
        <div>
          <h3 className="text-lg font-black uppercase tracking-tight text-slate-900 dark:text-white">Live Assessment Monitor</h3>
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">Updates automatically &middot; no refresh needed</p>
        </div>
        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{sorted.length} candidate(s)</span>
      </div>

      {sorted.length === 0 ? (
        <p className="text-xs text-slate-400 font-bold text-center py-16">No candidates are currently taking the assessment.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 dark:bg-slate-800/50">
              <tr className="text-[8px] font-black uppercase tracking-[0.2em] text-slate-400">
                <th className="px-8 py-3">Candidate</th>
                <th className="px-8 py-3">Batch</th>
                <th className="px-8 py-3">Attempt</th>
                <th className="px-8 py-3">Progress</th>
                <th className="px-8 py-3">Time Elapsed</th>
                <th className="px-8 py-3">Last Activity</th>
                <th className="px-8 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {sorted.map((a) => {
                const status = computeLiveStatus(a, now);
                const meta = LIVE_STATUS_META[status];
                return (
                  <tr key={a.id} className="text-xs font-bold dark:text-slate-200">
                    <td className="px-8 py-4">
                      <div>{a.userName}</div>
                      <div className="text-[10px] text-slate-400 font-normal">{a.userEmail}</div>
                    </td>
                    <td className="px-8 py-4">{a.batch}</td>
                    <td className="px-8 py-4">#{a.attemptNumber}</td>
                    <td className="px-8 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex-1 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden max-w-[100px]">
                          <div
                            className="h-full bg-trainito-teal"
                            style={{ width: `${(a.answeredCount / a.totalQuestions) * 100}%` }}
                          />
                        </div>
                        <span className="tabular-nums text-[10px]">
                          {a.answeredCount}/{a.totalQuestions}
                        </span>
                      </div>
                    </td>
                    <td className="px-8 py-4 tabular-nums">{formatDuration(now - a.startedAt)}</td>
                    <td className="px-8 py-4 text-[10px] text-slate-400">{timeAgo(a.lastActivityAt, now)}</td>
                    <td className="px-8 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${meta.color} bg-current/10`}>
                        {meta.icon} {meta.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
